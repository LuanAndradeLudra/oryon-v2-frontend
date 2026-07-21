import { useMemo } from 'react'
import { Clock } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { MockBadge } from './MockBadge'
import { cn } from '@/lib/utils'

interface BestTimePanelProps {
  contactId: string
}

const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const PERIODS = [
  { key: 'madrugada', label: 'Madrugada', short: '0–6h' },
  { key: 'manha', label: 'Manhã', short: '6–12h' },
  { key: 'tarde', label: 'Tarde', short: '12–18h' },
  { key: 'noite', label: 'Noite', short: '18–24h' },
]

function hashOf(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return h
}

/** Melhor horário para contatar — mapa de atividade (dia × período) do contato.
 *  Dados de EXEMPLO: o backend ainda não expõe timestamps de mensagens por
 *  contato (a query por hora/dia já existe no dashboard, falta escopar). */
export function BestTimePanel({ contactId }: BestTimePanelProps) {
  const { grid, best } = useMemo(() => {
    const h = hashOf(contactId)
    // Intensidade 0–3 por (período × dia), determinística por contato, com viés
    // realista (tarde/noite em dias úteis mais ativos).
    const grid = PERIODS.map((p, pi) =>
      DAYS.map((_, di) => {
        const weekday = di >= 1 && di <= 5
        const primeTime = pi === 2 || pi === 3
        let base = (h >> (pi * 3 + di)) % 4
        if (weekday && primeTime) base = Math.min(3, base + 1)
        if (pi === 0) base = Math.max(0, base - 2) // madrugada quase sempre baixa
        return base
      }),
    )
    // Melhor célula (maior intensidade) para o resumo.
    let bestPi = 0, bestDi = 0, max = -1
    grid.forEach((row, pi) => row.forEach((v, di) => { if (v > max) { max = v; bestPi = pi; bestDi = di } }))
    return { grid, best: { period: PERIODS[bestPi].label, day: DAYS[bestDi] } }
  }, [contactId])

  return (
    <Card noPadding className="overflow-hidden flex flex-col">
      <div className="flex items-center justify-between px-4 pt-3.5 pb-2 shrink-0">
        <h3 className="text-sm font-semibold text-surface-100 inline-flex items-center gap-1.5">
          <Clock className="w-4 h-4 text-surface-400" />
          Melhor horário
        </h3>
        <MockBadge />
      </div>

      <div className="px-4 pb-4 flex-1 flex flex-col">
        <p className="text-xs text-surface-300 mb-3 shrink-0">
          Costuma estar ativo <span className="font-semibold text-surface-100">{best.day} à {best.period.toLowerCase()}</span>.
        </p>

        {/* Grade período × dia — as células crescem para preencher a altura */}
        <div className="flex flex-col gap-1 flex-1 min-h-0">
          <div className="flex items-center gap-1 pl-14 shrink-0">
            {DAYS.map((d, i) => (
              <span key={i} className="flex-1 text-center text-[11px] text-surface-400">{d[0]}</span>
            ))}
          </div>
          {grid.map((row, pi) => (
            <div key={PERIODS[pi].key} className="flex items-center gap-1 flex-1 min-h-0">
              <span className="w-14 text-[11px] text-surface-400 truncate flex-shrink-0">{PERIODS[pi].label}</span>
              {row.map((v, di) => (
                <div
                  key={di}
                  title={`${PERIODS[pi].label} · ${DAYS[di]}`}
                  className={cn('flex-1 h-full min-h-[16px] rounded-sm', v === 0 && 'bg-surface-700/50')}
                  style={v > 0 ? { backgroundColor: `color-mix(in srgb, var(--color-brand-500) ${v * 33}%, var(--color-surface-700))` } : undefined}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}
