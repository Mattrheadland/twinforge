// dev helper: screenshots of the campaign diorama at a few positions
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const OUT = process.argv[2];
const hero = process.argv[3] || 'rex';
const root = path.resolve('dist');
const server = http.createServer((req, res) => { let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; const f = path.join(root, p); if (!fs.existsSync(f)) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': p.endsWith('.html') ? 'text/html' : p.endsWith('.jpg') ? 'image/jpeg' : 'application/octet-stream' }); fs.createReadStream(f).pipe(res); }).listen(0);
const browser = await puppeteer.launch({ executablePath: await chromium.executablePath(), args: chromium.args.filter((a) => a !== '--single-process'), headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 874, height: 402, deviceScaleFactor: 2 });
await page.evaluateOnNewDocument(() => { window.__TBB_TEST__ = true; });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`http://localhost:${server.address().port}/`, { waitUntil: 'load' });
await new Promise((r) => setTimeout(r, 2500));
for (const pos of (process.argv[4] || '0,9,20,32').split(',').map(Number)) {
  await page.evaluate((hero, pos) => { const a = window.__tbb.app; a.save.data.campaign = { v: 1, heroId: hero, pos, cleared: [...Array(pos).keys()], stars: 2, rolls: 3, done: false }; a.goBoard(); }, hero, pos);
  await new Promise((r) => setTimeout(r, 2500));
  await page.screenshot({ path: `${OUT}/board-${hero}-${pos}.png` });
}
console.log(errors.join('\n') || 'no errors');
await browser.close(); server.close();
