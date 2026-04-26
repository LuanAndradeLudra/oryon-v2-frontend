import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { X, Trash2, Bug, ChevronDown, ChevronRight } from 'lucide-react'
import { logger, type LogCategory, type LogEntry } from '@/services/debugLogger'
import { cn } from '@/lib/utils'

// ─── Debug Panel ──────────────────────────────────────────────────────────────
// Floating panel for real-time log inspection.
// Toggle: Ctrl+Shift+D  |  Close: Esc or the X button

const CATEGORY_COLORS: Record<LogCategory, { bg: string; text: string; label: string }> = {
  user:    { bg: 'bg-blue-500/20',   text: 'text-blue-400',   label: 'USER' },
  intent:  { bg: 'bg-violet-500/20', text: 'text-violet-400', label: 'INTENT' },
  routing: { bg: 'bg-amber-500/20',  text: 'text-amber-400',  label: 'ROUTING' },
  agent:   { bg: 'bg-emerald-500/20',text: 'text-emerald-400',label: 'AGENT' },
  tool:    { bg: 'bg-orange-500/20', text: 'text-orange-400', label: 'TOOL' },
  oauth:   { bg: 'bg-pink-500/20',   text: 'text-pink-400',   label: 'OAUTH' },
  error:   { bg: 'bg-red-500/20',    text: 'text-red-400',    label: 'ERROR' },
}

const ALL_CATEGORIES = Object.keys(CATEGORY_COLORS) as LogCategory[]

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('pt-BR', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function DataPreview({ data }: { data: unknown }) {
  const [expanded, setExpanded] = useState(false)
  const json = JSON.stringify(data, null, 2)
  const isLong = json.length > 80

  return (
    <div className="mt-1">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        <span>{expanded ? 'Fechar dados' : 'Ver dados'}</span>
        {!expanded && isLong && (
          <span className="text-zinc-600">{json.slice(0, 60).replace(/\n/g, ' ')}…</span>
        )}
      </button>
      {expanded && (
        <pre className="mt-1 text-xs bg-zinc-900 rounded p-2 overflow-x-auto text-zinc-300 max-h-48 whitespace-pre-wrap break-all">
          {json}
        </pre>
      )}
    </div>
  )
}

function LogRow({ entry }: { entry: LogEntry }) {
  const colors = CATEGORY_COLORS[entry.category]
  return (
    <div className="px-3 py-2 border-b border-zinc-800/60 hover:bg-zinc-800/30 transition-colors">
      <div className="flex items-start gap-2">
        <span className="text-zinc-600 text-xs font-mono shrink-0 mt-0.5">{formatTime(entry.ts)}</span>
        <span className={cn('text-xs font-bold px-1.5 py-0.5 rounded shrink-0', colors.bg, colors.text)}>
          {colors.label}
        </span>
        <span className="text-zinc-200 text-xs leading-relaxed break-words min-w-0">{entry.message}</span>
      </div>
      {entry.data !== undefined && <DataPreview data={entry.data} />}
    </div>
  )
}

export function DebugPanel() {
  const [open, setOpen]             = useState(false)
  const [entries, setEntries]       = useState<readonly LogEntry[]>(() => logger.getEntries())
  const [filter, setFilter]         = useState<LogCategory | null>(null)
  const [autoScroll, setAutoScroll] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Subscribe to logger updates
  useEffect(() => {
    return logger.subscribe(() => setEntries(logger.getEntries()))
  }, [])

  // Keyboard shortcut: Ctrl+Shift+D
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault()
        setOpen((v) => !v)
      }
      if (e.key === 'Escape' && open) setOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open])

  // Auto-scroll to bottom
  useEffect(() => {
    if (autoScroll && open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [entries, autoScroll, open])

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40
    setAutoScroll(atBottom)
  }, [])

  const filtered = filter ? entries.filter((e) => e.category === filter) : entries

  return createPortal(
    <>
      {/* Toggle button */}
      <button
        onClick={() => setOpen((v) => !v)}
        title="Debug Panel (Ctrl+Shift+D)"
        className={cn(
          'fixed bottom-4 left-4 z-[9998] w-9 h-9 rounded-full flex items-center justify-center',
          'bg-zinc-800 border border-zinc-700 shadow-lg transition-all hover:bg-zinc-700',
          open && 'bg-violet-600 border-violet-500 hover:bg-violet-500',
        )}
      >
        <Bug className="w-4 h-4 text-zinc-200" />
        {entries.some((e) => e.category === 'error') && !open && (
          <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500 border border-zinc-900" />
        )}
      </button>

      {/* Panel */}
      {open && (
        <div
          className={cn(
            'fixed bottom-16 left-4 z-[9997] w-[540px] max-w-[calc(100vw-2rem)]',
            'bg-zinc-900/95 backdrop-blur border border-zinc-700 rounded-xl shadow-2xl',
            'flex flex-col',
          )}
          style={{ height: '480px' }}
        >
          {/* Header */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-800 shrink-0">
            <Bug className="w-3.5 h-3.5 text-violet-400" />
            <span className="text-xs font-semibold text-zinc-200">Debug Logs</span>
            <span className="text-xs text-zinc-500 ml-1">({filtered.length})</span>
            <div className="flex-1" />
            <button
              onClick={() => logger.clear()}
              className="p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
              title="Limpar logs"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setOpen(false)}
              className="p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Category filters */}
          <div className="flex gap-1 px-3 py-1.5 border-b border-zinc-800 shrink-0 flex-wrap">
            <button
              onClick={() => setFilter(null)}
              className={cn(
                'text-xs px-2 py-0.5 rounded font-medium transition-colors',
                !filter ? 'bg-zinc-600 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300',
              )}
            >
              Todos
            </button>
            {ALL_CATEGORIES.map((cat) => {
              const colors = CATEGORY_COLORS[cat]
              const count = entries.filter((e) => e.category === cat).length
              if (count === 0) return null
              return (
                <button
                  key={cat}
                  onClick={() => setFilter(filter === cat ? null : cat)}
                  className={cn(
                    'text-xs px-2 py-0.5 rounded font-medium transition-colors',
                    filter === cat ? cn(colors.bg, colors.text) : 'text-zinc-500 hover:text-zinc-300',
                  )}
                >
                  {colors.label} <span className="opacity-60">{count}</span>
                </button>
              )
            })}
          </div>

          {/* Log entries */}
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto text-sm"
          >
            {filtered.length === 0 ? (
              <div className="flex items-center justify-center h-full text-zinc-600 text-xs">
                Nenhum log ainda. Envie uma mensagem no Copilot.
              </div>
            ) : (
              filtered.map((entry) => <LogRow key={entry.id} entry={entry} />)
            )}
          </div>

          {/* Footer */}
          <div className="px-3 py-1.5 border-t border-zinc-800 shrink-0 flex items-center gap-2">
            <span className="text-xs text-zinc-600 flex-1">Ctrl+Shift+D para fechar</span>
            <label className="flex items-center gap-1.5 text-xs text-zinc-500 cursor-pointer">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
                className="w-3 h-3"
              />
              Auto-scroll
            </label>
          </div>
        </div>
      )}
    </>,
    document.body,
  )
}
