import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, AlertCircle, Package, RefreshCw, Search } from 'lucide-react'
import { productsApi, agentCatalogApi } from '@/services/api'
import type { Product } from '@/types'
import { EmptyState } from '@/components/ui/EmptyState'
import { Switch } from '@/components/ui/Switch'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/contexts/AuthContext'
import { isAdminTier } from '@/lib/roleHelpers'
import { cn } from '@/lib/utils'
import { useTamanhoDeToque } from './pagina/useToque'

interface Props {
  agentId: string
  /** Página do agente: toda gravação passa pelo salvamento único dela. */
  salvar?: <T>(tarefa: () => Promise<T>) => Promise<T>
  /** Avisado depois de cada gravação (o resumo da navegação conta os itens). */
  onMudou?: () => void
}

type SaveState = 'idle' | 'saving' | 'error'

/** Menor preço do produto (em centavos), para o resumo "a partir de R$ X". */
function fromPriceCents(product: Product): number | null {
  const pagos = (product.priceVariations ?? []).map((v) => v.amountCents).filter((c) => c > 0)
  return pagos.length ? Math.min(...pagos) : null
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
        active ? 'bg-brand-600/10 border-brand-500/30' : 'bg-surface-900 border-surface-700',
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-surface-100 truncate">{product.name}</span>
          {!product.active && (
            <span className="text-3xs font-semibold px-1.5 py-0.5 rounded-2xs bg-surface-800 text-surface-400 flex-shrink-0">
              inativo
            </span>
          )}
        </div>
        <span className="block text-xs text-surface-500">
          {product.category}
          {/* Celular: o preço desce para baixo do nome, que deixa de ser cortado. */}
          {price !== null && <span className="sm:hidden">{product.category ? ' · ' : ''}a partir de {formatBRL(price)}</span>}
        </span>
      </div>
      {price !== null && (
        <span className="hidden text-xs text-surface-400 flex-shrink-0 sm:inline">a partir de {formatBRL(price)}</span>
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
 * oferecer. Só os ativos entram no contexto da IA, e só quando FF_CATALOG_INJECTION está
 * ligada no agent-server (desligada por padrão) — a SecaoCatalogo avisa quando não entram.
 *
 * Auto-save: cada toggle grava na hora. Os saves são serializados (um PUT por vez) — se o
 * usuário clica durante um save em andamento, uma nova rodada roda no fim com o estado final.
 * Leitura para todos; alternar só admin (espelha o catálogo de produtos).
 */
export function AgentCatalogTab({ agentId, salvar, onMudou }: Props) {
  const tam = useTamanhoDeToque()
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
        const ids = [...selectedRef.current]
        const res = salvar ? await salvar(() => agentCatalogApi.set(agentId, ids)) : await agentCatalogApi.set(agentId, ids)
        // Backend tolerante pode ter ignorado produtos que sumiram (excluídos em outra sessão).
        if (res.data.length !== selectedRef.current.size) diverged = true
      } while (pendingRef.current)
      setSaveState('idle')
      onMudou?.()
    } catch {
      setSaveState('error')
    } finally {
      savingRef.current = false
    }
    if (diverged) void reload(true) // re-sincroniza a tela tirando o produto que sumiu
  }, [agentId, reload, salvar, onMudou])

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
        <AlertCircle className="w-6 h-6 text-danger" />
        <p className="text-sm text-surface-400">{loadError}</p>
        <Button variant="neutral" size={tam} leftIcon={<RefreshCw className="w-3.5 h-3.5" />} onClick={() => reload()}>
          Tentar de novo
        </Button>
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
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-500" aria-hidden />
          <Input
            aria-label="Buscar produto"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar produto ou categoria"
            className="pl-8"
          />
        </div>
        {canManage && (
          <div className="flex-shrink-0 text-xs">
            {saveState === 'error' ? (
              <Button variant="ghost" size={tam} className="text-danger hover:text-danger" leftIcon={<AlertCircle className="w-3.5 h-3.5" />} onClick={() => void persist()}>
                Não salvou — tentar de novo
              </Button>
            ) : salvar ? null : saveState === 'saving' ? (
              <span className="inline-flex items-center gap-1.5 text-surface-500">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Salvando…
              </span>
            ) : (
              <span className="text-surface-500">Salvo automaticamente</span>
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
            <p className="text-xs text-surface-400 px-3 py-4 rounded-lg border border-dashed border-[var(--bd2)]">
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
            <p className="text-xs text-surface-400 px-3 py-4 rounded-lg border border-dashed border-[var(--bd2)]">
              {search
                ? 'Nenhum produto disponível corresponde à busca.'
                : 'Todos os produtos já estão ativos neste agente.'}
            </p>
          )}
        </div>
      </section>

      {!canManage && (
        <p className="text-xs text-surface-400">
          Apenas administradores podem alterar o catálogo do agente.
        </p>
      )}
    </div>
  )
}
