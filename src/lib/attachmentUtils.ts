import type { CopilotAttachment, AttachmentMediaType } from '@/contexts/CopilotContext'

export const ACCEPTED_ATTACHMENT_TYPES = 'image/jpeg,image/png,image/gif,image/webp,application/pdf'
export const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024 // 20 MB

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(',')[1])
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

export async function fileToAttachment(file: File): Promise<CopilotAttachment> {
  const data = await readFileAsBase64(file)
  const kind: 'image' | 'pdf' = file.type === 'application/pdf' ? 'pdf' : 'image'
  return {
    id: crypto.randomUUID(),
    name: file.name,
    kind,
    mediaType: file.type as AttachmentMediaType,
    data,
    previewUrl: kind === 'image' ? URL.createObjectURL(file) : '',
  }
}

export async function filesToAttachments(
  files: File[],
): Promise<{ attachments: CopilotAttachment[]; error: string | null }> {
  const oversized = files.find((f) => f.size > MAX_ATTACHMENT_BYTES)
  if (oversized) return { attachments: [], error: `"${oversized.name}" excede o limite de 20 MB` }
  const attachments = await Promise.all(files.map(fileToAttachment))
  return { attachments, error: null }
}

export function revokeAttachmentUrls(attachments: CopilotAttachment[]) {
  attachments.forEach((a) => { if (a.previewUrl) URL.revokeObjectURL(a.previewUrl) })
}
