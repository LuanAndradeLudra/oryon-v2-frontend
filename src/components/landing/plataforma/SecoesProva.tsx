import type { ReactNode } from 'react'
import { Check, Info, Hash, AtSign, Smartphone } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Switch } from '@/components/ui/Switch'
import { NotificationItem } from '@/components/notifications/NotificationItem'
import { ConversationItem } from '@/components/conversations/ConversationList/ConversationItem'
import { PERMISSION_GROUPS } from '@/components/settings/sections/Departments'
import { roleLabel } from '@/lib/roleHelpers'
import type { AppNotification } from '@/hooks/useNotifications'
import type { Conversation } from '@/types'
import { hoursAgo, minutesAgo } from '../stage/hero/heroClock'
import { HERO, HERO_LINE, HERO_USER, heroConversations, heroNotifications } from '../stage/hero/heroRealData'
import { ConteudoWhatsAppAparelho } from '../stage/hero/HeroSatelitesConteudo'
import { area, equipe, resposta } from '../landingCopy'
import { Revelar, Cabecalho } from './SecoesVenda'

/**
 * As três seções de PROVA (26/09, rodada b) — as objeções que a Plataforma não
 * quebra: "serve para mim?", "perco o controle?", "e se ninguém responder?".
 *
 * Cada visual é o componente REAL do produto com dados fictícios (a
 * notificação, a linha da lista de conversas, o interruptor de permissão, o
 * WhatsApp da paciente) ou os rótulos reais do produto (as permissões dos
 * setores vêm de `PERMISSION_GROUPS`, os papéis de `roleLabel`). Nada aqui é
 * uma tela inventada.
 */

const NOOP = () => {}

/** Cartão de prova: o visual do produto em cima (aria-hidden), a frase embaixo. */
function Prova({ visual, titulo, texto, atraso = 0, alturaVisual = 'min-h-[176px]' }: {
  visual: ReactNode; titulo: string; texto: string; atraso?: number; alturaVisual?: string
}) {
  return (
    <Revelar atraso={atraso} className="flex min-w-0">
      <div className="flex w-full flex-col overflow-hidden rounded-2xl bg-[var(--landing-cartao)] ring-1 ring-[var(--landing-borda)]">
        <div className={cn('flex flex-1 flex-col justify-center border-b border-[var(--landing-borda)] bg-surface-950 py-2', alturaVisual)}>
          <div aria-hidden inert className="pointer-events-none select-none [zoom:0.8]">{visual}</div>
        </div>
        <div className="px-5 pb-4 pt-3.5">
          <p className="text-[12px] font-semibold text-surface-50">{titulo}</p>
          <p className="mt-1 text-[12px] leading-relaxed text-surface-400">{texto}</p>
        </div>
      </div>
    </Revelar>
  )
}

// ─── Para a sua área ─────────────────────────────────────────────────────────

