// ─── Skill Template Tester ─────────────────────────────────────────────────
// Operator-side panel that fires a real, signed POST against the n8n webhook
// the template targets — using the agent-server endpoint
// POST /skill-templates/:id/test (Phase 1C). The response shows everything
// the operator needs to debug the round-trip, including the HMAC header and
// the exact envelope sent.

import { useState, useMemo } from 'react'
import { Loader2, Play, AlertCircle, CheckCircle2, ChevronDown, Copy, Beaker, ClipboardList } from 'lucide-react'
import { testSkillTemplate } from '@/services/skillTemplatesApi'
import { DynamicSchemaFormFields } from './DynamicSchemaFormFields'
import type { SkillTemplate, TesterResult, JsonSchemaObject } from '@/types/skills'
import { cn } from '@/lib/utils'

interface Props {
  template: SkillTemplate
}

/** What text would actually flow into the LLM as `tool_result` for a given
 *  test response, mirroring agent-server `buildToolResultContent`. Helpful
 *  for the operator to see exactly what the agent will read. */
function previewToolResult(body: unknown): string {
  if (body === null || typeof body !== 'object') {
    return typeof body === 'string' ? body : String(body ?? '')
  }
  const obj = body as Record<string, unknown>
  if (obj.success === true) {
    if (typeof obj.message === 'string' && obj.message.trim()) return obj.message
    if (obj.data !== undefined && obj.data !== null) {
      try { return JSON.stringify(obj.data) } catch { return String(obj.data) }
    }
    return 'OK'
  }
  const tag = typeof obj.error_code === 'string' && obj.error_code ? `[${obj.error_code}] ` : ''
  if (typeof obj.message === 'string' && obj.message.trim()) return tag + obj.message
  return tag + 'Operação não pôde ser concluída.'
}

