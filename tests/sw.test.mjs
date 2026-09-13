import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../public/sw.js',import.meta.url),'utf8');
function worker(fetch){
 const entries=new Map([['/feed.json',new Response('{"cards":[]}')],['/',new Response('old shell')]]);
 const key=r=>typeof r==='string'?r:r.url;
 const cache={match:async r=>entries.get(key(r))?.clone(),put:async(r,v)=>entries.set(key(r),v)};
 const context=vm.createContext({self:{addEventListener(){},location:{origin:'https://curio.test'}},caches:{open:async()=>cache,match:cache.match},fetch,Response,Request:class{constructor(url){this.url=url;}}});
 vm.runInContext(source,context);return {context,entries};
}
test('feed uses cached data for HTTP errors as well as offline failures',async()=>{
 for(const fetch of [async()=>new Response('error',{status:503}),async()=>{throw Error('offline');}]){
  const {context}=worker(fetch);assert.equal(await(await context.feedNetworkFirst('/feed.json')).text(),'{"cards":[]}');
 }
});
test('navigation refreshes old HTML and can open the cached shell offline',async()=>{
 const {context,entries}=worker(async()=>new Response('new shell'));
 assert.equal(await(await context.documentNetworkFirst('/')).text(),'new shell');
 assert.equal(await entries.get('/').clone().text(),'new shell');
 context.fetch=async()=>{throw Error('offline');};assert.equal(await(await context.documentNetworkFirst('/?installed')).text(),'new shell');
});
