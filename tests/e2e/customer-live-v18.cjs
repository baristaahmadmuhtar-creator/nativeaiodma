'use strict';
const crypto=require('node:crypto');
const assert=require('node:assert/strict');
const {startLocalDatabase}=require('../../scripts/local-database.cjs');
const {seed}=require('../../scripts/seed-v18.cjs');
const {createDatabase}=require('../../src/infrastructure/database');
const {createApp}=require('../../src/server/app');
const {tableToken}=require('../../src/modules/identity');
const {main:browserSmoke}=require('./customer-v18.cjs');

async function main(){
  // Reuse the stopped integration cluster to avoid another full database allocation.
  const local=await startLocalDatabase('integration');
  let db,server;
  try {
    const tenant='browser_'+crypto.randomBytes(6).toString('hex');
    await seed({connectionString:local.migrationUrl,merchants:[{id:tenant,name:'Browser Test Cafe',currency:'BND',taxRate:0,
      tablesCount:1,menu:[{id:'coffee',name:'Kopi Susu',category:'Coffee',price:3.5,available:true,
        image:'assets/products/kopi_milk_aren.jpg',customizations:{addons:[{name:'Oat',price:.5}]}}]}],
      email:tenant+'@example.test',password:crypto.randomBytes(24).toString('hex'),published:true});
    db=createDatabase(local.connectionString);
    const config={SESSION_SECRET:crypto.randomBytes(32).toString('hex'),NODE_ENV:'test',PUBLIC_BASE_URL:'http://localhost'};
    server=await new Promise(resolve=>{const s=createApp({db,config}).listen(0,'127.0.0.1',()=>resolve(s));});
    config.PUBLIC_BASE_URL='http://127.0.0.1:'+server.address().port;
    const token=tableToken(config,tenant,1,1);
    await browserSmoke(config.PUBLIC_BASE_URL+'/?merchant='+tenant+'&table=1&token='+token);
    const rows=await db.transaction(tenant,c=>c.query('SELECT payment_status,snapshot FROM orders WHERE tenant_id=$1',[tenant]));
    assert.equal(rows.rowCount,1);assert.equal(rows.rows[0].payment_status,'unpaid');
    assert.ok(rows.rows[0].snapshot.totalMinor>0);
    console.log('PASS PostgreSQL corroboration: exactly one persisted unpaid order');
  }finally{
    server?.closeAllConnections();if(server)await new Promise(resolve=>server.close(resolve));
    await db?.close();await local.stop();
  }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
