import type { ApoioDoEditor, Catalogo, ProblemaDoDesenho, VersaoDaJornada } from './tipos'
import { passoDoCatalogo, saidasDoNo } from './catalogo'

/**
 * ORY-60 — validação ao vivo do desenho (§2.11). Função pura: a tela chama a cada
 * mudança. No produto, a mesma regra roda no backend em
 * `POST /v1/journeys/{id}/validate` e na publicação; esta cópia serve para o
 * aviso aparecer na hora, sem ir ao servidor.
 */

const VARIAVEIS_FIXAS = [
  'contato.nome', 'contato.telefone', 'contato.email', 'contato.etapa', 'contato.origem',
  'conversa.atendente', 'conversa.linha',
  'evento.id', 'evento.medico', 'evento.data_consulta', 'evento.especialidade',
  'conector.agenda.id', 'conector.agenda.preparo', 'conector.agenda.status',
  'contexto.tentativa', 'contexto.resposta',
]

export function variaveisConhecidas(catalogo: Catalogo): Set<string> {
  const s = new Set<string>(VARIAVEIS_FIXAS)
  for (const e of catalogo.events) for (const v of e.variables) s.add(v)
  for (const o of catalogo.connectorOperations) for (const v of o.variables) s.add(v)
  return s
}

/** `{{contato.nome|"paciente"}}` e `{{evento.data | data:"DD/MM"}}` → `contato.nome`, `evento.data`. */
export function variaveisNoTexto(texto: string): string[] {
  const achadas: string[] = []
  for (const m of texto.matchAll(/\{\{\s*([a-zA-Z_][\w.*]*)/g)) achadas.push(m[1])
  return achadas
}

function vazio(v: unknown): boolean {
  if (v === undefined || v === null || v === '') return true
  if (Array.isArray(v)) return v.length === 0
  if (typeof v === 'object' && 'amount' in (v as Record<string, unknown>)) return !(Number((v as { amount: unknown }).amount) > 0)
  return false
}

function textosDoNo(params: Record<string, unknown>): string[] {
  const out: string[] = []
  for (const v of Object.values(params)) {
    if (typeof v === 'string') out.push(v)
    else if (Array.isArray(v)) for (const x of v) if (typeof x === 'string') out.push(x)
  }
  return out
}

export function validarDesenho(versao: Pick<VersaoDaJornada, 'graph' | 'entry' | 'goals'>, catalogo: Catalogo, apoio: ApoioDoEditor): ProblemaDoDesenho[] {
  const problemas: ProblemaDoDesenho[] = []
  const { graph, entry, goals } = versao
  const ids = Object.keys(graph.nodes)
  const conhecidas = variaveisConhecidas(catalogo)

  if (entry.doors.length === 0) problemas.push({ severity: 'error', code: 'no_door', message: 'A jornada não tem porta de entrada.' })
  if (!graph.start || !graph.nodes[graph.start]) problemas.push({ severity: 'error', code: 'no_start', message: 'Ligue a entrada ao primeiro passo.' })

  for (const id of ids) {
    const no = graph.nodes[id]
    const passo = passoDoCatalogo(catalogo, no.type)
    const nome = no.label || passo?.label || no.type
    if (!passo) {
      problemas.push({ severity: 'error', code: 'unknown_step', message: `"${nome}": passo que não existe no catálogo.`, nodeId: id })
      continue
    }
    if (passo.availability === 'soon') {
      problemas.push({ severity: 'error', code: 'step_soon', message: `"${nome}" chega no próximo épico. Tire do desenho para publicar.`, nodeId: id })
    }
    for (const campo of passo.params) {
      if (!campo.required) continue
      if (campo.showIf && no.params[campo.showIf.key] !== campo.showIf.equals) continue
      if (vazio(no.params[campo.key])) problemas.push({ severity: 'error', code: 'required', message: `"${nome}": falta preencher "${campo.label}".`, nodeId: id })
    }
    // saídas
    for (const s of saidasDoNo(no, catalogo)) {
      const destino = no.outputs[s.key]
      if (!destino) {
        problemas.push({
          severity: 'error',
          code: s.key === 'next' ? 'no_exit' : 'branch_without_target',
          message: s.key === 'next' ? `"${nome}" não tem saída. Ligue a um próximo passo, a "Meta atingida" ou a "Sair".` : `"${nome}": o ramo "${s.label}" não vai a lugar nenhum.`,
          nodeId: id,
        })
      } else if (!graph.nodes[destino]) {
        problemas.push({ severity: 'error', code: 'broken_link', message: `"${nome}" aponta para um passo apagado.`, nodeId: id })
      }
    }
    // prazos
    if (no.type === 'wait' && no.params.mode === 'duration' && vazio(no.params.duration)) problemas.push({ severity: 'error', code: 'wait_without_deadline', message: `"${nome}": espera sem prazo.`, nodeId: id })
    if (no.type === 'wait_event' && vazio(no.params.timeout)) problemas.push({ severity: 'error', code: 'wait_without_deadline', message: `"${nome}": espera sem prazo.`, nodeId: id })
    if (no.type === 'hold_conversation' && vazio(no.params.duration)) problemas.push({ severity: 'error', code: 'hold_without_deadline', message: `"${nome}" segura a conversa sem prazo.`, nodeId: id })
    // modelo e linha
    if (no.type === 'send_template') {
      const linha = no.params.whatsappNumberId as string | undefined
      const modelo = apoio.templates.find((t) => t.id === no.params.templateId)
      if (modelo) {
        if (modelo.status !== 'APPROVED') problemas.push({ severity: 'error', code: 'template_not_approved', message: `"${nome}": o modelo "${modelo.name}" ainda não foi aprovado pela Meta.`, nodeId: id })
        if (modelo.whatsappNumberId && linha && modelo.whatsappNumberId !== linha) problemas.push({ severity: 'error', code: 'template_line_mismatch', message: `"${nome}": o modelo "${modelo.name}" é de outra linha de WhatsApp.`, nodeId: id })
        const vars = Array.isArray(no.params.variables) ? (no.params.variables as unknown[]).filter((v) => typeof v === 'string' && v.trim()) : []
        if (vars.length < modelo.variableCount) problemas.push({ severity: 'error', code: 'template_variables', message: `"${nome}": o modelo pede ${modelo.variableCount} variável(is); há ${vars.length}.`, nodeId: id })
        if (modelo.category === 'MARKETING' && !entry.criteria.conditions.some((c) => c.field === 'contato.opt_in_marketing')) {
          problemas.push({ severity: 'warning', code: 'marketing_opt_in', message: `"${nome}" usa modelo de marketing: só recebe quem aceitou marketing. A porta única barra os outros.`, nodeId: id })
        }
      }
    }
    // variáveis
    for (const t of textosDoNo(no.params)) {
      for (const v of variaveisNoTexto(t)) {
        if (!conhecidas.has(v)) problemas.push({ severity: 'error', code: 'unknown_variable', message: `"${nome}": a variável {{${v}}} não existe.`, nodeId: id })
      }
    }
    if (passo.cost.credits > 0 && passo.availability === 'available') {
      problemas.push({ severity: 'warning', code: 'ai_cost', message: `"${nome}" usa IA: ${passo.cost.label} por pessoa que passar por aqui.`, nodeId: id })
    }
  }

  // passos soltos: nada chega até eles
  const alcancados = new Set<string>()
  const fila = graph.start ? [graph.start] : []
  while (fila.length) {
    const id = fila.shift()!
    if (alcancados.has(id) || !graph.nodes[id]) continue
    alcancados.add(id)
    for (const d of Object.values(graph.nodes[id].outputs)) if (d) fila.push(d)
  }
  for (const id of ids) {
    if (!alcancados.has(id)) {
      const no = graph.nodes[id]
      problemas.push({ severity: 'warning', code: 'unreachable', message: `"${no.label || passoDoCatalogo(catalogo, no.type)?.label || no.type}" está solto: nada chega até ele.`, nodeId: id })
    }
  }

  const temMeta = goals.goals.length > 0 || ids.some((id) => graph.nodes[id].type === 'goal')
  if (!temMeta) problemas.push({ severity: 'warning', code: 'no_goal', message: 'Sem meta: os resultados não vão mostrar taxa de sucesso.' })

  return problemas
}
