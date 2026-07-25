import { useCallback, useEffect, useRef, useState } from 'react'
import { contactsApi, attributionApi } from '@/services/api'
import { connectSocket } from '@/services/socket'
import { useToast } from '@/hooks/useToast'
import type { Contact, Conversation, Tag } from '@/types'

// Tipos derivados direto dos generics do client — quando o backend mudar o
// payload, o erro aparece aqui, não espalhado pelos cards.
export type ContactStats = Awaited<ReturnType<typeof contactsApi.getStats>>['data']
export type ContactAttribution = Awaited<ReturnType<typeof attributionApi.getContactAttribution>>['data']

export interface UseContactProfileResult {
  contact: Contact | null
  stats: ContactStats | null
  conversations: Conversation[]
  attribution: ContactAttribution | null
  loading: boolean
  error: boolean
  aiGenerating: boolean
  refresh: () => void
  save: (patch: Partial<Contact>) => Promise<void>
  addTag: (tag: Tag) => Promise<void>
  removeTag: (tagId: string) => Promise<void>
  remove: () => Promise<void>
  setStage: (next: string) => void
}

/**
 * Camada de dados da página de perfil do contato (Customer 360).
 *
 * Porta as mutations otimistas e o listener de socket do ContactDetailPanel
 * (que segue intacto no drawer — TODO futuro: fazer o drawer consumir este
 * hook para eliminar a duplicação). Contratos preservados:
 * - save() reverte no erro e re-lança Error('save failed') — os cards
 *   dependem disso para reabrir o modo de edição.
 * - setStage() só sincroniza estado local: o StageCard/MoveStageModal já
 *   fez o PATCH no backend.
 *
 * `contact` é o único fetch bloqueante; stats/conversas/atribuição degradam
 * para null/[] individualmente (uma falha nunca apaga a página).
 */
export function useContactProfile(contactId: string, initialContact?: Contact): UseContactProfileResult {
  // Contato semeado pela navegação (ex.: "Expandir" do drawer passa o objeto
  // já carregado via location.state) — a página nasce renderizada e o fetch
  // vira uma revalidação silenciosa em segundo plano.
  const seededIdRef = useRef<string | null>(
    initialContact && initialContact.id === contactId ? contactId : null,
  )
  const [contact, setContact] = useState<Contact | null>(seededIdRef.current ? initialContact! : null)
  const [stats, setStats] = useState<ContactStats | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [attribution, setAttribution] = useState<ContactAttribution | null>(null)
  const [loading, setLoading] = useState(!seededIdRef.current)
  const [error, setError] = useState(false)
  const [aiGenerating, setAiGenerating] = useState(false)
  const { toast } = useToast()

  const fetchAll = useCallback(() => {
    contactsApi.get(contactId)
      .then((r) => { setContact(r.data); setError(false) })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
    contactsApi.getStats(contactId)
      .then((r) => setStats(r.data))
      .catch(() => setStats(null))
    contactsApi.getConversations(contactId)
      .then((r) => setConversations(r.data?.data ?? []))
      .catch(() => setConversations([]))
    attributionApi.getContactAttribution(contactId)
      .then((r) => setAttribution(r.data))
      .catch(() => setAttribution(null))
  }, [contactId])

  useEffect(() => {
    const seeded = seededIdRef.current === contactId
    seededIdRef.current = null // o seed vale só para o primeiro contato montado
    if (!seeded) {
      setLoading(true)
      setContact(null)
    }
    setError(false)
    setStats(null)
    setConversations([])
    setAttribution(null)
    fetchAll()
  }, [fetchAll, contactId])

  // Live updates da geração de perfil por IA — mesmo binding do drawer:
  // conecta direto no socket compartilhado (a página não monta useSocket) e
  // remove apenas os próprios listeners no cleanup.
  useEffect(() => {
    const socket = connectSocket()
    const onGenerating = (p: { contactId: string }) => {
      if (p?.contactId !== contactId) return
      setAiGenerating(true)
      toast('Gerando resumo contextual com IA...', 'info')
    }
    const onGenerated = (p: { contactId: string }) => {
      if (p?.contactId !== contactId) return
      setAiGenerating(false)
      contactsApi.get(contactId)
        .then((r) => { setContact(r.data); toast('Resumo atualizado.', 'success') })
        .catch(() => toast('Resumo gerado, mas falhou ao recarregar os dados.', 'error'))
    }
    const onFailed = (p: { contactId: string }) => {
      if (p?.contactId !== contactId) return
      setAiGenerating(false)
      toast('Não foi possível gerar o resumo por IA.', 'error')
    }
    socket.on('contact:ai-generating', onGenerating)
    socket.on('contact:ai-generated', onGenerated)
    socket.on('contact:ai-failed', onFailed)
    return () => {
      socket.off('contact:ai-generating', onGenerating)
      socket.off('contact:ai-generated', onGenerated)
      socket.off('contact:ai-failed', onFailed)
    }
  }, [contactId, toast])

  const save = useCallback(async (patch: Partial<Contact>) => {
    if (!contact) return
    const prev = contact
    setContact({ ...contact, ...patch })
    try {
      const res = await contactsApi.update(contactId, patch)
      setContact(res.data)
      toast('Contato atualizado com sucesso.', 'success')
    } catch {
      setContact(prev)
      toast('Erro ao salvar alterações.', 'error')
      throw new Error('save failed')
    }
  }, [contact, contactId, toast])

  const addTag = useCallback(async (tag: Tag) => {
    if (!contact) return
    if ((contact.tags ?? []).some((t) => t.id === tag.id)) return
    const prev = contact
    setContact({ ...contact, tags: [...(contact.tags ?? []), tag] })
    try {
      const res = await contactsApi.update(contactId, { addTagIds: [tag.id] })
      setContact(res.data)
    } catch {
      setContact(prev)
      toast('Erro ao adicionar etiqueta.', 'error')
    }
  }, [contact, contactId, toast])

  const removeTag = useCallback(async (tagId: string) => {
    if (!contact) return
    const prev = contact
    setContact({ ...contact, tags: (contact.tags ?? []).filter((t) => t.id !== tagId) })
    try {
      const res = await contactsApi.update(contactId, { removeTagIds: [tagId] })
      setContact(res.data)
    } catch {
      setContact(prev)
      toast('Erro ao remover etiqueta.', 'error')
    }
  }, [contact, contactId, toast])

  const remove = useCallback(async () => {
    await contactsApi.delete(contactId)
  }, [contactId])

  const setStage = useCallback((next: string) => {
    setContact((c) => (c ? { ...c, stage: next } : c))
  }, [])

  return {
    contact, stats, conversations, attribution,
    loading, error, aiGenerating,
    refresh: fetchAll,
    save, addTag, removeTag, remove, setStage,
  }
}
