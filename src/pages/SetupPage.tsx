import { useNavigate } from 'react-router-dom'
import { Monitor } from 'lucide-react'
import { SetupWizard } from '@/components/onboarding/SetupWizard'
import { WorkspaceNumberProvider } from '@/contexts/WorkspaceNumberContext'
import { useIsMobile } from '@/hooks/useIsMobile'

/**
 * Primeiro uso — rota própria (F13-899 · §4.12).
 *
 * Antes o wizard era um overlay renderizado pelo `OnboardingGate`, sem URL:
 * não dava para voltar a ele depois de fechar, não sobrevivia a um F5 e não
 * era linkável. Agora é `/setup`, com o passo atual persistido por tenant.
 *
 * Fica **fora** do `AppShell` (é tela cheia) e fora do `OnboardingGate` — se
 * estivesse dentro, o gate mandaria para cá de novo em loop. Por isso o
 * `WorkspaceNumberProvider` é montado aqui: o passo de WhatsApp reaproveita a
 * seção de Configurações, que consome esse contexto.
 */
export function SetupPage() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()

  // O wizard tem formulários longos e o fluxo de conexão da Meta. Em mobile é
  // ilegível — mesma decisão que já valia no overlay antigo.
  if (isMobile) {
    return (
      <div className="h-screen w-screen bg-black flex flex-col items-center justify-center px-6 text-center gap-4">
        <div
          className="w-16 h-16 rounded-2xl color-chip border flex items-center justify-center"
          style={{ ['--chip']: 'var(--color-warning)' } as React.CSSProperties}
        >
          <Monitor className="w-8 h-8" />
        </div>
        <h1 className="text-lg font-semibold text-surface-50">Configuração inicial requer desktop</h1>
        <p className="text-sm text-surface-400 leading-relaxed max-w-xs">
          O assistente de configuração tem múltiplos passos com formulários e
          integrações. Abra o Oryon no seu computador para configurar sua
          empresa. Depois disso, o app mobile fica liberado para uso operacional.
        </p>
        <button
          type="button"
          onClick={() => navigator.clipboard.writeText(window.location.origin).catch(() => {})}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-900 border border-surface-700 text-sm text-surface-200 hover:bg-surface-800 transition-colors"
        >
          Copiar link do Oryon
        </button>
      </div>
    )
  }

  return (
    <WorkspaceNumberProvider>
      <SetupWizard onComplete={() => navigate('/home', { replace: true })} />
    </WorkspaceNumberProvider>
  )
}

export default SetupPage
