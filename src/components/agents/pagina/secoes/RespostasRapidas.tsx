import { useEffect, useState } from 'react'
import { MessageCircleQuestion, Pencil, Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  addFaqRule, deleteFaqRule, listFaqRules, updateFaqRule,
  type FaqMatchMode, type FaqRule, type FaqRuleDraft,
} from '@/services/agentsApi'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Switch } from '@/components/ui/Switch'
import { Textarea } from '@/components/ui/Textarea'
import { ConfirmModal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/hooks/useToast'
import { useSalvamento } from '../salvamentoContexto'
import { useTamanhoDeToque } from '../useToque'

const VAZIO: FaqRuleDraft = {
  name: '', keywords: [], match_mode: 'any_keyword', response_template: '', priority: 0, enabled: true, cooldown_minutes: 0,
}

const MODO: Record<FaqMatchMode, string> = {
  any_keyword: 'Qualquer palavra',
  all_keywords: 'Todas as palavras',
  exact: 'Mensagem exata',
}

function ordenar(r: FaqRule[]) {
  return [...r].sort((a, b) => b.priority - a.priority)
}

function Formulario({ inicial, onSalvar, onCancelar }: {
  inicial: FaqRuleDraft
  onSalvar: (d: FaqRuleDraft) => Promise<void>
  onCancelar: () => void
}) {
  const tam = useTamanhoDeToque()
  const [d, setD] = useState(inicial)
  const [palavras, setPalavras] = useState(inicial.keywords.join(', '))
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  const salvar = async () => {
    const keywords = palavras.split(',').map((k) => k.trim()).filter(Boolean)
    if (!d.name.trim()) return setErro('Dê um nome à resposta.')
    if (keywords.length === 0) return setErro('Adicione ao menos uma palavra-chave.')
    if (!d.response_template.trim()) return setErro('Escreva a resposta.')
    setErro(null)
    setSalvando(true)
    try {
      await onSalvar({ ...d, keywords, name: d.name.trim(), response_template: d.response_template.trim() })
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="space-y-4 rounded-lg border border-surface-700 bg-[var(--sf2)] p-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_200px]">
        <FormField label="Nome" required>
          <Input value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} placeholder="Horário de funcionamento" />
        </FormField>
        <FormField label="Quando casar">
          <Select value={d.match_mode} onChange={(e) => setD({ ...d, match_mode: e.target.value as FaqMatchMode })}>
            {(Object.keys(MODO) as FaqMatchMode[]).map((m) => <option key={m} value={m}>{MODO[m]}</option>)}
          </Select>
        </FormField>
      </div>
      <FormField label="Palavras-chave" hint="Separadas por vírgula." required>
        <Input value={palavras} onChange={(e) => setPalavras(e.target.value)} placeholder="horário, que horas abre, funciona sábado" />
      </FormField>
      <FormField label="Resposta" hint="Pode usar {{nome}}, {{empresa}} e {{telefone}}." required>
        <Textarea rows={3} value={d.response_template} onChange={(e) => setD({ ...d, response_template: e.target.value })}
          placeholder="Oi, {{nome}}! Atendemos de segunda a sexta, das 8h às 18h." />
      </FormField>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Prioridade" hint="A maior vence quando duas casam.">
          <Input type="number" value={d.priority} onChange={(e) => setD({ ...d, priority: parseInt(e.target.value, 10) || 0 })} />
        </FormField>
        <FormField label="Não repetir por (minutos)" hint="0 = pode repetir sempre.">
          <Input type="number" min={0} value={d.cooldown_minutes}
            onChange={(e) => setD({ ...d, cooldown_minutes: Math.max(0, parseInt(e.target.value, 10) || 0) })} />
        </FormField>
      </div>
      {erro && <p role="alert" className="text-xs text-danger">{erro}</p>}
      <div className="flex justify-end gap-2">
        <Button variant="neutral" size={tam} onClick={onCancelar} disabled={salvando}>Cancelar</Button>
        <Button size={tam} onClick={() => void salvar()} loading={salvando}>Salvar resposta</Button>
      </div>
    </div>
  )
}

/**
 * Respostas rápidas: por palavra-chave, sem chamar a IA (não gasta crédito).
 * A IA continua disponível para o resto da conversa.
 */
export function RespostasRapidas({ agentId }: { agentId: string }) {
  const tam = useTamanhoDeToque()
  const { toast } = useToast()
  const { salvar } = useSalvamento()
  const [regras, setRegras] = useState<FaqRule[]>([])
  const [carregando, setCarregando] = useState(true)
  const [nova, setNova] = useState(false)
  const [editando, setEditando] = useState<string | null>(null)
  const [excluir, setExcluir] = useState<string | null>(null)
  const [excluindo, setExcluindo] = useState(false)

  useEffect(() => {
    let vivo = true
    listFaqRules(agentId)
      .then((r) => { if (vivo) setRegras(ordenar(r)) })
      .catch(() => { if (vivo) toast('Não foi possível carregar as respostas rápidas.', 'error') })
      .finally(() => { if (vivo) setCarregando(false) })
    return () => { vivo = false }
  }, [agentId, toast])

  const criar = async (d: FaqRuleDraft) => {
    const r = await salvar(() => addFaqRule(agentId, d))
    setRegras((x) => ordenar([...x, r]))
    setNova(false)
  }
  const editar = async (id: string, d: FaqRuleDraft) => {
    const r = await salvar(() => updateFaqRule(agentId, id, d))
    setRegras((x) => ordenar(x.map((y) => (y.id === id ? r : y))))
    setEditando(null)
  }
  const alternar = async (regra: FaqRule) => {
    try {
      const r = await salvar(() => updateFaqRule(agentId, regra.id, { enabled: !regra.enabled }))
      setRegras((x) => x.map((y) => (y.id === regra.id ? r : y)))
    } catch { toast('Não foi possível mudar a resposta rápida.', 'error') }
  }
  const confirmarExclusao = async () => {
    if (!excluir) return
    setExcluindo(true)
    try {
      await salvar(() => deleteFaqRule(agentId, excluir))
      setRegras((x) => x.filter((y) => y.id !== excluir))
    } catch { toast('Não foi possível remover a resposta rápida.', 'error') } finally { setExcluindo(false); setExcluir(null) }
  }

  const alvo = regras.find((r) => r.id === excluir)

  if (carregando) return <Skeleton className="h-16 w-full bg-[var(--sf2)]" />

  return (
    <div className="space-y-2">
      {!nova && regras.length > 0 && (
        <div className="flex justify-end">
          <Button variant="neutral" size={tam} leftIcon={<Plus className="h-3.5 w-3.5" />} onClick={() => setNova(true)}>Nova resposta</Button>
        </div>
      )}
      {nova && <Formulario inicial={VAZIO} onSalvar={criar} onCancelar={() => setNova(false)} />}
      {regras.length === 0 && !nova && (
        <EmptyState icon={MessageCircleQuestion} title="Nenhuma resposta rápida"
          hint="Saudações, horário de funcionamento, endereço: respostas fixas por palavra-chave, sem gastar IA."
          action={{ label: 'Nova resposta', onClick: () => setNova(true) }} />
      )}
      {regras.map((r) => editando === r.id ? (
        <Formulario key={r.id} inicial={{
          name: r.name, keywords: r.keywords, match_mode: r.match_mode, response_template: r.response_template,
          priority: r.priority, enabled: r.enabled, cooldown_minutes: r.cooldown_minutes,
        }} onSalvar={(d) => editar(r.id, d)} onCancelar={() => setEditando(null)} />
      ) : (
        <div key={r.id} className={cn('flex flex-wrap items-start gap-x-3 gap-y-2 rounded-lg border border-surface-700 bg-[var(--sf2)] px-3.5 py-3', !r.enabled && 'opacity-70')}>
          <div className="min-w-0 flex-1 basis-full sm:basis-auto">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-surface-100">{r.name}</p>
              <span className="text-2xs text-surface-500">{MODO[r.match_mode]}</span>
              {r.cooldown_minutes > 0 && <span className="text-2xs text-surface-500">· não repete por {r.cooldown_minutes} min</span>}
            </div>
            <p className="mt-0.5 truncate font-mono text-xs text-surface-400">
              {r.keywords.slice(0, 6).join(', ')}{r.keywords.length > 6 && ` +${r.keywords.length - 6}`}
            </p>
            <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-surface-300">“{r.response_template}”</p>
          </div>
          <div className="flex w-full items-center justify-end gap-1 sm:w-auto">
          <Switch checked={r.enabled} onChange={() => void alternar(r)} className="mr-1 sm:mt-0.5" />
          <Button variant="ghost" size={tam} iconOnly aria-label={`Editar ${r.name}`} onClick={() => setEditando(r.id)}><Pencil className="h-3.5 w-3.5" /></Button>
          <Button variant="ghost" size={tam} iconOnly aria-label={`Remover ${r.name}`} onClick={() => setExcluir(r.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
          </div>
        </div>
      ))}
      <ConfirmModal open={!!excluir} onClose={() => setExcluir(null)} onConfirm={() => void confirmarExclusao()}
        title="Remover resposta rápida" description="Essas mensagens voltam a ser respondidas pela IA."
        impact={alvo ? { label: `Resposta "${alvo.name}"`, tone: 'danger' } : undefined}
        confirmLabel="Remover" danger loading={excluindo} />
    </div>
  )
}
