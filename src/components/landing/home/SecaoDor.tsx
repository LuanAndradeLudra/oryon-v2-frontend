import { ArrowDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { home } from '../landingCopy'
import { Cabecalho, Revelar } from '../plataforma/SecoesVenda'
import { DOR_CONVERSAS } from './dorConversas'

/**
 * A DOR E A VIRADA (ciclo noturno, 30/09; redesenhada na auditoria
 * anti-genérico, aprovada pelo PO): antes de mostrar telas, a página MOSTRA o
 * problema de quem atende pelo WhatsApp — uma mensagem de cliente com o
 * carimbo do que aconteceu ("sem resposta até segunda, 09:12") e, embaixo, a
 * resposta como fica com a Oryon. É o único lugar da página, fora das
 * simulações, com bolhas de conversa: aqui a dor é literalmente uma mensagem
 * sem resposta. Sem cartões nem ícones: três colunas separadas por réguas.
 *
 * Código de cor do produto: teal = a IA respondeu; âmbar = uma pessoa assumiu.
 */
export function SecaoDor({ numero }: { numero?: string } = {}) {
  const { dor } = home
  return (
    <section data-section="dor" className="relative border-t border-[var(--landing-borda)] bg-[var(--landing-palco)] py-16 sm:py-20">
      <div className="landing-container">
        <Cabecalho numero={numero} eyebrow={dor.eyebrow} titulo={dor.titulo} cinza={dor.cinza} />

        <Revelar atraso={0.1}><ul className="mt-10 grid border-t border-[var(--landing-borda)] lg:grid-cols-3">
          {dor.itens.map((it, i) => {
            const d = { ...it, ...DOR_CONVERSAS[it.key] }
            return (
            <li key={d.key} className={cn('border-b border-[var(--landing-borda)] py-7 lg:border-b-0 lg:py-8', i > 0 && 'lg:border-l lg:pl-7', i < 2 && 'lg:pr-7')}>
              <div>
                <p className="font-mono text-[11.5px] tracking-[.04em] text-surface-500">{d.quando}</p>
                <h3 className="mt-3 text-[17px] font-semibold leading-snug text-surface-50 text-balance lg:min-h-[2.6em]">{d.problema}</h3>

                {/* A conversa: a pergunta do cliente e o que acontece com ela. */}
                <div aria-hidden className="mt-5 flex flex-col gap-2">
                  <div className="max-w-[92%] self-start rounded-[10px] rounded-bl-[3px] border border-[var(--landing-borda)] bg-bubble-in px-3 py-2 text-[13.5px] leading-snug text-surface-100">
                    {d.cliente}
                    <span className="mt-1 block text-right font-mono text-[10.5px] text-[#F87171] line-through decoration-[#F87171]/60">{d.semResposta}</span>
                  </div>
                  <div
                    className={cn(
                      'max-w-[92%] self-end rounded-[10px] rounded-br-[3px] px-3 py-2 text-[13.5px] leading-snug text-surface-50',
                      d.quem === 'ia' ? 'bg-bubble-out' : 'bg-[#3A2C0E] ring-1 ring-[#F5B544]/35',
                    )}
                  >
                    {d.resposta}
                    <span className={cn('mt-1 block text-right font-mono text-[10.5px]', d.quem === 'ia' ? 'text-brand-300' : 'text-[#F5B544]')}>
                      {d.hora} ✓✓ · {d.assinatura}
                    </span>
                  </div>
                </div>
                {/* O mesmo conteúdo, para quem lê com leitor de tela. */}
                <p className="sr-only">{d.cliente} {d.semResposta}. {d.resposta} {d.hora}, {d.assinatura}.</p>

                <p className="mt-5 text-[14px] leading-relaxed text-surface-400 text-pretty">
                  <span className="font-semibold text-surface-100">{dor.comOryon}</span>, {d.solucao}
                </p>
              </div>
            </li>
            )
          })}
        </ul></Revelar>

        <Revelar atraso={0.2}>
          <a
            href="#como-funciona"
            className="mt-8 inline-flex items-center gap-2 rounded-sm font-mono text-[12.5px] tracking-[.02em] text-surface-200 transition-colors hover:text-surface-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            {dor.ponte}
            <ArrowDown className="h-4 w-4 text-[var(--landing-destaque)]" aria-hidden />
          </a>
        </Revelar>
      </div>
    </section>
  )
}
