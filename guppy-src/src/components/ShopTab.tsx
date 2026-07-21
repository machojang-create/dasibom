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
              <h2 className="text-xl font-black text-slate-800 tracking-tight">먹이 상점</h2>
              <p className="text-sm text-slate-500 font-medium mt-1">먹이도 장식도 🌸 꽃잎으로 — 밥은 아주 저렴해요</p>
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

      <div className="flex-1 p-4 pb-[110px] overflow-y-auto">
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
                      <span className="text-[10px] sm:text-[11px] font-bold text-blue-600 bg-blue-50 px-1.5 sm:px-2 py-0.5 rounded-full border border-blue-100 whitespace-nowrap">✨ XP +2</span>
                    </div>
                  </div>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 font-medium mb-5 sm:mb-6 leading-relaxed">
                  가장 기본적인 물고기 사료입니다. 영양가는 평범하지만 배를 채우는 데에는 충분합니다.
                </p>
                <div className="flex gap-2 mt-auto">
                  <button onClick={() => { (spendPetal as any)('guppy_food_normal20',(ok:boolean)=>{ if(ok) setFoodInventory(prev=>({...prev, normal: prev.normal+20})); }); }} className="flex-1 bg-[#a855f7] hover:bg-[#9333ea] text-white rounded-xl py-2 sm:py-3 flex flex-col items-center justify-center transition-colors shadow-sm">
                    <span className="text-[11px] sm:text-xs font-bold mb-0.5">20개 구매</span>
                    <span className="text-xs sm:text-sm font-black flex items-center gap-1"><Petal className="w-3.5 h-3.5" /> 1</span>
                  </button>
                  <button onClick={() => { (spendPetal as any)('guppy_food_normal120',(ok:boolean)=>{ if(ok) setFoodInventory(prev=>({...prev, normal: prev.normal+120})); }); }} className="flex-1 bg-[#a855f7] hover:bg-[#9333ea] text-white rounded-xl py-2 sm:py-3 flex flex-col items-center justify-center transition-colors shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 bg-pink-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-bl-lg z-10 scale-[0.85] origin-top-right sm:scale-100">알뜰 묶음</div>
                    <span className="text-[11px] sm:text-xs font-bold mb-0.5 mt-1 sm:mt-0 relative z-0">120개 구매</span>
                    <span className="text-xs sm:text-sm font-black flex items-center gap-1 relative z-0"><Petal className="w-3.5 h-3.5" /> 5</span>
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
                      <span className="text-[10px] sm:text-[11px] font-bold text-emerald-600 bg-emerald-50 px-1.5 sm:px-2 py-0.5 rounded-full border border-emerald-100 whitespace-nowrap">⚡ 허기 +{Math.floor(20 * (1 + (foodTechLevel - 1) * 0.15))}</span>
                      <span className="text-[10px] sm:text-[11px] font-bold text-blue-600 bg-blue-50 px-1.5 sm:px-2 py-0.5 rounded-full border border-blue-100 whitespace-nowrap">✨ XP +15</span>
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
                      <span className="text-[10px] sm:text-[11px] font-bold text-emerald-600 bg-emerald-50 px-1.5 sm:px-2 py-0.5 rounded-full border border-emerald-100 whitespace-nowrap">⚡ 허기 +{Math.floor(35 * (1 + (foodTechLevel - 1) * 0.15))}</span>
                      <span className="text-[10px] sm:text-[11px] font-bold text-blue-600 bg-blue-50 px-1.5 sm:px-2 py-0.5 rounded-full border border-blue-100 whitespace-nowrap">✨ XP +35</span>
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
                      <span className="text-[10px] sm:text-[11px] font-bold text-emerald-600 bg-emerald-50 px-1.5 sm:px-2 py-0.5 rounded-full border border-emerald-100 whitespace-nowrap">⚡ 허기 +{Math.floor(60 * (1 + (foodTechLevel - 1) * 0.15))}</span>
                      <span className="text-[10px] sm:text-[11px] font-bold text-blue-600 bg-blue-50 px-1.5 sm:px-2 py-0.5 rounded-full border border-blue-100 whitespace-nowrap">✨ XP +120</span>
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

        {shopTab === 'decor' && (() => {
          const DECOR_ITEMS = [
            { id: 'log', emoji: '\ud83e\udeb5', name: '옹이 진 통나무', tag: '쉼터 — 배고픔 10% 천천히', desc: '구피들이 그늘에서 쉬어 가는 아늑한 통나무예요.', price: 30 },
            { id: 'seaweed', emoji: '\ud83c\udf3f', name: '초록 해초 숲', tag: '싱그러운 물결', desc: '살랑살랑 흔들리는 해초 사이로 숨바꼭질을 해요.', price: 40 },
            { id: 'sand_castle', emoji: '\ud83c\udff0', name: '해저 모래성', tag: '포근한 안식처', desc: '구피들이 안식처로 삼기 좋은 모래성이에요.', price: 50 },
            { id: 'shell_bed', emoji: '\ud83d\udc1a', name: '조개껍데기 침대', tag: '아늑한 잠자리', desc: '진주빛 조개 안에서 낮잠 자기 딱 좋아요.', price: 60 },
            { id: 'treasure_chest', emoji: '\ud83d\udcb0', name: '가라앉은 보물상자', tag: '반짝이는 볼거리', desc: '금화가 삐져나온 신비한 보물상자예요.', price: 80 },
            { id: 'stone_tower', emoji: '\ud83e\udea8', name: '소원 돌탑', tag: '어항의 운치', desc: '하나하나 쌓아 올린 돌탑에 소원을 빌어 보세요.', price: 100 },
            { id: 'led_mood_light', emoji: '\ud83c\udf08', name: '무지개 무드등', tag: '은은한 빛 갈아입기', desc: '어항 물빛이 무지개색으로 천천히 물들어요.', price: 120 },
            { id: 'neon_crystal', emoji: '\ud83d\udc8e', name: '네온 수정', tag: '보랏빛 광채', desc: '심해의 수정이 신비로운 보랏빛을 내뿜어요.', price: 150 },
            { id: 'lighthouse', emoji: '\ud83d\uddfc', name: '꼬마 등대', tag: '밤을 지키는 불빛', desc: '밤이 되면 등대가 어항을 은은하게 밝혀요.', price: 180 },
            { id: 'golden_statue', emoji: '\ud83d\uddff', name: '빛나는 황금 석상', tag: '희귀·전설 확률 2배', desc: '특별한 물고기가 태어날 확률을 크게 높여줘요.', price: 300 },
            { id: 'submarine', emoji: '\ud83d\udea4', name: '노란 꼬마 잠수함', tag: '어항의 명물', desc: '뽀글뽀글 기포를 내는 귀여운 잠수함이에요.', price: 250 },
          ];
          return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {DECOR_ITEMS.map(d => {
              const owned = decorations.includes(d.id);
              const afford = (petals ?? 0) >= d.price;
              return (
                <div key={d.id} className="bg-white p-4 rounded-[20px] border border-slate-200 shadow-sm flex flex-col relative overflow-hidden">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-3xl shadow-inner border border-slate-100 shrink-0">{d.emoji}</div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-black text-slate-800 text-base sm:text-lg truncate">{d.name}</h4>
                      <span className="inline-block text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100 mt-1">{d.tag}</span>
                    </div>
                  </div>
                  <p className="text-[13px] text-slate-500 font-medium mb-4 leading-relaxed">{d.desc}</p>
                  <button
                    onClick={() => toggleDecoration(d.id, d.price)}
                    disabled={!owned && !afford}
                    className={`mt-auto w-full py-3 rounded-xl flex items-center justify-center transition-colors shadow-sm font-black ${owned ? 'bg-slate-800 text-white' : afford ? 'bg-blue-500 hover:bg-blue-600 text-white' : 'bg-slate-200 text-slate-400'}`}
                  >
                    {owned ? '치우기 (다시 놓으려면 꽃잎 필요)' : (
                      <span className="flex items-center gap-1.5 text-sm">배치하기 <Petal className="w-4 h-4" /> {d.price}</span>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
          );
        })()}
      </div>
    </div>
  );
});
