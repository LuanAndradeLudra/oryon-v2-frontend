import type { HeroCue } from './useHeroTimeline'
import type { HeroCompositionKey } from './heroComposition'

/**
 * O ROTEIRO — uma história só, contada por interfaces que se reorganizam.
 *
 * Duas camadas correm na mesma linha do tempo e quase nunca no mesmo instante:
 *
 *  • `state`       — o que o PRODUTO faz: mensagem chega, situação muda,
 *                    etiqueta entra, card avança, atendente assume;
 *  • `composition` — onde as JANELAS estão: qual domina, qual recua, quais
 *                    dividem o palco.
 *
 * A regra de direção que organiza os tempos: a composição se assenta ANTES da
 * mudança que precisa ser lida, fica parada durante a leitura, e só se
 * reorganiza depois que o resultado está claro. Por isso quase todo cue de
 * composição vem 1–2 s antes do cue de estado que ele existe para mostrar.
 *
 * ~44 s no total, com o valor principal — a IA atendendo sozinha, com
 * informação certa — entregue nos primeiros 12 s, para quem não assistir ao
 * ciclo inteiro.
 */

export type HeroState =
  | 'inicio'     // histórico de ontem; a demanda ainda não chegou
  | 'demanda'    // Marina pede a proposta
  | 'resposta'   // o Agente responde com a condição que consultou
  | 'confirma'   // Marina confirma o interesse
  | 'situacao'   // o Agente muda a situação do contato
  | 'etiqueta'   // o Agente etiqueta a conversa
  | 'avanco'     // o Agente avança o negócio de etapa
  | 'pedido'     // Marina pede falar com uma pessoa
  | 'assumido'   // o Agente chama a atendente e põe a conversa na fila
  | 'humano'     // a Atendente intervém (a IA pausa) e responde
  | 'ganho'      // a Atendente fecha o negócio como ganho

const S = (t: number, state: HeroState): HeroCue<HeroState, HeroCompositionKey> => ({ t, state })
const C = (t: number, composition: HeroCompositionKey, ms = 900): HeroCue<HeroState, HeroCompositionKey> =>
  ({ t, composition, ms })

export const HERO_CUES: readonly HeroCue<HeroState, HeroCompositionKey>[] = [
  // ── Plano geral: a conversa estabelece o produto ──────────────────────────
  { t: 0, state: 'inicio', composition: 'abertura', ms: 0 },

  // ── A demanda chega e a IA atende ─────────────────────────────────────────
  C(1600, 'conversa', 1000),
  S(2600, 'demanda'),
  S(5400, 'resposta'),
  // Parado: é a informação da resposta que precisa ser lida.
  S(9000, 'confirma'),

  // ── A ficha do contato entra como janela própria ──────────────────────────
  // A câmera/composição se move 2,2 s ANTES da mudança que ela existe para
  // mostrar: antecipação, ação, repouso. Trocar arranjo e estado no mesmo
  // instante é o que faz uma transição parecer corte de slide.
  C(11400, 'contato', 1050),
  // A situação muda DEPOIS da janela assentada — e o quadro anterior mostrou
  // "Novo", então a transformação é vista, não só o resultado.
  S(13600, 'situacao'),
  S(16600, 'etiqueta'),

  // ── A ponte: duas janelas independentes, causa e efeito ───────────────────
  // A ficha fica 10,4 s em cena, não 7,8: situação, etiquetas e negócio são
  // três mudanças, e cada uma precisa da própria pausa de leitura. Antes a
  // ponte entrava antes de o negócio ter sido lido.
  C(21800, 'ponte', 1150),
  S(24600, 'avanco'),

  // ── O funil assume o foco; a conversa recua inteira ───────────────────────
  C(26200, 'funil', 1050),

  // ── A passagem para a pessoa ──────────────────────────────────────────────
  C(30400, 'handoff', 1050),
  S(31600, 'pedido'),
  S(34400, 'assumido'),
  S(37400, 'humano'),

  // ── Desfecho: quem fecha a venda é a pessoa ───────────────────────────────
  C(40600, 'fecho', 1150),
  S(42200, 'ganho'),

  // ── Reinício: o palco esvazia ANTES de os dados voltarem ao começo ────────
  // Sem esta passagem, o laço desfazia a história à vista do visitante —
  // mensagens sumindo, etiqueta saindo, card voltando de etapa.
  C(46400, 'reinicio', 800),
] as const

/** Tempo parado com o palco vazio, antes de recomeçar. */
export const HERO_TAIL_MS = 1200

/**
 * O quadro estático — `prefers-reduced-motion`, aba em segundo plano na
 * primeira pintura, captura. É a PONTE com o negócio já avançado: num quadro
 * só, a conversa que originou a demanda e o funil que ela moveu, cada um na
 * sua janela. É o único ponto do roteiro que se explica sozinho parado.
 */
export const HERO_STATIC_CUE = HERO_CUES.findIndex((c) => c.state === 'avanco')

/**
 * Textos auxiliares — curtos, e só onde a interface não consegue dizer sozinha
 * QUEM agiu. Não são títulos de cena: não têm número, não existem para a
 * maioria dos estados, e saem quando a ação se explica.
 *
 * Cada frase foi conferida contra a auditoria de capacidades do agente:
 * a IA não define valor, não se pausa e não fecha venda.
 */
export const HERO_NOTES: Partial<Record<HeroState, string>> = {
  resposta: 'O Agente IA responde com a condição que consultou na base de conhecimento',
  situacao: 'O Agente IA atualiza a situação do contato',
  avanco:   'O Agente IA avança o negócio de etapa — terminais ele não pode',
  assumido: 'O Agente IA chama uma atendente e coloca a conversa na fila',
  humano:   'Ana assume: a IA fica pausada enquanto a pessoa atende',
  ganho:    'Quem fecha a venda é sempre uma pessoa — a IA não fecha negócio',
}
