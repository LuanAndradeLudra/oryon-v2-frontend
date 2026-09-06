import { useRef, useState } from 'react'
import { UploadCloud, Loader2, FileText, X } from 'lucide-react'
import { showToast } from '@/hooks/useToast'
import { fileToKnowledgeDoc, KNOWLEDGE_ACCEPT } from '../knowledgeUpload'
import type { WizardData } from '../types'

/**
 * Corpo REDUZIDO da etapa 6 no Studio — a área tracejada de upload e a
 * contagem do que já entrou, como o mockup desenha (`p2b-agentes.html#a3`).
 *
 * Mesma regra da etapa 4 (`coord/A3-decisoes.md` §1): **o Studio cria, o
 * Workspace refina.** O `steps/Step6BaseConhecimento.tsx` é upload + colar
 * texto + lista de documentos + visualizador + remoção com confirmação, feito
 * para o painel largo do modal; a gestão da base fica no Workspace. Aquele
 * arquivo segue servindo o modal — este não o substitui.
 *
 * A conversão do arquivo é a MESMA (`studio/knowledgeUpload.ts`), para os dois
 * caminhos não divergirem.
 */
export function Step6ConhecimentoCompacto({
  data, setData,
}: {
  data: WizardData
  setData: React.Dispatch<React.SetStateAction<WizardData>>
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState<string | null>(null)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return

    // Sequencial de propósito: a extração de PDF é pesada no agent-server, e o
    // rótulo "X de Y" só faz sentido em série. Falha de um arquivo não aborta
    // o lote.
    const falharam: string[] = []
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      setUploading(files.length > 1 ? `${file.name} (${i + 1}/${files.length})` : file.name)
      try {
        const doc = await fileToKnowledgeDoc(file, i)
        setData(d => ({ ...d, knowledge_docs: [...d.knowledge_docs, doc] }))
      } catch (err) {
        console.error('[KB upload]', file.name, err)
        falharam.push(file.name)
      }
    }
    if (falharam.length > 0) {
      showToast(
        `Falha ao processar ${falharam.length} arquivo${falharam.length > 1 ? 's' : ''}: ${falharam.join(', ')}`,
        'error',
      )
    }
    setUploading(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  const docs = data.knowledge_docs

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={KNOWLEDGE_ACCEPT}
        onChange={e => void handleUpload(e)}
        className="hidden"
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={!!uploading}
        className="w-full rounded-2xl border border-dashed border-surface-600 hover:border-brand-500/50 hover:bg-surface-800/40 disabled:opacity-60 disabled:cursor-wait transition-colors px-4 py-5 text-center"
      >
        {uploading ? (
          <>
            <Loader2 className="w-6 h-6 mx-auto text-brand-400 animate-spin" aria-hidden />
            <span className="block mt-1.5 text-xs text-surface-300 truncate">{uploading}</span>
          </>
        ) : (
          <>
            <UploadCloud className="w-6 h-6 mx-auto text-surface-500" aria-hidden />
            <span className="block mt-1.5 text-xs text-surface-300">Arraste PDFs ou escolha arquivos</span>
            <span className="block mt-0.5 text-[10.5px] text-surface-600">PDF, DOCX, TXT, MD e imagens</span>
          </>
        )}
      </button>

      {docs.length > 0 && (
        <ul className="space-y-1.5">
          {docs.map(doc => (
            <li
              key={doc.id}
              className="flex items-center gap-2 rounded-xl border border-surface-700 bg-surface-900 px-2.5 py-2"
            >
              <FileText className="w-3.5 h-3.5 text-surface-500 flex-shrink-0" aria-hidden />
              <span className="flex-1 min-w-0 truncate text-xs text-surface-300">{doc.name}</span>
              <button
                type="button"
                aria-label={`Remover ${doc.name}`}
                onClick={() => setData(d => ({ ...d, knowledge_docs: d.knowledge_docs.filter(x => x.id !== doc.id) }))}
                className="text-surface-600 hover:text-danger transition-colors flex-shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="text-[11px] leading-relaxed text-surface-500">
        {docs.length === 0
          ? 'Sem fontes, o agente responde só com o que você escreveu nas etapas anteriores.'
          : 'A gestão da base — visualizar, renomear, colar texto — fica no agente depois de publicado.'}
      </p>
    </div>
  )
}
