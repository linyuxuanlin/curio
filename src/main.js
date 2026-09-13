import './style.css';
import {READ_KEY, RECENT_KEY, readMap, unread, randomBatch, shouldDismiss, recentIds} from './deck.js';

const app = document.querySelector('#app');
app.innerHTML = `<header><a class="brand" href="/" aria-label="Curio 首页">curio<span class="brand-dot">.</span></a><span class="brand-note">世界很大，好奇一点。</span><button class="about-button" aria-label="关于 Curio">?</button></header><main><section class="table" aria-label="趣闻卡片"><div class="table-note note-left">留一点时间<br>给意料之外。<span>↘</span></div><div id="deck" class="deck" aria-live="polite"><div class="loading">正在打开卡片盒…</div></div><div class="table-note note-right"><span>↙</span>拿起一张，<br>认识一点世界。</div></section><div id="controls" class="controls" hidden><button id="undo" class="round-button" aria-label="撤回上一张" title="撤回上一张">↶ 撤回</button><button id="next" class="round-button next" aria-label="看完了，下一张" title="看完了，下一张">下一张 →</button></div><p id="notice" class="notice" role="status"></p></main><div id="fireworks" class="fireworks" aria-hidden="true"></div><dialog id="about"><button class="close" aria-label="关闭">×</button><p class="eyebrow">ABOUT CURIO</p><h2>给好奇心一个小角落。</h2><p>这里收集真实、有来源的世界趣闻。每张卡片都配有图片，生成图会明确标注为示意图。</p><p>划走才会标记已读。阅读记录只存在当前浏览器，清除网站数据或更换设备后不会保留。“手气不错”会抽取历史卡片，排除本次阅读和最近 30 分钟划走的内容。</p><p>没有广告，也不需要登录。</p><a href="https://github.com/linyuxuanlin/curio" target="_blank" rel="noopener noreferrer">在 GitHub 看看这个小项目 ↗</a></dialog>`;

const deck = document.querySelector('#deck');
const controls = document.querySelector('#controls');
const notice = document.querySelector('#notice');
const fireworks = document.querySelector('#fireworks');
let storage;
try { storage = window.localStorage; } catch { storage = {getItem:()=>null,setItem:()=>{throw Error('Storage unavailable');}}; }
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
let all = [], queue = [], read = readMap(storage, READ_KEY), recent = readMap(storage, RECENT_KEY), session = new Set(), history = [], busy = false, refreshing = false;

const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text) n.textContent = text; return n; };
function persist() { try { storage.setItem(READ_KEY, JSON.stringify(read)); storage.setItem(RECENT_KEY, JSON.stringify(recent)); } catch { notice.textContent = '浏览器未允许保存记录；本次阅读仍可正常使用。'; } }
function dateLabel(s) { return new Intl.DateTimeFormat('zh-CN',{year:'numeric',month:'2-digit',day:'2-digit',timeZone:'Asia/Shanghai'}).format(new Date(s)); }

