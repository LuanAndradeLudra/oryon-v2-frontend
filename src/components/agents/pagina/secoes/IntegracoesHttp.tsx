import { useState } from 'react'
import { ChevronDown, Pencil, Plug, Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { addTool, deleteTool, updateTool, type AgentConfigWithTools, type AgentTool } from '@/services/agentsApi'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Switch } from '@/components/ui/Switch'
import { Textarea } from '@/components/ui/Textarea'
import { ConfirmModal } from '@/components/ui/Modal'
import { useToast } from '@/hooks/useToast'
import { useSalvamento } from '../salvamentoContexto'
import { useTamanhoDeToque } from '../useToque'

const METODOS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const

const COR_METODO: Record<AgentTool['method'], string> = {
  GET: 'var(--color-accent-blue)',
  POST: 'var(--color-accent-green)',
  PUT: 'var(--color-accent-amber)',
  PATCH: 'var(--color-warning)',
  DELETE: 'var(--color-danger)',
}

type Formulario = {
  name: string; description: string; method: AgentTool['method']; url: string
  headers: string; parameters: string; response_hint: string; enabled: boolean
}

const VAZIO: Formulario = {
  name: '', description: '', method: 'GET', url: '', headers: '{}', parameters: '[]', response_hint: '', enabled: true,
}

function paraFormulario(t: AgentTool): Formulario {
  return {
    name: t.name, description: t.description, method: t.method, url: t.url,
    headers: JSON.stringify(t.headers ?? {}, null, 2), parameters: JSON.stringify(t.parameters ?? [], null, 2),
    response_hint: t.response_hint ?? '', enabled: t.enabled,
  }
}

function lerJson<T>(texto: string, campo: string): T {
  try { return JSON.parse(texto || 'null') as T } catch { throw new Error(`${campo}: JSON inválido`) }
}

function ChipMetodo({ metodo }: { metodo: AgentTool['method'] }) {
  const cor = COR_METODO[metodo]
  return (
    <span className="inline-flex h-5 items-center rounded-xs border px-1.5 font-mono text-2xs font-bold"
      style={{ color: cor, backgroundColor: `color-mix(in srgb, ${cor} 12%, transparent)`, borderColor: `color-mix(in srgb, ${cor} 25%, transparent)` }}>
      {metodo}
    </span>
  )
}

function FormularioIntegracao({ inicial, onSalvar, onCancelar }: {
  inicial: Formulario
  onSalvar: (f: Formulario) => Promise<void>
  onCancelar: () => void
}) {
  const tam = useTamanhoDeToque()
  const [f, setF] = useState(inicial)
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const set = <K extends keyof Formulario>(k: K, v: Formulario[K]) => setF((x) => ({ ...x, [k]: v }))

  const salvar = async () => {
    setErro(null)
    setSalvando(true)
    try { await onSalvar(f) } catch (e) { setErro(e instanceof Error ? e.message : 'Não foi possível salvar.') } finally { setSalvando(false) }
  }

  return (
    <div className="space-y-4 rounded-lg border border-surface-700 bg-[var(--sf2)] p-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Nome interno" hint="Sem espaços. É como o agente chama a integração." required>
          <Input value={f.name} onChange={(e) => set('name', e.target.value.replace(/\s/g, '_'))} placeholder="verificar_disponibilidade" className="font-mono" />
        </FormField>
        <FormField label="Quando usar" hint="O agente lê esta frase para decidir a hora de chamar." required>
          <Input value={f.description} onChange={(e) => set('description', e.target.value)} placeholder="Consulta horários livres na agenda" />
        </FormField>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[120px_1fr]">
        <FormField label="Método">
          <Select value={f.method} onChange={(e) => set('method', e.target.value as AgentTool['method'])}>
            {METODOS.map((m) => <option key={m} value={m}>{m}</option>)}
          </Select>
        </FormField>
        <FormField label="Endereço (URL)" required>
          <Input value={f.url} onChange={(e) => set('url', e.target.value)} placeholder="https://api.suaempresa.com/horarios?data={{params.data}}" className="font-mono" />
        </FormField>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Cabeçalhos (JSON)" hint="Use {{secrets.nome}} para chaves guardadas com segurança.">
          <Textarea rows={4} value={f.headers} onChange={(e) => set('headers', e.target.value)} className="font-mono text-xs" />
        </FormField>
        <FormField label="Parâmetros (JSON)" hint="O que o agente pode preencher ao chamar.">
          <Textarea rows={4} value={f.parameters} onChange={(e) => set('parameters', e.target.value)} className="font-mono text-xs" />
        </FormField>
      </div>
      <FormField label="O que a resposta traz" hint="Opcional. Ajuda o agente a ler o retorno.">
        <Input value={f.response_hint} onChange={(e) => set('response_hint', e.target.value)} placeholder="Lista de horários livres" />
      </FormField>
      {erro && <p className="text-xs text-danger" role="alert">{erro}</p>}
      <div className="flex justify-end gap-2">
        <Button variant="neutral" size={tam} onClick={onCancelar} disabled={salvando}>Cancelar</Button>
        <Button size={tam} onClick={() => void salvar()} loading={salvando} disabled={!f.name || !f.url}>Salvar integração</Button>
      </div>
    </div>
  )
}

/**
 * Integrações HTTP (modo avançado): APIs externas que o agente pode chamar.
 * Antes era a aba "Ferramentas"; agora é um bloco de Capacidades.
 */
