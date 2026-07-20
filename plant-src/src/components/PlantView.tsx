import { ReactNode, useState, useRef, useEffect } from 'react';
import { UserPlant } from '../types';
import { PHRASES, POT_TYPES } from '../data';
import { Edit2, Star, Sparkles, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import AnimatedNumber from './AnimatedNumber';

interface Props {
  plant: UserPlant;
  onInteract?: () => void;
  onRename?: (newName: string) => void;
  timeOfDay?: 'morning' | 'day' | 'night';
}

const getEmoji = (type: string, stage: string, plantEmoji?: string) => {
  if (stage === 'seed') return '🌰';
  if (stage === 'sprout') return '🌱';
  if (stage === 'mature' || stage === 'old') return plantEmoji || '🌿';
  return '🌳'; 
};

const getFacialExpression = (water: number) => {
  if (water === 0) { // Dead / X_X
    return (
      <svg width="40" height="20" viewBox="0 0 50 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className="w-10 h-5 md:w-12 md:h-6">
        <path d="M 12 7 L 18 13 M 18 7 L 12 13" />
        <path d="M 32 7 L 38 13 M 38 7 L 32 13" />
        <path d="M 21 18 Q 25 14 29 18" />
      </svg>
    );
  }
  if (water <= 30) { // Sad / Crying
    return (
      <svg width="40" height="20" viewBox="0 0 50 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className="w-10 h-5 md:w-12 md:h-6">
        <path d="M 12 11 Q 15 8 18 11" />
        <path d="M 32 11 Q 35 8 38 11" />
        <path d="M 15 14 L 15 16" strokeWidth="2.5" />
        <path d="M 35 14 L 35 16" strokeWidth="2.5" />
        <path d="M 21 19 Q 25 16 29 19" />
      </svg>
    );
  }
  if (water <= 50) { // Meh
    return (
      <svg width="40" height="20" viewBox="0 0 50 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className="w-10 h-5 md:w-12 md:h-6">
        <circle cx="15" cy="10" r="2.5" fill="currentColor" stroke="none" />
        <circle cx="35" cy="10" r="2.5" fill="currentColor" stroke="none" />
        <path d="M 22 17 L 28 17" />
      </svg>
    );
  }
  if (water >= 80) { // Super Happy
    return (
      <svg width="40" height="20" viewBox="0 0 50 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className="w-10 h-5 md:w-12 md:h-6">
        <path d="M 12 10 Q 15 6 18 10" />
        <path d="M 32 10 Q 35 6 38 10" />
        <path d="M 21 16 Q 25 21 29 16" />
      </svg>
    );
  }
  // Normal Happy
  return (
    <svg width="40" height="20" viewBox="0 0 50 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className="w-10 h-5 md:w-12 md:h-6">
        <circle cx="15" cy="10" r="2.5" fill="currentColor" stroke="none" />
        <circle cx="35" cy="10" r="2.5" fill="currentColor" stroke="none" />
        <path d="M 21 16 Q 25 20 29 16" />
    </svg>
  );
};

const PotRender = ({ potId, expression }: { potId: string, expression: ReactNode }) => {
   let bg = "bg-gradient-to-b from-[#d4a373] to-[#c8986a]";
   let rim = "bg-[#c8986a]";
   let text = "text-[#5c4033]";
   
   if (potId === 'pot2') { // 황금
       bg = "bg-gradient-to-b from-[#fceabb] to-[#f8b500]";
       rim = "bg-[#f8b500]";
       text = "text-[#c59b3a]";
   } else if (potId === 'pot3') { // 무늬
       bg = "bg-[#e0c396] bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]";
       rim = "bg-[#c8986a]";
   } else if (potId === 'pot4') { // 백자
       bg = "bg-gradient-to-b from-[#ffffff] to-[#e6e6e6]";
       rim = "bg-[#f0f0f0]";
       text = "text-[#666666]";
   } else if (potId === 'pot5') { // 청자
       bg = "bg-gradient-to-b from-[#9fc0aa] to-[#7a9e88]";
       rim = "bg-[#8bb399]";
       text = "text-[#3d5a48]";
   } else if (potId === 'pot6') { // 나무
       bg = "bg-[#8b5a2b] bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')]";
       rim = "bg-[#6b4226]";
       text = "text-[#3d2314]";
   } else if (potId === 'pot7') { // 유리
       bg = "bg-white/40 backdrop-blur-md";
       rim = "bg-white/50 backdrop-blur-md";
       text = "text-white drop-shadow-md";
   } else if (potId === 'pot8') { // 대리석
       bg = "bg-[#e8e8e8] bg-[url('https://www.transparenttextures.com/patterns/white-marble.png')]";
       rim = "bg-[#d0d0d0]";
       text = "text-[#4a4a4a]";
   } else if (potId === 'pot9') { // 돌
       bg = "bg-[#8c8c8c] bg-[url('https://www.transparenttextures.com/patterns/concrete-wall.png')]";
       rim = "bg-[#737373]";
       text = "text-[#262626]";
   } else if (potId === 'pot10') { // 테라코타
       bg = "bg-gradient-to-b from-[#e2725b] to-[#c15c4c]";
       rim = "bg-[#c15c4c]";
       text = "text-[#7a3b31]";
   } else if (potId === 'pot11') { // 크리스탈
       bg = "bg-gradient-to-b from-purple-300/60 to-blue-300/60 backdrop-blur-lg border border-white/40";
       rim = "bg-white/60 backdrop-blur-md";
       text = "text-indigo-900";
   } else if (potId === 'pot12') { // 깡통
       bg = "bg-gradient-to-b from-[#a9a9a9] to-[#808080] border border-gray-400";
       rim = "bg-[#c0c0c0]";
       text = "text-[#4d4d4d]";
   } else if (potId === 'pot13') { // 은빛
       bg = "bg-gradient-to-b from-[#e6e9f0] to-[#eef1f5] border border-gray-200";
       rim = "bg-[#dcdcdc]";
       text = "text-[#808080]";
   }

   return (
       <div className="flex flex-col items-center relative z-20">
          <div className={`w-32 md:w-40 h-6 md:h-8 ${rim} rounded-lg shadow-md z-10 -mb-2`} />
          <div 
             className={`w-24 md:w-32 h-28 md:h-32 ${bg} shadow-inner flex flex-col items-center justify-center relative`}
             style={{ clipPath: 'polygon(0 0, 100% 0, 85% 100%, 15% 100%)', borderBottomLeftRadius: '16px', borderBottomRightRadius: '16px' }}
          >
            <div className={`mt-2 ${text} opacity-80 flex items-center justify-center pointer-events-none`}>
               {expression}
            </div>
          </div>
       </div>
   )
}


export default function PlantView({ plant, onInteract, onRename, timeOfDay }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(plant.customName || plant.type.name);
  const inputRef = useRef<HTMLInputElement>(null);

  const defaultPhrase = PHRASES[plant.type.dialect][plant.stage][0];
  const phrase = plant.phrase || defaultPhrase;
  
  const growthPercent = plant.stage === 'old' ? '100.0' : Math.min(99.9, ((plant.level * 10) + (plant.waterLevel / 10))).toFixed(1);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleSaveName = () => {
    if (editName.trim() && onRename) {
      onRename(editName.trim());
    } else {
      setEditName(plant.customName || plant.type.name);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSaveName();
    if (e.key === 'Escape') {
      setEditName(plant.customName || plant.type.name);
      setIsEditing(false);
    }
  };

  return (
    <div className="flex flex-col items-center w-full relative z-10 mt-8 md:mt-0">

      <div 
        onClick={onInteract}
        className={`group relative cursor-pointer flex flex-col items-center justify-end h-64 mt-16 md:mt-16 mb-2 z-20 rounded-[40px] transition-all -translate-y-[120px] md:-translate-y-[120px] ${
          plant.stage === 'old' 
            ? 'ring-4 ring-yellow-400/80 ring-offset-8 ring-offset-transparent shadow-[0_0_30px_rgba(250,204,21,0.6)]' 
            : timeOfDay === 'morning' 
              ? 'ring-4 ring-orange-300 ring-offset-8 ring-offset-transparent shadow-[0_0_20px_rgba(253,186,116,0.5)]' 
              : ''
        }`}
      >
        {timeOfDay === 'morning' && plant.stage !== 'old' && <div className="absolute inset-0 rounded-[40px] bg-orange-200/10 animate-pulse pointer-events-none" />}
        {plant.stage === 'old' && <div className="absolute inset-0 rounded-[40px] bg-yellow-300/10 animate-pulse pointer-events-none" />}
        <motion.div
           initial={{ scale: 0.8, opacity: 0 }}
           animate={{ scale: 1, opacity: 1 }}
           key={`${plant.id}-${plant.stage}`}
           className="relative flex flex-col items-center z-10 transition-transform duration-300 group-hover:scale-105 group-active:scale-95 group-hover:-rotate-3"
        >

          <div className="text-[6rem] md:text-[8rem] filter drop-shadow-2xl z-20 -mb-8 pointer-events-none">
            {getEmoji(plant.type.type, plant.stage, plant.type.emoji)}
          </div>
          
          <PotRender potId={plant.potId || 'pot1'} expression={getFacialExpression(plant.waterLevel)} />
        </motion.div>
        
        <AnimatePresence mode="wait">
          <motion.div
            key={phrase}
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute -top-[60px] md:-top-[76px] bg-white/95 backdrop-blur-sm text-gray-800 px-4 md:px-5 py-2 md:py-3 rounded-2xl md:rounded-3xl shadow-xl w-[220px] md:w-[260px] text-center break-keep font-bold text-sm md:text-base border-2 border-white pointer-events-none"
          >
            {phrase}
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white/95 rotate-45 border-r-2 border-b-2 border-transparent"></div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-white/30 backdrop-blur-3xl rounded-3xl p-3 md:p-4 w-full max-w-[280px] md:max-w-xs border-2 border-white/60 shadow-[0_16px_40px_rgba(0,0,0,0.1)] ring-1 ring-white/30 text-gray-900 pointer-events-auto overflow-hidden group z-30">
        <div className="absolute inset-0 bg-gradient-to-tr from-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
        <div className="flex items-center justify-between mb-3 relative z-10">
          <div className="flex items-center gap-2">
            {isEditing ? (
              <input
                ref={inputRef}
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleSaveName}
                className="font-bold text-lg md:text-xl text-gray-900 bg-white/50 border border-gray-300 rounded px-2 py-0.5 outline-none focus:ring-2 focus:ring-green-400 w-32"
                maxLength={10}
              />
            ) : (
              <h3 className="font-bold text-lg md:text-xl text-gray-900 drop-shadow-sm">{plant.customName || plant.type.name}</h3>
            )}
            {plant.stage === 'old' && (
              <span className="bg-yellow-400 text-yellow-900 text-[10px] md:text-xs font-bold px-2 py-0.5 rounded-full shadow-sm">
                만개
              </span>
            )}
          </div>
          {isEditing ? (
            <button onClick={handleSaveName} className="text-green-600 hover:text-green-700 transition-colors p-1 bg-white/40 rounded-full hover:bg-white/60">
              <Check className="w-4 h-4 md:w-5 md:h-5" />
            </button>
          ) : (
            <button onClick={() => setIsEditing(true)} className="text-gray-500 hover:text-gray-900 transition-colors p-1 bg-white/40 rounded-full hover:bg-white/60">
              <Edit2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
            </button>
          )}
        </div>

        <div className="space-y-2 md:space-y-2.5 relative z-10">
          {/* Growth Bar (Only growth bar is kept) */}
          <div className="bg-white/40 rounded-full p-1 border border-white/60 flex items-center shadow-inner">
            <div className="px-2 text-[10px] md:text-xs font-bold text-green-700 w-14 md:w-16 flex items-center gap-1">
               <Star className="w-3 h-3 fill-current" /> 레벨 {plant.level}
            </div>
            <div className="flex-1 bg-green-900/30 rounded-full h-3.5 md:h-4 mr-1 relative overflow-hidden">
              <div 
                className="bg-gradient-to-r from-[#78e378] to-[#4caf50] h-full rounded-full flex items-center justify-end pr-2 transition-all duration-1000 ease-out relative overflow-hidden" 
                style={{ width: `${growthPercent}%` }}
              >
                <div className="absolute inset-0 bg-white/20"></div>
              </div>
              <div className="absolute inset-0 flex items-center justify-center text-[9px] md:text-[10px] text-white font-bold drop-shadow-md">
                {plant.stage === 'old' ? 'MAX' : <><AnimatedNumber value={parseFloat(growthPercent)} decimals={1} /> %</>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
