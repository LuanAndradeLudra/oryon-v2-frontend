import { BarChart3 } from 'lucide-react'
import { AnimatePresence } from 'framer-motion'
import { useSearchParams } from 'react-router-dom'

import { AbaAgora } from '@/components/dashboard/agora/AbaAgora'
import { AbaRelatorios } from '@/components/dashboard/AbaRelatorios'
import { MobilePageHeader } from '@/components/layout/MobilePageHeader'
import { TipCard } from '@/components/ui/TipCard'
import { useAuth } from '@/contexts/AuthContext'
import { useSetupChecklist } from '@/hooks/useSetupChecklist'
import { useIsMobile } from '@/hooks/useIsMobile'
import { lerAbaDoPainel, type AbaDoPainel } from '@/lib/abaDoPainel'

/**
 * Dashboard (passada estrutural, direção A · Fila primeiro — PO 27/09).
 *
 * Duas abas, na URL (`?aba=`, regra do PO de estado de tela):
 *  - Agora (padrão): a operação ao vivo — quem espera uma pessoa, há quanto
 *    tempo, e Assumir/Atribuir sem sair daqui; a equipe com a IA primeiro.
 *  - Relatórios: os indicadores e gráficos do período que a tela já tinha.
 *
 * A Home fica pessoal (o meu dia); o Dashboard é o painel da operação.
 */
export function DashboardPage() {
  const isMobile = useIsMobile()
  const { user } = useAuth()
  const { checklist, markDone } = useSetupChecklist(user?.id)
  const [searchParams, setSearchParams] = useSearchParams()
  const aba = lerAbaDoPainel(searchParams.get('aba'))

  const setAba = (a: AbaDoPainel) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (a === 'agora') next.delete('aba')
      else next.set('aba', a)
      // Filtro e páginas são da aba Agora; não viajam para Relatórios.
      if (a !== 'agora') { next.delete('fila'); next.delete('filaPag'); next.delete('equipePag') }
      return next
    })
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-w-0">
      {isMobile && <MobilePageHeader title="Dashboard" />}

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-3.5">
          <AnimatePresence>
            {!checklist.dashboard && (
              <TipCard
                icon={<BarChart3 className="w-4 h-4 text-brand-400" />}
                title="Explore seu dashboard"
                description="Em Agora, veja quem espera uma pessoa e há quanto tempo, e assuma ou atribua a conversa sem sair daqui. Em Relatórios ficam o volume, as etiquetas e a equipe no período."
                onDismiss={() => markDone('dashboard')}
              />
            )}
          </AnimatePresence>

          {aba === 'agora'
            ? <AbaAgora aba={aba} onAba={setAba} celular={isMobile} />
            : <AbaRelatorios aba={aba} onAba={setAba} celular={isMobile} />}
        </div>
      </div>
    </div>
  )
}
