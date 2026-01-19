import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import slugify from "slugify"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function createSlug(text: string): string {
  return slugify(text, {
    lower: true,
    strict: true,
    remove: /[*+~.()'"!:@]/g
  })
}

export function isValidUrl(string: string): boolean {
  try {
    new URL(string)
    return string.startsWith('http://') || string.startsWith('https://')
  } catch {
    return false
  }
}

/**
 * Mobile detection utility - ENHANCEMENT FIRST approach
 * Detects if current device is mobile based on user agent and screen size
 */
export function isMobileDevice(): boolean {
  // Check user agent for mobile devices
  if (typeof navigator !== 'undefined') {
    const userAgent = navigator.userAgent.toLowerCase()
    const mobileKeywords = ['android', 'webos', 'iphone', 'ipad', 'ipod', 'blackberry', 'windows phone']
    
    if (mobileKeywords.some(keyword => userAgent.includes(keyword))) {
      return true
    }
  }
  
  // Fallback to screen size check
  if (typeof window !== 'undefined') {
    return window.innerWidth <= 768
  }
  
  return false
}

/**
 * Touch device detection - AGGRESSIVE CONSOLIDATION
 * Consolidates various touch detection methods into single utility
 */
export function isTouchDevice(): boolean {
  if (typeof window !== 'undefined') {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0
  }
  return false
}