import { MobilePageHeader } from '@/components/layout/MobilePageHeader'

/**
 * Placeholder — sera implementado na Fase B com lista de destinos
 * desktop-first (Settings, Disparos, Marketing, Automacoes, Agentes, etc).
 */
export function MorePage() {
  return (
    <div className="flex flex-col h-full bg-black">
      <MobilePageHeader title="Mais" />
      <div className="flex-1 overflow-y-auto p-4">
        <p className="text-sm text-surface-400">Em construção.</p>
      </div>
    </div>
  )
}
