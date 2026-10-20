// ─── Console "E-mails" (super_admin, 20/10) ──────────────────────────────────
// Todo e-mail que a plataforma disparou (cobrança, convites, ativação, senha,
// segurança, WhatsApp, demonstração), a saúde do SMTP e o reenvio do que não
// foi entregue. O corpo do e-mail não é guardado: reenviar monta de novo.
// Filtros na URL (regra do PO: voltar mantém o estado).

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Mail, RefreshCw, Search, Send, X } from 'lucide-react'
import { Banner } from '@/components/ui/Banner'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ConfirmModal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { Input } from '@/components/ui/Input'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { SelectMenu } from '@/components/ui/SelectMenu'
import { SkeletonTable } from '@/components/ui/Skeleton'
import { showToast } from '@/hooks/useToast'
import { cn, getApiErrorMessage } from '@/lib/utils'
import {
  adminEmailsApi,
  emailKindLabel,
  EMAIL_KIND_FILTERS,
  type EmailLogRow,
  type EmailStatus,
  type EmailSummary,
} from '@/services/adminEmailsApi'

type StatusFilter = 'problem' | 'sent' | 'blocked' | 'all'
const PAGE = 50
const DAYS = [1, 7, 30, 90]

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'
const fmtFull = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'

function StatusPill({ status }: { status: EmailStatus }) {
  if (status === 'sent') return <Badge variant="resolved">Enviado</Badge>
  if (status === 'no_smtp') return <Badge variant="pending">Não saiu · sem SMTP</Badge>
  if (status === 'blocked') return <Badge variant="abandoned">Bloqueado · limite</Badge>
  return <Badge variant="danger">Falhou</Badge>
}

/** Por que não há reenvio pelo console, quando não há. */
function semReenvio(row: EmailLogRow): string | null {
  if (row.status === 'sent' || row.canResend) return null
  if (row.status === 'blocked') return 'Não é reenviado'
  if (row.kind === 'cs_alert') return 'O job repete sozinho'
  return 'Sem reenvio pelo console'
}

/** O que o reenvio faz, mostrado no painel. */
function notaReenvio(row: EmailLogRow): string | null {
  if (row.kind === 'invitation') return 'Gera um link de convite novo; o anterior deixa de valer.'
  if (row.kind === 'activation' || row.kind === 'activation_reminder') return 'Manda o link de ativação vigente (só gera outro se ele tiver vencido).'
  if (row.kind.startsWith('billing.')) return 'Confere o fato antes: fatura já paga ou conta reativada não recebe o aviso.'
  if (row.kind === 'password_reset') return 'Gera um link novo de redefinição; o anterior deixa de valer. O link vai só para o e-mail do usuário.'
  if (row.kind.startsWith('user.')) return 'Confere antes se o acesso do usuário continua como no envio.'
  if (row.kind === 'org.billing_email_changed') return 'O aviso ao endereço novo só sai se ele ainda for o e-mail de cobrança.'
  return null
}

