'use strict';
const {loadConfig}=require('./config');
const {createDatabase}=require('../infrastructure/database');
const {createApp}=require('./app');

async function start(config=loadConfig()) {
  const db=createDatabase(config.DATABASE_URL);
  try {
    const role=(await db.pool.query('SELECT rolsuper,rolbypassrls FROM pg_roles WHERE rolname=current_user')).rows[0];
    if(role.rolsuper || role.rolbypassrls)throw new Error('Runtime database role must not bypass row security');
    const app=createApp({db,config});
    const server=await new Promise((resolve,reject)=>{
      const s=app.listen(config.PORT,config.HOST,()=>resolve(s));s.once('error',reject);
    });
    let stopping=false;
    const stop=async()=>{
      if(stopping)return;stopping=true;
      server.closeAllConnections();
      await new Promise(resolve=>server.close(resolve));await db.close();
    };
    return {app,db,server,stop};
  }catch(error){await db.close();throw error;}
}
module.exports={start};
if(require.main===module)start().then(runtime=>{
  console.log('AIODMA v18 listening on '+JSON.stringify(runtime.server.address()));
  for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>runtime.stop());
}).catch(error=>{console.error(error.message);process.exitCode=1;});
