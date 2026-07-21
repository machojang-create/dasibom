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

/* 대사(말투)에서 감정을 읽어 표정을 고른다.
   우선순위: 물 없음(죽음) > 목마름(시듦) — 돌봄 신호가 대사 연기에 가려지면 안 됨.
   그 위에서 대사 키워드로: 감동·신남·놀람·잔소리·궁금 > 물 기반 기본 표정. */
type Mood = 'dead' | 'wilt' | 'moved' | 'excited' | 'surprised' | 'nag' | 'curious' | 'meh' | 'happy' | 'superhappy';

const classifyMood = (water: number, phrase?: string): Mood => {
  if (water === 0) return 'dead';
  if (water <= 30) return 'wilt';
  const t = phrase || '';
  if (/고맙|고마워|사랑|좋은 사람|이뻐|이쁘|호강|감동|눈물|따숩|따뜻|보고 싶|반갑|평생/.test(t)) return 'moved';
  if (/으아악|태풍|깜짝|번쩍|엄마야|워메|살려|대피|찢어|벼락|천둥/.test(t)) return 'surprised';
  if (/단디|챙기|굶|퍼뜩|왜 인자|죽는 줄|잔소리|끼니|밥은|무릎|관절|옷은|늦었|어딜 갔다/.test(t)) return 'nag';
  if (/운동회|신난|신났|튼튼|최고|덩실|씰룩|얼씨구|지화자|콧노래|살맛|끝내주|맹쿠로/.test(t)) return 'excited';
  if (/\?|왔나$|뭐꼬|뭐당가|궁금|아이가\?|봤나|그란디/.test(t)) return 'curious';
  if (water <= 50) return 'meh';
  if (water >= 80) return 'superhappy';
  return 'happy';
};

const getFacialExpression = (water: number, phrase?: string) => {
  const mood = classifyMood(water, phrase);
  const P = { width: 40, height: 20, viewBox: '0 0 50 24', fill: 'none', stroke: 'currentColor',
    strokeWidth: 3.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
    className: 'w-10 h-5 md:w-12 md:h-6' };
  switch (mood) {
    case 'dead': return (
      <svg {...P} data-mood="dead">
        <path d="M 12 7 L 18 13 M 18 7 L 12 13" />
        <path d="M 32 7 L 38 13 M 38 7 L 32 13" />
        <path d="M 21 18 Q 25 14 29 18" />
      </svg>);
    case 'wilt': return (
      <svg {...P} data-mood="wilt">
        <path d="M 12 11 Q 15 8 18 11" />
        <path d="M 32 11 Q 35 8 38 11" />
        <path d="M 15 14 L 15 16" strokeWidth={2.5} />
        <path d="M 35 14 L 35 16" strokeWidth={2.5} />
        <path d="M 21 19 Q 25 16 29 19" />
      </svg>);
    case 'moved': return (   /* 감동: 감은 눈웃음 + 볼 홍조 + 작은 하트 */
      <svg {...P} data-mood="moved">
        <path d="M 11 10 Q 15 6 19 10" />
        <path d="M 31 10 Q 35 6 39 10" />
        <circle cx="9" cy="15" r="2.6" fill="#f9a8c0" stroke="none" opacity="0.85" />
        <circle cx="41" cy="15" r="2.6" fill="#f9a8c0" stroke="none" opacity="0.85" />
        <path d="M 21 15 Q 25 20 29 15" />
        <path d="M 44 4 c -1.4 -1.6 -4 -0.4 -4 1.5 c 0 1.6 2.2 3 4 4.3 c 1.8 -1.3 4 -2.7 4 -4.3 c 0 -1.9 -2.6 -3.1 -4 -1.5 Z" fill="#ef5d84" stroke="none" transform="scale(0.75) translate(15,-1)" />
      </svg>);
    case 'excited': return (  /* 신남: 반짝 눈(^^) + 활짝 벌린 입 */
      <svg {...P} data-mood="excited">
        <path d="M 11 11 L 15 7 L 19 11" />
        <path d="M 31 11 L 35 7 L 39 11" />
        <path d="M 20 15 Q 25 22 30 15 Z" fill="currentColor" stroke="none" />
        <path d="M 20 15 L 30 15" strokeWidth={2.5} />
      </svg>);
    case 'surprised': return (  /* 놀람: 동그란 눈 + O 입 */
      <svg {...P} data-mood="surprised">
        <circle cx="15" cy="9" r="3.4" strokeWidth={3} />
        <circle cx="35" cy="9" r="3.4" strokeWidth={3} />
        <circle cx="25" cy="18" r="3.2" strokeWidth={3} />
      </svg>);
    case 'nag': return (   /* 잔소리: 처진 눈썹 + 삐죽 물결 입 */
      <svg {...P} data-mood="nag">
        <path d="M 10 6 L 19 9" strokeWidth={2.5} />
        <path d="M 40 6 L 31 9" strokeWidth={2.5} />
        <circle cx="15" cy="12" r="2.3" fill="currentColor" stroke="none" />
        <circle cx="35" cy="12" r="2.3" fill="currentColor" stroke="none" />
        <path d="M 20 18 Q 22.5 15.5 25 18 Q 27.5 20.5 30 18" />
      </svg>);
    case 'curious': return (  /* 궁금: 한쪽 눈썹 들고 갸웃 + 작은 o 입 */
      <svg {...P} data-mood="curious">
        <path d="M 10 5 Q 15 3 20 6" strokeWidth={2.5} />
        <circle cx="15" cy="11" r="2.6" fill="currentColor" stroke="none" />
        <circle cx="35" cy="9" r="2.6" fill="currentColor" stroke="none" />
        <circle cx="26" cy="17" r="2.2" strokeWidth={2.5} />
      </svg>);
    case 'meh': return (
      <svg {...P} data-mood="meh">
        <circle cx="15" cy="10" r="2.5" fill="currentColor" stroke="none" />
        <circle cx="35" cy="10" r="2.5" fill="currentColor" stroke="none" />
        <path d="M 22 17 L 28 17" />
      </svg>);
    case 'superhappy': return (
      <svg {...P} data-mood="superhappy">
        <path d="M 12 10 Q 15 6 18 10" />
        <path d="M 32 10 Q 35 6 38 10" />
        <path d="M 21 16 Q 25 21 29 16" />
      </svg>);
    default: return (
      <svg {...P} data-mood="happy">
        <circle cx="15" cy="10" r="2.5" fill="currentColor" stroke="none" />
        <circle cx="35" cy="10" r="2.5" fill="currentColor" stroke="none" />
        <path d="M 21 16 Q 25 20 29 16" />
      </svg>);
  }
};

