import { MessagesSquare, MousePointerClick } from 'lucide-react'
import { useSuporte } from './suporteDaConversa'
import { useMarcacao } from './marcacaoDoChamado'
import './suporte.css'

/**
 * OPÇÃO B (14/10): com o painel do chamado aberto, o cabeçalho do chat mantém
 * quem é o contato e troca SÓ as ações da direita (responsável, Resolver, ⋯)
 * pelo estado do chamado — nenhuma faixa a mais na tela. As ações voltam ao
 * enviar ou cancelar. A cor fica só no ícone (família do tipo).
 */
export function EstadoDoChamadoNoCabecalho() {
  const s = useSuporte()
  const aberto = useMarcacao(s.store, (e) => e.painelAberto)
  const conversa = useMarcacao(s.store, (e) => e.sobre === 'conversa')
  const n = useMarcacao(s.store, (e) => e.marcadas.size)
  if (!s.ligado || !aberto) return null
  const titulo = conversa ? 'Conversa inteira no chamado' : n === 0 ? 'Clique nas mensagens do problema' : `${n} ${n > 1 ? 'mensagens' : 'mensagem'} no chamado`
  const detalhe = conversa ? 'horários e respostas vão junto' : 'clique para incluir ou tirar'
  return (
    <div className={`sup-cabecalho-estado ${conversa ? 'sup-familia-conversa' : 'sup-familia-mensagem'} flex items-center gap-2.5 min-w-0`} role="status" aria-live="polite">
      <span className="sup-cartao-icone w-7 h-7 rounded-[7px] flex items-center justify-center flex-shrink-0" aria-hidden>
        {conversa ? <MessagesSquare className="w-[15px] h-[15px]" strokeWidth={2} /> : <MousePointerClick className="w-[15px] h-[15px]" strokeWidth={2} />}
      </span>
      <span className="min-w-0 leading-tight">
        <span className="block text-[13px] font-semibold truncate">{titulo}</span>
        <span className="block text-xs text-surface-400 truncate">{detalhe}</span>
      </span>
    </div>
  )
}
