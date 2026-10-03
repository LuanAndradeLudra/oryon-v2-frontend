// ─── Skill Template Tester ─────────────────────────────────────────────────
// Operator-side panel that fires a real, signed POST against the n8n webhook
// the template targets — using the agent-server endpoint
// POST /skill-templates/:id/test (Phase 1C). The response shows everything
// the operator needs to debug the round-trip, including the HMAC header and
// the exact envelope sent.

import { useState, useMemo } from 'react'
import { Play, AlertCircle, CheckCircle2, ChevronDown, Copy, Beaker, ClipboardList } from 'lucide-react'
import { testSkillTemplate } from '@/services/skillTemplatesApi'
import { DynamicSchemaFormFields } from '@/components/shared/DynamicSchemaFormFields'
import { ConfirmModal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import type { SkillTemplate, TesterResult, JsonSchemaObject } from '@/types/skills'
import { cn } from '@/lib/utils'

interface Props {
  template: SkillTemplate
  /**
   * Pre-fill the config form. Used by TestAgentSkillModal to seed the form
   * with an attached skill's saved config so the operator can fire a test
   * against the values the agent actually uses. Defaults to {}.
   */
  initialConfig?: Record<string, unknown>
  /** Id da skill anexada (TestAgentSkillModal): os segredos mascarados usam o valor guardado. */
  agentSkillId?: string
  /** Same as initialConfig, but for the inputs section. Defaults to {}. */
  initialInputs?: Record<string, unknown>
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

export function SkillTemplateTester({ template, initialConfig, initialInputs, agentSkillId }: Props) {
  const [config, setConfig] = useState<Record<string, unknown>>(initialConfig ?? {})
  const [inputs, setInputs] = useState<Record<string, unknown>>(initialInputs ?? {})
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<TesterResult | null>(null)
  // F-ADM-04: "Disparar" is not a simulation — it fires a real, signed POST
  // against the live n8n webhook. For a skill flagged `mutates` that's a
  // real mutation (e.g. actually books/cancels an appointment), so it needs
  // a confirmation on every run, same as any other destructive action.
  const [confirmingRun, setConfirmingRun] = useState(false)

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
      const r = await testSkillTemplate(template.id, { config, inputs, ...(agentSkillId ? { agent_skill_id: agentSkillId } : {}) })
      setResult(r)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setRunning(false)
    }
  }

  function handleRunClick() {
    if (template.mutates) {
      setConfirmingRun(true)
      return
    }
    void handleRun()
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
        <Button
          variant="primary"
          onClick={handleRunClick}
          loading={running}
          leftIcon={running ? undefined : <Play className="w-4 h-4" />}
          className="ml-auto"
        >
          {running ? 'Disparando…' : 'Disparar'}
        </Button>
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
          <div className="bg-[var(--sf2)] border border-surface-700 rounded-md p-3">
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

      <ConfirmModal
        open={confirmingRun}
        onClose={() => setConfirmingRun(false)}
        onConfirm={() => { setConfirmingRun(false); void handleRun() }}
        title="Esta skill é destrutiva"
        description={`"${template.name}" está marcada como operação destrutiva. Disparar aqui não é uma simulação — executa a chamada de verdade contra ${template.webhook_path}, com os dados preenchidos acima. Continuar?`}
        confirmLabel="Disparar mesmo assim"
        danger
        loading={running}
      />
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
    <section className="bg-surface-800 border border-surface-700 rounded-lg p-5">
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
    <div className="bg-[var(--sf2)] border border-surface-700 rounded-md overflow-hidden">
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
          <Button
            variant="neutral"
            size="sm"
            onClick={(e) => { e.stopPropagation(); copy() }}
            leftIcon={<Copy className="w-3 h-3" />}
            className="absolute top-2 right-2"
          >
            Copiar
          </Button>
          <pre className="text-[11px] text-surface-200 font-mono p-3 overflow-x-auto whitespace-pre">
            {text}
          </pre>
        </div>
      )}
    </div>
  )
}
