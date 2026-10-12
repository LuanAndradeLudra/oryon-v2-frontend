import { useEffect, type RefObject } from 'react'

const RETRY_INTERVAL_MS = 80
const RETRY_WINDOW_MS = 5_000

function currentHashId() {
  const rawHash = window.location.hash.slice(1)
  if (!rawHash) return ''

  try {
    return decodeURIComponent(rawHash)
  } catch {
    return rawHash
  }
}

function withInstantScroll(root: HTMLElement, scroll: () => void) {
  const previousBehavior = root.style.scrollBehavior
  root.style.scrollBehavior = 'auto'
  scroll()
  root.style.scrollBehavior = previousBehavior
}

/**
 * Keeps hash links reliable when their targets live inside a lazy/Suspense
 * subtree and the page scrolls in its own overflow container.
 *
 * The browser tries to resolve the initial hash before those targets exist.
 * We observe the landing root and retry for a bounded period, then align the
 * target on the first animation frame after it mounts. Navigation performed
 * while the page is open remains smooth; the initial deep link is immediate.
 */
export function useHashAnchorScroll(rootRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    let generation = 0
    let retryTimer: number | undefined
    let attemptFrame: number | undefined
    let navigationFrame: number | undefined
    let observer: MutationObserver | undefined

    const clearAttempt = () => {
      if (retryTimer !== undefined) window.clearTimeout(retryTimer)
      if (attemptFrame !== undefined) window.cancelAnimationFrame(attemptFrame)
      retryTimer = undefined
      attemptFrame = undefined
      observer?.disconnect()
      observer = undefined
    }

    const scrollRootToTop = (root: HTMLElement, smooth: boolean) => {
      if (typeof root.scrollTo !== 'function') return
      const scroll = () => root.scrollTo({ top: 0, behavior: smooth ? 'smooth' : 'auto' })
      if (smooth) scroll()
      else withInstantScroll(root, scroll)
    }

    const scrollTarget = (root: HTMLElement, target: HTMLElement, smooth: boolean) => {
      if (typeof target.scrollIntoView !== 'function') return
      const scroll = () => target.scrollIntoView({ block: 'start', behavior: smooth ? 'smooth' : 'auto' })
      if (smooth) scroll()
      else withInstantScroll(root, scroll)
    }

    const navigateToHash = (smooth: boolean) => {
      generation += 1
      const thisGeneration = generation
      clearAttempt()

      const root = rootRef.current
      const hashId = currentHashId()

      if (!hashId) {
        if (root) scrollRootToTop(root, smooth)
        return
      }

      const deadline = performance.now() + RETRY_WINDOW_MS

      const attempt = () => {
        if (thisGeneration !== generation || currentHashId() !== hashId) return

        const currentRoot = rootRef.current
        const target = document.getElementById(hashId)

        if (currentRoot && target && currentRoot.contains(target)) {
          clearAttempt()
          // A mutation callback can run before the browser has committed the
          // new geometry. One frame is enough to read the final lazy layout.
          attemptFrame = window.requestAnimationFrame(() => {
            attemptFrame = undefined
            if (
              thisGeneration === generation
              && currentHashId() === hashId
              && currentRoot.contains(target)
            ) {
              scrollTarget(currentRoot, target, smooth)
            }
          })
          return
        }

        if (performance.now() >= deadline) {
          clearAttempt()
          return
        }

        retryTimer = window.setTimeout(attempt, RETRY_INTERVAL_MS)
      }

      if (root) {
        observer = new MutationObserver(attempt)
        observer.observe(root, { childList: true, subtree: true })
      }
      attempt()
    }

    // First load/refresh: avoid animating through the whole document while a
    // deep-linked section appears after Suspense resolves.
    navigateToHash(false)

    // A same-document history navigation can emit both popstate and
    // hashchange. Coalesce them into one smooth alignment on the next frame.
    const scheduleInteractiveNavigation = () => {
      if (navigationFrame !== undefined) window.cancelAnimationFrame(navigationFrame)
      navigationFrame = window.requestAnimationFrame(() => {
        navigationFrame = undefined
        navigateToHash(true)
      })
    }

    window.addEventListener('hashchange', scheduleInteractiveNavigation)
    window.addEventListener('popstate', scheduleInteractiveNavigation)

    return () => {
      generation += 1
      clearAttempt()
      if (navigationFrame !== undefined) window.cancelAnimationFrame(navigationFrame)
      window.removeEventListener('hashchange', scheduleInteractiveNavigation)
      window.removeEventListener('popstate', scheduleInteractiveNavigation)
    }
  }, [rootRef])
}
