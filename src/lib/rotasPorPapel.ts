import { isAdminTier } from '@/lib/roleHelpers'

/**
 * Rotas que dependem do PAPEL ou de flag da EMPRESA, além da flag global de
 * rota (`isRouteVisible`). Revisão final 04/10: a interface mostrava telas que
 * o backend recusa para o papel —
 *   • Disparos: o backend fecha campanhas e modelos para administradores; o
 *     supervisor via "0 disparos" e "nenhuma linha conectada" (era um 403);
 *   • Funis: sem FF_MULTI_PIPELINE na empresa, o backend responde erro; o
 *     atalho da Home e a busca levavam a uma tela de erro.
 * Menu, atalhos, busca e a própria rota usam esta regra.
 */
export function rotaPermitida(href: string, ctx: { role?: string | null; multiPipeline: boolean; suporte?: boolean }): boolean {
  const caminho = href.split('?')[0]
  // Qualidade (SCRUM-1391): só a gestão da empresa (o backend recusa atendente e supervisor).
  if (caminho === '/support/qualidade') return !!ctx.suporte && isAdminTier(ctx.role)
  // Suporte (SCRUM-1383): flag da empresa; a equipe de suporte da Oryon trabalha na fila, não aqui.
  if (caminho === '/support' || caminho.startsWith('/support/')) return !!ctx.suporte && ctx.role !== 'oryon_support'
  if (caminho === '/campaigns' || caminho.startsWith('/campaigns/')) return isAdminTier(ctx.role)
  if (caminho === '/pipelines' || caminho.startsWith('/pipelines/')) return ctx.multiPipeline
  return true
}
