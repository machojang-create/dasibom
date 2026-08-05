import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TailType } from '../types';

interface GuppySVGProps {
  bodyColor: string;
  tailColor: string;
  patternColor: string;
  expression: string | null;
  pose?: 'main' | 'side' | 'top' | 'swim1' | 'swim2';
  hideFloaters?: boolean;
  tailType?: TailType;   // 품종 실루엣(2026-08-05) — 없으면 mosaic
}

/* ── 품종별 실루엣 (2026-08-05 Macho: "패턴만 다를 뿐 크기나 모양 차이가 없잖아") ──
   몸통·꼬리·등지느러미가 품종마다 다르다. 좌표는 scratchpad/guppy_impl.html에서 시각 확정.
   색은 기존 3색(body/tail/pattern)을 그대로 받아 개체마다 다르게 입혀진다. */
/* 2차 수정(2026-08-05 Macho): 몸통 변형이 벌레 느낌의 원인 — 전부 표준 몸으로.
   품종 차이는 꼬리 모양으로만. 코브라는 제외(벌레 꼬리), 턱시도는 배지느러미 얇고 길게. */
const BODY_PATH = "M 260 170 C 260 100, 170 80, 110 95 C 40 110, 30 190, 80 220 C 140 250, 260 220, 260 170 Z";
const DORSAL_PATH = "M 180 110 Q 220 30 270 50 Q 240 110 200 125 Z";
// 꼬리 외곽(클립 겸용)
const TAIL_CLIPS: Record<string, string> = {
  mosaic: "M 250 152 C 292 134, 332 104, 376 82 C 402 70, 420 80, 423 106 C 429 150, 429 190, 423 234 C 420 260, 402 270, 376 258 C 332 236, 292 206, 250 188 Z",
  ribbon: "M 250 152 C 296 122, 344 100, 388 98 C 414 96, 426 116, 424 142 C 422 164, 422 180, 424 202 C 426 228, 414 248, 388 246 C 344 244, 296 222, 250 190 Z",
  grass:  "M 248 166 C 248 102, 292 56, 358 54 C 416 53, 452 104, 456 168 C 452 232, 416 283, 358 282 C 292 280, 248 234, 248 174 Z",
  tuxedo: "M 256 144 C 300 90, 358 62, 408 64 C 432 66, 442 84, 440 106 C 435 152, 435 190, 440 236 C 442 258, 432 276, 408 278 C 358 280, 300 252, 256 198 Z",
};

