const ENABLED = 'curio:notifications:v1';
const SEEN = 'curio:notified:v1';

export function setupNotifications(button, status, storage) {
 const supported = 'Notification' in window && window.isSecureContext;
 let enabled = false, seen = new Set();
 try { enabled=storage.getItem(ENABLED)==='true'; seen=new Set(JSON.parse(storage.getItem(SEEN)||'[]')); } catch {}
 const active=()=>supported&&enabled&&Notification.permission==='granted';
 function update() {
  button.disabled=!supported||Notification.permission==='denied';
  button.textContent=active()?'关闭更新通知':'开启更新通知';
  button.setAttribute('aria-pressed',String(active()));
  status.textContent=!supported?'当前浏览器不支持桌面通知。':Notification.permission==='denied'?'通知已被浏览器阻止，可在网站权限设置中允许。':active()?'已开启。保留网页即可接收更新提醒；后台休眠时可能延迟。':'开启后，有新卡片时通知你。关闭网页后不会定时推送。';
 }
 button.onclick=async()=>{
  if(active())enabled=false;
  else {
   try { enabled=(await Notification.requestPermission())==='granted'; }
   catch { status.textContent='暂时无法开启通知，请检查浏览器的网站权限。';return; }
  }
  try {storage.setItem(ENABLED,String(enabled));}catch{}
  update();
 };
 window.addEventListener('storage',e=>{if(e.key===ENABLED||e.key===null){try{enabled=storage.getItem(ENABLED)==='true';}catch{}update();}});
 document.addEventListener('visibilitychange',update);
 update();
 async function notify(cards) {
  if(!active()||!cards.length)return;
  const send=async()=>{
   if(!active())return;
   try{for(const id of JSON.parse(storage.getItem(SEEN)||'[]'))seen.add(id);}catch{}
   const fresh=cards.filter(c=>!seen.has(c.id));if(!fresh.length)return;
   const options={body:`新增 ${fresh.length} 张趣闻：${fresh[0].title}`,icon:'/icons/icon-192.png',tag:'curio-updates',data:{url:'/'}};
   try {
    const registration='serviceWorker' in navigator?await navigator.serviceWorker.getRegistration():null;
    if(registration?.active)await registration.showNotification('Curio · 有新发现',options);
    else {const notification=new Notification('Curio · 有新发现',options);notification.onclick=()=>{window.focus();notification.close();};}
    fresh.forEach(c=>seen.add(c.id));
    try{storage.setItem(SEEN,JSON.stringify([...seen].slice(-2000)));}catch{}
   }catch{status.textContent='通知发送失败，请检查系统与浏览器通知设置。';}
  };
  // Serialize across tabs so a single content batch produces one notification.
  if(navigator.locks)await navigator.locks.request('curio-notifications',send);else await send();
 }
 return {active,notify};
}
