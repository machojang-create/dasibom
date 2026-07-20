import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, Wind } from 'lucide-react';
import { GuppySVG } from './GuppySVG';
import { SpawnData } from '../types';

interface GuppyInstance {
  id: string;
  data: SpawnData;
  expression: string | null;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle?: number;
  isTurning?: boolean;
  scale: number;
  targetFoodId: string | null;
  swimPhase: number;
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

export const ManageTab = React.memo(function ManageTab({
  guppies,
  gold,
  onCommune,
  onRelease
}: {
  guppies: GuppyInstance[];
  gold: number;
  onCommune: (id: string) => void;
  onRelease: (id: string, reward: number) => void;
}) {
  const [releasingGuppy, setReleasingGuppy] = useState<GuppyInstance | null>(null);

  const getStatusText = (hunger: number) => {
    if (hunger > 70) return '든든하고 행복';
    if (hunger > 30) return '평온함';
    return '배고픔';
  };

  const getStatusColor = (hunger: number) => {
    if (hunger > 70) return 'bg-emerald-100 text-emerald-700';
    if (hunger > 30) return 'bg-yellow-100 text-yellow-700';
    return 'bg-red-100 text-red-700';
  };

  const handleCommune = (id: string) => {
    onCommune(id);
  };

  const _rawExpectedGold = (guppy: GuppyInstance) => {
    const baseBonus = guppy.level * 50;
    const rarityMultiplier = guppy.data.rarity === '전설' ? 5 : guppy.data.rarity === '희귀' ? 2 : 1;
    const statsBonus = Math.floor(guppy.stats.speed * 50);
    return baseBonus * rarityMultiplier + statsBonus;
  };

  const getExpectedGold = (g: any) => Math.max(1, Math.round(_rawExpectedGold(g) / 50));

  const handleRelease = (id: string, reward: number) => {
    onRelease(id, reward);
    setReleasingGuppy(null);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 rounded-[24px] border border-slate-200 flex flex-col shadow-sm h-full relative">
      <div className="p-4 pb-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shrink-0 bg-white border-b border-slate-100 rounded-t-[24px]">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight">내 어항 생물 관리 대장</h2>
          <p className="text-sm text-slate-500 font-medium mt-1">물고기들의 영양 상태와 성장률을 파악하고 관리하세요</p>
        </div>
        <div className="bg-blue-50 text-blue-800 px-3 py-1.5 rounded-full font-bold text-xs border border-blue-100 shadow-sm">
          총 {guppies.length}마리
        </div>
      </div>

      <div className="flex-1 p-4 overflow-y-auto"><div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {guppies.map(guppy => {
          const nextLevelXp = guppy.level * 150;
          const xpPercent = Math.min(100, Math.max(0, (guppy.xp / nextLevelXp) * 100));
          const hungerPercent = Math.min(100, Math.max(0, guppy.hunger));
          
          return (
            <div key={guppy.id} className="bg-white rounded-[20px] border border-slate-200 p-4 flex flex-col gap-4 shadow-sm relative overflow-hidden">
              
              {/* Header: Guppy Icon + Info */}
              <div className="flex gap-4 items-center">
                <div className="relative w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center shrink-0 shadow-inner">
                  <div className="w-14 h-14 pointer-events-none drop-shadow-md flex items-center justify-center">
                    <GuppySVG 
                      bodyColor={guppy.data.body_color} 
                      tailColor={guppy.data.tail_color} 
                      patternColor={guppy.data.pattern_color} 
                      expression={guppy.expression} 
                      pose="side"
                      hideFloaters
                    />
                  </div>
                  <div className="absolute -bottom-2 -right-2 w-7 h-7 bg-yellow-400 text-yellow-900 font-black rounded-full flex items-center justify-center text-xs border-2 border-white shadow-sm z-10">
                    {guppy.level}
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col xl:flex-row xl:items-center justify-between mb-2 gap-2">
                    <h3 className="text-lg font-black text-slate-800 flex items-center gap-2 break-keep">
                      <span className="truncate">{guppy.data.guppy_name}</span>
                      <span className="text-slate-300 hover:text-blue-500 cursor-pointer transition-colors shrink-0">✎</span>
                    </h3>
                    <div className={`self-start px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 shrink-0 ${getStatusColor(guppy.hunger)}`}>
                      <span>{guppy.hunger > 70 ? '😋' : guppy.hunger > 30 ? '😐' : '🥺'}</span> {getStatusText(guppy.hunger)}
                    </div>
                  </div>
                  <p className="text-xs font-bold text-slate-500 mt-0.5">종류: {guppy.data.rarity}</p>
                </div>
              </div>

              {/* Progress Bars */}
              <div className="flex flex-col gap-4">
                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-500 mb-1.5">
                    <span>체내 포만도 Satiety</span>
                    <span>{Math.floor(guppy.hunger)}%</span>
                  </div>
                  <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-400 rounded-full"
                      style={{ width: `${hungerPercent}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-500 mb-1.5">
                    <span>경험치 (XP)</span>
                    <span>{Math.floor(guppy.xp)} / {nextLevelXp}</span>
                  </div>
                  <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-purple-500 rounded-full"
                      style={{ width: `${xpPercent}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-slate-50 rounded-xl p-3 flex flex-col items-center justify-center gap-1 border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold">개별 인지 시야</span>
                  <span className="text-sm font-black text-slate-700">{Math.round((guppy.stats.vision / 800) * 100)}%</span>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 flex flex-col items-center justify-center gap-1 border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold">개별 유영 속도</span>
                  <span className="text-sm font-black text-slate-700">{Math.round(guppy.stats.speed * 100)}%</span>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 flex flex-col items-center justify-center gap-1 border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold">태생 골격 크기</span>
                  <span className="text-sm font-black text-slate-700">{Math.round((guppy.stats.size / 0.3) * 100)}%</span>
                </div>
              </div>

              {/* Special Ability */}
              <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-100">
                <div className="flex items-center gap-1.5 text-blue-600 font-bold text-sm mb-1">
                  <span className="text-yellow-500">✨</span> 레벨 특수 능력: {guppy.data.rarity === '전설' ? '바다의 파수꾼 민첩' : guppy.data.rarity === '희귀' ? '은빛 비늘의 가호' : '활기찬 헤엄'}
                </div>
                <p className="text-xs text-slate-600">
                  {guppy.data.rarity === '전설' 
                    ? '수류 저항을 완전히 이겨내어 헤엄치는 속도가 영구 향상됩니다.' 
                    : guppy.data.rarity === '희귀' 
                    ? '시야가 넓어지고 먹이를 찾는 반응 속도가 빨라집니다.' 
                    : '기본적인 성장 속도와 활동성이 약간 증가합니다.'}
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-auto pt-2">
                <button 
                  onClick={() => handleCommune(guppy.id)}
                  disabled={gold < 10}
                  className={`flex-1 py-2.5 rounded-xl flex items-center justify-center gap-1 text-xs font-bold transition-colors ${gold >= 10 ? 'bg-pink-50 text-pink-600 hover:bg-pink-100' : 'bg-slate-50 text-slate-400 cursor-not-allowed'}`}
                >
                  <Heart className="w-4 h-4" />
                  교감하기 (XP +1)
                  <span className="text-xs flex items-center ml-1 text-slate-400"><span className="text-sm mr-0.5">🍿</span>10</span>
                </button>
                <button 
                  onClick={() => setReleasingGuppy(guppy)}
                  className="px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl flex items-center justify-center gap-1 text-xs font-bold transition-colors"
                >
                  <span className="text-xs flex items-center mr-1"><span className="text-sm mr-0.5">🍿</span>{getExpectedGold(guppy)}</span>
                  자연 방출하기
                </button>
              </div>
            </div>
          );
        })}
      </div>
      
      {guppies.length === 0 && (
        <div className="text-center py-20 text-slate-400 font-medium">
          현재 어항에 생물이 없습니다.
        </div>
      )}
      
      <AnimatePresence>
        {releasingGuppy && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4 backdrop-blur-sm rounded-[24px]"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-white rounded-2xl p-6 shadow-xl max-w-sm w-full flex flex-col items-center text-center"
            >
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-red-500 mb-4">
                <Wind className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-slate-800 mb-2">{releasingGuppy.data.guppy_name} 방생하기</h3>
              <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                정말로 이 생물을 자연으로 돌려보내시겠습니까?<br/>방생 시 아래의 먹이 선물을 획득하며 되돌릴 수 없습니다.
              </p>
              
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 w-full mb-6">
                <div className="flex justify-between items-center text-sm font-bold text-slate-700 mb-2">
                  <span>예상 보상 (골드)</span>
                  <span className="flex items-center text-blue-600 text-lg">
                    <span className="mr-1">🍿</span>{getExpectedGold(releasingGuppy)}
                  </span>
                </div>
                <div className="flex flex-col gap-1 mt-3 pt-3 border-t border-slate-200">
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>레벨 ({releasingGuppy.level}) 보상</span>
                    <span>{releasingGuppy.level * 50}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>등급 ({releasingGuppy.data.rarity}) 배수</span>
                    <span>x{releasingGuppy.data.rarity === '전설' ? 5 : releasingGuppy.data.rarity === '희귀' ? 2 : 1}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>스탯 보너스</span>
                    <span>+{Math.floor(releasingGuppy.stats.speed * 50)}</span>
                  </div>
                </div>
              </div>

              <div className="flex w-full gap-3">
                <button
                  onClick={() => setReleasingGuppy(null)}
                  className="flex-1 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={() => handleRelease(releasingGuppy.id, getExpectedGold(releasingGuppy))}
                  className="flex-1 py-3 rounded-xl font-bold text-white bg-red-500 hover:bg-red-600 shadow-sm shadow-red-500/20 transition-colors"
                >
                  방생하기
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div></div>
  );
}, (prev, next) => {
  if (prev.gold !== next.gold) return false;
  if (prev.guppies.length !== next.guppies.length) return false;
  for(let i=0; i<prev.guppies.length; i++) {
    if (prev.guppies[i].id !== next.guppies[i].id) return false;
    if (prev.guppies[i].level !== next.guppies[i].level) return false;
    if (Math.abs(prev.guppies[i].xp - next.guppies[i].xp) > 1) return false;
    if (Math.abs(prev.guppies[i].hunger - next.guppies[i].hunger) > 1) return false;
  }
  return true;
});
