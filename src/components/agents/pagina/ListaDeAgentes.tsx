import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Bot, ChevronRight, Copy, ExternalLink, Plus, Search, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { isAgentStale, loadHub } from '@/services/companyContextService'
import { listAgents, type AgentConfig } from '@/services/agentsApi'
import { AgentIcon } from '@/components/agents/AgentIcons'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input } from '@/components/ui/Input'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Skeleton } from '@/components/ui/Skeleton'
import { useContextMenu } from '@/hooks/useContextMenu'
import type { ContextMenuEntry } from '@/components/ui/ContextMenu'
import { useToast } from '@/hooks/useToast'
import { useIsMobile } from '@/hooks/useIsMobile'
import { Button } from '@/components/ui/Button'
import { MobilePageHeader } from '@/components/layout/MobilePageHeader'
import { StatusDoAgente } from './StatusDoAgente'
import './agenteMovel.css'
import { rotaDoAgente } from './secoesDoAgente'

type Filtro = 'todos' | 'ativos' | 'pausados' | 'rascunhos' | 'atencao'
const FILTROS: Filtro[] = ['todos', 'ativos', 'pausados', 'rascunhos', 'atencao']

function relativo(iso: string | null): string {
  if (!iso) return 'nunca'
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000)
  if (min < 1) return 'agora'
  if (min < 60) return `há ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `há ${h} h`
  const d = Math.floor(h / 24)
  return d < 30 ? `há ${d} ${d === 1 ? 'dia' : 'dias'}` : new Date(iso).toLocaleDateString('pt-BR')
}

/** O que pede a atenção de alguém: nunca testado, parado ou com contexto velho. */
function motivosDeAtencao(a: AgentConfig, desatualizado: boolean): string[] {
  const m: string[] = []
  if ((a.test_count ?? 0) === 0) m.push('nunca testado')
  if (a.status === 'paused') m.push('pausado')
  if (desatualizado) m.push('instruções desatualizadas')
  return m
}

function Resumo({ rotulo, valor, detalhe, onClick, ativo }: { rotulo: string; valor: string; detalhe: string; onClick?: () => void; ativo?: boolean }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      {...(onClick ? { type: 'button' as const, onClick, 'aria-pressed': ativo } : {})}
      className={cn(
        'rounded-lg border bg-[var(--sf2)] px-4 py-3 text-left',
        ativo ? 'border-brand-500' : 'border-surface-700',
        onClick && 'hover:bg-[var(--rowhover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
      )}
    >
      <p className="text-3xs font-bold uppercase tracking-[.14em] text-surface-500">{rotulo}</p>
      <p className="mt-1 font-display text-[22px] font-extrabold leading-tight tracking-[-0.02em] text-surface-50 tabular-nums">{valor}</p>
      <p className="mt-0.5 text-xs text-surface-400">{detalhe}</p>
    </Tag>
  )
}

function Linha({ a, desatualizado }: { a: AgentConfig; desatualizado: boolean }) {
  const navigate = useNavigate()
  const { toast } = useToast()
  const abrir = useCallback(() => navigate(rotaDoAgente(a.id)), [navigate, a.id])
  const menu = useCallback((): ContextMenuEntry[] => [
    { label: 'Abrir', icon: ExternalLink, onClick: abrir },
    { label: 'Abrir com o teste', icon: Sparkles, onClick: () => navigate(rotaDoAgente(a.id, undefined, { teste: true })) },
    { label: 'Copiar nome', icon: Copy, onClick: () => { void navigator.clipboard?.writeText(a.name).then(() => toast('Nome copiado.', 'success')).catch(() => {}) } },
  ], [a, abrir, navigate, toast])
  const { onContextMenu } = useContextMenu(menu)
  const numero = a.channels?.whatsapp?.number
  const naoTestado = (a.test_count ?? 0) === 0

  return (
    <tr onClick={abrir} onContextMenu={onContextMenu} className="cursor-pointer hover:bg-[var(--rowhover)]">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <AgentIcon iconId={a.icon} dashed={a.status === 'draft'} className="h-8 w-8" />
          <div className="min-w-0">
            <Link
              to={rotaDoAgente(a.id)}
              onClick={(e) => e.stopPropagation()}
              className="block truncate text-sm font-semibold text-surface-100 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded-xs"
            >
              {a.name}
            </Link>
            {a.objective && <p className="max-w-[40ch] truncate text-xs text-surface-400">{a.objective}</p>}
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-xs text-surface-300 tabular-nums whitespace-nowrap">{numero ?? <span className="text-surface-500">sem número</span>}</td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusDoAgente status={a.status} />
          {desatualizado && (
            <span title="O Contexto da IA mudou depois das instruções" className="inline-flex h-5 items-center rounded-xs border border-status-pending-border bg-status-pending-bg px-[7px] text-2xs font-semibold text-status-pending whitespace-nowrap">
              Desatualizado
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-right text-sm font-semibold text-surface-100 tabular-nums">{a.conversation_count.toLocaleString('pt-BR')}</td>
      <td className="px-4 py-3 text-xs whitespace-nowrap">
        {naoTestado
          ? <span className="font-semibold text-status-pending">Nunca testado</span>
          : <span className="text-surface-300"><span className="tabular-nums">{a.test_count}</span> · último {relativo(a.last_tested_at)}</span>}
      </td>
      <td className="px-4 py-3 text-xs text-surface-400 whitespace-nowrap">{relativo(a.updated_at)}</td>
    </tr>
  )
}

function CartaoMovel({ a, desatualizado }: { a: AgentConfig; desatualizado: boolean }) {
  const numero = a.channels?.whatsapp?.number
  const naoTestado = (a.test_count ?? 0) === 0
  return (
    <li>
      <Link
        to={rotaDoAgente(a.id)}
        className="flex items-center gap-3 px-4 py-3.5 hover:bg-[var(--rowhover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500"
      >
        <AgentIcon iconId={a.icon} dashed={a.status === 'draft'} className="h-10 w-10" />
        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 items-center gap-2">
            <span className="truncate text-sm font-semibold text-surface-100">{a.name}</span>
            <StatusDoAgente status={a.status} />
          </span>
          <span className="mt-0.5 block truncate text-xs text-surface-400">
            {numero ?? 'sem número'}{a.objective ? ` · ${a.objective}` : ''}
          </span>
          <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-2xs text-surface-500 tabular-nums">
            <span>{a.conversation_count.toLocaleString('pt-BR')} conversas</span>
            <span aria-hidden>·</span>
            {naoTestado ? <span className="font-semibold text-status-pending">nunca testado</span> : <span>{a.test_count} testes</span>}
            <span aria-hidden>·</span>
            <span>alterado {relativo(a.updated_at)}</span>
            {desatualizado && <span className="font-semibold text-status-pending">· desatualizado</span>}
          </span>
        </span>
        <ChevronRight className="h-4 w-4 flex-shrink-0 text-surface-500" aria-hidden />
      </Link>
    </li>
  )
}

/**
 * A lista de agentes como tabela de operação (direção D). Números só do que a
 * API já devolve — conversas desde a criação e testes — sem métrica inventada.
 * O status muda na página do agente, não aqui.
 */
export function ListaDeAgentes({ onNovo }: { onNovo: () => void }) {
  const { user } = useAuth()
  const hub = user?.tenantId ? loadHub(user.tenantId) : null
  const { toast } = useToast()
  const [agentes, setAgentes] = useState<AgentConfig[] | null>(null)
  const [busca, setBusca] = useState('')
  const [params, setParams] = useSearchParams()
  const filtro: Filtro = FILTROS.includes(params.get('filtro') as Filtro) ? params.get('filtro') as Filtro : 'todos'
  const movel = useIsMobile()
  // Celular: a casca móvel não tem barra de topo — a página traz o cabeçalho
  // (com o botão de novo agente) e rola por baixo dele.
  const casca = (conteudo: ReactNode) => movel ? (
    <div className="pagina-agente flex min-w-0 flex-1 flex-col min-h-0">
      <MobilePageHeader
        title="Agentes IA"
        rightActions={
          <Button size="md" iconOnly aria-label="Novo agente" onClick={onNovo}>
            <Plus className="h-[18px] w-[18px]" />
          </Button>
        }
      />
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">{conteudo}</div>
    </div>
  ) : (
    <div className="pagina-agente min-w-0 flex-1 overflow-y-auto">{conteudo}</div>
  )

  useEffect(() => {
    let vivo = true
    listAgents()
      .then((l) => { if (vivo) setAgentes(l) })
      .catch(() => { if (vivo) { setAgentes([]); toast('Não foi possível carregar os agentes.', 'error') } })
    return () => { vivo = false }
  }, [toast])

  const setFiltro = (f: Filtro) => setParams((prev) => {
    const n = new URLSearchParams(prev)
    if (f === 'todos') n.delete('filtro')
    else n.set('filtro', f)
    return n
  }, { replace: true })

  const lista = useMemo(() => agentes ?? [], [agentes])
  const desatualizado = useCallback((a: AgentConfig) => (hub ? isAgentStale(a.updated_at, hub) : false), [hub])
  const contagem = useMemo(() => ({
    todos: lista.length,
    ativos: lista.filter((a) => a.status === 'active').length,
    pausados: lista.filter((a) => a.status === 'paused').length,
    rascunhos: lista.filter((a) => a.status === 'draft').length,
    atencao: lista.filter((a) => motivosDeAtencao(a, desatualizado(a)).length > 0).length,
  }), [lista, desatualizado])

  const visiveis = useMemo(() => {
    const q = busca.trim().toLowerCase()
    return lista.filter((a) => {
      if (filtro === 'ativos' && a.status !== 'active') return false
      if (filtro === 'pausados' && a.status !== 'paused') return false
      if (filtro === 'rascunhos' && a.status !== 'draft') return false
      if (filtro === 'atencao' && motivosDeAtencao(a, desatualizado(a)).length === 0) return false
      if (!q) return true
      return a.name.toLowerCase().includes(q) || (a.objective ?? '').toLowerCase().includes(q) || (a.channels?.whatsapp?.number ?? '').includes(q)
    })
  }, [lista, filtro, busca, desatualizado])

  if (agentes === null) {
    return casca(
      <div className="px-4 py-5 sm:px-8 sm:py-6" aria-busy="true">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[84px] bg-[var(--sf2)]" />)}</div>
        <Skeleton className="mt-6 h-64 w-full bg-[var(--sf2)]" />
      </div>,
    )
  }

  if (lista.length === 0) {
    return casca(
      <div className="px-4 pt-6 sm:px-8 sm:pt-10">
        <EmptyState
          icon={Bot}
          title="Nenhum agente ainda"
          hint="Um agente atende um número de WhatsApp com as instruções, a base de conhecimento e o catálogo que você der a ele. O assistente de criação leva alguns minutos."
          action={{ label: 'Criar o primeiro agente', onClick: onNovo }}
          className="max-w-lg"
        />
      </div>,
    )
  }

  const conversas = lista.reduce((s, a) => s + a.conversation_count, 0)
  const testados = lista.filter((a) => (a.test_count ?? 0) > 0).length
  const opcoes = [
    { value: 'todos' as const, label: 'Todos', count: contagem.todos },
    { value: 'ativos' as const, label: 'Ativos', count: contagem.ativos },
    ...(contagem.pausados ? [{ value: 'pausados' as const, label: 'Pausados', count: contagem.pausados }] : []),
    ...(contagem.rascunhos ? [{ value: 'rascunhos' as const, label: 'Rascunhos', count: contagem.rascunhos }] : []),
    ...(contagem.atencao ? [{ value: 'atencao' as const, label: 'Precisam de atenção', count: contagem.atencao }] : []),
  ]

  return casca(
      <div className="mx-auto w-full max-w-[1280px] px-4 py-5 sm:px-8 sm:py-6">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Resumo rotulo="Ligados" valor={`${contagem.ativos} de ${lista.length}`} detalhe="atendendo agora" />
          <Resumo rotulo="Conversas atendidas" valor={conversas.toLocaleString('pt-BR')} detalhe="somando todos, desde a criação" />
          <Resumo rotulo="Testados" valor={`${testados} de ${lista.length}`} detalhe="com ao menos uma conversa de teste" />
          <Resumo
            rotulo="Precisam de atenção"
            valor={String(contagem.atencao)}
            detalhe={contagem.atencao ? 'nunca testados, pausados ou desatualizados' : 'nada pendente'}
            onClick={contagem.atencao ? () => setFiltro(filtro === 'atencao' ? 'todos' : 'atencao') : undefined}
            ativo={filtro === 'atencao'}
          />
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          {/* No celular os filtros rolam de lado em vez de quebrar linha. */}
          <div className="-mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:overflow-visible sm:px-0 sm:pb-0">
            <SegmentedControl label="Filtrar agentes" options={opcoes} value={filtro} onChange={setFiltro} size={movel ? '32' : 'sm'} />
          </div>
          <div className="relative w-full sm:ml-auto sm:max-w-xs">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-surface-500" aria-hidden />
            <Input size={movel ? 'md' : 'sm'} aria-label="Buscar agente" placeholder="Buscar por nome, objetivo ou número" value={busca} onChange={(e) => setBusca(e.target.value)} className="pl-8" />
          </div>
        </div>

        {movel ? (
          <ul className="mt-3 divide-y divide-surface-700 overflow-hidden rounded-lg border border-surface-700 bg-[var(--sf2)]">
            {visiveis.map((a) => <CartaoMovel key={a.id} a={a} desatualizado={desatualizado(a)} />)}
            {visiveis.length === 0 && (
              <li className="px-4 py-8 text-center text-sm text-surface-400">Nenhum agente com esse filtro{busca ? ' e essa busca' : ''}.</li>
            )}
          </ul>
        ) : (
        <div className="mt-3 overflow-x-auto rounded-lg border border-surface-700">
          <table className="w-full min-w-[820px]">
            <caption className="sr-only">Agentes de IA</caption>
            <thead className="bg-[var(--sf2)] text-left text-3xs font-bold uppercase tracking-[.1em] text-surface-500">
              <tr>
                <th scope="col" className="px-4 py-2.5">Agente</th>
                <th scope="col" className="px-4 py-2.5">Número</th>
                <th scope="col" className="px-4 py-2.5">Status</th>
                <th scope="col" className="px-4 py-2.5 text-right">Conversas</th>
                <th scope="col" className="px-4 py-2.5">Testes</th>
                <th scope="col" className="px-4 py-2.5">Alterado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-700">
              {visiveis.map((a) => <Linha key={a.id} a={a} desatualizado={desatualizado(a)} />)}
            </tbody>
          </table>
          {visiveis.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-surface-400">Nenhum agente com esse filtro{busca ? ' e essa busca' : ''}.</p>
          )}
        </div>
        )}
      </div>,
  )
}
