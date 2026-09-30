import { cn } from '@/lib/utils'
import type { Connector } from './connectorView'

interface ConnectorTileProps {
  connector: Pick<Connector, 'brandColor' | 'logoInitial' | 'status'>
  size?: number
  radius?: number
}

/**
 * Tile do logo — cor da marca vive só aqui (README §3.10 "decisão de
 * arquitetura visual", nunca em faixa/hero). `--brand` é setado inline por
 * item, igual `--chip`; a mistura por tema vem do token único
 * `--connector-tile-mix` (Leva 0) — este componente não precisa saber o tema.
 * Sem SVG real de logo ainda (fallback universal): inicial na cor da marca.
 */
export function ConnectorTile({ connector, size = 40, radius = 9 }: ConnectorTileProps) {
  return (
    <div
      style={{
        ['--brand' as string]: connector.brandColor,
        width: size,
        height: size,
        borderRadius: radius,
        background: 'color-mix(in srgb, var(--brand) var(--connector-tile-mix), #fff)',
        borderColor: 'color-mix(in srgb, var(--brand) var(--connector-tile-border-mix), #fff)',
      }}
      className={cn(
        'flex items-center justify-center border flex-shrink-0',
        connector.status === 'comingSoon' && 'opacity-70',
      )}
    >
      <span
        style={{ color: connector.brandColor, fontSize: size * 0.425 }}
        className="font-extrabold"
      >
        {connector.logoInitial}
      </span>
    </div>
  )
}
