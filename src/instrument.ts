// ─── Sentry Instrumentation (Phase D.1, frontend) ────────────────────────────
//
// Imported as the FIRST line of main.tsx so the SDK installs before React
// mounts. No-op when VITE_SENTRY_DSN is unset, so dev / staging without
// Sentry pay zero cost.
//
// Defaults:
//   * tracesSampleRate: 0.1 — keeps free-tier 5k-event/month budget under
//     control. Override via VITE_SENTRY_TRACES_SAMPLE_RATE.
//   * replaysOnErrorSampleRate: 0.1 — capture session replay only when an
//     error is reported. Override via VITE_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE.
//   * replaysSessionSampleRate: 0 — don't ship full sessions by default
//     (PII risk + bandwidth). Operators can flip via env when needed.
//   * beforeSend mask: strips obvious PII fields from request bodies and
//     fetch breadcrumbs before the event leaves the browser.

import * as Sentry from '@sentry/react'

const SENSITIVE_KEYS = new Set([
  'password',
  'currentpassword',
  'newpassword',
  'confirmpassword',
  'token',
  'access_token',
  'accesstoken',
  'refresh_token',
  'refreshtoken',
  'authorization',
  'cookie',
  'apikey',
  'api_key',
  'secret',
  'creditcard',
  'cvv',
  'sessiontoken',
])

const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined

if (dsn) {
  const release = (import.meta.env.VITE_SENTRY_RELEASE as string | undefined) || undefined
  const tracesSampleRate = parseFloat(
    (import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE as string | undefined) ?? '0.1',
  )
  const replaysSessionSampleRate = parseFloat(
    (import.meta.env.VITE_SENTRY_REPLAYS_SESSION_SAMPLE_RATE as string | undefined) ?? '0',
  )
  const replaysOnErrorSampleRate = parseFloat(
    (import.meta.env.VITE_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE as string | undefined) ?? '0.1',
  )

  Sentry.init({
    dsn,
    environment: (import.meta.env.MODE as string | undefined) ?? 'production',
    release,
    tracesSampleRate,
    replaysSessionSampleRate,
    replaysOnErrorSampleRate,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,    // PII default — UI text often contains lead names
        blockAllMedia: true,  // images/videos may include uploaded receipts
      }),
    ],
    beforeSend(event) {
      try {
        const req = event.request
        if (req?.headers) {
          req.headers = scrubStringMap(req.headers as Record<string, string>)
        }
        if (req?.cookies) {
          req.cookies = { _redacted: '[REDACTED]' }
        }
        if (req?.data) {
          ;(req as { data?: unknown }).data = scrubObject(req.data)
        }
      } catch {
        // beforeSend MUST NOT throw — dropping the event is fine, killing
        // the page is not.
      }
      return event
    },
    beforeBreadcrumb(breadcrumb) {
      try {
        // Fetch breadcrumbs may carry request bodies → scrub.
        if (breadcrumb.data && typeof breadcrumb.data === 'object') {
          breadcrumb.data = scrubObject(breadcrumb.data) as Record<string, unknown>
        }
      } catch {
        /* ignore */
      }
      return breadcrumb
    },
  })
}

function scrubObject(obj: unknown): unknown {
  if (obj === null || typeof obj !== 'object') return obj
  if (Array.isArray(obj)) return obj.map(scrubObject)
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(k.toLowerCase())) {
      out[k] = '[REDACTED]'
    } else if (v && typeof v === 'object') {
      out[k] = scrubObject(v)
    } else {
      out[k] = v
    }
  }
  return out
}

function scrubStringMap(obj: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(obj)) {
    out[k] = SENSITIVE_KEYS.has(k.toLowerCase()) ? '[REDACTED]' : v
  }
  return out
}
