import { PLANT_TYPES } from '../data';
import { PlantData } from '../types';
import { X } from 'lucide-react';
import Petal from './Petal';
import PlantArt from './PlantArt';

/* 씨앗 상점 — 다시봄 톤(따뜻한 크림)·스프링 팝업·시니어 글씨(2026-07-21 리디자인) */
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
    <div className="fixed inset-0 bg-black/45 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="dsb-modal-pop bg-gradient-to-b from-[#FFFDF7] to-[#FBF3E4] p-6 md:p-7 rounded-[28px] w-full max-w-md max-h-[85vh] shadow-2xl border-2 border-white relative overflow-hidden flex flex-col">
        <div className="absolute -top-16 -right-16 w-44 h-44 bg-[#F7C948] rounded-full blur-[70px] opacity-20 pointer-events-none" />
        <div className="flex justify-between items-center mb-4 relative z-10 shrink-0">
          <div>
            <h2 className="text-2xl font-black text-[#5b3a1a]">🌱 씨앗 상점</h2>
            <p className="text-[14px] text-[#9a7a52] font-bold mt-0.5">새 생명을 들이는 곳이에요</p>
          </div>
          <button onClick={onClose} aria-label="닫기" className="w-11 h-11 grid place-items-center bg-[#5b3a1a]/8 rounded-full hover:bg-[#5b3a1a]/15 text-[#8a6a48] transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {isSlotFull && (
          <div className="relative z-10 mb-3 p-3 bg-orange-50 border border-orange-200 rounded-2xl text-center shrink-0">
            <p className="text-orange-700 text-[14px] font-bold">이 화분엔 이미 식물이 살고 있어요. 빈 화분으로 넘겨 주세요.</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 relative z-10 overflow-y-auto no-scrollbar pb-2 flex-1">
          {PLANT_TYPES.map(plant => {
            const cannotAfford = money < 100;
            const isDisabled = isSlotFull || cannotAfford;
            return (
              <button
                key={plant.id}
                onClick={() => onBuySeed(plant)}
                className={`p-4 bg-white border-2 rounded-2xl flex flex-col items-center transition-all group shadow-sm ${isDisabled ? 'opacity-45 cursor-not-allowed border-[#EFE4D2]' : 'border-[#EFE4D2] hover:border-[#d4a95f] hover:shadow-md active:scale-[0.97]'}`}
              >
                <div className="w-20 h-[72px] bg-gradient-to-b from-[#F6FBF2] to-[#eaf4e2] rounded-xl flex items-end justify-center mb-2 group-hover:scale-110 transition-transform shadow-inner overflow-hidden pt-1">
                  <PlantArt type={plant.type} bloom className="w-14 h-16" />
                </div>
                <span className="text-[#4a3a26] font-black text-[15px] text-center">{plant.name}</span>
                <span className="text-[11px] text-[#9a7a52] font-bold mb-2 text-center leading-tight">{plant.accent.replace(' 사투리','')}</span>
                <span className={`text-[13px] font-black px-3 py-1 rounded-full flex items-center gap-1 ${cannotAfford ? 'text-red-400 bg-red-50' : 'text-[#a14d68] bg-pink-50'}`}>
                  <Petal className="w-3.5 h-3.5" /> 100 꽃잎
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
