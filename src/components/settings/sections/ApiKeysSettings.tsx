// API e integrações (SCRUM-1219) — chaves da API pública v1.
// Backend: /api-keys (admin ou dono). A API só funciona para o workspace com
// `FF_PUBLIC_API`, ligado pela Oryon; sem o flag a tela explica isso.
// O segredo completo aparece UMA vez, logo depois de criar.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { BookOpen, Check, Copy, KeyRound, Lock, Plus, ShieldAlert } from 'lucide-react'
import { SectionHeader } from '../SectionHeader'
import { Button } from '@/components/ui/Button'
import { Modal, ConfirmModal } from '@/components/ui/Modal'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
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
import { apiKeysApi, apiDocsUrl, type ApiKey, type ApiKeyScope } from '@/services/apiKeysApi'

const SCOPE_OPTIONS: Array<{ value: ApiKeyScope; label: string; hint: string }> = [
  { value: 'contacts:read', label: 'Ler contatos', hint: 'Contatos, etiquetas e campos personalizados' },
  { value: 'contacts:write', label: 'Gravar contatos', hint: 'Criar e editar contatos, etiquetar' },
  { value: 'deals:read', label: 'Ler negócios', hint: 'Funis e negócios' },
  { value: 'deals:write', label: 'Gravar negócios', hint: 'Criar, mover, fechar e reabrir negócios' },
]
const SCOPE_LABEL = new Map(SCOPE_OPTIONS.map((s) => [s.value as string, s.label]))

const dateFmt = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
const fmt = (iso: string | null) => (iso ? dateFmt.format(new Date(iso)) : '—')

