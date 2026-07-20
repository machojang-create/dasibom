import { useState } from 'react';
import { PLANT_TYPES, PHRASES } from '../data';
import { EncyclopediaEntry, PlantData, DialectType } from '../types';
import { X, Lock, MapPin, Quote, Leaf } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  entries: EncyclopediaEntry[];
  badges: string[];
}

const REGION_MAP: Record<DialectType, string> = {
  gyeongsang: '경상도',
  jeolla: '전라도',
  chungcheong: '충청도',
  gangwon: '강원도',
  jeju: '제주도',
  pyongan: '평안도',
};

export default function EncyclopediaView({ isOpen, onClose, entries, badges }: Props) {
  const [selectedPlant, setSelectedPlant] = useState<PlantData | null>(null);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <div className="bg-gradient-to-b from-[#1c3326] to-[#121f18] p-8 rounded-[2rem] w-full max-w-lg shadow-2xl border border-[#2a4d3a] max-h-[85vh] overflow-y-auto relative">
        <div className="sticky top-0 bg-gradient-to-b from-[#1c3326] to-[#1c3326]/0 pt-2 pb-6 z-20 flex justify-between items-center mb-2">
           <h2 className="text-2xl font-bold text-[#e8f3ec]">식물 도감</h2>
           <button onClick={onClose} className="p-2 bg-[#0a120e]/50 rounded-full hover:bg-[#2a4d3a] text-[#89a896] hover:text-white transition-colors">
             <X className="w-5 h-5" />
           </button>
        </div>
        
        {/* System Guides */}
        <div className="mb-8 space-y-6">
          <div>
            <h3 className="text-lg font-bold text-[#a8c7b5] mb-3 flex items-center gap-2">
              <span>⏰</span> 시간대별 행동 보너스
            </h3>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-[#0a120e]/40 p-3 rounded-xl border border-[#2a4d3a] flex flex-col items-center text-center">
                <span className="text-orange-400 text-lg mb-1">🌅 아침</span>
                <span className="text-[#a8c7b5] text-xs font-bold mb-1">쓰다듬기</span>
                <span className="text-[#89a896] text-[10px]">기분 좋아짐</span>
              </div>
              <div className="bg-[#0a120e]/40 p-3 rounded-xl border border-[#2a4d3a] flex flex-col items-center text-center">
                <span className="text-blue-400 text-lg mb-1">☀️ 낮</span>
                <span className="text-[#a8c7b5] text-xs font-bold mb-1">물주기</span>
                <span className="text-[#89a896] text-[10px]">수분 회복량 3배</span>
              </div>
              <div className="bg-[#0a120e]/40 p-3 rounded-xl border border-[#2a4d3a] flex flex-col items-center text-center">
                <span className="text-indigo-400 text-lg mb-1">🌙 밤</span>
                <span className="text-[#a8c7b5] text-xs font-bold mb-1">영양제</span>
                <span className="text-[#89a896] text-[10px]">수분 1.5배 증가</span>
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-bold text-[#a8c7b5] mb-3 flex items-center gap-2">
              <span>🌦️</span> 날씨별 식물 상태 (1분당 변화)
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-[#0a120e]/40 p-2 rounded-xl border border-[#2a4d3a] flex items-center text-xs gap-2">
                <span className="text-yellow-400 text-xl">☀️</span>
                <div className="flex flex-col"><span className="text-[#a8c7b5] font-bold">맑음</span><span className="text-[#89a896] text-[10px]">수분 -2, 코인 +1</span></div>
              </div>
              <div className="bg-[#0a120e]/40 p-2 rounded-xl border border-[#2a4d3a] flex items-center text-xs gap-2">
                <span className="text-blue-400 text-xl">🌧️</span>
                <div className="flex flex-col"><span className="text-[#a8c7b5] font-bold">비</span><span className="text-[#89a896] text-[10px]">수분 +5, 코인 없음</span></div>
              </div>
              <div className="bg-[#0a120e]/40 p-2 rounded-xl border border-[#2a4d3a] flex items-center text-xs gap-2">
                <span className="text-gray-400 text-xl">☁️</span>
                <div className="flex flex-col"><span className="text-[#a8c7b5] font-bold">흐림</span><span className="text-[#89a896] text-[10px]">수분 -1</span></div>
              </div>
              <div className="bg-[#0a120e]/40 p-2 rounded-xl border border-[#2a4d3a] flex items-center text-xs gap-2">
                <span className="text-cyan-200 text-xl">❄️</span>
                <div className="flex flex-col"><span className="text-[#a8c7b5] font-bold">눈</span><span className="text-[#89a896] text-[10px]">성장 정지, 코인 없음</span></div>
              </div>
              <div className="bg-[#0a120e]/40 p-2 rounded-xl border border-[#2a4d3a] flex items-center text-xs gap-2">
                <span className="text-red-400 text-xl">🔥</span>
                <div className="flex flex-col"><span className="text-[#a8c7b5] font-bold">고온</span><span className="text-[#89a896] text-[10px]">수분 -4, 코인 +3</span></div>
              </div>
              <div className="bg-[#0a120e]/40 p-2 rounded-xl border border-[#2a4d3a] flex items-center text-xs gap-2">
                <span className="text-blue-200 text-xl">✨</span>
                <div className="flex flex-col"><span className="text-[#a8c7b5] font-bold">쾌청</span><span className="text-[#89a896] text-[10px]">성장 2배, 코인 +2</span></div>
              </div>
              <div className="bg-[#0a120e]/40 p-2 rounded-xl border border-[#2a4d3a] flex items-center text-xs gap-2 col-span-2">
                <span className="text-gray-500 text-xl">🌀</span>
                <div className="flex flex-col"><span className="text-[#a8c7b5] font-bold">태풍</span><span className="text-[#89a896] text-[10px]">수분 -3, 성장 정지, 코인 없음</span></div>
              </div>
            </div>
          </div>
        </div>

        {/* Badges Section */}
        <div className="mb-8">
          <h3 className="text-lg font-bold text-[#a8c7b5] mb-3 flex items-center gap-2">
            <span>🏆</span> 획득한 업적 배지
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { id: 'first_grad', name: '초보 정원사', emoji: '🌱', desc: '첫 만개' },
              { id: 'grad_3', name: '능숙한 정원사', emoji: '🌿', desc: '만개 3회' },
              { id: 'grad_6', name: '마스터 정원사', emoji: '🌳', desc: '만개 6회' }
            ].map(badge => {
              const isUnlocked = badges.includes(badge.id);
              return (
                <div key={badge.id} className={`flex flex-col items-center p-3 rounded-xl border ${isUnlocked ? 'bg-[#0a120e]/40 border-[#d4af37]/50 shadow-[0_0_15px_rgba(212,175,55,0.15)]' : 'bg-[#0a120e]/20 border-[#1c3326] opacity-40'} transition-all`}>
                  <div className={`text-3xl mb-1 ${isUnlocked ? 'filter drop-shadow-md animate-pulse' : 'grayscale opacity-50'}`}>{badge.emoji}</div>
                  <span className={`text-xs font-bold text-center ${isUnlocked ? 'text-[#d4af37]' : 'text-[#4a7c59]'}`}>{badge.name}</span>
                  <span className={`text-[10px] text-center mt-1 ${isUnlocked ? 'text-[#89a896]' : 'text-[#4a7c59]/50'}`}>{badge.desc}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid gap-4 relative z-10">
          {PLANT_TYPES.map(plant => {
            const entry = entries.find(e => e.plantId === plant.id);
            const discovered = entry?.discovered;
            return (
              <div 
                key={plant.id} 
                onClick={() => discovered && setSelectedPlant(plant)}
                className={`p-5 rounded-2xl border transition-all ${discovered ? 'bg-[#0a120e]/40 border-[#2a4d3a] hover:border-[#4a7c59] cursor-pointer' : 'bg-[#0a120e]/20 border-[#1c3326] opacity-70'}`}
              >
                {discovered ? (
                  <>
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{plant.emoji}</span>
                        <h3 className="font-bold text-xl text-[#d4af37]">{plant.name}</h3>
                        {entry?.graduated && (
                          <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded-sm font-bold border border-yellow-500/30">만개 완료</span>
                        )}
                      </div>
                      <span className="text-xs bg-[#4a7c59]/20 text-[#4a7c59] px-2 py-1 rounded-md font-mono">{REGION_MAP[plant.dialect]}</span>
                    </div>
                    <p className="text-sm text-[#89a896] leading-relaxed mb-3">{plant.description}</p>
                    <div className="space-y-1 bg-[#121f18] p-3 rounded-lg border border-[#1c3326]">
                      <div className="flex text-xs">
                        <span className="w-16 font-bold text-[#4a7c59]">말투</span>
                        <span className="text-[#a8c7b5] flex-1">{plant.accent}</span>
                      </div>
                      <div className="flex text-xs">
                        <span className="w-16 font-bold text-[#4a7c59]">선호 환경</span>
                        <span className="text-[#a8c7b5] flex-1">{plant.environment}</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-3 py-2 text-[#4a7c59]">
                    <Lock className="w-5 h-5" />
                    <h3 className="font-bold text-lg">알 수 없는 식물</h3>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedPlant && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="bg-gradient-to-b from-[#1c3326] to-[#121f18] p-6 md:p-8 rounded-[2rem] w-full max-w-sm shadow-2xl border border-[#2a4d3a] relative overflow-hidden">
            <button 
              onClick={() => setSelectedPlant(null)} 
              className="absolute top-4 right-4 p-2 bg-[#0a120e]/50 rounded-full hover:bg-[#2a4d3a] text-[#89a896] hover:text-white transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="text-center mb-6">
              <div className="text-6xl mb-4 filter drop-shadow-lg animate-bounce">{selectedPlant.emoji}</div>
              <h3 className="text-2xl font-bold text-[#d4af37] mb-1">{selectedPlant.name}</h3>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#2a4d3a]/50 text-[#a8c7b5] text-xs rounded-full">
                <MapPin className="w-3.5 h-3.5" />
                {REGION_MAP[selectedPlant.dialect]} 출신
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-[#0a120e]/60 p-4 rounded-xl border border-[#2a4d3a]">
                <h4 className="flex items-center gap-2 text-[#4a7c59] font-bold text-sm mb-2">
                  <Leaf className="w-4 h-4" /> 특징 및 환경
                </h4>
                <p className="text-[#a8c7b5] text-sm leading-relaxed mb-3">
                  {selectedPlant.description}
                </p>
                <div className="bg-[#1c3326]/50 p-2.5 rounded-lg border border-[#2a4d3a]/50">
                  <span className="text-[#4a7c59] text-xs font-bold block mb-1">선호 환경</span>
                  <span className="text-[#89a896] text-xs">{selectedPlant.environment}</span>
                </div>
              </div>

              <div className="bg-[#0a120e]/60 p-4 rounded-xl border border-[#2a4d3a]">
                <h4 className="flex items-center gap-2 text-[#4a7c59] font-bold text-sm mb-2">
                  <Quote className="w-4 h-4" /> 사투리 예시 ({REGION_MAP[selectedPlant.dialect]})
                </h4>
                <p className="text-[#89a896] text-xs mb-3 italic">
                  "{selectedPlant.accent}"
                </p>
                <div className="space-y-2">
                  <div className="bg-[#1c3326]/50 p-3 rounded-lg border border-[#2a4d3a]/50 relative">
                    <div className="absolute -left-1.5 top-3 w-3 h-3 bg-[#1c3326] rotate-45 border-l border-b border-[#2a4d3a]/50"></div>
                    <span className="text-[#e8f3ec] text-sm leading-relaxed block break-keep">
                      "{PHRASES[selectedPlant.dialect].mature[0]}"
                    </span>
                  </div>
                  <div className="bg-[#1c3326]/50 p-3 rounded-lg border border-[#2a4d3a]/50 relative">
                    <div className="absolute -left-1.5 top-3 w-3 h-3 bg-[#1c3326] rotate-45 border-l border-b border-[#2a4d3a]/50"></div>
                    <span className="text-[#e8f3ec] text-sm leading-relaxed block break-keep">
                      "{PHRASES[selectedPlant.dialect].old[0]}"
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
