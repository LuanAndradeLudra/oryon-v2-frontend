import { useState } from 'react'
import { HeroCinema } from './HeroCinema'
import { HeroPlano } from './HeroPlano'
import { PipelineSurface } from './HeroSurfaces'
import { HeroStage } from './HeroStage'
import { HERO_COMPOSITIONS, type HeroCompositionKey } from './heroComposition'
import { HERO_CUES, type HeroState } from './heroStory'

/**
 * Playground de revisão do Hero — rota `/_hero`.
 *
 * Em cima, a demonstração como ela aparece na home. Embaixo, um par de
 * seletores para PARAR a composição em qualquer combinação de estado do
 * produto × arranjo das janelas: é onde se confere se o quadro se sustenta
 * congelado, que é o teste que o PO pediu ("se a cena parada já estiver
 * confusa, nenhum easing resolve").
 */
const ESTADOS: HeroState[] = [
  'inicio', 'demanda', 'resposta', 'confirma', 'situacao',
  'etiqueta', 'avanco', 'pedido', 'assumido', 'humano', 'ganho',
]

export default function HeroPlayground() {
  const [estado, setEstado] = useState<HeroState>('avanco')
  const [comp, setComp] = useState<HeroCompositionKey>('ponte')

  return (
    <div className="min-h-screen bg-surface-950 px-6 py-10 flex flex-col gap-10">
      <header>
        <h1 className="text-xl font-display font-bold text-surface-50">Hero — playground de revisão</h1>
        <p className="text-sm text-surface-400 mt-1 max-w-[70ch]">
          Três janelas independentes num palco: Conversas, a ficha do contato e Funis. Cada uma tem moldura e
          recorte próprios; o palco só decide posição, escala e ordem de camadas.
        </p>
      </header>

      {/* ── PROTÓTIPO ESTÁTICO da rodada "plano fixo + satélites" ──────────
          Cena 4 (Funis), parada, nos dois temas. É o ponto de parada do
          documento: nada anima até esta composição ser aprovada. */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-brand-400 uppercase tracking-wide">
          Protótipo estático — plano fixo, cena 4 (Funis)
        </h2>
        <div id="proto-escuro" data-theme="dark" className="relative w-full h-[600px] overflow-visible bg-surface-950">
          <div aria-hidden className="absolute -inset-x-[8%] -inset-y-10 pointer-events-none" style={{
            background:
              'radial-gradient(70% 60% at 50% 100%, color-mix(in srgb, var(--color-brand-500) 26%, transparent) 0%, transparent 72%),' +
              'repeating-linear-gradient(90deg, rgba(255,255,255,.028) 0 1px, transparent 1px 8px)',
          }} />
          <HeroPlano
            modulo="funis"
            conteudo={<PipelineSurface at="avanco" paused />}
            telefone={[
              { de: 'cliente', texto: 'Oi! Preciso de uma proposta pra 12 licenças do plano anual.', hora: '09:14' },
              { de: 'oryon', texto: 'Oi, Marina! O Plano Pro anual sai por R$ 375 por licença — R$ 4.500 ao ano pelas 12.', hora: '09:15', lida: true },
              { de: 'cliente', texto: 'Show, é isso mesmo que a gente precisa.', hora: '09:16' },
            ]}
            registro={[
              { texto: 'Consultou a base de conhecimento', detalhe: 'Plano Pro anual · R$ 375 / licença' },
              { texto: 'Situação do contato → Em negociação' },
              { texto: 'Negócio → Proposta', detalhe: 'Plano Pro anual · 12 licenças' },
              { texto: 'A IA não define valor nem fecha venda', limite: true },
            ]}
            avisos={[
              { titulo: 'Negócio avançou', corpo: 'Plano Pro anual · 12 licenças foi para Proposta', quando: 'agora' },
              { titulo: 'Marina Alves', corpo: 'Pediu atendimento humano', quando: 'há 1 min' },
            ]}
          />
        </div>

        <div id="proto-claro" data-theme="light" className="relative w-full h-[600px] overflow-visible bg-surface-950">
          <div aria-hidden className="absolute -inset-x-[8%] -inset-y-10 pointer-events-none" style={{
            background:
              'radial-gradient(70% 60% at 50% 100%, color-mix(in srgb, var(--color-brand-500) 18%, transparent) 0%, transparent 72%),' +
              'repeating-linear-gradient(90deg, rgba(0,0,0,.025) 0 1px, transparent 1px 8px)',
          }} />
          <HeroPlano
            modulo="funis"
            conteudo={<PipelineSurface at="avanco" paused />}
            telefone={[
              { de: 'cliente', texto: 'Oi! Preciso de uma proposta pra 12 licenças do plano anual.', hora: '09:14' },
              { de: 'oryon', texto: 'Oi, Marina! O Plano Pro anual sai por R$ 375 por licença — R$ 4.500 ao ano pelas 12.', hora: '09:15', lida: true },
              { de: 'cliente', texto: 'Show, é isso mesmo que a gente precisa.', hora: '09:16' },
            ]}
            registro={[
              { texto: 'Consultou a base de conhecimento', detalhe: 'Plano Pro anual · R$ 375 / licença' },
              { texto: 'Situação do contato → Em negociação' },
              { texto: 'Negócio → Proposta', detalhe: 'Plano Pro anual · 12 licenças' },
              { texto: 'A IA não define valor nem fecha venda', limite: true },
            ]}
            avisos={[
              { titulo: 'Negócio avançou', corpo: 'Plano Pro anual · 12 licenças foi para Proposta', quando: 'agora' },
              { titulo: 'Marina Alves', corpo: 'Pediu atendimento humano', quando: 'há 1 min' },
            ]}
          />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-surface-500 uppercase tracking-wide">Versão anterior — como está na home hoje</h2>
        <div className="max-w-[1240px]"><HeroCinema /></div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-surface-300 uppercase tracking-wide">Composição congelada</h2>
        <div className="flex flex-wrap gap-4 text-xs">
          <label className="flex items-center gap-2 text-surface-400">
            estado do produto
            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value as HeroState)}
              className="bg-surface-900 border border-surface-700 rounded px-2 py-1 text-surface-200"
            >
              {ESTADOS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-2 text-surface-400">
            arranjo das janelas
            <select
              value={comp}
              onChange={(e) => setComp(e.target.value as HeroCompositionKey)}
              className="bg-surface-900 border border-surface-700 rounded px-2 py-1 text-surface-200"
            >
              {Object.keys(HERO_COMPOSITIONS).map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
        </div>

        <div className="relative w-full max-w-[1240px] h-[560px] overflow-hidden rounded-xl border border-[var(--frame-stroke)] bg-[linear-gradient(180deg,var(--color-surface-900),var(--color-surface-950))]">
          <HeroStage at={estado} composition={comp} paused />
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-surface-300 uppercase tracking-wide">A linha do tempo</h2>
        <ol className="text-xs font-mono text-surface-400 leading-relaxed">
          {HERO_CUES.map((c, i) => (
            <li key={i}>
              <span className="text-surface-600 tabular-nums">{String(c.t).padStart(5, ' ')}ms</span>
              {c.state && <span className="text-brand-400"> produto:{c.state}</span>}
              {c.composition && <span className="text-accent-violet"> janelas:{c.composition}</span>}
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}
