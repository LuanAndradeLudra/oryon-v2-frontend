import { useState } from 'react'
import { Download, UserMinus, Users, X } from 'lucide-react'
import { Drawer } from '@/components/ui/Drawer'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { ConfirmModal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { useToast } from '@/hooks/useToast'
import { jornadasApi } from '@/services/jornadas/jornadasApi'
import { baixarCsv, numero, quandoFoi, useCarregar } from './apoio'

/**
 * "Quem está neste passo" (P2, 16/11, como a HubSpot e o Braze): o número do
 * cartão no canvas abre quem está ali agora, com quanto falta para seguir, e
 * deixa tirar várias pessoas de uma vez ou exportar a lista.
 */
export function QuemEstaNoPasso({ open, onClose, jornadaId, nodeId, nomeDoPasso, esperaResposta, onAbrirEmPessoas }: {
  open: boolean
  onClose: () => void
  jornadaId: string
  nodeId: string | null
  nomeDoPasso: string
  /** O passo espera uma resposta: a hora marcada é o prazo, não a próxima etapa. */
  esperaResposta?: boolean
  /** "Abrir em Pessoas": a aba Pessoas, já filtrada por este passo. */
  onAbrirEmPessoas?: (nodeId: string) => void
}) {
  return (
    <Drawer open={open} onClose={onClose} side="right" className="w-[440px]" ariaLabel={`Quem está em ${nomeDoPasso}`}>
      {open && nodeId && <Lista key={nodeId} jornadaId={jornadaId} nodeId={nodeId} nomeDoPasso={nomeDoPasso} esperaResposta={esperaResposta} onClose={onClose} onAbrirEmPessoas={onAbrirEmPessoas} />}
    </Drawer>
  )
}

const POR_VEZ = 50

function Lista({ jornadaId, nodeId, nomeDoPasso, esperaResposta, onClose, onAbrirEmPessoas }: {
  jornadaId: string
  nodeId: string
  nomeDoPasso: string
  esperaResposta?: boolean
  onClose: () => void
  onAbrirEmPessoas?: (nodeId: string) => void
}) {
  const { toast } = useToast()
  const [quantas, setQuantas] = useState(POR_VEZ)
  const { dados, erro, recarregar } = useCarregar(() => jornadasApi.inscricoes(jornadaId, { situacao: 'dentro', passo: nodeId, porPagina: quantas }), [quantas])
  const [marcadas, setMarcadas] = useState<Set<string>>(new Set())
  const [tirando, setTirando] = useState(false)
  const [exportando, setExportando] = useState(false)
  // Quem segue primeiro aparece primeiro.
  const itens = [...(dados?.itens ?? [])].sort((a, b) => (a.nextWakeAt ?? '9').localeCompare(b.nextWakeAt ?? '9'))
  const total = dados?.total ?? 0
  const todasMarcadas = itens.length > 0 && itens.every((i) => marcadas.has(i.id))

  const exportar = async () => {
    setExportando(true)
    try { baixarCsv(`quem-esta-${nodeId}.csv`, await jornadasApi.exportarInscricoes(jornadaId, { situacao: 'dentro', passo: nodeId })) }
    catch (e) { toast(e instanceof Error ? e.message : 'Não deu para exportar.', 'error') }
    finally { setExportando(false) }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start gap-2 border-b border-surface-700 px-4 py-3">
        <Users className="mt-0.5 h-4 w-4 text-surface-300" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-surface-50">Quem está em “{nomeDoPasso}”</p>
          <p className="text-xs text-surface-400">{dados ? `${numero(total)} pessoa${total === 1 ? '' : 's'} agora · quem segue primeiro aparece primeiro` : 'Carregando…'}</p>
        </div>
        <Button variant="ghost" size="sm" iconOnly aria-label="Fechar" onClick={onClose}><X className="h-4 w-4" /></Button>
      </div>

      {itens.length > 0 && (
        <div className="flex min-h-[48px] items-center gap-3 border-b border-surface-700 px-4 py-2">
          <Checkbox aria-label="Marcar todas as visíveis" checked={todasMarcadas} onChange={(e) => setMarcadas(e.target.checked ? new Set(itens.map((i) => i.id)) : new Set())} />
          {marcadas.size > 0 ? (
            <>
              <span className="text-[14px] font-semibold tabular-nums text-surface-100">{numero(marcadas.size)} marcada{marcadas.size > 1 ? 's' : ''}</span>
              <Button variant="secondary" size="sm" className="ml-auto" leftIcon={<UserMinus className="h-3.5 w-3.5" />} onClick={() => setTirando(true)}>Tirar da jornada</Button>
            </>
          ) : <span className="text-[12px] text-surface-400">Marque para tirar várias de uma vez</span>}
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {erro && <p className="px-4 py-3 text-sm text-[var(--color-danger)]">{erro}</p>}
        {!dados && !erro && <div className="space-y-2 p-4">{[0, 1, 2].map((i) => <SkeletonCard key={i} lines={1} />)}</div>}
        {dados && itens.length === 0 && <div className="px-4 py-8"><EmptyState icon={Users} title="Ninguém aqui agora" hint="Quando alguém chegar a este passo, aparece aqui." /></div>}
        {itens.length > 0 && (
          <ul className="divide-y divide-surface-700">
            {itens.map((i) => (
              <li key={i.id} className="flex items-center gap-3 px-4 py-2.5">
                <Checkbox aria-label={`Marcar ${i.contact.name}`} checked={marcadas.has(i.id)} onChange={(e) => { const v = e.target.checked; setMarcadas((m) => { const n = new Set(m); if (v) n.add(i.id); else n.delete(i.id); return n }) }} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] text-surface-100">{i.contact.name}<span className="ml-2 text-[12px] tabular-nums text-surface-500">{i.contact.phoneMasked}</span></span>
                  <span className="block truncate text-[12px] text-surface-400">{i.subjectLabel}</span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-[12px] font-medium tabular-nums text-surface-100">
                    {i.nextWakeAt ? `${esperaResposta ? 'prazo' : 'segue'} ${quandoFoi(i.nextWakeAt)}` : 'sem hora marcada'}
                  </span>
                  <span className="block text-[12px] text-surface-500">entrou {quandoFoi(i.enteredAt)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
        {dados && total > itens.length && (
          <div className="px-4 py-3">
            <Button variant="ghost" size="sm" className="w-full" onClick={() => setQuantas((q) => q + POR_VEZ)}>Mostrar mais ({numero(total - itens.length)})</Button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-surface-700 px-4 py-3">
        <Button variant="ghost" size="sm" leftIcon={<Download className="h-3.5 w-3.5" />} loading={exportando} disabled={!total} onClick={exportar}>Exportar CSV</Button>
        {onAbrirEmPessoas && <Button variant="ghost" size="sm" className="ml-auto" onClick={() => onAbrirEmPessoas(nodeId)}>Abrir em Pessoas</Button>}
      </div>

      <ConfirmModal
        open={tirando}
        onClose={() => setTirando(false)}
        onConfirm={async () => {
          const r = await jornadasApi.tirarVarias(jornadaId, [...marcadas])
          setTirando(false)
          setMarcadas(new Set())
          toast(`${numero(r.removed)} pessoa${r.removed > 1 ? 's saíram' : ' saiu'} da jornada. Nenhuma mensagem a mais.`, 'success')
          void recarregar()
        }}
        title={`Tirar ${numero(marcadas.size)} pessoa${marcadas.size > 1 ? 's' : ''} da jornada?`}
        description="Elas saem na hora, com o motivo 'manual', e não recebem mais nada desta jornada."
        confirmLabel="Tirar"
      />
    </div>
  )
}
