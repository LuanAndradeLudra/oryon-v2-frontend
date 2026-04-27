/**
 * Diagnóstico de mídia no CRM (alinhado aos prefixos [AUDIO-IN] / [MEDIA-IN] no backend).
 *
 * Ativar em produção sem rebuild:
 *   localStorage.setItem('oryon:debug:media', '1')
 * Desligar:
 *   localStorage.removeItem('oryon:debug:media')
 *
 * Ou: VITE_DEBUG_MEDIA=true (build) — em DEV os logs já vêm ligados.
 */

function isMediaFeDebugEnabled(): boolean {
  // always on in dev; in prod requires flag or localStorage key
  if (import.meta.env.DEV) return true
  if (import.meta.env.VITE_DEBUG_MEDIA === 'true' || import.meta.env.VITE_DEBUG_MEDIA === '1') return true
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem('oryon:debug:media') === '1'
  } catch {
    return false
  }
}

function emit(prefix: string, event: string, payload?: Record<string, unknown>): void {
  if (!isMediaFeDebugEnabled()) return
  const label = `${prefix} ${event}`
  // use console.log (not debug) so logs appear at "Default levels" in Chrome DevTools
  if (payload && Object.keys(payload).length > 0) console.log(label, payload)
  else console.log(label)
}

/** URLs /uploads, player, token — imagem, áudio, vídeo, doc. */
export function feMediaLog(event: string, payload?: Record<string, unknown>): void {
  emit('[MEDIA-IN][FE]', event, payload)
}

/** Só fluxo áudio + transcrição no bubble (MessageBubble). */
export function feAudioLog(event: string, payload?: Record<string, unknown>): void {
  emit('[AUDIO-IN][FE]', event, payload)
}
