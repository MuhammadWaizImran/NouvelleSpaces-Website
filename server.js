'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {createStore,render,theme,catalog}=require('./cms/content');const {auth}=require('./cms/auth');
const ROOT=__dirname;const store=createStore();const access=auth(store.dir);
const MIME={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.webp':'image/webp','.avif':'image/avif','.gif':'image/gif','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.woff2':'font/woff2','.pdf':'application/pdf','.mp4':'video/mp4','.webm':'video/webm'};
function body(req,max=6*1024*1024){return new Promise((resolve,reject)=>{let size=0;const chunks=[];req.on('data',chunk=>{size+=chunk.length;if(size>max){const e=new Error('File is too large');e.status=413;reject(e);req.resume();}else chunks.push(chunk);});req.on('end',()=>resolve(Buffer.concat(chunks)));req.on('error',reject);});}
const payload=async req=>{try{return JSON.parse((await body(req)).toString('utf8'));}catch(e){if(e.status)throw e;throw new Error('Invalid JSON document');}};
function send(req,res,status,data,type='application/json; charset=utf-8'){res.writeHead(status,{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin','X-Frame-Options':'SAMEORIGIN'});res.end(req.method==='HEAD'?undefined:typeof data==='string'?data:JSON.stringify(data));}
function mediaType(b){if(b.slice(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return 'png';if(b[0]===255&&b[1]===216&&b[2]===255)return 'jpg';if(b.toString('ascii',0,4)==='RIFF'&&b.toString('ascii',8,12)==='WEBP')return 'webp';if(['GIF87a','GIF89a'].includes(b.toString('ascii',0,6)))return 'gif';if(b.toString('ascii',4,8)==='ftyp'){if(/avif|avis/.test(b.toString('ascii',8,32)))return 'avif';if(/isom|mp4|avc1|M4V|iso[2-9]/.test(b.toString('ascii',8,32)))return 'mp4';}return null;}
const adminState=()=>{const s=store.get();return {version:s.version,draft:s.draft,history:s.history.map(({id,date})=>({id,date})),catalog};};
const server=http.createServer(async(req,res)=>{
 try{
  let url;try{url=new URL(req.url,'http://localhost');decodeURIComponent(url.pathname);}catch{return send(req,res,400,{error:'Invalid URL'});}
  const route=decodeURIComponent(url.pathname),method=req.method;
  const validHost=/^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(req.headers.host||'')||(process.env.PUBLIC_ORIGIN&&req.headers.host===new URL(process.env.PUBLIC_ORIGIN).host);
  if(!validHost)return send(req,res,421,{error:'Unexpected host. Configure PUBLIC_ORIGIN for your domain.'});
  if(route.startsWith('/api/admin/')){
   if(route==='/api/admin/session'&&method==='GET')return send(req,res,200,{configured:access.configured(),authenticated:!!access.session(req),csrf:access.session(req)?.csrf});
   if(route==='/api/admin/setup')return send(req,res,404,{error:'Registration is disabled'});
   if(route==='/api/admin/login'&&method==='POST')return send(req,res,200,{csrf:await access.login(req,res,await payload(req))});
   if(!access.session(req))return send(req,res,401,{error:'Please sign in'});
   if(method!=='GET'&&!access.csrf(req))return send(req,res,403,{error:'Invalid request. Reload the admin portal.'});
   if(route==='/api/admin/logout'&&method==='POST'){access.logout(req,res);return send(req,res,200,{ok:true});}
   if(route==='/api/admin/state'&&method==='GET')return send(req,res,200,adminState());
   if(route==='/api/admin/draft'&&method==='PUT'){const p=await payload(req);store.save(p.content,p.version);return send(req,res,200,adminState());}
   if(route==='/api/admin/publish'&&method==='POST'){const p=await payload(req);store.publish(p.version);return send(req,res,200,adminState());}
   if(route==='/api/admin/restore'&&method==='POST'){const p=await payload(req);store.restore(p.id,p.version);return send(req,res,200,adminState());}
   if(route==='/api/admin/export'&&method==='GET'){res.setHeader('Content-Disposition','attachment; filename="nouvelle-content-backup.json"');return send(req,res,200,{exportVersion:1,content:store.get().draft});}
   if(route==='/api/admin/import'&&method==='POST'){const p=await payload(req);if(p.backup?.exportVersion!==1)throw new Error('Select a Nouvelle content backup');store.save(p.backup.content,p.version);return send(req,res,200,adminState());}
   if(route==='/api/admin/upload'&&method==='POST'){
    const bytes=await body(req,100*1024*1024);const ext=mediaType(bytes);if(!ext)throw new Error('Upload JPG, PNG, WebP, AVIF, GIF or MP4 files');
    const filename=crypto.randomUUID()+'.'+ext;fs.writeFileSync(path.join(store.dir,'uploads',filename),bytes,{flag:'wx'});return send(req,res,201,{src:'/uploads/'+filename,type:ext,bytes:bytes.length});
   }
   if(route==='/api/admin/media'&&method==='GET'){
    const all=new Map();for(const p of store.get().draft.projects)for(const i of p.images)all.set(i.src,{src:i.src,alt:i.alt,type:'image',width:i.width,height:i.height});
    for(const f of catalog.filter(f=>f.kind==='image')){const v=store.get().draft.overrides[f.id]||f.value;const src=v.src.replace(/^\.\//,'/');if(/\.(webp|png|jpe?g|avif|gif)$/i.test(src))all.set(src,{src,alt:v.alt,type:'image'});}
    for(const name of fs.readdirSync(path.join(store.dir,'uploads'))){const src='/uploads/'+name;if(!all.has(src))all.set(src,{src,alt:name,type:name.endsWith('.mp4')?'video':'image'});}
    for(const k of ['dayVideo','nightVideo','dayPoster','nightPoster']){const src=store.get().draft.settings[k];all.set(src,{src,alt:k,type:k.endsWith('Video')?'video':'image'});}
    return send(req,res,200,[...all.values()]);
   }
   return send(req,res,404,{error:'API route not found'});
  }
  if(!['GET','HEAD'].includes(method)){res.setHeader('Allow','GET, HEAD');return send(req,res,405,{error:'Method not allowed'});}
  const preview=url.searchParams.get('preview')==='1';if(preview&&!access.session(req))return send(req,res,401,'Sign in at /admin to preview drafts.','text/plain');
  const content=store.get()[preview?'draft':'published'];
  if(['/','/index','/index.html'].includes(route))return send(req,res,200,render('home',content,preview),'text/html; charset=utf-8');
  if(['/projects','/projects/','/projects.html'].includes(route))return send(req,res,200,render('gallery',content,preview),'text/html; charset=utf-8');
  if(route==='/assets/projects.json')return send(req,res,200,content.projects.filter(p=>p.published!==false));
  if(route==='/css/site-theme.css')return send(req,res,200,theme(content.settings),'text/css; charset=utf-8');
  let file;
  if(['/admin','/admin/','/admin.html'].includes(route)){file=path.join(ROOT,'admin.html');res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' blob: data:; media-src 'self' blob:; connect-src 'self'; frame-ancestors 'none'; form-action 'self'; base-uri 'none'");res.setHeader('X-Robots-Tag','noindex, nofollow');}
  else if(/^\/uploads\/[a-f\d-]+\.(png|jpg|webp|avif|gif|mp4)$/.test(route))file=path.join(store.dir,route);
  else if(/^\/(assets|css|js|docs)\//.test(route)&&!route.split(/[\\/]/).some(p=>p.startsWith('.')))file=path.resolve(ROOT,'.'+route);
  if(!file||(!file.startsWith(ROOT+path.sep)&&!file.startsWith(path.resolve(store.dir)+path.sep)))return send(req,res,404,'Page not found','text/plain');
  let stat;try{stat=fs.statSync(file);}catch{return send(req,res,404,'Page not found','text/plain');}if(!stat.isFile())return send(req,res,404,'Page not found','text/plain');
  const headers={'Content-Type':MIME[path.extname(file)]||'application/octet-stream','Accept-Ranges':'bytes','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin','X-Frame-Options':'SAMEORIGIN'};
  let start=0,end=stat.size-1,status=200;
  if(req.headers.range){const m=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);if(!m||(!m[1]&&!m[2])){res.setHeader('Content-Range',`bytes */${stat.size}`);return send(req,res,416,'Invalid range','text/plain');}if(!m[1])start=Math.max(0,stat.size-Number(m[2]));else{start=Number(m[1]);if(m[2])end=Math.min(Number(m[2]),end);}if(start>end||start>=stat.size||!Number.isSafeInteger(start)||!Number.isSafeInteger(end)){res.setHeader('Content-Range',`bytes */${stat.size}`);return send(req,res,416,'Invalid range','text/plain');}status=206;headers['Content-Range']=`bytes ${start}-${end}/${stat.size}`;}
  headers['Content-Length']=Math.max(0,end-start+1);res.writeHead(status,headers);if(method==='HEAD'||stat.size===0)return res.end();const stream=fs.createReadStream(file,{start,end});stream.on('error',()=>res.destroy());stream.pipe(res);
 }catch(e){if(!res.headersSent)send(req,res,e.status||400,{error:e.message});else res.destroy();}
});
server.requestTimeout=120000;server.headersTimeout=15000;
if(require.main===module)server.listen(process.env.PORT||3000,process.env.HOST||'127.0.0.1',()=>console.log(`Nouvelle Spaces: http://localhost:${process.env.PORT||3000} | Admin: /admin`));
module.exports=server;
