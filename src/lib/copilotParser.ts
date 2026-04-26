// ─── Phase 10: Citations ─────────────────────────────────────────────────────
// Claude is instructed (when FF_CITATIONS_ENABLED is on) to end lines with a
// [Fonte: tool_name] marker. These helpers extract and strip those markers so
// the UI can render citation chips next to each line.

export interface Citation {
  tool: string
  start: number
  end: number
}

const CITATION_REGEX = /\[Fonte:\s*([a-z][a-z0-9_]*)\]/gi

export function parseCitations(text: string): Citation[] {
  const out: Citation[] = []
  if (!text) return out
  const re = new RegExp(CITATION_REGEX)
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    out.push({ tool: m[1], start: m.index, end: m.index + m[0].length })
  }
  return out
}

export function stripCitations(text: string): string {
  if (!text) return text
  return text.replace(new RegExp(CITATION_REGEX), '').replace(/\s+$/gm, '')
}

// ─── Inline text utilities ─────────────────────────────────────────────────────

export function stripInline(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/~~([^~]+)~~/g, '$1')
}

export function stripHeading(line: string): string {
  return line.replace(/^#{1,6}\s+/, '')
}

export function isHeadingLine(line: string): boolean {
  return /^#{1,6}\s/.test(line.trim())
}

// ─── Artifact types ────────────────────────────────────────────────────────────

export type ArtifactType = 'document' | 'webpage' | 'spreadsheet' | 'slides' | 'slides-json' | 'react-artifact'

const ARTIFACT_TAGS: { tag: string; type: ArtifactType }[] = [
  // More specific tags must come first so they win over prefix matches
  { tag: 'react-artifact', type: 'react-artifact' },
  { tag: 'document',       type: 'document'       },
  { tag: 'webpage',        type: 'webpage'        },
  { tag: 'spreadsheet',    type: 'spreadsheet'    },
  // slides-json must come before slides so the more-specific tag wins
  { tag: 'slides-json',    type: 'slides-json'    },
  { tag: 'slides',         type: 'slides'         },
]

export function detectArtifactType(raw: string): ArtifactType | null {
  // Search within the first 1200 chars — the tag may appear after a short preamble
  const search = raw.length > 1200 ? raw.slice(0, 1200) : raw
  for (const { tag, type } of ARTIFACT_TAGS) {
    if (search.includes(`<${tag}>`)) return type
  }
  // Phase 12 fallback: some responses contain a React component inside a
  // markdown code fence (```jsx / ```tsx) instead of the <react-artifact>
  // tag. Treat any fenced jsx/tsx block anywhere in the reply that ALSO
  // contains ReactDOM.createRoot somewhere in the message (anywhere — not
  // necessarily inside the first fence) as a react-artifact.
  const hasJsxFence = /```(?:jsx|tsx)\b/i.test(raw)
  const hasReactRoot = /ReactDOM\.createRoot\s*\(/.test(raw)
  if (hasJsxFence && hasReactRoot) return 'react-artifact'
  return null
}

export function isArtifactResponse(raw: string): boolean {
  return detectArtifactType(raw) !== null
}

export function extractArtifactContent(raw: string): string {
  const type = detectArtifactType(raw)
  if (!type) return raw
  const entry = ARTIFACT_TAGS.find((t) => t.type === type)
  if (entry) {
    const openTag = `<${entry.tag}>`
    const closeTag = `</${entry.tag}>`
    const openIdx = raw.indexOf(openTag)
    if (openIdx !== -1) {
      const start = openIdx + openTag.length
      const closeIdx = raw.indexOf(closeTag, start)
      return (closeIdx !== -1 ? raw.slice(start, closeIdx) : raw.slice(start)).trim()
    }
  }
  // Fallback path for react-artifact detected from a ```jsx/tsx fence.
  // Multiple fences may exist; pick the biggest one that also contains
  // ReactDOM.createRoot (that's the real component).
  if (type === 'react-artifact') {
    const fenceRe = /```(?:jsx|tsx)\b[^\n]*\n([\s\S]*?)```/gi
    let best = ''
    let m: RegExpExecArray | null
    while ((m = fenceRe.exec(raw)) !== null) {
      const body = m[1]
      if (/ReactDOM\.createRoot\s*\(/.test(body) && body.length > best.length) {
        best = body
      }
    }
    if (best) return best.trim()
    // No fence contained ReactDOM.createRoot — just take the biggest one
    const fallback = raw.match(/```(?:jsx|tsx)\b[^\n]*\n([\s\S]*?)```/i)
    if (fallback) return fallback[1].trim()
  }
  return raw
}

export function extractTitle(content: string, type: ArtifactType = 'document'): string {
  if (type === 'slides-json') {
    // Try JSON parse first; fall back to regex (content may be incomplete during streaming)
    try {
      const json = JSON.parse(content) as { title?: string }
      if (json.title) return json.title
    } catch { /* incomplete JSON during streaming — try regex */ }
    const m = content.match(/"title"\s*:\s*"([^"]+)"/)
    if (m) return m[1]
    return 'Apresentação'
  }
  if (type === 'webpage' || type === 'slides') {
    // Try <title>...</title>
    const titleMatch = content.match(/<title[^>]*>([^<]+)<\/title>/i)
    if (titleMatch) return titleMatch[1].trim()
    // Try <h1>...</h1>
    const h1Match = content.match(/<h1[^>]*>([^<]+)<\/h1>/i)
    if (h1Match) return h1Match[1].trim()
  }
  if (type === 'spreadsheet') {
    // Try <caption> or first th
    const capMatch = content.match(/<caption[^>]*>([^<]+)<\/caption>/i)
    if (capMatch) return capMatch[1].trim()
    const thMatch = content.match(/<th[^>]*>([^<]+)<\/th>/i)
    if (thMatch) return thMatch[1].trim()
    return 'Planilha'
  }
  if (type === 'react-artifact') {
    // Priority 1: first <h1>...</h1> or <h2>...</h2> with static text content.
    // That's usually the real user-facing title of the dashboard, not an
    // auxiliary sub-component name.
    const hMatch = content.match(/<h[12][^>]*>([^<{}]+?)<\/h[12]>/i)
    if (hMatch) {
      const t = hMatch[1].trim()
      if (t.length > 2) return t.length > 68 ? t.slice(0, 65) + '…' : t
    }
    // Priority 2: JSDoc-style first-comment title: /** Dashboard de Vendas */
    const docMatch = content.match(/\/\*\*?\s*([^*\n][^*\n]*?)\s*\*\//)
    if (docMatch) {
      const clean = docMatch[1].trim()
      if (clean.length > 2) return clean.length > 68 ? clean.slice(0, 65) + '…' : clean
    }
    // Priority 3: name of the component passed to ReactDOM.createRoot(...).render()
    // Works for both <App /> and React.createElement(App).
    const rootMatch = content.match(/ReactDOM\.createRoot[\s\S]*?\.render\s*\(\s*(?:React\.createElement\s*\(\s*([A-Z][\w]*)|<\s*([A-Z][\w]*))/)
    if (rootMatch) {
      const name = rootMatch[1] || rootMatch[2]
      return name.replace(/([A-Z])/g, ' $1').trim()
    }
    return 'Componente interativo'
  }
  const hMatch = content.match(/^#{1,2}\s+(.+)$/m)
  if (hMatch) return stripInline(hMatch[1].trim())
  const firstLine = content.trim().split('\n').find((l) => l.trim())
  if (firstLine) {
    const clean = stripInline(firstLine.replace(/^#{1,6}\s+/, '').trim())
    return clean.length > 68 ? clean.slice(0, 65) + '…' : clean
  }
  return 'Documento'
}

// ─── Segment types ─────────────────────────────────────────────────────────────

export type Segment =
  | { kind: 'prose'; lines: string[] }
  | { kind: 'code';  lang: string; content: string }
  | { kind: 'table'; headers: string[]; rows: string[][] }
  | { kind: 'plan';  title: string; items: string[] }

// ─── Parser ────────────────────────────────────────────────────────────────────

const TABLE_SEP_RE = /^[\|\-:\s]+$/

function parseTableRow(line: string): string[] {
  return line.split('|').map((c) => c.trim()).filter((_, i, a) => i > 0 && i < a.length - 1)
}

function parseTextPart(text: string, segments: Segment[]) {
  if (!text.trim()) return
  const lines = text.split('\n')
  let proseLines: string[] = []
  let i = 0

  const flushProse = () => {
    if (proseLines.length) {
      segments.push({ kind: 'prose', lines: [...proseLines] })
      proseLines = []
    }
  }

  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()

    if (trimmed.startsWith('|') && !TABLE_SEP_RE.test(trimmed)) {
      flushProse()
      const tableLines: string[] = [line]
      i++
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i++])
      }
      const dataRows = tableLines.filter((l) => !TABLE_SEP_RE.test(l.trim()))
      if (dataRows.length >= 1) {
        const [header, ...body] = dataRows
        segments.push({
          kind: 'table',
          headers: parseTableRow(header),
          rows: body.map(parseTableRow),
        })
      }
      continue
    }

    if (/^\s*\d+\.\s/.test(line)) {
      const planTitle =
        proseLines.length > 0 && isHeadingLine(proseLines[proseLines.length - 1])
          ? stripInline(stripHeading(proseLines.pop()!))
          : 'Plano de ação'

      const items: string[] = [line.replace(/^\s*\d+\.\s*/, '').trim()]
      i++
      while (i < lines.length) {
        const next = lines[i]
        if (/^\s*\d+\.\s/.test(next)) {
          items.push(next.replace(/^\s*\d+\.\s*/, '').trim())
          i++
        } else if (/^\s{2,}/.test(next) && items.length > 0 && next.trim()) {
          items[items.length - 1] += ' ' + next.trim()
          i++
        } else {
          break
        }
      }
      if (items.length >= 3) {
        flushProse()
        segments.push({ kind: 'plan', title: planTitle, items })
      } else {
        items.forEach((it, idx) => proseLines.push(`${idx + 1}. ${it}`))
      }
      continue
    }

    proseLines.push(line)
    i++
  }

  flushProse()
}

export function parseContent(raw: string): Segment[] {
  const segments: Segment[] = []
  const codeFenceRe = /```([\w]*)\n([\s\S]*?)```/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = codeFenceRe.exec(raw)) !== null) {
    if (match.index > lastIndex) parseTextPart(raw.slice(lastIndex, match.index), segments)
    segments.push({ kind: 'code', lang: match[1].trim() || 'code', content: match[2].replace(/\n$/, '') })
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < raw.length) parseTextPart(raw.slice(lastIndex), segments)

  return segments.filter((s) => s.kind !== 'prose' || (s as { lines: string[] }).lines.some((l) => l.trim()))
}
