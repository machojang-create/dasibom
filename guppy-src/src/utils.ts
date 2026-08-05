import { GuppyResponse } from './types';

const rarities = ['일반', '일반', '일반', '희귀', '희귀', '전설'];
const expressions = ['웃음', '정면', '놀람', '슬픔', '잠', '신남', '크게 웃음', '반짝'];
const statuses = ['행복함', '배부름', '기분 최고', '평온함', '활기참'];

function randomHex() {
  return '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
}

function getKoreanColorName(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  
  if (max - min < 30) {
    if (max > 200) return '하얀';
    if (max < 80) return '어둠의';
    return '잿빛';
  }
  
  if (max === r) {
    if (g > 150) return '황금빛';
    if (b > 150) return '핑크빛';
    return '붉은';
  }
  if (max === g) {
    if (r > 150) return '레몬빛';
    if (b > 150) return '민트빛';
    return '초록';
  }
  if (max === b) {
    if (r > 150) return '보랏빛';
    if (g > 150) return '바다빛';
    return '푸른';
  }
  return '무지개빛';
}

const normalSuffixes = ['꼬마', '물방울', '친구', '요정', '구슬', '지느러미', '구피'];
const rareSuffixes = ['별빛', '수정', '보석', '천사', '오로라', '혜성', '정령'];
const epicSuffixes = ['수호자', '제왕', '여왕', '정령왕', '드래곤', '마스터', '신'];
const prefixes = ['신비로운', '아름다운', '눈부신', '환상의', '춤추는', '빛나는', '귀여운', '행복한'];

function generateGuppyName(hex: string, rarity: string): string {
  const colorName = getKoreanColorName(hex);
  let suffix = '';
  if (rarity === '전설') {
    suffix = epicSuffixes[Math.floor(Math.random() * epicSuffixes.length)];
  } else if (rarity === '희귀') {
    suffix = rareSuffixes[Math.floor(Math.random() * rareSuffixes.length)];
  } else {
    suffix = normalSuffixes[Math.floor(Math.random() * normalSuffixes.length)];
  }
  
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  return `${prefix} ${colorName} ${suffix}`;
}

