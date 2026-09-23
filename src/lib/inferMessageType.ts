import type { MessageType } from '@/types'

/**
 * Classifica um MIME type no tipo de mensagem — mesma regra que o backend
 * usa em `conversations.service.ts` (`sendMessage`) pra decidir o `MessageType`
 * de um upload. Extraído de `useMessages.ts` (achado ao investigar
 * "legenda de imagem continua aparecendo", 2026-09-23): `MessageInput.tsx`
 * também precisa dessa classificação — mandar `mediaCaption: file.name` só
 * faz sentido pra DOCUMENTO (SCRUM-1158), e antes disso só o hook sabia
 * classificar o tipo, então o input mandava o nome do arquivo pra QUALQUER
 * anexo, contornando a regra que o backend já tinha certa.
 */
export function inferMessageType(mimeType: string): MessageType {
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.startsWith('audio/')) return 'audio'
  if (mimeType.startsWith('video/')) return 'video'
  return 'document'
}
