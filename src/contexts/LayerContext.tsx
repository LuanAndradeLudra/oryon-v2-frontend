import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

/**
 * Registro central de camadas (overlays) — Modal, Drawer e o painel de
 * negócio hoje decidem seu z-index cada um por conta própria (grupos
 * descoordenados: z-[60], z-49/50, z-39/40) e cada um registra seu próprio
 * listener de Escape em `window`. Resultado: dois overlays empilhados podem
 * empatar de z-index (a ordem vira acidente do DOM) e Esc fecha os dois ao
 * mesmo tempo em vez de só o de cima.
 *
 * `useLayer` substitui isso por uma pilha única: cada overlay aberto entra
 * na pilha na ordem em que monta, ganha um z-index derivado da sua posição
 * atual nela (nunca um contador crescente sem limite) e só o topo da pilha
 * responde ao Escape.
 */

const BASE_Z = 60

interface LayerEntry {
  id: number
  onClose: () => void
}

interface LayerContextValue {
  stack: LayerEntry[]
  push: (onClose: () => void) => number
  pop: (id: number) => void
}

const LayerContext = createContext<LayerContextValue | null>(null)

let nextLayerId = 1

export function LayerProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<LayerEntry[]>([])
  const stackRef = useRef(stack)
  stackRef.current = stack

  const push = useCallback((onClose: () => void) => {
    const id = nextLayerId++
    setStack((s) => [...s, { id, onClose }])
    return id
  }, [])

  const pop = useCallback((id: number) => {
    setStack((s) => s.filter((entry) => entry.id !== id))
  }, [])

  // Um único listener para o app inteiro — fecha só o overlay do topo,
  // nunca todos os que estiverem empilhados.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      const top = stackRef.current[stackRef.current.length - 1]
      top?.onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const value = useMemo(() => ({ stack, push, pop }), [stack, push, pop])
  return <LayerContext.Provider value={value}>{children}</LayerContext.Provider>
}

/**
 * Registra um overlay (modal/drawer/painel) na pilha compartilhada enquanto
 * `open` for true. Retorna o z-index a usar (base 60 + posição atual na
 * pilha — nunca um valor que só cresce) e se este é o overlay do topo, para
 * quem precisa saber (ex.: só o de cima intercepta clique no backdrop).
 */
export function useLayer(open: boolean, onClose: () => void): { zIndex: number; isTopmost: boolean } {
  const ctx = useContext(LayerContext)

  // Ref em vez de recriar a entrada da pilha a cada render — closures do
  // registro sempre leem a versão mais recente de onClose sem precisar
  // remover/reinserir na pilha (o que reordenaria os overlays).
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  const idRef = useRef<number | null>(null)

  // `push`/`pop` (useCallback estáveis) e não o `ctx` inteiro nas dependências:
  // o valor do contexto é recriado a CADA mudança da pilha (`useMemo` sobre
  // `stack`), e o próprio `push` muda a pilha — com `[open, ctx]` o efeito
  // reexecutava a cada push (cleanup → pop → push → novo ctx → …), num loop
  // infinito de efeitos enquanto qualquer Modal/Drawer/Dropdown estivesse
  // aberto (achado 2026-09-23 ao tentar testar o MediaViewer: >200 renders
  // num único mount; o worker do Vitest morria). Ver LayerContext.test.tsx.
  const push = ctx?.push
  const pop = ctx?.pop
  const hasProvider = ctx !== null

  // Registro na pilha compartilhada — só roda quando há um LayerProvider
  // por perto (sempre o caso em runtime, ver App.tsx).
  useEffect(() => {
    if (!push || !pop || !open) return
    const id = push(() => onCloseRef.current())
    idRef.current = id
    return () => {
      pop(id)
      idRef.current = null
    }
  }, [open, push, pop])

  // Fallback sem provider (ex.: Modal/Drawer renderizado isolado num teste
  // de unidade) — Escape continua funcionando, só não coordena com outros
  // overlays por não haver pilha compartilhada pra coordenar com.
  useEffect(() => {
    if (hasProvider || !open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCloseRef.current() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, hasProvider])

  if (!ctx) return { zIndex: BASE_Z, isTopmost: true }

  const position = idRef.current == null ? -1 : ctx.stack.findIndex((entry) => entry.id === idRef.current)
  const isTopmost = position !== -1 && position === ctx.stack.length - 1

  return { zIndex: BASE_Z + Math.max(position, 0), isTopmost }
}