export function SkillTemplateTester({ template }: Props) {
  const [config, setConfig] = useState<Record<string, unknown>>({})
  const [inputs, setInputs] = useState<Record<string, unknown>>({})
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<TesterResult | null>(null)

  const inputSchema = template.input_schema as JsonSchemaObject | undefined
  const configSchema = (template.config_schema && !Array.isArray(template.config_schema))
    ? template.config_schema as JsonSchemaObject
    : null

  const summary = useMemo(() => {
    if (!result) return null
    const status = result.response.status
    const ok = status >= 200 && status < 300
    return {
      ok,
      status,
      duration: result.response.duration_ms,
      requestId: result.request.request_id,
      preview: previewToolResult(result.response.body),
    }
  }, [result])

  async function handleRun() {
    setRunning(true)
    setError(null)
    setResult(null)
    try {
      const r = await testSkillTemplate(template.id, { config, inputs })
      setResult(r)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* ── Inputs section ──────────────────────────────────────────────── */}
      <Section title="Configuração da integração" hint="Valores que VOCÊ preencheria ao atribuir o template a um agente. Em produção essa configuração é fixa por instância — aqui é só pra teste.">
        <DynamicSchemaFormFields
          schema={configSchema}
          values={config}
          onChange={setConfig}
          emptyHint="Esse template não exige configuração."
        />
      </Section>

      <Section title="Inputs (o que a IA preencheria)" hint="Simule os valores que o agente coletaria do cliente antes de chamar a skill.">
        <DynamicSchemaFormFields
          schema={inputSchema}
          values={inputs}
          onChange={setInputs}
          emptyHint="Esse template não recebe inputs."
        />
      </Section>

      {/* ── Run button ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <p className="text-xs text-surface-500 hidden sm:block">
          Dispara um POST assinado com HMAC contra <code className="font-mono text-surface-300">{template.webhook_path}</code>.
        </p>
        <button
          type="button"
          onClick={handleRun}
          disabled={running}
          className={cn(
            'inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ml-auto',
            'bg-brand-600 text-surface-950 hover:bg-brand-500',
            running && 'opacity-60 cursor-not-allowed',
          )}
        >
          {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          {running ? 'Disparando…' : 'Disparar'}
        </button>
      </div>

      {/* ── Top-level error (network/4xx from /test endpoint) ──────────── */}
      {error && !result && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-danger/10 border border-danger/30 text-sm">
          <AlertCircle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-danger font-medium mb-1">Falhou antes de chegar ao n8n</p>
            <p className="text-surface-300">{error}</p>
          </div>
        </div>
      )}

      {/* ── Result panel ────────────────────────────────────────────────── */}
      {result && summary && (
        <Section title="Resultado">
          {/* Summary line */}
          <div
            className={cn(
              'flex items-center gap-3 p-3 rounded-lg border',
              summary.ok
                ? 'bg-status-active-bg/40 border-status-active-border'
                : summary.status === 0
                  ? 'bg-danger/10 border-danger/30'
                  : 'bg-status-pending-bg/40 border-status-pending-border',
            )}
          >
            {summary.ok
              ? <CheckCircle2 className="w-5 h-5 text-status-active flex-shrink-0" />
              : <AlertCircle className="w-5 h-5 text-danger flex-shrink-0" />}
            <div className="min-w-0 flex-1">
              <p className={cn('text-sm font-medium', summary.ok ? 'text-status-active' : 'text-surface-100')}>
                {summary.status === 0
                  ? `Sem resposta — ${result.response.error ?? 'erro de rede'}`
                  : `HTTP ${summary.status}`}
                {' · '}{summary.duration} ms
              </p>
              <p className="text-[11px] text-surface-400 font-mono truncate">
                Request-Id: {summary.requestId}
              </p>
            </div>
          </div>

          {/* Tool result preview */}
          <div className="bg-surface-900 border border-surface-700 rounded-lg p-3">
            <div className="flex items-center gap-1.5 mb-2 text-xs text-surface-400 uppercase tracking-wide">
              <ClipboardList className="w-3.5 h-3.5" />
              Texto que a IA receberia
            </div>
            <p className="text-sm text-surface-100 whitespace-pre-wrap break-words font-mono">
              {summary.preview || '(vazio)'}
            </p>
          </div>

          {/* Collapsibles */}
          <CollapsibleJson title="Envelope enviado" data={result.request.envelope} />
          <CollapsibleJson title="Headers (HMAC, slug, request_id)" data={result.request.headers} />
          <CollapsibleJson
            title="Resposta n8n"
            data={result.response.body ?? { error: result.response.error, message: result.response.message }}
          />
          <CollapsibleJson
            title="URL e método"
            data={{ url: result.request.url, method: result.request.method }}
          />
        </Section>
      )}
    </div>
  )
}

// ─── Layout helpers ────────────────────────────────────────────────────────

function Section({
  title,
  hint,
  children,
}: {
  title: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <section className="bg-surface-900/50 border border-surface-800 rounded-xl p-5">
      <header className="mb-4">
        <h2 className="text-base font-semibold text-surface-100 mb-0.5 flex items-center gap-2">
          <Beaker className="w-4 h-4 text-brand-400" /> {title}
        </h2>
        {hint && <p className="text-sm text-surface-400">{hint}</p>}
      </header>
      <div className="space-y-3">{children}</div>
    </section>
  )
}

function CollapsibleJson({ title, data }: { title: string; data: unknown }) {
  const [open, setOpen] = useState(false)
  const text = useMemo(() => {
    try { return JSON.stringify(data, null, 2) } catch { return String(data) }
  }, [data])

  function copy() {
    navigator.clipboard?.writeText(text).catch(() => {})
  }

  return (
    <div className="bg-surface-900 border border-surface-700 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 hover:bg-surface-800/50 transition-colors"
      >
        <span className="text-xs font-medium text-surface-200">{title}</span>
        <ChevronDown className={cn('w-4 h-4 text-surface-400 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="border-t border-surface-700 relative">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); copy() }}
            className="absolute top-2 right-2 inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] text-surface-300 bg-surface-800 hover:bg-surface-700 transition-colors"
          >
            <Copy className="w-3 h-3" /> Copiar
          </button>
          <pre className="text-[11px] text-surface-200 font-mono p-3 overflow-x-auto whitespace-pre">
            {text}
          </pre>
        </div>
      )}
    </div>
  )
}
