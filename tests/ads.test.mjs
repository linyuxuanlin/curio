import test from 'node:test';
import assert from 'node:assert/strict';
import {createAdPolicy,hasAdSpace} from '../src/ads.js';
test('first two cards excluded; skipped slots do not spend budget; rolling five limit',()=>{
 const p=createAdPolicy(),shown=[];
 for(let i=1;i<=20;i++){const id=String(i),v=p.visit(id);if(i===3)continue;if(p.claim(id,v))shown.push(i);assert.equal(p.claim(id,v),false);}
 assert.deepEqual(shown,[4,9,14,19]);
});
test('undo, rerenders and a fresh page cannot bypass frequency',()=>{
 const p=createAdPolicy();const a=p.visit('a');p.visit('b');const c=p.visit('c');assert(p.claim('c',c));
 assert.equal(p.visit('a'),1);assert.equal(p.claim('a',a),false);assert.equal(p.claim('c',c),false);
 const fresh=createAdPolicy();assert.equal(fresh.claim('c',fresh.visit('c')),false);
});
test('only a single spacious page can host a fixed ad',()=>{
 assert(hasAdSpace(315,550,210,1));
 for(const args of [[299,600,100,1],[315,500,210,1],[315,800,450,1],[315,550,210,2]])assert.equal(hasAdSpace(...args),false);
});
