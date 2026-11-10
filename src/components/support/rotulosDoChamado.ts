import { Bot, LifeBuoy, Megaphone, MessageCircle, MessagesSquare, UserRound, Workflow } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Message } from '@/types'
import type { OrigemDoProblema } from './supportModel'
import { classificarMensagem } from './origemDaMensagem'

/** Ícone, nome e autoria das origens do chamado (cartões do painel). */
export const ICONE: Record<OrigemDoProblema, LucideIcon> = {
  ia: Bot, automacao: Megaphone, regra: Workflow, equipe: UserRound, contato: MessageCircle, conversa: MessagesSquare, plataforma: LifeBuoy,
}
export const NOME: Record<OrigemDoProblema, string> = {
  ia: 'Resposta da IA', automacao: 'Automação', regra: 'Resposta automática por regra', equipe: 'Mensagem da equipe', contato: 'Mensagem do contato',
  conversa: 'A conversa inteira', plataforma: 'A plataforma',
}

export const hora = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
export function autorDe(m: Message, contatoNome: string | null): string {
  const c = classificarMensagem(m)
  if (c.origem === 'contato') return contatoNome ?? 'Contato'
  if (c.origem === 'ia') return 'IA'
  if (c.origem === 'equipe') return m.sentByUser ? `${m.sentByUser.firstName}` : 'Equipe'
  return c.nome ?? (c.origem === 'automacao' ? 'Automação' : 'Regra')
}
