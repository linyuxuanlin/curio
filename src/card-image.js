export function createCardImage(image,index) {
 const figure=document.createElement('figure');figure.className='card-image';
 const img=document.createElement('img');img.alt=image.alt;img.draggable=false;
 img.loading=index<2?'eager':'lazy';img.fetchPriority=index===0?'high':'low';img.decoding='async';
 img.style.objectFit=image.layout==='poster'?'contain':'cover';
 const status=document.createElement('div');status.className='image-status';status.setAttribute('role','status');
 const message=document.createElement('p');message.textContent='正在加载图片…';
 const retry=document.createElement('button');retry.type='button';retry.textContent='重新加载';retry.hidden=true;
 status.append(message,retry);figure.append(img,status);
 if(image.kind==='generated'){const label=document.createElement('span');label.className='image-label';label.textContent='示意图 · 非现场照片';figure.append(label);}
 let timer;
 const slow=()=>{if(!img.isConnected)return;status.hidden=false;status.classList.add('image-error');message.textContent='图片加载较慢，可继续阅读或重试';retry.hidden=false;};
 const start=()=>{
  clearTimeout(timer);status.hidden=false;status.classList.remove('image-error');message.textContent='正在加载图片…';retry.hidden=true;
  img.sizes='(max-width: 600px) 90vw, 480px';
  if(typeof image.srcset==='string'&&/^\/media\/optimized\/[a-f0-9]+-(?:480|960)\.webp [1-9][0-9]{0,3}w(?:, \/media\/optimized\/[a-f0-9]+-960\.webp [1-9][0-9]{0,3}w)?$/.test(image.srcset))img.srcset=image.srcset;
  img.src=image.src;
  if(index<2)timer=setTimeout(slow,12000);
 };
 img.onload=()=>{clearTimeout(timer);status.hidden=true;};
 img.onerror=()=>{clearTimeout(timer);status.hidden=false;status.classList.add('image-error');message.textContent='图片暂时无法加载，可重试或查看背面来源';retry.hidden=false;};
 retry.onclick=()=>{img.removeAttribute('srcset');img.removeAttribute('src');start();};
 start();return figure;
}
