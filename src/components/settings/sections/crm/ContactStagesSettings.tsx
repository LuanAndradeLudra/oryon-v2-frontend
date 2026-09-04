import { StagesManager } from './StagesManager'

/** Wrapper de Configurações para `StagesManager` — a **situação do contato**
 *  (`lead · em atendimento · cliente · inativo · perdido`, semeada no cadastro
 *  pela F13/§4.12).
 *
 *  Até aqui esse eixo só era editável dentro do drawer "Configurar" da página
 *  de Contatos, e o wizard de onboarding apontava para uma seção de
 *  Configurações que **não existia**. Agora existe, ao lado de "Estágios do
 *  funil" — os dois ficam juntos justamente para deixar claro que são eixos
 *  diferentes: situação é da jornada do contato; etapa é do funil.
 *
 *  Sem `multiPipelineOnly`: a situação do contato é anterior ao módulo de
 *  funis e vale para todo tenant, com ou sem `FF_MULTI_PIPELINE`. */
export function ContactStagesSettings() {
  return <StagesManager />
}
