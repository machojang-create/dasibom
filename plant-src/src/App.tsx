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
import { ambientAudio } from './lib/audio';
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
        return JSON.parse(saved);
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

  useEffect(() => {
    ambientAudio.playWeather(weather);
  }, [weather]);

  useEffect(() => {
    localStorage.setItem('plant_slots', JSON.stringify(slots));
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
  const NO_PETAL_MSG = '꽃잎이 모자라네... 친구들한테 다시봄 자랑 좀 하고, 꽃잎 받아 온나! 🌷';

  const buySeed = (plant: PlantData) => {
    if (currentPlant) return;
    const P = dsb(); if (!P) return;
    P.spend('seed', (err: any, d: any) => {
      if (err || !d || !d.ok) { if (d && d.balance != null) setMoney(d.balance); setIsShopOpen(false); plantSay(NO_PETAL_MSG); return; }
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
      setSlots(prev => { const ns = [...prev]; ns[currentSlotIndex] = newPlant; return ns; });
      setIsShopOpen(false);
      setEncyclopedia(prev => prev.map(e => e.plantId === plant.id ? { ...e, discovered: true } : e));
    });
  };

  const buyPot = (potId: string, _price: number) => {
    if (!currentPlant) return;
    if (potId === 'pot1') {   // 기본 옹기 무료
      setSlots(prev => { const ns = [...prev]; ns[currentSlotIndex] = { ...prev[currentSlotIndex]!, potId }; return ns; });
      setIsPotShopOpen(false); return;
    }
    const P = dsb(); if (!P) return;
    P.spend(potId, (err: any, d: any) => {
      if (err || !d || !d.ok) { if (d && d.balance != null) setMoney(d.balance); setIsPotShopOpen(false); plantSay(NO_PETAL_MSG); return; }
      setMoney(d.balance);
      setSlots(prev => { const ns = [...prev]; ns[currentSlotIndex] = { ...prev[currentSlotIndex]!, potId }; return ns; });
      setIsPotShopOpen(false);
    });
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
      
      const phrases = DIALOGUES[actionKey]?.[stage] || ["우야꼬, 할 말이 없네."];
      const finalPhrase = phrases[Math.floor(Math.random() * phrases.length)];

      const newSlots = [...prev];
      newSlots[plantIndex] = { ...targetPlant, phrase: finalPhrase };
      return newSlots;
    });
  };

  const applyEffect = (type: 'water' | 'normal_nut' | 'premium_nut') => {
    setSlots(prev => {
      const targetPlant = prev[currentSlotIndex];
      if (!targetPlant) return prev;
      const newPlant = { ...targetPlant };

      let waterIncrease = type === 'water' ? 15 : type === 'normal_nut' ? 10 : 30;
      let levelIncrease = type === 'water' ? 0 : type === 'normal_nut' ? 1 : 2;
      // 물주기: 하루 첫 물은 정성으로 쳐서 레벨+1 (자동 성장 폐지 — 매일 들르는 이유)
      if (type === 'water') {
        const today = new Date().toISOString().slice(0, 10);
        if ((newPlant as any).lastWaterDay !== today) {
          levelIncrease = 1;
          (newPlant as any).lastWaterDay = today;
        }
      }
      
      // Time of day bonuses for water level
      if (type === 'water' && timeOfDay === 'day') waterIncrease = 25;
      if (type !== 'water' && timeOfDay === 'night') waterIncrease = Math.floor(waterIncrease * 1.5);
      
      newPlant.waterLevel = Math.min(100, newPlant.waterLevel + waterIncrease);
      newPlant.level = Math.min(10, newPlant.level + levelIncrease);
      newPlant.lastWatered = Date.now();

      if (newPlant.level >= 2 && newPlant.stage === 'seed') newPlant.stage = 'sprout';
      if (newPlant.level >= 5 && newPlant.stage === 'sprout') newPlant.stage = 'mature';
      if (newPlant.level >= 10 && newPlant.stage === 'mature') newPlant.stage = 'old';

      const newSlots = [...prev];
      newSlots[currentSlotIndex] = newPlant;
      return newSlots;
    });

    if (type === 'water') speakWithPlant('물주기', currentSlotIndex);
    else if (type === 'normal_nut') speakWithPlant('일반 영양제 주기', currentSlotIndex);
    else if (type === 'premium_nut') speakWithPlant('고급 영양제 주기', currentSlotIndex);
  };

  const applyItem = (type: 'water' | 'normal_nut' | 'premium_nut') => {
    if (type === 'water') { applyEffect('water'); return; }     // 물은 무료 — 매일 만지는 핵심 손길
    const P = dsb(); if (!P) { plantSay('시방 연결이 잘 안 되네... 쪼매 있다 다시 온나!'); return; }
    P.spend(type, (err: any, d: any) => {
      if (err || !d || !d.ok) { if (d && d.balance != null) setMoney(d.balance); plantSay(NO_PETAL_MSG); return; }
      setMoney(d.balance);
      applyEffect(type);
    });
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

  useEffect(() => {
    if (currentPlant && !currentPlant.phrase) {
      speakWithPlant('오랜만에 접속', currentSlotIndex);
    }
  }, [currentSlotIndex]);

  useEffect(() => {
    // 10분마다 날씨 따라 물만 마른다(자동 레벨업 폐지 — 성장은 손길과 영양제로만)
    const timer = setInterval(() => {
      setSlots(prev => prev.map(p => {
        if (!p) return null;
        const currentW = weatherRef.current;
        let waterDelta = -1;
        switch (currentW) {
          case 'sunny': waterDelta = -2; break;
          case 'rainy': waterDelta = 5; break;
          case 'snowy': waterDelta = 0; break;
          case 'hot': waterDelta = -4; break;
          case 'typhoon': waterDelta = -3; break;
          default: waterDelta = -1;
        }
        return { ...p, waterLevel: Math.max(0, Math.min(100, p.waterLevel + waterDelta)) };
      }));
    }, 600000);
    return () => clearInterval(timer);
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

  useEffect(() => {
    const weatherTimer = setInterval(() => {
      setWeather(w => {
        const weathers: WeatherType[] = ['sunny', 'rainy', 'cloudy', 'snowy', 'hot', 'clear', 'typhoon'];
        const newlyGenerated = weathers[Math.floor(Math.random() * weathers.length)];
        
        setSlots(prev => prev.map(p => {
          if (!p) return null;          let phrase = p.phrase;
          if (p.stage === 'old') {
             const emotionalPhrases = GRADUATION_EMOTIONAL_PHRASES[p.type.dialect] || [];
             phrase = emotionalPhrases[Math.floor(Math.random() * emotionalPhrases.length)] || p.phrase;
          } else {
             const phrases = DIALOGUES[`weather_${newlyGenerated}` as keyof typeof DIALOGUES]?.[p.stage] || 
                             DIALOGUES['weather_sunny']?.[p.stage] || [];
             phrase = phrases[Math.floor(Math.random() * phrases.length)] || p.phrase;
          }
          return { ...p, phrase };
        }));

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
        
        {/* Weather Overlay */}
        <WeatherOverlay weather={weather} timeOfDay={timeOfDay} />

        {/* Time of Day Overlay */}
        <div className={`absolute inset-0 transition-opacity duration-1000 pointer-events-none mix-blend-multiply ${
          timeOfDay === 'night' ? 'bg-blue-900/60 opacity-100' :
          timeOfDay === 'morning' ? 'bg-orange-300/10 opacity-100' :
          'opacity-0'
        }`}></div>
      </div>

      {/* Panoramic Window Frame (통창) */}
      <div className="absolute inset-0 pointer-events-none z-0 border-[16px] md:border-[24px] border-white shadow-[inset_0_0_60px_rgba(0,0,0,0.2)]"></div>
      
      {/* Table Background (Windowsill) */}
      <div className={`absolute bottom-0 left-0 right-0 h-[32vh] border-t-[16px] md:border-t-[24px] shadow-[0_-10px_30px_rgba(0,0,0,0.05)] z-0 pointer-events-none transition-colors duration-1000 ${
        timeOfDay === 'night' ? 'bg-[#5c4a30] border-[#4a3920]' : 'bg-[#f4e4c3] border-[#e0c396]'
      }`}>
      </div>

      {/* Fixed UI Layer (Z-50) */}
      <div className="absolute inset-0 pointer-events-none z-50">
        {/* Navigation Arrows */}
        <div className="absolute top-[76%] md:top-[70%] -translate-y-1/2 left-2 md:left-6 z-40 pointer-events-auto">
          {currentSlotIndex > 0 && (
            <button onClick={() => scrollToSlot(currentSlotIndex - 1)} className="p-2 md:p-3 bg-white/70 hover:bg-white/95 backdrop-blur-md rounded-full shadow-lg text-gray-600 transition-all active:scale-95 border-2 border-white/50">
              <ChevronLeft className="w-6 h-6 md:w-8 md:h-8" />
            </button>
          )}
        </div>
        <div className="absolute top-[76%] md:top-[70%] -translate-y-1/2 right-2 md:right-6 z-40 pointer-events-auto">
          {currentSlotIndex < slots.length - 1 && (
            <button onClick={() => scrollToSlot(currentSlotIndex + 1)} className="p-2 md:p-3 bg-white/70 hover:bg-white/95 backdrop-blur-md rounded-full shadow-lg text-gray-600 transition-all active:scale-95 border-2 border-white/50">
              <ChevronRight className="w-6 h-6 md:w-8 md:h-8" />
            </button>
          )}
        </div>

        {/* Top Indicators */}
        <div className="absolute top-20 md:top-24 left-0 right-0 flex justify-center gap-2">
          {slots.map((_, idx) => (
             <div key={idx} className={`w-2.5 h-2.5 rounded-full transition-all ${idx === currentSlotIndex ? 'bg-white scale-125 shadow-md' : 'bg-white/50'}`} />
          ))}
        </div>

        {/* Top Left (Time of Day & Bonus & Weather) */}
        <div className="absolute top-4 left-3 md:top-6 md:left-6 pointer-events-auto flex flex-col gap-1.5 max-w-[62vw]">
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
            onClick={() => setIsAudioPlaying(ambientAudio.toggle())} 
            className={`flex flex-col items-center justify-center w-14 h-14 ${isAudioPlaying ? 'bg-indigo-500 text-white' : 'bg-white/80 text-gray-400'} backdrop-blur-md rounded-2xl shadow-lg border-2 border-white hover:bg-opacity-100 transition-colors`}
          >
            {isAudioPlaying ? <Volume2 className="w-6 h-6 mb-0.5" /> : <VolumeX className="w-6 h-6 mb-0.5" />}
            <span className="text-[10px] font-bold">소리</span>
          </button>
          <button onClick={() => setIsEncyclopediaOpen(true)} className="flex flex-col items-center justify-center w-14 h-14 bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border-2 border-white text-green-600 hover:bg-white transition-colors">
            <BookOpen className="w-6 h-6 mb-0.5" />
            <span className="text-[10px] font-bold">도감</span>
          </button>
          <button onClick={() => setIsPotShopOpen(true)} className="flex flex-col items-center justify-center w-14 h-14 bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border-2 border-white text-blue-500 hover:bg-white transition-colors">
            <Store className="w-6 h-6 mb-0.5" />
            <span className="text-[10px] font-bold">화분</span>
          </button>
          <button onClick={() => setIsShopOpen(true)} className="flex flex-col items-center justify-center w-14 h-14 bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border-2 border-white text-yellow-500 hover:bg-white transition-colors relative">
            <ShoppingBag className="w-6 h-6 mb-0.5" />
            <span className="text-[10px] font-bold">씨앗</span>
          </button>
        </div>



        {/* Bottom Actions */}
        <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-2 md:gap-4 px-2 pointer-events-auto">
          <button onClick={() => applyItem('water')} disabled={!currentPlant} className={`relative flex flex-col items-center justify-center w-[30vw] max-w-[104px] h-28 md:w-28 md:h-28 bg-gradient-to-b from-[#52b5e9] to-[#3498c9] rounded-2xl border-4 ${timeOfDay === 'day' ? 'border-yellow-300 shadow-[0_0_15px_rgba(253,224,71,0.8)]' : 'border-white'} shadow-lg transition-transform hover:scale-105 active:scale-95 text-white disabled:pointer-events-none disabled:opacity-50 disabled:grayscale`}>
            {timeOfDay === 'day' && <div className="absolute inset-0 rounded-xl bg-white/20 animate-pulse pointer-events-none" />}
            <Droplet className="w-8 h-8 md:w-9 md:h-9 mb-1 drop-shadow relative z-10" fill="currentColor" />
            <span className="font-bold text-[15px] md:text-base drop-shadow-md tracking-tight text-center relative z-10">물주기</span>
            <span className="font-bold text-[12px] md:text-[13px] bg-black/25 px-2.5 py-0.5 rounded-full mt-1 relative z-10">무료</span>
          </button>
          <button onClick={() => applyItem('normal_nut')} disabled={!currentPlant} className={`relative flex flex-col items-center justify-center w-[30vw] max-w-[104px] h-28 md:w-28 md:h-28 bg-gradient-to-b from-[#f2cd5c] to-[#e0af2c] rounded-2xl border-4 ${timeOfDay === 'night' ? 'border-yellow-300 shadow-[0_0_15px_rgba(253,224,71,0.8)]' : 'border-white'} shadow-lg transition-transform hover:scale-105 active:scale-95 text-white disabled:pointer-events-none disabled:opacity-50 disabled:grayscale`}>
            {timeOfDay === 'night' && <div className="absolute inset-0 rounded-xl bg-white/20 animate-pulse pointer-events-none" />}
            <span className="text-2xl mb-0.5 relative z-10">🌿</span>
            <span className="font-bold text-[14px] md:text-[15px] drop-shadow-md tracking-tight text-center relative z-10 leading-tight">영양제<br/><span className="text-[11px] font-semibold opacity-90">잎이 쑥 자라요</span></span>
            <span className="font-bold text-[12px] md:text-[13px] bg-black/25 px-2.5 py-0.5 rounded-full mt-1 relative z-10 flex items-center gap-1"><Petal className="w-3.5 h-3.5" />15</span>
          </button>
          <button onClick={() => applyItem('premium_nut')} disabled={!currentPlant} className={`relative flex flex-col items-center justify-center w-[30vw] max-w-[104px] h-28 md:w-28 md:h-28 bg-gradient-to-b from-[#f29c38] to-[#d67b18] rounded-2xl border-4 ${timeOfDay === 'night' ? 'border-yellow-300 shadow-[0_0_15px_rgba(253,224,71,0.8)]' : 'border-white'} shadow-lg transition-transform hover:scale-105 active:scale-95 text-white disabled:pointer-events-none disabled:opacity-50 disabled:grayscale`}>
            {timeOfDay === 'night' && <div className="absolute inset-0 rounded-xl bg-white/20 animate-pulse pointer-events-none" />}
            <span className="text-2xl mb-0.5 relative z-10">✨</span>
            <span className="font-bold text-[14px] md:text-[15px] drop-shadow-md tracking-tight text-center relative z-10 leading-tight">고급 영양제<br/><span className="text-[11px] font-semibold opacity-90">쑥쑥 두 배!</span></span>
            <span className="font-bold text-[12px] md:text-[13px] bg-black/25 px-2.5 py-0.5 rounded-full mt-1 relative z-10 flex items-center gap-1"><Petal className="w-3.5 h-3.5" />40</span>
          </button>
        </div>
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
        {slots.map((slot, idx) => (
          <div key={idx} className="w-screen h-full shrink-0 snap-center relative flex flex-col justify-center pt-44 pb-32 md:pt-48 md:pb-36">
            <div className="w-full max-w-md mx-auto relative flex items-center justify-center">
              {slot ? (
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
                  
                  <PlantView plant={slot} onInteract={() => speakWithPlant('쓰다듬기', idx)} onRename={(newName) => handleRenamePlant(idx, newName)} timeOfDay={timeOfDay} />
                </>
              ) : (
                <div className="relative flex flex-col items-center justify-end h-64 mt-4 mb-2 z-20 -translate-y-[120px] md:-translate-y-[120px]">
                  <div className="text-4xl relative z-20 filter drop-shadow-lg -mb-6 opacity-40">🌱</div>
                  <div className="w-36 md:w-44 h-28 md:h-32 bg-gradient-to-b from-[#fceabb]/40 to-[#f8b500]/40 rounded-b-[40px] border-t-[12px] border-[#fbce5e]/40 shadow-inner flex items-center justify-center backdrop-blur-sm">
                    <span className="text-[#c59b3a] font-bold text-sm">빈 화분</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <Shop isOpen={isShopOpen} onClose={() => setIsShopOpen(false)} onBuySeed={buySeed} money={money} isSlotFull={currentPlant !== null} />
      <EncyclopediaView isOpen={isEncyclopediaOpen} onClose={() => setIsEncyclopediaOpen(false)} entries={encyclopedia} badges={badges} />
      <PotShopView isOpen={isPotShopOpen} onClose={() => setIsPotShopOpen(false)} onBuyPot={buyPot} money={money} isSlotEmpty={currentPlant === null} />
    </div>
  );
}
