'use strict';
const crypto=require('node:crypto');
const {get,put,list}=require('@vercel/blob');
const seed=require('../cms/seed.json');
const {catalog,defaults}=require('../cms/content');
const STATE_PATH='cms/state.json';
const clone=value=>JSON.parse(JSON.stringify(value));
const initial=()=>({version:1,published:clone(seed),draft:clone(seed),history:[]});
async function loadState(){
 const result=await get(STATE_PATH,{access:'private'});
 if(!result||result.statusCode!==200)return {state:initial(),etag:null};
 return {state:JSON.parse(await new Response(result.stream).text()),etag:result.blob.etag};
}
async function writeState(state,etag){
 try{return await put(STATE_PATH,JSON.stringify(state),{access:'private',contentType:'application/json',allowOverwrite:true,...(etag?{ifMatch:etag}:{})});}
 catch(error){if(error?.name==='BlobPreconditionFailedError')throw Object.assign(new Error('Another tab saved changes. Reload before saving.'),{status:409});throw error;}
}
function validate(content){
 if(!content||!Array.isArray(content.projects)||content.projects.length>500||!content.overrides||typeof content.overrides!=='object'||!content.settings)throw new Error('Invalid content document');
 const text=(value,max=1000)=>typeof value==='string'&&value.length<=max;
 function asset(src,video=false){
  const local=/^\/assets\/[\w./ -]+$/.test(src)&&!src.split('/').includes('..');
  const upload=/^\/api\/media\/[a-z\d._-]{1,220}\.(png|jpe?g|webp|avif|gif|mp4)$/i.test(src);
  if(!text(src,700)||(!local&&!upload)||!new RegExp(video?'\\.mp4$':'\\.(webp|png|jpe?g|avif|gif)$','i').test(src))throw new Error('Choose an existing image or uploaded MP4 file');
 }
 const ids=new Set();
 for(const project of content.projects){
  if(!/^[a-z0-9][a-z0-9-]{0,79}$/.test(project.id)||ids.has(project.id))throw new Error('Each project needs a unique ID');ids.add(project.id);
  if(!text(project.title,160)||!project.title.trim()||!text(project.category,60)||!project.category.trim()||!text(project.description,3000)||!Array.isArray(project.images)||!project.images.length||project.images.length>200)throw new Error('Each project needs a title, category, description and at least one image');
  if(project.published!==undefined&&typeof project.published!=='boolean')throw new Error('Invalid project visibility');
  for(const image of project.images){asset(image.src);if(!text(image.alt,400)||!Number.isInteger(image.width)||!Number.isInteger(image.height)||image.width<1||image.height<1||image.width>30000||image.height>30000)throw new Error('Invalid image details');if(!Array.isArray(image.variants))throw new Error('Invalid responsive images');for(const variant of image.variants){asset(variant.src);if(!Number.isInteger(variant.width)||variant.width<1||variant.width>30000)throw new Error('Invalid image width');}}
 }
 for(const [id,value]of Object.entries(content.overrides)){const field=catalog.find(item=>item.id===id);if(!field)throw new Error('Unknown page field');if(field.kind==='image'){if(!value||!text(value.alt,400))throw new Error('Invalid image');asset(value.src);}else if(!text(value,field.kind==='text'?5000:1000))throw new Error('Invalid field text');else if(field.kind==='link'&&!/^(https?:\/\/[^\s<>]+|mailto:[^\s<>]+|tel:[+\d ()-]+|\/(?!\/)[^\s<>]*)$/.test(value))throw new Error('Use a website URL, email, telephone or internal path');}
 const settings=content.settings;for(const key of Object.keys(defaults))if(!text(settings[key],key.endsWith('Description')?1000:700))throw new Error('Missing setting: '+key);
 if(!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(settings.inquiryEmail))throw new Error('Enter a valid inquiry email');
 for(const key of ['cream','navy','plum'])if(!/^#[a-f\d]{6}$/i.test(settings[key]))throw new Error('Use a six-digit hex colour');
 for(const key of ['dayVideo','nightVideo'])asset(settings[key],true);for(const key of ['dayPoster','nightPoster'])asset(settings[key]);return clone(content);
}
async function media(){const values=[];let cursor;do{const page=await list({prefix:'uploads/',cursor,limit:1000});values.push(...page.blobs);cursor=page.hasMore?page.cursor:undefined;}while(cursor);return values.map(blob=>({src:'/api/media/'+blob.pathname.replace(/^uploads\//,''),alt:blob.pathname.split('/').pop(),type:/\.mp4$/i.test(blob.pathname)?'video':'image'}));}
function adminState(state){return {version:state.version,draft:state.draft,history:state.history.map(({id,date})=>({id,date})),catalog};}
module.exports={loadState,writeState,validate,media,adminState,crypto};
