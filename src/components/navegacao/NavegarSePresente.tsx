import { Navigate, type NavigateProps } from 'react-router-dom'
import { useIsPresent } from 'framer-motion'

/**
 * `<Navigate>` que só age se a página ainda é a atual (PO 02/10).
 *
 * O `PageTransition` usa `AnimatePresence mode="wait"`: ao trocar de seção, a
 * página antiga continua montada durante a saída, mas já lendo a URL NOVA.
 * Uma página que redireciona quando falta um parâmetro (ex.: Configurações
 * sem `:section`, ficha sem `:id`) achava que alguém abriu a URL incompleta e
 * fazia `replace` de volta para ela — o usuário ficava preso na tela.
 * Página de saída tem `useIsPresent() === false`; fora de AnimatePresence é
 * sempre `true`, então o comportamento normal não muda.
 */
export function NavegarSePresente(props: NavigateProps) {
  const presente = useIsPresent()
  return presente ? <Navigate {...props} /> : null
}
