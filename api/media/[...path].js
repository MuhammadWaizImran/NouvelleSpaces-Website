'use strict';
const {Readable}=require('node:stream');
const {get}=require('@vercel/blob');
module.exports=async(req,res)=>{
 try{
  if(!['GET','HEAD'].includes(req.method)){res.statusCode=405;return res.end('Method not allowed');}
  const filename=decodeURIComponent(new URL(req.url,`https://${req.headers.host}`).pathname.replace(/^\/api\/media\//,''));
  if(!/^[a-f\d-]+\.(png|jpg|jpeg|webp|avif|gif|mp4)$/i.test(filename)){res.statusCode=404;return res.end('Not found');}const pathname='uploads/'+filename;
  const result=await get(pathname,{access:'private',headers:req.headers.range?{Range:req.headers.range}:{}});if(!result){res.statusCode=404;return res.end('Not found');}
  res.statusCode=result.statusCode;for(const key of ['content-type','content-length','content-range','accept-ranges','etag','last-modified']){const value=result.headers.get(key);if(value)res.setHeader(key,value);}res.setHeader('Cache-Control','public, max-age=31536000, immutable');res.setHeader('X-Content-Type-Options','nosniff');if(req.method==='HEAD'||!result.stream)return res.end();Readable.fromWeb(result.stream).pipe(res);
 }catch(error){res.statusCode=error?.status===404?404:500;res.end(res.statusCode===404?'Not found':'Media unavailable');}
};
