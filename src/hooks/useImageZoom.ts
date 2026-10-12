import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'

export const ZOOM_MIN = 0.5
export const ZOOM_MAX = 4
export const ZOOM_STEP = 0.25
/** Duplo clique/toque alterna entre "ajustado à tela" (1x) e este nível. */
const DOUBLE_CLICK_ZOOM = 2

interface View {
  zoom: number
  x: number
  y: number
}

const INITIAL_VIEW: View = { zoom: 1, x: 0, y: 0 }

/** Limita o zoom a [ZOOM_MIN, ZOOM_MAX]. Arredonda em 3 casas: a roda do mouse
 *  manda deltas pequenos (trackpad) e o acumulado não pode virar ruído de
 *  ponto flutuante no indicador de %, mas 2 casas engoliria os deltas menores. */
export function clampZoom(z: number): number {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(z * 1000) / 1000))
}

/** Quanto a imagem pode ser arrastada: só o excedente do tamanho ampliado
 *  (metade pra cada lado). Sem isto dava pra jogar a imagem pra fora da tela. */
function clampPan(offset: number, baseSize: number, zoom: number): number {
  const max = Math.max(0, (baseSize * (zoom - 1)) / 2)
  return Math.min(max, Math.max(-max, offset))
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

/**
 * Zoom + pan de uma imagem no visualizador (pedido do usuário 2026-09-23 —
 * o visualizador in-app não tinha como ampliar/reduzir PNG/JPEG).
 *
 * Entradas cobertas: botões (o consumidor liga `zoomIn`/`zoomOut`/`reset`),
 * teclado (+ / - / 0), roda do mouse e pinça do trackpad (Ctrl+roda), duplo
 * clique, arrastar pra mover quando ampliado e pinça de dois dedos no toque.
 *
 * `resetKey` (ex.: id da mensagem aberta): mudou → volta pra 1x sem pan, pra
 * a próxima imagem nunca abrir já ampliada da anterior.
 */
export function useImageZoom({ enabled, resetKey }: { enabled: boolean; resetKey: string | undefined }) {
  const [view, setView] = useState<View>(INITIAL_VIEW)
  const [lastKey, setLastKey] = useState(resetKey)
  // true enquanto há arraste ou pinça em andamento (desliga a transição do zoom).
  const [interacting, setInteracting] = useState(false)

  // Ajuste de estado durante o render (padrão recomendado pelo React pra
  // "resetar estado quando uma prop muda") — evita um render intermediário
  // com o zoom da imagem anterior que um useEffect deixaria passar.
  if (resetKey !== lastKey) {
    setLastKey(resetKey)
    setView(INITIAL_VIEW)
  }

  const imgRef = useRef<HTMLImageElement | null>(null)
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const drag = useRef<{ x: number; y: number; originX: number; originY: number } | null>(null)
  const pinch = useRef<{ startDistance: number; startZoom: number } | null>(null)

  const zoomBy = useCallback((delta: number) => {
    setView((v) => {
      const zoom = clampZoom(v.zoom + delta)
      // Voltou pra 1x ou menos: não há excedente pra arrastar, zera o pan.
      return zoom <= 1 ? { zoom, x: 0, y: 0 } : { ...v, zoom }
    })
  }, [])
  const zoomIn = useCallback(() => zoomBy(ZOOM_STEP), [zoomBy])
  const zoomOut = useCallback(() => zoomBy(-ZOOM_STEP), [zoomBy])
  const reset = useCallback(() => setView(INITIAL_VIEW), [])

  // Teclado: + / = amplia, - reduz, 0 restaura. Nunca com Ctrl/Cmd/Alt (são
  // os atalhos de zoom do próprio navegador) nem enquanto se digita.
  useEffect(() => {
    if (!enabled) return
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
      if (e.key === '+' || e.key === '=') zoomBy(ZOOM_STEP)
      else if (e.key === '-' || e.key === '_') zoomBy(-ZOOM_STEP)
      else if (e.key === '0') reset()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [enabled, zoomBy, reset])

  // Roda do mouse / pinça do trackpad. Listener NATIVO e não-passivo: o
  // onWheel do React é passivo, e sem preventDefault o Ctrl+roda (pinça do
  // trackpad) daria zoom na PÁGINA inteira do navegador por baixo do overlay.
  // Callback ref: o elemento só existe quando o visualizador está aberto.
  const [container, setContainer] = useState<HTMLDivElement | null>(null)
  useEffect(() => {
    if (!enabled || !container) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      zoomBy(-e.deltaY * 0.002)
    }
    container.addEventListener('wheel', onWheel, { passive: false })
    return () => container.removeEventListener('wheel', onWheel)
  }, [enabled, container, zoomBy])

  const onPointerDown = (e: ReactPointerEvent<HTMLImageElement>) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    // Captura mantém o arraste mesmo com o cursor saindo da imagem. Pode
    // lançar (ponteiro sintético/já liberado) e nem existe no jsdom — o
    // gesto funciona sem ela, só perde o "segurar fora da imagem".
    try {
      e.currentTarget.setPointerCapture?.(e.pointerId)
    } catch {
      /* segue sem captura */
    }
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      pinch.current = { startDistance: distance(a, b), startZoom: view.zoom }
      drag.current = null
      setInteracting(true)
    } else if (view.zoom > 1) {
      drag.current = { x: e.clientX, y: e.clientY, originX: view.x, originY: view.y }
      setInteracting(true)
    }
  }

  const onPointerMove = (e: ReactPointerEvent<HTMLImageElement>) => {
    if (!pointers.current.has(e.pointerId)) return
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()]
      const zoom = clampZoom((pinch.current.startZoom * distance(a, b)) / pinch.current.startDistance)
      setView((v) => (zoom <= 1 ? { zoom, x: 0, y: 0 } : { ...v, zoom }))
      return
    }

    const d = drag.current
    const img = imgRef.current
    if (!d || !img) return
    setView((v) => ({
      ...v,
      x: clampPan(d.originX + (e.clientX - d.x), img.offsetWidth, v.zoom),
      y: clampPan(d.originY + (e.clientY - d.y), img.offsetHeight, v.zoom),
    }))
  }

  const endPointer = (e: ReactPointerEvent<HTMLImageElement>) => {
    pointers.current.delete(e.pointerId)
    if (pointers.current.size < 2) pinch.current = null
    // Sobrou um dedo depois da pinça: não retoma o arraste dele do meio do
    // gesto (o ponto de partida seria o da pinça e a imagem daria um salto).
    drag.current = null
    if (pointers.current.size === 0) setInteracting(false)
  }

  const onDoubleClick = () => {
    setView((v) => (v.zoom > 1 ? INITIAL_VIEW : { ...v, zoom: DOUBLE_CLICK_ZOOM }))
  }

  const style: CSSProperties = {
    transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})`,
    // Sem transição durante o arraste/pinça: a imagem precisa seguir o dedo
    // sem atraso; com transição, só nos passos discretos (botão/tecla/roda).
    transition: interacting ? 'none' : 'transform 120ms ease-out',
    cursor: view.zoom > 1 ? (interacting ? 'grabbing' : 'grab') : 'default',
    // Sem isto o navegador consome o gesto (rolagem/pinça da página) antes
    // do nosso handler de ponteiro ver.
    touchAction: 'none',
    userSelect: 'none',
  }

  return {
    zoom: view.zoom,
    canZoomIn: view.zoom < ZOOM_MAX,
    canZoomOut: view.zoom > ZOOM_MIN,
    zoomIn,
    zoomOut,
    reset,
    /** Ref do container (recebe a roda do mouse). */
    containerRef: setContainer,
    /** Ref + handlers + estilo pra espalhar no <img>. */
    imgProps: {
      ref: imgRef,
      style,
      draggable: false,
      onPointerDown,
      onPointerMove,
      onPointerUp: endPointer,
      onPointerCancel: endPointer,
      onDoubleClick,
    },
  }
}
