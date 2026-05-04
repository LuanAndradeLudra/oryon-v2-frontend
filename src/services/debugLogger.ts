// ─── Debug Logger ─────────────────────────────────────────────────────────────
// Singleton logger for development debugging. Writes to console with category
// color coding and persists to Supabase (copilot_logs table) when
// VITE_SUPABASE_URL is set. Consumed by ArtifactPanel and canvaService.

export type LogCategory = 'user' | 'intent' | 'routing' | 'agent' | 'tool' | 'oauth' | 'error'

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL  as string | undefined
const SUPABASE_KEY  = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
const TABLE_URL     = SUPABASE_URL ? `${SUPABASE_URL}/rest/v1/copilot_logs` : null

const SESSION_ID = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

const COLORS: Record<LogCategory, string> = {
  user:    'color:#60a5fa',
  intent:  'color:#a78bfa',
  routing: 'color:#f59e0b',
  agent:   'color:#34d399',
  tool:    'color:#fb923c',
  oauth:   'color:#f472b6',
  error:   'color:#f87171',
}

class DebugLogger {
  log(category: LogCategory, message: string, data?: unknown): void {
    const prefix = `%c[${category.toUpperCase()}]`
    if (data !== undefined) {
      console.groupCollapsed(prefix + ` ${message}`, COLORS[category])
      console.log(data)
      console.groupEnd()
    } else {
      console.log(prefix + ` ${message}`, COLORS[category])
    }

    if (TABLE_URL && SUPABASE_KEY) {
      this.persist(category, message, data).catch(() => { /* silent */ })
    }
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
}

export const logger = new DebugLogger()
