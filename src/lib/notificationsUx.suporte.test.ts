import { describe, expect, it } from 'vitest'
import { Bell } from 'lucide-react'
import { CATEGORY_STYLE, categoryOf, emptyStateFor, inlineActionFor } from './notificationsUx'
import { CATEGORY_CHIPS, iconFor } from '@/components/notifications/notificationsMeta'
import type { AppNotification } from '@/hooks/useNotifications'

/** SCRUM-1386 — os avisos do suporte no sino e na página de notificações. */

const TIPOS = ['support_ticket_created', 'support_ticket_updated', 'support_ticket_question', 'support_ticket_resolved', 'support_ticket_client_comment']
const aviso = (type: string, link: string | null): AppNotification => ({
  id: 'n1', type, title: 'A Oryon perguntou no SUP-0042', description: null, link, isRead: false, createdAt: new Date().toISOString(),
})

describe('avisos do suporte nas notificações', () => {
  it('os 5 tipos caem na categoria Suporte, com ícone próprio', () => {
    for (const t of TIPOS) {
      expect(categoryOf(t)).toBe('support')
      expect(iconFor(t)).not.toBe(Bell)
    }
    expect(CATEGORY_STYLE.support.label).toBe('Suporte')
    expect(CATEGORY_CHIPS.find((c) => c.key === 'support')?.types).toEqual(TIPOS)
  })

  it('"Ver chamado" leva ao chamado: página Suporte (empresa) ou fila (equipe)', () => {
    expect(inlineActionFor(aviso('support_ticket_question', '/support?chamado=abc'))).toEqual({ label: 'Ver chamado', href: '/support?chamado=abc', variant: 'primary' })
    expect(inlineActionFor(aviso('support_ticket_client_comment', '/admin/support?chamado=abc'))).toEqual({ label: 'Ver chamado', href: '/admin/support?chamado=abc', variant: 'primary' })
  })

  it('link estranho ou ausente não vira atalho', () => {
    expect(inlineActionFor(aviso('support_ticket_updated', null))).toBeNull()
    expect(inlineActionFor(aviso('support_ticket_updated', 'https://fora.example/support?chamado=abc'))).toBeNull()
    expect(inlineActionFor(aviso('support_ticket_updated', '/conversations?id=1'))).toBeNull()
  })

  it('estado vazio da categoria', () => {
    expect(emptyStateFor('support', 'all', false).title).toBe('Nenhum aviso de suporte')
  })
})
