#!/usr/bin/env node
/**
 * 네이버 블로그 발행기 (Playwright).
 *
 *   node publish_naver.mjs --post out/A01_....json
 *   node publish_naver.mjs --post out/A01_....json --headed        # 브라우저 보면서
 *   node publish_naver.mjs --post out/A01_....json --reserve "2026-08-10 09:00"
 *   node publish_naver.mjs --post out/A01_....json --headed --pause # 셀렉터 디버깅
 *
 * 먼저 login_naver.mjs 로 세션을 만들어 두어야 합니다.
 *
 * 주의: 네이버 에디터 DOM 은 자주 바뀝니다. 단계가 실패하면 어디서 멈췄는지 로그로
 *       알려주고 out/error_*.png 스크린샷을 남깁니다. lib/selectors.mjs 만 고치면 됩니다.
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { loadConfig, loadQueue, saveQueue, markTopic, paths, ensureOutDir } from './lib/queue.mjs';
import { SEL, firstVisible, clickIfPresent } from './lib/selectors.mjs';

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : null;
};
const has = (name) => args.includes(`--${name}`);

const config = loadConfig();
const postPath = flag('post');
if (!postPath) {
  console.error('--post out/xxx.json 이 필요합니다.');
  process.exit(1);
}

const post = JSON.parse(fs.readFileSync(postPath, 'utf8'));
const imagePath = flag('image') ?? postPath.replace(/\.json$/, '.png');
const hasImage = fs.existsSync(imagePath);
const reserveAt = flag('reserve');
const headed = has('headed') || has('pause');

const sessionFile = path.join(paths.root, config.naver.session_file);
if (!fs.existsSync(sessionFile)) {
  console.error(`세션 파일이 없습니다: ${sessionFile}\n먼저 "node login_naver.mjs" 를 실행하세요.`);
  process.exit(1);
}

// 본문은 순수 정보입니다. 모든 글 끝에 똑같은 카드 하나만 붙습니다.
// 글마다 다른 링크를 고르지 않습니다 — config.json 의 footer_card 를 끄면 카드도 없습니다.
const card = config.footer_card;
const bodyWithCta =
  card?.enabled && card.lines?.length
    ? `${post.body.trim()}\n\n\n${card.lines.join('\n')}`
    : post.body.trim();

let step = 'start';
const browser = await chromium.launch({ headless: !headed, slowMo: headed ? 120 : 0 });
const context = await browser.newContext({
  storageState: sessionFile,
  locale: 'ko-KR',
  viewport: { width: 1440, height: 960 },
});
const page = await context.newPage();

try {
  step = '글쓰기 화면 열기';
  const writeUrl = config.naver.write_url.replace('{id}', config.blog.id);
  await page.goto(writeUrl, { waitUntil: 'domcontentloaded' });

  step = '에디터 iframe 찾기';
  const frameEl = await firstVisible(page, SEL.editorFrame, 15000);
  if (!frameEl) throw new Error('에디터 iframe 을 못 찾았습니다. 로그인 세션이 만료됐을 수 있습니다.');
  const frame = await frameEl.contentFrame();
  if (!frame) throw new Error('iframe 내용에 접근하지 못했습니다.');

  step = '팝업 정리';
  await clickIfPresent(frame, SEL.restorePopupCancel); // 이전 작성글 불러오기 → 취소
  await clickIfPresent(frame, SEL.helpClose); // 도움말 닫기

  if (has('pause')) {
    console.log('\n--pause: 브라우저를 열어둡니다. Inspector 로 셀렉터를 확인하세요.');
    await page.pause();
  }

  step = '제목 입력';
  const titleEl = await firstVisible(frame, SEL.title, 10000);
  if (!titleEl) throw new Error('제목 입력란을 못 찾았습니다.');
  await titleEl.click();
  await page.keyboard.type(post.title, { delay: 12 });

  step = '본문으로 이동';
  const bodyEl = await firstVisible(frame, SEL.body, 10000);
  if (!bodyEl) throw new Error('본문 입력란을 못 찾았습니다.');
  await bodyEl.click();

  if (hasImage) {
    step = '대표 이미지 첨부';
    const chooser = page.waitForEvent('filechooser', { timeout: 8000 }).catch(() => null);
    const clicked = await clickIfPresent(frame, SEL.imageButton, 4000);
    if (clicked) {
      const fc = await chooser;
      if (fc) {
        await fc.setFiles(imagePath);
        await page.waitForTimeout(2500); // 업로드 대기
      }
    } else {
      console.log('  (사진 버튼을 못 찾아 이미지 없이 진행합니다)');
    }
    const after = await firstVisible(frame, SEL.body, 5000);
    if (after) await after.click();
    await page.keyboard.press('End');
    await page.keyboard.press('Enter');
  }

  step = '본문 입력';
  // 한 줄씩 넣어야 에디터가 문단을 제대로 나눕니다.
  for (const line of bodyWithCta.split('\n')) {
    if (line.trim() === '') {
      await page.keyboard.press('Enter');
    } else {
      await page.keyboard.type(line, { delay: 4 });
      await page.keyboard.press('Enter');
    }
  }

  step = '발행 패널 열기';
  const publishBtn = await firstVisible(page, SEL.publishOpen, 8000);
  if (!publishBtn) throw new Error('발행 버튼을 못 찾았습니다.');
  await publishBtn.click();
  await page.waitForTimeout(1200);

  step = '카테고리 선택';
  if (post.naver_category) {
    const catBtn = await firstVisible(page, SEL.categorySelect, 5000);
    if (catBtn) {
      await catBtn.click();
      const option = await firstVisible(page, SEL.categoryOption(post.naver_category), 4000);
      if (option) await option.click();
      else console.log(`  (카테고리 "${post.naver_category}" 를 못 찾아 기본값으로 둡니다)`);
    }
  }

  step = '태그 입력';
  const tagEl = await firstVisible(page, SEL.tagInput, 5000);
  if (tagEl) {
    await tagEl.click();
    for (const tag of post.tags.slice(0, 10)) {
      await page.keyboard.type(tag, { delay: 15 });
      await page.keyboard.press('Enter');
    }
  }

  if (reserveAt) {
    step = '예약 발행 설정';
    const [date, time] = reserveAt.split(' ');
    const [hh, mm] = (time ?? '09:00').split(':');
    await clickIfPresent(page, SEL.reserveRadio, 4000);
    const dateEl = await firstVisible(page, SEL.reserveDate, 4000);
    if (dateEl) await dateEl.fill(date.replace(/-/g, '.'));
    const hourEl = await firstVisible(page, SEL.reserveHour, 3000);
    if (hourEl) await hourEl.selectOption(hh);
    const minEl = await firstVisible(page, SEL.reserveMinute, 3000);
    if (minEl) await minEl.selectOption(String(Math.floor(Number(mm) / 10) * 10).padStart(2, '0'));
  }

  if (has('dry-run')) {
    console.log('\n--dry-run: 여기까지만. 발행하지 않고 종료합니다.');
    const shot = path.join(ensureOutDir(), `dryrun_${post.id}.png`);
    await page.screenshot({ path: shot, fullPage: true });
    console.log(`  화면 저장: ${shot}`);
    await browser.close();
    process.exit(0);
  }

  step = '발행';
  const confirm = await firstVisible(page, SEL.publishConfirm, 6000);
  if (!confirm) throw new Error('최종 발행 버튼을 못 찾았습니다.');
  await confirm.click();
  await page.waitForTimeout(5000);

  const postUrl = page.url();

  const queue = loadQueue();
  markTopic(queue, post.id, {
    status: 'published',
    published_at: new Date().toISOString(),
    reserved_for: reserveAt ?? null,
    post_url: postUrl,
  });
  saveQueue(queue);

  console.log(`\n발행 완료: ${post.title}`);
  console.log(`  ${reserveAt ? `예약 ${reserveAt}` : '즉시 발행'} · ${card?.enabled ? '고정 카드 붙임' : '카드 없음'}`);
  console.log(`  ${postUrl}`);
} catch (err) {
  const shot = path.join(ensureOutDir(), `error_${post.id}_${Date.now()}.png`);
  await page.screenshot({ path: shot, fullPage: true }).catch(() => {});
  console.error(`\n실패한 단계: ${step}`);
  console.error(`  ${err.message}`);
  console.error(`  화면 저장: ${shot}`);
  console.error('\n네이버 DOM 이 바뀌었을 가능성이 큽니다. lib/selectors.mjs 를 고쳐보세요.');
  console.error('  node publish_naver.mjs --post <파일> --headed --pause');
  await browser.close();
  process.exit(1);
}

await browser.close();
