'use strict';
const crypto=require('node:crypto');
const fs=require('node:fs');
const path=require('node:path');
const net=require('node:net');
const {spawn}=require('node:child_process');
function run(binary,args,{timeout=60000}={}) {
  // Do not give a daemon inherited pipes: on Windows they can keep execFile open after pg_ctl exits.
  return new Promise((resolve,reject)=>{
    const child=spawn(binary,args,{windowsHide:true,stdio:'ignore'});
    const timer=setTimeout(()=>{child.kill();reject(new Error(path.basename(binary)+' timed out'));},timeout);
    child.once('error',error=>{clearTimeout(timer);reject(error);});
    child.once('exit',code=>{clearTimeout(timer);code===0?resolve():reject(new Error(path.basename(binary)+' failed with code '+code));});
  });
}
const {migrate}=require('./migrate.cjs');

async function unusedPort() {
  const probe=net.createServer();
  await new Promise((resolve,reject)=>{probe.once('error',reject);probe.listen(0,'127.0.0.1',resolve);});
  const port=probe.address().port;
  await new Promise(resolve=>probe.close(resolve));return port;
}

async function startLocalDatabase(name='integration') {
  if(!/^[a-z0-9_-]+$/.test(name))throw new Error('Invalid local database name');
  const platform=process.platform==='win32'?'windows':process.platform;
  const binaries=await import(`@embedded-postgres/${platform}-${process.arch}`);
  const root=path.resolve(__dirname,'..','.local');
  fs.mkdirSync(root,{recursive:true});
  const dir=path.resolve(root,'pg-'+name);
  if(path.dirname(dir)!==root)throw new Error('Database path outside local workspace');
  const credentials=path.join(root,'pg-'+name+'-credentials.json');
  const secrets=fs.existsSync(credentials)?JSON.parse(fs.readFileSync(credentials,'utf8')):
    {admin:crypto.randomBytes(24).toString('hex'),app:crypto.randomBytes(24).toString('hex')};
  for(const value of Object.values(secrets))if(!/^[a-f0-9]{48}$/.test(value))throw new Error('Invalid credential file');
  if(!fs.existsSync(credentials))fs.writeFileSync(credentials,JSON.stringify(secrets),{mode:0o600});
  const port=await unusedPort();
  // pg_ctl performs a graceful shutdown; the wrapper's Windows taskkill can leave children alive.
  const passwordFile=path.join(root,'pg-'+name+'-init-password');
  if(!fs.existsSync(path.join(dir,'PG_VERSION'))) {
    fs.writeFileSync(passwordFile,secrets.admin,{mode:0o600});
    try {
      await run(binaries.initdb,['-D',dir,'-U','postgres','--pwfile='+passwordFile,'--auth=scram-sha-256','--encoding=UTF8','--locale=C'],{windowsHide:true,timeout:60000});
    }finally{fs.unlinkSync(passwordFile);}
  }
  await run(binaries.pg_ctl,['-D',dir,'-l',path.join(root,'pg-'+name+'.log'),'-o',`-h 127.0.0.1 -p ${port} -c max_connections=40`,'-w','start'],{windowsHide:true,timeout:60000});
  const stop=()=>run(binaries.pg_ctl,['-D',dir,'-m','fast','-w','stop'],{windowsHide:true,timeout:30000});
  const adminUrl=`postgresql://postgres:${secrets.admin}@127.0.0.1:${port}/postgres`;
  const {Client}=require('pg');
  const admin=new Client({connectionString:adminUrl});await admin.connect();
  try {
    if(!(await admin.query("SELECT 1 FROM pg_roles WHERE rolname='aiodma_runtime'")).rowCount) {
      await admin.query(`CREATE ROLE aiodma_runtime LOGIN PASSWORD '${secrets.app}' NOSUPERUSER NOBYPASSRLS`);
    }
    if(!(await admin.query("SELECT 1 FROM pg_database WHERE datname='aiodma'")).rowCount)await admin.query('CREATE DATABASE aiodma');
  }finally{await admin.end();}
  const migrationUrl=adminUrl.replace(/\/postgres$/,'/aiodma');
  await migrate(migrationUrl);
  const grant=new Client({connectionString:migrationUrl});await grant.connect();
  try {
    await grant.query(`GRANT USAGE ON SCHEMA public TO aiodma_runtime;
      GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO aiodma_runtime;
      REVOKE UPDATE,DELETE,TRUNCATE ON audit_events FROM aiodma_runtime;
      REVOKE ALL ON schema_migrations FROM aiodma_runtime;
      GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA public TO aiodma_runtime;`);
  }finally{await grant.end();}
  return {connectionString:`postgresql://aiodma_runtime:${secrets.app}@127.0.0.1:${port}/aiodma`,migrationUrl,
    stop};
}
module.exports={startLocalDatabase};
