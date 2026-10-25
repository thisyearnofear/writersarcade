'use client';

import { usePathname } from 'next/navigation';

import { Suspense, useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

function PageTransitionContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const prefersReducedMotion = useReducedMotion();
  // Never run the entrance fade on the first (SSR) render — an initial
  // opacity:0 ships invisible markup and defeats server rendering.
  const isFirstRender = useRef(true);
  useEffect(() => {
    isFirstRender.current = false;
  }, []);

  // Keyed opacity-only fade-in: no exit animation, no transform (a transform
  // makes the wrapper a containing block for position:fixed modals).
  if (prefersReducedMotion) return <>{children}</>;
  return (
    <motion.div
      key={pathname}
      // eslint-disable-next-line react-hooks/refs -- intentional first-render gate
      initial={isFirstRender.current ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}

export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<>{children}</>}>
      <PageTransitionContent>{children}</PageTransitionContent>
    </Suspense>
  );
}
