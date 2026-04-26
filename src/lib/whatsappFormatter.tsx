/**
 * Render WhatsApp-flavored text — *bold*, _italic_, ~strike~, ```mono``` —
 * the same way the WhatsApp client renders it, while keeping Apple-style
 * emojis via the existing <EmojiText> pipeline.
 *
 * Inbound messages from customers can already use these markers. Outbound
 * AI replies are sanitized on the backend so the format is consistent.
 *
 * For resilience with historical data (messages saved before backend
 * sanitization landed) we also normalize markdown → WhatsApp on the way in,
 * so old `**bold**` rows still render correctly.
 */

import { Fragment, type ReactNode } from 'react'
import { EmojiText } from './emojiText'

type Segment =
  | { type: 'text'; content: string }
  | { type: 'bold'; content: string }
  | { type: 'italic'; content: string }
  | { type: 'strike'; content: string }
  | { type: 'mono'; content: string }
  | { type: 'monoBlock'; content: string }

/** Normalize markdown leftovers to WhatsApp syntax (mirrors the backend sanitizer). */
function normalizeMarkdown(text: string): string {
  return text
    .replace(/\*\*\*([\s\S]+?)\*\*\*/g, '*$1*')
    .replace(/\*\*([\s\S]+?)\*\*/g, '*$1*')
    .replace(/__([\s\S]+?)__/g, '*$1*')
    .replace(/~~([\s\S]+?)~~/g, '~$1~')
    .replace(/^[ \t]*#{1,6}[ \t]+(.+?)[ \t]*$/gm, '*$1*')
    .replace(/\[([^\]\n]+)\]\(([^)\n]+)\)/g, (_, label: string, url: string) =>
      label.trim() === url.trim() ? url : `${label}: ${url}`,
    )
    .replace(/^[ \t]*>[ \t]?/gm, '')
}

/**
 * Tokenize WhatsApp formatting. Order matters: longer/greedier patterns
 * (```mono```, `code`) must precede single-character ones (*, _, ~).
 *
 * The negative look-around `(?<![\p{L}\p{N}])` / `(?![\p{L}\p{N}])` keeps
 * mid-word characters literal (e.g. `2*3*4`, `snake_case_var`) — matching
 * WhatsApp's own permissiveness check.
 */
const FORMAT_RE =
  /```([\s\S]+?)```|`([^`\n]+?)`|(?<![\p{L}\p{N}*])\*([^*\n]+?)\*(?![\p{L}\p{N}*])|(?<![\p{L}\p{N}_])_([^_\n]+?)_(?![\p{L}\p{N}_])|(?<![\p{L}\p{N}~])~([^~\n]+?)~(?![\p{L}\p{N}~])/gu

function parseWhatsApp(text: string): Segment[] {
  const segments: Segment[] = []
  const re = new RegExp(FORMAT_RE.source, FORMAT_RE.flags)
  let last = 0
  let m: RegExpExecArray | null

  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      segments.push({ type: 'text', content: text.slice(last, m.index) })
    }
    if (m[1] !== undefined) segments.push({ type: 'monoBlock', content: m[1] })
    else if (m[2] !== undefined) segments.push({ type: 'mono', content: m[2] })
    else if (m[3] !== undefined) segments.push({ type: 'bold', content: m[3] })
    else if (m[4] !== undefined) segments.push({ type: 'italic', content: m[4] })
    else if (m[5] !== undefined) segments.push({ type: 'strike', content: m[5] })
    last = m.index + m[0].length
  }
  if (last < text.length) {
    segments.push({ type: 'text', content: text.slice(last) })
  }
  return segments.length > 0 ? segments : [{ type: 'text', content: text }]
}

function renderSegment(seg: Segment, key: number): ReactNode {
  if (seg.type === 'monoBlock') {
    return (
      <pre
        key={key}
        className="font-mono text-xs bg-black/30 rounded px-2 py-1 my-1 whitespace-pre-wrap break-words"
      >
        {seg.content}
      </pre>
    )
  }
  const inner = <EmojiText text={seg.content} />
  switch (seg.type) {
    case 'bold':
      return (
        <strong key={key} className="font-semibold">
          {inner}
        </strong>
      )
    case 'italic':
      return <em key={key}>{inner}</em>
    case 'strike':
      return <s key={key}>{inner}</s>
    case 'mono':
      return (
        <code key={key} className="font-mono text-[0.85em] bg-black/20 rounded px-1">
          {inner}
        </code>
      )
    default:
      return <Fragment key={key}>{inner}</Fragment>
  }
}

/**
 * Drop-in replacement for <EmojiText> that also renders WhatsApp formatting.
 */
export function WhatsAppText({ text, className }: { text: string; className?: string }) {
  const normalized = normalizeMarkdown(text)
  const segments = parseWhatsApp(normalized)
  const nodes = segments.map((seg, i) => renderSegment(seg, i))
  if (className) return <span className={className}>{nodes}</span>
  return <>{nodes}</>
}
