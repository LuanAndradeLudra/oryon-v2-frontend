import { useEffect, useState } from 'react'
import { CircleStop, Pause, PauseOctagon, Route } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { jornadasApi } from '@/services/jornadas/jornadasApi'
import type { Jornada, ModoDaPausa, PreviaDaPausa } from '@/services/jornadas/tipos'
import { numero } from './apoio'

/**
 * ORY-60 (P1 do benchmark, 16/11) — pausar dizendo o que acontece com quem está
 * dentro, como o Customer.io: quantos estão em andamento e a escolha entre
 * terminar o caminho, ficar parado até retomar ou sair agora. Pausar continua
 * sendo uma etapa só (parar é seguro).
 */

const OPCOES: { valor: ModoDaPausa; titulo: string; texto: (n: number) => string; Icone: typeof Route }[] = [
  { valor: 'continue', titulo: 'Terminam o caminho', Icone: Route, texto: () => 'Ninguém novo entra. Quem já está dentro segue e recebe as mensagens até o fim.' },
  { valor: 'hold', titulo: 'Ficam parados onde estão', Icone: PauseOctagon, texto: () => 'Nada é enviado até retomar. Ao retomar, cada um segue de onde parou.' },
  { valor: 'exit', titulo: 'Saem agora', Icone: CircleStop, texto: (n) => `${n ? `As ${numero(n)} inscrições terminam` : 'As inscrições terminam'} com o motivo “pausa” e não voltam ao retomar.` },
]

export function PausarJornada({ open, jornada, onClose, onPronto }: { open: boolean; jornada: Jornada; onClose: () => void; onPronto: (j: Jornada) => void }) {
  const [previa, setPrevia] = useState<PreviaDaPausa | null>(null)
  const [modo, setModo] = useState<ModoDaPausa>('continue')
  const [ocupado, setOcupado] = useState(false)
  const [falha, setFalha] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setModo('continue')
    setFalha(null)
    setPrevia(null)
    let vivo = true
    jornadasApi.previaDaPausa(jornada.id).then((p) => { if (vivo) setPrevia(p) }).catch(() => { if (vivo) setFalha('Não deu para ler quem está dentro agora.') })
    return () => { vivo = false }
  }, [open, jornada.id])

  const pausar = async () => {
    setOcupado(true)
    setFalha(null)
    try {
      onPronto(await jornadasApi.pausar(jornada.id, { inFlight: modo }))
    } catch (e) {
      setFalha(e instanceof Error ? e.message : 'Não foi possível pausar.')
    } finally {
      setOcupado(false)
    }
  }

  const dentro = previa?.enrolledNow ?? jornada.enrolledNow

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Pausar a jornada"
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant={modo === 'exit' ? 'danger' : 'primary'} leftIcon={<Pause className="w-4 h-4" />} loading={ocupado} onClick={pausar}>
            {modo === 'exit' ? 'Pausar e tirar todos' : 'Pausar'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          {[
            ['Dentro agora', previa ? numero(previa.enrolledNow) : '…'],
            ['Esperando resposta', previa ? numero(previa.waitingReply) : '…'],
            ['Mensagens nas próximas 24 h', previa ? numero(previa.scheduledMessages24h) : '…'],
          ].map(([rotulo, valor]) => (
            <div key={rotulo} className="rounded-[10px] bg-surface-800 px-3 py-2.5">
              <p className="text-[12px] leading-4 text-surface-400">{rotulo}</p>
              <p className="mt-1 text-[16px] font-semibold tabular-nums text-surface-50">{valor}</p>
            </div>
          ))}
        </div>

        <div>
          <p className="mb-2 text-[14px] font-semibold text-surface-100">E quem já está dentro?</p>
          <div className="space-y-2" role="radiogroup" aria-label="O que acontece com quem está dentro">
            {OPCOES.map(({ valor, titulo, texto, Icone }) => (
              <button
                key={valor}
                type="button"
                role="radio"
                aria-checked={modo === valor}
                onClick={() => setModo(valor)}
                disabled={valor !== 'continue' && dentro === 0}
                className={cn(
                  'flex w-full items-start gap-3 rounded-[10px] border px-3 py-2.5 text-left transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50',
                  modo === valor ? 'border-brand-500 bg-[var(--color-accent-soft)]' : 'border-surface-700 bg-surface-800 hover:bg-[var(--rowhover)]',
                )}
              >
                <Icone className={cn('mt-0.5 h-4 w-4 shrink-0', valor === 'exit' ? 'text-[var(--color-danger)]' : 'text-surface-300')} aria-hidden />
                <span>
                  <span className="block text-[14px] font-semibold text-surface-50">{titulo}{valor === 'continue' && <span className="ml-1.5 text-[12px] font-normal text-surface-400">(padrão)</span>}</span>
                  <span className="mt-0.5 block text-[12px] leading-relaxed text-surface-400">{texto(dentro)}</span>
                </span>
              </button>
            ))}
          </div>
        </div>

        {falha && <p className="rounded-[8px] jt-vermelho px-3 py-2 text-[14px]">{falha}</p>}
        <p className="text-[12px] text-surface-500">Dá para retomar quando quiser. Retomar pede confirmação.</p>
      </div>
    </Modal>
  )
}
