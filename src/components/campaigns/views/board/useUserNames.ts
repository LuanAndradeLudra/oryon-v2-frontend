// ─── Quem criou o rascunho ─────────────────────────────────────────────────
// `Campaign` guarda `createdByUserId`, não o nome. O mockup escreve "Ana R."
// no rodapé do cartão de rascunho, e essa é a única linha da tela que precisa
// disso. Uma chamada só, no mount, mesma forma do `useTemplateCategories`.
import { useEffect, useState } from 'react'
import { usersApi } from '@/services/api'

/**
 * `userId → "Ana R."`. Falha em silêncio: sem a lista, o rodapé do rascunho
 * mostra só a data. Um "—" ou um id cru no lugar do nome não informa nada e
 * ainda ocupa o espaço de algo que informaria.
 */
export function useUserNames(): Map<string, string> {
  const [map, setMap] = useState<Map<string, string>>(new Map())

  useEffect(() => {
    let alive = true
    usersApi.list()
      .then((r) => {
        if (!alive) return
        setMap(new Map(r.data.map((u) => [u.id, shortName(u.firstName, u.lastName)])))
      })
      .catch(() => { /* o rodapé fica só com a data */ })
    return () => { alive = false }
  }, [])

  return map
}

/** "Ana Rodrigues" → "Ana R.", como no mockup. Sem sobrenome, só o primeiro nome. */
function shortName(first: string | undefined, last: string | null | undefined): string {
  const nome = (first ?? '').trim()
  const sobre = (last ?? '').trim()
  if (!sobre) return nome
  return `${nome} ${sobre[0].toUpperCase()}.`
}
