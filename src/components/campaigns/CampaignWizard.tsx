import { AnimatePresence, motion } from 'framer-motion'
import { X, ChevronRight, ChevronLeft, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Banner } from '@/components/ui/Banner'
import { WizardProgress } from '@/components/ui/WizardProgress'
import { WhatsappLineRow } from '@/components/copilot/WhatsappLineRow'
import { useComposerDraft, STEP_LABELS, STEP_ACCENTS } from './composer/useComposerDraft'
import { Step1Template } from './composer/steps/Step1Template'
import { Step2Segmento } from './composer/steps/Step2Segmento'
import { Step3Variaveis } from './composer/steps/Step3Variaveis'
import { Step4Agendar } from './composer/steps/Step4Agendar'
import { Step5Revisao } from './composer/steps/Step5Revisao'
import type { Campaign } from '@/types'

interface CampaignWizardProps {
  open: boolean
  onClose: () => void
  onCreated: (campaign: Campaign) => void
  /**
   * When provided, opens directly on the "manual" segment with these contacts
   * pre-selected. Used by the CRM bulk bar so the user doesn't have to
   * re-find the contacts they already selected.
   */
  initialContactIds?: string[]
  /** Optional pre-filled campaign name (e.g. "Campanha de 5 contatos"). */
  initialName?: string
}

