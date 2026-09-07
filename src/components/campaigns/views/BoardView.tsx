import { BoardShell } from './board/BoardShell'

// A porta do quadro. O corpo mora em `board/BoardShell` — o esqueleto do
// W0.1 (EmptyState "Board em construção") sai aqui, e o `CampaignsPage` não
// muda: `?view=board` já roteava para cá desde o #138.
export function BoardView() {
  return <BoardShell />
}
