import { ListView } from './views/ListView'

// Wrapper de transição (W0.4/SCRUM-997): CampaignsPage hoje importa
// `CampaignsTab` — mantido aqui só até o PR de integração do Buril (W0.1)
// trocar por `views/{ListView,AgendaView,BoardView}` direto via `?view=`.
export function CampaignsTab() {
  return <ListView />
}
