import test from 'node:test';import assert from 'node:assert/strict';
import {unread,randomBatch,shouldDismiss,readMap,recentIds,RECENT_MS} from '../src/deck.js';
import {validateCard,validateCollection} from '../scripts/build-content.mjs';
import {readFile} from 'node:fs/promises';
const cards=Array.from({length:20},(_,i)=>({id:String(i)}));
test('unread excludes only read IDs, including newly arrived cards',()=>assert.deepEqual(unread(cards,{'0':1,'1':2}).map(x=>x.id),cards.slice(2).map(x=>x.id)));
test('random batch never repeats recent cards or duplicates within a batch',()=>{for(let n=0;n<100;n++){const batch=randomBatch(cards,new Set(['0','1','2']),5);assert.equal(batch.length,5);assert.equal(new Set(batch.map(c=>c.id)).size,5);assert.ok(batch.every(c=>!['0','1','2'].includes(c.id)));}});
test('exhausted random pool returns no cards; small pool does not duplicate',()=>{assert.deepEqual(randomBatch(cards,new Set(cards.map(c=>c.id))),[]);assert.equal(randomBatch(cards,new Set(cards.slice(2).map(c=>c.id))).length,2);});
test('drag threshold and velocity distinguish reading from a swipe',()=>{assert.equal(shouldDismiss(10,1,390),false);assert.equal(shouldDismiss(45,.8,390),true);assert.equal(shouldDismiss(-120,0,390),true);assert.equal(shouldDismiss(40,.1,390),false);});
test('corrupt or blocked storage does not crash and expired recent reads become eligible',()=>{assert.deepEqual(readMap({getItem(){throw Error();}},'x'),{});assert.deepEqual(readMap({getItem(){return 'bad';}},'x'),{});assert.deepEqual([...recentIds({a:100,b:RECENT_MS},RECENT_MS+200)],['b']);});
const card=JSON.parse(await readFile(new URL('../content/cards/2026-09-10-spider-tailed-viper.json',import.meta.url),'utf8'));
test('content validator rejects duplicate events, unsafe source URLs, and unapproved image models',()=>{assert.doesNotThrow(()=>validateCard(card));assert.throws(()=>validateCollection([card,{...card,id:'different'}]),/重复事件/);assert.throws(()=>validateCard({...card,sources:[{name:'bad',url:'javascript:alert(1)'},card.sources[1]]}),/HTTPS/);assert.throws(()=>validateCard({...card,image:null}),/每张卡片必须有图片/);assert.throws(()=>validateCard({...card,image:{...card.image,kind:'generated',model:'other',visualChecked:true}}),/GPT Image 2.5/);});

test('unread handles prototype-like IDs and zero timestamps',()=>{
 assert.deepEqual(unread([{id:'constructor'},{id:'zero'}],{zero:0}),[{id:'constructor'}]);
});
const {usableCard}=await import('../src/deck.js');
test('feed guard rejects malformed dates, nested data, unsafe links and selectors',()=>{
 assert.equal(usableCard(card),true);
 for(const patch of [{eventDate:'invalid'},{body:[null]},{sources:[null]},{sources:[{name:'bad',url:'javascript:alert(1)'}]},{id:'bad"id'},{image:{...card.image,sourceUrl:'javascript:alert(1)'}}]) assert.equal(usableCard({...card,...patch}),false);
});

test('editorial limits reject oversized or overly fragmented back text',()=>{
 assert.throws(()=>validateCard({...card,body:['字'.repeat(81)]}),/80/);
 assert.throws(()=>validateCard({...card,body:['字'.repeat(71),'字'.repeat(70)]}),/140/);
 assert.throws(()=>validateCard({...card,body:['第一段','第二段','第三段']}),/1–2/);
 assert.doesNotThrow(()=>validateCard({...card,body:['字'.repeat(70),'字'.repeat(70)]}));
});
