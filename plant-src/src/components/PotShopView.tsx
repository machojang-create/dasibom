import { POT_TYPES } from '../data';
import { X } from 'lucide-react';
import Petal from './Petal';

/* 화분 상점 — 씨앗 상점과 동일한 화이트·크림 스킨(2026-07-21 통일), 2열 그리드 */
interface Props {
  isOpen: boolean;
  onClose: () => void;
  onBuyPot: (potId: string, price: number) => void;
  money: number;
  isSlotEmpty: boolean;
}

/* 화분별 미리보기 색감 — PlantView의 PotRender 팔레트 축약판 */
const POT_SWATCH: Record<string, string> = {
  pot1: 'linear-gradient(135deg,#e8bd8b,#b98957)', pot2: 'linear-gradient(135deg,#fff3c9,#e09b00)',
  pot3: 'linear-gradient(180deg,#e8cf9f,#e0c396)', pot4: 'linear-gradient(180deg,#ffffff,#dfdfdb)',
  pot5: 'linear-gradient(135deg,#c2dcc9,#6a917b)', pot6: 'linear-gradient(180deg,#9a6a38,#8b5a2b)',
  pot7: 'linear-gradient(180deg,#eaf4fb,#c9dfee)', pot8: 'linear-gradient(135deg,#f4f4f4,#dcdcdc)',
  pot9: 'linear-gradient(180deg,#9a9a9a,#8c8c8c)', pot10: 'linear-gradient(135deg,#f2977e,#b34f40)',
  pot11: 'linear-gradient(135deg,#f5d0fe,#c4b5fd)', pot12: 'linear-gradient(180deg,#d8d8d8,#7d7d7d)',
  pot13: 'linear-gradient(135deg,#ffffff,#c3cbd8)',
};

export default function PotShopView({ isOpen, onClose, onBuyPot, money, isSlotEmpty }: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/45 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="dsb-modal-pop bg-gradient-to-b from-[#FFFDF7] to-[#FBF3E4] p-6 md:p-7 rounded-[28px] w-full max-w-md max-h-[85vh] shadow-2xl border-2 border-white relative overflow-hidden flex flex-col">
        <div className="absolute -top-16 -right-16 w-44 h-44 bg-[#7fb8d8] rounded-full blur-[70px] opacity-20 pointer-events-none" />
        <div className="flex justify-between items-center mb-4 relative z-10 shrink-0">
          <div>
            <h2 className="text-2xl font-black text-[#5b3a1a]">🏺 화분 상점</h2>
            <p className="text-[14px] text-[#9a7a52] font-bold mt-0.5">우리 친구에게 예쁜 옷을 입혀요</p>
          </div>
          <button onClick={onClose} aria-label="닫기" className="w-11 h-11 grid place-items-center bg-[#5b3a1a]/8 rounded-full hover:bg-[#5b3a1a]/15 text-[#8a6a48] transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {isSlotEmpty && (
          <div className="relative z-10 mb-3 p-3 bg-orange-50 border border-orange-200 rounded-2xl text-center shrink-0">
            <p className="text-orange-700 text-[14px] font-bold">식물이 살고 있는 화분만 갈아입힐 수 있어요.</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 relative z-10 overflow-y-auto no-scrollbar pb-2 flex-1">
          {POT_TYPES.map(pot => {
            const petalPrice = Math.round(pot.price / 2);
            const cannotAfford = money < petalPrice;
            const isDisabled = isSlotEmpty || cannotAfford;
            return (
              <button
                key={pot.id}
                onClick={() => onBuyPot(pot.id, pot.price)}
                disabled={isDisabled}
                className={`p-4 bg-white border-2 rounded-2xl flex flex-col items-center transition-all group shadow-sm ${isDisabled ? 'opacity-45 cursor-not-allowed border-[#EFE4D2]' : 'border-[#EFE4D2] hover:border-[#d4a95f] hover:shadow-md active:scale-[0.97]'}`}
              >
                <div
                  className="w-14 h-12 rounded-b-2xl rounded-t-md mb-2 shadow-inner border border-black/5 group-hover:scale-110 transition-transform"
                  style={{ background: POT_SWATCH[pot.id] || POT_SWATCH.pot1, clipPath: 'polygon(0 0, 100% 0, 86% 100%, 14% 100%)' }}
                />
                <span className="text-[#4a3a26] font-black text-[15px] text-center leading-tight mb-2">{pot.name}</span>
                <span className={`text-[13px] font-black px-3 py-1 rounded-full flex items-center gap-1 ${petalPrice === 0 ? 'text-[#4e8040] bg-green-50' : cannotAfford ? 'text-red-400 bg-red-50' : 'text-[#a14d68] bg-pink-50'}`}>
                  {petalPrice === 0 ? '무료' : <><Petal className="w-3.5 h-3.5" /> {petalPrice} 꽃잎</>}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
