// Casca da vista Agenda. `CampaignsPage.tsx` renderiza esta vista por `?view=`
// sem passar props; o conteúdo real (calendário de densidade + fluxo vertical
// por dia) vive em `agenda/`, que se vira sozinho com os dados.
//
// Propriedade transferida da Alavanca (W0.4) para a D1 no merge do #117 —
// ONDA-1-MAPA §1.2.
import { AgendaShell } from './agenda/AgendaShell'

export function AgendaView() {
  return <AgendaShell />
}
