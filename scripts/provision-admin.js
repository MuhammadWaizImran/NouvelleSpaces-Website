'use strict';
// Owner-only CLI. Never exposed through an HTTP route; never overwrites an account.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const dir = process.env.CMS_DATA_DIR || path.resolve(__dirname, '../cms-data');
const username = process.env.CMS_ADMIN_USERNAME || 'nouvelle_admin';
if (!/^[a-zA-Z0-9_.@-]{3,80}$/.test(username)) throw Error('Invalid administrator username');
fs.mkdirSync(dir, { recursive: true });
const file = path.join(dir, 'admin.json');
if (fs.existsSync(file)) throw Error('Administrator already exists; existing credentials were not changed.');
const password = crypto.randomBytes(18).toString('base64url');
const salt = crypto.randomBytes(32).toString('hex');
const hash = crypto.scryptSync(password, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }).toString('hex');
fs.writeFileSync(file, JSON.stringify({ username, salt, hash }), { flag: 'wx', mode: 0o600 });
console.log(`Username: ${username}\nPassword: ${password}\nSave these credentials. Only the password hash is stored on disk.`);
