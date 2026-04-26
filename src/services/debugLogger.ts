// ─── Debug Logger ─────────────────────────────────────────────────────────────
// Singleton in-memory logger for development debugging.
// Captures structured events from agents, tools, OAuth flows, etc.
// Persists to local Supabase (copilot_logs table) when VITE_SUPABASE_URL is set.
// Consumed by <DebugPanel /> — toggle with Ctrl+Shift+D.

export type LogCategory = 'user' | 'intent' | 'routing' | 'agent' | 'tool' | 'oauth' | 'error'

export interface LogEntry {
  id:       number
  ts:       number          // Date.now()
  category: LogCategory
  message:  string
  data?:    unknown         // any serializable payload
}

const MAX_ENTRIES = 500

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL  as string | undefined
const SUPABASE_KEY  = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
const TABLE_URL     = SUPABASE_URL ? `${SUPABASE_URL}/rest/v1/copilot_logs` : null

// Current session id — shared across all log entries in this browser tab
const SESSION_ID = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

type Listener = () => void

class DebugLogger {
  private entries: LogEntry[] = []
  private counter = 0
  private listeners: Set<Listener> = new Set()

  log(category: LogCategory, message: string, data?: unknown): void {
    const entry: LogEntry = {
      id:       ++this.counter,
      ts:       Date.now(),
      category,
      message,
      data,
    }

    this.entries.push(entry)
    if (this.entries.length > MAX_ENTRIES) {
      this.entries.shift()
    }

    // Console output with color coding
    const colors: Record<LogCategory, string> = {
      user:    'color:#60a5fa',
      intent:  'color:#a78bfa',
      routing: 'color:#f59e0b',
      agent:   'color:#34d399',
      tool:    'color:#fb923c',
      oauth:   'color:#f472b6',
      error:   'color:#f87171',
    }
    const prefix = `%c[${category.toUpperCase()}]`
    if (data !== undefined) {
      console.groupCollapsed(prefix + ` ${message}`, colors[category])
      console.log(data)
      console.groupEnd()
    } else {
      console.log(prefix + ` ${message}`, colors[category])
    }

    // Persist to Supabase (fire-and-forget — never blocks the main flow)
    if (TABLE_URL && SUPABASE_KEY) {
      this.persist(category, message, data).catch(() => { /* silent */ })
    }

    this.notify()
  }

  private async persist(category: LogCategory, message: string, data?: unknown): Promise<void> {
    await fetch(TABLE_URL!, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'apikey':        SUPABASE_KEY!,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer':        'return=minimal',
      },
      body: JSON.stringify({
        session_id: SESSION_ID,
        category,
        message,
        data: data !== undefined ? data : null,
      }),
    })
  }

  getEntries(): readonly LogEntry[] {
    return this.entries
  }

  getSessionId(): string {
    return SESSION_ID
  }

  clear(): void {
    this.entries = []
    this.notify()
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  private notify(): void {
    this.listeners.forEach((fn) => fn())
  }
}

export const logger = new DebugLogger()
