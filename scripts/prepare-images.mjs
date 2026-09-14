import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir,access} from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import {fetch,EnvHttpProxyAgent} from 'undici';

const dispatcher=new EnvHttpProxyAgent();
const MAX_BYTES=25*1024*1024;
export function imagePaths(source, localBytes) {
 const hash=createHash('sha256').update('curio-webp-v1:').update(localBytes||source).digest('hex').slice(0,24);
 return [480,960].map(width=>`/media/optimized/${hash}-${width}.webp`);
}
export function imageCandidates(source) {
 const url=new URL(source);
 if(url.hostname==='www.mdpi.com'&&url.pathname.includes('/article_deploy/'))return [source.replace('https://www.mdpi.com/','https://mdpi-res.com/'),source];
 if(!['commons.wikimedia.org','upload.wikimedia.org','thumb.wikimedia.org'].includes(url.hostname))return [source];
 let file;
 if(url.pathname.startsWith('/wiki/Special:Redirect/file/'))file=decodeURIComponent(url.pathname.slice('/wiki/Special:Redirect/file/'.length));
 else {const parts=url.pathname.split('/');file=decodeURIComponent(parts[3]==='thumb'?parts[6]:parts[5]||'');}
 if(!file||!/^.+\.(jpe?g|png|webp)$/i.test(file))return [source];
 file=file.replaceAll(' ','_').normalize('NFC');
 const hash=createHash('md5').update(file).digest('hex'),name=encodeURIComponent(file);
 const root=`https://upload.wikimedia.org/wikipedia/commons`;
 return [...new Set([`${root}/thumb/${hash[0]}/${hash.slice(0,2)}/${name}/960px-${name}`,`${root}/${hash[0]}/${hash.slice(0,2)}/${name}`,source])];
}
async function download(url,timeout=30000) {
 const response=await fetch(url,{dispatcher,signal:AbortSignal.timeout(timeout),headers:{'User-Agent':'Curio/1.0 (https://curio.wiki-power.com; image preparation)'}});
 if(!response.ok){await response.body?.cancel();throw Error(`HTTP ${response.status}`);}
 if(!response.headers.get('content-type')?.startsWith('image/')){await response.body?.cancel();throw Error('Not an image');}
 const chunks=[];let size=0;
 for await(const chunk of response.body){size+=chunk.length;if(size>MAX_BYTES)throw Error('Image exceeds 25 MB');chunks.push(chunk);}
 return Buffer.concat(chunks);
}
export async function optimizeImage(bytes,width) {
 return sharp(bytes,{limitInputPixels:100_000_000}).rotate().resize({width,height:width,fit:'inside',withoutEnlargement:true}).webp({quality:80,effort:4}).toBuffer();
}
export async function prepareImages(cards,publicDir,{cacheOrigin=process.env.CURIO_IMAGE_CACHE_ORIGIN??'https://curio.wiki-power.com'}={}) {
 await mkdir(path.join(publicDir,'media/optimized'),{recursive:true});
 let cursor=0,totalBytes=0;const output=Array(cards.length);
 async function worker(){while(cursor<cards.length){
  const index=cursor++,card=cards[index],source=card.image.src;
  const local=source.startsWith('/media/')?await readFile(path.join(publicDir,source)):null;
  const paths=imagePaths(source,local),files=paths.map(p=>path.join(publicDir,p));
  let ready=await Promise.all(files.map(f=>access(f).then(()=>true,()=>false)));
  // Previously deployed generated assets survive later content-only builds.
  if(!ready.every(Boolean)&&cacheOrigin){
   for(let i=0;i<2;i++)if(!ready[i])try{const bytes=await download(new URL(paths[i],cacheOrigin),5000);if((await sharp(bytes).metadata()).format!=='webp')throw Error('Invalid cached image');await writeFile(files[i],bytes);ready[i]=true;}catch{}
  }
  if(!ready.every(Boolean)){
   let bytes=local,lastError;
   if(!bytes)for(const candidate of imageCandidates(source))try{bytes=await download(candidate);await sharp(bytes).metadata();break;}catch(error){bytes=null;lastError=error;}
   if(!bytes)throw Error(`${card.id}: cannot prepare image (${lastError?.message}). Keep the previous deployment; fix the image source before publishing.`);
   for(let i=0;i<2;i++)await writeFile(files[i],await optimizeImage(bytes,[480,960][i]));
  }
  const sizes=await Promise.all(files.map(async f=>(await readFile(f)).length));totalBytes+=sizes[1];
  output[index]={...card,image:{...card.image,src:paths[1],srcset:`${paths[0]} 480w, ${paths[1]} 960w`}};
  console.log(`Image ${index+1}/${cards.length}: ${card.id} (${Math.round(sizes[1]/1024)} KB)`);
 }}
 await Promise.all(Array.from({length:3},worker));
 console.log(`Prepared ${cards.length} same-origin images: ${Math.round(totalBytes/1024)} KB at large size`);
 return output;
}
