import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE});
for(const viewport of [{width:390,height:844},{width:1440,height:900},{width:320,height:568}]){
 const context=await browser.newContext({viewport,reducedMotion:'reduce',serviceWorkers:'block'});
 const page=await context.newPage();let requests=0;
 await page.route('**/pagead2.googlesyndication.com/**',route=>{requests++;return route.fulfill({contentType:'text/javascript',body:'window.adsbygoogle={push(){window.adRequests=(window.adRequests||0)+1}}'});});
 await page.route('**/feed.json*',async route=>{const response=await route.fetch();const feed=await response.json();feed.cards=feed.cards.slice(0,12).map(c=>({...c,body:['这里是一条简短的趣闻。']}));await route.fulfill({json:feed});});
 await page.goto('http://127.0.0.1:5179/');
 const shown=[];
 for(let i=1;i<=10;i++){
  const card=page.locator('.card[tabindex]');await card.focus();await page.keyboard.press('Enter');await page.waitForTimeout(780);
  const ad=card.locator('.card-ad');
  if(await ad.count()){
   shown.push(i);const overlap=await card.evaluate(c=>{const a=c.querySelector('.card-ad').getBoundingClientRect(),b=c.querySelector('.back-body').lastElementChild.getBoundingClientRect(),p=c.querySelector('.pager').getBoundingClientRect();return a.top<b.bottom+20||a.bottom>p.top;});assert.equal(overlap,false);
   await ad.locator('span').click();assert(await card.evaluate(c=>c.classList.contains('is-flipped')));
  }
  await page.locator('#next').click();
 }
 if(viewport.width===320){assert.deepEqual(shown,[]);assert.equal(requests,0);}else assert.deepEqual(shown,[3,8]);
 await page.reload();await page.locator('.card[tabindex]').focus();await page.keyboard.press('Enter');await page.waitForTimeout(780);assert.equal(await page.locator('.card-ad').count(),0);
 console.log(viewport,shown);await context.close();
}
await browser.close();
