/**
 * O resumo sem o trecho citado (`"…" (+N caracteres)`) quando o texto inteiro aparece logo
 * abaixo: fica "enviar o texto a João (conversa 05c62716) #0deb77", sem repetir a mensagem.
 */
export function resumoSemCitacao(acao: string, temConteudo: boolean): string {
  if (!temConteudo) return acao
  return acao.replace(/\s*"[^"]*"(\s*\(\+\d+ caracteres\))?/, '').replace(/\s{2,}/g, ' ').trim()
}