export function IntegracoesHttp({ agent, onFerramentas }: {
  agent: AgentConfigWithTools
  onFerramentas: (t: AgentTool[]) => void
}) {
  const tam = useTamanhoDeToque()
  const { toast } = useToast()
  const { salvar } = useSalvamento()
  const [novo, setNovo] = useState(false)
  const [editando, setEditando] = useState<string | null>(null)
  const [aberto, setAberto] = useState<string | null>(null)
  const [excluir, setExcluir] = useState<string | null>(null)
  const [excluindo, setExcluindo] = useState(false)

  const payload = (f: Formulario) => ({
    name: f.name, description: f.description, method: f.method, url: f.url,
    headers: lerJson<Record<string, string>>(f.headers, 'Cabeçalhos') ?? {},
    parameters: lerJson<AgentTool['parameters']>(f.parameters, 'Parâmetros') ?? [],
    body_template: null, response_hint: f.response_hint, enabled: f.enabled,
  })

  const criar = async (f: Formulario) => {
    const dados = payload(f)
    const t = await salvar(() => addTool(agent.id, dados))
    onFerramentas([...agent.tools, t])
    setNovo(false)
  }
  const editar = async (id: string, f: Formulario) => {
    const dados = payload(f)
    const t = await salvar(() => updateTool(agent.id, id, dados))
    onFerramentas(agent.tools.map((x) => (x.id === id ? t : x)))
    setEditando(null)
  }
  const alternar = async (t: AgentTool) => {
    try {
      const n = await salvar(() => updateTool(agent.id, t.id, { enabled: !t.enabled }))
      onFerramentas(agent.tools.map((x) => (x.id === t.id ? n : x)))
    } catch { toast('Não foi possível mudar a integração.', 'error') }
  }
  const confirmarExclusao = async () => {
    if (!excluir) return
    setExcluindo(true)
    try {
      await salvar(() => deleteTool(agent.id, excluir))
      onFerramentas(agent.tools.filter((x) => x.id !== excluir))
    } catch { toast('Não foi possível remover a integração.', 'error') } finally { setExcluindo(false); setExcluir(null) }
  }

  const alvo = agent.tools.find((t) => t.id === excluir)

  return (
    <div className="space-y-2">
      {!novo && agent.tools.length > 0 && (
        <div className="flex justify-end">
          <Button variant="neutral" size={tam} leftIcon={<Plus className="h-3.5 w-3.5" />} onClick={() => setNovo(true)}>Nova integração</Button>
        </div>
      )}
      {novo && <FormularioIntegracao inicial={VAZIO} onSalvar={criar} onCancelar={() => setNovo(false)} />}
      {agent.tools.length === 0 && !novo && (
        <EmptyState icon={Plug} title="Nenhuma integração HTTP" hint="Conecte uma API do seu sistema para o agente consultar ou registrar dados durante a conversa."
          action={{ label: 'Nova integração', onClick: () => setNovo(true) }} />
      )}
      {agent.tools.map((t) => (
        editando === t.id ? (
          <FormularioIntegracao key={t.id} inicial={paraFormulario(t)} onSalvar={(f) => editar(t.id, f)} onCancelar={() => setEditando(null)} />
        ) : (
          <div key={t.id} className={cn('rounded-lg border border-surface-700 bg-[var(--sf2)]', !t.enabled && 'opacity-70')}>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3.5 py-2.5">
              <ChipMetodo metodo={t.method} />
              <div className="min-w-0 flex-1 basis-[calc(100%-4rem)] sm:basis-auto">
                <p className="truncate font-mono text-sm font-semibold text-surface-100">{t.name}</p>
                <p className="truncate text-xs text-surface-400">{t.description}</p>
              </div>
              <div className="flex w-full items-center justify-end gap-1 sm:w-auto">
              <Switch checked={t.enabled} onChange={() => void alternar(t)} className="mr-1" />
              <Button variant="ghost" size={tam} iconOnly aria-label={`Editar ${t.name}`} onClick={() => setEditando(t.id)}><Pencil className="h-3.5 w-3.5" /></Button>
              <Button variant="ghost" size={tam} iconOnly aria-label={`Remover ${t.name}`} onClick={() => setExcluir(t.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
              <Button variant="ghost" size={tam} iconOnly aria-label={aberto === t.id ? 'Recolher detalhes' : 'Ver detalhes'} aria-expanded={aberto === t.id}
                onClick={() => setAberto(aberto === t.id ? null : t.id)}>
                <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', aberto === t.id && 'rotate-180')} />
              </Button>
              </div>
            </div>
            {aberto === t.id && (
              <dl className="grid grid-cols-1 gap-x-3 gap-y-1 sm:grid-cols-[110px_1fr] sm:gap-y-1.5 border-t border-surface-700 px-3.5 py-3 text-xs">
                <dt className="text-surface-500">Endereço</dt><dd className="break-all font-mono text-surface-200">{t.url}</dd>
                {t.parameters.length > 0 && <><dt className="text-surface-500">Parâmetros</dt><dd className="text-surface-200">{t.parameters.map((p) => `${p.name}${p.required ? '*' : ''}`).join(', ')}</dd></>}
                {t.response_hint && <><dt className="text-surface-500">Resposta</dt><dd className="text-surface-200">{t.response_hint}</dd></>}
              </dl>
            )}
          </div>
        )
      ))}
      <ConfirmModal open={!!excluir} onClose={() => setExcluir(null)} onConfirm={() => void confirmarExclusao()}
        title="Remover integração" description="O agente deixa de chamar esta API. Isso não pode ser desfeito."
        impact={alvo ? { label: `Integração "${alvo.name}"`, tone: 'danger' } : undefined}
        confirmLabel="Remover integração" danger loading={excluindo} />
    </div>
  )
}
