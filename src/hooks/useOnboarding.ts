import { useState, useCallback } from 'react'
import { generateCRMConfig, parseStreamResult } from '@/services/anthropicService'
import { stagesApi, customFieldsApi, onboardingApi } from '@/services/api'
import { useCRMConfig } from '@/contexts/CRMConfigContext'
import { useAuth } from '@/contexts/AuthContext'
import type { AIOnboardingConfig } from '@/types'
import type { BusinessContext } from '@/services/anthropicService'
import type { KBDocument } from '@/hooks/useKnowledgeBase'

export type OnboardingStep = 'form' | 'generating' | 'preview' | 'applying' | 'done'

const toKey = (label: string) =>
  label.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

export function useOnboarding() {
  const { completeOnboarding } = useAuth()
  const { refetchStages, refetchFieldDefs } = useCRMConfig()
  const [step, setStep] = useState<OnboardingStep>('form')
  const [config, setConfig] = useState<AIOnboardingConfig | null>(null)
  const [error, setError] = useState<string | null>(null)

  const submit = useCallback(async (context: BusinessContext, pdfDocs: KBDocument[] = []) => {
    setStep('generating')
    setError(null)
    try {
      const stream = generateCRMConfig(context, pdfDocs)
      const parsed = await parseStreamResult(stream)
      if (!parsed.stages?.length) {
        throw new Error('A IA não retornou estágios válidos. Tente novamente.')
      }
      setConfig(parsed as unknown as AIOnboardingConfig)
      setStep('preview')
    } catch (err: unknown) {
      console.error('[onboarding] submit failed:', err)
      const msg = err instanceof Error ? err.message : 'Erro ao gerar configuração.'
      setError(msg)
      setStep('form')
    }
  }, [])

  const apply = useCallback(async (cfg: AIOnboardingConfig) => {
    setStep('applying')
    setError(null)
    try {
      for (const stage of cfg.stages) {
        await stagesApi.create({
          key: toKey(stage.label),
          label: stage.label,
          color: stage.color,
          isTerminal: stage.isTerminal,
        })
      }

      for (const field of cfg.customFields) {
        await customFieldsApi.create({
          key: toKey(field.label),
          label: field.label,
          type: field.type,
          placeholder: field.placeholder,
          required: field.required,
          options: field.options,
        })
      }

      await onboardingApi.complete()
      refetchStages()
      refetchFieldDefs()
      completeOnboarding()
      setStep('done')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao aplicar configuração.'
      setError(msg)
      setStep('preview')
    }
  }, [completeOnboarding, refetchStages, refetchFieldDefs])

  const retry = useCallback(() => {
    setStep('form')
    setConfig(null)
    setError(null)
  }, [])

  const skip = useCallback(async () => {
    try {
      await onboardingApi.complete()
    } catch {
      // best effort
    }
    completeOnboarding()
  }, [completeOnboarding])

  return { step, config, error, submit, apply, retry, skip }
}
