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

/* 졸업장 캔버스: 어르신 손에 남는 실물 증서 — 사진 저장·카톡 자랑용 */
function drawCertificate(plant: UserPlant, days: number): HTMLCanvasElement {
  const W = 840, H = 1120;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const cx = cv.getContext('2d')!;
  const displayName = plant.customName ? `${plant.customName}` : plant.type.name;
  const subName = plant.customName ? plant.type.name : '';
  const today = new Date();
  const dateStr = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;

  // 한지 느낌 배경 + 이중 테두리
  cx.fillStyle = '#fdf8ee'; cx.fillRect(0, 0, W, H);
  cx.strokeStyle = '#c8a86a'; cx.lineWidth = 10; cx.strokeRect(28, 28, W - 56, H - 56);
  cx.strokeStyle = '#e0c396'; cx.lineWidth = 3; cx.strokeRect(48, 48, W - 96, H - 96);
  // 모서리 꽃 장식
  cx.font = '44px serif'; cx.textAlign = 'center'; cx.textBaseline = 'middle';
  cx.fillText('🌸', 78, 82); cx.fillText('🌸', W - 78, 82);
  cx.fillText('🌸', 78, H - 82); cx.fillText('🌸', W - 78, H - 82);

  const serif = "'Nanum Myeongjo','Batang',serif";
  cx.fillStyle = '#5b3a1a';
  cx.font = `900 88px ${serif}`;
  cx.fillText('졸  업  장', W / 2, 190);
  cx.fillStyle = '#c8a86a';
  cx.fillRect(W / 2 - 90, 248, 180, 4);

  // 주인공
  cx.font = '150px serif';
  cx.fillText(plant.type.emoji || '🌸', W / 2, 400);
  cx.fillStyle = '#3d2b15';
  cx.font = `900 58px ${serif}`;
  cx.fillText(displayName, W / 2, 520);
  if (subName) {
    cx.fillStyle = '#8a6d48'; cx.font = `700 30px ${serif}`;
    cx.fillText(`(${subName})`, W / 2, 570);
  }

  // 본문
  cx.fillStyle = '#4a3820';
  cx.font = `500 34px ${serif}`;
  const lines = [
    `위 식물은 ${days}일 동안`,
    '따뜻한 손길과 정성으로 자라나',
    '마침내 아름답게 만개하였기에',
    '이 증서를 드립니다.',
  ];
  lines.forEach((ln, i) => cx.fillText(ln, W / 2, 660 + i * 58));

  // 기록
  cx.fillStyle = '#7a5f3e';
  cx.font = `700 30px ${serif}`;
  cx.fillText(`함께한 시간 ${days}일  ·  성장 레벨 Lv.${plant.level}`, W / 2, 930);
  cx.fillText(dateStr, W / 2, 985);

  // 서명
  cx.fillStyle = '#a14d68';
  cx.font = `900 34px ${serif}`;
  cx.fillText('다시봄 · dasibomlife.com', W / 2, 1055);
  return cv;
}

export default function GraduationModal({ plant, isOpen, onClose }: Props) {
  const [message, setMessage] = useState('');
  const [savedTick, setSavedTick] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const msgs = DIALOGUES.graduation;
      setMessage(msgs[Math.floor(Math.random() * msgs.length)]);
      setSavedTick(false);
    }
  }, [isOpen]);

  if (!plant) return null;

  const daysTogether = Math.max(1, Math.ceil((Date.now() - parseInt(plant.id)) / (1000 * 60 * 60 * 24)));

  const saveCertificate = () => {
    try {
      const cv = drawCertificate(plant, daysTogether);
      cv.toBlob((blob) => {
        if (!blob) return;
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `졸업장_${plant.customName || plant.type.name}.png`;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
        setSavedTick(true);
        setTimeout(() => setSavedTick(false), 2600);
      }, 'image/png');
    } catch (e) { /* 저장 실패는 조용히 — 화면 자체가 증서 */ }
  };

  const shareKakao = () => {
    const name = plant.customName || plant.type.name;
    const S = (window as any).DasibomShare;
    const payload = {
      title: '🌸 우리 화분이 만개했어요',
      text: `${name}와(과) ${daysTogether}일을 함께 하고 오늘 만개했어요 🌸\n다시봄 수다쟁이 화분에서 같이 키워봐요!`,
      url: 'https://dasibomlife.com/plant',
    };
    if (S && S.share) { S.share(payload); return; }
    if (navigator.share) navigator.share(payload).catch(() => {});
  };

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

            <p className="text-base text-gray-500 mt-10 mb-8 font-serif text-center w-full">
              - 당신의 동무, {plant.customName || plant.type.name} -
            </p>

            {/* 졸업장 간직하기 — 사진으로 남기고, 카톡으로 자랑하고 */}
            <div className="w-full md:max-w-xs flex gap-2.5 mb-3 relative z-20">
              <button
                onClick={saveCertificate}
                className="flex-1 bg-white hover:bg-[#fdf6e9] text-[#7a5f3e] py-3.5 rounded-xl font-bold transition-all shadow-md text-[15px] active:scale-95 border-2 border-[#e0c396] flex items-center justify-center gap-1.5"
              >
                {savedTick ? '📜 저장됐어요 ✓' : '📜 졸업장 사진 저장'}
              </button>
              <button
                onClick={shareKakao}
                className="flex-1 bg-[#FEE500] hover:bg-[#f5dc00] text-[#3d1e1e] py-3.5 rounded-xl font-bold transition-all shadow-md text-[15px] active:scale-95 border-2 border-white/60 flex items-center justify-center gap-1.5"
              >
                💬 카카오톡 자랑
              </button>
            </div>

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
