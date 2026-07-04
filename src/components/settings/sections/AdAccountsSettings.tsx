import { useState, useEffect, useCallback } from 'react'
import {
  Megaphone, RefreshCw, Trash2, CheckCircle2, PlusCircle,
  Loader2, ChevronDown, ChevronUp,
} from 'lucide-react'
import { adAccountsApi } from '@/services/api'
import { ConfirmModal } from '@/components/ui/Modal'
import { Banner } from '@/components/ui/Banner'
import type { AdAccount, AdCampaignMetrics, AdPlatform } from '@/types'
import { cn } from '@/lib/utils'

// ── Connect Drawer ────────────────────────────────────────────────────────────

function ConnectDrawer({
  platform,
  onClose,
  onConnect,
}: {
  platform: AdPlatform
  onClose: () => void
  onConnect: (account: AdAccount) => void
}) {
  const [accountId, setAccountId] = useState('')
  const [token, setToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const isMeta = platform === 'meta'

  const handleConnect = async () => {
    if (!accountId.trim()) { setError('Informe o ID da conta'); return }
    setError('')
    setLoading(true)
    try {
      const res = await adAccountsApi.connectMeta({ accessToken: token, accountId: accountId.trim() })
      onConnect(res.data)
    } catch {
      setError('Falha ao conectar. Verifique os dados e tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-sm bg-surface-950 border-l border-surface-800 z-50 flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-800">
          <p className="text-sm font-semibold text-surface-100">
            Conectar {isMeta ? 'Meta Ads' : 'Google Ads'}
          </p>
          <button onClick={onClose} className="p-1.5 rounded-lg text-surface-500 hover:text-surface-200 hover:bg-surface-800 transition-colors">
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-6 space-y-4">
          <div className="p-4 rounded-xl border border-surface-800 bg-surface-900 text-xs text-surface-400 space-y-2">
            {isMeta ? (
              <>
                <p>1. Acesse o <strong className="text-surface-300">Meta Business Manager</strong> e crie um token de acesso com permissão <code className="text-brand-400">ads_read</code></p>
                <p>2. Informe o ID da conta de anúncios (formato: <code className="text-brand-400">act_XXXXXXXXXX</code>)</p>
                <p>3. Clique em Conectar — a plataforma importará suas campanhas automaticamente</p>
              </>
            ) : (
              <>
                <p>1. Acesse o <strong className="text-surface-300">Google Ads Manager</strong> e gere um código de autorização OAuth</p>
                <p>2. Informe o ID do cliente Google Ads (formato: <code className="text-brand-400">XXX-XXX-XXXX</code>)</p>
                <p>3. Clique em Conectar — a plataforma importará suas campanhas automaticamente</p>
              </>
            )}
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-surface-300 uppercase tracking-wide block mb-1.5">
                ID da Conta
              </label>
              <input
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                placeholder={isMeta ? 'act_1234567890' : '123-456-7890'}
                className="w-full bg-surface-900 border border-surface-800 rounded-lg px-3 py-2.5 text-sm text-surface-100 placeholder:text-surface-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-colors"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-surface-300 uppercase tracking-wide block mb-1.5">
                {isMeta ? 'Access Token' : 'Código OAuth'}
              </label>
              <input
                value={token}
                onChange={(e) => setToken(e.target.value)}
                type="password"
                placeholder={isMeta ? 'EAAxxxxxxx...' : '4/0AQSTxxxxxx...'}
                className="w-full bg-surface-900 border border-surface-800 rounded-lg px-3 py-2.5 text-sm text-surface-100 placeholder:text-surface-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-colors"
              />
            </div>
          </div>

          {error && (
            <Banner variant="danger">{error}</Banner>
          )}
        </div>

        <div className="px-5 py-4 border-t border-surface-800 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-surface-700 text-surface-300 text-sm font-medium hover:border-surface-600 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => void handleConnect()}
            disabled={loading || !accountId.trim()}
            className="flex-1 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed text-surface-950 text-sm font-semibold transition-colors flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Conectar'}
          </button>
        </div>
      </div>
    </>
  )
}

// ── Connected account card ────────────────────────────────────────────────────

function ConnectedCard({
  account,
  campaigns,
  onDisconnect,
  onSync,
}: {
  account: AdAccount
  campaigns: AdCampaignMetrics[]
  onDisconnect: () => void
  onSync: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [confirmDisconnect, setConfirmDisconnect] = useState(false)
  const color = account.platform === 'meta' ? '#1877f2' : '#EA4335'

  const handleSync = async () => {
    setSyncing(true)
    try { await onSync() } finally { setSyncing(false) }
  }

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  return (
    <div className="rounded-xl border border-surface-800 overflow-hidden">
      <div className="px-5 py-4 flex items-center gap-3 bg-surface-900">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: color + '1a', color }}>
          <CheckCircle2 className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-surface-100">{account.accountName}</p>
          <p className="text-xs text-surface-500 font-mono">{account.accountId}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void handleSync()}
            disabled={syncing}
            className="p-2 rounded-lg border border-surface-700 text-surface-400 hover:text-surface-200 hover:border-surface-600 transition-colors"
            title="Sincronizar"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', syncing && 'animate-spin')} />
          </button>
          <button
            onClick={() => setConfirmDisconnect(true)}
            className="p-2 rounded-lg border border-danger/30 text-danger/60 hover:text-danger hover:border-danger/60 transition-colors"
            title="Desconectar"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <ConfirmModal
            open={confirmDisconnect}
            onClose={() => setConfirmDisconnect(false)}
            onConfirm={() => { onDisconnect(); setConfirmDisconnect(false) }}
            title="Desconectar conta de anúncios"
            description="Esta ação é irreversível. A integração será removida e os dados de campanhas vinculadas não estarão mais disponíveis."
            confirmLabel="Desconectar"
            danger
          />
        </div>
      </div>

      <div className="px-5 py-2.5 border-t border-surface-800 flex items-center justify-between text-xs text-surface-500">
        <span>Última sincronização: {account.lastSyncAt ? fmt(account.lastSyncAt) : '—'}</span>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-surface-400 hover:text-surface-200 transition-colors"
        >
          {campaigns.length} campanhas
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {expanded && campaigns.length > 0 && (
        <div className="border-t border-surface-800 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-surface-800">
                <th className="text-left px-5 py-2.5 text-surface-500 font-medium">Campanha</th>
                <th className="text-right px-3 py-2.5 text-surface-500 font-medium">Invest.</th>
                <th className="text-right px-3 py-2.5 text-surface-500 font-medium">Leads</th>
                <th className="text-right px-3 py-2.5 text-surface-500 font-medium">CPL</th>
                <th className="text-right px-3 py-2.5 text-surface-500 font-medium">ROAS</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.platformCampaignId} className="border-b border-surface-800/50 hover:bg-surface-800/30">
                  <td className="px-5 py-2 text-surface-300 truncate max-w-[200px]">{c.platformCampaignName}</td>
                  <td className="px-3 py-2 text-right text-surface-400 tabular-nums">R$ {c.spend.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</td>
                  <td className="px-3 py-2 text-right text-surface-400 tabular-nums">{c.leadsGenerated}</td>
                  <td className="px-3 py-2 text-right text-surface-400 tabular-nums">R$ {c.cpl.toFixed(2)}</td>
                  <td className="px-3 py-2 text-right tabular-nums font-medium" style={{ color: (c.roas ?? 0) > 5 ? 'var(--color-accent-green)' : 'var(--color-status-muted)' }}>
                    {c.roas ? c.roas.toFixed(1) + 'x' : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Platform Tab ──────────────────────────────────────────────────────────────

function PlatformTab({ platform, accounts, onAccountsChange }: {
  platform: AdPlatform
  accounts: AdAccount[]
  onAccountsChange: (accounts: AdAccount[]) => void
}) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [campaigns, setCampaigns] = useState<Record<string, AdCampaignMetrics[]>>({})
  const isMeta = platform === 'meta'
  const color = isMeta ? '#1877f2' : '#EA4335'
  const platAccounts = accounts.filter((a) => a.platform === platform)

  useEffect(() => {
    platAccounts.forEach((acc) => {
      if (!campaigns[acc.id]) {
        adAccountsApi.getCampaigns(acc.id)
          .then((r) => setCampaigns((prev) => ({ ...prev, [acc.id]: r.data })))
          .catch(() => {})
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accounts])

  const handleConnect = (account: AdAccount) => {
    onAccountsChange([...accounts, account])
    setDrawerOpen(false)
  }

  const handleDisconnect = async (id: string) => {
    await adAccountsApi.disconnect(id)
    onAccountsChange(accounts.filter((a) => a.id !== id))
  }

  const handleSync = async (id: string) => {
    const res = await adAccountsApi.sync(id)
    onAccountsChange(accounts.map((a) => a.id === id ? { ...a, lastSyncAt: res.data.syncedAt } : a))
    const campsRes = await adAccountsApi.getCampaigns(id)
    setCampaigns((prev) => ({ ...prev, [id]: campsRes.data }))
  }

  return (
    <div className="space-y-4">
      {platAccounts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-surface-700 p-8 flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: color + '15', color }}>
            <Megaphone className="w-6 h-6" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-surface-200">
              Nenhuma conta {isMeta ? 'Meta Ads' : 'Google Ads'} conectada
            </p>
            <p className="text-xs text-surface-500 mt-1 max-w-xs">
              {isMeta
                ? 'Conecte sua conta do Meta Ads para rastrear leads gerados por anúncios CTWA (Click-to-WhatsApp) no CRM.'
                : 'Conecte sua conta do Google Ads para rastrear leads via UTM parameters no CRM.'}
            </p>
          </div>
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold transition-colors"
            style={{ backgroundColor: color }}
          >
            <PlusCircle className="w-4 h-4" />
            Conectar {isMeta ? 'Meta Ads' : 'Google Ads'}
          </button>
        </div>
      ) : (
        <>
          {platAccounts.map((acc) => (
            <ConnectedCard
              key={acc.id}
              account={acc}
              campaigns={campaigns[acc.id] ?? []}
              onDisconnect={() => void handleDisconnect(acc.id)}
              onSync={() => handleSync(acc.id)}
            />
          ))}
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex items-center gap-2 text-sm text-surface-400 hover:text-surface-200 transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            Adicionar outra conta
          </button>
        </>
      )}

      {drawerOpen && (
        <ConnectDrawer
          platform={platform}
          onClose={() => setDrawerOpen(false)}
          onConnect={handleConnect}
        />
      )}
    </div>
  )
}

// ── Main Settings Component ───────────────────────────────────────────────────

export function AdAccountsSettings() {
  const [accounts, setAccounts] = useState<AdAccount[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await adAccountsApi.list()
      setAccounts(res.data)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { void load() }, [load])

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-lg font-bold text-surface-100">Contas de Anúncios</h2>
        <p className="text-sm text-surface-400 mt-1">
          Conecte sua conta do Meta Ads para rastrear a origem dos leads via CTWA (Click-to-WhatsApp) no CRM e medir o ROAS real.
        </p>
      </div>

      <div className="flex items-center gap-2 border-b border-surface-800 pb-3">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-md"
          style={{ backgroundColor: '#1877f21a', color: '#1877f2' }}>
          Meta Ads
        </span>
        <span className="text-xs text-surface-500">Google Ads disponível em breve</span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 text-brand-400 animate-spin" />
        </div>
      ) : (
        <PlatformTab
          platform="meta"
          accounts={accounts}
          onAccountsChange={setAccounts}
        />
      )}
    </div>
  )
}
