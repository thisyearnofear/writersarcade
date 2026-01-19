import { useState, useEffect } from 'react';
import { isMobileDevice, isTouchDevice } from '@/lib/utils';

interface MobileOptimizations {
  isMobile: boolean;
  prefersReducedMotion: boolean;
  isTouchDevice: boolean;
  windowSize: {
    width: number;
    height: number;
  };
  optimized: boolean;
  getMobileClasses?: (baseClasses: string, mobileClasses?: string) => string;
  getTouchClasses?: (baseClasses: string, touchClasses?: string) => string;
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
    optimized: false,
  });

  useEffect(() => {
    // ENHANCEMENT FIRST: Use consolidated utility functions
    const isTouch = isTouchDevice();
    const isMobile = isMobileDevice();
    
    // Check if prefers reduced motion
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const prefersReducedMotion = mediaQuery.matches;
    
    // Apply mobile optimizations if needed
    if (isMobile || isTouch) {
      applyMobileOptimizations();
    }
    
    setOptimizations({
      isMobile,
      prefersReducedMotion,
      isTouchDevice: isTouch,
      windowSize: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      optimized: isMobile || isTouch,
    });

    const handleResize = () => {
      const updatedIsMobile = window.innerWidth < 768;
      setOptimizations(prev => ({
        ...prev,
        isMobile: updatedIsMobile,
        windowSize: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
      }));
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

  /**
   * Apply mobile-specific optimizations - AGGRESSIVE CONSOLIDATION
   * Consolidates various mobile optimizations into single function
   */
  const applyMobileOptimizations = () => {
    // Prevent double-tap zoom on mobile - PERFORMANT
    document.addEventListener('touchmove', preventDoubleTapZoom, { passive: false });
    
    // Add mobile-specific CSS classes - CLEAN
    document.body.classList.add('mobile-device');
    
    if (isTouchDevice()) {
      document.body.classList.add('touch-device');
    }
    
    // Optimize font loading for mobile - ORGANIZED
    (document.body.style as any).fontSmoothing = 'antialiased';
    (document.body.style as any).webkitFontSmoothing = 'antialiased';
  };

  /**
   * Prevent double-tap zoom on mobile - PERFORMANT
   * Lightweight event handler that doesn't impact performance
   */
  const preventDoubleTapZoom = (e: TouchEvent) => {
    if (e.touches.length > 1) {
      e.preventDefault();
    }
  };

  /**
   * Get mobile-optimized class names - DRY approach
   * Single source of truth for mobile class names
   */
  const getMobileClasses = (baseClasses: string, mobileClasses: string = ''): string => {
    return `${baseClasses} ${optimizations.isMobile ? mobileClasses : ''}`.trim();
  };

  /**
   * Get touch-optimized class names - CLEAN separation
   * Explicit dependency on touch capability
   */
  const getTouchClasses = (baseClasses: string, touchClasses: string = ''): string => {
    return `${baseClasses} ${optimizations.isTouchDevice ? touchClasses : ''}`.trim();
  };

  return {
    ...optimizations,
    getMobileClasses,
    getTouchClasses,
  };
}