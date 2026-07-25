import { useState, useEffect } from 'react'
import { Monitor, Smartphone, Globe } from 'lucide-react'
import axios from 'axios'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { SectionHeader } from '../SectionHeader'
import { SettingsSection } from '../SettingsSection'
import { ConfirmModal } from '@/components/ui/Modal'
import { ErrorState } from '@/components/ui/ErrorState'
import { SkeletonList, SkeletonTable } from '@/components/ui/Skeleton'
import { ToastContainer } from '@/components/ui/Toast'
import { useToast } from '@/hooks/useToast'
import { cn } from '@/lib/utils'
import type { ActiveSession, AuditLog } from '@/types'

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api'

const ACTION_LABELS: Record<string, string> = {
  'conversation.resolved':    'Conversa resolvida',
  'message.sent':             'Mensagem enviada',
  'agent.invited':            'Agente convidado',
  'conversation.assigned':    'Conversa atribuída',
  'bot.toggled':              'Bot ativado/desativado',
  'tag.created':              'Tag criada',
  'user.role_changed':        'Papel de usuário alterado',
  'canned_response.created':  'Resposta rápida criada',
  'conversation.transferred': 'Conversa transferida',
  'number.connected':         'Número conectado',
  'bot.created':              'Bot criado',
  'plan.upgraded':            'Plano atualizado',
  'agent.deactivated':        'Agente desativado',
}

function getDeviceIcon(device: string) {
  if (device.includes('iPhone') || device.includes('Mobile') || device.includes('Android')) {
    return <Smartphone className="w-4 h-4" />
  }
  return <Monitor className="w-4 h-4" />
}

