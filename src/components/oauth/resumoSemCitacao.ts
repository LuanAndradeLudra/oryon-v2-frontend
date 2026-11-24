/**
 * O resumo sem o trecho citado (`"…" (+N caracteres)`) quando o texto inteiro aparece logo
 * abaixo: fica "enviar o texto a João (conversa 05c62716) #0deb77", sem repetir a mensagem.
 *
 * Revisão do épico (18/11, 3ª rodada): a regex tirava o 1º par de aspas, e uma mensagem com
 * aspas cortava no lugar errado (dava para escrever um destinatário falso na frente do
 * verdadeiro). Agora sai só a citação exata que o backend monta com ESTE texto (`comeco()` em
 * acoes-criticas.ts: espaços juntados, corte em 160 ou 120 com "(+N caracteres)"). Se não casar
 * (ex.: telefone mascarado na citação), o resumo fica inteiro.
 */
const CORTES_DA_CITACAO = [160, 120]

export function resumoSemCitacao(acao: string, texto: string | null | undefined): string {
  if (!texto) return acao
  const s = texto.replace(/\s+/g, ' ').trim()
  for (const max of CORTES_DA_CITACAO) {
    const citacao = s.length > max ? `"${s.slice(0, max)}…" (+${s.length - max} caracteres)` : `"${s}"`
    const i = acao.indexOf(citacao)
    if (i >= 0) return `${acao.slice(0, i)} ${acao.slice(i + citacao.length)}`.replace(/\s{2,}/g, ' ').trim()
  }
  return acao
}
