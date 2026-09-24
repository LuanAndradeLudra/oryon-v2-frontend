import { Bot, Check, CheckCheck, Bell } from 'lucide-react'
import { cn } from '@/lib/utils'
import { HERO } from './heroRealData'

/**
 * Os três SATÉLITES — a operação que acontece fora da tela principal.
 *
 * Existem para mostrar amplitude sem tirar a âncora do lugar: a âncora conta o
 * que está na tela do operador, e eles contam o resto do sistema no mesmo
 * instante. Todos usam a mesma bandeja da âncora e encostam nas bordas dela.
 *
 * O registro do Agente é onde passam a morar as frases que antes ficavam na
 * legenda por cena — inclusive os limites reais auditados no código: a IA não
 * define valor, não se pausa e não fecha venda de funil comercial.
 */

// ─── Celular da Marina ────────────────────────────────────────────────────────

export interface HeroPhoneMsg { de: 'cliente' | 'oryon'; texto: string; hora: string; lida?: boolean }

/**
 * A prévia do WhatsApp já amostrada dos prints da Meta: fundo claro, bolha da
 * empresa em verde à direita, a do cliente em branco à esquerda. É o outro
 * lado da conversa que a âncora mostra.
 */
export function HeroPhone({ mensagens, digitando }: { mensagens: HeroPhoneMsg[]; digitando?: boolean }) {
  return (
    <div className="flex flex-col h-full w-full bg-[#ECE5DD] overflow-hidden">
      <div className="flex-none flex items-center gap-2 px-2.5 py-2 bg-[#075E54]">
        <span className="w-6 h-6 rounded-full bg-[#128C7E] text-white text-[10px] font-semibold flex items-center justify-center">O</span>
        <div className="min-w-0">
          <p className="text-[11.5px] font-semibold text-white leading-tight truncate">Oryon</p>
          <p className="text-[9.5px] text-white/70 leading-tight">{digitando ? 'digitando…' : 'online'}</p>
        </div>
      </div>
      <div className="flex-1 min-h-0 flex flex-col justify-end gap-1.5 px-2 py-2 overflow-hidden">
        {mensagens.map((m, i) => (
          <div key={i} className={cn('max-w-[84%] rounded-[7px] px-2 py-1.5 shadow-sm', m.de === 'oryon' ? 'self-end bg-[#DCF8C6]' : 'self-start bg-white')}>
            <p className="text-[11px] leading-[1.35] text-[#111B21]">{m.texto}</p>
            <p className="flex items-center justify-end gap-0.5 text-[8.5px] text-[#667781] mt-0.5">
              {m.hora}
              {m.de === 'oryon' && (m.lida
                ? <CheckCheck className="w-2.5 h-2.5 text-[#53BDEB]" />
                : <Check className="w-2.5 h-2.5" />)}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Registro do Agente IA ────────────────────────────────────────────────────

export interface HeroLogLine { texto: string; detalhe?: string; limite?: boolean }

export function HeroAgentLog({ linhas }: { linhas: HeroLogLine[] }) {
  return (
    <div className="flex flex-col h-full w-full bg-surface-950 overflow-hidden">
      <div className="flex-none flex items-center gap-1.5 px-3 h-8 border-b border-surface-800">
        <Bot className="w-3.5 h-3.5 text-brand-400" />
        <span className="text-[11px] font-semibold text-surface-200">{HERO.agent}</span>
        <span className="ml-auto text-[9.5px] text-surface-500">registro</span>
      </div>
      <ul className="flex-1 min-h-0 flex flex-col gap-1.5 px-3 py-2 overflow-hidden">
        {linhas.map((l, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className={cn('mt-[5px] w-1.5 h-1.5 rounded-full flex-none', l.limite ? 'bg-surface-600' : 'bg-brand-400')} />
            <div className="min-w-0">
              <p className={cn('text-[11px] leading-snug', l.limite ? 'text-surface-500' : 'text-surface-200')}>{l.texto}</p>
              {l.detalhe && <p className="text-[10px] text-surface-500 leading-snug">{l.detalhe}</p>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ─── Notificações da equipe ───────────────────────────────────────────────────

export interface HeroNotice { titulo: string; corpo: string; quando: string }

export function HeroNotices({ itens }: { itens: HeroNotice[] }) {
  return (
    <div className="flex flex-col h-full w-full bg-surface-900 overflow-hidden">
      <div className="flex-none flex items-center gap-1.5 px-3 h-8 border-b border-surface-800">
        <Bell className="w-3.5 h-3.5 text-surface-400" />
        <span className="text-[11px] font-semibold text-surface-200">Equipe</span>
      </div>
      <ul className="flex-1 min-h-0 flex flex-col gap-2 px-3 py-2 overflow-hidden">
        {itens.map((n, i) => (
          <li key={i}>
            <p className="text-[11px] font-semibold text-surface-100 leading-snug">{n.titulo}</p>
            <p className="text-[10.5px] text-surface-400 leading-snug">{n.corpo}</p>
            <p className="text-[9.5px] text-surface-600 mt-0.5">{n.quando}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}
