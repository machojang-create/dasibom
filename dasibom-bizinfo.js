/* ════════ 다시봄 사업자 신원정보 — 단일 소스 ════════
   전자상거래법 필수 표기(상호·대표자·주소·사업자번호·통신판매신고·연락처·호스팅)를
   약관/개인정보/환불/구독안내/홈 푸터에 한 곳에서 주입한다.
   ★★사업자등록·PG 심사 통과 후 아래 BIZ 값만 채우면 전 페이지에 자동 반영된다. ★★
   (지금은 등록 전이라 '발급 예정' placeholder — 심사 제출 직전 실제 값으로 교체)

   사용법: 페이지에 <div data-bizinfo></div> 넣고 <script src="/dasibom-bizinfo.js?v=1"></script>.
           표기 라인 하나만 필요하면 <span data-bizinfo="line"></span>.
   ════════════════════════════════════════════════ */
(function () {
  // ── ★여기만 채우면 됨 (사업자등록증·통신판매신고증 발급 후) ──
  var BIZ = {
    상호:        '다시봄라이프',          // 등록 상호로 교체
    대표자:      '장연우',
    주소:        '[사업자등록 후 기재]',   // 사업장 소재지
    사업자등록번호: '[사업자등록 후 기재]',
    통신판매업신고번호: '[통신판매업 신고 후 기재]',
    전화:        '[대표 연락처 기재]',
    이메일:      'hello@dasibomlife.com',
    개인정보책임자: '장연우',
    호스팅:      'Google Firebase (Google LLC)',
    시행일:      '2026-08-01'             // 결제 오픈 예정일 — 실제 개시일로 교체
  };
  window.BIZ = BIZ;

  function esc(s){ return String(s==null?'':s).replace(/[&<>]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;'}[c];}); }

  // 한 줄 요약(푸터·하단 표기용) — 전자상거래법 최소 표기
  function line() {
    return '상호 ' + esc(BIZ.상호) + ' · 대표 ' + esc(BIZ.대표자) +
      ' · 사업자등록번호 ' + esc(BIZ.사업자등록번호) +
      ' · 통신판매업신고 ' + esc(BIZ.통신판매업신고번호) +
      '<br>' + esc(BIZ.주소) +
      ' · ' + esc(BIZ.전화) + ' · <a href="mailto:' + esc(BIZ.이메일) + '" style="color:inherit">' + esc(BIZ.이메일) + '</a>';
  }

  // 표 형태(약관·환불 등 문서용)
  function table() {
    var rows = [
      ['상호', BIZ.상호], ['대표자', BIZ.대표자], ['사업장 소재지', BIZ.주소],
      ['사업자등록번호', BIZ.사업자등록번호], ['통신판매업 신고번호', BIZ.통신판매업신고번호],
      ['연락처', BIZ.전화], ['전자우편', BIZ.이메일], ['개인정보 보호책임자', BIZ.개인정보책임자],
      ['호스팅 제공', BIZ.호스팅]
    ];
    var h = '<table class="biz-tbl" style="width:100%;border-collapse:collapse;font-size:14px;margin:8px 0">';
    rows.forEach(function (r) {
      h += '<tr><th style="border:1px solid #CFE5DB;background:#E9F6F0;color:#0C5C49;padding:8px 11px;text-align:left;width:38%;white-space:nowrap">' +
        esc(r[0]) + '</th><td style="border:1px solid #CFE5DB;background:#fff;padding:8px 11px">' + esc(r[1]) + '</td></tr>';
    });
    return h + '</table>';
  }

  function render() {
    var nodes = document.querySelectorAll('[data-bizinfo]');
    for (var i = 0; i < nodes.length; i++) {
      var mode = nodes[i].getAttribute('data-bizinfo');
      nodes[i].innerHTML = (mode === 'line') ? line() : table();
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render);
  else render();
})();
