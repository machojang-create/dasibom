import { POT_TYPES } from '../data';
import { X } from 'lucide-react';
import Petal from './Petal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onBuyPot: (potId: string, price: number) => void;
  money: number;
  isSlotEmpty: boolean;
}

export default function PotShopView({ isOpen, onClose, onBuyPot, money, isSlotEmpty }: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/45 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="dsb-modal-pop bg-gradient-to-b from-[#FFFDF7] to-[#FBF3E4] p-6 rounded-[28px] w-full max-w-sm max-h-[85vh] shadow-2xl border-2 border-white relative overflow-hidden flex flex-col">
        <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-[#d4af37] rounded-full blur-[80px] opacity-10"></div>
        <div className="flex justify-between items-center mb-6 relative z-10 shrink-0">
           <h2 className="text-2xl font-bold text-[#e8f3ec]">화분 상점</h2>
           <button onClick={onClose} aria-label="닫기" className="w-11 h-11 grid place-items-center bg-[#5b3a1a]/8 rounded-full hover:bg-[#5b3a1a]/15 text-[#8a6a48] transition-colors">
             <X className="w-5 h-5" />
           </button>
        </div>
        
        {isSlotEmpty && (
          <div className="relative z-10 mb-4 p-3 bg-orange-50 border border-orange-200 rounded-xl text-center shrink-0">
            <p className="text-orange-700 text-[14px] font-bold">식물이 살고 있는 화분만 갈아입힐 수 있어요.</p>
          </div>
        )}
        
        <div className="grid gap-3 relative z-10 overflow-y-auto no-scrollbar pb-4 flex-1">
          {POT_TYPES.map(pot => {
            const petalPrice = Math.round(pot.price / 2);
            const cannotAfford = money < petalPrice;
            const isDisabled = isSlotEmpty || cannotAfford;
            return (
              <button 
                key={pot.id}
                onClick={() => onBuyPot(pot.id, pot.price)}
                disabled={isDisabled}
                className={`p-4 bg-[#0a120e]/40 border border-[#2a4d3a] rounded-2xl flex justify-between items-center transition-all group ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-[#d4a95f] hover:shadow-md active:scale-[0.98]'}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 bg-[#F6FBF2] rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
                    🏺
                  </div>
                  <span className="font-black text-[15px] text-[#4a3a26]">{pot.name}</span>
                </div>
                <span className={`text-sm font-bold ${cannotAfford ? 'text-red-400 bg-red-50' : 'text-[#a14d68] bg-pink-50'} px-3 py-1 rounded-full`}>{petalPrice === 0 ? '무료' : <><Petal className="w-3 h-3 inline" /> {petalPrice} 꽃잎</>}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
