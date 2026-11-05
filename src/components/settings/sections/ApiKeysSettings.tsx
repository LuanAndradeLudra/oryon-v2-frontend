// Chaves de API (SCRUM-1219) — chaves da API pública v1.
// Backend: /api-keys (admin ou dono). A API só funciona para o workspace com
// `FF_PUBLIC_API`, ligado pela Oryon; sem o flag a tela explica isso.
// O segredo completo aparece UMA vez, logo depois de criar ou de trocar.
// Validade e troca com sobreposição (C3, 04/11): a chave pode vencer; trocar
// cria uma nova com as mesmas permissões e a antiga vale mais alguns dias.
// 05/11: "Ler métricas", chave da rede (só na conta da rede) e revogar a
// substituta de uma troca desfaz a troca (a anterior volta a valer).
import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, BookOpen, Check, Clock, Copy, KeyRound, Lock, Network, Plus, RefreshCw, ShieldAlert } from 'lucide-react'
import { SectionHeader } from '../SectionHeader'
import { Button } from '@/components/ui/Button'
import { Modal, ConfirmModal } from '@/components/ui/Modal'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Checkbox } from '@/components/ui/Checkbox'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { showToast } from '@/hooks/useToast'
import { useAuth } from '@/contexts/AuthContext'
import { isAdminTier } from '@/lib/roleHelpers'
import { getApiErrorMessage } from '@/lib/utils'
import { publicApiEnabled } from '@/config/featureFlags'
import { pipelinesApi } from '@/services/api'
import {
  apiKeysApi, apiDocsUrl, DEFAULT_ROTATION_OVERLAP_DAYS,
  type ApiKey, type ApiKeyScope, type ApiKeyStatus, type MinhaRede, type RevokedApiKey,
} from '@/services/apiKeysApi'

const SCOPE_OPTIONS: Array<{ value: ApiKeyScope; label: string; hint: string }> = [
  { value: 'contacts:read', label: 'Ler contatos', hint: 'Contatos, etiquetas e campos personalizados' },
  { value: 'contacts:write', label: 'Gravar contatos', hint: 'Criar e editar contatos, etiquetar' },
  { value: 'deals:read', label: 'Ler negócios', hint: 'Funis e negócios' },
  { value: 'deals:write', label: 'Gravar negócios', hint: 'Criar, mover, fechar e reabrir negócios' },
  { value: 'metrics:read', label: 'Ler métricas', hint: 'Números do painel: métricas, séries e o "agora"' },
]
const SCOPE_LABEL = new Map(SCOPE_OPTIONS.map((s) => [s.value as string, s.label]))

/** Validade na criação (o backend aceita 1 a 730 dias; vazio = sem validade). */
const VALIDITY_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: 'Sem validade' },
  { value: '30', label: '30 dias' },
  { value: '90', label: '90 dias' },
  { value: '180', label: '180 dias' },
  { value: '365', label: '1 ano (365 dias)' },
]
/** Quanto tempo a chave antiga ainda vale depois da troca (0 a 30; padrão 7). */
const OVERLAP_OPTIONS: Array<{ value: number; label: string }> = [
  { value: 0, label: 'Para de valer agora' },
  { value: 1, label: '1 dia' },
  { value: 3, label: '3 dias' },
  { value: 7, label: '7 dias (recomendado)' },
  { value: 14, label: '14 dias' },
  { value: 30, label: '30 dias' },
]

const DAY_MS = 24 * 60 * 60 * 1000
/** "Vence em…" ganha destaque quando falta uma semana ou menos. */
const EXPIRING_SOON_DAYS = 7
const MAX_ACTIVE_KEYS = 20

const dateFmt = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
const fmt = (iso: string | null) => (iso ? dateFmt.format(new Date(iso)) : '—')
const maskedPrefix = (prefix: string) => `oryon_live_${prefix}…`

