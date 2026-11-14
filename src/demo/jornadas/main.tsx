/**
 * ORY-60 — prévia das telas de Jornadas sem backend (só no `npm run dev`):
 * abra `/jornadas-previa.html`.
 *
 * Mesma preparação da demonstração da landing (`src/demo/main.tsx`), na mesma
 * ordem: isolar armazenamento, semear a sessão e vedar a rede ANTES de o app
 * ser importado; depois conectar o backend em memória. Nenhuma requisição sai.
 */
import { prepararAntesDoApp, conectarAoApp } from '../preparar'

prepararAntesDoApp()

if (new URLSearchParams(location.search).get('tema') === 'light') {
  localStorage.setItem('oryon-theme', 'light')
  document.documentElement.setAttribute('data-theme', 'light')
}

async function subir() {
  const [{ StrictMode }, { createRoot }] = await Promise.all([import('react'), import('react-dom/client')])
  await import('../../index.css')
  await import('../../styles/contraste.css')
  await conectarAoApp()
  const { PreviaDasJornadas } = await import('./PreviaDasJornadas')
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <PreviaDasJornadas inicial={new URLSearchParams(location.search).get('rota') ?? '/jornadas'} />
    </StrictMode>,
  )
}

void subir().catch((e) => {
  const raiz = document.getElementById('root')
  if (raiz) raiz.textContent = `[prévia] erro ao subir: ${e?.message ?? e}`
})