function createCard(c, index) {
 const card = el('article', 'card');
 card.dataset.id = c.id; card.dataset.theme = c.theme || 'sage'; card.style.setProperty('--index', index);
 card.setAttribute('aria-label', `趣闻｜${c.category}｜${c.title}`);
 if (index) { card.setAttribute('aria-hidden','true'); card.inert = true; }

 const inner = el('div', 'card-inner');
 const front = el('section', 'card-face card-front');
 const back = el('section', 'card-face card-back');
 const serial = `NO. ${String(all.findIndex(x=>x.id===c.id)+1).padStart(3,'0')}`;
 const top = el('div', 'card-top'); top.append(el('span','category',c.category),el('span','serial',serial));
 const topBack = el('div', 'card-top'); topBack.append(el('span','category',c.category),el('span','serial',`${serial} · BACK`));
 front.append(top); back.append(topBack);

 const figure = el('figure','card-image');
 const img = el('img'); img.src = c.image.src; img.alt = c.image.alt; img.draggable = false; img.loading = index ? 'lazy' : 'eager'; img.style.objectFit = c.image.layout === 'poster' ? 'contain' : 'cover';
 img.addEventListener('error',()=> { figure.replaceChildren(el('p','image-error','图片暂时无法加载 · 可查看背面来源')); });
 figure.append(img);
 if (c.image.kind === 'generated') figure.append(el('span','image-label','示意图 · 非现场照片'));
 front.append(figure);

 const frontBody = el('div','card-body');
 frontBody.append(el('p','meta',`${dateLabel(c.eventDate)} · ${c.location}${c.archive ? ' · 往期精选' : ''}`));
 frontBody.append(el('h2','',c.title),el('p','summary',c.summary));
 front.append(frontBody);
 front.append(el('p','flip-hint','点击卡片翻面'));

 const backBody = el('div','back-body');
 for (const p of c.body) backBody.append(el('p','detail-body',p));
 const sources = el('div','sources'); sources.append(el('span','sources-label','来源'));
 for (const s of c.sources) { const a=el('a','',`${s.name} ↗`); a.href=s.url; a.target='_blank'; a.rel='noopener noreferrer'; sources.append(a); }
 backBody.append(sources);
 const credit=el('p','credit',`图片：${c.image.credit} · ${c.image.license}`); const sourceLink=el('a','',' 图片出处 ↗'); sourceLink.href=c.image.sourceUrl; sourceLink.target='_blank'; sourceLink.rel='noopener noreferrer'; credit.append(sourceLink); backBody.append(credit);
 back.append(backBody);
 inner.append(front,back); card.append(inner);
 if (!index) bindDrag(card);
 card.addEventListener('click', e => {
  if (index || busy || e.target.closest('a,button,summary,details') || card.classList.contains('dragging')) return;
  toggleFlip(card);
 });
 return card;
}

