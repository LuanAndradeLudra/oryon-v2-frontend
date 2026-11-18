/**
 * Qual marca mostrar para o aplicativo que pede acesso ou aprovação (pedido do João, 18/11).
 * Vem do endereço do aplicativo (conferido pela Oryon na lista de confiáveis) ou do nome dele na
 * lista. Sem marca conhecida: `null` (a tela mostra a inicial).
 */
export type MarcaConhecida = 'claude' | 'chatgpt'

const DOMINIOS: Array<[RegExp, MarcaConhecida]> = [
  [/(^|\.)(claude\.ai|anthropic\.com)$/i, 'claude'],
  [/(^|\.)(chatgpt\.com|openai\.com)$/i, 'chatgpt'],
]

function hostDe(endereco: string | null | undefined): string | null {
  if (!endereco) return null
  try {
    return new URL(endereco.includes('://') ? endereco : `https://${endereco}`).hostname
  } catch {
    return null
  }
}

export function marcaDoAplicativo(nome: string, endereco?: string | null): MarcaConhecida | null {
  const host = hostDe(endereco)
  if (host) for (const [re, marca] of DOMINIOS) if (re.test(host)) return marca
  const n = nome.trim().toLowerCase()
  if (n === 'claude') return 'claude'
  if (n === 'chatgpt' || n === 'openai') return 'chatgpt'
  return null
}
