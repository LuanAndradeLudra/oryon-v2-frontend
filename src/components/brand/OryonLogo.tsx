import { useId, type CSSProperties } from 'react'
import { cn } from '@/lib/utils'

/**
 * Logo da Oryon, direção Órbita (kit em marca-oryon/, 01/10).
 *
 * - variant="horizontal": símbolo + palavra (padrão)
 * - variant="wordmark": só a palavra
 * - variant="symbol": só o símbolo
 *
 * A palavra usa `currentColor`: segue a cor do texto do lugar (use os tokens,
 * ex.: `text-surface-50`; o projeto não tem variante `dark:`). O ponto da
 * órbita usa `accentColor`, que por padrão lê --oryon-accent (#2DD4BF no tema
 * escuro, #0D9488 no claro — index.css). O tamanho vem da altura: `className="h-7"`.
 *
 * Diferenças para `marca-oryon/react/OryonLogo.tsx` (ajustes de integração):
 *  • sem `display:block` / `width:auto` inline — viram classes padrão, para
 *    `hidden`, `min-[420px]:block` e `w-*` de quem usa funcionarem;
 *  • `decorativa`: sem nome acessível (aria-hidden, sem <title>), para quando
 *    o nome já está ao lado (símbolo + palavra separados) ou no botão em volta.
 *
 * A marca está em registro no INPI e o nome ainda pode mudar: todo uso da logo
 * no app passa por este componente.
 */
type Props = {
  variant?: 'horizontal' | 'wordmark' | 'symbol'
  mono?: boolean
  accentColor?: string
  className?: string
  style?: CSSProperties
  title?: string
  /** Sem nome acessível: o nome já está no texto ou no controle em volta. */
  decorativa?: boolean
}

const ANEL = 'M133.26 53.79A62 62 0 1 1 96.21 16.74L89.36 35.53A42 42 0 1 0 114.47 60.64Z'

const GLIFOS: Array<[number, string, ('evenodd' | undefined)?]> = [
  [0, 'M96.98 72.9A50 50 0 1 1 67.1 43.02L61.63 58.05A34 34 0 1 0 81.95 78.37Z'],
  [114, 'M0 40H16V140H0ZM0 90A50 50 0 0 1 50 40H58V56H50A34 34 0 0 0 16 90Z'],
  [192, 'M-4.835 40L12.835 40L50 119.32L79.466 40L96.534 40L44.534 180L27.466 180L42.19 140.36Z'],
  [292, 'M0 90A50 50 0 1 0 100 90A50 50 0 1 0 0 90ZM16 90A34 34 0 1 1 84 90A34 34 0 1 1 16 90Z', 'evenodd'],
  [406, 'M0 40H16V140H0ZM0 90A50 50 0 0 1 100 90V140H84V90A34 34 0 0 0 16 90Z'],
]

const VIEWBOX = {
  horizontal: '13 28 679 152',
  wordmark: '0 40 506 140',
  symbol: '13 13 124 124',
} as const

export function OryonLogo({
  variant = 'horizontal',
  mono = false,
  accentColor = 'var(--oryon-accent, #14B8A6)',
  className,
  style,
  title = 'Oryon',
  decorativa = false,
}: Props) {
  const gradId = `oryon-grad-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`

  const simbolo = (dx: number, dy: number) =>
    mono ? (
      <g transform={`translate(${dx} ${dy})`} fill="currentColor">
        <path d={ANEL} />
        <circle cx="111.8" cy="38.2" r="13" />
        <circle cx="75" cy="75" r="17" />
      </g>
    ) : (
      <g transform={`translate(${dx} ${dy})`}>
        <path fill={`url(#${gradId})`} d={ANEL} />
        <circle fill="#5EEAD4" cx="111.8" cy="38.2" r="13" />
        <circle fill="#0F766E" cx="75" cy="75" r="17" />
      </g>
    )

  const palavra = (dx: number) => (
    <g transform={`translate(${dx} 0)`} fill="currentColor">
      {GLIFOS.map(([x, d, rule]) => (
        <path key={x} transform={`translate(${x} 0)`} d={d} fillRule={rule} />
      ))}
      <circle fill={mono ? 'currentColor' : accentColor} cx="79.7" cy="60.3" r="8" />
    </g>
  )

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={VIEWBOX[variant]}
      className={cn('block w-auto shrink-0', className)}
      style={style}
      {...(decorativa ? { 'aria-hidden': true, focusable: false } : { role: 'img', 'aria-label': title })}
    >
      {!decorativa && <title>{title}</title>}
      {!mono && variant !== 'wordmark' && (
        <defs>
          <linearGradient id={gradId} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="150" y2="150">
            <stop offset="0" stopColor="#5EEAD4" />
            <stop offset="0.55" stopColor="#14B8A6" />
            <stop offset="1" stopColor="#0F766E" />
          </linearGradient>
        </defs>
      )}
      {variant === 'symbol' && simbolo(0, 0)}
      {variant === 'wordmark' && palavra(0)}
      {variant === 'horizontal' && (
        <>
          {simbolo(0, 15)}
          {palavra(186)}
        </>
      )}
    </svg>
  )
}
