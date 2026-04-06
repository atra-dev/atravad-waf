'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '@/lib/utils';

export function FlipWords({
  words = [],
  interval = 2200,
  className,
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!Array.isArray(words) || words.length <= 1) return undefined;

    const timer = setInterval(() => {
      setIndex((current) => (current + 1) % words.length);
    }, interval);

    return () => clearInterval(timer);
  }, [interval, words]);

  if (!words.length) return null;

  return (
    <span className={cn('relative inline-flex min-w-[9ch] items-center', className)}>
      <AnimatePresence mode="wait">
        <motion.span
          key={words[index]}
          initial={{ opacity: 0, y: 18, rotateX: -60, filter: 'blur(6px)' }}
          animate={{ opacity: 1, y: 0, rotateX: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: -18, rotateX: 60, filter: 'blur(6px)' }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="inline-block origin-center"
        >
          {words[index]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
