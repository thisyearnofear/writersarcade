import { useState, useEffect } from 'react'

const ONBOARDING_DISMISSED_KEY = 'writarcade_onboarding_dismissed'

export function useOnboarding() {
  const [showOnboarding, setShowOnboarding] = useState(false)

  useEffect(() => {
    // Check if user has already seen onboarding
    const isDismissed = localStorage.getItem(ONBOARDING_DISMISSED_KEY)
    
    // Show onboarding only on first visit
    if (!isDismissed) {
      setShowOnboarding(true)
    }
  }, [])

  const dismissOnboarding = () => {
    localStorage.setItem(ONBOARDING_DISMISSED_KEY, 'true')
    setShowOnboarding(false)
  }

  const resetOnboarding = () => {
    localStorage.removeItem(ONBOARDING_DISMISSED_KEY)
    setShowOnboarding(true)
  }

  return {
    showOnboarding,
    dismissOnboarding,
    resetOnboarding,
  }
}
