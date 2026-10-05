'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {tokenUsage}=require('../../src/modules/ai-governance');
test('AI accounting reports actual known tokens without converting unknown receipts into zero usage',()=>{
  assert.deepEqual(tokenUsage(null),{tokens:0,complete:false});
  assert.deepEqual(tokenUsage({totalTokenCount:23}),{tokens:23,complete:true});
  assert.deepEqual(tokenUsage({complete:false,calls:[{usage:{totalTokenCount:12}},{usage:null}]}),{tokens:12,complete:false});
  assert.deepEqual(tokenUsage({calls:[]}),{tokens:0,complete:false});
  assert.deepEqual(tokenUsage({totalTokenCount:-1}),{tokens:0,complete:false});
});
