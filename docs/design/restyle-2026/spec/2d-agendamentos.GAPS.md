# Mapa de gaps — 2d Agendamentos (Fase C fechada + reconferência estática 2026-09-16)

Spec: `spec/2d-agendamentos.md` (61 itens, PNG+README — valores "estimado"
recebem `✅~` quando o código está a ±2px/tom vizinho). Código: `src/pages/
SchedulePage.tsx`, `src/components/schedule/*`. Tela é casca estática com mock
(decisão do usuário) — só visual avaliado. Tokens: --bd=surface-700,
--bd2=var(--bd2), --sf2=var(--sf2), --tx3=surface-500, --ac=brand-500.

**Reconferência (epic @ 7b1cd7e, fast-forward):** os 12 ❌ da Fase B abaixo já
tinham sido corrigidos na Fase C (commits `d9265af`/`7a418b3` e o `HEADER-02`
via `useRegisterTopBarSubtitle`, mesclado pelo Maestro). Reli linha a linha
todo o hairline `surface-800 → surface-700` e cada item específico contra o
código atual — todos batem. Único ajuste feito NESTA reconferência:
`scheduleMock.ts` não tinha nenhum par de eventos sobrepostos na tela toda,
então o `layoutLanes()` (EVENT-13) nunca era exercitado de fato pela grade
renderizada (só validável lendo o algoritmo). Adicionei `evt-10` ("Retorno ·
Camila Duarte", QUI/dayIndex 3, 11h30-12h30) sobrepondo `evt-4` (11h-12h) —
dado de exemplo consistente com o resto do mock, sem invenção de taxonomia
nova (mesmo tipo/cor "Retorno" já usado em evt-6/evt-7). Ver
`src/components/schedule/scheduleMock.ts:137-149`.

## Tabela

| ID | Status | arquivo:linha | o que o código faz hoje | menor mudança |
|---|---|---|---|---|
| SCHED-PAGE-01 | ✅~ | SchedulePage.tsx:46 (fundo vem do AppShell) | sem fundo próprio; herda surface-950 do shell | — |
| SCHED-PAGE-02 | ✅ | ScheduleWeekGrid.tsx:33-37 | `flex-1 overflow-auto` + grid sem borda externa | — |
| SCHED-HEADER-01 | ✅~ | layout/TopBar.tsx PAGE_TITLES `/schedule` | título vem do TopBar (14px/700 pelo canvas das outras telas; spec estimou 18-20 pelo PNG) | shell (orquestrador) — nada aqui |
| SCHED-HEADER-02 | ✅ | SchedulePage.tsx:48-51 | `useRegisterTopBarSubtitle` registra "N esta semana · M aguardando confirmação" no subtítulo do TopBar; `periodLabel` (linha 62) só com a data | — |
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
| SCHED-TOOLBAR-09 | ✅ | ScheduleToolbar.tsx:90 | `border-b border-surface-700` | — |
| SCHED-TOOLBAR-10 | ✅ | — | — | — |
| SCHED-GRID-01 | ✅ | ScheduleWeekGrid.tsx:36 | `56px repeat(N, 1fr)` | — |
| SCHED-GRID-02 | ✅~ | ScheduleWeekGrid.tsx:13-15,39 | cabeçalho `h-11` (44px) ✅; linhas de hora fixas em 64px (ROW_HEIGHT) com scroll, não `repeat(9,1fr)` — densidade próxima | opcional: `ROW_HEIGHT` derivado da altura disponível |
| SCHED-GRID-03 | ✅ | ScheduleWeekGrid.tsx:49 | `text-[11px] font-semibold uppercase tracking-wide text-surface-400` | — |
| SCHED-GRID-04 | ✅ | ScheduleWeekGrid.tsx:50 | `text-sm font-semibold` | — |
| SCHED-GRID-05 | ✅ | ScheduleWeekGrid.tsx:123 | coluna do corpo também tinge `day.isToday && 'bg-accent-soft'` (antes do fim de semana, linha 124) | — |
| SCHED-GRID-06 | ✅~ | ScheduleWeekGrid.tsx:53 | `text-3xs` (10px) `font-bold text-brand-400` | — |
| SCHED-GRID-07 | ✅ | ScheduleWeekGrid.tsx:46,81 | `bg-[var(--sf2)]` no fim de semana | — |
| SCHED-GRID-08 | ✅ | ScheduleWeekGrid.tsx:80,85,101,105,122,131 | hairlines nos 2 eixos em `border-surface-700` | — |
| SCHED-GRID-09 | ✅~ | ScheduleWeekGrid.tsx:64 | `text-2xs` (11px vs 10.5) `text-surface-500 text-right pr-1.5` | — |
| SCHED-GRID-10 | ✅ | ScheduleWeekGrid.tsx:61-68 | rótulo no topo de cada célula de 64px | — |
| SCHED-GRID-11 | ✅ | — | tokens por tema | — |
| SCHED-NOWLINE-01 | ✅ | ScheduleWeekGrid.tsx:95 | `h-[2px] bg-danger` | — |
| SCHED-NOWLINE-02 | ✅ | ScheduleWeekGrid.tsx:98 | `w-2 h-2 rounded-full bg-danger -left-1` | — |
| SCHED-NOWLINE-03 | ✅ | ScheduleWeekGrid.tsx:75 | `showNowLine = day.isToday && …` | — |
| SCHED-NOWLINE-04 | ✅ | ScheduleWeekGrid.tsx:95 | `z-10`; blocos sem z-index → linha por cima | — |
| SCHED-EVENT-01 | ✅ | ScheduleWeekGrid.tsx:102-115 | `absolute`, top/height por minutos | — |
| SCHED-EVENT-02 | ✅ | ScheduleEventBlock.tsx:38 | `rounded-xs` (6px) | — |
| SCHED-EVENT-03 | ✅~ | ScheduleEventBlock.tsx:31 | `bg-surface-800/95` (superfície a 95%) | opcional `bg-surface-800` |
| SCHED-EVENT-04 | ✅ | ScheduleEventBlock.tsx:32 | `border border-surface-700` | — |
| SCHED-EVENT-05 | ✅ | ScheduleEventBlock.tsx:28,32 | `border-l-[3px]` + `borderLeftColor: event.color` | — |
| SCHED-EVENT-06 | ✅ | ScheduleEventBlock.tsx:31 | `px-2 py-[5px]` | — |
| SCHED-EVENT-07 | ✅ | ScheduleEventBlock.tsx:38 | `text-[11.5px] font-semibold` | — |
| SCHED-EVENT-08 | ✅~ | ScheduleEventBlock.tsx:41 | `text-2xs text-surface-400` | — |
| SCHED-EVENT-09 | ✅~ | ScheduleEventBlock.tsx:18,47-54 | chip `color-chip` 10px/600 ≈16px; só quando `height >= 46` e não cancelado | — |
| SCHED-EVENT-10 | ✅ | ScheduleEventBlock.tsx:42 | `border-brand-500 ring-[3px] ring-accent-soft` (anel 3px) | — |
| SCHED-EVENT-11 | ✅ | ScheduleEventBlock.tsx:34,38 | `opacity-55` + `line-through` | — |
| SCHED-EVENT-12 | ✅ | ScheduleEventBlock.tsx:39-40 | base `border-l-[3px]`; `isCampaign` sobrescreve com `border-l` (twMerge resolve o conflito por ordem, último vence) → 1px tracejado | — |
| SCHED-EVENT-13 | ✅ | ScheduleWeekGrid.tsx:22-56 (`layoutLanes`), 115-116, 155; ScheduleEventBlock.tsx:33-34 | clusters de sobreposição empacotados em lanes, `left`/`width` em % por evento; QUI (dayIndex 3) agora tem `evt-4` (11h-12h) + `evt-10` (11h30-12h30, adicionado nesta reconferência) exercitando o split ao vivo | — |
| SCHED-EVENT-14 | ✅ | scheduleMock.ts (`event.color`, STATUS_CHIP_VAR) | cores de dado fixas nos 2 temas | — |
| SCHED-POPOVER-01 | ✅ | ScheduleEventPopover.tsx:17 | `POPOVER_WIDTH = 300` | — |
| SCHED-POPOVER-02 | ✅ | ScheduleEventPopover.tsx:65 | `rounded-[8px]` | — |
| SCHED-POPOVER-03 | ✅ | ScheduleEventPopover.tsx:65 → index.css:757-760 | `.overlay-surface` = `box-shadow: var(--shadow-overlay)` | — |
| SCHED-POPOVER-04 | ✅ | ScheduleEventPopover.tsx:68-72 | `w-2.5 h-2.5 rounded-xs` na cor do evento | — |
| SCHED-POPOVER-05 | ✅ | ScheduleEventPopover.tsx:74 | `text-sm font-bold` | — |
| SCHED-POPOVER-06 | ✅ | ScheduleEventPopover.tsx:94-101 | `MoreHorizontal` (kebab, não-funcional, `title` explica; fechar por Esc/clique-fora) | — |
| SCHED-POPOVER-07 | ✅ | ScheduleEventPopover.tsx:75-78 | `text-2xs text-surface-400` | — |
| SCHED-POPOVER-08 | ✅ | ScheduleEventPopover.tsx:104-138 | grid `82px 1fr`; Responsável com Avatar; Contato em `text-accent-dark` (linha 108); Origem `color-chip` âmbar só quando `origin === 'Agente Vendas'` (linhas 124-135, único exemplo com cor confirmada no mock — demais origens ficam no chip neutro pra não inventar taxonomia) | — |
| SCHED-POPOVER-09 | ✅ | ScheduleEventPopover.tsx:93,97,104,112 | `text-xs text-surface-500` | — |
| SCHED-POPOVER-10 | ✅ | ScheduleEventPopover.tsx:123-139 | `border-t border-surface-700 pt-2.5`; primary sm / neutral sm / ghost `text-danger` | — |
| SCHED-POPOVER-11 | ✅ | ScheduleEventPopover.tsx:124-138 | Abrir conversa → Reagendar → Cancelar (`ml-auto`) | — |
| SCHED-POPOVER-12 | ✅ | ScheduleEventPopover.tsx:52-67 | tenta à DIREITA do bloco primeiro, cai pra ESQUERDA, e só cai pra abaixo (`fitsBelow`) como último recurso | — |
| SCHED-POPOVER-13 | ✅ | index.css `.overlay-surface` | superfície de overlay por tema | — |
| SCHED-POPOVER-14 | ✅ | ScheduleWeekGrid.tsx:122-129 | só com `selected` | — |

## Resumo por status (pós-reconferência 2026-09-16)

✅ 49 · ✅~ 12 · ❌ 0 · ❓ 0 · [!] 0 — 61/61.

Todos os 12 ❌ da Fase B foram fechados na Fase C (commits `d9265af`,
`7a418b3`, mais o `useRegisterTopBarSubtitle` do Maestro para HEADER-02) e
reconferidos linha a linha nesta passagem contra o epic @ `7b1cd7e`. A única
mudança de código feita NESTA reconferência foi o `evt-10` em
`scheduleMock.ts` (ver nota no topo) — sem ele o `layoutLanes()` (EVENT-13)
era correto mas nunca exercitado visualmente. `ScheduleListView.tsx:37`
(hairline, fora da spec numerada) também confirmado em `border-surface-700`/
`divide-surface-700`.

**Conferidos:** 61/61 · **Corrigidos nesta reconferência:** 1 (dado de mock
em `scheduleMock.ts`, sem mudança de spec/verdito) · **[!]:** 0.

## Rodada 2 (2026-09-21)

| ID | Achado (PNG) | Correção | Status |
|---|---|---|---|
| R2-2D-01 | chips de status/origem do mock são SOFT; `.color-chip` é sólido | `ScheduleChips.tsx` (bloco, popover, lista) | ✅ código · ❓ ao vivo |
| R2-2D-02 | bloco de 30 min: linha única "Suporte · Lab Vida 14:00" | `compact` em ScheduleEventBlock.tsx | ✅ código · ❓ ao vivo |
| R2-2D-03 | horário "08:00 – 09:00" com espaços; cancelado na mesma linha ("· cancelado pelo contato", esmaecido) | ScheduleEventBlock/Popover/ListView | ✅ código · ❓ ao vivo |

Os ✅ da Fase C acima passam a valer só como "código × spec"; ao vivo segue ❓.
