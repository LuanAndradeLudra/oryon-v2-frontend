import { HeroPalco } from './HeroPalco'

/**
 * Playground de revisão do Hero — rota `/_hero`.
 *
 * O palco sozinho, sem o resto da landing, para revisar a demonstração em
 * qualquer largura. A demonstração em si roda em `/demo.html` (o Oryon real
 * com o backend de demonstração); `/demo.html?rota=/pipelines` abre direto
 * numa tela, sem o roteiro, para conferir o app isoladamente.
 */
export default function HeroPlayground() {
  return (
    <div className="min-h-screen bg-surface-950 px-4 sm:px-6 py-10 flex flex-col gap-6">
      <header>
        <h1 className="text-xl font-display font-bold text-surface-50">Hero — playground de revisão</h1>
        <p className="text-sm text-surface-400 mt-1 max-w-[70ch]">
          O Oryon real em modo demonstração: a janela âncora é o app de verdade, com dados fictícios; as satélites
          são componentes reais do produto. O roteiro dirige o backend de demonstração — nada é desenhado à mão.
        </p>
      </header>
      <div className="mx-auto w-full max-w-[1400px]">
        <HeroPalco />
      </div>
    </div>
  )
}
