import path from 'node:path';
import { loadConfig, paths, ensureOutDir } from './lib/queue.mjs';
import { launchBrowser } from './lib/browser.mjs';
const config = loadConfig();
const out = ensureOutDir();
const browser = await launchBrowser({ headless: true }, config);
const ctx = await browser.newContext({ storageState: path.join(paths.root, config.naver.session_file), locale: 'ko-KR', viewport: { width: 1600, height: 1100 } });
const page = await ctx.newPage();
page.on('dialog', async d => { console.log('알림:', d.message().slice(0,50)); await d.accept().catch(()=>{}); });
await page.goto(`https://admin.blog.naver.com/Remocon.naver?blogId=${config.blog.id}&loadType=admin&Redirect=Remocon`, { waitUntil:'networkidle' });
await page.waitForTimeout(4000);
const f = page.mainFrame();
await f.locator('#list_menu1').click();
await page.waitForTimeout(1200);

// 1) 높이 540 → 300
const h = f.locator('#title_height');
await h.fill('300');
await h.press('Enter');
await page.waitForTimeout(800);
console.log('높이 입력 후:', await h.inputValue());

// 2) 블로그 제목 '표시' 체크 해제
const before = await f.evaluate(() => {
  const lb = [...document.querySelectorAll('label.check_label')].find(l=>/표시/.test(l.innerText));
  const cb = lb?.querySelector('input[type=checkbox]') ?? document.getElementById(lb?.getAttribute('for'));
  return cb ? { id: cb.id, checked: cb.checked } : null;
});
console.log('제목 표시 체크박스:', JSON.stringify(before));
if (before?.checked) {
  await f.evaluate((id) => { const cb = document.getElementById(id) || document.querySelector('label.check_label input'); cb.click(); }, before.id);
  await page.waitForTimeout(600);
  const after = await f.evaluate((id) => (document.getElementById(id) || document.querySelector('label.check_label input')).checked, before.id);
  console.log('해제 후 checked:', after);
}

// 3) 적용
await f.locator('.btn_submit._showConfirmLayer').first().click();
await page.waitForTimeout(1500);
for (const sel of ['.btn_confirm','.btn_submit','button:has-text("확인")']) {
  const b = f.locator(sel).first();
  if (await b.isVisible().catch(()=>false)) { await b.click().catch(()=>{}); break; }
}
await page.waitForTimeout(4000);
// 실제 블로그 확인
const p2 = await ctx.newPage();
await p2.goto(`https://blog.naver.com/${config.blog.id}`, { waitUntil:'networkidle' });
await p2.waitForTimeout(3000);
const fr = p2.frames().find(x=>x.name()==='mainFrame') ?? p2.mainFrame();
const st = await fr.evaluate(() => { const e=document.querySelector('#blog-title'); if(!e) return null; const cs=getComputedStyle(e); return { h:e.offsetHeight, rep:cs.backgroundRepeat, text:(e.innerText||'').trim().slice(0,20) }; });
console.log('블로그 타이틀 상태:', JSON.stringify(st));
await p2.screenshot({ path: path.join(out,'live_title.png'), clip:{x:0,y:0,width:1440,height:520} });
await browser.close();
