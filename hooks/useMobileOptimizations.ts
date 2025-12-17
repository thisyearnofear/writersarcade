import { useState, useEffect } from 'react';

interface MobileOptimizations {
  isMobile: boolean;
  prefersReducedMotion: boolean;
  isTouchDevice: boolean;
  windowSize: {
    width: number;
    height: number;
  };
}

export function useMobileOptimizations(): MobileOptimizations {
  const [optimizations, setOptimizations] = useState<MobileOptimizations>({
    isMobile: false,
    prefersReducedMotion: false,
    isTouchDevice: false,
    windowSize: {
      width: typeof window !== 'undefined' ? window.innerWidth : 0,
      height: typeof window !== 'undefined' ? window.innerHeight : 0,
    },
  });

  useEffect(() => {
    // Check if touch device
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    // Check if prefers reduced motion
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const prefersReducedMotion = mediaQuery.matches;
    
    // Check if mobile based on width
    const isMobile = window.innerWidth < 768;
    
    setOptimizations({
      isMobile,
      prefersReducedMotion,
      isTouchDevice,
      windowSize: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
    });

    const handleResize = () => {
      setOptimizations({
        isMobile: window.innerWidth < 768,
        prefersReducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        isTouchDevice: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
        windowSize: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
      });
    };

    window.addEventListener('resize', handleResize);
    
    // Also listen for changes to reduced motion preference
    const motionMediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleMotionChange = (e: MediaQueryListEvent) => {
      setOptimizations(prev => ({
        ...prev,
        prefersReducedMotion: e.matches,
      }));
    };
    
    motionMediaQuery.addEventListener('change', handleMotionChange);

    return () => {
      window.removeEventListener('resize', handleResize);
      motionMediaQuery.removeEventListener('change', handleMotionChange);
    };
  }, []);

  return optimizations;
}