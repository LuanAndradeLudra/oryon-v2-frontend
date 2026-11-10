import { useLocation, useNavigate } from 'react-router-dom'
import type { Message } from '@/types'
import type { ChamadoDaEmpresa } from '@/types/support'
import { ReportTicketPanel } from './ReportTicketPanel'
import { areaDaRota, type EntradaDoChamado } from './supportModel'

const SEM_MENSAGENS: readonly Message[] = []

/**
 * CHAMADO SEM CONVERSA (SCRUM-1382) — "Falar com o suporte" no menu do
 * usuário e "Novo chamado" na página Suporte: o mesmo formulário do painel,
 * em modal de 520 px, por cima da tela atual. "Onde aconteceu" vem da rota
 * (ou de `telaInicial`); o contexto técnico é capturado ao abrir.
 *
 * Carregado sob demanda (`lazy`) e montado SÓ quando abre: o formulário nasce
 * vazio a cada abertura, e o menu do usuário — que está em todas as telas —
 * não carrega o suporte inteiro.
 */
export default function ChamadoSemConversa({ entrada, telaInicial, onClose, onCriado }: {
  entrada: EntradaDoChamado
  /** Área já escolhida; sem ela, a área da tela atual. */
  telaInicial?: string | null
  onClose: () => void
  onCriado?: (c: ChamadoDaEmpresa) => void
}) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  return (
    <ReportTicketPanel
      variante="modal"
      open
      entrada={entrada}
      onClose={onClose}
      telaInicial={telaInicial !== undefined ? telaInicial : areaDaRota(pathname)}
      conversationId={null}
      contatoNome={null}
      mensagens={SEM_MENSAGENS}
      onCriado={(c) => onCriado?.(c)}
      verChamado={(id) => navigate(`/support?chamado=${encodeURIComponent(id)}`)}
    />
  )
}
