// ─── Mensagens de validação do backend em português (SCRUM-1205) ──────────────
// O ValidationPipe do NestJS devolve as mensagens padrão do class-validator,
// em inglês e com o nome técnico do campo ("installments must not be greater
// than 12"). Aqui viram texto de gente, com o rótulo que o operador vê na tela.
// Mensagens que já vêm em português (regras de negócio) passam intactas.

type Labels = Record<string, string>

const RULES: Array<[RegExp, (field: string, n?: string) => string]> = [
  [/^(\S+) must not be greater than (-?[\d.]+)$/, (f, n) => `${f}: no máximo ${n}.`],
  [/^(\S+) must not be less than (-?[\d.]+)$/, (f, n) => `${f}: no mínimo ${n}.`],
  [/^(\S+) must be an email$/, (f) => `${f}: e-mail inválido.`],
  [/^(\S+) should not be empty$/, (f) => `${f}: obrigatório.`],
  [/^property (\S+) should not exist$/, (f) => `Campo não aceito: ${f}.`],
  [/^(\S+) must be (?:an? )?(?:integer|int) number$/, (f) => `${f}: use um número inteiro.`],
  [/^(\S+) must be a (?:number|positive number).*$/, (f) => `${f}: use um número válido.`],
  [/^(\S+) must be one of the following values: .*$/, (f) => `${f}: opção inválida.`],
  [/^(\S+) must be a valid ISO 8601 date string$/, (f) => `${f}: data inválida.`],
  [/^(\S+) must be (?:a )?(?:string|boolean).*$/, (f) => `${f}: valor inválido.`],
]

export function humanizeValidationMessage(message: string, labels: Labels = {}): string {
  for (const [re, fmt] of RULES) {
    const m = re.exec(message.trim())
    if (m) {
      const key = m[1]
      const label = labels[key] ?? labels[key.split('.').pop() ?? key] ?? key
      return fmt(label, m[2])
    }
  }
  return message
}
