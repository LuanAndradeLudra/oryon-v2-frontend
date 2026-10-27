import { api } from './api'
import type { ModeloDoFormulario, OrigemDoProblema, TipoDePedido } from '@/components/support/supportModel'
import type {
  AnexoEnviado, ChamadoDaEmpresa, ChamadoDaEquipe, ContextoDaConversaDeSuporte, ConversaDoChamado, ConversaoParaChamado, EmpresaParaChamado,
  EvidenciasDoChamado, FiltrosDaFila, NovoChamado, PaginaDaFila, PaginaDeChamados, ProblemaCompleto, ResultadoDaConversao, ResumoDaFila,
  PedidoDeRascunho, PreviaDoEmailDaQualidade, QualidadeDaEmpresa, ResumoDoChamado, ResumoPorVez, StatusDoProblema, SugestoesDoChamado, VezDoChamado,
  VisaoDaCalibracao, VisaoDaQualidade,
} from '@/types/support'
import type { CausaRaiz, Prioridade } from '@/components/support/fila/modeloDaFila'
import type { Categoria, StatusChamado } from '@/components/support/supportModel'

/**
 * Cliente do módulo `support` do backend (épico SCRUM-1376) — o lado da
 * EMPRESA (`/support/*`): o backend aplica o tenant e o escopo do papel
 * (atendente vê os próprios; supervisor, o setor; gestão, a empresa). Sem a
 * flag do tenant as rotas respondem 404 — quem chama só chama com o recurso
 * ligado. A fila da equipe Oryon (`/admin/support/*`) está em `adminSupportApi`.
 */
export const supportApi = {
  /** Qualidade (SCRUM-1391): os indicadores do mês da empresa. Só a gestão (admin e business_admin). */
  qualidade(periodo?: string) {
    return api.get<QualidadeDaEmpresa>('/support/qualidade', { params: periodo ? { periodo } : {} }).then((r) => r.data)
  },
  criar(dto: NovoChamado) {
    return api.post<ChamadoDaEmpresa>('/support/tickets', dto).then((r) => r.data)
  },
  /** SCRUM-1393 — rascunho do relato pela IA (sempre rascunho: o texto da pessoa vale mais). */
  rascunho(pedido: PedidoDeRascunho) {
    return api.post<{ rascunho: string; aviso: string }>('/support/assistente/rascunho', pedido).then((r) => r.data)
  },
  /** Promover a chamado (SCRUM-1389): o sinal da fila "Verificar" vira chamado — uma vez só (`jaPromovido`). */
  promoverAnomalia(activityLogId: string, descricao?: string) {
    return api.post<ChamadoDaEmpresa & { jaPromovido: boolean }>(
      `/support/tickets/from-anomaly/${encodeURIComponent(activityLogId)}`, { descricao: descricao ?? null },
    ).then((r) => r.data)
  },
  /** Modelo neutro do formulário + campos cadastrados pela empresa. */
  modelo() {
    return api.get<ModeloDoFormulario>('/support/form-config').then((r) => r.data)
  },
  /**
   * Aviso de repetido: chamados abertos sobre o MESMO problema (mesma conversa,
   * mesma automação/regra nomeada ou, sem conversa, mesmo tipo na mesma tela).
   * A regra mora no backend (SCRUM-1379).
   */
  parecidos(params: {
    conversationId?: string | null
    origemDoProblema?: OrigemDoProblema
    origemNome?: string | null
    tipoDePedido?: TipoDePedido | null
    ondeAconteceu?: string | null
  }) {
    const limpos = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== null && v !== undefined && v !== ''))
    return api.get<ResumoDoChamado[]>('/support/tickets/similar', { params: limpos }).then((r) => r.data ?? [])
  },
  /** Em vez de abrir outro chamado: junta mensagens e relato a um chamado aberto. */
  adicionar(id: string, dto: { messageIds: string[]; descricao: string }) {
    return api.post<ChamadoDaEmpresa>(`/support/tickets/${id}/additions`, dto).then((r) => r.data)
  },
  /** Lista paginada por cursor. Com `conversationId`, cada item traz as mensagens marcadas. */
  listar(params: { conversationId?: string; situacao?: 'abertos' | 'encerrados' | 'todos'; vez?: VezDoChamado; busca?: string; cursor?: string; limite?: number } = {}) {
    return api.get<PaginaDeChamados>('/support/tickets', { params }).then((r) => r.data)
  },
  /** Quantos chamados em cada aba da página Suporte, no escopo do papel. */
  resumo() {
    return api.get<ResumoPorVez>('/support/tickets/resumo').then((r) => r.data)
  },
  obter(id: string) {
    return api.get<ChamadoDaEmpresa>(`/support/tickets/${id}`).then((r) => r.data)
  },
  comentar(id: string, corpo: string) {
    return api.post<ChamadoDaEmpresa>(`/support/tickets/${id}/comments`, { corpo }).then((r) => r.data)
  },
  reabrir(id: string) {
    return api.post<ChamadoDaEmpresa>(`/support/tickets/${id}/reopen`, {}).then((r) => r.data)
  },
  /** "Isso resolveu?" — sim encerra; não reabre e avisa a equipe. */
  avaliar(id: string, resolveu: boolean) {
    return api.post<ChamadoDaEmpresa>(`/support/tickets/${id}/evaluation`, { resolveu }).then((r) => r.data)
  },
  /**
   * Anexo provisório (24 h): sobe antes de criar o chamado; o id vai em
   * `anexos` na criação. Sem `Content-Type` fixo: o axios põe o boundary.
   */
  enviarAnexo(arquivo: File) {
    const corpo = new FormData()
    corpo.append('file', arquivo)
    return api.post<AnexoEnviado>('/support/attachments', corpo, { headers: { 'Content-Type': undefined } }).then((r) => r.data)
  },
  /**
   * Baixa o anexo pelo cliente da API (cookie no navegador, Bearer no app
   * nativo — um link direto dava 401 no app) e entrega o arquivo. O backend
   * confere o escopo do chamado.
   */
  async baixarAnexo(chamadoId: string, anexoId: string, nome: string) {
    const r = await api.get<Blob>(`/support/tickets/${chamadoId}/attachments/${anexoId}`, { responseType: 'blob' })
    salvarArquivo(r.data, nome)
  },
}

