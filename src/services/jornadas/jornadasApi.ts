import type {
  AlteracaoDoRascunho,
  ApoioDoEditor,
  DestinoAoPublicar,
  PresencaNoEditor,
  Catalogo,
  ChecagemDeEntrada,
  Comentario,
  ContatoMascarado,
  EntradaDoTeste,
  FiltroDeInscricoes,
  ItemDoRegistro,
  PaginaDoRegistro,
  ResultadoDoPasso,
  TipoDePorta,
  TratamentoDoAlerta,
  ConfirmacaoDeInscricao,
  ConfirmacaoNecessaria,
  ContatoParaInscrever,
  LimitesDoPlano,
  ModoDaPausa,
  PreviaDaPausa,
  PreviaDaPublicacao,
  VersaoPublicada,
  Inscricao,
  PaginaDeInscricoes,
  ItemDaLinhaDoTempo,
  Jornada,
  ProblemaDoDesenho,
  Receita,
  ResultadoDaSimulacao,
  RecorteDosResultados,
  SaudeDaJornada,
  PropostaDaIa,
  ConexoesDasJornadas,
  PaginaDoRecorte,
  PessoaDoRecorte,
  ResultadosDaJornada,
  ResumoDaJornada,
  VerificacaoDeEntrada,
  VersaoDaJornada,
} from './tipos'
import { CATALOGO_EXEMPLO, PARAMS_PADRAO_DA_PORTA, saidasDoNo } from './catalogo'
import {
  APOIO_EXEMPLO,
  CONTATOS_PARA_INSCREVER,
  RECEITAS_EXEMPLO,
  CONTEXTO_DE_TESTE_EXEMPLO as CONTEXTO_DE_TESTE,
  inscricoesDeExemplo,
  jornadasDeExemplo,
  linhaDoTempoDeExemplo,
  porQueNaoEntrouDeExemplo,
  registroDeExemplo,
  resultadosDeExemplo,
} from './dados-exemplo'
import { validarDesenho } from './validar'
import { TARIFA_MEDIA_DA_META_BRL } from './custos'
import { MOTIVOS_DE_PULO } from './motivos'
import { canaisDoDesenho } from './canais'
import { diferencasDoDesenho, frasesDasDiferencas, nomeDoNo } from './diff'

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
  /** GET /v1/journeys (com `?deleted=true`, a lixeira: as apagadas nos últimos 90 dias) */
  listar(opcoes?: { apagadas?: boolean }): Promise<ResumoDaJornada[]>
  /** POST /v1/journeys/{id}/duplicate — um rascunho novo, "Cópia de …", com o mesmo desenho */
  duplicar(id: string): Promise<Jornada>
  /** POST /v1/journeys/bulk `{ ids, action: 'delete' }` — vai para a lixeira (90 dias). Ativa ou em sombra: pause antes */
  apagar(ids: string[]): Promise<{ deleted: number; blocked: { id: string; reason: string }[] }>
  /** POST /v1/journeys/{id}/restore — sai da lixeira como rascunho ou pausada */
  restaurar(id: string): Promise<Jornada>
  /** POST /v1/journeys/bulk `{ ids, action: 'label', add, remove }` */
  etiquetar(ids: string[], mudanca: { add?: string[]; remove?: string[] }): Promise<void>
  /** POST /v1/journeys/{id}/alerts/{kind} `{ action, note }` — resolvido, adiar 24 h ou ignorar este tipo */
  tratarAlerta(id: string, kind: string, acao: TratamentoDoAlerta, nota?: string): Promise<Jornada>
  /** PATCH /v1/journeys/{id} `{ alertRecipients }` — quem é avisado (e-mail, WhatsApp) quando abre um alerta */
  configurarAlertas(id: string, cfg: { userIds: string[]; channels: ('email' | 'whatsapp')[] } | null): Promise<Jornada>
  /** GET /v1/journeys/{id} (com o rascunho) */
  ver(id: string): Promise<Jornada>
  /** GET /v1/journeys/catalog */
  catalogo(): Promise<Catalogo>
  /** Já existem na v1 do ORY-11: GET /v1/templates, /v1/whatsapp-numbers, /v1/tags, /v1/stages, /v1/users, /v1/departments */
  apoio(): Promise<ApoioDoEditor>
  /** GET /v1/journeys/recipes */
  receitas(): Promise<Receita[]>
  /** POST /v1/journeys (cria rascunho, vazio ou a partir de uma receita) */
  criar(input: { name: string; recipeId?: string | null; door?: TipoDePorta }): Promise<Jornada>
  /**
   * POST /v1/journeys/ai/propose — "Criar com IA" (P2, 16/11, Copiloto v2): monta
   * um desenho pelo que a pessoa descreveu. Com `journeyId` e `draft`, propõe a
   * MUDANÇA sobre aquele rascunho. Nada é salvo: a tela mostra a prévia e o que
   * muda, e a pessoa aplica (ou não).
   */
  proporComIa(pedido: { descricao: string; journeyId?: string; draft?: VersaoDaJornada }): Promise<PropostaDaIa>
  /** POST /v1/journeys com o desenho da proposta: nasce como rascunho desligado. */
  criarDaProposta(proposta: PropostaDaIa): Promise<Jornada>
  /** PATCH /v1/journeys/{id}/draft com a versão esperada (409 se outra pessoa salvou antes) */
  salvarRascunho(id: string, draft: VersaoDaJornada, input?: { name?: string; description?: string }): Promise<Jornada>
  /** POST /v1/journeys/{id}/validate */
  validar(id: string, draft: VersaoDaJornada): Promise<ProblemaDoDesenho[]>
  /** POST /v1/journeys/{id}/simulate (quantos entrariam hoje; não executa nada) */
  /** `dias: 7` (P2, 16/11): também os próximos 7 dias, dia a dia. */
  simular(id: string, draft: VersaoDaJornada, opcoes?: { dias?: 1 | 7 }): Promise<ResultadoDaSimulacao>
  /**
   * POST /v1/journeys/{id}/publish — DUAS ETAPAS (padrão do ORY-11):
   * sem token devolve a prévia e o `confirmationToken`; com o token, publica.
   */
  publicar(id: string, mode: 'shadow' | 'active', confirmationToken?: string, opcoes?: OpcoesDePublicar): Promise<ConfirmacaoNecessaria | Jornada>
  /** POST /v1/journeys/{id}/publish-requests `{ mode, note }` — pede a um administrador que publique */
  pedirAprovacao(id: string, pedido: { mode: 'shadow' | 'active'; note?: string }): Promise<Jornada>
  /** DELETE /v1/journeys/{id}/publish-requests `{ reason }` — recusar (ou desistir do pedido) */
  recusarAprovacao(id: string, motivo?: string): Promise<Jornada>
  /** DELETE /v1/journeys/{id}/scheduled-publish — cancela a publicação agendada */
  cancelarAgendamento(id: string): Promise<Jornada>
  /** POST /v1/journeys/{id}/versions/{version}/restore-draft — o desenho da versão vira o rascunho (o rascunho de antes fica no histórico) */
  restaurarComoRascunho(id: string, version: number): Promise<Jornada>
  /** GET /v1/journeys/{id}/draft-history — quem mudou o quê no rascunho, com o antes e o depois */
  historicoDoRascunho(id: string): Promise<AlteracaoDoRascunho[]>
  /** GET /v1/journeys/{id}/pause-preview — quantos estão dentro, esperando resposta e com mensagem nas próximas 24 h */
  previaDaPausa(id: string): Promise<PreviaDaPausa>
  /** POST /v1/journeys/{id}/pause `{ inFlight }` (parar é seguro: uma etapa só). `inFlight`: terminam o caminho, ficam parados ou saem agora */
  pausar(id: string, opcoes?: { inFlight: ModoDaPausa }): Promise<Jornada>
  /** POST /v1/journeys/{id}/resume — DUAS ETAPAS */
  retomar(id: string, confirmationToken?: string): Promise<ConfirmacaoNecessaria | Jornada>
  /** GET /v1/journeys/{id}/enrollments?situation=&status=&node=&version=&search=&page=&perPage= (paginado; traz os totais por situação) */
  inscricoes(id: string, filtro?: FiltroDeInscricoes): Promise<PaginaDeInscricoes>
  /** POST /v1/journeys/{id}/enrollments/remove `{ ids }` — tirar várias de uma vez (motivo "manual") */
  tirarVarias(id: string, enrollmentIds: string[]): Promise<{ removed: number }>
  /** GET /v1/journeys/{id}/enrollments.csv?(mesmos filtros) — telefone sempre mascarado (LGPD) */
  exportarInscricoes(id: string, filtro?: FiltroDeInscricoes): Promise<string>
  /** GET /v1/journeys/{id}/actions?errorsOnly=&node=&search=&page= — o registro de ações da jornada inteira */
  registro(id: string, filtro?: { soErros?: boolean; passo?: string | null; busca?: string; pagina?: number; porPagina?: number }): Promise<PaginaDoRegistro>
  /** POST /v1/journeys/{id}/actions/{actionId}/retry — tenta de novo um passo que falhou (com a versão em que a pessoa está) */
  tentarDeNovo(id: string, actionId: string): Promise<ItemDoRegistro>
  /** GET /v1/journeys/{id}/actions.csv?(mesmos filtros) */
  exportarRegistro(id: string, filtro?: { soErros?: boolean; passo?: string | null; busca?: string }): Promise<string>
  /** GET /v1/enrollments/{id}/timeline */
  linhaDoTempo(journeyId: string, enrollmentId: string): Promise<ItemDaLinhaDoTempo[]>
  /** DELETE /v1/enrollments/{id} (tirar da jornada) */
  tirarDaJornada(journeyId: string, enrollmentId: string): Promise<void>
  /** GET /v1/journeys/{id}/why-not?contactId= (aqui: busca por nome, só no exemplo) */
  porQueNaoEntrou(id: string, busca: string): Promise<{ contact: { name: string; phoneMasked: string }; checks: VerificacaoDeEntrada[] } | null>
  /** GET /v1/journeys/{id}/analytics?days=7|30|90 — com o período anterior, a série por dia e as métricas de cada envio */
  resultados(id: string, filtro?: { dias?: number }): Promise<ResultadosDaJornada>
  /**
   * GET /v1/journeys/{id}/analytics/people?days=&cut= — as pessoas por trás de
   * um número de Resultados (P2, 16/11): passou por um passo, seguiu por um
   * ramo, saiu por um motivo, bateu a meta ou pulou por um motivo padronizado.
   * Até 50, das mais recentes, mascaradas; `total` é o número clicado.
   */
  pessoasDoRecorte(id: string, recorte: RecorteDosResultados, filtro?: { dias?: number }): Promise<PaginaDoRecorte>
  /** O mesmo recorte inteiro, em CSV (só nome mascarado e telefone com ••••). */
  exportarRecorte(id: string, recorte: RecorteDosResultados, filtro?: { dias?: number }): Promise<string>
  /** GET /v1/journeys/health — a saúde de cada jornada ligada, com o porquê (P2, 16/11) */
  saude(): Promise<SaudeDaJornada[]>
  /** GET /v1/journeys/connections — eventos e linhas que ligam as jornadas (P2, 16/11) */
  conexoes(): Promise<ConexoesDasJornadas>
  /** GET /v1/journeys/limits (do plano do cliente: jornadas ativas, passos, prazo, créditos de IA) */
  limites(): Promise<LimitesDoPlano>
  /** GET /v1/journeys/{id}/versions */
  versoes(id: string): Promise<VersaoPublicada[]>
  /** GET /v1/journeys/{id}/versions/{version} — o desenho de uma versão publicada (ver no desenho, só leitura, e o diff com o rascunho) */
  versao(id: string, version: number): Promise<VersaoDaJornada>
  /**
   * POST /v1/journeys/{id}/versions/{version}/republish — "voltar" é publicar a
   * anterior de novo, como versão nova. DUAS ETAPAS, como publicar.
   */
  voltarParaVersao(id: string, version: number, confirmationToken?: string): Promise<ConfirmacaoNecessaria | Jornada>
  /** GET /v1/contacts?search= (mascarado), para a inscrição manual */
  buscarContatos(busca: string): Promise<ContatoParaInscrever[]>
  /**
   * POST /v1/journeys/{id}/enrollments — DUAS ETAPAS quando a jornada envia
   * mensagem: sem token devolve a prévia (quantos entram e quem é barrado).
   */
  inscrever(id: string, contactIds: string[], confirmationToken?: string): Promise<ConfirmacaoDeInscricao | { enrolled: number }>
  /**
   * POST /v1/journeys/{id}/test-send — manda UMA mensagem do passo (modelo ou
   * texto) para o WhatsApp de quem está editando, com os dados de teste. Não
   * inscreve ninguém nem conta nos resultados. Devolve o número (mascarado).
   */
  enviarTeste(id: string, nodeId: string, entrada?: EntradaDoTeste): Promise<{ to: string }>
  /**
   * GET /v1/journeys/{id}/test-context?contactId= — os dados de um contato de
   * verdade (mascarados) para o teste e para a prévia: nome, telefone mascarado e
   * o próximo agendamento ou evento. Sem `contactId`, os do contato de teste.
   */
  contextoDoContato(id: string, contactId: string | null): Promise<Record<string, string>>
  /** POST /v1/journeys/{id}/test-run/checks `{ contactId?, data }` — "entraria?": porta, filtro, reentrada, opt-out, outra jornada, horário */
  checarEntrada(id: string, entrada: EntradaDoTeste): Promise<ChecagemDeEntrada[]>
  /**
   * POST /v1/journeys/{id}/nodes/{nodeId}/test `{ contactId?, data }` — roda SÓ
   * este passo, em ensaio: o sistema do cliente não grava; a IA roda de verdade,
   * SEM gastar crédito, até o limite diário de testes de IA da empresa (16/11).
   * Passou do limite: 429 com a mensagem para a tela.
   */
  testarPasso(id: string, nodeId: string, entrada: EntradaDoTeste): Promise<ResultadoDoPasso>
  /**
   * GET /v1/journeys/{id}/presence — quem mais está com a jornada aberta (e em
   * que passo). A tela manda o próprio sinal (POST, com o passo aberto) a cada 20 s.
   */
  presenca(id: string, meuPasso: string | null): Promise<PresencaNoEditor[]>
  /** GET /v1/journeys/{id}/comments — os comentários dos passos e da jornada */
  comentarios(id: string): Promise<Comentario[]>
  /** POST /v1/journeys/{id}/comments `{ nodeId, text, mentions }` — quem é mencionado recebe aviso no app */
  comentar(id: string, c: { nodeId: string | null; text: string; mentions: string[] }): Promise<Comentario>
  /** PATCH /v1/journeys/{id}/comments/{commentId} `{ resolved }` */
  resolverComentario(id: string, commentId: string, resolved: boolean): Promise<Comentario>
  /** Só no protótipo: volta aos dados de exemplo. */
  restaurarExemplos?(): Promise<void>
}