export function CampaignWizard({
  open, onClose, onCreated, initialContactIds, initialName,
}: CampaignWizardProps) {
  const draft = useComposerDraft(open, onCreated, initialContactIds, initialName)
  const {
    step, setStep, goBack, goNext,
    templates, loadingTemplates, selectedTemplate, setSelectedTemplate, campaignName, setCampaignName,
    segmentType, setSegmentType, selectedTagIds, setSelectedTagIds, selectedStages, setSelectedStages, tags,
    stages, fieldDefs,
    contacts, loadingContacts, selectedContactIds, setSelectedContactIds,
    filterStages, setFilterStages, filterTagIds, setFilterTagIds, filterIntent, setFilterIntent,
    filterSource, setFilterSource, filterOptIn, setFilterOptIn,
    filterSentiment, setFilterSentiment, filterContactSearch, setFilterContactSearch,
    filterHasConversations, setFilterHasConversations,
    mappings, updateMapping,
    scheduleMode, setScheduleMode, scheduledAt, setScheduledAt,
    waNumbers, whatsappNumberId, setWhatsappNumberId,
    estimatedReach, needsExplicitLine, canAdvance,
    saving, error, handleSubmit,
  } = draft

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="wizard-backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/60 z-[49]"
            onClick={onClose}
          />

          <motion.div
            key="wizard-modal"
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="bg-surface-900 overlay-frame border rounded-2xl w-full max-w-3xl pointer-events-auto flex flex-col max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-surface-800 flex-shrink-0">
                <h2 className="text-base font-semibold text-surface-50">Nova campanha</h2>
                <button onClick={onClose} className="p-1.5 rounded-lg text-surface-500 hover:text-surface-200 hover:bg-surface-800 transition-all">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Workspace line callout — multi-WABA only */}
              <div className="px-5 pt-3">
                <WhatsappLineRow
                  whatsappNumberId={whatsappNumberId || null}
                  variant="callout"
                  onLineChange={(id) => setWhatsappNumberId(id)}
                />
              </div>

              {/* Progress */}
              <div className="border-b border-surface-800 flex-shrink-0">
                <WizardProgress
                  steps={STEP_LABELS}
                  currentStep={step}
                  onStepClick={(s) => setStep(s as typeof step)}
                />
              </div>

              {/* Step content */}
              <div className="flex-1 overflow-y-auto p-5">
                {(() => {
                  const { icon: StepIcon, color } = STEP_ACCENTS[step - 1]
                  return (
                    <div className="flex items-center gap-2 mb-4">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)`, color }}
                      >
                        <StepIcon className="w-4 h-4" />
                      </div>
                      <h3 className="text-sm font-semibold text-surface-100">{STEP_LABELS[step - 1]}</h3>
                    </div>
                  )
                })()}
                {step === 1 && (
                  <>
                    <Step1Template
                      templates={templates}
                      loading={loadingTemplates}
                      selected={selectedTemplate}
                      onSelect={setSelectedTemplate}
                      campaignName={campaignName}
                      onNameChange={setCampaignName}
                    />
                    {/* Line picker lives in the top-of-wizard
                        WhatsappLineRow callout (right-side select) —
                        no duplicate "Número de envio" block here. */}
                  </>
                )}
                {step === 2 && (
                  <Step2Segmento
                    segmentType={segmentType}
                    onSegmentType={setSegmentType}
                    tags={tags}
                    selectedTagIds={selectedTagIds}
                    onTagIds={setSelectedTagIds}
                    stages={stages}
                    selectedStages={selectedStages}
                    onStages={setSelectedStages}
                    contacts={contacts}
                    loadingContacts={loadingContacts}
                    selectedContactIds={selectedContactIds}
                    onContactIds={setSelectedContactIds}
                    filterStages={filterStages}
                    onFilterStages={setFilterStages}
                    filterTagIds={filterTagIds}
                    onFilterTagIds={setFilterTagIds}
                    filterIntent={filterIntent}
                    onFilterIntent={setFilterIntent}
                    filterSource={filterSource}
                    onFilterSource={setFilterSource}
                    filterOptIn={filterOptIn}
                    onFilterOptIn={setFilterOptIn}
                    filterSentiment={filterSentiment}
                    onFilterSentiment={setFilterSentiment}
                    filterContactSearch={filterContactSearch}
                    onFilterContactSearch={setFilterContactSearch}
                    filterHasConversations={filterHasConversations}
                    onFilterHasConversations={setFilterHasConversations}
                    estimatedReach={estimatedReach}
                  />
                )}
                {step === 3 && selectedTemplate && (
                  <Step3Variaveis
                    template={selectedTemplate}
                    mappings={mappings}
                    onUpdate={updateMapping}
                    fieldDefs={fieldDefs}
                  />
                )}
                {step === 4 && (
                  <Step4Agendar
                    estimatedReach={estimatedReach}
                    scheduleMode={scheduleMode}
                    onScheduleMode={setScheduleMode}
                    scheduledAt={scheduledAt}
                    onScheduledAt={setScheduledAt}
                  />
                )}
                {step === 5 && selectedTemplate && (
                  <Step5Revisao
                    template={selectedTemplate}
                    mappings={mappings}
                    fieldDefs={fieldDefs}
                    segmentType={segmentType}
                    tags={tags}
                    stages={stages}
                    selectedTagIds={selectedTagIds}
                    selectedStages={selectedStages}
                    selectedContactIds={selectedContactIds}
                    contacts={contacts}
                    filterStages={filterStages}
                    filterTagIds={filterTagIds}
                    filterIntent={filterIntent}
                    filterSource={filterSource}
                    filterOptIn={filterOptIn}
                    filterSentiment={filterSentiment}
                    filterContactSearch={filterContactSearch}
                    filterHasConversations={filterHasConversations}
                    estimatedReach={estimatedReach}
                    scheduleMode={scheduleMode}
                    scheduledAt={scheduledAt}
                    campaignName={campaignName}
                  />
                )}
                {error && (
                  <Banner variant="danger" className="mt-4">{error}</Banner>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-5 py-4 border-t border-surface-800 flex-shrink-0">
                <button
                  onClick={goBack}
                  disabled={step === 1}
                  className={cn(
                    'flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all',
                    step === 1 ? 'invisible' : 'text-surface-400 hover:text-surface-200'
                  )}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Voltar
                </button>

                {step < 5 ? (
                  <button
                    onClick={goNext}
                    disabled={!canAdvance}
                    title={
                      needsExplicitLine ? 'Escolha a linha WhatsApp no banner acima para continuar' :
                      !canAdvance && step === 3 ? 'Preencha o mapeamento de todas as variáveis para continuar' :
                      undefined
                    }
                    className={cn(
                      'flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-medium transition-all',
                      canAdvance
                        ? 'bg-brand-600 hover:bg-brand-500 text-surface-950'
                        : 'bg-surface-700 text-surface-500 cursor-not-allowed'
                    )}
                  >
                    Próximo
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={handleSubmit}
                    disabled={saving || (waNumbers.length > 1 && !whatsappNumberId)}
                    title={waNumbers.length > 1 && !whatsappNumberId ? 'Escolha a linha WhatsApp antes de criar' : undefined}
                    className={cn(
                      'flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-medium transition-all',
                      !saving && !(waNumbers.length > 1 && !whatsappNumberId)
                        ? 'bg-brand-600 hover:bg-brand-500 text-surface-950'
                        : 'bg-surface-700 text-surface-500 cursor-not-allowed'
                    )}
                  >
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                    {scheduleMode === 'later'
                      ? 'Agendar campanha'
                      : saving ? 'Enviando...' : 'Criar e enviar agora'}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
