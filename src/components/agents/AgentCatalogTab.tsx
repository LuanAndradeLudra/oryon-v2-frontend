import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, AlertCircle, Package, RefreshCw, Search, Check } from 'lucide-react'
import { productsApi, agentCatalogApi } from '@/services/api'
import type { Product } from '@/types'
import { EmptyState } from '@/components/ui/EmptyState'
import { Switch } from '@/components/ui/Switch'
import { useAuth } from '@/contexts/AuthContext'
import { isAdminTier } from '@/lib/roleHelpers'
import { cn } from '@/lib/utils'

interface Props {
  agentId: string
}

type SaveState = 'idle' | 'saving' | 'error'

/** Menor preço do produto (em centavos), para o resumo "a partir de R$ X". */
function fromPriceCents(product: Product): number | null {
  if (!product.priceVariations?.length) return null
  return Math.min(...product.priceVariations.map((v) => v.amountCents))
}

function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

/**
 * Linha de um produto com toggle. `layout` faz a linha deslizar suavemente quando muda de
 * seção (Ativos ↔ Disponíveis) ou quando um vizinho sai/entra.
 */
function ProductRow({
  product,
  active,
  canManage,
  onToggle,
}: {
  product: Product
  active: boolean
  canManage: boolean
  onToggle: (id: string) => void
}) {
  const price = fromPriceCents(product)
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.15 }}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-lg border',
        active ? 'bg-brand-600/10 border-brand-500/30' : 'bg-surface-900 border-surface-800',
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-surface-100 truncate">{product.name}</span>
          {!product.active && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-800 text-surface-500 flex-shrink-0">
              inativo
            </span>
          )}
        </div>
        {product.category && <span className="text-xs text-surface-500">{product.category}</span>}
      </div>
      {price !== null && (
        <span className="text-xs text-surface-400 flex-shrink-0">a partir de {formatBRL(price)}</span>
      )}
      <Switch checked={active} onChange={() => onToggle(product.id)} disabled={!canManage} />
    </motion.div>
  )
}

/** Cabeçalho de uma seção (rótulo + contador). */
function SectionHeader({ label, count, accent }: { label: string; count: number; accent?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          'text-xs font-semibold uppercase tracking-wider',
          accent ? 'text-brand-400' : 'text-surface-400',
        )}
      >
        {label}
      </span>
      <span className="text-xs text-surface-500">{count}</span>
    </div>
  )
}

/**
 * Aba "Catálogo" do agente (SCRUM-222): escolhe quais produtos do tenant este agente pode
 * oferecer. Só os ativos serão injetados no contexto da IA (consumo no card 139).
 *
 * Auto-save: cada toggle grava na hora. Os saves são serializados (um PUT por vez) — se o
 * usuário clica durante um save em andamento, uma nova rodada roda no fim com o estado final.
 * Leitura para todos; alternar só admin (espelha o catálogo de produtos).
 */
