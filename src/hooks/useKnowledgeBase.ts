import { useState, useCallback, useEffect } from 'react'

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface KBCompanyField {
  id: string
  label: string
  value: string
}

export interface KBDocument {
  id: string
  name: string
  kind: 'text' | 'pdf' | 'docx'
  content: string
  size: number
  createdAt: string
}

export interface KnowledgeBase {
  instructions: string
  companyFields: KBCompanyField[]
  documents: KBDocument[]
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const MAX_DOCS = 10
const MAX_PDF_SIZE = 1_500_000
const MAX_TOTAL_SIZE = 3_000_000

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

export const DEFAULT_KB: KnowledgeBase = {
  instructions: '',
  companyFields: [],
  documents: [],
}

// ─── API helpers ───────────────────────────────────────────────────────────────

function getToken(): string {
  try {
    const raw = localStorage.getItem('oryon:session')
    if (!raw) return ''
    return (JSON.parse(raw) as { token?: string }).token ?? ''
  } catch { return '' }
}

function headers() {
  return { 'Content-Type': 'application/json' }
}

async function fetchKB(): Promise<KnowledgeBase> {
  try {
    const res = await fetch(`${API}/context/knowledge-base`, { headers: headers(), credentials: 'include' })
    if (!res.ok) return { ...DEFAULT_KB }
    const data = await res.json()
    return { ...DEFAULT_KB, ...data }
  } catch {
    return { ...DEFAULT_KB }
  }
}

async function persistKB(kb: KnowledgeBase): Promise<void> {
  await fetch(`${API}/context/knowledge-base`, {
    method: 'PATCH',
    headers: headers(),
    credentials: 'include',
    body: JSON.stringify(kb),
  }).catch(() => {})
}

// ─── Exported load function (sync with cache) ─────────────────────────────────

let cachedKB: KnowledgeBase | null = null

export function loadKB(_tenantId: string): KnowledgeBase {
  return cachedKB ?? { ...DEFAULT_KB }
}

// ─── Size helpers ──────────────────────────────────────────────────────────────

export function kbTotalSize(kb: KnowledgeBase): number {
  return (
    kb.instructions.length +
    kb.companyFields.reduce((s, f) => s + f.label.length + f.value.length, 0) +
    kb.documents.reduce((s, d) => s + d.size, 0)
  )
}

export function kbUsagePercent(kb: KnowledgeBase): number {
  return Math.min(100, (kbTotalSize(kb) / MAX_TOTAL_SIZE) * 100)
}

export function kbHasContent(kb: KnowledgeBase): boolean {
  return Boolean(
    kb.instructions.trim() ||
    kb.companyFields.some((f) => f.value.trim()) ||
    kb.documents.length
  )
}

export const KB_MAX_DOCS = MAX_DOCS
export const KB_MAX_PDF_SIZE = MAX_PDF_SIZE
export const KB_MAX_TOTAL_SIZE = MAX_TOTAL_SIZE

// ─── File → KBDocument converter ───────────────────────────────────────────────

export async function fileToKBDocument(
  file: File,
): Promise<{ doc: Omit<KBDocument, 'id' | 'createdAt'>; error: null } | { doc: null; error: string }> {
  if (file.size > MAX_PDF_SIZE) {
    return { doc: null, error: `"${file.name}" é muito grande (máx. 1.5 MB)` }
  }

  const isPdf  = file.type === 'application/pdf'
  const isDocx = file.name.endsWith('.docx') ||
    file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  const isWord = file.name.endsWith('.doc') ||
    file.type === 'application/msword'

  if (isDocx || isWord) {
    try {
      const arrayBuffer = await file.arrayBuffer()
      // mammoth (~700KB) só é necessário para upload de .docx — carrega sob demanda
      const { default: mammoth } = await import('mammoth')
      const result = await mammoth.extractRawText({ arrayBuffer })
      const text = result.value.trim()
      if (!text) return { doc: null, error: `"${file.name}" está vazio ou não foi possível extrair o texto.` }
      return { doc: { name: file.name, kind: 'text', content: text, size: text.length }, error: null }
    } catch {
      return { doc: null, error: `Erro ao processar "${file.name}". Tente exportar como PDF.` }
    }
  }

  if (isPdf) {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1] ?? ''
        resolve({ doc: { name: file.name, kind: 'pdf', content: base64, size: base64.length }, error: null })
      }
      reader.onerror = () => resolve({ doc: null, error: `Erro ao ler "${file.name}".` })
      reader.readAsDataURL(file)
    })
  }

  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => {
      const text = reader.result as string
      resolve({ doc: { name: file.name, kind: 'text', content: text, size: text.length }, error: null })
    }
    reader.onerror = () => resolve({ doc: null, error: `Erro ao ler "${file.name}".` })
    reader.readAsText(file)
  })
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

export function useKnowledgeBase(tenantId: string | undefined) {
  const [kb, setKB] = useState<KnowledgeBase>({ ...DEFAULT_KB })
  const [loading, setLoading] = useState(true)

  // Load from backend on mount
  useEffect(() => {
    if (!tenantId) { setKB({ ...DEFAULT_KB }); setLoading(false); return }
    setLoading(true)
    fetchKB().then((data) => {
      setKB(data)
      cachedKB = data
      setLoading(false)
    })
  }, [tenantId])

  const mutate = useCallback(
    (updater: (prev: KnowledgeBase) => KnowledgeBase) => {
      if (!tenantId) return
      setKB((prev) => {
        const next = updater(prev)
        cachedKB = next
        persistKB(next)
        return next
      })
    },
    [tenantId],
  )

  const setInstructions = useCallback(
    (text: string) => mutate((prev) => ({ ...prev, instructions: text })),
    [mutate],
  )

  const upsertCompanyField = useCallback(
    (field: KBCompanyField) =>
      mutate((prev) => {
        const existing = prev.companyFields.findIndex((f) => f.id === field.id)
        const fields =
          existing >= 0
            ? prev.companyFields.map((f) => (f.id === field.id ? field : f))
            : [...prev.companyFields, field]
        return { ...prev, companyFields: fields }
      }),
    [mutate],
  )

  const deleteCompanyField = useCallback(
    (id: string) =>
      mutate((prev) => ({
        ...prev,
        companyFields: prev.companyFields.filter((f) => f.id !== id),
      })),
    [mutate],
  )

  const addDocument = useCallback(
    (doc: Omit<KBDocument, 'id' | 'createdAt'>): boolean => {
      if (!tenantId) return false
      let added = false
      mutate((prev) => {
        if (prev.documents.length >= MAX_DOCS) return prev
        if (kbTotalSize(prev) + doc.size > MAX_TOTAL_SIZE) return prev
        added = true
        const newDoc: KBDocument = {
          ...doc,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
        }
        return { ...prev, documents: [...prev.documents, newDoc] }
      })
      return added
    },
    [tenantId, mutate],
  )

  const deleteDocument = useCallback(
    (id: string) =>
      mutate((prev) => ({
        ...prev,
        documents: prev.documents.filter((d) => d.id !== id),
      })),
    [mutate],
  )

  return {
    kb,
    loading,
    setInstructions,
    upsertCompanyField,
    deleteCompanyField,
    addDocument,
    deleteDocument,
    totalSize: kbTotalSize(kb),
    usagePercent: kbUsagePercent(kb),
    hasContent: kbHasContent(kb),
  }
}
