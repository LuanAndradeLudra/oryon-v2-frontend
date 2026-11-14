import { useEffect, useState } from 'react'
import { CircleAlert, FastForward, FlaskConical, RotateCcw, Trophy, X } from 'lucide-react'
import { Drawer } from '@/components/ui/Drawer'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { avancarTeste, iniciarTeste, type EstadoDoTeste } from '@/services/jornadas/simulador'
import type { ApoioDoEditor, Catalogo, VersaoDaJornada } from '@/services/jornadas/tipos'
import { dataHora } from './apoio'

/**
 * Testar: um contato de teste percorre o desenho. Nada é enviado; cada passo
 * mostra o que teria feito. Nas esperas, você adianta o relógio; nas respostas,
 * escolhe o que o contato responde. O caminho acende no canvas.
 */
export function TestarJornada({ open, onClose, versao, catalogo, apoio, onEstado, onIrAoPasso }: {
  open: boolean
  onClose: () => void
  versao: VersaoDaJornada
  catalogo: Catalogo
  apoio: ApoioDoEditor
  onEstado: (e: EstadoDoTeste | null) => void
  onIrAoPasso: (nodeId: string) => void
}) {
  const [estado, setEstado] = useState<EstadoDoTeste | null>(null)
  const ctx = { versao, catalogo, apoio }

  const mudar = (e: EstadoDoTeste | null) => {
    setEstado(e)
    onEstado(e)
    const atual = e?.pausa?.nodeId ?? e?.noAtual
    if (atual) onIrAoPasso(atual)
  }

  useEffect(() => {
    if (open) mudar(iniciarTeste(ctx))
    else setEstado(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  return (
    <Drawer open={open} onClose={onClose} side="right" className="w-[420px]" ariaLabel="Testar a jornada">
      <div className="flex flex-col h-full">
        <div className="flex items-start gap-2 border-b border-surface-700 px-4 py-3">
          <FlaskConical className="w-4 h-4 mt-0.5 text-surface-300" aria-hidden />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-surface-50">Testar com um contato de teste</p>
            <p className="text-xs text-surface-400">Nada é enviado. O relógio só anda para este teste.</p>
          </div>
          <Button variant="ghost" size="sm" iconOnly aria-label="Fechar o teste" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>

        <ol className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
          {(estado?.itens ?? []).map((it, i) => (
            <li key={i} className="flex gap-2.5">
              <span className={cn('mt-1.5 w-2 h-2 rounded-full shrink-0', it.status === 'waiting' ? 'bg-status-pending' : it.status === 'failed' ? 'bg-[var(--color-danger)]' : it.status === 'shadow' ? 'bg-[var(--color-accent-violet)]' : 'bg-surface-500')} aria-hidden />
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-surface-100">
                  {it.nodeId ? <button type="button" className="hover:underline text-left" onClick={() => onIrAoPasso(it.nodeId!)}>{it.title}</button> : it.title}
                  <span className="ml-2 text-[11px] font-normal text-surface-500 tabular-nums">{dataHora(it.at)}</span>
                </p>
                <p className="text-xs text-surface-400 leading-relaxed break-words">{it.detail}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="border-t border-surface-700 px-4 py-3 space-y-2.5">
          {estado?.terminou ? (
            <div className={cn('flex items-start gap-2 rounded-[8px] px-3 py-2 text-sm', estado.terminou.como === 'erro' ? 'bg-[color-mix(in_srgb,var(--color-danger)_12%,var(--color-surface-800))] text-surface-100' : 'bg-surface-800 text-surface-100')}>
              {estado.terminou.como === 'erro' ? <CircleAlert className="w-4 h-4 mt-0.5 text-[var(--color-danger)]" aria-hidden /> : <Trophy className="w-4 h-4 mt-0.5 text-brand-500" aria-hidden />}
              <span>{estado.terminou.texto}</span>
            </div>
          ) : estado?.pausa?.tipo === 'escolha' ? (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-surface-200">{estado.pausa.pergunta}</p>
              <div className="flex flex-wrap gap-1.5">
                {estado.pausa.opcoes.map((o) => (
                  <Button key={o.key} variant="secondary" size="sm" onClick={() => mudar(avancarTeste(estado, ctx, o.key))}>{o.label}</Button>
                ))}
              </div>
            </div>
          ) : estado?.pausa?.tipo === 'relogio' ? (
            <Button size="sm" leftIcon={<FastForward className="w-4 h-4" />} onClick={() => mudar(avancarTeste(estado, ctx))}>
              Adiantar o relógio para {dataHora(new Date(estado.pausa.ate).toISOString())}
            </Button>
          ) : null}
          <Button variant="ghost" size="sm" leftIcon={<RotateCcw className="w-4 h-4" />} onClick={() => mudar(iniciarTeste(ctx))}>Recomeçar o teste</Button>
        </div>
      </div>
    </Drawer>
  )
}
