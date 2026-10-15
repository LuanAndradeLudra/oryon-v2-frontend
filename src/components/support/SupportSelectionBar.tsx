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
  return (
    <div className="sup-barra sup-familia-mensagem flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3" role="region" aria-label="Marcar mensagens para o chamado">
      <Flag className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--sup-msg-fg)' }} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-surface-100" aria-live="polite">
          {n === 0 ? 'Marque as mensagens do problema' : `${n} ${n > 1 ? 'mensagens marcadas' : 'mensagem marcada'}`}
        </p>
        <p className="text-xs text-surface-400">
          Toque nas mensagens. Se o problema é algo que não aconteceu, como a IA não responder,{' '}
          <button type="button" onClick={() => s.reportar([])} className="font-semibold underline underline-offset-2" style={{ color: 'var(--sup-msg-fg)' }}>reporte a conversa</button>.
        </p>
      </div>
      <Button variant="neutral" size="sm" onClick={s.cancelarMarcacao}>Cancelar</Button>
      <Button size="sm" disabled={n === 0} onClick={() => s.reportar([...marcadas])}>Continuar</Button>
    </div>
  )
}
