// ─── Frontend RAG Client ──────────────────────────────────────────────────────
// Calls the backend RAG endpoints for document indexing and retrieval.

const BASE = import.meta.env.VITE_AGENT_SERVER_URL ?? 'http://localhost:3002'
const RAG_ROOT = `${BASE}/agents/rag`

async function ragFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${RAG_ROOT}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  })
  const json = (await res.json()) as { data?: T; error?: string }
  if (!res.ok) throw new Error(json.error ?? `Erro ${res.status}`)
  return json.data as T
}

// ─── Index Document ───────────────────────────────────────────────────────────

export async function indexDocumentForRAG(
  tenantId: string,
  documentId: string,
  documentName: string,
  content: string,
  agentId?: string,
): Promise<{ chunksCreated: number }> {
  return ragFetch<{ chunksCreated: number }>('/index', {
    method: 'POST',
    body: JSON.stringify({ tenantId, documentId, documentName, content, agentId }),
  })
}

// ─── Retrieve Chunks ──────────────────────────────────────────────────────────

export interface RetrievedChunk {
  id: string
  document_name: string
  chunk_index: number
  content: string
  similarity: number
}

export async function retrieveRelevantChunks(
  tenantId: string,
  query: string,
  topK = 5,
  threshold = 0.3,
  agentId?: string,
): Promise<RetrievedChunk[]> {
  return ragFetch<RetrievedChunk[]>('/retrieve', {
    method: 'POST',
    body: JSON.stringify({ tenantId, query, topK, threshold, agentId }),
  })
}

// ─── Delete Document ──────────────────────────────────────────────────────────

export async function deleteDocumentFromRAG(
  tenantId: string,
  documentId: string,
): Promise<void> {
  await ragFetch<void>(`/document/${encodeURIComponent(documentId)}?tenantId=${encodeURIComponent(tenantId)}`, {
    method: 'DELETE',
  })
}

// ─── Format Chunks for Prompt ─────────────────────────────────────────────────

export function formatChunksForPrompt(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) return ''
  const formatted = chunks
    .map((c, i) => `[${i + 1}] (${c.document_name}) ${c.content}`)
    .join('\n\n')
  return `\n\n────────────────────────────────\nCONTEXTO DA BASE DE CONHECIMENTO:\n${formatted}`
}
