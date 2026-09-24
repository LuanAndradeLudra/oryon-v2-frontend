/**
 * Receita dos CTAs da landing. São `<a>`/`<Link>` (navegam de verdade, abrem em
 * nova aba), então não dá para usar o `ui/Button` (renderiza `<button>`; botão
 * dentro de link é HTML inválido). Mesmos tokens e medidas do Button: raio 7
 * (`rounded-sm`), primário = `--color-btn-primary-*` (o ÚNICO teal da página),
 * neutro = fundo surface + borda de ênfase. Um LinkButton em `ui/` substitui isto.
 */
const base =
  'inline-flex items-center justify-center gap-1.5 rounded-sm font-semibold whitespace-nowrap transition-colors ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-950'

export const ctaSize = {
  md: 'h-9 px-3.5 text-[13px]',
  lg: 'h-11 px-[18px] text-[14px]',
} as const

export const ctaPrimary =
  `${base} bg-[var(--color-btn-primary-bg)] text-[var(--color-btn-primary-fg)] hover:brightness-90`

export const ctaNeutral =
  `${base} bg-surface-800 text-surface-100 border border-[var(--bd2)] hover:bg-surface-700`
