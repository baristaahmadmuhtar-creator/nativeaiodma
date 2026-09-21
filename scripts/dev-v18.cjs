'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {startLocalDatabase}=require('./local-database.cjs');
const {seed}=require('./seed-v18.cjs');
const {start}=require('../src/server/start');

async function main(){
  const local=await startLocalDatabase('development');
  let runtime;
  const credentialPath=path.resolve(__dirname,'../.local/development-login.json');
  const login=fs.existsSync(credentialPath)?JSON.parse(fs.readFileSync(credentialPath,'utf8')):
    {email:'owner@aiodma.local',password:crypto.randomBytes(18).toString('base64url'),sessionSecret:crypto.randomBytes(32).toString('hex')};
  if(!fs.existsSync(credentialPath))fs.writeFileSync(credentialPath,JSON.stringify(login,null,2),{mode:0o600});
  try {
    const legacy=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../data/db.json'),'utf8'));
    await seed({connectionString:local.migrationUrl,merchants:Object.values(legacy.merchants),email:login.email,password:login.password,published:true});
    runtime=await start({DATABASE_URL:local.connectionString,SESSION_SECRET:login.sessionSecret,
      NODE_ENV:'development',PORT:Number(process.env.PORT || 8081),HOST:'127.0.0.1',PUBLIC_BASE_URL:'http://localhost:'+Number(process.env.PORT || 8081),
      GEMINI_API_KEY:process.env.GEMINI_API_KEY,AI_MODEL:process.env.AI_MODEL});
    console.log('v18 development API: http://localhost:'+runtime.server.address().port+'/api/health');
    console.log('Local credentials: .local/development-login.json (not committed)');
    const shutdown=async()=>{await runtime.stop();await local.stop();};
    process.once('SIGINT',shutdown);process.once('SIGTERM',shutdown);
  }catch(error){await runtime?.stop();await local.stop();throw error;}
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
