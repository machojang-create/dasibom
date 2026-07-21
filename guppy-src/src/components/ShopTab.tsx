import Petal from './Petal';
import React from 'react';
import { Coins } from 'lucide-react';

interface ShopTabProps {
  spendPetal?: any;
  petals?: number;
  gold: number;
  setGold: React.Dispatch<React.SetStateAction<number>>;
  shopTab: 'food' | 'decor';
  setShopTab: React.Dispatch<React.SetStateAction<'food' | 'decor'>>;
  foodInventory: { normal: number, premium: number, shrimp: number, krill: number };
  setFoodInventory: React.Dispatch<React.SetStateAction<{ normal: number, premium: number, shrimp: number, krill: number }>>;
  foodTechLevel: number;
  setFoodTechLevel: React.Dispatch<React.SetStateAction<number>>;
  decorations: string[];
  setDecorations: React.Dispatch<React.SetStateAction<string[]>>;
}

export const ShopTab = React.memo(function ShopTab({
  spendPetal,
  petals,
  gold,
  setGold,
  shopTab,
  setShopTab,
  foodInventory,
  setFoodInventory,
  foodTechLevel,
  setFoodTechLevel,
  decorations,
  setDecorations
}: ShopTabProps) {
  const toggleDecoration = (id: string, petalCost: number) => {
    if (decorations.includes(id)) {
      setDecorations(prev => prev.filter(d => d !== id));
      return;
    }
    // 장식은 다시봄 꽃잎으로(서버 차감 성공 시에만 설치)
    (spendPetal as any)('guppy_decor_' + id, (ok: boolean) => {
      if (ok) setDecorations(prev => [...prev, id]);
    });
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 rounded-[24px] border border-slate-200 flex flex-col shadow-sm relative h-full">
      <div className="p-4 pb-3 flex flex-col gap-4 shrink-0 bg-white border-b border-slate-100 rounded-t-[24px]">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-400 rounded-full flex items-center justify-center text-amber-950 font-black shadow-inner">
              <Coins className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800 tracking-tight">꽃잎 상점</h2>
              <p className="text-sm text-slate-500 font-medium mt-1">기본 밥은 무료! 좋은 먹이와 장식은 꽃잎으로</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-4 py-2 bg-blue-50 text-blue-800 rounded-2xl border border-blue-100 shadow-sm">
            <Petal className="w-5 h-5" />
            <span className="font-black text-xl">{(petals ?? 0).toLocaleString()}</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 bg-slate-100/50 p-1.5 rounded-2xl border border-slate-200">
          <button 
            onClick={() => setShopTab('food')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl font-bold text-xs transition-colors ${shopTab === 'food' ? 'bg-white text-slate-800 shadow-sm border border-slate-200' : 'text-slate-500 hover:bg-slate-200/50'}`}
          >
            <span>🥫</span> 먹이 연구소
          </button>
          <button 
            onClick={() => setShopTab('decor')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl font-bold text-xs transition-colors ${shopTab === 'decor' ? 'bg-white text-slate-800 shadow-sm border border-slate-200' : 'text-slate-500 hover:bg-slate-200/50'}`}
          >
            <span>🏰</span> 장식품
          </button>
        </div>
      </div>

      <div className="flex-1 p-4 overflow-y-auto">
        {shopTab === 'food' && (
          <div className="flex flex-col gap-6">
            <div className="bg-blue-50/50 rounded-2xl p-4 sm:p-6 border border-blue-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
              <div className="flex-1 pr-2">
                <h3 className="font-black text-blue-900 text-base sm:text-lg flex items-center gap-2">
                  <span>🔬</span> 먹이 영양 연구소 Lv.{foodTechLevel}
                </h3>
                <p className="text-xs sm:text-sm text-blue-700/70 mt-1 font-medium leading-relaxed">먹이의 영양가를 높여 구피의 성장 속도와 포만감을 영구적으로 증가시킵니다.</p>
              </div>
              <button 
                onClick={() => {
                  if (foodTechLevel >= 5) return;
                  (spendPetal as any)('guppy_tech' + (foodTechLevel + 1), (ok: boolean) => {
                    if (ok) setFoodTechLevel(prev => prev + 1);
                  });
                }}
                disabled={foodTechLevel >= 5 || (petals ?? 0) < foodTechLevel * 50}
                className={`px-4 sm:px-6 py-3 rounded-xl font-black text-sm flex flex-row sm:flex-col items-center justify-center gap-2 sm:gap-0 shadow-sm transition-colors w-full sm:w-auto shrink-0 ${foodTechLevel >= 5 ? 'bg-slate-200 text-slate-400' : (petals ?? 0) >= foodTechLevel * 50 ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-slate-200 text-slate-400'}`}
              >
                {foodTechLevel >= 5 ? '최대 레벨 도달' : (
                  <>
                    <span>레벨업</span>
                    <span className="text-xs font-bold opacity-90 mt-0.5 flex items-center gap-1"><Petal className="w-3.5 h-3.5" /> {foodTechLevel * 50}</span>
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Normal */}
              <div className="bg-white p-4 rounded-[20px] border border-slate-200 shadow-sm flex flex-col relative overflow-hidden">
                <div className="absolute top-3 right-3 sm:top-4 sm:right-4 text-[10px] sm:text-xs font-bold text-slate-400 bg-slate-100 px-2 sm:px-3 py-1 rounded-full z-10">
                  보유량 {foodInventory.normal}개
                </div>
                <div className="flex items-start gap-3 sm:gap-4 mb-4 pt-6 sm:pt-0">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-3xl sm:text-4xl shadow-inner border border-slate-100 shrink-0">
                    🍞
                  </div>
                  <div className="flex-1 min-w-0 pr-0 sm:pr-24">
                    <h4 className="font-black text-slate-800 text-lg truncate block">
                      일반 물고기 밥
                    </h4>
                    <span className="block text-xs font-bold text-slate-500 mb-1 truncate">Normal Food</span>
                    <div className="flex flex-wrap gap-1 sm:gap-2 mt-1">
                      <span className="text-[10px] sm:text-[11px] font-bold text-emerald-600 bg-emerald-50 px-1.5 sm:px-2 py-0.5 rounded-full border border-emerald-100 whitespace-nowrap">⚡ 허기 +{Math.floor(10 * (1 + (foodTechLevel - 1) * 0.15))}</span>
                      <span className="text-[10px] sm:text-[11px] font-bold text-blue-600 bg-blue-50 px-1.5 sm:px-2 py-0.5 rounded-full border border-blue-100 whitespace-nowrap">✨ XP +{Math.floor(5 * (1 + (foodTechLevel - 1) * 0.15))}</span>
                    </div>
                  </div>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 font-medium mb-5 sm:mb-6 leading-relaxed">
                  가장 기본적인 물고기 사료입니다. 영양가는 평범하지만 배를 채우는 데에는 충분합니다.
                </p>
                <div className="flex gap-2 mt-auto">
                  <button onClick={() => { setFoodInventory(prev=>({...prev, normal: prev.normal+10})); }} className="flex-1 bg-[#a855f7] hover:bg-[#9333ea] text-white rounded-xl py-2 sm:py-3 flex flex-col items-center justify-center transition-colors shadow-sm">
                    <span className="text-[11px] sm:text-xs font-bold mb-0.5">10개 구매</span>
                    <span className="text-xs sm:text-sm font-black flex items-center gap-1">무료</span>
                  </button>
                  <button onClick={() => { setFoodInventory(prev=>({...prev, normal: prev.normal+50})); }} className="flex-1 bg-[#a855f7] hover:bg-[#9333ea] text-white rounded-xl py-2 sm:py-3 flex flex-col items-center justify-center transition-colors shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 bg-pink-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-bl-lg z-10 scale-[0.85] origin-top-right sm:scale-100">10% 할인</div>
                    <span className="text-[11px] sm:text-xs font-bold mb-0.5 mt-1 sm:mt-0 relative z-0">50개 구매</span>
                    <span className="text-xs sm:text-sm font-black flex items-center gap-1 relative z-0">무료</span>
                  </button>
                </div>
              </div>

              {/* Premium */}
              <div className="bg-white p-4 rounded-[20px] border border-slate-200 shadow-sm flex flex-col relative overflow-hidden">
                <div className="absolute top-3 right-3 sm:top-4 sm:right-4 text-[10px] sm:text-xs font-bold text-slate-400 bg-slate-100 px-2 sm:px-3 py-1 rounded-full z-10">
                  보유량 {foodInventory.premium}개
                </div>
                <div className="flex items-start gap-3 sm:gap-4 mb-4 pt-6 sm:pt-0">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-pink-50 rounded-2xl flex items-center justify-center text-3xl sm:text-4xl shadow-inner border border-pink-100 shrink-0">
                    🍿
                  </div>
                  <div className="flex-1 min-w-0 pr-0 sm:pr-24">
                    <h4 className="font-black text-slate-800 text-lg truncate block">
                      고급 플레이크
                    </h4>
                    <span className="block text-xs font-bold text-slate-500 mb-1 truncate">Premium Flakes</span>
                    <div className="flex flex-wrap gap-1 sm:gap-2 mt-1">
                      <span className="text-[10px] sm:text-[11px] font-bold text-emerald-600 bg-emerald-50 px-1.5 sm:px-2 py-0.5 rounded-full border border-emerald-100 whitespace-nowrap">⚡ 허기 +{Math.floor(25 * (1 + (foodTechLevel - 1) * 0.15))}</span>
                      <span className="text-[10px] sm:text-[11px] font-bold text-blue-600 bg-blue-50 px-1.5 sm:px-2 py-0.5 rounded-full border border-blue-100 whitespace-nowrap">✨ XP +{Math.floor(20 * (1 + (foodTechLevel - 1) * 0.15))}</span>
                    </div>
                  </div>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 font-medium mb-5 sm:mb-6 leading-relaxed">
                  바삭하고 풍부한 유기농 영양이 듬뿍 들어간 플레이크입니다.
                </p>
                <div className="flex gap-2 mt-auto">
                  <button onClick={() => { (spendPetal as any)('guppy_food_premium10',(ok:boolean)=>{ if(ok) setFoodInventory(prev=>({...prev, premium: prev.premium+10})); }); }} className="flex-1 bg-[#a855f7] hover:bg-[#9333ea] text-white rounded-xl py-2 sm:py-3 flex flex-col items-center justify-center transition-colors shadow-sm">
                    <span className="text-[11px] sm:text-xs font-bold mb-0.5">10개 구매</span>
                    <span className="text-xs sm:text-sm font-black flex items-center gap-1"><Petal className="w-3.5 h-3.5" /> 3</span>
                  </button>
                  <button onClick={() => { (spendPetal as any)('guppy_food_premium50',(ok:boolean)=>{ if(ok) setFoodInventory(prev=>({...prev, premium: prev.premium+50})); }); }} className="flex-1 bg-[#a855f7] hover:bg-[#9333ea] text-white rounded-xl py-2 sm:py-3 flex flex-col items-center justify-center transition-colors shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 bg-pink-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-bl-lg z-10 scale-[0.85] origin-top-right sm:scale-100">10% 할인</div>
                    <span className="text-[11px] sm:text-xs font-bold mb-0.5 mt-1 sm:mt-0 relative z-0">50개 구매</span>
                    <span className="text-xs sm:text-sm font-black flex items-center gap-1"><Petal className="w-3.5 h-3.5" /> 12</span>
                  </button>
                </div>
              </div>

              {/* Shrimp */}
              <div className="bg-white p-4 rounded-[20px] border border-slate-200 shadow-sm flex flex-col relative overflow-hidden">
                <div className="absolute top-3 right-3 sm:top-4 sm:right-4 text-[10px] sm:text-xs font-bold text-slate-400 bg-slate-100 px-2 sm:px-3 py-1 rounded-full z-10">
                  보유량 {foodInventory.shrimp}개
                </div>
                <div className="flex items-start gap-3 sm:gap-4 mb-4 pt-6 sm:pt-0">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-orange-50 rounded-2xl flex items-center justify-center text-3xl sm:text-4xl shadow-inner border border-orange-100 shrink-0">
                    🦐
                  </div>
                  <div className="flex-1 min-w-0 pr-0 sm:pr-24">
                    <h4 className="font-black text-slate-800 text-lg truncate block">
                      천연 유기농 새우
                    </h4>
                    <span className="block text-xs font-bold text-slate-500 mb-1 truncate">Magic Shrimp</span>
                    <div className="flex flex-wrap gap-1 sm:gap-2 mt-1">
                      <span className="text-[10px] sm:text-[11px] font-bold text-emerald-600 bg-emerald-50 px-1.5 sm:px-2 py-0.5 rounded-full border border-emerald-100 whitespace-nowrap">⚡ 허기 +{Math.floor(40 * (1 + (foodTechLevel - 1) * 0.15))}</span>
                      <span className="text-[10px] sm:text-[11px] font-bold text-blue-600 bg-blue-50 px-1.5 sm:px-2 py-0.5 rounded-full border border-blue-100 whitespace-nowrap">✨ XP +{Math.floor(35 * (1 + (foodTechLevel - 1) * 0.15))}</span>
                    </div>
                  </div>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 font-medium mb-5 sm:mb-6 leading-relaxed">
                  물고기들이 가장 좋아하는 천연 새우를 건조하여 풍미를 살렸습니다.
                </p>
                <div className="flex gap-2 mt-auto">
                  <button onClick={() => { (spendPetal as any)('guppy_food_shrimp10',(ok:boolean)=>{ if(ok) setFoodInventory(prev=>({...prev, shrimp: prev.shrimp+10})); }); }} className="flex-1 bg-[#a855f7] hover:bg-[#9333ea] text-white rounded-xl py-2 sm:py-3 flex flex-col items-center justify-center transition-colors shadow-sm">
                    <span className="text-[11px] sm:text-xs font-bold mb-0.5">10개 구매</span>
                    <span className="text-xs sm:text-sm font-black flex items-center gap-1"><Petal className="w-3.5 h-3.5" /> 7</span>
                  </button>
                  <button onClick={() => { (spendPetal as any)('guppy_food_shrimp50',(ok:boolean)=>{ if(ok) setFoodInventory(prev=>({...prev, shrimp: prev.shrimp+50})); }); }} className="flex-1 bg-[#a855f7] hover:bg-[#9333ea] text-white rounded-xl py-2 sm:py-3 flex flex-col items-center justify-center transition-colors shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 bg-pink-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-bl-lg z-10 scale-[0.85] origin-top-right sm:scale-100">10% 할인</div>
                    <span className="text-[11px] sm:text-xs font-bold mb-0.5 mt-1 sm:mt-0 relative z-0">50개 구매</span>
                    <span className="text-xs sm:text-sm font-black flex items-center gap-1"><Petal className="w-3.5 h-3.5" /> 30</span>
                  </button>
                </div>
              </div>

              {/* Krill */}
              <div className="bg-white p-4 rounded-[20px] border border-slate-200 shadow-sm flex flex-col relative overflow-hidden">
                <div className="absolute top-3 right-3 sm:top-4 sm:right-4 text-[10px] sm:text-xs font-bold text-slate-400 bg-slate-100 px-2 sm:px-3 py-1 rounded-full z-10">
                  보유량 {foodInventory.krill}개
                </div>
                <div className="flex items-start gap-3 sm:gap-4 mb-4 pt-6 sm:pt-0">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-yellow-50 rounded-2xl flex items-center justify-center text-3xl sm:text-4xl shadow-inner border border-yellow-100 shrink-0">
                    👑
                  </div>
                  <div className="flex-1 min-w-0 pr-0 sm:pr-24">
                    <h4 className="font-black text-slate-800 text-lg truncate block">
                      황금 크릴새우
                    </h4>
                    <span className="block text-xs font-bold text-slate-500 mb-1 truncate">Golden Krill</span>
                    <div className="flex flex-wrap gap-1 sm:gap-2 mt-1">
                      <span className="text-[10px] sm:text-[11px] font-bold text-emerald-600 bg-emerald-50 px-1.5 sm:px-2 py-0.5 rounded-full border border-emerald-100 whitespace-nowrap">⚡ 허기 +{Math.floor(80 * (1 + (foodTechLevel - 1) * 0.15))}</span>
                      <span className="text-[10px] sm:text-[11px] font-bold text-blue-600 bg-blue-50 px-1.5 sm:px-2 py-0.5 rounded-full border border-blue-100 whitespace-nowrap">✨ XP +{Math.floor(80 * (1 + (foodTechLevel - 1) * 0.15))}</span>
                    </div>
                  </div>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 font-medium mb-5 sm:mb-6 leading-relaxed">
                  심해에서 채취한 최고급 영양 크릴. 폭발적인 성장을 보장합니다.
                </p>
                <div className="flex gap-2 mt-auto">
                  <button onClick={() => { (spendPetal as any)('guppy_food_krill10',(ok:boolean)=>{ if(ok) setFoodInventory(prev=>({...prev, krill: prev.krill+10})); }); }} className="flex-1 bg-[#a855f7] hover:bg-[#9333ea] text-white rounded-xl py-2 sm:py-3 flex flex-col items-center justify-center transition-colors shadow-sm">
                    <span className="text-[11px] sm:text-xs font-bold mb-0.5">10개 구매</span>
                    <span className="text-xs sm:text-sm font-black flex items-center gap-1"><Petal className="w-3.5 h-3.5" /> 15</span>
                  </button>
                  <button onClick={() => { (spendPetal as any)('guppy_food_krill50',(ok:boolean)=>{ if(ok) setFoodInventory(prev=>({...prev, krill: prev.krill+50})); }); }} className="flex-1 bg-[#a855f7] hover:bg-[#9333ea] text-white rounded-xl py-2 sm:py-3 flex flex-col items-center justify-center transition-colors shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 bg-pink-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-bl-lg z-10 scale-[0.85] origin-top-right sm:scale-100">10% 할인</div>
                    <span className="text-[11px] sm:text-xs font-bold mb-0.5 mt-1 sm:mt-0 relative z-0">50개 구매</span>
                    <span className="text-xs sm:text-sm font-black flex items-center gap-1"><Petal className="w-3.5 h-3.5" /> 60</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {shopTab === 'decor' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-4 rounded-[20px] border border-slate-200 shadow-sm flex flex-col relative overflow-hidden">
              <div className="flex items-start gap-3 sm:gap-4 mb-4">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-3xl sm:text-4xl shadow-inner border border-slate-100 shrink-0">
                  🏰
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-black text-slate-800 text-base sm:text-lg truncate">해저 모래성</h4>
                  <div className="flex flex-wrap gap-1 sm:gap-2 mt-1">
                     <span className="text-[10px] sm:text-[11px] font-bold text-amber-600 bg-amber-50 px-1.5 sm:px-2 py-0.5 rounded-full border border-amber-100 whitespace-nowrap">효과</span>
                     <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 whitespace-nowrap">배고픔 감소율 -20%</span>
                  </div>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mb-5 sm:mb-6 leading-relaxed">
                구피들이 안식처로 삼기 좋은 모래성입니다. 쉴 공간이 생겨 체력 소모가 줄어듭니다.
              </p>
              <button 
                onClick={() => toggleDecoration('sand_castle', 50)}
                disabled={!decorations.includes('sand_castle') && (petals ?? 0) < 50}
                className={`w-full py-3 rounded-xl flex items-center justify-center transition-colors shadow-sm ${decorations.includes('sand_castle') ? 'bg-slate-800 text-white font-bold' : (petals ?? 0) >= 50 ? 'bg-blue-500 hover:bg-blue-600 text-white' : 'bg-slate-200 text-slate-400 font-bold'}`}
              >
                {decorations.includes('sand_castle') ? (
                  '장식 제거하기 (환불 불가)'
                ) : (
                  <div className="flex flex-col items-center">
                    <span className="text-xs font-bold mb-0.5">배치하기</span>
                    <span className="text-sm font-black flex items-center gap-1"><Petal className="w-4 h-4" /> 50 꽃잎</span>
                  </div>
                )}
              </button>
            </div>
            
            <div className="bg-white p-4 rounded-[20px] border border-slate-200 shadow-sm flex flex-col relative overflow-hidden">
              <div className="flex items-start gap-3 sm:gap-4 mb-4">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-3xl sm:text-4xl shadow-inner border border-slate-100 shrink-0">
                  🗿
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-black text-slate-800 text-base sm:text-lg truncate">빛나는 황금 석상</h4>
                  <div className="flex flex-wrap gap-1 sm:gap-2 mt-1">
                     <span className="text-[10px] sm:text-[11px] font-bold text-amber-600 bg-amber-50 px-1.5 sm:px-2 py-0.5 rounded-full border border-amber-100 whitespace-nowrap">효과</span>
                     <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 whitespace-nowrap">희귀/전설 확률 2배</span>
                  </div>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mb-5 sm:mb-6 leading-relaxed">
                알을 깔 때 신비한 기운을 내뿜어 특별한 물고기가 태어날 확률을 크게 높여줍니다.
              </p>
              <button 
                onClick={() => toggleDecoration('golden_statue', 200)}
                disabled={!decorations.includes('golden_statue') && (petals ?? 0) < 200}
                className={`w-full py-3 rounded-xl flex items-center justify-center transition-colors shadow-sm ${decorations.includes('golden_statue') ? 'bg-slate-800 text-white font-bold' : (petals ?? 0) >= 200 ? 'bg-blue-500 hover:bg-blue-600 text-white' : 'bg-slate-200 text-slate-400 font-bold'}`}
              >
                {decorations.includes('golden_statue') ? (
                  '장식 제거하기 (환불 불가)'
                ) : (
                  <div className="flex flex-col items-center">
                    <span className="text-xs font-bold mb-0.5">배치하기</span>
                    <span className="text-sm font-black flex items-center gap-1"><Petal className="w-4 h-4" /> 200 꽃잎</span>
                  </div>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
