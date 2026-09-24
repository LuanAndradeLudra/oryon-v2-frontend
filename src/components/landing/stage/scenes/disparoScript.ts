import { DEMO_CAMPAIGN_NEW } from '../demoData'

/**
 * Roteiro da cena Disparos (função pura do passo):
 *  0 revisão do assistente + lista com 2 campanhas    3 disparo: card "Enviando" 25 %
 *  1 cursor mira "Disparar"                           4 62 %
 *  2 clique (scale .9 -> 1)                           5 100 % — "Enviada" + resultados; hold -> loop
 */
export const STEP = { cursor: 1, press: 2, sending: 3, half: 4, done: 5 } as const

export const DELAYS: number[] = [1100, 900, 420, 1200, 1200, 3600]

export interface NewCampaignState {
  status: 'sending' | 'sent'
  sent: number
  delivered: number
  read: number
  replied: number
}

/** Estado da campanha nova em cada passo (null = ainda não foi disparada). */
export function newCampaignAt(step: number): NewCampaignState | null {
  const c = DEMO_CAMPAIGN_NEW
  if (step < STEP.sending) return null
  if (step === STEP.sending) return { status: 'sending', sent: Math.round(c.total * 0.25), delivered: 4, read: 0, replied: 0 }
  if (step === STEP.half) return { status: 'sending', sent: Math.round(c.total * 0.62), delivered: 13, read: 3, replied: 0 }
  return { status: 'sent', sent: c.total, delivered: c.delivered, read: c.read, replied: c.replied }
}
