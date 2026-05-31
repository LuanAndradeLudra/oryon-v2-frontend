import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Check, CheckCheck, Clock, AlertCircle, AlertTriangle, MapPin, Mic, Download, Play, Pause,
  Copy, ExternalLink, Link as LinkIcon, Sparkles, Bot, UserCircle2, Megaphone, CornerUpLeft,
} from 'lucide-react'
import { cn, formatFullTime } from '@/lib/utils'
import { useContextMenu } from '@/hooks/useContextMenu'
import type { ContextMenuEntry } from '@/components/ui/ContextMenu'
import type { Message } from '@/types'
import { WhatsAppText } from '@/lib/whatsappFormatter'
import { feAudioLog } from '@/lib/audioMediaDebug'
import { getAuthenticatedMediaUrl, useAuthenticatedMediaSrc } from '@/lib/mediaUrls'
import { renderExtendedContent, STRUCTURED_TYPES, ReferralBanner } from './messageRenderers/registry'
import { ReplyQuoteBar } from './messageRenderers/ReplyQuoteBar'
import { AnomalyDetailModal } from './AnomalyDetailModal'

// Robust media download: fetch blob (works cross-origin as long as CORS is
// permissive), fall back to opening in a new tab if the browser refuses.
async function downloadMedia(url: string, filename?: string) {
  try {
    const res = await fetch(url, { credentials: 'include' })
    if (!res.ok) throw new Error('fetch failed')
    const blob = await res.blob()
    const objUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = objUrl
    a.download = filename ?? ''
    a.click()
    URL.revokeObjectURL(objUrl)
  } catch {
    window.open(url, '_blank', 'noopener,noreferrer')
  }
}

interface MessageBubbleProps {
  message: Message
  showAvatar?: boolean
  prevMessage?: Message
  /** The message this one replies to, resolved by MessageList from the loaded window. */
  quotedMessage?: Message | null
  /** Start a quoted reply to this message (desktop hover button + mobile swipe). */
  onReply?: (message: Message) => void
}

function StatusIcon({ status }: { status: Message['status'] }) {
  if (status === 'sent') return <Check className="w-3 h-3 text-surface-400" />
  if (status === 'delivered') return <CheckCheck className="w-3 h-3 text-surface-400" />
  if (status === 'read') return <CheckCheck className="w-3 h-3 text-brand-400" />
  if (status === 'failed') return <AlertCircle className="w-3 h-3 text-danger" />
  return <Clock className="w-3 h-3 text-surface-500" />
}

/** Formata segundos -> "m:ss" (ex: 73.4 -> "1:13"). Retorna "0:00" para NaN / negativos. */
function formatAudioTime(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds) || seconds < 0) return '0:00'
  const total = Math.floor(seconds)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

// ── Waveform helpers (deterministic fake) ──────────────────────────────────
// We don't decode the audio to get real amplitudes; instead we hash the
// message id and deterministically derive ~40 bar heights. The result is
// stable (re-renders produce the same waveform) and instantaneous (no
// decode step). Picks heights in [20%, 95%] so bars never disappear and
// rarely touch the ceiling — visually closer to WhatsApp.

const WAVEFORM_BARS = 40
const WAVEFORM_MIN_HEIGHT = 0.20
const WAVEFORM_MAX_HEIGHT = 0.95