/** Dias até `iso`, ao dia mais próximo (3 dias e 1 minuto = "3 dias"); 0 = menos de 24 h. */
function daysUntil(iso: string, now = Date.now()): number {
  const ms = new Date(iso).getTime() - now
  return ms < DAY_MS ? 0 : Math.round(ms / DAY_MS)
}
const diasTxt = (n: number) => (n === 1 ? '1 dia' : `${n} dias`)

const STATUS_ORDER: Record<ApiKeyStatus, number> = { active: 0, expired: 1, revoked: 2 }

interface PipelineOption { id: string; name: string }
interface ShownSecret { title: string; secret: string; previous?: ApiKey }

export function ApiKeysSettings() {
  const { user, featureFlags } = useAuth()
  const enabled = publicApiEnabled(featureFlags)
  const canManage = isAdminTier(user?.role)

  const [rows, setRows] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [pipelines, setPipelines] = useState<PipelineOption[]>([])
  const [pipelinesError, setPipelinesError] = useState(false)
  const [creating, setCreating] = useState(false)
  const [shown, setShown] = useState<ShownSecret | null>(null)
  const [rotating, setRotating] = useState<ApiKey | null>(null)
  const [revoking, setRevoking] = useState<ApiKey | null>(null)
  const [revokeBusy, setRevokeBusy] = useState(false)
  const [rede, setRede] = useState<MinhaRede | null>(null)

  const reload = useCallback(() => {
    if (!enabled || !canManage) { setLoading(false); return }
    setLoading(true)
    setLoadError(null)
    apiKeysApi.list()
      .then(setRows)
      .catch((e) => setLoadError(getApiErrorMessage(e, 'Não foi possível carregar as chaves.')))
      .finally(() => setLoading(false))
  }, [enabled, canManage])

  useEffect(reload, [reload])

  // "Último uso" e a validade mudam enquanto a tela está aberta: ao voltar
  // para a aba, atualiza a lista em silêncio, sem o esqueleto.
  useEffect(() => {
    if (!enabled || !canManage) return
    const refresh = () => {
      if (document.visibilityState !== 'visible') return
      apiKeysApi.list().then(setRows).catch(() => { /* mantém a lista atual */ })
    }
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [enabled, canManage])

  useEffect(() => {
    if (!enabled || !canManage) return
    let vivo = true
    pipelinesApi.list()
      .then(({ data }) => { if (vivo) setPipelines(data.map((p) => ({ id: p.id, name: p.name }))) })
      .catch(() => { if (vivo) setPipelinesError(true) })
    return () => { vivo = false }
  }, [enabled, canManage])

  // Chave da rede só existe na conta da rede: sem rede (403) a opção nem aparece.
  useEffect(() => {
    if (!enabled || !canManage) return
    let vivo = true
    apiKeysApi.myNetwork().then((r) => { if (vivo) setRede(r) })
    return () => { vivo = false }
  }, [enabled, canManage])

  const pipelineName = useMemo(() => new Map(pipelines.map((p) => [p.id, p.name])), [pipelines])
  const byId = useMemo(() => new Map(rows.map((r) => [r.id, r])), [rows])
  const previousOf = (k: ApiKey | null) => (k?.replacesKeyId ? byId.get(k.replacesKeyId) : undefined)
  const activeCount = rows.filter((r) => r.status === 'active').length
  // Ativas primeiro (são as que importam), depois vencidas e revogadas; dentro
  // de cada grupo, a ordem do backend (mais nova antes — sort é estável).
  const sortedRows = useMemo(
    () => [...rows].sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]),
    [rows],
  )

  /** Troca a linha pela versão do servidor sem perder o nome de quem criou. */
  const mergeRow = (updated: ApiKey) =>
    setRows((rs) => rs.map((r) => (r.id === updated.id ? { ...r, ...updated, createdByName: updated.createdByName ?? r.createdByName } : r)))

  /** Revogar a substituta de uma troca devolve a anterior ao estado de antes. */
  function applyRevoke(revoked: RevokedApiKey) {
    const { rotationUndone, ...key } = revoked
    mergeRow(key)
    if (!rotationUndone) return
    setRows((rs) => rs.map((r) => (r.id === rotationUndone.previousKeyId
      ? { ...r, status: 'active', revokedAt: null, replacedByKeyId: null, expiresAt: rotationUndone.previousExpiresAt }
      : r)))
  }

  async function confirmRevoke() {
    if (!revoking) return
    setRevokeBusy(true)
    try {
      const revoked = await apiKeysApi.revoke(revoking.id)
      applyRevoke(revoked)
      const undone = revoked.rotationUndone
      showToast(!undone
        ? `Chave "${revoking.name}" revogada.`
        : undone.legacy
          ? `Chave "${revoking.name}" revogada. A anterior saiu da troca e pode ser trocada de novo; vale até ${fmt(undone.previousExpiresAt)}.`
          : `Chave "${revoking.name}" revogada e a troca desfeita: a anterior volta a valer ${undone.previousExpiresAt ? `até ${fmt(undone.previousExpiresAt)}` : 'sem validade'}.`)
      setRevoking(null)
      // Relê em silêncio: o servidor é quem sabe o estado final das duas chaves.
      apiKeysApi.list().then(setRows).catch(() => { /* mantém o que já foi aplicado */ })
    } catch (e) {
      showToast(getApiErrorMessage(e, 'Não foi possível revogar a chave.'), 'error')
    } finally {
      setRevokeBusy(false)
    }
  }

  const docsLink = (
    <a
      href={apiDocsUrl()}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-accent-dark hover:underline"
    >
      <BookOpen className="w-3.5 h-3.5" /> Documentação da API
    </a>
  )

  return (
    <div>
      <SectionHeader
        title="Chaves de API"
        description="Chaves para sistemas externos (n8n, ERP, site) lerem e gravarem contatos e negócios pela API da Oryon."
        action={enabled && canManage ? (
          <Button
            size="sm"
            className="h-8 px-3 text-[12.5px]"
            leftIcon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => setCreating(true)}
            data-testid="api-keys-new"
          >
            Nova chave
          </Button>
        ) : undefined}
      />

      {!canManage ? (
        <div className="flex items-start gap-3 p-4 rounded-lg border border-surface-700 bg-surface-800 text-sm">
          <Lock className="w-4 h-4 text-surface-500 flex-shrink-0 mt-0.5" />
          <p className="text-surface-300">Só administradores e o dono do workspace gerenciam chaves de API.</p>
        </div>
      ) : !enabled ? (
        <div className="flex items-start gap-3 p-4 rounded-lg border border-surface-700 bg-surface-800 text-sm" data-testid="api-keys-disabled">
          <KeyRound className="w-4 h-4 text-accent-dark flex-shrink-0 mt-0.5" />
          <div className="flex flex-col gap-1.5 min-w-0">
            <p className="text-surface-100 font-medium">A API ainda não está liberada para este workspace</p>
            <p className="text-surface-300">
              A liberação é feita pela equipe da Oryon. Fale com seu gerente de conta ou escreva para{' '}
              <a href="mailto:contato@oryon.com.br" className="text-accent-dark font-medium hover:underline break-words">contato@oryon.com.br</a>.
            </p>
            {docsLink}
          </div>
        </div>
      ) : loading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }, (_, i) => <SkeletonCard key={i} lines={2} />)}
        </div>
      ) : loadError ? (
        <ErrorState hint={loadError} onRetry={reload} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={KeyRound}
          title="Nenhuma chave criada"
          hint="Crie uma chave para conectar um sistema externo. Cada sistema deve ter a sua, para poder revogar sem afetar os outros."
          action={{ label: 'Criar a primeira chave', onClick: () => setCreating(true) }}
        />
      ) : (
        <>
          <div className="flex items-center justify-between gap-3 flex-wrap mb-2.5">
            <span className="text-xs text-surface-300">{activeCount} de {MAX_ACTIVE_KEYS} chaves ativas</span>
            {docsLink}
          </div>
          <ul className="rounded-lg border border-surface-700 divide-y divide-surface-700">
            {sortedRows.map((k) => (
              <KeyRow
                key={k.id}
                k={k}
                replacement={k.replacedByKeyId ? byId.get(k.replacedByKeyId) : undefined}
                previous={previousOf(k)}
                pipelineName={pipelineName}
                onRotate={() => setRotating(k)}
                onRevoke={() => setRevoking(k)}
              />
            ))}
          </ul>
        </>
      )}

      {creating && (
        <CreateKeyModal
          rede={rede}
          pipelines={pipelines}
          pipelinesError={pipelinesError}
          onClose={() => setCreating(false)}
          onCreated={(key, secret) => {
            setRows((rs) => [key, ...rs])
            setCreating(false)
            setShown({ title: `Chave "${key.name}" criada`, secret })
          }}
        />
      )}

      {rotating && (
        <RotateKeyModal
          apiKey={rotating}
          onClose={() => setRotating(null)}
          onRotated={(key, secret, previous) => {
            setRows((rs) => [key, ...rs.map((r) => (r.id === previous.id ? { ...r, ...previous, createdByName: previous.createdByName ?? r.createdByName } : r))])
            setRotating(null)
            setShown({ title: `Chave "${key.name}" trocada`, secret, previous })
          }}
        />
      )}

      {shown && <SecretModal {...shown} onClose={() => setShown(null)} />}

      <ConfirmModal
        open={!!revoking}
        onClose={() => setRevoking(null)}
        onConfirm={() => void confirmRevoke()}
        title={revoking?.revokeUndoesRotation ? 'Revogar a chave nova e desfazer a troca?' : 'Revogar chave?'}
        description={revoking?.revokeUndoesRotation
          ? `A chave anterior${previousOf(revoking) ? ` (${maskedPrefix(previousOf(revoking)!.prefix)})` : ''} volta a valer como antes da troca. Os sistemas que já usam a nova (${maskedPrefix(revoking.prefix)}) passam a receber erro 401 em até 30 segundos.`
          : `Os sistemas que usam "${revoking?.name ?? ''}" (${revoking ? maskedPrefix(revoking.prefix) : ''}) passam a receber erro 401 em até 30 segundos. Não dá para desfazer: para voltar, crie uma chave nova.`}
        confirmLabel={revoking?.revokeUndoesRotation ? 'Revogar e desfazer a troca' : 'Revogar'}
        danger
        loading={revokeBusy}
      />
    </div>
  )
}

