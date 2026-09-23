// Direção C (mockups-templates.html, aprovada pelo PO): número grande +
// rótulo miúdo, separados por linha de 1px — não cards com borda/fundo
// individuais. Usado nos vários pontos de CampaignReport.tsx e
// AttributionTab.tsx que hoje repetem o mesmo "grid de cards pequenos" com
// tratamentos ligeiramente diferentes (T7, achado transversal do loop de
// polimento — mesma peça, medida diferente em 5+ lugares do mesmo arquivo).
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
            <p className="text-3xs text-surface-500 mt-0.5 leading-tight truncate">{item.label}</p>
            {item.sub && <p className="text-3xs text-surface-600 truncate">{item.sub}</p>}
          </Tag>
        )
      })}
    </div>
  )
}
