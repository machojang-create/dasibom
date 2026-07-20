import React, { useEffect, useState, useRef } from 'react';
import { animate } from 'motion/react';

interface Props {
  value: number;
  className?: string;
  decimals?: number;
}

export default function AnimatedNumber({ value, className = "", decimals = 0 }: Props) {
  const [displayValue, setDisplayValue] = useState(() => value.toFixed(decimals));
  const prevValueRef = useRef(value);
  
  useEffect(() => {
    const controls = animate(prevValueRef.current, value, {
      type: "spring",
      damping: 30,
      stiffness: 150,
      onUpdate(latest) {
        setDisplayValue(latest.toFixed(decimals));
      }
    });
    
    prevValueRef.current = value;
    
    return () => controls.stop();
  }, [value, decimals]);

  return <span className={className}>{displayValue}</span>;
}
