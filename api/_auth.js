'use strict';
const crypto=require('node:crypto');

const attempts=new Map();
const encode=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
const equal=(a,b)=>typeof a==='string'&&typeof b==='string'&&a.length===b.length&&crypto.timingSafeEqual(Buffer.from(a),Buffer.from(b));
function secret(){if(!process.env.ADMIN_SESSION_SECRET)throw new Error('Admin session secret is not configured');return process.env.ADMIN_SESSION_SECRET;}
function sign(value){return crypto.createHmac('sha256',secret()).update(value).digest('base64url');}
function origin(req){return `https://${req.headers.host}`;}
function sameOrigin(req){return req.headers.origin===origin(req)&&req.headers['sec-fetch-site']!=='cross-site';}
function session(req){
 const raw=(req.headers.cookie||'').split(';').map(v=>v.trim()).find(v=>v.startsWith('ns_admin='))?.slice(9);
 if(!raw)return null;const [body,signature]=raw.split('.');if(!equal(sign(body),signature))return null;
 try{const value=JSON.parse(Buffer.from(body,'base64url'));return value.exp>Date.now()?value:null;}catch{return null;}
}
function issue(res){const value={csrf:crypto.randomBytes(32).toString('hex'),exp:Date.now()+8*60*60*1000};const body=encode(value);res.setHeader('Set-Cookie',`ns_admin=${body}.${sign(body)}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=28800`);return value.csrf;}
function logout(res){res.setHeader('Set-Cookie','ns_admin=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0');}
function csrf(req,value=session(req)?.csrf){return !!value&&sameOrigin(req)&&equal(value,req.headers['x-csrf-token']||new URL(req.url,origin(req)).searchParams.get('csrf'));}
function login(req,res,data){
 if(!sameOrigin(req))throw Object.assign(new Error('Invalid request origin'),{status:403});
 const key=req.headers['x-forwarded-for']?.split(',')[0]||req.socket?.remoteAddress||'unknown',now=Date.now();
 const item=attempts.get(key)||{count:0,start:now};if(now-item.start>15*60*1000){item.count=0;item.start=now;}item.count++;attempts.set(key,item);
 if(item.count>8)throw Object.assign(new Error('Too many attempts. Try again in 15 minutes.'),{status:429});
 const salt=process.env.ADMIN_PASSWORD_SALT,expected=process.env.ADMIN_PASSWORD_HASH,username=process.env.ADMIN_USERNAME;
 if(!salt||!expected||!username)throw Object.assign(new Error('Administrator access is not configured'),{status:503});
 const hash=typeof data?.password==='string'&&data.password.length<=200?crypto.scryptSync(data.password,salt,64,{N:32768,r:8,p:1,maxmem:64*1024*1024}).toString('hex'):'';
 if(data?.username!==username||!equal(hash,expected))throw Object.assign(new Error('Incorrect username or password'),{status:401});
 attempts.delete(key);return issue(res);
}
module.exports={configured:()=>!!(process.env.ADMIN_USERNAME&&process.env.ADMIN_PASSWORD_SALT&&process.env.ADMIN_PASSWORD_HASH&&process.env.ADMIN_SESSION_SECRET),session,csrf,login,logout,sameOrigin};
