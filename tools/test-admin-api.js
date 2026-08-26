const fs = require('node:fs');

for (const line of fs.readFileSync('.env', 'utf8').split(/\r?\n/)) {
  const match = line.match(/^\s*([^#][^=]*)=(.*)$/);
  if (match) process.env[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, '');
}

const handler = require('../api/admin-inquiries');
const response = {
  headers: {},
  setHeader(name, value) { this.headers[name] = value; },
  end(value) {
    const result = JSON.parse(value);
    console.log(`STATUS=${this.statusCode}`);
    console.log(`COUNT=${Array.isArray(result.inquiries) ? result.inquiries.length : 0}`);
    console.log(`ERROR=${result.error || ''}`);
  },
};

handler({ method: 'GET', headers: { 'x-admin-password': process.env.ADMIN_PWD } }, response);
