import { CampaignsTab } from '@/components/campaigns/CampaignsTab'

// Stub fino (W0.1/SCRUM-994) — o W0.4/SCRUM-997 (Alavanca) extrai o conteúdo
// real de CampaignsTab.tsx pra cá (mesmo padrão de STATUS_CONFIG →
// campaignStatus.ts). Zero mudança de comportamento; só dá um nome de arquivo
// estável pro roteamento por ?view=. Sem props nesta onda.
export function ListView() {
  return <CampaignsTab />
}
