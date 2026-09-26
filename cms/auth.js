'use strict';
const fs=require('node:fs');const path=require('node:path');const crypto=require('node:crypto');const {promisify}=require('node:util');
const scrypt=promisify(crypto.scrypt);
const token=()=>crypto.randomBytes(32).toString('hex');
const equal=(a,b)=>typeof a==='string'&&typeof b==='string'&&a.length===b.length&&crypto.timingSafeEqual(Buffer.from(a),Buffer.from(b));
function auth(dir){
 const file=path.join(dir,'admin.json');const account=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):null;
 const sessions=new Map(), attempts=new Map();
 function origin(req){return process.env.PUBLIC_ORIGIN || `http://${req.headers.host}`;}
 function sameOrigin(req){return req.headers.origin===origin(req)&&req.headers['sec-fetch-site']!=='cross-site';}
 function session(req){const id=(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('ns_admin='))?.slice(9);const s=sessions.get(id);if(!s||s.expires<Date.now()){if(id)sessions.delete(id);return null;}return {...s,id};}
 function issue(req,res){const id=token(),csrf=token();sessions.set(id,{csrf,expires:Date.now()+8*60*60*1000});res.setHeader('Set-Cookie',`ns_admin=${id}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${origin(req).startsWith('https:')?'; Secure':''}`);return csrf;}
 return {configured:()=>!!account,sameOrigin,session,
  csrf(req){const s=session(req);return s&&sameOrigin(req)&&equal(s.csrf,req.headers['x-csrf-token']);},
  async login(req,res,data){if(!sameOrigin(req))throw new Error('Invalid request origin');const key=req.socket.remoteAddress,now=Date.now();for(const [k,a]of attempts)if(now-a.start>15*60000)attempts.delete(k);const a=attempts.get(key)||{count:0,start:now};a.count++;attempts.set(key,a);if(a.count>8){const e=new Error('Too many attempts. Try again in 15 minutes.');e.status=429;throw e;}if(!account||typeof data.password!=='string'||data.password.length>200)throw new Error('Incorrect username or password');const hash=(await scrypt(data.password,account.salt,64,{N:32768,r:8,p:1,maxmem:64*1024*1024})).toString('hex');if(!equal(hash,account.hash)||data.username!==account.username){const e=new Error('Incorrect username or password');e.status=401;throw e;}attempts.delete(key);for(const [id,s]of sessions)if(s.expires<now)sessions.delete(id);return issue(req,res);},
  logout(req,res){const s=session(req);if(s)sessions.delete(s.id);res.setHeader('Set-Cookie','ns_admin=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');}
 };
}
module.exports={auth};
