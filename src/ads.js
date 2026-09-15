import {adsenseConfig} from './ads-config.js';
// Explicit opt-in: account category blocks and Auto ads settings must be reviewed first.
export function createAdPolicy() {
 let position=0, lastAd=-Infinity;
 const seen=new Map(), attempted=new Set();
 return {
  visit(id) { if(!seen.has(id)){position++;seen.set(id,position);} return seen.get(id); },
  eligible(id, visit) { return visit>2 && visit===position && position-lastAd>=5 && !attempted.has(id); },
  claim(id,visit) { if(!this.eligible(id,visit))return false;attempted.add(id);lastAd=position;return true; }
 };
}
export function hasAdSpace(width,height,used,pages) {
 return pages===1 && width>=300 && used<=height*.55 && height-used>=302;
}
export function createAds() {
 const client=import.meta.env.VITE_ADSENSE_CLIENT||adsenseConfig.client;
 const slot=import.meta.env.VITE_ADSENSE_SLOT||adsenseConfig.slot;
 const enabled=(import.meta.env.VITE_ADSENSE_ENABLED===undefined ? adsenseConfig.enabled && location.hostname===adsenseConfig.hostname : import.meta.env.VITE_ADSENSE_ENABLED==='true') && /^ca-pub-\d{16}$/.test(client) && /^\d+$/.test(slot);
 const startsAt=import.meta.env.VITE_ADSENSE_ENABLED==='true' ? 0 : Date.parse(adsenseConfig.notBefore)||0;
 const policy=createAdPolicy();let loading;
 function load() {
  return loading ||= new Promise((resolve,reject)=>{
   const script=document.createElement('script');script.async=true;script.crossOrigin='anonymous';
   script.src=`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`;
   script.onload=resolve;script.onerror=reject;document.head.append(script);
  });
 }
 return {attach(card,body,back,current) {
  const visit=policy.visit(card.dataset.id);let timer,area,requested=false;
  function space() {
   const rect=body.getBoundingClientRect(), last=body.lastElementChild;
   const used=last?last.getBoundingClientRect().bottom-rect.top:0;
   const css=getComputedStyle(body);
   return hasAdSpace(body.clientWidth-parseFloat(css.paddingLeft)-parseFloat(css.paddingRight),body.clientHeight,used,Number(body.dataset.pages));
  }
  function ready() {return Date.now()>=startsAt && card.isConnected && current() && !document.hidden && card.classList.contains('is-flipped') && !card.classList.contains('dragging') && space();}
  async function show() {
   if(!ready()||requested||!policy.eligible(card.dataset.id,visit))return;
   try {await load();}catch{return;}
   if(!ready()||requested||!policy.claim(card.dataset.id,visit))return;
   requested=true;
   area=document.createElement('aside');area.className='card-ad';area.setAttribute('aria-label','广告');
   const label=document.createElement('span');label.textContent='广告';
   const ad=document.createElement('ins');ad.className='adsbygoogle';ad.style.cssText='display:block;width:300px;height:250px';ad.dataset.adClient=client;ad.dataset.adSlot=slot;
   area.append(label,ad);back.append(area);
   area.style.bottom=`${back.getBoundingClientRect().bottom-body.getBoundingClientRect().bottom+8}px`;
   try {(window.adsbygoogle ||= []).push({});} catch {area.remove();}
  }
  return () => {
   clearTimeout(timer);
   if(!enabled)return;
   // If resizing removes the available space, retire this request permanently.
   if(area && !space()){area.remove();area=null;}
   if(!requested)timer=setTimeout(show,700);
  };
 }};
}
