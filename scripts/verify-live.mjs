const id=process.argv[2];if(!id)throw Error('Usage: node scripts/verify-live.mjs <card-id>');
const origins=['https://curio.wiki-power.com','https://curio-eup.pages.dev'];
const errors=[];
for(const origin of origins){
 try{
  const response=await fetch(`${origin}/feed.json?verify=${Date.now()}`,{signal:AbortSignal.timeout(20000),headers:{'Cache-Control':'no-cache'}});
  if(!response.ok)throw Error(`Feed HTTP ${response.status}`);
  const data=await response.json();const card=data.cards.find(c=>c.id===id);if(!card)throw Error(`Not live yet: ${id}`);
  if(card.image){const image=await fetch(new URL(card.image.src,origin),{signal:AbortSignal.timeout(20000),headers:{'Cache-Control':'no-cache'}});if(!image.ok||!image.headers.get('content-type')?.startsWith('image/'))throw Error('Image not available');await image.body?.cancel();}
  console.log(`Live verified at ${origin}: ${card.id} — ${card.title.replaceAll('\n','')}`);process.exit(0);
 }catch(error){errors.push(`${origin}: ${error.message}`);}
}
throw Error(errors.join(' | '));
