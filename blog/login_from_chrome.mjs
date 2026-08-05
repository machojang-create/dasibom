#!/usr/bin/env node
/**
 * 평소 쓰시는 크롬의 로그인을 그대로 빌려 세션을 만든다.
 *
 *   node login_from_chrome.mjs
 *
 * 왜 이게 필요한가.
 *   playwright 가 띄우는 크롬은 '새 크롬' 입니다. 평소 크롬과 아무것도 공유하지 않아서
 *   이미 네이버에 로그인해 두셨어도 그 창에서는 로그인이 안 되어 있습니다.
 *   그래서 평소 크롬의 프로필을 **복사해서**(원본은 건드리지 않습니다) 그 사본으로 띄웁니다.
 *
 * 안 될 수도 있습니다.
 *   크롬 127 부터 쿠키 암호화가 강해져서(App-Bound Encryption) 사본에서 못 푸는 경우가 있습니다.
 *   그때는 로그인하기.bat 로 한 번만 직접 로그인하시면 됩니다.
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { chromium } from 'playwright';
import { loadConfig, paths } from './lib/queue.mjs';

const config = loadConfig();
const sessionFile = path.join(paths.root, config.naver.session_file);
const blogId = config.blog.id;

const SRC = path.join(os.homedir(), 'AppData', 'Local', 'Google', 'Chrome', 'User Data');
const DST = path.join(os.tmpdir(), 'dasibom_chrome_copy');

if (!fs.existsSync(SRC)) {
  console.error(`크롬 프로필을 찾지 못했습니다: ${SRC}`);
  process.exit(1);
}

// ── 필요한 것만 복사합니다. 프로필 전체는 수 GB 라 뜨는 데만 한참 걸립니다. ──
console.log('평소 크롬의 로그인 정보를 사본으로 뜨는 중...');
fs.rmSync(DST, { recursive: true, force: true });
fs.mkdirSync(path.join(DST, 'Default', 'Network'), { recursive: true });

const copies = [
  ['Local State', 'Local State'],
  [path.join('Default', 'Network', 'Cookies'), path.join('Default', 'Network', 'Cookies')],
  [path.join('Default', 'Preferences'), path.join('Default', 'Preferences')],
  [path.join('Default', 'Secure Preferences'), path.join('Default', 'Secure Preferences')],
];
let copied = 0;
for (const [from, to] of copies) {
  const src = path.join(SRC, from);
  if (!fs.existsSync(src)) continue;
  try {
    fs.copyFileSync(src, path.join(DST, to));
    copied++;
  } catch (err) {
    console.log(`  (${from} 은 지금 크롬이 쓰고 있어 못 옮겼습니다: ${err.code})`);
  }
}
console.log(`  파일 ${copied}개 옮김`);

// ── 사본으로 띄워 네이버가 로그인 상태인지 봅니다 ──────────────
const context = await chromium.launchPersistentContext(DST, {
  channel: 'chrome',
  headless: false,
  locale: 'ko-KR',
  viewport: { width: 1280, height: 860 },
  args: ['--window-position=60,40'],
});

const page = context.pages()[0] ?? (await context.newPage());
await page.goto('https://www.naver.com', { waitUntil: 'domcontentloaded' }).catch(() => {});
await page.waitForTimeout(2500);

const cookies = await context.cookies();
const names = new Set(cookies.filter((c) => /naver\.com$/.test(c.domain)).map((c) => c.name));
const ok = names.has('NID_AUT') && names.has('NID_SES');

if (!ok) {
  console.log('\n사본에서는 네이버 로그인이 살아 있지 않습니다.');
  console.log('크롬이 쿠키를 잠가 둔 경우입니다. 로그인하기.bat 로 한 번만 직접 로그인해 주세요.');
  await context.close();
  process.exit(2);
}

console.log('네이버 로그인이 살아 있습니다. 블로그를 열어 확인합니다...');
await page
  .goto(`https://blog.naver.com/${blogId}`, { waitUntil: 'domcontentloaded', timeout: 20000 })
  .catch(() => {});
await page.waitForTimeout(1500);

await context.storageState({ path: sessionFile });
await context.close();

console.log(`\n세션 저장 완료: ${sessionFile}`);
console.log('대표님은 아무것도 안 하셔도 됩니다. 이제 세팅을 진행합니다.');
