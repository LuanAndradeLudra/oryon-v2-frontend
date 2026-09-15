import { useMemo, type MutableRefObject } from 'react'

// SCRUM-1068: nenhuma lista preservava a posição de rolagem de forma
// robusta — o único mecanismo existente (em ConversationsPage) era um
// `useRef(0)` comum, que só sobrevive porque aquela página nunca desmonta
// ao abrir/fechar um chat. Contatos, Negócios, Campanhas e Automações
// desmontam a lista de verdade ao navegar pra um item (rota diferente), e
// um `useRef` local se perde nesse unmount.
//
// Este Map em nível de módulo é o armazenamento que sobrevive ao unmount —
// cada chave (uma por lista) guarda o último scrollTop conhecido, e o hook
// devolve um objeto com a MESMA forma de `useRef` (`{ current }`), só que
// lendo/escrevendo direto no Map via getter/setter. Componentes de lista já
// preparados para receber um `scrollPositionRef` (ex. ConversationList)
// funcionam aqui sem nenhuma mudança neles.
const store = new Map<string, number>()

export function useListScrollMemory(key: string): MutableRefObject<number> {
  return useMemo<MutableRefObject<number>>(() => ({
    get current() {
      return store.get(key) ?? 0
    },
    set current(value: number) {
      store.set(key, value)
    },
  }), [key])
}
