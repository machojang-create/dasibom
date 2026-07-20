import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface GuppySVGProps {
  bodyColor: string;
  tailColor: string;
  patternColor: string;
  expression: string | null;
  pose?: 'main' | 'side' | 'top' | 'swim1' | 'swim2';
  hideFloaters?: boolean;
}

export const GuppySVG = React.memo(function GuppySVG({ 
  bodyColor, 
  tailColor, 
  patternColor, 
  expression,
  pose = 'main',
  hideFloaters = false
}: GuppySVGProps) {
  // 고유 ID 생성 (여러 구피가 동시에 렌더링될 때 ID 충돌 방지)
  const idPrefix = React.useId().replace(/:/g, '');
  
  // 뷰박스 크기 설정
  const vbWidth = 440;
  const vbHeight = 340;

  let wrapperTransform = "";
  if (pose === 'side') wrapperTransform = "scale(0.8) scaleX(0.9) rotate(-10deg)";
  if (pose === 'top') wrapperTransform = "scale(0.8) scaleY(0.7) rotate(15deg) skewX(-15deg)";
  if (pose === 'swim1') wrapperTransform = "scaleX(1.1) scaleY(0.85) rotate(-5deg)";
  if (pose === 'swim2') wrapperTransform = "scaleX(0.9) scaleY(1.1) rotate(5deg)";
  if (pose === 'main') wrapperTransform = "scale(1)";

  return (
    <div className="relative w-full h-full flex items-center justify-center " style={{ transform: wrapperTransform }}>
      <motion.svg 
        viewBox={`0 0 ${vbWidth} ${vbHeight}`} 
        className="w-full h-full drop-shadow-2xl"
        animate={pose === 'main' ? { y: [-8, 8, -8] } : {}}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      >
        <defs>
          <clipPath id={`tailClip-${idPrefix}`}>
            <path d="M 240 170 C 280 0, 460 20, 410 170 C 460 320, 280 340, 240 170 Z" />
          </clipPath>

          {/* 몸통 입체감을 위한 그라데이션 */}
          <linearGradient id={`bodyGrad-${idPrefix}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="5%" stopColor={bodyColor} />
            <stop offset="65%" stopColor={bodyColor} stopOpacity="0.85" />
            <stop offset="95%" stopColor="#ffffff" />
          </linearGradient>

          {/* 꼬리 그라데이션 */}
          <radialGradient id={`tailGrad-${idPrefix}`} cx="20%" cy="50%" r="80%">
            <stop offset="0%" stopColor={bodyColor} />
            <stop offset="40%" stopColor={tailColor} />
            <stop offset="100%" stopColor={tailColor} />
          </radialGradient>
          
          {/* 눈동자 깊이감 */}
          <linearGradient id={`eyeBase-${idPrefix}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#000000" />
          </linearGradient>

          {/* 눈동자 색상 링 (홍채) */}
          <linearGradient id={`eyeIris-${idPrefix}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={bodyColor} />
            <stop offset="100%" stopColor="#ffffff" />
          </linearGradient>
        </defs>

        {/* 뒤쪽 배 지느러미 */}
        <motion.path 
          d="M 160 210 Q 180 260 140 270 Q 130 230 150 210 Z" fill={tailColor} opacity="0.9" 
          style={{ originX: "160px", originY: "210px" }}
          animate={{ rotate: [0, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.path 
          d="M 180 205 Q 210 240 180 250 Q 170 230 180 205 Z" fill={tailColor} opacity="0.7" 
          style={{ originX: "180px", originY: "205px" }}
          animate={{ rotate: [0, -10, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
        />
        
        {/* 뒤쪽 등 지느러미 */}
        <motion.g 
          style={{ originX: "180px", originY: "110px" }}
          animate={{ rotate: [0, 8, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <path d="M 180 110 Q 220 30 270 50 Q 240 110 200 125 Z" fill={tailColor} opacity="0.9" />
          <path d="M 190 110 Q 230 50 250 60" stroke={patternColor} strokeWidth="2.5" fill="none" opacity="0.3" />
        </motion.g>

        {/* 거대한 꼬리 (핵심 포인트) */}
        <motion.g
          style={{ originX: "240px", originY: "170px" }}
          animate={{ 
            scaleX: [1, 0.9, 1, 0.9, 1],
            rotate: [0, -5, 0, 5, 0]
          }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        >
          <path 
            d="M 240 170 C 280 0, 460 20, 410 170 C 460 320, 280 340, 240 170 Z" 
            fill={`url(#tailGrad-${idPrefix})`} 
          />
          {/* 꼬리 무늬 (원형 패턴들) */}
          <g fill={patternColor} opacity="0.85" clipPath={`url(#tailClip-${idPrefix})`}>
            <circle cx="310" cy="80" r="18" />
            <circle cx="360" cy="90" r="24" />
            <circle cx="400" cy="130" r="14" />
            <circle cx="280" cy="135" r="20" />
            <circle cx="340" cy="150" r="28" />
            <circle cx="390" cy="180" r="20" />
            <circle cx="310" cy="200" r="22" />
            <circle cx="360" cy="230" r="26" />
            <circle cx="280" cy="240" r="16" />
            <circle cx="320" cy="280" r="18" />
          </g>
          {/* 꼬리 결(주름) */}
          <g stroke={patternColor} strokeWidth="3" fill="none" opacity="0.15" strokeLinecap="round" clipPath={`url(#tailClip-${idPrefix})`}>
            <path d="M 250 170 Q 320 100 380 80" />
            <path d="M 250 170 Q 340 170 400 170" />
            <path d="M 250 170 Q 320 240 380 260" />
          </g>
        </motion.g>

        {/* 오동통한 몸통 */}
        <path 
          d="M 260 170 C 260 100, 170 80, 110 95 C 40 110, 30 190, 80 220 C 140 250, 260 220, 260 170 Z" 
          fill={`url(#bodyGrad-${idPrefix})`} 
        />
        
        {/* 몸통 비늘 텍스처 (은은하게) */}
        <g stroke={patternColor} strokeWidth="2.5" fill="none" opacity="0.15" strokeLinecap="round">
          <path d="M 190 120 Q 210 135 190 150" />
          <path d="M 210 130 Q 230 145 210 160" />
          <path d="M 195 155 Q 215 170 195 185" />
          <path d="M 220 165 Q 240 180 220 195" />
        </g>

        {/* 앞쪽 가슴 지느러미 */}
        <motion.g
          style={{ originX: "170px", originY: "180px" }}
          animate={{ rotate: [0, -15, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <path d="M 170 180 C 190 160, 240 200, 210 220 C 180 220, 160 200, 170 180 Z" fill={tailColor} />
          <path d="M 180 185 Q 200 195 210 210" stroke={patternColor} strokeWidth="2" fill="none" opacity="0.4" strokeLinecap="round" />
        </motion.g>

        {/* 얼굴 / 눈동자 그룹 */}
        <g transform="translate(110, 145)">
          {/* 눈 흰자 (엄청 큼) */}
          <ellipse cx="0" cy="0" rx="34" ry="42" fill="#ffffff" />
          
          {/* 감정별 눈 표현 */}
          {expression === '슬픔' ? (
            <path d="M -28 -10 Q 0 -40 28 -10" stroke="#0f172a" strokeWidth="6" strokeLinecap="round" fill="none" />
          ) : expression === '잠' ? (
            <path d="M -28 5 Q 0 30 28 5" stroke="#0f172a" strokeWidth="6" strokeLinecap="round" fill="none" />
          ) : expression === '크게 웃음' ? (
            <path d="M -28 5 Q 0 -25 28 5" stroke="#0f172a" strokeWidth="6" strokeLinecap="round" fill="none" />
          ) : expression === '신남' ? (
            // 별모양 눈
            <path d="M 0 15 L 12 -5 L 30 -5 L 15 -18 L 22 -35 L 0 -22 L -22 -35 L -15 -18 L -30 -5 L -12 -5 Z" fill="#facc15" />
          ) : expression === '반짝' ? (
            // 하트 눈
            <path d="M 0 15 A 14 14 0 0 0 28 -10 A 14 14 0 0 0 0 -28 A 14 14 0 0 0 -28 -10 A 14 14 0 0 0 0 15 Z" fill="#ef4444" />
          ) : (
            <motion.g
               animate={expression !== '놀람' && expression !== '정면' ? { x: [0, -8, 0] } : {}}
               transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
              {/* 검은 동공 */}
              <ellipse 
                cx={expression === '놀람' ? "0" : expression === '정면' ? "0" : "4"} 
                cy={expression === '놀람' ? "0" : expression === '정면' ? "0" : "0"} 
                rx={expression === '놀람' ? "18" : "26"} 
                ry={expression === '놀람' ? "18" : "34"} 
                fill={`url(#eyeBase-${idPrefix})`} 
              />
              {/* 반짝이는 홍채 */}
              {expression !== '놀람' && (
                <ellipse cx={expression === '정면' ? "0" : "8"} cy={expression === '정면' ? "0" : "10"} rx="16" ry="20" fill={`url(#eyeIris-${idPrefix})`} opacity="0.4" />
              )}
              {/* 하이라이트 (초롱초롱) */}
              {expression !== '놀람' && (
                <>
                  <circle cx={expression === '정면' ? "-8" : "-4"} cy="-14" r="10" fill="#ffffff" />
                  <circle cx={expression === '정면' ? "8" : "12"} cy="14" r="5" fill="#ffffff" />
                  <circle cx={expression === '정면' ? "12" : "16"} cy="0" r="2.5" fill="#ffffff" />
                </>
              )}
            </motion.g>
          )}

          {/* 슬플때 눈썹 */}
          {expression === '슬픔' && (
            <path d="M -25 -35 L 12 -28" stroke="#0f172a" strokeWidth="5" strokeLinecap="round" />
          )}
        </g>

        {/* 입 */}
        <g transform="translate(50, 180)">
          {expression === '놀람' ? (
            <ellipse cx="0" cy="0" rx="6" ry="10" fill="#0f172a" />
          ) : expression === '슬픔' ? (
            <path d="M -12 5 Q 0 -5 12 5" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" fill="none" />
          ) : expression === '잠' || expression === '정면' ? (
            <circle cx="0" cy="-2" r="4" fill="#0f172a" />
          ) : expression === '웃음' || expression === '신남' || expression === '크게 웃음' || expression === '반짝' ? (
            // 해맑게 벌린 입 (이미지 참고)
            <path d="M -10 0 Q 0 18 12 -3 Z" fill="#ef4444" stroke="#0f172a" strokeWidth="2.5" strokeLinejoin="round" />
          ) : (
            <path d="M -12 -2 Q 0 8 12 -2" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" fill="none" />
          )}
        </g>
        
        {/* 볼터치 (홍조) */}
        {(expression === '웃음' || expression === '신남' || expression === '크게 웃음' || expression === '반짝') && (
           <ellipse cx="140" cy="190" rx="16" ry="9" fill="#fca5a5" opacity="0.75" />
        )}

        {/* 감정 표현 장식 효과 */}
        {expression === '신남' && (
          <path d="M 160 100 Q 175 125 160 135 Q 145 125 160 100 Z" fill="#38bdf8" opacity="0.9" />
        )}
        
        {expression === '잠' && (
          <circle cx="60" cy="130" r="12" fill="#a5f3fc" opacity="0.6" stroke="#06b6d4" strokeWidth="2.5" />
        )}

      </motion.svg>
      
      {/* 둥둥 떠다니는 이모지 */}
      <AnimatePresence>
        {!hideFloaters && expression && (
          <motion.div
            key={expression}
            initial={{ opacity: 0, y: 10, x: 20, scale: 0.5 }}
            animate={{ opacity: 1, y: -20, x: -10, scale: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
            className="absolute top-[25%] -left-8 md:-left-12 text-5xl md:text-6xl z-10 drop-shadow-xl"
          >
            {expression === '신남' && '🎵'}
            {expression === '잠' && '💤'}
            {expression === '반짝' && '✨'}
            {expression === '놀람' && '❗'}
            {expression === '슬픔' && '🌧️'}
            {expression === '크게 웃음' && '😆'}
            {expression === '웃음' && '😊'}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
