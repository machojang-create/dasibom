#!/usr/bin/env node
/**
 * 카테고리 비중 재조정 — 한 달 발행한 결과를 보고 무엇을 더 쓸지 정한다.
 *
 *   node rebalance.mjs                     현황과 제안만 봅니다 (아무것도 안 바꿈)
 *   node rebalance.mjs --apply             config.json 의 weight 를 실제로 바꿉니다
 *   node rebalance.mjs --stats out/stats_2026-09-02.json
 *
 * 입력은 out/stats_*.json 중 가장 최근 것입니다. 형식은 둘 다 받습니다.
 *   { "posts": { "B01": { "views": 1200 }, ... } }        글별 (권장)
 *   { "categories": { "benefit": { "views": 3000 } } }    카테고리별 합계만 있을 때
 *
 * 왜 조회수를 편수로 나누는가.
 *   비중이 큰 카테고리는 글이 많아 총 조회수도 당연히 큽니다. 그대로 비교하면
 *   '많이 썼으니 많이 읽혔다' 를 '인기 있다' 로 착각합니다. 한 편이 얼마나 읽혔는지로 봐야
 *   적게 쓴 카테고리도 공평하게 평가됩니다.
 *
 * 왜 조금씩만 움직이는가.
 *   한 달이면 카테고리당 한두 편입니다. 그 한 편이 우연히 터지거나 묻힐 수 있습니다.
 *   표본이 이만큼 작을 때 비중을 크게 흔들면, 다음 달에 반대로 흔들게 됩니다.
 *   그래서 한 번에 움직이는 폭을 제한하고(MAX_MOVE), 어느 카테고리도 없애지 않습니다(MIN_WEIGHT).
 */
import fs from 'node:fs';
import path from 'node:path';
import { loadConfig, loadQueue, paths } from './lib/queue.mjs';

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : null;
};
const has = (name) => args.includes(`--${name}`);

/** 한 번에 움직일 수 있는 최대 폭. 0.35 면 기존 비중의 ±35% 까지만. */
const MAX_MOVE = 0.35;
/** 어떤 카테고리도 이 아래로 내려가지 않습니다. 축을 없애지 않기 위한 바닥입니다. */
const MIN_WEIGHT = 5;
/** 이만큼 안 쌓이면 조정하지 않습니다. 표본이 너무 작으면 조정이 아니라 도박입니다. */
const MIN_POSTS = 10;
/** 편수가 이보다 적은 카테고리는 '참고' 로만 봅니다. 한 편으로 판단하지 않습니다. */
const THIN_POSTS = 2;

const config = loadConfig();
const queue = loadQueue();

// ── 통계 파일 찾기 ──────────────────────────────────────────────
function findStats() {
  const explicit = flag('stats');
  if (explicit) return explicit;
  const dir = paths.out;
  if (!fs.existsSync(dir)) return null;
  const files = fs
    .readdirSync(dir)
    .filter((f) => /^stats_.*\.json$/.test(f))
    .sort();
  return files.length ? path.join(dir, files.at(-1)) : null;
}

const statsFile = findStats();
if (!statsFile || !fs.existsSync(statsFile)) {
  console.error('통계 파일이 없습니다.');
  console.error('  out/stats_YYYY-MM-DD.json 을 만든 뒤 다시 실행하세요.');
  console.error('  수집 방법은 README 의 "한 달 뒤 비중 재조정" 을 보세요.');
  process.exit(1);
}
const stats = JSON.parse(fs.readFileSync(statsFile, 'utf8'));

// ── 카테고리별로 모으기 ─────────────────────────────────────────
const catOf = Object.fromEntries(queue.topics.map((t) => [t.id, t.category]));
const agg = Object.fromEntries(config.categories.map((c) => [c.key, { views: 0, posts: 0 }]));

if (stats.posts) {
  for (const [id, row] of Object.entries(stats.posts)) {
    const key = catOf[id];
    if (!key || !agg[key]) {
      console.error(`  (건너뜀) ${id} — 큐에 없는 글입니다`);
      continue;
    }
    agg[key].views += Number(row.views ?? 0);
    agg[key].posts += 1;
  }
} else if (stats.categories) {
  for (const [key, row] of Object.entries(stats.categories)) {
    if (!agg[key]) continue;
    agg[key].views = Number(row.views ?? 0);
    agg[key].posts = Number(row.posts ?? 0);
  }
} else {
  console.error('통계 파일에 posts 도 categories 도 없습니다.');
  process.exit(1);
}

const totalPosts = Object.values(agg).reduce((n, a) => n + a.posts, 0);
const totalViews = Object.values(agg).reduce((n, a) => n + a.views, 0);

