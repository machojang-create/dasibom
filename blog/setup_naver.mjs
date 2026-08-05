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
import { loadConfig, paths, ensureOutDir } from './lib/queue.mjs';
import { launchBrowser, lastUsedBrowser } from './lib/browser.mjs';

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

const browser = await launchBrowser({ headless: !headed, slowMo: headed ? 150 : 0 }, config);
console.log(`브라우저: ${lastUsedBrowser()}`);
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

  // ── 카테고리 7개 ──────────────────────────────────────────────
  if (has('categories') || doAll) {
    console.log('\n카테고리를 만듭니다.\n');
    const wanted = Object.values(config.naver.category_map);

    const CAT_URL = `https://admin.blog.naver.com/${blogId}/config/blog`;

    /** 카테고리 화면을 새로 열고 papermain 프레임을 돌려줍니다. */
    async function openCategoryPage() {
      await page.goto(CAT_URL, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(1800);
      const f = page.frames().find((x) => x.name() === 'papermain');
      if (!f) throw new Error('카테고리 화면(papermain)을 찾지 못했습니다.');
      return f;
    }

    // 카테고리 이름은 트리(#tree) 안의 span._categoryName 입니다.
    // '카테고리 전체보기' 는 항목이 아니라 머리글이라 세지 않습니다.
    const readTree = (f) =>
      f.evaluate(() =>
        [...document.querySelectorAll('#tree li span._categoryName')].map((s) =>
          (s.innerText || '').trim(),
        ),
      );

    /**
     * 고른 항목의 이름을 바꿉니다.
     *
     * ⚠️ 한 글자씩 치면 마지막 글자가 잘립니다.
     *    이름칸은 onkeyup 으로 트리에 값을 옮기는데, 마지막 글자의 keyup 이 나기 전에
     *    다음 동작이 들어가면 그 글자만 빠진 채 저장됩니다("정책과 지원금" → "정책과 지원").
     *    그래서 값을 한 번에 넣고 keyup 을 직접 일으켜 확실히 반영시킵니다.
     */
    async function rename(f, name) {
      const nameInput = f.locator('#category_name');
      await nameInput.click();
      await nameInput.fill(name);
      await f.evaluate(() => {
        const el = document.querySelector('#category_name');
        el.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      });
      await page.waitForTimeout(300);
      const shown = await readTree(f);
      if (!shown.includes(name)) {
        throw new Error(`이름이 트리에 반영되지 않았습니다: ${name} (현재: ${shown.join(', ')})`);
      }
    }

    /** 확인을 눌러 저장합니다. */
    async function save(f) {
      await f.locator('#submit_button').click();
      await page.waitForTimeout(1200);
      for (const sel of ['#ly_alert_confirm', '.popup_btn_confirm']) {
        const b = page.locator(sel).first();
        if (await b.isVisible().catch(() => false)) {
          await b.click().catch(() => {});
          break;
        }
      }
      await page.waitForTimeout(2000);
    }

    let frame = await openCategoryPage();
    const before = await readTree(frame);
    console.log(`  지금 있는 것: ${before.join(', ') || '(없음)'}`);

    if (wanted.every((w) => before.includes(w))) {
      console.log('  일곱 개가 이미 다 있습니다. 넘어갑니다.');
    } else {
      for (const w of wanted.filter((w) => before.includes(w))) {
        console.log(`  건너뜀 (이미 있음): ${w}`);
      }

      // ⚠️ 한 번에 여러 개를 만들어 두고 마지막에 저장하면 중간 것들이 사라집니다.
      //    네이버가 새 항목을 하나씩만 받아들입니다. 그래서 한 개 만들 때마다 저장하고
      //    화면을 다시 엽니다. 느리지만 이 방법만 확실합니다.
      const todo = wanted.filter((w) => !before.includes(w));
      for (const name of todo) {
        frame = await openCategoryPage();
        const now = await readTree(frame);
        if (now.includes(name)) {
          console.log(`  건너뜀 (이미 있음): ${name}`);
          continue;
        }

        // 이름이 어긋난 항목(처음의 '게시판', 지난번에 잘려 들어간 이름)이 있으면
        // 새로 만들지 않고 그것의 이름만 고쳐 재활용합니다. 지우는 것보다 안전합니다.
        const spare = now.filter((b) => !wanted.includes(b));
        if (spare.length) {
          const old = spare[0];
          await frame.locator('#tree li span._categoryName').nth(now.indexOf(old)).click();
          await page.waitForTimeout(400);
          await rename(frame, name);
          await save(frame);
          console.log(`  이름 바꿈: ${old} → ${name}`);
        } else {
          await frame.locator('img._addCategoryView').click();
          await page.waitForTimeout(900);
          const nameInput = frame.locator('#category_name');
          if (!(await nameInput.isEnabled().catch(() => false))) {
            const n = await frame.locator('#tree li span._categoryName').count();
            await frame.locator('#tree li span._categoryName').nth(n - 1).click();
            await page.waitForTimeout(400);
          }
          await rename(frame, name);
          await save(frame);
          console.log(`  추가: ${name}`);
        }
      }
    }

    // ── 순서 맞추기 ──────────────────────────────────────────────
    // 방문자가 처음 보는 순서가 곧 우선순위라, config 의 카테고리 차례대로 세웁니다.
    // 원하는 순서대로 하나씩 '맨아래' 로 보내면 마지막엔 그 순서가 됩니다.
    frame = await openCategoryPage();
    let order = await readTree(frame);
    if (wanted.every((w) => order.includes(w)) && order.join('|') !== wanted.join('|')) {
      console.log(`\n  순서를 바로잡습니다. 지금: ${order.join(' → ')}`);
      for (const name of wanted) {
        frame = await openCategoryPage();
        order = await readTree(frame);
        const idx = order.indexOf(name);
        if (idx < 0) continue;
        await frame.locator('#tree li span._categoryName').nth(idx).click();
        await page.waitForTimeout(400);
        await frame.locator('img._moveLast').click();
        await page.waitForTimeout(500);
        await save(frame);
      }
      frame = await openCategoryPage();
      order = await readTree(frame);
      console.log(`  바뀐 뒤: ${order.join(' → ')}`);
    }

    // 저장 결과를 새로 읽어 확인합니다.
    await page.goto(`https://admin.blog.naver.com/${blogId}/config/blog`, {
      waitUntil: 'networkidle',
      timeout: 30000,
    });
    await page.waitForTimeout(2000);
    const frame2 = page.frames().find((f) => f.name() === 'papermain');
    const after = frame2
      ? await frame2.evaluate(() =>
          [...document.querySelectorAll('#tree li span._categoryName')].map((s) =>
            (s.innerText || '').trim(),
          ),
        )
      : [];
    await shot(page, 'cat_after');

    const made = wanted.filter((w) => after.includes(w));
    const missing = wanted.filter((w) => !after.includes(w));
    console.log(`\n  만들어진 카테고리 ${made.length}/${wanted.length}개`);
    for (const m of made) console.log(`    ○ ${m}`);
    for (const m of missing) console.log(`    ✗ ${m} — 안 만들어졌습니다`);
    report.categories = { made, missing, after };
  }

  // ── 블로그 정보 ───────────────────────────────────────────────
  if (has('info') || doAll) {
    console.log('\n블로그 정보를 채웁니다.\n');
    const a = config.blog_assets ?? {};
    const want = {
      papername: config.blog.name ?? '다시봄라이프',
      nickname: config.blog.nickname ?? '다시봄',
      introduce: (a.intro ?? []).join('\n'),
    };

    await page.goto(`https://admin.blog.naver.com/${blogId}/config/bloginfo`, {
      waitUntil: 'networkidle',
      timeout: 30000,
    });
    await page.waitForTimeout(2000);
    const f = page.frames().find((x) => x.name() === 'papermain') ?? page.mainFrame();

    const before = await f.evaluate(() => ({
      papername: document.querySelector('#papername')?.value ?? '',
      nickname: document.querySelector('#frmNickname')?.value ?? '',
      introduce: document.querySelector('#frmIntroduce')?.value ?? '',
      subject: document.querySelector('#subject_btn')?.innerText?.trim() ?? '',
    }));
    console.log(`  지금: 블로그명="${before.papername}" 별명="${before.nickname}" 주제="${before.subject}"`);

    await f.locator('#papername').fill(want.papername);
    await f.locator('#frmNickname').fill(want.nickname);
    if (want.introduce) await f.locator('#frmIntroduce').fill(want.introduce);

    // 주제 — 단추를 눌러 목록(직접 만든 드롭다운)을 열고 글자로 고릅니다.
    // 라디오가 아니라 li 목록이라 값이 아니라 보이는 글자로 찾아야 합니다.
    // ⚠️ 목록을 열어 둔 채로 저장을 누르면 목록이 확인 단추를 가려 저장이 안 됩니다. 반드시 닫고 저장합니다.
    const wantSubject = a.subject ?? '건강·의학';
    if (!before.subject.includes(wantSubject)) {
      await f.locator('#subject_btn').click();
      await page.waitForTimeout(900);
      const picked = await f.evaluate((label) => {
        const norm = (s) => s.replace(/[·ㆍ・]/g, '').replace(/\s/g, '');
        const target = norm(label);
        for (const el of document.querySelectorAll('li, a, label, span')) {
          if (el.children.length > 1) continue;
          const t = (el.innerText || '').trim();
          if (t && norm(t) === target) {
            el.click();
            return t;
          }
        }
        return null;
      }, wantSubject);
      await page.waitForTimeout(700);
      const nowSubject = await f.evaluate(
        () => document.querySelector('#subject_btn')?.innerText?.trim() ?? '',
      );
      console.log(
        picked
          ? `  주제 고름: ${picked} (칸 표시: ${nowSubject})`
          : `  주제 "${wantSubject}" 를 목록에서 못 찾았습니다`,
      );
      // 목록이 아직 열려 있으면 닫습니다.
      await page.keyboard.press('Escape').catch(() => {});
      await page.waitForTimeout(400);
    }

    await shot(page, 'info_before_save');
    await f.locator('._btnConfirm').first().click();
    await page.waitForTimeout(2500);
    for (const sel of ['#ly_alert_confirm', '.popup_btn_confirm']) {
      const b = page.locator(sel).first();
      if (await b.isVisible().catch(() => false)) {
        await b.click().catch(() => {});
        break;
      }
    }
    await page.waitForTimeout(2000);

    // 저장됐는지 새로 읽어 확인합니다.
    await page.goto(`https://admin.blog.naver.com/${blogId}/config/bloginfo`, {
      waitUntil: 'networkidle',
      timeout: 30000,
    });
    await page.waitForTimeout(2000);
    const f2 = page.frames().find((x) => x.name() === 'papermain') ?? page.mainFrame();
    const after = await f2.evaluate(() => ({
      papername: document.querySelector('#papername')?.value ?? '',
      nickname: document.querySelector('#frmNickname')?.value ?? '',
      introduce: document.querySelector('#frmIntroduce')?.value ?? '',
      subject: document.querySelector('#subject_btn')?.innerText?.trim() ?? '',
    }));
    await shot(page, 'info_after');
    console.log('\n  저장 결과');
    console.log(`    블로그명 ${after.papername === want.papername ? '○' : '✗'} "${after.papername}"`);
    console.log(`    별명     ${after.nickname === want.nickname ? '○' : '✗'} "${after.nickname}"`);
    console.log(`    소개글   ${after.introduce.trim() ? '○' : '✗'} "${after.introduce.slice(0, 40)}..."`);
    console.log(`    주제     ${after.subject.includes(wantSubject) ? '○' : '✗'} "${after.subject}"`);
    report.info = { before, after };
  }

  // ── 프로필·모바일커버 이미지 ──────────────────────────────────
  if (has('images') || doAll) {
    console.log('\n이미지를 올립니다.\n');
    const assetDir = path.join(outDir, 'assets');
    const jobs = [
      { label: '프로필', file: path.join(assetDir, 'profile.png'), btn: '._btnProfileImageUpload' },
      {
        label: '모바일 커버',
        file: path.join(assetDir, 'mobile_cover.png'),
        btn: '._btnMobileTitleImageUpload',
      },
    ];

    /** 지금 화면에 실제로 어떤 이미지가 걸려 있는지 읽습니다. 올렸다고 믿지 않고 확인합니다. */
    async function currentImages() {
      const fr = page.frames().find((x) => x.name() === 'papermain') ?? page.mainFrame();
      return fr
        .evaluate(() => ({
          profile: document.querySelector('#profile_thumb img, .profile_img img')?.src ?? '',
          all: [...document.querySelectorAll('img')].map((i) => i.src).join(' '),
        }))
        .catch(() => ({ profile: '', all: '' }));
    }

    for (const job of jobs) {
      if (!fs.existsSync(job.file)) {
        console.log(`  건너뜀 — 파일이 없습니다: ${path.basename(job.file)}`);
        console.log('    node gen_blog_assets.mjs 로 먼저 만드세요.');
        continue;
      }

      await page.goto(`https://admin.blog.naver.com/${blogId}/config/bloginfo`, {
        waitUntil: 'networkidle',
        timeout: 30000,
      });
      await page.waitForTimeout(1800);
      const f = page.frames().find((x) => x.name() === 'papermain') ?? page.mainFrame();

      try {
        // 등록을 누르면 새 창이 뜨고, 그 안에 파일칸(name=file1)이 있습니다.
        const [popup] = await Promise.all([
          context.waitForEvent('page', { timeout: 15000 }),
          f.locator(job.btn).first().click(),
        ]);
        await popup.waitForLoadState('domcontentloaded');
        await popup.waitForTimeout(2500);

        // ⚠️ 파일칸은 팝업의 본문이 아니라 그 안의 iframe 에 있습니다. 프레임을 찾아 들어갑니다.
        let target = null;
        for (const fr of popup.frames()) {
          const n = await fr.locator('input[type=file]').count().catch(() => 0);
          if (n > 0) {
            target = fr;
            break;
          }
        }
        if (!target) throw new Error('파일 넣는 칸을 못 찾았습니다');

        await target.locator('input[type=file]').first().setInputFiles(job.file);
        await popup.waitForTimeout(1500);

        // '이미지 첨부' 단추는 파일칸과 다른 프레임에 있습니다. 팝업의 모든 프레임을 뒤집니다.
        const ATTACH =
          'a:has-text("이미지 첨부"), button:has-text("이미지 첨부"), input[value="이미지 첨부"], img[alt="이미지 첨부"]';
        let clicked = false;
        for (const fr of popup.frames()) {
          const loc = fr.locator(ATTACH).first();
          if (await loc.count().catch(() => 0)) {
            await loc.click({ timeout: 8000 }).catch(() => {});
            clicked = true;
            break;
          }
        }
        if (!clicked) throw new Error('"이미지 첨부" 단추를 못 찾았습니다');
        await popup.waitForTimeout(4000);
        if (!popup.isClosed()) await popup.close().catch(() => {});
        await page.waitForTimeout(1500);

        // 본문 화면에서 저장까지 눌러야 남습니다.
        const f2 = page.frames().find((x) => x.name() === 'papermain') ?? page.mainFrame();
        await f2.locator('._btnConfirm').first().click().catch(() => {});
        await page.waitForTimeout(2500);

        // 화면을 새로 읽어 정말 걸렸는지 봅니다. 올렸다고 말만 하지 않습니다.
        await page.goto(`https://admin.blog.naver.com/${blogId}/config/bloginfo`, {
          waitUntil: 'networkidle',
          timeout: 30000,
        });
        await page.waitForTimeout(1800);
        const now = await currentImages();
        const stillEmpty = /no_image/.test(now.all) && job.label === '프로필';
        if (stillEmpty) {
          console.log(`  ✗ ${job.label} — 눌렀지만 화면에 걸리지 않았습니다`);
          report.imageFailed = [...(report.imageFailed ?? []), job.label];
        } else {
          console.log(`  ○ ${job.label} 올림 (${path.basename(job.file)})`);
        }
      } catch (err) {
        console.log(`  실패: ${job.label} — ${err.message.split('\n')[0]}`);
        console.log('    이 하나는 관리 화면에서 직접 올려 주세요.');
      }
    }

    // 결과 확인
    await page.goto(`https://admin.blog.naver.com/${blogId}/config/bloginfo`, {
      waitUntil: 'networkidle',
      timeout: 30000,
    });
    await page.waitForTimeout(2000);
    await shot(page, 'images_after');
    console.log('\n  결과 화면: setup_images_after.png');
  }

  // ── 스킨 ──────────────────────────────────────────────────────
  if (has('skin') || doAll) {
    console.log('\n스킨을 고릅니다.\n');
    // 배경 무늬나 색이 강한 스킨은 우리가 만든 타이틀 그림과 싸웁니다.
    // 읽는 분이 시니어라 글이 잘 보이는 흰 배경이 우선입니다.
    const wantSkin = config.naver.skin ?? '화이트 라벨';

    await page.goto(`https://admin.blog.naver.com/${blogId}/skin/list`, {
      waitUntil: 'networkidle',
      timeout: 30000,
    });
    await page.waitForTimeout(2200);
    const f = page.frames().find((x) => x.name() === 'papermain') ?? page.mainFrame();

    const picked = await f.evaluate((label) => {
      for (const r of document.querySelectorAll('input[type=radio][id^=naverSkinListRadio]')) {
        const t = (r.closest('li,td,div')?.innerText ?? '').trim();
        if (t.startsWith(label)) {
          r.click();
          return t.split('\n')[0];
        }
      }
      return null;
    }, wantSkin);

    if (!picked) {
      console.log(`  "${wantSkin}" 스킨을 목록에서 못 찾았습니다.`);
    } else {
      await page.waitForTimeout(600);
      await f.locator('._skinSave').first().click();
      await page.waitForTimeout(1500);
      for (const sel of ['#ly_alert_confirm', '.popup_btn_confirm', 'button:has-text("확인")']) {
        const b = page.locator(sel).first();
        if (await b.isVisible().catch(() => false)) {
          await b.click().catch(() => {});
          break;
        }
      }
      await page.waitForTimeout(3000);

      // 정말 걸렸는지 화면을 새로 읽어 확인합니다.
      await page.goto(`https://admin.blog.naver.com/${blogId}/skin/list`, {
        waitUntil: 'networkidle',
        timeout: 30000,
      });
      await page.waitForTimeout(2000);
      const f2 = page.frames().find((x) => x.name() === 'papermain') ?? page.mainFrame();
      const checked = await f2.evaluate(() => {
        const r = [...document.querySelectorAll('input[type=radio][id^=naverSkinListRadio]')].find(
          (x) => x.checked,
        );
        return r ? (r.closest('li,td,div')?.innerText ?? '').trim().split('\n')[0] : null;
      });
      console.log(
        checked === picked
          ? `  ○ 스킨 적용됨: ${checked}`
          : `  ✗ 고른 것은 "${picked}" 인데 지금 걸린 것은 "${checked ?? '없음'}" 입니다`,
      );
      report.skin = { picked, checked };
    }
    await shot(page, 'skin_after');
  }

  if (
    !has('scan') &&
    !has('categories') &&
    !has('info') &&
    !has('images') &&
    !has('skin') &&
    !doAll
  ) {
    console.log('무엇을 할지 지정해 주세요. --scan / --categories / --info / --images / --skin / --all');
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
