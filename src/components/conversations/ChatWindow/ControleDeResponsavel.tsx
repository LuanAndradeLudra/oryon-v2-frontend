/**
 * Responsável pela conversa, no cabeçalho do chat (SCRUM-1253, PO 06/10).
 *
 * Substitui o quadrado de ícone do operador por um controle NOMEADO — o padrão
 * de Intercom, Zendesk, HubSpot e respond.io: `[avatar] Nome ▾` + o estado da
 * IA em texto ao lado. "Devolver para a IA" sai do clique direto (era a ação
 * mais delicada do cabeçalho, disfarçada de botão primário) e vai para dentro
 * do menu, com rótulo explícito.
 */
import { useEffect, useState } from 'react'
import { Bot, ChevronDown, PauseCircle, RotateCcw, Search, UserMinus, UserPlus } from 'lucide-react'
import { Dropdown, DropdownItem, DropdownSeparator } from '@/components/ui/Dropdown'
import { cn, getInitials } from '@/lib/utils'
import { INDEFINITE_PAUSE_ISO } from '@/hooks/useConversations'
import type { EstadoDaIA } from '@/lib/conversationSignals'
import type { Conversation, User } from '@/types'

const PAUSAR: Array<{ label: string; minutos: number }> = [
  { label: 'Pausar a IA por 1 hora', minutos: 60 },
  { label: 'Pausar a IA por 4 horas', minutos: 240 },
  { label: 'Pausar a IA até eu reativar', minutos: -1 },
]

/** Acima disto a lista de pessoas ganha busca (revisão 11/10: antes cortava em 6). */
const BUSCA_A_PARTIR_DE = 7

const ESTENDER: Array<{ label: string; minutos: number }> = [
  { label: 'Pausar por mais 1 hora', minutos: 60 },
  { label: 'Pausar por mais 4 horas', minutos: 240 },
  { label: 'Pausar até eu reativar', minutos: -1 },
]

function restante(ate: string | null | undefined, agora: number): string | null {
  if (!ate) return null
  const ms = new Date(ate).getTime() - agora
  if (ms <= 0) return null
  if (new Date(ate).getTime() >= new Date(INDEFINITE_PAUSE_ISO).getTime() - 1000) return 'até reativar'
  const min = Math.round(ms / 60_000)
  return min >= 60 ? `${Math.floor(min / 60)}h${String(min % 60).padStart(2, '0')}` : `${min} min`
}

/** Fim da pausa pedida: minutos a partir de agora, ou indefinida (-1). */
function pausaAte(min: number): string {
  return min < 0 ? INDEFINITE_PAUSE_ISO : new Date(Date.now() + min * 60_000).toISOString()
}

function Disco({ nome, vazio = false }: { nome?: string; vazio?: boolean }) {
  if (vazio) return <span aria-hidden className="w-5 h-5 rounded-full border border-dashed border-surface-500 flex-shrink-0" />
  return (
    <span aria-hidden className="avatar-operador w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-3xs font-semibold">
      {getInitials(nome ?? '')}
    </span>
  )
}

