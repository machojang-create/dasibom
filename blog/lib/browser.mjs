/**
 * 브라우저 실행 — 되는 것을 찾아 씁니다.
 *
 * 왜 이 파일이 있는가.
 *   `npx playwright install` 이 받아 주는 크로미움이 PC 에 따라 실행되지 않을 때가 있습니다
 *   (2026-08-05 이 PC 에서 발생: "side-by-side configuration is incorrect").
 *   headless 는 별도 바이너리라 멀쩡한데 창을 띄우는 쪽만 죽어서, 원인을 찾기 어렵습니다.
 *   그래서 실행 후보를 순서대로 시도하고, 되는 첫 번째를 씁니다.
 *
 *   config.json 의 naver.browser_channel 로 못박을 수 있습니다 ("chrome" / "msedge" / "bundled").
 */
import { chromium } from 'playwright';

/** 시도 순서 — 이미 PC 에 있는 브라우저를 먼저 씁니다. 내려받은 크로미움은 마지막입니다. */
const CANDIDATES = [
  { label: '시스템 Chrome', opts: { channel: 'chrome' } },
  { label: '시스템 Edge', opts: { channel: 'msedge' } },
  { label: '내려받은 크로미움', opts: {} },
];

let remembered = null; // 한 프로세스 안에서 두 번 탐색하지 않습니다

/**
 * 브라우저를 띄웁니다. launchOptions 는 playwright 의 launch 옵션 그대로입니다.
 * config 를 넘기면 naver.browser_channel 설정을 존중합니다.
 */
export async function launchBrowser(launchOptions = {}, config = null) {
  const pinned = config?.naver?.browser_channel;
  let list = CANDIDATES;

  if (pinned && pinned !== 'auto') {
    list =
      pinned === 'bundled'
        ? [{ label: '내려받은 크로미움(지정)', opts: {} }]
        : [{ label: `${pinned}(지정)`, opts: { channel: pinned } }];
  } else if (remembered) {
    list = [remembered, ...CANDIDATES.filter((c) => c.label !== remembered.label)];
  }

  const failures = [];
  for (const c of list) {
    try {
      const browser = await chromium.launch({ ...launchOptions, ...c.opts });
      remembered = c;
      return browser;
    } catch (err) {
      failures.push(`${c.label}: ${err.message.split('\n')[0]}`);
    }
  }

  const msg = [
    '브라우저를 띄우지 못했습니다. 시도한 것:',
    ...failures.map((f) => `  - ${f}`),
    '',
    'Chrome 이나 Edge 가 설치되어 있으면 대개 해결됩니다.',
    '내려받은 크로미움만 쓰시려면 npx playwright install chromium 을 다시 돌려 보세요.',
  ].join('\n');
  throw new Error(msg);
}

/** 어떤 브라우저로 돌았는지 알려 줍니다(로그용). */
export function lastUsedBrowser() {
  return remembered?.label ?? null;
}
