import { useState } from 'react'
import { Download, Route, Users, X } from 'lucide-react'
import { Drawer } from '@/components/ui/Drawer'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { useToast } from '@/hooks/useToast'
import { jornadasApi } from '@/services/jornadas/jornadasApi'
import type { RecorteDosResultados } from '@/services/jornadas/tipos'
import { baixarCsv, dataHora, numero, useCarregar } from './apoio'

/**
 * As pessoas por trás de um número de Resultados (P2, 16/11, drill-down como a
 * HubSpot): clicou numa barra, num ramo, num motivo de saída ou de pulo, vê
 * quem é (mascarado), exporta e abre o caminho de cada uma no desenho.
 */
export function PessoasDoRecorte({ recorte, titulo, dias, jornadaId, onClose, onVerCaminho }: {
  recorte: RecorteDosResultados | null
  titulo: string
  dias: number
  jornadaId: string
  onClose: () => void
  onVerCaminho?: (titulo: string, nodeIds: string[]) => void
}) {
  return (
    <Drawer open={!!recorte} onClose={onClose} side="right" className="w-[440px]" ariaLabel={titulo}>
      {recorte && <Lista key={JSON.stringify(recorte) + dias} recorte={recorte} titulo={titulo} dias={dias} jornadaId={jornadaId} onClose={onClose} onVerCaminho={onVerCaminho} />}
    </Drawer>
  )
}

function Lista({ recorte, titulo, dias, jornadaId, onClose, onVerCaminho }: {
  recorte: RecorteDosResultados
  titulo: string
  dias: number
  jornadaId: string
  onClose: () => void
  onVerCaminho?: (titulo: string, nodeIds: string[]) => void
}) {
  const { toast } = useToast()
  const { dados, erro } = useCarregar(() => jornadasApi.pessoasDoRecorte(jornadaId, recorte, { dias }), [])
  const [exportando, setExportando] = useState(false)
  const exportar = async () => {
    setExportando(true)
    try { baixarCsv(`resultados-${recorte.tipo}.csv`, await jornadasApi.exportarRecorte(jornadaId, recorte, { dias })) }
    catch (e) { toast(e instanceof Error ? e.message : 'Não deu para exportar.', 'error') }
    finally { setExportando(false) }
  }
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start gap-2 border-b border-surface-700 px-4 py-3">
        <Users className="mt-0.5 h-4 w-4 text-surface-300" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-surface-50">{titulo}</p>
          <p className="text-xs text-surface-400">{dados ? `${numero(dados.total)} nos últimos ${dias} dias` : 'Carregando…'}</p>
        </div>
        <Button variant="ghost" size="sm" iconOnly aria-label="Fechar" onClick={onClose}><X className="h-4 w-4" /></Button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {erro && <p className="px-4 py-3 text-sm text-[var(--color-danger)]">{erro}</p>}
        {!dados && !erro && <div className="space-y-2 p-4">{[0, 1, 2].map((i) => <SkeletonCard key={i} lines={1} />)}</div>}
        {dados && dados.itens.length === 0 && <div className="px-4 py-8"><EmptyState icon={Users} title="Ninguém neste recorte" hint="Mude o período em Resultados." /></div>}
        {dados && dados.itens.length > 0 && (
          <ul className="divide-y divide-surface-700">
            {dados.itens.map((p, k) => (
              <li key={p.enrollmentId ?? k} className="flex items-center gap-3 px-4 py-2.5">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] text-surface-100">{p.contact.name}<span className="ml-2 text-[12px] tabular-nums text-surface-500">{p.contact.phoneMasked}</span></span>
                  <span className="block truncate text-[12px] text-surface-400">{[p.subjectLabel, p.detail].filter(Boolean).join(' · ')}</span>
                </span>
                <span className="shrink-0 text-[12px] tabular-nums text-surface-400">{dataHora(p.at)}</span>
                {p.nodeIds && p.nodeIds.length > 0 && onVerCaminho && (
                  <Button variant="ghost" size="sm" iconOnly aria-label={`Ver o caminho de ${p.contact.name} no desenho`} title="Ver no desenho" onClick={() => onVerCaminho(`Caminho de ${p.contact.name}`, p.nodeIds!)}>
                    <Route className="h-4 w-4" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-surface-700 px-4 py-3">
        {dados && dados.total > dados.itens.length && <p className="text-[12px] text-surface-500">As {numero(dados.itens.length)} mais recentes. O CSV traz todas.</p>}
        <Button variant="ghost" size="sm" className="ml-auto" leftIcon={<Download className="h-3.5 w-3.5" />} loading={exportando} disabled={!dados?.total} onClick={exportar}>Exportar CSV</Button>
      </div>
    </div>
  )
}
