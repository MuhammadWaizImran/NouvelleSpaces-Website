'use strict';
const auth=require('./_auth');
const {loadState}=require('./_cloud-cms');
const {render,theme}=require('../cms/content');
module.exports=async(req,res)=>{
 try{
  if(!['GET','HEAD'].includes(req.method)){res.statusCode=405;return res.end('Method not allowed');}
  const url=new URL(req.url,`https://${req.headers.host}`),page=url.searchParams.get('page')==='gallery'?'gallery':'home',preview=url.searchParams.get('preview')==='1';
  if(preview&&!auth.session(req)){res.statusCode=401;return res.end('Sign in at /admin to preview drafts.');}
  const state=(await loadState()).state,content=state[preview?'draft':'published'];let html=render(page,content,preview);
  html=html.replace('</head>',`<style id="cms-theme">${theme(content.settings)}</style>${page==='gallery'?`<script>window.__NOUVELLE_PROJECTS__=${JSON.stringify(content.projects.filter(project=>project.published!==false)).replace(/</g,'\\u003c')}</script>`:''}</head>`);
  res.statusCode=200;res.setHeader('Content-Type','text/html; charset=utf-8');res.setHeader('Cache-Control','private, no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');if(preview)res.setHeader('X-Robots-Tag','noindex, nofollow');res.end(req.method==='HEAD'?undefined:html);
 }catch(error){res.statusCode=500;res.end('Website content is temporarily unavailable.');}
};
