import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import type { CannedResponse } from '@/types'

interface QuickReplyModalProps {
  open: boolean
  onClose: () => void
  editing?: CannedResponse | null
  onSave: (data: { shortcut: string; title: string; body: string }) => Promise<void>
}

export function QuickReplyModal({ open, onClose, editing, onSave }: QuickReplyModalProps) {
  const [form, setForm] = useState({ shortcut: '/', title: '', body: '' })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (editing) {
      setForm({ shortcut: editing.shortcut, title: editing.title, body: editing.body })
    } else {
      setForm({ shortcut: '/', title: '', body: '' })
    }
  }, [editing, open])

  const handleShortcutChange = (val: string) => {
    if (!val.startsWith('/')) val = '/' + val
    setForm((f) => ({ ...f, shortcut: val }))
  }

  const handleSubmit = async () => {
    if (!form.shortcut || form.shortcut === '/' || !form.title || !form.body) return
    setLoading(true)
    try {
      await onSave(form)
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Editar resposta rápida' : 'Nova resposta rápida'}>
      <div className="flex flex-col gap-4 mt-2">
        <FormField label="Atalho" hint='Digite "/" seguido do atalho. Ex: /oi' required>
          <Input
            value={form.shortcut}
            onChange={(e) => handleShortcutChange(e.target.value)}
            placeholder="/atalho"
            className="font-mono"
          />
        </FormField>

        <FormField label="Título" required>
          <Input
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="Nome curto da resposta"
          />
        </FormField>

        <FormField label="Corpo da mensagem" required>
          <Textarea
            value={form.body}
            onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
            placeholder="Texto completo da resposta..."
            rows={4}
          />
        </FormField>

        {/* Preview */}
        {form.body && (
          <div className="bg-surface-800 border border-surface-700 rounded-xl p-3">
            <p className="text-[10px] uppercase tracking-widest text-surface-500 mb-1.5">Preview</p>
            <p className="text-sm text-surface-200 whitespace-pre-wrap">{form.body}</p>
          </div>
        )}

        <div className="flex justify-end gap-3 mt-1">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-surface-300 hover:text-surface-100 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !form.title || !form.body || form.shortcut === '/'}
            className="px-5 py-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-60 text-surface-950 text-sm font-semibold rounded-xl transition-colors flex items-center gap-2"
          >
            {loading && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
            {editing ? 'Salvar alterações' : 'Criar resposta'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
