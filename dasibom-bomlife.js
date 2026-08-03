/* ══════════════════════════════════════════════════════════════════════
   다시봄 · 봄이 생활비서 엔진 (dasibom-bomlife.js)  — 2026-07-30 착수(Macho)
   ────────────────────────────────────────────────────────────────────
   핵심 철학: "봄이는 AI가 아니라 개인 생활 데이터 관리자. AI는 모를 때만."
   · 시니어의 일상 질문 80~90%는 규칙 라우터가 DB/공공API로 처리(AI 호출 0원).
   · 열린 질문(모르는 것)만 Gemini(aiText)로 폴백.
   · 데이터는 대화 중 "기억해둘까요?" 승인 후 구조화 저장(폼 벽 없음).

   이 파일은 '순수 엔진'(브라우저·Node 공용):
     - parseDate(text, now)     : 한국어 날짜/기간 파서
     - classifyIntent(text)     : 규칙 기반 의도 분류(+ 소스 db/api/ai)
     - extractSlots(text, ...)  : 시간·대상·관계 슬롯 추출
     - answer(text, store, now) : 라우팅→조회→응답 텍스트 조립
     - extractFact(text, now)   : 사용자 진술에서 저장할 데이터 추출(대화형 수집)
   Firestore 연동·UI·AI폴백 실호출은 브라우저 래퍼(하단)에서.
   TTS는 제외(2026-07-30 Macho): 응답은 텍스트/화면.
   ══════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';

  // ── 유틸 ──────────────────────────────────────────────────────────────
  var KST_OFFSET = 9 * 3600 * 1000;
  function kstNow(now) { return new Date((now || Date.now()) + KST_OFFSET); }
  function ymd(d) { return d.toISOString().slice(0, 10); }           // 'YYYY-MM-DD' (KST 기준 d)
  function addDays(d, n) { var x = new Date(d.getTime()); x.setUTCDate(x.getUTCDate() + n); return x; }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  var WEEK = ['일', '월', '화', '수', '목', '금', '토'];
  // 한글 숫자(하나~열둘) + 아라비아 혼용 파서용
  var KNUM = { '한': 1, '두': 2, '세': 3, '네': 4, '다섯': 5, '여섯': 6, '일곱': 7, '여덟': 8, '아홉': 9, '열': 10, '열한': 11, '열두': 12,
               '일': 1, '이': 2, '삼': 3, '사': 4, '오': 5, '육': 6, '칠': 7, '팔': 8, '구': 9, '십': 10, '십일': 11, '십이': 12 };

  // ── 날짜 파서 ─────────────────────────────────────────────────────────
  //   반환: null | {kind:'day', date:'YYYY-MM-DD', label} | {kind:'range', from, to, label}
  function parseDate(text, now) {
    var t = (text || '').replace(/\s/g, '');
    var base = kstNow(now);                                  // KST '지금'을 UTC자정 기준 날짜로 다룸
    var today = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate()));

    // 상대 하루
    if (/그저께|그제/.test(t)) return day(addDays(today, -2), '그저께');
    if (/어제/.test(t)) return day(addDays(today, -1), '어제');
    if (/오늘|금일/.test(t)) return day(today, '오늘');
    if (/모레|내일모레/.test(t)) return day(addDays(today, /내일모레/.test(t) ? 2 : 2), '모레');
    if (/내일|낼/.test(t)) return day(addDays(today, 1), '내일');

    // 요일(이번/다음 주 요일)  예:"다음주월요일","월요일에","이번주금요일"
    //   ★"다음주/이번주" 단독 주간범위보다 먼저 판정 — "다음주월요일"이 range로 새지 않게(2026-07-30 테스트).
    var wd = t.match(/(다음주|담주|이번주|금주)?(일|월|화|수|목|금|토)요일/);
    if (wd) {
      var cur = today.getUTCDay();
      var offset = (WEEK.indexOf(wd[2]) + 6) % 7;            // 월=0 … 일=6 (주 시작=월)
      var monDiff = (cur + 6) % 7;                           // 이번 주 월요일까지 뒤로
      if (wd[1] && /이번주|금주/.test(wd[1]))
        return day(addDays(today, -monDiff + offset), '이번 주 ' + wd[2] + '요일');
      if (wd[1] && /다음주|담주/.test(wd[1]))
        return day(addDays(today, -monDiff + 7 + offset), '다음 주 ' + wd[2] + '요일');
      var diff = (WEEK.indexOf(wd[2]) - cur + 7) % 7; if (diff === 0) diff = 7;   // 그냥 "월요일"=돌아오는 그 요일
      return day(addDays(today, diff), wd[2] + '요일');
    }

    // 이번/다음/지난 주·달
    if (/이번주|금주/.test(t)) return weekRange(today, 0, '이번 주');
    if (/다음주|담주|차주/.test(t)) return weekRange(today, 1, '다음 주');
    if (/지난주|저번주/.test(t)) return weekRange(today, -1, '지난 주');
    if (/이번달|이달|금월/.test(t)) return monthRange(today, 0, '이번 달');
    if (/다음달|담달|내달/.test(t)) return monthRange(today, 1, '다음 달');
    if (/지난달|저번달/.test(t)) return monthRange(today, -1, '지난 달');

    // N월 N일  예:"5월20일","3월 15일"
    var md = t.match(/(\d{1,2})월(\d{1,2})일/);
    if (md) {
      var mo = +md[1], da = +md[2];
      var y = today.getUTCFullYear();
      var cand = new Date(Date.UTC(y, mo - 1, da));
      return day(cand, mo + '월 ' + da + '일');
    }
    // N일  예:"15일에"(이번 달 그 날)
    var dm = t.match(/(^|[^\d])(\d{1,2})일(?!정|주|간|째|동안)/);
    if (dm) {
      var dd = +dm[2];
      if (dd >= 1 && dd <= 31) {
        var cand2 = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), dd));
        return day(cand2, today.getUTCMonth() + 1 + '월 ' + dd + '일');
      }
    }
    return null;

    function day(d, label) { return { kind: 'day', date: ymd(d), dow: WEEK[d.getUTCDay()], label: label }; }
    function weekRange(t0, wOffset, label) {
      var monDiff = (t0.getUTCDay() + 6) % 7;                // 월요일 시작
      var mon = addDays(t0, -monDiff + wOffset * 7);
      return { kind: 'range', from: ymd(mon), to: ymd(addDays(mon, 6)), label: label };
    }
    function monthRange(t0, mOffset, label) {
      var first = new Date(Date.UTC(t0.getUTCFullYear(), t0.getUTCMonth() + mOffset, 1));
      var last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0));
      return { kind: 'range', from: ymd(first), to: ymd(last), label: label };
    }
  }

  // ── 시간 파서 ─────────────────────────────────────────────────────────
  //   "오전 10시", "오후 3시 반", "저녁 7시", "14시" → 'HH:MM' | null
  function parseTime(text) {
    var t = (text || '').replace(/\s/g, '');
    var m = t.match(/(오전|오후|아침|점심|저녁|밤|낮)?(\d{1,2}|한|두|세|네|다섯|여섯|일곱|여덟|아홉|열한|열두|열)시(반)?/);
    if (!m) return null;
    var h = /^\d+$/.test(m[2]) ? +m[2] : (KNUM[m[2]] || 0);
    var mer = m[1];
    if (mer && /오후|저녁|밤/.test(mer) && h < 12) h += 12;
    if (mer && /점심/.test(mer) && h <= 1) h = 12 + h;       // 점심1시
    if (mer && /낮/.test(mer) && h < 12) h += 12;
    if (!mer && h >= 1 && h <= 6) { /* 애매 — 그대로(오전 가정) */ }
    if (h === 24) h = 0;
    var min = m[3] ? 30 : 0;
    if (h < 0 || h > 23) return null;
    return pad2(h) + ':' + pad2(min);
  }

  // ── 사전(대상·관계) ───────────────────────────────────────────────────
  var FAMILY_REL = ['아들', '딸', '손주', '손자', '손녀', '배우자', '남편', '아내', '와이프', '부모', '아버지', '어머니', '아빠', '엄마', '형', '누나', '동생', '언니', '오빠', '며느리', '사위'];
  var BILL_KIND = [
    { key: '전기요금', re: /전기(세|요금|료)?/ },
    { key: '가스요금', re: /(도시)?가스(비|요금|료)?/ },
    { key: '수도요금', re: /수도(세|요금|료)?/ },
    { key: '통신비', re: /(통신|휴대폰|핸드폰|인터넷|전화)(비|요금)?/ },
    { key: '보험료', re: /보험(료|비)?/ },
    { key: '관리비', re: /관리비/ },
    { key: '카드값', re: /카드(값|대금|결제)/ }
  ];
  var APPT_KIND = [
    { key: '병원', re: /병원|진료|검진|시술|치과|한의원/ },
    { key: '모임', re: /모임|복지관|경로당|동창|계모임/ },
    { key: '약속', re: /약속|만나|식사|밥|점심약속/ },
    { key: '여행', re: /여행|나들이|관광/ },
    { key: '종교', re: /교회|성당|절|예배|미사|법회/ },
    { key: '문화', re: /공연|영화|전시|콘서트|행사/ }
  ];

  function findRelation(t) { for (var i = 0; i < FAMILY_REL.length; i++) if (t.indexOf(FAMILY_REL[i]) >= 0) return FAMILY_REL[i]; return null; }
  function findBill(t) { for (var i = 0; i < BILL_KIND.length; i++) if (BILL_KIND[i].re.test(t)) return BILL_KIND[i].key; return null; }
  function findAppt(t) { for (var i = 0; i < APPT_KIND.length; i++) if (APPT_KIND[i].re.test(t)) return APPT_KIND[i].key; return null; }

  // ── 의도 분류 ─────────────────────────────────────────────────────────
  //   반환: {intent, source:'db'|'api'|'ai', domain}
  function classifyIntent(text) {
    var t = (text || '').replace(/\s/g, '');
    var isQ = /\?|뭐|무슨|언제|며칠|어때|알려|있어|있나|해야|없어|될까|올까|와|되나/.test(t) || /$/.test(t);
    var isAdd = /저장|기억|등록|넣어|추가|알려줘야|메모|적어|기록/.test(t);

    // 날씨/미세먼지 → 공공 API
    if (/날씨|비와|비올|비오|기온|더워|추워|눈와|우산/.test(t)) return R('weather.query', 'api', 'weather');
    if (/미세먼지|초미세|공기|먼지/.test(t)) return R('air.query', 'api', 'air');

    // 복약
    if (/약/.test(t) && /(먹|복용|드셔|드시)/.test(t)) {
      return /(뭐|언제|있|알려|몇)/.test(t) ? R('med.query', 'db', 'med') : R('med.add', 'db', 'med');
    }

    // 공과금(특정 항목 or '공과금/공공요금' 총칭)
    if (findBill(t) || /공과금|공공요금/.test(t)) {
      return (findBill(t) && parseDate(t) && /(내|납부|냈|결제일)/.test(t) && !/(언제|뭐|며칠|얼마)/.test(t))
        ? R('bill.add', 'db', 'bill') : R('bill.query', 'db', 'bill');
    }

    // 가족 생일/기념일
    if (/생일|기념일|기일/.test(t)) {
      var hasWhen = parseDate(t) || /(\d{1,2})월(\d{1,2})일/.test(t);
      return (hasWhen && findRelation(t)) ? R('family.add', 'db', 'family') : R('family.query', 'db', 'family');
    }

    // 일정(병원·모임·약속·여행 등) 또는 "뭐 해/일정"
    var appt = findAppt(t);
    var scheduleWord = /일정|스케줄|계획|뭐해|뭐하|할일|바쁜|약속있/.test(t);
    if (appt || scheduleWord) {
      var d = parseDate(t);
      // 날짜+대상이 명확하고 '언제/뭐' 같은 질문어가 없으면 등록
      if (appt && d && !/(언제|뭐|무슨|며칠|있어|있나|알려)/.test(t)) return R('schedule.add', 'db', 'schedule');
      return R('schedule.query', 'db', 'schedule');
    }

    // "이번 주에 뭐 중요한 거 있어" 류 통합 브리핑
    if (/(중요|급한|챙길|할거|해야할)/.test(t) && parseDate(t)) return R('briefing', 'db', 'briefing');

    return R('unknown', 'ai', 'chat');

    function R(intent, source, domain) { return { intent: intent, source: source, domain: domain }; }
  }

  // ── 슬롯 추출 ─────────────────────────────────────────────────────────
  function extractSlots(text, intent, now) {
    return {
      date: parseDate(text, now),
      time: parseTime(text),
      relation: findRelation((text || '').replace(/\s/g, '')),
      bill: findBill((text || '').replace(/\s/g, '')),
      appt: findAppt((text || '').replace(/\s/g, ''))
    };
  }

  // ── 저장할 사실 추출(대화형 수집) ─────────────────────────────────────
  //   반환: null | {type, data, confirm}  ("이렇게 기억해둘까요?")
  function extractFact(text, now) {
    var t = (text || '').replace(/\s+/g, ' ').trim();
    var flat = t.replace(/\s/g, '');
    var d = parseDate(t, now), tm = parseTime(t);

    // 일정: 날짜 + 대상
    var appt = findAppt(flat);
    if (appt && d && d.kind === 'day') {
      return { type: 'appointment', data: { title: appt, date: d.date, time: tm || null },
        confirm: '아하, ' + d.label + (tm ? ' ' + fmtTime(tm) : '') + ' ' + appt + ' 가시는군요! 제가 잊지 않게 기억해 둘까요? 🌸' };
    }
    // 공과금: 종류 + 날(일)
    var bill = findBill(flat);
    if (bill && d && d.kind === 'day') {
      var dayNum = +d.date.slice(8, 10);
      return { type: 'bill', data: { name: bill, day: dayNum },
        confirm: bill + ' 납부일이 매달 ' + dayNum + '일이군요! 놓치지 않게 제가 미리 알려드릴까요? 🌷' };
    }
    // 가족 생일: 관계 + 월일
    var rel = findRelation(flat);
    if (rel && /생일/.test(flat)) {
      var md = flat.match(/(\d{1,2})월(\d{1,2})일/);
      if (md) return { type: 'family', data: { relation: rel, kind: '생일', month: +md[1], day: +md[2] },
        confirm: '어머, ' + rel + ' 생신이 ' + md[1] + '월 ' + md[2] + '일이군요! 🎂 해마다 잊지 않고 제가 알려드릴까요?' };
    }
    // 복약: 약 + 시간
    if (/약/.test(flat) && tm) {
      return { type: 'medication', data: { name: '약', time: tm },
        confirm: '매일 ' + fmtTime(tm) + '에 약 드실 시간, 제가 꼬박꼬박 알려드릴까요? 건강이 제일이니까요 💊' };
    }
    return null;
  }

  function fmtTime(hhmm) {
    var h = +hhmm.slice(0, 2), m = +hhmm.slice(3, 5);
    var mer = h < 12 ? '오전' : '오후'; var h12 = h % 12; if (h12 === 0) h12 = 12;
    return mer + ' ' + h12 + '시' + (m ? ' ' + m + '분' : '');
  }

  // ── 응답 조립(순수) ───────────────────────────────────────────────────
  //   store: {events:[{type,title,date,time,done}], family:[{relation,kind,month,day}],
  //           bills:[{name,day}], meds:[{name,time}]}
  //   반환: {source, intent, text, needData?}  (api/ai는 needData로 상위에 위임)
  function answer(text, store, now) {
    store = store || {};
    var cls = classifyIntent(text);
    var s = extractSlots(text, cls.intent, now);
    var base = kstNow(now);
    var todayStr = ymd(new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate())));

    if (cls.source === 'api' || cls.source === 'ai') return { source: cls.source, intent: cls.intent, needData: true, slots: s };

    switch (cls.intent) {
      case 'schedule.query': {
        var range = s.date || parseDate('오늘', now);
        var evs = eventsIn(store.events, range).filter(function (e) { return !e.done; });
        if (!evs.length) return say('schedule.query', (range.label || '그날') + '은 아직 한가하시네요 🌷 편히 쉬셔도 좋고, 약속이 생기면 저한테 살짝 귀띔해 주세요. 제가 꼭 기억해 둘게요!');
        var lines = evs.map(function (e) { return '· ' + (e.date ? niceDate(e.date, now) + ' ' : '') + (e.time ? fmtTime(e.time) + ' ' : '') + e.title; });
        return say('schedule.query', '네~ ' + (range.label || '그날') + '은 이런 일이 있어요 😊\n' + lines.join('\n') + '\n제가 옆에서 꼭 챙겨드릴게요!');
      }
      case 'family.query': {
        var rel = s.relation;
        var fam = (store.family || []).filter(function (f) { return !rel || f.relation === rel; });
        if (!fam.length) return say('family.query', (rel ? rel + ' ' : '') + '생신은 아직 제가 못 들었어요 🌸 알려주시면 해마다 잊지 않고 축하 챙겨드릴게요!');
        var fl = fam.map(function (f) { return '· ' + f.relation + ' ' + (f.kind || '생일') + ' ' + f.month + '월 ' + f.day + '일'; });
        return say('family.query', '그럼요, 제가 기억하고 있죠! 🎂\n' + fl.join('\n') + '\n그날엔 제가 먼저 알려드릴게요!');
      }
      case 'bill.query': {
        var r2 = s.date || parseDate('이번 달', now);
        var bills = (store.bills || []).slice().sort(function (a, b) { return a.day - b.day; });
        if (!bills.length) return say('bill.query', '아직 등록된 공과금이 없네요. "전기요금 15일에 내" 처럼 알려주시면, 매달 놓치지 않게 제가 콕콕 챙겨드릴게요 🌷');
        var bl = bills.map(function (b) { return '· 매달 ' + b.day + '일 ' + b.name; });
        return say('bill.query', '네, ' + (r2.label || '이번 달') + ' 공과금 여기 있어요 😊\n' + bl.join('\n') + '\n납부일 놓치지 않게 미리 알려드릴게요!');
      }
      case 'med.query': {
        var meds = (store.meds || []);
        if (!meds.length) return say('med.query', '아직 약 정보를 못 들었어요. "매일 아침 8시에 약 먹어"처럼 알려주시면, 매일 잊지 않게 챙겨드릴게요 💊 건강이 제일 중요하니까요!');
        var ml = meds.map(function (m) { return '· ' + fmtTime(m.time) + ' ' + (m.name || '약'); });
        return say('med.query', '잊지 마세요, 약 드실 시간이에요 💊\n' + ml.join('\n') + '\n꼬박꼬박 챙겨 드시는 모습, 제가 응원할게요!');
      }
      case 'briefing': {
        var rng = s.date || parseDate('이번 주', now);
        var items = [];
        eventsIn(store.events, rng).filter(function (e) { return !e.done; }).forEach(function (e) { items.push({ d: e.date, txt: (e.time ? fmtTime(e.time) + ' ' : '') + e.title }); });
        (store.bills || []).forEach(function (b) { var ds = billDateInRange(b.day, rng); if (ds) items.push({ d: ds, txt: b.name + ' 납부일' }); });
        (store.family || []).forEach(function (f) { var ds2 = famDateInRange(f, rng, now); if (ds2) items.push({ d: ds2, txt: f.relation + ' ' + (f.kind || '생일') }); });
        items.sort(function (a, b) { return a.d < b.d ? -1 : 1; });
        if (!items.length) return say('briefing', (rng.label || '') + '엔 특별히 바쁜 일이 없네요 🌸 마음 편히 쉬시는 것도 큰 복이에요. 좋은 하루 보내세요!');
        var top = items.slice(0, 5).map(function (i) { return '· ' + niceDate(i.d, now) + ' ' + i.txt; });
        return say('briefing', '제가 쭉 살펴봤어요! ' + (rng.label || '') + '엔 이런 일들이 있어요 🌷\n' + top.join('\n') + '\n하나도 놓치지 않게 제가 챙길게요!');
      }
      // add 계열은 상위(브라우저)에서 extractFact→확인→저장. 여기선 신호만.
      case 'schedule.add': case 'bill.add': case 'family.add': case 'med.add':
        return { source: 'db', intent: cls.intent, capture: extractFact(text, now), slots: s };
    }
    return { source: 'ai', intent: 'unknown', needData: true, slots: s };

    function say(intent, txt) { return { source: 'db', intent: intent, text: txt }; }
  }

  // 이벤트/공과금/생일이 기간에 드는지
  function eventsIn(events, range) {
    events = events || [];
    if (!range) return [];
    if (range.kind === 'day') return events.filter(function (e) { return e.date === range.date; });
    return events.filter(function (e) { return e.date >= range.from && e.date <= range.to; });
  }
  function billDateInRange(day, range) {
    if (range.kind === 'day') return (+range.date.slice(8, 10) === day) ? range.date : null;
    var from = range.from, to = range.to;
    var y = +from.slice(0, 4), m = +from.slice(5, 7);
    var cand = y + '-' + pad2(m) + '-' + pad2(day);
    if (cand >= from && cand <= to) return cand;
    var m2 = m === 12 ? 1 : m + 1, y2 = m === 12 ? y + 1 : y;
    var cand2 = y2 + '-' + pad2(m2) + '-' + pad2(day);
    return (cand2 >= from && cand2 <= to) ? cand2 : null;
  }
  function famDateInRange(f, range, now) {
    var base = kstNow(now); var y = base.getUTCFullYear();
    var cand = y + '-' + pad2(f.month) + '-' + pad2(f.day);
    if (range.kind === 'day') return cand === range.date ? cand : null;
    if (cand >= range.from && cand <= range.to) return cand;
    var cand2 = (y + 1) + '-' + pad2(f.month) + '-' + pad2(f.day);
    return (cand2 >= range.from && cand2 <= range.to) ? cand2 : null;
  }
  function niceDate(d, now) {
    var p = parseDate('오늘', now);
    if (d === p.date) return '오늘';
    var base = kstNow(now); var t0 = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate()));
    if (d === ymd(addDays(t0, 1))) return '내일';
    var dd = new Date(d + 'T00:00:00Z');
    return (dd.getUTCMonth() + 1) + '월 ' + dd.getUTCDate() + '일(' + WEEK[dd.getUTCDay()] + ')';
  }

  // ── 브라우저 데이터층 (Firestore via DasibomPoints.saveBlob/loadBlob — 서버 0대 유지) ──
  //   users/{uid}/apps/bomlife 문서 1개에 {events,family,bills,meds} JSON. 세션당 1읽기, 변경 시 1쓰기.
  var _store = null, _loaded = false, _loadCbs = [];
  function DP() { return (typeof window !== 'undefined') ? window.DasibomPoints : null; }
  function emptyStore() { return { events: [], family: [], bills: [], meds: [] }; }
  function normalize(d) { d = d || {}; return { events: d.events || [], family: d.family || [], bills: d.bills || [], meds: d.meds || [] }; }
  function load(cb) {
    if (_loaded) { cb && cb(_store); return; }
    _loadCbs.push(cb);
    if (_loadCbs.length > 1) return;                     // 이미 로딩 중 — 콜백만 대기열에
    var p = DP();
    if (!p || !p.loadBlob) { _store = emptyStore(); finish(); return; }
    var done = false, guard = setTimeout(function () { if (!done) { done = true; _store = _store || emptyStore(); finish(); } }, 8000);
    p.loadBlob('bomlife', function (err, res) {
      if (done) return; done = true; clearTimeout(guard);
      _store = (res && res.data) ? normalize(res.data) : emptyStore();
      finish();
    });
    function finish() { _loaded = true; var q = _loadCbs.slice(); _loadCbs = []; q.forEach(function (c) { c && c(_store); }); }
  }
  function save(cb) { var p = DP(); if (!p || !p.saveBlob) { cb && cb(new Error('no-store')); return; } p.saveBlob('bomlife', _store, cb); }

  // 대화형 수집: extractFact 결과를 저장(중복은 대체)
  function saveFact(fact, cb) {
    if (!fact || !fact.data) { cb && cb(new Error('no-fact')); return; }
    load(function (store) {
      var d = fact.data;
      if (fact.type === 'appointment') {
        var dup = store.events.some(function (e) { return !e.done && e.title === d.title && e.date === d.date && (e.time || null) === (d.time || null); });
        if (!dup) store.events.push({ type: 'appointment', title: d.title, date: d.date, time: d.time || null, done: false, createdAt: Date.now() });
      }
      else if (fact.type === 'bill') { store.bills = store.bills.filter(function (b) { return b.name !== d.name; }); store.bills.push({ name: d.name, day: d.day }); }
      else if (fact.type === 'family') { store.family = store.family.filter(function (f) { return !(f.relation === d.relation && (f.kind || '생일') === (d.kind || '생일')); }); store.family.push({ relation: d.relation, kind: d.kind || '생일', month: d.month, day: d.day }); }
      else if (fact.type === 'medication') store.meds.push({ name: d.name || '약', time: d.time });
      save(function (err) { cb && cb(err || null, store); });
    });
  }
  // 완료 처리: "병원 다녀왔어" → 가장 가까운 미완 일정 done
  function completeRecent(title, cb) {
    load(function (store) {
      var cand = store.events.filter(function (e) { return !e.done && (!title || e.title.indexOf(title) >= 0 || title.indexOf(e.title) >= 0); }).sort(function (a, b) { return a.date < b.date ? 1 : -1; })[0];
      if (cand) { cand.done = true; save(function (err) { cb && cb(err || null, cand); }); } else cb && cb(null, null);
    });
  }

  // 최종 오케스트레이션. opts.ai(query,cb)·opts.weather(slots,cb) 주입 가능(Phase3 UI에서).
  //   cb({kind:'answer'|'confirm'|'ai', text, capture?, intent?})
  function ask(query, cb, opts) {
    opts = opts || {};
    // 완료 진술 먼저("다녀왔어/냈어/했어")
    if (/다녀왔|다녀 왔|갔다왔|끝났|마쳤|했어요|봤어요/.test((query || '')) && classifyIntent(query).source === 'db') {
      var appt = findAppt((query || '').replace(/\s/g, ''));
      if (appt) { completeRecent(appt, function (e, done) { cb({ kind: 'answer', text: done ? (done.title + ' 잘 다녀오셨군요 🌸 기록해 뒀어요.') : '잘하셨어요 🌸', intent: 'complete' }); }); return; }
    }
    load(function (store) {
      var res = answer(query, store, Date.now());
      if (res.source === 'db') {
        if (res.capture) { cb({ kind: 'confirm', capture: res.capture, text: res.capture.confirm }); return; }
        if (!res.text && res.intent && /\.add$/.test(res.intent)) { cb({ kind: 'answer', text: '무엇을 기억해둘지 조금만 더 알려주세요. 예: "내일 오전 10시에 병원 가"', intent: res.intent }); return; }
        cb({ kind: 'answer', text: res.text, intent: res.intent }); return;
      }
      if (res.source === 'api') {
        if (res.intent === 'weather.query' && opts.weather) { opts.weather(res.slots, function (txt) { cb({ kind: 'answer', text: txt, intent: res.intent }); }); return; }
        cb({ kind: 'answer', text: '아직 날씨·미세먼지는 연결 준비 중이에요. 곧 챙겨드릴게요 🌤️', intent: res.intent }); return;
      }
      // ai (모르는 것만)
      if (opts.ai) { opts.ai(query, function (txt) { cb({ kind: 'answer', text: txt, intent: 'ai' }); }); return; }
      cb({ kind: 'ai', text: null, query: query });
    });
  }
  function _reset() { _store = null; _loaded = false; _loadCbs = []; }

  // ── 임박 브리핑(인앱 리마인드) — 오늘~N일 안의 일정·공과금·생일을 모아 한 줄씩 ──
  function gatherUpcoming(store, now, days) {
    store = normalize(store); days = days || 3;
    var base = kstNow(now);
    var t0 = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate()));
    var range = { kind: 'range', from: ymd(t0), to: ymd(addDays(t0, days)) };
    var items = [];
    eventsIn(store.events, range).filter(function (e) { return !e.done; }).forEach(function (e) { items.push({ d: e.date, txt: (e.time ? fmtTime(e.time) + ' ' : '') + e.title }); });
    (store.bills || []).forEach(function (b) { var ds = billDateInRange(b.day, range); if (ds) items.push({ d: ds, txt: b.name + ' 납부일' }); });
    (store.family || []).forEach(function (f) { var ds2 = famDateInRange(f, range, now); if (ds2) items.push({ d: ds2, txt: f.relation + ' ' + (f.kind || '생일') }); });
    items.sort(function (a, b) { return a.d < b.d ? -1 : 1; });
    return items;
  }
  function briefingText(store, now, days) {
    var items = gatherUpcoming(store, now, days);
    if (!items.length) return null;
    return '곧 챙기실 일이에요.\n' + items.slice(0, 5).map(function (i) { return '· ' + niceDate(i.d, now) + ' ' + i.txt; }).join('\n');
  }
  // 브라우저: 저장소 로드 후 오늘~N일 브리핑 텍스트(없으면 null)
  function todayBriefing(cb, days) { load(function (store) { cb(briefingText(store, Date.now(), days || 3)); }); }

  var API = {
    parseDate: parseDate, parseTime: parseTime, classifyIntent: classifyIntent,
    extractSlots: extractSlots, extractFact: extractFact, answer: answer, fmtTime: fmtTime,
    load: load, save: save, saveFact: saveFact, completeRecent: completeRecent, ask: ask, _reset: _reset,
    gatherUpcoming: gatherUpcoming, briefingText: briefingText, todayBriefing: todayBriefing,
    getStore: function () { return _store; },
    _dict: { FAMILY_REL: FAMILY_REL, BILL_KIND: BILL_KIND, APPT_KIND: APPT_KIND }
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  root.BomLife = API;
})(typeof window !== 'undefined' ? window : globalThis);
