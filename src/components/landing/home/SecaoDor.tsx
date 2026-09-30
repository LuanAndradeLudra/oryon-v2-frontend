import { ArrowDown, Check, Moon, Repeat, Shuffle } from 'lucide-react'
import { home } from '../landingCopy'
import { Cabecalho, Revelar } from '../plataforma/SecoesVenda'

const ICONES = { horario: Moon, repeticao: Repeat, organizacao: Shuffle } as const

/**
 * A DOR E A VIRADA (ciclo noturno, 30/09): antes de mostrar telas, a página
 * diz em palavras simples o que acontece hoje no WhatsApp de quem vai comprar —
 * e o que muda com a Oryon. Sem números: o problema se reconhece, não se mede.
 */
export function SecaoDor() {
  const { dor } = home
  return (
    <section data-section="dor" className="relative border-t border-[var(--landing-borda)] bg-surface-950 py-16 sm:py-20">
      <div className="landing-container">
        <Cabecalho eyebrow={dor.eyebrow} titulo={dor.titulo} cinza={dor.cinza} />

        <ul className="mt-9 grid gap-4 md:grid-cols-3">
          {dor.itens.map((d, i) => {
            const Icone = ICONES[d.key]
            return (
              <li key={d.key}>
              <Revelar atraso={0.08 * i} className="h-full">
                <div className="flex h-full flex-col overflow-hidden rounded-2xl bg-[var(--landing-cartao)] ring-1 ring-[var(--landing-borda)]">
                  <div className="flex-1 p-5 sm:p-6">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-900 text-surface-300 ring-1 ring-surface-700">
                      <Icone className="h-4 w-4" strokeWidth={1.8} aria-hidden />
                    </span>
                    <h3 className="mt-4 text-[16px] font-semibold leading-snug text-surface-50 text-balance">{d.problema}</h3>
                    <p className="mt-2 text-[14px] leading-relaxed text-surface-400 text-pretty">{d.texto}</p>
                  </div>
                  <div className="flex items-start gap-2.5 border-t border-[var(--landing-borda)] bg-brand-500/[.06] px-5 py-4 sm:px-6">
                    <span className="mt-[2px] flex h-[18px] w-[18px] flex-none items-center justify-center rounded-full bg-brand-500/20 text-[var(--landing-destaque)]">
                      <Check className="h-3 w-3" strokeWidth={2.6} aria-hidden />
                    </span>
                    <p className="text-[14px] font-medium leading-snug text-surface-100 text-pretty">
                      <span className="sr-only">{dor.comOryon}: </span>{d.solucao}
                    </p>
                  </div>
                </div>
              </Revelar>
              </li>
            )
          })}
        </ul>

        <Revelar atraso={0.2}>
          <a
            href="#como-funciona"
            className="mt-8 inline-flex items-center gap-2 rounded-sm text-[15px] font-medium text-surface-200 transition-colors hover:text-surface-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            {dor.ponte}
            <ArrowDown className="h-4 w-4 text-[var(--landing-destaque)]" aria-hidden />
          </a>
        </Revelar>
      </div>
    </section>
  )
}
