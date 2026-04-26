import { lazy, type ComponentType, type LazyExoticComponent } from 'react'

/** Detect stale Vite chunk after deploy (CDN no longer has that hashed file). */
const CHUNK_LOAD_ERR =
  /Failed to fetch dynamically imported module|Loading chunk \d+ failed|Importing a module script failed|error loading dynamically imported module/i

const RELOAD_KEY = 'oryon_chunk_reload_pending'

/**
 * Same as `React.lazy`, but after a new deploy if the browser still has an old
 * shell that points at removed `/assets/*.js`, we reload once to fetch fresh HTML.
 */
export function lazyRoute<T extends ComponentType<Record<string, unknown>>>(
  factory: () => Promise<{ default: T }>,
): LazyExoticComponent<T> {
  return lazy(async () => {
    try {
      return await factory()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      if (CHUNK_LOAD_ERR.test(msg) && !sessionStorage.getItem(RELOAD_KEY)) {
        sessionStorage.setItem(RELOAD_KEY, '1')
        return new Promise(() => {
          window.location.reload()
        }) as Promise<{ default: T }>
      }
      throw e
    }
  })
}

/** Call once on app mount so a later deploy can trigger another auto-reload if needed. */
export function clearChunkReloadFlag(): void {
  sessionStorage.removeItem(RELOAD_KEY)
}
