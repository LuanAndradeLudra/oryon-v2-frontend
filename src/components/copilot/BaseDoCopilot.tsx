// Base do Copilot (SCRUM-1253): o painel lateral saiu — a base oficial do
// Copilot é editada em Configurações › Contexto da IA (instruções, campos e
// documentos; instruções também na seção Copilot, para todos os papéis). O
// servidor lê a base no próprio turno do Copilot. O estado vem de quem chama
// (fonte única em useKnowledgeBase) — nada de segunda cópia da base.
import { useState, useRef, useCallback } from 'react'
import {
  Plus, Trash2, FileText, Upload, FileType2, Pencil,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { ConfirmModal } from '@/components/ui/Modal'
import {
  fileToKBDocument,
  KB_MAX_DOCS,
  KB_MAX_TOTAL_SIZE,
  type BaseDoCopilot,
  type KBCompanyField,
  type KBDocument,
} from '@/hooks/useKnowledgeBase'

// ─── Company field row ─────────────────────────────────────────────────────────

function CompanyFieldRow({
  field,
  onSave,
  onDelete,
}: {
  field: KBCompanyField
  onSave: (f: KBCompanyField) => void
  onDelete: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [label, setLabel] = useState(field.label)
  const [value, setValue] = useState(field.value)

  const save = () => {
    if (label.trim() || value.trim()) {
      onSave({ ...field, label: label.trim(), value: value.trim() })
    }
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-1.5 p-2 rounded-[10px] bg-surface-800/50 border border-surface-700/50">
        <input
          autoFocus
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Label (ex: Nome, Produto)"
          className="bg-transparent text-xs text-surface-200 outline-none placeholder:text-surface-500 border-b border-surface-700/50 pb-1"
        />
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && save()}
          placeholder="Valor"
          className="bg-transparent text-xs text-surface-300 outline-none placeholder:text-surface-500"
        />
        <div className="flex gap-2 justify-end mt-0.5">
          <button onClick={() => setEditing(false)} className="text-xs text-surface-500 hover:text-surface-300">
            Cancelar
          </button>
          <button
            onClick={save}
            className="text-xs text-accent-dark hover:opacity-80 font-medium"
          >
            Salvar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-2 group">
      <div className="flex-1 min-w-0">
        <p className="text-xs text-surface-500 leading-tight">{field.label || '—'}</p>
        <p className="text-xs text-surface-300 leading-snug mt-0.5 break-words">{field.value || '—'}</p>
      </div>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity flex-shrink-0 mt-0.5">
        <button
          onClick={() => setEditing(true)}
          aria-label={`Editar campo "${field.label || 'sem nome'}"`}
          className="p-1 rounded text-surface-500 hover:text-surface-300 hover:bg-surface-700/50 transition-colors"
        >
          <Pencil className="w-2.5 h-2.5" />
        </button>
        <button
          onClick={onDelete}
          aria-label={`Remover campo "${field.label || 'sem nome'}"`}
          className="p-1 rounded text-surface-500 hover:text-danger hover:bg-danger/10 transition-colors"
        >
          <Trash2 className="w-2.5 h-2.5" />
        </button>
      </div>
    </div>
  )
}

// ─── Company section ───────────────────────────────────────────────────────────

const COMPANY_PRESETS = [
  { label: 'Nome da empresa', value: '' },
  { label: 'Descrição', value: '' },
  { label: 'Produto principal', value: '' },
  { label: 'Site', value: '' },
  { label: 'Instagram', value: '' },
  { label: 'WhatsApp comercial', value: '' },
]

function CompanySection({ kb, upsertCompanyField, deleteCompanyField }: {
  kb: BaseDoCopilot['kb']
  upsertCompanyField: BaseDoCopilot['upsertCompanyField']
  deleteCompanyField: BaseDoCopilot['deleteCompanyField']
}) {
  const [adding, setAdding] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [newValue, setNewValue] = useState('')
  const [showPresets, setShowPresets] = useState(false)

  const addField = (label = newLabel, value = newValue) => {
    if (!label.trim()) return
    upsertCompanyField({ id: crypto.randomUUID(), label: label.trim(), value: value.trim() })
    setNewLabel('')
    setNewValue('')
    setAdding(false)
    setShowPresets(false)
  }

  return (
    <div className="px-4 py-4 flex flex-col gap-2">
      <p className="text-xs font-semibold text-surface-200">Campos</p>
      <p className="text-xs text-surface-500 leading-relaxed -mt-1">
        Dados curtos que o Copilot consulta: produto principal, links úteis, contatos.
      </p>

      {kb.companyFields.length > 0 && (
        <div className="flex flex-col gap-2 mb-1">
          {kb.companyFields.map((f) => (
            <CompanyFieldRow
              key={f.id}
              field={f}
              onSave={upsertCompanyField}
              onDelete={() => deleteCompanyField(f.id)}
            />
          ))}
        </div>
      )}

      {adding ? (
        <div className="flex flex-col gap-1.5 p-2.5 rounded-[10px] bg-surface-800/50 border border-surface-700/50">
          {showPresets ? (
            <>
              <p className="text-xs text-surface-500 mb-1">Selecionar campo:</p>
              <div className="grid grid-cols-2 gap-1">
                {COMPANY_PRESETS.map((p) => (
                  <button
                    key={p.label}
                    onClick={() => { setNewLabel(p.label); setShowPresets(false) }}
                    className="text-left text-xs text-surface-300 hover:text-accent-dark px-2 py-1 rounded-[6px] hover:bg-surface-700/50 transition-colors"
                  >
                    {p.label}
                  </button>
                ))}
                <button
                  onClick={() => setShowPresets(false)}
                  className="text-left text-xs text-surface-500 hover:text-surface-300 px-2 py-1 rounded-[6px] hover:bg-surface-700/50 transition-colors"
                >
                  Personalizado...
                </button>
              </div>
            </>
          ) : (
            <>
              <input
                autoFocus
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="Label (ex: Produto)"
                className="bg-transparent text-xs text-surface-200 outline-none placeholder:text-surface-500 border-b border-surface-700/50 pb-1"
              />
              <input
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addField()}
                placeholder="Valor"
                className="bg-transparent text-xs text-surface-300 outline-none placeholder:text-surface-500"
              />
              <div className="flex gap-2 justify-between mt-0.5">
                <button
                  onClick={() => setShowPresets(true)}
                  className="text-xs text-surface-500 hover:text-surface-300"
                >
                  Usar modelo
                </button>
                <div className="flex gap-2">
                  <button onClick={() => { setAdding(false); setNewLabel(''); setNewValue('') }} className="text-xs text-surface-500 hover:text-surface-300">
                    Cancelar
                  </button>
                  <button
                    onClick={() => addField()}
                    disabled={!newLabel.trim()}
                    className="text-xs text-accent-dark hover:opacity-80 font-medium disabled:opacity-40"
                  >
                    Adicionar
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 text-xs text-surface-500 hover:text-brand-400 transition-colors self-start"
        >
          <Plus className="w-3 h-3" />
          Adicionar campo
        </button>
      )}
    </div>
  )
}

// ─── Document card ─────────────────────────────────────────────────────────────

function DocumentCard({
  doc,
  onDelete,
  onEdit,
}: {
  doc: KBDocument
  onDelete: () => void
  onEdit?: () => void
}) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const isDocx = doc.kind === 'docx'
  const isPdf = doc.kind === 'pdf'
  const sizeLabel = doc.size > 1000
    ? `${(doc.size / 1000).toFixed(0)} KB`
    : `${doc.size} B`
  const kindLabel = isPdf ? 'PDF' : isDocx ? 'Word' : 'Texto'
  const iconColor = isPdf
    ? 'bg-accent-rose/10 border border-accent-rose/20'
    : isDocx
    ? 'bg-accent-blue/10 border border-accent-blue/20'
    : 'bg-brand-600/10 border border-brand-500/20'
  const iconEl = isPdf
    ? <FileType2 className="w-4 h-4 text-accent-rose" />
    : isDocx
    ? <FileText className="w-4 h-4 text-accent-blue" />
    : <FileText className="w-4 h-4 text-brand-400" />

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative group rounded-[10px] border border-surface-700/50 bg-surface-800/40 p-3 hover:border-surface-600/60 transition-colors"
      >
        <div className="flex items-start gap-2.5">
          <div className={cn('w-8 h-8 rounded-[6px] flex items-center justify-center flex-shrink-0', iconColor)}>
            {iconEl}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-surface-200 truncate">{doc.name}</p>
            <p className="text-xs text-surface-500 mt-0.5">
              {kindLabel} · {sizeLabel}
            </p>
          </div>
        </div>
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity">
          {!isPdf && onEdit && (
            <button
              onClick={onEdit}
              aria-label={`Editar ${doc.name}`}
              className="p-1 rounded text-surface-500 hover:text-surface-300 hover:bg-surface-700/50 transition-colors"
            >
              <Pencil className="w-2.5 h-2.5" />
            </button>
          )}
          <button
            onClick={() => setConfirmOpen(true)}
            aria-label={`Excluir ${doc.name}`}
            className="p-1 rounded text-surface-500 hover:text-danger hover:bg-danger/10 transition-colors"
          >
            <Trash2 className="w-2.5 h-2.5" />
          </button>
        </div>
      </motion.div>
      <ConfirmModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => { onDelete(); setConfirmOpen(false) }}
        title="Excluir documento"
        description="Esta ação é irreversível. O documento será removido da base de conhecimento do Copilot."
        confirmLabel="Excluir documento"
        danger
      />
    </>
  )
}

