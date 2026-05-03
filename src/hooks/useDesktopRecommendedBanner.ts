import { useCallback, useEffect, useState } from 'react'
import { useIsMobile } from './useIsMobile'

interface DesktopRecommendedBannerState {
  visible: boolean
  dismiss: () => void
}

const STORAGE_PREFIX = 'oryon:desktop-banner:dismissed:'

export function useDesktopRecommendedBanner(routeKey: string): DesktopRecommendedBannerState {
  const isMobile = useIsMobile()
  const [dismissed, setDismissed] = useState<boolean>(() => {
    if (typeof sessionStorage === 'undefined') return false
    return sessionStorage.getItem(STORAGE_PREFIX + routeKey) === '1'
  })

  useEffect(() => {
    setDismissed(sessionStorage.getItem(STORAGE_PREFIX + routeKey) === '1')
  }, [routeKey])

  const dismiss = useCallback(() => {
    sessionStorage.setItem(STORAGE_PREFIX + routeKey, '1')
    setDismissed(true)
  }, [routeKey])

  return {
    visible: isMobile && !dismissed,
    dismiss,
  }
}
