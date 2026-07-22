import React, { useState, useEffect, useRef, useCallback } from 'react';
import { generateSpawn, generateFeed, getSpecialShopGuppies } from './utils';
import { GuppyResponse, SpawnData } from './types';
import { GuppySVG } from './components/GuppySVG';
import { ShopTab } from "./components/ShopTab";
import { GuppyShopTab } from "./components/GuppyShopTab";
import { ManageTab } from './components/ManageTab';
import { Droplets, Fish, RefreshCw, LayoutGrid, Coins, Store, X, Sun, Moon, Maximize2, Eye, EyeOff, Anchor, Dna, Edit2, Heart, Share2 } from 'lucide-react';
import Petal from './components/Petal';
import { toggleBgm, autoResumeBgm } from './lib/bgm';
import { TANK_SKINS, LIGHT_PRESETS } from './tankSkins';
import { mountButtonSfx } from './lib/sfx';

/* 다시봄 꽃잎 브리지 — 잔액·차감은 서버 권위(dasibom-points.js가 페이지에서 제공) */
const dsb = () => (window as any).DasibomPoints;
/* 교감(터치) 말풍선 — 짧고 애교 있게. 반복 노출 대비 볼륨 확보(2026-07-21) */
const GUPPY_SPEECH = [
  '간지러워요~ 히히', '오늘도 와주셨네요!', '밥… 주실 거예요? 뻐끔', '헤엄 실력 좀 보실래요?',
  '물이 참 좋아요~', '쓰다듬어 주셔서 좋아요', '뻐끔뻐끔… 반가워요!', '숨바꼭질 할까요?',
  '지느러미 예쁘죠?', '오늘 물맛이 최고예요', '같이 놀아요~', '저 여기 있어요!',
  '보고 싶었어요!', '꼬리 흔들기 성공~!', '어항 밖은 어떤가요?', '기포 타고 놀았어요',
  '저 조금 컸죠?', '친구들이랑 경주했어요', '햇살이 따뜻해요', '배가 살짝 고파요…',
  '주무시고 오셨어요?', '저는 늘 여기 있어요~', '손가락 따라갈래요', '물풀 사이가 아늑해요',
  '오늘 기분 최고예요!', '노래 불러드릴까요? 뻐끔뻐끔♪', '반짝반짝 비늘 자랑!', '어제보다 빨라졌어요',
  '심심했는데 잘 오셨어요', '몰래 낮잠 잤어요…', '거품이 간지러워요', '새 친구 데려와 주세요~',
  '푸른 물이 좋아요', '오래오래 같이 살아요', '건강하게 자랄게요!', '쑥쑥 크는 중이에요',
  '어항 청소 고마워요!', '먹이 냄새가 나요…!', '오늘도 평화롭네요~', '제 이름 불러주세요!',
];
/* 어항 정원 상한 — 15마리(2026-07-21 Macho 상향). 30fps 최적화로 저사양 폰 감당 확인 */
const MAX_GUPPIES = 15;

interface GuppyInstance {
  id: string;
  data: SpawnData;
  expression: string | null;
  x: number;
  y: number;
  vx: number;
  vy: number;
  scale: number;
  angle?: number;
  isTurning?: boolean;
  targetFoodId: string | null;
  swimPhase: number;
  isSick?: boolean;
  behavior?: "swim" | "rest";
  restTimer?: number;
  turnTimer?: number;
  timeUntilNextTurn?: number;
  level: number;
  xp: number;
  breedCooldown?: number;
  hasBred?: boolean;
  hunger: number;
  stats: {
    speed: number;
    turnRate: number;
    vision: number;
    reaction: number;
    inheritance: number;
    size: number;
  };
}


interface RippleInstance {
  id: string;
  x: number;
  y: number;
}
interface FoodInstance {
  id: string;
  x: number;
  y: number;
  vy: number;
  type: 'normal' | 'premium' | 'shrimp' | 'krill';
}

interface BubbleInstance {
  id: string;
  x: number;
  y: number;
  vy: number;
  radius: number;
  wobble: number;
  wobbleSpeed: number;
  wobbleOffset: number;
  opacity: number;
}

const themeStyles = {
  Ocean: 'bg-gradient-to-b from-cyan-400 to-blue-600 border-sky-800',
  CoralReef: 'bg-gradient-to-b from-orange-200 to-pink-500 border-pink-700',
  DeepOcean: 'bg-gradient-to-b from-slate-900 to-blue-950 border-slate-950'
};



const TankDecorations = React.memo(({ decorations }: { decorations: string[] }) => {
  return (
    <>
      {decorations.includes('sand_castle') && (
        <div className="absolute bottom-2 left-[50%] -translate-x-1/2 w-40 md:w-56 h-32 md:h-48 pointer-events-none opacity-90 z-0 drop-shadow-md">
          <svg viewBox="0 0 100 100" width="100%" height="100%" preserveAspectRatio="xMidYMax meet">
            <path d="M 10 100 L 90 100 L 80 60 L 20 60 Z" fill="#d4a373" />
            <rect x="30" y="40" width="40" height="20" fill="#cc9a66" />
            <rect x="25" y="30" width="10" height="15" fill="#c28c5a" />
            <rect x="45" y="30" width="10" height="15" fill="#c28c5a" />
            <rect x="65" y="30" width="10" height="15" fill="#c28c5a" />
            <circle cx="50" cy="75" r="10" fill="#1e293b" />
          </svg>
        </div>
      )}
      {decorations.includes('golden_statue') && (
        <div className="absolute bottom-0 left-[35%] w-32 md:w-48 h-32 md:h-48 pointer-events-none opacity-90 z-0 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]">
          <svg viewBox="0 0 100 100" width="100%" height="100%" preserveAspectRatio="xMidYMax meet">
            <path d="M 20 100 L 80 100 L 70 80 L 30 80 Z" fill="#b45309" />
            <rect x="35" y="70" width="30" height="10" fill="#facc15" />
            <path d="M 30 50 Q 50 30 70 50 Q 60 70 30 50" fill="#fef08a" />
            <path d="M 20 40 Q 30 50 20 60 Q 35 50 20 40" fill="#fde047" />
            <path d="M 45 40 Q 50 30 60 40 Q 50 45 45 40" fill="#fde047" />
            <circle cx="60" cy="48" r="2" fill="#854d0e" />
          </svg>
        </div>
      )}
      {decorations.includes('log') && (
        <div className="absolute bottom-4 left-[20%] w-40 md:w-56 h-24 md:h-32 pointer-events-none opacity-90 z-0">
          <svg viewBox="0 0 200 100" width="100%" height="100%" preserveAspectRatio="xMidYMax meet">
            <ellipse cx="100" cy="50" rx="90" ry="30" fill="#78350f" />
            <ellipse cx="100" cy="50" rx="85" ry="25" fill="#92400e" />
            <circle cx="50" cy="50" r="15" fill="#53250a" />
          </svg>
        </div>
      )}
      {decorations.includes('seaweed') && (
        <div className="absolute bottom-0 right-[38%] w-24 md:w-32 h-44 md:h-60 pointer-events-none opacity-85 z-0 animate-sway">
          <svg viewBox="0 0 100 200" width="100%" height="100%" preserveAspectRatio="none">
            <path d="M 30 200 Q 20 150 35 110 T 25 30" fill="none" stroke="#16a34a" strokeWidth="9" strokeLinecap="round" />
            <path d="M 55 200 Q 70 140 50 90 T 65 10" fill="none" stroke="#22c55e" strokeWidth="7" strokeLinecap="round" />
            <path d="M 75 200 Q 60 160 80 120 T 70 50" fill="none" stroke="#15803d" strokeWidth="6" strokeLinecap="round" />
          </svg>
        </div>
      )}
      {decorations.includes('shell_bed') && (
        <div className="absolute bottom-2 left-[58%] w-24 md:w-32 h-16 md:h-24 pointer-events-none opacity-90 z-0 drop-shadow-md">
          <svg viewBox="0 0 100 60" width="100%" height="100%" preserveAspectRatio="xMidYMax meet">
            <path d="M 50 55 C 15 55 10 25 25 12 C 35 4 65 4 75 12 C 90 25 85 55 50 55 Z" fill="#fce7f3" />
            <g stroke="#f9a8d4" strokeWidth="2.5" fill="none">
              <path d="M 50 52 L 50 10" /><path d="M 50 52 L 30 16" /><path d="M 50 52 L 70 16" />
            </g>
            <ellipse cx="50" cy="50" rx="26" ry="7" fill="#fbcfe8" />
            <circle cx="50" cy="42" r="5" fill="#fdf2f8" stroke="#f9a8d4" strokeWidth="1.5" />
          </svg>
        </div>
      )}
      {decorations.includes('stone_tower') && (
        <div className="absolute bottom-2 right-[8%] w-16 md:w-20 h-28 md:h-36 pointer-events-none opacity-90 z-0 drop-shadow-md">
          <svg viewBox="0 0 60 120" width="100%" height="100%" preserveAspectRatio="xMidYMax meet">
            <ellipse cx="30" cy="112" rx="26" ry="8" fill="#475569" />
            <ellipse cx="30" cy="98" rx="20" ry="10" fill="#64748b" />
            <ellipse cx="30" cy="80" rx="16" ry="9" fill="#526075" />
            <ellipse cx="30" cy="64" rx="12" ry="8" fill="#64748b" />
            <ellipse cx="30" cy="50" rx="9" ry="6" fill="#7b8794" />
            <ellipse cx="30" cy="38" rx="6" ry="5" fill="#8e99a8" />
          </svg>
        </div>
      )}
      {decorations.includes('lighthouse') && (
        <div className="absolute bottom-0 left-[4%] w-14 md:w-20 h-36 md:h-48 pointer-events-none opacity-90 z-0 drop-shadow-md">
          <svg viewBox="0 0 60 140" width="100%" height="100%" preserveAspectRatio="xMidYMax meet">
            <path d="M 20 140 L 24 50 L 36 50 L 40 140 Z" fill="#ef4444" />
            <path d="M 22 118 L 38 118 L 38 104 L 22 104 Z" fill="#fef2f2" />
            <path d="M 23 90 L 37 90 L 37 76 L 23 76 Z" fill="#fef2f2" />
            <rect x="22" y="36" width="16" height="14" rx="2" fill="#fbbf24" />
            <path d="M 18 36 L 42 36 L 30 22 Z" fill="#b91c1c" />
            <circle cx="30" cy="43" r="10" fill="#fde68a" opacity="0.55" />
          </svg>
        </div>
      )}
      {decorations.includes('submarine') && (
        <div className="absolute top-[30%] right-[12%] w-24 md:w-32 h-16 md:h-20 pointer-events-none opacity-90 z-0 animate-sway drop-shadow-lg">
          <svg viewBox="0 0 120 60" width="100%" height="100%">
            <ellipse cx="55" cy="35" rx="45" ry="18" fill="#facc15" />
            <rect x="42" y="8" width="22" height="16" rx="6" fill="#eab308" />
            <circle cx="35" cy="35" r="5.5" fill="#7dd3fc" stroke="#a16207" strokeWidth="2" />
            <circle cx="55" cy="35" r="5.5" fill="#7dd3fc" stroke="#a16207" strokeWidth="2" />
            <circle cx="75" cy="35" r="5.5" fill="#7dd3fc" stroke="#a16207" strokeWidth="2" />
            <path d="M 100 30 L 114 22 L 114 48 L 100 40 Z" fill="#eab308" />
            <line x1="53" y1="8" x2="53" y2="2" stroke="#a16207" strokeWidth="2.5" />
            <circle cx="53" cy="1" r="2.5" fill="#ef4444" />
          </svg>
        </div>
      )}
      {decorations.includes('treasure_chest') && (
        <div className="absolute bottom-4 right-[20%] w-32 md:w-40 h-24 md:h-32 pointer-events-none opacity-90 z-0">
          <svg viewBox="0 0 100 100" width="100%" height="100%" preserveAspectRatio="xMidYMax meet">
            <rect x="10" y="40" width="80" height="50" fill="#b45309" />
            <path d="M 10 40 L 50 10 L 90 40 Z" fill="#92400e" />
            <rect x="40" y="40" width="20" height="20" fill="#facc15" />
          </svg>
        </div>
      )}
    </>
  );
});

