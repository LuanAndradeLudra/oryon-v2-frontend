import { createContext, useContext } from 'react'
import type { Message } from '@/types'

// Módulo-folha (mesmo motivo de contextMenuCore.ts): `createContext()` precisa
// rodar uma única vez na vida do app. Morando aqui — sem importar nada do
// projeto além de tipos — este módulo nunca é reavaliado por HMR de um vizinho
// (MediaViewer.tsx importa lucide-react, framer-motion etc., que disparam Fast
// Refresh), então Provider e consumidor nunca divergem sobre qual objeto de
// contexto é "o" contexto.
export interface MediaViewerState {
  open: (message: Message) => void
}

export const MediaViewerCtx = createContext<MediaViewerState | null>(null)

export function useMediaViewer(): MediaViewerState {
  const c = useContext(MediaViewerCtx)
  if (!c) throw new Error('useMediaViewer must be used within <MediaViewerProvider>')
  return c
}
