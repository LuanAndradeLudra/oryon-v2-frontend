import { BadgeCheck, Rocket, Hand } from 'lucide-react'
import { home } from '../landingCopy'

const ICONES = { oficial: BadgeCheck, prazo: Rocket, controle: Hand } as const

/**
 * A faixa de FATOS logo depois do Hero (home de venda, 30/09) — o lugar onde a
 * Attio põe logos e "30.000 clientes". Sem prova social liberada, entram só
 * fatos que dá para afirmar hoje: conexão oficial, prazo autorizado pelo PO e
 * a equipe no comando.
 */
export function FaixaFatos() {
  return (
    // relative z-10: a atmosfera do palco do Hero (camada posicionada, que sangra
    // para baixo de propósito) pintava por cima da faixa — os fatos pareciam
    // dentro do Hero (30/09). Com fundo próprio e acima dela, a faixa começa
    // onde o Hero termina.
    <section data-section="fatos" aria-label="Fatos sobre a Oryon" className="relative z-10 mt-6 border-y border-[var(--landing-borda)] bg-surface-950 sm:mt-10">
      <ul className="landing-container grid divide-y divide-[var(--landing-borda)] py-2 sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:py-3">
        {home.fatos.map((f) => {
          const Icone = ICONES[f.key]
          return (
            <li key={f.key} className="flex items-start gap-3 py-5 sm:px-6 sm:first:pl-0 sm:last:pr-0">
              <span className="mt-0.5 flex h-[28px] w-[28px] flex-none items-center justify-center rounded-xl bg-surface-900 text-[var(--landing-destaque)] ring-1 ring-surface-700">
                <Icone className="h-[14px] w-[14px]" strokeWidth={1.8} aria-hidden />
              </span>
              <div>
                <p className="text-[14px] font-semibold text-surface-50">{f.titulo}</p>
                <p className="mt-0.5 text-[13px] leading-relaxed text-surface-400">{f.texto}</p>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
