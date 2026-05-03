import { MobilePageHeader } from '@/components/layout/MobilePageHeader'

/**
 * Placeholder — sera implementado na Fase E como vista consolidada de
 * "o que precisa da minha atencao" (conversas pendentes atribuidas + sem
 * resposta ha +1h, etc). Sem entidade nova.
 */
export function TasksPage() {
  return (
    <div className="flex flex-col h-full bg-black">
      <MobilePageHeader title="Tarefas" />
      <div className="flex-1 overflow-y-auto p-4">
        <p className="text-sm text-surface-400">Em construção.</p>
      </div>
    </div>
  )
}
