/**
 * AS GUARDAS do documento de demonstração.
 *
 * Instaladas ANTES de qualquer módulo do app ser importado. A ordem importa: a
 * rede e o armazenamento precisam já estar trocados quando `src/services/api.ts`
 * registrar seus interceptores e quando os contextos lerem sessão.
 *
 * O que elas garantem, que são os critérios de aceite desta rodada:
 *  • nenhuma requisição sai do iframe — rota não mapeada é bloqueada, com
 *    registro no console, e nunca vira tráfego de verdade;
 *  • nenhuma chave real de armazenamento é lida ou escrita — a landing e a
 *    demonstração dividem a MESMA origem, então sem isto a demo leria a
 *    sessão, o tema e a memória de scroll de quem estiver logado no navegador.
 */

// ─── Armazenamento isolado ────────────────────────────────────────────────────

class MemoriaStorage implements Storage {
  private m = new Map<string, string>()
  get length() { return this.m.size }
  clear() { this.m.clear() }
  getItem(k: string) { return this.m.has(k) ? this.m.get(k)! : null }
  key(i: number) { return [...this.m.keys()][i] ?? null }
  removeItem(k: string) { this.m.delete(k) }
  setItem(k: string, v: string) { this.m.set(k, String(v)) }
}

export function instalarArmazenamentoIsolado() {
  for (const nome of ['localStorage', 'sessionStorage'] as const) {
    const falso = new MemoriaStorage()
    Object.defineProperty(window, nome, { configurable: true, get: () => falso })
  }
}

// ─── Guarda de rede ───────────────────────────────────────────────────────────

/** `atrasoMs`: a resposta demora (a bancada de teste "pensando", 02/10). */
export interface RespostaDemo { status?: number; data?: unknown; atrasoMs?: number }

const esperar = (ms?: number) => (ms ? new Promise((r) => setTimeout(r, ms)) : null)
export type Rota = (ctx: { method: string; url: string; body?: unknown; params?: URLSearchParams }) => RespostaDemo | undefined

/** Rotas atendidas. Registrada aqui para o teste poder falhar quando faltar uma. */
const rotas: { casa: (m: string, u: string) => boolean; nome: string; fn: Rota }[] = []
const naoMapeadas = new Set<string>()

export function rota(nome: string, casa: (m: string, u: string) => boolean, fn: Rota) {
  rotas.push({ nome, casa, fn })
}

/** O que a demonstração pediu e ninguém atendeu — o spike relata isto. */
export function rotasNaoMapeadas(): string[] {
  return [...naoMapeadas]
}

/** Zera o registro — usado pelo teste entre uma tela e outra. */
export function limparRotasNaoMapeadas() {
  naoMapeadas.clear()
}

function caminho(url: string): { path: string; params: URLSearchParams } {
  const u = new URL(url, 'http://demo.local')
  return { path: u.pathname.replace(/^\/api/, ''), params: u.searchParams }
}

function atender(method: string, url: string, body?: unknown): RespostaDemo {
  const { path, params } = caminho(url)
  for (const r of rotas) {
    if (!r.casa(method, path)) continue
    const resp = r.fn({ method, url: path, body, params })
    if (resp) return resp
  }
  const chave = `${method.toUpperCase()} ${path}`
  if (!naoMapeadas.has(chave)) {
    naoMapeadas.add(chave)
    // Bloqueio com registro, não exceção: uma rota faltando não pode derrubar
    // a demonstração inteira — precisa aparecer e ser mapeada depois.
    console.warn('[demo] rota não mapeada, bloqueada:', chave)
  }
  return { status: 204, data: null }
}

let emVoo = 0
/** Requisições do app ao backend de demonstração ainda sem resposta. */
export function requisicoesEmVoo() { return emVoo }

/**
 * Adaptador de axios. É o ponto certo porque o app usa DUAS instâncias — a
 * `api` configurada e o `axios` global, que o `AuthContext` chama direto — e
 * as duas passam pelo adaptador antes de qualquer XHR.
 */
export function instalarGuardaDeRede() {
  interface ConfigLike { method?: string; url?: string; baseURL?: string; data?: unknown; headers?: unknown; params?: Record<string, unknown> }
  const adapter = async (config: ConfigLike) => {
    emVoo++
    try {
      let url = `${config.baseURL ?? ''}${config.url ?? ''}`
      // `params` do axios não estão na URL: sem juntá-los, filtros como
      // `/deals?contactId=` chegavam ao backend de demonstração sem o filtro.
      if (config.params) {
        const u = new URL(url, 'http://demo.local')
        for (const [k, v] of Object.entries(config.params)) {
          if (v !== undefined && v !== null) u.searchParams.set(k, String(v))
        }
        url = /^https?:\/\//.test(url) ? u.href : u.pathname + u.search
      }
      const body = typeof config.data === 'string' ? JSON.parse(config.data || 'null') : config.data
      const r = atender(config.method ?? 'get', url, body)
      await esperar(r.atrasoMs)
      return { data: r.data ?? null, status: r.status ?? 200, statusText: 'OK', headers: {}, config }
    } finally {
      // Solta no próximo macrotask: o componente ainda precisa receber a
      // resposta e renderizar antes de a tela contar como "pintada".
      setTimeout(() => { emVoo-- }, 0)
    }
  }

  const janela = window as unknown as { __demoAdapter?: unknown }
  janela.__demoAdapter = adapter

  // `fetch` e `XMLHttpRequest` também são vedados: há código que não passa pelo
  // axios (EventSource de upload, libs de terceiros) e nada pode escapar.
  const fetchOriginal = window.fetch.bind(window)
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    if (/^(https?:)?\/\//.test(url) && !url.startsWith(location.origin)) {
      const r = atender(init?.method ?? 'GET', url, init?.body)
      await esperar(r.atrasoMs)
      return new Response(JSON.stringify(r.data ?? null), { status: r.status ?? 200, headers: { 'Content-Type': 'application/json' } })
    }
    if (url.includes('/api/')) {
      const r = atender(init?.method ?? 'GET', url, init?.body)
      await esperar(r.atrasoMs)
      return new Response(JSON.stringify(r.data ?? null), { status: r.status ?? 200, headers: { 'Content-Type': 'application/json' } })
    }
    // Recursos do próprio Vite (módulos, css, fontes) seguem normalmente.
    return fetchOriginal(input, init)
  }

  const abrirOriginal = XMLHttpRequest.prototype.open
  type Abrir = (this: XMLHttpRequest, m: string, u: string | URL, a?: boolean, us?: string | null, pw?: string | null) => void
  const abrir: Abrir = function (this: XMLHttpRequest, method, url, a, us, pw) {
    const u = String(url)
    if (u.includes('/api/') || /^(https?:)?\/\//.test(u)) {
      atender(method, u)
      // Redireciona para um endereço inerte da própria origem: a requisição
      // nunca chega ao backend.
      return (abrirOriginal as unknown as Abrir).call(this, method, `${location.origin}/__demo_bloqueado__`, a ?? true, us, pw)
    }
    return (abrirOriginal as unknown as Abrir).call(this, method, url, a ?? true, us, pw)
  }
  XMLHttpRequest.prototype.open = abrir as typeof XMLHttpRequest.prototype.open
}
