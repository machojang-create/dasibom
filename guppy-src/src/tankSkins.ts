/* 어항 스킨(2026-07-22 신설) — 물빛 자체를 갈아입히는 프리미엄 꾸미기. 꽃잎 싱크.
   가격은 서버 PLANT_PRICES(guppy_skin_*)와 반드시 일치시킬 것. */
export const TANK_SKINS: Record<string, { name: string; desc: string; grad: string; price: number }> = {
  /* 물빛 밝기 개편(2026-08-05 Macho): 어항은 투명값이 높아야 프레시하다.
     기본·라군을 밝고 투명하게 낮추고, '수정처럼 맑음'을 무료로 신설. */
  basic: {
    name: '맑은 민물', desc: '처음 만난 그 물빛 — 언제 봐도 편안해요',
    grad: 'linear-gradient(180deg, rgba(125,226,252,0.62) 0%, rgba(96,165,250,0.66) 100%)', price: 0
  },
  crystal: {
    name: '수정처럼 맑음', desc: '갓 갈아준 물처럼 투명하게 — 물고기 색이 제일 잘 보여요',
    grad: 'linear-gradient(180deg, rgba(224,247,255,0.30) 0%, rgba(186,230,253,0.26) 50%, rgba(147,197,253,0.34) 100%)', price: 0
  },
  lagoon: {
    name: '산호초 라군', desc: '남태평양 얕은 바다의 에메랄드빛',
    grad: 'linear-gradient(180deg, rgba(103,232,249,0.66) 0%, rgba(45,212,191,0.6) 45%, rgba(20,184,166,0.68) 100%)', price: 60
  },
  deepsea: {
    name: '고요한 심해', desc: '깊고 짙은 남빛 — 달빛 조명과 잘 어울려요',
    grad: 'linear-gradient(180deg, rgba(30,64,175,0.96) 0%, rgba(30,41,59,0.98) 70%, rgba(2,6,23,0.98) 100%)', price: 100
  },
  sunset_sea: {
    name: '노을 바다', desc: '해질녘 주황과 보랏빛이 물에 녹아든 시간',
    grad: 'linear-gradient(180deg, rgba(253,186,116,0.72) 0%, rgba(251,113,133,0.6) 35%, rgba(147,51,234,0.55) 65%, rgba(67,56,202,0.72) 100%)', price: 120
  },
  sumuk: {
    name: '수묵 담채', desc: '먹빛이 은은히 번진 한 폭의 산수화',
    grad: 'linear-gradient(180deg, rgba(241,245,249,0.72) 0%, rgba(176,190,210,0.62) 45%, rgba(100,116,139,0.75) 100%)', price: 150
  }
};

/* 조명 프리셋(2026-07-22 개편) — 원색 단면 대신 은은한 그라데이션 6종. 강도는 슬라이더로. */
export const LIGHT_PRESETS: Record<string, { name: string; grad: string }> = {
  day:     { name: '기본',  grad: '' },
  morning: { name: '아침',  grad: 'linear-gradient(200deg, rgba(255,241,181,0.8) 0%, rgba(255,214,140,0.3) 45%, transparent 75%)' },
  sunset:  { name: '노을',  grad: 'linear-gradient(190deg, rgba(255,160,122,0.65) 0%, rgba(255,99,132,0.32) 50%, transparent 80%)' },
  moon:    { name: '달빛',  grad: 'linear-gradient(180deg, rgba(199,210,254,0.55) 0%, rgba(129,140,248,0.28) 55%, transparent 85%)' },
  deep:    { name: '심해',  grad: 'linear-gradient(180deg, rgba(34,211,238,0.4) 0%, rgba(8,47,73,0.5) 100%)' },
  coral:   { name: '산호',  grad: 'linear-gradient(210deg, rgba(251,207,232,0.6) 0%, rgba(244,114,182,0.28) 55%, transparent 85%)' }
};
