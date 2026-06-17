import { AnimatePresence, motion } from 'framer-motion'
import { X, Columns, SlidersHorizontal } from 'lucide-react'
import { useState } from 'react'
import { StagesManager } from '@/components/settings/sections/crm/StagesManager'
import { CustomFieldsManager } from '@/components/settings/sections/crm/CustomFieldsManager'

const TABS = [
  { id: 'stages', label: 'Estágios', icon: Columns },
  { id: 'fields', label: 'Campos', icon: SlidersHorizontal },
] as const

type Tab = (typeof TABS)[number]['id']

interface CRMConfigDrawerProps {
  open: boolean
  onClose: () => void
}

export function CRMConfigDrawer({ open, onClose }: CRMConfigDrawerProps) {
  const [activeTab, setActiveTab] = useState<Tab>('stages')

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
            className="fixed top-0 right-0 bottom-0 w-full sm:w-[480px] z-40 bg-surface-950 border-l border-surface-800 flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-surface-800 flex-shrink-0">
              <div>
                <h2 className="text-base font-semibold text-surface-50">Configurar CRM</h2>
                <p className="text-xs text-surface-500 mt-0.5">Estágios do pipeline e campos personalizados</p>
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
                {TABS.map((tab) => {
                  const Icon = tab.icon
                  const active = activeTab === tab.id
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
              {activeTab === 'stages' && <StagesManager />}
              {activeTab === 'fields' && <CustomFieldsManager />}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