// ── 편당 평균 조회수 = 성과 지표 ────────────────────────────────
for (const a of Object.values(agg)) a.per = a.posts ? a.views / a.posts : 0;
const measured = Object.values(agg).filter((a) => a.posts >= THIN_POSTS && a.per > 0);
const baseline = measured.length
  ? measured.reduce((n, a) => n + a.per, 0) / measured.length
  : 0;

// ── 새 비중 계산 ────────────────────────────────────────────────
const rows = config.categories.map((c) => {
  const a = agg[c.key];
  const thin = a.posts < THIN_POSTS;
  // 표본이 얇으면 건드리지 않습니다(지수 1 = 그대로).
  const index = thin || !baseline ? 1 : a.per / baseline;
  const clamped = Math.min(1 + MAX_MOVE, Math.max(1 - MAX_MOVE, index));
  return {
    key: c.key,
    name: c.name,
    now: c.weight,
    posts: a.posts,
    views: a.views,
    per: Math.round(a.per),
    index,
    raw: Math.max(MIN_WEIGHT, c.weight * clamped),
    thin,
  };
});

// 합계 100 으로 정규화 → 바닥 보장 → 반올림 오차를 가장 큰 쪽에 몰아줍니다.
const sum = rows.reduce((n, r) => n + r.raw, 0);
rows.forEach((r) => (r.next = Math.max(MIN_WEIGHT, Math.round((r.raw / sum) * 100))));
const drift = 100 - rows.reduce((n, r) => n + r.next, 0);
if (drift !== 0) {
  const target = [...rows].sort((a, b) => b.next - a.next)[0];
  target.next += drift;
}

// ── 출력 ────────────────────────────────────────────────────────
console.log(`\n통계: ${path.basename(statsFile)}`);
console.log(`발행 ${totalPosts}편 · 조회 ${totalViews.toLocaleString()}회 · 편당 평균 ${Math.round(totalViews / (totalPosts || 1)).toLocaleString()}회\n`);

console.table(
  rows.map((r) => ({
    카테고리: r.name,
    편수: r.posts,
    조회: r.views.toLocaleString(),
    편당: r.per.toLocaleString(),
    지수: r.thin ? '표본부족' : r.index.toFixed(2),
    현재: `${r.now}%`,
    제안: `${r.next}%`,
    변화: r.next === r.now ? '—' : `${r.next > r.now ? '+' : ''}${r.next - r.now}`,
  })),
);

const thin = rows.filter((r) => r.thin);
if (thin.length) {
  console.log(`표본이 얇아 그대로 둔 카테고리: ${thin.map((r) => r.name).join(', ')}`);
  console.log(`  (${THIN_POSTS}편 미만입니다. 한 편의 성적으로 비중을 바꾸지 않습니다)\n`);
}

if (totalPosts < MIN_POSTS) {
  console.log(`아직 ${totalPosts}편입니다. ${MIN_POSTS}편은 쌓인 뒤에 조정하세요.`);
  console.log('지금 조정하면 우연을 실력으로 착각합니다.\n');
  process.exit(0);
}

const moved = rows.filter((r) => r.next !== r.now);
if (!moved.length) {
  console.log('조정할 것이 없습니다. 지금 비중이 성과와 맞습니다.\n');
  process.exit(0);
}

if (!has('apply')) {
  console.log('제안만 보여드렸습니다. 실제로 바꾸려면:');
  console.log('  node rebalance.mjs --apply\n');
  console.log('바꾸기 전에 지수가 높은 카테고리의 글을 직접 열어 보세요.');
  console.log('제목이 좋았던 것인지, 주제가 좋았던 것인지는 숫자가 알려주지 않습니다.\n');
  process.exit(0);
}

const raw = JSON.parse(fs.readFileSync(paths.config, 'utf8'));
for (const r of rows) {
  const c = raw.categories.find((x) => x.key === r.key);
  if (c) c.weight = r.next;
}
raw._weight_history = raw._weight_history ?? [];
raw._weight_history.push({
  at: new Date().toISOString().slice(0, 10),
  stats: path.basename(statsFile),
  posts: totalPosts,
  weights: Object.fromEntries(rows.map((r) => [r.key, r.next])),
});
fs.writeFileSync(paths.config, `${JSON.stringify(raw, null, 2)}\n`);

console.log('config.json 의 비중을 바꿨습니다.');
for (const r of moved) console.log(`  ${r.name}  ${r.now}% → ${r.next}%`);
console.log('\n다음 npm run post 부터 이 비중으로 주제를 고릅니다.');
console.log('이력은 config.json 의 _weight_history 에 남습니다.\n');
