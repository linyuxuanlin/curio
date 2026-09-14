import {readdir,readFile,writeFile,mkdir,stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {prepareImages} from './prepare-images.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
export const categories=['科技','AI','机器人','交通','工程','动物与自然','城市生活','设计','文化','考古','食品','环境','社会','天文/航天'];
const assert=(ok,message)=>{if(!ok)throw Error(message);};
const text=(v,max=1000)=>typeof v==='string'&&v.trim().length>0&&v.length<=max;
const https=v=>{try{return new URL(v).protocol==='https:';}catch{return false;}};
export function validateCard(c){
 assert(c&&typeof c==='object','卡片必须为对象');
 assert(typeof c.id==='string'&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(c.id),'id 只能使用小写英文、数字、连字符');
 assert(text(c.eventKey,160),'缺少稳定的 eventKey');
 assert(categories.includes(c.category),'未知领域');
 assert(text(c.title,36)&&!c.title.includes('趣事'),'标题须为 1–36 字，不能使用“趣事”');
 assert(text(c.summary,100),'summary 须为 1–100 字');
 assert(text(c.location,60),'缺少 location');
 assert(Array.isArray(c.body)&&c.body.length>0&&c.body.length<=5&&c.body.every(p=>text(p,500)),'body 须为 1–5 段文字');
 for(const k of ['eventDate','publishedAt','verifiedAt'])assert(typeof c[k]==='string'&&/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(c[k])&&Number.isFinite(Date.parse(c[k])),`${k} 必须是带时区的 ISO 时间`);
 assert(Date.parse(c.eventDate)<=Date.parse(c.publishedAt),'不能把未来事件当作已发生的事件发布');
 assert(typeof c.archive==='boolean','archive 必须为 boolean');
 assert(['sage','clay','blue','gold','plum'].includes(c.theme),'theme 无效');
 assert(Array.isArray(c.sources)&&c.sources.length>=2&&c.sources.length<=4,'必须提供 2–4 个来源');
 for(const s of c.sources)assert(text(s.name,80)&&https(s.url),'来源须有名称及 HTTPS 链接');
 assert(new Set(c.sources.map(s=>s.url)).size===c.sources.length,'来源链接重复');
 assert(text(c.verificationNotes,2000),'缺少事实核查说明');
 assert(c.image&&typeof c.image==='object','每张卡片必须有图片');{const i=c.image;assert(['original','generated'].includes(i.kind),'image 须为合法对象');assert(text(i.src,1000)&&(/^\/media\/[a-zA-Z0-9/_-]+\.(webp|png|jpg|jpeg|avif)$/.test(i.src)||https(i.src)),'图片须为 /media/ 路径或 HTTPS URL');for(const k of ['alt','credit','license'])assert(text(i[k]),`图片缺少 ${k}`);assert(https(i.sourceUrl)&&https(i.licenseUrl),'图片须有出处和授权说明链接');assert(['photo','poster'].includes(i.layout),'image.layout 须为 photo 或 poster');if(i.kind==='generated')assert(i.model==='GPT Image 2.5'&&i.visualChecked===true,'生成图仅限 GPT Image 2.5 且必须视觉检查');}
 return c;
}
export function validateCollection(cards){const ids=new Set(),keys=new Set();for(const c of cards){validateCard(c);assert(!ids.has(c.id),`重复 id: ${c.id}`);assert(!keys.has(c.eventKey),`重复事件: ${c.eventKey}`);ids.add(c.id);keys.add(c.eventKey);}return cards;}
async function main(){const files=(await readdir(path.join(root,'content/cards'))).filter(f=>f.endsWith('.json'));const cards=[];for(const f of files){try{const c=JSON.parse(await readFile(path.join(root,'content/cards',f),'utf8'));validateCard(c);assert(f===c.id+'.json','文件名须与 id 一致');if(c.image?.src.startsWith('/media/'))assert((await stat(path.join(root,'public',c.image.src))).isFile(),'本地图片不存在');cards.push(c);}catch(e){throw Error(`${f}: ${e.message}`);}}validateCollection(cards);cards.sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt)||b.id.localeCompare(a.id));if(!process.argv.includes('--check')){await mkdir(path.join(root,'public'),{recursive:true});const prepared=await prepareImages(cards,path.join(root,'public'));await writeFile(path.join(root,'public/feed.json'),JSON.stringify({version:1,updatedAt:cards[0]?.publishedAt??null,cards:prepared})+'\n');}console.log(`Validated ${cards.length} cards${process.argv.includes('--check')?'':' → public/feed.json'}`);}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(e=>{console.error(e.message);process.exitCode=1;});