function seedRandom(seed: number) {
  let x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

function randomHexSeeded(seed: number, offset: number) {
  return '#' + Math.floor(seedRandom(seed + offset)*16777215).toString(16).padStart(6, '0');
}

export function getSpecialShopGuppies() {
  const current3HourWindow = Math.floor(Date.now() / (1000 * 60 * 60 * 3));
  
  // Legendary color themes
  const legendaryThemes = [
    { body: '#ffd700', tail: '#ffc107', pattern: '#ffeb3b' }, // Gold
    { body: '#f8f9fa', tail: '#e9ecef', pattern: '#dee2e6' }, // Silver / Platinum
    { body: '#ffdf00', tail: '#d4af37', pattern: '#c5b358' }, // Antique Gold
    { body: '#e5e4e2', tail: '#b0c4de', pattern: '#778899' }, // Platinum Blue
    { body: '#cfb53b', tail: '#a67c00', pattern: '#bf953f' }, // Royal Gold
    { body: '#c0c0c0', tail: '#a9a9a9', pattern: '#808080' }, // Pure Silver
  ];
  const legendaryTheme = legendaryThemes[current3HourWindow % legendaryThemes.length];

  /* 품종·색 정책(2026-08-05 Macho):
       막구피(야생·200잎) = 파츠별 다양한 색 랜덤 / 고정구피 2종(1000·2000잎) = 파츠 색을 고급스럽게 통일.
       200잎=리본테일, 1000잎=그래스(보석 팔레트), 2000잎=턱시도(금·은 팔레트). 코브라는 제외. */
  const grassThemes = [
    { body: '#2dd4bf', tail: '#0f766e', pattern: '#99f6e4' }, // 에메랄드
    { body: '#60a5fa', tail: '#1e40af', pattern: '#bfdbfe' }, // 사파이어
    { body: '#fb7185', tail: '#9f1239', pattern: '#fecdd3' }, // 루비
    { body: '#a78bfa', tail: '#5b21b6', pattern: '#ddd6fe' }, // 자수정
    { body: '#38bdf8', tail: '#0c4a6e', pattern: '#bae6fd' }, // 심해 청옥
    { body: '#4ade80', tail: '#166534', pattern: '#bbf7d0' }, // 비취
  ];
  const grassTheme = grassThemes[current3HourWindow % grassThemes.length];

  return {
    normal: {
      body_color: randomHexSeeded(current3HourWindow, 1),
      tail_color: randomHexSeeded(current3HourWindow, 2),
      pattern_color: randomHexSeeded(current3HourWindow, 3),
      tail_type: 'ribbon' as import('./types').TailType,
    },
    rare: {
      body_color: grassTheme.body,
      tail_color: grassTheme.tail,
      pattern_color: grassTheme.pattern,
      tail_type: 'grass' as import('./types').TailType,
    },
    legendary: {
      body_color: legendaryTheme.body,
      tail_color: legendaryTheme.tail,
      pattern_color: legendaryTheme.pattern,
      tail_type: 'tuxedo' as import('./types').TailType,
    }
  };
}

export function generateSpawn(rarityBonus = false, fixedColors?: {body_color: string, tail_color: string, pattern_color: string, tail_type?: import('./types').TailType}, fixedRarity?: string): GuppyResponse {
  let bodyColor = fixedColors ? fixedColors.body_color : randomHex();
  let tailColor = fixedColors ? fixedColors.tail_color : randomHex();
  let patternColor = fixedColors ? fixedColors.pattern_color : randomHex();
  let selectedRarity = fixedRarity || (rarities[Math.floor(Math.random() * rarities.length)] as any);
    
  if (rarityBonus && !fixedRarity) {
    const betterRarities = ['희귀', '전설', '전설'];
    selectedRarity = betterRarities[Math.floor(Math.random() * betterRarities.length)];
  }

  if (selectedRarity === '전설' && !fixedColors) {
    const legendaryThemes = [
      { body: '#ffd700', tail: '#ffc107', pattern: '#ffeb3b' }, // Gold
      { body: '#f8f9fa', tail: '#e9ecef', pattern: '#dee2e6' }, // Silver / Platinum
      { body: '#ffdf00', tail: '#d4af37', pattern: '#c5b358' }, // Antique Gold
      { body: '#e5e4e2', tail: '#b0c4de', pattern: '#778899' }, // Platinum Blue
      { body: '#cfb53b', tail: '#a67c00', pattern: '#bf953f' }, // Royal Gold
      { body: '#c0c0c0', tail: '#a9a9a9', pattern: '#808080' }, // Pure Silver
    ];
    const theme = legendaryThemes[Math.floor(Math.random() * legendaryThemes.length)];
    bodyColor = theme.body;
    tailColor = theme.tail;
    patternColor = theme.pattern;
  }
  
  return {
    type: '생성',
    data: {
      guppy_name: generateGuppyName(bodyColor, selectedRarity),
      body_color: bodyColor,
      tail_color: tailColor,
      pattern_color: patternColor,
      rarity: selectedRarity,
      // 야생(조개 뽑기)은 전부 모자이크 — 다른 품종은 상점(fixedColors.tail_type) 또는 번식 변이로만
      tail_type: (fixedColors && fixedColors.tail_type) || 'mosaic'
    },
    timestamp: new Date().toISOString()
  }
}

export function generateFeed(): GuppyResponse {
  return {
    type: '먹이주기',
    data: {
      expression_frame: expressions[Math.floor(Math.random() * expressions.length)] as any,
      water_quality_change: -(Math.floor(Math.random() * 5) + 1),
      guppy_status: statuses[Math.floor(Math.random() * statuses.length)]
    },
    timestamp: new Date().toISOString()
  }
}
