// ─── Console de e-mails (super_admin, 20/10) ─────────────────────────────────
// Todo e-mail que a plataforma disparou, a saúde do SMTP e o reenvio do que
// não foi entregue. "Enviado" = o servidor de e-mail aceitou.

import { api } from './api'

/** `blocked` (20/10): barrado pelo limite de proteção; não é reenviado. */
export type EmailStatus = 'sent' | 'failed' | 'no_smtp' | 'blocked'

export interface EmailLogRow {
  id: string
  tenantId: string | null
  companyName: string | null
  kind: string
  recipient: string
  subject: string
  status: EmailStatus
  error: string | null
  attempts: number
  createdAt: string
  lastAttemptAt: string
  sentAt: string | null
  triggeredBy: string | null
  triggeredByName: string | null
  canResend: boolean
}

export interface EmailListQuery {
  status?: 'problem' | 'sent' | 'blocked' | 'all'
  kind?: string
  q?: string
  days?: number
  limit?: number
  offset?: number
}

export interface EmailSummary {
  days: number
  counts: { sent: number; failed: number; noSmtp: number; blocked?: number }
  smtp: {
    configured: boolean
    failing: boolean
    failuresSinceLastSuccess: number
    failingSince: string | null
    lastFailureAt: string | null
    lastError: string | null
    lastSentAt: string | null
  }
}

export const adminEmailsApi = {
  async list(q: EmailListQuery): Promise<{ total: number; items: EmailLogRow[] }> {
    return (await api.get('/admin/emails', { params: q })).data
  },
  async summary(days: number): Promise<EmailSummary> {
    return (await api.get('/admin/emails/summary', { params: { days } })).data
  },
  async resend(id: string): Promise<EmailLogRow> {
    return (await api.post(`/admin/emails/${id}/resend`)).data
  },
  async resendFailed(body: { days?: number; kind?: string }): Promise<{ total: number; sent: number; failed: number; skipped: number }> {
    return (await api.post('/admin/emails/resend-failed', body)).data
  },
  async test(): Promise<{ status: EmailStatus; error: string | null; to: string }> {
    return (await api.post('/admin/emails/test')).data
  },
}

/** Rótulo de cada tipo de e-mail; famílias com prefixo caem no padrão da família. */
const KIND_LABEL: Record<string, string> = {
  invitation: 'Convite de usuário',
  activation: 'Ativação de conta',
  activation_reminder: 'Lembrete de ativação',
  password_reset: 'Redefinição de senha',
  'security.password_changed': 'Aviso: senha alterada',
  'security.password_reset': 'Aviso: senha redefinida',
  'security.new_device': 'Aviso: acesso de novo dispositivo',
  demo_request: 'Pedido de demonstração',
  cs_alert: 'Alerta interno ao CS',
  smtp_test: 'Teste de envio',
  'whatsapp.alert': 'Alerta do WhatsApp',
  'billing.invoice.issued': 'Fatura emitida',
  'billing.invoice.due_soon': 'Lembrete de vencimento',
  'billing.invoice.overdue': 'Fatura em atraso',
  'billing.payment.confirmed': 'Pagamento confirmado',
  'billing.account.suspension_warning': 'Aviso de suspensão',
  'billing.account.suspended': 'Conta suspensa',
  'billing.account.reactivated': 'Conta reativada',
  'billing.subscription.canceled': 'Assinatura cancelada',
  'billing.renewal.upcoming': 'Renovação próxima',
  'billing.subscription.activated': 'Boas-vindas (conta ativada)',
  'billing.plan.changed': 'Troca de plano',
  'billing.overage.ceiling': 'Teto de excedente',
  'billing.contract.no_renew': 'Não renovação',
  'billing.contract.renewed': 'Contrato renovado',
  'billing.contract.ended': 'Contrato encerrado',
  'billing.credits.low': 'Franquia acabando',
  'billing.cycle.renewed': 'Franquia renovada',
  'security.brute_force': 'Aviso: tentativas de senha errada',
  'user.deactivated': 'Acesso desativado',
  'user.reactivated': 'Acesso reativado',
  'user.role_changed': 'Função alterada',
  'user.admin_granted': 'Aviso aos donos: novo administrador',
  'user.welcome': 'Boas-vindas (convidado ativou)',
  'org.billing_email_changed': 'E-mail de cobrança alterado',
  demo_confirmation: 'Confirmação ao solicitante da demonstração',
  'terms.update': 'Nova versão dos termos',
}

export function emailKindLabel(kind: string): string {
  if (KIND_LABEL[kind]) return KIND_LABEL[kind]
  if (kind.startsWith('billing.')) return 'Aviso de cobrança'
  if (kind.startsWith('security.')) return 'Aviso de segurança'
  if (kind.startsWith('notification.')) return 'Notificação por e-mail'
  if (kind.startsWith('user.')) return 'Aviso de acesso'
  return kind
}

/** Filtro "Tipo": famílias (terminadas em '.') ou tipos exatos. */
export const EMAIL_KIND_FILTERS: Array<{ value: string; label: string }> = [
  { value: '', label: 'Todos os tipos' },
  { value: 'billing.', label: 'Cobrança' },
  { value: 'invitation', label: 'Convite de usuário' },
  { value: 'activation', label: 'Ativação de conta' },
  { value: 'activation_reminder', label: 'Lembrete de ativação' },
  { value: 'password_reset', label: 'Redefinição de senha' },
  { value: 'security.', label: 'Avisos de segurança' },
  { value: 'whatsapp.alert', label: 'Alertas do WhatsApp' },
  { value: 'user.', label: 'Avisos de acesso (usuários)' },
  { value: 'org.billing_email_changed', label: 'E-mail de cobrança alterado' },
  { value: 'terms.update', label: 'Nova versão dos termos' },
  { value: 'notification.', label: 'Notificações por e-mail' },
  { value: 'demo_request', label: 'Pedido de demonstração' },
  { value: 'demo_confirmation', label: 'Confirmação de demonstração' },
  { value: 'cs_alert', label: 'Alerta interno ao CS' },
  { value: 'smtp_test', label: 'Teste de envio' },
]
