// Zoom + pan de imagem no visualizador (pedido do usuário 2026-09-23). Testa o
// hook direto: limites, pan com clamp, pinça de dois dedos, teclado e reset
// entre imagens. A integração com o overlay está em MediaViewer.test.tsx.
import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { useImageZoom, clampZoom, ZOOM_MAX, ZOOM_MIN } from './useImageZoom'

type Hook = ReturnType<typeof useImageZoom>

/** Evento de ponteiro mínimo — só o que os handlers do hook leem. */
function pointer(pointerId: number, clientX: number, clientY: number) {
  return { pointerId, clientX, clientY, currentTarget: { setPointerCapture: vi.fn() } } as unknown as ReactPointerEvent<HTMLImageElement>
}

function setup(props: { enabled?: boolean; resetKey?: string } = {}) {
  const hook = renderHook((p: { enabled: boolean; resetKey: string | undefined }) => useImageZoom(p), {
    initialProps: { enabled: props.enabled ?? true, resetKey: props.resetKey ?? 'm1' },
  })
  // O hook mede a imagem (offsetWidth/Height) pra limitar o arraste.
  hook.result.current.imgProps.ref.current = { offsetWidth: 100, offsetHeight: 100 } as HTMLImageElement
  return hook
}

const transform = (h: { current: Hook }) => h.current.imgProps.style.transform

describe('clampZoom', () => {
  it('limita a [0.5, 4]', () => {
    expect(clampZoom(0)).toBe(ZOOM_MIN)
    expect(clampZoom(99)).toBe(ZOOM_MAX)
    expect(clampZoom(1.5)).toBe(1.5)
  })

  it('não engole deltas pequenos da roda/trackpad (3 casas)', () => {
    expect(clampZoom(1.002)).toBe(1.002)
  })
})

describe('useImageZoom — zoom', () => {
  it('começa em 1x', () => {
    const { result } = setup()
    expect(result.current.zoom).toBe(1)
    expect(transform(result)).toBe('translate(0px, 0px) scale(1)')
  })

  it('zoomIn/zoomOut andam de 0.25 em 0.25 e respeitam os limites', () => {
    const { result } = setup()
    act(() => result.current.zoomIn())
    expect(result.current.zoom).toBe(1.25)
    act(() => result.current.zoomOut())
    act(() => result.current.zoomOut())
    expect(result.current.zoom).toBe(0.75)

    for (let i = 0; i < 30; i++) act(() => result.current.zoomIn())
    expect(result.current.zoom).toBe(ZOOM_MAX)
    expect(result.current.canZoomIn).toBe(false)

    for (let i = 0; i < 30; i++) act(() => result.current.zoomOut())
    expect(result.current.zoom).toBe(ZOOM_MIN)
    expect(result.current.canZoomOut).toBe(false)
  })

  it('reset volta pra 1x', () => {
    const { result } = setup()
    act(() => result.current.zoomIn())
    act(() => result.current.reset())
    expect(result.current.zoom).toBe(1)
  })

  it('duplo clique: 1x → 2x → 1x', () => {
    const { result } = setup()
    act(() => result.current.imgProps.onDoubleClick())
    expect(result.current.zoom).toBe(2)
    act(() => result.current.imgProps.onDoubleClick())
    expect(result.current.zoom).toBe(1)
  })

  it('trocar o resetKey (outra imagem) volta pra 1x — nunca abre já ampliada da anterior', () => {
    const { result, rerender } = setup({ resetKey: 'm1' })
    act(() => result.current.zoomIn())
    act(() => result.current.zoomIn())
    expect(result.current.zoom).toBe(1.5)
    rerender({ enabled: true, resetKey: 'm2' })
    expect(result.current.zoom).toBe(1)
  })
})

describe('useImageZoom — teclado', () => {
  const key = (k: string, extra: KeyboardEventInit = {}) =>
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: k, ...extra }))
    })

  it('+ / = ampliam, - reduz, 0 restaura', () => {
    const { result } = setup()
    key('+')
    key('=')
    expect(result.current.zoom).toBe(1.5)
    key('-')
    expect(result.current.zoom).toBe(1.25)
    key('0')
    expect(result.current.zoom).toBe(1)
  })

  it('ignora com Ctrl/Cmd (atalho de zoom do próprio navegador)', () => {
    const { result } = setup()
    key('+', { ctrlKey: true })
    key('=', { metaKey: true })
    expect(result.current.zoom).toBe(1)
  })

  it('ignora enquanto se digita num campo', () => {
    const { result } = setup()
    const input = document.createElement('input')
    document.body.appendChild(input)
    act(() => {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: '+', bubbles: true }))
    })
    document.body.removeChild(input)
    expect(result.current.zoom).toBe(1)
  })

  it('desligado (enabled=false, ex.: PDF/vídeo aberto): não escuta o teclado', () => {
    const { result } = setup({ enabled: false })
    key('+')
    expect(result.current.zoom).toBe(1)
  })
})

