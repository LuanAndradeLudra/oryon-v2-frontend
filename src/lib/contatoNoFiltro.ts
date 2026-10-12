import type { Contact, ContactFilters } from '@/types'

/**
 * SCRUM-1253 (PO, 07/10): o contato ABERTO no painel atende aos filtros da
 * lista? Usado para dizer "Fora deste filtro" quando ele fica fixado no topo.
 *
 * Responde `false` só quando TEM CERTEZA (algum critério conhecido falha);
 * `null` quando um filtro ativo não dá para conferir aqui (sentimento,
 * situação comercial) — na dúvida, a tela não afirma nada.
 */
export function contatoAtendeFiltros(
  c: Contact,
  f: ContactFilters,
  extra: { commercial?: string } = {},
): boolean | null {
  if (f.search) {
    const termo = f.search.trim().toLowerCase()
    const digitos = termo.replace(/\D/g, '')
    const achou =
      (c.displayName ?? '').toLowerCase().includes(termo) ||
      (c.email ?? '').toLowerCase().includes(termo) ||
      (digitos.length > 0 && (c.waId ?? '').includes(digitos))
    if (!achou) return false
  }
  if (f.stage?.length && (!c.stage || !f.stage.includes(c.stage))) return false
  if (f.tagId?.length && !(c.tags ?? []).some((t) => f.tagId!.includes(t.id))) return false
  if (f.source && c.source !== f.source) return false
  if (f.intent && c.intent !== f.intent) return false
  if (f.optIn !== undefined && !!c.optIn !== f.optIn) return false
  if (f.leadScoreBand) {
    const s = c.leadScore ?? 0
    const faixa = s >= 80 ? 'high' : s >= 50 ? 'medium' : 'low'
    if (faixa !== f.leadScoreBand) return false
  }
  if (f.lastContact) {
    const em = c.lastContactedAt ? new Date(c.lastContactedAt).getTime() : null
    if (f.lastContact === 'none') {
      if (em !== null) return false
    } else {
      const janela = { '24h': 864e5, '7d': 7 * 864e5, '30d': 30 * 864e5 }[f.lastContact]
      if (em === null || Date.now() - em > janela) return false
    }
  }
  if (f.sentiment || extra.commercial) return null
  return true
}
