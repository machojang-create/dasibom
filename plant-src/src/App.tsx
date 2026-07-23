/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { UserPlant, PlantData, EncyclopediaEntry, WeatherType } from './types';
import { PLANT_TYPES, STORY_EVENTS, GRADUATION_EMOTIONAL_PHRASES } from './data';
import PlantView from './components/PlantView';
import Shop from './components/Shop';
import EncyclopediaView from './components/EncyclopediaView';
import PotShopView from './components/PotShopView';
import { BookOpen, Store, ShoppingBag, Droplet, Coins, CloudRain, ChevronLeft, ChevronRight, Sun, Camera, Megaphone, Volume2, VolumeX } from 'lucide-react';
import WeatherOverlay from './components/WeatherOverlay';
import LevelUpEffect from './components/LevelUpEffect';
import GraduationModal from './components/GraduationModal';
import AnimatedNumber from './components/AnimatedNumber';
import { DIALOGUES } from './data/dialogues';
import { SPAM_DIALOGUES } from './data/dialogues_spam';
import { mountButtonSfx, plipSfx, boingSfx } from './lib/sfx';
import { toggleBgm, autoResumeBgm } from './lib/bgm';
import Petal from './components/Petal';

/* 다시봄 브리지: 페이지(플랫폼)가 얹어주는 꽃잎 API — 잔액·소비는 전부 서버 권위 */
const dsb = () => (window as any).DasibomPoints;

const WEATHER_INFO: Record<WeatherType, { emoji: string; name: string; color: string }> = {
  sunny: { emoji: '☀️', name: '맑음', color: 'text-yellow-500' },
  rainy: { emoji: '🌧️', name: '비', color: 'text-blue-500' },
  cloudy: { emoji: '☁️', name: '흐림', color: 'text-gray-500' },
  snowy: { emoji: '❄️', name: '눈', color: 'text-cyan-400' },
  hot: { emoji: '🔥', name: '고온', color: 'text-red-500' },
  clear: { emoji: '✨', name: '쾌청', color: 'text-blue-300' },
  typhoon: { emoji: '🌀', name: '태풍', color: 'text-gray-600' },
};

// 슬롯 확장 가격(idx→꽃잎): 기본 3칸, 4·5·6번째 자리는 꽃잎으로 연다 — 정원 넓히기
const SLOT_UNLOCK_PRICE: Record<number, number> = { 3: 300, 4: 500, 5: 800 };

