import { api } from './api'
import type { ModeloDoFormulario, OrigemDoProblema, TipoDePedido } from '@/components/support/supportModel'
import type { AnexoEnviado, ChamadoDaEmpresa, NovoChamado, PaginaDeChamados, ResumoDoChamado, ResumoPorVez, VezDoChamado } from '@/types/support'

/**
 * Cliente do módulo `support` do backend (épico SCRUM-1376) — o lado da
 * EMPRESA (`/support/*`): o backend aplica o tenant e o escopo do papel
 * (atendente vê os próprios; supervisor, o setor; gestão, a empresa). Sem a
 * flag do tenant as rotas respondem 404 — quem chama só chama com o recurso
 * ligado. A fila da equipe Oryon (`/admin/support/*`) entra na SCRUM-1384.
 */
export const supportApi = {
  criar(dto: NovoChamado) {
    return api.post<ChamadoDaEmpresa>('/support/tickets', dto).then((r) => r.data)
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
  /** Endereço do download (o backend confere o escopo do chamado). */
  enderecoDoAnexo(chamadoId: string, anexoId: string) {
    return `${api.defaults.baseURL ?? ''}/support/tickets/${chamadoId}/attachments/${anexoId}`
  },
}
