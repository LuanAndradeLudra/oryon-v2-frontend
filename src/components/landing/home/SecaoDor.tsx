import { Info } from 'lucide-react'
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
        <Cabecalho rotulo={dor.eyebrow} titulo={dor.titulo} apoio={dor.cinza} />

        {/* Composição assimétrica (lote 3, 30/09): a 1ª dor (fora do horário, a
            mais forte) ocupa a coluna da esquerda inteira; as outras duas se
            empilham à direita. No celular, uma embaixo da outra. */}
        <Revelar atraso={0.1}><ul className="mt-10 grid border-t border-[var(--landing-borda)] lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:grid-rows-2">
          {dor.itens.map((it, i) => {
            const d = { ...it, ...DOR_CONVERSAS[it.key] }
            const principal = i === 0
            return (
            <li
              key={d.key}
              className={cn(
                'border-b border-[var(--landing-borda)] py-7',
                principal ? 'lg:row-span-2 lg:flex lg:items-center lg:border-b-0 lg:border-r lg:py-10 lg:pr-12' : 'lg:pl-10 lg:py-8',
                i === 2 && 'lg:border-b-0',
              )}
            >
              <div className={cn(principal && 'lg:max-w-[34rem] lg:[&_[data-bolha]]:text-[15px]')}>
                <p className="font-mono text-[11.5px] tracking-[.04em] text-surface-500">{d.quando}</p>
                <h3 className={cn('mt-3 font-semibold leading-snug text-surface-50 text-balance', principal ? 'text-[17px] lg:text-[24px] lg:leading-[1.2]' : 'text-[17px]')}>{d.problema}</h3>

                {/* A conversa: a pergunta do cliente e o que acontece com ela. */}
                <div aria-hidden className="mt-5 flex flex-col gap-2">
                  <div data-bolha className="max-w-[92%] self-start rounded-[10px] rounded-bl-[3px] border border-[var(--landing-borda)] bg-bubble-in px-3 py-2 text-[13.5px] leading-snug text-surface-100">
                    {d.cliente}
                    <span className="mt-1 block text-right font-mono text-[10.5px] text-[#F87171] line-through decoration-[#F87171]/60">{d.semResposta}</span>
                  </div>
                  <div
                    data-bolha
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
        <p className="mt-5 flex items-center gap-2 text-[12.5px] text-surface-500">
          <Info className="h-3.5 w-3.5 flex-shrink-0" aria-hidden />
          {dor.aviso}
        </p>
      </div>
    </section>
  )
}
