'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const ROOT = path.resolve(__dirname, '..');
const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, 'catalog.json'), 'utf8'));
const templates = Object.fromEntries(['home','gallery'].map(p => [p,fs.readFileSync(path.join(__dirname,'templates',p==='home'?'index.html':'projects.html'),'utf8').replace(/\r\n/g,'\n')]));
const esc = v => String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const defaults = { inquiryEmail:'Syedain9988@gmail.com', homeTitle:'Nouvelle Spaces | Architecture & Interiors', galleryTitle:'Nouvelle Spaces | Project Gallery', homeDescription:'Architecture, interiors and atmospheric visualization by Nouvelle Spaces.', galleryDescription:'Explore architecture, interiors, commercial spaces and event designs by Nouvelle Spaces.', cream:'#f3f3ec', navy:'#17233b', plum:'#340c24', dayVideo:'/assets/hero/pool.mp4', nightVideo:'/assets/hero/villa.mp4', dayPoster:'/assets/hero/pool-poster.jpg', nightPoster:'/assets/hero/villa-poster.jpg' };
function image(i) { return `<img src="${esc(i.src)}" ${i.variants?.length?`srcset="${i.variants.map(v=>`${esc(v.src)} ${v.width}w`).join(', ')}, ${esc(i.src)} ${i.width}w" sizes="(max-width:700px) 100vw, 60vw"`:''} width="${i.width}" height="${i.height}" alt="${esc(i.alt)}" loading="lazy" decoding="async">`; }
function render(page,content,preview=false) {
 let html=templates[page]; const patches=[];
 for(const f of catalog.filter(f=>f.page===page)) {
  const v=content.overrides[f.id]; if(v===undefined)continue;
  for(const [start,end] of f.ranges) {
   let text=esc(v);
   if(f.kind==='image') {
    text=html.slice(start,end).replace(/\s(?:src|srcset|sizes|alt)="[^"]*"/g,'');
    text=text.replace(/\s*\/?>$/,` src="${esc(v.src)}" alt="${esc(v.alt)}">`);
   }
   patches.push({start,end,text});
  }
 }
 patches.sort((a,b)=>b.start-a.start).forEach(p=>{html=html.slice(0,p.start)+p.text+html.slice(p.end);});
 const settings=content.settings;
 html=html.replace(/<title>[\s\S]*?<\/title>/,()=>`<title>${esc(settings[page==='home'?'homeTitle':'galleryTitle'])}</title>`).replace(/(<meta name="description" content=")[^"]*/,(_,prefix)=>prefix+esc(settings[page==='home'?'homeDescription':'galleryDescription']));
 html=html.replace(/<body\b/,`<body data-inquiry-email="${esc(settings.inquiryEmail)}"`);
 if(page==='home') {
  // Preserve the rotating logo surround while using the studio's own wordmark.
  html=html.replace(/(<div class="header-logo_bg b-desk w-embed">)<svg[\s\S]*?<\/svg>/,`$1<svg width="100%" height="100%" viewBox="0 0 120 120" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><path id="studio-ring" d="M60,13 a47,47 0 1,1 -0.01,0"/></defs><text font-family="Arial,sans-serif" font-size="8" font-weight="600" letter-spacing="2.2"><textPath href="#studio-ring" textLength="290" lengthAdjust="spacing">NOUVELLE SPACES ? ARCHITECTURE ? </textPath></text></svg>`);

  for(const [tab,key] of [['day','day'],['night','night']]) {
   const re=new RegExp(`<video([^>]*data-hero-video="${tab}"[^>]*)>[\\s\\S]*?<\\/video>`);
   html=html.replace(re,(_,attrs)=>`<video${attrs.replace(/ poster="[^"]*"/,'').replace(/\sloop\b/,'').replace(/preload="[^"]*"/,'preload="auto"')} poster="${esc(settings[key+'Poster'])}"><source src="${esc(settings[key+'Video'])}" type="video/mp4"></video>`);
  }
 } else {
  html=html.replace('</head>','<script src="/js/gallery-loader.js" defer></script></head>');
  const projects=content.projects.filter(p=>p.published!==false);
  const cards=projects.map((p,n)=>`<article class="project-card" id="${p.id}" data-category="${esc(p.category)}"><a class="project-image" href="${esc(p.images[0].src)}" data-project="${p.id}" aria-label="Explore ${esc(p.title)}">${image(p.images[0])}<span class="image-cta">View project <span>↗</span></span></a><div class="project-meta"><span class="project-number">${String(n+1).padStart(2,'0')}</span><div><h2><a href="${esc(p.images[0].src)}" data-project="${p.id}">${esc(p.title)}</a></h2><p>${esc(p.category)} <span>·</span> ${p.images.length} ${p.images.length === 1 ? "view" : "views"}</p></div><span aria-hidden="true">↗</span></div><p class="project-description">${esc(p.description)}</p></article>`).join('');
  html=html.replace(/(<div class="project-grid">)[\s\S]*?(<\/div><div class="collection-end">)/,(_,start,end)=>start+(cards || '<p>No projects published yet.</p>')+end);
  const count=String(projects.length).padStart(2,'0');
  html=html.replace(/(Projects <sup>)\d+(<\/sup>)/,`$1${count}$2`).replace(/(The Nouvelle collection \/ )01(?:—|&mdash;)\d+/,`$1${projects.length?'01':'00'}—${count}`);
  html=html.replace(/\d+ projects &nbsp; \/ &nbsp; \d+ perspectives/,`${count} projects &nbsp; / &nbsp; ${projects.reduce((n,p)=>n+p.images.length,0)} perspectives`);
  html=html.replace(/(<div role="group" aria-label="Filter projects">)[\s\S]*?(<\/div><p id="result-count")/,`$1<button aria-pressed="true" data-filter="All">All projects <sup>${count}</sup></button>${[...new Set(projects.map(p=>p.category))].map(c=>`<button aria-pressed="false" data-filter="${esc(c)}">${esc(c)}</button>`).join('')}$2`);
  html=html.replace(/(id="result-count"[^>]*>)\d+ projects/,`$1${count} projects`);
  if(preview)html=html.replace('<body ', '<body data-preview="true" ');
 }
 if(preview) html=html.replace('</body>','<a href="/admin" style="position:fixed;z-index:2147483647;bottom:14px;left:14px;background:#17233b;color:#fff;padding:12px 20px;border-radius:24px;font:13px Arial">Draft preview · Return to admin</a></body>').replace('/css/site-theme.css','/css/site-theme.css?preview=1');
 return html;
}
function theme(s){return `:root{--cream:${s.cream};--navy:${s.navy};--plum:${s.plum}}.gallery-intro{background:${s.plum}}.gallery-intro:before{background:radial-gradient(ellipse at 50% 65%,${s.plum}88,transparent 65%)}.gallery-intro,.contact{color:${s.cream}}.gallery-page{background:${s.cream};color:${s.navy}}`;}
function createStore(dir=process.env.CMS_DATA_DIR || path.join(ROOT,'cms-data')) {
 fs.mkdirSync(dir,{recursive:true});fs.mkdirSync(path.join(dir,'uploads'),{recursive:true});
 const file=path.join(dir,'state.json');
 if(!fs.existsSync(file)) {
  const content=JSON.parse(fs.readFileSync(path.join(__dirname,'seed.json'),'utf8'));
  fs.writeFileSync(file,JSON.stringify({version:1,published:content,draft:content,history:[]},null,2),{mode:0o600,flag:'wx'});
 }
 let state=JSON.parse(fs.readFileSync(file,'utf8'));
 function commit(next){const tmp=file+'.tmp';fs.writeFileSync(tmp,JSON.stringify(next,null,2),{mode:0o600});fs.renameSync(tmp,file);state=next;}
 function contentValid(c) {
  if(!c || !Array.isArray(c.projects)||c.projects.length>500 || !c.overrides || typeof c.overrides!=='object' || !c.settings)throw new Error('Invalid content document');
  const text=(s,max=1000)=>typeof s==='string'&&s.length<=max;
  function asset(src,video=false){
   if(!text(src,500)||!/^\/(assets|uploads)\/[\w./ -]+$/.test(src)||src.split('/').includes('..')||!new RegExp(video?'\\.mp4$':'\\.(webp|png|jpe?g|avif|gif)$','i').test(src))throw new Error('Choose an existing image or uploaded MP4 file');
   const p=src.startsWith('/uploads/')?path.join(dir,src):path.join(ROOT,src);
   if(!fs.existsSync(p))throw new Error('Media file does not exist: '+src);
  }
  const ids=new Set();
  for(const p of c.projects){
   if(!/^[a-z0-9][a-z0-9-]{0,79}$/.test(p.id)||ids.has(p.id))throw new Error('Each project needs a unique ID');ids.add(p.id);
   if(!text(p.title,160)||!p.title.trim()||!text(p.category,60)||!p.category.trim()||!text(p.description,3000)||!Array.isArray(p.images)||!p.images.length||p.images.length>200)throw new Error('Each project needs a title, category, description and at least one image');
   if(p.published!==undefined&&typeof p.published!=='boolean')throw new Error('Invalid project visibility');
   for(const i of p.images){asset(i.src);if(!text(i.alt,400)||!Number.isInteger(i.width)||!Number.isInteger(i.height)||i.width<1||i.height<1||i.width>30000||i.height>30000)throw new Error('Invalid image details');if(!Array.isArray(i.variants))throw new Error('Invalid responsive images');for(const v of i.variants){asset(v.src);if(!Number.isInteger(v.width)||v.width<1||v.width>30000)throw new Error('Invalid image width');}}
  }
  for(const [id,v]of Object.entries(c.overrides)){const f=catalog.find(f=>f.id===id);if(!f)throw new Error('Unknown page field');if(f.kind==='image'){if(!v||!text(v.alt,400))throw new Error('Invalid image');asset(v.src);}else if(!text(v,f.kind==='text'?5000:1000))throw new Error('Invalid field text');else if(f.kind==='link'&&!/^(https?:\/\/[^\s<>]+|mailto:[^\s<>]+|tel:[+\d ()-]+|\/(?!\/)[^\s<>]*)$/.test(v))throw new Error('Use a website URL, email, telephone or internal path');}
  const s=c.settings;
  for(const key of Object.keys(defaults))if(!text(s[key],key.endsWith('Description')?1000:500))throw new Error('Missing setting: '+key);
  if(!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(s.inquiryEmail))throw new Error('Enter a valid inquiry email');
  for(const key of ['cream','navy','plum'])if(!/^#[a-f\d]{6}$/i.test(s[key]))throw new Error('Use a six-digit hex colour');
  for(const key of ['dayVideo','nightVideo'])asset(s[key],true);
  for(const key of ['dayPoster','nightPoster'])asset(s[key]);
  return JSON.parse(JSON.stringify(c));
 }
 return {dir,get:()=>state,save(content,version){if(version!==state.version){const e=new Error('Another tab saved changes. Reload before saving.');e.status=409;throw e;}commit({...state,draft:contentValid(content),version:state.version+1});return state;},publish(version){if(version!==state.version){const e=new Error('The draft changed. Reload before publishing.');e.status=409;throw e;}const previous={id:crypto.randomUUID(),date:new Date().toISOString(),content:state.published};commit({...state,published:contentValid(state.draft),version:state.version+1,history:[previous,...state.history].slice(0,15)});return state;},restore(id,version){if(version!==state.version){const e=new Error('Changes were saved elsewhere. Reload first.');e.status=409;throw e;}const entry=state.history.find(h=>h.id===id);if(!entry)throw new Error('Backup not found');return this.save(entry.content,version);},validate:contentValid};
}
module.exports={createStore,render,theme,catalog,defaults};
