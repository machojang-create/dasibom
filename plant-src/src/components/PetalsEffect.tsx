import React from 'react';
import { motion } from 'motion/react';

export default function PetalsEffect() {
  const petals = Array.from({ length: 30 }).map((_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 5,
    duration: 5 + Math.random() * 5,
    size: 10 + Math.random() * 15,
    rotate: Math.random() * 360,
  }));

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
      {petals.map((petal) => (
        <motion.div
          key={petal.id}
          className="absolute"
          initial={{
            opacity: 0,
            y: -50,
            x: `${petal.left}vw`,
            rotate: petal.rotate,
          }}
          animate={{
            opacity: [0, 1, 1, 0],
            y: '110vh',
            x: [`${petal.left}vw`, `${petal.left + (Math.random() * 20 - 10)}vw`, `${petal.left + (Math.random() * 40 - 20)}vw`],
            rotate: petal.rotate + 360,
          }}
          transition={{
            duration: petal.duration,
            repeat: Infinity,
            delay: petal.delay,
            ease: "linear",
          }}
          style={{
            width: petal.size,
            height: petal.size,
          }}
        >
          <svg viewBox="0 0 100 100" className="w-full h-full fill-pink-300/60 drop-shadow-sm">
            <path d="M50 100 C 20 100, 0 70, 0 40 C 0 15, 25 0, 50 0 C 75 0, 100 15, 100 40 C 100 70, 80 100, 50 100 Z" />
          </svg>
        </motion.div>
      ))}
    </div>
  );
}
