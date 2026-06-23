import { useState, useEffect } from 'react'
import { X, Plus } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { MoneyInput } from '@/components/ui/MoneyInput'
import { useCRMConfig } from '@/contexts/CRMConfigContext'
import { useTenantVocab } from '@/contexts/TenantVocabContext'
import { dealsApi } from '@/services/api'
import { formatBRL } from '@/utils/money'
import type { Deal, DealStatus } from '@/types'

let uidSeq = 0
const makeUid = () => `dli-${uidSeq++}`

type ItemRow = {
  _uid: string
  id?: string
  productId: string
  variationLabel: string | null
  unitPriceCents: number
  quantity: number
  discountCents: number
}

const STATUSES: { value: DealStatus; label: string }[] = [
  { value: 'open', label: 'Aberto' },
  { value: 'won', label: 'Ganho' },
  { value: 'lost', label: 'Perdido' },
]

function lineTotal(it: ItemRow): number {
  return Math.max(0, it.unitPriceCents * it.quantity - it.discountCents)
}

interface DealModalProps {
  open: boolean
  contactId: string
  editDeal?: Deal | null
  onClose: () => void
  onSaved: () => void
}

export function DealModal({ open, contactId, editDeal, onClose, onSaved }: DealModalProps) {
  const { products, stages } = useCRMConfig()
  const { vocab } = useTenantVocab()
  const [title, setTitle] = useState('')
  const [status, setStatus] = useState<DealStatus>('open')
  const [note, setNote] = useState('')
  const [items, setItems] = useState<ItemRow[]>([])
  const [moveStageKey, setMoveStageKey] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setTitle(editDeal?.title ?? '')
      setStatus(editDeal?.status ?? 'open')
      setNote(editDeal?.note ?? '')
      setItems(
        editDeal?.lineItems?.map((li) => ({
          _uid: li.id ?? makeUid(),
          id: li.id,
          productId: li.productId,
          variationLabel: li.variationLabel ?? null,
          unitPriceCents: li.unitPriceCents,
          quantity: li.quantity ?? 1,
          discountCents: li.discountCents ?? 0,
        })) ?? [],
      )
      setMoveStageKey('')
      setError('')
    }
  }, [open, editDeal])

  const addItem = () =>
    setItems([
      ...items,
      { _uid: makeUid(), productId: '', variationLabel: null, unitPriceCents: 0, quantity: 1, discountCents: 0 },
    ])

  const updateItem = (index: number, patch: Partial<ItemRow>) =>
    setItems(items.map((it, i) => (i === index ? { ...it, ...patch } : it)))

  const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index))

  // Ao trocar o produto, pré-preenche com a 1ª variação (rótulo + preço congelado).
  const onProductChange = (index: number, productId: string) => {
    const product = products.find((p) => p.id === productId)
    const firstVar = product?.priceVariations?.[0]
    updateItem(index, {
      productId,
      variationLabel: firstVar?.label ?? null,
      unitPriceCents: firstVar?.amountCents ?? 0,
    })
  }

  const onVariationChange = (index: number, label: string) => {
    const it = items[index]
    const product = products.find((p) => p.id === it.productId)
    const v = product?.priceVariations?.find((pv) => pv.label === label)
    updateItem(index, { variationLabel: label || null, unitPriceCents: v?.amountCents ?? it.unitPriceCents })
  }

  const total = items.reduce((sum, it) => sum + lineTotal(it), 0)

  const handleSave = async () => {
    if (!title.trim()) {
      setError('O título é obrigatório.')
      return
    }
    if (items.some((it) => !it.productId)) {
      setError('Selecione um produto em cada item (ou remova a linha).')
      return
    }
    setSaving(true)
    try {
      const lineItems = items.map((it, index) => ({
        id: it.id,
        productId: it.productId,
        variationLabel: it.variationLabel ?? undefined,
        unitPriceCents: it.unitPriceCents,
        quantity: it.quantity,
        discountCents: it.discountCents,
        order: index,
      }))
      const stageKey = status === 'won' && moveStageKey ? moveStageKey : undefined
      if (editDeal) {
        await dealsApi.update(editDeal.id, {
          title: title.trim(),
          note: note.trim() || undefined,
          lineItems,
        })
        if (status !== editDeal.status || stageKey) {
          await dealsApi.setStatus(editDeal.id, { status, moveContactToStageKey: stageKey })
        }
      } else {
        const created = await dealsApi.create({
          contactId,
          title: title.trim(),
          status,
          note: note.trim() || undefined,
          lineItems,
        })
        // create não move o estágio do contato — se ganho com estágio, aplica via setStatus.
        if (stageKey) {
          await dealsApi.setStatus(created.data.id, { status: 'won', moveContactToStageKey: stageKey })
        }
      }
      onSaved()
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(typeof msg === 'string' ? msg : Array.isArray(msg) ? msg[0] : 'Erro ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editDeal ? `Editar ${vocab.deal.toLowerCase()}` : `Novo ${vocab.deal.toLowerCase()}`}
      className="max-w-2xl"
    >
      <div className="flex flex-col gap-4">
        <FormField label="Título" required error={error}>
          <Input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value)
              setError('')
            }}
            placeholder="Ex: Proposta — Plano Anual"
            autoFocus
          />
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Status">
            <Select value={status} onChange={(e) => setStatus(e.target.value as DealStatus)}>
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </FormField>
          {status === 'won' && (
            <FormField label="Mover contato para (opcional)" hint="Ao ganhar, move o contato a este estágio.">
              <Select value={moveStageKey} onChange={(e) => setMoveStageKey(e.target.value)}>
                <option value="">— não mover —</option>
                {stages.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </FormField>
          )}
        </div>

        <FormField label="Itens">
          <div className="flex flex-col gap-2">
            {items.map((it, i) => {
              const product = products.find((p) => p.id === it.productId)
              const hasVariations = (product?.priceVariations?.length ?? 0) > 0
              return (
                <div key={it._uid} className="border border-surface-800 rounded-lg p-2.5 flex flex-col gap-2">
                  <div className="flex gap-2 items-start">
                    <div className="flex-1">
                      <Select value={it.productId} onChange={(e) => onProductChange(i, e.target.value)}>
                        <option value="">— produto —</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                            {!p.active ? ' (inativo)' : ''}
                          </option>
                        ))}
                      </Select>
                    </div>
                    {hasVariations && (
                      <div className="w-40 flex-shrink-0">
                        <Select value={it.variationLabel ?? ''} onChange={(e) => onVariationChange(i, e.target.value)}>
                          {product!.priceVariations.map((pv) => (
                            <option key={pv.id ?? pv.label} value={pv.label}>
                              {pv.label}
                            </option>
                          ))}
                        </Select>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => removeItem(i)}
                      className="p-2 rounded-lg text-surface-400 hover:text-red-400 hover:bg-red-900/20 transition-all flex-shrink-0"
                      aria-label="Remover item"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2 items-end">
                    <div>
                      <label className="text-[11px] text-surface-500">Preço unit.</label>
                      <MoneyInput value={it.unitPriceCents} onChange={(c) => updateItem(i, { unitPriceCents: c })} />
                    </div>
                    <div>
                      <label className="text-[11px] text-surface-500">Qtd</label>
                      <Input
                        type="number"
                        min={1}
                        value={String(it.quantity)}
                        onChange={(e) => updateItem(i, { quantity: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-surface-500">Desconto</label>
                      <MoneyInput value={it.discountCents} onChange={(c) => updateItem(i, { discountCents: c })} />
                    </div>
                  </div>
                  <p className="text-[11px] text-surface-400 text-right">
                    Subtotal: <span className="tabular-nums">{formatBRL(lineTotal(it))}</span>
                  </p>
                </div>
              )
            })}
            <button
              type="button"
              onClick={addItem}
              className="flex items-center gap-1 self-start px-3 py-1.5 rounded-lg text-xs font-semibold bg-surface-700 hover:bg-surface-600 text-surface-200 transition-all"
            >
              <Plus className="w-3.5 h-3.5" /> Adicionar item
            </button>
            {items.length === 0 && <p className="text-xs text-surface-600">Nenhum item.</p>}
          </div>
        </FormField>

        <FormField label="Observação (opcional)">
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Detalhes da proposta" />
        </FormField>

        <div className="flex items-center justify-between border-t border-surface-800 pt-3">
          <span className="text-sm font-semibold text-surface-100">
            Total: <span className="tabular-nums">{formatBRL(total)}</span>
          </span>
          <div className="flex gap-2">
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
              {saving ? 'Salvando...' : editDeal ? 'Salvar' : 'Criar'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
