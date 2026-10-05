'use strict';
async function policy(c,tenantId) {
  return (await c.query('SELECT enabled,daily_request_limit AS "dailyRequestLimit",version FROM ai_policies WHERE tenant_id=$1',[tenantId])).rows[0] || {enabled:true,dailyRequestLimit:100,version:0};
}
async function reserve(c,p,messageId) {
  await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,20))',[p.tenant_id]);
  const settings=await policy(c,p.tenant_id);
  if(!settings.enabled)return 'AI_DISABLED';
  const used=Number((await c.query("SELECT count(*) AS n FROM ai_usage_runs WHERE tenant_id=$1 AND created_at>=date_trunc('day',now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'",[p.tenant_id])).rows[0].n);
  if(used>=settings.dailyRequestLimit)return 'AI_DAILY_LIMIT';
  await c.query('INSERT INTO ai_usage_runs(tenant_id,session_id,message_id) VALUES($1,$2,$3)',[p.tenant_id,p.id,messageId]);
  return null;
}
function tokenUsage(usage) {
  const calls=Array.isArray(usage?.calls)?usage.calls.map(call=>call.usage):[usage];
  const known=calls.filter(call=>Number.isSafeInteger(call?.totalTokenCount)&&call.totalTokenCount>=0);
  return {tokens:known.reduce((sum,call)=>sum+call.totalTokenCount,0),complete:known.length===calls.length && usage?.complete!==false && calls.length>0};
}
async function summary(c,tenantId) {
  const rows=(await c.query("SELECT mode,usage FROM ai_usage_runs WHERE tenant_id=$1 AND created_at>=date_trunc('day',now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'",[tenantId])).rows;
  const settings=await policy(c,tenantId);
  const usages=rows.map(row=>tokenUsage(row.usage));
  const next=new Date();next.setUTCHours(24,0,0,0);
  return {policy:settings,day:{requests:rows.length,remainingRequests:Math.max(0,settings.dailyRequestLimit-rows.length),
    reportedTokens:usages.reduce((sum,u)=>sum+u.tokens,0),incompleteRuns:usages.filter(u=>!u.complete).length,
    liveRuns:rows.filter(r=>r.mode==='live').length,degradedRuns:rows.filter(r=>r.mode==='degraded').length,
    runningRuns:rows.filter(r=>r.mode==='running').length,resetsAt:next.toISOString()},billingConfigured:false};
}
module.exports={policy,reserve,summary,tokenUsage};