/** Uma mudança por vez no PATCH da fila, sempre com a versão que a tela tem (409 se alguém mexeu antes). */
export type MudancaNaFila =
  | { assumir: boolean }
  | { status: StatusChamado }
  | { prioridade: Prioridade; motivo: string }
  | { causaRaiz: CausaRaiz | null }
  | { categoria: Categoria }
  | { jiraRef: string | null }

/** SCRUM-1387 — uma mudança por vez no problema. */
export type MudancaNoProblema =
  | { status: StatusDoProblema }
  | { causaRaiz: CausaRaiz | null }
  | { jiraRef: string | null }
  | { titulo: string }

/**
 * Fila da EQUIPE ORYON (`/admin/support/*`, SCRUM-1384): todos os clientes.
 * Só `oryon_support` e super_admin (o backend devolve 403 para a empresa).
 * Leitura de evidência, dossiê e anexo fica registrada no backend.
 */
export const adminSupportApi = {
  listar(filtros: FiltrosDaFila = {}) {
    const params = Object.fromEntries(Object.entries(filtros).filter(([, v]) => v !== undefined && v !== null && v !== '' && v !== false))
    return api.get<PaginaDaFila>('/admin/support/tickets', { params }).then((r) => r.data)
  },
  resumo() {
    return api.get<ResumoDaFila>('/admin/support/tickets/resumo').then((r) => r.data)
  },
  obter(id: string) {
    return api.get<ChamadoDaEquipe>(`/admin/support/tickets/${id}`).then((r) => r.data)
  },
  atualizar(id: string, version: number, mudanca: MudancaNaFila) {
    return api.patch<ChamadoDaEquipe>(`/admin/support/tickets/${id}`, { version, ...mudanca }).then((r) => r.data)
  },
  /** Nota interna: fica no histórico da equipe; a empresa nunca vê. */
  anotar(id: string, corpo: string) {
    return api.post<ChamadoDaEquipe>(`/admin/support/tickets/${id}/notes`, { corpo }).then((r) => r.data)
  },
  /** Pergunta à empresa: o chamado passa a esperar por ela. */
  perguntar(id: string, pergunta: string, version: number) {
    return api.post<ChamadoDaEquipe>(`/admin/support/tickets/${id}/question`, { pergunta, version }).then((r) => r.data)
  },
  /** Resposta ao cliente com o status escolhido — o único caminho para Resolvido. */
  /** Resolvendo, a causa é obrigatória (a do pedido, a do chamado ou a do problema) e a categoria pode ser corrigida junto. */
  responder(id: string, dto: {
    resumo: string; dependeDaClinica: string | null; deixarComo: StatusChamado; version: number; causaRaiz?: CausaRaiz; categoria?: Categoria
  }) {
    return api.post<ChamadoDaEquipe>(`/admin/support/tickets/${id}/reply`, dto).then((r) => r.data)
  },
  sugestoes(id: string) {
    return api.get<SugestoesDoChamado>(`/admin/support/tickets/${id}/suggestions`).then((r) => r.data)
  },
  /** SCRUM-1393 — sugestão de causa raiz pela IA (fica no histórico interno; a causa só muda quando a equipe escolhe). */
  sugerirCausa(id: string) {
    return api.post<{ causa: CausaRaiz; nome: string; motivo: string; confianca: 'baixa' | 'media' | 'alta' }>(
      `/admin/support/tickets/${id}/sugestao-de-causa`,
    ).then((r) => r.data)
  },
  /** SCRUM-1392 — a medida de cada empresa e a simulação antes/depois (só a equipe). */
  calibracao() {
    return api.get<VisaoDaCalibracao>('/admin/support/calibracao').then((r) => r.data)
  },
  /** SCRUM-1391 — a qualidade de todas as empresas com o suporte: o mês (`AAAA-MM`) ou os últimos 7 dias (`7d`). */
  qualidade(periodo: string) {
    return api.get<VisaoDaQualidade>('/admin/support/qualidade', { params: { periodo } }).then((r) => r.data)
  },
  qualidadeDaEmpresa(tenantId: string, periodo?: string) {
    return api.get<QualidadeDaEmpresa>(`/admin/support/qualidade/${tenantId}`, { params: periodo ? { periodo } : {} }).then((r) => r.data)
  },
  /** O e-mail do mês como sai para a gestão da empresa (prévia: nada é enviado). */
  previaDoEmailDaQualidade(tenantId: string, periodo: string) {
    return api.get<PreviaDoEmailDaQualidade>(`/admin/support/qualidade/${tenantId}/email`, { params: { periodo } }).then((r) => r.data)
  },
  /** Configuração do suporte, com motivo (fica no histórico). A equipe muda prazos e limiares. */
  definirConfiguracao(chave: string, valor: unknown, motivo: string) {
    return api.put<{ chave: string; valor: unknown }>(`/admin/support/settings/${chave}`, { valor, motivo }).then((r) => r.data)
  },
  /** Problemas (SCRUM-1387): vincular ao problema (ou desvincular, com null). Manual, no histórico; devolve o chamado. */
  vincularProblema(id: string, problemaId: string | null, version: number) {
    return api.post<ChamadoDaEquipe>(`/admin/support/tickets/${id}/problem`, { problemaId, version }).then((r) => r.data)
  },
  /** Problema novo a partir do chamado, que já fica vinculado; devolve o chamado. */
  criarProblema(ticketId: string, titulo: string | null, version: number) {
    return api.post<ChamadoDaEquipe>('/admin/support/problems', { ticketId, titulo, version }).then((r) => r.data)
  },
  problema(id: string) {
    return api.get<ProblemaCompleto>(`/admin/support/problems/${id}`).then((r) => r.data)
  },
  /** Status, causa, Jira ou título do problema; "corrigido" exige o candidato a teste. */
  atualizarProblema(id: string, mudanca: MudancaNoProblema) {
    return api.patch<ProblemaCompleto>(`/admin/support/problems/${id}`, mudanca).then((r) => r.data)
  },
  /** Candidato a teste de regressão a partir de um chamado de IA do problema (fica registrado). */
  gerarFixture(problemaId: string, ticketId: string) {
    return api.post<ProblemaCompleto>(`/admin/support/problems/${problemaId}/fixture`, { ticketId }).then((r) => r.data)
  },
  /** O candidato em JSON, para levar à bateria (a leitura fica registrada). */
  async baixarFixture(problemaId: string, numero: string) {
    const r = await api.get<unknown>(`/admin/support/problems/${problemaId}/fixture`)
    salvarArquivo(new Blob([JSON.stringify(r.data, null, 2)], { type: 'application/json' }), `fixture-${numero}.json`)
  },
  /** Ocorrência interna → chamado da empresa (SCRUM-1389), com o texto que ela vai ler. */
  abrirParaEmpresa(id: string, resumo: string, version: number) {
    return api.post<ChamadoDaEquipe>(`/admin/support/tickets/${id}/para-a-empresa`, { resumo, version }).then((r) => r.data)
  },
  /** Encerrar a ocorrência interna, com motivo (SCRUM-1389). */
  encerrarOcorrencia(id: string, motivo: string, version: number) {
    return api.post<ChamadoDaEquipe>(`/admin/support/tickets/${id}/encerrar-ocorrencia`, { motivo, version }).then((r) => r.data)
  },
  /** Acesso auditado (SCRUM-1385): libera a conversa do chamado por 24 h, para quem pediu, com motivo. */
  liberarConversa(id: string, motivo: string) {
    return api.post<ChamadoDaEquipe>(`/admin/support/tickets/${id}/conversation-access`, { motivo }).then((r) => r.data)
  },
  /** A conversa do chamado; 403 sem o acesso vigente. Cada leitura fica registrada. */
  conversa(id: string) {
    return api.get<ConversaDoChamado>(`/admin/support/tickets/${id}/conversation`).then((r) => r.data)
  },
  /** A evidência do chamado (o acesso fica registrado). */
  evidencia(id: string) {
    return api.get<EvidenciasDoChamado>(`/admin/support/tickets/${id}/evidence`).then((r) => r.data)
  },
  /** Repete o turno com as ferramentas gravadas (custa IA; desligado por padrão). */
  repetirTurno(id: string, evidenciaId: string, motivo: string) {
    return api.post<Record<string, unknown>>(`/admin/support/tickets/${id}/evidence/${evidenciaId}/replay`, { motivo }).then((r) => r.data)
  },
  /** Dossiê de auditoria em JSON (o acesso fica registrado). */
  async baixarDossie(id: string, numero: string) {
    const r = await api.get<unknown>(`/admin/support/tickets/${id}/dossie`)
    salvarArquivo(new Blob([JSON.stringify(r.data, null, 2)], { type: 'application/json' }), `dossie-${numero}.json`)
  },
  async baixarAnexo(id: string, anexoId: string, nome: string) {
    const r = await api.get<Blob>(`/admin/support/tickets/${id}/attachments/${anexoId}`, { responseType: 'blob' })
    salvarArquivo(r.data, nome)
  },
}