/** Mulberry32 — tiny deterministic PRNG. Same seed → same sequence. */
function mulberry32(seed: number) {
  let t = seed | 0
  return function next(): number {
    t = (t + 0x6D2B79F5) | 0
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

/** Hash string → 32-bit int for the PRNG seed. */
function hashStringToInt(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** Deterministic array of normalized (0..1) bar heights for a given id. */
function buildWaveform(seedKey: string): number[] {
  const rng = mulberry32(hashStringToInt(seedKey))
  const heights: number[] = []
  for (let i = 0; i < WAVEFORM_BARS; i++) {
    // Bias towards the middle of the range so we don't get too many edge
    // values; averaging two draws yields a roughly triangular distribution.
    const raw = (rng() + rng()) / 2
    heights.push(WAVEFORM_MIN_HEIGHT + raw * (WAVEFORM_MAX_HEIGHT - WAVEFORM_MIN_HEIGHT))
  }
  return heights
}

/** Returns the trimmed Whisper transcription, or null if absent. Shared with
 *  MessageBubble so the "Ver transcrição" control can live in the footer
 *  while the transcription text renders inside the media content area. */
function getAudioTranscription(message: Message): string | null {
  if (message.type !== 'audio') return null
  return message.transcription?.trim() || null
}

function MediaContent({
  message,
  showTranscription,
}: {
  message: Message
  showTranscription: boolean
}) {
  const [imageError, setImageError] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  // Audio playback: one HTMLAudioElement per bubble, driven by rAF so the
  // progress bar moves 60fps-smooth instead of jumping every 250ms (the
  // `timeupdate` cadence). The bar width and time readout are updated by
  // writing directly to the DOM refs — this keeps React re-renders rare
  // (once per whole second for the readout) without sacrificing smoothness.
  const audioRef = useRef<HTMLAudioElement | null>(null)
  // Individual <span> refs — one per waveform bar — so the rAF loop can
  // toggle opacity/scale per bar without triggering React re-renders.
  const waveformBarsRef = useRef<Array<HTMLSpanElement | null>>([])
  const rafRef = useRef<number | null>(null)
  const [audioDuration, setAudioDuration] = useState<number | null>(null)
  // Integer-second snapshot drives the readout; the sub-second component is
  // read inside the rAF loop so it never hits React state.
  const [audioCurrentTime, setAudioCurrentTime] = useState(0)
  // Transcription visibility is controlled by the parent (MessageBubble)
  // because the "Ver transcrição" toggle lives in the footer next to the
  // timestamp, while the revealed text renders inside this component.
  const audioTranscription = getAudioTranscription(message)

  // Split the transcription into [whitespace-preserving] words so CSS
  // per-word delays produce a fade-in cascade without re-rendering every
  // tick like a JS typewriter would.
  const authMediaSrc = useAuthenticatedMediaSrc(message.mediaUrl)

  useEffect(() => {
    if (message.type !== 'audio') return
    feAudioLog('bubble_audio_render', {
      message_id: message.id,
      wamid: message.wamid,
      direction: message.direction,
      media_path: message.mediaUrl?.slice(0, 160),
      transcription_chars: audioTranscription?.length ?? 0,
      has_transcription: Boolean(audioTranscription),
      show_transcription_ui: showTranscription,
    })
  }, [
    message.id,
    message.type,
    message.direction,
    message.wamid,
    message.mediaUrl,
    audioTranscription,
    showTranscription,
  ])

  const transcriptionWords = useMemo(() => {
    if (!audioTranscription) return []
    // Split keeps spaces attached to the following word so the final
    // rendering preserves original whitespace without extra gaps.
    return audioTranscription.split(/(\s+)/).filter(Boolean)
  }, [audioTranscription])

  // Cap the animation at ~2s total regardless of length: distribute delay
  // across however many tokens we have. Minimum 30ms / token so very short
  // messages still have a pleasant cascade instead of appearing instantly.
  const wordDelayStep = useMemo(() => {
    const total = transcriptionWords.length
    if (total === 0) return 0
    return Math.max(30, Math.min(90, Math.round(2000 / total)))
  }, [transcriptionWords.length])

  // Deterministic waveform heights keyed by the message id. Same message
  // always renders the same bars; different audios look distinct.
  const waveformHeights = useMemo(
    () => buildWaveform(message.id ?? message.wamid ?? message.mediaUrl ?? 'default'),
    [message.id, message.wamid, message.mediaUrl],
  )

  // Paint the progress across the waveform bars. Each bar becomes "played"
  // (fully opaque) when the playhead passes over it; we also keep a small
  // sub-pixel highlight on the *active* bar so the motion reads smoothly
  // between bar boundaries. All writes go directly to DOM refs.
  const paintProgress = useCallback((currentTime: number, duration: number | null) => {
    const bars = waveformBarsRef.current
    if (bars.length > 0) {
      const ratio = duration && duration > 0 ? currentTime / duration : 0
      const playheadIndex = ratio * bars.length // fractional position
      for (let i = 0; i < bars.length; i++) {
        const el = bars[i]
        if (!el) continue
        // Fractional fill for the active bar (so the boundary doesn't
        // pop); full for bars already passed; dim for bars ahead.
        let fill: number
        if (i + 1 <= playheadIndex) fill = 1
        else if (i >= playheadIndex)  fill = 0
        else                          fill = playheadIndex - i
        // Opacity between 0.30 (unplayed) and 1.0 (played).
        el.style.opacity = (0.30 + 0.70 * fill).toFixed(3)
      }
    }
    // Only bump React state when the *integer* second changed, so the
    // "0:07" readout re-renders ~1 Hz while bars still animate at 60fps.
    const rounded = Math.floor(currentTime)
    setAudioCurrentTime(prev => (prev === rounded ? prev : rounded))
  }, [])

  // rAF loop — reads audio.currentTime every frame while the element is
  // playing. Cancels itself on pause / end / unmount.
  const startRafLoop = useCallback(() => {
    const tick = () => {
      const el = audioRef.current
      if (!el || el.paused) {
        rafRef.current = null
        return
      }
      paintProgress(el.currentTime, Number.isFinite(el.duration) ? el.duration : null)
      rafRef.current = requestAnimationFrame(tick)
    }
    if (rafRef.current === null) rafRef.current = requestAnimationFrame(tick)
  }, [paintProgress])

  const stopRafLoop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [])

  // Lazily create the audio element on first play.
  const ensureAudio = useCallback((src: string) => {
    if (audioRef.current) return audioRef.current
    const el = new Audio(src)
    el.preload = 'metadata'
    el.addEventListener('loadedmetadata', () => {
      const d = Number.isFinite(el.duration) ? el.duration : null
      setAudioDuration(d)
      // Paint initial state so the bar is 0% (width: 0) even before play.
      paintProgress(0, d)
    })
    el.addEventListener('ended', () => {
      stopRafLoop()
      setIsPlaying(false)
      el.currentTime = 0
      paintProgress(0, Number.isFinite(el.duration) ? el.duration : null)
    })
    el.addEventListener('pause', () => {
      stopRafLoop()
      setIsPlaying(false)
      // Paint one last time so the bar snaps to exact paused position.
      paintProgress(el.currentTime, Number.isFinite(el.duration) ? el.duration : null)
    })
    el.addEventListener('play', () => {
      setIsPlaying(true)
      startRafLoop()
    })
    el.addEventListener('error', () => {
      feAudioLog('bubble_audio_element_error', {
        message_id: message.id,
        src_preview: (el.src || '').slice(0, 160),
        networkState: el.networkState,
        error_code: el.error?.code,
      })
    })
    audioRef.current = el
    return el
  }, [paintProgress, startRafLoop, stopRafLoop, message.id])

  const toggleAudio = useCallback((src: string) => {
    const el = ensureAudio(src)
    if (el.paused) {
      // Some browsers reject play() without a user gesture; swallow so
      // we don't raise unhandled rejections in React.
      el.play().catch(() => setIsPlaying(false))
    } else {
      el.pause()
    }
  }, [ensureAudio])

  // Click-to-seek on the progress bar. The rAF loop picks up the change
  // on the next frame if playing; if paused we paint once immediately.
  const seekAudio = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = audioRef.current
    if (!el || !el.duration || !Number.isFinite(el.duration)) return
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    el.currentTime = ratio * el.duration
    paintProgress(el.currentTime, el.duration)
  }, [paintProgress])

  // Cleanup on unmount — pause the audio and cancel any in-flight rAF so
  // we don't leak frames or keep audio playing after the bubble scrolls
  // out of view and gets virtualised away.
  useEffect(() => {
    return () => {
      stopRafLoop()
      const el = audioRef.current
      if (el) {
        el.pause()
        el.src = ''
      }
    }
  }, [stopRafLoop])

  useEffect(() => {
    if (message.type !== 'audio' || !authMediaSrc) return
    feAudioLog('bubble_audio_auth_src_tick', {
      message_id: message.id,
      src_len: authMediaSrc.length,
      has_token_query: authMediaSrc.includes('token='),
    })
    const el = audioRef.current
    if (!el) return
    try {
      const abs = new URL(authMediaSrc, window.location.href).href
      if (el.src === abs) return
      const playing = !el.paused
      el.src = authMediaSrc
      el.load()
      feAudioLog('bubble_audio_src_hydrated', { message_id: message.id })
      if (playing) void el.play().catch(() => setIsPlaying(false))
    } catch {
      el.src = authMediaSrc
      el.load()
    }
  }, [authMediaSrc, message.type, message.id])

  if (message.type === 'image' && message.mediaUrl && !imageError) {
    return (
      <div className="mb-1">
        <img
          src={authMediaSrc}
          alt={message.mediaCaption || 'Imagem'}
          loading="lazy"
          decoding="async"
          className="rounded-lg max-w-[280px] max-h-[320px] object-cover cursor-pointer hover:opacity-90 transition-opacity"
          onError={() => setImageError(true)}
          onClick={() => window.open(authMediaSrc, '_blank')}
        />
        {message.mediaCaption && (
          <p className="text-xs mt-1 text-current opacity-80">{message.mediaCaption}</p>
        )}
      </div>
    )
  }

  if (message.type === 'audio' && message.mediaUrl) {
    const hasTranscription = !!audioTranscription

    return (
      // Wider than before (was min-w-[200px]) so the transcription has room
      // to breathe on 2-3 lines instead of wrapping aggressively.
      <div className="py-2 px-1 min-w-[280px] max-w-[340px]">
        {/* Audio player with live progress + click-to-seek */}
        <div className="flex items-center gap-3">
          <button
            className="w-10 h-10 rounded-full bg-current/20 hover:bg-current/30 flex items-center justify-center transition-colors flex-shrink-0"
            onClick={() => toggleAudio(authMediaSrc)}
            aria-label={isPlaying ? 'Pausar áudio' : 'Reproduzir áudio'}
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Mic className="w-4 h-4 opacity-70" />
              <span className="text-xs font-medium">Áudio</span>
              <span className="text-[10px] opacity-60 tabular-nums ml-auto">
                {formatAudioTime(isPlaying || audioCurrentTime > 0 ? audioCurrentTime : audioDuration)}
                {audioDuration !== null && (
                  <>
                    <span className="opacity-40"> / </span>
                    {formatAudioTime(audioDuration)}
                  </>
                )}
              </span>
            </div>
            {/* Waveform — deterministic fake bars. Each bar is a span with
                a fixed height (seeded by message id) and variable opacity
                written per-frame by the rAF loop. Clicking anywhere on the
                track seeks to that position, using the same geometry as
                the progress calculation. */}
            <div
              className="relative h-7 flex items-end gap-[2px] cursor-pointer group"
              onClick={seekAudio}
              role="slider"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={audioDuration ? Math.round((audioCurrentTime / audioDuration) * 100) : 0}
              aria-label="Progresso do áudio"
            >
              {waveformHeights.map((h, i) => (
                <span
                  key={i}
                  ref={(el) => { waveformBarsRef.current[i] = el }}
                  className="flex-1 bg-current rounded-[1px] transition-opacity duration-75 ease-linear"
                  style={{
                    height: `${Math.round(h * 100)}%`,
                    opacity: 0.30, // painted by paintProgress once audio starts
                    willChange: 'opacity',
                  }}
                />
              ))}
            </div>
          </div>
          <a
            href={authMediaSrc}
            download
            className="w-8 h-8 rounded-full bg-current/20 hover:bg-current/30 flex items-center justify-center transition-colors flex-shrink-0"
          >
            <Download className="w-4 h-4" />
          </a>
        </div>

        {/* The transcription toggle lives in the MessageBubble footer — see footer. */}

        {/* Revealed transcription — each word fades in sequentially. Using
            CSS `animation-delay` keyed by index avoids a JS timer and means
            the browser paints the whole thing in a single reflow. */}
        {hasTranscription && showTranscription && (
          <div className="mt-2 pt-2 border-t border-current/15">
            <p className="text-[10px] uppercase tracking-wide opacity-50 mb-1 font-medium">
              Transcrição automática
            </p>
            <p className="text-sm opacity-90 leading-relaxed italic">
              “
              {transcriptionWords.map((token, i) => {
                // Whitespace tokens render plainly — no fade needed, keeps
                // natural word wrapping intact.
                if (/^\s+$/.test(token)) return <span key={i}>{token}</span>
                return (
                  <span
                    key={i}
                    className="transcription-word"
                    style={{ animationDelay: `${i * wordDelayStep}ms` }}
                  >
                    {token}
                  </span>
                )
              })}
              ”
            </p>
          </div>
        )}
      </div>
    )
  }

  if (message.type === 'document' && message.mediaUrl) {
    const getDocumentIcon = (url: string) => {
      const ext = url.split('.').pop()?.toLowerCase()
      if (ext === 'pdf') return '📄'
      if (['doc', 'docx'].includes(ext || '')) return '📝'
      if (['xls', 'xlsx'].includes(ext || '')) return '📊'
      if (['ppt', 'pptx'].includes(ext || '')) return '📽️'
      return '📎'
    }

    return (
      <a
        href={authMediaSrc}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 py-2 px-1 hover:bg-current/5 rounded-lg transition-colors"
      >
        <div className="w-10 h-10 rounded-lg bg-current/10 flex items-center justify-center text-lg">
          {getDocumentIcon(authMediaSrc)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">
            {message.mediaCaption || 'Documento'}
          </p>
          <p className="text-xs opacity-60">Toque para abrir</p>
        </div>
        <Download className="w-4 h-4 opacity-60" />
      </a>
    )
  }

  if (message.type === 'video' && message.mediaUrl) {
    return (
      <div className="mb-1">
        <video
          src={authMediaSrc}
          controls
          className="rounded-lg max-w-[280px] max-h-[320px]"
          preload="metadata"
        >
          Seu navegador não suporta o elemento de vídeo.
        </video>
        {message.mediaCaption && (
          <p className="text-xs mt-1 text-current opacity-80">{message.mediaCaption}</p>
        )}
      </div>
    )
  }

  if (message.type === 'sticker' && message.mediaUrl) {
    return (
      <div className="mb-1">
        <img
          src={authMediaSrc}
          alt="Figurinha"
          loading="lazy"
          decoding="async"
          className="rounded-lg max-w-[150px] max-h-[150px] object-contain cursor-pointer hover:opacity-90 transition-opacity"
          onError={() => setImageError(true)}
          onClick={() => window.open(authMediaSrc, '_blank')}
        />
      </div>
    )
  }

  if (message.type === 'location') {
    return (
      <div className="flex items-center gap-2 py-1">
        <MapPin className="w-5 h-5 opacity-70" />
        <span className="text-xs">Localização compartilhada</span>
      </div>
    )
  }

  if (message.type === 'reaction') {
    const emoji = message.reactionEmoji ?? message.body ?? '👍'
    return (
      <div className="flex items-center gap-1.5 py-0.5">
        <span className="text-2xl leading-none">{emoji}</span>
      </div>
    )
  }

  // Fallback for unsupported media or error
  if (message.mediaUrl && imageError) {
    return (
      <div className="flex items-center gap-2 py-2 px-1 text-current/70">
        <AlertCircle className="w-4 h-4" />
        <span className="text-xs">Erro ao carregar mídia</span>
      </div>
    )
  }

  // Structured/extended types (contacts, interactive, button, order, system,
  // unsupported) render via the extensible registry — a type the backend
  // captured never falls through to a blank bubble.
  const extended = renderExtendedContent(message)
  if (extended) return extended

  return null
}

function TextContent({ message }: { message: Message }) {
  // Structured types own their full display via the registry; don't also
  // render the synthetic "[…]" body underneath the rich renderer.
  if (STRUCTURED_TYPES.has(message.type)) return null
  return message.body ? (
    <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
      <WhatsAppText text={message.body} />
    </p>
  ) : null
}

/** Map the anti-claim guard's claim type to a human phrase for the bubble flag. */
function phantomClaimLabel(raw: string | null | undefined): string {
  switch (raw) {
    case 'schedule': return 'um agendamento'
    case 'cancel':   return 'um cancelamento'
    case 'confirm':  return 'uma confirmação'
    default:         return 'uma ação'
  }
}

export const MessageBubble = memo(function MessageBubble({ message, showAvatar, prevMessage, quotedMessage, onReply }: MessageBubbleProps) {
  const isOutbound = message.direction === 'outbound'
  const isSameDirection = prevMessage?.direction === message.direction
  // Campaign/automation name carried in metadata, shown in the sender indicator.
  const campaignName =
    typeof (message.metadata as { campaignName?: unknown } | null)?.campaignName === 'string'
      ? (message.metadata as { campaignName: string }).campaignName
      : undefined
  // Faixa lateral do bubble outbound: verde = operador humano, âmbar = IA
  // (agente conversacional). Disparos de campanha/automação NÃO têm faixa.
  const outboundAccent =
    message.senderKind === 'campaign'
      ? null
      : message.sentByUser
        ? 'rgba(16,185,129,0.7)'
        : 'rgba(245,158,11,0.8)'
  const gap = isSameDirection ? 'mt-0.5' : 'mt-3'

  // Transcription toggle lives here so the "Ver transcrição" control can sit
  // next to the timestamp in the footer; the MediaContent component
  // consumes this as a prop and renders the revealed text.
  const audioTranscription = getAudioTranscription(message)
  const [showTranscription, setShowTranscription] = useState(false)
  const [anomalyOpen, setAnomalyOpen] = useState(false)

  // Stable — sentAt never changes after message creation
  const timeStr = useMemo(
    () => new Date(message.sentAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    [message.sentAt],
  )

  const buildContextMenu = useCallback((): ContextMenuEntry[] => {
    const items: ContextMenuEntry[] = []
    if (message.body) {
      items.push({
        label: 'Copiar mensagem',
        icon: Copy,
        onClick: () => navigator.clipboard.writeText(message.body ?? '').catch(() => {}),
      })
    }
    if (message.mediaUrl) {
      const resolveUrl = () => getAuthenticatedMediaUrl(message.mediaUrl!)
      const copyLink = () =>
        resolveUrl().then((u) => navigator.clipboard.writeText(u)).catch(() => {})
      if (message.type === 'image') {
        items.push({
          label: 'Abrir imagem',
          icon: ExternalLink,
          onClick: () => void resolveUrl().then((u) => window.open(u, '_blank', 'noopener,noreferrer')),
        })
        items.push({ label: 'Copiar link da imagem', icon: LinkIcon, onClick: () => void copyLink() })
        items.push({ label: 'Baixar imagem', icon: Download, onClick: () => void resolveUrl().then(downloadMedia) })
      } else if (message.type === 'audio') {
        items.push({ label: 'Baixar áudio', icon: Download, onClick: () => void resolveUrl().then(downloadMedia) })
        items.push({ label: 'Copiar link do áudio', icon: LinkIcon, onClick: () => void copyLink() })
      } else if (message.type === 'video') {
        items.push({
          label: 'Abrir vídeo',
          icon: ExternalLink,
          onClick: () => void resolveUrl().then((u) => window.open(u, '_blank', 'noopener,noreferrer')),
        })
        items.push({ label: 'Baixar vídeo', icon: Download, onClick: () => void resolveUrl().then(downloadMedia) })
      } else if (message.type === 'document') {
        items.push({
          label: 'Abrir documento',
          icon: ExternalLink,
          onClick: () => void resolveUrl().then((u) => window.open(u, '_blank', 'noopener,noreferrer')),
        })
        items.push({
          label: 'Baixar documento',
          icon: Download,
          onClick: () => void resolveUrl().then((u) => downloadMedia(u, message.mediaCaption ?? undefined)),
        })
      }
    }
    return items
  }, [message])

  const { onContextMenu } = useContextMenu(buildContextMenu)

  // Mobile swipe-to-reply: horizontal drag past a threshold triggers a reply.
  // We only translate when the gesture is mostly horizontal so vertical
  // scrolling is never hijacked. No preventDefault → native scroll preserved.
  const [dragX, setDragX] = useState(0)
  const touchStart = useRef<{ x: number; y: number } | null>(null)
  const canReply = !!onReply && message.status !== 'failed'

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!canReply) return
    const t = e.touches[0]
    touchStart.current = { x: t.clientX, y: t.clientY }
  }
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!canReply || !touchStart.current) return
    const t = e.touches[0]
    const dx = t.clientX - touchStart.current.x
    const dy = t.clientY - touchStart.current.y
    if (Math.abs(dx) > Math.abs(dy)) setDragX(Math.max(-80, Math.min(80, dx)))
  }
  const handleTouchEnd = () => {
    if (canReply && Math.abs(dragX) > 56) onReply!(message)
    setDragX(0)
    touchStart.current = null
  }

  return (
    <div
      onContextMenu={onContextMenu}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={cn(
        'group flex items-end gap-2',
        isOutbound ? 'flex-row-reverse' : 'flex-row',
        gap
      )}
      style={{
        transform: dragX ? `translateX(${dragX}px)` : undefined,
        transition: dragX ? 'none' : 'transform 0.15s ease-out',
      }}
      title={formatFullTime(message.sentAt)}
    >
      {/* Avatar placeholder for spacing */}
      <div className="w-0 flex-shrink-0" />

      {/* Desktop reply affordance — appears on hover, beside the bubble. */}
      {canReply && (
        <button
          type="button"
          onClick={() => onReply!(message)}
          title="Responder"
          aria-label="Responder"
          className="hidden md:flex self-center w-7 h-7 rounded-full items-center justify-center text-surface-400 hover:text-surface-100 hover:bg-surface-700/60 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
        >
          <CornerUpLeft className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Bubble — handoff accent rendered as inset box-shadow on the right
          edge so it follows the bubble's rounded corners automatically. The
          previous absolute-positioned <span right-0> lined up with the
          rectangular bounding box, which made the strip appear to leak past
          the curve on the top-right when the bubble's TR corner kept the
          full 16px radius (operator-sent messages following another
          outbound). shadow-sm (the existing drop) is preserved in the same
          `style` so we don't fight Tailwind's `shadow-sm` utility for
          precedence. */}
      <div
        className={cn(
          'relative max-w-[72%] px-3 py-2 rounded-2xl',
          isOutbound
            ? 'bg-bubble-out text-bubble-out-fg rounded-br-sm'
            : 'bg-bubble-in text-surface-100 rounded-bl-sm shadow-sm',
          !isSameDirection && isOutbound && 'rounded-br-2xl rounded-tr-sm',
          !isSameDirection && !isOutbound && 'rounded-bl-2xl rounded-tl-sm'
        )}
        style={isOutbound ? {
          boxShadow: outboundAccent
            ? `0 1px 2px 0 rgb(0 0 0 / 0.05), inset -3px 0 0 0 ${outboundAccent}`
            : '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        } : undefined}
      >
        {message.contextWamid && <ReplyQuoteBar message={message} quoted={quotedMessage} />}
        <ReferralBanner message={message} />
        <MediaContent message={message} showTranscription={showTranscription} />
        <TextContent message={message} />

        {/* Footer: [Ver transcrição (audio com texto Whisper)] … [hora] [status]
            Control only shows when Whisper text exists
            and is still collapsed; expanding is one-way until remount. */}
        <div className="flex items-center gap-2 mt-1">
          {audioTranscription && !showTranscription && (
            <button
              type="button"
              onClick={() => {
                feAudioLog('bubble_transcription_expand_click', {
                  message_id: message.id,
                  transcription_chars: audioTranscription?.length ?? 0,
                })
                setShowTranscription(true)
              }}
              className={cn(
                'inline-flex items-center gap-1 text-[10px] font-medium transition-opacity',
                isOutbound ? 'text-bubble-out-time hover:opacity-100 opacity-80' : 'text-surface-400 hover:text-surface-200',
              )}
            >
              <Sparkles className="w-2.5 h-2.5" />
              Ver transcrição
            </button>
          )}

          <div
            className={cn(
              'flex items-center gap-1 ml-auto',
              isOutbound ? 'justify-end' : 'justify-start',
            )}
          >
            {isOutbound && (
              // Author indicator: 📣 Campanha for campaign/template sends,
              // icon + first name for human operators, bot icon for AI.
              // `leading-none` keeps the text baseline matching the icon's
              // visual center so the row aligns cleanly with the timestamp.
              message.senderKind === 'campaign' ? (
                <span
                  className="inline-flex items-center gap-0.5 text-[10px] leading-none text-bubble-out-time max-w-[140px]"
                  title={campaignName ? `Campanha: ${campaignName}` : 'Enviado via campanha'}
                >
                  <Megaphone className="w-3 h-3 shrink-0" />
                  <span className="leading-none truncate">{campaignName ?? 'Campanha'}</span>
                </span>
              ) : (
                <span
                  className="inline-flex items-center gap-0.5 text-[10px] leading-none text-bubble-out-time"
                  title={message.sentByUser ? 'Enviado por um operador humano' : 'Enviado pelo agente de IA'}
                >
                  {message.sentByUser ? (
                    <>
                      <UserCircle2 className="w-3 h-3 shrink-0" />
                      <span className="leading-none">{message.sentByUser.firstName}</span>
                    </>
                  ) : (
                    <Bot className="w-3 h-3 shrink-0" />
                  )}
                </span>
              )
            )}
            <span className={cn('text-[10px]', isOutbound ? 'text-bubble-out-time' : 'text-surface-400')}>
              {timeStr}
            </span>
            {isOutbound && <StatusIcon status={message.status} />}
          </div>
        </div>

        {/* Failed indicator */}
        {message.status === 'failed' && (
          <p className="text-[10px] text-danger mt-1">Falha no envio</p>
        )}

        {/* Phase 33c — phantom-confirmation flag on the exact bubble of the
            turn where the anti-claim guard caught the AI claiming an action it
            never executed. Full-bleed banner pinned to the bubble's bottom
            edge (same width as the bubble); click opens a modal with the full
            detail. Amber = handoff (needs verification); muted = the AI
            self-corrected before sending. */}
        {message.anomaly && (
          <>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setAnomalyOpen(true) }}
              title="Ver detalhes da verificação"
              // w-0 + min-w-[calc(100%+1.5rem)] makes the banner span the full
              // bubble width (the +1.5rem cancels the bubble's px-3 on each
              // side, reached via -mx-3) WITHOUT contributing to the bubble's
              // max-content width — so a long warning never forces a short
              // message's bubble to grow. It always tracks the bubble's size.
              className={cn(
                'flex items-start gap-1.5 text-left w-0 min-w-[calc(100%+1.5rem)] -mx-3 -mb-2 mt-2 px-3 py-1.5 rounded-b-2xl border-t transition-colors',
                message.anomaly.kind === 'handoff'
                  ? 'bg-amber-500/15 border-amber-500/25 hover:bg-amber-500/25'
                  : 'bg-surface-700/40 border-surface-600/40 hover:bg-surface-700/60',
              )}
            >
              <AlertTriangle
                className={cn(
                  'w-3 h-3 mt-0.5 shrink-0',
                  message.anomaly.kind === 'handoff' ? 'text-amber-400' : 'text-surface-400',
                )}
              />
              <span
                className={cn(
                  'text-[10px] leading-tight flex-1 min-w-0',
                  message.anomaly.kind === 'handoff' ? 'text-amber-200' : 'text-surface-300',
                )}
              >
                {message.anomaly.kind === 'handoff'
                  ? `Verificação necessária: a IA afirmou ${phantomClaimLabel(message.anomaly.claimType)} sem executar a operação no sistema.`
                  : `A IA se autocorrigiu (${phantomClaimLabel(message.anomaly.claimType)}) antes de enviar.`}
              </span>
            </button>
            <AnomalyDetailModal
              open={anomalyOpen}
              onClose={() => setAnomalyOpen(false)}
              anomaly={message.anomaly}
            />
          </>
        )}
      </div>
    </div>
  )
})
