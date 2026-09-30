import type { ReactNode } from 'react'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { AuthBrandMark, AuthBrandPanel } from './AuthBrandPanel'
import { RotatingWord } from './RotatingWord'
import { useSomenteEscuro } from '@/hooks/useSomenteEscuro'

/**
 * Moldura das telas de autenticação (login, esqueci, redefinir).
 *  - lg+ : painel de marca à esquerda (com o palco estático) + coluna do
 *    formulário de 480px à direita.
 *  - <lg : coluna única, marca em cima e o formulário num card; SEM palco (o
 *    componente nem monta — nada de chunk do palco no celular).
 * Só tokens: o tema vem das variáveis, não de ternário.
 * 30/09 (PO): as telas de acesso são SÓ ESCURAS, como a landing — sem o botão
 * de alternar tema.
 */
export function AuthLayout({ children }: { children: ReactNode }) {
  useSomenteEscuro()
  const isLarge = useMediaQuery('(min-width: 1024px)')
  return (
    <div className="min-h-[100dvh] w-full flex bg-surface-950">
      <h1 className="sr-only">Oryon</h1>

      {isLarge && <AuthBrandPanel />}

      <main className="w-full lg:w-[480px] lg:flex-shrink-0 flex flex-col items-center justify-start lg:justify-center px-6 sm:px-8 pt-[calc(4.5rem+env(safe-area-inset-top))] lg:pt-12 pb-[calc(2.5rem+env(safe-area-inset-bottom))] lg:pb-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8">
            <AuthBrandMark />
            {/* Restaurado a pedido do PO — headline com a palavra rotativa,
                como era antes. NÃO é h1 (o h1 sr-only "Oryon" acima é único;
                a headline aqui também não pode conter "entrar" — o smoke usa
                getByRole('heading', /entrar/i) para achar o h2 do formulário). */}
            <p className="mt-6 text-3xl font-bold text-surface-50 leading-tight tracking-tight">
              Conversas que<br />
              <RotatingWord />
            </p>
            <p className="mt-3 text-sm text-surface-400 leading-relaxed">
              Gerencie atendimentos, automatize follow-ups e transforme cada contato em uma oportunidade real.
            </p>
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
