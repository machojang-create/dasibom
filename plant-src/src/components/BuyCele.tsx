import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';

/* 화분 구입 축하 연출(2026-07-24 Macho) — 봄이가 등장해 초등학생 가르치듯 친절하게, 목소리로도.
   window.DASIBOM_BOM===false 면 봄이 없이 중립 톤(독립앱 대비). */
export type Cele = { key: number; icon: string; name: string; spent: number; balance: number; tip: string };

const bomOn = () => (typeof window === 'undefined' ? true : (window as any).DASIBOM_BOM !== false);

export default function BuyCele({ cele, onClose }: { cele: Cele | null; onClose: () => void }) {
  const withBom = bomOn();

  useEffect(() => {
    const w = window as any;
    if (cele && withBom && w.BomVoice && w.BomVoice.say) {
      try { w.BomVoice.say(cele.name + ' 획득! ' + cele.tip); } catch (e) {}
    }
    return () => { try { if (w.BomVoice && w.BomVoice.stop) w.BomVoice.stop(); } catch (e) {} };
  }, [cele && cele.key]);

  return (
    <AnimatePresence>
      {cele && (
        <motion.div
          className="fixed inset-0 z-[95] flex items-center justify-center p-6 pointer-events-auto"
          style={{ background: 'rgba(40,28,10,0.42)' }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            key={cele.key}
            className="relative w-full max-w-[320px] bg-[#FFFDF7] rounded-[28px] px-6 pt-9 pb-7 shadow-2xl border-4 border-[#EFE4D2] text-center overflow-visible"
            initial={{ scale: 0.7, y: 30, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.85, y: 10, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            {withBom && (
              <motion.img
                src="/img/bom_cheer.png" alt="봄이"
                className="absolute -top-12 left-1/2 -translate-x-1/2 w-24 h-24 object-contain drop-shadow-lg pointer-events-none"
                initial={{ y: 14, scale: 0.5, opacity: 0 }}
                animate={{ y: 0, scale: 1, opacity: 1, rotate: [0, -6, 6, 0] }}
                transition={{ type: 'spring', stiffness: 300, damping: 12, delay: 0.08 }}
              />
            )}

            {['✨', '🌸', '🍃', '⭐', '💫', '✨'].map((s, i) => (
              <motion.span key={i} className="absolute text-xl pointer-events-none"
                style={{ left: (12 + i * 15) + '%', top: '2%' }}
                initial={{ y: 0, opacity: 0, scale: 0.4 }}
                animate={{ y: [-6, -30], opacity: [0, 1, 0], scale: [0.4, 1.1, 0.7], rotate: (i % 2 ? 25 : -25) }}
                transition={{ duration: 1.1, delay: 0.15 + i * 0.06 }}
              >{s}</motion.span>
            ))}

            <motion.div className={`text-6xl mb-1 ${withBom ? 'mt-8' : ''}`}
              initial={{ scale: 0.3, rotate: -12 }} animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 12, delay: 0.05 }}
            >{cele.icon}</motion.div>

            <div className="text-[#0e9d7d] font-black text-sm tracking-wide">{withBom ? '봄이가 콕 챙겨드렸어요! 🎊' : '구입 완료! 🎊'}</div>
            <div className="text-[#4a3a26] font-black text-[20px] leading-tight mt-1 mb-3">{cele.name} 획득!</div>

            <div className="bg-[#FBF3E4] rounded-2xl px-4 py-3 flex items-center justify-center gap-2 text-[15px] font-bold mb-3">
              <span className="text-[#c0587a]">🌸 {cele.spent.toLocaleString()}개 사용</span>
              <span className="text-[#d9c8a8]">·</span>
              <span className="text-[#6b5a48]">남은 꽃잎 {cele.balance.toLocaleString()}개</span>
            </div>

            {withBom ? (
              <div className="relative bg-[#F0FAF4] border border-[#cfeadd] rounded-2xl px-4 py-3 mb-4">
                <div className="absolute -top-2 left-6 w-3 h-3 bg-[#F0FAF4] border-l border-t border-[#cfeadd] rotate-45" />
                <p className="text-[14px] text-[#1e5f4a] font-medium leading-relaxed break-keep">{cele.tip}</p>
              </div>
            ) : (
              <p className="text-[14px] text-[#6b5a48] font-medium leading-relaxed mb-4 break-keep">{cele.tip}</p>
            )}

            <button onClick={onClose}
              className="w-full py-3 rounded-2xl bg-[#0e9d7d] hover:bg-[#0c876b] text-white font-black text-[15px] active:scale-95 transition-transform">
              {withBom ? '고마워 봄아! 👍' : '좋아요! 👍'}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
