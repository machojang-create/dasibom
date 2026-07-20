import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserPlant } from '../types';
import { DIALOGUES } from '../data/dialogues';
import PetalsEffect from './PetalsEffect';

interface Props {
  plant: UserPlant | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function GraduationModal({ plant, isOpen, onClose }: Props) {
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      const msgs = DIALOGUES.graduation;
      setMessage(msgs[Math.floor(Math.random() * msgs.length)]);
    }
  }, [isOpen]);

  if (!plant) return null;

  const daysTogether = Math.max(1, Math.ceil((Date.now() - parseInt(plant.id)) / (1000 * 60 * 60 * 24)));

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-[#fdfbf7] overflow-y-auto">
          {/* Texture overlay */}
          <div className="fixed inset-0 bg-[url('https://www.transparenttextures.com/patterns/rice-paper-2.png')] opacity-30 mix-blend-multiply pointer-events-none" />
          
          <PetalsEffect />
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="flex flex-col items-center justify-center min-h-full p-6 py-12 md:p-8 relative z-10 w-full max-w-lg mx-auto"
          >
            <div className="text-7xl md:text-8xl mb-8 animate-bounce filter drop-shadow-lg">{plant.type.emoji || '🌸'}</div>
            
            <h2 className="text-3xl md:text-4xl font-serif text-gray-800 mb-4 font-bold break-keep text-center tracking-tight">
              만개, 그리고 이별
            </h2>
            
            <div className="w-full max-w-sm bg-white/60 backdrop-blur-sm p-5 rounded-2xl border-2 border-[#e0c396] shadow-sm mb-6 flex justify-around">
              <div className="flex flex-col items-center">
                <span className="text-sm text-gray-500 font-medium mb-1">함께한 시간</span>
                <span className="font-bold text-gray-800 text-lg">{daysTogether}일</span>
              </div>
              <div className="w-px h-10 bg-[#e0c396]/50"></div>
              <div className="flex flex-col items-center">
                <span className="text-sm text-gray-500 font-medium mb-1">성장 레벨</span>
                <span className="font-bold text-[#d4a373] text-lg">Lv.{plant.level}</span>
              </div>

            </div>

            <div className="w-16 h-1 bg-[#d4a373] my-4 rounded-full" />
            
            <p className="text-gray-700 text-lg md:text-xl leading-relaxed font-serif break-keep text-left w-full mt-2 md:px-4 whitespace-pre-wrap relative z-20">
              "{message}"
            </p>
            
            <p className="text-base text-gray-500 mt-10 mb-10 font-serif text-center w-full">
              - 당신의 동무, {plant.type.name} -
            </p>
            
            <button
              onClick={onClose}
              className="w-full bg-gradient-to-b from-[#d4a373] to-[#c8986a] hover:from-[#c8986a] hover:to-[#bc8b5d] text-white py-4 rounded-xl font-bold transition-all shadow-md text-lg active:scale-95 border-2 border-white/50 md:max-w-xs relative z-20"
            >
              도감에 보관하고 새 식물 맞이하기
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
