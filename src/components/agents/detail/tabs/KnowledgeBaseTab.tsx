import { useState, useEffect, useCallback, useRef } from 'react'
import {
  CheckCircle2, Loader2, AlertCircle, Clock, FileText, BookOpen,
  FileUp, Plus, Eye, Upload, Trash2, RefreshCw,
} from 'lucide-react'
import {
  listAgentKnowledge, addAgentKnowledge, deleteAgentKnowledge, updateAgentKnowledge,
  getAgentKnowledgeDoc, extractBrandFile,
} from '@/services/agentsApi'
import type { AgentConfigWithTools, AgentKnowledgeDoc } from '@/services/agentsApi'
import { ConfirmModal, Modal } from '@/components/ui/Modal'
import { KnowledgeDocArtifact } from '@/components/agents/KnowledgeDocArtifact'

// ─── Knowledge Base Tab ──────────────────────────────────────────────────────

function DocStatusBadge({ status }: { status: string }) {
  if (status === 'ready') return (
    <span
      className="color-chip inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 border rounded"
      style={{ ['--chip']: 'var(--color-status-active)' } as React.CSSProperties}
    >
      <CheckCircle2 className="w-3 h-3" />Pronto
    </span>
  )
  if (status === 'processing') return (
    <span
      className="color-chip inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 border rounded"
      style={{ ['--chip']: 'var(--color-status-pending)' } as React.CSSProperties}
    >
      <Loader2 className="w-3 h-3 animate-spin" />Processando
    </span>
  )
  if (status === 'error') return (
    <span
      className="color-chip inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 border rounded"
      style={{ ['--chip']: 'var(--color-danger)' } as React.CSSProperties}
    >
      <AlertCircle className="w-3 h-3" />Erro
    </span>
  )
  return (
    <span
      className="color-chip inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 border rounded"
      style={{ ['--chip']: 'var(--color-status-muted)' } as React.CSSProperties}
    >
      <Clock className="w-3 h-3" />Pendente
    </span>
  )
}

const KB_UPLOAD_STEPS = [
  'Lendo arquivo...',
  'Extraindo conteúdo com IA...',
  'Analisando estrutura do documento...',
  'Processando texto extraído...',
  'Indexando na base de conhecimento...',
  'Gerando embeddings vetoriais...',
]

function KBUploadProgress({ fileName }: { fileName: string }) {
  const [step, setStep] = useState(0)
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const stepTimer = setInterval(() => setStep(s => (s + 1) % KB_UPLOAD_STEPS.length), 6000)
    const tick = setInterval(() => setElapsed(e => e + 1), 1000)
    return () => { clearInterval(stepTimer); clearInterval(tick) }
  }, [])

  const progress = Math.min(95, elapsed * 1.2)

  return (
    <div className="p-3 bg-surface-900/60 border border-surface-800 rounded-xl space-y-2">
      <div className="flex items-center gap-2">
        <FileText className="w-4 h-4 text-brand-400 flex-shrink-0" />
        <p className="text-xs text-surface-200 font-medium truncate">{fileName}</p>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="relative w-3.5 h-3.5 flex-shrink-0">
          <div className="absolute inset-0 rounded-full border-2 border-brand-500/30" />
          <div className="absolute inset-0 rounded-full border-2 border-brand-400 border-t-transparent animate-spin" />
        </div>
        <p className="text-[11px] text-brand-400 transition-all duration-500">{KB_UPLOAD_STEPS[step]}</p>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1 bg-surface-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-brand-600 to-brand-400 rounded-full transition-all duration-1000 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-[10px] text-surface-600 tabular-nums w-8 text-right">{elapsed}s</span>
      </div>
    </div>
  )
}

