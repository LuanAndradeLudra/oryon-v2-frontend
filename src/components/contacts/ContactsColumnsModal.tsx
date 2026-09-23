import { useState } from 'react'
import { GripVertical } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Switch } from '@/components/ui/Switch'
import { useDragReorder } from '@/hooks/useDragReorder'
import { CONTACT_COLUMN_DEFS, type ContactColumnsConfig } from '@/hooks/useContactColumnsConfig'
import { cn } from '@/lib/utils'

interface ContactsColumnsModalProps {
  open: boolean
  onClose: () => void
  config: ContactColumnsConfig
  /** Gate SCRUM-498 — a coluna "Funis" só existe com o módulo habilitado. */
  multiPipeline: boolean
}

interface DraftItem {
  key: string
  label: string
  visible: boolean
  gated: boolean
}

/** README restyle-2026, 3.2 — "Modal Configurar colunas" (520px): handle de
 *  reordenar, nome do campo, Switch; "Nome" é fixa (sempre 1ª, sem Switch);
 *  a coluna condicional a `useMultiPipeline()` leva o mesmo tratamento visual
 *  de `ComingSoonBadge` em vez de sumir da lista — o módulo pode ligar depois
 *  sem o usuário ter que redescobrir que a coluna existe. */
function buildDraft(config: ContactColumnsConfig): DraftItem[] {
  const byKey = new Map(CONTACT_COLUMN_DEFS.map((c) => [c.key, c]))
  return config.order
    .map((key) => byKey.get(key))
    .filter((c): c is (typeof CONTACT_COLUMN_DEFS)[number] => !!c)
    .map((c) => ({ key: c.key, label: c.label, visible: !config.hiddenKeys.has(c.key), gated: !!c.gated }))
}

export function ContactsColumnsModal({ open, onClose, config, multiPipeline }: ContactsColumnsModalProps) {
  const [draft, setDraft] = useState<DraftItem[]>([])
  // Semeia o rascunho a cada TRANSIÇÃO fechado→aberto (não em efeito — ajuste
  // de estado durante a renderização, padrão recomendado pra "resetar estado
  // quando uma prop muda" sem o passe extra de render de um useEffect).
  // Cancelar não deve deixar rastro do que foi mexido; só Salvar grava de
  // volta no config persistido.
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) setDraft(buildDraft(config))
  }

  const { overIdx, handleDragStart, handleDragOver, handleDrop, handleDragEnd } = useDragReorder(
    draft,
    (reordered) => setDraft(reordered),
  )

  const toggle = (key: string) =>
    setDraft((prev) => prev.map((item) => (item.key === key ? { ...item, visible: !item.visible } : item)))

  const handleSave = () => {
    config.apply({
      order: draft.map((d) => d.key),
      hidden: draft.filter((d) => !d.visible).map((d) => d.key),
    })
    onClose()
  }

  const handleRestoreDefaults = () => {
    config.restoreDefaults()
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <div>
          <h2 className="text-[15px] font-display font-bold tracking-[-0.01em] text-surface-50">Configurar colunas</h2>
          <p className="text-[12.5px] text-surface-400 mt-0.5">Ordem e visibilidade valem só para você.</p>
        </div>
      }
      className="max-w-[520px]"
      bodyClassName="p-0"
      footer={
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={handleRestoreDefaults}>Restaurar padrão</Button>
          <div className="flex items-center gap-2">
            <Button variant="neutral" size="md" onClick={onClose}>Cancelar</Button>
            <Button variant="primary" size="md" onClick={handleSave}>Salvar</Button>
          </div>
        </div>
      }
    >
      <ul className="px-[18px] py-1.5">
        {/* Nome — fixa, sempre primeira, sem handle nem Switch. */}
        <li className="flex items-center gap-2.5 h-9 border-b border-surface-700">
          <span className="w-3.5 h-3.5 flex-shrink-0" aria-hidden />
          <span className="flex-1 text-[13px] text-surface-500">Nome</span>
          <span className="text-[11px] text-surface-500">fixa</span>
        </li>

        {draft.map((item, idx) => {
          const disabled = item.gated && !multiPipeline
          const isLast = idx === draft.length - 1
          return (
            <li
              key={item.key}
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDrop={() => handleDrop(idx)}
              onDragEnd={handleDragEnd}
              className={cn(
                'flex items-center gap-2.5 h-9 transition-colors',
                !isLast && 'border-b border-surface-700',
                overIdx === idx ? 'bg-brand-500/10' : 'hover:bg-[var(--rowhover)]',
              )}
            >
              <GripVertical className="w-3.5 h-3.5 flex-shrink-0 text-surface-500 cursor-grab active:cursor-grabbing" />
              <span className={cn('flex-1 text-[13px] font-medium', disabled ? 'text-surface-500' : 'text-surface-100')}>
                {item.label}
                {item.gated && (
                  <span className="ml-1 inline-flex items-center h-4 px-1 rounded-xs border border-dashed border-[var(--bd2)] text-surface-500 text-[9.5px] font-semibold align-middle">
                    MULTI-FUNIL
                  </span>
                )}
              </span>
              <Switch checked={item.visible && !disabled} onChange={() => toggle(item.key)} disabled={disabled} />
            </li>
          )
        })}
      </ul>
    </Modal>
  )
}
