import { useState, useEffect, useCallback } from 'react'
import { tagsApi, usersApi } from '@/services/api'
import type { Tag, User } from '@/types'

export function useTagsAndUsers() {
  const [tags, setTags]   = useState<Tag[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([tagsApi.list(), usersApi.list()])
      .then(([tagsRes, usersRes]) => {
        setTags(tagsRes.data)
        setUsers(usersRes.data)
      })
      .finally(() => setLoading(false))
  }, [])

  const createTag = useCallback(async (name: string, color: string): Promise<Tag> => {
    const { data } = await tagsApi.create(name, color)
    setTags((prev) => [...prev, data])
    return data
  }, [])

  const deleteTag = useCallback(async (id: string) => {
    await tagsApi.delete(id)
    setTags((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return { tags, users, loading, createTag, deleteTag }
}
