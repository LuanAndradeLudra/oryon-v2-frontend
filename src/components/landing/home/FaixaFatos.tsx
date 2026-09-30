import { home } from '../landingCopy'

/**
 * A régua de FATOS logo depois do Hero (P2 da auditoria anti-genérico, 30/09):
 * antes, três colunas com ícone-no-quadradinho — o "trusted by" sem logos.
 * Agora uma linha só, em mono, com os três fatos separados por réguas: o que
 * dá para afirmar hoje (conexão oficial, prazo autorizado pelo PO, a equipe
 * no comando), sem parecer prova social.
 */
export function FaixaFatos() {
  return (
    // relative z-10: a atmosfera do palco do Hero (camada posicionada, que sangra
    // para baixo de propósito) pintava por cima da faixa — os fatos pareciam
    // dentro do Hero (30/09). Com fundo próprio e acima dela, a faixa começa
    // onde o Hero termina.
    <section data-section="fatos" aria-label="Fatos sobre a Oryon" className="relative z-10 mt-6 border-y border-[var(--landing-borda)] bg-surface-950 sm:mt-10">
      <ul className="landing-container grid divide-y divide-[var(--landing-borda)] font-mono text-[12px] leading-relaxed tracking-[.02em] md:grid-cols-3 md:divide-x md:divide-y-0 md:py-4">
        {home.fatos.map((f) => (
          <li key={f.key} className="py-3.5 md:px-7 md:py-0 md:first:pl-0 md:last:pr-0">
            <span className="block font-medium text-surface-50">{f.titulo}</span>
            <span className="block text-surface-500">{f.texto}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
