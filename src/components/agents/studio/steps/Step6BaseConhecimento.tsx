import { useState, useRef, useEffect } from 'react'
import { Plus, BookOpen, FileUp, FileText, Upload, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { extractBrandFile } from '@/services/agentsApi'
import { showToast } from '@/hooks/useToast'
import { ConfirmModal } from '@/components/ui/Modal'
import { KnowledgeDocArtifact } from '@/components/agents/KnowledgeDocArtifact'
import type { WizardData } from '../types'
import { TEXTAREA } from './constants'

const WIZARD_KB_STEPS = [
  'Lendo arquivo...',
  'Extraindo conteúdo com IA...',
  'Analisando estrutura do documento...',
  'Processando texto extraído...',
  'Finalizando extração...',
]

function WizardKBProgress({ fileName }: { fileName: string }) {
  const [step, setStep] = useState(0)
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const stepTimer = setInterval(() => setStep(s => (s + 1) % WIZARD_KB_STEPS.length), 6000)
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
        <p className="text-[11px] text-brand-400 transition-all duration-500">{WIZARD_KB_STEPS[step]}</p>
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

export function Step6BaseConhecimento({
  data, setData,
}: { data: WizardData; setData: React.Dispatch<React.SetStateAction<WizardData>> }) {
  const [textInput, setTextInput] = useState('')
  const [uploadingFile, setUploadingFile] = useState<string | null>(null)
  const [viewingDocId, setViewingDocId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const addTextDoc = () => {
    const trimmed = textInput.trim()
    if (!trimmed) return
    const id = `kb-${Date.now()}`
    setData(d => ({
      ...d,
      knowledge_docs: [...d.knowledge_docs, { id, name: `Texto-${d.knowledge_docs.length + 1}`, content: trimmed, source_type: 'text' }],
    }))
    setTextInput('')
    setViewingDocId(id)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return
    // Sequential processing so the "X of Y" progress label below makes sense
    // and the backend isn't hit with concurrent extraction jobs (PDF parsing
    // is CPU-heavy on the agent-server side). Each file gets its own doc
    // entry in knowledge_docs; failures are logged but don't abort the batch.
    const failed: string[] = []
    const total = files.length
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      setUploadingFile(total > 1 ? `${file.name} (${i + 1}/${total})` : file.name)
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
        // Suffix the id with the index so a fast batch (sub-ms apart) doesn't
        // collide on Date.now() and produce duplicate doc ids.
        const id = `kb-${Date.now()}-${i}`
        setData(d => ({
          ...d,
          knowledge_docs: [...d.knowledge_docs, { id, name: file.name, content: extracted, source_type: 'file' }],
        }))
        // Only auto-focus the LAST successful upload — focusing each one
        // mid-batch is jarring when the user picked 10 files at once.
        if (i === files.length - 1) setViewingDocId(id)
      } catch (err) {
        console.error('[KB upload]', file.name, err)
        failed.push(file.name)
      }
    }
    if (failed.length > 0) {
      showToast(
        `Falha ao processar ${failed.length} arquivo${failed.length > 1 ? 's' : ''}: ${failed.join(', ')}`,
        'error',
      )
    }
    setUploadingFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const [removeDocTarget, setRemoveDocTarget] = useState<string | null>(null)
  const removeDoc = () => {
    if (!removeDocTarget) return
    setData(d => ({ ...d, knowledge_docs: d.knowledge_docs.filter(doc => doc.id !== removeDocTarget) }))
    if (viewingDocId === removeDocTarget) setViewingDocId(null)
    setRemoveDocTarget(null)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-surface-100 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-brand-400" />
          Base de Conhecimento
        </h2>
        <p className="text-sm text-surface-500 mt-0.5">
          Adicione documentos, textos ou arquivos que o agente usará como referência para responder.
        </p>
      </div>

      {/* Upload file */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-surface-400">Enviar arquivos (PDF, DOCX, TXT, imagem)</label>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.doc,.txt,.md,.png,.jpg,.jpeg,.webp"
          multiple
          onChange={handleFileUpload}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={!!uploadingFile}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-surface-700 hover:border-brand-500/40 text-surface-400 hover:text-brand-400 transition disabled:opacity-50"
        >
          <Upload className="w-4 h-4" />
          {uploadingFile ? `Enviando ${uploadingFile}…` : 'Selecionar arquivos'}
        </button>
      </div>

      {/* Text input */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-surface-400">Ou cole um texto diretamente</label>
        <textarea
          value={textInput}
          onChange={e => setTextInput(e.target.value)}
          rows={4}
          placeholder="Cole aqui informações que o agente deve conhecer..."
          className={TEXTAREA}
        />
        <button
          type="button" onClick={addTextDoc} disabled={!textInput.trim()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-800 border border-surface-700 text-xs text-surface-400 hover:text-brand-400 hover:border-brand-500/40 disabled:opacity-40 transition"
        >
          <Plus className="w-3.5 h-3.5" /> Adicionar texto
        </button>
      </div>

      {/* Upload progress */}
      {uploadingFile && <WizardKBProgress fileName={uploadingFile} />}

      {/* Document list */}
      {data.knowledge_docs.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-surface-400">{data.knowledge_docs.length} documento(s) adicionado(s)</p>
          {data.knowledge_docs.map(doc => (
            <div key={doc.id} className="space-y-2">
              <div className="flex items-center gap-3 p-3 bg-surface-900/60 border border-surface-800 rounded-xl">
                <FileText className="w-4 h-4 text-surface-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-surface-200 truncate">{doc.name}</p>
                  <p className="text-[10px] text-surface-600">
                    {doc.content.length.toLocaleString()} caracteres · {doc.source_type}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setViewingDocId(viewingDocId === doc.id ? null : doc.id)}
                  className={cn(
                    'p-1 rounded transition',
                    viewingDocId === doc.id ? 'text-brand-400' : 'text-surface-600 hover:text-brand-400',
                  )}
                  title="Ver/Editar conteúdo"
                >
                  <FileText className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button" onClick={() => setRemoveDocTarget(doc.id)}
                  className="p-1 rounded text-surface-600 hover:text-danger transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              {viewingDocId === doc.id && (
                <KnowledgeDocArtifact
                  title={doc.name}
                  content={doc.content}
                  onChange={newContent => {
                    setData(d => ({
                      ...d,
                      knowledge_docs: d.knowledge_docs.map(dd =>
                        dd.id === doc.id ? { ...dd, content: newContent } : dd,
                      ),
                    }))
                  }}
                  onCancel={() => setViewingDocId(null)}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {data.knowledge_docs.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <FileUp className="w-8 h-8 text-surface-700" />
          <p className="text-xs text-surface-600">Nenhum documento adicionado ainda. Este passo é opcional.</p>
        </div>
      )}

      <ConfirmModal
        open={!!removeDocTarget}
        onClose={() => setRemoveDocTarget(null)}
        onConfirm={removeDoc}
        title="Remover documento"
        description="O documento será removido da base de conhecimento do agente. Esta ação não pode ser desfeita."
        confirmLabel="Remover documento"
        danger
      />
    </div>
  )
}