function StatusBadge({ k }: { k: ApiKey }) {
  const base = 'inline-flex items-center h-5 px-[7px] rounded-[6px] text-[11px] font-semibold whitespace-nowrap'
  if (k.status === 'active') {
    return <span className={`${base} bg-accent-soft text-accent-dark`}>{k.replacedByKeyId ? 'Em troca' : 'Ativa'}</span>
  }
  return (
    <span className={`${base} bg-[var(--sf2)] border border-surface-700 text-surface-300`}>
      {k.status === 'revoked' ? `Revogada em ${fmt(k.revokedAt)}` : `Expirada em ${fmt(k.expiresAt)}`}
    </span>
  )
}

/** Linha de validade: "Vence em…", "Sem validade", ou a ligação com a chave que a substituiu. */
function ValidityLine({ k, replacement }: { k: ApiKey; replacement?: ApiKey }) {
  if (k.status === 'revoked') return null
  if (k.replacedByKeyId) {
    const nova = replacement
      ? `"${replacement.name}" (${maskedPrefix(replacement.prefix)}${replacement.status === 'revoked' ? ', revogada' : ''})`
      : 'uma chave nova'
    return (
      <span className="inline-flex items-start gap-1.5 text-[12px] text-surface-300" data-testid="api-key-replaced">
        <RefreshCw className="w-3.5 h-3.5 mt-px flex-shrink-0 text-accent-dark" />
        <span className="min-w-0 break-words">
          Substituída por {nova} · {k.status === 'active' ? 'vale até' : 'valeu até'} {fmt(k.expiresAt)}
        </span>
      </span>
    )
  }
  if (k.status === 'expired') {
    return (
      <span className="text-[12px] text-surface-300">Parou de funcionar em {fmt(k.expiresAt)}. Crie uma chave nova para voltar.</span>
    )
  }
  if (!k.expiresAt) return <span className="text-[12px] text-surface-400">Sem validade</span>
  const dias = daysUntil(k.expiresAt)
  const soon = dias <= EXPIRING_SOON_DAYS
  return (
    <span className="inline-flex items-start gap-1.5 text-[12px] text-surface-300" data-testid="api-key-expiry">
      {soon
        ? <AlertTriangle className="w-3.5 h-3.5 mt-px flex-shrink-0 text-warning" />
        : <Clock className="w-3.5 h-3.5 mt-px flex-shrink-0 text-surface-400" />}
      <span className={soon ? 'font-medium text-surface-100' : undefined}>
        Vence em {fmt(k.expiresAt)} ({dias === 0 ? 'menos de 1 dia' : diasTxt(dias)}){soon ? ' — troque a chave antes disso' : ''}
      </span>
    </span>
  )
}

