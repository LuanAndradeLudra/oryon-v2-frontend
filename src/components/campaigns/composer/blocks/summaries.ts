// ─── Resumos dos blocos fechados ───────────────────────────────────────────
// O acordeão mostra, em cada bloco fechado, uma linha dizendo o que já foi
// decidido ali (mockup `p3-disparos.html` §D2: "novo_lancamento_v2 ·
// Marketing · aprovado pela Meta · 2 variáveis").
//
// Moram fora dos componentes por causa do `react-refresh/only-export-
// components`: um arquivo que exporta componente E função perde o fast
// refresh. Ficarem juntos também ajuda a manter o tom das quatro frases
// consistente — elas aparecem empilhadas na mesma tela.
import type { WhatsAppTemplate, WhatsAppNumber, CampaignVariableMapping } from '@/types'

/** Vazão do processor de disparo, em mensagens por segundo. O mockup mostra
 *  "~3/s"; é constante do backend, não medida — se virar configurável, vem
 *  por prop, não por chamada nova. */
export const THROUGHPUT_PER_SECOND = 3

export function templateSummary(t: WhatsAppTemplate | null): string {
  if (!t) return 'Escolha o modelo aprovado que será enviado.'
  const parts = [t.name, t.category, 'aprovado pela Meta']
  const vars = t.bodyVariables?.length ?? 0
  if (vars > 0) parts.push(`${vars} variáve${vars === 1 ? 'l' : 'is'}`)
  return parts.join(' · ')
}

/** `null` em `eligible` não é "zero": é "ainda não sei" (debounce do evaluate
 *  ou modo fallback, §9.3 do D2-plano), e não pode virar "0 contatos" — senão
 *  o bloco pisca de verde para vermelho a cada tecla no construtor. */
export function publicoSummary(eligible: number | null, segmentName?: string): string {
  if (segmentName) return segmentName
  if (eligible === null) return 'Escolha quem vai receber este disparo.'
  return `${eligible.toLocaleString('pt-BR')} contato${eligible === 1 ? '' : 's'} vão receber`
}

export function variaveisSummary(mappings: CampaignVariableMapping[], complete: boolean): string {
  if (mappings.length === 0) return 'Este template não tem variáveis.'
  const total = mappings.length
  if (!complete) {
    const faltam = mappings.filter((m) =>
      m.source === 'literal' ? !m.literal?.trim() :
      m.source === 'custom_field' ? !m.customFieldKey : false).length
    return `${faltam} de ${total} ainda sem valor`
  }
  return `${total} variáve${total === 1 ? 'l' : 'is'} mapeada${total === 1 ? '' : 's'}`
}

export function envioSummary(
  scheduleMode: 'now' | 'later', scheduledAt: string, line: WhatsAppNumber | null,
): string {
  if (!line) return 'Quando e por qual linha.'
  const lineName = line.label || line.displayPhoneNumber
  if (scheduleMode === 'now') return `Agora · ${lineName}`
  if (!scheduledAt) return `Agendar · ${lineName}`
  const when = new Date(scheduledAt).toLocaleString('pt-BR', {
    day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit',
  })
  return `${when} · ${lineName}`
}

/** "~7 min" a partir da contagem. Arredonda para cima: prometer menos tempo
 *  do que o envio leva é pior do que prometer mais — quem agenda para as 18h
 *  conta com a janela inteira. */
export function formatDuration(count: number): string {
  const seconds = Math.ceil(count / THROUGHPUT_PER_SECOND)
  if (seconds < 60) return `~${seconds} s`
  const minutes = Math.ceil(seconds / 60)
  if (minutes < 60) return `~${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest === 0 ? `~${hours} h` : `~${hours} h ${rest} min`
}