const PotRender = ({ potId, expression }: { potId: string, expression: ReactNode }) => {
   let bg = "bg-gradient-to-br from-[#e8bd8b] via-[#d4a373] to-[#b98957]";
   let rim = "bg-[#c8986a]";
   let text = "text-[#5c4033]";
   
   if (potId === 'pot2') { // 황금
       bg = "bg-gradient-to-br from-[#fff3c9] via-[#f9c941] to-[#e09b00]";
       rim = "bg-[#f8b500]";
       text = "text-[#c59b3a]";
   } else if (potId === 'pot3') { // 무늬
       bg = "bg-gradient-to-b from-[#e8cf9f] via-[#d9b87f] to-[#e0c396]";
       rim = "bg-[#c8986a]";
   } else if (potId === 'pot4') { // 백자
       bg = "bg-gradient-to-b from-white via-[#f7f7f5] to-[#dfdfdb]";
       rim = "bg-[#f0f0f0]";
       text = "text-[#666666]";
   } else if (potId === 'pot5') { // 청자
       bg = "bg-gradient-to-br from-[#c2dcc9] via-[#8fb89d] to-[#6a917b]";
       rim = "bg-[#8bb399]";
       text = "text-[#3d5a48]";
   } else if (potId === 'pot6') { // 나무
       bg = "bg-gradient-to-b from-[#9a6a38] via-[#7c4f26] to-[#8b5a2b]";
       rim = "bg-[#6b4226]";
       text = "text-[#3d2314]";
   } else if (potId === 'pot7') { // 유리
       bg = "bg-white/40 backdrop-blur-md";
       rim = "bg-white/50 backdrop-blur-md";
       text = "text-white drop-shadow-md";
   } else if (potId === 'pot8') { // 대리석
       bg = "bg-gradient-to-br from-[#f4f4f4] via-[#dcdcdc] to-[#ececec]";
       rim = "bg-[#d0d0d0]";
       text = "text-[#4a4a4a]";
   } else if (potId === 'pot9') { // 돌
       bg = "bg-gradient-to-b from-[#9a9a9a] via-[#7f7f7f] to-[#8c8c8c]";
       rim = "bg-[#737373]";
       text = "text-[#262626]";
   } else if (potId === 'pot10') { // 테라코타
       bg = "bg-gradient-to-br from-[#f2977e] via-[#dd6c52] to-[#b34f40]";
       rim = "bg-[#c15c4c]";
       text = "text-[#7a3b31]";
   } else if (potId === 'pot11') { // 크리스탈
       bg = "bg-gradient-to-br from-fuchsia-200/70 via-sky-200/60 to-violet-300/70 backdrop-blur-lg border border-white/60";
       rim = "bg-white/60 backdrop-blur-md";
       text = "text-indigo-900";
   } else if (potId === 'pot12') { // 깡통
       bg = "bg-gradient-to-b from-[#d8d8d8] via-[#a8a8a8] to-[#7d7d7d] border border-gray-400";
       rim = "bg-[#c0c0c0]";
       text = "text-[#4d4d4d]";
   } else if (potId === 'pot13') { // 은빛
       bg = "bg-gradient-to-br from-white via-[#dfe5ee] to-[#c3cbd8] border border-gray-200";
       rim = "bg-[#dcdcdc]";
       text = "text-[#808080]";
   }

   return (
       <div className="flex flex-col items-center relative z-20">
          <div className={`w-32 md:w-40 h-6 md:h-8 ${rim} rounded-lg shadow-md z-10 -mb-2 relative overflow-hidden`}>
            {/* 림 광택 */}
            <div className="pot-shine absolute inset-x-1 top-0.5 h-1/2 bg-gradient-to-b from-white/60 to-transparent rounded-full pointer-events-none" />
          </div>
          <div 
             className={`w-24 md:w-32 h-28 md:h-32 ${bg} shadow-inner flex flex-col items-center justify-center relative overflow-hidden`}
             style={{ clipPath: 'polygon(0 0, 100% 0, 85% 100%, 15% 100%)', borderBottomLeftRadius: '16px', borderBottomRightRadius: '16px' }}
          >
            {/* 좌측 세로 광택 줄기 — 도자기 윤기 */}
            <div className="absolute left-[16%] top-[8%] bottom-[14%] w-[10%] bg-gradient-to-b from-white/55 via-white/20 to-transparent rounded-full pointer-events-none" style={{ filter: 'blur(1px)' }} />
            {/* 우측 은은한 반사 */}
            <div className="absolute right-[18%] top-[14%] h-[30%] w-[6%] bg-white/25 rounded-full pointer-events-none" style={{ filter: 'blur(2px)' }} />
            {/* 하단 안쪽 음영 — 입체감 */}
            <div className="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-black/15 to-transparent pointer-events-none" />
            <div className={`mt-2 ${text} opacity-90 flex items-center justify-center pointer-events-none relative z-10`}>
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

          <motion.div
            animate={{ rotate: [-1.6, 1.6, -1.6] }}
            transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
            className={`filter drop-shadow-2xl z-20 -mb-8 pointer-events-none origin-bottom ${
              plant.stage === 'seed' ? 'text-[3.5rem] md:text-[4.5rem]'
              : plant.stage === 'sprout' ? 'text-[5rem] md:text-[6rem]'
              : plant.stage === 'mature' ? 'text-[6.5rem] md:text-[8rem]'
              : 'text-[8rem] md:text-[10rem]'
            }`}
          >
            {getEmoji(plant.type.type, plant.stage, plant.type.emoji)}
          </motion.div>
          
          <PotRender potId={plant.potId || 'pot1'} expression={getFacialExpression(plant.waterLevel, phrase)} />
        </motion.div>
        
        <AnimatePresence mode="wait">
          <motion.div
            key={phrase}
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute -top-[72px] md:-top-[88px] bg-white/95 backdrop-blur-sm text-gray-800 px-5 md:px-6 py-3 md:py-3.5 rounded-2xl md:rounded-3xl shadow-xl w-[260px] md:w-[300px] text-center break-keep font-bold text-[16px] md:text-lg leading-relaxed border-2 border-white pointer-events-none"
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
            <div className="px-2 text-[13px] md:text-sm font-bold text-green-700 w-[70px] md:w-20 flex items-center gap-1">
               <Star className="w-3 h-3 fill-current" /> 레벨 {plant.level}
            </div>
            <div className="flex-1 bg-green-900/30 rounded-full h-3.5 md:h-4 mr-1 relative overflow-hidden">
              <div 
                className="bg-gradient-to-r from-[#78e378] to-[#4caf50] h-full rounded-full flex items-center justify-end pr-2 transition-all duration-1000 ease-out relative overflow-hidden" 
                style={{ width: `${growthPercent}%` }}
              >
                <div className="absolute inset-0 bg-white/20"></div>
              </div>
              <div className="absolute inset-0 flex items-center justify-center text-[12px] md:text-[13px] text-white font-bold drop-shadow-md">
                {plant.stage === 'old' ? 'MAX' : <><AnimatedNumber value={parseFloat(growthPercent)} decimals={1} /> %</>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
