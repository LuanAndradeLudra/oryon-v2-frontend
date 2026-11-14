import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { jornadasApi } from '@/services/jornadas/jornadasApi'
import type { ApoioDoEditor, VersaoDaJornada } from '@/services/jornadas/tipos'
import { numero, useCarregar } from './apoio'

/** Simular: quantos entrariam hoje e quanto mandaria, sem executar nada. */
export function SimularJornada({ open, onClose, jornadaId, versao, apoio }: { open: boolean; onClose: () => void; jornadaId: string; versao: VersaoDaJornada; apoio: ApoioDoEditor }) {
  return (
    <Modal open={open} onClose={onClose} title="Simular: se estivesse publicada hoje" footer={<div className="flex justify-end"><Button variant="ghost" onClick={onClose}>Fechar</Button></div>}>
      {/* Montado só com a janela aberta: cada abertura simula o desenho daquele momento. */}
      {open && <ResultadoDaSimulacao jornadaId={jornadaId} versao={versao} apoio={apoio} />}
    </Modal>
  )
}

function ResultadoDaSimulacao({ jornadaId, versao, apoio }: { jornadaId: string; versao: VersaoDaJornada; apoio: ApoioDoEditor }) {
  const { dados: r, erro } = useCarregar(() => jornadasApi.simular(jornadaId, versao), [])

  if (erro) return <p className="text-sm text-[var(--color-danger)]">{erro}</p>
  if (!r) return <div className="flex items-center gap-2 text-sm text-surface-400"><Spinner className="w-4 h-4" /> Contando quem entraria…</div>
  return (
    <div className="space-y-4 text-sm text-surface-200">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          ['Entrariam hoje', numero(r.wouldEnterToday)],
          ['Mensagens por dia', numero(r.messagesPerDay)],
          ['IA por dia', r.creditsPerDay ? `${r.creditsPerDay.toLocaleString('pt-BR')} créd.` : 'zero'],
          ['Tarifa da Meta/dia', `R$ ${r.metaCostPerDayBrl.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`],
        ].map(([rotulo, valor]) => (
          <div key={rotulo} className="rounded-[10px] bg-surface-800 px-3 py-2.5">
            <p className="text-[11px] text-surface-500">{rotulo}</p>
            <p className="text-lg font-semibold text-surface-50 tabular-nums">{valor}</p>
          </div>
        ))}
      </div>
      {r.filteredOut.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-surface-300 mb-1">Ficariam de fora pelo filtro</p>
          <ul className="space-y-1">
            {r.filteredOut.map((f) => <li key={f.reason} className="flex justify-between gap-3 text-xs"><span className="text-surface-400">{f.reason}</span><span className="tabular-nums text-surface-200">{numero(f.count)}</span></li>)}
          </ul>
        </div>
      )}
      <div>
        <p className="text-xs font-semibold text-surface-300 mb-1">Por linha de WhatsApp</p>
        <ul className="space-y-1">
          {r.byLine.map((l) => <li key={l.whatsappNumberId} className="flex justify-between gap-3 text-xs"><span className="text-surface-400">{apoio.whatsappNumbers.find((w) => w.id === l.whatsappNumberId)?.name ?? l.whatsappNumberId}</span><span className="tabular-nums text-surface-200">{numero(l.messages)} msg/dia</span></li>)}
        </ul>
      </div>
      <p className="text-[11px] text-surface-500">Estimativa. A tarifa da Meta depende da categoria do modelo e é cobrada pela Meta. O ritmo por linha espalha os envios ao longo do horário de atendimento.</p>
    </div>
  )
}
