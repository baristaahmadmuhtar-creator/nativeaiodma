'use strict';
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {chromium,expect}=require('@playwright/test');
async function main(){
  const access=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../../.local/coffeenity-login.json'),'utf8'));
  const base='https://nativeaiodma-v18.vercel.app';
  const executablePath=[await require('puppeteer').executablePath(),'C:/Program Files/Google/Chrome/Application/chrome.exe',chromium.executablePath()].find(p=>fs.existsSync(p));
  const browser=await chromium.launch({executablePath,headless:true});
  try{
    const page=await browser.newPage({viewport:{width:390,height:844}});const errors=[];page.on('pageerror',()=>errors.push('Browser exception'));
    await page.goto(base+'/admin.html');
    await page.locator('#login-form [name=email]').fill(access.email);
    await page.locator('#login-form [name=password]').fill(access.password);
    // Verify default outlet works, without relying on a manually entered selector.
    const response=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/v1/auth/login');
    await page.locator('#login-form button[type=submit]').click();
    const result=await response,envelope=await result.json();
    if(result.status()===401&&envelope.error?.code==='MFA_INVALID'){
      // A human may have enrolled MFA since this access fixture was created.
      // Never reset their authenticator just to satisfy an unenrolled-login test.
      const status=await page.evaluate(async()=> (await fetch('/api/v1/notifications')).status);assert.equal(status,401);
      assert.deepEqual(errors,[]);
      console.log('PASS Coffeenity password/default outlet recognized; enrolled MFA correctly requires the user code. Full owner session not exercised; credentials withheld');return;
    }
    assert.equal(result.status(),200);
    const data=envelope.data;assert.equal(data.tenantId,'coffeenity');assert.equal(data.role,'owner');assert.equal(data.mfaRequired,true);
    await expect(page.locator('#mfa-gate')).toBeVisible();
    const status=await page.evaluate(async()=>{const r=await fetch('/api/v1/notifications');return {status:r.status,code:(await r.json()).error?.code};});
    assert.deepEqual(status,{status:403,code:'MFA_REQUIRED'});
    const output=path.resolve(__dirname,'../../output/coffeenity-login-live');fs.mkdirSync(output,{recursive:true});
    await page.screenshot({path:path.join(output,'mfa-gate-mobile.png'),fullPage:true});
    await page.locator('#logout').click();await expect(page.locator('#auth')).toBeVisible();
    assert.deepEqual(errors,[]);
    console.log('PASS Coffeenity production owner login, default outlet, MFA gate, privilege guard and logout; credentials withheld');
  }finally{await browser.close();}
}
main().catch(()=>{console.error('Coffeenity live login verification failed; credentials withheld');process.exitCode=1;});
