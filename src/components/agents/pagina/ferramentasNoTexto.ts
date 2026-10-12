/**
 * Ferramenta conectada depois da criação (SCRUM-1159, item 3).
 *
 * O texto do agente pode ter sido escrito quando ele não tinha ferramentas
 * ("quem confirma o horário é a equipe"). Com a ferramenta de agenda
 * conectada, a regra 5 da plataforma dá precedência à ferramenta, mas o
 * trecho antigo continua lá, confundindo quem lê e o modelo. Aqui ficam as
 * regras puras que apontam esses trechos e percebem ferramenta nova.
 *
 * A seção "Regras deste negócio" fica de fora da busca: ali estão decisões
 * do dono ("remarcar só com a equipe"), que valem mesmo com a ferramenta.
 */

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')

/** Frases que afirmam uma limitação ou mandam a equipe fazer no lugar do agente. */
const LIMITACAO: RegExp[] = [
  /\bnao (consigo|posso|conseguimos|consegue|tenho como|temos como|e possivel)\b/,
  /\bnao tenho acesso\b/,
  /\bsem acesso\b/,
  /\bquem (confirma|agenda|marca|remarca|cancela|verifica|registra)\b/,
  /\b(a|nossa) equipe (confirma|agenda|marca|remarca|cancela|verifica|registra|vai confirmar|ira confirmar)\b/,
  /\baguard(ar|e|a) (a )?confirmacao\b/,
]

/** Assunto do trecho e das ferramentas: só há conflito quando o assunto bate. */
const ASSUNTOS: RegExp[] = [
  /agend|horari|marca|remarc|consulta|disponib|encaixe|reserva/,
  /pedido|compra|carrinho|entrega/,
  /pagament|boleto|cobranc|\bpix\b|fatura/,
  /cadastr|registr/,
  /estoque/,
]

/** Ferramentas da plataforma que existem em todo agente e não "mudam" o que ele faz. */
export const FERRAMENTAS_DA_PLATAFORMA = new Set(['search_knowledge_base', 'transferir_para_humano'])

export interface Contradicao {
  trecho: string
  ferramentas: string[]
}

function semRegrasDoNegocio(texto: string): string {
  const linhas = texto.split('\n')
  const out: string[] = []
  let dentro = false
  for (const l of linhas) {
    if (/^##\s/.test(l.trim())) dentro = /^##\s+regras deste neg[oó]cio/i.test(l.trim())
    if (!dentro) out.push(l)
  }
  return out.join('\n')
}

/** Trechos do texto que contradizem uma ferramenta conectada, com as ferramentas envolvidas. */
export function contradicoes(texto: string, ferramentas: Array<{ name: string; description?: string }>): Contradicao[] {
  const uteis = ferramentas.filter((f) => !FERRAMENTAS_DA_PLATAFORMA.has(f.name))
  if (!uteis.length || !texto.trim()) return []
  const frases = semRegrasDoNegocio(texto)
    .split(/\n+|(?<=[.!?])\s+/)
    .map((f) => f.replace(/^[\s\-*\d.)]+/, '').trim())
    .filter((f) => f.length > 8)
  const achados = new Map<string, Set<string>>()
  for (const frase of frases) {
    const n = norm(frase)
    if (!LIMITACAO.some((re) => re.test(n))) continue
    const assuntos = ASSUNTOS.filter((re) => re.test(n))
    for (const f of uteis) {
      const alvo = norm(`${f.name.replace(/_/g, ' ')} ${f.description ?? ''}`)
      if (assuntos.some((re) => re.test(alvo))) {
        const chave = frase.length > 220 ? `${frase.slice(0, 217)}…` : frase
        if (!achados.has(chave)) achados.set(chave, new Set())
        achados.get(chave)!.add(f.name)
      }
    }
  }
  return [...achados.entries()].map(([trecho, fs]) => ({ trecho, ferramentas: [...fs] }))
}

const chave = (agentId: string) => `oryon:agentes:ferramentas-vistas:${agentId}`

/**
 * Ferramentas que apareceram desde a última visita a este agente. Na
 * primeira visita não há referência: guarda o que há e não chama nada de
 * "novo" (senão todo agente com ferramenta dispararia o aviso).
 */
export function ferramentasNovas(agentId: string, nomes: string[]): { novas: string[]; primeiraVez: boolean } {
  const atuais = nomes.filter((n) => !FERRAMENTAS_DA_PLATAFORMA.has(n))
  let vistas: string[] | null = null
  try {
    const raw = localStorage.getItem(chave(agentId))
    vistas = raw ? (JSON.parse(raw) as string[]) : null
  } catch { /* sem storage */ }
  if (!vistas) return { novas: [], primeiraVez: true }
  return { novas: atuais.filter((n) => !vistas!.includes(n)), primeiraVez: false }
}

export function marcarFerramentasVistas(agentId: string, nomes: string[]): void {
  try {
    localStorage.setItem(chave(agentId), JSON.stringify(nomes.filter((n) => !FERRAMENTAS_DA_PLATAFORMA.has(n))))
  } catch { /* sem storage */ }
}
