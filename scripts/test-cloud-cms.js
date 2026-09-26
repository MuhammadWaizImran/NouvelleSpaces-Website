'use strict';
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const seed=require('../cms/seed.json');
const {validate}=require('../api/_cloud-cms');
const auth=require('../api/_auth');

assert.equal(validate(seed).projects.length,22);
const uploaded=structuredClone(seed);uploaded.projects[0].images[0].src='/api/media/123e4567-e89b-12d3-a456-426614174000.webp';uploaded.projects[0].images[0].variants=[];assert.doesNotThrow(()=>validate(uploaded));
const unsafe=structuredClone(seed);unsafe.projects[0].images[0].src='https://example.com/image.jpg';assert.throws(()=>validate(unsafe));
process.env.ADMIN_USERNAME='test_admin';process.env.ADMIN_PASSWORD_SALT='test-salt';process.env.ADMIN_PASSWORD_HASH=crypto.scryptSync('test-password','test-salt',64,{N:32768,r:8,p:1,maxmem:64*1024*1024}).toString('hex');process.env.ADMIN_SESSION_SECRET='test-session-secret-with-enough-entropy';
const req={headers:{host:'example.test',origin:'https://example.test','sec-fetch-site':'same-origin'},socket:{remoteAddress:'127.0.0.1'},url:'/api/admin/login'},res={headers:{},setHeader(key,value){this.headers[key]=value;}};
const csrf=auth.login(req,res,{username:'test_admin',password:'test-password'});req.headers.cookie=res.headers['Set-Cookie'].split(';')[0];req.headers['x-csrf-token']=csrf;assert.ok(auth.session(req));assert.ok(auth.csrf(req));
console.log('PASS: cloud content validation, private media paths, signed sessions and CSRF.');
