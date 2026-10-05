'use strict';
const crypto=require('node:crypto');
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
// Values go only to stdin; not shell text, Git, logs or the frontend bundle.
const target=path.resolve(__dirname,'../.local/coffeenity-login.json');
if(!fs.existsSync(target))fs.writeFileSync(target,JSON.stringify({email:'owner.coffeenity.'+crypto.randomBytes(4).toString('hex')+'@aiodma.local',password:crypto.randomBytes(24).toString('base64url'),merchantId:'coffeenity'},null,2),{mode:0o600,flag:'wx'});
const access=JSON.parse(fs.readFileSync(target,'utf8'));
for(const [key,value] of Object.entries({COFFEENITY_ACCESS_EMAIL:access.email,COFFEENITY_ACCESS_PASSWORD:access.password,COFFEENITY_ACCESS_PROVISION:'1'})){
  const result=spawnSync(process.platform==='win32'?'vercel.cmd':'vercel',['env','add',key,'production','--sensitive','--yes','--force'],{input:value,encoding:'utf8',shell:process.platform==='win32',windowsHide:true});
  if(result.status!==0){console.error('Could not configure scoped access provisioning');process.exit(1);}
  console.log('Configured '+key+' (value withheld)');
}
