import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent as TeclaDoReact } from 'react'
import { motion } from 'framer-motion'
import { ChevronDown, Search, Sparkles, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TROCA_ENCAIXADA } from './paineisEncaixados'
import type { Catalogo, GrupoDoPasso, PassoDoCatalogo } from '@/services/jornadas/tipos'
import { ROTULO_DO_GRUPO } from '@/services/jornadas/catalogo'
import { COR_DO_GRUPO, tomDaCor } from './categorias'
import { IconeDoPasso } from './IconeDoPasso'

/**
 * O "Adicionar passo" em LISTA LATERAL (modelo 1 escolhido pelo João, 16/11,
 * como o HubSpot): abre à direita, no mesmo lugar da gaveta do passo, então o
 * desenho continua à vista e, ao escolher, a mesma gaveta vira a configuração
 * do passo novo. Do modelo 2 vieram o "Sugeridos aqui" (conforme o passo
 * anterior) e as fichas de categoria no topo. Busca com o cursor já nela, setas
 * para andar, Enter para escolher, Esc para fechar; o custo de IA aparece na
 * linha e o que ainda não existe fica recolhido em "Em breve", no fim. Os
 * itens também podem ser arrastados até o desenho.
 */

export const TIPO_ARRASTADO = 'application/x-oryon-passo'
const ORDEM: GrupoDoPasso[] = ['mensagem', 'controle', 'conversa', 'crm', 'integracao', 'ia']

/** O que costuma vir depois de cada passo (chave: tipo do passo anterior, ou "tipo:saída"). */
const SUGESTOES: Record<string, string[]> = {
  entrada: ['send_template', 'wait', 'branch', 'wait_event'],
  send_template: ['wait_event', 'branch_message_status', 'hold_conversation', 'wait'],
  send_and_wait: ['send_text', 'connector_call', 'ask_question', 'notify_team'],
  'send_and_wait:sem_resposta': ['notify_team', 'send_template', 'handoff_human', 'exit'],
  ask_question: ['branch', 'set_field', 'send_text', 'notify_team'],
  branch_message_status: ['send_template', 'notify_team', 'handoff_human', 'exit'],
  'branch_message_status:nao_chegou': ['notify_team', 'handoff_human', 'tag', 'exit'],
  send_text: ['wait_event', 'wait', 'notify_team', 'exit'],
  hold_conversation: ['wait_event', 'send_template', 'wait', 'send_text'],
  wait_event: ['send_text', 'connector_call', 'handoff_agent', 'notify_team'],
  'wait_event:sem_resposta': ['notify_team', 'send_template', 'handoff_human', 'exit'],
  wait: ['send_template', 'branch', 'send_text', 'connector_call'],
  branch: ['send_template', 'tag', 'notify_team', 'exit'],
  connector_call: ['send_text', 'branch', 'goal', 'notify_team'],
  ai_classify: ['send_text', 'handoff_human', 'tag', 'notify_team'],
  ai_extract: ['set_field', 'branch', 'send_text', 'notify_team'],
  ai_summarize: ['notify_team', 'internal_note', 'handoff_human', 'exit'],
  ai_mission: ['goal', 'exit', 'notify_team', 'tag'],
  notify_team: ['exit', 'wait', 'wait_event', 'goal'],
  handoff_agent: ['exit', 'wait', 'goal', 'notify_team'],
  handoff_human: ['exit', 'wait', 'goal', 'tag'],
  tag: ['exit', 'wait', 'send_template', 'branch'],
  set_stage: ['exit', 'wait', 'send_template', 'notify_team'],
  set_field: ['exit', 'branch', 'send_template', 'wait'],
}
const MAIS_USADOS = ['send_template', 'wait', 'branch', 'notify_team']

/**
 * Fora da lista (P1, 17/11): "Enviar e esperar resposta" vem pelo "Enviar modelo" ("E depois de
 * enviar? Esperar a resposta"). Um jeito só de mandar e seguir pela resposta; o tipo continua no catálogo.
 */
