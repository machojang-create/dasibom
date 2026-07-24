import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';

/* 구입 축하 연출(2026-07-24 Macho) — 봄이가 등장해 초등학생 가르치듯 친절하게:
   뭘 얻었나·얼마 썼나·다음에 뭐하나. 봄이 목소리(무료 ElevenLabs)로도 말한다.
   window.DASIBOM_BOM===false 면 봄이 없이 중립 톤(독립앱 대비). */
export type Cele = { key: number; icon: string; name: string; spent: number; balance: number; tip: string };

const bomOn = () => (typeof window === 'undefined' ? true : (window as any).DASIBOM_BOM !== false);

export default function BuyCele({ cele, onClose }: { cele: Cele | null; onClose: () => void }) {
  const withBom = bomOn();

  // 봄이가 직접 말한다 — 축하 카드가 뜰 때(무료 ElevenLabs, 문장 캐시). 카드 닫히면 멈춤.
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
          style={{ background: 'rgba(8,20,40,0.42)' }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            key={cele.key}
            className="relative w-full max-w-[320px] bg-white rounded-[28px] px-6 pt-9 pb-7 shadow-2xl border-4 border-teal-100 text-center overflow-visible"
            initial={{ scale: 0.7, y: 30, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.85, y: 10, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 봄이 — 카드 위로 뿅 등장(독립앱이면 숨김) */}
            {withBom && (
              <motion.img
                src="/img/bom_cheer.png" alt="봄이"
                className="absolute -top-12 left-1/2 -translate-x-1/2 w-24 h-24 object-contain drop-shadow-lg pointer-events-none"
                initial={{ y: 14, scale: 0.5, opacity: 0 }}
                animate={{ y: 0, scale: 1, opacity: 1, rotate: [0, -6, 6, 0] }}
                transition={{ type: 'spring', stiffness: 300, damping: 12, delay: 0.08 }}
              />
            )}

            {/* 반짝 컨페티 */}
            {['✨', '🎉', '💧', '⭐', '🫧', '✨'].map((s, i) => (
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

            <div className="text-teal-600 font-black text-sm tracking-wide">{withBom ? '봄이가 콕 챙겨드렸어요! 🎊' : '구입 완료! 🎊'}</div>
            <div className="text-slate-900 font-black text-[20px] leading-tight mt-1 mb-3">{cele.name} 획득!</div>

            <div className="bg-slate-50 rounded-2xl px-4 py-3 flex items-center justify-center gap-2 text-[15px] font-bold mb-3">
              <span className="text-rose-500">🌸 {cele.spent.toLocaleString()}개 사용</span>
              <span className="text-slate-300">·</span>
              <span className="text-slate-700">남은 꽃잎 {cele.balance.toLocaleString()}개</span>
            </div>

            {/* 봄이 말풍선 안내(독립앱이면 그냥 문장) */}
            {withBom ? (
              <div className="relative bg-teal-50 border border-teal-100 rounded-2xl px-4 py-3 mb-4">
                <div className="absolute -top-2 left-6 w-3 h-3 bg-teal-50 border-l border-t border-teal-100 rotate-45" />
                <p className="text-[14px] text-teal-900 font-medium leading-relaxed break-keep">{cele.tip}</p>
              </div>
            ) : (
              <p className="text-[14px] text-slate-600 font-medium leading-relaxed mb-4 break-keep">{cele.tip}</p>
            )}

            <button onClick={onClose}
              className="w-full py-3 rounded-2xl bg-teal-500 hover:bg-teal-600 text-white font-black text-[15px] active:scale-95 transition-transform">
              {withBom ? '고마워 봄아! 👍' : '좋아요! 👍'}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
