/**
 * A ENTRADA DE DEMONSTRAÇÃO — o Oryon de verdade rodando com um backend em
 * memória, servido num iframe pela landing.
 *
 * A ordem dos imports neste arquivo é significativa e não pode ser reordenada
 * por um formatador automático:
 *
 *   1. as guardas (armazenamento isolado, rede vedada) precisam estar de pé
 *      ANTES de `src/services/api.ts` registrar interceptores e antes de
 *      qualquer contexto ler sessão;
 *   2. só então o app é importado, por `import()` dinâmico.
 *
 * É o que sustenta os dois critérios de aceite mais duros da rodada: nenhuma
 * requisição sai do iframe e nenhuma chave real de armazenamento é tocada —
 * lembrando que a landing e a demonstração dividem a MESMA origem, então sem
 * isolamento a demo leria a sessão de quem estiver logado no navegador.
 */
import { instalarArmazenamentoIsolado, instalarGuardaDeRede, rotasNaoMapeadas } from './guards'
import { instalarBackendDemo } from './backend'

instalarArmazenamentoIsolado()
instalarGuardaDeRede()
instalarBackendDemo()

async function subir() {
  const [{ StrictMode }, { createRoot }, React] = await Promise.all([
    import('react'),
    import('react-dom/client'),
    import('react'),
  ])
  void React

  await import('../index.css')

  // A instância `api` e o `axios` global já têm interceptores; o que falta é
  // plugar o adaptador das guardas nas duas, o que só pode ser feito depois do
  // módulo existir.
  const [{ api }, axiosMod] = await Promise.all([
    import('@/services/api'),
    import('axios'),
  ])
  const adapter = (window as unknown as { __demoAdapter?: unknown }).__demoAdapter
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  api.defaults.adapter = adapter as any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(axiosMod.default as any).defaults.adapter = adapter as any

  // Tempo real local: mesma interface do socket.io, eventos disparados pelo
  // roteiro. Instalado antes de qualquer `getSocket()`, que é o que a costura
  // em `services/socket.ts` exige.
  const { setSocketFactory } = await import('@/services/socket')
  const ouvintes = new Map<string, Set<(...a: unknown[]) => void>>()
  const falso = {
    connected: true,
    on(ev: string, fn: (...a: unknown[]) => void) { (ouvintes.get(ev) ?? ouvintes.set(ev, new Set()).get(ev)!).add(fn); return falso },
    off(ev: string, fn?: (...a: unknown[]) => void) { if (fn) ouvintes.get(ev)?.delete(fn); else ouvintes.delete(ev); return falso },
    emit() { return falso },
    connect() { return falso },
    disconnect() { return falso },
  }
  setSocketFactory(() => falso as never)
  ;(window as unknown as { __demoEmitir?: (ev: string, dados?: unknown) => void }).__demoEmitir = (ev, dados) => {
    ouvintes.get(ev)?.forEach((fn) => fn(dados))
  }

  const { DemoApp } = await import('./DemoApp')
  const raiz = document.getElementById('root')!
  createRoot(raiz).render(
    <StrictMode>
      <DemoApp />
    </StrictMode>,
  )

  // Relatório do spike: o que a rota pediu e ninguém atendeu.
  ;(window as unknown as { __demoRotasNaoMapeadas?: () => string[] }).__demoRotasNaoMapeadas = rotasNaoMapeadas
}

/** O spike precisa VER o erro: sem backend, qualquer provedor que quebre
 *  derruba a árvore em silêncio e o `#root` fica vazio. */
window.addEventListener('error', (e) => {
  const raiz = document.getElementById('root')
  if (raiz && raiz.children.length === 0) {
    raiz.textContent = `[demo] erro: ${e.message}`
  }
  ;(window as unknown as { __demoErros?: string[] }).__demoErros ??= []
  ;(window as unknown as { __demoErros?: string[] }).__demoErros!.push(String(e.message))
})

void subir().catch((e) => {
  const raiz = document.getElementById('root')
  if (raiz) raiz.textContent = `[demo] falhou ao subir: ${e?.message ?? e}`
  ;(window as unknown as { __demoErros?: string[] }).__demoErros ??= []
  ;(window as unknown as { __demoErros?: string[] }).__demoErros!.push(String(e?.message ?? e))
})
