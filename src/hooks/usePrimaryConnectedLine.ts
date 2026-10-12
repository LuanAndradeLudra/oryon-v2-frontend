// Linha de WhatsApp "de referência" do tenant (primária, ou a única) e se ela
// está conectada. Fonte: WorkspaceNumberContext (linhas ativas do tenant).
// Usado pelo chip do header (Dashboard "WhatsApp conectado", Conversas
// "Linha X · conectada") — só afirma "conectada" com evidência (status
// `connected`); sem linha ou desconectada devolve `connected: false`.
import { useWorkspaceNumber } from '@/contexts/WorkspaceNumberContext'

export function usePrimaryConnectedLine(): { connected: boolean; label: string | null } {
  const { numbers } = useWorkspaceNumber()
  const line = numbers.find((n) => n.isPrimary) ?? (numbers.length === 1 ? numbers[0] : null)
  if (!line) return { connected: false, label: null }
  const connected = line.status === 'connected' || line.status === 'CONNECTED'
  return { connected, label: line.label?.trim() || line.displayPhoneNumber }
}