interface PipelineOption { id: string; name: string }

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
  const [created, setCreated] = useState<{ name: string; secret: string } | null>(null)
  const [revoking, setRevoking] = useState<ApiKey | null>(null)
  const [revokeBusy, setRevokeBusy] = useState(false)

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

  // "Último uso" muda enquanto a tela está aberta (a integração chama a API):
  // ao voltar para a aba, atualiza a lista em silêncio, sem o esqueleto.
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

  const pipelineName = useMemo(() => new Map(pipelines.map((p) => [p.id, p.name])), [pipelines])
  const activeCount = rows.filter((r) => r.status === 'active').length
  // Ativas primeiro (são as que importam); dentro de cada grupo, a ordem do backend (mais nova antes).
  const sortedRows = useMemo(
    () => [...rows.filter((r) => r.status === 'active'), ...rows.filter((r) => r.status !== 'active')],
    [rows],
  )

  async function confirmRevoke() {
    if (!revoking) return
    setRevokeBusy(true)
    try {
      const updated = await apiKeysApi.revoke(revoking.id)
      setRows((rs) => rs.map((r) => (r.id === updated.id ? { ...r, ...updated, createdByName: r.createdByName } : r)))
      showToast(`Chave "${revoking.name}" revogada.`)
      setRevoking(null)
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
      className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-brand-400 hover:underline"
    >
      <BookOpen className="w-3.5 h-3.5" /> Documentação da API
    </a>
  )

  return (
    <div>
      <SectionHeader
        title="API e integrações"
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
          <p className="text-surface-400">Só administradores e o dono do workspace gerenciam chaves de API.</p>
        </div>
      ) : !enabled ? (
        <div className="flex items-start gap-3 p-4 rounded-lg border border-surface-700 bg-surface-800 text-sm" data-testid="api-keys-disabled">
          <KeyRound className="w-4 h-4 text-surface-500 flex-shrink-0 mt-0.5" />
          <div className="flex flex-col gap-1.5">
            <p className="text-surface-200 font-medium">A API ainda não está liberada para este workspace</p>
            <p className="text-surface-400">
              A liberação é feita pela equipe da Oryon. Fale com seu gerente de conta ou escreva para{' '}
              <a href="mailto:contato@oryon.com.br" className="text-brand-400 hover:underline">contato@oryon.com.br</a>.
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
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs text-surface-400">{activeCount} de 20 chaves ativas</span>
            {docsLink}
          </div>
          <ul className="rounded-lg border border-surface-700 divide-y divide-surface-700">
            {sortedRows.map((k) => (
              <li key={k.id} className="px-3.5 py-3 flex items-start gap-3" data-testid="api-key-row">
                <div className="min-w-0 flex-1 flex flex-col gap-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[13px] font-semibold text-surface-100">{k.name}</span>
                    {k.status === 'active' ? (
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium bg-brand-500/10 text-brand-400">Ativa</span>
                    ) : (
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium bg-surface-700 text-surface-400">
                        Revogada em {fmt(k.revokedAt)}
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-[12px] text-surface-400 break-all">oryon_live_{k.prefix}…</span>
                  <span className="text-[12px] text-surface-300">
                    {k.scopes.map((s) => SCOPE_LABEL.get(s) ?? s).join(' · ')}
                    <span className="text-surface-500">
                      {' — funis: '}
                      {k.pipelineIds ? k.pipelineIds.map((id) => pipelineName.get(id) ?? 'Funil removido').join(', ') : 'todos'}
                    </span>
                  </span>
                  <span className="text-[11.5px] text-surface-500">
                    Criada por {k.createdByName ?? '—'} em {fmt(k.createdAt)} · Último uso: {k.lastUsedAt ? fmt(k.lastUsedAt) : 'nunca'}
                  </span>
                </div>
                {k.status === 'active' && (
                  <Button size="sm" variant="neutral" className="h-7 px-2.5 text-xs flex-shrink-0" onClick={() => setRevoking(k)}>
                    Revogar
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </>
      )}

      {creating && (
        <CreateKeyModal
          pipelines={pipelines}
          pipelinesError={pipelinesError}
          onClose={() => setCreating(false)}
          onCreated={(key, secret) => {
            setRows((rs) => [key, ...rs])
            setCreating(false)
            setCreated({ name: key.name, secret })
          }}
        />
      )}

      {created && <SecretModal name={created.name} secret={created.secret} onClose={() => setCreated(null)} />}

      <ConfirmModal
        open={!!revoking}
        onClose={() => setRevoking(null)}
        onConfirm={() => void confirmRevoke()}
        title="Revogar chave?"
        description={`Os sistemas que usam "${revoking?.name ?? ''}" passam a receber erro 401 em até 30 segundos. Não dá para desfazer: para voltar, crie uma chave nova.`}
        confirmLabel="Revogar"
        danger
        loading={revokeBusy}
      />
    </div>
  )
}

function CreateKeyModal({ pipelines, pipelinesError, onClose, onCreated }: {
  pipelines: PipelineOption[]
  pipelinesError: boolean
  onClose: () => void
  onCreated: (key: ApiKey, secret: string) => void
}) {
  const [name, setName] = useState('')
  const [scopes, setScopes] = useState<ApiKeyScope[]>(['contacts:read', 'contacts:write'])
  const [restrict, setRestrict] = useState(false)
  const [pipelineIds, setPipelineIds] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSubmit = name.trim().length > 0 && scopes.length > 0 && (!restrict || pipelineIds.length > 0)
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
          {SCOPE_OPTIONS.map((s) => (
            <label key={s.value} className="flex items-start gap-2.5 cursor-pointer">
              <Checkbox
                className="mt-0.5"
                checked={scopes.includes(s.value)}
                onChange={() => setScopes((cur) => toggle(cur, s.value))}
              />
              <span className="flex flex-col">
                <span className="text-[12.5px] text-surface-100">{s.label}</span>
                <span className="text-[11.5px] text-surface-500">{s.hint}</span>
              </span>
            </label>
          ))}
        </fieldset>

        {pipelinesError && (
          <p className="text-[12px] text-warning" role="status" data-testid="api-keys-pipelines-error">
            Não foi possível carregar os funis: esta chave valerá para todos os funis. Para restringir, feche e tente de novo.
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
                <p className="text-[11.5px] text-surface-500">Contatos não são restringidos por funil.</p>
              </div>
            )}
          </fieldset>
        )}

        {error && <p className="text-[12.5px] text-danger" role="alert">{error}</p>}
      </div>
    </Modal>
  )
}

const KEEP_OPEN = () => {}

function SecretModal({ name, secret, onClose }: { name: string; secret: string; onClose: () => void }) {
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
      title={`Chave "${name}" criada`}
      footer={
        <div className="flex justify-end">
          <Button onClick={onClose}>Já guardei a chave</Button>
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-start gap-2.5 p-3 rounded-lg border border-warning/30 bg-warning/10 text-[12.5px] text-surface-200">
          <ShieldAlert className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
          <p>Copie e guarde esta chave agora: ela <strong>não será exibida de novo</strong>. Quem tiver a chave age com o poder de administrador nas permissões escolhidas.</p>
        </div>
        <div className="flex items-center gap-2">
          <code className="flex-1 min-w-0 break-all rounded-sm border border-[var(--bd2)] bg-surface-800 px-2.5 py-2 font-mono text-[12px] text-surface-100 select-all" data-testid="api-key-secret">
            {secret}
          </code>
          <Button variant="neutral" size="sm" onClick={() => void copy()} leftIcon={copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}>
            {copied ? 'Copiada' : 'Copiar'}
          </Button>
        </div>
        <p className="text-[11.5px] text-surface-500">
          Use no header <code className="font-mono">Authorization: Bearer &lt;chave&gt;</code>.
        </p>
      </div>
    </Modal>
  )
}