function KeyRow({ k, replacement, previous, pipelineName, onRotate, onRevoke }: {
  k: ApiKey
  replacement?: ApiKey
  /** A chave que esta substituiu (enquanto a troca está de pé). */
  previous?: ApiKey
  pipelineName: Map<string, string>
  onRotate: () => void
  onRevoke: () => void
}) {
  const inactive = k.status !== 'active'
  return (
    <li className="px-3.5 py-3 flex flex-col sm:flex-row sm:items-start gap-2.5 sm:gap-3" data-testid="api-key-row">
      <div className="min-w-0 flex-1 flex flex-col gap-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-[13px] font-semibold break-words min-w-0 ${inactive ? 'text-surface-300' : 'text-surface-100'}`}>{k.name}</span>
          <StatusBadge k={k} />
          {k.networkWide && (
            <span className="inline-flex items-center gap-1 h-5 px-[7px] rounded-[6px] text-[11px] font-semibold whitespace-nowrap border border-surface-700 text-surface-200" data-testid="api-key-network">
              <Network className="w-3 h-3 text-accent-dark" /> Da rede
            </span>
          )}
        </div>
        <span className="font-mono text-[12px] text-surface-400 break-all">{maskedPrefix(k.prefix)}</span>
        <span className="text-[12px] text-surface-300 break-words">
          {k.scopes.map((s) => SCOPE_LABEL.get(s) ?? s).join(' · ')}
          <span className="text-surface-400">
            {' — funis: '}
            {k.pipelineIds ? k.pipelineIds.map((id) => pipelineName.get(id) ?? 'Funil removido').join(', ') : 'todos'}
          </span>
        </span>
        <ValidityLine k={k} replacement={replacement} />
        {k.revokeUndoesRotation && previous && (
          <span className="text-[12px] text-surface-400" data-testid="api-key-undo-hint">
            Nova chave da troca de {maskedPrefix(previous.prefix)}: revogá-la desfaz a troca.
          </span>
        )}
        <span className="text-[11.5px] text-surface-400">
          Criada por {k.createdByName ?? '—'} em {fmt(k.createdAt)} · Último uso: {k.lastUsedAt ? fmt(k.lastUsedAt) : 'nunca'}
        </span>
      </div>
      {k.status === 'active' && (
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Em troca: a nova já existe — só dá para encerrar a antiga antes da hora. */}
          {!k.replacedByKeyId && (
            <Button
              size="sm"
              variant="secondary"
              className="h-7 px-2.5 text-xs"
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
              onClick={onRotate}
            >
              Trocar chave
            </Button>
          )}
          <Button size="sm" variant="neutral" className="h-7 px-2.5 text-xs" onClick={onRevoke}>
            Revogar
          </Button>
        </div>
      )}
    </li>
  )
}

