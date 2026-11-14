import type {
  ApoioDoEditor,
  Catalogo,
  ConfirmacaoNecessaria,
  Inscricao,
  ItemDaLinhaDoTempo,
  Jornada,
  ProblemaDoDesenho,
  Receita,
  ResultadoDaSimulacao,
  ResultadosDaJornada,
  ResumoDaJornada,
  VerificacaoDeEntrada,
  VersaoDaJornada,
} from './tipos'
import { CATALOGO_EXEMPLO } from './catalogo'
import {
  APOIO_EXEMPLO,
  RECEITAS_EXEMPLO,
  inscricoesDeExemplo,
  jornadasDeExemplo,
  linhaDoTempoDeExemplo,
  porQueNaoEntrouDeExemplo,
  resultadosDeExemplo,
} from './dados-exemplo'
import { validarDesenho } from './validar'

/**
 * ORY-60 — a ÚNICA porta das telas para os dados das Jornadas.
 *
 * Cada função corresponde a uma rota planejada da v1 (ORY-61; desenho §2.10).
 * Hoje quem responde é `jornadasApiDeExemplo`, em memória (com o rascunho guardado
 * no navegador). Para ligar o backend (ORY-62), escreva `jornadasApiReal` com as
 * mesmas assinaturas, chamando as rotas abaixo, e troque o `export const jornadasApi`
 * no fim do arquivo. As telas não mudam.
 */
export interface JornadasApi {
  /** GET /v1/journeys */
  listar(): Promise<ResumoDaJornada[]>
  /** GET /v1/journeys/{id} (com o rascunho) */
  ver(id: string): Promise<Jornada>
  /** GET /v1/journeys/catalog */
  catalogo(): Promise<Catalogo>
  /** Já existem na v1 do ORY-11: GET /v1/templates, /v1/whatsapp-numbers, /v1/tags, /v1/stages, /v1/users, /v1/departments */
  apoio(): Promise<ApoioDoEditor>
  /** GET /v1/journeys/recipes */
  receitas(): Promise<Receita[]>
  /** POST /v1/journeys (cria rascunho, vazio ou a partir de uma receita) */
  criar(input: { name: string; recipeId?: string | null }): Promise<Jornada>
  /** PATCH /v1/journeys/{id}/draft com a versão esperada (409 se outra pessoa salvou antes) */
  salvarRascunho(id: string, draft: VersaoDaJornada, input?: { name?: string; description?: string }): Promise<Jornada>
  /** POST /v1/journeys/{id}/validate */
  validar(id: string, draft: VersaoDaJornada): Promise<ProblemaDoDesenho[]>
  /** POST /v1/journeys/{id}/simulate (quantos entrariam hoje; não executa nada) */
  simular(id: string, draft: VersaoDaJornada): Promise<ResultadoDaSimulacao>
  /**
   * POST /v1/journeys/{id}/publish — DUAS ETAPAS (padrão do ORY-11):
   * sem token devolve a prévia e o `confirmationToken`; com o token, publica.
   */
  publicar(id: string, mode: 'shadow' | 'active', confirmationToken?: string): Promise<ConfirmacaoNecessaria | Jornada>
  /** POST /v1/journeys/{id}/pause (parar é seguro: uma etapa só) */
  pausar(id: string): Promise<Jornada>
  /** POST /v1/journeys/{id}/resume — DUAS ETAPAS */
  retomar(id: string, confirmationToken?: string): Promise<ConfirmacaoNecessaria | Jornada>
  /** GET /v1/journeys/{id}/enrollments */
  inscricoes(id: string): Promise<Inscricao[]>
  /** GET /v1/enrollments/{id}/timeline */
  linhaDoTempo(journeyId: string, enrollmentId: string): Promise<ItemDaLinhaDoTempo[]>
  /** DELETE /v1/enrollments/{id} (tirar da jornada) */
  tirarDaJornada(journeyId: string, enrollmentId: string): Promise<void>
  /** GET /v1/journeys/{id}/why-not?contactId= (aqui: busca por nome, só no exemplo) */
  porQueNaoEntrou(id: string, busca: string): Promise<{ contact: { name: string; phoneMasked: string }; checks: VerificacaoDeEntrada[] } | null>
  /** GET /v1/journeys/{id}/analytics */
  resultados(id: string): Promise<ResultadosDaJornada>
  /** Só no protótipo: volta aos dados de exemplo. */
  restaurarExemplos?(): Promise<void>
}