// ─── Text document editor (inline) ────────────────────────────────────────────

function TextDocEditor({
  initial,
  onSave,
  onCancel,
}: {
  initial?: { name: string; content: string }
  onSave: (name: string, content: string) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [content, setContent] = useState(initial?.content ?? '')

  return (
    <div className="flex flex-col gap-2 p-3 rounded-[10px] border border-brand-500/25 bg-surface-800/50">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Título do documento"
        className="bg-transparent text-xs font-medium text-surface-200 outline-none placeholder:text-surface-500 border-b border-surface-700/50 pb-1.5"
      />
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Conteúdo do documento..."
        rows={6}
        className="bg-transparent text-xs text-surface-300 outline-none placeholder:text-surface-500 resize-none leading-relaxed"
      />
      <div className="flex justify-end gap-2 border-t border-surface-700/40 pt-2">
        <button onClick={onCancel} className="text-xs text-surface-500 hover:text-surface-300 px-2 py-1">
          Cancelar
        </button>
        <button
          onClick={() => name.trim() && onSave(name.trim(), content)}
          disabled={!name.trim()}
          className="text-xs bg-brand-600 hover:bg-brand-500 text-surface-950 px-3 py-1 rounded-[6px] transition-colors disabled:opacity-40"
        >
          Salvar
        </button>
      </div>
    </div>
  )
}

// ─── Documents section ─────────────────────────────────────────────────────────

function DocumentsSection({ kb, addDocument, replaceDocument, deleteDocument, totalSize }: {
  kb: BaseDoCopilot['kb']
  addDocument: BaseDoCopilot['addDocument']
  replaceDocument: BaseDoCopilot['replaceDocument']
  deleteDocument: BaseDoCopilot['deleteDocument']
  totalSize: BaseDoCopilot['totalSize']
}) {
  const [mode, setMode] = useState<'none' | 'text' | 'editText'>('none')
  const [editingDoc, setEditingDoc] = useState<KBDocument | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const usedPercent = Math.min(100, (totalSize / KB_MAX_TOTAL_SIZE) * 100)

  const handleTextSave = (name: string, content: string) => {
    const ok = addDocument({ name, kind: 'text', content, size: content.length })
    if (!ok) { setUploadError('Limite de documentos ou de armazenamento atingido.'); return }
    setUploadError(null)
    setMode('none')
    setEditingDoc(null)
  }

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    setUploadError(null)

    for (const file of files) {
      const { doc, error } = await fileToKBDocument(file)
      if (error) { setUploadError(error); continue }
      const ok = addDocument(doc!)
      if (!ok) setUploadError('Limite de documentos ou de armazenamento atingido.')
    }
  }, [addDocument])

  return (
    <div className="px-4 py-4 flex flex-col gap-3">
      <p className="text-xs font-semibold text-surface-200">Documentos</p>
      {/* Usage bar */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-surface-500">
            {kb.documents.length}/{KB_MAX_DOCS} documentos
          </span>
          <span className="text-xs text-surface-500">{usedPercent.toFixed(0)}% usado</span>
        </div>
        <div className="h-1 bg-surface-800 rounded-full overflow-hidden">
          <motion.div
            className={cn(
              'h-full rounded-full transition-all',
              usedPercent > 80 ? 'bg-status-pending' : 'bg-brand-500',
            )}
            initial={{ width: 0 }}
            animate={{ width: `${usedPercent}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
      </div>

      {/* Document cards */}
      {kb.documents.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {kb.documents.map((doc) => (
            <DocumentCard
              key={doc.id}
              doc={doc}
              onDelete={() => deleteDocument(doc.id)}
              onEdit={doc.kind === 'text' ? () => { setEditingDoc(doc); setMode('editText') } : undefined}
            />
          ))}
        </div>
      )}

      {/* Inline editor */}
      {mode === 'text' && (
        <TextDocEditor
          onSave={handleTextSave}
          onCancel={() => setMode('none')}
        />
      )}
      {mode === 'editText' && editingDoc && (
        <TextDocEditor
          initial={{ name: editingDoc.name, content: editingDoc.content }}
          onSave={(name, content) => {
            void replaceDocument(editingDoc.id, { name, kind: 'text', content, size: content.length })
            setMode('none')
            setEditingDoc(null)
          }}
          onCancel={() => { setMode('none'); setEditingDoc(null) }}
        />
      )}

      {/* Upload error */}
      {uploadError && (
        <p className="text-xs text-status-pending/80">{uploadError}</p>
      )}

      {/* Add buttons */}
      {mode === 'none' && kb.documents.length < KB_MAX_DOCS && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <button
            onClick={() => setMode('text')}
            className="flex items-center gap-1.5 text-xs text-surface-500 hover:text-brand-400 transition-colors whitespace-nowrap"
          >
            <FileText className="w-3 h-3" />
            Texto
          </button>
          <span className="text-surface-700">·</span>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 text-xs text-surface-500 hover:text-brand-400 transition-colors whitespace-nowrap"
          >
            <Upload className="w-3 h-3" />
            Upload (PDF / Word / MD)
          </button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.txt,.md,.docx,application/pdf,text/plain,text/markdown,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  )
}

// ─── Itens da base do Copilot ───────────────────────────────────────────────────

/** Campos e documentos da base do Copilot, em "Contexto da IA" (sempre
 *  visível — dá para criar itens novos). Os agentes que atendem clientes usam
 *  "Sobre o negócio" e "Arquivos da marca". */
export function ItensDaBaseDoCopilot({ base }: { base: BaseDoCopilot }) {
  const { kb, carga, erroCarga, erroAoSalvar, recarregar, upsertCompanyField, deleteCompanyField, addDocument, replaceDocument, deleteDocument, totalSize } = base
  if (carga === 'carregando') {
    return <p className="text-xs text-surface-400" role="status">Carregando a base do Copilot…</p>
  }
  if (carga === 'erro') {
    return (
      <div role="alert" className="flex items-center gap-3 rounded-[10px] border border-danger/30 bg-danger/5 px-4 py-3 text-xs text-danger">
        <span className="flex-1">{erroCarga ?? 'Não foi possível carregar a base do Copilot.'} Nada foi alterado.</span>
        <button type="button" onClick={recarregar} className="font-semibold underline underline-offset-2 hover:opacity-80">Tentar de novo</button>
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-2">
      {erroAoSalvar && <p role="alert" className="text-xs text-danger">{erroAoSalvar}</p>}
      <div className="rounded-[10px] border border-surface-700 bg-surface-800 overflow-hidden divide-y divide-surface-700">
        <CompanySection kb={kb} upsertCompanyField={upsertCompanyField} deleteCompanyField={deleteCompanyField} />
        <DocumentsSection kb={kb} addDocument={addDocument} replaceDocument={replaceDocument} deleteDocument={deleteDocument} totalSize={totalSize} />
      </div>
    </div>
  )
}
