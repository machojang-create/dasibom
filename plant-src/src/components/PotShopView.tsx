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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <div className="bg-gradient-to-b from-[#1c3326] to-[#121f18] p-8 rounded-[2rem] w-full max-w-sm max-h-[85vh] shadow-2xl border border-[#2a4d3a] relative overflow-hidden flex flex-col">
        <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-[#d4af37] rounded-full blur-[80px] opacity-10"></div>
        <div className="flex justify-between items-center mb-6 relative z-10 shrink-0">
           <h2 className="text-2xl font-bold text-[#e8f3ec]">화분 상점</h2>
           <button onClick={onClose} className="p-2 bg-[#0a120e]/50 rounded-full hover:bg-[#2a4d3a] text-[#89a896] hover:text-white transition-colors">
             <X className="w-5 h-5" />
           </button>
        </div>
        
        {isSlotEmpty && (
          <div className="relative z-10 mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-xl text-center shrink-0">
            <p className="text-red-200 text-sm font-bold">식물이 심어져 있는 화분만 교체할 수 있습니다.</p>
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
                className={`p-4 bg-[#0a120e]/40 border border-[#2a4d3a] rounded-2xl flex justify-between items-center transition-all group ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#2a4d3a]/60 hover:border-[#4a7c59]'}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#1c3326] rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
                    🏺
                  </div>
                  <span className="font-bold text-[#e8f3ec]">{pot.name}</span>
                </div>
                <span className={`text-sm font-bold ${cannotAfford ? 'text-red-400 bg-red-400/10' : 'text-[#d4af37] bg-[#d4af37]/10'} px-3 py-1 rounded-full`}>{petalPrice === 0 ? '무료' : <><Petal className="w-3 h-3 inline" /> {petalPrice} 꽃잎</>}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