/**
 * WHATSAPP DE SUPORTE (SCRUM-1388): só para quem opera o número de suporte da
 * Oryon (o tenant configurado). Fora dele, `estado` diz `ativo: false` e o
 * resto responde 404.
 */
export const whatsappSuporteApi = {
  /** `linha`: o número de suporte (a ação só aparece nas conversas dele). */
  estado() {
    return api.get<{ ativo: boolean; linha: string | null }>('/support/whatsapp-suporte/estado').then((r) => r.data)
  },
  contexto(conversationId: string) {
    return api.get<ContextoDaConversaDeSuporte>(`/support/whatsapp-suporte/conversas/${conversationId}`).then((r) => r.data)
  },
  empresas(busca: string) {
    return api.get<EmpresaParaChamado[]>('/support/whatsapp-suporte/empresas', { params: busca ? { busca } : {} }).then((r) => r.data)
  },
  /** Converter em chamado (ou juntar ao aberto). 409 traz `existente` quando a conversa já tem chamado aberto. */
  converter(conversationId: string, dto: ConversaoParaChamado) {
    return api.post<ResultadoDaConversao>(`/support/whatsapp-suporte/conversas/${conversationId}/chamado`, dto).then((r) => r.data)
  },
}

/** Entrega um arquivo baixado: link temporário com `download`, liberado logo depois. */
export function salvarArquivo(blob: Blob, nome: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nome
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
