# Mapa de gaps — 2d Agendamentos (Fase B, estático)

Spec: `spec/2d-agendamentos.md` (61 itens, PNG+README — valores "estimado"
recebem `✅~` quando o código está a ±2px/tom vizinho). Código: `src/pages/
SchedulePage.tsx`, `src/components/schedule/*`. Tela é casca estática com mock
(decisão do usuário) — só visual avaliado. Tokens: --bd=surface-700,
--bd2=var(--bd2), --sf2=var(--sf2), --tx3=surface-500, --ac=brand-500.

**Achado transversal:** todo hairline da tela usa `border-surface-800`, que
após `527a4e6` é a SUPERFÍCIE (#FFFFFF claro / #161E1E escuro), não a borda
(`--bd` = `surface-700`, #E4E6EC / #243333). No claro as hairlines da grade e
da toolbar somem contra o fundo branco. Corrigir `surface-800 → surface-700`
em todas as bordas dos arquivos abaixo (ScheduleToolbar:90; ScheduleWeekGrid:
39,44,60,64,80,88; ScheduleListView:37 `border-surface-800`/`divide-surface-800`).

## Tabela

| ID | Status | arquivo:linha | o que o código faz hoje | menor mudança |
|---|---|---|---|---|
| SCHED-PAGE-01 | ✅~ | SchedulePage.tsx:46 (fundo vem do AppShell) | sem fundo próprio; herda surface-950 do shell | — |
| SCHED-PAGE-02 | ✅ | ScheduleWeekGrid.tsx:33-37 | `flex-1 overflow-auto` + grid sem borda externa | — |
| SCHED-HEADER-01 | ✅~ | layout/TopBar.tsx PAGE_TITLES `/schedule` | título vem do TopBar (14px/700 pelo canvas das outras telas; spec estimou 18-20 pelo PNG) | shell (orquestrador) — nada aqui |
| SCHED-HEADER-02 | ❌ | SchedulePage.tsx:54; layout/TopBar.tsx PAGE_SUBTITLES `/schedule` = "Agenda semanal (exemplo)" | contagens "N esta semana · M aguardando" estão concatenadas no rótulo do período da TOOLBAR, não no subtítulo do header | mover pro subtítulo do TopBar (layout/ = orquestrador; precisa de canal página→TopBar, ex. `useRegisterTopBarSubtitle` ou prop no contexto existente) e deixar `periodLabel` só com "15 – 21 de setembro" |
| SCHED-HEADER-03 | ✅ | SchedulePage.tsx:38-43 | `Button size="sm" variant="primary" leftIcon={Plus}` via TopBarActions | — |
| SCHED-HEADER-04 | ✅~ | layout/TopBar.tsx | busca com `/` é do shell | — |
| SCHED-HEADER-05 | ✅~ | layout/TopBar.tsx | sino + avatar são do shell | — |
| SCHED-HEADER-06 | ✅ | — | tokens por tema | — |
| SCHED-TOOLBAR-01 | ✅ | ScheduleToolbar.tsx:90 | `h-11` = 44px | — |
| SCHED-TOOLBAR-02 | ✅~ | ScheduleToolbar.tsx:96,104 | `w-7 h-7` (28px), `border border-surface-700`, sem fundo | — |
| SCHED-TOOLBAR-03 | ✅ | ScheduleToolbar.tsx:110 | `Button size="sm" variant="neutral"` "Hoje" | — |
| SCHED-TOOLBAR-04 | ✅ | ScheduleToolbar.tsx:113 | `text-sm font-bold` (14/700) — conteúdo ver HEADER-02 | — |
| SCHED-TOOLBAR-05 | ✅~ | ScheduleToolbar.tsx:114 | `text-2xs` (11px) `text-surface-500` | — |
| SCHED-TOOLBAR-06 | ✅ | ScheduleToolbar.tsx:118 | primitivo `SegmentedControl` Dia/Semana/Lista | — |
| SCHED-TOOLBAR-07 | ✅ | ScheduleToolbar.tsx:119-125 | `FilterDropdown` "Todos os agentes" com chevron | — |
| SCHED-TOOLBAR-08 | ✅ | ScheduleToolbar.tsx:126-132 | `FilterDropdown` "Tipo" | — |
| SCHED-TOOLBAR-09 | ❌ | ScheduleToolbar.tsx:90 | `border-b border-surface-800` (= superfície, invisível no claro) | `border-surface-700` |
| SCHED-TOOLBAR-10 | ✅ | — | — | — |
| SCHED-GRID-01 | ✅ | ScheduleWeekGrid.tsx:36 | `56px repeat(N, 1fr)` | — |
| SCHED-GRID-02 | ✅~ | ScheduleWeekGrid.tsx:13-15,39 | cabeçalho `h-11` (44px) ✅; linhas de hora fixas em 64px (ROW_HEIGHT) com scroll, não `repeat(9,1fr)` — densidade próxima | opcional: `ROW_HEIGHT` derivado da altura disponível |
| SCHED-GRID-03 | ✅ | ScheduleWeekGrid.tsx:49 | `text-[11px] font-semibold uppercase tracking-wide text-surface-400` | — |
| SCHED-GRID-04 | ✅ | ScheduleWeekGrid.tsx:50 | `text-sm font-semibold` | — |
| SCHED-GRID-05 | ❌ | ScheduleWeekGrid.tsx:45 vs 79-82 | só o CABEÇALHO do dia atual tem `bg-accent-soft`; a coluna do corpo (linha 81) só trata fim de semana | linha 81: adicionar `day.isToday && 'bg-accent-soft'` (antes do weekend) |
| SCHED-GRID-06 | ✅~ | ScheduleWeekGrid.tsx:53 | `text-3xs` (10px) `font-bold text-brand-400` | — |
| SCHED-GRID-07 | ✅ | ScheduleWeekGrid.tsx:46,81 | `bg-[var(--sf2)]` no fim de semana | — |
| SCHED-GRID-08 | ❌ | ScheduleWeekGrid.tsx:39,44,60,64,80,88 | hairlines existem nos 2 eixos mas em `border-surface-800` (superfície) | `border-surface-700` |
| SCHED-GRID-09 | ✅~ | ScheduleWeekGrid.tsx:64 | `text-2xs` (11px vs 10.5) `text-surface-500 text-right pr-1.5` | — |
| SCHED-GRID-10 | ✅ | ScheduleWeekGrid.tsx:61-68 | rótulo no topo de cada célula de 64px | — |
| SCHED-GRID-11 | ✅ | — | tokens por tema | — |
| SCHED-NOWLINE-01 | ✅ | ScheduleWeekGrid.tsx:95 | `h-[2px] bg-danger` | — |
| SCHED-NOWLINE-02 | ✅ | ScheduleWeekGrid.tsx:98 | `w-2 h-2 rounded-full bg-danger -left-1` | — |
| SCHED-NOWLINE-03 | ✅ | ScheduleWeekGrid.tsx:75 | `showNowLine = day.isToday && …` | — |
| SCHED-NOWLINE-04 | ✅ | ScheduleWeekGrid.tsx:95 | `z-10`; blocos sem z-index → linha por cima | — |
| SCHED-EVENT-01 | ✅ | ScheduleWeekGrid.tsx:102-115 | `absolute`, top/height por minutos | — |
| SCHED-EVENT-02 | ❌ | ScheduleEventBlock.tsx:31 | `rounded-md` = 8px | `rounded-xs` (6px) |
| SCHED-EVENT-03 | ✅~ | ScheduleEventBlock.tsx:31 | `bg-surface-800/95` (superfície a 95%) | opcional `bg-surface-800` |
| SCHED-EVENT-04 | ✅ | ScheduleEventBlock.tsx:32 | `border border-surface-700` | — |
| SCHED-EVENT-05 | ✅ | ScheduleEventBlock.tsx:28,32 | `border-l-[3px]` + `borderLeftColor: event.color` | — |
| SCHED-EVENT-06 | ✅ | ScheduleEventBlock.tsx:31 | `px-2 py-[5px]` | — |
| SCHED-EVENT-07 | ✅ | ScheduleEventBlock.tsx:38 | `text-[11.5px] font-semibold` | — |
| SCHED-EVENT-08 | ✅~ | ScheduleEventBlock.tsx:41 | `text-2xs text-surface-400` | — |
| SCHED-EVENT-09 | ✅~ | ScheduleEventBlock.tsx:18,47-54 | chip `color-chip` 10px/600 ≈16px; só quando `height >= 46` e não cancelado | — |
| SCHED-EVENT-10 | ❌ | ScheduleEventBlock.tsx:35 | `border-brand-500 ring-2 ring-brand-500/30` — anel 2px | `ring-[3px] ring-accent-soft` (anel 3px, README 3.6) |
| SCHED-EVENT-11 | ✅ | ScheduleEventBlock.tsx:34,38 | `opacity-55` + `line-through` | — |
| SCHED-EVENT-12 | ❌ | ScheduleEventBlock.tsx:32-33 | campanha fica `border-dashed` ✅ mas mantém `border-l-[3px]` (faixa neutra tracejada de 3px) | em `isCampaign`: `border-l` (volta a 1px) |
| SCHED-EVENT-13 | ❌ | ScheduleWeekGrid.tsx:102-115; ScheduleEventBlock.tsx:31 | todo bloco é `left-1 right-1` (largura cheia) — eventos simultâneos se sobrepõem em vez de dividir a coluna | calcular "lanes" por sobreposição na coluna e passar `left/width` em % (QUI 18 do mock tem 2 às 11h) |
| SCHED-EVENT-14 | ✅ | scheduleMock.ts (`event.color`, STATUS_CHIP_VAR) | cores de dado fixas nos 2 temas | — |
| SCHED-POPOVER-01 | ✅ | ScheduleEventPopover.tsx:17 | `POPOVER_WIDTH = 300` | — |
| SCHED-POPOVER-02 | ✅ | ScheduleEventPopover.tsx:65 | `rounded-[8px]` | — |
| SCHED-POPOVER-03 | ✅ | ScheduleEventPopover.tsx:65 → index.css:757-760 | `.overlay-surface` = `box-shadow: var(--shadow-overlay)` | — |
| SCHED-POPOVER-04 | ✅ | ScheduleEventPopover.tsx:68-72 | `w-2.5 h-2.5 rounded-xs` na cor do evento | — |
| SCHED-POPOVER-05 | ✅ | ScheduleEventPopover.tsx:74 | `text-sm font-bold` | — |
| SCHED-POPOVER-06 | ❌ | ScheduleEventPopover.tsx:80-87 | canto superior direito tem **X** (fechar), não "···" | trocar ícone por `MoreHorizontal` (kebab; fechar continua por Esc/clique-fora) |
| SCHED-POPOVER-07 | ✅ | ScheduleEventPopover.tsx:75-78 | `text-2xs text-surface-400` | — |
| SCHED-POPOVER-08 | ❌ | ScheduleEventPopover.tsx:90-121 | grid `82px 1fr` ✅; Responsável com Avatar ✅; **Contato** em `text-surface-200` (spec: cor de link/acento); **Origem** chip neutro `border-surface-700 bg-surface-800 text-surface-300` (spec: chip colorido, âmbar no mock) | Contato: `text-accent-dark` (ou `text-brand-500`); Origem: `color-chip` com `--chip` por origem (mock precisa de `originColor` em scheduleMock — dado de exemplo, não backend) |
| SCHED-POPOVER-09 | ✅ | ScheduleEventPopover.tsx:93,97,104,112 | `text-xs text-surface-500` | — |
| SCHED-POPOVER-10 | ✅ | ScheduleEventPopover.tsx:123-139 | `border-t border-surface-700 pt-2.5`; primary sm / neutral sm / ghost `text-danger` | — |
| SCHED-POPOVER-11 | ✅ | ScheduleEventPopover.tsx:124-138 | Abrir conversa → Reagendar → Cancelar (`ml-auto`) | — |
| SCHED-POPOVER-12 | ❌ | ScheduleEventPopover.tsx:49-53 | ancora ABAIXO do card (`top = anchorRect.bottom + 8`, `left = anchorRect.left`) | ancorar à DIREITA: `left = anchorRect.right + 8`, `top = anchorRect.top`; cair pra esquerda/abaixo se não couber |
| SCHED-POPOVER-13 | ✅ | index.css `.overlay-surface` | superfície de overlay por tema | — |
| SCHED-POPOVER-14 | ✅ | ScheduleWeekGrid.tsx:122-129 | só com `selected` | — |

## Resumo por status

✅ 37 · ✅~ 12 · ❌ 12 · ❓ 0 · [!] 0 — 61/61.

## ❌ por arquivo, em ordem de impacto

1. **`ScheduleWeekGrid.tsx`** — hairlines em `surface-800` (GRID-08; somem no
   claro), coluna de hoje sem tingimento no corpo (GRID-05), eventos
   simultâneos sobrepostos (EVENT-13).
2. **`ScheduleToolbar.tsx`** — hairline inferior em `surface-800` (TOOLBAR-09).
3. **`ScheduleEventBlock.tsx`** — raio 8→6 (EVENT-02), anel 2→3px (EVENT-10),
   campanha ainda com faixa de 3px (EVENT-12).
4. **`ScheduleEventPopover.tsx`** — ancoragem abaixo em vez de ao lado
   (POPOVER-12), X em vez de ··· (POPOVER-06), Contato sem cor de link e
   Origem sem cor (POPOVER-08).
5. **`SchedulePage.tsx` + `layout/TopBar.tsx`** — contagens no rótulo da
   toolbar em vez do subtítulo do header (HEADER-02; parte em `layout/` =
   orquestrador).
6. `ScheduleListView.tsx:37` — mesma troca `surface-800 → surface-700` (fora
   da spec, lista não tem mockup; consistência).
