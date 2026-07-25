import { useState, useEffect } from 'react'
import { FormDialog } from '@/components/ui/FormDialog'
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
    } catch {
      // Erro já sinalizado via toast pelo chamador (onSave rejeita).
    } finally {
      setLoading(false)
    }
  }

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      title={editing ? 'Editar resposta rápida' : 'Nova resposta rápida'}
      onSubmit={handleSubmit}
      submitLabel={editing ? 'Salvar alterações' : 'Criar resposta'}
      loading={loading}
      submitDisabled={!form.title || !form.body || form.shortcut === '/'}
    >
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
    </FormDialog>
  )
}
