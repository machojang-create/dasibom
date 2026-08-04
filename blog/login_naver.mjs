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
 * 로그인이 끝나고 블로그 홈이 보이면 터미널에서 Enter 를 누르세요.
 * .naver_session.json 이 저장되고, 이후 publish_naver.mjs 가 이 파일을 씁니다.
 *
 * 주의: .naver_session.json 은 로그인 상태 그 자체입니다. git 에 올리지 마세요.
 *       (blog/.gitignore 에 이미 제외해 두었습니다.)
 */
import path from 'node:path';
import readline from 'node:readline/promises';
import { chromium } from 'playwright';
import { loadConfig, paths } from './lib/queue.mjs';

const config = loadConfig();
const sessionFile = path.join(paths.root, config.naver.session_file);

const browser = await chromium.launch({ headless: false });
const context = await browser.newContext({
  locale: 'ko-KR',
  viewport: { width: 1440, height: 900 },
});
const page = await context.newPage();

await page.goto('https://nid.naver.com/nidlogin.login');

console.log('\n브라우저에서 네이버에 로그인하세요.');
console.log(`로그인이 끝나면 여기로 돌아와 Enter 를 누르세요. (저장 경로: ${sessionFile})\n`);

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
await rl.question('로그인을 마쳤으면 Enter > ');
rl.close();

await context.storageState({ path: sessionFile });
await browser.close();

console.log(`\n세션 저장 완료: ${sessionFile}`);
console.log('이제 publish_naver.mjs 를 실행할 수 있습니다.');
