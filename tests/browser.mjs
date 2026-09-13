import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE});
const context=await browser.newContext({reducedMotion:'reduce',serviceWorkers:'block'});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto(process.env.CURIO_TEST_URL || 'http://127.0.0.1:5173',{waitUntil:'domcontentloaded'});await page.waitForSelector('.card');
for(const [width,height] of [[1440,900],[1280,720],[390,844],[375,667],[320,568],[844,390]]){
 await page.setViewportSize({width,height});await page.waitForTimeout(200);
 const card=page.locator('.card[tabindex]');const rect=await card.boundingBox();const controls=await page.locator('#controls').boundingBox();assert.ok(rect.y+rect.height<controls.y,`overlap ${width}x${height}`);
 await card.focus();if(!await card.evaluate(c=>c.classList.contains('is-flipped')))await page.keyboard.press('Enter');
 const texts=[];do{texts.push(await card.locator('.back-body').innerText());assert.ok(await card.locator('.back-body').evaluate(n=>n.scrollHeight<=n.clientHeight+1),`overflow ${width}x${height}`);if(await card.getByRole('button',{name:'下一页',exact:true}).isDisabled())break;await card.getByRole('button',{name:'下一页',exact:true}).click();}while(texts.length<100);
 const expected=await page.evaluate(async()=>{const f=await(await fetch('/feed.json')).json();return f.cards[0].body.join('').replace(/\s/g,'');});assert.ok(texts.join('').replace(/\s/g,'').includes(expected),`missing text ${width}`);
 console.log('viewport and complete reading',width,height,texts.length);
}
await page.setViewportSize({width:390,height:844});await page.waitForTimeout(200);
const card=page.locator('.card[tabindex]');await card.focus();await page.keyboard.press('Enter');
const old=await card.getAttribute('data-id');const box=await card.boundingBox();
await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2+20,box.y+box.height/2+5,{steps:4});await page.mouse.up();await page.waitForTimeout(50);assert.equal(await card.evaluate(c=>c.classList.contains('is-flipped')),false);
await page.locator('#next').click();assert.notEqual(await page.locator('.card[tabindex]').getAttribute('data-id'),old);await page.locator('#undo').click();assert.equal(await page.locator('.card[tabindex]').getAttribute('data-id'),old);
console.log('drag, keyboard, dismiss, undo: pass');
await page.setViewportSize({width:320,height:568});await page.waitForTimeout(200);
const feed=await page.evaluate(async()=>await(await fetch('/feed.json')).json());
for(const expected of feed.cards){
 const current=page.locator('.card[tabindex]');assert.equal(await current.getAttribute('data-id'),expected.id);
 await current.focus();await page.keyboard.press('Enter');let text='';const links=[];
 do {text+=await current.locator('.back-body').innerText();links.push(...await current.locator('.back-body a').evaluateAll(ns=>ns.map(n=>n.href)));
 assert.ok(await current.locator('.back-body').evaluate(n=>n.scrollHeight<=n.clientHeight+1),expected.id);
 if(await current.getByRole('button',{name:'下一页',exact:true}).isDisabled())break;
 await current.getByRole('button',{name:'下一页',exact:true}).click();}while(true);
 assert.ok(text.replace(/\s/g,'').includes(expected.body.join('').replace(/\s/g,'')),expected.id);
 for(const source of expected.sources)assert.ok(links.includes(source.url),expected.id+' source');
 assert.ok(links.includes(expected.image.licenseUrl));await page.locator('#next').click();
}
await page.getByRole('heading',{name:'已读完',exact:true}).waitFor();assert.ok(await page.getByRole('button',{name:'手气不错'}).isDisabled());
console.log('all 25 cards: complete body, links, credit, exhausted state pass');
const second=await page.context().newPage();await second.goto(process.env.CURIO_TEST_URL || 'http://127.0.0.1:5173',{waitUntil:'domcontentloaded'});
await second.evaluate(()=>localStorage.clear());await page.waitForSelector('.card[tabindex]');
assert.equal(await page.locator('.card[tabindex]').getAttribute('data-id'),feed.cards[0].id);
await second.reload({waitUntil:'domcontentloaded'});await second.waitForSelector('.card[tabindex]');await page.locator('#next').click();
await second.waitForFunction(id=>document.querySelector('.card[tabindex]')?.dataset.id!==id,feed.cards[0].id);
console.log('cross-tab clear and read synchronization: pass');
assert.deepEqual(errors,[]);await browser.close();
