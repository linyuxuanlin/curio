import './style.css';
import {READ_KEY, RECENT_KEY, readMap, unread, randomBatch, shouldDismiss, recentIds} from './deck.js';
const app = document.querySelector('#app');
app.innerHTML = `<header><a class="brand" href="/" aria-label="Curio 首页">curio<span class="brand-dot">.</span></a><span class="brand-note">世界很大，好奇一点。</span><button class="about-button" aria-label="关于 Curio">?</button></header><main><div class="eyebrow"><span class="live-dot"></span><span id="mode-label">今日份的好奇心</span></div><div class="heading"><h1>趣闻，一张一张看<span>。</span></h1><p id="deck-count" role="status">正在整理新发现…</p></div><section class="table" aria-label="趣闻卡片"><div class="table-note note-left">留一点时间<br>给意料之外。<span>↘</span></div><div id="deck" class="deck" aria-live="polite"><div class="loading">正在打开卡片盒…</div></div><div class="table-note note-right"><span>↙</span>拿起一张，<br>认识一点世界。</div></section><div id="controls" class="controls" hidden><button id="undo" class="round-button" aria-label="撤回上一张" title="撤回上一张">↶</button><span class="swipe-hint">← 左右划走，收下这份新鲜 →</span><button id="next" class="round-button next" aria-label="看完了，下一张" title="看完了，下一张">→</button></div><p id="notice" class="notice" role="status"></p></main><footer><span>一点新鲜，一点惊喜。</span><span>CURATED CURIOSITIES <i>✳</i> CURIO</span></footer><dialog id="about"><button class="close" aria-label="关闭">×</button><p class="eyebrow">ABOUT CURIO</p><h2>给好奇心一个小角落。</h2><p>这里收集真实、有来源的世界趣闻。每张卡片都可以查看原始出处；没有可合法使用的图片时，就安静地读文字。</p><p>划走才会标记已读。阅读记录只存在当前浏览器，清除网站数据或更换设备后不会保留。“手气不错”会抽取历史卡片，排除本次阅读和最近 30 分钟划走的内容。</p><p>没有广告，也不需要登录。</p><a href="https://github.com/linyuxuanlin/curio" target="_blank" rel="noopener noreferrer">在 GitHub 看看这个小项目 ↗</a></dialog>`;
const deck = document.querySelector('#deck');
const controls = document.querySelector('#controls');
const count = document.querySelector('#deck-count');
const notice = document.querySelector('#notice');
let storage; try { storage = window.localStorage; } catch { storage = {getItem:()=>null,setItem:()=>{throw Error('Storage unavailable');}}; }
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
let all = [], queue = [], read = readMap(storage, READ_KEY), recent = readMap(storage, RECENT_KEY), session = new Set(), history = [], busy = false, mode = 'new', refreshing = false;
const el = (tag, cls, text) => { const n = document.createElement(tag); if(cls) n.className = cls; if(text) n.textContent = text; return n; };
function persist() { try { storage.setItem(READ_KEY, JSON.stringify(read)); storage.setItem(RECENT_KEY, JSON.stringify(recent)); } catch { notice.textContent = '浏览器未允许保存记录；本次阅读仍可正常使用。'; } }
function dateLabel(s) { return new Intl.DateTimeFormat('zh-CN',{year:'numeric',month:'2-digit',day:'2-digit',timeZone:'Asia/Shanghai'}).format(new Date(s)); }
function createCard(c, index) {
 const card = el('article', `card ${c.image ? '' : 'text-card'}`); card.dataset.id = c.id; card.dataset.theme = c.theme || 'sage'; card.style.setProperty('--index', index); card.setAttribute('aria-label',`趣闻｜${c.category}｜${c.title}`);
 if(index) { card.setAttribute('aria-hidden','true'); card.inert = true; }
 const inside = el('div','card-scroll');
 const top = el('div','card-top'); top.append(el('span','category',c.category),el('span','serial',`NO. ${String(all.findIndex(x=>x.id===c.id)+1).padStart(3,'0')}`)); inside.append(top);
 if(c.image) { const figure = el('figure','card-image'); const img = el('img'); img.src = c.image.src; img.alt = c.image.alt; img.draggable = false; img.loading = index ? 'lazy' : 'eager'; img.style.objectFit = c.image.layout === 'poster' ? 'contain' : 'cover'; img.addEventListener('error',()=> { figure.replaceChildren(el('p','image-error','原图暂时无法加载 · 可查看下方来源')); }); figure.append(img); if(c.image.kind === 'generated') figure.append(el('span','image-label','示意图 · 非现场照片')); inside.append(figure); }
 else { inside.append(el('div','text-divider','一 则 新 发 现')); }
 const body = el('div','card-body');
 const meta = el('p','meta',`${dateLabel(c.eventDate)} · ${c.location}${c.archive ? ' · 往期精选' : ''}`);
 const title = el('h2','',c.title); body.append(meta,title,el('p','summary',c.summary));
 const details = el('details','details'); const summary = el('summary','', '展开正文与来源'); details.append(summary);
 for(const p of c.body) details.append(el('p','detail-body',p));
 const sources = el('div','sources'); sources.append(el('span','sources-label','来源'));
 for(const s of c.sources) { const a=el('a','',`${s.name} ↗`); a.href=s.url;a.target='_blank';a.rel='noopener noreferrer'; sources.append(a); }
 details.append(sources);
 if(c.image) { const credit=el('p','credit',`图片：${c.image.credit} · ${c.image.license}`); const a=el('a','',' 图片出处 ↗'); a.href=c.image.sourceUrl;a.target='_blank';a.rel='noopener noreferrer';credit.append(a);details.append(credit); }
 body.append(details); inside.append(body); inside.append(el('div','card-bottom','CURIO  /  保持好奇')); card.append(inside);
 if(!index) bindDrag(card);
 return card;
}
function render(drop=false) {
 deck.replaceChildren(); busy=false;
 document.querySelector('#mode-label').textContent=mode==='random'?'偶遇一些好发现':'今日份的好奇心';
 count.textContent = queue.length ? `${mode==='random'?'随机掉落':'还有'} ${queue.length} 张${mode==='random'?'，慢慢看':'未读，慢慢看'}` : '新鲜看完了，好奇心还在。';
 controls.hidden = !queue.length;
 document.querySelector('#undo').disabled=!history.length;
 if(!queue.length) { renderEmpty(); return; }
 queue.slice(0,3).reverse().forEach((c,r)=> { const index=Math.min(queue.length,3)-1-r; const card=createCard(c,index); if(drop&&!reduced) card.classList.add('drop');deck.append(card); });
}
function renderEmpty() {
 const box=el('div','empty'); box.append(el('div','empty-stamp','✳'),el('p','empty-label', all.length?'全部新发现，已收下':'好奇心，正在路上'),el('h2','',all.length?'世界还有好多面。':'下一张，很快见。'),el('p','',all.length?'让偶然，决定下一张。':'有新的趣闻时，会出现在这里。'));
 const lucky=el('button','lucky'); lucky.append(el('span','lucky-icon','✣'),el('span','','手气不错'),el('span','lucky-arrow','↓')); lucky.addEventListener('click',()=>deal());box.append(lucky);
 const available=randomBatch(all,new Set([...session,...recentIds(recent)]),5).length;
 lucky.disabled=!available;
 box.append(el('p','empty-fine',available?`随机掉落最多 5 张 · 不重复刚读过的`:'这次都看过啦，过一会儿再来发现。'));
 if(history.length) {const back=el('button','text-button','↶ 撤回上一张');back.addEventListener('click',undo);box.append(back);}
 deck.append(box);
}
function deal() { if(busy)return; queue=randomBatch(all,new Set([...session,...recentIds(recent)]));mode='random';history=[];render(true); }
async function dismiss(direction=1,dx=0,dy=0,rotation=0) {
 if(busy||!queue.length)return;busy=true;
 const c=queue[0], card=deck.querySelector('.card[data-id="'+c.id+'"]');
 if(!reduced&&card) {const animation=card.animate([{transform:`translate(${dx}px,${dy}px) rotate(${rotation}deg)`},{transform:`translate(${direction*(innerWidth+500)}px,${dy-80}px) rotate(${direction*38}deg)`,opacity:0}],{duration:360,easing:'cubic-bezier(.3,.05,.75,.4)',fill:'forwards'});await animation.finished.catch(()=>{});}
 history.push({card:c,previousRead:read[c.id],previousRecent:recent[c.id],previousSession:session.has(c.id)});queue.shift();read[c.id]=Date.now();recent[c.id]=Date.now();session.add(c.id);persist();render();
}
function undo() {if(busy||!history.length)return;const h=history.pop();queue.unshift(h.card);if(h.previousRead)read[h.card.id]=h.previousRead;else delete read[h.card.id];if(h.previousRecent)recent[h.card.id]=h.previousRecent;else delete recent[h.card.id];if(!h.previousSession)session.delete(h.card.id);persist();render();}
function bindDrag(card) {
 let drag=null;
 card.addEventListener('pointerdown',e=> {if(busy||e.button!==0||e.target.closest('a,button,summary,details'))return;drag={x:e.clientX,y:e.clientY,t:e.timeStamp,lastX:e.clientX,lastT:e.timeStamp,v:0,dx:0,dy:0,locked:false};});
 card.addEventListener('pointermove',e=> {if(!drag)return;let dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(!drag.locked&&Math.abs(dy)>12&&Math.abs(dy)>Math.abs(dx)){drag=null;return;}if(!drag.locked&&Math.abs(dx)>7){drag.locked=true;card.setPointerCapture(e.pointerId);card.classList.add('dragging');}if(!drag.locked)return;drag.v=(e.clientX-drag.lastX)/Math.max(1,e.timeStamp-drag.lastT);drag.lastX=e.clientX;drag.lastT=e.timeStamp;drag.dx=dx;drag.dy=dy*.28;card.style.transform=`translate(${dx}px,${drag.dy}px) rotate(${dx*.055}deg)`;});
 const end=(e,cancel=false)=> {if(!drag)return;const d=drag;drag=null;card.classList.remove('dragging');if(card.hasPointerCapture(e.pointerId))card.releasePointerCapture(e.pointerId);if(!cancel&&d.locked&&shouldDismiss(d.dx,e.timeStamp-d.lastT<100?d.v:0,card.offsetWidth))dismiss(Math.sign(d.dx),d.dx,d.dy,d.dx*.055);else{card.style.transition=reduced?'none':'transform 460ms cubic-bezier(.18,1.5,.35,1)';card.style.transform='';setTimeout(()=>card.style.transition='',470);}};
 card.addEventListener('pointerup',e=>end(e));card.addEventListener('pointercancel',e=>end(e,true));
}
async function refresh(initial=false) {
 if(refreshing)return;refreshing=true;
 try {const response=await fetch('/feed.json',{cache:'no-store'});if(!response.ok)throw Error('feed');const feed=await response.json();if(!Array.isArray(feed.cards))throw Error('data');
 const previous=new Set(all.map(c=>c.id));all=feed.cards;
 if(initial){queue=unread(all,read);render();}
 else {const additions=all.filter(c=>!previous.has(c.id)&&!read[c.id]);if(additions.length){queue.push(...additions);notice.textContent=`又有 ${additions.length} 张新发现，已经放进卡片盒。`;if(!busy)render();}}
 }catch{if(initial){count.textContent='卡片暂时没能送达';deck.replaceChildren();const box=el('div','empty');box.append(el('h2','','再试一下？'),el('p','','网络有点慢，重新打开卡片盒就好。'));const retry=el('button','lucky','重新加载');retry.onclick=()=>refresh(true);box.append(retry);deck.append(box);}else notice.textContent='暂时无法获取更新，已打开的卡片仍可阅读。';}finally{refreshing=false;}
}
document.querySelector('#next').onclick=()=>dismiss(1);document.querySelector('#undo').onclick=undo;
document.addEventListener('keydown',e=>{if(document.querySelector('dialog[open]')||e.target.closest('button,a,summary,input'))return;if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();dismiss(e.key==='ArrowRight'?1:-1);}});
const about=document.querySelector('#about');document.querySelector('.about-button').onclick=()=>about.showModal();about.querySelector('.close').onclick=()=>about.close();about.addEventListener('click',e=>{if(e.target===about&&e.clientX>=0){const r=about.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)about.close();}});
window.addEventListener('storage',e=>{if(e.key===READ_KEY&&!busy){read=readMap(storage,READ_KEY);queue=queue.filter(c=>!read[c.id]);render();}if(e.key===RECENT_KEY)recent=readMap(storage,RECENT_KEY);});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});setInterval(()=>{if(!document.hidden)refresh();},300000);refresh(true);
