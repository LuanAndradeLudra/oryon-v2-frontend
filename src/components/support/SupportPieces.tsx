import { useState } from 'react'
import { Bell, CheckCircle2, ChevronRight, CircleDot, CircleHelp, Eye, Flag, Layers, Lock, MessageSquare, RotateCcw, Sparkles, ThumbsUp, UserCheck } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ChamadoDaEmpresa, EventoDoChamado, MensagemDoChamado } from '@/types/support'
import './suporte.css'
import { ORIGENS_DA_MENSAGEM } from './origemDaMensagem'
import { dataCurta, type StatusChamado } from './supportModel'
import { STATUS_NA_FILA } from './fila/modeloDaFila'

/**
 * Peças da página Suporte (SCRUM-1383) que a fila da Oryon (SCRUM-1384) vai
 * reaproveitar: as mensagens marcadas no desenho das bolhas e o FIO do
 * chamado (relato, andamento, comentários, perguntas, acessos).
 */

/**
 * As mensagens marcadas no desenho das bolhas do chat, em tamanho de leitura.
 * `destacar` (conversa inteira, na fila da Oryon): as que foram marcadas no chamado.
 */
export function MensagensMarcadas({ mensagens, moldura = true, destacar }: {
  mensagens: MensagemDoChamado[]
  moldura?: boolean
  destacar?: ReadonlySet<string>
}) {
  return (
    <div className={cn('flex flex-col gap-1.5', moldura && 'chat-shell-bg rounded-[8px] border border-surface-800 p-3')}>
      {mensagens.map((m) => {
        const nossa = m.autor !== 'contato'
        const destacada = !!destacar?.has(m.id)
        const quem = m.autor === 'contato' ? 'Contato'
          : m.autorNome ? `${m.autor === 'automacao' ? 'Automação · ' : m.autor === 'regra' ? 'Regra · ' : ''}${m.autorNome}`
          : ORIGENS_DA_MENSAGEM[m.autor]?.nome ?? m.autor
        return (
          <div key={m.id} className={cn('flex flex-col max-w-[85%]', nossa ? 'self-end items-end' : 'self-start items-start')}>
            <div className={cn(
              'px-2.5 py-1.5 rounded-[10px] text-xs leading-[1.45] break-words',
              nossa ? 'bubble-out-surface bg-bubble-out text-bubble-out-fg' : 'bubble-in-elevate bg-bubble-in text-[color:var(--color-bubble-in-fg,#f1f5f9)]',
              destacada && 'ring-2 ring-accent-amber ring-offset-1 ring-offset-surface-900',
            )}>
              <span className={cn('block text-[10.5px] font-semibold mb-0.5', nossa ? 'text-bubble-out-time' : 'text-surface-400')}>
                {quem} · {new Date(m.enviadaEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </span>
              {m.texto}
            </div>
            {destacada && <span className="mt-0.5 text-[10.5px] font-semibold text-accent-amber">marcada no chamado</span>}
          </div>
        )
      })}
    </div>
  )
}

const ICONE_DO_EVENTO: Record<string, LucideIcon> = {
  aberto: Flag, comentario: MessageSquare, resposta: MessageSquare, status: CircleDot, acesso: Eye, pergunta: CircleHelp,
  avaliacao: ThumbsUp, reaberto: RotateCcw, aviso: Bell, nota: Lock, responsavel: UserCheck, problema: Layers, retorno: CheckCircle2,
  // SCRUM-1393: sugestão da IA para a equipe (só a Oryon vê).
  sugestao: Sparkles,
}
/** Falas da EMPRESA (cartão claro); o resto é da Oryon ou do sistema. */
const DA_EMPRESA = new Set(['aberto', 'comentario', 'resposta'])

/** O que o fio usa do chamado — o da empresa ou o da equipe (que traz a visibilidade e os detalhes do evento). */
type EventoNoFio = EventoDoChamado & { visivelParaEmpresa?: boolean; dados?: Record<string, unknown> | null }
type ChamadoNoFio = Pick<ChamadoDaEmpresa, 'complemento' | 'tipoDePedido' | 'descricao' | 'oQueSeriaCerto' | 'origemDoProblema'> & { eventos: EventoNoFio[] }

/**
 * Um fio só: o relato (1º item), andamento, comentários, perguntas e acessos
 * à conversa. A empresa recebe só o que é visível para ela (o backend filtra:
 * nota interna nunca chega aqui). `interno`, na fila da Oryon, marca as notas
 * e mostra o status com o nome da equipe (triado ≠ investigando).
 */
export function FioDoChamado({ c, interno = false, titulo = 'Conversa com a Oryon', emDestaque = null }: {
  c: ChamadoNoFio
  interno?: boolean
  titulo?: string | null
  /** Evento cujo texto já aparece em destaque acima do fio (a resposta da Oryon): aqui, só a menção. */
  emDestaque?: string | null
}) {
  const eventos = c.eventos
  return (
    <div className="flex flex-col gap-2">
      {titulo && <h3 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-surface-400">{titulo}</h3>}
      <ol className="flex flex-col">
        {eventos.map((e, i) => (
          interno && e.autorTipo === 'sistema'
            ? <ItemDoSistema key={e.id} e={e} ultimo={i === eventos.length - 1} />
            : <ItemDoFio key={e.id} c={c} e={e} ultimo={i === eventos.length - 1} interno={interno} destacado={e.id === emDestaque} />
        ))}
      </ol>
    </div>
  )
}

/**
 * Evento do SISTEMA na fila (prioridade sugerida, evidência anexada, aviso de
 * prazo): uma linha compacta, com o detalhe a um clique (revisão de UX de
 * 27/10) — misturados à conversa, com o mesmo peso, eles escondiam as falas.
 */
function ItemDoSistema({ e, ultimo }: { e: EventoNoFio; ultimo: boolean }) {
  const [aberto, setAberto] = useState(false)
  const Icone = ICONE_DO_EVENTO[e.tipo] ?? CircleDot
  return (
    <li className="grid grid-cols-[28px_1fr] gap-3 relative pb-2.5 last:pb-0">
      {!ultimo && <span aria-hidden className="absolute left-[13px] top-5 bottom-0 w-px bg-surface-700" />}
      <span aria-hidden className="w-7 h-5 flex items-center justify-center text-surface-500"><Icone className="w-3 h-3" /></span>
      <div className="min-w-0">
        <button type="button" onClick={() => setAberto((v) => !v)} aria-expanded={e.corpo ? aberto : undefined} disabled={!e.corpo}
          className="max-w-full flex items-center gap-1.5 text-left text-[12px] text-surface-400 enabled:hover:text-surface-200 disabled:cursor-default">
          {e.corpo && <ChevronRight className={cn('w-3 h-3 flex-shrink-0 transition-transform', aberto && 'rotate-90')} aria-hidden />}
          <span className="truncate">{e.texto}</span>
          <span className="flex-shrink-0 text-[11px] text-surface-500">· {dataCurta(e.em)}</span>
        </button>
        {aberto && e.corpo && (
          <div className="mt-1.5 text-[12px] text-surface-300 rounded-[8px] border border-dashed border-surface-600 px-2.5 py-2 whitespace-pre-wrap break-words">{e.corpo}</div>
        )}
      </div>
    </li>
  )
}

function ItemDoFio({ c, e, ultimo, interno, destacado = false }: { c: ChamadoNoFio; e: EventoNoFio; ultimo: boolean; interno: boolean; destacado?: boolean }) {
  const Icone = ICONE_DO_EVENTO[e.tipo] ?? CircleDot
  const nota = e.visivelParaEmpresa === false
  // Revisão de UX de 27/10: a resposta em destaque no topo não se repete inteira no fio.
  const corpo = e.tipo === 'aberto' ? <RelatoNoFio c={c} />
    : destacado ? <span className="text-surface-400">A resposta está em destaque acima.</span>
    : e.corpo
  const para = interno && e.tipo === 'status' && typeof e.dados?.para === 'string' ? e.dados.para as StatusChamado : null
  const texto = para && STATUS_NA_FILA[para] ? `Status: ${STATUS_NA_FILA[para]}` : e.texto
  return (
    <li className="grid grid-cols-[28px_1fr] gap-3 relative pb-4 last:pb-0">
      {!ultimo && <span aria-hidden className="absolute left-[13px] top-7 bottom-0 w-px bg-surface-700" />}
      <span aria-hidden className={cn('w-7 h-7 rounded-full flex items-center justify-center border bg-surface-900',
        e.tipo === 'acesso' ? 'border-accent-amber/50 text-accent-amber' : nota ? 'border-dashed border-surface-500 text-surface-400' : 'border-[var(--bd2)] text-surface-300')}>
        <Icone className="w-3.5 h-3.5" />
      </span>
      <div className="min-w-0 pt-0.5">
        <p className="text-[13px] text-surface-100 flex flex-wrap items-center gap-x-2">
          <b className="font-semibold">{texto}</b>
          {interno && nota && <span className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-surface-400">só Oryon</span>}
        </p>
        <p className="text-[11px] text-surface-400">{e.autor} · {dataCurta(e.em)}</p>
        {corpo && (
          <div className={cn('mt-2 text-[13px] text-surface-100 rounded-[10px] border px-3 py-2.5 whitespace-pre-wrap break-words',
            nota ? 'border-dashed border-surface-500 bg-transparent' : DA_EMPRESA.has(e.tipo) ? 'border-[var(--bd2)] bg-[var(--sup-cartao-bg)]' : 'border-[var(--bd2)] bg-surface-900')}>
            {corpo}
          </div>
        )}
      </div>
    </li>
  )
}

/** O relato de quem abriu, como primeira fala do fio. */
function RelatoNoFio({ c }: { c: ChamadoNoFio }) {
  return (
    <div className="flex flex-col gap-2">
      {c.complemento && c.tipoDePedido === 'defeito' && (
        <p className="text-surface-300"><span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-surface-400 block">Estava tentando</span>{c.complemento}</p>
      )}
      <p>{c.descricao || 'Sem descrição'}</p>
      {c.complemento && c.tipoDePedido === 'sugestao' && (
        <p className="text-surface-300"><span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-surface-400 block">Por que ajudaria</span>{c.complemento}</p>
      )}
      {c.oQueSeriaCerto && (
        <p className="text-surface-300">
          <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-surface-400 block">{c.origemDoProblema === 'ia' ? 'Resposta certa' : 'O que deveria ter acontecido'}</span>
          {c.oQueSeriaCerto}
        </p>
      )}
    </div>
  )
}