const FORA_DA_LISTA = new Set(['send_and_wait'])

type Filtro = 'todos' | GrupoDoPasso
interface Item { chave: string; passo: PassoDoCatalogo }

export function SeletorDePasso({ catalogo, titulo, dica, depoisDe, saida, onEscolher, onFechar, className, encaixado }: {
  catalogo: Catalogo
  /** Onde o "+" foi clicado (a lista abre sempre à direita; mantido para quem chama). */
  ponto?: { x: number; y: number }
  area?: DOMRect
  titulo: string
  /** Uma linha dizendo onde o passo vai entrar. */
  dica?: string
  /** O tipo do passo anterior ("entrada" para a Entrada), para as sugestões. */
  depoisDe?: string
  /** A saída do passo anterior de onde o novo sai. */
  saida?: string
  onEscolher: (type: string) => void
  onFechar: () => void
  /** Painéis encaixados: ocupa a vaga ao lado do desenho. */
  className?: string
  /** Encaixado: entra e sai só com um fade curto (troca com o painel do passo na mesma vaga). */
  encaixado?: boolean
}) {
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [emBreveAberto, setEmBreveAberto] = useState(false)
  const [ativo, setAtivo] = useState(0)
  const buscaRef = useRef<HTMLInputElement>(null)
  const listaRef = useRef<HTMLDivElement>(null)
  const termo = busca.trim().toLowerCase()

  const casa = (s: PassoDoCatalogo) => !termo || s.label.toLowerCase().includes(termo) || s.description.toLowerCase().includes(termo) || ROTULO_DO_GRUPO[s.group].toLowerCase().includes(termo)
  const disponiveis = catalogo.steps.filter((s) => s.availability === 'available' && !FORA_DA_LISTA.has(s.type))
  const emBreve = catalogo.steps.filter((s) => s.availability !== 'available' && casa(s) && (filtro === 'todos' || s.group === filtro))
  const porTipo = new Map(catalogo.steps.map((s) => [s.type, s]))

  // A primeira seção: sugeridos para este ponto do desenho, ou os mais usados.
  const chaveDaSugestao = saida && depoisDe && SUGESTOES[`${depoisDe}:${saida}`] ? `${depoisDe}:${saida}` : depoisDe
  const sugeridos = (chaveDaSugestao && SUGESTOES[chaveDaSugestao]) || null
  const destaque = !termo && filtro === 'todos'
    ? (sugeridos ?? MAIS_USADOS).map((t) => porTipo.get(t)).filter((s): s is PassoDoCatalogo => !!s && s.availability === 'available' && !FORA_DA_LISTA.has(s.type)).slice(0, 4)
    : []

  const secoes: { id: string; titulo: string; itens: Item[] }[] = []
  if (destaque.length) secoes.push({ id: 'destaque', titulo: sugeridos ? 'Sugeridos aqui' : 'Mais usados', itens: destaque.map((p) => ({ chave: `d:${p.type}`, passo: p })) })
  for (const g of ORDEM) {
    if (filtro !== 'todos' && filtro !== g) continue
    const itens = disponiveis.filter((s) => s.group === g && casa(s)).map((p) => ({ chave: `${g}:${p.type}`, passo: p }))
    if (itens.length) secoes.push({ id: g, titulo: ROTULO_DO_GRUPO[g], itens })
  }
  const plano = secoes.flatMap((s) => s.itens)
  const atual = plano[Math.min(ativo, plano.length - 1)]

  useLayoutEffect(() => { buscaRef.current?.focus() }, [])
  useEffect(() => {
    listaRef.current?.querySelector<HTMLElement>('[data-ativo="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [ativo])
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onFechar() } }
    document.addEventListener('keydown', tecla, true)
    return () => document.removeEventListener('keydown', tecla, true)
  }, [onFechar])

  const andar = (passo: number) => setAtivo((a) => Math.max(0, Math.min(plano.length - 1, a + passo)))
  const teclas = (e: TeclaDoReact<HTMLInputElement>) => {
    if (e.key === 'Enter' && atual) { e.preventDefault(); onEscolher(atual.passo.type) }
    else if (e.key === 'ArrowDown') { e.preventDefault(); andar(1) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); andar(-1) }
  }

  const fichas: { id: Filtro; rotulo: string }[] = [{ id: 'todos', rotulo: 'Todos' }, ...ORDEM.map((g) => ({ id: g, rotulo: g === 'ia' ? 'IA' : ROTULO_DO_GRUPO[g] }))]

  return (
    <motion.aside
      {...(encaixado ? TROCA_ENCAIXADA : {
        initial: { opacity: 0, x: 28 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: 28 },
        transition: { duration: 0.22, ease: [0.2, 0.8, 0.2, 1] },
      })}
      role="dialog"
      aria-label={titulo}
      className={cn('jt-painel absolute z-30 top-3 right-3 bottom-3 w-[440px] max-w-[calc(100%-24px)] flex flex-col min-h-0 overflow-hidden rounded-[14px] border border-surface-700 bg-[var(--jt-moldura)] shadow-[0_16px_40px_rgba(0,0,0,0.32)] [--jt-fundo-selo:var(--jt-moldura)]', className)}
    >
      <div className="shrink-0 px-4 pt-4 pb-3 space-y-3 border-b border-surface-700">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[16px] font-semibold text-surface-50">{titulo}</p>
            {dica && <p className="mt-0.5 text-[12px] leading-snug text-surface-400">{dica}</p>}
          </div>
          <button type="button" onClick={onFechar} aria-label="Fechar (Esc)" title="Fechar (Esc)" className="inline-flex shrink-0 items-center justify-center w-8 h-8 rounded-[8px] text-surface-400 hover:bg-[var(--rowhover)] hover:text-surface-100 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" aria-hidden />
          <input
            ref={buscaRef}
            value={busca}
            onChange={(e) => { setBusca(e.target.value); setAtivo(0) }}
            onKeyDown={teclas}
            placeholder="Buscar passo: mensagem, esperar, etiqueta, IA…"
            aria-label="Buscar passo"
            aria-activedescendant={atual ? `passo-${atual.chave}` : undefined}
            className="w-full h-10 rounded-[9px] border border-[var(--jt-borda-campo)] bg-[var(--jt-moldura)] pl-9 pr-3 text-[14px] text-surface-100 placeholder:text-surface-500 focus:outline-none focus:border-brand-500"
          />
        </div>
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Categoria">
          {fichas.map((f) => {
            const ligada = filtro === f.id
            const tom = f.id === 'todos' ? 'ardosia' : COR_DO_GRUPO[f.id]
            return (
              <button key={f.id} type="button" role="radio" aria-checked={ligada} onClick={() => { setFiltro(f.id); setAtivo(0); buscaRef.current?.focus() }}
                style={ligada ? tomDaCor(tom) : undefined}
                className={cn('inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-[12px] font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
                  ligada ? 'font-semibold' : 'bg-[var(--jt-opcao)] ring-1 ring-inset ring-[var(--jt-borda-opcao)] text-surface-300 hover:text-surface-50 hover:bg-[var(--rowhover)]')}>
                {f.id !== 'todos' && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: `var(--jt-${tom}-no)` }} aria-hidden />}
                {f.rotulo}
              </button>
            )
          })}
        </div>
      </div>

      <div ref={listaRef} className="flex-1 min-h-0 overflow-y-auto px-2 py-2" role="listbox" aria-label="Passos">
        {plano.length === 0 && <p className="px-3 py-8 text-center text-[14px] text-surface-400">Nenhum passo com "{busca}".</p>}
        {secoes.map((secao) => (
          <section key={secao.id} className="mb-2">
            <p className="px-3 pt-2 pb-1 text-[12px] font-semibold text-surface-400">{secao.titulo}</p>
            {secao.itens.map((it) => (
              <Linha key={it.chave} id={`passo-${it.chave}`} passo={it.passo} ativo={atual?.chave === it.chave}
                onPassar={() => setAtivo(plano.findIndex((p) => p.chave === it.chave))}
                onEscolher={() => onEscolher(it.passo.type)} />
            ))}
          </section>
        ))}
        {emBreve.length > 0 && (
          <section className="mb-2">
            <button type="button" onClick={() => setEmBreveAberto((a) => !a)} aria-expanded={emBreveAberto}
              className="inline-flex items-center gap-1 px-3 pt-2 pb-1 text-[12px] font-semibold text-surface-400 hover:text-surface-200 cursor-pointer">
              Em breve ({emBreve.length})
              <ChevronDown className={cn('w-3.5 h-3.5 transition-transform duration-200', emBreveAberto && 'rotate-180')} aria-hidden />
            </button>
            {emBreveAberto && <div className="jornadas-aparecer">{emBreve.map((p) => <Linha key={p.type} id={`passo-breve-${p.type}`} passo={p} emBreve />)}</div>}
          </section>
        )}
      </div>

      <div className="shrink-0 flex items-center gap-3 border-t border-surface-700 px-4 h-10 text-[12px] text-surface-500">
        <span><Tecla>↑</Tecla><Tecla>↓</Tecla> andar</span>
        <span><Tecla>Enter</Tecla> escolher</span>
        <span className="ml-auto">Ou arraste até o desenho</span>
      </div>
    </motion.aside>
  )
}

