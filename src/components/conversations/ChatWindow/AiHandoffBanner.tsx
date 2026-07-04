// ─── AI Handoff Controls ─────────────────────────────────────────────────────
//
// Phase 27 → 32 evolution. The original banner ate ~52px of vertical space at
// the top of every chat just to surface a status the operator already knew.
// We split it into two leaner pieces:
//
//   * `HandoffChip`   — colored pill that lives inside ChatHeader, next to
//                       the action icons. Shows current state + the same
//                       actions the banner had (intervir / reativar / estender)
//                       as icon buttons with native tooltips.
//
//   * `HandoffStripe` — 2px colored line directly below the header. A
//                       peripheral signal that survives even if the chip is
//                       cropped on a narrow viewport.
//
// Together they recover ~50px of chat surface without losing the "where am I?"
// affordance that operators rely on.
//
// Pause/resume controls are open to every operator role — agents need to hand
// the conversation back to the AI after answering manually (2026-05-09 prod
// feedback). Backend mirrors this; department scoping there still prevents
// cross-line interference.

import { useEffect, useRef, useState } from 'react'
import { Bot, UserCog, ChevronDown, RotateCcw, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { INDEFINITE_PAUSE_ISO } from '@/hooks/useConversations'

const EXTEND_OPTIONS: Array<{ label: string; minutes: number }> = [
  { label: '+30 min',     minutes: 30 },
  { label: '+1 hora',     minutes: 60 },
  { label: '+4 horas',    minutes: 240 },
  { label: 'Indefinido',  minutes: -1 },
]

interface HandoffProps {
  aiPausedUntil: string | null | undefined
  /**
   * Who took over the conversation. The backend automatically assigns the
   * conversation to whoever pauses the AI (see ConversationsService
   * .updateAiPause), so this is the operator the chip should attribute the
   * intervention to. Null means nobody is currently assigned (typical when
   * the AI is replying).
   */
  assignedUser?: { id: string; firstName: string; lastName?: string | null } | null
  onPause: (until: string) => Promise<void> | void
  onResume: () => Promise<void> | void
  /**
   * Phase 34 — "Intervir agora". When provided, the initial intervention
   * pauses the AI for the agent's CONFIGURED handoff window (resolved
   * server-side) instead of a hardcoded duration. Falls back to a 4h
   * client-side pause when absent (older callers).
   */
  onIntervene?: () => Promise<void> | void
}

/** Shared state derivation — both Chip and Stripe need the same booleans
 *  and the same per-minute tick to keep the countdown fresh. */
function useHandoffState(aiPausedUntil: string | null | undefined) {
  const pausedUntilMs = aiPausedUntil ? new Date(aiPausedUntil).getTime() : null
  const isPaused = pausedUntilMs !== null && pausedUntilMs > Date.now()
  const isIndefinite = isPaused && pausedUntilMs! >= new Date(INDEFINITE_PAUSE_ISO).getTime() - 1000

  // Tick once a minute to refresh the countdown — sub-minute precision is
  // overkill (operator doesn't need seconds for a 4-hour window).
  const [, setTick] = useState(0)
  useEffect(() => {
    if (!isPaused || isIndefinite) return
    const id = setInterval(() => setTick((t) => t + 1), 60_000)
    return () => clearInterval(id)
  }, [isPaused, isIndefinite])

  return { pausedUntilMs, isPaused, isIndefinite }
}

// ─── HandoffChip (lives inside ChatHeader) ───────────────────────────────────

export function HandoffChip({ aiPausedUntil, assignedUser, onPause, onResume, onIntervene }: HandoffProps) {
  const { pausedUntilMs, isPaused, isIndefinite } = useHandoffState(aiPausedUntil)
  const { user: currentUser } = useAuth()
  const [busy, setBusy] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // "Você" when the logged-in operator is the one driving the conversation,
  // otherwise the assignee's first name. Empty fallback (when the backend
  // hasn't propagated the assignee yet) also reads as "Você" to preserve
  // the previous behaviour during the brief moment between pausing and
  // the websocket broadcasting the new assignedUser.
  const ownerLabel = (() => {
    if (!assignedUser) return 'Você'
    if (currentUser && assignedUser.id === currentUser.id) return 'Você'
    return assignedUser.firstName || 'Atendente'
  })()

  // Close the "Estender" submenu when the user clicks outside it.
  useEffect(() => {
    if (!menuOpen) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  const handlePause = async (minutes: number) => {
    setBusy(true)
    setMenuOpen(false)
    try {
      const until = minutes < 0
        ? INDEFINITE_PAUSE_ISO
        : new Date(Date.now() + minutes * 60_000).toISOString()
      await onPause(until)
    } finally {
      setBusy(false)
    }
  }

  const handleResume = async () => {
    setBusy(true)
    try {
      await onResume()
    } finally {
      setBusy(false)
    }
  }

  // Phase 34 — first intervention. Prefer the server-authoritative path
  // (`onIntervene`) so the pause honours the agent's configured handoff
  // window. Fall back to a 4h client-side pause for callers that don't
  // pass `onIntervene`.
  const handleIntervene = async () => {
    if (!onIntervene) {
      await handlePause(240)
      return
    }
    setBusy(true)
    setMenuOpen(false)
    try {
      await onIntervene()
    } finally {
      setBusy(false)
    }
  }

  // ── AI ativa ─────────────────────────────────────────────────────────────
  // Color convention (inverted 2026-05-15): amber = AI is in control (the
  // operator might want to step in), emerald = human took over (everything's
  // under manual control). Reads as "amber = attention area, emerald = safe".
  if (!isPaused) {
    return (
      <div
        className="flex items-center h-8 pl-2 pr-1 gap-1.5 rounded-lg bg-surface-800 border border-surface-700"
        title="A IA está respondendo automaticamente"
      >
        <Bot className="w-3.5 h-3.5 text-surface-400 flex-shrink-0" />
        <span className="text-[11px] font-medium text-surface-300 leading-none">IA</span>
        <button
          type="button"
          disabled={busy}
          onClick={handleIntervene}
          title="Intervir agora — pausa a IA pelo período configurado no agente"
          aria-label="Intervir agora"
          className="inline-flex items-center gap-1 h-6 px-1.5 rounded-md text-[11px] font-medium text-surface-200 hover:text-surface-50 hover:bg-surface-700/60 disabled:opacity-50 transition-colors"
        >
          {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserCog className="w-3 h-3" />}
          Intervir agora
        </button>
      </div>
    )
  }

  // ── Humano atendendo (IA pausada) ────────────────────────────────────────
  // The label leads with the operator name (or "Você") so anyone reading
  // the conversation knows WHO took the AI offline. The original copy said
  // "Você" unconditionally, which hid the fact that a colleague was driving
  // and the current operator would need to coordinate before assuming.
  const isMe = ownerLabel === 'Você'
  return (
    <div
      className="flex items-center h-8 pl-2 pr-1 gap-1.5 rounded-lg bg-surface-800 border border-surface-700"
      title={
        isMe
          ? (isIndefinite
              ? 'Você está atendendo. IA pausada até reativar.'
              : `Você está atendendo. IA volta em ${formatRemaining(pausedUntilMs!)}`)
          : (isIndefinite
              ? `${ownerLabel} está atendendo. IA pausada até reativar.`
              : `${ownerLabel} está atendendo. IA volta em ${formatRemaining(pausedUntilMs!)}`)
      }
    >
      <UserCog className="w-3.5 h-3.5 text-surface-400 flex-shrink-0" />
      <span className="text-[11px] font-medium text-surface-300 leading-none whitespace-nowrap">
        {ownerLabel} · {isIndefinite ? '∞' : formatRemaining(pausedUntilMs!)}
      </span>
      <button
        type="button"
        disabled={busy}
        onClick={handleResume}
        title="Reativar IA agora"
        aria-label="Reativar IA"
        className="w-6 h-6 flex items-center justify-center rounded-md text-surface-300 hover:text-surface-50 hover:bg-surface-700/60 disabled:opacity-50 transition-colors"
      >
        {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
      </button>
      <div ref={menuRef} className="relative">
        <button
          type="button"
          disabled={busy}
          onClick={() => setMenuOpen((v) => !v)}
          title="Estender pausa da IA"
          aria-label="Estender pausa"
          className="w-6 h-6 flex items-center justify-center rounded-md text-surface-400 hover:text-surface-100 hover:bg-surface-700/60 disabled:opacity-50 transition-colors"
        >
          <ChevronDown className={cn('w-3 h-3 transition-transform', menuOpen && 'rotate-180')} />
        </button>
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.12 }}
              className="absolute right-0 top-full mt-1 z-50 min-w-[140px] rounded-lg border border-surface-700 bg-surface-900 shadow-xl overflow-hidden"
            >
              {EXTEND_OPTIONS.map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => handlePause(opt.minutes)}
                  className="w-full px-3 py-2 text-left text-xs text-surface-200 hover:bg-surface-800 transition-colors"
                >
                  {opt.label}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ─── HandoffStripe (peripheral 2px line under the header) ────────────────────

export function HandoffStripe({ aiPausedUntil }: { aiPausedUntil: string | null | undefined }) {
  const { isPaused } = useHandoffState(aiPausedUntil)
  return (
    <div
      aria-hidden
      className={cn(
        'h-[2px] w-full flex-shrink-0 transition-colors',
        // amber while AI is replying (caller may want to intervene),
        // emerald once a human takes over (under manual control)
        isPaused ? 'bg-emerald-500/70' : 'bg-amber-500/80',
      )}
    />
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** "3h 24min" / "12min" / "<1min". Capped at days for very long timers. */
function formatRemaining(untilMs: number): string {
  const ms = untilMs - Date.now()
  if (ms < 60_000) return '<1min'
  const totalMin = Math.floor(ms / 60_000)
  if (totalMin < 60) return `${totalMin}min`
  const hours = Math.floor(totalMin / 60)
  const mins = totalMin % 60
  if (hours < 24) return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`
  const days = Math.floor(hours / 24)
  const remHours = hours % 24
  return remHours > 0 ? `${days}d ${remHours}h` : `${days}d`
}
