import { PLANT_TYPES } from '../data';
import { PlantData } from '../types';
import { X } from 'lucide-react';
import Petal from './Petal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onBuySeed: (plant: PlantData) => void;
  money: number;
  isSlotFull: boolean;
}

export default function Shop({ isOpen, onClose, onBuySeed, money, isSlotFull }: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <div className="bg-gradient-to-b from-[#1c3326] to-[#121f18] p-8 rounded-[2rem] w-full max-w-sm max-h-[85vh] shadow-2xl border border-[#2a4d3a] relative overflow-hidden flex flex-col">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#d4af37] rounded-full blur-[80px] opacity-10"></div>
        
        <div className="flex justify-between items-center mb-6 relative z-10 shrink-0">
           <h2 className="text-2xl font-bold text-[#e8f3ec]">씨앗 상점</h2>
           <button onClick={onClose} className="p-2 bg-[#0a120e]/50 rounded-full hover:bg-[#2a4d3a] text-[#89a896] hover:text-white transition-colors">
             <X className="w-5 h-5" />
           </button>
        </div>
        
        {isSlotFull && (
          <div className="relative z-10 mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-xl text-center shrink-0">
            <p className="text-red-200 text-sm font-bold">현재 선택된 화분에는 이미 식물이 있습니다.</p>
          </div>
        )}
        
        <div className="grid grid-cols-2 gap-4 relative z-10 overflow-y-auto no-scrollbar pb-4 flex-1">
          {PLANT_TYPES.map(plant => {
            const cannotAfford = money < 20;
            const isDisabled = isSlotFull || cannotAfford;
            return (
              <button 
                key={plant.id}
                onClick={() => onBuySeed(plant)}
                disabled={isDisabled}
                className={`p-5 bg-[#0a120e]/40 border border-[#2a4d3a] rounded-2xl flex flex-col items-center transition-all group ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#2a4d3a]/60 hover:border-[#4a7c59]'}`}
              >
                <div className="w-12 h-12 bg-[#1c3326] rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-inner text-xl">
                  {plant.emoji}
                </div>
                <span className="text-[#e8f3ec] font-bold text-sm text-center">{plant.name}</span>
                <span className={`text-xs mt-2 font-bold px-2 py-0.5 rounded-full ${cannotAfford ? 'text-red-400 bg-red-400/10' : 'text-[#d4af37] bg-[#d4af37]/10'}`}><Petal className="w-3 h-3 inline" /> 20 꽃잎</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
