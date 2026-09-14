import {chromium} from 'playwright';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const base=process.env.CURIO_TEST_URL||'http://127.0.0.1:5173';
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE});
const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,serviceWorkers:'block'});
const p=await context.newPage();const requests=[];p.on('request',r=>{if(r.resourceType()==='image')requests.push(r.url());});
await p.goto(base,{waitUntil:'domcontentloaded'});await p.waitForSelector('.card[tabindex] img');
await p.waitForFunction(()=>{const img=document.querySelector('.card[tabindex] img');return img.complete&&img.naturalWidth>0;});
assert.ok(requests.every(url=>url.startsWith(base+'/media/optimized/')));assert.ok(requests.length<=3,'bounded preloading');
const info=await p.locator('.card[tabindex] img').evaluate(img=>({src:img.currentSrc,priority:img.fetchPriority}));assert.equal(info.priority,'high');
console.log('same-origin responsive images and bounded next-card preload: pass');
if(!process.env.CURIO_TEST_URL){
 const fixture=await readFile(new URL('../public/media/blue-octopus.webp',import.meta.url));
 await p.clock.install();let pending;
 await p.route('**/media/test-late.webp',route=>{pending=route;});
 await p.evaluate(async()=>{const {createCardImage}=await import('/src/card-image.js');document.querySelector('#app').replaceChildren(createCardImage({src:'/media/test-late.webp',alt:'test',layout:'photo'},0));});
 await p.waitForFunction(()=>document.querySelector('img')?.src.includes('test-late'));
 await p.clock.fastForward(13000);await p.getByText('图片加载较慢，可继续阅读或重试').waitFor();assert.equal(await p.locator('img').count(),1);
 await pending.fulfill({body:fixture,contentType:'image/webp'});await p.waitForFunction(()=>document.querySelector('img').naturalWidth>0&&document.querySelector('.image-status').hidden);
 console.log('late success restores the original image after timeout: pass');
 let attempts=0;await p.route('**/media/test-retry.webp',r=>++attempts===1?r.abort():r.fulfill({body:fixture,contentType:'image/webp'}));
 await p.evaluate(async()=>{const {createCardImage}=await import('/src/card-image.js');document.querySelector('#app').replaceChildren(createCardImage({src:'/media/test-retry.webp',alt:'test'},0));});
 await p.getByRole('button',{name:'重新加载',exact:true}).click();await p.waitForFunction(()=>document.querySelector('img').naturalWidth>0&&document.querySelector('.image-status').hidden);assert.equal(attempts,2);
 console.log('failed image can be retried successfully: pass');
}
await browser.close();
