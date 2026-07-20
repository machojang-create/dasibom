import Petal from './Petal';
import React, { useState, useEffect, useMemo } from 'react';
import { Sparkles, Clock, HelpCircle, Sparkle, Store } from 'lucide-react';
import { GuppySVG } from './GuppySVG';
import { getSpecialShopGuppies } from '../utils';
import { motion, AnimatePresence } from 'motion/react';
import { SpawnData } from '../types';

interface GuppyShopTabProps {
  spendPetal?: any;
  petals?: number;
  gold: number;
  setGold: React.Dispatch<React.SetStateAction<number>>;
  onSpawn: (rarity?: string, isSpecial?: boolean) => SpawnData | null;
}

export const GuppyShopTab = React.memo(function GuppyShopTab({
  spendPetal,
  petals, gold, setGold, onSpawn }: GuppyShopTabProps) {
  const [specialGuppies, setSpecialGuppies] = useState(() => getSpecialShopGuppies());
  const [timeLeft, setTimeLeft] = useState('');

  // Hatching & Reveal States
  const [revealingGuppy, setRevealingGuppy] = useState<SpawnData | null>(null);
  const [isHatching, setIsHatching] = useState(false);
  const [isSpecialReveal, setIsSpecialReveal] = useState(false);
  const [revealed, setRevealed] = useState(false);

  // Generate some persistent visual sparkle nodes for the background effect
  const sparkleNodes = useMemo(() => {
    return Array.from({ length: 20 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 16 + 8,
      delay: Math.random() * 2,
      duration: 3 + Math.random() * 4,
    }));
  }, [revealingGuppy]);

  useEffect(() => {
    let lastWindow = Math.floor(Date.now() / (1000 * 60 * 60 * 3));

    const updateTimer = () => {
      const now = Date.now();
      const threeHoursMs = 1000 * 60 * 60 * 3;
      const current3HourWindow = Math.floor(now / threeHoursMs);
      const nextResetTime = (current3HourWindow + 1) * threeHoursMs;

      if (current3HourWindow !== lastWindow) {
        lastWindow = current3HourWindow;
        setSpecialGuppies(getSpecialShopGuppies());
      }

      const diff = Math.max(0, nextResetTime - now);
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      const pad = (num: number) => String(num).padStart(2, '0');
      setTimeLeft(`${pad(hours)}:${pad(minutes)}:${pad(seconds)}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, []);

  const PETAL_ITEM: Record<string, string> = { normal: 'guppy_special_normal', rare: 'guppy_special_rare', legendary: 'guppy_special_legendary' };
  const handleBuy = (rarity: string, cost: number, isSpecial: boolean) => {
    if (isSpecial) {
      // 특별(한정) 품종은 다시봄 꽃잎으로 — 서버 차감 성공 시에만 입양
      (spendPetal as any)(PETAL_ITEM[rarity], (ok: boolean) => {
        if (!ok) return;
        const spawnedData = onSpawn(rarity, true);
        if (spawnedData) {
          setRevealingGuppy(spawnedData);
          setIsSpecialReveal(true);
          setRevealed(true);
          setIsHatching(false);
        }
      });
      return;
    }
    if (gold >= cost) {
      const spawnedData = onSpawn(rarity, isSpecial);
      if (spawnedData) {
        setGold(prev => prev - cost);
        setRevealingGuppy(spawnedData);
        setIsSpecialReveal(isSpecial);
        if (isSpecial) {
          // Direct purchase bypasses seal state & reveals immediately with full fanfare
          setRevealed(true);
          setIsHatching(false);
        } else {
          // Random purchase needs clicking of the box/egg to crack open
          setRevealed(false);
          setIsHatching(false);
        }
      }
    } else {
      alert("조개가 부족합니다!");
    }
  };

  const triggerHatchSequence = () => {
    if (isHatching) return;
    setIsHatching(true);
    // After shake duration, trigger burst & reveal
    setTimeout(() => {
      setRevealed(true);
      setIsHatching(false);
    }, 1500);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 rounded-[24px] border border-slate-200 flex flex-col shadow-sm h-full relative">
      
      {/* Hatching / Welcome Reveal Overlay */}
      <AnimatePresence>
        {revealingGuppy && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-white overflow-hidden rounded-[32px]"
          >
            {/* Immersive deep sea ambient background with animated floating nodes */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-blue-950/40 via-slate-950 to-teal-950/30" />
              {sparkleNodes.map((node) => (
                <motion.div
                  key={node.id}
                  className="absolute bg-white/10 rounded-full blur-[1px]"
                  style={{
                    left: `${node.x}%`,
                    top: `${node.y}%`,
                    width: node.size,
                    height: node.size,
                  }}
                  animate={{
                    y: [0, -120],
                    x: [0, Math.sin(node.id) * 20],
                    opacity: [0, 0.7, 0],
                  }}
                  transition={{
                    duration: node.duration,
                    repeat: Infinity,
                    delay: node.delay,
                    ease: "easeOut",
                  }}
                />
              ))}
            </div>

            {/* Content Container */}
            <div className="relative z-10 flex flex-col items-center max-w-md w-full text-center">
              
              {!revealed ? (
                // --- SECTOR 1: Mystery Box Hatching Screen (Random Gacha) ---
                <div className="flex flex-col items-center">
                  <motion.div
                    animate={isHatching ? {
                      x: [0, -12, 12, -12, 12, -8, 8, -4, 4, 0],
                      y: [0, 8, -8, 8, -8, 5, -5, 2, -2, 0],
                      rotate: [0, -5, 5, -5, 5, -2, 2, 0, 0, 0],
                      scale: [1, 1.08, 0.95, 1.05, 0.98, 1],
                    } : {
                      y: [0, -10, 0],
                    }}
                    transition={isHatching ? {
                      duration: 1.5,
                      ease: "easeInOut"
                    } : {
                      duration: 3,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    onClick={triggerHatchSequence}
                    className="w-48 h-48 bg-gradient-to-br from-indigo-500/20 to-purple-600/30 rounded-full border border-indigo-400/30 flex items-center justify-center cursor-pointer shadow-2xl relative group"
                  >
                    {/* Ring glow */}
                    <div className="absolute inset-0 rounded-full bg-indigo-500/10 blur-xl group-hover:bg-indigo-500/20 transition-all animate-pulse" />
                    
                    <span className="text-7xl select-none filter drop-shadow-[0_4px_12px_rgba(168,85,247,0.4)]">
                      {isHatching ? '📦' : '📦❓'}
                    </span>
                    
                    {/* Floating Question mark indicator */}
                    {!isHatching && (
                      <motion.div
                        animate={{ scale: [1, 1.2, 1], y: [0, -4, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        className="absolute -top-1 -right-1 w-10 h-10 bg-gradient-to-r from-pink-500 to-rose-500 rounded-full border border-pink-400 flex items-center justify-center font-black text-lg text-white shadow-lg"
                      >
                        ?
                      </motion.div>
                    )}
                  </motion.div>

                  <h3 className="text-2xl font-black mt-8 text-white tracking-tight drop-shadow-md">
                    {isHatching ? '구피 상자가 흔들립니다!' : '새로운 구피가 들어있어요!'}
                  </h3>
                  
                  <p className="text-sm text-slate-300 font-semibold mt-2 leading-relaxed max-w-xs">
                    {isHatching 
                      ? '과연 어떤 신비한 무작위 구피가 들어있을지 개봉 중입니다...' 
                      : '상자를 눌러 비밀의 랜덤 유전자를 가진 구피를 확인해보세요.'}
                  </p>

                  <button
                    onClick={triggerHatchSequence}
                    disabled={isHatching}
                    className={`mt-8 px-8 py-4 rounded-2xl font-black text-lg transition-transform active:scale-95 shadow-lg flex items-center gap-3 ${
                      isHatching 
                        ? 'bg-slate-800 text-slate-500 border border-slate-700' 
                        : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white border border-blue-400/40'
                    }`}
                  >
                    <span>{isHatching ? '개봉하는 중...' : '상자 열기! 🎁'}</span>
                  </button>
                </div>
              ) : (
                // --- SECTOR 2: Gorgeous Reveal Card (Guaranteed & Hatched Random) ---
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", damping: 15 }}
                  className="bg-gradient-to-b from-slate-900/90 to-slate-950/95 border border-white/15 p-5 rounded-[24px] shadow-2xl relative w-full overflow-hidden max-h-[90vh] overflow-y-auto hide-scrollbar"
                >
                  {/* Subtle golden/purple magical radial light ray background */}
                  <div className={`absolute inset-x-0 top-0 h-48 bg-gradient-to-b opacity-25 filter blur-3xl pointer-events-none ${
                    revealingGuppy.rarity === '전설' 
                      ? 'from-amber-400' 
                      : revealingGuppy.rarity === '희귀' 
                        ? 'from-purple-500' 
                        : 'from-blue-500'
                  }`} />

                  {/* Absolute shiny sparkle badge for visual satisfaction */}
                  <div className="absolute top-4 right-4 text-xs font-black px-3 py-1 bg-white/10 rounded-full border border-white/10 text-white/80 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                    NEW ADOPTION
                  </div>

                  {/* Fish Display Area with light spotlight */}
                  <div className="relative w-32 h-32 mx-auto flex items-center justify-center my-2">
                    {/* Pulsing visual aura */}
                    <div className={`absolute w-32 h-32 rounded-full filter blur-xl animate-pulse opacity-40 ${
                      revealingGuppy.rarity === '전설' 
                        ? 'bg-amber-400' 
                        : revealingGuppy.rarity === '희귀' 
                          ? 'bg-purple-500' 
                          : 'bg-blue-500'
                    }`} />
                    
                    <motion.div
                      animate={{ 
                        y: [-6, 6, -6],
                        rotate: [-2, 2, -2],
                      }}
                      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                      className="w-28 h-28 relative z-10"
                    >
                      <GuppySVG 
                        bodyColor={revealingGuppy.body_color} 
                        tailColor={revealingGuppy.tail_color} 
                        patternColor={revealingGuppy.pattern_color} 
                        expression="반짝" 
                        pose="side" 
                        hideFloaters={true} 
                      />
                    </motion.div>
                  </div>

                  {/* Rarity Label Badge */}
                  <div className="mt-2">
                    <span className={`inline-block px-4 py-1.5 rounded-full text-xs font-extrabold tracking-widest uppercase shadow-md ${
                      revealingGuppy.rarity === '전설' 
                        ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white border border-amber-300' 
                        : revealingGuppy.rarity === '희귀' 
                          ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white border border-purple-300' 
                          : 'bg-gradient-to-r from-blue-500 to-cyan-600 text-white border border-blue-300'
                    }`}>
                      {revealingGuppy.rarity} 등급
                    </span>
                  </div>

                  {/* Guppy Name */}
                  <h3 className={`mt-2 font-extrabold text-xl tracking-tight leading-tight ${
                    revealingGuppy.rarity === '전설' 
                      ? 'text-amber-400 font-black' 
                      : revealingGuppy.rarity === '희귀' 
                        ? 'text-purple-300 font-black' 
                        : 'text-white'
                  }`}>
                    {revealingGuppy.guppy_name}
                  </h3>

                  <p className="text-xs text-slate-400 font-medium mt-1">태어나자마자 활기차게 수영하고 있는 사랑스러운 구피입니다.</p>

                  <div className="h-px bg-white/10 my-3" />

                  {/* Attribute Swatches & Information */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white/5 border border-white/5 p-2 rounded-xl flex flex-col items-center">
                      <span className="text-[10px] font-black text-slate-400">몸체 색상</span>
                      <div 
                        className="w-6 h-6 rounded-lg mt-1.5 border border-white/20 shadow-inner" 
                        style={{ backgroundColor: revealingGuppy.body_color }} 
                      />
                      <span className="text-[10px] font-mono mt-1 text-slate-300">{revealingGuppy.body_color.toUpperCase()}</span>
                    </div>

                    <div className="bg-white/5 border border-white/5 p-2 rounded-xl flex flex-col items-center">
                      <span className="text-[10px] font-black text-slate-400">꼬리 색상</span>
                      <div 
                        className="w-6 h-6 rounded-lg mt-1.5 border border-white/20 shadow-inner" 
                        style={{ backgroundColor: revealingGuppy.tail_color }} 
                      />
                      <span className="text-[10px] font-mono mt-1 text-slate-300">{revealingGuppy.tail_color.toUpperCase()}</span>
                    </div>

                    <div className="bg-white/5 border border-white/5 p-2 rounded-xl flex flex-col items-center">
                      <span className="text-[10px] font-black text-slate-400">패턴 색상</span>
                      <div 
                        className="w-6 h-6 rounded-lg mt-1.5 border border-white/20 shadow-inner" 
                        style={{ backgroundColor: revealingGuppy.pattern_color }} 
                      />
                      <span className="text-[10px] font-mono mt-1 text-slate-300">{revealingGuppy.pattern_color.toUpperCase()}</span>
                    </div>
                  </div>

                  {/* Quick Tip */}
                  <div className="mt-3 p-2 rounded-2xl bg-white/5 border border-white/5 text-xs text-slate-300 font-medium flex items-center justify-center gap-2">
                    <span>💡 Tip: 구피는 먹이를 충분히 먹으면 다음 등급 유전을 물려줍니다!</span>
                  </div>

                  {/* Close / Confirmation Button */}
                  <button
                    onClick={() => {
                      setRevealingGuppy(null);
                      setRevealed(false);
                      setIsSpecialReveal(false);
                    }}
                    className={`mt-4 w-full py-3 rounded-xl font-black text-base shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2 ${
                      revealingGuppy.rarity === '전설' 
                        ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 font-black' 
                        : revealingGuppy.rarity === '희귀' 
                          ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    <span>어항으로 보내기 🐠</span>
                  </button>
                </motion.div>
              )}

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-4 pb-3 flex flex-col gap-4 shrink-0 bg-white border-b border-slate-100 rounded-t-[24px]">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-black shadow-inner">
              <span className="text-2xl">🐣</span>
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800 tracking-tight">구피 상점</h2>
              <p className="text-sm text-slate-500 font-medium mt-1">새로운 구피를 입양하세요</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-4 py-2 bg-blue-50 text-blue-800 rounded-2xl border border-blue-100 shadow-sm">
            <span className="text-xl">🐚</span>
            <span className="font-black text-xl">{Math.floor(gold).toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 overflow-y-auto">
        
        <div className="flex flex-col gap-8">
          
          {/* 특별 분양 섹션 (확정 색상) */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <Store className="w-5 h-5 text-blue-500" />
                특별 분양 (미리보기)
              </h3>
              <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-800 rounded-2xl border border-amber-200 text-xs font-black shadow-sm self-start sm:self-auto">
                <Clock className="w-4 h-4 text-amber-600 animate-pulse" />
                <span>상품 변경까지:</span>
                <span className="font-mono text-sm tracking-wider">{timeLeft || '00:00:00'}</span>
              </div>
            </div>
            <p className="text-sm text-slate-500 mb-4 font-medium">현재 보이는 색상 그대로 입양됩니다. 3시간마다 새로운 색상의 구피들이 찾아옵니다.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Special Normal */}
              <div className="bg-white p-4 rounded-[20px] border border-blue-100 shadow-sm flex flex-col items-center justify-center relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-transparent opacity-50" />
                <div className="w-32 h-32 mb-3 relative z-10 flex items-center justify-center">
                  <GuppySVG 
                    bodyColor={specialGuppies.normal.body_color} 
                    tailColor={specialGuppies.normal.tail_color} 
                    patternColor={specialGuppies.normal.pattern_color} 
                    expression="정면" 
                    pose="side" 
                    hideFloaters={true} 
                  />
                </div>
                <p className="font-black text-slate-700 text-lg relative z-10">일반 구피</p>
                <p className="text-xs text-slate-500 font-bold mb-4 relative z-10">확정 색상</p>
                <button 
                  onClick={() => handleBuy('normal', 30, true)}
                  disabled={(petals ?? 0) < 30}
                  className={`w-full py-3 rounded-xl font-black transition-colors relative z-10 shadow-sm flex items-center justify-center gap-2 ${gold >= 300 ? 'bg-blue-500 hover:bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}
                >
                  <span>입양하기</span>
                  <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs flex items-center gap-1"><Petal className="w-3.5 h-3.5" /> 30</span>
                </button>
              </div>

              {/* Special Rare */}
              <div className="bg-white p-4 rounded-[20px] border border-purple-100 shadow-sm flex flex-col items-center justify-center relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-transparent opacity-50" />
                <div className="w-32 h-32 mb-3 relative z-10 flex items-center justify-center">
                  <GuppySVG 
                    bodyColor={specialGuppies.rare.body_color} 
                    tailColor={specialGuppies.rare.tail_color} 
                    patternColor={specialGuppies.rare.pattern_color} 
                    expression="반짝" 
                    pose="side" 
                    hideFloaters={true} 
                  />
                </div>
                <p className="font-black text-purple-700 text-lg relative z-10">희귀 구피</p>
                <p className="text-xs text-slate-500 font-bold mb-4 relative z-10">확정 색상</p>
                <button 
                  onClick={() => handleBuy('rare', 50, true)}
                  disabled={(petals ?? 0) < 50}
                  className={`w-full py-3 rounded-xl font-black transition-colors relative z-10 shadow-sm flex items-center justify-center gap-2 ${gold >= 500 ? 'bg-purple-500 hover:bg-purple-600 text-white' : 'bg-slate-100 text-slate-400'}`}
                >
                  <span>입양하기</span>
                  <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs flex items-center gap-1"><Petal className="w-3.5 h-3.5" /> 50</span>
                </button>
              </div>

              {/* Special Legendary */}
              <div className="bg-white p-6 rounded-3xl border border-amber-200 shadow-sm flex flex-col items-center justify-center relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-50 to-transparent opacity-50" />
                <div className="w-32 h-32 mb-3 relative z-10 flex items-center justify-center">
                  <GuppySVG 
                    bodyColor={specialGuppies.legendary.body_color} 
                    tailColor={specialGuppies.legendary.tail_color} 
                    patternColor={specialGuppies.legendary.pattern_color} 
                    expression="반짝" 
                    pose="side" 
                    hideFloaters={true} 
                  />
                </div>
                <p className="font-black text-amber-600 text-lg relative z-10">전설 구피</p>
                <p className="text-xs text-amber-500/70 font-bold mb-4 relative z-10">확정 색상</p>
                <button 
                  onClick={() => handleBuy('legendary', 120, true)}
                  disabled={(petals ?? 0) < 120}
                  className={`w-full py-3 rounded-xl font-black transition-colors relative z-10 shadow-sm flex items-center justify-center gap-2 ${gold >= 1200 ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'bg-slate-100 text-slate-400'}`}
                >
                  <span>입양하기</span>
                  <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs flex items-center gap-1"><Petal className="w-3.5 h-3.5" /> 120</span>
                </button>
              </div>
            </div>
          </div>

          <div className="h-px bg-slate-200 w-full rounded-full" />

          {/* 랜덤 분양 섹션 (랜덤 박스) */}
          <div>
            <h3 className="text-lg font-black text-slate-800 mb-2 flex items-center gap-2">
              <span className="text-xl">📦❓</span>
              랜덤 분양 (박스)
            </h3>
            <p className="text-sm text-slate-500 mb-4 font-medium">어떤 색상의 구피가 나올지 모릅니다! (전설 등급은 테마 내에서 무작위 결정)</p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Random Normal */}
              <button 
                onClick={() => handleBuy('normal', 100, false)} 
                disabled={gold < 100}
                className={`bg-white p-5 rounded-2xl border border-slate-200 shadow-sm font-bold text-slate-700 flex justify-between items-center transition-transform hover:-translate-y-0.5 ${gold >= 100 ? 'hover:border-blue-300' : 'opacity-70'}`}
              >
                <span className="flex items-center gap-2">
                  <span className="text-xl">📦</span>
                  일반 랜덤
                </span>
                <span className={`px-3 py-1 rounded-lg text-sm ${gold >= 100 ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-400'}`}>🐚 100</span>
              </button>
              
              {/* Random Rare */}
              <button 
                onClick={() => handleBuy('rare', 200, false)} 
                disabled={gold < 200}
                className={`bg-white p-5 rounded-2xl border border-slate-200 shadow-sm font-bold text-slate-700 flex justify-between items-center transition-transform hover:-translate-y-0.5 ${gold >= 200 ? 'hover:border-purple-300' : 'opacity-70'}`}
              >
                <span className="flex items-center gap-2">
                  <span className="text-xl">📦✨</span>
                  희귀 랜덤
                </span>
                <span className={`px-3 py-1 rounded-lg text-sm ${gold >= 200 ? 'bg-purple-50 text-purple-700' : 'bg-slate-100 text-slate-400'}`}>🐚 200</span>
              </button>
              
              {/* Random Legendary */}
              <button 
                onClick={() => handleBuy('legendary', 500, false)} 
                disabled={gold < 500}
                className={`bg-white p-5 rounded-2xl border border-slate-200 shadow-sm font-bold text-slate-700 flex justify-between items-center transition-transform hover:-translate-y-0.5 ${gold >= 500 ? 'hover:border-amber-300' : 'opacity-70'}`}
              >
                <span className="flex items-center gap-2">
                  <span className="text-xl">📦🌟</span>
                  전설 랜덤
                </span>
                <span className={`px-3 py-1 rounded-lg text-sm ${gold >= 500 ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-400'}`}>🐚 500</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
});