export function EmailsPage() {
  const [params, setParams] = useSearchParams()
  const status = (['problem', 'sent', 'blocked', 'all'].includes(params.get('situacao') ?? '') ? params.get('situacao') : 'problem') as StatusFilter
  const days = DAYS.includes(Number(params.get('dias'))) ? Number(params.get('dias')) : 7
  const kind = params.get('tipo') ?? ''
  const q = params.get('q') ?? ''
  const setParam = (k: string, v: string | null) =>
    setParams((p) => {
      const n = new URLSearchParams(p)
      if (v) n.set(k, v)
      else n.delete(k)
      return n
    }, { replace: true })

  const [busca, setBusca] = useState(q)
  useEffect(() => {
    const t = setTimeout(() => { if (busca !== q) setParam('q', busca.trim() || null) }, 350)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busca])

  const [summary, setSummary] = useState<EmailSummary | null>(null)
  const [rows, setRows] = useState<EmailLogRow[] | null>(null)
  const [total, setTotal] = useState(0)
  const [error, setError] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [selected, setSelected] = useState<EmailLogRow | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [confirmBatch, setConfirmBatch] = useState(false)

  const query = useMemo(() => ({ status, days, kind: kind || undefined, q: q || undefined }), [status, days, kind, q])

  // Resposta de um filtro anterior que chega por último não toma a lista.
  const seq = useRef(0)
  const load = useCallback(() => {
    const my = ++seq.current
    setError(false)
    setRows(null)
    Promise.all([adminEmailsApi.list({ ...query, limit: PAGE, offset: 0 }), adminEmailsApi.summary(days)])
      .then(([l, s]) => {
        if (my !== seq.current) return
        setRows(l.items)
        setTotal(l.total)
        setSummary(s)
        setSelected((cur) => (cur ? l.items.find((r) => r.id === cur.id) ?? null : null))
      })
      .catch(() => { if (my === seq.current) setError(true) })
  }, [query, days])

  useEffect(() => { load() }, [load])

  async function loadMore() {
    if (!rows) return
    setLoadingMore(true)
    try {
      const my = seq.current
      const l = await adminEmailsApi.list({ ...query, limit: PAGE, offset: rows.length })
      if (my !== seq.current) return
      setRows([...rows, ...l.items])
      setTotal(l.total)
    } catch (e) {
      showToast(getApiErrorMessage(e, 'Não foi possível carregar mais'), 'error')
    } finally {
      setLoadingMore(false)
    }
  }

  async function resend(row: EmailLogRow) {
    setBusy(row.id)
    try {
      const after = await adminEmailsApi.resend(row.id)
      if (after.status === 'sent') showToast(`Reenviado para ${after.recipient}`, 'success')
      else showToast(after.status === 'no_smtp' ? 'Não saiu: o SMTP não está configurado' : `Falhou de novo: ${after.error ?? 'erro do servidor de e-mail'}`, 'error')
      setRows((rs) => rs?.map((r) => (r.id === after.id ? { ...r, ...after, canResend: after.status !== 'sent' && r.canResend } : r)) ?? rs)
      setSelected((s) => (s?.id === after.id ? { ...s, ...after, canResend: after.status !== 'sent' && s.canResend } : s))
      void adminEmailsApi.summary(days).then(setSummary).catch(() => {})
    } catch (e) {
      showToast(getApiErrorMessage(e, 'Não foi possível reenviar'), 'error')
    } finally {
      setBusy(null)
    }
  }

  async function testSend() {
    setBusy('test')
    try {
      const r = await adminEmailsApi.test()
      if (r.status === 'sent') showToast(`E-mail de teste aceito pelo servidor. Confira a caixa de ${r.to}.`, 'success')
      else showToast(r.status === 'no_smtp' ? 'O SMTP não está configurado no servidor' : `O teste falhou: ${r.error ?? 'erro do servidor de e-mail'}`, 'error')
      load()
    } catch (e) {
      showToast(getApiErrorMessage(e, 'Não foi possível testar o envio'), 'error')
    } finally {
      setBusy(null)
    }
  }

  async function resendBatch() {
    setBusy('batch')
    try {
      const r = await adminEmailsApi.resendFailed({ days, kind: kind || undefined })
      const partes = [`${r.sent} enviado(s)`]
      if (r.failed) partes.push(`${r.failed} falharam de novo`)
      if (r.skipped) partes.push(`${r.skipped} sem reenvio ou que não se aplicam mais`)
      showToast(`Reenvio concluído: ${partes.join(' · ')}`, r.failed ? 'error' : 'success')
      setConfirmBatch(false)
      load()
    } catch (e) {
      showToast(getApiErrorMessage(e, 'Não foi possível reenviar as falhas'), 'error')
    } finally {
      setBusy(null)
    }
  }

  const problemCount = summary ? summary.counts.failed + summary.counts.noSmtp : undefined
  const resendable = rows?.filter((r) => r.canResend).length ?? 0
  const smtp = summary?.smtp
  const showSmtpBanner = !!smtp && (!smtp.configured || smtp.failing)

  return (
    <div className="flex-1 min-w-0 flex flex-col h-full bg-surface-950">
      <div className="flex-1 overflow-y-auto px-6 pt-6 pb-6">
        <div className="mx-auto w-full max-w-7xl space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-lg font-semibold text-surface-50">E-mails</h1>
              <p className="text-sm text-surface-400">Tudo o que a plataforma enviou nos últimos dias. "Enviado" quer dizer que o servidor de e-mail aceitou.</p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              {!showSmtpBanner && (
                <Button variant="ghost" size="sm" leftIcon={<Send className="w-3.5 h-3.5" />} loading={busy === 'test'} onClick={testSend}>Testar envio</Button>
              )}
              <Button variant="ghost" size="sm" leftIcon={<RefreshCw className="w-3.5 h-3.5" />} onClick={load}>Atualizar</Button>
            </div>
          </div>

          {showSmtpBanner && smtp && (
            <Banner
              variant="danger"
              action={
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" leftIcon={<Send className="w-3.5 h-3.5" />} loading={busy === 'test'} onClick={testSend}>Testar envio</Button>
                  {smtp.configured && (
                    <Button size="sm" leftIcon={<RefreshCw className="w-3.5 h-3.5" />} onClick={() => setConfirmBatch(true)}>Reenviar falhas</Button>
                  )}
                </div>
              }
            >
              {!smtp.configured ? (
                <>
                  <p className="font-semibold">O envio de e-mails não está configurado</p>
                  <p className="text-xs mt-0.5">Nenhum e-mail sai até o servidor ter SMTP_HOST, SMTP_USER e SMTP_PASS. O que não saiu fica abaixo para reenviar depois.</p>
                </>
              ) : (
                <>
                  <p className="font-semibold">O envio de e-mails está falhando</p>
                  <p className="text-xs mt-0.5">
                    Desde {fmt(smtp.failingSince)} · {smtp.failuresSinceLastSuccess} falha(s) desde o último envio que deu certo
                    {smtp.lastError && <> · último erro: <code className="font-mono">{smtp.lastError}</code></>}
                  </p>
                  <p className="text-xs mt-0.5">Confira as credenciais SMTP do servidor. Depois de corrigir, reenvie as falhas.</p>
                </>
              )}
            </Banner>
          )}

          {summary && (
            <div className="grid grid-cols-3 gap-3">
              <Card className="p-4"><p className="text-xs text-surface-400">Enviados · {days} dia(s)</p><p className="text-2xl font-semibold tabular-nums text-surface-50">{summary.counts.sent}</p></Card>
              <Card className="p-4"><p className="text-xs text-surface-400">Falharam · {days} dia(s)</p><p className={cn('text-2xl font-semibold tabular-nums', summary.counts.failed ? 'text-danger' : 'text-surface-50')}>{summary.counts.failed}</p></Card>
              <Card className="p-4"><p className="text-xs text-surface-400">Não saíram (sem SMTP) · {days} dia(s)</p><p className={cn('text-2xl font-semibold tabular-nums', summary.counts.noSmtp ? 'text-warning' : 'text-surface-50')}>{summary.counts.noSmtp}</p></Card>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <SelectMenu size="sm" aria-label="Período" value={String(days)} onValueChange={(v) => setParam('dias', v === '7' ? null : v)}>
              {DAYS.map((d) => <option key={d} value={d}>{d === 1 ? 'Últimas 24 horas' : `Últimos ${d} dias`}</option>)}
            </SelectMenu>
            <SelectMenu size="sm" aria-label="Tipo de e-mail" value={kind} onValueChange={(v) => setParam('tipo', v || null)}>
              {EMAIL_KIND_FILTERS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
            </SelectMenu>
            <SegmentedControl<StatusFilter>
              label="Situação"
              value={status}
              onChange={(v) => setParam('situacao', v === 'problem' ? null : v)}
              options={[
                { value: 'all', label: 'Todos', count: summary ? summary.counts.sent + (problemCount ?? 0) + (summary.counts.blocked ?? 0) : undefined },
                { value: 'problem', label: 'Com problema', count: problemCount },
                { value: 'sent', label: 'Enviados', count: summary?.counts.sent },
                // Barrados de propósito pelos limites (20/10): só para o suporte entender.
                { value: 'blocked', label: 'Bloqueados', count: summary?.counts.blocked ?? 0 },
              ]}
            />
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-surface-500 pointer-events-none" />
              <Input size="sm" className="pl-8" placeholder="Buscar por destinatário ou empresa" aria-label="Buscar" value={busca} onChange={(e) => setBusca(e.target.value)} />
            </div>
          </div>

          <div className={cn('grid gap-4', selected ? 'lg:grid-cols-[minmax(0,1fr)_340px]' : 'grid-cols-1')}>
            <div className="min-w-0">
              {error ? (
                <ErrorState onRetry={load} />
              ) : !rows ? (
                <SkeletonTable rows={6} cols={5} />
              ) : rows.length === 0 ? (
                <EmptyState
                  icon={Mail}
                  title={status === 'problem' ? 'Nenhum e-mail com problema no período' : status === 'blocked' ? 'Nenhum envio bloqueado no período' : 'Nenhum e-mail no período'}
                  hint={status === 'problem' ? 'Tudo o que a plataforma tentou enviar foi aceito pelo servidor de e-mail.' : status === 'blocked' ? 'Nenhum envio passou dos limites de proteção (senha, notificações, demonstração).' : 'Ajuste o período ou os filtros.'}
                />
              ) : (
                <div className="rounded-2xl border border-surface-800 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-surface-900/60 text-surface-400 text-xs">
                        <tr>
                          <th className="text-left px-4 py-2.5 font-medium whitespace-nowrap">Quando</th>
                          <th className="text-left px-4 py-2.5 font-medium whitespace-nowrap">Tipo</th>
                          <th className="text-left px-4 py-2.5 font-medium whitespace-nowrap">Destinatário</th>
                          <th className="text-left px-4 py-2.5 font-medium whitespace-nowrap">Situação</th>
                          <th className="text-left px-4 py-2.5 font-medium whitespace-nowrap">Tentativas</th>
                          <th className="px-4 py-2.5" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-surface-800">
                        {rows.map((r) => {
                          const motivo = semReenvio(r)
                          return (
                            <tr
                              key={r.id}
                              onClick={() => setSelected(r)}
                              className={cn('align-top cursor-pointer hover:bg-[var(--rowhover)]', selected?.id === r.id && 'bg-[var(--rowhover)]')}
                            >
                              <td className="px-4 py-3 text-surface-300 whitespace-nowrap tabular-nums">{fmt(r.lastAttemptAt)}</td>
                              <td className="px-4 py-3">
                                <p className="text-surface-100">{emailKindLabel(r.kind)}</p>
                                <p className="text-xs text-surface-500 truncate max-w-[260px]" title={r.subject}>{r.subject}</p>
                              </td>
                              <td className="px-4 py-3">
                                <p className="text-surface-200 truncate max-w-[260px]" title={r.recipient}>{r.recipient}</p>
                                <p className="text-xs text-surface-500 truncate max-w-[260px]">{r.companyName ?? (r.tenantId ? r.tenantId.slice(0, 8) : 'Oryon')}</p>
                              </td>
                              <td className="px-4 py-3"><StatusPill status={r.status} /></td>
                              <td className="px-4 py-3 text-surface-400 tabular-nums">{r.attempts}</td>
                              <td className="px-4 py-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                {r.canResend ? (
                                  <Button size="sm" variant="secondary" loading={busy === r.id} leftIcon={<RefreshCw className="w-3.5 h-3.5" />} onClick={() => resend(r)}>Reenviar</Button>
                                ) : motivo ? (
                                  <span className="text-xs text-surface-500">{motivo}</span>
                                ) : null}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex items-center justify-between px-4 py-2.5 border-t border-surface-800 text-xs text-surface-400">
                    <span>Mostrando {rows.length} de {total}</span>
                    {rows.length < total && <Button variant="ghost" size="sm" loading={loadingMore} onClick={loadMore}>Carregar mais</Button>}
                  </div>
                </div>
              )}
            </div>

            {selected && (
              <Card className="p-0 self-start lg:sticky lg:top-0" aria-label="Detalhe do envio">
                <div className="p-4 border-b border-surface-800 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs text-surface-400">{emailKindLabel(selected.kind)}</p>
                    <p className="text-sm font-semibold text-surface-50 break-all">{selected.recipient}</p>
                    <div className="mt-1.5"><StatusPill status={selected.status} /></div>
                  </div>
                  <Button variant="ghost" size="sm" iconOnly aria-label="Fechar detalhe" onClick={() => setSelected(null)}><X className="w-4 h-4" /></Button>
                </div>
                <div className="p-4 space-y-3 text-sm">
                  <dl className="grid grid-cols-2 gap-3">
                    <div><dt className="text-xs text-surface-500">Empresa</dt><dd className="text-surface-200">{selected.companyName ?? '—'}</dd></div>
                    <div><dt className="text-xs text-surface-500">Disparado por</dt><dd className="text-surface-200">{selected.triggeredByName ?? 'Plataforma'}</dd></div>
                    <div><dt className="text-xs text-surface-500">Primeiro envio</dt><dd className="text-surface-200 tabular-nums">{fmtFull(selected.createdAt)}</dd></div>
                    <div><dt className="text-xs text-surface-500">Última tentativa</dt><dd className="text-surface-200 tabular-nums">{fmtFull(selected.lastAttemptAt)}</dd></div>
                    <div className="col-span-2"><dt className="text-xs text-surface-500">Assunto</dt><dd className="text-surface-200 break-words">{selected.subject}</dd></div>
                    <div><dt className="text-xs text-surface-500">Tentativas</dt><dd className="text-surface-200 tabular-nums">{selected.attempts}</dd></div>
                    {selected.sentAt && <div><dt className="text-xs text-surface-500">Aceito em</dt><dd className="text-surface-200 tabular-nums">{fmtFull(selected.sentAt)}</dd></div>}
                  </dl>
                  {selected.error && selected.status !== 'sent' && (
                    <div>
                      <p className="text-xs text-surface-500 mb-1">{selected.status === 'blocked' ? 'Motivo do bloqueio' : 'Erro do servidor de e-mail'}</p>
                      <code className={cn('block font-mono text-xs break-words rounded-lg bg-surface-900 p-2', selected.status === 'blocked' ? 'text-surface-300' : 'text-danger')}>{selected.error}</code>
                      {selected.status === 'blocked' && (
                        <p className="text-xs text-surface-500 mt-2">Barrado de propósito, para ninguém usar o envio para lotar a caixa de outra pessoa. Libera sozinho quando a janela do limite passa.</p>
                      )}
                    </div>
                  )}
                  <p className="text-xs text-surface-500">O conteúdo do e-mail não é guardado (convites e ativação levam o link de acesso). Reenviar monta o e-mail de novo.</p>
                </div>
                {(selected.status === 'failed' || selected.status === 'no_smtp') && (
                  <div className="p-4 border-t border-surface-800 space-y-2">
                    {selected.canResend && (
                      <Button className="w-full justify-center" loading={busy === selected.id} leftIcon={<RefreshCw className="w-4 h-4" />} onClick={() => resend(selected)}>Reenviar</Button>
                    )}
                    {notaReenvio(selected) && <p className="text-xs text-surface-500">{notaReenvio(selected)}</p>}
                  </div>
                )}
              </Card>
            )}
          </div>
        </div>
      </div>

      <ConfirmModal
        open={confirmBatch}
        onClose={() => setConfirmBatch(false)}
        onConfirm={resendBatch}
        loading={busy === 'batch'}
        title="Reenviar falhas"
        description={`Reenvia tudo o que falhou ou não saiu ${days === 1 ? 'nas últimas 24 horas' : `nos últimos ${days} dias`}${kind ? ` (${EMAIL_KIND_FILTERS.find((k) => k.value === kind)?.label ?? kind})` : ''} e pode ser reenviado. Avisos que não se aplicam mais (ex.: fatura já paga) são pulados.`}
        impact={problemCount != null ? { count: problemCount, label: `e-mail(s) com problema no período${resendable ? '' : ' (alguns podem não ter reenvio)'}`, tone: 'warning' } : undefined}
        confirmLabel="Reenviar"
      />
    </div>
  )
}
