# Shell mobile (390px) × vocabulário — Rodada 2

Relatório **só leitura** (domínio `src/components/layout` é do Maestro — nada aqui foi editado).
Sem mock mobile: cheque é contra o vocabulário (alturas, raios, sombras, contraste no claro, chips),
não pixel-a-pixel contra PNG.

Escopo: os 3 componentes de `layout/` que efetivamente renderizam em mobile —
`AppShellMobile.tsx`, `BottomTabBar.tsx`, `MobilePageHeader.tsx` (confirmado via grep: nenhum outro
arquivo de `layout/` é importado por eles nem consultado com `useIsMobile`; `TopBar.tsx`/`NavSidebar.tsx`
são desktop-only, trocados pelo par acima em `AppShell.tsx`).

## Achados (o que NÃO bate com o vocabulário)

| # | Componente | Propriedade | Hoje (classe · arquivo:linha) | Proposta |
|---|---|---|---|---|
| 1 | `BottomTabBar.tsx` | Cor da aba ativa (ícone + rótulo) | `text-brand-400` — `BottomTabBar.tsx:90` | `text-accent-dark`. Mesmo token (`--color-brand-400` = `#14B8A6` no claro) já medido em ~2,39:1 contra `--bg` no claro nesta rodada (achado que motivou a troca de `text-brand-400/500`→`text-accent-dark` em link/texto nas minhas telas); aqui é o indicador de estado da aba selecionada — não é ícone decorativo, então o carve-out não se aplica. |
| 2 | `BottomTabBar.tsx` + `MobilePageHeader.tsx` | Contador não-lido (badge) | `bg-danger text-white` — `BottomTabBar.tsx:96`, `MobilePageHeader.tsx:93` | `bg-[var(--color-btn-danger-bg)] text-[var(--color-btn-danger-fg)]`. `--color-danger` bruto é o mesmo token que o comentário de `ui/Button.tsx:28` já documenta como reprovado em contraste ("bg-danger cru falhava contraste") — daí existir o par dedicado `--color-btn-danger-bg/fg` (`#B91C1C`/branco, 6,48:1 nos dois temas). Calculado aqui: `--color-danger` no escuro é `#EF4444` → com texto branco 9px/700 dá ~3,46:1, abaixo do AA (4,5:1) para texto desse tamanho. Bônus: o badge de não-lidas do sidebar desktop (`ui/sidebar.tsx:171`) já usa esse par dedicado (`--color-btn-primary-bg/fg`) em vez de uma cor de categoria crua — mesmo princípio, token diferente porque lá é "destaque", aqui é "urgência". |
| 3 | `MobilePageHeader.tsx` | Hover dos botões-ícone (voltar / logo-home / sino) | `hover:bg-surface-800` — `MobilePageHeader.tsx:47,56,89` | `hover:bg-[var(--rowhover)]`. No claro, `--color-surface-800` (`#FFFFFF`) fica quase idêntico ao fundo do header (`--color-surface-950` = `#FAFAFC`) — hover quase imperceptível. `--rowhover` é o token que a Rodada 2 já padronizou para esse afago (`ui/Dropdown.tsx`, `Button.tsx` variant `ghost`, e os dois achados que acabei de corrigir em `src/components/common/LineFilterChip.tsx` neste mesmo commit) — funciona em ambos os temas porque é uma sobreposição translúcida, não um degrau da escala de superfície. |
| 4 | `MobilePageHeader.tsx` | Cor do título da página | `text-surface-50` — `MobilePageHeader.tsx:77` | Considerar `text-surface-100`, o tom usado para texto de maior ênfase nas outras telas (ex.: título do modal de notificação em `TopBar.tsx:867`, valor da busca em `TopBar.tsx:386`). `surface-50` é o extremo da escala (branco quase puro no escuro / quase preto no claro) — não chega a falhar contraste, mas é o único lugar do shell usando esse degrau para um título; possível inconsistência, não bug confirmado. |

## Sem achado (conferido, compatível com o vocabulário)

- `AppShellMobile.tsx`: fundo `bg-surface-950` (raiz), sem raio/sombra fora de overlay — shell puramente estrutural (`flex flex-col h-[100dvh]`), nada a reportar.
- `BottomTabBar.tsx`: container `bg-surface-950 border-t border-surface-700`, sem `rounded-xl/2xl`, sem sombra decorativa (a barra é fixa no rodapé, não overlay — corretamente sem `--shadow-overlay` também). `min-h-[56px]` por aba, ícone 20px, rótulo 10px — dentro da faixa de densidade mobile já usada no resto do shell.
- `MobilePageHeader.tsx`: `bg-surface-950 border-b border-surface-700`, botões `rounded-lg` (8px, dentro da escala), sem sombra. `min-height: calc(3.5rem + env(safe-area-inset-top))` — trata safe-area corretamente.
- Nenhum `.color-chip` sólido usado como chip de status nesses 3 arquivos (não há chips de status aqui, só o badge numérico do achado #2).

## Nota à parte (não é vocabulário, mas achado no caminho)

`aria-label="NavegaÃ§Ã£o principal"` em `BottomTabBar.tsx:72` e comentários com mojibake
(`â€"`, `Â´`) em `AppShellMobile.tsx:6,21` — encoding quebrado (UTF-8 lido/salvo como Latin-1 em algum
ponto), não CSS. Não é vocabulário visual e não editei (arquivo é do Maestro), mas o `aria-label`
incorreto chega a leitor de tela e vale corrigir na próxima passada por `layout/`.
