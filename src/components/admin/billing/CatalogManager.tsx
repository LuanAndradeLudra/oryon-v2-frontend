// ─── Catálogo de planos-modelo e pacotes (SCRUM-1211) ─────────────────────────
// Os planos-modelo são só o ponto de partida do contrato (a Proposta pode
// ajustar tudo). Editar aqui NÃO muda contrato vigente (Termos 4.10) e cada
// alteração fica no histórico (quem, quando, de/para).
// Módulos (B21): ausente = ligado; ao salvar mandamos os 8 explícitos.
// Concorrência: cada PUT leva o `updatedAt` lido (`expectedUpdatedAt`); se
// outra pessoa salvou antes, o backend responde 409 e recarregamos o catálogo.

import { useCallback, useEffect, useState } from 'react'
import { Save, History, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { MoneyInput } from '@/components/ui/MoneyInput'
import { NumberField } from '@/components/ui/NumberField'
import { Switch } from '@/components/ui/Switch'
import { Banner } from '@/components/ui/Banner'
import { ErrorState } from '@/components/ui/ErrorState'
import { SkeletonTable } from '@/components/ui/Skeleton'
import { showToast } from '@/hooks/useToast'
import { getApiErrorMessage } from '@/lib/utils'
import { PLAN_MODULES, PLAN_MODULE_LABEL, explicitModules, isModuleOn } from '@/lib/billingModules'
import { summarizeCatalogChange } from '@/lib/billingCatalog'
import {
  adminBillingApi, ENTITLEMENT_LABELS, formatBRL,
  type CatalogHistoryRow, type CatalogPlan, type CreditPackRow, type EntitlementKeyId,
} from '@/services/adminBillingApi'

const KEYS = Object.keys(ENTITLEMENT_LABELS) as EntitlementKeyId[]

const isConflict = (e: unknown) => (e as { response?: { status?: number } })?.response?.status === 409

interface PlanDraft {
  displayName: string
  priceMonthlyCents: number
  monthlyCredits: number | null
  active: boolean
  entitlements: Partial<Record<EntitlementKeyId, number | null>>
  modules: Record<string, boolean>
  overagePriceCents: number | null
  /**
   * AD3 — `updatedAt` do plano quando o rascunho foi lido. Vai como
   * `expectedUpdatedAt`: depois de salvar OUTRO plano a lista é relida, e usar
   * o `updatedAt` da lista deixava um rascunho velho sobrescrever o colega sem 409.
   */
  updatedAt?: string
}

function toDraft(p: CatalogPlan): PlanDraft {
  const f = (p.features ?? {}) as Record<string, unknown>
  return {
    displayName: p.displayName,
    priceMonthlyCents: p.priceMonthlyCents,
    monthlyCredits: p.monthlyCredits,
    active: p.active,
    entitlements: (f.entitlements as PlanDraft['entitlements']) ?? {},
    modules: explicitModules(f.modules as Record<string, unknown> | undefined),
    overagePriceCents: typeof f.overagePriceCents === 'number' ? (f.overagePriceCents as number) : null,
    updatedAt: p.updatedAt,
  }
}

export function CatalogManager() {
  const [plans, setPlans] = useState<CatalogPlan[] | null>(null)
  const [drafts, setDrafts] = useState<Record<string, PlanDraft>>({})
  const [packs, setPacks] = useState<CreditPackRow[]>([])
  const [newPack, setNewPack] = useState<{ credits: number | null; valueCents: number }>({ credits: null, valueCents: 0 })
  // null = histórico indisponível (o catálogo abre mesmo assim).
  const [history, setHistory] = useState<CatalogHistoryRow[] | null>([])
  const [warnings, setWarnings] = useState<string[]>([])
  const [saving, setSaving] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  const refreshHistory = useCallback(() => {
    adminBillingApi.catalogHistory().then(setHistory).catch(() => setHistory(null))
  }, [])

  // Planos e pacotes são obrigatórios; histórico e avisos são complementares
  // (allSettled) — falha neles não pode travar o catálogo num skeleton eterno.
  const load = useCallback(async () => {
    setLoadError(null)
    try {
      const [p, pk] = await Promise.all([adminBillingApi.listCatalog(), adminBillingApi.packs()])
      setPlans(p)
      setDrafts(Object.fromEntries(p.map((x) => [x.tier, toDraft(x)])))
      setPacks(pk)
    } catch (e) {
      setLoadError(getApiErrorMessage(e, 'Verifique sua conexão e tente novamente.'))
      return
    }
    const [h, w] = await Promise.allSettled([adminBillingApi.catalogHistory(), adminBillingApi.catalogWarnings()])
    setHistory(h.status === 'fulfilled' ? h.value : null)
    if (w.status === 'fulfilled') setWarnings(w.value)
  }, [])
  useEffect(() => { void load() }, [load])

  const setD = (tier: string, patch: Partial<PlanDraft>) => setDrafts((d) => ({ ...d, [tier]: { ...d[tier], ...patch } }))

  async function savePlan(p: CatalogPlan) {
    const { updatedAt, ...d } = drafts[p.tier]
    setSaving(p.tier)
    try {
      const r = await adminBillingApi.upsertPlan(p.tier, {
        ...d, modules: explicitModules(d.modules), expectedUpdatedAt: updatedAt,
      })
      setWarnings(r.warnings ?? [])
      showToast(`Plano-modelo ${d.displayName} salvo. Contratos vigentes não mudam.`, 'success')
      // Relê os planos para o próximo salvamento levar o `updatedAt` novo
      // (os rascunhos dos outros planos continuam como estão).
      const fresh = await adminBillingApi.listCatalog()
      setPlans(fresh)
      const saved = fresh.find((x) => x.tier === p.tier)
      if (saved) setDrafts((cur) => ({ ...cur, [p.tier]: toDraft(saved) }))
      refreshHistory()
    } catch (e) {
      if (isConflict(e)) {
        showToast(getApiErrorMessage(e, 'Outra pessoa salvou este plano antes. Recarregamos o catálogo.'), 'error', undefined, 8000)
        void load()
      } else {
        showToast(getApiErrorMessage(e, 'Não foi possível salvar'), 'error')
      }
    } finally { setSaving(null) }
  }

  async function savePack(credits: number, valueCents: number, active: boolean, expectedUpdatedAt?: string): Promise<boolean> {
    try {
      const r = await adminBillingApi.upsertPack(credits, { valueCents, active, expectedUpdatedAt })
      setWarnings(r.warnings ?? [])
      setPacks(await adminBillingApi.packs())
      refreshHistory()
      showToast('Pacote salvo.', 'success')
      return true
    } catch (e) {
      if (isConflict(e)) {
        showToast(getApiErrorMessage(e, 'Outra pessoa salvou este pacote antes. Recarregamos o catálogo.'), 'error', undefined, 8000)
        void load()
      } else {
        showToast(getApiErrorMessage(e, 'Não foi possível salvar o pacote'), 'error')
      }
      return false
    }
  }

  // AD11 — "Adicionar" é só para pacote NOVO: a mesma quantidade já existe →
  // orientar a editar na tabela (o PUT por quantidade sobrescrevia o pacote
  // existente, sem a proteção 409). E pacote de R$ 0 não é vendável.
  const duplicatePack = newPack.credits != null && packs.some((pk) => pk.credits === newPack.credits)
  const canAddPack = !!newPack.credits && newPack.valueCents > 0 && !duplicatePack
  async function addPack() {
    if (!canAddPack || !newPack.credits) return
    if (await savePack(newPack.credits, newPack.valueCents, true)) setNewPack({ credits: null, valueCents: 0 })
  }

  if (!plans) {
    return loadError
      ? <ErrorState title="Não foi possível carregar o catálogo" hint={loadError} onRetry={() => void load()} retryLabel="Tentar de novo" />
      : <SkeletonTable rows={4} />
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <Banner variant="info">Os planos-modelo são o ponto de partida da Proposta. Alterar aqui vale só para contas NOVAS — cada contrato congela as próprias condições (Termos 4.10).</Banner>
      {warnings.length > 0 && (
        <Banner variant="warning">
          <p className="font-medium flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" />Ordem de preço por crédito (plano &lt; pacote &lt; excedente)</p>
          <ul className="list-disc pl-5 mt-1 space-y-0.5">{warnings.map((w) => <li key={w}>{w}</li>)}</ul>
        </Banner>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {plans.map((p) => {
          const d = drafts[p.tier]
          if (!d) return null
          return (
            <section key={p.tier} className="rounded-2xl border border-surface-800 bg-surface-900/40 p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs uppercase tracking-wider text-surface-500">{p.tier}</p>
                <label className="flex items-center gap-2 text-xs text-surface-400">Ativo <Switch checked={d.active} onChange={(v) => setD(p.tier, { active: v })} /></label>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <label className="space-y-1"><span className="text-xs text-surface-400">Nome</span><Input value={d.displayName} onChange={(e) => setD(p.tier, { displayName: e.target.value })} /></label>
                <label className="space-y-1"><span className="text-xs text-surface-400">Preço mensal</span><MoneyInput value={d.priceMonthlyCents} onChange={(v) => setD(p.tier, { priceMonthlyCents: v })} /></label>
                <label className="space-y-1"><span className="text-xs text-surface-400">Créditos/mês (vazio = ilimitado)</span><NumberField value={d.monthlyCredits} onChange={(v) => setD(p.tier, { monthlyCredits: v })} min={0} /></label>
                <label className="space-y-1"><span className="text-xs text-surface-400">Excedente (centavos/crédito)</span><NumberField value={d.overagePriceCents} onChange={(v) => setD(p.tier, { overagePriceCents: v })} min={0} /></label>
                {KEYS.map((k) => (
                  <label key={k} className="space-y-1">
                    <span className="text-xs text-surface-400">{ENTITLEMENT_LABELS[k]}</span>
                    <NumberField value={d.entitlements[k] ?? null} min={0}
                      onChange={(v) => setD(p.tier, { entitlements: { ...d.entitlements, [k]: v } })} placeholder="ilimitado" />
                  </label>
                ))}
              </div>
              <div className="flex flex-wrap gap-3">
                {PLAN_MODULES.map((m) => (
                  <label key={m} className="flex items-center gap-1.5 text-xs text-surface-300">
                    <Switch checked={isModuleOn(d.modules, m)} onChange={(v) => setD(p.tier, { modules: { ...d.modules, [m]: v } })} />{PLAN_MODULE_LABEL[m]}
                  </label>
                ))}
              </div>
              <div className="flex justify-end">
                <Button size="sm" leftIcon={<Save className="w-3.5 h-3.5" />} loading={saving === p.tier} onClick={() => void savePlan(p)}>Salvar plano-modelo</Button>
              </div>
            </section>
          )
        })}
      </div>

      <section className="rounded-2xl border border-surface-800 p-4 space-y-3 max-w-2xl">
        <h3 className="text-sm font-semibold text-surface-100">Pacotes de créditos</h3>
        <table className="w-full text-sm">
          <thead className="text-xs text-surface-500"><tr><th className="text-left py-1">Créditos</th><th className="text-left py-1">Valor</th><th className="text-left py-1">Por crédito</th><th className="text-left py-1">Ativo</th><th /></tr></thead>
          <tbody className="divide-y divide-surface-800">
            {packs.map((pk) => (
              // A key inclui o updatedAt: depois de recarregar (ex.: 409) a linha
              // remonta com os valores novos em vez de manter o rascunho antigo.
              <PackRow key={`${pk.id}:${pk.updatedAt ?? ''}`} pack={pk} onSave={(value, active) => savePack(pk.credits, value, active, pk.updatedAt)} />
            ))}
          </tbody>
        </table>
        <div className="flex items-end gap-2">
          <label className="space-y-1"><span className="text-xs text-surface-400">Créditos</span><NumberField aria-label="Créditos do pacote novo" value={newPack.credits} onChange={(v) => setNewPack((n) => ({ ...n, credits: v }))} min={1} /></label>
          <label className="space-y-1"><span className="text-xs text-surface-400">Valor</span><MoneyInput aria-label="Valor do pacote novo" value={newPack.valueCents} onChange={(v) => setNewPack((n) => ({ ...n, valueCents: v }))} /></label>
          <Button variant="secondary" disabled={!canAddPack} onClick={() => void addPack()}>Adicionar</Button>
        </div>
        {duplicatePack && (
          <p className="text-xs text-status-pending">Já existe um pacote de {newPack.credits?.toLocaleString('pt-BR')} créditos. Edite o valor na linha dele, na tabela acima.</p>
        )}
        {!duplicatePack && !!newPack.credits && newPack.valueCents <= 0 && (
          <p className="text-xs text-surface-500">Informe o valor do pacote (maior que zero).</p>
        )}
      </section>

      <section className="rounded-2xl border border-surface-800 p-4 max-w-3xl">
        <h3 className="text-sm font-semibold text-surface-100 flex items-center gap-2 mb-3"><History className="w-4 h-4" />Histórico do catálogo</h3>
        {history === null ? (
          <p className="text-xs text-surface-500">
            Histórico indisponível agora.{' '}
            <button type="button" className="underline hover:text-surface-300" onClick={refreshHistory}>Tentar de novo</button>
          </p>
        ) : history.length === 0 ? <p className="text-xs text-surface-500">Nenhuma alteração registrada.</p> : (
          <ul className="space-y-2 text-xs">
            {history.map((h) => (
              <li key={h.id} className="text-surface-400">
                <span className="text-surface-200">{new Date(h.createdAt).toLocaleString('pt-BR')}</span> · {h.entity === 'plan' ? 'Plano' : 'Pacote'} <strong className="text-surface-200">{h.entityKey}</strong>
                {' '}por {h.changedByName ?? 'sistema'} — {summarizeCatalogChange(h.entity, h.before, h.after).join('; ')}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function PackRow({ pack, onSave }: { pack: CreditPackRow; onSave: (valueCents: number, active: boolean) => Promise<boolean> }) {
  const [value, setValue] = useState(pack.valueCents)
  const [active, setActive] = useState(pack.active)
  return (
    <tr>
      <td className="py-2 text-surface-200">{pack.credits.toLocaleString('pt-BR')}</td>
      <td className="py-2"><MoneyInput value={value} onChange={setValue} /></td>
      <td className="py-2 text-surface-400 text-xs">{formatBRL(value / pack.credits)}</td>
      <td className="py-2"><Switch checked={active} onChange={setActive} /></td>
      <td className="py-2 text-right"><Button size="sm" variant="ghost" disabled={value <= 0} onClick={() => void onSave(value, active)}>Salvar</Button></td>
    </tr>
  )
}
