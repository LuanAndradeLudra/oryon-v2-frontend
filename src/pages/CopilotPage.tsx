import { ArtifactProvider } from '@/contexts/ArtifactContext'
import { CopilotComBancada } from '@/components/copilot/bancada/CopilotComBancada'

// ─── Copilot ──────────────────────────────────────────────────────────────────
// SCRUM-1253 (PO, 08/10): estrutura "Conversa + bancada" — a conversa à
// esquerda e, à direita, a bancada com Aprovações, Resultados e Artefatos.
// Funciona também no celular (a bancada vira folha inferior). A base de
// conhecimento mora em Configurações › Contexto da IA.

export function CopilotPage() {
  return (
    <ArtifactProvider>
      <CopilotComBancada />
    </ArtifactProvider>
  )
}
