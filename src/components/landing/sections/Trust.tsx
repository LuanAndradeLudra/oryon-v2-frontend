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
 * Lista compacta: cabeçalho em cima e, embaixo, uma LINHA por fato (título à
 * esquerda, frase à direita; ~50px), sem card por item. Ícones em surface (teal
 * fica com o CTA). No celular a linha empilha título sobre frase.
 */
export function Trust() {
  return (
    <section
      id="confianca"
      data-section="confianca"
      className="scroll-mt-16 border-t border-surface-700 bg-surface-950 py-12 sm:py-16"
    >
      <div className="mx-auto w-full max-w-[1120px] px-4 sm:px-6">
        <h2 className="font-display font-extrabold tracking-[-0.02em] leading-[1.1] text-surface-50 text-[clamp(1.75rem,3.4vw,2.5rem)]">
          {trust.title}
        </h2>
        <p className="mt-3 max-w-[60ch] text-base leading-relaxed text-surface-400">{trust.lead}</p>

        <ul className="mt-8 divide-y divide-surface-700 border-y border-surface-700">
          {trust.items.map((item) => {
            const Icon = ICONS[item.key]
            return (
              <li
                key={item.key}
                className="grid gap-x-6 gap-y-0.5 py-3.5 md:grid-cols-[220px_minmax(0,1fr)] md:items-baseline"
              >
                <h3 className="flex items-center gap-2 font-display text-[15px] font-bold tracking-[-0.01em] text-surface-50">
                  <Icon className="w-4 h-4 flex-none text-surface-400" strokeWidth={1.75} aria-hidden />
                  {item.title}
                </h3>
                <p className="text-sm leading-relaxed text-surface-400">{item.text}</p>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
