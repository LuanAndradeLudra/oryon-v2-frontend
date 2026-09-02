import { ShieldCheck } from 'lucide-react'
import { SectionHeader } from '../SectionHeader'
import { EmptyState } from '@/components/ui/EmptyState'

export function SecuritySettings() {
  return (
    <div>
      <SectionHeader title="Segurança" description="Monitore acessos e atividades da sua conta." />

      <div className="bg-surface-900 border border-surface-800 rounded-2xl overflow-hidden p-6">
        <EmptyState
          icon={ShieldCheck}
          title="Em breve"
          hint="O monitoramento de sessões ativas e o log de auditoria da conta ainda estão em desenvolvimento."
          className="py-12"
        />
      </div>
    </div>
  )
}
