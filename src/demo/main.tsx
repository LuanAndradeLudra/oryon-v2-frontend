/**
 * A ENTRADA DE DEMONSTRAÇÃO — o Oryon de verdade rodando com um backend em
 * memória, servido num iframe pela landing.
 *
 * A ordem neste arquivo é significativa e não pode ser reordenada por um
 * formatador automático:
 *
 *   1. `prepararAntesDoApp()` — armazenamento isolado, sessão semeada, rede
 *      vedada — ANTES de `src/services/api.ts` registrar interceptores e antes
 *      de qualquer contexto ler sessão;
 *   2. só então o app é importado, por `import()` dinâmico, e conectado
 *      (`conectarAoApp()`: adaptador nas duas instâncias de axios + socket
 *      falso antes do primeiro `getSocket()`).
 *
 * É o que sustenta os dois critérios de aceite mais duros da rodada: nenhuma
 * requisição sai do iframe e nenhuma chave real de armazenamento é tocada —
 * lembrando que a landing e a demonstração dividem a MESMA origem, então sem
 * isolamento a demo leria a sessão de quem estiver logado no navegador.
 */
import { prepararAntesDoApp, conectarAoApp } from './preparar'
import { rotasNaoMapeadas } from './guards'
import { instalarDiretor, avisarQuandoPronta } from './diretor'

prepararAntesDoApp()

// Tema inicial vindo da landing (`?tema=light`), antes do app ler `useTheme`:
// sem isto a demonstração nasceria escura e piscaria ao receber o tema.
if (new URLSearchParams(location.search).get('tema') === 'light') {
  localStorage.setItem('oryon-theme', 'light')
  document.documentElement.setAttribute('data-theme', 'light')
}

type Janela = { __demoRotasNaoMapeadas?: () => string[]; __demoErros?: string[] }

async function subir() {
  const [{ StrictMode }, { createRoot }] = await Promise.all([
    import('react'),
    import('react-dom/client'),
  ])
  await import('../index.css')
  await conectarAoApp()

  const { DemoApp } = await import('./DemoApp')
  const raiz = document.getElementById('root')!
  createRoot(raiz).render(
    <StrictMode>
      <DemoApp inicial={new URLSearchParams(location.search).get('rota') ?? '/conversations'} />
    </StrictMode>,
  )

  // Diagnóstico: o que alguma tela pediu e o backend de demonstração não atende.
  ;(window as unknown as Janela).__demoRotasNaoMapeadas = rotasNaoMapeadas

  instalarDiretor()
  avisarQuandoPronta()
}

/** Sem backend, um provedor que quebre derruba a árvore em silêncio e o
 *  `#root` fica vazio — o erro precisa aparecer no próprio documento. */
function registrarErro(msg: string) {
  const raiz = document.getElementById('root')
  if (raiz && raiz.children.length === 0) raiz.textContent = `[demo] erro: ${msg}`
  const w = window as unknown as Janela
  ;(w.__demoErros ??= []).push(msg)
}

window.addEventListener('error', (e) => registrarErro(String(e.message)))

void subir().catch((e) => registrarErro(`falhou ao subir: ${e?.message ?? e}`))