export default function App() {
  const [slots, setSlots] = useState<(UserPlant | null)[]>(() => {
    const saved = localStorage.getItem('plant_slots');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse saved slots", e);
      }
    }
    const initial = Array(6).fill(null);
    initial[0] = {
      id: Date.now().toString(),
      type: PLANT_TYPES[0], // 알로에
      stage: 'seed',
      level: 1,
      waterLevel: 50,
      lastWatered: Date.now(),
      potId: 'pot1'
    };
    return initial;
  });
  const [currentSlotIndex, setCurrentSlotIndex] = useState(() => {
    const saved = localStorage.getItem('plant_currentSlotIndex');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [unlockedSlots, setUnlockedSlots] = useState(() => {
    const sv = parseInt(localStorage.getItem('plant_unlocked_slots') || '0', 10);
    let occ = 0;   // 유료화 이전에 이미 심어둔 자리는 소급해서 잠그지 않는다
    try { (JSON.parse(localStorage.getItem('plant_slots') || '[]') as any[]).forEach((pl, i) => { if (pl) occ = Math.max(occ, i + 1); }); } catch (e) {}
    return Math.max(3, sv || 0, occ);
  });
  useEffect(() => { localStorage.setItem('plant_unlocked_slots', String(unlockedSlots)); }, [unlockedSlots]);
  const [memorials, setMemorials] = useState<{ name: string; customName?: string; emoji?: string; level: number; days: number; at: number }[]>(() => {
    try { return JSON.parse(localStorage.getItem('plant_memorials') || '[]'); } catch (e) { return []; }
  });
  useEffect(() => { localStorage.setItem('plant_memorials', JSON.stringify(memorials)); }, [memorials]);
  const [money, setMoney] = useState(0);   // 🌸 꽃잎 잔액(서버 미러 — 로컬 지갑 폐지)
  useEffect(() => {
    let tries = 0;
    const t = setInterval(() => {
      const P = dsb();
      if (P) { clearInterval(t); P.balance((b: number | null) => { if (b != null) setMoney(b); }); }
      else if (++tries > 60) clearInterval(t);
    }, 200);
    return () => clearInterval(t);
  }, []);
  const [isShopOpen, setIsShopOpen] = useState(false);
  const [isEncyclopediaOpen, setIsEncyclopediaOpen] = useState(false);
  const [isPotShopOpen, setIsPotShopOpen] = useState(false);
  const [encyclopedia, setEncyclopedia] = useState<EncyclopediaEntry[]>(() => {
    const saved = localStorage.getItem('plant_encyclopedia');
    if (saved) {
      try {
        const old = JSON.parse(saved) as EncyclopediaEntry[];
        // ★신규 종 병합: 식물이 추가돼도 기존 사용자 도감에 나타나도록 (2026-07-21 버그픽스)
        return PLANT_TYPES.map(pt => old.find(e => e.plantId === pt.id) || ({ plantId: pt.id, discovered: false }));
      } catch (e) {
        console.error("Failed to parse saved encyclopedia", e);
      }
    }
    return PLANT_TYPES.map(p => ({ plantId: p.id, discovered: p.id === PLANT_TYPES[0].id }));
  });
  const [badges, setBadges] = useState<string[]>(() => {
    const saved = localStorage.getItem('plant_badges');
    return saved ? JSON.parse(saved) : [];
  });
  const [weather, setWeather] = useState<WeatherType>('sunny');
  const [season, setSeason] = useState<'spring' | 'summer' | 'autumn' | 'winter'>('spring');
  const [timeOfDay, setTimeOfDay] = useState<'morning' | 'day' | 'night'>(() => {
    const h = new Date().getHours();
    if (h >= 6 && h < 12) return 'morning';
    if (h >= 12 && h < 18) return 'day';
    return 'night';
  });
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  useEffect(() => { mountButtonSfx(); }, []);   // 🔘 말랑 버튼음 — 모든 버튼 공통
  // 돌봄 연출/표정(2026-07-23): 물주기·영양제 순간의 물뿌리개·주사기 애니 + 잠깐의 반응 표정
  const [careFx, setCareFx] = useState<{ slot: number; kind: 'water' | 'nutrient' | null; key: number }>({ slot: -1, kind: null, key: 0 });
  useEffect(() => {
    if (!careFx.kind) return;
    const t = setTimeout(() => setCareFx(c => (c.key === careFx.key ? { slot: -1, kind: null, key: c.key } : c)), 2200);
    return () => clearTimeout(t);
  }, [careFx.key, careFx.kind]);

  // 배경음: '작은 농장 오후'(2026-07-22 Macho 음원) — 켜둔 채 재방문 시 첫 터치에 이어 재생
  useEffect(() => { autoResumeBgm('/audio/plant_bgm.mp3', 'plant_bgm', () => setIsAudioPlaying(true)); }, []);

  useEffect(() => {
    localStorage.setItem('plant_slots', JSON.stringify(slots));
    localStorage.setItem('plant_saved_at', String(Date.now()));
  }, [slots]);

  useEffect(() => {
    localStorage.setItem('plant_currentSlotIndex', currentSlotIndex.toString());
  }, [currentSlotIndex]);


  useEffect(() => {
    localStorage.setItem('plant_encyclopedia', JSON.stringify(encyclopedia));
  }, [encyclopedia]);

  useEffect(() => {
    localStorage.setItem('plant_badges', JSON.stringify(badges));
  }, [badges]);
  
  // 지난 방문 이후 마른 만큼 물 감소(하루 ~30%) — '데모 분단위'를 '실생활 일단위'로
  useEffect(() => {
    try {
      const last = parseInt(localStorage.getItem('plant_last_seen') || '0', 10);
      const now = Date.now();
      localStorage.setItem('plant_last_seen', String(now));
      if (!last) return;
      const hours = (now - last) / 3600000;
      if (hours < 1) return;
      const dry = Math.min(90, Math.round(hours * 1.25));
      setSlots(prev => prev.map(pl => pl ? { ...pl, waterLevel: Math.max(0, pl.waterLevel - dry) } : null));
    } catch (e) {}
  }, []);

  // ── 서버 백업/복원(2026-07-21): 폰이 바뀌어도 내 계정에 화분이 남는다 ──
  useEffect(() => {
    let tries = 0;
    const t = setInterval(() => {
      const P = dsb() as any;
      if (!P || !P.loadBlob) { if (++tries > 100) clearInterval(t); return; }
      clearInterval(t);
      P.loadBlob('plant', (err: any, blob: any) => {
        if (err || !blob || !blob.data) return;
        const localAt = parseInt(localStorage.getItem('plant_saved_at') || '0', 10);
        if (blob.savedAt > localAt + 3000 && Array.isArray(blob.data.slots)) {
          // 서버가 더 최신(다른 기기에서 키움) → 서버 상태 채택
          setSlots(blob.data.slots);
          if (Array.isArray(blob.data.encyclopedia)) {
            setEncyclopedia(PLANT_TYPES.map(pt => blob.data.encyclopedia.find((e: any) => e.plantId === pt.id) || ({ plantId: pt.id, discovered: false })));
          }
          if (Array.isArray(blob.data.badges)) setBadges(blob.data.badges);
          if (typeof blob.data.unlockedSlots === 'number') setUnlockedSlots(u => Math.max(u, 3, blob.data.unlockedSlots));
          if (Array.isArray(blob.data.memorials)) setMemorials(blob.data.memorials);
        }
      });
    }, 250);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    const push = () => {
      try {
        const P = dsb() as any; if (!P || !P.saveBlob) return;
        const data = {
          slots: JSON.parse(localStorage.getItem('plant_slots') || 'null'),
          encyclopedia: JSON.parse(localStorage.getItem('plant_encyclopedia') || 'null'),
          badges: JSON.parse(localStorage.getItem('plant_badges') || 'null'),
          unlockedSlots: parseInt(localStorage.getItem('plant_unlocked_slots') || '3', 10),
          memorials: JSON.parse(localStorage.getItem('plant_memorials') || 'null')
        };
        if (!Array.isArray(data.slots)) return;
        P.saveBlob('plant', data, () => { try { localStorage.setItem('plant_cloud_at', String(Date.now())); } catch (e) {} });
      } catch (e) {}
    };
    const iv = setInterval(push, 60000);
    window.addEventListener('pagehide', push);
    return () => { clearInterval(iv); window.removeEventListener('pagehide', push); };
  }, []);

  const [levelUpState, setLevelUpState] = useState({ active: false, index: -1 });
  const [graduationData, setGraduationData] = useState<{ isOpen: boolean, plant: UserPlant | null, index: number }>({ isOpen: false, plant: null, index: -1 });
  const [prevSlots, setPrevSlots] = useState(slots);

  const weatherRef = useRef(weather);
  useEffect(() => {
    weatherRef.current = weather;
  }, [weather]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const currentPlant = slots[currentSlotIndex];

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeft(scrollRef.current.scrollLeft);
  };
  const handleMouseLeave = () => setIsDragging(false);
  const handleMouseUp = () => setIsDragging(false);
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    scrollRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const index = Math.round(scrollRef.current.scrollLeft / scrollRef.current.clientWidth);
    if (index !== currentSlotIndex) {
      setCurrentSlotIndex(index);
    }
  };

  const scrollToSlot = (index: number) => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTo({
      left: index * scrollRef.current.clientWidth,
      behavior: 'smooth'
    });
  };

  const plantSay = (msg: string) => {
    setSlots(prev => {
      const t = prev[currentSlotIndex]; if (!t) return prev;
      const ns = [...prev]; ns[currentSlotIndex] = { ...t, phrase: msg }; return ns;
    });
  };
  // 부족 안내 회전(2026-07-23 전수점검): 같은 말풍선이 떠 있으면 다시 눌러도 '무반응'처럼 보인다 — 매번 다른 문구로
  const NO_PETAL_POOL = [
    '꽃잎이 모자라네... 친구들한테 다시봄 자랑 좀 하고, 꽃잎 받아 온나! 🌷',
    '아이고, 꽃잎 주머니가 비었데이. 오늘의 추억 구경하고 한마디 남기면 꽃잎이 생긴다!',
    '꽃잎이 부족하구마. 토론장 가서 한 표 던지고 오는 건 어떻노? 🌸',
  ];
  const noPetalIdxRef = useRef(0);
  const NO_PETAL_MSG_FN = () => NO_PETAL_POOL[(noPetalIdxRef.current++) % NO_PETAL_POOL.length];
  const NO_PETAL_MSG = NO_PETAL_POOL[0];

  // ★결제 잠금: 서버 응답(1~3초) 전의 연타를 전부 무시 — 중복 결제 방지(2026-07-21 버그 수정)
  const spendBusyRef = useRef(false);
  const guardedSpend = (item: string, cb: (err: any, d: any) => void) => {
    if (spendBusyRef.current) return false;
    const P = dsb(); if (!P) return false;
    spendBusyRef.current = true;
    // 즉각 반응(2026-07-23): 서버 확인 몇 초 사이가 '무반응'처럼 보이지 않게 — 누르는 순간 말을 건다
    plantSay('꽃잎 세어 보꾸마, 한 숨만 기다리 주라...');
    lastUserSpeakRef.current = Date.now();
    let settled = false;
    const safety = setTimeout(() => {   // 서버 무응답 시 잠금이 영원히 안 풀리던 구멍(2026-07-22)
      if (!settled) { settled = true; spendBusyRef.current = false; cb({ code: 'timeout' }, null); }
    }, 12000);
    P.spend(item, (err: any, d: any) => {
      if (settled) return;
      settled = true; clearTimeout(safety);
      spendBusyRef.current = false; cb(err, d);
    });
    return true;
  };

  const buySlot = () => {
    const idx = unlockedSlots;                  // 첫 번째 잠긴 자리
    if (idx >= slots.length || !SLOT_UNLOCK_PRICE[idx]) return;
    const firedSlot = guardedSpend('plant_slot' + (idx + 1), (err: any, d: any) => {
      if (err || !d || !d.ok) { if (d && d.balance != null) setMoney(d.balance); plantSay(NO_PETAL_MSG_FN()); return; }
      setMoney(d.balance);
      setUnlockedSlots(idx + 1);
    });
    if (!firedSlot) { plantSay('한 박자만 기다리 주라. 준비 중이데이!'); lastUserSpeakRef.current = Date.now(); }
  };

  const buySeed = (plant: PlantData) => {
    if (currentPlant) { setIsShopOpen(false); plantSay('이 화분엔 이미 친구가 살고 있어요. 빈 화분에 심어주세요!'); lastUserSpeakRef.current = Date.now(); return; }
    const slotIdx = currentSlotIndex;   // ★구매 완료 시점이 아니라 '누른 순간'의 화분에 심는다
    const firedSeed = guardedSpend('seed', (err: any, d: any) => {
      if (err || !d || !d.ok) { if (d && d.balance != null) setMoney(d.balance); setIsShopOpen(false); plantSay(NO_PETAL_MSG_FN()); return; }
      setMoney(d.balance);
      const newPlant: UserPlant = { 
        id: Date.now().toString(), 
        type: plant, 
        stage: 'seed', 
        level: 1,
        waterLevel: 50,
          lastWatered: Date.now(),
        potId: 'pot1'
      };
      setSlots(prev => { const ns = [...prev]; ns[slotIdx] = newPlant; return ns; });
      setIsShopOpen(false);
      setEncyclopedia(prev => prev.map(e => e.plantId === plant.id ? { ...e, discovered: true } : e));
    });
    if (!firedSeed) { setIsShopOpen(false); plantSay('한 박자만 기다리 주라. 준비 중이데이!'); lastUserSpeakRef.current = Date.now(); }
  };

  const buyPot = (potId: string, _price: number) => {
    if (!currentPlant) { setIsPotShopOpen(false); plantSay('식물이 있는 화분만 갈아입힐 수 있어요!'); lastUserSpeakRef.current = Date.now(); return; }
    if (potId === 'pot1') {   // 기본 옹기 무료
      setSlots(prev => { const ns = [...prev]; ns[currentSlotIndex] = { ...prev[currentSlotIndex]!, potId }; return ns; });
      setIsPotShopOpen(false); return;
    }
    const slotIdx = currentSlotIndex;   // ★레이스 방지
    const firedPot = guardedSpend(potId, (err: any, d: any) => {
      if (err || !d || !d.ok) { if (d && d.balance != null) setMoney(d.balance); setIsPotShopOpen(false); plantSay(NO_PETAL_MSG_FN()); return; }
      setMoney(d.balance);
      setSlots(prev => { const ns = [...prev]; ns[slotIdx] = { ...prev[slotIdx]!, potId }; return ns; });
      setIsPotShopOpen(false);
    });
    if (!firedPot) { setIsPotShopOpen(false); plantSay('한 박자만 기다리 주라. 준비 중이데이!'); lastUserSpeakRef.current = Date.now(); }
  };

  const handleRenamePlant = (plantIndex: number, newName: string) => {
    setSlots(prev => {
      const newSlots = [...prev];
      if (newSlots[plantIndex]) {
        newSlots[plantIndex] = { ...newSlots[plantIndex]!, customName: newName };
      }
      return newSlots;
    });
  };

  /* 연타(도배) 감지: 같은 행동이 10초 안에 3회 이상이면 거부반응 모드.
     일반 대사 풀 소진 방지 + 의인화(귀찮음·과습 불평). 15초 조용하면 해제. */
  const actionLogRef = useRef<Record<string, number[]>>({ water: [], touch: [] });
  const isSpamming = (key: 'water' | 'touch') => {
    const now = Date.now();
    const log = actionLogRef.current[key].filter(t => now - t < 10000);
    log.push(now);
    actionLogRef.current[key] = log;
    return log.length >= 3;
  };
  // 사용자 행동 대사 보호(8초): 날씨/계절 자동 대사가 방금 한 말을 덮지 않게
  const lastUserSpeakRef = useRef(0);
  const autoPhraseGuard = () => Date.now() - lastUserSpeakRef.current < 8000;

  const speakWithPlant = (action: string, plantIndex: number, userInput?: string) => {
    let actionKey: 'water' | 'normal_nut' | 'premium_nut' | 'touch' | 'greet' = 'greet';
    if (action === '물주기') actionKey = 'water';
    if (action === '일반 영양제 주기') actionKey = 'normal_nut';
    if (action === '고급 영양제 주기') actionKey = 'premium_nut';
    if (action === '쓰다듬기') actionKey = 'touch';
    if (action === '오랜만에 접속') actionKey = 'greet';

    setSlots(prev => {
      const targetPlant = prev[plantIndex];
      if (!targetPlant) return prev;
      
      const stage = targetPlant.stage;
      
      let phrases = DIALOGUES[actionKey]?.[stage] || ["우야꼬, 할 말이 없네."];
      if (actionKey === 'touch' && isSpamming(actionKey)) {
        const pool = SPAM_DIALOGUES[actionKey][targetPlant.type.dialect];
        if (pool && pool.length) phrases = pool;
      }
      const finalPhrase = phrases[Math.floor(Math.random() * phrases.length)];

      const newSlots = [...prev];
      newSlots[plantIndex] = { ...targetPlant, phrase: finalPhrase };
      lastUserSpeakRef.current = Date.now();
      return newSlots;
    });
  };

  const applyEffect = (type: 'water' | 'normal_nut' | 'premium_nut') => {
    // 돌봄 연출·효과음은 setSlots 업데이터 밖에서(2026-07-23 재수정): 업데이터 안 중첩 setState는
    // 프로덕션에서 이중호출·누락 위험 → 영양제 연출이 안 뜨던 원인. 여기서 최상위로 호출.
    if (type === 'water') {
      setCareFx({ slot: currentSlotIndex, kind: 'water', key: Date.now() });
      [0, 160, 340].forEach((ms) => setTimeout(plipSfx, ms));
    } else {
      setCareFx({ slot: currentSlotIndex, kind: 'nutrient', key: Date.now() });
      boingSfx();
    }
    lastUserSpeakRef.current = Date.now();

    setSlots(prev => {
      const targetPlant = prev[currentSlotIndex];
      if (!targetPlant) return prev;
      const newPlant = { ...targetPlant };

      let waterIncrease = type === 'water' ? 15 : type === 'normal_nut' ? 10 : 30;
      // 영양제 효과 축소(2026-07-21 Macho): 일반 +0.2 / 고급 +0.6 레벨 — 비용 유지, 몰입 유저의 꽃잎 하수구
      let levelIncrease = type === 'water' ? 0 : type === 'normal_nut' ? 0.2 : 0.6;
      // 물주기: 하루 첫 물은 정성으로 쳐서 레벨+1 (자동 성장 폐지 — 매일 들르는 이유)
      if (type === 'water') {
        const today = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10) /*KST*/;
        if ((newPlant as any).lastWaterDay !== today) {
          levelIncrease = 1;
          (newPlant as any).lastWaterDay = today;
        }
      }
      
      // Time of day bonuses for water level
      if (type === 'water' && timeOfDay === 'day') waterIncrease = 25;
      if (type !== 'water' && timeOfDay === 'night') waterIncrease = Math.floor(waterIncrease * 1.5);
      
      newPlant.waterLevel = Math.min(100, newPlant.waterLevel + waterIncrease);
      let buf = ((newPlant as any).growthBuf || 0) + levelIncrease;
      while (buf >= 1 && newPlant.level < 12) { newPlant.level += 1; buf -= 1; }
      (newPlant as any).growthBuf = newPlant.level >= 12 ? 0 : Math.round(buf * 100) / 100;
      newPlant.lastWatered = Date.now();

      if (newPlant.level >= 2 && newPlant.stage === 'seed') newPlant.stage = 'sprout';
      if (newPlant.level >= 6 && newPlant.stage === 'sprout') newPlant.stage = 'mature';
      if (newPlant.level >= 12 && newPlant.stage === 'mature') newPlant.stage = 'old';   // 만개 12렙 — 매일 물주면 열이틀+, 밸런스 +20%

      const newSlots = [...prev];
      newSlots[currentSlotIndex] = newPlant;
      return newSlots;
    });

    if (type === 'water') speakWithPlant('물주기', currentSlotIndex);
    else if (type === 'normal_nut') speakWithPlant('일반 영양제 주기', currentSlotIndex);
    else if (type === 'premium_nut') speakWithPlant('고급 영양제 주기', currentSlotIndex);
  };

  const applyItem = (type: 'water' | 'normal_nut' | 'premium_nut') => {
    if (type === 'water') {
      const cur = slots[currentSlotIndex];
      if (!cur) return;
      const dialect = cur.type.dialect;
      // 과습 거부: 물이 95% 이상이면 대사만(효과 없음) — '말과 규칙의 일치'
      if (cur.waterLevel >= 95) {
        const pool = SPAM_DIALOGUES.water[dialect] || [];
        plantSay(pool[Math.floor(Math.random() * pool.length)] || '물은 인자 됐데이!');
        lastUserSpeakRef.current = Date.now();
        return;
      }
      // 연타 잠금 제거(2026-07-23 Macho 지적): 물이 유료가 된 뒤에도 무료 시절 '10초 3회' 제한이 남아
      // 거부된 클릭까지 기록에 쌓여 계속 누르면 영영 잠기던 결함 — 재화 소비는 자유, 과습 가드만 유지.
      // 하루 첫 잔 무료(정성=레벨업), 추가 물은 1잎(2026-07-22 Macho — 물도 재화 루프에)
      const today = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10) /*KST*/;
      if ((cur as any).lastWaterDay !== today) { applyEffect('water'); return; }
      const fired = guardedSpend('plant_water', (err: any, d: any) => {
        if (err || !d || !d.ok) { if (d && d.balance != null) setMoney(d.balance); plantSay(NO_PETAL_MSG_FN()); return; }
        setMoney(d.balance);
        applyEffect('water');
      });
      if (!fired) { plantSay('한 박자만 기다리 주라. 준비 중이데이!'); lastUserSpeakRef.current = Date.now(); }   // 침묵 경로 제거
      return;
    }
    {
      const cur2 = slots[currentSlotIndex];
      if (cur2 && cur2.stage === 'old') {
        plantSay(['인자 만개했다 아이가. 영양제는 어린 아들 주라!', '나는 꽉 찼데이. 마음만 고맙게 받을게!'][Math.floor(Math.random() * 2)]);
        lastUserSpeakRef.current = Date.now();
        return;
      }
    }
    if (!dsb()) { plantSay('시방 연결이 잘 안 되네... 쪼매 있다 다시 온나!'); return; }
    const firedNut = guardedSpend(type, (err: any, d: any) => {
      if (err || !d || !d.ok) { if (d && d.balance != null) setMoney(d.balance); plantSay(NO_PETAL_MSG_FN()); return; }
      setMoney(d.balance);
      applyEffect(type);
    });
    if (!firedNut) { plantSay('한 박자만 기다리 주라. 준비 중이데이!'); lastUserSpeakRef.current = Date.now(); }
  };

  useEffect(() => {
    slots.forEach((slot, idx) => {
      if (slot && prevSlots[idx] && slot.stage !== prevSlots[idx]?.stage) {
        if (slot.stage === 'old') {
          setGraduationData({ isOpen: true, plant: slot, index: idx });
        } else if (idx === currentSlotIndex) {
          setLevelUpState({ active: true, index: idx });
          setTimeout(() => setLevelUpState({ active: false, index: -1 }), 3500);
        }
      }
    });
    setPrevSlots(slots);
  }, [slots, currentSlotIndex, prevSlots]);

  // 말풍선 자동 소멸(2026-07-22 Macho): 읽을 시간(길이 비례)이 지나면 스르르 사라진다
  const phraseTimersRef = useRef<Record<number, { phrase: string; t: any }>>({});
  useEffect(() => {
    slots.forEach((slot, idx) => {
      const cur = phraseTimersRef.current[idx];
      if (!slot || !slot.phrase) { if (cur) { clearTimeout(cur.t); delete phraseTimersRef.current[idx]; } return; }
      if (cur && cur.phrase === slot.phrase) return;   // 같은 대사 — 타이머 유지
      if (cur) clearTimeout(cur.t);
      const ph = slot.phrase;
      const dur = Math.min(11000, 4000 + ph.length * 80);
      phraseTimersRef.current[idx] = {
        phrase: ph,
        t: setTimeout(() => {
          delete phraseTimersRef.current[idx];
          setSlots(prev => {
            const p2 = prev[idx];
            if (!p2 || p2.phrase !== ph) return prev;
            const ns = [...prev]; ns[idx] = { ...p2, phrase: undefined }; return ns;
          });
        }, dur),
      };
    });
  }, [slots]);

  // ④ 인사 반복 방지: 말풍선이 사라진 뒤 슬롯을 오가도, 같은 화분 인사는 5분에 한 번만
  const greetedRef = useRef<Record<string, number>>({});
  useEffect(() => {
    if (currentPlant && !currentPlant.phrase) {
      const last = greetedRef.current[currentPlant.id] || 0;
      if (Date.now() - last > 300000) {
        greetedRef.current[currentPlant.id] = Date.now();
        speakWithPlant('오랜만에 접속', currentSlotIndex);
      }
    }
  }, [currentSlotIndex]);

  // 수분 마름(2026-07-22 재설계): 분당 틱 — 도감 표기("10분당")와 실제가 일치하게.
  //   맑음 -0.5/분, 비 +1, 흐림 -0.3, 눈 0, 고온 -1, 쾌청 -0.5, 태풍 -0.7 → 한 시간이면 눈에 띄게 마른다.
  const ratePerMin = (w: string) =>
    w === 'sunny' ? -0.5 : w === 'rainy' ? 1 : w === 'snowy' ? 0 : w === 'hot' ? -1 : w === 'typhoon' ? -0.7 : w === 'clear' ? -0.5 : -0.3;
  const applyDry = (minutes: number) => {
    if (minutes <= 0) return;
    const d = Math.max(-40, Math.min(20, ratePerMin(weatherRef.current) * minutes));   // 복귀 정산 상한
    setSlots(prev => prev.map(p => p ? { ...p, waterLevel: Math.round(Math.max(0, Math.min(100, p.waterLevel + d)) * 10) / 10 } : null));
  };
  const lastTickRef = useRef(Date.now());
  useEffect(() => {
    const timer = setInterval(() => { lastTickRef.current = Date.now(); applyDry(1); }, 60000);
    // 폰을 켜둔 채 다른 일 하다 돌아와도(타이머 동결) 경과분을 한 번에 정산
    const onBack = () => {
      if (document.visibilityState !== 'visible') return;
      const mins = Math.floor((Date.now() - lastTickRef.current) / 60000);
      if (mins >= 2) { lastTickRef.current = Date.now(); applyDry(mins); }
    };
    document.addEventListener('visibilitychange', onBack);
    window.addEventListener('pageshow', onBack);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', onBack); window.removeEventListener('pageshow', onBack); };
  }, []);

  useEffect(() => {
    // 계절은 실제 달력을 따른다(창밖과 같은 계절 — 1분 순환은 데모용이었음)
    const bySeason = () => {
      const m = new Date().getMonth() + 1;
      return m >= 3 && m <= 5 ? 'spring' : m >= 6 && m <= 8 ? 'summer' : m >= 9 && m <= 11 ? 'autumn' : 'winter';
    };
    setSeason(bySeason());
    const seasonTimer = setInterval(() => setSeason(bySeason()), 3600000);
    return () => clearInterval(seasonTimer);
  }, []);

  useEffect(() => {
    const timeTimer = setInterval(() => {
      const h = new Date().getHours();
      let newTime: 'morning' | 'day' | 'night' = 'night';
      if (h >= 6 && h < 12) newTime = 'morning';
      else if (h >= 12 && h < 18) newTime = 'day';
      setTimeOfDay(newTime);
    }, 60000);
    return () => clearInterval(timeTimer);
  }, []);

  // ── 실제 날씨를 창밖에 (2026-07-21 Macho 지시) ──
  // Open-Meteo(키·비용 없음, CORS 허용). 위치 허용 시 실위치, 거부·미지원 시 서울 기준.
  // API가 계속 실패하면 기존 10분 랜덤 연출이 그대로 살아있어 화면이 죽지 않는다.
  const realWeatherRef = useRef(false);
  const speakWeather = (newW: WeatherType) => {
    setSlots(prev => prev.map(p => {
      if (!p) return null;
      if (autoPhraseGuard()) return p;   // 방금 어르신과 나눈 말을 덮지 않는다
      let phrase = p.phrase;
      if (p.stage === 'old') {
         const emotionalPhrases = GRADUATION_EMOTIONAL_PHRASES[p.type.dialect] || [];
         phrase = emotionalPhrases[Math.floor(Math.random() * emotionalPhrases.length)] || p.phrase;
      } else {
         const phrases = DIALOGUES[`weather_${newW}` as keyof typeof DIALOGUES]?.[p.stage] ||
                         DIALOGUES['weather_sunny']?.[p.stage] || [];
         phrase = phrases[Math.floor(Math.random() * phrases.length)] || p.phrase;
      }
      return { ...p, phrase };
    }));
  };
  useEffect(() => {
    let stop = false;
    const mapWmo = (code: number, temp: number, wind: number): WeatherType => {
      if (code >= 95 || wind >= 60) return 'typhoon';
      if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snowy';
      if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'rainy';
      if (code === 45 || code === 48 || code === 3) return 'cloudy';
      if (code === 1 || code === 2) return temp >= 32 ? 'hot' : 'sunny';
      return temp >= 32 ? 'hot' : 'clear';   // 0 = 구름 한 점 없는 하늘 → 쾌청
    };
    const fetchWeather = (lat: number, lon: number) => {
      fetch('https://api.open-meteo.com/v1/forecast?latitude=' + lat.toFixed(3) + '&longitude=' + lon.toFixed(3) + '&current=weather_code,temperature_2m,wind_speed_10m&timezone=auto')
        .then(r => r.json())
        .then(j => {
          if (stop || !j || !j.current) return;
          const w = mapWmo(j.current.weather_code, j.current.temperature_2m, j.current.wind_speed_10m);
          realWeatherRef.current = true;
          setWeather(prev => { if (prev !== w) speakWeather(w); return w; });
        })
        .catch(() => {});
    };
    const locate = () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          p => fetchWeather(p.coords.latitude, p.coords.longitude),
          () => fetchWeather(37.566, 126.978),
          { timeout: 6000, maximumAge: 1800000 }
        );
      } else fetchWeather(37.566, 126.978);
    };
    locate();
    const iv = setInterval(locate, 1800000);   // 30분마다 하늘 확인
    return () => { stop = true; clearInterval(iv); };
  }, []);
  useEffect(() => {
    const weatherTimer = setInterval(() => {
      if (realWeatherRef.current) return;   // 실날씨가 잡혔으면 랜덤 연출은 쉰다
      setWeather(() => {
        const weathers: WeatherType[] = ['sunny', 'rainy', 'cloudy', 'snowy', 'hot', 'clear', 'typhoon'];
        const newlyGenerated = weathers[Math.floor(Math.random() * weathers.length)];
        speakWeather(newlyGenerated);
        return newlyGenerated;
      });
    }, 600000);   // 날씨는 10분마다 — 정신없지 않게
    return () => clearInterval(weatherTimer);
  }, []);



  const handleGraduationComplete = () => {
    const { index, plant } = graduationData;
    if (index === -1 || !plant) return;

    // Add to encyclopedia as graduated
    setEncyclopedia(prev => {
      const exists = prev.find(p => p.plantId === plant.type.id);
      if (exists) {
        return prev.map(p => p.plantId === plant.type.id ? { ...p, graduated: true } : p);
      }
      return [...prev, { plantId: plant.type.id, discovered: true, graduated: true }];
    });

    // 추억 정원 기록: 만개하여 떠난 친구를 도감 갤러리에 남긴다
    setMemorials(prev => [...prev, {
      name: plant.type.name, customName: plant.customName, emoji: plant.type.emoji, type: plant.type.type,
      level: plant.level, days: Math.max(1, Math.ceil((Date.now() - parseInt(plant.id)) / 86400000)), at: Date.now()
    }]);

    // Clear slot
    setSlots(prev => {
      const newSlots = [...prev];
      newSlots[index] = null;
      return newSlots;
    });

    setBadges(prev => {
      const newBadges = [...prev];
      if (!newBadges.includes('first_grad')) newBadges.push('first_grad');
      
      // Check how many have graduated
      const gradCount = encyclopedia.filter(e => e.graduated).length;
      // We need to count the newly graduating plant if it wasn't already graduated
      const isNewlyGraduated = !encyclopedia.find(e => e.plantId === plant.type.id)?.graduated;
      const totalGrads = gradCount + (isNewlyGraduated ? 1 : 0);
      
      if (totalGrads >= 3 && !newBadges.includes('grad_3')) newBadges.push('grad_3');
      if (totalGrads >= 6 && !newBadges.includes('grad_6')) newBadges.push('grad_6');
      
      return newBadges;
    });

    setGraduationData({ isOpen: false, plant: null, index: -1 });
  };

  return (
    <div className="fixed inset-0 bg-[#e8f0f2] font-sans overflow-hidden select-none flex flex-col">
      <GraduationModal 
        isOpen={graduationData.isOpen} 
        plant={graduationData.plant} 
        onClose={handleGraduationComplete} 
      />
      <LevelUpEffect isActive={levelUpState.active} />
      
      {/* Veranda Background (Fixed Z-0) */}
      <div className={`absolute inset-0 z-0 overflow-hidden pointer-events-none transition-colors duration-1000 ${
        timeOfDay === 'night' ? 'bg-slate-900' :
        season === 'spring' ? 'bg-sky-50' : 
        season === 'summer' ? 'bg-blue-100' :
        season === 'autumn' ? 'bg-orange-50' :
        'bg-indigo-50'
      }`}>
        {/* Outside nature */}
        <div className={`absolute bottom-0 w-full h-[60%] bg-gradient-to-t transition-colors duration-1000 ${
          timeOfDay === 'night' ? 'from-green-900/40' : 'from-green-100/50'
        } to-transparent`}></div>

        {/* ── 창밖 원경: 해/달·별·산등성이·마을 — 여기가 '바깥세상' ── */}
        {timeOfDay === 'night' ? (
          <>
            <div className="absolute top-[8%] right-[16%] text-5xl md:text-6xl opacity-90 drop-shadow-[0_0_18px_rgba(255,244,200,.7)]">🌙</div>
            {[14,26,38,55,68,80].map((lx,i)=>(
              <div key={i} className="absolute text-[10px] text-yellow-100 animate-twinkle" style={{ left: lx+'%', top: (6+(i%3)*7)+'%', animationDelay: (i*0.7)+'s' }}>✦</div>
            ))}
          </>
        ) : (weather==='sunny'||weather==='clear'||weather==='hot') ? (
          <div className="absolute top-[7%] right-[14%] w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-yellow-100 to-amber-300 shadow-[0_0_50px_18px_rgba(253,224,71,.45)] opacity-95" />
        ) : null}
        {/* 산등성이 2겹 + 마을 실루엣 */}
        <svg className={`absolute bottom-[30%] left-0 w-full h-[26%] transition-opacity duration-1000 ${timeOfDay==='night'?'opacity-30':'opacity-45'}`} viewBox="0 0 400 100" preserveAspectRatio="none">
          <path d="M0,100 L0,55 Q60,20 130,48 Q200,75 270,38 Q330,10 400,45 L400,100 Z" fill="#7fa88a" />
          <path d="M0,100 L0,72 Q80,45 160,68 Q250,90 320,60 Q370,42 400,58 L400,100 Z" fill="#5c8a6b" opacity="0.8" />
          <g fill="#4a6b58" opacity="0.9">
            <rect x="286" y="62" width="10" height="18" /><rect x="300" y="55" width="12" height="25" /><rect x="318" y="64" width="9" height="16" />
          </g>
        </svg>
        {/* 가끔 지나가는 새 */}
        {timeOfDay !== 'night' && (
          <div className="absolute top-[14%] left-0 text-[13px] text-slate-600/70 animate-birdfly pointer-events-none">〜🕊</div>
        )}
        {/* 화창한 날의 생기(2026-07-22): 흘러가는 구름·새 한 마리 더·나비 */}
        {(weather === 'sunny' || weather === 'clear') && timeOfDay !== 'night' && (
          <>
            <div className="absolute top-[7%] w-[26%] h-[9%] pointer-events-none opacity-80" style={{ animation: 'cloudDrift 95s linear infinite' }}>
              <div className="w-full h-full bg-white rounded-full blur-md" />
            </div>
            <div className="absolute top-[16%] w-[17%] h-[7%] pointer-events-none opacity-55" style={{ animation: 'cloudDrift 140s linear infinite', animationDelay: '-70s' }}>
              <div className="w-full h-full bg-white rounded-full blur-md" />
            </div>
            <div className="absolute top-[22%] left-0 text-[11px] text-slate-600/60 pointer-events-none" style={{ animation: 'birdFly 55s linear infinite', animationDelay: '-22s' }}>〜🕊</div>
            <div className="absolute bottom-[38%] text-[15px] pointer-events-none" style={{ animation: 'butterflyFly 26s ease-in-out infinite' }}>🦋</div>
          </>
        )}
        
        {/* Weather Overlay */}
        <WeatherOverlay weather={weather} timeOfDay={timeOfDay} />

        {/* Time of Day Overlay */}
        <div className={`absolute inset-0 transition-opacity duration-1000 pointer-events-none mix-blend-multiply ${
          timeOfDay === 'night' ? 'bg-blue-900/60 opacity-100' :
          timeOfDay === 'morning' ? 'bg-orange-300/10 opacity-100' :
          'opacity-0'
        }`}></div>
      </div>

      {/* Panoramic Window Frame (통창) + 창살 + 커튼 — '베란다에서 내다보는 창' */}
      <div className="absolute inset-0 pointer-events-none z-0 border-[16px] md:border-[24px] border-white shadow-[inset_0_0_60px_rgba(0,0,0,0.2)]"></div>
      <div className="absolute inset-0 pointer-events-none z-0">
        {/* 세로 창살 2개 + 가로 창살 1개 */}
        <div className="absolute top-0 bottom-[32vh] left-1/3 w-[10px] md:w-[14px] bg-gradient-to-r from-white via-[#f3efe6] to-white shadow-[2px_0_6px_rgba(0,0,0,.12)]" />
        <div className="absolute top-0 bottom-[32vh] left-2/3 w-[10px] md:w-[14px] bg-gradient-to-r from-white via-[#f3efe6] to-white shadow-[2px_0_6px_rgba(0,0,0,.12)]" />
        <div className="absolute left-0 right-0 top-[26%] h-[10px] md:h-[14px] bg-gradient-to-b from-white via-[#f3efe6] to-white shadow-[0_2px_6px_rgba(0,0,0,.12)]" />
        {/* 커튼 자락(좌·우) */}
        <div className="absolute top-0 left-0 h-[46%] w-[13%] md:w-[11%] animate-curtain origin-top bg-gradient-to-r from-[#fdf6e9]/95 via-[#f7ead2]/80 to-transparent rounded-br-[60%]" style={{ boxShadow: 'inset -12px 0 18px -10px rgba(150,120,80,.25)' }} />
        <div className="absolute top-0 right-0 h-[46%] w-[13%] md:w-[11%] animate-curtain-r origin-top bg-gradient-to-l from-[#fdf6e9]/95 via-[#f7ead2]/80 to-transparent rounded-bl-[60%]" style={{ boxShadow: 'inset 12px 0 18px -10px rgba(150,120,80,.25)' }} />
      </div>
      
      {/* Table Background (Windowsill) */}
      <div className={`absolute bottom-0 left-0 right-0 h-[32vh] border-t-[16px] md:border-t-[24px] shadow-[0_-10px_30px_rgba(0,0,0,0.05)] z-0 pointer-events-none transition-colors duration-1000 ${
        timeOfDay === 'night' ? 'bg-[#5c4a30] border-[#4a3920]' : 'bg-[#f4e4c3] border-[#e0c396]'
      }`}>
        {/* 나무 결 */}
        <div className="absolute inset-0 opacity-25" style={{ backgroundImage: 'repeating-linear-gradient(90deg, rgba(120,85,40,.12) 0 2px, transparent 2px 46px)' }} />
        {/* 베란다 소품: 물뿌리개·라디오·다육이·목장갑 */}
        <div className="absolute -top-[54px] left-[5%] md:left-[7%] flex items-end gap-1 select-none">
          <svg width="58" height="46" viewBox="0 0 60 48" className="drop-shadow-md opacity-95">
            <path d="M14 18 h26 a4 4 0 0 1 4 4 v16 a4 4 0 0 1 -4 4 h-22 a4 4 0 0 1 -4 -4 Z" fill="#7fa3b8" />
            <path d="M40 24 L54 12 l3 4 -13 12 Z" fill="#6b93a8" />
            <circle cx="55" cy="13" r="4.5" fill="#8fb3c8" />
            <path d="M16 18 q10 -12 22 0" fill="none" stroke="#6b93a8" strokeWidth="3.5" strokeLinecap="round" />
          </svg>
        </div>
        <div className="absolute -top-[40px] right-[6%] md:right-[8%] text-[34px] md:text-[38px] drop-shadow-md select-none">📻</div>
        <div className="absolute -top-[34px] right-[20%] md:right-[19%] text-[26px] drop-shadow-sm select-none">🧤</div>
        <div className="absolute -top-[38px] left-[22%] md:left-[20%] text-[30px] drop-shadow-md select-none">🪴</div>
      </div>

      {/* Fixed UI Layer (Z-50) */}
      <div className="absolute inset-0 pointer-events-none z-50">
        {/* Navigation Arrows */}
        <div className="absolute top-[76%] md:top-[70%] -translate-y-1/2 left-2 md:left-6 z-40 pointer-events-auto">
          {currentSlotIndex > 0 && (
            <button onClick={() => scrollToSlot(currentSlotIndex - 1)} className="w-12 h-12 md:w-14 md:h-14 grid place-items-center bg-white/95 hover:bg-white rounded-full shadow-xl text-[#5b3a1a] transition-all active:scale-90 border-2 border-[#e8d9be]">
              <ChevronLeft className="w-6 h-6 md:w-8 md:h-8" />
            </button>
          )}
        </div>
        <div className="absolute top-[76%] md:top-[70%] -translate-y-1/2 right-2 md:right-6 z-40 pointer-events-auto">
          {currentSlotIndex < Math.min(slots.length, unlockedSlots + 1) - 1 && (
            <button onClick={() => scrollToSlot(currentSlotIndex + 1)} className="w-12 h-12 md:w-14 md:h-14 grid place-items-center bg-white/95 hover:bg-white rounded-full shadow-xl text-[#5b3a1a] transition-all active:scale-90 border-2 border-[#e8d9be]">
              <ChevronRight className="w-6 h-6 md:w-8 md:h-8" />
            </button>
          )}
        </div>

        {/* Slot Indicators — 말풍선과 겹치지 않게 하단 버튼 바로 위로 */}
        <div className="absolute bottom-[136px] md:bottom-[142px] left-0 right-0 flex justify-center gap-2.5 z-40">
          {slots.slice(0, Math.min(slots.length, unlockedSlots + 1)).map((_, idx) => (
             <div key={idx} className={`rounded-full transition-all shadow ${idx === currentSlotIndex ? 'w-3.5 h-3.5 bg-[#c8784a] ring-2 ring-white' : 'w-3 h-3 bg-white/85 border border-[#c8a86a]/50'}`} />
          ))}
        </div>

        {/* Top Left (Time of Day & Bonus & Weather) */}
        <div className="absolute top-4 left-3 md:top-6 md:left-6 pointer-events-auto flex flex-col gap-1.5 max-w-[62vw]">
          <div className="flex gap-2">
            <a href="/" className="flex items-center justify-center h-8 bg-white/95 hover:bg-white active:scale-95 rounded-full shadow border-2 border-white px-3 text-[#5b3a1a] font-black text-sm transition-all">← 홈으로</a>
          </div>
          <div className="flex gap-2">
            <div className="flex items-center justify-center h-8 bg-white/90 backdrop-blur-md rounded-full shadow border-2 border-white px-3 gap-1.5 text-gray-800 font-bold text-sm">
              {timeOfDay === 'morning' ? <span className="text-orange-500">🌅 아침</span> : timeOfDay === 'day' ? <span className="text-blue-500">☀️ 낮</span> : <span className="text-indigo-500">🌙 밤</span>}
            </div>
            <div className="flex items-center justify-center h-8 bg-white/90 backdrop-blur-md rounded-full shadow border-2 border-white px-3 gap-1.5 font-bold text-sm">
              <span className={WEATHER_INFO[weather].color}>{WEATHER_INFO[weather].emoji} {WEATHER_INFO[weather].name}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="flex items-center justify-center h-8 bg-purple-500/90 backdrop-blur-md rounded-full shadow border-2 border-white px-3.5 gap-1 text-white font-bold text-[13px]">
              {timeOfDay === 'morning' ? '🌅 아침엔 쓰다듬어 주세요' : timeOfDay === 'day' ? '☀️ 낮엔 물이 쑥쑥!' : '🌙 밤엔 영양제가 쑥쑥!'}
            </div>
          </div>
        </div>

        {/* Top Right (Money) */}
        <div className="absolute top-4 right-3 md:top-6 md:right-6 pointer-events-auto">
          <div className="flex items-center justify-center h-8 bg-white/90 rounded-full shadow border-2 border-pink-200 px-3 gap-1.5 text-[#a14d68] font-bold text-sm">
            <Petal className="w-4 h-4" />
            {money.toLocaleString()} <span className="text-[11px] font-extrabold">꽃잎</span>
          </div>
        </div>

        {/* Right Menu */}
        <div className="absolute top-20 md:top-24 right-4 md:right-6 flex flex-col gap-3 pointer-events-auto items-end z-40">
          <button 
            onClick={() => { const on = toggleBgm('/audio/plant_bgm.mp3', 'plant_bgm'); setIsAudioPlaying(on); plantSay(on ? '음악 틀었데이~ 물소리랑 참 잘 어울린다 🎵' : '음악은 잠깐 쉬어 가꼬. 조용한 것도 좋데이.'); lastUserSpeakRef.current = Date.now(); }} 
            className={`flex flex-col items-center justify-center w-14 h-14 ${isAudioPlaying ? 'bg-indigo-500 text-white' : 'bg-white/80 text-gray-400'} backdrop-blur-md rounded-2xl shadow-lg border-2 border-white hover:bg-opacity-100 transition-colors`}
          >
            {isAudioPlaying ? <Volume2 className="w-6 h-6 mb-0.5" /> : <VolumeX className="w-6 h-6 mb-0.5" />}
            <span className="text-[10px] font-bold">소리</span>
          </button>
          <button data-bomguide="pdex" onClick={() => setIsEncyclopediaOpen(true)} className="flex flex-col items-center justify-center w-14 h-14 bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border-2 border-white text-green-600 hover:bg-white transition-colors">
            <BookOpen className="w-6 h-6 mb-0.5" />
            <span className="text-[10px] font-bold">도감</span>
          </button>
          <button data-bomguide="ppot" onClick={() => setIsPotShopOpen(true)} className="flex flex-col items-center justify-center w-14 h-14 bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border-2 border-white text-blue-500 hover:bg-white transition-colors">
            <Store className="w-6 h-6 mb-0.5" />
            <span className="text-[10px] font-bold">화분</span>
          </button>
          <button data-bomguide="ps" onClick={() => setIsShopOpen(true)} className="flex flex-col items-center justify-center w-14 h-14 bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border-2 border-white text-yellow-500 hover:bg-white transition-colors relative">
            <ShoppingBag className="w-6 h-6 mb-0.5" />
            <span className="text-[10px] font-bold">씨앗</span>
          </button>
        </div>



        {/* Bottom Actions — 재화 부족·만개 상태를 버튼에서 바로 보이게(2026-07-22 Macho: "불친절한 상황 전수 체크") */}
        {(() => {
          const isOld = currentPlant?.stage === 'old';
          const todayKST = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
          const waterIsPaid = !!currentPlant && (currentPlant as any).lastWaterDay === todayKST;
          const waterShort = waterIsPaid && money < 1;
          const normalShort = money < 15;
          const premiumShort = money < 40;
          return (
        <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-2 md:gap-4 px-2 pointer-events-auto">
          <button data-bomguide="pw" onClick={() => applyItem('water')} disabled={!currentPlant} className={`relative flex flex-col items-center justify-center w-[30vw] max-w-[104px] h-28 md:w-28 md:h-28 bg-gradient-to-b from-[#52b5e9] to-[#3498c9] rounded-2xl border-4 ${waterShort ? 'grayscale opacity-60 saturate-[.5]' : timeOfDay === 'day' ? 'border-yellow-300 shadow-[0_0_15px_rgba(253,224,71,0.8)]' : 'border-white'} shadow-lg transition-transform hover:scale-105 active:scale-95 text-white disabled:pointer-events-none disabled:opacity-50 disabled:grayscale`}>
            {timeOfDay === 'day' && !waterShort && <div className="absolute inset-0 rounded-xl bg-white/20 animate-pulse pointer-events-none" />}
            <Droplet className="w-8 h-8 md:w-9 md:h-9 mb-1 drop-shadow relative z-10" fill="currentColor" />
            <span className="font-bold text-[15px] md:text-base drop-shadow-md tracking-tight text-center relative z-10">물주기</span>
            {waterShort ? (
              <span className="font-bold text-[11px] md:text-[12px] bg-red-500/85 px-2.5 py-0.5 rounded-full mt-1 relative z-10 flex items-center gap-1">🌸 부족해요</span>
            ) : (
              <span className="font-bold text-[12px] md:text-[13px] bg-black/25 px-2.5 py-0.5 rounded-full mt-1 relative z-10 flex items-center gap-1">{waterIsPaid ? <><Petal className="w-3 h-3" />1</> : '오늘 첫 잔 무료'}</span>
            )}
          </button>
          <button data-bomguide="pn" onClick={() => applyItem('normal_nut')} disabled={!currentPlant} className={`relative flex flex-col items-center justify-center w-[30vw] max-w-[104px] h-28 md:w-28 md:h-28 bg-gradient-to-b from-[#f2cd5c] to-[#e0af2c] ${(normalShort || isOld) ? "grayscale opacity-60 saturate-[.5]" : ""} rounded-2xl border-4 ${timeOfDay === 'night' && !normalShort && !isOld ? 'border-yellow-300 shadow-[0_0_15px_rgba(253,224,71,0.8)]' : 'border-white'} shadow-lg transition-transform hover:scale-105 active:scale-95 text-white disabled:pointer-events-none disabled:opacity-50 disabled:grayscale`}>
            {timeOfDay === 'night' && !normalShort && !isOld && <div className="absolute inset-0 rounded-xl bg-white/20 animate-pulse pointer-events-none" />}
            <span className="text-2xl mb-0.5 relative z-10">🌿</span>
            <span className="font-bold text-[14px] md:text-[15px] drop-shadow-md tracking-tight text-center relative z-10 leading-tight">영양제<br/><span className="text-[11px] font-semibold opacity-90">잎이 쑥 자라요</span></span>
            {isOld ? (
              <span className="font-bold text-[11px] md:text-[12px] bg-black/30 px-2.5 py-0.5 rounded-full mt-1 relative z-10">🌼 만개 완료</span>
            ) : normalShort ? (
              <span className="font-bold text-[11px] md:text-[12px] bg-red-500/85 px-2.5 py-0.5 rounded-full mt-1 relative z-10 flex items-center gap-1">🌸 부족해요</span>
            ) : (
              <span className="font-bold text-[12px] md:text-[13px] bg-black/25 px-2.5 py-0.5 rounded-full mt-1 relative z-10 flex items-center gap-1"><Petal className="w-3.5 h-3.5" />15</span>
            )}
          </button>
          <button data-bomguide="pp" onClick={() => applyItem('premium_nut')} disabled={!currentPlant} className={`relative flex flex-col items-center justify-center w-[30vw] max-w-[104px] h-28 md:w-28 md:h-28 bg-gradient-to-b from-[#f29c38] to-[#d67b18] ${(premiumShort || isOld) ? "grayscale opacity-60 saturate-[.5]" : ""} rounded-2xl border-4 ${timeOfDay === 'night' && !premiumShort && !isOld ? 'border-yellow-300 shadow-[0_0_15px_rgba(253,224,71,0.8)]' : 'border-white'} shadow-lg transition-transform hover:scale-105 active:scale-95 text-white disabled:pointer-events-none disabled:opacity-50 disabled:grayscale`}>
            {timeOfDay === 'night' && !premiumShort && !isOld && <div className="absolute inset-0 rounded-xl bg-white/20 animate-pulse pointer-events-none" />}
            <span className="text-2xl mb-0.5 relative z-10">✨</span>
            <span className="font-bold text-[14px] md:text-[15px] drop-shadow-md tracking-tight text-center relative z-10 leading-tight">고급 영양제<br/><span className="text-[11px] font-semibold opacity-90">쑥쑥 두 배!</span></span>
            {isOld ? (
              <span className="font-bold text-[11px] md:text-[12px] bg-black/30 px-2.5 py-0.5 rounded-full mt-1 relative z-10">🌼 만개 완료</span>
            ) : premiumShort ? (
              <span className="font-bold text-[11px] md:text-[12px] bg-red-500/85 px-2.5 py-0.5 rounded-full mt-1 relative z-10 flex items-center gap-1">🌸 부족해요</span>
            ) : (
              <span className="font-bold text-[12px] md:text-[13px] bg-black/25 px-2.5 py-0.5 rounded-full mt-1 relative z-10 flex items-center gap-1"><Petal className="w-3.5 h-3.5" />40</span>
            )}
          </button>
        </div>
          );
        })()}
      </div>

      {/* Carousel Layer (Z-10) */}
      <div 
        ref={scrollRef}
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseLeave}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        onScroll={handleScroll}
        className="absolute inset-0 z-10 flex overflow-x-auto snap-x snap-mandatory no-scrollbar cursor-grab active:cursor-grabbing"
      >
        {slots.slice(0, Math.min(slots.length, unlockedSlots + 1)).map((slot, idx) => (
          <div key={idx} className="w-screen h-full shrink-0 snap-center relative flex flex-col justify-center pt-44 pb-32 md:pt-48 md:pb-36">
            <div className="w-full max-w-md mx-auto relative flex items-center justify-center">
              {idx >= unlockedSlots ? (
                <div className="relative flex flex-col items-center justify-end h-64 mt-4 mb-2 z-30 -translate-y-[120px] md:-translate-y-[120px] pointer-events-auto">
                  <div className="text-5xl relative z-20 mb-2 opacity-80 drop-shadow-lg">🔒</div>
                  <div className="w-40 md:w-48 rounded-2xl border-4 border-dashed border-[#b9a683]/80 bg-white/45 backdrop-blur-sm flex flex-col items-center justify-center gap-2 shadow-inner px-4 py-5">
                    <span className="text-[#7a5f3e] font-black text-[15px] drop-shadow-sm">잠긴 자리</span>
                    {money >= (SLOT_UNLOCK_PRICE[idx] || 0) ? (
                      <button onClick={buySlot} className="bg-[#a14d68] hover:bg-[#8d3f58] text-white text-[14px] font-black px-4 py-2.5 rounded-full shadow-md flex items-center gap-1.5 active:scale-95 transition-all">
                        <Petal className="w-4 h-4" /> {SLOT_UNLOCK_PRICE[idx]}으로 열기
                      </button>
                    ) : (
                      <div className="flex flex-col items-center gap-1.5">
                        <span className="bg-white/80 text-[#9a8264] text-[13px] font-black px-4 py-2 rounded-full flex items-center gap-1.5 border border-[#d9c8a8]"><Petal className="w-4 h-4" /> {SLOT_UNLOCK_PRICE[idx]} 필요</span>
                        <span className="text-[12px] text-[#8a6d48] font-bold bg-white/60 px-2.5 py-0.5 rounded-full">꽃잎이 모자라요</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : slot ? (
                <>
                  {/* Water Gauge */}
                  <div className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 flex flex-col items-center z-20 pointer-events-none">
                    <div className="w-12 h-12 bg-blue-400 rounded-full border-[3px] border-white flex flex-col items-center justify-center text-white font-bold shadow-md z-10 relative">
                      <Droplet className="w-3.5 h-3.5 mb-0.5 fill-current" />
                      <AnimatedNumber value={slot.waterLevel} className="text-sm leading-none" />
                    </div>
                    <div className="w-5 h-28 bg-white/60 backdrop-blur-sm rounded-full -mt-3 pt-5 pb-1 px-1 shadow-inner relative overflow-hidden">
                      <div className="absolute bottom-1 left-1 right-1 bg-gradient-to-t from-blue-500 to-blue-400 rounded-full transition-all duration-700 ease-out" style={{ height: `calc(${slot.waterLevel}% - 8px)` }}></div>
                    </div>
                  </div>
                  
                  <PlantView plant={slot} onInteract={() => speakWithPlant('쓰다듬기', idx)} onRename={(newName) => handleRenamePlant(idx, newName)} timeOfDay={timeOfDay} careKind={careFx.slot === idx ? careFx.kind : null} careKey={careFx.slot === idx ? careFx.key : 0} />
                </>
              ) : (
                <button onClick={() => setIsShopOpen(true)} className="relative flex flex-col items-center justify-end h-64 mt-4 mb-2 z-30 -translate-y-[120px] md:-translate-y-[120px] pointer-events-auto group cursor-pointer">
                  <div className="text-5xl relative z-20 filter drop-shadow-lg mb-2 opacity-75 group-hover:scale-110 group-active:scale-95 transition-transform">🌱</div>
                  <div className="w-36 md:w-44 h-28 md:h-32 rounded-b-[40px] border-4 border-dashed border-[#c8a86a]/80 bg-white/35 backdrop-blur-sm flex flex-col items-center justify-center gap-1.5 shadow-inner">
                    <span className="text-[#7a5f3e] font-black text-[15px] drop-shadow-sm">빈 화분</span>
                    <span className="bg-[#c8784a] group-hover:bg-[#b96a3e] text-white text-[13px] font-black px-3.5 py-1.5 rounded-full shadow-md transition-colors">+ 씨앗 심기</span>
                  </div>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <Shop isOpen={isShopOpen} onClose={() => setIsShopOpen(false)} onBuySeed={buySeed} money={money} isSlotFull={currentPlant !== null} />
      <EncyclopediaView isOpen={isEncyclopediaOpen} onClose={() => setIsEncyclopediaOpen(false)} entries={encyclopedia} badges={badges} memorials={memorials} />
      <PotShopView isOpen={isPotShopOpen} onClose={() => setIsPotShopOpen(false)} onBuyPot={buyPot} money={money} isSlotEmpty={currentPlant === null} />
    </div>
  );
}
