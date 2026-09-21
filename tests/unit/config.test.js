'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {loadConfig}=require('../../src/server/config');
const env={DATABASE_URL:'postgresql://test:secret@localhost/test',SESSION_SECRET:'a'.repeat(32)};
test('configuration defaults to local development and validates database protocol',()=>{
  assert.equal(loadConfig(env).NODE_ENV,'development');
  assert.throws(()=>loadConfig({...env,DATABASE_URL:'https://example.com'}),/DATABASE_URL/);
});
test('public origin cannot contain credentials, path, query or non-HTTP protocol',()=>{
  for(const value of ['https://secret@example.com','https://example.com/app','https://example.com/?token=x','https://example.com/#x','ftp://example.com'])
    assert.throws(()=>loadConfig({...env,PUBLIC_BASE_URL:value}),/PUBLIC_BASE_URL/);
});
test('production requires HTTPS and config errors do not disclose secret values',()=>{
  assert.throws(()=>loadConfig({...env,NODE_ENV:'production'}),/HTTPS/);
  assert.equal(loadConfig({...env,NODE_ENV:'production',PUBLIC_BASE_URL:'https://cafe.example'}).NODE_ENV,'production');
  assert.throws(()=>loadConfig({...env,SESSION_SECRET:'private'}),error=>error.message.includes('SESSION_SECRET')&&!error.message.includes('private'));
});
