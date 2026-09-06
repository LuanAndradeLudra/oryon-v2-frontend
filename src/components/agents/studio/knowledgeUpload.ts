import { extractBrandFile } from '@/services/agentsApi'
import type { WizardData } from './types'

export type KnowledgeDoc = WizardData['knowledge_docs'][number]

/**
 * Lê um arquivo do disco e devolve o documento de conhecimento correspondente,
 * já com o texto extraído pelo agent-server.
 *
 * Extraído de `steps/Step6BaseConhecimento.tsx` (que continua sendo o único
 * outro chamador) porque a A3 tem um corpo reduzido da etapa 6 que precisa
 * exatamente disto. Duplicar a conversão binária em dois lugares seria pedir
 * para elas divergirem — sobretudo a parte de base64, que é a que tem
 * armadilha (`String.fromCharCode` byte a byte, não `apply` num array grande,
 * que estoura a pilha em arquivo de alguns MB).
 *
 * O `index` entra no id porque um lote rápido de arquivos cai no mesmo
 * `Date.now()` e colidiria.
 */
export async function fileToKnowledgeDoc(file: File, index: number): Promise<KnowledgeDoc> {
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

  return { id: `kb-${Date.now()}-${index}`, name: file.name, content: extracted, source_type: 'file' }
}

/** Extensões que o seletor de arquivo aceita — mesma lista nos dois corpos da etapa 6. */
export const KNOWLEDGE_ACCEPT = '.pdf,.docx,.doc,.txt,.md,.png,.jpg,.jpeg,.webp'
