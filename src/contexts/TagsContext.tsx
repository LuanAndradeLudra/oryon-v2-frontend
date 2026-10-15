import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react'
import { tagsApi } from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'
import { ehEquipeDeSuporte } from '@/lib/roleHelpers'
import type { Tag } from '@/types'
import { avisarMudancaDeEtiqueta, avisarNestaAba, useMudancaDeEtiqueta } from '@/lib/etiquetasAoVivo'
import { getSocket } from '@/services/socket'

/**
 * Cache único e compartilhado da lista de tags do tenant (hotfix — bug
 * relatado: criar uma tag em uma tela não aparecia em outra até logout/login).
 *
 * Antes deste contexto existiam TRÊS fontes independentes, cada uma com seu
 * próprio `useState<Tag[]>` buscado uma vez no mount e nunca invalidado por
 * quem mexia nas outras: `useTagsAndUsers` (instanciado separadamente em
 * `ConversationsPage` e em `PipelineBoardTab` — duas cópias já só entre
 * elas), `TagsCard` (ficha do contato) e `TagsSettings` (Configurações). Numa
 * SPA sem reload ao navegar, cada cópia ficava presa no estado do seu
 * primeiro mount — só um remonte completo do app (logout/login) refazia
 * todos os fetches. Segue o mesmo desenho do `CRMConfigContext` (produtos/
 * estágios/funis): um Provider no topo, `refetchTags()` explícito para quem
 * precisar forçar, e os próprios `createTag`/`updateTag`/`deleteTag`
 * atualizando o único estado compartilhado — toda tela que consome
 * `useTags()` vê a mutação na hora, não só quem a disparou.
 */
interface TagsConfig {
  tags: Tag[]
  loadingTags: boolean
  refetchTags: () => void
  createTag: (name: string, color: string) => Promise<Tag>
  updateTag: (id: string, patch: Partial<Pick<Tag, 'name' | 'color'>>) => Promise<Tag>
  deleteTag: (id: string) => Promise<void>
}

const TagsContext = createContext<TagsConfig>({
  tags: [],
  loadingTags: true,
  refetchTags: () => {},
  createTag: () => Promise.reject(new Error('TagsProvider ausente na árvore')),
  updateTag: () => Promise.reject(new Error('TagsProvider ausente na árvore')),
  deleteTag: () => Promise.resolve(),
})

export function TagsProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated: logado, user } = useAuth()
  // A equipe de suporte da Oryon não tem etiquetas de empresa (nem socket: o backend recusa).
  const isAuthenticated = logado && !ehEquipeDeSuporte(user?.role)
  const [tags, setTags] = useState<Tag[]>([])
  const [loadingTags, setLoadingTags] = useState(true)

  const refetchTags = useCallback(() => {
    setLoadingTags(true)
    tagsApi.list()
      .then((r) => setTags(r.data))
      .catch(() => setTags([]))
      .finally(() => setLoadingTags(false))
  }, [])

  useEffect(() => {
    if (!isAuthenticated) {
      setLoadingTags(false)
      return
    }
    refetchTags()
  }, [isAuthenticated, refetchTags])

  const createTag = useCallback(async (name: string, color: string) => {
    const { data } = await tagsApi.create(name, color)
    setTags((prev) => [...prev, data])
    return data
  }, [])

  const updateTag = useCallback(async (id: string, patch: Partial<Pick<Tag, 'name' | 'color'>>) => {
    const { data } = await tagsApi.update(id, patch)
    // Mescla: a resposta do PATCH não traz usageCount.
    setTags((prev) => prev.map((t) => (t.id === id ? { ...t, ...data } : t)))
    // SCRUM-1253: conversas e contatos já carregados trocam nome/cor na hora.
    avisarMudancaDeEtiqueta({ tipo: 'alterada', tag: { ...data, id } })
    return data
  }, [])

  const deleteTag = useCallback(async (id: string) => {
    await tagsApi.delete(id)
    setTags((prev) => prev.filter((t) => t.id !== id))
    // SCRUM-1253 (PO, 11/10): sem isto a etiqueta excluída seguia no chat, na
    // lista de Conversas e em Leads até o F5.
    avisarMudancaDeEtiqueta({ tipo: 'excluida', id })
  }, [])

  // Mudança vinda de outra aba ou de outro usuário (socket, quando o backend
  // emitir `tag:deleted`/`tag:updated` — SCRUM-1161): atualiza a lista daqui.
  useMudancaDeEtiqueta((m) => {
    if (m.tipo === 'excluida') setTags((prev) => (prev.some((t) => t.id === m.id) ? prev.filter((t) => t.id !== m.id) : prev))
    else setTags((prev) => (prev.some((t) => t.id === m.tag.id) ? prev.map((t) => (t.id === m.tag.id ? { ...t, ...m.tag } : t)) : prev))
  })
  useEffect(() => {
    if (!isAuthenticated) return
    const socket = getSocket()
    const excluida = (p: { id?: string; tagId?: string }) => { const id = p?.id ?? p?.tagId; if (id) avisarNestaAba({ tipo: 'excluida', id }) }
    const alterada = (p: Partial<Tag> & { id?: string }) => { if (p?.id) avisarNestaAba({ tipo: 'alterada', tag: p as Tag }) }
    socket.on('tag:deleted', excluida)
    socket.on('tag:updated', alterada)
    return () => { socket.off('tag:deleted', excluida); socket.off('tag:updated', alterada) }
  }, [isAuthenticated])

  // Memoizado — sem isto todo render do provider recriaria o objeto e
  // re-renderizaria à toa todos os consumidores de `useTags()`.
  const value = useMemo(
    () => ({ tags, loadingTags, refetchTags, createTag, updateTag, deleteTag }),
    [tags, loadingTags, refetchTags, createTag, updateTag, deleteTag],
  )

  return <TagsContext.Provider value={value}>{children}</TagsContext.Provider>
}

export function useTags() {
  return useContext(TagsContext)
}
