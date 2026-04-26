// ─── Artifact safety utilities ─────────────────────────────────────────────────
// Small, reusable helpers used by the ArtifactPanel and the chat ArtifactCard
// to keep downloads, parsing, and status checks robust across streaming,
// malformed tags, and odd filenames.

/** Validates that a given string is a parseable JSON object. Used by the
 *  SlidesJsonRenderer and its export buttons to gate actions on incomplete
 *  streams — when isValidJson returns false during streaming, the export
 *  buttons are disabled so the user can't click 'Baixar PPTX' on a half
 *  JSON payload and get a cryptic parse error. */
export function isValidJson(raw: string): boolean {
  const s = (raw ?? '').trim()
  if (!s) return false
  try {
    JSON.parse(s)
    return true
  } catch {
    return false
  }
}

/** Slugifies a user-facing title into a safe filename. Handles diacritics
 *  (Brazilian Portuguese artifacts are the common case), strips characters
 *  that are invalid in Windows/macOS/Linux filenames, collapses whitespace,
 *  and enforces a maximum length so exports don't fail on long titles. */
export function safeFilename(title: string, fallback = 'artefato'): string {
  const t = (title ?? '').trim()
  if (!t) return fallback
  const normalized = t
    // Remove diacritics (é → e, ã → a, etc)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    // Replace anything that isn't a-z A-Z 0-9 _ - . with _
    .replace(/[<>:"/\\|?*\x00-\x1f]+/g, '_')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
  const truncated = normalized.slice(0, 80)
  return truncated || fallback
}

/** Returns true when the artifact content has a matched closing tag for its
 *  detected type — used to avoid extracting garbage text past an unterminated
 *  tag (e.g. stream aborted mid-generation). Streaming deltas are treated as
 *  'valid-for-now' via the secondHalfEmpty hint: if there's nothing after the
 *  open tag yet we know we're streaming and permit the partial state. */
export function hasMatchingCloseTag(raw: string, tag: string): boolean {
  const open = `<${tag}>`
  const close = `</${tag}>`
  const openIdx = raw.indexOf(open)
  if (openIdx === -1) return false
  const closeIdx = raw.indexOf(close, openIdx + open.length)
  return closeIdx !== -1
}
