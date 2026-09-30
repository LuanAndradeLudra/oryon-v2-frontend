import {
  FileText, BookOpen, Package, ShieldCheck, ArrowRightLeft, SlidersHorizontal, BarChart3, History,
  type LucideIcon,
} from 'lucide-react'

/**
 * As oito seções da página do agente (direção D, 27/09). A seção vive na URL
 * — `/agents/:agentId/:secao` — para que voltar, recarregar e links levem ao
 * mesmo lugar (regra do PO: estado de tela na URL).
 */
export type SecaoId =
  | 'instrucoes' | 'conhecimento' | 'catalogo'
  | 'capacidades' | 'transferencia' | 'comportamento'
  | 'desempenho' | 'alteracoes'

export type GrupoId = 'responde' | 'pode' | 'indo'

export interface Secao {
  id: SecaoId
  grupo: GrupoId
  rotulo: string
  /** Uma frase: o que a seção decide. Aparece sob o título da seção. */
  descricao: string
  icone: LucideIcon
}

export const GRUPOS: ReadonlyArray<{ id: GrupoId; rotulo: string }> = [
  { id: 'responde', rotulo: 'Como ela responde' },
  { id: 'pode', rotulo: 'O que ela pode fazer' },
  { id: 'indo', rotulo: 'Como ela está indo' },
]

export const SECOES: ReadonlyArray<Secao> = [
  { id: 'instrucoes', grupo: 'responde', rotulo: 'Instruções', icone: FileText,
    descricao: 'O texto que orienta cada resposta. A IA segue a versão salva.' },
  { id: 'conhecimento', grupo: 'responde', rotulo: 'Conhecimento', icone: BookOpen,
    descricao: 'Documentos e textos que a IA consulta antes de responder.' },
  { id: 'catalogo', grupo: 'responde', rotulo: 'Catálogo', icone: Package,
    descricao: 'Produtos e serviços que a IA pode oferecer, com os valores cadastrados.' },
  { id: 'capacidades', grupo: 'pode', rotulo: 'Capacidades', icone: ShieldCheck,
    descricao: 'O que a IA pode mudar no CRM enquanto atende. Tudo fica no histórico do contato.' },
  { id: 'transferencia', grupo: 'pode', rotulo: 'Transferência', icone: ArrowRightLeft,
    descricao: 'Quando a IA chama uma pessoa, redireciona ou responde sem gastar IA.' },
  { id: 'comportamento', grupo: 'pode', rotulo: 'Comportamento', icone: SlidersHorizontal,
    descricao: 'Pausa quando a equipe assume e espera por mensagens seguidas.' },
  { id: 'desempenho', grupo: 'indo', rotulo: 'Desempenho', icone: BarChart3,
    descricao: 'Conversas atendidas, testes e uso das ferramentas.' },
  { id: 'alteracoes', grupo: 'indo', rotulo: 'Alterações', icone: History,
    descricao: 'O que mudou neste agente e quando.' },
]

export const SECAO_PADRAO: SecaoId = 'instrucoes'

export function ehSecao(v: string | null | undefined): v is SecaoId {
  return !!v && SECOES.some((s) => s.id === v)
}

export function secaoPorId(id: SecaoId): Secao {
  return SECOES.find((s) => s.id === id)!
}

/**
 * As abas da tela antiga (`/agents?agent=X&tab=Y`) para as seções novas. Links
 * salvos, notificações, o Hub e a demonstração da landing ainda usam o formato
 * antigo; a página redireciona sem perder o destino.
 */
const ABA_ANTIGA: Record<string, SecaoId> = {
  overview: 'instrucoes',
  prompt: 'instrucoes',
  capabilities: 'capacidades',
  skills: 'capacidades',
  tools: 'capacidades',
  criteria: 'transferencia',
  rules: 'transferencia',
  knowledge: 'conhecimento',
  catalog: 'catalogo',
  metrics: 'desempenho',
}

export function secaoDaAbaAntiga(aba: string | null | undefined): SecaoId {
  return (aba && ABA_ANTIGA[aba]) || SECAO_PADRAO
}

/** Caminho da página de um agente. `teste` abre a bancada de teste. */
export function rotaDoAgente(agentId: string, secao: SecaoId = SECAO_PADRAO, opts: { teste?: boolean } = {}): string {
  const base = `/agents/${encodeURIComponent(agentId)}/${secao}`
  return opts.teste ? `${base}?teste=1` : base
}