export function ControleDeResponsavel({
  conversation, estadoIA, eu, allUsers, onAssumir, onAssign, onTransfer, onSetAiPause,
}: {
  conversation: Conversation
  estadoIA: EstadoDaIA
  eu: { id: string } | null | undefined
  allUsers: User[]
  onAssumir: () => void
  onAssign: (user: User | null) => void
  /** Revisão 11/10 — com dono, escolher outra pessoa é TRANSFERÊNCIA (mesma
   *  regra do painel da direita: marco no chat e notificação certa). */
  onTransfer?: (user: User) => void
  onSetAiPause: (pauseUntil: string | null) => Promise<void> | void
}) {
  const [aberto, setAberto] = useState(false)
  // Busca da lista de pessoas: efêmera, vive só com o menu aberto (não é
  // estado de tela — fechar o menu zera).
  const [busca, setBusca] = useState('')
  // Relógio do minuto (o restante da pausa anda sozinho) — sem Date.now no render.
  const [agora, setAgora] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setAgora(Date.now()), 60_000)
    return () => clearInterval(id)
  }, [])

  const dono = conversation.assignedUser
  const ehMeu = !!dono && !!eu && dono.id === eu.id
  // O estado da IA já aparece ao lado — sem dono, o nome é "Sem responsável"
  // (antes "IA │ IA atendendo" repetia a informação).
  const nome = dono ? (ehMeu ? 'Você' : dono.firstName) : 'Sem responsável'
  const falta = restante(conversation.aiPausedUntil, agora)
  const fechar = () => { setAberto(false); setBusca('') }
  // Igual ao painel (ContactPanel): dono → outra pessoa = transferir; sem dono = atribuir.
  const escolher = (u: User) => {
    fechar()
    if (dono && u.id !== dono.id && onTransfer) onTransfer(u)
    else onAssign(u)
  }
  const pessoas = allUsers.filter((u) => u.isActive && u.id !== dono?.id && u.id !== eu?.id)
  const comBusca = pessoas.length >= BUSCA_A_PARTIR_DE
  const termo = busca.trim().toLocaleLowerCase('pt-BR')
  const visiveis = termo
    ? pessoas.filter((u) => `${u.firstName} ${u.lastName ?? ''}`.toLocaleLowerCase('pt-BR').includes(termo))
    : pessoas
  const pausar = (min: number) => {
    fechar()
    void onSetAiPause(pausaAte(min))
  }

  // O estado da IA mora DENTRO do mesmo controle (PO, 06/10: uma peça só no
  // cabeçalho, não três). Cor só onde pede atenção: IA no controle = âmbar.
  const estado = estadoIA === 'pausada'
    ? { icone: PauseCircle, texto: `IA pausada${falta ? ` · ${falta}` : ''}`, cor: 'text-surface-300', dica: 'A IA não responde enquanto alguém da equipe atende' }
    : estadoIA === 'sem-ia'
      ? { icone: null, texto: 'Linha sem IA', cor: 'text-surface-400', dica: 'Esta linha de WhatsApp não tem agente de IA ligado' }
      // Revisão 11/10: 'passou' (a IA passou para a equipe) mostrava "IA
      // atendendo". Mesma regra dos selos da lista (D11): sem dono = "Na fila";
      // com dono = "Aguardando <nome>".
      : estadoIA === 'passou'
        ? {
            icone: null,
            texto: dono ? `Aguardando ${ehMeu ? 'você' : dono.firstName}` : 'Na fila',
            cor: 'text-status-pending',
            dica: dono ? 'A IA passou a conversa para a equipe; o responsável ainda não respondeu' : 'A IA passou a conversa para a equipe e ninguém assumiu ainda',
          }
        : { icone: Bot, texto: 'IA atendendo', cor: 'text-accent-amber', dica: 'A IA está respondendo nesta conversa (não está pausada)' }
  const IconeEstado = estado.icone

  return (
    <Dropdown
      open={aberto}
      onClose={fechar}
      align="right"
      className="w-64"
      anchor={
        <button
          type="button"
          onClick={() => setAberto((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={aberto}
          title="Responsável e agente de IA"
          className={cn(
            'inline-flex items-center gap-1.5 h-7 pl-1 pr-1.5 rounded-[6px] border border-[var(--bd2)] text-xs font-medium text-surface-100 min-w-0',
            'hover:bg-[var(--rowhover)] transition-colors',
            aberto && 'bg-[var(--rowhover)]',
          )}
        >
          <Disco nome={dono ? `${dono.firstName} ${dono.lastName ?? ''}`.trim() : undefined} vazio={!dono} />
          <span className="max-w-[96px] truncate">{nome}</span>
          <span aria-hidden className="w-px h-3.5 bg-[var(--bd2)] flex-shrink-0" />
          <span className={cn('inline-flex items-center gap-1 min-w-0 whitespace-nowrap', estado.cor)} title={estado.dica}>
            {IconeEstado && <IconeEstado className="w-3 h-3 flex-shrink-0" />}
            <span className="truncate">{estado.texto}</span>
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-surface-400 flex-shrink-0" />
        </button>
      }
    >
      <div className="px-1 py-1">
        <p className="px-2 pt-1 pb-1.5 text-2xs font-semibold text-surface-500">Responsável</p>
        {!ehMeu && (
          <DropdownItem icon={UserPlus} onClick={() => { fechar(); onAssumir() }}>
            {estadoIA === 'sem-ia' ? 'Atribuir a mim' : 'Assumir (atribui a mim e pausa a IA)'}
          </DropdownItem>
        )}
        {comBusca && (
          <label className="flex items-center gap-1.5 mx-1 my-1 h-7 px-2 rounded-[6px] border border-[var(--bd2)] text-xs text-surface-300 focus-within:border-brand-500">
            <Search className="w-3.5 h-3.5 flex-shrink-0 text-surface-500" aria-hidden />
            <input
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              // Home/End movem o cursor no texto, não o foco do menu (Seta ↓ vai à lista).
              onKeyDown={(e) => { if (e.key === 'Home' || e.key === 'End') e.stopPropagation() }}
              placeholder="Buscar pessoa"
              aria-label="Buscar pessoa para atribuir"
              className="flex-1 min-w-0 bg-transparent outline-none text-surface-100 placeholder:text-surface-500"
            />
          </label>
        )}
        <div className={cn(comBusca && 'max-h-60 overflow-y-auto')}>
          {visiveis.map((u) => (
            <DropdownItem key={u.id} onClick={() => escolher(u)}>
              <Disco nome={`${u.firstName} ${u.lastName ?? ''}`} />
              <span className="truncate">{u.firstName} {u.lastName}</span>
            </DropdownItem>
          ))}
          {comBusca && visiveis.length === 0 && (
            <p className="px-2 py-1.5 text-xs text-surface-500">Ninguém com esse nome</p>
          )}
        </div>
        {dono && (
          <DropdownItem icon={UserMinus} onClick={() => { fechar(); onAssign(null) }}>
            Remover responsável
          </DropdownItem>
        )}

        {estadoIA !== 'sem-ia' && (
          <>
            <DropdownSeparator />
            <p className="px-2 pt-1 pb-1.5 text-2xs font-semibold text-surface-500">Agente de IA</p>
            {/* IA no controle: dá para PAUSAR (antes só havia "Assumir", e para
                quem não era o dono). Pausada: estender ou devolver. */}
            {(estadoIA === 'pausada' ? ESTENDER : PAUSAR).map((o) => (
              <DropdownItem key={o.minutos} icon={PauseCircle} onClick={() => pausar(o.minutos)}>{o.label}</DropdownItem>
            ))}
            {estadoIA === 'pausada' && (
              <DropdownItem icon={RotateCcw} onClick={() => { fechar(); void onSetAiPause(null) }}>
                Devolver para a IA
              </DropdownItem>
            )}
          </>
        )}
      </div>
    </Dropdown>
  )
}