export const GuppySVG = React.memo(function GuppySVG({
  bodyColor,
  tailColor,
  patternColor,
  expression,
  pose = 'main',
  hideFloaters = false,
  tailType = 'mosaic'
}: GuppySVGProps) {
  // 고유 ID 생성 (여러 구피가 동시에 렌더링될 때 ID 충돌 방지)
  const idPrefix = React.useId().replace(/:/g, '');

  // 뷰박스 크기 설정 (그래스 부채꼴이 x=456까지 가서 470으로 넓힘)
  const vbWidth = 470;
  const vbHeight = 340;
  // 폐기 품종(cobra 등) 저장분은 기본 모자이크로 그린다
  const tt = TAIL_CLIPS[tailType] ? tailType : 'mosaic';
  const bodyPath = BODY_PATH;
  const dorsalPath = DORSAL_PATH;
  const tailClip = TAIL_CLIPS[tt];

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
          {tailClip && (
            <clipPath id={`tailClip-${idPrefix}`}>
              <path d={tailClip} />
            </clipPath>
          )}
          <clipPath id={`bodyClip-${idPrefix}`}>
            <path d={bodyPath} />
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

        {/* 뒤쪽 배 지느러미 — 턱시도는 얇고 길게 뻗는다(2026-08-05 Macho) */}
        <motion.path
          d={tt === 'tuxedo'
            ? "M 162 212 C 168 254, 158 292, 146 300 C 148 264, 152 236, 156 212 Z"
            : "M 160 210 Q 180 260 140 270 Q 130 230 150 210 Z"}
          fill={tailColor} opacity="0.9"
          style={{ originX: "160px", originY: "210px" }}
          animate={{ rotate: [0, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.path
          d={tt === 'tuxedo'
            ? "M 192 214 C 200 250, 194 282, 184 290 C 184 258, 186 234, 186 214 Z"
            : "M 180 205 Q 210 240 180 250 Q 170 230 180 205 Z"}
          fill={tailColor} opacity="0.7"
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
          <path d={dorsalPath} fill={tailColor} opacity="0.9" />
          {(tt === 'mosaic' || tt === 'ribbon') && (
            <path d="M 190 110 Q 230 50 250 60" stroke={patternColor} strokeWidth="2.5" fill="none" opacity="0.3" />
          )}
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
          {tt === 'mosaic' && (<>
            <path d={tailClip} fill={`url(#tailGrad-${idPrefix})`} />
            <g fill={patternColor} opacity="0.5" clipPath={`url(#tailClip-${idPrefix})`}>
              <ellipse cx="300" cy="146" rx="13" ry="9" transform="rotate(-28 300 146)" /><ellipse cx="330" cy="126" rx="10" ry="7" />
              <ellipse cx="360" cy="106" rx="14" ry="8" /><ellipse cx="318" cy="168" rx="15" ry="10" />
              <ellipse cx="352" cy="154" rx="11" ry="8" /><ellipse cx="386" cy="138" rx="13" ry="8" />
              <ellipse cx="338" cy="192" rx="12" ry="8" /><ellipse cx="372" cy="184" rx="14" ry="9" />
              <ellipse cx="348" cy="218" rx="13" ry="8" /><ellipse cx="384" cy="214" rx="10" ry="8" />
              <ellipse cx="398" cy="244" rx="9" ry="7" /><ellipse cx="404" cy="176" rx="9" ry="11" />
            </g>
          </>)}
          {tt === 'ribbon' && (<>
            <path d={tailClip} fill={`url(#tailGrad-${idPrefix})`} />
            {/* 커튼처럼 흐르는 세로 물결 결 */}
            <g stroke={patternColor} fill="none" opacity="0.4" strokeLinecap="round" clipPath={`url(#tailClip-${idPrefix})`}>
              <path d="M 286 138 Q 292 172 286 208" strokeWidth="5" />
              <path d="M 314 124 Q 322 172 314 222" strokeWidth="6" />
              <path d="M 344 112 Q 353 172 344 234" strokeWidth="6" />
              <path d="M 376 106 Q 385 172 376 240" strokeWidth="7" />
              <path d="M 406 110 Q 414 172 406 236" strokeWidth="6" />
            </g>
            <g fill={patternColor} opacity="0.45" clipPath={`url(#tailClip-${idPrefix})`}>
              <ellipse cx="300" cy="152" rx="6" ry="4" /><ellipse cx="332" cy="136" rx="5" ry="4" />
              <ellipse cx="366" cy="148" rx="6" ry="4" /><ellipse cx="398" cy="136" rx="5" ry="4" />
              <ellipse cx="316" cy="196" rx="6" ry="4" /><ellipse cx="352" cy="206" rx="6" ry="4" />
              <ellipse cx="390" cy="200" rx="5" ry="4" /><ellipse cx="410" cy="176" rx="5" ry="4" />
            </g>
          </>)}
          {tt === 'grass' && (<>
            <path d={tailClip} fill={`url(#tailGrad-${idPrefix})`} />
            <g fill={patternColor} opacity="0.55" clipPath={`url(#tailClip-${idPrefix})`}>
              <ellipse cx="296" cy="116" rx="4" ry="2.6" /><ellipse cx="330" cy="94" rx="3.6" ry="2.4" /><ellipse cx="368" cy="82" rx="4" ry="2.6" />
              <ellipse cx="406" cy="90" rx="3.6" ry="2.4" /><ellipse cx="432" cy="112" rx="4" ry="2.6" /><ellipse cx="306" cy="150" rx="4.2" ry="2.8" />
              <ellipse cx="342" cy="132" rx="3.8" ry="2.4" /><ellipse cx="378" cy="122" rx="4.2" ry="2.6" /><ellipse cx="412" cy="134" rx="3.8" ry="2.4" />
              <ellipse cx="438" cy="152" rx="4" ry="2.6" /><ellipse cx="300" cy="186" rx="4" ry="2.6" /><ellipse cx="336" cy="172" rx="4.4" ry="2.8" />
              <ellipse cx="372" cy="166" rx="3.8" ry="2.4" /><ellipse cx="408" cy="174" rx="4.2" ry="2.6" /><ellipse cx="440" cy="190" rx="3.6" ry="2.4" />
              <ellipse cx="310" cy="222" rx="4.2" ry="2.8" /><ellipse cx="346" cy="212" rx="3.8" ry="2.4" /><ellipse cx="382" cy="216" rx="4.2" ry="2.6" />
              <ellipse cx="414" cy="228" rx="3.8" ry="2.4" /><ellipse cx="324" cy="254" rx="4" ry="2.6" /><ellipse cx="360" cy="250" rx="4.2" ry="2.8" />
            </g>
            <g stroke={patternColor} strokeWidth="1.6" fill="none" opacity="0.22" strokeLinecap="round" clipPath={`url(#tailClip-${idPrefix})`}>
              <path d="M 252 162 Q 344 90 434 74" /><path d="M 252 168 Q 354 132 448 122" /><path d="M 252 172 Q 356 172 454 170" />
              <path d="M 252 176 Q 354 212 448 218" /><path d="M 252 182 Q 344 250 434 266" />
            </g>
          </>)}
          {tt === 'tuxedo' && (<>
            <path d={tailClip} fill={`url(#tailGrad-${idPrefix})`} />
            <g fill={patternColor} opacity="0.45" clipPath={`url(#tailClip-${idPrefix})`}>
              <ellipse cx="330" cy="116" rx="6" ry="4" /><ellipse cx="374" cy="96" rx="5" ry="3.6" /><ellipse cx="408" cy="118" rx="6" ry="4" />
              <ellipse cx="348" cy="158" rx="6" ry="4" /><ellipse cx="392" cy="150" rx="5" ry="4" /><ellipse cx="422" cy="170" rx="5" ry="4" />
              <ellipse cx="336" cy="200" rx="6" ry="4" /><ellipse cx="378" cy="214" rx="5" ry="4" /><ellipse cx="412" cy="228" rx="5" ry="3.6" />
            </g>
          </>)}
        </motion.g>

        {/* 몸통 — 품종별 체형 */}
        <path d={bodyPath} fill={`url(#bodyGrad-${idPrefix})`} />
        {/* 턱시도: 몸 뒤가 정장처럼 검정 (몸 곡선을 따라 클립) */}
        {tt === 'tuxedo' && (
          <rect x="172" y="40" width="110" height="260" fill="#0f172a" opacity="0.82" clipPath={`url(#bodyClip-${idPrefix})`} />
        )}
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
