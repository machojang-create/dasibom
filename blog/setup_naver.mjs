#!/usr/bin/env node
/**
 * 블로그 기본 세팅 — 관리 화면을 대신 돌아다니며 세팅한다.
 *
 *   node setup_naver.mjs --scan            무엇이 어디 있는지 살펴보고 보고만 합니다 (아무것도 안 바꿈)
 *   node setup_naver.mjs --categories      카테고리 7개 생성
 *   node setup_naver.mjs --info            블로그명·소개글
 *   node setup_naver.mjs --search          검색엔진 수집 허용
 *   node setup_naver.mjs --all             위 셋을 순서대로
 *   node setup_naver.mjs --all --headed    브라우저를 보면서 (권장)
 *
 * ⚠️ 네이버 관리 화면은 로그인 뒤에만 열립니다. 로그인 없이는 주소도 확인할 수 없어서
 *    아래 후보 주소·셀렉터는 아직 확정된 값이 아닙니다.
 *    그래서 --scan 이 먼저입니다. 실제 화면을 훑어 무엇이 있는지 알아내고
 *    out/setup_scan_*.png 와 out/setup_scan.json 에 남깁니다. 그걸 보고 이 파일을 고칩니다.
 *
 * 스킨·타이틀 이미지·레이아웃은 자동으로 하지 않습니다.
 *   리모콘(세부 디자인)은 캔버스와 팝업이 겹쳐 있어 자동 조작이 깨지기 쉽고,
 *   잘못 누르면 되돌리기 어렵습니다. 이미지 4종은 만들어 두었으니 그 부분만 손으로 올리시면 됩니다.
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { loadConfig, paths, ensureOutDir } from './lib/queue.mjs';
import { firstVisible } from './lib/selectors.mjs';

const args = process.argv.slice(2);
const has = (n) => args.includes(`--${n}`);
const headed = has('headed');
const doAll = has('all');

const config = loadConfig();
const blogId = config.blog.id;
const sessionFile = path.join(paths.root, config.naver.session_file);

if (!fs.existsSync(sessionFile)) {
  console.error(`로그인 세션이 없습니다: ${config.naver.session_file}`);
  console.error('  npm run login 을 먼저 돌려 주세요.');
  process.exit(1);
}

/** 관리 화면 주소 후보. 네이버가 주소를 바꿔 왔기 때문에 여러 개를 시도합니다. */
const ADMIN = {
  category: [
    `https://admin.blog.naver.com/${blogId}/config/category`,
    `https://admin.blog.naver.com/CategoryManage.naver?blogId=${blogId}`,
    `https://blog.naver.com/CategoryManage.naver?blogId=${blogId}`,
  ],
  info: [
    `https://admin.blog.naver.com/${blogId}/config/info`,
    `https://admin.blog.naver.com/BlogInfo.naver?blogId=${blogId}`,
    `https://blog.naver.com/BlogInfo.naver?blogId=${blogId}`,
  ],
  home: [`https://admin.blog.naver.com/${blogId}`, `https://admin.blog.naver.com/`],
};

const outDir = ensureOutDir();
const shots = [];
async function shot(page, name) {
  const f = path.join(outDir, `setup_${name}.png`);
  await page.screenshot({ path: f, fullPage: true }).catch(() => {});
  shots.push(f);
  return f;
}

/** 후보 주소를 차례로 열어 관리 화면처럼 보이는 곳에 도달하면 그 주소를 돌려줍니다. */
async function openAdmin(page, candidates, label) {
  for (const url of candidates) {
    try {
      const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      const status = res?.status() ?? 0;
      const here = page.url();
      // 로그인 화면으로 튕기면 세션이 죽은 것입니다.
      if (/nid\.naver\.com|nidlogin/.test(here)) {
        throw new Error('로그인 세션이 만료됐습니다. npm run login 을 다시 돌려 주세요.');
      }
      if (status && status < 400) {
        console.log(`  [${label}] ${url}  (HTTP ${status})`);
        return url;
      }
      console.log(`  [${label}] ${url} → HTTP ${status}, 다음 후보`);
    } catch (err) {
      if (/세션이 만료/.test(err.message)) throw err;
      console.log(`  [${label}] ${url} → 열지 못했습니다, 다음 후보`);
    }
  }
  return null;
}

/** 화면에 실제로 무엇이 있는지 훑어봅니다. 셀렉터를 확정하기 위한 정찰입니다. */
async function scanPage(page) {
  return page.evaluate(() => {
    const pick = (el) => ({
      tag: el.tagName.toLowerCase(),
      type: el.getAttribute('type') ?? null,
      id: el.id || null,
      name: el.getAttribute('name') || null,
      cls: (el.className || '').toString().slice(0, 80) || null,
      text: (el.innerText || el.value || '').trim().slice(0, 40) || null,
    });
    const all = [...document.querySelectorAll('input,button,select,textarea,a[href*="config"]')];
    return {
      title: document.title,
      url: location.href,
      frames: [...document.querySelectorAll('iframe')].map((f) => ({
        id: f.id || null,
        name: f.name || null,
        src: (f.src || '').slice(0, 120),
      })),
      controls: all.slice(0, 120).map(pick),
    };
  });
}

const browser = await chromium.launch({ headless: !headed, slowMo: headed ? 150 : 0 });
const context = await browser.newContext({
  storageState: sessionFile,
  locale: 'ko-KR',
  viewport: { width: 1440, height: 960 },
});
const page = await context.newPage();
const report = { at: new Date().toISOString(), blogId, pages: {} };

try {
  // ── 정찰 ──────────────────────────────────────────────────────
  if (has('scan') || doAll) {
    console.log('\n관리 화면을 살펴봅니다.\n');
    for (const [key, cands] of Object.entries(ADMIN)) {
      const url = await openAdmin(page, cands, key);
      if (!url) {
        report.pages[key] = { ok: false, reason: '후보 주소를 전부 열지 못했습니다' };
        continue;
      }
      await page.waitForTimeout(1500);
      const info = await scanPage(page);
      const f = await shot(page, `scan_${key}`);
      report.pages[key] = { ok: true, url, ...info, screenshot: path.basename(f) };
      console.log(`      제목: ${info.title}`);
      console.log(`      조작 가능한 것 ${info.controls.length}개 · iframe ${info.frames.length}개`);
    }

    const rf = path.join(outDir, 'setup_scan.json');
    fs.writeFileSync(rf, `${JSON.stringify(report, null, 2)}\n`);
    console.log(`\n정찰 결과: ${path.basename(rf)}`);
    console.log(`화면 그림 ${shots.length}장: ${shots.map((s) => path.basename(s)).join(', ')}`);
    console.log('\n이 결과를 보고 카테고리 생성 절차를 확정합니다.');
  }

  if (!has('scan') && !doAll) {
    console.log('무엇을 할지 지정해 주세요. --scan / --categories / --info / --search / --all');
  }
} catch (err) {
  console.error(`\n실패: ${err.message}`);
  await shot(page, `error_${Date.now()}`);
  console.error(`  화면을 남겼습니다: ${shots.at(-1)}`);
  process.exitCode = 1;
} finally {
  if (headed && has('pause')) {
    console.log('\n브라우저를 열어 둡니다. 확인이 끝나면 Ctrl+C 로 닫으세요.');
    await new Promise(() => {});
  }
  await browser.close();
}
