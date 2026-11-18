import type { ReactNode } from 'react'
import { OryonLogo } from '@/components/brand/OryonLogo'

/**
 * ORY-96/97 — a moldura das telas do OAuth ("Conectar à Oryon" e a aprovação de ações):
 * logo da Oryon e um cartão centralizado, sem o app em volta. Claro e escuro pelos tokens.
 */
export function MolduraOAuth({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    // Revisão ORY-94 (2ª rodada): o app trava a rolagem no html/body/#root; fora do AppShell,
    // a tela precisa rolar sozinha (senão "Aprovar" e "Recusar" ficam fora do alcance no celular).
    <div className="h-[100dvh] overflow-y-auto overscroll-contain w-full bg-surface-950 flex flex-col items-center px-4 pt-[calc(2.5rem+env(safe-area-inset-top))] pb-[calc(2.5rem+env(safe-area-inset-bottom))]">
      <h1 className="sr-only">{titulo}</h1>
      <OryonLogo className="h-7 shrink-0 text-surface-50 select-none mb-6" />
      <main className="w-full max-w-md shrink-0 bg-surface-800 rounded-[12px] p-5 sm:p-6">{children}</main>
    </div>
  )
}
