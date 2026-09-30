import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { X, ExternalLink } from 'lucide-react'
import { Drawer } from '@/components/ui/Drawer'
import { Button } from '@/components/ui/Button'
import { comVolta } from '@/lib/voltarPara'

interface Props {
  open: boolean
  onClose: () => void
  /** Título do painel (ex.: "Respostas rápidas"). */
  titulo: string
  /** Seção de /settings que este painel espelha — vira o link de tela cheia. */
  secao: string
  /** Rótulo da faixa de volta em Configurações (ex.: "Voltar para a conversa"). */
  rotuloDeVolta: string
  /** A MESMA seção de Configurações (ex.: <QuickReplies />), não uma cópia. */
  children: ReactNode
}

/**
 * "Duas portas para a mesma sala" (padrão do FunnelsConfigDrawer e do
 * CRMConfigDrawer, agora genérico): abre uma seção de Configurações ao lado do
 * trabalho, no módulo onde a necessidade nasce, sem tirar a pessoa da tela.
 *
 * Por dentro é o mesmo componente de /settings — uma implementação só; o que
 * muda é de onde se entra. Configurações continua listando tudo (é o índice);
 * este painel é a entrada contextual. O link do rodapé leva o caminho de volta
 * (`voltarPara`), então quem vai para a tela cheia retorna exatamente ao
 * contexto de origem (regra de navegação do PO).
 */
export function PainelDeConfiguracao({ open, onClose, titulo, secao, rotuloDeVolta, children }: Props) {
  const location = useLocation()
  const telaCheia = comVolta(`/settings/${secao}`, `${location.pathname}${location.search}`, rotuloDeVolta)

  return (
    <Drawer open={open} onClose={onClose} side="right" ariaLabel={titulo} className="w-full sm:w-[44rem] max-w-full bg-surface-950">
      <div className="flex items-center justify-between px-[18px] py-3.5 border-b border-surface-700 flex-shrink-0">
        <h2 className="text-[15px] font-bold tracking-[-0.01em] text-surface-50">{titulo}</h2>
        <Button variant="ghost" size="sm" iconOnly onClick={onClose} aria-label="Fechar">
          <X className="w-4 h-4" />
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto px-[18px] py-4">{children}</div>
      <div className="flex items-center justify-end px-[18px] py-3 border-t border-surface-700 flex-shrink-0">
        <Link
          to={telaCheia}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-surface-400 hover:text-surface-100 transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" /> Abrir em Configurações
        </Link>
      </div>
    </Drawer>
  )
}
