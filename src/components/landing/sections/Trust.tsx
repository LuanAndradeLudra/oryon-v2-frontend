import { Plug, UserCheck, ShieldCheck, BookOpen, Palette } from 'lucide-react'
import { trust } from '../landingCopy'

const ICONS = {
  conexao: Plug,
  contexto: UserCheck,
  verificacao: ShieldCheck,
  vocabulario: BookOpen,
  tema: Palette,
} as const

/**
 * Só fatos verificáveis do produto — sem selo, número, depoimento ou logo.
 * Ícones em surface (teal fica com o CTA).
 */
export function Trust() {
  return (
    <section
      id="confianca"
      data-section="confianca"
      className="scroll-mt-16 border-t border-surface-700 bg-surface-950 py-16 sm:py-24"
    >
      <div className="mx-auto w-full max-w-[1120px] px-4 sm:px-6 grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
        <div>
          <h2 className="max-w-[20ch] font-display font-extrabold tracking-[-0.02em] leading-[1.1] text-surface-50 text-[clamp(1.75rem,3.4vw,2.5rem)]">
            {trust.title}
          </h2>
          <p className="mt-4 max-w-[46ch] text-base leading-relaxed text-surface-300">{trust.lead}</p>
        </div>

        <ul className="divide-y divide-surface-700 border-y border-surface-700">
          {trust.items.map((item) => {
            const Icon = ICONS[item.key]
            return (
              <li key={item.key} className="flex gap-4 py-5">
                <span className="mt-0.5 inline-flex w-8 h-8 flex-none items-center justify-center rounded-sm border border-surface-700 bg-[var(--sf2)] text-surface-300">
                  <Icon className="w-4 h-4" strokeWidth={1.75} aria-hidden />
                </span>
                <div className="min-w-0">
                  <h3 className="font-display text-base font-bold tracking-[-0.01em] text-surface-50">{item.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-surface-300">{item.text}</p>
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
