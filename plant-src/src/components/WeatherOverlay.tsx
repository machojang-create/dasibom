import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { WeatherType } from '../types';

export default function WeatherOverlay({ weather, timeOfDay }: { weather: WeatherType, timeOfDay?: 'morning' | 'day' | 'night' }) {
  const [particles, setParticles] = useState<{ id: number; left: number; delay: number; duration: number }[]>([]);

  useEffect(() => {
    if (weather === 'rainy' || weather === 'typhoon' || weather === 'snowy') {
      const count = weather === 'typhoon' ? 80 : weather === 'snowy' ? 50 : 40;
      const elements = Array.from({ length: count }).map((_, i) => ({
        id: i,
        left: Math.random() * 120,
        delay: Math.random() * (weather === 'typhoon' ? 0.5 : 1),
        duration: weather === 'typhoon' ? 0.3 + Math.random() * 0.2 : weather === 'snowy' ? 30 + Math.random() * 20 : 0.6 + Math.random() * 0.4,
      }));
      setParticles(elements);
    }
  }, [weather]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 transition-opacity duration-1000">
      
      {/* Sunny & Clear Effect */}
      <div className={`absolute inset-0 transition-opacity duration-1000 ${(weather === 'sunny' || weather === 'clear') && timeOfDay !== 'night' ? 'opacity-100' : 'opacity-0'}`}>
        <div className={`absolute inset-0 bg-gradient-to-br ${weather === 'clear' ? 'from-blue-400/20 to-transparent' : 'from-[#d4af37]/10 to-transparent'}`}></div>
        <div className="absolute inset-0">
          {Array.from({ length: 20 }).map((_, i) => (
            <motion.div
              key={i}
              className={`absolute w-1.5 h-1.5 rounded-full blur-[1px] ${weather === 'clear' ? 'bg-white' : 'bg-yellow-200'}`}
              initial={{ x: Math.random() * 100 + '%', y: Math.random() * 100 + '%', opacity: 0 }}
              animate={{ y: [0, -50], opacity: [0, 0.6, 0] }}
              transition={{ duration: 3 + Math.random() * 2, repeat: Infinity, delay: Math.random() * 2 }}
            />
          ))}
        </div>
        <div className="absolute -top-[20%] left-[-10%] w-[150%] h-[150%] flex transform rotate-[35deg] opacity-60">
          <div className="w-1/6 h-full bg-white/5 blur-3xl"></div>
          <div className="w-1/12 h-full bg-white/10 blur-2xl ml-8"></div>
          <div className="w-1/4 h-full bg-white/5 blur-3xl ml-16"></div>
          <div className="w-1/12 h-full bg-white/10 blur-2xl ml-12"></div>
        </div>
      </div>

      {/* Hot Effect */}
      <div className={`absolute inset-0 transition-opacity duration-1000 ${weather === 'hot' && timeOfDay !== 'night' ? 'opacity-100' : 'opacity-0'}`}>
        <div className="absolute inset-0 bg-gradient-to-t from-orange-500/20 via-red-500/10 to-transparent mix-blend-overlay"></div>
        <div className="absolute -top-[30%] left-[-20%] w-[150%] h-[150%] flex transform rotate-[25deg] opacity-80">
          <div className="w-1/4 h-full bg-orange-400/10 blur-3xl ml-10"></div>
          <div className="w-1/3 h-full bg-red-400/10 blur-3xl ml-20"></div>
        </div>
      </div>

      {/* Cloudy Effect — 떠가는 구름 */}
      <div className={`absolute inset-0 transition-opacity duration-1000 ${weather === 'cloudy' ? 'opacity-100' : 'opacity-0'}`}>
        <div className="absolute inset-0 bg-slate-500/15"></div>
        <div className="absolute top-[6%] w-[42%] h-[14%] bg-white/70 rounded-full blur-xl animate-clouddrift" />
        <div className="absolute top-[16%] w-[34%] h-[11%] bg-white/55 rounded-full blur-xl animate-clouddrift" style={{ animationDelay: '-22s' }} />
        <div className="absolute top-[3%] w-[26%] h-[9%] bg-slate-200/60 rounded-full blur-lg animate-clouddrift" style={{ animationDelay: '-40s' }} />
      </div>

      {/* Rainy & Typhoon Effect */}
      <div className={`absolute inset-0 transition-opacity duration-1000 ${weather === 'rainy' || weather === 'typhoon' ? 'opacity-100' : 'opacity-0'}`}>
        <div className={`absolute inset-0 transition-all duration-1000 ${weather === 'typhoon' ? 'bg-slate-800/45' : 'bg-slate-700/25'}`}></div>
        {weather === 'typhoon' && <div className="absolute inset-0 bg-white animate-lightning pointer-events-none" />}
        {weather === 'typhoon' && [0,1,2,3].map(i => (
          <div key={i} className="absolute text-xl animate-leafblow" style={{ top: (12+i*18)+'%', animationDelay: (i*1.3)+'s' }}>🍃</div>
        ))}
        {/* 유리에 맺힌 물방울 */}
        {[8,22,41,63,78,90].map((lx,i) => (
          <div key={'gd'+i} className="absolute w-1.5 h-3 bg-sky-100/50 rounded-full animate-glassdrop" style={{ left: lx+'%', animationDelay: (i*1.7)+'s' }} />
        ))}
        <div className={`absolute inset-0 ${weather === 'typhoon' ? '-rotate-12 scale-125' : ''}`}>
           {particles.map(drop => (
             <div
               key={drop.id}
               className="absolute top-0 w-0.5 bg-gradient-to-b from-transparent via-[#86c5da]/60 to-transparent animate-rain"
               style={{
                 left: `${drop.left}%`,
                 height: weather === 'typhoon' ? '30vh' : '20vh',
                 animationDelay: `${drop.delay}s`,
                 animationDuration: `${drop.duration}s`
               }}
             />
           ))}
        </div>
      </div>

      {/* Snowy Effect */}
      <div className={`absolute inset-0 transition-opacity duration-1000 ${weather === 'snowy' ? 'opacity-100' : 'opacity-0'}`}>
        <div className="absolute inset-0 bg-sky-200/20 transition-all duration-1000"></div>
        <div className="absolute inset-0">
           {particles.map(drop => (
             <motion.div
               key={drop.id}
               className="absolute top-[-10px] w-2 h-2 bg-white rounded-full blur-[1px] opacity-70"
               style={{ left: `${drop.left}%` }}
               animate={{ 
                 y: ['0vh', '110vh'], 
                 x: [0, (Math.random() - 0.5) * 50, (Math.random() - 0.5) * 50] 
               }}
               transition={{
                 y: { duration: drop.duration, repeat: Infinity, ease: 'linear', delay: drop.delay },
                 x: { duration: drop.duration, repeat: Infinity, ease: 'easeInOut', delay: drop.delay }
               }}
             />
           ))}
        </div>
      </div>

    </div>
  );
}