describe('useImageZoom — arrastar pra mover', () => {
  it('em 1x arrastar não move nada (não há excedente)', () => {
    const { result } = setup()
    act(() => result.current.imgProps.onPointerDown(pointer(1, 0, 0)))
    act(() => result.current.imgProps.onPointerMove(pointer(1, 40, 40)))
    expect(transform(result)).toBe('translate(0px, 0px) scale(1)')
  })

  it('ampliado: a imagem acompanha o ponteiro', () => {
    const { result } = setup()
    act(() => result.current.imgProps.onDoubleClick()) // 2x
    act(() => result.current.imgProps.onPointerDown(pointer(1, 100, 100)))
    act(() => result.current.imgProps.onPointerMove(pointer(1, 120, 110)))
    expect(transform(result)).toBe('translate(20px, 10px) scale(2)')
    expect(result.current.imgProps.style.cursor).toBe('grabbing')
    act(() => result.current.imgProps.onPointerUp(pointer(1, 120, 110)))
    expect(result.current.imgProps.style.cursor).toBe('grab')
  })

  it('não deixa arrastar a imagem pra fora da tela (limite = metade do excedente)', () => {
    const { result } = setup()
    act(() => result.current.imgProps.onDoubleClick()) // 2x, imagem 100px → excedente 100 → ±50
    act(() => result.current.imgProps.onPointerDown(pointer(1, 0, 0)))
    act(() => result.current.imgProps.onPointerMove(pointer(1, 500, -500)))
    expect(transform(result)).toBe('translate(50px, -50px) scale(2)')
  })

  it('voltar pra 1x zera o deslocamento', () => {
    const { result } = setup()
    act(() => result.current.imgProps.onDoubleClick())
    act(() => result.current.imgProps.onPointerDown(pointer(1, 0, 0)))
    act(() => result.current.imgProps.onPointerMove(pointer(1, 30, 30)))
    act(() => result.current.imgProps.onPointerUp(pointer(1, 30, 30)))
    act(() => result.current.reset())
    expect(transform(result)).toBe('translate(0px, 0px) scale(1)')
  })
})

describe('useImageZoom — pinça (dois dedos)', () => {
  it('afastar os dedos amplia na proporção; aproximar reduz', () => {
    const { result } = setup()
    act(() => result.current.imgProps.onPointerDown(pointer(1, 0, 0)))
    act(() => result.current.imgProps.onPointerDown(pointer(2, 100, 0)))
    act(() => result.current.imgProps.onPointerMove(pointer(2, 200, 0))) // 100 → 200 = 2x
    expect(result.current.zoom).toBe(2)
    act(() => result.current.imgProps.onPointerMove(pointer(2, 150, 0))) // 100 → 150 = 1.5x
    expect(result.current.zoom).toBe(1.5)
  })

  it('a pinça também respeita os limites', () => {
    const { result } = setup()
    act(() => result.current.imgProps.onPointerDown(pointer(1, 0, 0)))
    act(() => result.current.imgProps.onPointerDown(pointer(2, 10, 0)))
    act(() => result.current.imgProps.onPointerMove(pointer(2, 1000, 0)))
    expect(result.current.zoom).toBe(ZOOM_MAX)
  })

  it('soltar um dedo depois da pinça não faz a imagem dar um salto (não retoma o arraste)', () => {
    const { result } = setup()
    act(() => result.current.imgProps.onPointerDown(pointer(1, 0, 0)))
    act(() => result.current.imgProps.onPointerDown(pointer(2, 100, 0)))
    act(() => result.current.imgProps.onPointerMove(pointer(2, 200, 0))) // 2x
    act(() => result.current.imgProps.onPointerUp(pointer(2, 200, 0)))
    const before = transform(result)
    act(() => result.current.imgProps.onPointerMove(pointer(1, 300, 300)))
    expect(transform(result)).toBe(before)
  })
})
