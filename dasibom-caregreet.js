/* ════════ 봄이 케어 첫 인사 문구 (carekiosk ↔ carechat 공용) ════════
   왜 공용인가: carechat이 '표시'하는 첫 인사와 carekiosk가 '미리 합성'해두는 문구가
   반드시 같아야 한다. 한 글자라도 다르면 서버 텍스트 캐시가 빗나가서
   첫 인사 음성이 4초쯤 늦게 나온다(측정치: 첫 합성 4.3초).
   → 그래서 양쪽 모두 이 파일에서만 문구를 만든다. 문구 수정도 반드시 여기서.

   흐름: 키오스크 '대화 시작' 모달이 떠 있는 동안(=빈 시간) bomCareGreet()로 문구를 만들어
        미리 합성 → 서버 캐시에 올라감 → 대화방이 열리면 즉시 봄이 목소리.
   ※ 음성 타이밍 규칙 전반은 스킬 bom-voice-timing 참고.
   ═══════════════════════════════════════════════════════════════ */
(function () {
  // ★봄이 음성 서버(bomVoiceTTS)로 보낼 때의 문구 정규화(이모지 제거 등).
  //   서버 캐시 키가 '문구 그 자체'라서, 미리 합성하는 쪽(carekiosk)과 재생하는 쪽(carechat)이
  //   완전히 같은 문자열을 보내야 캐시가 적중한다. 한쪽만 🌸를 지워도 프리워밍이 통째로 헛돎.
  //   → 그래서 정규화도 문구와 함께 여기서만 정의한다.
  window.bomVoiceClean = function (text) {
    // 이모지 목록 나열 금지 — 문자 클래스는 이모지를 반쪽 단위로 매칭해서 목록에 없는
    // 이모지의 앞 반쪽만 지우고 고아 반쪽을 남김 → ElevenLabs invalid_unicode(HTTP 400) 전체 거부.
    // (2026-07-16 토론장 무음 사건. bom_voice.js clean()과 같은 수술 — 항상 함께 고칠 것)
    return String(text || '')
      .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, ' ') // 모든 이모지(쌍 그대로)
      .replace(/[\uD800-\uDFFF]/g, ' ')                // 짝 잃은 반쪽(400의 원인)
      .replace(/[☀-➿️‍✦→·]/g, ' ')
      .replace(/\s+/g, ' ').trim();
  };

  function today() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  // "홍길동 할머니" — 양쪽이 같은 호칭을 쓰도록 여기서 생성
  window.bomCareHonor = function (name, gender) {
    return name + ' ' + (gender === '남' ? '할아버지' : '할머니');
  };

  // S = seniors 문서, honor = bomCareHonor(...)
  // 반환: 첫 인사 문구. 단, 선물 연출로 진입하는 경우엔 인사가 없으므로 null.
  // ★분기 조건은 carechat memoirEntry()와 1:1로 맞춰져 있음 — 한쪽만 고치지 말 것.
  window.bomCareGreet = function (S, honor) {
    S = S || {};
    var answered = Object.keys(S.memoirAnswers || {}).length;
    var sp = S.memoirSurprise, bookDone = !!(S.memoirBook && S.memoirBook.done);

    // ① 선물 도착(익일 10시 지남 + 책 완성 + 미전달) → 인사 대신 선물 연출
    if (sp && !sp.delivered && bookDone && Date.now() >= sp.readyAt) return null;

    // ② 15개 완료
    if (answered >= 15) return '안녕하세요 ' + honor + '! 오늘도 만나서 반가워요 🌱 오늘은 어떤 이야기든 편하게 나눠요.';

    // ③ 오늘 몫(3개) 이미 완료
    var qd = S.memoirQDates || {}, t = today();
    var todayCount = Object.keys(qd).filter(function (k) { return qd[k] === t; }).length;
    if (todayCount >= 3) return '안녕하세요 ' + honor + '! 오늘 들려주실 이야기는 벌써 다 들었어요 🌸 다시봄에 재미난 구경거리가 많은데, 저랑 같이 구경 가실래요?';

    // ④ 오늘의 자서전 질문 시작
    return answered === 0
      ? '안녕하세요 ' + honor + '! 오늘부터 ' + honor + '의 인생 이야기를 조금씩 들려주세요. 편하게 말씀해 주시면 봄이가 잘 기억해둘게요 🌱'
      : '안녕하세요 ' + honor + '! 지난 이야기 정말 잘 들었어요. 오늘도 이어서 들려주세요 🌸';
  };

  // 서버 조회 실패 시 인사(그래도 대화는 이어짐)
  window.bomCareGreetFallback = function (honor) {
    return '안녕하세요 ' + honor + '! 오늘 만나서 정말 반가워요 🌱 오늘 하루는 어떠셨어요?';
  };
})();
