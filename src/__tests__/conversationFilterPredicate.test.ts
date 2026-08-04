// ─── conversationFilterPredicate (SCRUM-561/563) ─────────────────────────────
// This predicate is the only piece of the realtime path that is cleanly
// testable in isolation, and both realtime behaviours hang off it:
//
//   * PREPEND — should a conversation the socket just mentioned be inserted?
//   * EVICT   — after a patch, does the row still belong in this list?
//
// It mirrors the backend's applyListFilters. When the two drift, the symptom is
// a row that appears and then vanishes on the next refetch — or never appears.

import { describe, it, expect } from 'vitest'
import { conversationMatchesFilters } from '@/lib/conversationFilterPredicate'
import type { Conversation, ConversationFilters, Tag, User } from '@/types'

const ME: User = { id: 'user-me' } as User

function conv(over: Partial<Conversation> = {}): Conversation {
  return {
    id: 'c-1',
    status: 'open',
    unreadCount: 0,
    lastMessageAt: '2026-07-28T12:00:00.000Z',
    tags: [],
    ...over,
  } as Conversation
}

const match = (c: Partial<Conversation>, f: ConversationFilters, u: User | null = ME) =>
  conversationMatchesFilters(conv(c), f, u)

describe('conversationMatchesFilters', () => {
  it('matches everything when no filter is set', () => {
    expect(match({}, {})).toBe(true)
  })

  // ── status ────────────────────────────────────────────────────────────────

  it('status: the case this whole feature exists for', () => {
    // Operator sitting on "Pendentes"; the conversation is still open.
    expect(match({ status: 'open' }, { status: 'pending' })).toBe(false)
    // …and once the guard flips it, it belongs.
    expect(match({ status: 'pending' }, { status: 'pending' })).toBe(true)
  })

  it('status: "all" is not a status value', () => {
    expect(match({ status: 'resolved' }, { status: 'all' as ConversationFilters['status'] })).toBe(true)
  })

  // ── assignment ────────────────────────────────────────────────────────────

  it('assignedTo unassigned', () => {
    expect(match({ assignedUser: undefined }, { assignedTo: 'unassigned' })).toBe(true)
    expect(match({ assignedUser: { id: 'u9' } as User }, { assignedTo: 'unassigned' })).toBe(false)
  })

  it('assignedTo me', () => {
    expect(match({ assignedUser: ME }, { assignedTo: 'me' })).toBe(true)
    expect(match({ assignedUser: { id: 'u9' } as User }, { assignedTo: 'me' })).toBe(false)
  })

  it('assignedTo a specific colleague (UUID branch)', () => {
    expect(match({ assignedUser: { id: 'u9' } as User }, { assignedTo: 'u9' })).toBe(true)
    expect(match({ assignedUser: ME }, { assignedTo: 'u9' })).toBe(false)
  })

  // ── AI handling ───────────────────────────────────────────────────────────

  it('aiHandling active vs paused', () => {
    const paused = { aiPausedUntil: '2099-01-01T00:00:00.000Z' }
    const active = { aiPausedUntil: null }
    expect(match(active, { aiHandling: 'active' })).toBe(true)
    expect(match(paused, { aiHandling: 'active' })).toBe(false)
    expect(match(paused, { aiHandling: 'paused' })).toBe(true)
    expect(match(active, { aiHandling: 'paused' })).toBe(false)
  })

  // ── the rest ──────────────────────────────────────────────────────────────

  it('whatsappNumberId, contactId, unreadOnly, untagged', () => {
    expect(match({ whatsappNumber: { id: 'w1' } as Conversation['whatsappNumber'] }, { whatsappNumberId: 'w1' })).toBe(true)
    expect(match({ whatsappNumber: { id: 'w2' } as Conversation['whatsappNumber'] }, { whatsappNumberId: 'w1' })).toBe(false)
    expect(match({ contact: { id: 'ct1' } as Conversation['contact'] }, { contactId: 'ct1' })).toBe(true)
    expect(match({ unreadCount: 0 }, { unreadOnly: true })).toBe(false)
    expect(match({ unreadCount: 3 }, { unreadOnly: true })).toBe(true)
    expect(match({ tags: [{ id: 't1' } as Tag] }, { untagged: true })).toBe(false)
    expect(match({ tags: [] }, { untagged: true })).toBe(true)
  })

  it('needsReview keys off hasRecentAnomaly — the field SCRUM-524 restored', () => {
    expect(match({ hasRecentAnomaly: true }, { needsReview: true })).toBe(true)
    expect(match({ hasRecentAnomaly: false }, { needsReview: true })).toBe(false)
    // Before SCRUM-524 the REST payload never carried the field at all, so this
    // filter silently dropped every row it was given.
    expect(match({ hasRecentAnomaly: undefined }, { needsReview: true })).toBe(false)
  })

  it('period filter uses >= start and < end, like the backend', () => {
    const f = { startDate: '2026-07-28T00:00:00.000Z', endDate: '2026-07-29T00:00:00.000Z' }
    expect(match({ lastMessageAt: '2026-07-28T12:00:00.000Z' }, f)).toBe(true)
    expect(match({ lastMessageAt: '2026-07-27T23:59:59.000Z' }, f)).toBe(false)
    expect(match({ lastMessageAt: '2026-07-29T00:00:00.000Z' }, f)).toBe(false)
  })

  it('combines filters — all must hold', () => {
    const f: ConversationFilters = { status: 'pending', assignedTo: 'me', unreadOnly: true }
    expect(match({ status: 'pending', assignedUser: ME, unreadCount: 2 }, f)).toBe(true)
    expect(match({ status: 'pending', assignedUser: ME, unreadCount: 0 }, f)).toBe(false)
    expect(match({ status: 'open', assignedUser: ME, unreadCount: 2 }, f)).toBe(false)
  })

  it('tolerates a missing current user', () => {
    // `assignedTo: 'me'` with no user loaded must not throw or hard-exclude.
    expect(() => conversationMatchesFilters(conv({ assignedUser: ME }), { assignedTo: 'me' }, null)).not.toThrow()
  })
})
