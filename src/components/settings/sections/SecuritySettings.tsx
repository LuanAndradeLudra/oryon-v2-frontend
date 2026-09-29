import { ShieldCheck, History } from 'lucide-react'
import { Link } from 'react-router-dom'
import { SectionHeader } from '../SectionHeader'
import { SettingsSection } from '../SettingsSection'
import { EmptyState } from '@/components/ui/EmptyState'

export function SecuritySettings() {
  return (
    <div>
      {/* Mesmo nome do item do menu ("Segurança e acesso"). */}
      <SectionHeader title="Segurança e acesso" description="Quem entra na sua conta e de onde." />

      {/* Sessões: o backend ainda não tem a feature real (/sessions é stub).
          Mostrar como "em breve" em vez de fabricar sessões falsas. O log de
          auditoria JÁ existe — antes esta página dizia que ele "ainda estava em
          desenvolvimento", logo acima da seção Auditoria, que funciona. */}
      <SettingsSection
        title="Sessões ativas"
        description="Dispositivos conectados à conta e a opção de encerrar cada um."
      >
        <EmptyState
          icon={ShieldCheck}
          title="Em breve"
          hint="Ver e encerrar as sessões abertas ainda está em desenvolvimento."
        />
      </SettingsSection>

      <SettingsSection
        title="Registro de atividades"
        description="O que a equipe fez na conta: disparos, mudanças de configuração, acessos a dados."
      >
        <Link
          to="/settings/audit"
          className="inline-flex items-center gap-2 text-sm text-brand-300 hover:text-brand-200 transition-colors"
        >
          <History className="w-4 h-4" />
          Abrir a Auditoria →
        </Link>
      </SettingsSection>
    </div>
  )
}
