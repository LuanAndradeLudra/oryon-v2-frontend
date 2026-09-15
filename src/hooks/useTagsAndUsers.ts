import { useState, useEffect } from 'react'
import { usersApi } from '@/services/api'
import { useTags } from '@/contexts/TagsContext'
import type { User } from '@/types'

/**
 * Tags vêm do cache compartilhado (`TagsContext` — hotfix da tag que só
 * aparecia em outra tela após logout/login). Usuários continuam com fetch
 * local: hoje só este hook os consome, sem o mesmo problema de duplicação.
 */
export function useTagsAndUsers() {
  const { tags, loadingTags, createTag, deleteTag } = useTags()
  const [users, setUsers] = useState<User[]>([])
  const [loadingUsers, setLoadingUsers] = useState(true)

  useEffect(() => {
    usersApi.list()
      .then((r) => setUsers(r.data))
      .finally(() => setLoadingUsers(false))
  }, [])

  return { tags, users, loading: loadingTags || loadingUsers, createTag, deleteTag }
}
