import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Package } from 'lucide-react'
import { ConfirmModal } from '@/components/ui/Modal'
import { Switch } from '@/components/ui/Switch'
import { ProductModal } from '@/components/settings/modals/ProductModal'
import { useToast } from '@/hooks/useToast'
import { ToastContainer } from '@/components/ui/Toast'
import { productsApi } from '@/services/api'
import { useCRMConfig } from '@/contexts/CRMConfigContext'
import { useAuth } from '@/contexts/AuthContext'
import { isAdminTier } from '@/lib/roleHelpers'
import { formatBRL } from '@/utils/money'
import type { Product } from '@/types'

function priceRange(p: Product): string {
  if (!p.priceVariations?.length) return 'Sem preço'
  const cents = p.priceVariations.map((v) => v.amountCents)
  const min = Math.min(...cents)
  const max = Math.max(...cents)
  return min === max ? formatBRL(min) : `${formatBRL(min)} – ${formatBRL(max)}`
}

export function ProductsManager() {
  const { products, refetchProducts } = useCRMConfig()
  const { toast, toasts, dismiss } = useToast()
  const { user: actor } = useAuth()
  // Espelha @Roles(ADMIN, BUSINESS_ADMIN) na escrita de /products. GET é aberto (a lista
  // aparece p/ todos), mas criar/editar/excluir/ativar fica só p/ admin.
  const canManage = isAdminTier(actor?.role)
  const [modalOpen, setModalOpen] = useState(false)
  const [editProduct, setEditProduct] = useState<Product | null>(null)
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null)
  const [deleting, setDeleting] = useState(false)
  // Override otimista de `active` por produto enquanto o PATCH está em voo.
  const [pendingActive, setPendingActive] = useState<Record<string, boolean>>({})

  // Quando a lista recarregada já reflete o valor otimista, descarta o override.
  useEffect(() => {
    setPendingActive((prev) => {
      const next = { ...prev }
      let changed = false
      for (const p of products) {
        if (p.id in next && next[p.id] === p.active) {
          delete next[p.id]
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [products])

  const handleSave = async (data: Partial<Product>) => {
    // Em erro, relança a mensagem do backend para o modal exibi-la inline e permanecer aberto.
    try {
      if (editProduct) {
        await productsApi.update(editProduct.id, data)
        toast('Produto atualizado com sucesso.', 'success')
      } else {
        await productsApi.create(data)
        toast('Produto criado com sucesso.', 'success')
      }
      setModalOpen(false)
      setEditProduct(null)
      refetchProducts()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      throw new Error(
        typeof msg === 'string' ? msg : Array.isArray(msg) ? msg[0] : 'Erro ao salvar produto.',
      )
    }
  }

  const handleDelete = async () => {
    if (!deleteProduct) return
    setDeleting(true)
    try {
      await productsApi.remove(deleteProduct.id)
      toast('Produto excluído.', 'success')
      refetchProducts()
      setDeleteProduct(null)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast(typeof msg === 'string' ? msg : 'Erro ao excluir produto.', 'error')
    } finally {
      setDeleting(false)
    }
  }

  const handleToggleActive = async (p: Product) => {
    if (p.id in pendingActive) return // já há um toggle deste produto em voo
    const next = !p.active
    setPendingActive((prev) => ({ ...prev, [p.id]: next }))
    try {
      await productsApi.update(p.id, { active: next })
      refetchProducts() // o efeito acima limpa o override quando a lista refletir
    } catch {
      setPendingActive((prev) => {
        const copy = { ...prev }
        delete copy[p.id]
        return copy
      })
      toast('Erro ao alterar status.', 'error')
    }
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-surface-100">Produtos</h3>
          <p className="text-xs text-surface-500 mt-0.5">
            Cadastre produtos/serviços e seus preços. É a fonte única que a IA usa para informar valores.
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => {
              setEditProduct(null)
              setModalOpen(true)
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-surface-950 transition-all"
          >
            <Plus className="w-3.5 h-3.5" /> Novo produto
          </button>
        )}
      </div>

      <div className="bg-surface-900 border border-surface-800 rounded-2xl overflow-hidden">
        {products.length === 0 ? (
          <p className="text-sm text-surface-500 text-center py-10">Nenhum produto cadastrado.</p>
        ) : (
          <ul className="divide-y divide-surface-800">
            {products.map((p) => {
              const isActive = pendingActive[p.id] ?? p.active
              return (
                <li
                  key={p.id}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-surface-800/30 transition-colors group"
                >
                  <Package className="w-4 h-4 text-surface-700 flex-shrink-0" />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-surface-100 truncate">{p.name}</span>
                      {p.category && (
                        <span className="text-[10px] text-surface-400 bg-surface-800 border border-surface-700 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                          {p.category}
                        </span>
                      )}
                      {!isActive && (
                        <span className="text-[10px] text-surface-500 border border-surface-700 px-1.5 py-0.5 rounded-full">
                          Inativo
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-surface-500">
                      {priceRange(p)}
                      {p.priceVariations?.length
                        ? ` · ${p.priceVariations.length} ${p.priceVariations.length === 1 ? 'variação' : 'variações'}`
                        : ''}
                    </p>
                  </div>

                  <Switch
                    checked={isActive}
                    onChange={() => handleToggleActive(p)}
                    disabled={!canManage}
                  />

                  {canManage && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => {
                          setEditProduct(p)
                          setModalOpen(true)
                        }}
                        className="p-1.5 rounded-lg text-surface-400 hover:text-surface-100 hover:bg-surface-700 transition-all"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteProduct(p)}
                        className="p-1.5 rounded-lg text-surface-400 hover:text-red-400 hover:bg-red-900/20 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <ProductModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setEditProduct(null)
        }}
        onSave={handleSave}
        editProduct={editProduct}
      />

      <ConfirmModal
        open={!!deleteProduct}
        onClose={() => setDeleteProduct(null)}
        onConfirm={handleDelete}
        title="Excluir produto"
        description={`Tem certeza que deseja excluir "${deleteProduct?.name}"? Ele sairá do catálogo.`}
        confirmLabel="Excluir"
        danger
        loading={deleting}
      />

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </>
  )
}