export function ehConfirmacao(x: ConfirmacaoNecessaria | Jornada): x is ConfirmacaoNecessaria {
  return 'confirmationToken' in x
}

// ── implementação de EXEMPLO ─────────────────────────────────────────────────

const CHAVE = 'oryon.jornadas.exemplo.v1'
const espera = (ms = 180) => new Promise((r) => setTimeout(r, ms))
const copia = <T,>(x: T): T => JSON.parse(JSON.stringify(x)) as T

let memoria: Jornada[] | null = null
const tokens = new Map<string, { id: string; acao: string; expira: number }>()
const removidas = new Set<string>()

function carregar(): Jornada[] {
  if (memoria) return memoria
  try {
    const bruto = localStorage.getItem(CHAVE)
    if (bruto) {
      const lido = JSON.parse(bruto) as { jornadas: Jornada[] }
      if (Array.isArray(lido.jornadas) && lido.jornadas.length) {
        memoria = lido.jornadas
        return memoria
      }
    }
  } catch {
    /* sem armazenamento no navegador: segue com os exemplos */
  }
  memoria = jornadasDeExemplo()
  return memoria
}

function gravar() {
  try {
    localStorage.setItem(CHAVE, JSON.stringify({ jornadas: memoria }))
  } catch {
    /* sem armazenamento: o protótipo continua, só não lembra depois de recarregar */
  }
}

function achar(id: string): Jornada {
  const j = carregar().find((x) => x.id === id)
  if (!j) throw new Error('Jornada não encontrada.')
  return j
}

function resumo(j: Jornada): ResumoDaJornada {
  const r: Partial<Jornada> = { ...j }
  delete r.draft
  delete r.enrolledByVersion
  return r as ResumoDaJornada
}

function contarMudancas(j: Jornada): string[] {
  const n = Object.keys(j.draft.graph.nodes).length
  if (!j.publishedVersion) return [`Primeira publicação: ${n} passos.`]
  return j.hasDraftChanges ? [`Desenho alterado desde a v${j.publishedVersion} (${n} passos).`] : ['Nenhuma mudança no desenho; só o modo muda.']
}

function simularDe(j: Jornada, draft: VersaoDaJornada): ResultadoDaSimulacao {
  const porta = draft.entry.doors[0]?.type
  const entram = porta === 'schedule_list' ? 87 : porta === 'event' ? 14 : porta === 'segment' ? 230 : porta === 'webhook' ? 9 : 0
  const envios = Object.values(draft.graph.nodes).filter((n) => n.type === 'send_template' || n.type === 'send_text').length
  const ia = Object.values(draft.graph.nodes).reduce((s, n) => s + (CATALOGO_EXEMPLO.steps.find((p) => p.type === n.type)?.cost.credits ?? 0), 0)
  const mensagens = Math.round(entram * Math.min(envios, 1.4))
  const linha = (draft.graph.nodes[Object.keys(draft.graph.nodes).find((k) => draft.graph.nodes[k].type === 'send_template') ?? '']?.params.whatsappNumberId as string) ?? j.whatsappNumberId ?? 'l_alto'
  return {
    wouldEnterToday: entram,
    filteredOut: porta === 'schedule_list' ? [{ reason: 'Consulta já confirmada no sistema', count: 6 }, { reason: 'Telefone inválido', count: 3 }] : porta === 'event' ? [{ reason: 'Já tem consulta marcada nos próximos 30 dias', count: 5 }] : [],
    messagesPerDay: mensagens,
    creditsPerDay: Math.round(entram * ia * 10) / 10,
    metaCostPerDayBrl: Math.round(mensagens * 0.08 * 100) / 100,
    byLine: [{ whatsappNumberId: linha, messages: mensagens }],
  }
}

