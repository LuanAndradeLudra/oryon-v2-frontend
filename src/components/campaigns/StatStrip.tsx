// Direção C (mockups-templates.html, aprovada pelo PO): número grande +
// rótulo miúdo, separados por linha de 1px — não cards com borda/fundo
// individuais. Usado nos vários pontos de CampaignReport.tsx e
// AttributionTab.tsx que hoje repetem o mesmo "grid de cards pequenos" com
// tratamentos ligeiramente diferentes (T7, achado transversal do loop de
// polimento — mesma peça, medida diferente em 5+ lugares do mesmo arquivo).
//
// Divergência DELIBERADA: número em text-lg/700 (18px) é o tier COMPACTO de
// estatística — distinto do KPI de página, que usa 26/800 (`KpiGrid.tsx:50`,
// Dashboard). Dentro de um relatório, num grid de 4 a 6 números lado a lado,
// 18px é a densidade certa; não suba pra 26 achando que é inconsistência.
import { cn } from '@/lib/utils'

export interface StatStripItem {
  label: string
  value: React.ReactNode
  sub?: string
  /** Cor do número — só quando o valor É o dado (churn, engajamento), nunca decorativa. */
  color?: string
  onClick?: () => void
  active?: boolean
}

interface StatStripProps {
  items: StatStripItem[]
  className?: string
}

export function StatStrip({ items, className }: StatStripProps) {
  return (
    <div
      className={cn('grid border border-surface-700 rounded-lg overflow-hidden', className)}
      style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}
    >
      {items.map((item, i) => {
        const Tag = item.onClick ? 'button' : 'div'
        return (
          <Tag
            key={item.label}
            type={item.onClick ? 'button' : undefined}
            onClick={item.onClick}
            className={cn(
              'px-3 py-2.5 text-center min-w-0',
              i > 0 && 'border-l border-surface-700',
              item.onClick && 'cursor-pointer hover:bg-[var(--rowhover)] transition-colors',
              item.active && 'bg-[var(--sf2)]',
            )}
          >
            <p className="text-lg font-bold tabular-nums truncate" style={item.color ? { color: item.color } : undefined}>
              {item.value}
            </p>
            {/* Piso tipográfico do produto pra texto informativo é 11px
                (--text-2xs, P8) — não o 10px de --text-3xs. */}
            <p className="text-2xs text-surface-500 mt-0.5 leading-tight truncate">{item.label}</p>
            {item.sub && <p className="text-2xs text-surface-600 truncate">{item.sub}</p>}
          </Tag>
        )
      })}
    </div>
  )
}
