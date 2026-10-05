import type { WhatsAppTemplate } from '@/types'

/**
 * O modelo pode ser enviado pela linha? Modelo sem linha (antigo/global) ou
 * sem linha escolhida não restringe; modelo de uma linha só vale para ela.
 */
export function modeloCombinaComLinha(
  modelo: Pick<WhatsAppTemplate, 'whatsappNumberId'> | null | undefined,
  linhaId: string | null | undefined,
): boolean {
  if (!modelo?.whatsappNumberId || !linhaId) return true
  return modelo.whatsappNumberId === linhaId
}
