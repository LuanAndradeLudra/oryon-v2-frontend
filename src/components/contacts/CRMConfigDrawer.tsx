import { AnimatePresence, motion } from 'framer-motion'
import { X, Columns, SlidersHorizontal, Workflow } from 'lucide-react'
import { useState } from 'react'
import { StagesManager } from '@/components/settings/sections/crm/StagesManager'
import { CustomFieldsManager } from '@/components/settings/sections/crm/CustomFieldsManager'
import { PipelineStagesManager } from '@/components/settings/sections/crm/PipelineStagesManager'
import { useMultiPipeline } from '@/hooks/useMultiPipeline'
import type { Pipeline } from '@/types'

const TABS = [
  { id: 'stages', label: 'Estágios do contato', icon: Columns },
  { id: 'pipelineStages', label: 'Estágios do funil', icon: Workflow },
  { id: 'fields', label: 'Campos', icon: SlidersHorizontal },
] as const

type Tab = (typeof TABS)[number]['id']

interface CRMConfigDrawerProps {
  open: boolean
  onClose: () => void
  /** Funis de negócio do tenant — a aba "Estágios do funil" edita os
   *  estágios (colunas do Kanban) de um deles. */
  pipelines: Pipeline[]
  /** Chamado após qualquer mudança de estágio de funil — refaz o fetch dos
   *  pipelines na página, refletindo direto no Kanban aberto. */
  onPipelinesChanged: () => void
  /** Aba a abrir (SCRUM-293 — redirect "criar funil → configurar estágios"
   *  abre já na aba "Estágios do funil"). Omitido = comportamento normal
   *  ("Estágios do contato"). */
  initialTab?: Tab
  /** Repassado pra `PipelineStagesManager` — pré-seleciona o funil recém-criado. */
  initialPipelineId?: string | null
}

export function CRMConfigDrawer({
  open, onClose, pipelines, onPipelinesChanged, initialTab, initialPipelineId,
}: CRMConfigDrawerProps) {
  const [activeTab, setActiveTab] = useState<Tab>(initialTab ?? 'stages')
  // `CRMConfigDrawer` fica sempre montado (só o conteúdo interno é gated por
  // `open` via AnimatePresence) — sem isto, `initialTab` só valeria na 1ª
  // montagem da página inteira, não em cada abertura do drawer. Ajuste
  // durante a renderização (não em efeito) — padrão recomendado pra
  // "resetar estado quando uma prop muda" sem disparar um render extra via
  // efeito: https://react.dev/learn/you-might-not-need-an-effect.
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) setActiveTab(initialTab ?? 'stages')
  }

  // Gate de múltiplos funis (SCRUM-498): sem o flag, a aba "Estágios do
  // funil" não existe — e se alguém pedir por `initialTab`, cai em
  // "Estágios do contato" (derivado, sem efeito).
  const multiPipeline = useMultiPipeline()
  const visibleTabs = multiPipeline ? TABS : TABS.filter((t) => t.id !== 'pipelineStages')
  const currentTab: Tab = !multiPipeline && activeTab === 'pipelineStages' ? 'stages' : activeTab

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="crm-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/40 z-[39]"
            onClick={onClose}
          />

          <motion.div
            key="crm-drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32, mass: 0.9 }}
            className="fixed top-0 right-0 bottom-0 w-full sm:w-[44rem] z-40 bg-surface-950 border-l overlay-frame flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-surface-800 flex-shrink-0">
              <div>
                <h2 className="text-base font-semibold text-surface-50">Configurar CRM</h2>
                <p className="text-xs text-surface-500 mt-0.5">Estágios (contato e funil) e campos personalizados</p>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-surface-500 hover:text-surface-200 hover:bg-surface-800 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 px-5 pt-4 pb-0 flex-shrink-0">
              <div className="flex items-center bg-surface-800 border border-surface-700 rounded-xl p-1 w-fit">
                {visibleTabs.map((tab) => {
                  const Icon = tab.icon
                  const active = currentTab === tab.id
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        active
                          ? 'bg-surface-700 text-surface-50 shadow-sm'
                          : 'text-surface-400 hover:text-surface-200'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-5 py-5">
              {currentTab === 'stages' && <StagesManager />}
              {currentTab === 'pipelineStages' && (
                <PipelineStagesManager
                  pipelines={pipelines}
                  onChanged={onPipelinesChanged}
                  initialPipelineId={initialPipelineId}
                />
              )}
              {currentTab === 'fields' && <CustomFieldsManager />}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