/**
 * As escolhas da confirmação de publicar. `backfill`: inscrever quem já se
 * encaixa. `note`: o que mudou. `scheduleAt`: publicar numa data (em vez de
 * agora). `endsAt`: desligar sozinha numa data. `inFlight`: o que acontece
 * com quem já está dentro (termina na versão antiga, passa para a nova ou sai).
 */
export interface OpcoesDePublicar {
  backfill?: boolean
  note?: string
  scheduleAt?: string | null
  endsAt?: string | null
  inFlight?: DestinoAoPublicar
}

export function ehConfirmacao(x: ConfirmacaoNecessaria | Jornada): x is ConfirmacaoNecessaria {
  return 'confirmationToken' in x
}

export function ehConfirmacaoDeInscricao(x: ConfirmacaoDeInscricao | { enrolled: number }): x is ConfirmacaoDeInscricao {
  return 'confirmationToken' in x
}

// ── implementação de EXEMPLO ─────────────────────────────────────────────────

const CHAVE = 'oryon.jornadas.exemplo.v7'
const espera = (ms = 180) => new Promise((r) => setTimeout(r, ms))
const copia = <T,>(x: T): T => JSON.parse(JSON.stringify(x)) as T

let memoria: Jornada[] | null = null
/** O desenho de cada versão publicada, por jornada (no produto, a tabela de versões). */
let guardadas: Record<string, Record<number, VersaoDaJornada>> = {}
/** O histórico do rascunho de cada jornada (quem mudou o quê). */
let historicoGuardado: Record<string, AlteracaoDoRascunho[]> = {
  j_confirmacao: [
    { id: 'h_1', at: new Date(Date.now() - 3 * 86_400_000).toISOString(), author: 'Gabi (gestora)', tipo: 'novo', nodeId: 'n_confirmar', titulo: 'Passo novo: “Confirmar no sistema”.' },
    { id: 'h_2', at: new Date(Date.now() - 2 * 86_400_000).toISOString(), author: 'Rui (supervisor)', tipo: 'mudou', nodeId: 'n_texto_ok', titulo: 'Mudou “Avisar que confirmou”: texto.', antes: 'Pronto! Seu horário está confirmado. Até lá.', depois: 'Pronto, {{contato.nome}}! Sua consulta de {{conector.agenda.data}} às {{conector.agenda.hora}} está confirmada.' },
  ],
}
/** Os comentários de cada jornada (fora da versão). */
let comentariosGuardados: Record<string, Comentario[]> = {
  j_confirmacao: [
    { id: 'cm_1', nodeId: 'n_confirmar', author: 'Gabi (gestora)', text: '@Rui (supervisor) confere se o sistema aceita confirmar agendamento de sábado?', mentions: ['u_rui'], at: new Date(Date.now() - 2 * 86_400_000).toISOString(), resolved: false },
    { id: 'cm_2', nodeId: 'n_confirmar', author: 'Rui (supervisor)', text: 'Aceita. Testei com a Dra. Helena ontem.', mentions: [], at: new Date(Date.now() - 1 * 86_400_000).toISOString(), resolved: false },
  ],
}
const tokens = new Map<string, { id: string; acao: string; expira: number }>()
const removidas = new Set<string>()
/** Testes de passo de IA feitos hoje (o limite diário, sem gastar crédito). */
const LIMITE_DE_TESTES_DE_IA_POR_DIA = 20
let testesDeIa = { dia: new Date().toDateString(), feitos: 0 }
/** Ações que falharam e deram certo ao tentar de novo (só no exemplo). */
const resolvidas = new Set<string>()

