import { useState } from 'react';
import { PLANT_TYPES, PHRASES } from '../data';
import { EncyclopediaEntry, PlantData, DialectType } from '../types';
import { X, Lock, MapPin, Quote, Leaf } from 'lucide-react';
import PlantArt from './PlantArt';

/* 식물 도감 — 씨앗 상점과 동일한 화이트·크림 스킨(2026-07-21 통일), 2열 그리드 */
interface Memorial { name: string; customName?: string; emoji?: string; type?: string; level: number; days: number; at: number }

interface Props {
  isOpen: boolean;
  onClose: () => void;
  entries: EncyclopediaEntry[];
  badges: string[];
  memorials?: Memorial[];
}

const REGION_MAP: Record<DialectType, string> = {
  gyeongsang: '경상도',
  jeolla: '전라도',
  chungcheong: '충청도',
  gangwon: '강원도',
  jeju: '제주도',
  pyongan: '평안도',
};

export default function EncyclopediaView({ isOpen, onClose, entries, badges, memorials }: Props) {
  const [selectedPlant, setSelectedPlant] = useState<PlantData | null>(null);

  if (!isOpen) return null;

  const discoveredCount = entries.filter(e => e.discovered).length;

  return (
    <div className="fixed inset-0 bg-black/45 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="dsb-modal-pop bg-gradient-to-b from-[#FFFDF7] to-[#FBF3E4] p-6 md:p-7 rounded-[28px] w-full max-w-md max-h-[85vh] shadow-2xl border-2 border-white relative overflow-hidden flex flex-col">
        <div className="absolute -top-16 -left-16 w-44 h-44 bg-[#8fce7a] rounded-full blur-[70px] opacity-20 pointer-events-none" />
        <div className="flex justify-between items-center mb-4 relative z-10 shrink-0">
          <div>
            <h2 className="text-2xl font-black text-[#5b3a1a]">📖 식물 도감</h2>
            <p className="text-[14px] text-[#9a7a52] font-bold mt-0.5">스물여덟 친구 중 <span className="text-[#4e8040]">{discoveredCount}</span>명을 만났어요</p>
          </div>
          <button onClick={onClose} aria-label="닫기" className="w-11 h-11 grid place-items-center bg-[#5b3a1a]/8 rounded-full hover:bg-[#5b3a1a]/15 text-[#8a6a48] transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="relative z-10 overflow-y-auto no-scrollbar pb-2 flex-1 flex flex-col gap-5">

          {/* 키우기 도움말 — 시간대·날씨 */}
          <div>
            <h3 className="text-[15px] font-black text-[#7a5f3e] mb-2 flex items-center gap-1.5">⏰ 시간대별 보너스</h3>
            <div className="grid grid-cols-3 gap-2">
              {[
                { e: '🌅', t: '아침', d: '쓰다듬기', s: '기분 좋아져요' },
                { e: '☀️', t: '낮', d: '물주기', s: '수분 회복 3배' },
                { e: '🌙', t: '밤', d: '영양제', s: '수분 1.5배' },
              ].map(x => (
                <div key={x.t} className="bg-white border-2 border-[#EFE4D2] p-2.5 rounded-2xl flex flex-col items-center text-center shadow-sm">
                  <span className="text-lg">{x.e} <b className="text-[13px] text-[#4a3a26]">{x.t}</b></span>
                  <span className="text-[12px] font-black text-[#c8784a]">{x.d}</span>
                  <span className="text-[11px] text-[#9a7a52] font-bold">{x.s}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-[15px] font-black text-[#7a5f3e] mb-2 flex items-center gap-1.5">🌦️ 날씨별 변화 <span className="text-[11px] font-bold text-[#9a7a52]">(10분당)</span></h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { e: '☀️', t: '맑음', d: '수분 -5' }, { e: '🌧️', t: '비', d: '수분 +10' },
                { e: '☁️', t: '흐림', d: '수분 -3' }, { e: '❄️', t: '눈', d: '수분 그대로' },
                { e: '🔥', t: '고온', d: '수분 -10' }, { e: '✨', t: '쾌청', d: '-5 · 성장 2배' },
              ].map(x => (
                <div key={x.t} className="bg-white border-2 border-[#EFE4D2] px-3 py-2 rounded-2xl flex items-center gap-2 shadow-sm">
                  <span className="text-lg">{x.e}</span>
                  <span className="text-[13px] font-black text-[#4a3a26]">{x.t}</span>
                  <span className="text-[12px] font-bold text-[#9a7a52] ml-auto">{x.d}</span>
                </div>
              ))}
              <div className="bg-white border-2 border-[#EFE4D2] px-3 py-2 rounded-2xl flex items-center gap-2 shadow-sm col-span-2">
                <span className="text-lg">🌀</span>
                <span className="text-[13px] font-black text-[#4a3a26]">태풍</span>
                <span className="text-[12px] font-bold text-[#9a7a52] ml-auto">수분 -7 · 성장 쉬어요</span>
              </div>
            </div>
          </div>

          {/* 추억 정원 — 만개하여 떠난 친구들 */}
          {memorials && memorials.length > 0 && (
            <div>
              <h3 className="text-[15px] font-black text-[#7a5f3e] mb-2 flex items-center gap-1.5">🌸 추억 정원 <span className="text-[11px] font-bold text-[#9a7a52]">만개하여 떠난 친구들</span></h3>
              <div className="grid grid-cols-2 gap-2.5">
                {memorials.slice().reverse().map((m, i) => (
                  <div key={i} className="bg-white p-3 rounded-2xl border-2 border-[#f3d9a8] flex flex-col items-center text-center shadow-sm">
                    {m.type
                      ? <div className="w-11 h-13 flex items-end justify-center mb-1"><PlantArt type={m.type} bloom className="w-10 h-12" /></div>
                      : <span className="text-3xl mb-1 drop-shadow-sm">{m.emoji || '🌸'}</span>}
                    <span className="text-[#b8860b] font-black text-[14px] break-keep">{m.customName || m.name}</span>
                    {m.customName && <span className="text-[#9a7a52] text-[11px] font-bold">{m.name}</span>}
                    <span className="text-[#7a5f3e] text-[12px] font-bold mt-0.5">{m.days}일 함께 · Lv.{m.level}</span>
                    <span className="text-[#9a7a52] text-[11px] font-bold">{new Date(m.at).toLocaleDateString('ko-KR')} 만개</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 업적 배지 */}
          <div>
            <h3 className="text-[15px] font-black text-[#7a5f3e] mb-2 flex items-center gap-1.5">🏆 업적 배지</h3>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'first_grad', name: '초보 정원사', emoji: '🌱', desc: '첫 만개' },
                { id: 'grad_3', name: '능숙한 정원사', emoji: '🌿', desc: '만개 3회' },
                { id: 'grad_6', name: '마스터 정원사', emoji: '🌳', desc: '만개 6회' }
              ].map(badge => {
                const isUnlocked = badges.includes(badge.id);
                return (
                  <div key={badge.id} className={`flex flex-col items-center p-2.5 rounded-2xl border-2 shadow-sm ${isUnlocked ? 'bg-white border-[#f3d9a8]' : 'bg-white/50 border-[#EFE4D2] opacity-50'}`}>
                    <div className={`text-2xl mb-0.5 ${isUnlocked ? 'drop-shadow-sm' : 'grayscale'}`}>{badge.emoji}</div>
                    <span className={`text-[12px] font-black text-center leading-tight ${isUnlocked ? 'text-[#b8860b]' : 'text-[#9a7a52]'}`}>{badge.name}</span>
                    <span className="text-[11px] font-bold text-[#9a7a52] mt-0.5">{badge.desc}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 식물 친구들 — 2열 카드 */}
          <div>
            <h3 className="text-[15px] font-black text-[#7a5f3e] mb-2 flex items-center gap-1.5">🌼 식물 친구들</h3>
            <div className="grid grid-cols-2 gap-2.5">
              {PLANT_TYPES.map(plant => {
                const entry = entries.find(e => e.plantId === plant.id);
                const discovered = entry?.discovered;
                return (
                  <div
                    key={plant.id}
                    onClick={() => discovered && setSelectedPlant(plant)}
                    className={`p-3 rounded-2xl border-2 transition-all shadow-sm ${discovered ? 'bg-white border-[#EFE4D2] hover:border-[#d4a95f] hover:shadow-md cursor-pointer active:scale-[0.97]' : 'bg-white/50 border-[#EFE4D2] opacity-60'}`}
                  >
                    {discovered ? (
                      <div className="flex flex-col items-center text-center">
                        <div className="w-16 h-[70px] bg-gradient-to-b from-[#F6FBF2] to-[#eaf4e2] rounded-xl flex items-end justify-center overflow-hidden pt-1 mb-1.5">
                          <PlantArt type={plant.type} bloom className="w-12 h-14" />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-black text-[15px] text-[#4a3a26]">{plant.name}</h4>
                          {entry?.graduated && <span className="text-[10px] bg-yellow-50 text-[#b8860b] px-1.5 py-0.5 rounded-full font-black border border-[#f3d9a8]">만개</span>}
                        </div>
                        <span className="text-[11px] font-bold text-[#4e8040] bg-green-50 px-2 py-0.5 rounded-full mt-1">{REGION_MAP[plant.dialect]}</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-center py-4 text-[#9a7a52]">
                        <Lock className="w-6 h-6 mb-1.5 opacity-60" />
                        <span className="font-black text-[13px]">아직 못 만난 친구</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 상세 카드 */}
      {selectedPlant && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-sm flex items-center justify-center p-4 z-[60]" onClick={() => setSelectedPlant(null)}>
          <div className="dsb-modal-pop bg-gradient-to-b from-[#FFFDF7] to-[#FBF3E4] p-6 rounded-[28px] w-full max-w-sm shadow-2xl border-2 border-white relative overflow-hidden max-h-[85vh] overflow-y-auto no-scrollbar" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setSelectedPlant(null)}
              aria-label="닫기"
              className="absolute top-4 right-4 w-11 h-11 grid place-items-center bg-[#5b3a1a]/8 rounded-full hover:bg-[#5b3a1a]/15 text-[#8a6a48] transition-colors z-10"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="text-center mb-5">
              <div className="mb-2 flex justify-center"><PlantArt type={selectedPlant.type} bloom className="w-28 h-32" /></div>
              <h3 className="text-2xl font-black text-[#5b3a1a] mb-1">{selectedPlant.name}</h3>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 text-[#4e8040] text-[12px] font-black rounded-full border border-green-100">
                <MapPin className="w-3.5 h-3.5" />
                {REGION_MAP[selectedPlant.dialect]} 출신
              </div>
            </div>

            <div className="space-y-3">
              <div className="bg-white p-4 rounded-2xl border-2 border-[#EFE4D2] shadow-sm">
                <h4 className="flex items-center gap-1.5 text-[#4e8040] font-black text-[13px] mb-1.5">
                  <Leaf className="w-4 h-4" /> 특징과 환경
                </h4>
                <p className="text-[#4a3a26] text-[14px] font-medium leading-relaxed mb-2">{selectedPlant.description}</p>
                <div className="bg-[#F6FBF2] p-2.5 rounded-xl border border-[#e2eeda]">
                  <span className="text-[#4e8040] text-[12px] font-black block mb-0.5">좋아하는 자리</span>
                  <span className="text-[#7a5f3e] text-[13px] font-bold">{selectedPlant.environment}</span>
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border-2 border-[#EFE4D2] shadow-sm">
                <h4 className="flex items-center gap-1.5 text-[#c8784a] font-black text-[13px] mb-1.5">
                  <Quote className="w-4 h-4" /> 이런 말투로 말해요
                </h4>
                <p className="text-[#9a7a52] text-[12px] font-bold mb-2 italic">{selectedPlant.accent}</p>
                <div className="space-y-2">
                  <div className="bg-[#FBF3E4] p-3 rounded-xl rounded-bl-sm border border-[#EFE4D2]">
                    <span className="text-[#4a3a26] text-[14px] font-bold leading-relaxed block break-keep">"{PHRASES[selectedPlant.dialect].mature[0]}"</span>
                  </div>
                  <div className="bg-[#FBF3E4] p-3 rounded-xl rounded-bl-sm border border-[#EFE4D2]">
                    <span className="text-[#4a3a26] text-[14px] font-bold leading-relaxed block break-keep">"{PHRASES[selectedPlant.dialect].old[0]}"</span>
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