function render(drop=false) {
 deck.replaceChildren(); busy=false;
 controls.hidden = !queue.length;
 document.querySelector('#undo').disabled=!history.length;
 if (!queue.length) { renderEmpty(); return; }
 queue.slice(0,3).reverse().forEach((c,r)=> { const index=Math.min(queue.length,3)-1-r; const card=createCard(c,index); if(drop&&!reduced) card.classList.add('drop'); deck.append(card); });
}
function renderEmpty() {
 const box=el('div','empty'); box.append(el('div','empty-stamp','✳'),el('p','empty-label', all.length?'全部新发现，已收下':'好奇心，正在路上'),el('h2','',all.length?'世界还有好多面。':'下一张，很快见。'),el('p','',all.length?'让偶然，决定下一张。':'有新的趣闻时，会出现在这里。'));
 const lucky=el('button','lucky'); lucky.append(el('span','lucky-icon','✣'),el('span','','手气不错'),el('span','lucky-arrow','↓')); lucky.addEventListener('click',()=>deal()); box.append(lucky);
 const available=randomBatch(all,new Set([...session,...recentIds(recent)]),5).length; lucky.disabled=!available; box.append(el('p','empty-fine',available?'随机掉落最多 5 张 · 不重复刚读过的':'这次都看过啦，过一会儿再来发现。'));
 if (history.length) { const back=el('button','text-button','↶ 撤回上一张'); back.addEventListener('click',undo); box.append(back); }
 deck.append(box);
}
function celebrate() {
 if (reduced || !fireworks) return;
 fireworks.replaceChildren();
 const bursts = [[24,28,'#b6c77d'],[70,24,'#d59673'],[50,18,'#8da8b4'],[78,43,'#c5a36d']];
 for (const [left, top, color] of bursts) {
  const burst = el('div', 'firework-burst'); burst.style.left = `${left}%`; burst.style.top = `${top}%`;
  for (let i = 0; i < 24; i += 1) {
   const spark = el('i', 'firework-spark');
   const angle = (Math.PI * 2 * i) / 24 + (Math.random() - .5) * .12;
   const distance = 46 + Math.random() * 64;
   spark.style.setProperty('--x', `${Math.cos(angle) * distance}px`);
   spark.style.setProperty('--y', `${Math.sin(angle) * distance}px`);
   spark.style.setProperty('--delay', `${Math.random() * 100}ms`);
   spark.style.setProperty('--color', color);
   burst.append(spark);
  }
  fireworks.append(burst);
 }
 window.setTimeout(() => fireworks.replaceChildren(), 1550);
}
function deal() { if(busy)return; queue=randomBatch(all,new Set([...session,...recentIds(recent)])); history=[]; render(true); }
async function dismiss(direction=1,dx=0,dy=0,rotation=0) {
 if(busy||!queue.length)return; busy=true;
 const c=queue[0], card=deck.querySelector('.card[data-id="'+c.id+'"]');
 if(!reduced&&card) {
  const distance=Math.hypot(dx,dy), ux=distance?dx/distance:direction, uy=distance?dy/distance:-.12, travel=Math.max(innerWidth,innerHeight)+500;
  const animations=[card.animate([{transform:`translate(${dx}px,${dy}px) rotate(${rotation}deg)`},{transform:`translate(${ux*travel}px,${uy*travel}px) rotate(${rotation+ux*38+uy*18}deg)`,opacity:0}],{duration:280,easing:'cubic-bezier(.3,.05,.75,.4)',fill:'forwards'})];
  const next=queue[1]&&deck.querySelector('.card[data-id="'+queue[1].id+'"]');
  if(next){
   next.style.zIndex='5';
   animations.push(next.animate([{transform:'translateY(8px) rotate(3deg) scale(.983)'},{transform:'translateY(0) rotate(0deg) scale(1)'}],{duration:280,easing:'cubic-bezier(.22,.75,.2,1)',fill:'forwards'}));
  }
  await Promise.all(animations.map(animation=>animation.finished.catch(()=>{})));
 }
 history.push({card:c,previousRead:read[c.id],previousRecent:recent[c.id],previousSession:session.has(c.id)}); queue.shift(); read[c.id]=Date.now(); recent[c.id]=Date.now(); session.add(c.id); persist(); render(); if(!queue.length&&unread(all,read).length===0)celebrate();
}
function undo() { if(busy||!history.length)return; const h=history.pop(); queue.unshift(h.card); if(h.previousRead)read[h.card.id]=h.previousRead;else delete read[h.card.id]; if(h.previousRecent)recent[h.card.id]=h.previousRecent;else delete recent[h.card.id]; if(!h.previousSession)session.delete(h.card.id); persist(); render(); }

function bindDrag(card) {
 let drag=null;
 const table=card.closest('.table');
 card.addEventListener('pointerdown',e=> { if(busy||!e.isPrimary||(e.pointerType==='mouse'&&e.button!==0)||e.target.closest('a,button,summary,details'))return; drag={x:e.clientX,y:e.clientY,t:e.timeStamp,lastX:e.clientX,lastT:e.timeStamp,v:0,dx:0,dy:0,locked:false}; });
 card.addEventListener('pointermove',e=> { if(!drag||!e.isPrimary)return; const dx=e.clientX-drag.x,dy=e.clientY-drag.y; if(!drag.locked){if(Math.max(Math.abs(dx),Math.abs(dy))<8)return;drag.locked=true;card.setPointerCapture(e.pointerId);card.classList.add('dragging');table?.classList.add('is-dragging');} e.preventDefault(); const dt=Math.max(1,e.timeStamp-drag.lastT);drag.v=Math.hypot(e.clientX-drag.lastX,e.clientY-drag.lastY)/dt;drag.lastX=e.clientX;drag.lastY=e.clientY;drag.lastT=e.timeStamp;drag.dx=dx;drag.dy=dy;drag.rotation=dx*.045-dy*.02;card.style.transform=`translate(${dx}px,${dy}px) rotate(${drag.rotation}deg)`; },{passive:false});
 const end=(e,cancel=false)=> { if(!drag)return; const d=drag;drag=null;card.classList.remove('dragging');if(card.hasPointerCapture(e.pointerId))card.releasePointerCapture(e.pointerId);if(!cancel&&d.locked&&shouldDismiss(Math.hypot(d.dx,d.dy),e.timeStamp-d.lastT<100?d.v:0,card.offsetWidth)){dismiss(1,d.dx,d.dy,d.rotation).finally(()=>table?.classList.remove('is-dragging'));}else{table?.classList.remove('is-dragging');card.style.transition=reduced?'none':'transform 460ms cubic-bezier(.18,1.5,.35,1)';card.style.transform='';setTimeout(()=>card.style.transition='',470);} };
 card.addEventListener('pointerup',e=>end(e)); card.addEventListener('pointercancel',e=>end(e,true)); card.addEventListener('touchmove',e=>{if(drag?.locked)e.preventDefault();},{passive:false});
}

