/**
 * Salvar sempre à mão (SCRUM-1253, PO 07/10): nas páginas de Configurações que
 * são um formulário só, o CABEÇALHO da página fica preso no alto da rolagem,
 * com o "Salvar" à direita do título — como Stripe/Linear. Não cobre o fim do
 * formulário (a 1ª tentativa, uma barra no pé, cortava os campos).
 * As margens negativas encostam a faixa nas bordas da área de conteúdo (o
 * <main> de Configurações tem px-4/md:px-10 e pt-6/md:pt-[26px]).
 *
 * Dentro do SettingsLayout o cabeçalho vai para a faixa do topo (largura
 * inteira, ver FaixaDoTopoCtx); esta classe fica para quando não há faixa.
 */
export const CABECALHO_FIXO =
  'sticky -top-6 md:-top-[26px] z-20 -mx-4 md:-mx-10 -mt-6 md:-mt-[26px] mb-4 px-4 md:px-10 pt-6 md:pt-[26px] bg-surface-800/95 backdrop-blur-sm border-b border-surface-700'
