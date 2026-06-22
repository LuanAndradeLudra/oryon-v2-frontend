import { useState, useEffect } from 'react'
import { X, Plus } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Switch } from '@/components/ui/Switch'
import { MoneyInput } from '@/components/ui/MoneyInput'
import type { Product, ProductPriceVariation } from '@/types'

interface ProductModalProps {
  open: boolean
  onClose: () => void
  onSave: (data: Partial<Product>) => Promise<void>
  editProduct?: Product | null
}

/** Linha de variação no formulário, com chave estável (`_uid`) para o React. */
type VariationRow = ProductPriceVariation & { _uid: string }

let uidSeq = 0
const makeUid = () => `row-${uidSeq++}`

export function ProductModal({ open, onClose, onSave, editProduct }: ProductModalProps) {
  const [name, setName] = useState('')
  const [sku, setSku] = useState('')
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [active, setActive] = useState(true)
  const [variations, setVariations] = useState<VariationRow[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setName(editProduct?.name ?? '')
      setSku(editProduct?.sku ?? '')
      setCategory(editProduct?.category ?? '')
      setDescription(editProduct?.description ?? '')
      setActive(editProduct?.active ?? true)
      setVariations(
        editProduct?.priceVariations?.map((v) => ({ ...v, _uid: v.id ?? makeUid() })) ?? [],
      )
      setError('')
    }
  }, [open, editProduct])

  const addVariation = () =>
    setVariations([...variations, { label: '', amountCents: 0, _uid: makeUid() }])

  const updateVariation = (index: number, patch: Partial<ProductPriceVariation>) =>
    setVariations(variations.map((v, i) => (i === index ? { ...v, ...patch } : v)))

  const removeVariation = (index: number) =>
    setVariations(variations.filter((_, i) => i !== index))

  const handleSave = async () => {
    if (!name.trim()) {
      setError('O nome do produto é obrigatório.')
      return
    }
    if (!category.trim()) {
      setError('A categoria é obrigatória.')
      return
    }
    // Descarta linhas totalmente vazias; exige rótulo e valor > 0 nas que sobraram.
    const cleaned = variations
      .map((v) => ({ ...v, label: v.label.trim() }))
      .filter((v) => v.label !== '' || v.amountCents > 0)
    if (cleaned.length === 0) {
      setError('Adicione pelo menos uma variação de preço (com rótulo e valor).')
      return
    }
    if (cleaned.some((v) => v.label === '')) {
      setError('Dê um rótulo a todas as variações de preço.')
      return
    }
    if (cleaned.some((v) => v.amountCents <= 0)) {
      setError('Defina um valor maior que zero em cada variação (ou remova a variação).')
      return
    }
    setSaving(true)
    try {
      await onSave({
        name: name.trim(),
        sku: sku.trim() || undefined,
        category: category.trim(),
        description: description.trim() || undefined,
        active,
        priceVariations: cleaned.map((v, index) => ({
          id: v.id,
          label: v.label,
          amountCents: v.amountCents,
          order: index,
        })),
      })
      onClose()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erro ao salvar produto.'
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editProduct ? 'Editar produto' : 'Novo produto'}
      className="max-w-lg"
    >
      <div className="flex flex-col gap-4">
        <FormField label="Nome do produto" requirement="required" error={error}>
          <Input
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              setError('')
            }}
            placeholder="Ex: Consulta, Limpeza, Plano Anual"
            autoFocus
          />
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Categoria" requirement="required">
            <Input
              value={category}
              onChange={(e) => {
                setCategory(e.target.value)
                setError('')
              }}
              placeholder="Ex: Odontologia"
            />
          </FormField>
          <FormField label="SKU / código" requirement="optional">
            <Input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="Ex: CONS-001" />
          </FormField>
        </div>

        <FormField label="Descrição" requirement="optional">
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Detalhes do produto/serviço"
          />
        </FormField>

        <FormField
          label="Variações de preço"
          requirement="required"
          hint="Pelo menos uma, com rótulo e valor maior que zero. Ex.: Particular, Convênio SAF, Clube VIP."
        >
          <div className="flex flex-col gap-2">
            {variations.map((v, i) => (
              <div key={v._uid} className="flex gap-2 items-start">
                <Input
                  value={v.label}
                  onChange={(e) => {
                    updateVariation(i, { label: e.target.value })
                    setError('')
                  }}
                  placeholder="Rótulo (ex.: Particular)"
                  className="flex-1"
                />
                <div className="w-36 flex-shrink-0">
                  <MoneyInput
                    value={v.amountCents}
                    onChange={(cents) => updateVariation(i, { amountCents: cents })}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeVariation(i)}
                  className="p-2 rounded-lg text-surface-400 hover:text-red-400 hover:bg-red-900/20 transition-all flex-shrink-0"
                  aria-label="Remover variação"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addVariation}
              className="flex items-center gap-1 self-start px-3 py-1.5 rounded-lg text-xs font-semibold bg-surface-700 hover:bg-surface-600 text-surface-200 transition-all"
            >
              <Plus className="w-3.5 h-3.5" /> Adicionar variação
            </button>
            {variations.length === 0 && (
              <p className="text-xs text-danger">Adicione ao menos uma variação de preço.</p>
            )}
          </div>
        </FormField>

        <div className="flex items-center justify-between py-2 border-t border-surface-800">
          <div>
            <p className="text-sm font-medium text-surface-200">Produto ativo</p>
            <p className="text-xs text-surface-500 mt-0.5">Produtos inativos não são oferecidos pela IA</p>
          </div>
          <Switch checked={active} onChange={setActive} />
        </div>

        <div className="flex gap-2 justify-end pt-1">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-surface-300 hover:bg-surface-800 transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-brand-600 hover:bg-brand-500 text-surface-950 disabled:opacity-60 transition-all"
          >
            {saving ? 'Salvando...' : editProduct ? 'Salvar alterações' : 'Criar produto'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
