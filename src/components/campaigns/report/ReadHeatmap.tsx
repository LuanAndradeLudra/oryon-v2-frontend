import { useMemo } from 'react'
import { Card, CardHeader } from '@/components/ui/Card'
import { PendingDataCard } from './PendingDataCard'
import { corDeLeitura } from './heatmapRamp'
import type { HeatmapModel } from './reportModel'

const HORAS_ROTULADAS = [0, 3, 6, 9, 12, 15, 18, 21]


/**
 * Mapa de calor de leituras: dias × 24 horas.
 *
 * **Nada de conversão de fuso aqui.** `hour` e `dayOffset` já chegam em
 * calendário local `America/Sao_Paulo`, derivados da MESMA conversão no SQL da
 * BE.1 (`AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo'`). Aplicar
 * `new Date(...).getHours()` sobre esses números deslocaria o mapa de novo, que
 * é exatamente o bug que a BE.1 acabou de corrigir do lado do backend. A única
 * data que vira `Date` no caminho é `sentAt`, e só para achar o nome do dia da
 * semana — isso acontece em `buildHeatmap`, não aqui.
 *
 * CSS puro em vez de recharts: é uma grade de retângulos, e o
 * `PeakHoursHeatmap` que a rubrica cita como referência não é um heatmap — é
 * um `BarChart` empilhado em três períodos do dia. O que se reaproveita dele é
 * a disciplina (cor por token, memo), não o componente.
 */
export function ReadHeatmap({ heatmap, hasRecipientData }: { heatmap: HeatmapModel; hasRecipientData: boolean }) {
  const celulas = useMemo(
    () =>
      heatmap.matrix.map((linha) =>
        linha.map((count) => ({
          count,
          cor: heatmap.max > 0 ? corDeLeitura(count / heatmap.max) : corDeLeitura(0),
        })),
      ),
    [heatmap.matrix, heatmap.max],
  )

  const vazio = !hasRecipientData || heatmap.matrix.length === 0

  return (
    <Card>
      <CardHeader
        title="Quando leram"
        description="Leituras por hora, nos dias após o envio · use para escolher o próximo horário"
        action={
          heatmap.peak ? (
            <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium bg-accent-violet/15 text-accent-violet">
              pico {heatmap.peak.from}h–{heatmap.peak.to}h
            </span>
          ) : null
        }
      />

      {vazio ? (
        hasRecipientData ? (
          <p className="text-xs text-surface-400">Nenhuma leitura registrada ainda.</p>
        ) : (
          <PendingDataCard what="O mapa de quando as pessoas leram" />
        )
      ) : (
        <div className="overflow-x-auto">
          <div
            className="grid items-center gap-[3px] min-w-[520px]"
            style={{ gridTemplateColumns: '36px repeat(24, minmax(0, 1fr))' }}
          >
            {celulas.map((linha, dia) => (
              <FragmentoDeDia key={dia} label={heatmap.dayLabels[dia] ?? `D+${dia}`} linha={linha} />
            ))}

            {/* Régua de horas */}
            <span aria-hidden="true" />
            {Array.from({ length: 24 }, (_, h) => (
              // `.hx` do mockup: 9px, surface-600, centralizado.
              <span key={h} className="text-[9px] text-surface-600 text-center leading-4">
                {HORAS_ROTULADAS.includes(h) ? h : ''}
              </span>
            ))}
          </div>
        </div>
      )}
    </Card>
  )
}

function FragmentoDeDia({ label, linha }: { label: string; linha: { count: number; cor: string }[] }) {
  return (
    <>
      {/* `.hl` do mockup: 10px, surface-500, alinhado à direita com 4px de folga. */}
      <span className="text-[10px] text-surface-500 leading-4 text-right pr-1">{label}</span>
      {linha.map((celula, hora) => (
        <div
          key={hora}
          className="h-4 rounded-[3px]"
          style={{ backgroundColor: celula.cor }}
          // `title` dá o número no hover; o `aria-label` dá o mesmo para quem
          // navega por leitor de tela, célula a célula.
          title={`${label} ${hora}h — ${celula.count} ${celula.count === 1 ? 'leitura' : 'leituras'}`}
          aria-label={`${label} ${hora} horas, ${celula.count} leituras`}
          role="img"
        />
      ))}
    </>
  )
}
