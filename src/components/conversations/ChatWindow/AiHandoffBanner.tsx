// ─── AI Handoff Banner ───────────────────────────────────────────────────────
//
// Phase 27 — persistent banner at the top of the chat that shows the current
// AI handoff state and exposes the manual override actions:
//
//   * AI active (aiPausedUntil = null OR past timestamp):
//     "🤖 Em atendimento IA · Intervir agora"
//
//   * AI paused (aiPausedUntil > now):
//     "👤 Você está atendendo · IA volta em 3h 24min · Reativar IA · Estender ▾"
//
// The banner is always visible — operators need a single "where am I?"
// signal that doesn't require scrolling or hovering. We never collapse it
// to save vertical space; the cost of a missed handoff is much higher than
// 32 px of chat surface.

import { useEffect, useState } from 'react'
import { Bot, UserCog, ChevronDown, RotateCcw, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { isSupervisorOrAbove } from '@/lib/roleHelpers'
import { INDEFINITE_PAUSE_ISO } from '@/hooks/useConversations'

interface Props {
  aiPausedUntil: string | null | undefined
  onPause: (until: string) => Promise<void> | void
  onResume: () => Promise<void> | void
}

const EXTEND_OPTIONS: Array<{ label: string; minutes: number }> = [
  { label: '+30 min',     minutes: 30 },
  { label: '+1 hora',     minutes: 60 },
  { label: '+4 horas',    minutes: 240 },
  { label: 'Indefinido',  minutes: -1 },
]

export function AiHandoffBanner({ aiPausedUntil, onPause, onResume }: Props) {
  const { user } = useAuth()
  const [busy, setBusy] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  // Mirrors the backend gate on PATCH /conversations/:id/ai-pause. Agents
  // can SEE the banner (status info matters to whoever's atendendo) but
  // can't manually pause/resume — that's a manager decision. The implicit
  // auto-pause on outbound human messages still works for everyone.
  const canControl = isSupervisorOrAbove(user?.role)

  const pausedUntilMs = aiPausedUntil ? new Date(aiPausedUntil).getTime() : null
  const isPaused = pausedUntilMs !== null && pausedUntilMs > Date.now()
  const isIndefinite = isPaused && pausedUntilMs! >= new Date(INDEFINITE_PAUSE_ISO).getTime() - 1000

  // Tick once a minute to refresh the countdown — sub-minute precision is
  // overkill (the operator doesn't need to see seconds for a 4-hour window)
  // and a per-second timer would re-render the chat surface needlessly.
  const [, setTick] = useState(0)
  useEffect(() => {
    if (!isPaused || isIndefinite) return
    const id = setInterval(() => setTick((t) => t + 1), 60_000)
    return () => clearInterval(id)
  }, [isPaused, isIndefinite])

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

  if (!isPaused) {
    return (
      <div className="flex items-center justify-between gap-3 px-4 py-2 min-h-[52px] bg-emerald-950/50 border-b border-emerald-900/50">
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex items-center justify-center w-6 h-6 rounded-md bg-emerald-700/30 text-emerald-300 flex-shrink-0">
            <Bot className="w-3.5 h-3.5" />
          </span>
          <div className="min-w-0">
            <p className="text-xs text-emerald-200 font-medium truncate">
              Em atendimento por IA
            </p>
            <p className="text-[10px] text-emerald-300/80 truncate">
              Resposta automática habilitada
            </p>
          </div>
        </div>
        {canControl && (
          <button
            type="button"
            disabled={busy}
            onClick={() => handlePause(240)}
            className="flex-shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium text-emerald-200 hover:text-white hover:bg-emerald-700/40 disabled:opacity-50 transition-colors"
            title="Pausar a IA e assumir esta conversa"
          >
            {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserCog className="w-3 h-3" />}
            Intervir agora
          </button>
        )}
      </div>
    )
  }

  // Paused state
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2 min-h-[52px] bg-amber-950/40 border-b border-amber-900/40">
      <div className="flex items-center gap-2 min-w-0">
        <span className="flex items-center justify-center w-6 h-6 rounded-md bg-amber-700/30 text-amber-300 flex-shrink-0">
          <UserCog className="w-3.5 h-3.5" />
        </span>
        <div className="min-w-0">
          <p className="text-xs text-amber-200 font-medium truncate">
            Você está atendendo
          </p>
          <p className="text-[10px] text-amber-300/80 truncate">
            {isIndefinite
              ? 'IA pausada até você reativar'
              : `IA volta em ${formatRemaining(pausedUntilMs!)}`}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        {canControl && (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={handleResume}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium text-amber-200 hover:text-white hover:bg-amber-700/40 disabled:opacity-50 transition-colors"
              title="Reativar a IA agora"
            >
              {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
              Reativar IA
            </button>
            <div className="relative">
          <button
            type="button"
            disabled={busy}
            onClick={() => setMenuOpen((v) => !v)}
            className="inline-flex items-center gap-0.5 px-1.5 py-1 rounded-md text-[11px] text-amber-300 hover:text-white hover:bg-amber-700/40"
          >
            Estender
            <ChevronDown className="w-3 h-3" />
          </button>
          <AnimatePresence>
            {menuOpen && (
              <>
                {/* Backdrop to close on outside click */}
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setMenuOpen(false)}
                />
                <motion.div
                  initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                  className="absolute right-0 mt-1 z-50 min-w-[160px] rounded-lg border border-surface-800 bg-surface-950 shadow-lg overflow-hidden"
                >
                  {EXTEND_OPTIONS.map((opt) => (
                    <button
                      key={opt.label}
                      onClick={() => handlePause(opt.minutes)}
                      className={cn(
                        'w-full px-3 py-2 text-left text-xs text-surface-200 hover:bg-surface-800',
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </motion.div>
              </>
            )}
          </AnimatePresence>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

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
