import { Flag } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useSuporte } from './suporteDaConversa'
import { useMarcacao } from './marcacaoDoChamado'
import './suporte.css'

/**
 * Ocupa o lugar do campo de texto enquanto a pessoa marca as mensagens do
 * problema (celular) — o mesmo gesto de "selecionar mensagens" do WhatsApp.
 * Quando o problema é algo que NÃO aconteceu (a IA não respondeu, não
 * transferiu), não há mensagem para marcar: "reporte a conversa" abre o
 * formulário assim mesmo.
 */
export function SupportSelectionBar() {
  const s = useSuporte()
  const marcadas = useMarcacao(s.store, (e) => e.marcadas)
  const n = marcadas.size
  // Revisão de UX de 27/10: no celular o texto se espremia em 6 linhas ao lado dos botões.
  // Agora o texto ocupa a largura toda e os botões ficam embaixo, à direita.
  return (
    <div className="sup-barra sup-familia-mensagem flex flex-col gap-2 px-4 py-3" role="region" aria-label="Marcar mensagens para o chamado">
      <div className="flex items-start gap-2.5 min-w-0">
        <Flag className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--sup-msg-fg)' }} aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-surface-100" aria-live="polite">
            {n === 0 ? 'Toque nas mensagens do problema' : `${n} ${n > 1 ? 'mensagens marcadas' : 'mensagem marcada'}`}
          </p>
          <p className="text-xs text-surface-400">
            Algo que não aconteceu (a IA não respondeu)?{' '}
            <button type="button" onClick={() => s.reportar([])} className="font-semibold underline underline-offset-2" style={{ color: 'var(--sup-msg-fg)' }}>Reporte a conversa</button>.
          </p>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="neutral" size="sm" onClick={s.cancelarMarcacao}>Cancelar</Button>
        <Button size="sm" disabled={n === 0} onClick={() => s.reportar([...marcadas])}>Continuar</Button>
      </div>
    </div>
  )
}
