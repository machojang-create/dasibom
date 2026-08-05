#!/usr/bin/env node
/**
 * 관리 화면 한 곳을 훑는다. 셀렉터를 확정하기 위한 정찰용.
 *   node scan_links.mjs                          관리 홈의 메뉴 주소 목록
 *   node scan_links.mjs --page config/blog       그 화면의 입력칸·단추 목록
 *   node scan_links.mjs --page config/blog --html ".category"   그 부분의 실제 HTML
 */
import path from 'node:path';
import { loadConfig, paths, ensureOutDir } from './lib/queue.mjs';
import { launchBrowser } from './lib/browser.mjs';

const args = process.argv.slice(2);
const flag = (n) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 ? args[i + 1] : null;
};

const config = loadConfig();
const blogId = config.blog.id;
const sessionFile = path.join(paths.root, config.naver.session_file);
const sub = flag('page');
const htmlSel = flag('html');
const url = sub
  ? `https://admin.blog.naver.com/${blogId}/${sub}`
  : `https://admin.blog.naver.com/${blogId}`;

const browser = await launchBrowser({ headless: true }, config);
const context = await browser.newContext({
  storageState: sessionFile,
  locale: 'ko-KR',
  viewport: { width: 1440, height: 1200 },
});
const page = await context.newPage();
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);
console.log(`화면: ${page.url()}\n`);

const frame = page.frames().find((f) => f.name() === 'papermain') ?? page.mainFrame();

if (htmlSel) {
  const html = await frame.evaluate((sel) => {
    const el = document.querySelector(sel);
    return el ? el.outerHTML : `(못 찾음: ${sel})`;
  }, htmlSel);
  console.log(html.slice(0, 6000));
} else {
  const info = await frame.evaluate(() => ({
    buttons: [...document.querySelectorAll('a,button,input[type=button],input[type=submit]')]
      .map((e) => ({
        tag: e.tagName.toLowerCase(),
        id: e.id || null,
        cls: (e.className || '').toString().slice(0, 50) || null,
        text: (e.innerText || e.value || '').trim().replace(/\s+/g, ' ').slice(0, 26),
        onclick: (e.getAttribute('onclick') || '').slice(0, 60) || null,
      }))
      .filter((b) => b.text || b.onclick),
  }));
  info.buttons.forEach((b) =>
    console.log(`  ${b.tag} "${b.text}" id=${b.id} cls=${b.cls} onclick=${b.onclick}`),
  );
}

const shot = path.join(ensureOutDir(), `setup_scan_${(sub ?? 'home').replace(/\//g, '_')}.png`);
await page.screenshot({ path: shot, fullPage: true }).catch(() => {});
await browser.close();
