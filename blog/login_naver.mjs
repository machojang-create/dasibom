#!/usr/bin/env node
/**
 * 네이버 로그인 세션을 파일로 저장한다. 최초 1회, 그리고 세션이 만료되면 다시 실행.
 *
 *   node login_naver.mjs
 *
 * 브라우저 창이 뜹니다. 직접 아이디/비밀번호를 넣고 로그인하세요.
 * (네이버는 자동 입력을 차단하기 때문에 수동 로그인이 가장 안정적입니다.
 *  2단계 인증도 이 창에서 그대로 통과하시면 됩니다.)
 *
 * 로그인만 하시면 됩니다. 터미널로 돌아올 필요 없습니다 —
 * 로그인이 끝난 것을 스스로 알아채고 세션을 저장한 뒤 창을 닫습니다.
 *
 * 주의: .naver_session.json 은 로그인 상태 그 자체입니다. git 에 올리지 마세요.
 *       (blog/.gitignore 에 이미 제외해 두었습니다.)
 */
import path from 'node:path';
import { loadConfig, paths } from './lib/queue.mjs';
import { launchBrowser, lastUsedBrowser } from './lib/browser.mjs';

const config = loadConfig();
const sessionFile = path.join(paths.root, config.naver.session_file);
const blogId = config.blog.id;

/** 몇 분까지 기다릴지. 다른 일을 하시다 오셔도 되도록 넉넉하게 둡니다. */
const WAIT_MINUTES = Number(process.env.LOGIN_WAIT_MIN ?? 30);

const browser = await launchBrowser(
  { headless: false, args: ['--window-position=80,40'] },
  config,
);
console.log(`브라우저: ${lastUsedBrowser()}`);
const context = await browser.newContext({
  locale: 'ko-KR',
  viewport: { width: 1440, height: 900 },
});
const page = await context.newPage();

await page.goto('https://nid.naver.com/nidlogin.login');
// 창이 다른 창 뒤에 가려지면 못 보고 지나칩니다.
await page.bringToFront().catch(() => {});

console.log('\n뜬 브라우저 창에서 네이버에 로그인하세요.');
console.log('터미널로 돌아오실 필요 없습니다. 로그인만 끝내시면 알아서 저장하고 창이 닫힙니다.');
console.log(`(최대 ${WAIT_MINUTES}분 기다립니다)\n`);

/** 로그인 쿠키가 생겼는지 봅니다. NID_AUT 와 NID_SES 가 둘 다 있어야 실제 로그인입니다. */
async function isLoggedIn() {
  const cookies = await context.cookies();
  const names = new Set(cookies.filter((c) => /naver\.com$/.test(c.domain)).map((c) => c.name));
  return names.has('NID_AUT') && names.has('NID_SES');
}

const deadline = Date.now() + WAIT_MINUTES * 60000;
let ok = false;
let ticks = 0;
while (Date.now() < deadline) {
  if (await isLoggedIn().catch(() => false)) {
    ok = true;
    break;
  }
  // 창을 닫아 버리셨으면 기다릴 이유가 없습니다.
  if (page.isClosed()) {
    console.error('\n창이 닫혔습니다. 다시 실행해 주세요.');
    await browser.close().catch(() => {});
    process.exit(1);
  }
  await page.waitForTimeout(2000);
  if (++ticks % 60 === 0) console.log(`  ...${ticks / 30}분째 기다리는 중입니다`);
}

if (!ok) {
  console.error(`\n${WAIT_MINUTES}분 동안 로그인이 확인되지 않았습니다. 다시 실행해 주세요.`);
  await browser.close();
  process.exit(1);
}

// 쿠키가 생긴 직후엔 아직 굳지 않은 값이 있어, 블로그를 한 번 열어 확정시킵니다.
console.log('로그인 확인. 세션을 굳히는 중입니다...');
await page
  .goto(`https://blog.naver.com/${blogId}`, { waitUntil: 'domcontentloaded', timeout: 20000 })
  .catch(() => {});
await page.waitForTimeout(1500);

await context.storageState({ path: sessionFile });
await browser.close();

console.log(`\n세션 저장 완료: ${sessionFile}`);
console.log('이제 세팅과 발행을 대신 진행할 수 있습니다.');