export function SecaoArea() {
  return (
    <section id="area" data-section="area" className="relative border-t border-[var(--landing-borda)] bg-surface-950 py-20 sm:py-28">
      <div className="landing-container">
        <Cabecalho eyebrow={area.eyebrow} titulo={area.title} cinza={area.titleCinza} />
        <Revelar atraso={0.1}>
          <p className="mt-3 max-w-[62ch] text-[12px] sm:text-[12.5px] leading-relaxed text-surface-400 text-pretty">{area.lead}</p>
        </Revelar>

        <div className="mt-10 grid gap-4 lg:grid-cols-[1.3fr_1fr] lg:gap-5">
          {/* O caso completo: a clínica da demonstração, com o WhatsApp real ao lado do que a IA faz. */}
          <Revelar atraso={0.15} className="flex min-w-0">
            <div className="flex w-full flex-col rounded-2xl bg-[var(--landing-cartao)] p-6 ring-1 ring-[var(--landing-borda)] sm:p-7">
              <p className="inline-flex w-fit rounded-full bg-brand-500/10 px-2.5 py-1 text-[11px] font-semibold text-[var(--landing-destaque)] ring-1 ring-brand-500/20">{area.caso.rotulo}</p>
              <h3 className="mt-3.5 font-display text-[clamp(0.98rem,1.33vw,1.27rem)] font-semibold leading-[1.15] tracking-[-0.022em] text-surface-50">{area.caso.titulo}</h3>
              <p className="mt-2 max-w-[52ch] text-[12px] leading-relaxed text-surface-400">{area.caso.texto}</p>
              <div className="mt-6 grid gap-6 sm:grid-cols-[1fr_auto] sm:items-center">
                <ul className="space-y-2.5">
                  {area.caso.itens.map((it) => (
                    <li key={it} className="flex items-start gap-2.5 text-[12px] leading-snug text-surface-200">
                      <Check className="mt-[2px] h-3.5 w-3.5 flex-shrink-0 text-[var(--landing-destaque)]" strokeWidth={2.2} aria-hidden />
                      <span>{it}</span>
                    </li>
                  ))}
                </ul>
                {/* O WhatsApp da paciente, no fim da história (a consulta confirmada). */}
                <div aria-hidden inert className="pointer-events-none mx-auto flex h-[292px] w-[236px] select-none items-end justify-center overflow-hidden rounded-[26px] bg-[#EFEAE2] ring-1 ring-[var(--landing-borda)] sm:mx-0">
                  <div className="-mb-[22px] [zoom:1.01]" style={{ width: 234, height: 456 }}><ConteudoWhatsAppAparelho at="ganho" cena="conversa" /></div>
                </div>
              </div>
              <p className="mt-5 flex items-start gap-2 text-[11.5px] leading-snug text-surface-500">
                <Info className="mt-[1px] h-3.5 w-3.5 flex-shrink-0" aria-hidden />
                <span>{area.caso.nota}</span>
              </p>
            </div>
          </Revelar>

          {/* Os outros segmentos: cenários, com a pergunta que chega no WhatsApp. */}
          <div className="flex min-w-0 flex-col gap-4">
            {area.cenarios.map((c, i) => (
              <Revelar key={c.titulo} atraso={0.2 + i * 0.08} className="flex flex-1">
                <div className="flex w-full flex-col rounded-2xl bg-[var(--landing-cartao)] p-5 ring-1 ring-[var(--landing-borda)]">
                  <p className="text-[12px] font-semibold text-surface-50">{c.titulo}</p>
                  <p aria-hidden className="mt-2.5 w-fit max-w-full rounded-2xl rounded-tl-md bg-surface-900 px-3 py-2 text-[11.5px] leading-snug text-surface-200 ring-1 ring-surface-700">{c.exemplo}</p>
                  <p className="mt-2.5 text-[12px] leading-relaxed text-surface-400">{c.texto}</p>
                </div>
              </Revelar>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── A equipe no comando ─────────────────────────────────────────────────────

/** As permissões REAIS do setor (rótulos do produto), como a tela de Setores mostra. */
function VisualSetor() {
  const ligadas = new Set(['read_conversations', 'reply_conversations', 'assign_conversations', 'view_dashboard'])
  const grupos = PERMISSION_GROUPS.slice(0, 2)
  return (
    <div className="mx-auto w-[94%] max-w-[480px] rounded-xl bg-surface-900 p-3 ring-1 ring-surface-700">
      <div className="flex items-center justify-between border-b border-surface-700 pb-2">
        <div>
          <p className="text-[12px] font-semibold text-surface-100">Recepção</p>
          <p className="text-[10.5px] text-surface-500">{HERO_LINE.displayPhoneNumber} · {HERO.agent}</p>
        </div>
        <span className="rounded-full bg-brand-500/15 px-2 py-0.5 text-[10px] font-semibold text-brand-400">3 pessoas</span>
      </div>
      {grupos.map((g) => (
        <div key={g.group} className="mt-2">
          <p className="text-[9.5px] font-semibold uppercase tracking-[.1em] text-surface-500">{g.group}</p>
          {g.perms.map((p) => (
            <div key={p.key} className="flex items-center justify-between py-[3px]">
              <span className="text-[11px] text-surface-200">{p.label}</span>
              <Switch checked={ligadas.has(p.key)} onChange={NOOP} />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

const PAPEIS = [
  { nome: 'Ana Prado', role: 'business_admin', cor: 'bg-brand-500' },
  { nome: 'Carla Mendes', role: 'admin', cor: 'bg-violet-500' },
  { nome: 'Bruno Lima', role: 'supervisor', cor: 'bg-sky-500' },
  { nome: 'Diego Souza', role: 'agent', cor: 'bg-amber-500' },
]

function VisualPapeis() {
  return (
    <div className="mx-auto w-[94%] max-w-[480px] divide-y divide-surface-700 rounded-xl bg-surface-900 ring-1 ring-surface-700">
      {PAPEIS.map((p) => (
        <div key={p.nome} className="flex items-center gap-3 px-3 py-2">
          <span className={cn('flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white', p.cor)}>
            {p.nome.split(' ').map((n) => n[0]).join('')}
          </span>
          <span className="flex-1 text-[11.5px] font-medium text-surface-100">{p.nome}</span>
          <span className="rounded-full bg-surface-800 px-2 py-0.5 text-[10px] font-semibold text-surface-300 ring-1 ring-surface-700">{roleLabel(p.role)}</span>
        </div>
      ))}
    </div>
  )
}

const AUDITORIA = [
  { quem: 'Carla Mendes', oque: 'alterou as permissões do setor Recepção', quando: 'há 12 min' },
  { quem: 'Ana Prado', oque: `criou a etiqueta "${HERO.tag}"`, quando: 'há 1 h' },
  { quem: 'Bruno Lima', oque: `atualizou as instruções do ${HERO.agent}`, quando: 'ontem' },
]

function VisualAuditoria() {
  return (
    <div className="mx-auto w-[94%] max-w-[480px] divide-y divide-surface-700 rounded-xl bg-surface-900 ring-1 ring-surface-700">
      {AUDITORIA.map((a) => (
        <div key={a.oque} className="flex items-start gap-2.5 px-3 py-2">
          <span className="mt-[5px] h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand-400" />
          <p className="flex-1 text-[11px] leading-snug text-surface-300"><span className="font-semibold text-surface-100">{a.quem}</span> {a.oque}</p>
          <span className="whitespace-nowrap text-[10px] text-surface-500">{a.quando}</span>
        </div>
      ))}
    </div>
  )
}

function VisualChat() {
  return (
    <div className="mx-auto w-[94%] max-w-[480px] rounded-xl bg-surface-900 ring-1 ring-surface-700">
      <div className="flex gap-1.5 border-b border-surface-700 px-3 py-2">
        {['recepcao', 'exames', 'geral'].map((c, i) => (
          <span key={c} className={cn('inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10.5px] font-medium', i === 0 ? 'bg-surface-800 text-surface-100' : 'text-surface-500')}>
            <Hash className="h-3 w-3" aria-hidden />{c}
          </span>
        ))}
      </div>
      <div className="space-y-2 px-3 py-2.5">
        <div className="flex items-start gap-2">
          <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand-500 text-[9px] font-bold text-white">AP</span>
          <p className="text-[11px] leading-snug text-surface-200"><span className="font-semibold text-surface-100">Ana Prado</span> <span className="rounded bg-brand-500/15 px-1 text-brand-300"><AtSign className="inline h-2.5 w-2.5" aria-hidden />Carla</span> consegue cobrir o encaixe das nove com a Dra. Helena?</p>
        </div>
        <div className="flex items-start gap-2">
          <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-violet-500 text-[9px] font-bold text-white">CM</span>
          <p className="text-[11px] leading-snug text-surface-200"><span className="font-semibold text-surface-100">Carla Mendes</span> Consigo. Já deixei a sala separada.</p>
        </div>
      </div>
    </div>
  )
}

const VISUAIS_EQUIPE: Record<string, () => ReactNode> = {
  setores: () => <VisualSetor />,
  papeis: () => <VisualPapeis />,
  auditoria: () => <VisualAuditoria />,
  chat: () => <VisualChat />,
}

export function SecaoEquipe() {
  return (
    <section id="equipe-no-comando" data-section="equipe" className="relative border-t border-[var(--landing-borda)] bg-surface-950 py-20 sm:py-28">
      <div className="landing-container">
        <Cabecalho eyebrow={equipe.eyebrow} titulo={equipe.title} cinza={equipe.titleCinza} />
        <Revelar atraso={0.1}>
          <p className="mt-3 max-w-[62ch] text-[12px] sm:text-[12.5px] leading-relaxed text-surface-400 text-pretty">{equipe.lead}</p>
        </Revelar>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:gap-5">
          {equipe.cartoes.map((c, i) => (
            <Prova key={c.key} atraso={0.1 + i * 0.08} titulo={c.titulo} texto={c.texto} visual={VISUAIS_EQUIPE[c.key]()} />
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Nada fica sem resposta ──────────────────────────────────────────────────

/** Avisos reais do produto (o componente do sino), um por categoria. */
function notificacoes(): AppNotification[] {
  const handoff = heroNotifications('assumido').find((n) => n.type === 'agent_handoff')!
  return [
    handoff,
    {
      id: 'nt-espera', type: 'conversation_waiting', title: 'Bruno Antunes está aguardando resposta',
      description: 'Conversa atribuída a você, sem resposta', link: '/conversations', isRead: false, createdAt: minutesAgo(9),
      metadata: { contactName: 'Bruno Antunes' },
    },
    {
      id: 'nt-mencao', type: 'mention', title: 'Ana Prado mencionou você', description: 'consegue cobrir o encaixe das nove com a Dra. Helena?',
      link: '/team-chat', isRead: true, createdAt: minutesAgo(25), metadata: { actorName: 'Ana Prado' },
    },
  ]
}

function VisualNotificacoes() {
  return (
    <div className="mx-auto w-[94%] max-w-[480px] divide-y divide-[var(--landing-borda)] overflow-hidden rounded-xl bg-surface-900 ring-1 ring-surface-700">
      {notificacoes().map((n) => <NotificationItem key={n.id} n={n} onClick={NOOP} />)}
    </div>
  )
}

/** A linha REAL da lista de conversas, no estado "esperando": o próprio produto
 *  estampa o tempo sem resposta quando a última mensagem é do cliente. */
function VisualEspera() {
  const base = heroConversations('inicio')[2]
  const esperando: Conversation = {
    ...base,
    status: 'open',
    lastMessageAt: minutesAgo(27),
    lastAgentReplyAt: hoursAgo(2),
    // Com uma PESSOA (a IA em pausa): é o caso que o vigia de espera cobre.
    assignedUser: HERO_USER,
    aiPausedUntil: hoursAgo(-4),
    lastMessagePreview: 'Consigo remarcar pra semana que vem?',
    unreadCount: 1,
  }
  return (
    <div className="mx-auto w-[94%] max-w-[480px] overflow-hidden rounded-xl bg-surface-900 ring-1 ring-surface-700">
      <ConversationItem conversation={esperando} isActive={false} onSelect={NOOP} />
    </div>
  )
}

/** A fila: conversas pendentes (a IA chamou uma pessoa), como a aba "Fila" mostra. */
function VisualFila() {
  const marina = heroConversations('assumido')[0]
  const outra: Conversation = {
    ...heroConversations('inicio')[3],
    status: 'pending',
    assignedUser: undefined,
    lastMessagePreview: 'Posso levar minha filha na mesma consulta?',
    lastMessageAt: minutesAgo(4),
    lastAgentReplyAt: minutesAgo(4),
  }
  return (
    <div className="mx-auto w-[94%] max-w-[480px] overflow-hidden rounded-xl bg-surface-900 ring-1 ring-surface-700">
      <div className="flex items-center justify-between border-b border-surface-700 px-3 py-1.5">
        <span className="text-[11px] font-semibold text-surface-100">Fila</span>
        <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-400">2 aguardando</span>
      </div>
      <div className="divide-y divide-surface-700">
        <ConversationItem conversation={marina} isActive={false} onSelect={NOOP} />
        <ConversationItem conversation={outra} isActive={false} onSelect={NOOP} />
      </div>
    </div>
  )
}

const NUMEROS = [
  { numero: HERO_LINE.displayPhoneNumber, setor: 'Recepção', agente: HERO.agent },
  { numero: '+55 47 3030-1200', setor: 'Comercial', agente: 'Agente Comercial' },
  { numero: '+55 47 3030-1300', setor: 'Exames', agente: 'Agente Resultados' },
]

function VisualNumeros() {
  return (
    <div className="mx-auto w-[94%] max-w-[480px] divide-y divide-surface-700 rounded-xl bg-surface-900 ring-1 ring-surface-700">
      {NUMEROS.map((n) => (
        <div key={n.numero} className="flex items-center gap-3 px-3 py-2">
          <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-surface-800 text-surface-300 ring-1 ring-surface-700">
            <Smartphone className="h-3.5 w-3.5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-[11.5px] font-medium text-surface-100">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />{n.numero}
            </p>
            <p className="text-[10.5px] text-surface-500">{n.setor} · {n.agente}</p>
          </div>
          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">conectada</span>
        </div>
      ))}
    </div>
  )
}

const VISUAIS_RESPOSTA: Record<string, () => ReactNode> = {
  notificacoes: () => <VisualNotificacoes />,
  espera: () => <VisualEspera />,
  fila: () => <VisualFila />,
  numeros: () => <VisualNumeros />,
}

export function SecaoResposta() {
  return (
    <section id="resposta" data-section="resposta" className="relative border-t border-[var(--landing-borda)] bg-surface-950 py-20 sm:py-28">
      <div className="landing-container">
        <Cabecalho eyebrow={resposta.eyebrow} titulo={resposta.title} cinza={resposta.titleCinza} />
        <Revelar atraso={0.1}>
          <p className="mt-3 max-w-[62ch] text-[12px] sm:text-[12.5px] leading-relaxed text-surface-400 text-pretty">{resposta.lead}</p>
        </Revelar>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:gap-5">
          {resposta.cartoes.map((c, i) => (
            <Prova key={c.key} atraso={0.1 + i * 0.08} titulo={c.titulo} texto={c.texto} visual={VISUAIS_RESPOSTA[c.key]()} />
          ))}
        </div>
      </div>
    </section>
  )
}
