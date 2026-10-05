import { describe, it, expect } from 'vitest'
import { applyStatusUpdate, shouldApplyStatus, failureReason } from './messageStatus'
import type { Message } from '@/types'

const msg = (o: Partial<Message> = {}): Message => ({
  id: 'm1', conversationId: 'c1', wamid: 'w1', direction: 'outbound', type: 'text',
  status: 'sent', sentAt: '2026-01-01T00:00:00Z', createdAt: '2026-01-01T00:00:00Z', ...o,
})

describe('applyStatusUpdate', () => {
  it('casa por messageId', () => {
    expect(applyStatusUpdate(msg(), { messageId: 'm1', status: 'delivered' }).status).toBe('delivered')
  })
  it('casa por wamid quando não há messageId (formato antigo do socket)', () => {
    expect(applyStatusUpdate(msg(), { wamid: 'w1', status: 'read', conversationId: 'c1' }).status).toBe('read')
  })
  it('ignora evento de outra conversa', () => {
    const m = msg()
    expect(applyStatusUpdate(m, { messageId: 'm1', status: 'read', conversationId: 'outra' })).toBe(m)
  })
  it('não regride: delivered tardio não derruba read', () => {
    const m = msg({ status: 'read' })
    expect(applyStatusUpdate(m, { messageId: 'm1', status: 'delivered' })).toBe(m)
  })
  it('bolha otimista (sending/queued) avança para sent', () => {
    expect(applyStatusUpdate(msg({ status: 'sending' }), { messageId: 'm1', status: 'sent' }).status).toBe('sent')
    expect(applyStatusUpdate(msg({ status: 'queued' }), { messageId: 'm1', status: 'sent' }).status).toBe('sent')
  })
  it('failed não derruba delivered/read e é terminal (igual ao backend)', () => {
    expect(shouldApplyStatus('delivered', 'failed')).toBe(false)
    expect(shouldApplyStatus('read', 'failed')).toBe(false)
    expect(shouldApplyStatus('failed', 'delivered')).toBe(false)
    expect(shouldApplyStatus('failed', 'read')).toBe(false)
    expect(shouldApplyStatus('sent', 'failed')).toBe(true)
    expect(shouldApplyStatus('queued', 'failed')).toBe(true)
  })
  it('aplica timestamps e motivo da falha do payload', () => {
    const r = applyStatusUpdate(msg(), {
      messageId: 'm1', status: 'failed', failedAt: '2026-01-01T00:01:00Z', errorCode: '131047', errorTitle: 'Janela de 24h',
    })
    expect(r).toMatchObject({ status: 'failed', errorCode: '131047', errorTitle: 'Janela de 24h' })
    const d = applyStatusUpdate(msg(), { messageId: 'm1', status: 'read', deliveredAt: 'D', readAt: 'R' })
    expect(d).toMatchObject({ deliveredAt: 'D', readAt: 'R' })
  })
})

describe('failureReason', () => {
  it('usa errorTitle ou o deliveryError gravado', () => {
    expect(failureReason({ errorTitle: 'X' })).toBe('X')
    expect(failureReason({ deliveryError: { errors: [{ title: 'Y' }] } })).toBe('Y')
    expect(failureReason({})).toBeNull()
  })
})
