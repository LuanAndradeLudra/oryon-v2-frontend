/**
 * A PREPARAÇÃO do ambiente de demonstração, compartilhada pela entrada
 * (`main.tsx`) e pelo teste de rotas — para o teste exercitar exatamente o
 * que roda na landing, e não uma cópia.
 *
 * Duas fases, porque a ordem é o que sustenta o isolamento:
 *
 *  1. `prepararAntesDoApp()` — síncrona, ANTES de qualquer módulo do app:
 *     armazenamento em memória, sessão semeada, rede vedada, rotas do backend.
 *  2. `conectarAoApp()` — depois que `services/api` e `services/socket`
 *     existem: pluga o adaptador nas duas instâncias de axios e instala o
 *     socket falso antes do primeiro `getSocket()`.
 */
import { instalarArmazenamentoIsolado, instalarGuardaDeRede } from './guards'
import { instalarBackendDemo, semearSessaoDemo } from './backend'

let preparado = false

export function prepararAntesDoApp() {
  if (preparado) return
  preparado = true
  instalarArmazenamentoIsolado()
  semearSessaoDemo()
  instalarGuardaDeRede()
  instalarBackendDemo()
}

type Ouvinte = (...a: unknown[]) => void
type Janela = { __demoAdapter?: unknown; __demoEmitir?: (ev: string, dados?: unknown) => void }

/** Emissor local com a interface do socket.io que o app usa. */
const ouvintes = new Map<string, Set<Ouvinte>>()
const socketFalso = {
  connected: true,
  id: 'demo-socket',
  on(ev: string, fn: Ouvinte) { (ouvintes.get(ev) ?? ouvintes.set(ev, new Set()).get(ev)!).add(fn); return socketFalso },
  off(ev: string, fn?: Ouvinte) { if (fn) ouvintes.get(ev)?.delete(fn); else ouvintes.delete(ev); return socketFalso },
  once(ev: string, fn: Ouvinte) {
    const uma: Ouvinte = (...a) => { socketFalso.off(ev, uma); fn(...a) }
    return socketFalso.on(ev, uma)
  },
  emit() { return socketFalso },
  connect() { return socketFalso },
  disconnect() { return socketFalso },
  removeAllListeners(ev?: string) { if (ev) ouvintes.delete(ev); else ouvintes.clear(); return socketFalso },
}

/** Dispara um evento do "servidor" para os handlers de produção. */
export function emitirDoServidor(evento: string, dados?: unknown) {
  ouvintes.get(evento)?.forEach((fn) => fn(dados))
}

let conectado = false

export async function conectarAoApp() {
  if (conectado) return
  conectado = true
  const [{ api }, axiosMod, { setSocketFactory }] = await Promise.all([
    import('@/services/api'),
    import('axios'),
    import('@/services/socket'),
  ])
  const adapter = (window as unknown as Janela).__demoAdapter
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  api.defaults.adapter = adapter as any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(axiosMod.default as any).defaults.adapter = adapter as any

  setSocketFactory(() => socketFalso as never)
  ;(window as unknown as Janela).__demoEmitir = emitirDoServidor
}
