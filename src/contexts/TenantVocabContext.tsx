import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import type { TenantVocabulary } from '@/types'
import { GENERIC_VOCAB, getTemplateById } from '@/lib/verticalTemplates'

const STORAGE_KEY = 'tenant_vocab_v1'
const TEMPLATE_KEY = 'tenant_vertical_id_v1'

interface TenantVocabCtx {
  vocab: TenantVocabulary
  activeTemplateId: string
  setVocab: (v: TenantVocabulary) => void
  applyTemplate: (templateId: string) => void
  resetToDefault: () => void
}

const TenantVocabContext = createContext<TenantVocabCtx>({
  vocab: GENERIC_VOCAB,
  activeTemplateId: 'generic',
  setVocab: () => {},
  applyTemplate: () => {},
  resetToDefault: () => {},
})

export function TenantVocabProvider({ children }: { children: ReactNode }) {
  const [vocab, setVocabState] = useState<TenantVocabulary>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? JSON.parse(stored) : GENERIC_VOCAB
    } catch {
      return GENERIC_VOCAB
    }
  })

  const [activeTemplateId, setActiveTemplateId] = useState<string>(() => {
    return localStorage.getItem(TEMPLATE_KEY) ?? 'generic'
  })

  const setVocab = useCallback((v: TenantVocabulary) => {
    setVocabState(v)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v))
  }, [])

  const applyTemplate = useCallback((templateId: string) => {
    const template = getTemplateById(templateId)
    if (!template) return
    setVocabState(template.vocabulary)
    setActiveTemplateId(templateId)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(template.vocabulary))
    localStorage.setItem(TEMPLATE_KEY, templateId)
  }, [])

  const resetToDefault = useCallback(() => {
    setVocabState(GENERIC_VOCAB)
    setActiveTemplateId('generic')
    localStorage.setItem(STORAGE_KEY, JSON.stringify(GENERIC_VOCAB))
    localStorage.setItem(TEMPLATE_KEY, 'generic')
  }, [])

  return (
    <TenantVocabContext.Provider value={{ vocab, activeTemplateId, setVocab, applyTemplate, resetToDefault }}>
      {children}
    </TenantVocabContext.Provider>
  )
}

export function useTenantVocab() {
  return useContext(TenantVocabContext)
}
