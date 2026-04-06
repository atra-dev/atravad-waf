'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useInView, useMotionValue, useSpring } from 'motion/react';
import { cn } from '@/lib/utils';

export function AnimatedCounter({
  value,
  prefix = '',
  suffix = '',
  duration = 1.8,
  className,
}) {
  const [displayValue, setDisplayValue] = useState(0);
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, {
    damping: 24,
    stiffness: 90,
    mass: 0.8,
  });
  const ref = useRef(null);
  const isInView = useInView(ref, { once: false, amount: 0.6 });

  useEffect(() => {
    if (isInView) {
      motionValue.set(0);
      springValue.jump(0);
      setDisplayValue(0);
      motionValue.set(value);
      return;
    }

    motionValue.set(0);
    springValue.jump(0);
    setDisplayValue(0);
  }, [isInView, motionValue, springValue, value]);

  useEffect(() => {
    const unsubscribe = springValue.on('change', (latest) => {
      setDisplayValue(Math.round(latest));
    });

    return () => unsubscribe();
  }, [springValue]);

  return (
    <motion.span
      ref={ref}
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: false, amount: 0.6 }}
      transition={{ duration }}
      className={cn(className)}
    >
      {prefix}
      {displayValue.toLocaleString()}
      {suffix}
    </motion.span>
  );
}
