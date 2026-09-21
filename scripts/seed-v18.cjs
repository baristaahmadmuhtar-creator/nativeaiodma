'use strict';
const crypto=require('node:crypto');
const {Client}=require('pg');
const {hashPassword}=require('../src/modules/identity');

function convertItem(item) {
  const modifierGroups=Object.entries(item.customizations || {}).filter(([,options])=>Array.isArray(options)).map(([name,options])=>({
    id:name,min:0,max:name==='addons'?options.length:1,
    options:options.map((option,index)=>({id:`${name}_${index}`,name:typeof option==='string'?option:option.name,price:typeof option==='string'?0:Number(option.price || 0)}))
  }));
  return {id:item.id,name:item.name,category:item.category || 'menu',price:item.price,desc:item.desc || '',image:item.image,
    available:item.available!==false,modifierGroups,flavorProfile:item.flavorProfile || '',allergens:null};
}

async function seed({connectionString,merchants,email,password,published=false}) {
  const client=new Client({connectionString});await client.connect();
  const passwordHash=await hashPassword(password);
  try {
    await client.query('BEGIN');
    const user=(await client.query('INSERT INTO users(id,email,password_hash) VALUES($1,$2,$3) ON CONFLICT(email) DO UPDATE SET email=excluded.email RETURNING id',
      [crypto.randomUUID(),email.toLowerCase(),passwordHash])).rows[0];
    for(const merchant of merchants) {
      await client.query(`INSERT INTO tenants(id,name,currency,config,published) VALUES($1,$2,$3,$4,$5) ON CONFLICT(id) DO NOTHING`,
        [merchant.id,merchant.name,merchant.currency,JSON.stringify({taxRate:Number(merchant.taxRate || 0)*100,serviceRate:0,
          timezone:merchant.currency==='BND'?'Asia/Brunei':'Asia/Jakarta',language:merchant.defaultLanguage || 'id'}),published]);
      await client.query("INSERT INTO memberships(tenant_id,user_id,role) VALUES($1,$2,'owner') ON CONFLICT DO NOTHING",[merchant.id,user.id]);
      for(let table=1;table<=Math.min(merchant.tablesCount || 5,99);table++)await client.query('INSERT INTO dining_tables(tenant_id,id) VALUES($1,$2) ON CONFLICT DO NOTHING',[merchant.id,table]);
      for(const item of merchant.menu) {
        const converted=convertItem(item);
        await client.query('INSERT INTO catalog_items(tenant_id,id,content,available) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING',
          [merchant.id,item.id,JSON.stringify(converted),converted.available]);
      }
    }
    await client.query('COMMIT');return {userId:user.id,merchants:merchants.length};
  }catch(error){await client.query('ROLLBACK');throw error;}finally{await client.end();}
}
module.exports={seed,convertItem};
