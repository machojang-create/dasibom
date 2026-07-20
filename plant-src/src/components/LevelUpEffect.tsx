import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Star } from 'lucide-react';

interface Props {
  isActive: boolean;
}

export default function LevelUpEffect({ isActive }: Props) {
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; color: string; size: number; delay: number }[]>([]);

  useEffect(() => {
    if (isActive) {
      const colors = ['#fde047', '#fef08a', '#ffffff', '#67e8f9', '#86efac'];
      const newParticles = Array.from({ length: 50 }).map((_, i) => ({
        id: i,
        x: (Math.random() - 0.5) * 400, // random spread X
        y: (Math.random() - 0.5) * 400 - 100, // random spread Y, slightly upward
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 15 + 5,
        delay: Math.random() * 0.2,
      }));
      setParticles(newParticles);
    }
  }, [isActive]);

  return (
    <AnimatePresence>
      {isActive && (
        <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none overflow-hidden">
          {/* Flash background */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.5, 0] }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
            className="absolute inset-0 bg-yellow-200/30 mix-blend-overlay"
          />
          
          {/* Center burst light */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 2, 3], opacity: [0, 1, 0] }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="absolute w-64 h-64 bg-gradient-to-r from-transparent via-yellow-300/60 to-transparent rounded-full blur-2xl"
          />

          {/* Particles */}
          <div className="relative w-full h-full flex items-center justify-center">
            {particles.map(p => (
              <motion.div
                key={p.id}
                initial={{ x: 0, y: 0, scale: 0, opacity: 1, rotate: 0 }}
                animate={{ 
                  x: p.x, 
                  y: p.y - 200, // float upwards
                  scale: [0, 1, 0.5], 
                  opacity: [1, 1, 0],
                  rotate: Math.random() * 360
                }}
                transition={{ 
                  duration: 2 + Math.random() * 1, 
                  ease: "easeOut",
                  delay: p.delay
                }}
                className="absolute"
                style={{
                  color: p.color,
                }}
              >
                {Math.random() > 0.5 ? (
                  <Star className="fill-current" style={{ width: p.size, height: p.size }} />
                ) : (
                  <div 
                    className="rounded-full bg-current" 
                    style={{ width: p.size, height: p.size, boxShadow: `0 0 10px ${p.color}` }} 
                  />
                )}
              </motion.div>
            ))}
          </div>

          {/* Level Up Text */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0, y: 20 }}
            animate={{ scale: [0.5, 1.2, 1], opacity: [0, 1, 1, 0], y: [20, 0, -20] }}
            transition={{ duration: 2.5, times: [0, 0.2, 0.8, 1], ease: "easeOut" }}
            className="absolute z-10 flex flex-col items-center"
          >
            <h2 className="text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-100 to-yellow-500 filter drop-shadow-[0_5px_5px_rgba(0,0,0,0.5)]">
              LEVEL UP!
            </h2>
            <p className="text-white font-bold text-lg mt-2 drop-shadow-md">다음 성장 단계로 진화했습니다!</p>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