export function SecuritySettings() {
  const { toast, toasts, dismiss } = useToast()
  const [sessions, setSessions] = useState<ActiveSession[]>([])
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [logsLoading, setLogsLoading] = useState(true)
  const [sessionsLoading, setSessionsLoading] = useState(true)
  const [revokeTarget, setRevokeTarget] = useState<ActiveSession | null>(null)
  const [logsPage, setLogsPage] = useState(1)
  const [logsTotal, setLogsTotal] = useState(0)
  const [sessionsError, setSessionsError] = useState(false)
  const [sessionsReloadKey, setSessionsReloadKey] = useState(0)
  const [logsError, setLogsError] = useState(false)
  const [logsReloadKey, setLogsReloadKey] = useState(0)

  useEffect(() => {
    setSessionsError(false)
    axios.get<ActiveSession[]>(`${API}/sessions`).then((r) => {
      setSessions(Array.isArray(r.data) ? r.data : [])
      setSessionsLoading(false)
    }).catch(() => { setSessionsError(true); setSessionsLoading(false) })
  }, [sessionsReloadKey])

  useEffect(() => {
    setLogsLoading(true)
    setLogsError(false)
    axios.get<{ data: AuditLog[]; total: number }>(`${API}/audit-logs?page=${logsPage}&limit=10`).then((r) => {
      setLogs(r.data.data ?? [])
      setLogsTotal(r.data.total ?? 0)
      setLogsLoading(false)
    }).catch(() => { setLogsError(true); setLogsLoading(false) })
  }, [logsPage, logsReloadKey])

  const handleRevoke = async () => {
    if (!revokeTarget) return
    try {
      await axios.delete(`${API}/sessions/${revokeTarget.id}`)
      setSessions((s) => s.filter((x) => x.id !== revokeTarget.id))
      toast('Sessão encerrada.', 'success')
    } catch {
      toast('Erro ao encerrar sessão.', 'error')
    } finally {
      setRevokeTarget(null)
    }
  }

  return (
    <div>
      <SectionHeader title="Segurança" description="Monitore acessos e atividades da sua conta." />

      {/* Sessions */}
      <SettingsSection
        title="Sessões ativas"
        description="Dispositivos conectados à sua conta. Encerre as sessões que você não reconhece."
      >
        {sessionsLoading ? (
          <SkeletonList items={2} />
        ) : sessionsError ? (
          <ErrorState
            compact
            onRetry={() => { setSessionsLoading(true); setSessionsReloadKey((k) => k + 1) }}
          />
        ) : (
          <div className="divide-y divide-surface-800/60">
            <p className="text-xs text-surface-400 pb-2">
              {sessions.length} sessão{sessions.length !== 1 ? 'ões' : ''} ativa{sessions.length !== 1 ? 's' : ''}
            </p>
            {sessions.map((sess) => (
              <div key={sess.id} className="flex items-center justify-between gap-4 py-4">
                <div className="flex items-center gap-4">
                  <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0', sess.isCurrent ? 'bg-brand-900/40 text-brand-400' : 'bg-surface-800 text-surface-400')}>
                    {getDeviceIcon(sess.device)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-surface-100">{sess.device}</p>
                      {sess.isCurrent && (
                        <span
                          className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full color-chip border"
                          style={{ ['--chip']: 'var(--color-online)' } as React.CSSProperties}
                        >
                          Atual
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-surface-400">{sess.browser}</span>
                      <span className="text-surface-700">·</span>
                      <Globe className="w-3 h-3 text-surface-500" />
                      <span className="text-xs text-surface-400">{sess.location}</span>
                      <span className="text-surface-700">·</span>
                      <span className="text-xs text-surface-500 font-mono">{sess.ip}</span>
                    </div>
                    <p className="text-xs text-surface-500 mt-0.5">
                      Último acesso: {format(new Date(sess.lastSeenAt), "dd/MM 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </div>
                {!sess.isCurrent && (
                  <button
                    onClick={() => setRevokeTarget(sess)}
                    className="px-3 py-1.5 text-xs font-medium text-danger border border-danger/30 rounded-xl hover:bg-danger/10 transition-colors"
                  >
                    Encerrar
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </SettingsSection>

      {/* Audit logs */}
      <SettingsSection
        title="Log de auditoria"
        description="Ações recentes realizadas pela equipe na sua conta."
      >
        {logsLoading ? (
          <SkeletonTable rows={5} cols={4} />
        ) : logsError ? (
          <ErrorState
            compact
            onRetry={() => setLogsReloadKey((k) => k + 1)}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-surface-800/60">
                    <th className="text-left pl-0 pr-4 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Ação</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Usuário</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Recurso</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-800/60">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-surface-800/50 transition-colors">
                      <td className="pl-0 pr-4 py-3">
                        <p className="text-sm text-surface-200">{ACTION_LABELS[log.action] ?? log.action}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-surface-300">{log.userName}</p>
                        <p className="text-xs text-surface-500 font-mono">{log.ipAddress}</p>
                      </td>
                      <td className="px-4 py-3">
                        <code className="text-xs text-surface-400 font-mono">{log.resourceType}/{log.resourceId}</code>
                      </td>
                      <td className="px-4 py-3 text-xs text-surface-400 whitespace-nowrap">
                        {format(new Date(log.createdAt), "dd/MM/yy HH:mm", { locale: ptBR })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {logsTotal > 10 && (
              <div className="flex items-center justify-between py-3 border-t border-surface-800/60">
                <p className="text-xs text-surface-500">{logsTotal} registros no total</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setLogsPage((p) => Math.max(1, p - 1))}
                    disabled={logsPage === 1}
                    className="px-3 py-1.5 text-xs font-medium text-surface-300 border border-surface-700 rounded-lg hover:border-surface-600 disabled:opacity-40 transition-colors"
                  >
                    Anterior
                  </button>
                  <span className="px-3 py-1.5 text-xs text-surface-400">Pág. {logsPage}</span>
                  <button
                    onClick={() => setLogsPage((p) => p + 1)}
                    disabled={logsPage * 10 >= logsTotal}
                    className="px-3 py-1.5 text-xs font-medium text-surface-300 border border-surface-700 rounded-lg hover:border-surface-600 disabled:opacity-40 transition-colors"
                  >
                    Próxima
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </SettingsSection>

      <ConfirmModal
        open={!!revokeTarget}
        onClose={() => setRevokeTarget(null)}
        onConfirm={handleRevoke}
        title="Encerrar sessão"
        description={`Tem certeza que deseja encerrar a sessão em "${revokeTarget?.device}"? Essa ação não pode ser desfeita.`}
        confirmLabel="Encerrar sessão"
        danger
      />
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  )
}
