import { createContext, useContext, useLayoutEffect } from 'react'

/**
 * ORY-60 — "modo foco": uma tela de edição (o canvas de Jornadas) pede a tela
 * inteira. Enquanto ligado, o AppShell não mostra o menu lateral nem a barra do
 * topo; a própria página desenha a sua barra (com o "voltar"). Ao sair da tela,
 * o modo desliga sozinho. Só no computador; o celular não muda.
 * O provedor fica em `ModoFocoContext.tsx`.
 */

export type ContextoDoModoFoco = { ativo: boolean; setAtivo: (v: boolean) => void }

export const ModoFocoContext = createContext<ContextoDoModoFoco>({ ativo: false, setAtivo: () => {} })

/** O AppShell lê: a página atual pediu o modo foco? */
export function useModoFocoAtivo(): boolean {
  return useContext(ModoFocoContext).ativo
}

/** A página pede o modo foco enquanto estiver montada (e `ligado`). */
export function useModoFoco(ligado = true) {
  const { setAtivo } = useContext(ModoFocoContext)
  useLayoutEffect(() => {
    if (!ligado) return
    setAtivo(true)
    return () => setAtivo(false)
  }, [ligado, setAtivo])
}
