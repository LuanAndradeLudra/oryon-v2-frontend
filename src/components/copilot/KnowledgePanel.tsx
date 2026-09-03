import { useState, useRef, useCallback } from 'react'
import {
  X, Plus, Trash2, ChevronDown, ChevronRight,
  BookOpen, FileText, Upload, Building2, Lightbulb,
  FileType2, Check, Pencil,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { ConfirmModal } from '@/components/ui/Modal'
import {
  useKnowledgeBase,
  fileToKBDocument,
  KB_MAX_DOCS,
  type KBCompanyField,
  type KBDocument,
} from '@/hooks/useKnowledgeBase'

// ─── Section accordion ─────────────────────────────────────────────────────────

function Section({
  id,
  icon,
  title,
  badge,
  expanded,
  onToggle,
  action,
  children,
}: {
  id: string
  icon: React.ReactNode
  title: string
  badge?: string
  expanded: boolean
  onToggle: () => void
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="border-b border-surface-800/60 last:border-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2.5 px-4 py-3.5 hover:bg-surface-800/30 transition-colors text-left group"
      >
        <span className="text-surface-400 flex-shrink-0">{icon}</span>
        <span className="flex-1 text-sm font-medium text-surface-200">{title}</span>
        {badge && (
          <span className="text-3xs text-surface-500 bg-surface-800/60 px-1.5 py-0.5 rounded-full">
            {badge}
          </span>
        )}
        {action && <span onClick={(e) => e.stopPropagation()}>{action}</span>}
        <span className="text-surface-600 group-hover:text-surface-400 transition-colors">
          {expanded
            ? <ChevronDown className="w-3.5 h-3.5" />
            : <ChevronRight className="w-3.5 h-3.5" />}
        </span>
      </button>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key={id}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Instructions section ──────────────────────────────────────────────────────

function InstructionsSection({ kb, setInstructions }: { kb: ReturnType<typeof useKnowledgeBase>['kb']; setInstructions: ReturnType<typeof useKnowledgeBase>['setInstructions'] }) {
  const [draft, setDraft] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const value = draft ?? kb.instructions

  const handleBlur = () => {
    if (draft !== null && draft !== kb.instructions) {
      setInstructions(draft)
      setSaved(true)
      setTimeout(() => setSaved(false), 1500)
    }
    setDraft(null)
  }

  return (
    <div className="px-4 pb-4">
      <p className="text-2xs text-surface-500 mb-2 leading-relaxed">
        Personalize como a Oryon AI responde. Essas instruções são aplicadas em todas as conversas.
      </p>
      <div className="relative">
        <textarea
          value={value}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={handleBlur}
          placeholder="Ex: Sempre responda de forma objetiva. O tom deve ser profissional mas amigável. Foque em soluções práticas..."
          rows={4}
          className="w-full bg-surface-800/40 border border-surface-700/50 rounded-xl px-3 py-2.5 text-xs text-surface-200 placeholder:text-surface-600 outline-none focus:border-brand-500/40 focus:ring-1 focus:ring-brand-500/15 resize-none leading-relaxed transition-colors"
        />
        <AnimatePresence>
          {saved && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="absolute bottom-2.5 right-2.5 flex items-center gap-1 text-3xs text-status-active"
            >
              <Check className="w-3 h-3" /> Salvo
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

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
      <div className="flex flex-col gap-1.5 p-2 rounded-xl bg-surface-800/50 border border-surface-700/50">
        <input
          autoFocus
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Label (ex: Nome, Produto)"
          className="bg-transparent text-xs text-surface-200 outline-none placeholder:text-surface-600 border-b border-surface-700/50 pb-1"
        />
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && save()}
          placeholder="Valor"
          className="bg-transparent text-xs text-surface-300 outline-none placeholder:text-surface-600"
        />
        <div className="flex gap-2 justify-end mt-0.5">
          <button onClick={() => setEditing(false)} className="text-3xs text-surface-500 hover:text-surface-300">
            Cancelar
          </button>
          <button
            onClick={save}
            className="text-3xs text-brand-400 hover:text-brand-300 font-medium"
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
        <p className="text-3xs text-surface-500 leading-tight">{field.label || '—'}</p>
        <p className="text-xs text-surface-300 leading-snug mt-0.5 break-words">{field.value || '—'}</p>
      </div>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5">
        <button
          onClick={() => setEditing(true)}
          className="p-1 rounded text-surface-500 hover:text-surface-300 hover:bg-surface-700/50 transition-colors"
        >
          <Pencil className="w-2.5 h-2.5" />
        </button>
        <button
          onClick={onDelete}
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
  kb: ReturnType<typeof useKnowledgeBase>['kb']
  upsertCompanyField: ReturnType<typeof useKnowledgeBase>['upsertCompanyField']
  deleteCompanyField: ReturnType<typeof useKnowledgeBase>['deleteCompanyField']
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
    <div className="px-4 pb-4 flex flex-col gap-2">
      <p className="text-2xs text-surface-500 leading-relaxed">
        Informações sobre sua empresa, produtos, redes sociais e links úteis.
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
        <div className="flex flex-col gap-1.5 p-2.5 rounded-xl bg-surface-800/50 border border-surface-700/50">
          {showPresets ? (
            <>
              <p className="text-3xs text-surface-500 mb-1">Selecionar campo:</p>
              <div className="grid grid-cols-2 gap-1">
                {COMPANY_PRESETS.map((p) => (
                  <button
                    key={p.label}
                    onClick={() => { setNewLabel(p.label); setShowPresets(false) }}
                    className="text-left text-2xs text-surface-300 hover:text-brand-300 px-2 py-1 rounded-lg hover:bg-surface-700/50 transition-colors"
                  >
                    {p.label}
                  </button>
                ))}
                <button
                  onClick={() => setShowPresets(false)}
                  className="text-left text-2xs text-surface-500 hover:text-surface-300 px-2 py-1 rounded-lg hover:bg-surface-700/50 transition-colors"
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
                className="bg-transparent text-xs text-surface-200 outline-none placeholder:text-surface-600 border-b border-surface-700/50 pb-1"
              />
              <input
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addField()}
                placeholder="Valor"
                className="bg-transparent text-xs text-surface-300 outline-none placeholder:text-surface-600"
              />
              <div className="flex gap-2 justify-between mt-0.5">
                <button
                  onClick={() => setShowPresets(true)}
                  className="text-3xs text-surface-500 hover:text-surface-300"
                >
                  Usar modelo
                </button>
                <div className="flex gap-2">
                  <button onClick={() => { setAdding(false); setNewLabel(''); setNewValue('') }} className="text-3xs text-surface-500 hover:text-surface-300">
                    Cancelar
                  </button>
                  <button
                    onClick={() => addField()}
                    disabled={!newLabel.trim()}
                    className="text-3xs text-brand-400 hover:text-brand-300 font-medium disabled:opacity-40"
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
          className="flex items-center gap-1.5 text-2xs text-surface-500 hover:text-brand-400 transition-colors self-start"
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
        className="relative group rounded-xl border border-surface-700/50 bg-surface-800/40 p-3 hover:border-surface-600/60 transition-colors"
      >
        <div className="flex items-start gap-2.5">
          <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', iconColor)}>
            {iconEl}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-surface-200 truncate">{doc.name}</p>
            <p className="text-3xs text-surface-500 mt-0.5">
              {kindLabel} · {sizeLabel}
            </p>
          </div>
        </div>
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {!isPdf && onEdit && (
            <button
              onClick={onEdit}
              className="p-1 rounded text-surface-500 hover:text-surface-300 hover:bg-surface-700/50 transition-colors"
            >
              <Pencil className="w-2.5 h-2.5" />
            </button>
          )}
          <button
            onClick={() => setConfirmOpen(true)}
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
    <div className="flex flex-col gap-2 p-3 rounded-xl border border-brand-500/25 bg-surface-800/50">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Título do documento"
        className="bg-transparent text-xs font-medium text-surface-200 outline-none placeholder:text-surface-600 border-b border-surface-700/50 pb-1.5"
      />
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Conteúdo do documento..."
        rows={6}
        className="bg-transparent text-xs text-surface-300 outline-none placeholder:text-surface-600 resize-none leading-relaxed"
      />
      <div className="flex justify-end gap-2 border-t border-surface-700/40 pt-2">
        <button onClick={onCancel} className="text-xs text-surface-500 hover:text-surface-300 px-2 py-1">
          Cancelar
        </button>
        <button
          onClick={() => name.trim() && onSave(name.trim(), content)}
          disabled={!name.trim()}
          className="text-xs bg-brand-600 hover:bg-brand-500 text-surface-950 px-3 py-1 rounded-lg transition-colors disabled:opacity-40"
        >
          Salvar
        </button>
      </div>
    </div>
  )
}

// ─── Documents section ─────────────────────────────────────────────────────────

function DocumentsSection({ kb, addDocument, deleteDocument, totalSize }: {
  kb: ReturnType<typeof useKnowledgeBase>['kb']
  addDocument: ReturnType<typeof useKnowledgeBase>['addDocument']
  deleteDocument: ReturnType<typeof useKnowledgeBase>['deleteDocument']
  totalSize: ReturnType<typeof useKnowledgeBase>['totalSize']
}) {
  const [mode, setMode] = useState<'none' | 'text' | 'editText'>('none')
  const [editingDoc, setEditingDoc] = useState<KBDocument | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const usedPercent = Math.min(100, (totalSize / 3_000_000) * 100)

  const handleTextSave = (name: string, content: string) => {
    addDocument({ name, kind: 'text', content, size: content.length })
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
      if (!ok) setUploadError('Limite de armazenamento atingido.')
    }
  }, [addDocument])

  return (
    <div className="px-4 pb-4 flex flex-col gap-3">
      {/* Usage bar */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-3xs text-surface-500">
            {kb.documents.length}/{KB_MAX_DOCS} documentos
          </span>
          <span className="text-3xs text-surface-500">{usedPercent.toFixed(0)}% usado</span>
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
            deleteDocument(editingDoc.id)
            addDocument({ name, kind: 'text', content, size: content.length })
            setMode('none')
            setEditingDoc(null)
          }}
          onCancel={() => { setMode('none'); setEditingDoc(null) }}
        />
      )}

      {/* Upload error */}
      {uploadError && (
        <p className="text-2xs text-status-pending/80">{uploadError}</p>
      )}

      {/* Add buttons */}
      {mode === 'none' && kb.documents.length < KB_MAX_DOCS && (
        <div className="flex gap-2">
          <button
            onClick={() => setMode('text')}
            className="flex items-center gap-1.5 text-2xs text-surface-500 hover:text-brand-400 transition-colors"
          >
            <FileText className="w-3 h-3" />
            Texto
          </button>
          <span className="text-surface-700">·</span>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 text-2xs text-surface-500 hover:text-brand-400 transition-colors"
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

// ─── Knowledge Panel ────────────────────────────────────────────────────────────

interface KnowledgePanelProps {
  isOpen: boolean
  onClose: () => void
  tenantId: string | undefined
}

export function KnowledgePanel({ isOpen, onClose, tenantId }: KnowledgePanelProps) {
  const { kb, setInstructions, upsertCompanyField, deleteCompanyField, addDocument, deleteDocument, totalSize } = useKnowledgeBase(tenantId)
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(['instructions', 'company', 'documents']))

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const instructionsLen = kb.instructions.trim().length
  const companyCount = kb.companyFields.filter((f) => f.value.trim()).length
  const docCount = kb.documents.length

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="knowledge-panel"
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 340, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ type: 'spring', damping: 30, stiffness: 280 }}
          className="flex-shrink-0 flex flex-col border-l border-surface-800/60 bg-surface-950/80 backdrop-blur-sm overflow-hidden"
          style={{ minWidth: 0 }}
        >
          {/* Header */}
          <div className="flex-shrink-0 flex items-center gap-2.5 px-4 py-3.5 border-b border-surface-800/60">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-600/20 to-violet-600/20 border border-brand-500/20 flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-3.5 h-3.5 text-brand-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-surface-100">Base de Conhecimento</p>
              <p className="text-3xs text-surface-500">Contexto para todas as conversas</p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-surface-500 hover:text-surface-200 hover:bg-surface-800/60 transition-colors flex-shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto">
            {/* Instructions */}
            <Section
              id="instructions"
              icon={<Lightbulb className="w-3.5 h-3.5" />}
              title="Instruções"
              badge={instructionsLen > 0 ? `${instructionsLen} chars` : undefined}
              expanded={expanded.has('instructions')}
              onToggle={() => toggle('instructions')}
            >
              <InstructionsSection kb={kb} setInstructions={setInstructions} />
            </Section>

            {/* Company */}
            <Section
              id="company"
              icon={<Building2 className="w-3.5 h-3.5" />}
              title="Empresa"
              badge={companyCount > 0 ? `${companyCount} campo${companyCount !== 1 ? 's' : ''}` : undefined}
              expanded={expanded.has('company')}
              onToggle={() => toggle('company')}
            >
              <CompanySection kb={kb} upsertCompanyField={upsertCompanyField} deleteCompanyField={deleteCompanyField} />
            </Section>

            {/* Documents */}
            <Section
              id="documents"
              icon={<FileText className="w-3.5 h-3.5" />}
              title="Documentos"
              badge={docCount > 0 ? `${docCount}/${KB_MAX_DOCS}` : undefined}
              expanded={expanded.has('documents')}
              onToggle={() => toggle('documents')}
            >
              <DocumentsSection kb={kb} addDocument={addDocument} deleteDocument={deleteDocument} totalSize={totalSize} />
            </Section>
          </div>

          {/* Footer hint */}
          <div className="flex-shrink-0 px-4 py-3 border-t border-surface-800/60">
            <p className="text-3xs text-surface-600 leading-relaxed text-center">
              Informações aqui são injetadas automaticamente no contexto da Oryon AI
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