const SeasonParticles = ({ season }: { season: string }) => {
  const particles = React.useMemo(() => {
    if (season === 'auto' || !season) return [];
    return Array.from({ length: 3 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 15,
      duration: 8 + Math.random() * 12,
      size: 0.6 + Math.random() * 1.2,
      icon: season === 'spring' ? (Math.random() > 0.5 ? '🌸' : '💮') :
            season === 'summer' ? (Math.random() > 0.5 ? '✨' : '⭐') :
            season === 'autumn' ? (Math.random() > 0.5 ? '🍁' : '🍂') : '❄️'
    }));
  }, [season]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
      {particles.map(p => (
        <div 
          key={p.id}
          className="absolute -top-[10%] animate-fall"
          style={{ 
            left: `${p.x}%`, 
            animationDelay: `${p.delay}s`, 
            animationDuration: `${p.duration}s`,
            transform: `scale(${p.size})`
          }}
        >
          {p.icon}
        </div>
      ))}
    </div>
  );
};

export default function App() {
  const [guppies, setGuppiesState] = useState<GuppyInstance[]>([]);
  const [foods, setFoodsState] = useState<FoodInstance[]>([]);
  
  const guppiesRef = useRef<GuppyInstance[]>([]);
  const foodsRef = useRef<FoodInstance[]>([]);
  
  // ★최적화(2026-07-22): 위치는 직접 DOM, 리액트는 모습 변화 때만 — 복귀 후 프리징(15마리×30fps 재조정) 해결
  const guppyElsRef = useRef<Record<string, { root: HTMLDivElement | null; flip: HTMLDivElement | null }>>({});
  const foodElsRef = useRef<Record<string, HTMLDivElement | null>>({});
  const renderSigRef = useRef({ sig: '', at: 0 });
  const bubbleSeeds = useRef(Array.from({ length: 14 }, (_, i) => ({
    left: (i * 7.3 + Math.random() * 5) % 100, dur: 6 + Math.random() * 7,
    delay: Math.random() * 9, r: 3 + Math.random() * 6, op: 0.25 + Math.random() * 0.35,
  }))).current;
  const [testExpression, setTestExpression] = useState<{title: string, desc: string, icon: string} | null>(null);
  const [waterQuality, setWaterQuality] = useState<number>(100);
  const [logs, setLogs] = useState<GuppyResponse[]>([]);
  const [viewMode, setViewMode] = useState<'tank' | 'sprites'>('tank');
  const [selectedGuppyId, setSelectedGuppyId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  useEffect(() => {
    mountButtonSfx();   // 🔘 말랑 버튼음 — 모든 버튼 공통
    autoResumeBgm('/audio/guppy_bgm.mp3', 'guppy_bgm', () => setSoundOn(true));   // '작은 수조 산책' 이어 재생
  }, []);
  const [releaseArm, setReleaseArm] = useState(false);       // 방생 2단 확인 — 실수 방지
  const [editingName, setEditingName] = useState(false);
  const [editNameVal, setEditNameVal] = useState('');
  const [lightingMode, setLightingMode] = useState<string>('day');   // LIGHT_PRESETS 키(2026-07-22 6종 개편)
  const [lightStrength, setLightStrength] = useState<number>(40);    // 조명 강도 10~70%
  const [tankSkin, setTankSkin] = useState<string>('basic');         // TANK_SKINS 키
  const [ownedSkins, setOwnedSkins] = useState<string[]>(['basic']);
    
  const [gold, setGold] = useState<number>(100);
  const [shopTab, setShopTab] = useState<'fish' | 'food' | 'decor'>('food');
  const [selectedFoodType, setSelectedFoodType] = useState<'normal' | 'premium' | 'shrimp' | 'krill'>('normal');
  const [foodInventory, setFoodInventory] = useState({ normal: 50, premium: 0, shrimp: 0, krill: 0 });
  const [foodTechLevel, setFoodTechLevel] = useState<number>(1);
  const foodTechLevelRef = useRef(1);

  useEffect(() => {
    foodTechLevelRef.current = foodTechLevel;
  }, [foodTechLevel]);
  const [decorations, setDecorations] = useState<string[]>([]);
  const [achievements, setAchievements] = useState<string[]>([]);
  // 🌊 떠나보낸 바다(2026-07-22): 방생 기록 — 이름·등급·레벨·색(미니 초상용)·날짜, 최근 60마리
  const [released, setReleased] = useState<{ name: string; rarity: string; level: number; at: number; body: string; tail: string; pattern: string }[]>([]);
  const releasedRef = useRef<typeof released>([]);
  useEffect(() => { releasedRef.current = released; }, [released]);
  const achievementsRef = useRef<string[]>([]);
  const [medicine, setMedicine] = useState<number>(0);
  const medicineRef = useRef(0);
  useEffect(() => { medicineRef.current = medicine; }, [medicine]);
  const [ripples, setRipples] = useState<RippleInstance[]>([]);
  const [toastMessage, setToastMessage] = useState<{title: string, desc: string, icon: string} | null>(null);
  const decorationsRef = useRef<string[]>([]);
  
  useEffect(() => {
    decorationsRef.current = decorations;
  }, [decorations]);
  const [tankTheme, setTankTheme] = useState<'Ocean' | 'CoralReef' | 'DeepOcean'>('Ocean');
  const [showNames, setShowNames] = useState(true);
  const [activeNames, setActiveNames] = useState<Record<string, boolean>>({});
  const [guppySpeech, setGuppySpeech] = useState<Record<string, string>>({});
  const speechTimersRef = useRef<Record<string, any>>({});
  const sayGuppy = (id: string, text?: string) => {
    const line = text || GUPPY_SPEECH[Math.floor(Math.random() * GUPPY_SPEECH.length)];
    setGuppySpeech(prev => ({ ...prev, [id]: line }));
    if (speechTimersRef.current[id]) clearTimeout(speechTimersRef.current[id]);
    speechTimersRef.current[id] = setTimeout(() => {
      setGuppySpeech(prev => { const n = { ...prev }; delete n[id]; return n; });
    }, 3200);
  };

  // ── 다시봄 꽃잎(서버 화폐): 특별 품종·장식 전용. 조개(내부 화폐)와 분리 ──
  const [petals, setPetals] = useState(0);
  useEffect(() => {
    let tries = 0;
    const t = setInterval(() => {
      const P = dsb();
      if (P) { clearInterval(t); P.balance((b: number | null) => { if (b != null) setPetals(b); }); }
      else if (++tries > 60) clearInterval(t);
    }, 200);
    return () => clearInterval(t);
  }, []);
  const spendBusyRef = useRef(false);   // ★결제 연타 잠금 — 중복 결제 방지(2026-07-21)
  const spendPetal = useCallback((item: string, cb: (ok: boolean) => void) => {
    const P = dsb();
    if (!P) { showToast('연결 대기', '잠시 후 다시 시도해 주세요', '🌸'); cb(false); return; }
    if (spendBusyRef.current) { showToast('한 박자만요', '방금 요청을 처리하고 있어요', '⏳'); cb(false); return; }
    spendBusyRef.current = true;
    let settled = false;
    const safety = setTimeout(() => { if (!settled) { settled = true; spendBusyRef.current = false; showToast('연결이 늦어요', '조금 뒤 다시 시도해 주세요', '🌸'); cb(false); } }, 12000);
    P.spend(item, (err: any, d: any) => {
      if (settled) return;
      settled = true; clearTimeout(safety);
      spendBusyRef.current = false;
      if (err || !d || !d.ok) {
        if (d && d.balance != null) setPetals(d.balance);
        showToast('꽃잎이 모자라요', '다른 콘텐츠를 즐기고 친구에게 공유하면 꽃잎이 모여요 🌸', '🌸');
        cb(false); return;
      }
      setPetals(d.balance); cb(true);
    });
  }, []);

  // ── 저장/불러오기(v1: 이 기기) — 원본엔 저장이 아예 없어 새로고침=전멸이었음 ──
  const SAVE_KEY = 'guppy_save_v1';
  const miscRef = useRef<any>({});
  useEffect(() => { miscRef.current = { gold, foodInventory, medicine, tankTheme, waterQuality, lightingMode, showNames, lightStrength, tankSkin, ownedSkins } as any; },
    [gold, foodInventory, medicine, tankTheme, waterQuality, lightingMode, showNames, lightStrength, tankSkin, ownedSkins]);
  const didLoadRef = useRef(false);
  useEffect(() => {
    if (didLoadRef.current) return; didLoadRef.current = true;
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return;
      const sv = JSON.parse(raw);
      if (typeof sv.gold === 'number') setGold(sv.gold);
      if (sv.foodInventory) setFoodInventory(sv.foodInventory);
      if (typeof sv.foodTechLevel === 'number') { setFoodTechLevel(sv.foodTechLevel); foodTechLevelRef.current = sv.foodTechLevel; }
      if (Array.isArray(sv.decorations)) { setDecorations(sv.decorations); decorationsRef.current = sv.decorations; }
      if (Array.isArray(sv.achievements)) { setAchievements(sv.achievements); achievementsRef.current = sv.achievements; }
      if (Array.isArray(sv.released)) { setReleased(sv.released); releasedRef.current = sv.released; }
      if (typeof sv.medicine === 'number') setMedicine(sv.medicine);
      if (sv.tankTheme) setTankTheme(sv.tankTheme);
      if (typeof sv.waterQuality === 'number') setWaterQuality(sv.waterQuality);
      if (sv.lightingMode && LIGHT_PRESETS[sv.lightingMode]) setLightingMode(sv.lightingMode);
      if (typeof sv.lightStrength === 'number') setLightStrength(Math.max(10, Math.min(70, sv.lightStrength)));
      if (sv.tankSkin && TANK_SKINS[sv.tankSkin]) setTankSkin(sv.tankSkin);
      if (Array.isArray(sv.ownedSkins)) setOwnedSkins(Array.from(new Set(['basic', ...sv.ownedSkins])));
      if (Array.isArray(sv.guppies)) {
        const W = typeof window !== 'undefined' ? Math.max(320, window.innerWidth) : 800;
        // 지난 방문 이후 배고파진 만큼 정산(2026-07-22 Macho 확정) — 화분의 '마른 만큼 감소'와 같은 원리.
        // 실제 시간당 6(10분당 1), 바닥 0. 허기 0으로 12시간 넘게 굶으면 병듦(죽음은 없다 — 크릴로 치료).
        const offRate = (Array.isArray(sv.decorations) && sv.decorations.includes('log')) ? 0.9 : 1;
        const offHours = sv.savedAt ? Math.max(0, (Date.now() - sv.savedAt) / 3600000) : 0;
        let newlySick = 0;
        const rev: GuppyInstance[] = sv.guppies.map((g: any) => {
          const h0 = typeof g.hunger === 'number' ? g.hunger : 50;
          const newHunger = Math.max(0, h0 - offHours * 6 * offRate);
          let starveH = g.starveH || 0;
          let sick = !!g.isSick;
          if (newHunger <= 0.5 && offHours > 0) {
            const hoursToZero = Math.max(0, h0 / (6 * offRate));
            starveH += Math.max(0, offHours - hoursToZero);
            if (starveH >= 12 && !sick) { sick = true; newlySick++; }
          }
          return {
            id: g.id, data: g.data, level: g.level || 1, xp: g.xp || 0,
            hunger: newHunger, starveH,
            stats: g.stats || { speed: 1, turnRate: 1, vision: 1, reaction: 1, inheritance: 1, size: 1 },
            expression: null, targetFoodId: null,
            x: 60 + Math.random() * (W - 160), y: 120 + Math.random() * 260,
            vx: (Math.random() - 0.5) * 1.4, vy: (Math.random() - 0.5) * 0.6,
            scale: g.scale || 1, swimPhase: Math.random() * Math.PI * 2,
            isSick: sick, breedCooldown: g.breedCooldown || 0, hasBred: !!g.hasBred
          } as any;
        });
        guppiesRef.current = rev; setGuppiesState(rev);
        if (newlySick > 0) setTimeout(() => showToast('오래 굶어 병이 났어요', '크릴새우를 먹이면 기운을 차려요 🤒', '🦐'), 1200);
      }
    } catch (e) {}
  }, []);
  useEffect(() => {
    const save = () => {
      try {
        const m = miscRef.current;
        localStorage.setItem(SAVE_KEY, JSON.stringify({
          savedAt: Date.now(),
          gold: m.gold, foodInventory: m.foodInventory, medicine: m.medicine,
          tankTheme: m.tankTheme, waterQuality: m.waterQuality,
          lightingMode: m.lightingMode, lightStrength: m.lightStrength,
          tankSkin: m.tankSkin, ownedSkins: m.ownedSkins,
          foodTechLevel: foodTechLevelRef.current,
          decorations: decorationsRef.current,
          achievements: achievementsRef.current,
          released: releasedRef.current.slice(-60),
          guppies: guppiesRef.current.map(g => ({
            id: g.id, data: g.data, level: g.level, xp: g.xp, hunger: g.hunger,
            stats: g.stats, scale: g.scale, isSick: g.isSick, breedCooldown: g.breedCooldown, hasBred: !!(g as any).hasBred,
            starveH: (g as any).starveH || 0
          }))
        }));
      } catch (e) {}
    };
    const cloudPush = () => {
      try {
        const P = dsb() as any; if (!P || !P.saveBlob) return;
        const raw = localStorage.getItem(SAVE_KEY); if (!raw) return;
        P.saveBlob('guppy', JSON.parse(raw), () => { try { localStorage.setItem('guppy_cloud_at', String(Date.now())); } catch (e) {} });
      } catch (e) {}
    };
    let tick = 0;
    const iv = setInterval(() => { save(); if (++tick % 8 === 0) cloudPush(); }, 8000);
    const onHide = () => { save(); cloudPush(); };
    window.addEventListener('pagehide', onHide);
    return () => { clearInterval(iv); window.removeEventListener('pagehide', onHide); };
  }, []);

  // 서버 복원: 서버 저장본이 로컬보다 최신이면(다른 기기) 채택 후 리로드
  useEffect(() => {
    let tries = 0;
    const t = setInterval(() => {
      const P = dsb() as any;
      if (!P || !P.loadBlob) { if (++tries > 100) clearInterval(t); return; }
      clearInterval(t);
      P.loadBlob('guppy', (err: any, blob: any) => {
        if (err || !blob || !blob.data) return;
        let localAt = 0;
        try { localAt = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}').savedAt || 0; } catch (e) {}
        if (blob.savedAt > localAt + 3000 && Array.isArray(blob.data.guppies)) {
          try {
            localStorage.setItem(SAVE_KEY, JSON.stringify({ ...blob.data, savedAt: blob.savedAt }));
            window.location.reload();   // 로드 경로 재사용(가장 안전한 복원)
          } catch (e) {}
        }
      });
    }, 250);
    return () => clearInterval(t);
  }, []);
  const [brightness, setBrightness] = useState<number>(100);
  
  const showToast = (title: string, desc: string, icon: string = '✨') => {
    setToastMessage({ title, desc, icon });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const checkAchievements = (currentGuppies: any[]) => {
    if (currentGuppies.length >= 10 && !achievementsRef.current.includes('10_guppies')) {
      achievementsRef.current.push('10_guppies');
      setAchievements(prev => [...prev, '10_guppies']);
      setFoodInventory(prev => ({ ...prev, shrimp: prev.shrimp + 10 }));
      showToast('대가족', '구피 10마리를 모았습니다! (새우 간식 10개!)', '🐟');
    }
    if (currentGuppies.some(g => g.data.rarity === '전설') && !achievementsRef.current.includes('first_legendary')) {
      achievementsRef.current.push('first_legendary');
      setAchievements(prev => [...prev, 'first_legendary']);
      setFoodInventory(prev => ({ ...prev, krill: prev.krill + 10 }));
      showToast('전설의 시작', '전설 구피를 획득했습니다! (크릴 간식 10개!)', '👑');
    }
  };
  const getInitialSeason = () => {
    const month = new Date().getMonth() + 1;
    if (month >= 3 && month <= 5) return 'spring';
    if (month >= 6 && month <= 8) return 'summer';
    if (month >= 9 && month <= 11) return 'autumn';
    return 'winter';
  };
  const [season, setSeason] = useState<'none' | 'spring' | 'summer' | 'autumn' | 'winter'>(getInitialSeason);
  const [isNight, setIsNight] = useState(() => { const h = new Date().getHours(); return h >= 20 || h < 6; });
  useEffect(() => {
    const t = setInterval(() => {
      const h = new Date().getHours();
      setIsNight(h >= 20 || h < 6);
      setSeason(getInitialSeason());   // 계절도 달력 따라 자동
    }, 600000);
    return () => clearInterval(t);
  }, []);
  const [mainMenuTab, setMainMenuTab] = useState<'tank' | 'manage' | 'guppy_shop' | 'shop'>('tank');
  
  const logEndRef = useRef<HTMLDivElement>(null);
  const tankRef = useRef<HTMLDivElement>(null);
  
  const requestRef = useRef<number>();
  const lastTimeRef = useRef<number>();
  const lastFeedTimeRef = useRef<number>(0);
  const lastNoFoodToastRef = useRef<number>(0);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // (골드 자동 적립 제거 — 꽃잎 단일 화폐, 골드는 저장 호환용으로만 잔존)

  useEffect(() => {
    // Initial Guppy
    if (guppiesRef.current.length === 0) {
      handleSpawn();
      setTimeout(handleSpawn, 200);
      setTimeout(handleSpawn, 400);
    }
  }, []);

  const update = useCallback((time: number) => {
    if (lastTimeRef.current === undefined) {
      lastTimeRef.current = time;
    }
    const dt = Math.min((time - lastTimeRef.current) / 1000, 0.1);
    lastTimeRef.current = time;

    const tankWidth = tankRef.current?.clientWidth || 800;
    const tankHeight = tankRef.current?.clientHeight || 600;

    let currentFoods = [...foodsRef.current];
    let currentGuppies = [...guppiesRef.current];
    // (기포는 CSS 반복 애니로 이전 — 프레임 연산 0)

    // Update foods
    currentFoods = currentFoods.map(f => ({
      ...f,
      y: Math.min(f.y + f.vy * dt, tankHeight - 20)
    })).filter(f => f.y < tankHeight - 10);

    // Breeding check
    const newBabies: GuppyInstance[] = [];
    for (let i = 0; i < currentGuppies.length; i++) {
      if (currentGuppies[i].level < 10 || (currentGuppies[i] as any).hasBred || currentGuppies[i].hunger < 60) continue;   // 만렙+배부름+평생1회
      
      for (let j = i + 1; j < currentGuppies.length; j++) {
        if (currentGuppies[j].level < 10 || (currentGuppies[j] as any).hasBred || currentGuppies[j].hunger < 60) continue;
        
        const dist = Math.hypot(currentGuppies[i].x - currentGuppies[j].x, currentGuppies[i].y - currentGuppies[j].y);
        if (dist < 80 * ((currentGuppies[i].scale + currentGuppies[j].scale) / 2)) { 
          (currentGuppies[i] as any).hasBred = true;   // 평생 한 번 — 부모가 된다 (2026-07-21 Macho 밸런스)
          (currentGuppies[j] as any).hasBred = true;
          currentGuppies[i].expression = '하트';
          currentGuppies[j].expression = '하트';

          setTimeout(() => {
            const idx1 = guppiesRef.current.findIndex(g => g.id === currentGuppies[i].id);
            if (idx1 !== -1 && guppiesRef.current[idx1].expression === '하트') guppiesRef.current[idx1].expression = null;
            const idx2 = guppiesRef.current.findIndex(g => g.id === currentGuppies[j].id);
            if (idx2 !== -1 && guppiesRef.current[idx2].expression === '하트') guppiesRef.current[idx2].expression = null;
          }, 2000);

          const parentA = currentGuppies[i];
          const parentB = currentGuppies[j];

          const traits = ['body_color', 'tail_color', 'pattern_color'] as const;
          const babyData = { ...parentA.data };
          babyData.guppy_name = `${parentA.data.guppy_name.split(' ')[0]}네 아기`;
          
          traits.forEach(trait => {
             const pAInheritance = parentA.stats.inheritance;
             const pBInheritance = parentB.stats.inheritance;
             const total = pAInheritance + pBInheritance;
             const rand = Math.random() * total;
             
             if (rand < pAInheritance) {
               babyData[trait] = parentA.data[trait];
             } else {
               babyData[trait] = parentB.data[trait];
             }

             // 10% mutation chance
             if (Math.random() < 0.1) {
                const colors = ['#f87171', '#60a5fa', '#34d399', '#fbbf24', '#a78bfa', '#ec4899', '#f8fafc', '#1e293b'];
                babyData[trait] = colors[Math.floor(Math.random() * colors.length)];
             }
          });
          
          // Inherit rarity from higher parent with chance to upgrade/downgrade
          const rarities = ['일반', '희귀', '전설'];
          const pAIdx = rarities.indexOf(parentA.data.rarity);
          const pBIdx = rarities.indexOf(parentB.data.rarity);
          let babyRarityIdx = Math.max(pAIdx, pBIdx);
          if (Math.random() < 0.05) babyRarityIdx = Math.min(2, babyRarityIdx + 1); // 5% upgrade
          if (Math.random() < 0.1) babyRarityIdx = Math.max(0, babyRarityIdx - 1); // 10% downgrade
          babyData.rarity = rarities[babyRarityIdx];

          const babyStats = {
            speed: (parentA.stats.speed + parentB.stats.speed) / 2 * (0.9 + Math.random() * 0.2),
            turnRate: (parentA.stats.turnRate + parentB.stats.turnRate) / 2 * (0.9 + Math.random() * 0.2),
            vision: (parentA.stats.vision + parentB.stats.vision) / 2 * (0.9 + Math.random() * 0.2),
            reaction: (parentA.stats.reaction + parentB.stats.reaction) / 2 * (0.9 + Math.random() * 0.2),
            inheritance: Math.floor((parentA.stats.inheritance + parentB.stats.inheritance) / 2 * (0.9 + Math.random() * 0.2)),
            size: (parentA.stats.size + parentB.stats.size) / 2 * (0.9 + Math.random() * 0.2)
          };
          
          babyStats.inheritance = Math.max(10, Math.min(99, babyStats.inheritance));

          if (currentGuppies.length + newBabies.length >= MAX_GUPPIES) continue; // 정원 초과 시 번식 스킵
          newBabies.push({
            id: Math.random().toString(36).substring(2, 9),
            data: babyData,
            expression: '웃음',
            x: (parentA.x + parentB.x) / 2,
            y: (parentA.y + parentB.y) / 2,
            vx: (Math.random() - 0.5) * 100,
            vy: (Math.random() - 0.5) * 100,
            scale: 0.1, // Baby size
            targetFoodId: null,
            swimPhase: Math.random() * 10,
            timeUntilNextTurn: 3,
            level: 1,
            xp: 0,
            hunger: 50,
            stats: babyStats,
            breedCooldown: 0
          });
          
          break; // Parent A breeds only once this frame
        }
      }
    }
    
    if (newBabies.length > 0) {
      currentGuppies.push(...newBabies);
      showToast('아기 구피 탄생! 👶', `${newBabies[0].data.guppy_name}가 태어났어요. 축하해 주세요!`, '💕');
      
      // Update logs for new babies
      setLogs(prev => {
        const newLogs = newBabies.map(b => ({
          guppy_name: b.data.guppy_name,
          rarity: b.data.rarity,
          personality: '태어남!',
          description: '새로운 생명이 태어났습니다.'
        }));
        return [...prev, ...newLogs].slice(-10);
      });
    }

    // Update guppies
    currentGuppies = currentGuppies.map(g => {
      let { x, y, vx, vy, targetFoodId, scale, expression, swimPhase, turnTimer = 0, timeUntilNextTurn = 0, stats, level = 1, xp = 0, breedCooldown = 0, hunger = 100, isSick = false, behavior = 'swim', restTimer = 0 } = g;
      
        let prevVx = vx;
        
        breedCooldown = breedCooldown > 0 ? breedCooldown - dt : 0;
        
        const hungerDecayRate = decorationsRef.current.includes('log') ? 0.9 : 1;   // 🪵 통나무 쉼터: 배고픔 10% 천천히
        // 허기 밸런스(2026-07-22 Macho 확정): 실제 시간당 6(10분당 1) — 8시간 숙면 -48, 16시간 외출 -96.
        hunger = Math.max(0, Math.min(100, hunger - ((dt / 3600) * 6 * hungerDecayRate)));
        // 굶주림 페널티: 허기 0으로 12시간 넘으면 병듦(죽음은 없다 — 크릴로 치료되는 쇠약)
        let starveH = (g as any).starveH || 0;
        if (hunger <= 0.5) {
          starveH += dt / 3600;
          if (starveH >= 12 && !isSick) isSick = true;
        } else if (hunger > 30) { starveH = 0; }
        (g as any).starveH = starveH;

        if (hunger < 20 && Math.random() < 0.0005) isSick = true;
        if (isSick) {
           expression = '슬픔';
           vx *= 0.5;
           vy *= 0.5;
        } else {
           if (Math.random() < 0.001) behavior = behavior === 'swim' ? 'rest' : 'swim';
           if (behavior === 'rest') {
             vx *= 0.95;
             vy *= 0.95;
             // previously it was sinking here, removed to fix guppy sinking issue
           }
        }
        
        // Passive XP: 1 XP per minute
        xp += dt / 60;

        if (!targetFoodId && currentFoods.length > 0 && hunger < 99) {
          let closest = null;
          let minDist = Infinity;
          for (const f of currentFoods) {
            const dx = f.x - x;
            const dy = f.y - y;
            const dist = Math.hypot(dx, dy);
            
            // Check if food is in front
            let isFront = true;
            if (Math.hypot(vx, vy) > 1) {
              const dot = vx * dx + vy * dy;
              if (dot < 0) isFront = false;
            }

            if (dist < minDist && dist < stats.vision && isFront) {
              minDist = dist;
              closest = f;
            }
          }
          if (closest) {
            targetFoodId = closest.id;
          }
        }
        
        if (targetFoodId) {
          const foodIndex = currentFoods.findIndex(f => f.id === targetFoodId);
          if (foodIndex !== -1) {
            const food = currentFoods[foodIndex];
            const dx = food.x - x;
            const dy = food.y - y;
            const dist = Math.hypot(dx, dy);
            
            if (dist < 100 * scale) {
              const foodType = currentFoods[foodIndex].type;
              currentFoods.splice(foodIndex, 1);
              targetFoodId = null;
              
              let baseHunger = 15;
              let expToSet = '웃음';
              
              if (foodType === 'premium') { baseHunger = 25; expToSet = '신남'; }
              else if (foodType === 'shrimp') { baseHunger = 40; expToSet = '반짝'; }
              else if (foodType === 'krill') { baseHunger = 60; expToSet = '크게 웃음'; }
              
              const techMultiplier = 1 + (foodTechLevelRef.current - 1) * 0.15;
              
              // Base XP is flat 30 per food eaten as requested
              
              let earnedXp = foodType === 'krill' ? 120 : foodType === 'shrimp' ? 35 : foodType === 'premium' ? 15 : 2;   // 잎당 XP: 밥40<프50=새우50<크릴80 — 고급식=성장 가성비
              if (decorationsRef.current.includes('neon_crystal')) earnedXp += 5;
              if (decorationsRef.current.includes('autumn_leaves')) earnedXp += 10;
              
              xp += isSick ? Math.round(earnedXp * 0.5) : earnedXp;   // 병든 동안 성장 절반 — 굶주림 페널티
              baseHunger = foodType === 'krill' ? 60 : foodType === 'shrimp' ? 35 : foodType === 'premium' ? 20 : 10;   // 잎당 허기: 밥200>프67>새우50>크릴40 — 밥=배 채우기 가성비
              hunger = Math.min(100, hunger + (baseHunger * techMultiplier));
              
              if (foodType === 'krill') { isSick = false; (g as any).starveH = 0; }   // 크릴=치료(굶주림 누적도 초기화)

              expression = expToSet;
              
              setTimeout(() => {
                 const idx = guppiesRef.current.findIndex(guppy => guppy.id === g.id);
                 if (idx !== -1) {
                   guppiesRef.current[idx].expression = null;
                 }
              }, 2000);
            } else {
              const targetVx = (dx / dist) * (85 * stats.speed);
              const targetVy = (dy / dist) * (85 * stats.speed);
              
              // Smoothly steer towards the food
              const steer = Math.min(1, dt * 3.5);   // 부드러운 조향 — 순간 방향 반전 금지
              vx += (targetVx - vx) * steer;
              vy += (targetVy - vy) * steer;
            }
          } else {
            targetFoodId = null;
          }
        }

        if (!targetFoodId) {
          timeUntilNextTurn -= dt;
          if (timeUntilNextTurn <= 0) {
            const actionType = Math.random();
            if (actionType < 0.2) {
              // Idle / drift
              vx = vx * 0.2;
              vy = vy * 0.2;
              timeUntilNextTurn = 1 + Math.random() * 2;
            } else if (actionType < 0.8) {
              // Normal organic swim
              const swimAngle = Math.random() * Math.PI * 2;
              const speed = (45 + Math.random() * 65) * stats.speed;
              vx = Math.cos(swimAngle) * speed;
              vy = Math.sin(swimAngle) * speed * 0.5; // Flatter movement
              timeUntilNextTurn = (2 + Math.random() * 3) / stats.turnRate;
            } else {
              // Darting
              const dartAngle = Math.random() * Math.PI * 2;
              const speed = (90 + Math.random() * 70) * stats.speed;
              vx = Math.cos(dartAngle) * speed;
              vy = Math.sin(dartAngle) * speed * 0.5;
              timeUntilNextTurn = 0.5 + Math.random();
            }
          }
        }

        // 전역 속도 상한 — 어떤 계산 경로로도 갑자기 튀지 않게
        const spCap = 150 * stats.speed;
        const spd = Math.hypot(vx, vy);
        if (spd > spCap) { vx = (vx / spd) * spCap; vy = (vy / spd) * spCap; }
        const moveSpeedMulti = decorationsRef.current.includes('summer_parasol') ? 1.1 : 1;
        x += vx * moveSpeedMulti * dt;
        y += vy * moveSpeedMulti * dt;

        const padding = 100 * scale;
        if (x < padding) { 
          x = padding; 
          vx = Math.abs(vx) * 0.6; 
          vy += (Math.random() - 0.5) * 40;
          timeUntilNextTurn = Math.random(); 
        }
        if (x > tankWidth - padding) { 
          x = tankWidth - padding; 
          vx = -Math.abs(vx) * 0.6; 
          vy += (Math.random() - 0.5) * 40;
          timeUntilNextTurn = Math.random(); 
        }
        if (y < padding) { 
          y = padding; 
          vy = Math.abs(vy) * 0.6; 
          vx += (Math.random() - 0.5) * 40;
          timeUntilNextTurn = Math.random(); 
        }
        if (y > tankHeight - padding) { 
          y = tankHeight - padding; 
          vy = -Math.abs(vy) * 0.6; 
          vx += (Math.random() - 0.5) * 40;
          timeUntilNextTurn = Math.random(); 
        }

        if (Math.sign(vx) !== Math.sign(prevVx) && prevVx !== 0) {
          turnTimer = 0.5; // 0.5s turn animation
        } else if (turnTimer > 0) {
          turnTimer -= dt;
        }

        swimPhase += dt * (Math.abs(vx) > 10 ? 10 : 3);

        // 성장 밸런스(2026-07-22 Macho): 이동 XP 삭제 — 방치 성장 차단, 먹이(재화)가 성장의 중심.
        // 목표: 하루 꽃잎 5개어치 먹이 기준 만렙까지 12~15일(화분과 동일 호흡).
        const nextLevelXp = level * 100;
        if (level < 10 && xp >= nextLevelXp) {
          xp -= nextLevelXp;
          level += 1;
          stats = {
            ...stats,
            speed: stats.speed * 1.05, // 5% faster
            reaction: stats.reaction * 1.05,
            size: Math.min(stats.size * 1.02, 1.2) // Max absolute size cap at 1.2
          };
          scale = Math.min(scale + 0.02, stats.size); // grow slowly
          expression = '신남';
          if (level === 10) setTimeout(() => showToast('만렙이 됐어요 ✨', `${g.data.guppy_name}이(가) 다 컸어요! 만렙 짝을 만나면 평생 한 번, 아기를 가질 수 있어요 💕`, '🐠'), 0);
          
          setTimeout(() => {
             const idx = guppiesRef.current.findIndex(guppy => guppy.id === g.id);
             if (idx !== -1 && guppiesRef.current[idx].expression === '신남') {
               guppiesRef.current[idx].expression = null;
             }
          }, 2000);
        }

      return { ...g, x, y, vx, vy, targetFoodId, scale, expression, swimPhase, turnTimer, timeUntilNextTurn, stats, level, xp, breedCooldown, hunger, isSick, behavior, restTimer };
    });

    foodsRef.current = currentFoods;
    guppiesRef.current = currentGuppies;
    if (newBabies.length > 0) checkAchievements(currentGuppies);

    // 위치는 리액트를 거치지 않고 DOM에 바로 쓴다(트랜스폼만 — GPU 합성 레이어)
    for (const g of currentGuppies) {
      const els = guppyElsRef.current[g.id];
      if (!els || !els.root) continue;
      els.root.style.transform = `translate3d(${g.x}px, ${g.y}px, 0) translate(-50%, -50%) scale(${g.scale * 1.8})`;
      if (els.flip) els.flip.style.transform = `scaleX(${g.vx < 0 ? 1 : -1}) rotateZ(${-Math.max(-35, Math.min(35, Math.atan2(g.vy, Math.abs(g.vx)) * (180 / Math.PI)))}deg)`;
    }
    for (const f of currentFoods) {
      const el = foodElsRef.current[f.id];
      if (el) el.style.transform = `translate3d(${f.x}px, ${f.y}px, 0) translate(-50%, -50%)`;
    }
    // 리액트 재조정은 '모습이 바뀔 때'(마릿수·먹이 수·표정·질병)와 0.5초 주기로만
    const sig = currentGuppies.length + ':' + currentFoods.length + ':' +
      currentGuppies.map(g => (g.expression || '') + (g.isSick ? '!' : '')).join(',');
    if (sig !== renderSigRef.current.sig || time - renderSigRef.current.at > 500) {
      renderSigRef.current = { sig, at: time };
      setGuppiesState([...currentGuppies]);
      setFoodsState([...currentFoods]);
    }

    requestRef.current = requestAnimationFrame(update);
  }, []);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(update);
    const onVis = () => {
      if (document.visibilityState === 'hidden') {
        if (requestRef.current) { cancelAnimationFrame(requestRef.current); requestRef.current = undefined; }
      } else {
        lastTimeRef.current = undefined;   // 복귀 시 dt 폭주 방지
        if (!requestRef.current) requestRef.current = requestAnimationFrame(update);
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [update]);


  const renameGuppy = (id: string, name: string) => {
    const nm = name.trim(); if (!nm) return;
    const upd = guppiesRef.current.map(g => g.id === id ? { ...g, data: { ...g.data, guppy_name: nm.slice(0, 8) } } : g);
    guppiesRef.current = upd; setGuppiesState(upd);
  };

  const handleCommune = useCallback((id: string) => {
    // 꽃잎 단일화: 교감(쓰다듬기)은 무료 — 손길에 값을 매기지 않는다
    const updated = guppiesRef.current.map(g => g.id === id ? { ...g, xp: g.xp + 1, expression: "신남" } : g);
    guppiesRef.current = updated;
    setGuppiesState(updated);
  }, []);

  const handleRelease = useCallback((id: string, _reward: number) => {
    const g = guppiesRef.current.find(x => x.id === id);
    if (!g) return;
    const lv = g.level, rarity = g.data.rarity;

    // ① 정성 비례 보상: 일반=사료 lv×2 / 희귀 +새우 lv / 전설 +크릴 lv (화폐 직지급 금지 원칙 유지)
    const premium = Math.max(2, lv * 2);
    const shrimp = (rarity === '희귀' || rarity === '전설') ? lv : 0;
    const krill = rarity === '전설' ? lv : 0;
    setFoodInventory(prev => ({ ...prev, premium: prev.premium + premium, shrimp: prev.shrimp + shrimp, krill: prev.krill + krill }));
    const gifts: string[] = ['프리미엄 사료 ' + premium + '개'];
    if (shrimp) gifts.push('새우 간식 ' + shrimp + '개');
    if (krill) gifts.push('황금 크릴 ' + krill + '개');

    // 보너스 드랍 35% + 레벨 보정, 만병통치약 비중 상향
    if (Math.random() < 0.35 + lv * 0.02) {
      const roll = Math.random();
      if (roll < 0.4) { setMedicine(m => m + 1); gifts.push('만병통치약 1개'); }
      else if (roll < 0.7) { setFoodInventory(p => ({ ...p, shrimp: p.shrimp + 3 })); gifts.push('보너스 새우 3개'); }
      else { setFoodInventory(p => ({ ...p, krill: p.krill + 2 })); gifts.push('보너스 크릴 2개'); }
    }

    // ② 만렙 '무지개 배웅': 남은 전원이 가르침을 받는다(+150 XP)
    const isMax = lv >= 10;
    const updated = guppiesRef.current.filter(x => x.id !== id).map(x => isMax ? { ...x, xp: x.xp + 150 } : x);
    guppiesRef.current = updated;
    setGuppiesState(updated);

    // ③ 떠나보낸 바다 기록 + 업적(5·15마리)
    const rec = { name: g.data.guppy_name, rarity, level: lv, at: Date.now(),
      body: g.data.body_color, tail: g.data.tail_color, pattern: g.data.pattern_color };
    setReleased(prev => {
      const next = [...prev, rec].slice(-60);
      releasedRef.current = next;
      if (next.length >= 5 && !achievementsRef.current.includes('release_5')) {
        achievementsRef.current.push('release_5');
        setAchievements(a2 => [...a2, 'release_5']);
        setFoodInventory(p => ({ ...p, shrimp: p.shrimp + 10 }));
        setTimeout(() => showToast('바다의 친구', '다섯 친구를 바다로 보내줬어요 (새우 간식 10개!)', '🌊'), 1200);
      }
      if (next.length >= 15 && !achievementsRef.current.includes('release_15')) {
        achievementsRef.current.push('release_15');
        setAchievements(a2 => [...a2, 'release_15']);
        setFoodInventory(p => ({ ...p, krill: p.krill + 10 }));
        setTimeout(() => showToast('바다의 은인', '열다섯 친구의 새 출발! (황금 크릴 10개!)', '🐋'), 1600);
      }
      return next;
    });

    setToastMessage({
      title: isMax ? '무지개를 건너 바다로 🌈' : g.data.guppy_name + ', 잘 가! 🌊',
      desc: (isMax ? '남은 친구들이 ' + g.data.guppy_name + '의 가르침을 받았어요(모두 성장↑) · ' : '고마움의 선물: ') + gifts.join(', '),
      icon: isMax ? '🌈' : '🎁'
    });
    setTimeout(() => setToastMessage(null), 4500);
  }, []);

  const handleSpawn = (rarity: string = 'normal', isSpecial: boolean = false): SpawnData | null => {
    if (guppiesRef.current.length >= MAX_GUPPIES) {
      showToast('어항이 가득 찼어요', '방생으로 자리를 만들면 새 식구를 들일 수 있어요 (최대 ' + MAX_GUPPIES + '마리)', '🪸');
      return null;
    }
    const isLegendary = rarity === 'legendary';
    
    let fixedColors = undefined;
    const rarityMap: Record<string, '일반' | '희귀' | '전설'> = {
        'normal': '일반',
        'rare': '희귀',
        'legendary': '전설'
    };
    let fixedRarity = rarityMap[rarity] || undefined;
    
    if (isSpecial) {
      const specials = getSpecialShopGuppies();
      if (rarity === 'normal') { fixedColors = specials.normal; }
      if (rarity === 'rare') { fixedColors = specials.rare; }
      if (rarity === 'legendary') { fixedColors = specials.legendary; }
    }

    const res = generateSpawn(isLegendary || decorations.includes('golden_statue'), fixedColors, fixedRarity);
    


    const tankWidth = tankRef.current?.clientWidth || 800;
    const tankHeight = tankRef.current?.clientHeight || 600;
    
    const newGuppy: GuppyInstance = {
      id: Math.random().toString(36).substr(2, 9),
      data: res.data as SpawnData,
      expression: '놀람',
      x: tankWidth / 2 + (Math.random() - 0.5) * 100,
      y: tankHeight / 2 + (Math.random() - 0.5) * 100,
      vx: (Math.random() - 0.5) * 200,
      vy: (Math.random() - 0.5) * 200,
      scale: 0.1,
      angle: Math.atan2((Math.random() - 0.5) * 200, (Math.random() - 0.5) * 200),
      isTurning: false,
      targetFoodId: null,
      swimPhase: Math.random() * 10,
      timeUntilNextTurn: 3 + Math.random() * 3,
      level: 1,
      xp: 0,
      hunger: 50,
      stats: {
        speed: 0.7 + Math.random() * 0.3,      // 0.7 ~ 1.0 (70% ~ 100%)
        turnRate: 0.5 + Math.random() * 1.5,   // 0.5 ~ 2.0
        vision: 150 + Math.random() * 650,     // 150 ~ 800
        reaction: 1.2 + Math.random() * 0.1,   // 1.2 ~ 1.3
        inheritance: Math.floor(10 + Math.random() * 90), // 10 ~ 99
        size: (0.1 + Math.random() * 0.2) // max scale for growth (10% ~ 30%)
      }
    };
    
    setTimeout(() => {
      const idx = guppiesRef.current.findIndex(g => g.id === newGuppy.id);
      if (idx !== -1) guppiesRef.current[idx].expression = null;
    }, 2000);

    guppiesRef.current = [...guppiesRef.current, newGuppy];
    checkAchievements(guppiesRef.current);
    setGuppiesState(guppiesRef.current);
    setLogs(prev => [...prev.slice(-9), res]);
    if (waterQuality < 50) setWaterQuality(100);

    return res.data as SpawnData;
  };

  const handleTankClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (guppiesRef.current.length === 0) return;
    
    // Ignore clicks on guppies
    if ((e.target as HTMLElement).closest('.guppy-container')) return;

    // 급식 딜레이 폐지(2026-07-22 Macho): 먹이는 내 꽃잎으로 산 재화 — 마음껏 후두둑 뿌리는 게 재미.
    // 화면 위 동시 먹이만 30개 상한(저사양 폰 보호 — 초과 탭은 소비 없이 조용히 무시)
    if (foodsRef.current.length >= 30) return;

    if (foodInventory[selectedFoodType] <= 0) {
      const nw = Date.now();
      if (nw - lastNoFoodToastRef.current > 5000) {
        lastNoFoodToastRef.current = nw;
        showToast('먹이가 없어요', '아래 🍚 먹이 상점에서 먹이를 준비할 수 있어요', '🍽️');
      }
      return;
    }
    

    setFoodInventory(prev => ({
      ...prev,
      [selectedFoodType]: prev[selectedFoodType] - 1
    }));
    
    const res = generateFeed();
    
    const rect = e.currentTarget.getBoundingClientRect();
    let clickX = e.clientX - rect.left;
    let clickY = e.clientY - rect.top;
    const tankWidth = rect.width;
    clickX = Math.max(10, Math.min(tankWidth - 10, clickX));
    
    // Add ripple effect
    const rippleId = Math.random().toString(36).substr(2, 9);
    setRipples(prev => [...prev, { id: rippleId, x: clickX, y: clickY }]);
    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== rippleId));
    }, 600); // match animation duration
    
    const newFood: FoodInstance = {
      id: Math.random().toString(36).substr(2, 9),
      x: clickX,
      y: 0,
      vy: 50,
      type: selectedFoodType
    };
    foodsRef.current = [...foodsRef.current, newFood];
    setFoodsState(foodsRef.current);
    
    guppiesRef.current = guppiesRef.current.map(g => {
      if (Math.random() > 0.5) {
        return { ...g, expression: (res.data as any).expression_frame };
      }
      return g;
    });
    
    setTimeout(() => {
      guppiesRef.current = guppiesRef.current.map(g => ({ ...g, expression: null }));
    }, 3000);
    
    // Feeding no longer penalizes water quality to keep the water quality decay cycle strictly 1 hour.
    setLogs(prev => [...prev.slice(-9), res]);
  };

  const handleClean = () => {
    if (waterQuality >= 99.5) { showToast('물이 맑아요', '지금은 청소하지 않아도 괜찮아요 ✨', '💧'); return; }
    setWaterQuality(100);
    showToast('어항 청소 완료', '물이 반짝반짝 깨끗해졌어요!', '🧽');
  };

  useEffect(() => {
    const interval = setInterval(() => {
      if (guppiesRef.current.length > 0) {
        // Natural degradation takes exactly 1 hour (3600 seconds) to go from 100% to 0%.
        // 100% / 3600 = 0.02777...% per second.
        setWaterQuality(prev => Math.max(0, prev - (100 / 3600)));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#eaf2f8] text-slate-800 flex flex-col p-1 sm:p-2 md:p-3 gap-1 sm:gap-2 tracking-tight font-sans font-medium pb-[78px]">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[100] animate-bounce">
          <div className="bg-slate-900/90 backdrop-blur-md rounded-full px-6 py-3 border border-yellow-400/50 shadow-[0_0_20px_rgba(250,204,21,0.3)] flex items-center gap-3">
            <span className="text-2xl">{toastMessage.icon}</span>
            <div className="flex flex-col">
              <span className="text-yellow-300 font-black text-sm">{toastMessage.title}</span>
              <span className="text-white text-xs font-bold">{toastMessage.desc}</span>
            </div>
          </div>
        </div>
      )}

      {/* Top Header Card */}

      <header className="bg-white rounded-2xl px-3 sm:px-4 py-2 shadow-sm flex justify-between items-center gap-2 border border-white/40 mx-1 sm:mx-0">
        <div className="flex items-center gap-2 min-w-0">
          <a href="/" className="shrink-0 flex items-center h-10 px-3 rounded-full bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-600 font-black text-[14px] transition-all">← 홈으로</a>
          <h1 className="font-black text-blue-600 tracking-tight whitespace-nowrap truncate text-[15px] sm:text-xl">
            <span className="sm:hidden">🐠 구피 어항</span><span className="hidden sm:inline">🐠 우리집 구피 어항</span>
          </h1>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="flex items-center gap-1.5 bg-rose-50 text-rose-700 rounded-full px-3 h-10 border border-rose-100 font-black text-[14px]">
            <Petal className="w-4 h-4" /> {petals.toLocaleString()}
          </div>
          <div className="flex items-center gap-1 bg-sky-50 text-sky-700 rounded-full px-3 h-10 border border-sky-100 font-black text-[14px]">
            🐟 {guppies.length}<span className="opacity-60 text-[12px]">/{MAX_GUPPIES}</span>
          </div>
        </div>
      </header>
      {mainMenuTab === 'tank' && (<>

      <main className="flex-1 flex flex-col lg:flex-row gap-2 sm:gap-3 min-h-0">
        <section className="flex-1 flex flex-col relative min-w-0">
          {/* Floating Overlay Controls */}
            {viewMode === 'tank' && (
              <div className="absolute top-2 left-2 right-2 z-50 flex flex-row justify-between items-center gap-1.5 pointer-events-none">
                
                {/* Left: Water Quality & Filter */}
                <div className="flex gap-2 pointer-events-auto shrink-0">
                  <button 
                    onClick={handleClean}
                    className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-black/20 hover:bg-black/30 backdrop-blur-md rounded-full text-white font-black text-xs sm:text-sm shadow-lg border border-white/30 whitespace-nowrap drop-shadow-md transition-colors"
                    title="어항 청소하기"
                  >
                    <Droplets className="w-4 h-4 text-cyan-300 shrink-0" />
                    <span>🧽 {Math.round(waterQuality)}%</span>
                  </button>

                </div>

                {/* Center: Inventory Pills */}
                <div className="flex items-center gap-0.5 bg-black/20 backdrop-blur-md rounded-full p-1 pointer-events-auto border border-white/30 shadow-lg overflow-x-auto [&::-webkit-scrollbar]:hidden min-w-0">
                   <div className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 text-white font-bold text-xs sm:text-sm rounded-full cursor-pointer transition-colors ${selectedFoodType === 'normal' ? 'bg-blue-500/80 shadow-inner border border-blue-400/50' : 'hover:bg-white/10'}`} onClick={() => setSelectedFoodType('normal')}>
                      <span className="text-base sm:text-lg">🪵</span>
                      <span>{foodInventory.normal}</span>
                   </div>
                   <div className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 text-white font-bold text-xs sm:text-sm rounded-full cursor-pointer transition-colors ${selectedFoodType === 'premium' ? 'bg-blue-500/80 shadow-inner border border-blue-400/50' : 'hover:bg-white/10'}`} onClick={() => setSelectedFoodType('premium')}>
                      <span className="text-base sm:text-lg">🍿</span>
                      <span>{foodInventory.premium}</span>
                   </div>
                   <div className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 text-white font-bold text-xs sm:text-sm rounded-full cursor-pointer transition-colors ${selectedFoodType === 'shrimp' ? 'bg-blue-500/80 shadow-inner border border-blue-400/50' : 'hover:bg-white/10'}`} onClick={() => setSelectedFoodType('shrimp')}>
                      <span className="text-base sm:text-lg -mt-0.5">🦐</span>
                      <span>{foodInventory.shrimp}</span>
                   </div>
                   <div className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 text-white font-bold text-xs sm:text-sm rounded-full cursor-pointer transition-colors ${selectedFoodType === 'krill' ? 'bg-blue-500/80 shadow-inner border border-blue-400/50' : 'hover:bg-white/10'}`} onClick={() => setSelectedFoodType('krill')}>
                      <span className="text-base sm:text-lg">👑</span>
                      <span>{foodInventory.krill}</span>
                   </div>
                   {medicine > 0 && (
                     <div className="flex items-center gap-1 px-2 py-1 text-white font-bold text-[13px] rounded-full shrink-0">
                       <span className="text-base">💊</span><span>{medicine}</span>
                     </div>
                   )}
                   <div className="w-px h-5 sm:h-6 bg-white/30 mx-0.5 sm:mx-1 shrink-0"></div>
                   <button onClick={() => setMainMenuTab('shop')} className="flex items-center gap-1 px-2 sm:px-3 py-1 text-yellow-300 font-bold text-xs sm:text-sm rounded-full hover:bg-white/20 transition-colors shrink-0">
                      <span className="text-base sm:text-lg drop-shadow-md">🪙</span>
                      <span className="drop-shadow-md">상점</span>
                   </button>
                </div>

                {/* Right: 어항 설정 */}
                <div className="flex gap-2 pointer-events-auto shrink-0">
                  <button
                    onClick={() => setShowSettings(v => !v)}
                    className={`w-11 h-11 flex items-center justify-center backdrop-blur-md rounded-full text-white shadow-lg border border-white/30 transition-colors text-xl ${showSettings ? 'bg-teal-500/70' : 'bg-black/20 hover:bg-black/30'}`}
                    aria-label="어항 설정"
                  >⚙️</button>
                </div>
              </div>
            )}
            {/* ⚙️ 설정 시트 — 조명·밝기·이름표·꾸미기 (계절은 실제 달력 따라 자동) */}
            {viewMode === 'tank' && showSettings && (
              <div className="absolute top-16 right-2 z-[70] bg-white/95 backdrop-blur-md rounded-2xl p-3.5 shadow-2xl border border-slate-200 w-[252px] flex flex-col gap-3 text-[14px] font-bold text-slate-700">
                <div className="flex flex-col gap-1.5">
                  <span className="text-slate-500">💡 조명</span>
                  <div className="grid grid-cols-3 gap-1">
                    {Object.entries(LIGHT_PRESETS).map(([k, p]) => (
                      <button key={k} onClick={() => setLightingMode(k)}
                        className={`px-1 py-2 rounded-lg text-[13px] ${lightingMode === k ? 'bg-teal-100 text-teal-700 ring-1 ring-teal-300' : 'bg-slate-100 text-slate-500'}`}>
                        {p.name}
                      </button>
                    ))}
                  </div>
                  {lightingMode !== 'day' && (
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-slate-400 text-[12px] shrink-0">은은하게</span>
                      <input type="range" min="10" max="70" value={lightStrength} onChange={(e) => setLightStrength(Number(e.target.value))} className="flex-1 h-2 accent-teal-500" />
                      <span className="text-slate-400 text-[12px] shrink-0">진하게</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-500 shrink-0">🔆 밝기</span>
                  <input type="range" min="40" max="100" value={brightness} onChange={(e) => setBrightness(Number(e.target.value))} className="flex-1 h-2 accent-teal-500" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">🔊 물소리</span>
                  <button onClick={() => setSoundOn(toggleBgm('/audio/guppy_bgm.mp3', 'guppy_bgm'))}
                    className={`px-3 py-2 rounded-lg text-[13px] ${soundOn ? 'bg-teal-100 text-teal-700' : 'bg-slate-100 text-slate-400'}`}>
                    {soundOn ? '보글보글~' : '꺼져 있어요'}
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">🏷️ 이름표</span>
                  <button onClick={() => setShowNames(v => !v)}
                    className={`px-3 py-2 rounded-lg text-[13px] ${showNames ? 'bg-teal-100 text-teal-700' : 'bg-slate-100 text-slate-400'}`}>
                    {showNames ? '보여요' : '숨겼어요'}
                  </button>
                </div>
                <button onClick={() => { setShowSettings(false); setMainMenuTab('shop'); }}
                  className="w-full bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl py-2.5 text-[14px] active:scale-95 transition-transform">🪄 어항 꾸미기</button>
              </div>
            )}
          <div 
            ref={tankRef}
            onClick={viewMode === 'tank' ? handleTankClick : undefined}
            className={`flex-1 min-h-[calc(100dvh-208px)] sm:min-h-[600px] lg:min-h-[700px] rounded-[24px] sm:rounded-[40px] relative overflow-hidden transition-colors duration-500 cursor-crosshair border-8 sm:border-[16px] border-white/20 bg-clip-padding shadow-[inset_0_0_40px_rgba(255,255,255,0.4),inset_0_4px_10px_rgba(255,255,255,0.6),0_20px_40px_rgba(0,0,0,0.15)] backdrop-blur-md ${viewMode === 'tank' ? '' : 'bg-slate-800/95'}`}
            style={viewMode === 'tank' ? { background: (TANK_SKINS[tankSkin] || TANK_SKINS.basic).grad } : undefined}
          >
            {/* Top rounded cover mask to simulate the top border if needed, but rounded-[40px] on the container should suffice */}
            <div className="absolute top-0 left-0 w-full h-8 bg-gradient-to-b from-white/30 to-transparent pointer-events-none z-10"></div>
            
            

            {/* 밤 오버레이 — 실제 시간 따라 어항도 잠든다 */}
            <div className={`absolute inset-0 pointer-events-none transition-colors duration-[3000ms] z-40 ${
              isNight ? 'bg-indigo-950/45' : 'bg-transparent'
            } ${viewMode === 'tank' ? '' : 'hidden'}`} />
            {isNight && viewMode === 'tank' && (
              <div className="absolute top-6 right-8 z-40 pointer-events-none text-3xl opacity-80 drop-shadow-[0_0_12px_rgba(199,210,254,0.8)]">🌙</div>
            )}
            
            {/* Brightness Overlay */}
            <div className={`absolute inset-0 pointer-events-none transition-colors duration-[1000ms] z-40 ${viewMode === 'tank' ? '' : 'hidden'}`} style={{ backgroundColor: `rgba(0, 0, 0, ${1 - brightness / 100})` }} />

            {/* 조명 오버레이 — 그라데이션 프리셋 × 강도 슬라이더(2026-07-22 개편) */}
            <div className={`absolute inset-0 pointer-events-none transition-opacity duration-[1000ms] z-30 ${viewMode === 'tank' ? '' : 'hidden'}`}
              style={{ backgroundImage: (LIGHT_PRESETS[lightingMode] && LIGHT_PRESETS[lightingMode].grad) || 'none', opacity: lightingMode === 'day' ? 0 : lightStrength / 100 * 1.6 }} />

            {/* Special Lighting Decorations */}
            {decorations.includes('led_mood_light') && (
              <div className={`absolute inset-0 pointer-events-none z-30 animate-color-cycle mix-blend-color opacity-30 ${viewMode === 'tank' ? '' : 'hidden'}`} />
            )}
            {decorations.includes('neon_crystal') && (
              <div className={`absolute inset-0 bg-purple-500/30 pointer-events-none z-30 mix-blend-overlay ${viewMode === 'tank' ? '' : 'hidden'}`} />
            )}

            {/* Season Particles */}
            {viewMode === 'tank' && <SeasonParticles season={season} />}
            
            <div className={`absolute inset-0 opacity-20 pointer-events-none ${viewMode === 'tank' ? '' : 'hidden'}`} style={{ backgroundImage: 'radial-gradient(circle at 20% 30%, white 1px, transparent 1px), radial-gradient(circle at 70% 80%, white 2px, transparent 2px)', backgroundSize: '100px 100px' }}></div>
            <div className={`absolute bottom-0 w-full h-16 blur-xl ${viewMode === 'tank' ? 'bg-yellow-200/40' : 'hidden'}`}></div>
            <div className={`absolute inset-0 pointer-events-none transition-colors duration-1000 z-50 ${
              waterQuality < 50 ? 'bg-amber-950/40' : 'bg-transparent'
            } ${viewMode === 'tank' ? '' : 'hidden'}`} />
            
            {viewMode === 'tank' ? (
              <>
                {/* Background Decor - Rocks & Corals */}
                <div className="absolute bottom-0 left-[5%] w-48 md:w-64 h-32 md:h-48 pointer-events-none opacity-80 z-0 drop-shadow-xl">
                  <svg viewBox="0 0 200 150" width="100%" height="100%" preserveAspectRatio="xMidYMax meet">
                    {/* Dark Rock */}
                    <path d="M 0 150 C 30 100, 60 80, 90 100 C 130 120, 160 90, 200 120 L 200 150 Z" fill="#1e293b" />
                    {/* Light Rock */}
                    <path d="M 20 150 C 40 120, 80 110, 110 130 C 140 150, 170 110, 190 130 L 190 150 Z" fill="#334155" />
                    {/* Pink Coral */}
                    <g stroke="#f43f5e" strokeLinecap="round" strokeLinejoin="round" fill="none" className="origin-bottom animate-sway">
                      <path d="M 120 120 Q 110 80 100 90" strokeWidth="8" />
                      <path d="M 120 120 Q 130 70 140 80" strokeWidth="6" />
                      <path d="M 115 100 Q 95 70 105 60" strokeWidth="4" />
                    </g>
                    {/* Orange Tube Coral */}
                    <g fill="#f97316" className="opacity-90">
                      <path d="M 40 150 L 35 110 C 35 105, 45 105, 45 110 L 40 150" />
                      <path d="M 50 150 L 45 90 C 45 85, 55 85, 55 90 L 50 150" />
                      <path d="M 60 150 L 58 115 C 58 110, 65 110, 65 115 L 60 150" />
                    </g>
                  </svg>
                </div>

                <div className="absolute bottom-0 right-[5%] w-56 md:w-72 h-40 md:h-56 pointer-events-none opacity-80 z-0 drop-shadow-xl">
                  <svg viewBox="0 0 200 150" width="100%" height="100%" preserveAspectRatio="xMidYMax meet">
                    {/* Dark Rock */}
                    <path d="M 200 150 C 170 80, 130 60, 100 90 C 60 120, 30 70, 0 110 L 0 150 Z" fill="#0f172a" />
                    {/* Light Rock */}
                    <path d="M 180 150 C 150 100, 110 100, 90 120 C 60 140, 40 100, 10 120 L 10 150 Z" fill="#1e293b" />
                    {/* Purple Coral */}
                    <g stroke="#a855f7" strokeLinecap="round" strokeLinejoin="round" fill="none" className="origin-bottom animate-sway-reverse">
                      <path d="M 140 120 Q 150 70 160 80" strokeWidth="10" />
                      <path d="M 140 120 Q 120 60 110 70" strokeWidth="8" />
                      <path d="M 145 90 Q 170 50 165 40" strokeWidth="6" />
                      <path d="M 130 90 Q 100 40 110 30" strokeWidth="6" />
                    </g>
                    {/* Small Green Plants on Rock */}
                    <g stroke="#22c55e" strokeLinecap="round" fill="none" strokeWidth="3" className="origin-bottom animate-sway">
                      <path d="M 60 115 Q 50 90 55 80" />
                      <path d="M 60 115 Q 65 85 70 80" />
                      <path d="M 60 115 Q 60 80 62 70" />
                    </g>
                  </svg>
                </div>

                {/* Static Aquatic Plants (Background) */}
                <div className="absolute bottom-0 left-[15%] w-24 md:w-32 h-48 md:h-64 pointer-events-none opacity-50 z-0 animate-sway">
                  <svg viewBox="0 0 100 200" width="100%" height="100%" preserveAspectRatio="none">
                    <path d="M 50 200 Q 60 150 40 100 T 50 0" fill="none" stroke="#16a34a" strokeWidth="6" strokeLinecap="round" />
                    <path d="M 50 180 Q 70 140 30 90 T 60 20" fill="none" stroke="#22c55e" strokeWidth="4" strokeLinecap="round" />
                    <path d="M 50 190 Q 30 150 70 100 T 40 30" fill="none" stroke="#15803d" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                </div>
                <div className="absolute bottom-0 right-[25%] w-28 md:w-40 h-60 md:h-80 pointer-events-none opacity-40 z-0 animate-sway-reverse">
                  <svg viewBox="0 0 100 200" width="100%" height="100%" preserveAspectRatio="none">
                    <path d="M 50 200 Q 40 150 70 100 T 40 0" fill="none" stroke="#15803d" strokeWidth="8" strokeLinecap="round" />
                    <path d="M 50 170 Q 20 130 60 80 T 30 10" fill="none" stroke="#16a34a" strokeWidth="5" strokeLinecap="round" />
                    <path d="M 50 180 Q 80 140 40 90 T 70 20" fill="none" stroke="#22c55e" strokeWidth="4" strokeLinecap="round" />
                  </svg>
                </div>
                <div className="absolute bottom-0 left-[45%] w-16 md:w-20 h-32 md:h-40 pointer-events-none opacity-30 z-0 animate-sway">
                  <svg viewBox="0 0 100 200" width="100%" height="100%" preserveAspectRatio="none">
                    <path d="M 50 200 Q 60 160 40 100 T 50 20" fill="none" stroke="#22c55e" strokeWidth="5" strokeLinecap="round" />
                    <path d="M 50 180 Q 30 140 60 90 T 40 30" fill="none" stroke="#4ade80" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                </div>
                
                <TankDecorations decorations={decorations} />
                
                {guppies.map(guppy => (
                  <div 
                    key={guppy.id}
                    className="absolute top-0 left-0 cursor-pointer hover:drop-shadow-[0_0_15px_rgba(255,255,255,0.5)] z-10"
                    ref={(el) => { const m = guppyElsRef.current; (m[guppy.id] = m[guppy.id] || { root: null, flip: null }).root = el; }}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      const idx = guppiesRef.current.findIndex(g => g.id === guppy.id);
                      if (idx !== -1) {
                         const gg = guppiesRef.current[idx];
                         if (gg.isSick) {
                           if (medicineRef.current > 0) {
                             setMedicine(m => m - 1);
                             guppiesRef.current[idx] = { ...gg, isSick: false, expression: '신남' };
                             showToast('약을 먹였어요 💊', `${gg.data.guppy_name}이(가) 금방 기운을 차릴 거예요!`, '🩺');
                           } else {
                             showToast('아파 보여요 🤒', '만병통치약이나 👑크릴 간식을 먹이면 나아요', '💊');
                           }
                         }
                         if (guppiesRef.current[idx].isSick) sayGuppy(guppy.id, '으슬으슬… 몸이 안 좋아요');
                         else sayGuppy(guppy.id);
                         guppiesRef.current[idx].expression = guppiesRef.current[idx].isSick ? '슬픔' : '신남';
                         guppiesRef.current[idx].vx = guppiesRef.current[idx].vx > 0 ? -90 : 90;
                         guppiesRef.current[idx].vy = (Math.random() - 0.5) * 70;
                      }
                      setReleaseArm(false); setEditingName(false);
                      setSelectedGuppyId(guppy.id);
                      setActiveNames(prev => ({ ...prev, [guppy.id]: true }));
                      setTimeout(() => {
                        setActiveNames(prev => ({ ...prev, [guppy.id]: false }));
                      }, 5000);
                    }}
                    style={{
                      transform: `translate3d(${guppy.x}px, ${guppy.y}px, 0) translate(-50%, -50%) scale(${guppy.scale * 1.8})`,
                      width: '240px',
                      height: '240px',
                      willChange: 'transform'
                    }}
                  >
                    <div 
                      className="w-full h-full transition-transform duration-700 ease-in-out"
                      ref={(el) => { const m = guppyElsRef.current; (m[guppy.id] = m[guppy.id] || { root: null, flip: null }).flip = el; }}
                      style={{
                        transform: `scaleX(${guppy.vx < 0 ? 1 : -1}) rotateZ(${-Math.max(-35, Math.min(35, Math.atan2(guppy.vy, Math.abs(guppy.vx)) * (180 / Math.PI)))}deg)`,
                        transformStyle: 'preserve-3d'
                      }}
                    >
                      <GuppySVG 
                        bodyColor={guppy.data.body_color} 
                        tailColor={guppy.data.tail_color} 
                        patternColor={guppy.data.pattern_color}
                        expression={testExpression || guppy.expression || (waterQuality < 30 ? (parseInt(guppy.id, 36) % 2 === 0 ? '슬픔' : '잠') : null)}
                        pose="main"
                      />
                    </div>
                    {guppy.isSick && (
                      <div className="absolute -top-2 left-1/2 z-30 pointer-events-none text-2xl animate-bounce drop-shadow-md"
                        style={{ transform: `translateX(-50%) scale(${1 / (guppy.scale * 1.8)})` }}>🤒</div>
                    )}
                    {guppySpeech[guppy.id] && (
                      <div className="absolute top-4 left-1/2 z-40 pointer-events-none px-3.5 py-2 bg-white/95 rounded-2xl rounded-bl-sm text-[13px] font-bold text-slate-700 shadow-xl whitespace-nowrap border border-sky-100"
                        style={{ transform: `translateX(-50%) translateY(-100%) scale(${1 / (guppy.scale * 1.8)})` }}>
                        {guppySpeech[guppy.id]}
                      </div>
                    )}
                    {(showNames || activeNames[guppy.id] || selectedGuppyId === guppy.id) && (
                      <div 
                        className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-3 py-1.5 flex items-center justify-center bg-black/30 backdrop-blur-md rounded-full text-center whitespace-nowrap z-20 pointer-events-none transition-colors shadow-lg border border-white/20"
                        style={{ 
                          transform: `scale(${1 / (guppy.scale * 1.8)})`,
                          backgroundColor: selectedGuppyId === guppy.id ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)',
                          border: selectedGuppyId === guppy.id ? '1px solid rgba(255, 255, 255, 0.7)' : '1px solid rgba(255,255,255,0.2)'
                        }}
                      >
                        <span className="text-[10px] sm:text-xs font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] leading-none">{guppy.data.guppy_name}</span>
                      </div>
                    )}
                  </div>
                ))}

                {ripples.map(ripple => (
                  <div
                    key={ripple.id}
                    className="absolute rounded-full border-2 border-white/50 bg-white/20 pointer-events-none z-20 animate-[ping_0.6s_ease-out_forwards]"
                    style={{
                      left: ripple.x,
                      top: ripple.y,
                      transform: 'translate(-50%, -50%)',
                      width: '20px',
                      height: '20px',
                    }}
                  />
                ))}
                {foods.map(food => (
                  <div 
                    key={food.id}
                    className={`absolute top-0 left-0 w-2 h-2 rounded-full border-2 shadow-md transition-transform duration-75 ${
                      food.type === 'premium' 
                        ? 'bg-pink-500 border-pink-300 drop-shadow-[0_0_8px_rgba(236,72,153,0.8)] animate-pulse' 
                        : 'bg-yellow-600 border-yellow-800'
                    }`}
                    ref={(el) => { foodElsRef.current[food.id] = el; }}
                    style={{ transform: `translate3d(${food.x}px, ${food.y}px, 0) translate(-50%, -50%)`, willChange: 'transform' }}
                  />
                ))}

                {/* 기포: CSS 반복 애니(프레임 연산 0) — 시드 고정 14개 무한 상승(2026-07-22 최적화) */}
                {bubbleSeeds.map((b, i) => (
                  <div key={i}
                    className="absolute rounded-full border border-white/40 bg-white/10 pointer-events-none shadow-[inset_2px_2px_4px_rgba(255,255,255,0.4)]"
                    style={{ left: b.left + '%', bottom: '-24px', width: (b.r * 2) + 'px', height: (b.r * 2) + 'px', opacity: b.op,
                      animation: `bubbleRise ${b.dur.toFixed(1)}s linear ${b.delay.toFixed(1)}s infinite`, willChange: 'transform' }} />
                ))}

                {guppies.length === 0 && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none text-center p-4">
                    <div className="text-7xl mb-4 drop-shadow-lg animate-bounce">🫧</div>
                    <h3 className="text-xl font-black text-white drop-shadow-md mb-1">어항이 조용하네요</h3>
                    <p className="text-[14px] font-bold text-sky-100 mb-5">첫 식구를 맞아볼까요?</p>
                    <button onClick={(e) => { e.stopPropagation(); setMainMenuTab('guppy_shop'); }}
                      className="pointer-events-auto bg-white/95 hover:bg-white text-sky-700 font-black px-6 py-3.5 rounded-full shadow-xl text-[15px] active:scale-95 transition-all">
                      🐠 구피 입양하러 가기
                    </button>
                  </div>
                )}

                {selectedGuppyId && (() => {
                  const sel = guppies.find(g => g.id === selectedGuppyId);
                  if (!sel) return null;
                  const rawGold = sel.level * 50 * (sel.data.rarity === '전설' ? 5 : sel.data.rarity === '희귀' ? 2 : 1) + Math.floor(sel.stats.speed * 50);
                  return (
                  <div
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[60] pointer-events-auto bg-black/75 backdrop-blur-xl rounded-3xl p-5 border border-white/20 shadow-2xl w-[86vw] max-w-[300px]"
                    onClick={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    <div className="flex justify-between items-center mb-2.5 gap-2">
                      {editingName ? (
                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                          <input autoFocus value={editNameVal} onChange={(e) => setEditNameVal(e.target.value)} maxLength={8}
                            className="flex-1 min-w-0 bg-white/15 text-white font-bold rounded-lg px-2 py-2 outline-none border border-white/30 text-[15px]" />
                          <button onClick={() => { renameGuppy(sel.id, editNameVal); setEditingName(false); }}
                            className="shrink-0 bg-emerald-500/85 text-white font-black px-3 py-2 rounded-lg text-[13px]">저장</button>
                        </div>
                      ) : (
                        <h3 className="font-black text-white text-[17px] flex items-center gap-2 min-w-0">
                          <span className="truncate">{sel.data.guppy_name}</span>
                          <button onClick={() => { setEditNameVal(sel.data.guppy_name); setEditingName(true); }}
                            className="shrink-0 w-9 h-9 grid place-items-center bg-white/10 hover:bg-white/20 rounded-full text-white/70" aria-label="이름 바꾸기">
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </h3>
                      )}
                      <button
                        onClick={() => setSelectedGuppyId(null)}
                        onPointerDown={(e) => { e.stopPropagation(); setSelectedGuppyId(null); }}
                        className="shrink-0 w-10 h-10 flex items-center justify-center text-white/60 hover:text-white bg-white/5 hover:bg-white/10 rounded-full text-xl"
                      >&times;</button>
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between items-center bg-white/5 p-2 rounded-lg mb-1">
                        <span className="text-white font-bold">Lv.{sel.level}</span>
                        <div className="flex-1 mx-3 bg-black/50 h-2 rounded-full overflow-hidden">
                          <div className="h-full bg-sky-400 rounded-full" style={{ width: `${Math.min(100, (sel.xp / (sel.level * 100)) * 100)}%` }} />
                        </div>
                      </div>
                      <div className="flex justify-between items-center"><span className="text-sky-300 text-[13px] font-bold">품종</span>
                        <span className={`text-[13px] font-bold px-2 py-0.5 rounded-full ${sel.data.rarity === '전설' ? 'bg-pink-500/20 text-pink-300' : sel.data.rarity === '희귀' ? 'bg-yellow-500/20 text-yellow-300' : 'bg-white/10 text-white'}`}>{sel.data.rarity}</span></div>
                      <div className="flex justify-between items-center"><span className="text-sky-300 text-[13px] font-bold">배부름</span><span className="font-bold text-white text-[13px]">{Math.floor(sel.hunger)}%</span></div>
                      <div className="flex justify-between items-center"><span className="text-sky-300 text-[13px] font-bold">눈썰미</span><span className="font-bold text-white text-[13px]">{Math.round((sel.stats.vision / 800) * 100)}%</span></div>
                      <div className="flex justify-between items-center"><span className="text-sky-300 text-[13px] font-bold">헤엄 실력</span><span className="font-bold text-white text-[13px]">{Math.round(sel.stats.speed * 100)}%</span></div>
                      <div className="flex justify-between items-center"><span className="text-sky-300 text-[13px] font-bold">몸집</span><span className="font-bold text-white text-[13px]">{Math.round((sel.stats.size / 0.3) * 100)}%</span></div>
                      {sel.isSick && (
                        <div className="bg-red-500/20 border border-red-400/30 rounded-lg p-2 text-center text-red-200 text-[13px] font-bold">🤒 아파요 — 약이나 👑크릴을 먹여 주세요</div>
                      )}
                      <div className="flex flex-col mt-1 bg-white/5 p-2 rounded-lg border border-white/5">
                        <span className="text-sky-300 text-[11px] mb-1 font-bold">타고난 재주</span>
                        <span className="font-bold text-white text-[13px] mb-0.5">
                          {sel.data.rarity === '전설' ? '✨ 물살을 가르는 명수' : sel.data.rarity === '희귀' ? '✨ 반짝이는 비늘' : '✨ 씩씩한 헤엄'}
                        </span>
                        <span className="text-[12px] text-white/70 leading-tight">
                          {sel.data.rarity === '전설' ? '어떤 물살도 거뜬해요. 남들보다 빨리 자라요.' : sel.data.rarity === '희귀' ? '먹이를 잘 찾고 눈치가 빨라요.' : '건강하게 무럭무럭 자라요.'}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          if (!releaseArm) { setReleaseArm(true); setTimeout(() => setReleaseArm(false), 4000); return; }
                          setReleaseArm(false); setSelectedGuppyId(null);
                          handleRelease(sel.id, rawGold);
                        }}
                        className={`mt-2 w-full font-bold py-3 rounded-xl transition-colors text-[13px] border ${releaseArm ? 'bg-red-500/60 border-red-400 text-white' : 'bg-red-500/15 hover:bg-red-500/30 border-red-500/30 text-red-200'}`}
                      >
                        {releaseArm ? '정말 보내줄까요? 한 번 더 누르면 떠나요 🌊' : '자연으로 방생하기'}
                      </button>
                    </div>
                  </div>
                  );
                })()}

                {/* Removed Feed Button */}
              </>
            ) : null}
          </div>
        </section>
      </main>

      </>)}
      {mainMenuTab === "manage" && (
        <ManageTab
          guppies={guppies}
          gold={gold}
          onCommune={handleCommune}
          onRelease={handleRelease}
          released={released}
        />
      )}
      {mainMenuTab === "guppy_shop" && (
        <GuppyShopTab 
          spendPetal={spendPetal}
          petals={petals}
          tankFull={guppies.length >= MAX_GUPPIES}
          onTankFull={() => showToast('어항이 가득 찼어요', '방생으로 자리를 만들면 새 식구를 들일 수 있어요 (최대 ' + MAX_GUPPIES + '마리)', '🪸')}

          gold={gold}
          setGold={setGold}
          onSpawn={handleSpawn}
        />
      )}
      {mainMenuTab === "shop" && (
        <ShopTab
          spendPetal={spendPetal}
          showToast={showToast}
          tankSkin={tankSkin}
          setTankSkin={setTankSkin}
          ownedSkins={ownedSkins}
          setOwnedSkins={setOwnedSkins}
          petals={petals}

          gold={gold}
          setGold={setGold}
          shopTab={shopTab}
          setShopTab={setShopTab}
          foodInventory={foodInventory}
          setFoodInventory={setFoodInventory}
          foodTechLevel={foodTechLevel}
          setFoodTechLevel={setFoodTechLevel}
          decorations={decorations}
          setDecorations={setDecorations}
          onSpawn={handleSpawn}
        />
      )}

      {/* 하단 고정 탭 — 엄지가 닿는 곳(모바일 우선) */}
      <nav className="fixed bottom-0 left-0 right-0 z-[85] bg-white border-t-2 border-slate-200 flex justify-around items-stretch shadow-[0_-8px_24px_rgba(0,0,0,0.10)]" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {([
          { k: 'tank', icon: '🐠', label: '내 어항' },
          { k: 'manage', icon: '💚', label: '생물 관리' },
          { k: 'guppy_shop', icon: '🐟', label: '구피 상점' },
          { k: 'shop', icon: '🍚', label: '먹이 상점' },
        ] as const).map(t => (
          <button key={t.k} onClick={() => setMainMenuTab(t.k)}
            className={`flex-1 min-h-[60px] flex flex-col items-center justify-center gap-0.5 font-black text-[13px] transition-colors ${mainMenuTab === t.k ? 'text-teal-600' : 'text-slate-400'}`}>
            <span className="text-[20px] leading-none">{t.icon}</span>
            {t.label}
            <div className={`w-8 h-1 rounded-full mt-0.5 ${mainMenuTab === t.k ? 'bg-teal-500' : 'bg-transparent'}`} />
          </button>
        ))}
      </nav>
    </div>
  );
}
