import { getApiErrorMessage } from '@/lib/utils'

/** Motivo da falha ao listar templates para mostrar no seletor: o texto que o
 *  backend mandou (ex.: 403 "Nenhuma linha de WhatsApp associada ao seu
 *  setor.") ou o genérico — erro de rede/axios sem resposta não vira "Network
 *  Error" na tela. Usado pelo TemplatePicker e pelo seletor do compositor da conversa. */
export function templateListError(e: unknown): string {
  const generico = 'Não foi possível carregar os templates.'
  return (e as { response?: unknown })?.response ? getApiErrorMessage(e, generico) : generico
}
