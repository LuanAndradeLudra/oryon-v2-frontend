/**
 * Rampa de intensidade da célula, em VIOLETA.
 *
 * O mockup pinta as células com `rgba(139,92,246,var(--a))` — um só matiz com
 * alpha variável — e o chip de pico é `accent-violet`. O `heatmapColor()`
 * compartilhado interpola `surface → brand` (teal): usá-lo aqui fazia o
 * componente contradizer o próprio chip. Não mudo o `heatmapColor()`, que é do
 * dashboard e tem outros consumidores; a rampa desta tela mora aqui.
 *
 * `color-mix` com o token, não hex: acompanha o tema e não viola a Carta.
 * A faixa 3%–95% é a do mockup (`--a` vai de .03 a .95).
 *
 * Exportada de propósito: cor calculada em JS nunca vira classe e por isso
 * escaparia do gate de CSS por construção — o jeito de trazê-la de volta para
 * dentro de um gate que roda é asseverá-la em teste.
 */
export function corDeLeitura(intensidade: number): string {
  const t = Math.max(0, Math.min(1, intensidade))
  const pct = Math.round((0.03 + t * 0.92) * 1000) / 10
  return `color-mix(in srgb, var(--color-accent-violet) ${pct}%, transparent)`
}
