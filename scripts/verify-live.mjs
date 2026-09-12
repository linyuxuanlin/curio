const id=process.argv[2];if(!id)throw Error('Usage: node scripts/verify-live.mjs <card-id>');
const origin='https://curio.wiki-power.com';
const response=await fetch(`${origin}/feed.json?verify=${Date.now()}`,{signal:AbortSignal.timeout(20000),headers:{'Cache-Control':'no-cache'}});
if(!response.ok)throw Error(`Feed HTTP ${response.status}`);
const data=await response.json();const card=data.cards.find(c=>c.id===id);if(!card)throw Error(`Not live yet: ${id}`);
if(card.image){const image=await fetch(new URL(card.image.src,origin),{signal:AbortSignal.timeout(20000)});if(!image.ok||!image.headers.get('content-type')?.startsWith('image/'))throw Error('Image not available');await image.body?.cancel();}
console.log(`Live verified: ${card.id} — ${card.title.replaceAll('\n','')}`);
