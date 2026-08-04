#!/usr/bin/env node
/**
 * 발행 미리보기 — 원고 JSON 을 네이버에 올라간 모습에 가깝게 HTML 로 뽑는다.
 *
 *   node preview_post.mjs --post out/B01_....json
 *   node preview_post.mjs --post out/B01_....json --out /tmp/preview.html
 *
 * 발행기가 넣는 순서 그대로 그립니다 — 대표 이미지, 본문, after 자리의 그림,
 * 글 끝 고정 카드, 태그. 눈으로 보고 고칠 데를 찾는 용도입니다.
 *
 * 이미지는 data URI 로 박아 넣어 파일 하나로 열립니다.
 * 아직 안 만든 일러스트는 자리와 프롬프트를 회색 상자로 보여줍니다.
 */
import fs from 'node:fs';
import path from 'node:path';
import { loadConfig, ensureOutDir } from './lib/queue.mjs';
import { esc } from './lib/brand.mjs';

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : null;
};

const config = loadConfig();
const b = config.brand;
const postPath = flag('post');
if (!postPath) {
  console.error('--post out/xxx.json 이 필요합니다.');
  process.exit(1);
}

const post = JSON.parse(fs.readFileSync(postPath, 'utf8'));
const outRoot = ensureOutDir();

const dataUri = (file) => {
  if (!fs.existsSync(file)) return null;
  const ext = path.extname(file).slice(1).toLowerCase();
  const mime = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`;
  return `data:${mime};base64,${fs.readFileSync(file).toString('base64')}`;
};

// 발행기와 같은 규칙으로 본문 줄 → 이미지를 모읍니다.
const inline = new Map();
const push = (after, item) => {
  const key = (after ?? '').trim();
  if (!key) return;
  if (!inline.has(key)) inline.set(key, []);
  inline.get(key).push(item);
};
(post.illustrations ?? []).forEach((it, i) =>
  push(it.after, {
    kind: 'illust',
    src: dataUri(path.join(outRoot, 'illust', `${post.id}_${i + 1}.jpg`)),
    prompt: it.prompt,
    n: i + 1,
  }),
);
(post.figures ?? []).forEach((it, i) =>
  push(it.after, {
    kind: 'figure',
    src: dataUri(path.join(outRoot, 'figs', `${post.id}_${i + 1}.png`)),
    prompt: `${it.type} 카드 — ${it.title}`,
    n: i + 1,
  }),
);

const imgBlock = (it) =>
  it.src
    ? `<figure class="shot ${it.kind}"><img src="${it.src}" alt=""></figure>`
    : `<figure class="todo"><div class="tag">아직 안 만든 일러스트 ${it.n}</div><p>${esc(it.prompt)}</p>
       <small>npm run illust 을 돌리면 이 자리에 그림이 들어갑니다.</small></figure>`;

const card = config.footer_card;
const body =
  card?.enabled && card.lines?.length
    ? `${post.body.trim()}\n\n\n${card.lines.join('\n')}`
    : post.body.trim();

// 소제목 판별: 앞뒤가 빈 줄이고 문장부호로 안 끝나는 짧은 줄.
const lines = body.split('\n');
const isHead = (i) => {
  const l = lines[i]?.trim();
  if (!l || l.length > 30) return false;
  return lines[i - 1] === '' && lines[i - 2] === '' && !/[.?!]$/.test(l);
};

let html = '';
lines.forEach((raw, i) => {
  const line = raw.trim();
  if (line) {
    if (line.startsWith('─')) html += `<hr class="cardline">`;
    else if (isHead(i)) html += `<h2>${esc(line)}</h2>`;
    else if (/dasibomlife\.com|이 블로그는/.test(line)) html += `<p class="foot">${esc(line)}</p>`;
    else html += `<p>${esc(line)}</p>`;
  }
  for (const it of inline.get(line) ?? []) html += imgBlock(it);
});

const cover = dataUri(postPath.replace(/\.json$/, '.png'));
const counts = {
  total: 1 + [...inline.values()].flat().length,
  ready: (cover ? 1 : 0) + [...inline.values()].flat().filter((x) => x.src).length,
};

const page = `<title>${esc(post.title)} — 발행 미리보기</title>
<style>
  :root { --bg:#ffffff; --fg:#2c2c2c; --sub:#8a8a8a; --line:#ececec; --brand:${b.primary}; --card:${b.bg}; }
  @media (prefers-color-scheme: dark) { :root { --bg:#1a1c1b; --fg:#e6e6e4; --sub:#9aa19d; --line:#2e3230; --card:#212523; } }
  :root[data-theme="dark"] { --bg:#1a1c1b; --fg:#e6e6e4; --sub:#9aa19d; --line:#2e3230; --card:#212523; }
  :root[data-theme="light"] { --bg:#ffffff; --fg:#2c2c2c; --sub:#8a8a8a; --line:#ececec; --card:${b.bg}; }
  body { margin:0; background:var(--bg); color:var(--fg);
         font-family:"Apple SD Gothic Neo","Malgun Gothic","Nanum Gothic",sans-serif; }
  .meta { max-width:720px; margin:0 auto; padding:28px 20px 0; color:var(--sub); font-size:14px; }
  .meta b { color:var(--brand); }
  .paper { max-width:720px; margin:16px auto 80px; padding:32px 20px 48px;
           border:1px solid var(--line); border-radius:14px; }
  h1 { font-size:30px; line-height:1.35; margin:0 0 28px; letter-spacing:-.02em; }
  h2 { font-size:22px; line-height:1.4; margin:44px 0 16px; letter-spacing:-.01em; }
  p { font-size:18px; line-height:1.85; margin:0 0 18px; word-break:keep-all; }
  .foot { color:var(--sub); font-size:16px; margin:2px 0; }
  hr.cardline { border:0; border-top:1px solid var(--line); margin:44px 0 14px; }
  figure { margin:26px 0; }
  figure img { width:100%; max-width:100%; display:block; border-radius:10px; }
  .todo { background:var(--card); border:1px dashed var(--brand); border-radius:10px; padding:20px 22px; }
  .todo .tag { color:var(--brand); font-weight:700; font-size:14px; margin-bottom:8px; }
  .todo p { font-size:16px; margin:0 0 8px; }
  .todo small { color:var(--sub); font-size:13px; }
  .tags { max-width:720px; margin:0 auto 60px; padding:0 20px; }
  .tags span { display:inline-block; color:var(--brand); font-size:15px; margin:0 10px 8px 0; }
</style>
<div class="meta">
  <b>${esc(post.naver_category)}</b> · ${post.body.length}자 · 이미지 ${counts.ready}/${counts.total}장 준비됨
</div>
<article class="paper">
  <h1>${esc(post.title)}</h1>
  ${cover ? `<figure class="shot"><img src="${cover}" alt=""></figure>` : ''}
  ${html}
</article>
<div class="tags">${post.tags.map((t) => `<span>#${esc(t)}</span>`).join('')}</div>
`;

const outFile = flag('out') ?? path.join(outRoot, `preview_${post.id}.html`);
fs.writeFileSync(outFile, page, 'utf8');
console.log(`[${post.id}] ${post.title}`);
console.log(`  이미지 ${counts.ready}/${counts.total}장 · ${post.body.length}자`);
console.log(`  ${outFile}`);