function usableCard(c) {
 return c && typeof c === 'object' && typeof c.id === 'string' && typeof c.category === 'string' && typeof c.title === 'string' && typeof c.summary === 'string' && Array.isArray(c.body) && Array.isArray(c.sources) && c.image && typeof c.image === 'object' && typeof c.image.src === 'string' && typeof c.image.alt === 'string' && typeof c.image.credit === 'string' && typeof c.image.license === 'string' && typeof c.image.sourceUrl === 'string';
}

async function loadFeed() {
 const urls=[`/feed.json?ts=${Date.now()}`,'/feed.json'];
 let lastError;
 for(const url of urls){
  try { const response=await fetch(url,{cache:'default'}); if(!response.ok)throw Error(`feed:${response.status}`); const feed=await response.json(); if(!Array.isArray(feed.cards))throw Error('data'); const cards=feed.cards.filter(usableCard); if(!cards.length)throw Error('data'); return {...feed,cards}; }
  catch(error){ lastError=error; }
 }
 throw lastError||Error('feed');
}
async function refresh(initial=false) {
 if(refreshing)return; refreshing=true;
 try { const feed=await loadFeed();
  const previous=new Set(all.map(c=>c.id)); all=feed.cards;
  if(initial){queue=unread(all,read);render();} else {const additions=all.filter(c=>!previous.has(c.id)&&!read[c.id]);if(additions.length){queue.push(...additions);notice.textContent=`又有 ${additions.length} 张新发现，已经放进卡片盒。`;if(!busy)render();}}
 } catch (error) { console.error('[curio] load/render failed', error); if(initial){notice.textContent='卡片暂时没能送达';deck.replaceChildren();const box=el('div','empty');box.append(el('h2','','再试一下？'),el('p','','网络有点慢，重新打开卡片盒就好。'));const retry=el('button','lucky','重新加载');retry.onclick=()=>refresh(true);box.append(retry);deck.append(box);} else notice.textContent='暂时无法获取更新，已打开的卡片仍可阅读。';} finally {refreshing=false;}
}

function toggleFlip(card) { const flipped=card.classList.toggle('is-flipped'); card.setAttribute('aria-label', `${flipped?'返回正面':'查看详情'}｜${card.dataset.id}`); }
document.querySelector('#next').onclick=()=>dismiss(1); document.querySelector('#undo').onclick=undo;
document.addEventListener('keydown',e=>{if(document.querySelector('dialog[open]')||e.target.closest('button,a,summary,input'))return;if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();dismiss(e.key==='ArrowRight'?1:-1);}});
const about=document.querySelector('#about'); document.querySelector('.about-button').onclick=()=>about.showModal(); about.querySelector('.close').onclick=()=>about.close(); about.addEventListener('click',e=>{if(e.target===about&&e.clientX>=0){const r=about.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)about.close();}});
window.addEventListener('storage',e=>{if(e.key===READ_KEY&&!busy){read=readMap(storage,READ_KEY);queue=queue.filter(c=>!read[c.id]);render();}if(e.key===RECENT_KEY)recent=readMap(storage,RECENT_KEY);});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();}); setInterval(()=>{if(!document.hidden)refresh();},300000); refresh(true);
