import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react'
import { tagsApi } from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'
import type { Tag } from '@/types'

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
  const { isAuthenticated } = useAuth()
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
    setTags((prev) => prev.map((t) => (t.id === id ? data : t)))
    return data
  }, [])

  const deleteTag = useCallback(async (id: string) => {
    await tagsApi.delete(id)
    setTags((prev) => prev.filter((t) => t.id !== id))
  }, [])

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
