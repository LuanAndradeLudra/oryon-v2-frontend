/**
 * Ida e volta parametrizadas entre uma tela de TRABALHO e uma de CONFIGURAÇÃO.
 *
 * O problema que isto resolve: configuração quase nunca é o destino de alguém.
 * A necessidade nasce no meio do trabalho ("falta uma etapa neste funil"), e
 * quem sai para configurar espera voltar exatamente para onde estava — mesma
 * aba, mesmo filtro, mesmo funil. Um "voltar" genérico devolve a pessoa a um
 * lugar plausível e errado, e o contexto do atendimento se perde.
 *
 * Por isso o destino de volta viaja na URL e não no `state` da navegação: assim
 * ele sobrevive ao F5 e ao link colado, e a tela de configuração continua
 * linkável. (O `state` é a escolha certa quando o retorno é do MESMO fluxo e
 * não precisa ser compartilhável — ver `voltarPara` em `ContactProfilePage`.)
 */

const ORIGEM_FICTICIA = 'http://oryon.local'

/**
 * Só caminho interno: nada de `http://`, `//host` ou `javascript:`.
 *
 * Revisão 02/10: "começa com / e não com //" não bastava — o navegador trata
 * `\` como `/` e descarta TAB/quebra de linha, então `/\evil.com` e
 * `/<TAB>/evil.com` viravam https://evil.com (redirecionamento aberto). Recusa
 * esses caracteres e confere com o próprio parser de URL que a origem não muda.
 */
function ehCaminhoInterno(valor: string): boolean {
  if (!valor.startsWith('/') || valor.startsWith('//')) return false
  for (const ch of valor) {
    const c = ch.charCodeAt(0)
    // 92 = barra invertida; < 32 e 127 = caracteres de controle (TAB, quebra de linha…)
    if (c === 92 || c < 32 || c === 127) return false
  }
  try {
    return new URL(valor, ORIGEM_FICTICIA).origin === ORIGEM_FICTICIA
  } catch {
    return false
  }
}

/**
 * Monta o endereço da tela de configuração já sabendo voltar.
 *
 * `origem` deve ser `pathname + search` da tela atual — é o que preserva aba,
 * filtro e seleção na volta.
 */
export function comVolta(destino: string, origem: string, rotulo?: string): string {
  const url = new URL(destino, 'http://local')
  if (ehCaminhoInterno(origem)) url.searchParams.set('voltarPara', origem)
  if (rotulo) url.searchParams.set('voltarRotulo', rotulo)
  return `${url.pathname}${url.search}`
}

export interface DestinoDeVolta {
  para: string
  rotulo: string
}

/**
 * Lê o destino de volta de uma URL de configuração. `null` quando não veio de
 * um contexto — aí a tela é o destino em si e não deve oferecer retorno.
 *
 * A validação não é paranoia gratuita: `voltarPara` é um endereço que vem da
 * barra do navegador e vira `navigate()`. Sem a checagem, um link montado por
 * terceiro poderia mandar o usuário para fora da aplicação a partir de uma tela
 * autenticada — redirecionamento aberto, que é um problema de segurança real e
 * barato de fechar aqui.
 */
export function destinoDeVolta(params: URLSearchParams): DestinoDeVolta | null {
  const para = params.get('voltarPara')
  if (!para || !ehCaminhoInterno(para)) return null
  return { para, rotulo: params.get('voltarRotulo')?.trim() || 'Voltar' }
}

/**
 * Leva o caminho de volta que a tela ATUAL recebeu para um próximo destino
 * (trocar de seção de Configurações, redirecionamento, link interno). Sem isto
 * a faixa "Voltar para…" sumia no primeiro clique dentro de Configurações.
 * Sem `voltarPara` na tela atual, devolve o destino intacto.
 */
export function preservarVolta(destino: string, atual: URLSearchParams): string {
  const volta = destinoDeVolta(atual)
  if (!volta) return destino
  const url = new URL(destino, 'http://local')
  url.searchParams.set('voltarPara', volta.para)
  if (atual.get('voltarRotulo')) url.searchParams.set('voltarRotulo', volta.rotulo)
  return `${url.pathname}${url.search}`
}