/** CSV com ponto e vírgula (abre direto no Excel em português). */
function csv(linhas: (string | number)[][]): string {
  return linhas.map((l) => l.map((c) => { const t = String(c ?? ''); return /[;"\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t }).join(';')).join('\n')
}

function inscricoesFiltradas(id: string, filtro?: FiltroDeInscricoes): Inscricao[] {
  const b = (filtro?.busca ?? '').trim().toLowerCase()
  const dentro = (i: Inscricao) => i.status === 'active' || i.status === 'waiting'
  return inscricoesDeExemplo(achar(id)).inscricoes.filter((i) => !removidas.has(i.id)
    && (!filtro?.situacao || filtro.situacao === 'todas' || (filtro.situacao === 'dentro' ? dentro(i) : !dentro(i)))
    && (!b || i.contact.name.toLowerCase().includes(b) || i.contact.phoneMasked.replace(/\D/g, '').endsWith(b.replace(/\D/g, '') || '§'))
    && (!filtro?.passo || i.currentNodeId === filtro.passo)
    && (!filtro?.versao || i.version === filtro.versao)
    && (!filtro?.status || i.status === filtro.status))
}

function registroFiltrado(id: string, filtro?: { soErros?: boolean; passo?: string | null; busca?: string }): ItemDoRegistro[] {
  const b = (filtro?.busca ?? '').trim().toLowerCase()
  return registroDeExemplo(achar(id))
    .map((x) => (resolvidas.has(x.id) ? { ...x, status: 'ok' as const, error: undefined, detail: 'Tentou de novo e deu certo.' } : x))
    .filter((x) => (!filtro?.soErros || x.status === 'failed') && (!filtro?.passo || x.nodeId === filtro.passo) && (!b || x.contact.name.toLowerCase().includes(b) || x.title.toLowerCase().includes(b)))
}

function carregar(): Jornada[] {
  if (memoria) return memoria
  try {
    const bruto = localStorage.getItem(CHAVE)
    if (bruto) {
      const lido = JSON.parse(bruto) as { jornadas: Jornada[]; versoes?: Record<string, Record<number, VersaoDaJornada>>; comentarios?: Record<string, Comentario[]>; historico?: Record<string, AlteracaoDoRascunho[]> }
      if (Array.isArray(lido.jornadas) && lido.jornadas.length) {
        memoria = lido.jornadas
        guardadas = lido.versoes ?? {}
        if (lido.comentarios) comentariosGuardados = lido.comentarios
        if (lido.historico) historicoGuardado = lido.historico
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
    localStorage.setItem(CHAVE, JSON.stringify({ jornadas: memoria, versoes: guardadas, comentarios: comentariosGuardados, historico: historicoGuardado }))
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
  return {
    ...(r as ResumoDaJornada),
    // P2 (16/11): a porta, os canais, quem editou e a tarifa do mês em R$.
    doors: [...new Set(j.draft.entry.doors.map((d) => d.type))],
    channels: canaisDoDesenho(j.draft, CATALOGO_EXEMPLO),
    updatedBy: j.updatedBy ?? j.createdBy,
    metaCostThisMonthBrl: Math.round(j.messagesThisMonth * TARIFA_MEDIA_DA_META_BRL * 100) / 100,
  }
}

/** A saúde de uma jornada ligada (no exemplo: alertas, erros, modelo pausado, conector, entrega, sem uso). */
function saudeDe(j: Jornada): SaudeDaJornada {
  const issues: SaudeDaJornada['issues'] = []
  const agora = Date.now()
  const alertas = (j.alerts ?? []).filter((a) => !a.snoozedUntil || Date.parse(a.snoozedUntil) < agora)
  for (const a of alertas) issues.push({ level: a.kind === 'circuit_open' ? 'grave' : 'atencao', text: a.message, target: 'alertas' })
  const nos = Object.values(j.draft.graph.nodes)
  for (const n of nos) {
    const t = n.params.templateId ? APOIO_EXEMPLO.templates.find((x) => x.id === n.params.templateId) : null
    if (t && t.status !== 'APPROVED') issues.push({ level: 'grave', text: `O modelo "${t.name.replace(/_/g, ' ')}" não está aprovado pela Meta: o passo não envia.`, target: 'desenho' })
  }
  if (j.errors24h > 0) issues.push({ level: 'atencao', text: `${j.errors24h} erro${j.errors24h > 1 ? 's' : ''} nas últimas 24 h.`, target: 'erros' })
  const parada = j.lastActivityAt ? Math.floor((agora - Date.parse(j.lastActivityAt)) / 86_400_000) : null
  if (j.status !== 'paused' && parada !== null && parada > 7) issues.push({ level: 'atencao', text: `Ninguém entra há ${parada} dias. A porta ainda faz sentido?`, target: 'config' })
  const envia = j.messagesThisMonth > 0
  const entrega = envia ? (j.id === 'j_confirmacao' ? 98 : 96) : null
  if (entrega !== null && entrega < 90) issues.push({ level: 'atencao', text: `Só ${entrega}% das mensagens chegaram nos últimos 7 dias.`, target: 'pessoas' })
  const ordem = { grave: 0, atencao: 1 }
  issues.sort((a, b) => ordem[a.level] - ordem[b.level])
  return {
    journeyId: j.id, name: j.name, status: j.status,
    level: issues.some((x) => x.level === 'grave') ? 'grave' : issues.length ? 'atencao' : 'ok',
    issues, deliveryRate7d: entrega, errors24h: j.errors24h,
    stuck: alertas.filter((a) => a.kind === 'stuck_enrollments').length ? 2 : 0,
    lastSendAt: envia ? j.lastActivityAt : null,
  }
}

/** O mapa de conexões (no exemplo, calculado dos desenhos de todas as jornadas). */
function conexoesDe(js: Jornada[]): ConexoesDasJornadas {
  const porEvento = new Map<string, ConexoesDasJornadas['byEvent'][number]>()
  // O nome do evento: o do catálogo; sem ele, o da meta ou da saída ("Pediu para não receber").
  const usar = (event: string, reserva: string | undefined, j: Jornada, role: 'entra' | 'meta' | 'sai') => {
    if (!event) return
    const nome = event.startsWith('lista:') ? 'A agenda do sistema (lista do dia)' : CATALOGO_EXEMPLO.events.find((e) => e.key === event)?.label ?? reserva ?? event
    const g = porEvento.get(event) ?? { event, label: nome, uses: [] }
    if (!g.uses.some((u) => u.journeyId === j.id && u.role === role)) g.uses.push({ journeyId: j.id, name: j.name, status: j.status, role, skipsIfInOther: role === 'entra' ? !!j.draft.entry.skipIfHeldByOtherJourney : undefined })
    porEvento.set(event, g)
  }
  // A ordem do motor: a publicada há mais tempo é avaliada primeiro.
  const antigas = [...js].sort((a, b) => (b.publishedVersion ?? 0) - (a.publishedVersion ?? 0) || a.updatedAt.localeCompare(b.updatedAt))
  for (const j of antigas) {
    for (const d of j.draft.entry.doors) {
      if (d.type === 'event') usar(String(d.params.event ?? ''), undefined, j, 'entra')
      if (d.type === 'schedule_list') usar(`lista:${String(d.params.operation ?? '')}`, undefined, j, 'entra')
    }
    for (const g of j.draft.goals.goals) usar(g.event, g.label, j, 'meta')
    for (const x of j.draft.goals.exitIf) usar(x.event, x.label, j, 'sai')
  }
  const byEvent = [...porEvento.values()]
    .filter((g) => new Set(g.uses.map((u) => u.journeyId)).size > 1)
    .map((g) => {
      let n = 0
      const papel = { entra: 0, meta: 1, sai: 2 }
      return { ...g, uses: [...g.uses].sort((a, b) => papel[a.role] - papel[b.role]).map((u) => (u.role === 'entra' ? { ...u, order: ++n } : u)) }
    })
    // Primeiro os que fazem alguém entrar; as saídas que todas têm em comum, por último.
    .sort((a, b) => Number(b.uses.some((u) => u.role === 'entra')) - Number(a.uses.some((u) => u.role === 'entra')) || b.uses.length - a.uses.length)
  const porLinha = new Map<string, ConexoesDasJornadas['byLine'][number]>()
  for (const j of js) {
    const linhas = new Set<string>([j.whatsappNumberId ?? '', ...Object.values(j.draft.graph.nodes).map((n) => String(n.params.whatsappNumberId ?? ''))].filter(Boolean))
    for (const l of linhas) {
      const g = porLinha.get(l) ?? { whatsappNumberId: l, name: APOIO_EXEMPLO.whatsappNumbers.find((w) => w.id === l)?.name ?? l, totalMessagesThisMonth: 0, journeys: [] }
      g.journeys.push({ journeyId: j.id, name: j.name, status: j.status, messagesThisMonth: j.messagesThisMonth })
      g.totalMessagesThisMonth += j.messagesThisMonth
      porLinha.set(l, g)
    }
  }
  const byLine = [...porLinha.values()].map((g) => ({ ...g, journeys: g.journeys.sort((a, b) => b.messagesThisMonth - a.messagesThisMonth) })).sort((a, b) => b.journeys.length - a.journeys.length)
  return { byEvent, byLine }
}

/**
 * As versões antigas do exemplo nascem do rascunho: cada uma tem um passo a
 * menos (tirado do caminho sem quebrar as ligações) e a publicada difere do
 * rascunho quando ele tem mudanças. Assim o diff e o "ver no desenho" mostram
 * diferenças de verdade.
 */
function semUmPasso(v: VersaoDaJornada, preferido: string): VersaoDaJornada {
  const candidatos = Object.entries(v.graph.nodes).filter(([, n]) => {
    const k = Object.keys(n.outputs)
    return k.length === 1 && k[0] === 'next' && n.type !== 'exit' && n.type !== 'goal'
  })
  const alvo = candidatos.find(([, n]) => n.type === preferido) ?? candidatos[candidatos.length - 1]
  const nova = copia(v)
  if (!alvo) return nova
  const [id, no] = alvo
  const seguinte = no.outputs.next ?? null
  delete nova.graph.nodes[id]
  delete nova.graph.layout[id]
  if (nova.graph.start === id) nova.graph.start = seguinte
  for (const n of Object.values(nova.graph.nodes)) for (const [k, d] of Object.entries(n.outputs)) if (d === id) n.outputs[k] = seguinte
  return nova
}

function comTextoAntigo(v: VersaoDaJornada): VersaoDaJornada {
  const nova = copia(v)
  const texto = Object.values(nova.graph.nodes).find((n) => n.type === 'send_text' && typeof n.params.text === 'string')
  if (texto) texto.params.text = 'Pronto! Seu horário está confirmado. Até lá.'
  return nova
}

const AUTORES = ['Gabi (gestora)', 'Rui (supervisor)']

/** O texto principal de um passo (para o antes e o depois do histórico). */
function textoDoPasso(v: VersaoDaJornada, nodeId: string): string | undefined {
  const p = v.graph.nodes[nodeId]?.params
  if (!p) return undefined
  const t = p.text ?? p.message ?? p.question ?? p.note ?? p.objective
  return typeof t === 'string' ? t : undefined
}

function registrarNoHistorico(j: Jornada, antes: VersaoDaJornada, depois: VersaoDaJornada) {
  const d = diferencasDoDesenho(antes, depois, CATALOGO_EXEMPLO)
  const lista = historicoGuardado[j.id] ?? []
  const agora = new Date().toISOString()
  const juntar = (nodeId: string | null, tipo: AlteracaoDoRascunho['tipo']) => {
    const ultimo = lista[lista.length - 1]
    return ultimo && ultimo.author === 'Você' && ultimo.nodeId === nodeId && ultimo.tipo === tipo && Date.now() - Date.parse(ultimo.at) < 10 * 60_000 ? ultimo : null
  }
  for (const m of d.passos) {
    const frase = frasesDasDiferencas({ passos: [m], outras: [], total: 1 })[0]
    const ja = juntar(m.nodeId, m.tipo)
    const antesTxt = m.tipo === 'mudou' ? textoDoPasso(antes, m.nodeId) : undefined
    const depoisTxt = m.tipo === 'mudou' ? textoDoPasso(depois, m.nodeId) : undefined
    if (ja) { ja.at = agora; ja.titulo = frase; if (depoisTxt !== undefined) ja.depois = depoisTxt; continue }
    lista.push({ id: `h_${Math.random().toString(36).slice(2, 9)}`, at: agora, author: 'Você', tipo: m.tipo, nodeId: m.nodeId, titulo: frase, antes: antesTxt !== depoisTxt ? antesTxt : undefined, depois: antesTxt !== depoisTxt ? depoisTxt : undefined })
  }
  for (const o of d.outras) {
    const ja = juntar(null, 'outra')
    if (ja && ja.titulo === o) { ja.at = agora; continue }
    lista.push({ id: `h_${Math.random().toString(36).slice(2, 9)}`, at: agora, author: 'Você', tipo: 'outra', nodeId: null, titulo: o })
  }
  historicoGuardado[j.id] = lista.slice(-200)
}

function versoesGuardadasDe(j: Jornada): Record<number, VersaoDaJornada> {
  if (!j.publishedVersion) return {}
  if (!guardadas[j.id]) {
    const g: Record<number, VersaoDaJornada> = {}
    let atual = j.hasDraftChanges ? comTextoAntigo(semUmPasso(j.draft, 'connector_call')) : copia(j.draft)
    for (let v = j.publishedVersion; v >= 1; v--) {
      g[v] = {
        ...atual, version: v, status: v === j.publishedVersion ? 'published' : 'retired',
        publishedAt: new Date(Date.now() - (j.publishedVersion - v + 1) * 9 * 86_400_000).toISOString(),
        publishedBy: AUTORES[v % 2],
      }
      atual = semUmPasso(atual, 'notify_team')
    }
    guardadas[j.id] = g
  }
  return guardadas[j.id]
}

function versoesDe(j: Jornada): VersaoPublicada[] {
  const g = versoesGuardadasDe(j)
  const n = j.publishedVersion ?? 0
  const lista: VersaoPublicada[] = []
  for (let v = n; v >= 1; v--) {
    const desenho = g[v]
    if (!desenho) continue
    const mudancas = g[v - 1] ? frasesDasDiferencas(diferencasDoDesenho(g[v - 1], desenho, CATALOGO_EXEMPLO)) : []
    lista.push({
      version: v,
      status: v === n ? 'published' : 'retired',
      publishedAt: desenho.publishedAt ?? new Date().toISOString(),
      publishedBy: desenho.publishedBy ?? AUTORES[0],
      changes: v === 1 ? ['Primeira publicação.'] : mudancas.length ? mudancas : ['Mesmo desenho, publicado de novo.'],
      note: desenho.note,
      enrolledNow: j.enrolledByVersion.find((x) => x.version === v)?.count ?? 0,
    })
  }
  return lista
}

function contarMudancas(j: Jornada): string[] {
  const n = Object.keys(j.draft.graph.nodes).length
  if (!j.publishedVersion) return [`Primeira publicação: ${n} passos.`]
  const noAr = versoesGuardadasDe(j)[j.publishedVersion]
  const frases = noAr ? frasesDasDiferencas(diferencasDoDesenho(noAr, j.draft, CATALOGO_EXEMPLO)) : []
  return frases.length ? frases : ['Nenhuma mudança no desenho; só o modo muda.']
}

/** Porta de segmento ou evento: quem já se encaixa hoje pode entrar ao publicar. */
function backfillDe(j: Jornada): PreviaDaPublicacao['backfill'] {
  const porta = j.draft.entry.doors.find((d) => d.type === 'segment' || d.type === 'event')
  if (!porta) return null
  if (porta.type === 'segment') {
    const seg = APOIO_EXEMPLO.segments.find((x) => x.id === porta.params.segmentId)
    const n = seg?.size ?? 230
    return { eligible: n, description: `As ${n} pessoas que já estão em “${seg?.name ?? String(porta.params.segmentName ?? 'o segmento')}” hoje e passam no filtro.` }
  }
  const ev = CATALOGO_EXEMPLO.events.find((e) => e.key === porta.params.event)
  return { eligible: 38, description: `Quem teve “${ev?.label ?? 'o evento'}” nos últimos 7 dias e ainda passa no filtro.` }
}

const NOMES_DA_AMOSTRA = ['Ana P.', 'Bruno L.', 'Carla M.', 'Diego F.', 'Elisa R.', 'Fábio T.', 'Gisele A.', 'Hugo N.', 'Isabela N.', 'João V.', 'Karina B.', 'Lucas D.']
/** Uma amostra mascarada (nome curto e telefone com ••••), sempre a mesma para o mesmo motivo. */
function amostra(semente: number, n: number, detalhe: (i: number) => string | undefined): ContatoMascarado[] {
  return Array.from({ length: Math.min(n, 10) }, (_, i) => {
    const k = (semente * 7 + i * 5) % NOMES_DA_AMOSTRA.length
    return { name: NOMES_DA_AMOSTRA[k], phoneMasked: `+55 24 •••• ${String(1000 + ((semente * 977 + i * 389) % 9000)).padStart(4, '0')}`, detail: detalhe(i) }
  })
}

const TIPOS_QUE_MANDAM = new Set(['send_template', 'send_text', 'send_and_wait', 'ask_question'])
const TIPOS_DE_AVISO_INTERNO = new Set(['notify_team'])
/** Quanto de quem chega num passo que ramifica segue por cada saída (no exemplo; o motor usa os últimos 30 dias). */
const PESO_DA_SAIDA: Record<string, number> = { sem_resposta: 0.3, outra_resposta: 0.08, senao: 0.35, incerto: 0.1, falhou: 0.03, nao_chegou: 0.04, invalida: 0.08, prazo: 0.15, nao_concluiu: 0.2, leu: 0.25, entregue: 0.15 }

/** A conta das mensagens: quantos % de quem entra chegam a cada passo que manda mensagem, e por qual ramo. */
function contaDasMensagens(draft: VersaoDaJornada, entram: number): NonNullable<ResultadoDaSimulacao['math']> {
  const alcance = new Map<string, { pct: number; vias: Set<string> }>()
  const ordem: string[] = []
  const visitar = (id: string | null | undefined, pct: number, via: string, prof: number) => {
    if (!id || prof > 30 || pct < 0.002) return
    const no = draft.graph.nodes[id]
    if (!no) return
    let a = alcance.get(id)
    if (!a) { a = { pct: 0, vias: new Set() }; alcance.set(id, a); ordem.push(id) }
    a.pct += pct
    a.vias.add(via)
    const saidas = saidasDoNo(no, CATALOGO_EXEMPLO).filter((x) => no.outputs[x.key])
    if (saidas.length <= 1) { visitar(saidas[0] ? no.outputs[saidas[0].key] : null, pct, via, prof + 1); return }
    // As saídas sem peso conhecido dividem o resto; a primeira (o caminho principal) leva 3 partes.
    const resto = Math.max(0, 1 - saidas.filter((x) => x.key in PESO_DA_SAIDA).reduce((t, x) => t + PESO_DA_SAIDA[x.key], 0))
    const livres = saidas.filter((x) => !(x.key in PESO_DA_SAIDA))
    const partes = livres.length ? livres.length + 2 : 1
    for (const x of saidas) {
      const peso = x.key in PESO_DA_SAIDA ? PESO_DA_SAIDA[x.key] : (resto * (x === livres[0] ? 3 : 1)) / partes
      visitar(no.outputs[x.key], pct * peso, `“${x.label}” em “${nomeDoNo(no, CATALOGO_EXEMPLO)}”`, prof + 1)
    }
  }
  visitar(draft.graph.start, 1, '', 0)
  return ordem.filter((id) => TIPOS_QUE_MANDAM.has(draft.graph.nodes[id].type) || TIPOS_DE_AVISO_INTERNO.has(draft.graph.nodes[id].type)).map((id) => {
    const no = draft.graph.nodes[id]
    const a = alcance.get(id)!
    const pct = Math.min(1, a.pct)
    const vias = [...a.vias]
    // Aviso à equipe juntado numa lista do dia: uma mensagem só, com todos.
    const lista = TIPOS_DE_AVISO_INTERNO.has(no.type) && no.params.groupDaily !== false
    const pessoas = Math.round(entram * pct)
    return {
      nodeId: id, title: nomeDoNo(no, CATALOGO_EXEMPLO), reachPct: Math.round(pct * 100), messages: lista ? Math.min(1, pessoas) : pessoas, groupedPeople: lista ? pessoas : undefined,
      via: vias.length > 1 ? 'mais de um caminho' : vias[0] || undefined,
      internal: TIPOS_DE_AVISO_INTERNO.has(no.type) || undefined,
    }
  })
}

/** Domingo a sábado: o movimento de cada dia em relação a um dia comum (só no exemplo). */
const FATOR_DO_DIA = [0.2, 1.1, 1, 1.05, 0.95, 0.9, 0.4]

// ── "Criar com IA" no exemplo (o motor usa o Copiloto v2) ────────────────────
/** As palavras que escolhem o caminho-base da proposta. */
const PISTAS_DA_IA: [RegExp, string][] = [
  [/confirm|lembr|falta|véspera/i, 'r_faltas'],
  [/cancel|remarc/i, 'r_cancelados'],
  [/pesquisa|avalia|satisf/i, 'r_pesquisa'],
  [/lead|portal|anúncio/i, 'r_lead_portal'],
  [/orçamento|proposta/i, 'r_orcamento'],
  [/document|pendên/i, 'r_docs_caso'],
  [/sumiu|reativ|inativ/i, 'r_reativar'],
  [/pós-venda|compra|entrega/i, 'r_pos_venda'],
  [/transfer|ninguém assumiu/i, 'r_avisar'],
  [/site|boas-vindas|chega|primeira mensagem/i, 'r_boas_vindas'],
]
const PORTA_EM_FRASE: Record<string, string> = {
  schedule_list: 'a agenda do sistema, todo dia', event: 'quando algo acontece', segment: 'um segmento, de tempos em tempos', webhook: 'um aviso de outro sistema', manual: 'inscrição manual ou pela API',
}
const nomeDoPedido = (t: string) => {
  const frase = t.trim().split(/[.;\n]/)[0].trim()
  const curto = frase.length > 56 ? `${frase.slice(0, 54).replace(/\s+\S*$/, '')}…` : frase
  return curto.charAt(0).toUpperCase() + curto.slice(1)
}

function propostaNova(descricao: string): PropostaDaIa {
  const pista = PISTAS_DA_IA.find(([re]) => re.test(descricao))
  const r = RECEITAS_EXEMPLO.find((x) => x.id === (pista?.[1] ?? 'r_boas_vindas'))!
  // A palavra inteira que a pessoa usou ("confirmar", não "confirm").
  const palavra = pista ? (descricao.split(/[\s,.;:!?()]+/).find((w) => pista[0].test(w)) ?? null) : null
  const version: VersaoDaJornada = { ...copia(r.version), version: 1, status: 'draft', publishedAt: null, publishedBy: null }
  const porta = version.entry.doors[0]?.type ?? 'manual'
  return {
    name: nomeDoPedido(descricao) || r.name,
    description: descricao.trim(),
    version,
    explanation: [
      palavra ? `Você falou em “${palavra.toLowerCase()}”: comecei pelo caminho de “${r.name}”, que já resolve isso.` : `Comecei por um caminho simples, o de “${r.name}”.`,
      `As pessoas entram por ${PORTA_EM_FRASE[porta] ?? porta}.`,
      `${Object.keys(version.graph.nodes).length} passos, com a meta e as saídas automáticas prontas (pediu para não receber, humano assumiu).`,
    ],
    checks: ['Escolha a linha de WhatsApp e o modelo aprovado de cada envio.', 'Teste com um contato antes de publicar.'],
  }
}

function propostaDeMudanca(descricao: string, j: Jornada, draft: VersaoDaJornada): PropostaDaIa {
  const v = copia(draft)
  const nos = v.graph.nodes
  const novo = (p: string) => `${p}_ia_${Math.random().toString(36).slice(2, 6)}`
  const nome = (id: string) => nomeDoNo(nos[id], CATALOGO_EXEMPLO)
  const explanation: string[] = []
  const embaixo = (de: string, id: string, k: number) => { const p = v.graph.layout[de] ?? { x: 0, y: 0 }; v.graph.layout[id] = { x: p.x, y: p.y + 150 * k } }
  const semResposta = Object.keys(nos).find((id) => nos[id].outputs.sem_resposta)
  const jaAvisa = semResposta ? nos[nos[semResposta].outputs.sem_resposta ?? '']?.type === 'notify_team' : false
  if (/avis|equipe|recep|gest|supervis/i.test(descricao) && semResposta && jaAvisa) {
    // Já existe: não duplica, e diz onde está.
    explanation.push(`O ramo “Sem resposta” de “${nome(semResposta)}” já avisa a equipe em “${nome(nos[semResposta].outputs.sem_resposta!)}”. Não mudei nada.`)
  } else if (/avis|equipe|recep|gest|supervis/i.test(descricao) && semResposta) {
    // Quem não respondeu: a equipe fica sabendo antes do que já acontecia ali.
    const id = novo('n_aviso')
    nos[id] = { type: 'notify_team', label: 'Avisar a equipe', params: { departmentId: APOIO_EXEMPLO.departments[0]?.id ?? '', action: 'call', message: '{{contato.nome}} não respondeu. Vale um contato da equipe.', include: ['subject', 'last_reply'], groupDaily: true }, outputs: { next: nos[semResposta].outputs.sem_resposta ?? null } }
    nos[semResposta].outputs.sem_resposta = id
    embaixo(semResposta, id, 1)
    explanation.push(`Pus “Avisar a equipe” no ramo “Sem resposta” de “${nome(semResposta)}”, antes do que já acontecia ali.`, 'O aviso junta o dia numa lista só, para a equipe não receber um por pessoa.')
  } else {
    // Um lembrete a mais: espera e manda um texto curto depois do primeiro envio.
    const origem = Object.keys(nos).find((id) => ['send_template', 'send_text'].includes(nos[id].type) && 'next' in nos[id].outputs) ?? v.graph.start
    if (origem && nos[origem]) {
      const espera = novo('n_espera')
      const texto = novo('n_lembrete')
      nos[espera] = { type: 'wait', label: 'Esperar 2 h', params: { mode: 'duration', duration: { amount: 2, unit: 'hours' } }, outputs: { next: texto } }
      nos[texto] = { type: 'send_text', label: 'Lembrete curto', params: { text: 'Oi, {{contato.nome}}! Passando para lembrar da mensagem acima. Qualquer dúvida, é só responder.' }, outputs: { next: nos[origem].outputs.next ?? null } }
      nos[origem].outputs.next = espera
      embaixo(origem, espera, 1)
      embaixo(origem, texto, 2)
      explanation.push(`Depois de “${nome(origem)}”, esperar 2 horas e mandar um lembrete curto.`, 'É texto livre: só vai se a conversa estiver dentro da janela de 24 h. Fora dela, troque por um modelo aprovado.')
    }
  }
  return { name: j.name, description: j.description, version: v, explanation, checks: ['Vai para o rascunho: o que está no ar não muda até você publicar.', 'Dá para desfazer com Ctrl+Z.'] }
}

/** Quem está por trás de um número de Resultados (no exemplo: as pessoas de exemplo, com o total dos Resultados). */
function recorteDe(j: Jornada, recorte: RecorteDosResultados, dias: number, tudo = false): PaginaDoRecorte {
  const r = resultadosDeExemplo(j, dias)
  const { pessoas, inscricoes } = inscricoesDeExemplo(j)
  const daInscricao = (k: number, detalhe?: string): PessoaDoRecorte => {
    const i = inscricoes[k]
    return { contact: { name: i.contact.name, phoneMasked: i.contact.phoneMasked }, subjectLabel: i.subjectLabel, at: i.finishedAt ?? i.enteredAt, detail: detalhe, enrollmentId: i.id, nodeIds: pessoas[k].caminho }
  }
  const quais = (ok: (k: number) => boolean) => pessoas.map((_, k) => k).filter((k) => !removidas.has(inscricoes[k].id) && ok(k))
  let total = 0
  let itens: PessoaDoRecorte[] = []
  switch (recorte.tipo) {
    case 'passo':
      total = r.byNode.find((b) => b.nodeId === recorte.nodeId)?.reached ?? 0
      itens = quais((k) => pessoas[k].caminho.includes(recorte.nodeId)).map((k) => daInscricao(k, inscricoes[k].currentNodeId === recorte.nodeId ? 'Está aqui agora' : undefined))
      break
    case 'ramo': {
      const b = r.byBranch.find((x) => x.nodeId === recorte.nodeId && x.output === recorte.output)
      total = b?.count ?? 0
      itens = quais((k) => pessoas[k].escolhas?.[recorte.nodeId] === recorte.output).map((k) => daInscricao(k, b?.label))
      break
    }
    case 'saida':
      total = r.exitReasons.find((x) => x.reason === recorte.reason)?.count ?? 0
      itens = quais((k) => inscricoes[k].status === 'exited').map((k) => daInscricao(k, recorte.reason))
      break
    case 'meta':
      total = r.completedGoal
      itens = quais((k) => inscricoes[k].status === 'completed').map((k) => daInscricao(k, 'Bateu a meta'))
      break
    case 'pulo': {
      // Quem não entrou não tem inscrição: só o contato mascarado e quando foi.
      total = r.skipped?.find((x) => x.code === recorte.code)?.count ?? 0
      const semente = recorte.code.length
      itens = Array.from({ length: Math.min(total, 60) }, (_, i) => {
        const k = (semente * 7 + i * 5) % NOMES_DA_AMOSTRA.length
        return { contact: { name: NOMES_DA_AMOSTRA[k], phoneMasked: `+55 24 •••• ${String(1000 + ((semente * 977 + i * 389) % 9000)).padStart(4, '0')}` }, at: new Date(Date.now() - (i + 1) * 3_100_000).toISOString(), detail: MOTIVOS_DE_PULO[recorte.code].rotulo }
      })
      break
    }
  }
  itens.sort((a, b) => b.at.localeCompare(a.at))
  return { itens: tudo ? itens : itens.slice(0, 50), total: Math.max(total, Math.min(itens.length, 50)) }
}

function simularDe(j: Jornada, draft: VersaoDaJornada, dias: 1 | 7 = 1): ResultadoDaSimulacao {
  const porta = draft.entry.doors[0]?.type
  const entram = porta === 'schedule_list' ? 87 : porta === 'event' ? 14 : porta === 'segment' ? 230 : porta === 'webhook' ? 9 : 0
  const ia = Object.values(draft.graph.nodes).reduce((s, n) => s + (CATALOGO_EXEMPLO.steps.find((p) => p.type === n.type)?.cost.credits ?? 0), 0)
  const math = contaDasMensagens(draft, entram)
  const mensagens = math.filter((m) => !m.internal).reduce((t, m) => t + m.messages, 0)
  const porPessoa = entram ? mensagens / entram : 0
  const byDay = dias === 7 ? Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setHours(12, 0, 0, 0)
    d.setDate(d.getDate() + i)
    const n = i === 0 ? entram : porta === 'segment' ? [8, 6, 9, 7, 5, 4][i - 1] : Math.round(entram * FATOR_DO_DIA[d.getDay()])
    return { date: d.toISOString().slice(0, 10), wouldEnter: n, messages: Math.round(n * porPessoa) }
  }) : undefined
  const somaDe = (k: 'wouldEnter' | 'messages') => (byDay ?? []).reduce((t, d) => t + d[k], 0)
  const temLembrete = Object.values(draft.graph.nodes).some((n) => n.type === 'send_template' || n.type === 'send_and_wait')
  const linha = (draft.graph.nodes[Object.keys(draft.graph.nodes).find((k) => draft.graph.nodes[k].type === 'send_template') ?? '']?.params.whatsappNumberId as string) ?? j.whatsappNumberId ?? 'l_alto'
  const fora = porta === 'schedule_list' ? [{ reason: 'Agendamento já confirmado no sistema', count: 6 }, { reason: 'Telefone inválido', count: 3 }] : porta === 'event' ? [{ reason: 'Já tem consulta marcada nos próximos 30 dias', count: 5 }] : []
  const horas = ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '14:00', '14:30', '15:00']
  return {
    wouldEnterToday: entram,
    enteringSample: amostra(1, entram, (i) => (porta === 'schedule_list' ? `agendamento amanhã às ${horas[i % horas.length]}` : undefined)),
    filteredOut: fora.map((x, k) => ({ ...x, sample: amostra(k + 3, x.count, (i) => (x.reason.startsWith('Telefone') ? 'número com 8 dígitos' : porta === 'schedule_list' ? `agendamento amanhã às ${horas[(i + 3) % horas.length]}` : undefined)) })),
    messagesPerDay: mensagens,
    creditsPerDay: Math.round(entram * ia * 10) / 10,
    metaCostPerDayBrl: Math.round(mensagens * TARIFA_MEDIA_DA_META_BRL * 100) / 100,
    byLine: [{ whatsappNumberId: linha, messages: mensagens }],
    days: dias,
    byDay,
    totals: byDay ? { wouldEnter: somaDe('wouldEnter'), messages: somaDe('messages'), credits: Math.round(somaDe('wouldEnter') * ia * 10) / 10, metaCostBrl: Math.round(somaDe('messages') * TARIFA_MEDIA_DA_META_BRL * 100) / 100 } : undefined,
    math,
    // A automação de hoje (no exemplo, o lembrete): manda também para quem já confirmou.
    current: porta === 'schedule_list' && temLembrete && entram
      ? { name: 'O lembrete automático que já roda hoje', wouldEnterToday: entram + 6, messagesPerDay: Math.round((entram + 6) * porPessoa), note: 'Ele não pula quem já confirmou no sistema (6 pessoas hoje); esta jornada pula.' }
      : null,
  }
}

export const jornadasApiDeExemplo: JornadasApi = {
  async listar(opcoes) {
    await espera()
    const noventa = Date.now() - 90 * 86_400_000
    return carregar()
      .filter((j) => j.status !== 'archived' && (opcoes?.apagadas ? !!j.deletedAt && Date.parse(j.deletedAt) > noventa : !j.deletedAt))
      .map(resumo)
  },
  async duplicar(id) {
    await espera()
    const o = achar(id)
    const nova: Jornada = {
      ...copia(o), id: `j_${Math.random().toString(36).slice(2, 9)}`, name: `Cópia de ${o.name}`, status: 'draft', publishedVersion: null, hasDraftChanges: true,
      enrolledNow: 0, goalRate30d: null, lastActivityAt: null, errors24h: 0, creditsThisMonth: 0, messagesThisMonth: 0, alerts: [], pauseMode: null,
      createdBy: 'Você', updatedAt: new Date().toISOString(), enrolledByVersion: [], deletedAt: null,
      draft: { ...copia(o.draft), version: 1, status: 'draft', publishedAt: null, publishedBy: null },
    }
    carregar().unshift(nova)
    gravar()
    return copia(nova)
  },
  async apagar(ids) {
    await espera()
    const blocked: { id: string; reason: string }[] = []
    let deleted = 0
    for (const id of ids) {
      const j = achar(id)
      if (j.status === 'active' || j.status === 'shadow') { blocked.push({ id, reason: `"${j.name}" está rodando. Pause antes de apagar.` }); continue }
      j.deletedAt = new Date().toISOString()
      deleted++
    }
    gravar()
    return { deleted, blocked }
  },
  async restaurar(id) {
    await espera()
    const j = achar(id)
    j.deletedAt = null
    gravar()
    return copia(j)
  },
  async etiquetar(ids, mudanca) {
    await espera(150)
    for (const id of ids) {
      const j = achar(id)
      const atuais = new Set(j.labels ?? [])
      for (const l of mudanca.add ?? []) if (l.trim()) atuais.add(l.trim())
      for (const l of mudanca.remove ?? []) atuais.delete(l)
      j.labels = [...atuais].sort((x, y) => x.localeCompare(y, 'pt-BR'))
    }
    gravar()
  },
  async tratarAlerta(id, kind, acao) {
    await espera(150)
    const j = achar(id)
    j.alerts = (j.alerts ?? []).flatMap((a) => {
      if (a.kind !== kind) return [a]
      if (acao === 'snooze_24h') return [{ ...a, snoozedUntil: new Date(Date.now() + 86_400_000).toISOString() }]
      return []
    })
    gravar()
    return copia(j)
  },
  async configurarAlertas(id, cfg) {
    await espera(150)
    const j = achar(id)
    j.alertRecipients = cfg
    gravar()
    return copia(j)
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
  async criar({ name, recipeId, door }) {
    await espera()
    const receita = RECEITAS_EXEMPLO.find((r) => r.id === recipeId)
    const id = `j_${Math.random().toString(36).slice(2, 9)}`
    const vazia: VersaoDaJornada = {
      version: 1, status: 'draft', catalogVersion: CATALOGO_EXEMPLO.version, publishedAt: null, publishedBy: null,
      graph: { start: null, nodes: {}, layout: {} },
      entry: { doors: [{ id: `p_${door ?? 'manual'}`, type: door ?? 'manual', params: { ...PARAMS_PADRAO_DA_PORTA[door ?? 'manual'] } }], criteria: { mode: 'all', conditions: [] }, reentry: { mode: 'one_open' } },
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
  async proporComIa({ descricao, journeyId, draft }) {
    await espera(900)
    if (descricao.trim().length < 8) throw new Error('Descreva com um pouco mais de detalhe o que a jornada deve fazer.')
    return journeyId && draft ? propostaDeMudanca(descricao, achar(journeyId), draft) : propostaNova(descricao)
  },
  async criarDaProposta(proposta) {
    await espera()
    const nova: Jornada = {
      id: `j_${Math.random().toString(36).slice(2, 9)}`, name: proposta.name, description: proposta.description, status: 'draft', publishedVersion: null, hasDraftChanges: true,
      whatsappNumberId: null, enrolledNow: 0, goalRate30d: null, lastActivityAt: null, errors24h: 0, creditsThisMonth: 0, messagesThisMonth: 0,
      createdBy: 'Você', updatedAt: new Date().toISOString(), recipeId: null,
      draft: { ...copia(proposta.version), version: 1, status: 'draft', publishedAt: null, publishedBy: null },
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
    if (mudouDesenho) registrarNoHistorico(j, j.draft, draft)
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
  async simular(id, draft, opcoes) {
    await espera(400)
    return simularDe(achar(id), draft, opcoes?.dias ?? 1)
  },
  async publicar(id, mode, confirmationToken, opcoes) {
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
          backfill: backfillDe(j),
        },
      }
    }
    const t = tokens.get(confirmationToken)
    if (!t || t.id !== id || t.acao !== `publish:${mode}`) throw new Error('A confirmação não confere com a prévia. Peça a prévia de novo.')
    if (t.expira < Date.now()) throw new Error('A prévia venceu (10 min). Peça de novo.')
    tokens.delete(confirmationToken)
    // Agendada: guarda e publica na data (no exemplo, fica só o aviso).
    if (opcoes?.scheduleAt) {
      j.scheduledPublish = { at: opcoes.scheduleAt, mode }
      j.endsAt = opcoes.endsAt ?? j.endsAt ?? null
      j.pendingApproval = null
      gravar()
      return copia(j)
    }
    const nova = (j.publishedVersion ?? 0) + 1
    const g = versoesGuardadasDe(j)
    for (const v of Object.values(g)) v.status = 'retired'
    g[nova] = { ...copia(j.draft), version: nova, status: 'published', publishedAt: new Date().toISOString(), publishedBy: 'Você', note: opcoes?.note?.trim() || undefined }
    guardadas[j.id] = g
    // Quem já estava dentro: termina na antiga (padrão), passa para a nova ou sai.
    if (opcoes?.inFlight === 'migrate' && j.publishedVersion) {
      const dentro = j.enrolledByVersion.reduce((t, v) => t + v.count, 0)
      j.enrolledByVersion = dentro ? [{ version: j.publishedVersion, count: dentro }] : []
    } else if (opcoes?.inFlight === 'exit') {
      j.enrolledNow = 0
      j.enrolledByVersion = []
    }
    j.pendingApproval = null
    j.scheduledPublish = null
    j.endsAt = opcoes?.endsAt ?? j.endsAt ?? null
    const extras = opcoes?.backfill ? backfillDe(j)?.eligible ?? 0 : 0
    if (j.publishedVersion && j.enrolledNow) j.enrolledByVersion = [{ version: nova, count: extras }, ...j.enrolledByVersion]
    j.enrolledNow += extras
    j.publishedVersion = nova
    j.status = mode
    j.pauseMode = null
    j.hasDraftChanges = false
    j.draft = { ...j.draft, version: nova + 1 }
    j.updatedAt = new Date().toISOString()
    gravar()
    return copia(j)
  },
  async pedirAprovacao(id, pedido) {
    await espera()
    const j = achar(id)
    j.pendingApproval = { requestedBy: 'Você', at: new Date().toISOString(), mode: pedido.mode, note: pedido.note?.trim() || undefined }
    gravar()
    return copia(j)
  },
  async recusarAprovacao(id) {
    await espera()
    const j = achar(id)
    j.pendingApproval = null
    gravar()
    return copia(j)
  },
  async cancelarAgendamento(id) {
    await espera()
    const j = achar(id)
    j.scheduledPublish = null
    gravar()
    return copia(j)
  },
  async restaurarComoRascunho(id, version) {
    await espera()
    const j = achar(id)
    const v = versoesGuardadasDe(j)[version]
    if (!v) throw new Error(`A v${version} não existe.`)
    const lista = historicoGuardado[j.id] ?? []
    lista.push({ id: `h_${Math.random().toString(36).slice(2, 9)}`, at: new Date().toISOString(), author: 'Você', tipo: 'outra', nodeId: null, titulo: `O rascunho voltou ao desenho da v${version}.` })
    historicoGuardado[j.id] = lista
    j.draft = { ...copia(v), version: (j.publishedVersion ?? 0) + 1, status: 'draft', publishedAt: null, publishedBy: null, note: undefined }
    j.hasDraftChanges = version !== j.publishedVersion
    gravar()
    return copia(j)
  },
  async historicoDoRascunho(id) {
    await espera(120)
    return copia([...(historicoGuardado[id] ?? [])].reverse())
  },
  async previaDaPausa(id) {
    await espera(120)
    const j = achar(id)
    return { enrolledNow: j.enrolledNow, waitingReply: Math.round(j.enrolledNow * 0.72), scheduledMessages24h: Math.round(j.enrolledNow * 0.4) }
  },
  async pausar(id, opcoes) {
    await espera()
    const j = achar(id)
    const modo = opcoes?.inFlight ?? 'continue'
    j.status = 'paused'
    j.pauseMode = modo
    if (modo === 'exit') { j.enrolledNow = 0; j.enrolledByVersion = [] }
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
          warnings: [
            j.pauseMode === 'hold' && j.enrolledNow ? `As ${j.enrolledNow} pessoas paradas seguem de onde pararam. Esperas que venceram na pausa são avaliadas de novo.`
              : j.pauseMode === 'exit' ? 'Quem saiu na pausa não volta.'
                : 'Quem teria entrado durante a pausa não é inscrito de volta.',
          ],
        },
      }
    }
    const t = tokens.get(confirmationToken)
    if (!t || t.id !== id || t.acao !== 'resume') throw new Error('A confirmação não confere com a prévia. Peça a prévia de novo.')
    tokens.delete(confirmationToken)
    j.status = 'active'
    j.pauseMode = null
    gravar()
    return copia(j)
  },
  async inscricoes(id, filtro) {
    await espera(150)
    const situacao = filtro?.situacao ?? 'dentro'
    const porPagina = filtro?.porPagina ?? 25
    const todas = inscricoesFiltradas(id, { ...filtro, situacao: 'todas' })
    const dentro = (i: Inscricao) => i.status === 'active' || i.status === 'waiting'
    const doFiltro = todas.filter((i) => situacao === 'todas' || (situacao === 'dentro' ? dentro(i) : !dentro(i)))
    const paginas = Math.max(1, Math.ceil(doFiltro.length / porPagina))
    const pagina = Math.min(Math.max(1, filtro?.pagina ?? 1), paginas)
    return {
      itens: doFiltro.slice((pagina - 1) * porPagina, pagina * porPagina),
      total: doFiltro.length,
      totais: { dentro: todas.filter(dentro).length, encerradas: todas.filter((i) => !dentro(i)).length },
      pagina,
      porPagina,
    }
  },
  async tirarVarias(_id, enrollmentIds) {
    await espera(250)
    for (const e of enrollmentIds) removidas.add(e)
    return { removed: enrollmentIds.length }
  },
  async exportarInscricoes(id, filtro) {
    await espera(200)
    const j = achar(id)
    const linhas = inscricoesFiltradas(id, filtro).map((i) => [i.contact.name, i.contact.phoneMasked, i.subjectLabel, i.currentNodeId ? (j.draft.graph.nodes[i.currentNodeId]?.label ?? i.currentNodeId) : 'saiu', `v${i.version}`, i.status, i.enteredAt, i.finishedAt ?? '', i.exitReason ?? ''])
    return csv([['Pessoa', 'Telefone', 'Assunto', 'Onde está', 'Versão', 'Situação', 'Entrou', 'Saiu', 'Motivo'], ...linhas])
  },
  async registro(id, filtro) {
    await espera(180)
    const porPagina = filtro?.porPagina ?? 25
    const lista = registroFiltrado(id, filtro)
    const paginas = Math.max(1, Math.ceil(lista.length / porPagina))
    const pagina = Math.min(Math.max(1, filtro?.pagina ?? 1), paginas)
    return { itens: lista.slice((pagina - 1) * porPagina, pagina * porPagina), total: lista.length, erros: lista.filter((x) => x.status === 'failed').length, pagina, porPagina }
  },
  async tentarDeNovo(id, actionId) {
    await espera(600)
    const item = registroDeExemplo(achar(id)).find((x) => x.id === actionId)
    if (!item) throw new Error('Essa ação não existe mais.')
    if (!item.error?.retryable) throw new Error('Esse erro não se resolve tentando de novo. Veja o motivo.')
    resolvidas.add(actionId)
    return { ...item, status: 'ok', detail: 'Tentou de novo e deu certo. A pessoa seguiu o caminho.', error: undefined, at: new Date().toISOString() }
  },
  async exportarRegistro(id, filtro) {
    await espera(200)
    const linhas = registroFiltrado(id, filtro).map((x) => [x.at, x.contact.name, x.contact.phoneMasked, x.title, x.status, x.detail, x.error?.code ?? '', x.error?.message ?? ''])
    return csv([['Quando', 'Pessoa', 'Telefone', 'Passo', 'Situação', 'O que aconteceu', 'Código do erro', 'Erro'], ...linhas])
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
  async resultados(id, filtro) {
    await espera(180)
    return resultadosDeExemplo(achar(id), filtro?.dias ?? 30)
  },
  async pessoasDoRecorte(id, recorte, filtro) {
    await espera(200)
    return recorteDe(achar(id), recorte, filtro?.dias ?? 30)
  },
  async exportarRecorte(id, recorte, filtro) {
    await espera(200)
    const r = recorteDe(achar(id), recorte, filtro?.dias ?? 30, true)
    return csv([['Pessoa', 'Telefone', 'Assunto', 'Quando', 'Detalhe'], ...r.itens.map((p) => [p.contact.name, p.contact.phoneMasked, p.subjectLabel ?? '', p.at, p.detail ?? ''])])
  },
  async saude() {
    await espera(160)
    return carregar().filter((j) => !j.deletedAt && j.status !== 'archived' && j.status !== 'draft').map(saudeDe)
  },
  async conexoes() {
    await espera(160)
    return conexoesDe(carregar().filter((j) => !j.deletedAt && j.status !== 'archived'))
  },
  async limites() {
    await espera(60)
    const ativas = carregar().filter((j) => j.status === 'active' || j.status === 'shadow').length
    if (testesDeIa.dia !== new Date().toDateString()) testesDeIa = { dia: new Date().toDateString(), feitos: 0 }
    return { activeJourneys: { used: ativas, max: 10 }, maxStepsPerJourney: 60, maxTtlDays: 90, aiCreditsThisMonth: { used: 0, max: 500 }, aiStepTestsPerDay: { used: testesDeIa.feitos, max: LIMITE_DE_TESTES_DE_IA_POR_DIA } }
  },
  async versoes(id) {
    await espera(120)
    return versoesDe(achar(id))
  },
  async versao(id, version) {
    await espera(120)
    const v = versoesGuardadasDe(achar(id))[version]
    if (!v) throw new Error(`A v${version} não existe.`)
    return copia(v)
  },
  async voltarParaVersao(id, version, confirmationToken) {
    await espera(200)
    const j = achar(id)
    if (!j.publishedVersion || version >= j.publishedVersion) throw new Error('Escolha uma versão anterior à que está no ar.')
    if (!confirmationToken) {
      const token = `conf_${Math.random().toString(36).slice(2)}`
      tokens.set(token, { id, acao: `republish:${version}`, expira: Date.now() + 10 * 60_000 })
      const anteriores = j.enrolledByVersion.reduce((s, v) => s + v.count, 0)
      return {
        confirmationToken: token,
        expiresAt: new Date(Date.now() + 10 * 60_000).toISOString(),
        preview: {
          mode: j.status === 'shadow' ? 'shadow' : 'active', fromVersion: j.publishedVersion, toVersion: j.publishedVersion + 1,
          wouldEnterToday: simularDe(j, j.draft).wouldEnterToday, messagesPerDay: simularDe(j, j.draft).messagesPerDay,
          whatsappNumbers: [], estimatedCreditsPerEnrollment: 0,
          changes: [`Publica de novo o desenho da v${version}, como v${j.publishedVersion + 1}.`, 'O rascunho atual não muda.'],
          enrolledInPreviousVersions: anteriores,
          warnings: ['Quem já está dentro termina na versão em que entrou.'],
        },
      }
    }
    const t = tokens.get(confirmationToken)
    if (!t || t.id !== id || t.acao !== `republish:${version}`) throw new Error('A confirmação não confere com a prévia. Peça a prévia de novo.')
    tokens.delete(confirmationToken)
    const nova = j.publishedVersion + 1
    const g = versoesGuardadasDe(j)
    for (const v of Object.values(g)) v.status = 'retired'
    if (g[version]) g[nova] = { ...copia(g[version]), version: nova, status: 'published', publishedAt: new Date().toISOString(), publishedBy: 'Você' }
    j.enrolledByVersion = [{ version: nova, count: 0 }, ...j.enrolledByVersion]
    j.publishedVersion = nova
    j.updatedAt = new Date().toISOString()
    gravar()
    return copia(j)
  },
  async buscarContatos(busca) {
    await espera(120)
    const b = busca.trim().toLowerCase()
    return CONTATOS_PARA_INSCREVER.filter((c) => !b || c.name.toLowerCase().includes(b) || c.phoneMasked.replace(/\D/g, '').endsWith(b.replace(/\D/g, '') || '§'))
  },
  async inscrever(id, contactIds, confirmationToken) {
    await espera(200)
    const j = achar(id)
    if (j.status !== 'active' && j.status !== 'shadow') throw new Error('Só dá para inscrever numa jornada ativa ou em sombra.')
    const enviaMensagem = Object.values(j.draft.graph.nodes).some((n) => n.type === 'send_template' || n.type === 'send_text')
    const barrados = contactIds.length > 2 ? [{ reason: 'Pediu para não receber', count: 1 }] : []
    const entram = contactIds.length - barrados.reduce((s, b) => s + b.count, 0)
    if (enviaMensagem && !confirmationToken) {
      const token = `conf_${Math.random().toString(36).slice(2)}`
      tokens.set(token, { id, acao: `enroll:${contactIds.join(',')}`, expira: Date.now() + 10 * 60_000 })
      return {
        confirmationToken: token,
        expiresAt: new Date(Date.now() + 10 * 60_000).toISOString(),
        preview: { journeyId: id, contacts: contactIds.length, willEnter: entram, blocked: barrados, sendsMessages: true },
      }
    }
    if (confirmationToken) {
      const t = tokens.get(confirmationToken)
      if (!t || t.id !== id || t.acao !== `enroll:${contactIds.join(',')}`) throw new Error('A confirmação não confere com a prévia. Peça a prévia de novo.')
      tokens.delete(confirmationToken)
    }
    j.enrolledNow += entram
    gravar()
    return { enrolled: entram }
  },
  async contextoDoContato(_id, contactId) {
    await espera(150)
    if (!contactId) return { ...CONTEXTO_DE_TESTE }
    const i = Math.max(0, CONTATOS_PARA_INSCREVER.findIndex((c) => c.id === contactId))
    const c = CONTATOS_PARA_INSCREVER[i]
    const profissionais = ['Dra. Helena', 'Dr. Paulo', 'Dra. Renata']
    const servicos = ['Cardiologia', 'Dermatologia', 'Clínica geral']
    return {
      ...CONTEXTO_DE_TESTE,
      'contato.nome': c?.name.split(' ')[0] ?? 'Contato',
      'contato.telefone': c?.phoneMasked ?? '+55 24 •••• 0000',
      'conector.agenda.id': String(48200 + i * 13),
      'conector.agenda.data': `${17 + (i % 3)}/11`,
      'conector.agenda.hora': ['08:30', '09:30', '14:00', '15:30'][i % 4],
      'conector.agenda.profissional': profissionais[i % 3],
      'conector.agenda.servico': servicos[i % 3],
      'evento.data': `${17 + (i % 3)}/11`,
      'evento.profissional': profissionais[i % 3],
      'evento.servico': servicos[i % 3],
    }
  },
  async checarEntrada(id, entrada) {
    await espera(220)
    const j = achar(id)
    const v = entrada.valores ?? CONTEXTO_DE_TESTE
    const contato = CONTATOS_PARA_INSCREVER.find((c) => c.id === entrada.contactId)
    const porta = j.draft.entry.doors[0]
    const lista: ChecagemDeEntrada[] = []
    lista.push({
      regra: 'Porta de entrada',
      ok: !!porta,
      detalhe: !porta ? 'A jornada não tem porta.'
        : porta.type === 'schedule_list' ? `Está na agenda de ${v['conector.agenda.data'] ?? 'amanhã'} às ${v['conector.agenda.hora'] ?? '09:00'}.`
          : porta.type === 'event' ? 'O evento da porta chega para este contato.'
            : porta.type === 'segment' ? 'Está no segmento da porta.'
              : 'Entra pela porta manual ou pela API.',
    })
    for (const cond of j.draft.entry.criteria.conditions) {
      const campo = CATALOGO_EXEMPLO.conditionFields.find((x) => x.key === cond.field)
      // No exemplo, a Paula tem o telefone inválido (para mostrar um ✗).
      const falha = contato?.id === 'c_03' && cond.field === 'contato.telefone_valido'
      lista.push({ regra: campo?.label ?? cond.field, ok: !falha, detalhe: falha ? 'O número tem 8 dígitos: não passa no filtro.' : 'Passa no filtro.' })
    }
    lista.push({ regra: 'Entrar de novo', ok: true, detalhe: 'Não tem outra inscrição aberta para o mesmo assunto.' })
    const saiu = contato?.id === 'c_05'
    lista.push({ regra: 'Pediu para não receber', ok: !saiu, detalhe: saiu ? 'Pediu para não receber em 02/11. Nunca entra.' : 'Não pediu.' })
    if (j.draft.entry.skipIfHeldByOtherJourney !== false) lista.push({ regra: 'Outra jornada segura a conversa', ok: true, detalhe: 'Nenhuma outra jornada está com a conversa agora.' })
    const janela = j.draft.rules?.window
    if (janela) lista.push({ regra: 'Horário de envio', ok: true, detalhe: `As mensagens saem das ${janela.from} às ${janela.to}; fora disso, esperam.` })
    return lista
  },
  async testarPasso(id, nodeId, entrada) {
    await espera(700)
    const no = achar(id).draft.graph.nodes[nodeId]
    if (!no) throw new Error('O passo não existe mais.')
    // Passo de IA: não gasta crédito, mas conta no limite diário de testes.
    let restantes: number | undefined
    if (CATALOGO_EXEMPLO.steps.find((p) => p.type === no.type)?.group === 'ia') {
      if (testesDeIa.dia !== new Date().toDateString()) testesDeIa = { dia: new Date().toDateString(), feitos: 0 }
      if (testesDeIa.feitos >= LIMITE_DE_TESTES_DE_IA_POR_DIA) throw new Error(`Chegou ao limite de ${LIMITE_DE_TESTES_DE_IA_POR_DIA} testes de IA de hoje. Amanhã libera de novo; o "Testar" da jornada inteira continua funcionando.`)
      testesDeIa.feitos++
      restantes = LIMITE_DE_TESTES_DE_IA_POR_DIA - testesDeIa.feitos
    }
    const v = entrada.valores ?? CONTEXTO_DE_TESTE
    switch (no.type) {
      case 'connector_call': {
        const op = CATALOGO_EXEMPLO.connectorOperations.find((o) => o.key === no.params.operation)
        return { ok: true, titulo: 'O sistema respondeu', detalhe: `${op?.label ?? 'Operação'}: agendamento ${v['conector.agenda.id'] ?? '99001'} encontrado${op?.writes ? ' (em ensaio: nada foi gravado)' : ''}.`, saida: 'next' }
      }
      case 'webhook_out': return { ok: true, titulo: 'O outro sistema respondeu 200 OK', detalhe: 'Em 182 ms. Corpo enviado com os campos escolhidos.', saida: 'next' }
      case 'ai_classify': {
        const cats = Array.isArray(no.params.categories) ? no.params.categories as { key: string; label: string }[] : []
        const c = cats[0]
        return { ok: true, titulo: c ? `Categoria: ${c.label}` : 'Sem categorias', detalhe: 'Confiança 0,92, com a última mensagem do contato.', saida: c?.key ?? 'incerto', testesDeIaRestantesHoje: restantes }
      }
      case 'ai_extract': {
        const campos = Array.isArray(no.params.fields) ? (no.params.fields as string[]).filter(Boolean) : []
        return { ok: true, titulo: 'Achou os dados', detalhe: campos.length ? campos.map((c, i) => `${c}: ${['Unimed', 'manhã', '18/11'][i % 3]}`).join(' · ') : 'Nenhum dado configurado.', saida: 'encontrou', testesDeIaRestantesHoje: restantes }
      }
      case 'ai_summarize': return { ok: true, titulo: 'Resumo', detalhe: `${v['contato.nome'] ?? 'O contato'} quer remarcar para a semana que vem, de manhã.`, saida: 'next', testesDeIaRestantesHoje: restantes }
      default: return { ok: true, titulo: 'Rodou', detalhe: 'O passo rodou em ensaio.', saida: 'next' }
    }
  },
  async enviarTeste(id, nodeId) {
    await espera(400)
    const no = achar(id).draft.graph.nodes[nodeId]
    if (!no || !['send_template', 'send_text', 'send_and_wait', 'ask_question'].includes(no.type)) throw new Error('Só dá para enviar teste de um passo de mensagem.')
    return { to: '+55 24 •••• 1234' }
  },
  async presenca(id) {
    await espera(80)
    // No exemplo, o Rui está mexendo no "Aguardar resposta" da confirmação.
    return id === 'j_confirmacao' ? [{ name: 'Rui (supervisor)', nodeId: 'n_aguardar', since: new Date(Date.now() - 4 * 60_000).toISOString() }] : []
  },
  async comentarios(id) {
    await espera(100)
    return copia(comentariosGuardados[id] ?? [])
  },
  async comentar(id, c) {
    await espera(150)
    const novo: Comentario = { id: `cm_${Math.random().toString(36).slice(2, 9)}`, nodeId: c.nodeId, author: 'Você', text: c.text.trim(), mentions: c.mentions, at: new Date().toISOString(), resolved: false }
    comentariosGuardados[id] = [...(comentariosGuardados[id] ?? []), novo]
    gravar()
    return copia(novo)
  },
  async resolverComentario(id, commentId, resolved) {
    await espera(100)
    const lista = comentariosGuardados[id] ?? []
    const c = lista.find((x) => x.id === commentId)
    if (!c) throw new Error('O comentário não existe mais.')
    c.resolved = resolved
    gravar()
    return copia(c)
  },
  async restaurarExemplos() {
    memoria = jornadasDeExemplo()
    guardadas = {}
    historicoGuardado = {}
    removidas.clear()
    resolvidas.clear()
    try { localStorage.removeItem(CHAVE) } catch { /* nada */ }
  },
}

/** Troque aqui pela implementação real quando a ORY-61 estiver pronta (ver README). */
export const jornadasApi: JornadasApi = jornadasApiDeExemplo

/** Verdadeiro enquanto as telas usam os dados de exemplo (mostra o aviso no topo). */
export const USANDO_DADOS_DE_EXEMPLO = jornadasApi === jornadasApiDeExemplo