function CreateKeyModal({ rede, pipelines, pipelinesError, onClose, onCreated }: {
  /** Só a conta da rede pode criar chave da rede. */
  rede: MinhaRede | null
  pipelines: PipelineOption[]
  pipelinesError: boolean
  onClose: () => void
  onCreated: (key: ApiKey, secret: string) => void
}) {
  const [name, setName] = useState('')
  const [scopes, setScopes] = useState<ApiKeyScope[]>(['contacts:read', 'contacts:write'])
  const [restrict, setRestrict] = useState(false)
  const [pipelineIds, setPipelineIds] = useState<string[]>([])
  const [validity, setValidity] = useState('')
  const [networkWide, setNetworkWide] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // O backend recusa chave da rede sem "Ler métricas" (network_wide_requires_metrics).
  const networkOk = !networkWide || scopes.includes('metrics:read')
  const canSubmit = name.trim().length > 0 && scopes.length > 0 && (!restrict || pipelineIds.length > 0) && networkOk

  function toggleNetworkWide() {
    const next = !networkWide
    setNetworkWide(next)
    if (next) setScopes((cur) => (cur.includes('metrics:read') ? cur : [...cur, 'metrics:read']))
  }
  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v])

  async function submit() {
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)
    try {
      const { key, secret } = await apiKeysApi.create({
        name: name.trim(),
        scopes,
        pipelineIds: restrict ? pipelineIds : null,
        ...(validity ? { expiresInDays: Number(validity) } : {}),
        ...(rede && networkWide ? { networkWide: true } : {}),
      })
      onCreated(key, secret)
    } catch (e) {
      setError(getApiErrorMessage(e, 'Não foi possível criar a chave.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open
      onClose={submitting ? () => {} : onClose}
      className="max-w-[480px]"
      title="Nova chave de API"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="neutral" onClick={onClose} disabled={submitting}>Cancelar</Button>
          <Button onClick={() => void submit()} disabled={!canSubmit} loading={submitting} data-testid="api-keys-create">
            Criar chave
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <FormField label="Nome" required hint="Para reconhecer quem usa a chave. Ex.: n8n, site, ERP.">
          <Input value={name} maxLength={80} onChange={(e) => setName(e.target.value)} placeholder="Ex.: n8n" autoFocus />
        </FormField>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-[12.5px] font-medium text-surface-200 mb-1">Permissões</legend>
          {SCOPE_OPTIONS.map((s) => {
            // Na chave da rede, "Ler métricas" é obrigatória: fica marcada e travada.
            const locked = networkWide && s.value === 'metrics:read'
            return (
              <label key={s.value} className={`flex items-start gap-2.5 ${locked ? 'cursor-default' : 'cursor-pointer'}`}>
                <Checkbox
                  className="mt-0.5"
                  checked={scopes.includes(s.value)}
                  disabled={locked}
                  onChange={() => setScopes((cur) => toggle(cur, s.value))}
                  data-testid={`api-keys-scope-${s.value}`}
                />
                <span className="flex flex-col">
                  <span className="text-[12.5px] text-surface-100">{s.label}</span>
                  <span className="text-[11.5px] text-surface-400">{locked ? 'Obrigatória na chave da rede' : s.hint}</span>
                </span>
              </label>
            )
          })}
        </fieldset>

        {rede && (
          <fieldset className="flex flex-col gap-2">
            <legend className="text-[12.5px] font-medium text-surface-200 mb-1">Alcance</legend>
            <label className="flex items-start gap-2.5 cursor-pointer">
              <Checkbox className="mt-0.5" checked={networkWide} onChange={toggleNetworkWide} data-testid="api-keys-network-wide" />
              <span className="flex flex-col">
                <span className="text-[12.5px] text-surface-100">Chave da rede</span>
                <span className="text-[11.5px] text-surface-400">
                  Lê as métricas de todas as unidades da rede {rede.nome}. Contatos e negócios continuam só desta conta.
                </span>
              </span>
            </label>
          </fieldset>
        )}

        {pipelinesError && (
          <p className="flex items-start gap-1.5 text-[12px] text-surface-200" role="status" data-testid="api-keys-pipelines-error">
            <AlertTriangle className="w-3.5 h-3.5 mt-px flex-shrink-0 text-warning" />
            <span>Não foi possível carregar os funis: esta chave valerá para todos os funis. Para restringir, feche e tente de novo.</span>
          </p>
        )}
        {pipelines.length > 0 && (
          <fieldset className="flex flex-col gap-2">
            <legend className="text-[12.5px] font-medium text-surface-200 mb-1">Funis</legend>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <Checkbox checked={restrict} onChange={() => setRestrict((r) => !r)} />
              <span className="text-[12.5px] text-surface-100">Restringir a alguns funis</span>
            </label>
            {restrict && (
              <div className="flex flex-col gap-1.5 pl-6">
                {pipelines.map((p) => (
                  <label key={p.id} className="flex items-center gap-2.5 cursor-pointer">
                    <Checkbox checked={pipelineIds.includes(p.id)} onChange={() => setPipelineIds((cur) => toggle(cur, p.id))} />
                    <span className="text-[12.5px] text-surface-300">{p.name}</span>
                  </label>
                ))}
                <p className="text-[11.5px] text-surface-400">Contatos não são restringidos por funil.</p>
              </div>
            )}
          </fieldset>
        )}

        <FormField
          label="Validade"
          hint={validity
            ? 'Depois desse prazo a chave para de funcionar. Troque-a antes de vencer, sem queda.'
            : 'A chave vale até ser revogada. Uma validade obriga a troca periódica, o que é mais seguro.'}
        >
          <Select value={validity} onChange={(e) => setValidity(e.target.value)} data-testid="api-keys-validity">
            {VALIDITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
        </FormField>

        {error && <p className="text-[12.5px] text-danger" role="alert">{error}</p>}
      </div>
    </Modal>
  )
}

function RotateKeyModal({ apiKey, onClose, onRotated }: {
  apiKey: ApiKey
  onClose: () => void
  onRotated: (key: ApiKey, secret: string, previous: ApiKey) => void
}) {
  const [overlap, setOverlap] = useState(DEFAULT_ROTATION_OVERLAP_DAYS)
  const [validity, setValidity] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Sem escolha, o backend dá à nova a mesma duração da atual (ou nenhuma).
  const sameDurationDays = apiKey.expiresAt
    ? Math.max(1, Math.round((new Date(apiKey.expiresAt).getTime() - new Date(apiKey.createdAt).getTime()) / DAY_MS))
    : null
  const sameLabel = sameDurationDays ? `Mesma da atual (${diasTxt(sameDurationDays)})` : 'Sem validade (igual à atual)'
  // A janela nunca estica a validade da antiga: vale o que vier primeiro.
  const expiresFirst = apiKey.expiresAt && overlap > 0 && daysUntil(apiKey.expiresAt) < overlap

  async function submit() {
    setSubmitting(true)
    setError(null)
    try {
      const { key, secret, previous } = await apiKeysApi.rotate(apiKey.id, {
        overlapDays: overlap,
        ...(validity ? { expiresInDays: Number(validity) } : {}),
      })
      onRotated(key, secret, previous)
    } catch (e) {
      setError(getApiErrorMessage(e, 'Não foi possível trocar a chave.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open
      onClose={submitting ? () => {} : onClose}
      className="max-w-[480px]"
      title={`Trocar a chave "${apiKey.name}"`}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="neutral" onClick={onClose} disabled={submitting}>Cancelar</Button>
          <Button onClick={() => void submit()} loading={submitting} data-testid="api-keys-rotate-confirm">
            Trocar chave
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-[12.5px] text-surface-300">
          Uma chave nova é criada com o mesmo nome, permissões e funis. A atual ({maskedPrefix(apiKey.prefix)}) continua
          funcionando pelo prazo abaixo, para você atualizar o sistema sem queda.
        </p>
        <FormField
          label="A chave atual ainda vale por"
          hint={overlap === 0
            ? 'Os sistemas que usam a chave atual passam a receber erro 401 em até 30 segundos.'
            : expiresFirst
              ? `A chave atual já vence antes disso, em ${fmt(apiKey.expiresAt)}; vale essa data.`
              : 'Depois disso, só a chave nova funciona.'}
        >
          <Select value={String(overlap)} onChange={(e) => setOverlap(Number(e.target.value))} data-testid="api-keys-overlap">
            {OVERLAP_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
        </FormField>
        <FormField label="Validade da chave nova">
          <Select value={validity} onChange={(e) => setValidity(e.target.value)} data-testid="api-keys-rotate-validity">
            <option value="">{sameLabel}</option>
            {VALIDITY_OPTIONS.filter((o) => o.value).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
        </FormField>
        {error && <p className="text-[12.5px] text-danger" role="alert">{error}</p>}
      </div>
    </Modal>
  )
}

const KEEP_OPEN = () => {}

function SecretModal({ title, secret, previous, onClose }: ShownSecret & { onClose: () => void }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(secret)
      setCopied(true)
      showToast('Chave copiada.')
    } catch {
      showToast('Não foi possível copiar. Selecione o texto e copie manualmente.', 'error')
    }
  }

  // Revisão D: Esc ou um clique fora fechavam o modal e a chave se perdia para
  // sempre (não é exibida de novo). Só o botão "Já guardei a chave" fecha.
  return (
    <Modal
      open
      onClose={KEEP_OPEN}
      className="max-w-[520px]"
      title={title}
      footer={
        <div className="flex justify-end">
          <Button onClick={onClose}>Já guardei a chave</Button>
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-start gap-2.5 p-3 rounded-lg border border-warning/30 bg-warning/10 text-[12.5px] text-surface-100">
          <ShieldAlert className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
          <p>Copie e guarde esta chave agora: ela <strong>não será exibida de novo</strong>. Quem tiver a chave age com o poder de administrador nas permissões escolhidas.</p>
        </div>
        <div className="flex flex-col min-[420px]:flex-row min-[420px]:items-center gap-2">
          <code className="flex-1 min-w-0 break-all rounded-sm border border-[var(--bd2)] bg-surface-800 px-2.5 py-2 font-mono text-[12px] text-surface-100 select-all" data-testid="api-key-secret">
            {secret}
          </code>
          <Button variant="neutral" size="sm" className="self-end min-[420px]:self-auto" onClick={() => void copy()} leftIcon={copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}>
            {copied ? 'Copiada' : 'Copiar'}
          </Button>
        </div>
        {previous && (
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-accent-soft text-[12.5px] text-surface-100" data-testid="api-key-previous-until">
            <Clock className="w-4 h-4 text-accent-dark flex-shrink-0 mt-0.5" />
            <p>
              {previous.status === 'active'
                ? <>A chave anterior ({maskedPrefix(previous.prefix)}) continua valendo até <strong>{fmt(previous.expiresAt)}</strong>. Atualize o sistema antes disso.</>
                : <>A chave anterior ({maskedPrefix(previous.prefix)}) já parou de funcionar. Atualize o sistema agora.</>}
            </p>
          </div>
        )}
        <p className="text-[11.5px] text-surface-400">
          Use no header <code className="font-mono">Authorization: Bearer &lt;chave&gt;</code>.
        </p>
      </div>
    </Modal>
  )
}
