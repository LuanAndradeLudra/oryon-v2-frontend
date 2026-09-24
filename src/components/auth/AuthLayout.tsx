import type { ReactNode } from 'react'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { AuthBrandMark, AuthBrandPanel } from './AuthBrandPanel'
import { ThemeToggleButton } from './ThemeToggleButton'

/**
 * Moldura das telas de autenticação (login, esqueci, redefinir).
 *  - lg+ : painel de marca à esquerda (com o palco estático) + coluna do
 *    formulário de 480px à direita.
 *  - <lg : coluna única, marca em cima e o formulário num card; SEM palco (o
 *    componente nem monta — nada de chunk do palco no celular).
 * Só tokens: o tema vem das variáveis, não de ternário. O toggle de tema fica no
 * canto SUPERIOR direito (o pill inferior colidia com o teclado do celular).
 */
export function AuthLayout({ children }: { children: ReactNode }) {
  const isLarge = useMediaQuery('(min-width: 1024px)')
  return (
    <div className="min-h-[100dvh] w-full flex bg-surface-950">
      <h1 className="sr-only">Oryon</h1>
      <ThemeToggleButton className="fixed z-50 top-[calc(0.75rem+env(safe-area-inset-top))] right-3" />

      {isLarge && <AuthBrandPanel />}

      <main className="w-full lg:w-[480px] lg:flex-shrink-0 flex flex-col items-center justify-start lg:justify-center px-6 sm:px-8 pt-[calc(4.5rem+env(safe-area-inset-top))] lg:pt-12 pb-[calc(2.5rem+env(safe-area-inset-bottom))] lg:pb-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8">
            <AuthBrandMark />
            <p className="mt-3 text-sm text-surface-400">Atende sozinho. O humano entra na hora certa.</p>
          </div>
          {/* Card só no mobile; no desktop a coluna já é a superfície. */}
          <div className="bg-surface-800 border border-surface-700 rounded-lg p-5 lg:bg-transparent lg:border-0 lg:p-0">
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}