export const jornadasApiDeExemplo: JornadasApi = {
  async listar() {
    await espera()
    return carregar().filter((j) => j.status !== 'archived').map(resumo)
  },
  async ver(id) {
    await espera(120)
    return copia(achar(id))
  },
  async catalogo() {
    await espera(60)
    return CATALOGO_EXEMPLO
  },
  async apoio() {
    await espera(60)
    return APOIO_EXEMPLO
  },
  async receitas() {
    await espera(100)
    return RECEITAS_EXEMPLO
  },
  async criar({ name, recipeId }) {
    await espera()
    const receita = RECEITAS_EXEMPLO.find((r) => r.id === recipeId)
    const id = `j_${Math.random().toString(36).slice(2, 9)}`
    const vazia: VersaoDaJornada = {
      version: 1, status: 'draft', catalogVersion: CATALOGO_EXEMPLO.version, publishedAt: null, publishedBy: null,
      graph: { start: null, nodes: {}, layout: {} },
      entry: { doors: [{ id: 'p_manual', type: 'manual', params: {} }], criteria: { mode: 'all', conditions: [] }, reentry: { mode: 'once' } },
      goals: { goals: [], exitIf: [{ id: 'x_optout', label: 'Pediu para não receber', event: 'contact.opted_out' }], ttlDays: 7 },
    }
    const nova: Jornada = {
      id, name, description: receita?.description ?? '', status: 'draft', publishedVersion: null, hasDraftChanges: true,
      whatsappNumberId: null, enrolledNow: 0, goalRate30d: null, lastActivityAt: null, errors24h: 0, creditsThisMonth: 0, messagesThisMonth: 0,
      createdBy: 'Você', updatedAt: new Date().toISOString(), recipeId: receita?.id ?? null,
      draft: receita ? { ...copia(receita.version), version: 1, status: 'draft', publishedAt: null, publishedBy: null } : vazia,
      enrolledByVersion: [],
    }
    carregar().unshift(nova)
    gravar()
    return copia(nova)
  },
  async salvarRascunho(id, draft, input) {
    await espera(120)
    const j = achar(id)
    const mudouDesenho = JSON.stringify({ g: j.draft.graph.nodes, e: j.draft.entry, m: j.draft.goals }) !== JSON.stringify({ g: draft.graph.nodes, e: draft.entry, m: draft.goals })
    j.draft = copia(draft)
    if (input?.name !== undefined) j.name = input.name
    if (input?.description !== undefined) j.description = input.description
    // Só mover um passo no canvas não é mudança de comportamento.
    if (mudouDesenho) j.hasDraftChanges = true
    j.updatedAt = new Date().toISOString()
    gravar()
    return copia(j)
  },
  async validar(_id, draft) {
    await espera(60)
    return validarDesenho(draft, CATALOGO_EXEMPLO, APOIO_EXEMPLO)
  },
  async simular(id, draft) {
    await espera(400)
    return simularDe(achar(id), draft)
  },
  async publicar(id, mode, confirmationToken) {
    await espera(250)
    const j = achar(id)
    const erros = validarDesenho(j.draft, CATALOGO_EXEMPLO, APOIO_EXEMPLO).filter((p) => p.severity === 'error')
    if (erros.length) throw new Error(`O desenho tem ${erros.length} problema(s) para resolver antes de publicar.`)
    if (!confirmationToken) {
      const token = `conf_${Math.random().toString(36).slice(2)}`
      tokens.set(token, { id, acao: `publish:${mode}`, expira: Date.now() + 10 * 60_000 })
      const sim = simularDe(j, j.draft)
      const anteriores = j.enrolledByVersion.reduce((s, v) => s + v.count, 0)
      return {
        confirmationToken: token,
        expiresAt: new Date(Date.now() + 10 * 60_000).toISOString(),
        preview: {
          mode, fromVersion: j.publishedVersion, toVersion: (j.publishedVersion ?? 0) + 1,
          wouldEnterToday: sim.wouldEnterToday,
          messagesPerDay: mode === 'shadow' ? 0 : sim.messagesPerDay,
          whatsappNumbers: sim.byLine.map((l) => APOIO_EXEMPLO.whatsappNumbers.find((w) => w.id === l.whatsappNumberId)?.name ?? l.whatsappNumberId),
          estimatedCreditsPerEnrollment: Object.values(j.draft.graph.nodes).reduce((s, n) => s + (CATALOGO_EXEMPLO.steps.find((p) => p.type === n.type)?.cost.credits ?? 0), 0),
          changes: contarMudancas(j),
          enrolledInPreviousVersions: anteriores,
          warnings: mode === 'shadow'
            ? ['Em sombra nada é enviado: cada passo grava o que teria feito. O conector que grava roda em ensaio.']
            : sim.messagesPerDay > 0 ? [`Cerca de ${sim.messagesPerDay} mensagens por dia, com a tarifa da Meta.`] : [],
        },
      }
    }
    const t = tokens.get(confirmationToken)
    if (!t || t.id !== id || t.acao !== `publish:${mode}`) throw new Error('A confirmação não confere com a prévia. Peça a prévia de novo.')
    if (t.expira < Date.now()) throw new Error('A prévia venceu (10 min). Peça de novo.')
    tokens.delete(confirmationToken)
    const nova = (j.publishedVersion ?? 0) + 1
    if (j.publishedVersion && j.enrolledNow) j.enrolledByVersion = [{ version: nova, count: 0 }, ...j.enrolledByVersion]
    j.publishedVersion = nova
    j.status = mode
    j.hasDraftChanges = false
    j.draft = { ...j.draft, version: nova + 1 }
    j.updatedAt = new Date().toISOString()
    gravar()
    return copia(j)
  },
  async pausar(id) {
    await espera()
    const j = achar(id)
    j.status = 'paused'
    gravar()
    return copia(j)
  },
  async retomar(id, confirmationToken) {
    await espera()
    const j = achar(id)
    if (!confirmationToken) {
      const token = `conf_${Math.random().toString(36).slice(2)}`
      tokens.set(token, { id, acao: 'resume', expira: Date.now() + 10 * 60_000 })
      const sim = simularDe(j, j.draft)
      return {
        confirmationToken: token,
        expiresAt: new Date(Date.now() + 10 * 60_000).toISOString(),
        preview: {
          mode: 'active', fromVersion: j.publishedVersion, toVersion: j.publishedVersion ?? 1, wouldEnterToday: sim.wouldEnterToday, messagesPerDay: sim.messagesPerDay,
          whatsappNumbers: sim.byLine.map((l) => APOIO_EXEMPLO.whatsappNumbers.find((w) => w.id === l.whatsappNumberId)?.name ?? l.whatsappNumberId),
          estimatedCreditsPerEnrollment: 0, changes: ['Volta a rodar a versão publicada, sem mudanças.'], enrolledInPreviousVersions: 0,
          warnings: ['Quem entrou na pausa não é inscrito de volta.'],
        },
      }
    }
    const t = tokens.get(confirmationToken)
    if (!t || t.id !== id || t.acao !== 'resume') throw new Error('A confirmação não confere com a prévia. Peça a prévia de novo.')
    tokens.delete(confirmationToken)
    j.status = 'active'
    gravar()
    return copia(j)
  },
  async inscricoes(id) {
    await espera(150)
    return inscricoesDeExemplo(id).inscricoes.filter((i) => !removidas.has(i.id))
  },
  async linhaDoTempo(journeyId, enrollmentId) {
    await espera(120)
    return linhaDoTempoDeExemplo(achar(journeyId), enrollmentId)
  },
  async tirarDaJornada(_journeyId, enrollmentId) {
    await espera()
    removidas.add(enrollmentId)
  },
  async porQueNaoEntrou(id, busca) {
    await espera(200)
    return porQueNaoEntrouDeExemplo(achar(id), busca)
  },
  async resultados(id) {
    await espera(180)
    return resultadosDeExemplo(achar(id))
  },
  async restaurarExemplos() {
    memoria = jornadasDeExemplo()
    removidas.clear()
    try { localStorage.removeItem(CHAVE) } catch { /* nada */ }
  },
}

/** Troque aqui pela implementação real quando a ORY-61 estiver pronta (ver README). */
export const jornadasApi: JornadasApi = jornadasApiDeExemplo

/** Verdadeiro enquanto as telas usam os dados de exemplo (mostra o aviso no topo). */
export const USANDO_DADOS_DE_EXEMPLO = jornadasApi === jornadasApiDeExemplo
