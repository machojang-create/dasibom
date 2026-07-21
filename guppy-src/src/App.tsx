import React, { useState, useEffect, useRef, useCallback } from 'react';
import { generateSpawn, generateFeed, getSpecialShopGuppies } from './utils';
import { GuppyResponse, SpawnData } from './types';
import { GuppySVG } from './components/GuppySVG';
import { ShopTab } from "./components/ShopTab";
import { GuppyShopTab } from "./components/GuppyShopTab";
import { ManageTab } from './components/ManageTab';
import { Droplets, Fish, RefreshCw, LayoutGrid, Coins, Store, X, Sun, Moon, Maximize2, Eye, EyeOff, Anchor, Dna, Edit2, Heart, Share2 } from 'lucide-react';
import Petal from './components/Petal';

/* 다시봄 꽃잎 브리지 — 잔액·차감은 서버 권위(dasibom-points.js가 페이지에서 제공) */
const dsb = () => (window as any).DasibomPoints;
/* 어항 정원 — 성능(저사양 폰)과 시각적 쾌적함을 위한 상한. 넘치면 방생으로 자리 마련 */
const MAX_GUPPIES = 10;

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
  const [bubbles, setBubblesState] = useState<BubbleInstance[]>([]);
  
  const guppiesRef = useRef<GuppyInstance[]>([]);
  const foodsRef = useRef<FoodInstance[]>([]);
  const bubblesRef = useRef<BubbleInstance[]>([]);
  
  const frameParityRef = useRef(false);
  const [testExpression, setTestExpression] = useState<{title: string, desc: string, icon: string} | null>(null);
  const [waterQuality, setWaterQuality] = useState<number>(100);
  const [logs, setLogs] = useState<GuppyResponse[]>([]);
  const [viewMode, setViewMode] = useState<'tank' | 'sprites'>('tank');
  const [selectedGuppyId, setSelectedGuppyId] = useState<{title: string, desc: string, icon: string} | null>(null);
  const [lightingMode, setLightingMode] = useState<'day' | 'sunset' | 'night' | 'blue' | 'yellow'>('day');
    
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
  const achievementsRef = useRef<string[]>([]);
  const [medicine, setMedicine] = useState<number>(0);
  const [ripples, setRipples] = useState<RippleInstance[]>([]);
  const [toastMessage, setToastMessage] = useState<{title: string, desc: string, icon: string} | null>(null);
  const decorationsRef = useRef<string[]>([]);
  
  useEffect(() => {
    decorationsRef.current = decorations;
  }, [decorations]);
  const lightingFilter = lightingMode === 'blue' ? 'blue' : lightingMode === 'yellow' ? 'yellow' : 'none';
  const [tankTheme, setTankTheme] = useState<'Ocean' | 'CoralReef' | 'DeepOcean'>('Ocean');
  const [showNames, setShowNames] = useState(true);
  const [activeNames, setActiveNames] = useState<Record<string, boolean>>({});

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
  const spendPetal = useCallback((item: string, cb: (ok: boolean) => void) => {
    const P = dsb();
    if (!P) { showToast('연결 대기', '잠시 후 다시 시도해 주세요', '🌸'); cb(false); return; }
    P.spend(item, (err: any, d: any) => {
      if (err || !d || !d.ok) {
        if (d && d.balance != null) setPetals(d.balance);
        showToast('꽃잎이 모자라요', '다른 콘텐츠를 즐기고 친구에게 공유하면 꽃잎이 모여요 🌸', '🐚');
        cb(false); return;
      }
      setPetals(d.balance); cb(true);
    });
  }, []);

  // ── 저장/불러오기(v1: 이 기기) — 원본엔 저장이 아예 없어 새로고침=전멸이었음 ──
  const SAVE_KEY = 'guppy_save_v1';
  const miscRef = useRef<any>({});
  useEffect(() => { miscRef.current = { gold, foodInventory, medicine, tankTheme, waterQuality, lightingMode, showNames }; },
    [gold, foodInventory, medicine, tankTheme, waterQuality, lightingMode, showNames]);
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
      if (typeof sv.medicine === 'number') setMedicine(sv.medicine);
      if (sv.tankTheme) setTankTheme(sv.tankTheme);
      if (typeof sv.waterQuality === 'number') setWaterQuality(sv.waterQuality);
      if (Array.isArray(sv.guppies)) {
        const W = typeof window !== 'undefined' ? Math.max(320, window.innerWidth) : 800;
        const rev: GuppyInstance[] = sv.guppies.map((g: any) => ({
          id: g.id, data: g.data, level: g.level || 1, xp: g.xp || 0,
          hunger: typeof g.hunger === 'number' ? g.hunger : 50,
          stats: g.stats || { speed: 1, turnRate: 1, vision: 1, reaction: 1, inheritance: 1, size: 1 },
          expression: null, targetFoodId: null,
          x: 60 + Math.random() * (W - 160), y: 120 + Math.random() * 260,
          vx: (Math.random() - 0.5) * 1.4, vy: (Math.random() - 0.5) * 0.6,
          scale: g.scale || 1, swimPhase: Math.random() * Math.PI * 2,
          isSick: !!g.isSick, breedCooldown: g.breedCooldown || 0
        }));
        guppiesRef.current = rev; setGuppiesState(rev);
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
          foodTechLevel: foodTechLevelRef.current,
          decorations: decorationsRef.current,
          achievements: achievementsRef.current,
          guppies: guppiesRef.current.map(g => ({
            id: g.id, data: g.data, level: g.level, xp: g.xp, hunger: g.hunger,
            stats: g.stats, scale: g.scale, isSick: g.isSick, breedCooldown: g.breedCooldown
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
  const [mainMenuTab, setMainMenuTab] = useState<'tank' | 'manage' | 'guppy_shop' | 'shop'>('tank');
  
  const logEndRef = useRef<HTMLDivElement>(null);
  const tankRef = useRef<HTMLDivElement>(null);
  
  const requestRef = useRef<number>();
  const lastTimeRef = useRef<number>();
  const lastFeedTimeRef = useRef<number>(0);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  useEffect(() => {
    const interval = setInterval(() => {
      setGold(prev => {
        let earned = 0;
        guppiesRef.current.forEach(g => {
          earned += g.level * 2;
        });
        
        if (decorationsRef.current.includes('spring_tree')) earned += (10 / 720);
        if (decorationsRef.current.includes('summer_bar')) earned += (20 / 720);
        if (decorationsRef.current.includes('winter_tree')) earned += (30 / 720);
        
        return prev + earned;
      });
    }, 5000); // Earn gold every 5 seconds based on guppy levels
    
    return () => clearInterval(interval);
  }, []);

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
    let currentBubbles = [...bubblesRef.current];

    // Spawn bubbles
    if (Math.random() < 0.03 && currentBubbles.length < 22) {
      currentBubbles.push({
        id: Math.random().toString(36).substr(2, 9),
        x: Math.random() * tankWidth,
        y: tankHeight + 10,
        vy: 50 + Math.random() * 50,
        radius: 2 + Math.random() * 6,
        wobble: 10 + Math.random() * 20,
        wobbleSpeed: 2 + Math.random() * 3,
        wobbleOffset: Math.random() * Math.PI * 2,
        opacity: 0.3 + Math.random() * 0.4
      });
    }

    // Update bubbles
    currentBubbles = currentBubbles.map(b => ({
      ...b,
      y: b.y - b.vy * dt,
      x: b.x + Math.sin(time / 1000 * b.wobbleSpeed + b.wobbleOffset) * b.wobble * dt
    })).filter(b => b.y > -20);

    // Update foods
    currentFoods = currentFoods.map(f => ({
      ...f,
      y: Math.min(f.y + f.vy * dt, tankHeight - 20)
    })).filter(f => f.y < tankHeight - 10);

    // Breeding check
    const newBabies: GuppyInstance[] = [];
    for (let i = 0; i < currentGuppies.length; i++) {
      if (currentGuppies[i].level < 5 || (currentGuppies[i].breedCooldown || 0) > 0) continue;
      
      for (let j = i + 1; j < currentGuppies.length; j++) {
        if (currentGuppies[j].level < 5 || (currentGuppies[j].breedCooldown || 0) > 0) continue;
        
        const dist = Math.hypot(currentGuppies[i].x - currentGuppies[j].x, currentGuppies[i].y - currentGuppies[j].y);
        if (dist < 80 * ((currentGuppies[i].scale + currentGuppies[j].scale) / 2)) { 
          currentGuppies[i].breedCooldown = 60; // 60 seconds cooldown
          currentGuppies[j].breedCooldown = 60;
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
          babyData.guppy_name = `Baby of ${parentA.data.guppy_name.split(' ')[0]} & ${parentB.data.guppy_name.split(' ')[0]}`;
          
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
        
        const hungerDecayRate = decorationsRef.current.includes('spring_mat') ? 0.85 : 1;
        hunger = Math.max(0, Math.min(100, hunger - ((dt / 60) * (1 / 10) * hungerDecayRate))); // Decrease by 1 per 10 minutes

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
              
              let earnedXp = foodType === 'krill' ? 100 : foodType === 'shrimp' ? 30 : foodType === 'premium' ? 15 : 5;
              if (decorationsRef.current.includes('neon_crystal')) earnedXp += 5;
              if (decorationsRef.current.includes('autumn_leaves')) earnedXp += 10;
              
              xp += earnedXp;
              baseHunger = foodType === 'krill' ? 50 : foodType === 'shrimp' ? 25 : foodType === 'premium' ? 15 : 10;
              hunger = Math.min(100, hunger + (baseHunger * techMultiplier));
              
              if (foodType === 'krill') isSick = false;

              expression = expToSet;
              
              setTimeout(() => {
                 const idx = guppiesRef.current.findIndex(guppy => guppy.id === g.id);
                 if (idx !== -1) {
                   guppiesRef.current[idx].expression = null;
                 }
              }, 2000);
            } else {
              const targetVx = (dx / dist) * (100 * stats.speed * stats.reaction);
              const targetVy = (dy / dist) * (100 * stats.speed * stats.reaction);
              
              // Smoothly steer towards the food
              vx = targetVx;
              vy = targetVy;
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
              const speed = (50 + Math.random() * 100) * stats.speed;
              vx = Math.cos(swimAngle) * speed;
              vy = Math.sin(swimAngle) * speed * 0.5; // Flatter movement
              timeUntilNextTurn = (2 + Math.random() * 3) / stats.turnRate;
            } else {
              // Darting
              const dartAngle = Math.random() * Math.PI * 2;
              const speed = (150 + Math.random() * 150) * stats.speed;
              vx = Math.cos(dartAngle) * speed;
              vy = Math.sin(dartAngle) * speed * 0.5;
              timeUntilNextTurn = 0.5 + Math.random();
            }
          }
        }

        const moveSpeedMulti = decorationsRef.current.includes('summer_parasol') ? 1.1 : 1;
        x += vx * moveSpeedMulti * dt;
        y += vy * moveSpeedMulti * dt;

        const padding = 100 * scale;
        if (x < padding) { 
          x = padding; 
          vx = Math.abs(vx) * (0.5 + Math.random()); 
          vy += (Math.random() - 0.5) * 100;
          timeUntilNextTurn = Math.random(); 
        }
        if (x > tankWidth - padding) { 
          x = tankWidth - padding; 
          vx = -Math.abs(vx) * (0.5 + Math.random()); 
          vy += (Math.random() - 0.5) * 100;
          timeUntilNextTurn = Math.random(); 
        }
        if (y < padding) { 
          y = padding; 
          vy = Math.abs(vy) * (0.5 + Math.random()); 
          vx += (Math.random() - 0.5) * 100;
          timeUntilNextTurn = Math.random(); 
        }
        if (y > tankHeight - padding) { 
          y = tankHeight - padding; 
          vy = -Math.abs(vy) * (0.5 + Math.random()); 
          vx += (Math.random() - 0.5) * 100;
          timeUntilNextTurn = Math.random(); 
        }

        if (Math.sign(vx) !== Math.sign(prevVx) && prevVx !== 0) {
          turnTimer = 0.5; // 0.5s turn animation
        } else if (turnTimer > 0) {
          turnTimer -= dt;
        }

        swimPhase += dt * (Math.abs(vx) > 10 ? 10 : 3);

        // XP and Level Up Logic
        const distanceMoved = Math.hypot(vx * dt, vy * dt);
        xp += distanceMoved * 0.05; // Passive XP from movement

        const nextLevelXp = level * 150;
        if (xp >= nextLevelXp) {
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
    bubblesRef.current = currentBubbles;
    
    // 저사양 폰 최적화: 렌더 동기는 2프레임당 1회(30fps). 물리 계산은 ref에서 매 프레임.
    frameParityRef.current = !frameParityRef.current;
    if (frameParityRef.current) {
      setFoodsState(currentFoods);
      setGuppiesState(currentGuppies);
      setBubblesState(currentBubbles);
    }

    requestRef.current = requestAnimationFrame(update);
  }, []);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(update);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [update]);


  const handleCommune = useCallback((id: string) => {
    // 꽃잎 단일화: 교감(쓰다듬기)은 무료 — 손길에 값을 매기지 않는다
    const updated = guppiesRef.current.map(g => g.id === id ? { ...g, xp: g.xp + 1, expression: "신남" } : g);
    guppiesRef.current = updated;
    setGuppiesState(updated);
  }, []);

  const handleRelease = useCallback((id: string, reward: number) => {
    const guppyToRelease = guppiesRef.current.find(g => g.id === id);
    if (!guppyToRelease) return;
    
    // 꽃잎 단일화: 방생 보상은 화폐가 아니라 '떠나며 남긴 먹이'(아이템) — 클라 화폐 발행 금지 원칙
    setFoodInventory(prev => ({ ...prev, premium: prev.premium + Math.max(1, Math.round(reward / 50)) }));
    
    // Calculate extra rewards based on rarity and level
    let extraRewards = [];
    const level = guppyToRelease.level;
    const rarity = guppyToRelease.data.rarity;
    
    const randomChance = Math.random();
    
    // Base drop rate logic
    let dropChance = 0.1; // 10% base
    if (rarity === '희귀') dropChance += 0.15;
    if (rarity === '전설') dropChance += 0.3;
    dropChance += (level * 0.02); // 2% per level
    
    if (randomChance < dropChance) {
      // Determine what item to give
      const itemRoll = Math.random();
      if (rarity === '전설' && itemRoll < 0.4) {
        setFoodInventory(prev => ({...prev, krill: prev.krill + 1}));
        extraRewards.push('특급 크릴새우 x1');
      } else if ((rarity === '전설' || rarity === '희귀') && itemRoll < 0.7) {
        setFoodInventory(prev => ({...prev, shrimp: prev.shrimp + 2}));
        extraRewards.push('건조 생이새우 x2');
      } else if (itemRoll < 0.9) {
        setFoodInventory(prev => ({...prev, premium: prev.premium + 3}));
        extraRewards.push('프리미엄 사료 x3');
      } else {
        setMedicine(prev => prev + 1);
        extraRewards.push('만병통치약 x1');
      }
    }
    
    const updated = guppiesRef.current.filter(g => g.id !== id);
    guppiesRef.current = updated;
    setGuppiesState(updated);
    
    if (extraRewards.length > 0) {
      setToastMessage({
        title: '보너스 아이템 획득!',
        desc: `${guppyToRelease.data.guppy_name} 방생 보답으로 ${extraRewards.join(', ')}를 받았습니다.`,
        icon: '🎁'
      });
      setTimeout(() => setToastMessage(null), 4000);
    } else {
      setToastMessage({
        title: '방생 완료',
        desc: `${guppyToRelease.data.guppy_name}를 자연으로 돌려보냈습니다.`,
        icon: '🌊'
      });
      setTimeout(() => setToastMessage(null), 3000);
    }
  }, []);

  const handleSpawn = (rarity: string = 'normal', isSpecial: boolean = false): SpawnData | null => {
    if (guppiesRef.current.length >= MAX_GUPPIES) {
      showToast('어항이 가득 찼어요', '방생으로 자리를 만들면 새 식구를 들일 수 있어요 (최대 ' + MAX_GUPPIES + '마리)', '🪸');
      return null;
    }
    if (guppiesRef.current.length >= 15) {
      alert("어항이 꽉 찼습니다! (최대 15마리)");
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
    setLogs(prev => [...prev, res]);
    if (waterQuality < 50) setWaterQuality(100);

    return res.data as SpawnData;
  };

  const handleTankClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (guppiesRef.current.length === 0) return;
    
    // Ignore clicks on guppies
    if ((e.target as HTMLElement).closest('.guppy-container')) return;

    const now = Date.now();
    if (now - lastFeedTimeRef.current < 1000) return;

    if (foodInventory[selectedFoodType] <= 0) {
      // Optional UI indication for no food
      return;
    }
    
    lastFeedTimeRef.current = now;

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
    setLogs(prev => [...prev, res]);
  };

  const handleClean = () => {
    const cost = Math.floor(100 - waterQuality);
    if (cost <= 0) return;
    if (gold < cost) {
       alert(`수질 정화 비용이 부족합니다! (필요 골드: ${cost})`);
       return;
    }
    setGold(prev => prev - cost);
    setWaterQuality(100);
    showToast('수질 개선', '수질이 완벽하게 깨끗해졌습니다!', '💧');
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
    <div className="min-h-screen bg-[#eaf2f8] text-slate-800 flex flex-col p-1 sm:p-2 md:p-3 gap-1 sm:gap-2 tracking-tight font-sans font-medium">
      
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

      <header className="bg-white rounded-[24px] sm:rounded-[28px] p-2 sm:p-3 md:px-4 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-2 sm:gap-3 border border-white/40 mx-1 sm:mx-0">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white font-black text-lg shadow-inner border-4 border-orange-100">
            Lv.12
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <h1 className="text-xl md:text-2xl font-bold text-blue-600 tracking-tight">구피 키우기</h1>
              <span className="text-xs font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full font-bold">v1.2.0</span>
            </div>
            <div className="flex items-center gap-2 mt-1 text-sm font-semibold text-slate-500">
              <span>경험치</span>
              <div className="w-32 md:w-48 h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                <div className="h-full bg-orange-500 rounded-full w-[28%]"></div>
              </div>
              <span className="font-mono text-xs">XP 500 / 1800</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-col items-center justify-center bg-rose-50 text-rose-800 rounded-2xl px-5 py-2 border border-rose-100 shadow-sm min-w-[90px]">
            <div className="flex items-center gap-1.5 text-xs text-rose-500 font-bold">
              <Petal className="w-4 h-4" /> 꽃잎
            </div>
            <span className="font-bold text-lg">{petals.toLocaleString()}</span>
          </div>
          
          
          <div className="flex flex-col items-center justify-center bg-pink-50 text-pink-800 rounded-2xl px-5 py-2 border border-pink-100 shadow-sm min-w-[110px]">
            <div className="flex items-center gap-1.5 text-xs text-pink-500 font-bold">
              <span className="text-sm">🐠</span> 보유 생물
            </div>
            <span className="font-bold text-lg">{guppies.length} <span className="text-xs opacity-70">/ {MAX_GUPPIES}마리</span></span>
          </div>
        </div>
      </header>
      {/* Main Menu Tabs */}
      <div className="bg-white rounded-[16px] p-1 shadow-sm flex items-center md:justify-center gap-1 md:gap-2 border border-white/40 overflow-x-auto hide-scrollbar mx-1 sm:mx-0">
        <button onClick={() => setMainMenuTab("tank")} className={`shrink-0 flex-none px-3 md:px-4 py-1.5 rounded-[12px] flex flex-col items-center gap-0.5 transition-colors ${mainMenuTab === "tank" ? "bg-[#c5f1e8] text-teal-800 shadow-sm" : "text-slate-500 hover:bg-slate-50"}`}>
          <Anchor className="w-4 h-4 md:w-5 md:h-5" />
          <span className="font-bold text-[13px] md:text-sm whitespace-nowrap">내 어항 뷰</span>
        </button>
        <button onClick={() => setMainMenuTab("manage")} className={`shrink-0 flex-none px-3 md:px-4 py-1.5 rounded-[12px] flex flex-col items-center gap-0.5 transition-colors ${mainMenuTab === "manage" ? "bg-[#c5f1e8] text-teal-800 shadow-sm" : "text-slate-500 hover:bg-slate-50"}`}>
          <Eye className="w-4 h-4 md:w-5 md:h-5" />
          <span className="font-bold text-[13px] md:text-sm whitespace-nowrap">생물 관리</span>
        </button>
        <button onClick={() => setMainMenuTab("guppy_shop")} className={`shrink-0 flex-none px-3 md:px-4 py-1.5 rounded-[12px] flex flex-col items-center gap-0.5 transition-colors ${mainMenuTab === "guppy_shop" ? "bg-[#c5f1e8] text-teal-800 shadow-sm" : "text-slate-500 hover:bg-slate-50"}`}>
          <Fish className="w-4 h-4 md:w-5 md:h-5" />
          <span className="font-bold text-[13px] md:text-sm whitespace-nowrap">구피 상점</span>
        </button>
        <button onClick={() => setMainMenuTab("shop")} className={`shrink-0 flex-none px-3 md:px-4 py-1.5 rounded-[12px] flex flex-col items-center gap-0.5 transition-colors ${mainMenuTab === "shop" ? "bg-[#c5f1e8] text-teal-800 shadow-sm" : "text-slate-500 hover:bg-slate-50"}`}>
          <Coins className="w-4 h-4 md:w-5 md:h-5" />
          <span className="font-bold text-[13px] md:text-sm whitespace-nowrap">꽃잎 상점</span>
        </button>
      </div>

      {mainMenuTab === 'tank' && (<>

      {/* Control Panel Card */}
      <div className="bg-white rounded-[20px] sm:rounded-[24px] p-2 sm:p-3 shadow-sm flex flex-col xl:flex-row justify-between items-center gap-2 border border-white/40 mx-1 sm:mx-0">
        <div className="flex items-start gap-2 self-start xl:self-center">
          <Droplets className="w-6 h-6 text-blue-400 mt-1 drop-shadow-sm" />
          <div>
            <h2 className="text-lg font-bold text-slate-800 tracking-tight">나의 따뜻한 바다 어항</h2>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
          {/* Lighting */}
          <div className="flex items-center bg-slate-50 rounded-xl p-1 border border-slate-100">
            <span className="text-slate-400 text-[11px] px-2 flex items-center gap-1"><Sun size={12}/>조명</span>
            <button onClick={() => setLightingMode('day')} className={`px-2 py-1 rounded-[10px] shadow-sm border flex items-center gap-1 transition-colors ${lightingMode === 'day' ? 'bg-white text-blue-600 border-slate-100' : 'text-slate-500 hover:text-slate-700 border-transparent'}`}>
              <span>기본</span>
            </button>
            <button onClick={() => setLightingMode('blue')} className={`px-2 py-1 rounded-[10px] transition-colors flex items-center gap-1 ${lightingMode === 'blue' ? 'bg-white shadow-sm border border-slate-100 text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>
              <span className="text-blue-400">🔹</span> 블루
            </button>
            <button onClick={() => setLightingMode('yellow')} className={`px-2 py-1 rounded-[10px] transition-colors flex items-center gap-1 ${lightingMode === 'yellow' ? 'bg-white shadow-sm border border-slate-100 text-yellow-600' : 'text-slate-500 hover:text-slate-700'}`}>
              <span className="text-yellow-400">🔸</span> 노랑
            </button>
          </div>

          {/* Brightness */}
          <div className="flex items-center gap-1.5 bg-slate-50 rounded-xl px-2 py-1 border border-slate-100">
            <span className="text-slate-500 flex items-center gap-1 text-[11px]"><Sun size={12} className="text-orange-400" /> 밝기</span>
            <input 
              type="range" 
              min="0" 
              max="100" 
              value={brightness} 
              onChange={(e) => setBrightness(Number(e.target.value))}
              className="w-20 h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer accent-indigo-500"
            />
            <span className="text-slate-500 font-mono text-xs w-8 text-right">{brightness}%</span>
          </div>

          {/* Season */}
          <div className="flex items-center bg-slate-50 rounded-xl p-1 border border-slate-100">
            <span className="text-slate-400 text-[11px] px-2 flex items-center gap-1"><span>📌</span>계절</span>
            <button onClick={() => setSeason('none')} className={`px-2 py-1 rounded-[10px] transition-colors flex items-center gap-1 ${season === 'none' ? 'bg-white shadow-sm border border-slate-100 text-slate-700 font-bold' : 'text-slate-500 hover:text-slate-700'}`}>
              <span className="text-slate-400">🚫</span> 없음
            </button>
            <button onClick={() => setSeason('spring')} className={`px-2 py-1 rounded-[10px] transition-colors flex items-center gap-1 ${season === 'spring' ? 'bg-white shadow-sm border border-slate-100 text-pink-600' : 'text-slate-500 hover:text-slate-700'}`}>
              <span className="text-pink-400">🌸</span> 봄
            </button>
            <button onClick={() => setSeason('summer')} className={`px-2 py-1 rounded-[10px] transition-colors flex items-center gap-1 ${season === 'summer' ? 'bg-white shadow-sm border border-slate-100 text-yellow-600' : 'text-slate-500 hover:text-slate-700'}`}>
              <span className="text-yellow-500">🌻</span> 여름
            </button>
            <button onClick={() => setSeason('autumn')} className={`px-2 py-1 rounded-[10px] transition-colors flex items-center gap-1 ${season === 'autumn' ? 'bg-white shadow-sm border border-slate-100 text-orange-600' : 'text-slate-500 hover:text-slate-700'}`}>
              <span className="text-orange-600">🍁</span> 가을
            </button>
            <button onClick={() => setSeason('winter')} className={`px-2 py-1 rounded-[10px] transition-colors flex items-center gap-1 ${season === 'winter' ? 'bg-white shadow-sm border border-slate-100 text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>
              <span className="text-blue-300">❄️</span> 겨울
            </button>
          </div>

          {/* Decorate Button */}
          <button 
            onClick={() => setShowNames(!showNames)}
            className={`px-2.5 py-1.5 rounded-xl shadow-sm border flex items-center gap-1 transition-colors ${showNames ? 'bg-white text-slate-700 border-slate-100' : 'bg-slate-200 text-slate-400 border-transparent'}`}
            title="이름 표시"
          >
            {showNames ? <Eye size={16} /> : <EyeOff size={16} />}
            <span className="hidden sm:inline">{showNames ? '이름' : '숨김'}</span>
          </button>
          
          <button 
            onClick={() => setMainMenuTab("shop")}
            className="px-3 py-1.5 bg-white text-emerald-600 border border-emerald-200 hover:bg-emerald-50 rounded-xl shadow-sm flex items-center gap-1.5 transition-colors ml-auto"
          >
            <span className="text-emerald-500">🪄</span>
            <span className="hidden sm:inline">어항 꾸미기</span>
          </button>
        </div>
      </div>

      <main className="flex-1 flex flex-col lg:flex-row gap-2 sm:gap-3 min-h-0">
        <section className="flex-1 flex flex-col relative min-w-0">
          {/* Floating Overlay Controls */}
            {viewMode === 'tank' && (
              <div className="order-2 sm:order-none sm:absolute sm:top-4 sm:left-4 sm:right-4 z-50 flex flex-col sm:flex-row justify-between items-center sm:items-center gap-2 sm:pointer-events-none mt-2 sm:mt-0 w-full shrink-0">
                
                {/* Left: Water Quality & Filter */}
                <div className="flex justify-center sm:justify-start gap-2 pointer-events-auto w-full sm:w-auto overflow-x-auto [&::-webkit-scrollbar]:hidden pb-1 sm:pb-0 shrink-0">
                  <button 
                    onClick={handleClean}
                    className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-black/20 hover:bg-black/30 backdrop-blur-md rounded-full text-white font-black text-xs sm:text-sm shadow-lg border border-white/30 whitespace-nowrap drop-shadow-md transition-colors"
                    title={waterQuality < 100 ? `수질 개선 (비용: ${Math.floor(100 - waterQuality)} 골드)` : '수질이 이미 깨끗합니다'}
                  >
                    <Droplets className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-300 shrink-0" />
                    <span>수질: {waterQuality.toFixed(1)}%</span>
                  </button>

                </div>

                {/* Center: Inventory Pills */}
                <div className="flex justify-center sm:justify-start items-center gap-0.5 sm:gap-1 bg-black/20 backdrop-blur-md rounded-full p-1 sm:p-1.5 pointer-events-auto border border-white/30 shadow-lg w-full sm:w-auto overflow-x-auto [&::-webkit-scrollbar]:hidden shrink-0">
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
                   <div className="w-px h-5 sm:h-6 bg-white/30 mx-0.5 sm:mx-1 shrink-0"></div>
                   <button onClick={() => setMainMenuTab('shop')} className="flex items-center gap-1 px-2 sm:px-3 py-1 text-yellow-300 font-bold text-xs sm:text-sm rounded-full hover:bg-white/20 transition-colors shrink-0">
                      <span className="text-base sm:text-lg drop-shadow-md">🪙</span>
                      <span className="drop-shadow-md">상점</span>
                   </button>
                </div>

                {/* Right: Fullscreen & Time */}
                <div className="hidden sm:flex gap-2 pointer-events-auto">
                  <button 
                    onClick={() => setViewMode(prev => prev === 'tank' ? 'sprites' : 'tank')}
                    className="w-10 h-10 flex items-center justify-center bg-black/20 hover:bg-black/30 backdrop-blur-md rounded-full text-white shadow-lg border border-white/30 transition-colors"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>

                </div>
              </div>
            )}
          <div 
            ref={tankRef}
            onClick={viewMode === 'tank' ? handleTankClick : undefined}
            className={`order-1 sm:order-none flex-1 min-h-[70vh] sm:min-h-[600px] lg:min-h-[700px] rounded-[32px] sm:rounded-[40px] relative overflow-hidden transition-colors duration-500 cursor-crosshair border-8 sm:border-[16px] border-white/20 bg-clip-padding shadow-[inset_0_0_40px_rgba(255,255,255,0.4),inset_0_4px_10px_rgba(255,255,255,0.6),0_20px_40px_rgba(0,0,0,0.15)] backdrop-blur-md ${viewMode === 'tank' ? 'bg-gradient-to-b from-cyan-400/95 to-blue-600/95' : 'bg-slate-800/95'}`}
          >
            {/* Top rounded cover mask to simulate the top border if needed, but rounded-[40px] on the container should suffice */}
            <div className="absolute top-0 left-0 w-full h-8 bg-gradient-to-b from-white/30 to-transparent pointer-events-none z-10"></div>
            
            

            {/* Night Overlay */}
            <div className={`absolute inset-0 pointer-events-none transition-colors duration-[3000ms] z-40 ${
              'bg-transparent'
            } ${viewMode === 'tank' ? '' : 'hidden'}`} />
            
            {/* Brightness Overlay */}
            <div className={`absolute inset-0 pointer-events-none transition-colors duration-[1000ms] z-40 ${viewMode === 'tank' ? '' : 'hidden'}`} style={{ backgroundColor: `rgba(0, 0, 0, ${1 - brightness / 100})` }} />

            {/* Lighting Filter Overlay */}
            <div className={`absolute inset-0 pointer-events-none transition-colors duration-[1000ms] z-30 ${
              lightingFilter === 'blue' ? 'bg-blue-500/30' : 
              lightingFilter === 'yellow' ? 'bg-yellow-500/30' : 'bg-transparent'
            } ${viewMode === 'tank' ? '' : 'hidden'}`} />

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
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      const idx = guppiesRef.current.findIndex(g => g.id === guppy.id);
                      if (idx !== -1) {
                         guppiesRef.current[idx].expression = '신남';
                         guppiesRef.current[idx].vx = guppiesRef.current[idx].vx > 0 ? -150 : 150;
                         guppiesRef.current[idx].vy = (Math.random() - 0.5) * 150;
                      }
                      setSelectedGuppyId(guppy.id);
                      setActiveNames(prev => ({ ...prev, [guppy.id]: true }));
                      setTimeout(() => {
                        setActiveNames(prev => ({ ...prev, [guppy.id]: false }));
                      }, 5000);
                    }}
                    style={{
                      transform: `translate3d(${guppy.x}px, ${guppy.y}px, 0) translate(-50%, -50%) scale(${guppy.scale * 1.8})`,
                      width: '240px',
                      height: '240px'
                    }}
                  >
                    <div 
                      className="w-full h-full transition-transform duration-700 ease-in-out"
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
                    style={{ transform: `translate3d(${food.x}px, ${food.y}px, 0) translate(-50%, -50%)` }}
                  />
                ))}

                {bubbles.map(bubble => (
                  <div
                    key={bubble.id}
                    className="absolute top-0 left-0 rounded-full border border-white/40 bg-white/10 pointer-events-none transition-transform duration-75 shadow-[inset_2px_2px_4px_rgba(255,255,255,0.4)]"
                    style={{
                      transform: `translate3d(${bubble.x}px, ${bubble.y}px, 0) translate(-50%, -50%)`,
                      width: `${bubble.radius * 2}px`,
                      height: `${bubble.radius * 2}px`,
                      opacity: bubble.opacity
                    }}
                  />
                ))}

                {guppies.length === 0 && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center opacity-50 z-10 pointer-events-none text-center p-4">
                    <div className="text-7xl mb-4 drop-shadow-lg">🫧</div>
                    <h3 className="text-xl font-black text-white uppercase tracking-tight mb-1">Tank Empty</h3>
                    <p className="text-xs font-bold text-sky-200 uppercase tracking-widest">Spawn Guppies to start</p>
                  </div>
                )}
                
                {selectedGuppyId && (
                  <div 
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[60] pointer-events-auto bg-black/70 backdrop-blur-xl rounded-3xl p-5 border border-white/20 text-sm shadow-2xl min-w-[260px]"
                    onClick={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-bold text-white text-base">
                        {guppies.find(g => g.id === selectedGuppyId)?.data.guppy_name || 'Guppy'}
                      </h3>
                      <button 
                        onClick={() => setSelectedGuppyId(null)} 
                        onPointerDown={(e) => { e.stopPropagation(); setSelectedGuppyId(null); }}
                        className="w-8 h-8 flex items-center justify-center text-white/50 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors text-lg"
                      >
                        &times;
                      </button>
                    </div>
                    {guppies.find(g => g.id === selectedGuppyId) && (
                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-center bg-white/5 p-2 rounded-lg mb-1">
                          <span className="text-white font-bold">LV. {guppies.find(g => g.id === selectedGuppyId)!.level}</span>
                          <div className="flex-1 mx-3 bg-black/50 h-2 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-sky-400 rounded-full" 
                              style={{ width: `${(guppies.find(g => g.id === selectedGuppyId)!.xp / (guppies.find(g => g.id === selectedGuppyId)!.level * 150)) * 100}%` }}
                            />
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sky-300 text-xs font-bold">종류</span>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            guppies.find(g => g.id === selectedGuppyId)!.data.rarity === '전설' ? 'bg-pink-500/20 text-pink-300' :
                            guppies.find(g => g.id === selectedGuppyId)!.data.rarity === '희귀' ? 'bg-yellow-500/20 text-yellow-300' :
                            'bg-white/10 text-white'
                          }`}>{guppies.find(g => g.id === selectedGuppyId)!.data.rarity}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sky-300 text-xs font-bold">체내 포만도</span>
                          <span className="font-bold text-white text-xs">{Math.floor(guppies.find(g => g.id === selectedGuppyId)!.hunger)}%</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sky-300 text-xs font-bold">개별 인지 시야</span>
                          <span className="font-bold text-white text-xs">{Math.round((guppies.find(g => g.id === selectedGuppyId)!.stats.vision / 800) * 100)}%</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sky-300 text-xs font-bold">개별 유영 속도</span>
                          <span className="font-bold text-white text-xs">{Math.round((guppies.find(g => g.id === selectedGuppyId)!.stats.speed) * 100)}%</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sky-300 text-xs font-bold">태생 골격 크기</span>
                          <span className="font-bold text-white text-xs">{Math.round((guppies.find(g => g.id === selectedGuppyId)!.stats.size / 0.3) * 100)}%</span>
                        </div>
                        <div className="flex flex-col mt-1 bg-white/5 p-2 rounded-lg border border-white/5">
                          <span className="text-sky-300 text-[10px] mb-1 font-bold">레벨 특수 능력</span>
                          <span className="font-bold text-white text-xs mb-1">
                            {guppies.find(g => g.id === selectedGuppyId)!.data.rarity === '전설' ? '✨ 바다의 파수꾼 민첩' : guppies.find(g => g.id === selectedGuppyId)!.data.rarity === '희귀' ? '✨ 은빛 비늘의 가호' : '✨ 활기찬 헤엄'}
                          </span>
                          <span className="text-[10px] text-white/70 leading-tight">
                            {guppies.find(g => g.id === selectedGuppyId)!.data.rarity === '전설' 
                              ? '수류 저항을 완전히 이겨내어 헤엄치는 속도가 영구 향상됩니다.' 
                              : guppies.find(g => g.id === selectedGuppyId)!.data.rarity === '희귀' 
                              ? '시야가 넓어지고 먹이를 찾는 반응 속도가 빨라집니다.' 
                              : '기본적인 성장 속도와 활동성이 약간 증가합니다.'}
                          </span>
                        </div>
                        <button 
                          onClick={() => {
                            const guppy = guppies.find(g => g.id === selectedGuppyId);
                            if (guppy) {
                              const baseBonus = guppy.level * 50;
                              const rarityMultiplier = guppy.data.rarity === '전설' ? 5 : guppy.data.rarity === '희귀' ? 2 : 1;
                              const statsBonus = Math.floor(guppy.stats.speed * 50);
                              const totalGold = baseBonus * rarityMultiplier + statsBonus;
                              
                              setFoodInventory(prev => ({ ...prev, premium: prev.premium + Math.max(1, Math.round(totalGold / 50)) }));
                              setGuppiesState(prev => prev.filter(g => g.id !== guppy.id));
                              guppiesRef.current = guppiesRef.current.filter(g => g.id !== guppy.id);
                              setSelectedGuppyId(null);
                            }
                          }}
                          className="mt-2 w-full bg-red-500/20 hover:bg-red-500/40 border border-red-500/30 text-red-200 font-bold py-2 rounded-xl transition-colors text-xs"
                        >
                          자연으로 방생하기
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Removed Feed Button */}
              </>
            ) : (
              <div className="absolute inset-0 p-4 overflow-y-auto custom-scrollbar flex flex-col gap-6 z-10">
                {guppies.length > 0 ? (
                  <>
                    <h2 className="text-xl font-bold text-white mb-2">Sprite Sheet: {guppies[guppies.length - 1].data.guppy_name}</h2>
                    <div className="flex gap-4 items-center flex-wrap">
                      <div className="bg-slate-900/50 rounded-3xl p-4 flex flex-col items-center border border-slate-700">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Main Pose</span>
                        <div className="w-48 h-48 sm:w-64 sm:h-64">
                          <GuppySVG {...guppies[guppies.length - 1].data} expression={null} pose="main" hideFloaters />
                        </div>
                      </div>
                      <div className="flex flex-col gap-4">
                        <div className="bg-slate-900/50 rounded-3xl p-4 flex flex-col items-center border border-slate-700 h-32 w-48">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Side View</span>
                          <div className="flex-1 w-full flex items-center justify-center">
                            <GuppySVG {...guppies[guppies.length - 1].data} expression={null} pose="side" hideFloaters />
                          </div>
                        </div>
                        <div className="bg-slate-900/50 rounded-3xl p-4 flex flex-col items-center border border-slate-700 h-32 w-48">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Top/Action View</span>
                          <div className="flex-1 w-full flex items-center justify-center">
                            <GuppySVG {...guppies[guppies.length - 1].data} expression={null} pose="top" hideFloaters />
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-4 flex-wrap">
                      <div className="bg-slate-900/50 rounded-3xl p-4 flex flex-col items-center border border-slate-700 h-40 w-48 sm:w-64">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Swim Frame 1</span>
                        <div className="flex-1 w-full flex items-center justify-center">
                          <GuppySVG {...guppies[guppies.length - 1].data} expression={null} pose="swim1" hideFloaters />
                        </div>
                      </div>
                      <div className="bg-slate-900/50 rounded-3xl p-4 flex flex-col items-center border border-slate-700 h-40 w-48 sm:w-64">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Swim Frame 2</span>
                        <div className="flex-1 w-full flex items-center justify-center">
                          <GuppySVG {...guppies[guppies.length - 1].data} expression={null} pose="swim2" hideFloaters />
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full opacity-50">Tank Empty</div>
                )}
              </div>
            )}
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
    </div>
  );
}
