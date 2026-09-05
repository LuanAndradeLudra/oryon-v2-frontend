export interface FallbackResult<T> {
  data: T
  available: boolean
}

/**
 * Runs `call`; when it fails with 404 or 501 (endpoint not deployed yet, or
 * feature flagged off in this tenant), returns `fallback` with
 * `available: false` instead of throwing. Every other status — 401, 403,
 * 500, network errors — propagates as-is. Callers must not treat "backend is
 * broken" the same as "backend doesn't have this feature yet".
 */
export async function withFallback<T>(call: () => Promise<T>, fallback: T): Promise<FallbackResult<T>> {
  try {
    const data = await call()
    return { data, available: true }
  } catch (err) {
    const status = httpStatusOf(err)
    if (status === 404 || status === 501) {
      return { data: fallback, available: false }
    }
    throw err
  }
}

/** Duck-types both axios errors (`err.response.status`, used by services/api.ts
 *  calls) and the agent-server fetch wrapper's errors (`err.status`) without
 *  importing axios into this file. */
function httpStatusOf(err: unknown): number | undefined {
  if (typeof err !== 'object' || err === null) return undefined
  const e = err as { status?: unknown; response?: { status?: unknown } }
  if (typeof e.status === 'number') return e.status
  if (typeof e.response?.status === 'number') return e.response.status
  return undefined
}
