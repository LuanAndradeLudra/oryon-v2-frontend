import { Building2, Calculator, Scale, ShoppingBag, Stethoscope, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { solucoes } from '../landingCopy'
import { teclasDasAbas } from '../ui/abasTeclado'
import { AREAS, type AreaId } from './areas'

/** Os mesmos ícones do campo "Área de atuação" do formulário de demonstração. */
const ICONE: Record<AreaId, LucideIcon> = {
  clinica: Stethoscope,
  imobiliaria: Building2,
  loja: ShoppingBag,
  contabilidade: Calculator,
  juridico: Scale,
}

const IDS = AREAS.map((a) => a.id)

/**
 * O SELETOR DE ÁREA do topo da /solucoes (02/10): cinco pílulas com o ícone da
 * área, logo abaixo do título — a escolha é a primeira coisa da página. Abas
 * de verdade (tablist, setas e Home/End); no celular a faixa rola na
 * horizontal, sem barra, e encosta nas bordas da tela.
 */
export function SeletorDeArea({ area, escolher }: { area: AreaId; escolher: (id: AreaId) => void }) {
  return (
    <div
      role="tablist"
      aria-label={solucoes.abasLabel}
      // A faixa do celular sangra até a borda da tela (o recuo é o do landing-container).
      className="-mx-[clamp(16px,4.5vw,72px)] flex gap-2 overflow-x-auto px-[clamp(16px,4.5vw,72px)] pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden"
    >
      {AREAS.map((a) => {
        const ativa = a.id === area
        const Icone = ICONE[a.id]
        return (
          <button
            key={a.id}
            id={`area-aba-${a.id}`}
            type="button"
            role="tab"
            aria-selected={ativa}
            aria-controls="area-painel"
            tabIndex={ativa ? 0 : -1}
            onClick={() => escolher(a.id)}
            onKeyDown={teclasDasAbas(IDS, area, escolher, 'area-aba-')}
            className={cn(
              'inline-flex h-11 flex-none cursor-pointer items-center gap-2 rounded-full px-4 text-[14.5px] font-semibold tracking-[-0.01em] transition-[background-color,box-shadow,color] duration-200',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-950',
              ativa
                ? 'bg-brand-500/[.14] text-surface-50 shadow-[inset_0_0_0_1px_rgba(45,212,191,.5)]'
                : 'bg-white/[.03] text-surface-300 shadow-[inset_0_0_0_1px_rgba(255,255,255,.10)] hover:bg-white/[.06] hover:text-surface-100',
            )}
          >
            <Icone className={cn('h-4 w-4', ativa ? 'text-[var(--landing-destaque)]' : 'text-surface-500')} strokeWidth={1.9} aria-hidden />
            {a.rotulo}
          </button>
        )
      })}
    </div>
  )
}
