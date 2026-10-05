'use strict';
// Run only on the explicitly requested Coffeenity tenant; never reset existing users.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { Client } = require('pg');
const { hashPassword, verifyPassword } = require('../src/modules/identity');
async function provisionAccess() {
  const client = new Client({connectionString:process.env.DATABASE_URL_UNPOOLED || process.env.POSTGRES_URL_NON_POOLING});
  await client.connect();
  try {
    await client.query("SELECT set_config('app.tenant_id','coffeenity',false)");
    const result = await client.query("SELECT u.id,u.email,u.password_hash,u.disabled,(u.mfa_secret IS NOT NULL) AS mfa_enabled,m.role,t.name FROM users u JOIN memberships m ON m.user_id=u.id JOIN tenants t ON t.id=m.tenant_id WHERE m.tenant_id='coffeenity'");
    console.log(JSON.stringify(result.rows.map(({password_hash,id,...safe})=>safe)));
    const seeded=result.rows.find(u=>u.email===process.env.SEED_ADMIN_EMAIL?.toLowerCase());
    const seedValid=seeded && !seeded.disabled && await verifyPassword(process.env.SEED_ADMIN_PASSWORD,seeded.password_hash);
    console.log(JSON.stringify({seedPasswordMatches:!!seedValid}));
    if (!process.argv.includes('--provision') && process.env.COFFEENITY_ACCESS_PROVISION!=='1') return;
    const target=path.resolve(__dirname,'../.local/coffeenity-login.json');
    if(!process.env.VERCEL && fs.existsSync(target)) {
      const saved=JSON.parse(fs.readFileSync(target,'utf8'));
      const user=result.rows.find(u=>u.email===saved.email);
      if(user && !user.disabled && await verifyPassword(saved.password,user.password_hash)) {console.log('Existing scoped login verified');return;}
      throw new Error('Stored access no longer valid; no existing credentials were changed');
    }
    const email=process.env.COFFEENITY_ACCESS_EMAIL || 'owner.coffeenity.'+crypto.randomBytes(4).toString('hex')+'@aiodma.local';
    const password=process.env.COFFEENITY_ACCESS_PASSWORD || crypto.randomBytes(24).toString('base64url');
    if(!/^owner\.coffeenity\.[a-f0-9]{8}@aiodma\.local$/.test(email))throw new Error('Unexpected account target');
    const existing=result.rows.find(u=>u.email===email);
    if(existing){
      if(existing.disabled || existing.role!=='owner' || !await verifyPassword(password,existing.password_hash))throw new Error('Existing account conflict');
      console.log('Requested owner access already verified; no changes');return;
    }
    const userId=crypto.randomUUID();
    await client.query('BEGIN');
    const tenant=(await client.query("SELECT name FROM tenants WHERE id='coffeenity' FOR UPDATE")).rows[0];
    if(!tenant)throw new Error('Requested tenant missing');
    await client.query("SELECT set_config('app.tenant_id','coffeenity',true)");
    await client.query("INSERT INTO users(id,email,password_hash,default_tenant_id) VALUES($1,$2,$3,'coffeenity')",[userId,email,await hashPassword(password)]);
    await client.query("INSERT INTO memberships(tenant_id,user_id,role) VALUES('coffeenity',$1,'owner')",[userId]);
    await client.query("INSERT INTO audit_events(tenant_id,actor_id,action,entity_id,detail) VALUES('coffeenity',$1,'OWNER_ACCESS_PROVISIONED',$1,$2)",[userId,{reason:'User-requested Coffeenity pilot login; existing access preserved'}]);
    await client.query('COMMIT');
    if(!process.env.VERCEL)fs.writeFileSync(target,JSON.stringify({email,password,merchantId:'coffeenity',name:tenant.name},null,2),{mode:0o600,flag:'wx'});
    console.log('Scoped owner access saved privately; MFA enrollment required on first login');
  } finally {await client.end();}
}
module.exports={provisionAccess};
if(require.main===module)provisionAccess().catch(()=>{console.error('Scoped access operation failed; credentials not printed');process.exitCode=1;});