export function KnowledgeBaseTab({ agent }: { agent: AgentConfigWithTools }) {
  const [docs, setDocs] = useState<AgentKnowledgeDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadingFile, setUploadingFile] = useState<string | null>(null) // file name being uploaded
  const [textInput, setTextInput] = useState('')
  const [textName, setTextName] = useState('')
  const [editingDocId, setEditingDocId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [editLoading, setEditLoading] = useState(false)
  const [updatingDocId, setUpdatingDocId] = useState<string | null>(null)
  const [textModalOpen, setTextModalOpen] = useState(false)
  const [addingText, setAddingText] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const updateFileRef = useRef<HTMLInputElement>(null)

  const loadDocs = useCallback(async () => {
    setLoading(true)
    try {
      const list = await listAgentKnowledge(agent.id)
      setDocs(list)
    } finally {
      setLoading(false)
    }
  }, [agent.id])

  useEffect(() => { void loadDocs() }, [loadDocs])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingFile(file.name)
    try {
      const isText = file.type.startsWith('text/') || file.name.endsWith('.md') || file.name.endsWith('.txt')
      let content: string
      let contentType: 'base64' | 'text'

      if (isText) {
        content = await file.text()
        contentType = 'text'
      } else {
        const buffer = await file.arrayBuffer()
        const bytes = new Uint8Array(buffer)
        let binary = ''
        for (let j = 0; j < bytes.length; j++) binary += String.fromCharCode(bytes[j])
        content = btoa(binary)
        contentType = 'base64'
      }

      const extracted = await extractBrandFile(file.name, file.type || 'text/plain', content, contentType)
      const docId = `kb-${Date.now()}`
      const newDoc = await addAgentKnowledge(agent.id, {
        document_id: docId,
        document_name: file.name,
        content: extracted,
        source_type: 'file',
      })
      await loadDocs()
      // Auto-open the artifact editor for the newly uploaded doc
      setEditContent(extracted)
      setEditingDocId(newDoc.id)
    } catch (err) {
      console.error('[KB upload]', err)
    } finally {
      setUploadingFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleAddText = async () => {
    const trimmed = textInput.trim()
    if (!trimmed) return
    setAddingText(true)
    try {
      const docId = `kb-text-${Date.now()}`
      await addAgentKnowledge(agent.id, {
        document_id: docId,
        document_name: textName.trim() || `Texto-${docs.length + 1}`,
        content: trimmed,
        source_type: 'text',
      })
      setTextInput('')
      setTextName('')
      setTextModalOpen(false)
      await loadDocs()
      // No auto-open of the viewer: the user just composed the text in the
      // dedicated modal, so they already saw what was saved.
    } catch (err) {
      console.error('[KB text]', err)
    } finally {
      setAddingText(false)
    }
  }

  const [deleteDocTarget, setDeleteDocTarget] = useState<string | null>(null)
  const [deletingDoc, setDeletingDoc] = useState(false)

  const handleDelete = async () => {
    if (!deleteDocTarget) return
    setDeletingDoc(true)
    try {
      await deleteAgentKnowledge(agent.id, deleteDocTarget)
      setDocs(prev => prev.filter(d => d.id !== deleteDocTarget))
    } catch (err) {
      console.error('[KB delete]', err)
    } finally {
      setDeletingDoc(false)
      setDeleteDocTarget(null)
    }
  }

  const handleEdit = async (docId: string) => {
    if (editingDocId === docId) { setEditingDocId(null); return }
    setEditLoading(true)
    try {
      const full = await getAgentKnowledgeDoc(agent.id, docId)
      setEditContent(full.content ?? '')
      setEditingDocId(docId)
    } catch (err) {
      console.error('[KB edit]', err)
    } finally {
      setEditLoading(false)
    }
  }

  const handleSaveEdit = async () => {
    if (!editingDocId) return
    setEditLoading(true)
    try {
      await updateAgentKnowledge(agent.id, editingDocId, { content: editContent })
      setEditingDocId(null)
      await loadDocs()
    } catch (err) {
      console.error('[KB save-edit]', err)
    } finally {
      setEditLoading(false)
    }
  }

  const handleUpdateFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !updatingDocId) return
    const targetDocId = updatingDocId
    setUploadingFile(file.name)
    try {
      const isText = file.type.startsWith('text/') || file.name.endsWith('.md') || file.name.endsWith('.txt')
      let content: string
      let contentType: 'base64' | 'text'
      if (isText) { content = await file.text(); contentType = 'text' }
      else {
        const buf = await file.arrayBuffer()
        const bytes = new Uint8Array(buf)
        let binary = ''
        for (let j = 0; j < bytes.length; j++) binary += String.fromCharCode(bytes[j])
        content = btoa(binary)
        contentType = 'base64'
      }
      const extracted = await extractBrandFile(file.name, file.type || 'text/plain', content, contentType)
      await updateAgentKnowledge(agent.id, targetDocId, { content: extracted, document_name: file.name })
      setUpdatingDocId(null)
      await loadDocs()
      setEditContent(extracted)
      setEditingDocId(targetDocId)
    } catch (err) {
      console.error('[KB update]', err)
    } finally {
      setUploadingFile(null)
      if (updateFileRef.current) updateFileRef.current.value = ''
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-surface-200 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-brand-400" />
          Base de Conhecimento
        </h3>
        <p className="text-xs text-surface-500 mt-1">
          Documentos e textos que o agente usa como referência (RAG).
        </p>
      </div>

      {/* Hidden file inputs (kept above the grid so the refs stay valid) */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,.doc,.txt,.md,.png,.jpg,.jpeg,.webp"
        onChange={handleFileUpload}
        className="hidden"
      />
      <input
        ref={updateFileRef}
        type="file"
        accept=".pdf,.docx,.doc,.txt,.md,.png,.jpg,.jpeg,.webp"
        onChange={handleUpdateFile}
        className="hidden"
      />

      {/* Side-by-side: file dropzone (left) + paste-text composer (right).
          A vertical divider + a short intro on each side make the two paths
          self-explanatory: file = "extract from existing material",
          text = "type/paste short instructions directly". */}
      <div className="grid grid-cols-[1fr_auto_1fr] gap-8 items-stretch">
        {/* ── Left: file upload ─────────────────────────────────────────── */}
        <div className="flex flex-col gap-3 min-h-[200px]">
          <div>
            <p className="text-xs font-semibold text-surface-200">Enviar arquivo</p>
            <p className="text-[11px] text-surface-500 mt-0.5 leading-relaxed">
              Para documentos que você já tem. Extraímos texto de PDF, DOCX, imagens e arquivos de texto automaticamente.
            </p>
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={!!uploadingFile}
            className="flex-1 flex flex-col items-center justify-center gap-2 px-4 py-6 rounded-xl border-2 border-dashed border-surface-700 hover:border-brand-500/40 text-surface-400 hover:text-brand-400 text-xs font-medium transition disabled:opacity-50"
          >
            <FileUp className="w-7 h-7" />
            <span>Clique para selecionar</span>
            <span className="text-[10px] text-surface-600 font-normal">PDF, DOCX, TXT, MD, PNG, JPG, WEBP</span>
          </button>
        </div>

        {/* ── Vertical divider ──────────────────────────────────────────── */}
        <div className="w-px bg-surface-800" aria-hidden />

        {/* ── Right: manual text composer (button → modal) ──────────────── */}
        <div className="flex flex-col gap-3 min-h-[200px]">
          <div>
            <p className="text-xs font-semibold text-surface-200">Adicionar texto</p>
            <p className="text-[11px] text-surface-500 mt-0.5 leading-relaxed">
              Para instruções, FAQs ou trechos curtos. Abra o editor para colar e revisar antes de salvar — vai direto pra base, sem extração.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setTextModalOpen(true)}
            className="flex-1 flex flex-col items-center justify-center gap-2 px-4 py-6 rounded-xl border-2 border-dashed border-surface-700 hover:border-brand-500/40 text-surface-400 hover:text-brand-400 text-xs font-medium transition"
          >
            <Plus className="w-7 h-7" />
            <span>Abrir editor de texto</span>
            <span className="text-[10px] text-surface-600 font-normal">Cole instruções, FAQs ou notas</span>
          </button>
        </div>
      </div>

      {/* Upload progress */}
      {uploadingFile && <KBUploadProgress fileName={uploadingFile} />}

      {/* Document list */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="w-5 h-5 text-surface-700 animate-spin" />
        </div>
      ) : docs.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-medium text-surface-400">{docs.length} documento(s)</p>
          {docs.map(doc => {
            const isLoadingThis = editLoading && editingDocId === doc.id && editContent === ''
            const previewText = (doc.content_preview ?? '').split('\n').slice(0, 8).join('\n').trim()
            return (
              <div key={doc.id} className="bg-surface-900/60 border border-surface-800 rounded-xl p-3">
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-surface-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-surface-200 font-medium truncate">{doc.document_name}</p>
                      <DocStatusBadge status={doc.status} />
                    </div>
                    <p className="text-[10px] text-surface-600">{doc.source_type}  ·  {new Date(doc.created_at).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleEdit(doc.id)}
                    disabled={isLoadingThis}
                    title="Visualizar / Editar conteúdo"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] bg-surface-700 text-surface-200 hover:bg-surface-600 transition-colors disabled:opacity-50 flex-shrink-0"
                  >
                    {isLoadingThis ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <><Eye className="w-3 h-3" /> Visualizar</>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setUpdatingDocId(doc.id); updateFileRef.current?.click() }}
                    title="Atualizar arquivo"
                    className="p-1 rounded text-surface-600 hover:text-brand-400 transition"
                  >
                    <Upload className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button" onClick={() => setDeleteDocTarget(doc.id)}
                    title="Excluir"
                    className="p-1 rounded text-surface-600 hover:text-danger transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                {previewText && (
                  <div className="mt-3 pt-3 border-t border-surface-800/60">
                    <pre className="text-[11px] text-surface-500 leading-relaxed whitespace-pre-wrap break-words font-sans line-clamp-[8]">
                      {previewText}
                    </pre>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <FileUp className="w-8 h-8 text-surface-700" />
          <p className="text-xs text-surface-600">Nenhum documento adicionado. Envie arquivos ou cole textos acima.</p>
        </div>
      )}

      <ConfirmModal
        open={!!deleteDocTarget}
        onClose={() => setDeleteDocTarget(null)}
        onConfirm={handleDelete}
        title="Excluir documento"
        description="Esta ação é irreversível. O documento e todos os chunks indexados serão removidos da base de conhecimento do agente."
        confirmLabel="Excluir documento"
        danger
        loading={deletingDoc}
      />

      {/* Full-screen viewer/editor modal — opens when the user clicks Visualizar
          on a doc card. Hosts the existing KnowledgeDocArtifact (Visualizar /
          Editar toggle + Save/Cancel) inside a wide centered modal. */}
      <Modal
        open={editingDocId !== null}
        onClose={() => setEditingDocId(null)}
        title={docs.find(d => d.id === editingDocId)?.document_name ?? 'Documento'}
        className="max-w-3xl"
      >
        <KnowledgeDocArtifact
          title=""
          content={editContent}
          onChange={setEditContent}
          onSave={handleSaveEdit}
          onCancel={() => setEditingDocId(null)}
          saving={editLoading}
        />
      </Modal>

      {/* Composer modal — opens from the "Abrir editor de texto" button.
          Provides ample space for pasting and reviewing before save, mirroring
          the centered fullscreen pattern used by PromptReviewModal. */}
      <Modal
        open={textModalOpen}
        onClose={() => setTextModalOpen(false)}
        title="Adicionar texto à base de conhecimento"
        className="max-w-3xl"
      >
        <div className="space-y-3">
          <div>
            <label className="block text-[11px] font-medium text-surface-400 mb-1">
              Nome do documento <span className="text-surface-600 font-normal">(opcional)</span>
            </label>
            <input
              value={textName}
              onChange={e => setTextName(e.target.value)}
              placeholder='Ex: "Política de devolução", "FAQ de atendimento"…'
              className="w-full bg-surface-800 border border-surface-700 rounded-xl px-3 py-2 text-sm text-surface-100 placeholder:text-surface-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30 transition"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-surface-400 mb-1">Conteúdo</label>
            <textarea
              value={textInput}
              onChange={e => setTextInput(e.target.value)}
              rows={14}
              placeholder="Cole o texto que o agente deve conhecer..."
              className="w-full bg-surface-900 border border-surface-700 rounded-xl px-3 py-2 text-xs text-surface-200 placeholder:text-surface-600 resize-none focus:outline-none focus:ring-2 focus:ring-brand-500/30 transition font-mono leading-relaxed"
            />
            <p className="text-right text-[10px] text-surface-600 mt-1">
              {textInput.length.toLocaleString()} caracteres
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-surface-800">
            <button
              type="button"
              onClick={() => setTextModalOpen(false)}
              className="px-4 py-2 rounded-lg text-sm text-surface-300 hover:bg-surface-800 transition"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleAddText}
              disabled={!textInput.trim() || addingText}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-brand-600 text-surface-950 hover:bg-brand-500 disabled:opacity-40 transition"
            >
              {addingText ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              {addingText ? 'Adicionando…' : 'Adicionar à base'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
