import { useEffect, useMemo, useState } from 'react'
import { feMediaLog } from '@/lib/audioMediaDebug'
import { getUploadsAuthToken } from '@/services/api'

/** Paths that require JWT on the API `/uploads` route (cookies may not be sent cross-site). */
export function needsUploadAuth(mediaUrl: string): boolean {
  return mediaUrl.startsWith('/uploads/') || mediaUrl.startsWith('/api/media/')
}

/** Resolve stored media path to absolute URL on the API host (no auth query). */
export function getFullMediaUrl(mediaUrl: string): string {
  if (mediaUrl.startsWith('http')) return mediaUrl

  if (mediaUrl.startsWith('/uploads/')) {
    const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
    const baseUrl = backendUrl.replace(/\/api\/?$/, '')
    return `${baseUrl}${mediaUrl}`
  }

  if (mediaUrl.startsWith('/api/media/')) {
    const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
    const baseUrl = backendUrl.replace(/\/api\/?$/, '')
    const uploadsPath = mediaUrl.replace('/api/media/', '/uploads/')
    return `${baseUrl}${uploadsPath}`
  }

  return mediaUrl
}

/**
 * Same as getFullMediaUrl but appends ?token=… for /uploads (Nest guards /uploads with JWT;
 * img/audio tags often don't send httpOnly cookies cross-origin).
 */
export async function getAuthenticatedMediaUrl(mediaUrl: string): Promise<string> {
  const base = getFullMediaUrl(mediaUrl)
  if (!mediaUrl.startsWith('/uploads/') && !mediaUrl.startsWith('/api/media/')) {
    feMediaLog('media_url_skip_auth', { mediaUrl: mediaUrl.slice(0, 120), base: base.slice(0, 120) })
    return base
  }
  try {
    feMediaLog('uploads_ws_token_fetch_start', { path: mediaUrl.slice(0, 80) })
    const token = await getUploadsAuthToken()
    const u = new URL(base)
    u.searchParams.set('token', token)
    feMediaLog('uploads_url_ready', {
      host: u.host,
      path: u.pathname.slice(0, 96),
      has_token_query: u.searchParams.has('token'),
    })
    return u.toString()
  } catch (e) {
    feMediaLog('uploads_ws_token_failed_fallback_base', {
      path: mediaUrl.slice(0, 80),
      err: e instanceof Error ? e.message : String(e),
    })
    return base
  }
}

/** Absolute URL for `<img>` / `<audio>` / `<video>`: adds `?token=` for `/uploads` when needed. */
export function useAuthenticatedMediaSrc(mediaUrl: string | undefined): string {
  const base = useMemo(() => (mediaUrl ? getFullMediaUrl(mediaUrl) : ''), [mediaUrl])
  const [tokenized, setTokenized] = useState<string | null>(null)

  useEffect(() => {
    setTokenized(null)
    if (!mediaUrl) return
    if (mediaUrl.startsWith('http') || !needsUploadAuth(mediaUrl)) {
      feMediaLog('hook_media_src_external_or_no_upload_path', { mediaUrl: mediaUrl.slice(0, 120) })
      return
    }

    feMediaLog('hook_auth_src_resolve_start', { mediaUrl: mediaUrl.slice(0, 120) })
    let cancelled = false
    getAuthenticatedMediaUrl(mediaUrl)
      .then((u) => {
        if (!cancelled) {
          feMediaLog('hook_auth_src_resolved', { finalLen: u.length, had_query_token: u.includes('token=') })
          setTokenized(u)
        }
      })
      .catch(() => {
        if (!cancelled) {
          feMediaLog('hook_auth_src_rejected')
          setTokenized(null)
        }
      })
    return () => {
      cancelled = true
    }
  }, [mediaUrl])

  return tokenized ?? base
}
