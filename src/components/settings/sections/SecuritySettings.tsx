import { ShieldCheck } from 'lucide-react'
import { SectionHeader } from '../SectionHeader'
import { SettingsSection } from '../SettingsSection'
import { EmptyState } from '@/components/ui/EmptyState'

export function SecuritySettings() {
  return (
    <div>
      <SectionHeader title="Segurança" description="Monitore acessos e atividades da sua conta." />

      {/* Sessions & audit log: o backend ainda não tem essas features reais
          (endpoints /sessions e /audit-logs são stubs — sempre retornam um
          registro fixo / lista vazia). Mostrar como "em breve" em vez de
          fabricar sessões e logs falsos. */}
      <SettingsSection
        title="Sessões e log de auditoria"
        description="Dispositivos conectados e ações recentes da equipe na sua conta."
      >
        <EmptyState
          icon={ShieldCheck}
          title="Em breve"
          hint="O monitoramento de sessões ativas e o log de auditoria da conta ainda estão em desenvolvimento."
        />
      </SettingsSection>
    </div>
  )
}