function Tecla({ children }: { children: string }) {
  return <kbd className="mr-1 inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-[4px] bg-[var(--jt-poco)] font-sans text-[12px] text-surface-300">{children}</kbd>
}

/** Uma linha da lista: ícone da galeria, nome, custo de IA e duas linhas do que faz. */
function Linha({ id, passo, ativo, emBreve, onPassar, onEscolher }: {
  id: string
  passo: PassoDoCatalogo
  ativo?: boolean
  emBreve?: boolean
  onPassar?: () => void
  onEscolher?: () => void
}) {
  return (
    <button
      id={id}
      type="button"
      role="option"
      aria-selected={!!ativo}
      data-ativo={ativo ? 'true' : undefined}
      disabled={emBreve}
      draggable={!emBreve}
      onDragStart={(e) => { e.dataTransfer.setData(TIPO_ARRASTADO, passo.type); e.dataTransfer.effectAllowed = 'move' }}
      onMouseEnter={onPassar}
      onClick={onEscolher}
      className={cn(
        'w-full flex items-start gap-3 rounded-[10px] px-3 py-2.5 text-left transition-colors duration-150',
        emBreve ? 'cursor-not-allowed opacity-55' : 'cursor-pointer',
        ativo ? 'bg-[var(--rowhover)]' : !emBreve && 'hover:bg-[var(--rowhover)]',
      )}
    >
      <IconeDoPasso tipo={passo.type} grupo={passo.group} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 min-w-0">
          <span className="truncate text-[14px] font-semibold text-surface-50">{passo.label}</span>
          {emBreve
            ? <span className="shrink-0 text-[12px] font-medium text-surface-500">Em breve</span>
            : passo.cost.credits > 0 && (
              <span className="inline-flex shrink-0 items-center gap-0.5 text-[12px] font-medium jt-texto-violeta" title={passo.cost.label}>
                <Sparkles className="w-3 h-3" aria-hidden />{passo.cost.credits.toLocaleString('pt-BR')} crédito{passo.cost.credits > 1 ? 's' : ''}
              </span>
            )}
        </span>
        <span className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-surface-400">{passo.description}</span>
      </span>
    </button>
  )
}
