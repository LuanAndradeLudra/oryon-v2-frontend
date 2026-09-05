// ─── Consultas auxiliares da agenda ────────────────────────────────────────
// Duas coisas que a campanha não carrega: a categoria do template (para os
// filtros) e o tamanho do público de uma agendada (para o cartão).
import { useCallback, useEffect, useRef, useState } from 'react'
import { campaignsApi, templatesApi } from '@/services/api'
import type { Campaign, CampaignSegment, TemplateCategoryType } from '@/types'

/**
 * `templateId → categoria`. Uma chamada só, no mount — a lista de templates é
 * pequena e muda pouco. Falha em silêncio: sem ela os filtros de categoria
 * não encontram nada, o que é melhor do que derrubar a agenda inteira.
 */
export function useTemplateCategories(): Map<string, TemplateCategoryType> {
  const [map, setMap] = useState<Map<string, TemplateCategoryType>>(new Map())

  useEffect(() => {
    let alive = true
    templatesApi.list()
      .then((r) => {
        if (!alive) return
        setMap(new Map(r.data.map((t) => [t.id, t.category])))
      })
      .catch(() => { /* filtros de categoria ficam sem resposta; a agenda não */ })
    return () => { alive = false }
  }, [])

  return map
}

/**
 * Contagem de público das campanhas agendadas — só do dia selecionado
 * (decisão 3 do Maestro).
 *
 * Uma campanha agendada não sabe quantos contatos vai atingir: `stats.total`
 * só é preenchido no envio. O único jeito de descobrir é `POST
 * /campaigns/segment-count`, que reexecuta a consulta de segmento no banco.
 * Disparar isso para a agenda inteira na abertura da tela seriam dezenas de
 * consultas que ninguém vê até a base crescer — então só o dia que a pessoa
 * está olhando é contado, e o resultado é memorizado por assinatura de
 * segmento durante a sessão (duas campanhas com o mesmo público = 1 consulta).
 */
export function useAudienceCounts(campaigns: Campaign[]): Map<string, number> {
  const [counts, setCounts] = useState<Map<string, number>>(new Map())
  const bySegment = useRef<Map<string, number>>(new Map())
  const pending = useRef<Set<string>>(new Set())

  const resolve = useCallback(async (targets: Campaign[]) => {
    let changed = false
    const next = new Map(counts)

    for (const c of targets) {
      const key = segmentKey(c.segment)
      if (!key) continue

      const cached = bySegment.current.get(key)
      if (cached !== undefined) {
        if (next.get(c.id) !== cached) { next.set(c.id, cached); changed = true }
        continue
      }
      if (pending.current.has(key)) continue

      pending.current.add(key)
      try {
        const r = await campaignsApi.countSegment(c.segment)
        bySegment.current.set(key, r.data.count)
        next.set(c.id, r.data.count)
        changed = true
      } catch {
        // Sem contagem, o cartão simplesmente não mostra "N contatos".
      } finally {
        pending.current.delete(key)
      }
    }

    if (changed) setCounts(next)
  }, [counts])

  useEffect(() => {
    const targets = campaigns.filter((c) => c.status === 'scheduled' && segmentKey(c.segment))
    if (targets.length === 0) return
    void resolve(targets)
    // `resolve` depende de `counts`, que ele mesmo atualiza; incluí-lo aqui
    // faria o efeito girar. A lista de alvos é a dependência real.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaigns])

  return counts
}

/** Assinatura estável de um segmento — duas campanhas iguais contam uma vez. */
function segmentKey(segment: CampaignSegment | undefined): string | null {
  if (!segment || !segment.type) return null
  return JSON.stringify(segment, Object.keys(segment).sort())
}
