/** Formata centavos (inteiro) como número BRL sem símbolo: 150000 → "1.500,00". */
export function formatCents(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/** Formata centavos (inteiro) como moeda BRL: 150000 → "R$ 1.500,00". */
export function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}
