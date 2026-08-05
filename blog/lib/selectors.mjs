/**
 * 네이버 스마트에디터 ONE 셀렉터 모음.
 *
 * 네이버는 예고 없이 DOM 을 바꿉니다. 발행이 깨지면 코드가 아니라 이 파일만 고치면 됩니다.
 * 각 항목은 후보 배열이고, 위에서부터 먼저 잡히는 것을 씁니다.
 *
 * 셀렉터 확인 방법:
 *   node publish_naver.mjs --post out/xxx.json --headed --pause
 *   → 브라우저가 열린 채 멈춥니다. Playwright Inspector 에서 Explore 로 찍어보세요.
 */
export const SEL = {
  // 글쓰기 화면이 들어있는 iframe
  editorFrame: ['iframe#mainFrame', 'iframe[name="mainFrame"]'],

  // "작성 중인 글이 있습니다" 팝업 — 취소를 눌러 새 글로 시작.
  // ⚠️ 이 팝업은 화면이 뜬 뒤 한 박자 늦게 나옵니다. 놓치면 그 뒤 모든 클릭을 가로막습니다
  //    (se-popup-dim 이 pointer event 를 먹습니다). 글자 기반 후보를 뒤에 둡니다.
  restorePopupCancel: [
    '.se-popup-button-cancel',
    'button.se-popup-button-cancel',
    '.se-popup-alert-confirm .se-popup-button-cancel',
    '.se-popup-alert-confirm button:has-text("취소")',
    '.se-popup button:has-text("취소")',
  ],

  // 도움말 레이어 닫기
  helpClose: [
    '.se-help-panel-close-button',
    'button.se-help-panel-close-button',
    '.se-help-panel button[class*="close"]',
  ],

  title: ['.se-documentTitle .se-text-paragraph', 'span.se-placeholder.__se_placeholder'],
  body: ['.se-component.se-text .se-text-paragraph', '.se-section-text .se-text-paragraph'],

  // 사진 첨부
  imageButton: ['button.se-image-toolbar-button', 'button[data-name="image"]'],
  fileInput: ['input[type="file"]'],

  // 발행 패널
  publishOpen: ['button.publish_btn__m9KHH', 'button:has-text("발행")'],
  categorySelect: ['button.selectbox_button__jb1Dt', 'button[class*="selectbox_button"]'],
  categoryOption: (name) => `//li//span[normalize-space(text())="${name}"]`,

  tagInput: ['input#tag-input', 'input[class*="tag_input"]'],

  // 예약 발행
  reserveRadio: ['label:has-text("예약")', 'input[value="reserve"]'],
  reserveDate: ['input.input_date__QmA0s', 'input[class*="input_date"]'],
  reserveHour: ['select.hour_option__J_heO', 'select[class*="hour_option"]'],
  reserveMinute: ['select.minute_option__Vb3xB', 'select[class*="minute_option"]'],

  publishConfirm: [
    'button.confirm_btn__WEaBq',
    'button[data-testid="seOnePublishBtn"]',
    'button:has-text("발행")',
  ],
};

/** 후보 셀렉터를 순서대로 시도해서 처음 보이는 것을 반환. 없으면 null. */
export async function firstVisible(scope, candidates, timeout = 4000) {
  const list = Array.isArray(candidates) ? candidates : [candidates];
  const per = Math.max(600, Math.floor(timeout / list.length));
  for (const sel of list) {
    const loc = sel.startsWith('//') ? scope.locator(`xpath=${sel}`) : scope.locator(sel);
    try {
      await loc.first().waitFor({ state: 'visible', timeout: per });
      return loc.first();
    } catch {
      /* 다음 후보 */
    }
  }
  return null;
}

/** 있으면 누르고, 없으면 조용히 넘어간다 (팝업처럼 뜰 수도 안 뜰 수도 있는 것들). */
export async function clickIfPresent(scope, candidates, timeout = 2500) {
  const loc = await firstVisible(scope, candidates, timeout);
  if (!loc) return false;
  await loc.click();
  return true;
}
