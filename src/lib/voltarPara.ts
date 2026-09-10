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

/** Só caminho interno: nada de `http://`, `//host` ou `javascript:`. */
function ehCaminhoInterno(valor: string): boolean {
  return valor.startsWith('/') && !valor.startsWith('//')
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
