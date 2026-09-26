'use strict';
const {handleUpload}=require('@vercel/blob/client');
const auth=require('../_auth');
const {loadState,writeState,validate,media,adminState,crypto}=require('../_cloud-cms');
const {catalog}=require('../../cms/content');
function send(res,status,value,headers={}){res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');for(const [key,val]of Object.entries(headers))res.setHeader(key,val);res.end(JSON.stringify(value));}
async function json(req){if(req.body&&typeof req.body==='object')return req.body;let size=0,raw='';for await(const chunk of req){size+=chunk.length;if(size>6*1024*1024)throw Object.assign(new Error('Request is too large'),{status:413});raw+=chunk;}try{return JSON.parse(raw||'{}');}catch{throw new Error('Invalid JSON document');}}
function route(req){return decodeURIComponent(new URL(req.url,`https://${req.headers.host}`).pathname.replace(/^\/api\/admin\/?/,''));}
module.exports=async(req,res)=>{
 try{
  const action=route(req),method=req.method;
  if(action==='session'&&method==='GET'){const current=auth.session(req);return send(res,200,{configured:auth.configured(),authenticated:!!current,csrf:current?.csrf});}
  if(action==='setup')return send(res,404,{error:'Registration is disabled'});
  if(action==='login'&&method==='POST')return send(res,200,{csrf:auth.login(req,res,await json(req))});
  if(action==='upload'&&method==='POST'){
   const requestBody=await json(req);
   if(requestBody.type==='blob.generate-client-token'&&(!auth.session(req)||!auth.csrf(req)))return send(res,403,{error:'Please sign in again'});
   const response=await handleUpload({body:requestBody,request:req,onBeforeGenerateToken:async pathname=>{
    if(!/^uploads\/[\w .-]+\.(png|jpg|jpeg|webp|avif|gif|mp4)$/i.test(pathname))throw new Error('Upload JPG, PNG, WebP, AVIF, GIF or MP4 files');
    return {allowedContentTypes:['image/jpeg','image/png','image/webp','image/avif','image/gif','video/mp4'],maximumSizeInBytes:100*1024*1024,addRandomSuffix:true,tokenPayload:'nouvelle-admin'};
   },onUploadCompleted:async()=>{}});return send(res,200,response);
  }
  const current=auth.session(req);if(!current)return send(res,401,{error:'Please sign in'});
  if(method!=='GET'&&!auth.csrf(req,current.csrf))return send(res,403,{error:'Invalid request. Reload the admin portal.'});
  if(action==='logout'&&method==='POST'){auth.logout(res);return send(res,200,{ok:true});}
  const loaded=await loadState(),state=loaded.state;
  if(action==='state'&&method==='GET')return send(res,200,adminState(state));
  if(action==='draft'&&method==='PUT'){const input=await json(req);if(input.version!==state.version)throw Object.assign(new Error('Another tab saved changes. Reload before saving.'),{status:409});state.draft=validate(input.content);state.version++;await writeState(state,loaded.etag);return send(res,200,adminState(state));}
  if(action==='publish'&&method==='POST'){const input=await json(req);if(input.version!==state.version)throw Object.assign(new Error('The draft changed. Reload before publishing.'),{status:409});state.history.unshift({id:crypto.randomUUID(),date:new Date().toISOString(),content:state.published});state.history=state.history.slice(0,15);state.published=validate(state.draft);state.version++;await writeState(state,loaded.etag);return send(res,200,adminState(state));}
  if(action==='restore'&&method==='POST'){const input=await json(req);if(input.version!==state.version)throw Object.assign(new Error('Changes were saved elsewhere. Reload first.'),{status:409});const entry=state.history.find(item=>item.id===input.id);if(!entry)throw new Error('Backup not found');state.draft=validate(entry.content);state.version++;await writeState(state,loaded.etag);return send(res,200,adminState(state));}
  if(action==='export'&&method==='GET')return send(res,200,{exportVersion:1,content:state.draft},{'Content-Disposition':'attachment; filename="nouvelle-content-backup.json"'});
  if(action==='import'&&method==='POST'){const input=await json(req);if(input.version!==state.version)throw Object.assign(new Error('Changes were saved elsewhere. Reload first.'),{status:409});if(input.backup?.exportVersion!==1)throw new Error('Select a Nouvelle content backup');state.draft=validate(input.backup.content);state.version++;await writeState(state,loaded.etag);return send(res,200,adminState(state));}
  if(action==='media'&&method==='GET'){
   const all=new Map();for(const project of state.draft.projects)for(const image of project.images)all.set(image.src,{src:image.src,alt:image.alt,type:'image',width:image.width,height:image.height});
   for(const field of catalog.filter(item=>item.kind==='image')){const value=state.draft.overrides[field.id]||field.value;all.set(value.src,{src:value.src,alt:value.alt,type:'image'});}for(const item of await media())all.set(item.src,item);
   for(const key of ['dayVideo','nightVideo','dayPoster','nightPoster']){const src=state.draft.settings[key];all.set(src,{src,alt:key,type:key.endsWith('Video')?'video':'image'});}return send(res,200,[...all.values()]);
  }
  return send(res,404,{error:'API route not found'});
 }catch(error){return send(res,error.status||400,{error:error.message||'Request failed'});}
};
