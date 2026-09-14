import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {imagePaths,imageCandidates,optimizeImage,prepareImages} from '../scripts/prepare-images.mjs';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
test('optimized paths are versioned and change with source bytes',()=>{
 assert.deepEqual(imagePaths('https://a.test/a.jpg'),imagePaths('https://a.test/a.jpg'));
 assert.notDeepEqual(imagePaths('a'),imagePaths('b'));
 assert.notDeepEqual(imagePaths('a',Buffer.from('1')),imagePaths('a',Buffer.from('2')));
});
test('Wikimedia redirects become standard thumbnails with original fallback',()=>{
 const result=imageCandidates('https://commons.wikimedia.org/wiki/Special:Redirect/file/New_bridge_in_Fremantle_05.jpg');
 assert.ok(result[0].startsWith('https://upload.wikimedia.org/wikipedia/commons/thumb/'));
 assert.ok(result[0].endsWith('/960px-New_bridge_in_Fremantle_05.jpg'));
 assert.equal(imageCandidates('https://upload.wikimedia.org/wikipedia/commons/4/47/Oryzias_latipes.jpg')[0],'https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/Oryzias_latipes.jpg/960px-Oryzias_latipes.jpg');
});
test('optimization keeps full image aspect ratio and limits dimensions',async()=>{
 const input=await sharp({create:{width:1800,height:1200,channels:3,background:'#acc'}}).png().toBuffer();
 const output=await optimizeImage(input,960),meta=await sharp(output).metadata();
 assert.equal(meta.format,'webp');assert.equal(meta.width,960);assert.equal(meta.height,640);assert.ok(output.length<input.length);
});
test('prepared local feed uses same-origin responsive images and keeps attribution',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'curio-images-'));
 try {
  const {mkdir}=await import('node:fs/promises');await mkdir(path.join(root,'media'));
  await writeFile(path.join(root,'media/a.png'),await sharp({create:{width:30,height:20,channels:3,background:'#abc'}}).png().toBuffer());
  const card={id:'sample',image:{src:'/media/a.png',credit:'Author',sourceUrl:'https://example.org/source',license:'CC BY'}};
  const [result]=await prepareImages([card],root,{cacheOrigin:''});
  assert.match(result.image.src,/^\/media\/optimized\/[a-f0-9]+-960.webp$/);assert.match(result.image.srcset,/480w, .*960w/);assert.equal(result.image.credit,'Author');assert.equal(card.image.src,'/media/a.png');
 }finally{await rm(root,{recursive:true,force:true});}
});
