import { MessageSquare, Bot, Filter, Users, Send, BarChart3 } from 'lucide-react'
import { productGrid, LANDING_ANCHORS } from '../landingCopy'

const ICONS = {
  conversas: MessageSquare,
  agentes: Bot,
  funis: Filter,
  leads: Users,
  disparos: Send,
  relatorios: BarChart3,
} as const

/**
 * Grade 2×3 dos módulos que existem e estão ligados. Cards NÃO são links
 * (não há página pública de cada módulo — link morto seria P14); a descrição é
 * o que o app faz hoje.
 */
export function ProductGrid() {
  return (
    <section
      id={LANDING_ANCHORS.produto}
      data-section="produto"
      className="scroll-mt-16 border-t border-surface-700 bg-surface-950 py-16 sm:py-24"
    >
      <div className="mx-auto w-full max-w-[1120px] px-4 sm:px-6">
        <h2 className="max-w-[24ch] font-display font-extrabold tracking-[-0.02em] leading-[1.1] text-surface-50 text-[clamp(1.75rem,3.4vw,2.5rem)]">
          {productGrid.title}
        </h2>
        <p className="mt-4 max-w-[60ch] text-base leading-relaxed text-surface-300">{productGrid.lead}</p>

        <ul className="mt-12 grid gap-4 md:grid-cols-2">
          {productGrid.items.map((item) => {
            const Icon = ICONS[item.key]
            return (
              <li key={item.key} className="rounded-lg border border-surface-700 bg-surface-800 p-5">
                <span className="inline-flex w-8 h-8 items-center justify-center rounded-sm border border-surface-700 bg-[var(--sf2)] text-surface-300">
                  <Icon className="w-4 h-4" strokeWidth={1.75} aria-hidden />
                </span>
                <h3 className="mt-4 font-display text-base font-bold tracking-[-0.01em] text-surface-50">{item.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-surface-300">{item.text}</p>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
