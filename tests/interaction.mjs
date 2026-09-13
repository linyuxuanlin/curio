import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const base=process.env.CURIO_TEST_URL||'http://127.0.0.1:5173';
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE});
const context=await browser.newContext({serviceWorkers:'block'});
await context.addInitScript(()=>{
 window.sent=[];window.permissionRequests=0;
 window.Notification=class {static permission='default';static async requestPermission(){window.permissionRequests++;this.permission='granted';return 'granted';}constructor(title,options){window.sent.push({title,...options});}close(){}};
});
const p=await context.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
const feed=await(await fetch(base+'/feed.json')).json();let cards=feed.cards;
await p.route('**/feed.json*',r=>r.fulfill({json:{cards}}));
await p.goto(base,{waitUntil:'domcontentloaded'});await p.waitForSelector('.card');
assert.equal(await p.evaluate(()=>permissionRequests),0);
await p.getByRole('button',{name:'关于 Curio'}).click();await p.getByRole('button',{name:'开启更新通知'}).click();assert.equal(await p.evaluate(()=>permissionRequests),1);await p.getByRole('button',{name:'关闭',exact:true}).click();
cards=[{...feed.cards[0],id:'new-notification',publishedAt:'2026-09-14T00:00:00Z'},...feed.cards];
await p.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));await p.waitForFunction(()=>sent.length===1);
await p.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));await p.waitForTimeout(100);assert.equal(await p.evaluate(()=>sent.length),1);
await p.getByRole('button',{name:'关于 Curio'}).click();await p.getByRole('button',{name:'关闭更新通知'}).click();await p.getByRole('button',{name:'关闭',exact:true}).click();
cards=[{...feed.cards[0],id:'muted-notification',publishedAt:'2026-09-14T01:00:00Z'},...cards];await p.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));await p.waitForTimeout(150);assert.equal(await p.evaluate(()=>sent.length),1);
console.log('notifications: explicit permission, new cards, deduplication, opt out pass');
// A burst during one exit may only consume its current card.
const first=await p.locator('.card[tabindex]').getAttribute('data-id');
await p.evaluate(()=>{for(let i=0;i<20;i++)document.querySelector('#next').click();});
await p.waitForFunction(id=>document.querySelector('.card[tabindex]')?.dataset.id!==id,first);
assert.equal(await p.evaluate(()=>Object.keys(JSON.parse(localStorage.getItem('curio:read:v1'))).length),1);
for(let i=0;i<5;i++){
 const current=p.locator('.card[tabindex]');const id=await current.getAttribute('data-id');const r=await current.boundingBox();
 await p.mouse.move(r.x+r.width/2,r.y+r.height/2);await p.mouse.down();await p.mouse.move(r.x+r.width/2+140,r.y+r.height/2,{steps:3});await p.mouse.up();
 await p.waitForFunction(old=>document.querySelector('.card[tabindex]')?.dataset.id!==old,id);
 assert.equal(await p.locator('.table').evaluate(n=>n.classList.contains('is-dragging')),false);
}
// The incoming card must remain beneath the departing card.
await p.locator('#next').click();assert.ok(await p.evaluate(()=>{const cs=[...document.querySelectorAll('.card')];return Number(getComputedStyle(cs.at(-1)).zIndex)>Number(getComputedStyle(cs.at(-2)).zIndex);}));
await p.waitForTimeout(350);
await p.evaluate(ids=>{localStorage.setItem('curio:read:v1',JSON.stringify(Object.fromEntries(ids.map(id=>[id,1]))));localStorage.removeItem('curio:recent:v1');},cards.map(c=>c.id));
await p.reload({waitUntil:'domcontentloaded'});await p.getByRole('button',{name:'手气不错'}).click();
const dropped=p.locator('.card[tabindex]');await dropped.waitFor();
// Start interacting while the drop animation is still running.
await dropped.dispatchEvent('pointerdown',{isPrimary:true,pointerType:'mouse',button:0,clientX:400,clientY:400,pointerId:1});
assert.equal(await dropped.evaluate(c=>c.classList.contains('drop')),false);
assert.equal(await dropped.evaluate(c=>c.getAnimations().length),0);
await dropped.dispatchEvent('pointercancel',{pointerId:1});
console.log('starting a drag cancels active drop animation: pass');
const touchContext=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'});
const touchPage=await touchContext.newPage();await touchPage.goto(base,{waitUntil:'domcontentloaded'});const touchCard=touchPage.locator('.card[tabindex]');await touchCard.waitFor();
await touchCard.click();await touchPage.waitForTimeout(700);const touchId=await touchCard.getAttribute('data-id');const tr=await touchCard.boundingBox();const touchSession=await touchContext.newCDPSession(touchPage);
const tx=tr.x+tr.width/2,ty=tr.y+25;await touchSession.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:tx,y:ty}]});
for(let step=1;step<=5;step++)await touchSession.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:tx+step*28,y:ty}]});
await touchSession.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await touchPage.waitForFunction(id=>document.querySelector('.card[tabindex]')?.dataset.id!==id,touchId);await touchContext.close();
console.log('touch capture transfer and swipe on flipped card: pass');
assert.deepEqual(errors,[]);console.log('rapid input and repeated swipes: stable stacking, single consumption, cleared dragging state pass');await browser.close();