export function AgentCatalogTab({ agentId }: Props) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const canManage = isAdminTier(user?.role)

  const [products, setProducts] = useState<Product[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [search, setSearch] = useState('')

  // O save lê o conjunto da ref (sempre o mais recente). `saving`/`pending` serializam os PUTs.
  const selectedRef = useRef(selected)
  useEffect(() => {
    selectedRef.current = selected
  }, [selected])
  const savingRef = useRef(false)
  const pendingRef = useRef(false)

  const reload = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    setLoadError(null)
    try {
      const [all, linked] = await Promise.all([productsApi.list(), agentCatalogApi.get(agentId)])
      setProducts(all.data)
      setSelected(new Set(linked.data.map((p) => p.id)))
    } catch (err) {
      if (!silent) setLoadError(err instanceof Error ? err.message : String(err))
    } finally {
      if (!silent) setLoading(false)
    }
  }, [agentId])

  useEffect(() => {
    reload()
  }, [reload])

  /**
   * Persiste o conjunto atual. Serializado: se já há um PUT em voo, marca `pending` e a rodada
   * atual reexecuta no fim com o estado mais recente — evita corrida entre saves concorrentes.
   */
  const persist = useCallback(async () => {
    if (savingRef.current) {
      pendingRef.current = true
      return
    }
    savingRef.current = true
    setSaveState('saving')
    let diverged = false
    try {
      do {
        pendingRef.current = false
        const res = await agentCatalogApi.set(agentId, [...selectedRef.current])
        // Backend tolerante pode ter ignorado produtos que sumiram (excluídos em outra sessão).
        if (res.data.length !== selectedRef.current.size) diverged = true
      } while (pendingRef.current)
      setSaveState('idle')
    } catch {
      setSaveState('error')
    } finally {
      savingRef.current = false
    }
    if (diverged) void reload(true) // re-sincroniza a tela tirando o produto que sumiu
  }, [agentId, reload])

  /** Liga/desliga um produto e grava na hora (auto-save). */
  const toggle = useCallback(
    (id: string) => {
      if (!canManage) return
      const next = new Set(selectedRef.current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      selectedRef.current = next // atualiza já, pra o save imediato ler o conjunto certo
      setSelected(next)
      void persist()
    },
    [canManage, persist],
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return products
    return products.filter(
      (p) => p.name.toLowerCase().includes(q) || (p.category ?? '').toLowerCase().includes(q),
    )
  }, [products, search])

  const activeProducts = useMemo(() => filtered.filter((p) => selected.has(p.id)), [filtered, selected])
  const availableProducts = useMemo(
    () => filtered.filter((p) => !selected.has(p.id)),
    [filtered, selected],
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-surface-500">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <AlertCircle className="w-6 h-6 text-red-400" />
        <p className="text-sm text-surface-400">{loadError}</p>
        <button
          onClick={() => reload()}
          className="inline-flex items-center gap-1.5 text-xs text-brand-400 hover:text-brand-300"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Tentar de novo
        </button>
      </div>
    )
  }

  if (!products.length) {
    return (
      <EmptyState
        icon={Package}
        title="Nenhum produto cadastrado"
        hint="Cadastre produtos no catálogo da empresa para escolher o que este agente pode oferecer."
        action={{ label: 'Cadastrar produtos', onClick: () => navigate('/settings/crm-products') }}
      />
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-sm font-semibold text-surface-100">Catálogo do agente</h3>
        <p className="text-xs text-surface-500 mt-0.5">
          Ative os produtos que este agente pode oferecer e citar preços. Só os ativos entram no
          contexto da IA — as alterações são salvas automaticamente.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar produto..."
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-surface-900 border border-surface-800 text-sm text-surface-200 placeholder:text-surface-600 focus:outline-none focus:border-brand-500/50"
          />
        </div>
        {canManage && (
          <div className="flex-shrink-0 text-xs">
            {saveState === 'saving' ? (
              <span className="inline-flex items-center gap-1.5 text-surface-500">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Salvando…
              </span>
            ) : saveState === 'error' ? (
              <button
                onClick={() => void persist()}
                className="inline-flex items-center gap-1.5 text-red-400 hover:text-red-300"
              >
                <AlertCircle className="w-3.5 h-3.5" /> Falha — tentar de novo
              </button>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-surface-500">
                <Check className="w-3.5 h-3.5 text-emerald-400" /> Salvo automaticamente
              </span>
            )}
          </div>
        )}
      </div>

      {/* Ativos no agente */}
      <section className="flex flex-col gap-2">
        <SectionHeader label="Ativos no agente" count={selected.size} accent />
        <div className="flex flex-col gap-1.5">
          <AnimatePresence initial={false}>
            {activeProducts.map((p) => (
              <ProductRow key={p.id} product={p} active canManage={canManage} onToggle={toggle} />
            ))}
          </AnimatePresence>
          {!activeProducts.length && (
            <p className="text-xs text-surface-600 px-3 py-4 rounded-lg border border-dashed border-surface-800 text-center">
              {search
                ? 'Nenhum produto ativo corresponde à busca.'
                : 'Nenhum produto ativo ainda — ative na lista abaixo.'}
            </p>
          )}
        </div>
      </section>

      {/* Disponíveis */}
      <section className="flex flex-col gap-2">
        <SectionHeader label="Disponíveis" count={products.length - selected.size} />
        <div className="flex flex-col gap-1.5">
          <AnimatePresence initial={false}>
            {availableProducts.map((p) => (
              <ProductRow key={p.id} product={p} active={false} canManage={canManage} onToggle={toggle} />
            ))}
          </AnimatePresence>
          {!availableProducts.length && (
            <p className="text-xs text-surface-600 px-3 py-4 rounded-lg border border-dashed border-surface-800 text-center">
              {search
                ? 'Nenhum produto disponível corresponde à busca.'
                : 'Todos os produtos já estão ativos neste agente.'}
            </p>
          )}
        </div>
      </section>

      {!canManage && (
        <p className="text-xs text-surface-600">
          Apenas administradores podem alterar o catálogo do agente.
        </p>
      )}
    </div>
  )
}
