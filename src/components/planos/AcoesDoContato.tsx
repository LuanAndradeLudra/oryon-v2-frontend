// Retomadas (06/11): o que a equipe faz com CADA contato do plano, sem sair da lista: abrir a
// conversa (o voltar do navegador traz de volta ao plano), enviar um modelo de mensagem e, no menu ⋯, etiqueta,
// funil e o perfil do contato. No celular, tudo fica no ⋯ (a linha não tem espaço para botões).
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Kanban, MessageCircle, MoreHorizontal, Send, Tag as TagIcon, UserRound } from 'lucide-react'
import { Dropdown, DropdownItem, DropdownSeparator } from '@/components/ui/Dropdown'
import { Tooltip } from '@/components/ui/Tooltip'
import { AJUDA } from '@/lib/planosDeAcao'
import type { ItemDoPlano } from '@/services/followUpsApi'
import { cn } from '@/lib/utils'

const BOTAO = 'inline-flex items-center gap-1.5 h-8 px-2.5 rounded-[8px] border border-[var(--bd2)] bg-surface-900 text-[13px] font-medium text-surface-200 whitespace-nowrap transition-colors cursor-pointer hover:bg-[var(--rowhover)] hover:text-surface-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-45 disabled:cursor-not-allowed'

export function AcoesDoContato({ item, ativo, compacto, onModelo, onEtiqueta, onFunil }: {
  item: ItemDoPlano
  /** O plano ainda aceita ações (enviado, em andamento ou vencido há pouco). */
  ativo: boolean
  /** No celular: só o ⋯, com tudo dentro. */
  compacto: boolean
  onModelo: (i: ItemDoPlano) => void
  onEtiqueta: (i: ItemDoPlano) => void
  onFunil: (i: ItemDoPlano) => void
}) {
  const [aberto, setAberto] = useState(false)
  const navigate = useNavigate()
  if (item.contactDeleted || !item.contact) return <span className="text-xs text-surface-500">—</span>
  const nome = item.contact.name ?? 'o contato'
  const conversa = item.conversationId ? `/conversations?id=${encodeURIComponent(item.conversationId)}` : null
  const perfil = `/contacts/${encodeURIComponent(item.contact.id)}`
  const ir = (destino: string) => { setAberto(false); navigate(destino) }
  const fechar = (f: () => void) => () => { setAberto(false); f() }

  return (
    <span className="inline-flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
      {!compacto && (conversa ? (
        <Link to={conversa} className={BOTAO} aria-label={`Abrir a conversa com ${nome}`}>
          <MessageCircle className="w-4 h-4" aria-hidden />Conversa
        </Link>
      ) : (
        <Tooltip content={AJUDA.semConversa} side="top" wide>
          <button type="button" className={BOTAO} aria-disabled="true" aria-label={`Sem conversa com ${nome}. ${AJUDA.semConversa}`}
            onClick={(e) => e.currentTarget.focus()}>
            <MessageCircle className="w-4 h-4 opacity-50" aria-hidden /><span className="opacity-60">Conversa</span>
          </button>
        </Tooltip>
      ))}
      {!compacto && ativo && (
        <Tooltip content={AJUDA.modelo} side="top" wide>
          <button type="button" className={BOTAO} onClick={() => onModelo(item)} aria-label={`Enviar um modelo de mensagem para ${nome}`}>
            <Send className="w-4 h-4" aria-hidden />Modelo
          </button>
        </Tooltip>
      )}
      <Dropdown open={aberto} onClose={() => setAberto(false)} align="right" className="w-[240px]"
        anchor={
          <button type="button" aria-haspopup="menu" aria-expanded={aberto} aria-label={`Mais ações para ${nome}`} title="Mais ações"
            onClick={() => setAberto((v) => !v)} className={cn(BOTAO, 'w-8 px-0 justify-center')}>
            <MoreHorizontal className="w-4 h-4" aria-hidden />
          </button>
        }>
        {compacto && (
          <>
            <DropdownItem icon={MessageCircle} disabled={!conversa} onClick={() => conversa && ir(conversa)}>
              {conversa ? 'Abrir conversa' : 'Sem conversa ainda'}
            </DropdownItem>
            {ativo && <DropdownItem icon={Send} onClick={fechar(() => onModelo(item))}>Enviar modelo de mensagem</DropdownItem>}
            <DropdownSeparator />
          </>
        )}
        {ativo && <DropdownItem icon={TagIcon} onClick={fechar(() => onEtiqueta(item))}>Pôr etiqueta</DropdownItem>}
        {ativo && <DropdownItem icon={Kanban} onClick={fechar(() => onFunil(item))}>Pôr no funil</DropdownItem>}
        <DropdownItem icon={UserRound} onClick={() => ir(perfil)}>Ver perfil do contato</DropdownItem>
      </Dropdown>
    </span>
  )
}
