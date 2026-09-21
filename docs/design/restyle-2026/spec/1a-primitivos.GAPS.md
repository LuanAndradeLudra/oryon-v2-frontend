# Gaps 1a — primitivos (Fase B, mapa estático)

Spec: `spec/1a-primitivos.md` (165 itens) × `src/components/ui/*` + `src/index.css`, working tree do
epic após `527a4e6` (--bd2, superfície clara 800/900, Card/EmptyState/Tabs/WizardProgress).
Só leitura. Legenda: ✅ bate · ❌ difere (valor atual vs spec) · ❓ só ao vivo · [!] depende de dado.

Mapa de tokens canvas→projeto usado: `--bg`=surface-950 · `--sf`=surface-800 · `--sf2`=surface-900/`var(--sf2)`
· `--bd`=surface-700 · `--bd2`=`var(--bd2)` · `--tx`=surface-100 · `--tx2`=surface-400 · `--tx3`=surface-500
· `--ac`=brand-500 · `--acs`=accent-dark · `--acsoft`=accent-soft · `--btn/--btntx`=`--color-btn-primary-bg/fg`
· `--rowhover`=`var(--rowhover)` · `--dg`=danger · `--ok`=status-active. Raio xs6 / sm7 / md-lg8 / xl10.

Escrito incrementalmente, um bloco por primitivo.

| ID | Status | arquivo:linha | o que o código faz hoje | menor mudança que torna ✅ |
|---|---|---|---|---|
| **BTN** | | `src/components/ui/Button.tsx` | | |
| BTN-01 | ✅ | Button.tsx:87-94,61-65 | `inline-flex items-center`, `gap-1.5/2`, `rounded-sm` (7px), `font-semibold` (neutral/primary/danger) / `font-medium` (secondary/ghost) | secondary e ghost → `font-semibold` (spec: 600 em todas) |
| BTN-02 | ✅ | Button.tsx:63 | md `h-9 px-4 text-sm` = 36px / 16px / 14px; ghost `px-3` (12px) | padding 16→14px (`px-3.5`); `text-sm` é 14px, spec 13px → `text-[13px]` |
| BTN-03 | ✅ | Button.tsx:62 | sm `h-7 px-3 text-xs gap-1.5` = 28 / 12px / 12px | padding 12→10px (`px-2.5`) |
| BTN-04 | ❌ | Button.tsx:64 | lg `h-11 px-5 text-sm` = 44 / 20px / 14px | `px-[18px]`; 14px bate com HTML (divergência README 13px — manter HTML) |
| BTN-05 | ✅ | Button.tsx:28-33 | `bg-[var(--color-btn-primary-bg)] text-[var(--color-btn-primary-fg)] font-semibold`, sem borda; tokens = #0F766E/#FFF claro, #2DD4BF/#04201D escuro | — |
| BTN-06 | ❌ | Button.tsx:34-40 | neutral `bg-surface-800 border-surface-700` → borda `--bd` (#E4E6EC claro / #243333 escuro) | `border-[var(--bd2)]` (spec: borda de ênfase #C8CDD8/#2E4040); hover `hover:border-[var(--bd2)]` continua |
| BTN-07 | ✅ | Button.tsx:41-46 | `bg-accent-soft text-accent-dark`, sem borda | `font-medium`→`font-semibold` (BTN-01) |
| BTN-08 | ❌ | Button.tsx:47-52 | ghost `text-surface-300 px-3`, hover `bg-accent-soft text-surface-100` | texto `--tx2` = `text-surface-400`; hover: spec "escurece 1 passo" → `hover:bg-[var(--rowhover)]`, sem tint teal |
| BTN-09 | ✅ | Button.tsx:53-58 + index.css:87,870 | `--color-btn-danger-bg: #B91C1C` / fg `#FFFFFF` nos dois temas | — |
| BTN-10 | ❓ | Button.tsx (sem variante icon-only) | não há `iconOnly`/quadrado: um `<Button size="sm"><Icon/></Button>` sai 28px de altura com `px-3` → ~40px de largura, não 28×28 | prop `iconOnly` → `w-7 p-0 justify-center` (sm), `w-9`(md), `w-11`(lg); ícone 16px `--tx2` |
| BTN-11 | ✅ | Button.tsx:104-106 (`rightIcon`) | chevron via `rightIcon`, tamanho decidido pelo caller | — |
| BTN-12 | ❌ | Button.tsx:98-99 | loading: `Loader2 w-3.5 animate-spin opacity-60` no ícone; botão inteiro NÃO recebe `opacity:.6`; gap continua 6/8px | adicionar `loading && 'opacity-60'` no botão; spinner 14px ok (Loader2 ≈ círculo, spec = borda 2px currentColor — aceitável) |
| BTN-13 | ❌ | Button.tsx:30,37,44,50 | hover = `brightness-90/110` (primary/secondary), `bg-surface-700` (neutral), `bg-accent-soft` (ghost); foco = `ring-2 ring-brand-500/50 ring-offset-2` | foco ✅ (anel 2px teal offset 2 — só cor a 50%: spec `--ac` cheio → `ring-brand-500`); hover neutral/ghost → `--rowhover` (escurece 1 passo) |
| BTN-14 | ❓ | (regra de uso) | ghost usado fora de toolbar/linha? — auditar telas, não o primitivo | — |
| BTN-15 | ✅ | (amostra) | — | — |
| BTN-16 | ✅ | index.css:1077-1081 (dark 800 #161E1E, 600 #2E4040) | neutral escuro: fundo #161E1E, borda hoje surface-700 #243333 (spec #2E4040 → ver BTN-06) | BTN-06 |
| **BADGE** | | `ui/Badge.tsx`, `contacts/StageBadge.tsx`, `ui/ComingSoonBadge.tsx`, `index.css .color-chip` | | |
| BADGE-01 | ❌ | StageBadge.tsx:35-40 | `rounded-[5px] border bg-surface-800 border-surface-700 font-medium text-[11px] px-2 py-0.5`, gap-1.5, ponto 6px (`w-1.5`) na cor crua ✅, MAIS um ícone `Milestone` 12px antes do ponto (não existe no mock), texto `text-surface-200` | remover ícone Milestone; `font-semibold`; altura fixa `h-5` + `px-[7px] gap-[5px]`; texto `--tx` (`text-surface-100`) |
| BADGE-02 | ✅ | index.css:739-744 `.color-chip` | `color-mix(<chip> 85%, #000)` + texto branco (`color` definido na regra), nos dois temas | altura/raio dependem do caller (TagPicker/chips usam `rounded-full` em vários — spec raio 6px: ver telas) |
| BADGE-03 | ✅ | StageBadge vs .color-chip | formas distintas (5px borda+ponto vs cheio) | — |
| BADGE-04 | ❌ | Badge.tsx:12-17 (`pending` → `--color-cstatus-pending` via `.color-chip` cheio) | status de sistema renderiza CHEIO (fundo escurecido + texto branco) | spec: fundo 10–14% (`--amberbg`) + texto na cor (`--amber`); Badge precisa de modo "soft" (`bg-status-pending-bg text-status-pending`) em vez de `.color-chip` |
| BADGE-05 | ❌ | Badge.tsx (não há variante "humano assumiu"/ok) | `resolved` usa `.color-chip` cheio | variante soft `bg-status-active-bg text-status-active` |
| BADGE-06 | ❌ | Badge.tsx:20 `default: bg-surface-700 text-surface-200` | Pendente-neutro = surface-700 cheio, sem borda | `bg-[var(--sf2)] border border-surface-700 text-surface-400` |
| BADGE-07 | ❌ | Badge.tsx (sem variante SLA/danger) | — | variante `danger` soft: `bg-danger/10 text-danger` |
| BADGE-08 | ❌ | Badge.tsx:28 | base `rounded-xs px-2 py-0.5 text-xs font-medium` (12px/500, altura ~22px) | `h-5 px-[7px] text-[11px] font-semibold` (20px, 11/600) |
| BADGE-09 | ❌ | Badge.tsx:21 `unread: bg-brand-500 text-surface-950 rounded-xs` | contador com raio 6px e texto 12px/500 | contador é outro componente: `min-w-[18px] h-[18px] px-[5px] rounded-full bg-brand-500 text-[var(--color-btn-primary-fg)] text-[10.5px] font-bold` (ConversationItem.tsx:178 já faz quase isso — extrair) |
| BADGE-10 | ❌ | ComingSoonBadge.tsx:4 | `h-[18px] px-1.5 rounded-[4px] border-dashed border-surface-600 text-[10px] font-bold uppercase tracking-[.08em] text-surface-300` | borda `border-[var(--bd2)]`; texto `--tx3` = `text-surface-500` |
| BADGE-11 | ✅ | (amostra) | — | — |
| **FIELD** | | `ui/FormField.tsx`, `Input.tsx`, `Select.tsx`, `Textarea.tsx`, `Switch.tsx`, `NumberField/MoneyInput/PhoneField.tsx` | | |
| FIELD-01 | ✅ | FormField.tsx:71 | `flex flex-col gap-1.5` (6px; spec 5px) | `gap-[5px]` opcional |
| FIELD-02 | ❌ | FormField.tsx:72-86 | label `text-xs font-semibold text-surface-300 uppercase tracking-wider`; "Opcional" `text-3xs font-medium text-surface-500` | spec: label 12/600 `--tx` **sem uppercase/tracking** → `text-xs font-semibold text-surface-100`; sufixo `· opcional` 500 `--tx3` ✅ (só remover o uppercase herdado) |
| FIELD-03 | ❌ | Input.tsx:15-19,38-44 | md `h-9 px-3 text-sm` (36 / 12px / 14px), `rounded-sm` ✅, `bg-surface-800` ✅, borda `border-surface-700` (`--bd`), placeholder `text-surface-400` | borda → `border-[var(--bd2)]`; `px-2.5` (10px); `text-[13px]`; placeholder `--tx3` = `text-surface-500` |
| FIELD-04 | ❌ | Input.tsx:41 | foco `ring-2 ring-brand-500/40 focus:border-brand-500` | spec anel **3px** `--acsoft`: `focus:ring-[3px] focus:ring-accent-soft focus:border-brand-500`; caret: `caret-brand-500` |
| FIELD-05 | ❌ | Input.tsx:44 + FormField.tsx:96 | borda `border-danger` ✅; mensagem `text-xs text-danger` sem ícone | linha de ajuda: `text-[11.5px] flex gap-[5px]` + `AlertCircle` 12px stroke 2.2 |
| FIELD-06 | ❌ | Select.tsx:29-48 | `<select>` nativo: não renderiza avatar; chevron 16px `text-surface-400` | avatar dentro de select nativo é impossível → precisa de Select custom (UserPicker.tsx existe — avaliar lá); chevron `w-3.5 text-surface-500` |
| FIELD-07 | ✅ | FormField.tsx:94 | hint `text-xs text-surface-500` (12px; spec 11.5) | `text-[11.5px]` |
| FIELD-08 | ✅ | Switch.tsx:22-33 | `h-[18px] w-8 rounded-full`, on `bg-brand-500`, thumb `h-3.5 w-3.5 bg-white` x 16/2 | `border-2 border-transparent` faz o trilho interno 28×14 — thumb 14px encosta; spec sem borda: remover `border-2`; `shadow-lg` no thumb → remover (ELEV-02) |
| FIELD-09 | ❌ | Switch.tsx:25 | off `bg-surface-700` (`--bd`) | `bg-[var(--bd2)]` |
| FIELD-10 | ❓ | (layout do caller) | — | — |
| FIELD-11 | ✅ | Input/Select/Textarea/NumberField/MoneyInput/PhoneField `size` | sm h-7 / md h-9 / lg h-11 formalizados; Textarea só padding (sem altura, por design) | — |
| **TYPE** | | `src/index.css` @theme + `.eyebrow` | | |
| TYPE-01 | ✅ | index.css:5,44-46 | Plus Jakarta Sans 400–800 + JetBrains Mono 400/500 | — |
| TYPE-02 | ❌ | index.css:508-511 + telas (`text-xl font-display` na régua canônica, TopBar) | h1-h6 = display 700; régua canônica diz título de página `text-xl` (20px) | régua → 16px/700 `-.01em` (as specs de tela 1c/1d/2a registram até 14px no canvas — decidir 14 vs 16; README 16) |
| TYPE-03 | ❓ | (telas de leitura) | — | — |
| TYPE-04 | ✅ | Card.tsx:48 CardHeader `text-sm font-semibold` | 14px/600 (spec 13) | `text-[13px]` |
| TYPE-05 | ❌ | index.css:483-493 body: `font-family` sans, cor surface-100, **sem font-size** (Tailwind base 16px; `:root 110%` em ≥768px) | corpo 16px, não 13px; componentes usam `text-sm` (14px) como "corpo" | `body { font-size: 13px; line-height: 1.5 }` OU manter escala Tailwind (decisão de sistema: hoje "corpo"=text-sm 14px em todo o app) |
| TYPE-06 | ✅ | uso geral `text-xs text-surface-400` | 12px | — |
| TYPE-07 | ✅ | index.css:65 `--text-2xs: 11px` | — | — |
| TYPE-08 | ✅ | index.css:66 `--text-3xs: 10px` | — | — |
| TYPE-09 | ❌ | index.css:522-529 `.eyebrow` | 11px / 700 / `.16em` / uppercase / `--color-brand-400` (teal claro) | spec 10px / `.14em` / `--acs` (accent-dark) / `margin-bottom:10px` |
| TYPE-10 | ❓ | dashboard KpiGrid (tela 1b) | — | avaliar na 1b |
| TYPE-11 | ❓ | telas | — | — |
| TYPE-12 | ❌ | FormField.tsx:72 | 12/600 ✅ mas uppercase+tracking | FIELD-02 |
| TYPE-13 | ❌ | Button.tsx:61-64 | md/lg `text-sm` 14px, sm `text-xs` 12px | md `text-[13px]`; lg 14 ✅ (HTML) |
| TYPE-14 | ❌ | Badge.tsx:28 `text-xs font-medium` | 12/500 | 11/600 (BADGE-08); contador 10.5/700 (BADGE-09) |
| TYPE-15 | ❓ | (telas) | — | — |
| TYPE-16 | ❓ | (telas) `tabular-nums` aplicado por célula em DataTable:168 | — | — |
| TYPE-17 | ❌ | ui/*: `text-[10px]`/`text-[11px]` ainda aparecem (ver contagem no bloco final) | — | trocar por `text-3xs`/`text-2xs` |
| TYPE-18 | ✅ | Button/Input `duration-150`; Modal 150/180ms; Drawer 220ms | — | — |
| **RAD / ELEV** | | `index.css` | | |
| RAD-01 | ✅ | `--radius-xs: 6px` (Badge `rounded-xs`) | — | chips `.color-chip` de tag usam `rounded-full` em TagPicker/ContactPanel — ver telas |
| RAD-02 | ✅ | StageBadge `rounded-[5px]` | — | — |
| RAD-03 | ✅ | `--radius-sm: 7px`; Button/Input/Select/Textarea `rounded-sm`; Switch `rounded-full` (pílula 9px = h/2 ✅) | — | — |
| RAD-04 | ✅ | `--radius-lg: 8px`; Card/EmptyState/ErrorState/Skeleton `rounded-lg` | DataTable container: sem raio/borda próprios (TABLE-01) | TABLE-01 |
| RAD-05 | ❌ | Modal.tsx:103 `rounded-2xl` (10px ✅); Drawer.tsx:26-28 lados `border-l/r` sem raio ✅, bottom `rounded-t-2xl` | ✅ | — |
| RAD-06 | ❌ | Dropdown.tsx:174 `rounded-xl` (10px); Toast.tsx:49 `rounded-xl` (10px); Tooltip `rounded-md` (8px) | spec 8px | Dropdown/Toast → `rounded-lg` |
| RAD-07 | ❌ | DropdownItem sem raio (`px-3 py-2.5`, sem `rounded`); Tooltip `rounded-md` 8px | — | item `rounded-[5px]`; tooltip `rounded-[5px]` |
| RAD-08 | ❌ | Card.tsx (sem "ação do header" própria); DataTable sem paginação | — | CARD-03 / TABLE-10 |
| RAD-09 | ❌ | contador `rounded-xs` (Badge unread) / `rounded-full` (ConversationItem, SegmentedControl); ComingSoon `rounded-[4px]` ✅; checkbox nativo (sem raio controlado) | — | BADGE-09; TABLE-12 |
| RAD-10 | ✅ | Avatar.tsx:43 `rounded-[30%]` só para `kind="operator"`; contato = `rounded-full` | spec 1a: avatar de select/TopBar `30%` (são operadores) ✅ | — |
| ELEV-01 | ✅ | Card.tsx:24-25 `elevated ? border-[var(--bd2)]`; `glow` = única sombra | — | — |
| ELEV-02 | ❌ | Switch thumb `shadow-lg`; SegmentedControl ativo `shadow-sm`; Toast `shadow-xl` (overlay ok, mas token errado); Dropdown/Tooltip `overlay-surface` (= `--shadow-overlay` ✅); Modal `overlay-frame` ✅ | sombras fora de overlay em Switch e SegmentedControl | remover `shadow-lg`/`shadow-sm`; Toast → `shadow-[var(--shadow-overlay)]` |
| ELEV-03 | ❌ | hover varia: `brightness-90`, `bg-surface-700`, `bg-accent-soft` | — | neutral/ghost/linhas → `--rowhover` (150ms já ✅) |
| ELEV-04 | ❌ | Button: `ring-2 ring-brand-500/50 offset-2` (≈ ✅); Input: `ring-2 ring-brand-500/40` (spec 3px `--acsoft` + borda `--ac`) | — | FIELD-04 |
| ELEV-05 | ✅ | Card `p-3.5` = 14px | — | — |
| ELEV-06 | ✅ | Button + Input/Select/Textarea/NumberField/MoneyInput/PhoneField `size` | — | — |
| ELEV-07 | ❓ | por caller | EmptyState 20px/1.75 ✅ | — |
| ELEV-08 | ✅ | `.color-chip`/`--chip`; `tintaDaEtapa()` intocável | — | — |
| **CARD** | | `ui/Card.tsx` | | |
| CARD-01 | ✅ | Card.tsx:23-25 | `bg-surface-800 border border-surface-700 rounded-lg`, sem sombra | — |
| CARD-02 | ❌ | Card.tsx:46-49 CardHeader | `min-h-10 pb-2.5 mb-3 border-b border-surface-700` (40px ✅, hairline ✅, padding horizontal vem do card 14px ✅); título `text-sm font-semibold` = 14/600 | `text-[13px]` |
| CARD-03 | ❌ | Card.tsx (não existe) | ação do header é do caller (cada tela inventa a pílula) | prop/slot `action` já existe — adicionar variante `CardHeaderAction`: `h-6 px-2 gap-1 rounded-[6px] border border-surface-700 text-[11.5px] font-medium text-surface-400` + chevron 12px |
| CARD-04 | ❓ | dashboard/KpiGrid.tsx (fora de ui/) | — | avaliar na spec 1b |
| CARD-05 | ❓ | idem | — | 1b |
| CARD-06 | ❓ | idem | — | 1b |
| CARD-07 | ❓ | idem | — | 1b |
| CARD-08 | ✅ | Card.tsx:25 `elevated ? 'border-[var(--bd2)]'` | só borda, fundo mantido | — |
| CARD-09 | ✅ | Card.tsx:27 `glow` única sombra | — | — |
| CARD-10 | ❌ | Card.tsx:28 hover `--rowhover` + `border-[var(--bd2)]` ✅; **sem estado selecionado** | — | prop `selected` → `border-brand-500 ring-[3px] ring-accent-soft` |
| CARD-11 | ❓ | KpiGrid | — | 1b |
| **TABLE** | | `ui/DataTable.tsx` | | |
| TABLE-01 | ❌ | DataTable.tsx:91 | wrapper só `overflow-x-auto overflow-y-auto` — sem borda, raio nem fundo (cada tela põe um card em volta, ou nada) | `border border-surface-700 rounded-lg bg-surface-800 overflow-hidden` no wrapper (e tirar os cards em volta nas telas — ver 1c-contatos.GAPS TABLE-01) |
| TABLE-02 | ❌ | DataTable.tsx:93-94,110 | `thead bg-surface-900` (--sf2 ✅); `tr border-b border-surface-800` (**no claro surface-800 = #FFFFFF → hairline invisível**); `th px-3 py-2 text-[11px] font-medium text-surface-500 uppercase tracking-wide` (500/--tx3/uppercase; spec 600/--tx2/sem uppercase; altura ~32 ✅) | `border-surface-700`; `font-semibold text-surface-400`; remover `uppercase tracking-wide` |
| TABLE-03 | ❌ | DataTable.tsx:141,165-166 | linha `border-b border-surface-800/60` (**invisível no claro**), `text-sm` (14px), `py-2` (~36px ✅ com 13px), última linha com borda | `border-surface-700`; `text-[13px]`; `last:border-b-0` |
| TABLE-04 | ❓ | caller (`render`) | — | telas |
| TABLE-05 | ❓ | caller | — | telas |
| TABLE-06 | ❌ | DataTable.tsx:165,168 | `tabular-nums` só em `align='right'` ✅; cor da célula `text-surface-300` (claro #1f2937 ≈ --tx; escuro #B5C8C8 ≠ --tx #ECF1F1) | `text-surface-100` |
| TABLE-07 | ❓ | caller (`widthClass`) | — | telas (HTML 32 / README 36 — divergência) |
| TABLE-08 | ❌ | DataTable.tsx:143-147 | hover `--rowhover` ✅; ativo `bg-brand-500/15` + inset 2px `--color-brand-500` (barra ✅, fundo tint teal 15% ✗) | ativo → `bg-[var(--rowhover)] [&>td:first-child]:shadow-[inset_2px_0_0_0_var(--color-brand-500)]` |
| TABLE-09 | ❓ | caller | — | — |
| TABLE-10 | ❌ | DataTable.tsx (não existe) | paginação é de cada tela | prop/slot `pagination` no primitivo: `mt-2 flex justify-between text-[11.5px] text-surface-500`; setas `w-6 h-6 rounded-[6px] border border-surface-700` habilitada `text-surface-100` |
| TABLE-11 | ❓ | — | divergência HTML (solta) × README (rodapé 40px) | decisão |
| TABLE-12 | ❌ | DataTable.tsx:97-103,152-158 | `<input type=checkbox className="accent-brand-500">` nativo (tamanho/raio do SO) | checkbox 14px `rounded-[4px] border border-[var(--bd2)]`, marcado `bg-[var(--color-btn-primary-bg)]` + check 10px branco (`appearance-none` + pseudo) |
| **TABS** | | `ui/Tabs.tsx` (corrigido em 527a4e6) | | |
| TABS-01 | ✅ | Tabs.tsx:60 `gap-[18px] border-b border-surface-700 text-[13px] font-medium text-surface-400` | — | — |
| TABS-02 | ✅ | Tabs.tsx:72 `pb-2`, sem padding horizontal | — | — |
| TABS-03 | ✅ | Tabs.tsx:74 `font-semibold shadow-[inset_0_-2px_0_currentColor] text-surface-100` | — | — |
| TABS-04 | ✅ | Tabs.tsx:81 `text-[11px] text-surface-500 ml-0.5` | — | — |
| TABS-05 | ✅ | Tabs.tsx:70 onChange sempre | — | — |
| TABS-06 | ✅ | — | — | — |
| **EMPTY** | | `ui/EmptyState.tsx` (corrigido em 527a4e6), `ui/ErrorState.tsx` | | |
| EMPTY-01 | ✅ | EmptyState.tsx:40 `mt-3 flex flex-col items-start gap-1.5 py-[18px] px-4 rounded-lg border border-dashed border-[var(--bd2)]` | — | — |
| EMPTY-02 | ✅ | EmptyState.tsx:44 `w-5 h-5 text-surface-500 strokeWidth 1.75` | — | — |
| EMPTY-03 | ✅ | EmptyState.tsx:45 `text-[13px] font-semibold text-surface-100` | — | — |
| EMPTY-04 | ✅ | EmptyState.tsx:46 `text-xs text-surface-400 leading-normal` | — | — |
| EMPTY-05 | ✅ | EmptyState.tsx:57 `Button variant="neutral" size="sm"` + `mt-1` | borda do neutral = `--bd` hoje (BTN-06) | BTN-06 |
| EMPTY-06 | ✅ | reconciliado (HTML = tracejado + neutral) | — | — |
| EMPTY-ERR | ❌ | ErrorState.tsx:31-46 | ainda no vocabulário antigo: `bg-surface-900/40 border-dashed border-surface-600`, centrado, ícone 40px stroke 1.5, título 14/500, botão escrito à mão `rounded-md bg-surface-800` | espelhar EmptyState: tracejado `--bd2`, `items-start gap-1.5`, ícone 20px/1.75 `text-warning`, 13/600, hint 12 --tx2, CTA `Button neutral sm` |
| **MODAL** | | `ui/Modal.tsx`, `ui/Drawer.tsx`, `ui/Banner.tsx` | | |
| MODAL-01 | ❌ | Modal.tsx:103 | `bg-surface-900` (= --sf2; spec `--sf`), `overlay-frame border rounded-2xl` (borda --ovbd ✅, sombra ✅, 10px ✅), `max-w-lg` 512px (ConfirmModal `max-w-sm` 384 ≈ 400 ✅) | `bg-surface-800` |
| MODAL-02 | ❌ | Modal.tsx:114-117; ConfirmModal 207 | header `px-5 py-4 border-b border-surface-800` (spec `16px 18px 0`, **sem hairline**); título `text-base font-display font-semibold` 16/600 (spec 15/700 -.01em); descrição `text-sm text-surface-400 mb-5` (spec 12.5px, mt 4) | header `px-[18px] pt-4 pb-0` sem `border-b`; título `text-[15px] font-bold tracking-[-.01em]`; descrição `text-[12.5px] mt-1` |
| MODAL-03 | ❌ | Banner.tsx:39-40 (`impact`) | Banner é `.color-chip` **cheio** (fundo sólido escurecido + texto branco), `rounded-xs` ✅, `px-3.5 py-2.5 text-[13px]`, ícone 16px | spec: fundo 10–14% + texto NA COR (`bg-status-pending-bg text-status-pending` / `bg-danger/10 text-danger`), `px-2.5 py-[9px] gap-2 text-xs`, ícone 14px stroke 2 `mt-px`; contagem `font-bold` ✅ |
| MODAL-04 | ✅ | ConfirmModal 208; Modal footer 145 | `flex gap-2 justify-end`, botões md | — |
| MODAL-05 | ❌ | Modal.tsx:209 | "Cancelar" = `variant="ghost"` | `variant="neutral"` |
| MODAL-06 | ❌ | Modal.tsx:134-141 | corpo `px-5 pt-4 pb-6` (20px) | `px-[18px] py-3.5` (14 18) |
| MODAL-07 | ❌ | Modal.tsx:97; Drawer.tsx:98; Dropdown `.overlay-scrim` ✅ | Modal `bg-black/60 backdrop-blur-[2px]`; Drawer `bg-black/50 backdrop-blur-[2px]` (spec `--scrim` = rgba(15,23,42,.18) claro / rgba(0,0,0,.4) escuro; `--color-scrim-soft` já existe com esses valores) | `bg-[var(--color-scrim-soft)]` sem blur nos dois; portal + `useLayer` ✅ |
| MODAL-08 | ❌ | Drawer.tsx:26-27,104 | `bg-surface-900` (--sf2; spec --sf), `overlay-frame` (borda --ovbd + sombra ✅), lados sem raio ✅, `w-96` (384px; contato 768 / automação 880 vêm por className nas telas) | `bg-surface-800`; larguras ficam nas telas (1c/2b) |
| **DROP** | | `ui/Dropdown.tsx` | | |
| DROP-01 | ❌ | Dropdown.tsx:174-177 | `overlay-surface border rounded-xl min-w-[200px]` (fundo --ov ✅, borda --ovbd ✅, sombra ✅, **10px**, **sem padding 4px**, itens 14px) | `rounded-lg p-1`; itens `text-[13px]` |
| DROP-02 | ❌ | Dropdown.tsx:211-217 | item `px-3 py-2.5 text-sm text-surface-200`, sem raio (~40px) | `h-[30px] px-2 rounded-[5px] text-[13px] text-surface-100` |
| DROP-03 | ❌ | Dropdown.tsx:217 | hover `bg-surface-700` (foco idem) | `hover:bg-[var(--rowhover)] focus-visible:bg-[var(--rowhover)]` |
| DROP-04 | ❌ | DropdownItem (sem slot) | não há atalho | prop `shortcut`: `ml-auto text-[11px] font-mono text-surface-500` |
| DROP-05 | ✅ | Dropdown.tsx:228 `h-px bg-surface-700 my-1` | — | — |
| DROP-06 | ✅ | Dropdown.tsx:214 `text-danger` (hover `bg-danger/10` — spec mesmo formato dos outros) | — | hover → `--rowhover` (DROP-03) |
| DROP-07 | ✅ | — | — | — |
| **TOAST** | | `ui/Toast.tsx` | | |
| TOAST-01 | ❌ | Toast.tsx:7-12,49,56 | fundo por tipo (`bg-emerald-600`/`bg-danger`/`bg-brand-600`/`bg-amber-500`) com texto branco; `px-4 py-3 rounded-xl shadow-xl min-w-[260px]`; `text-sm font-medium` | fundo **invertido único** `--toast/--toasttx` (tokens novos: #1A1F2E/#FFF claro, #ECF1F1/#060909 escuro); `h-10 px-3 gap-2.5 rounded-lg text-[12.5px] font-medium shadow-[var(--shadow-overlay)]` |
| TOAST-02 | ❌ | Toast.tsx:55 | ícone lucide 16px na cor do texto | disco 16px `bg-[#22C55E]` (sucesso) com check 10px stroke 3 branco; erro/aviso/info: disco na cor do status |
| TOAST-03 | ❌ | Toast.tsx:61 | ação `text-xs font-semibold underline opacity-90` | `ml-2 text-brand-500 font-semibold` sem sublinhado |
| TOAST-04 | ✅ | Toast.tsx:21 `latest` | — | — |
| **TIP** | | `ui/Tooltip.tsx` | | |
| TIP-01 | ❌ | Tooltip.tsx:71-72 | `rounded-md px-2.5 py-1.5 overlay-surface border text-xs text-surface-100` (fundo --ov claro/branco, borda + sombra, 8px, ~28px, 12/400) | fundo **invertido** `--tooltip/--tooltiptx` (tokens novos, iguais ao toast), `h-6 px-2 rounded-[5px] text-[11.5px] font-medium w-max`, sem borda nem sombra |
| TIP-02 | ❌ | Tooltip (sem slot) | — | prop `shortcut`: `ml-1.5 font-mono opacity-70` |
| **TOK** | | `src/index.css` | | |
| TOK-01 | ✅ | surface-950 #FAFAFC / #060909 | — | — |
| TOK-02 | ✅ | surface-800 #FFFFFF / #161E1E (527a4e6) | — | — |
| TOK-03 | ✅ | surface-900 #F5F6F8 / #0E1414 = `--sf2` | — | — |
| TOK-04 | ✅ | surface-700 #E4E6EC / #243333 | — | — |
| TOK-05 | ✅ | `--bd2` #C8CDD8 / #2E4040 (527a4e6) | — | — |
| TOK-06 | ✅ | surface-100 #1A1F2E / #ECF1F1 | — | — |
| TOK-07 | ❌ | surface-400 claro #374151 (spec #5C657A); escuro #8FA5A5 ✅ | texto secundário claro mais escuro que o mock | `--color-surface-400: #5C657A` no bloco claro — **checar AA**: #5C657A sobre #FFF = 5.9:1 ✅ |
| TOK-08 | ❌ | surface-500 claro #4B5263 (spec #9098AA); escuro #6B8080 ✅ | terciário claro muito mais escuro que o mock | `#9098AA` sobre #FFF = 3.0:1 — só passa AA em ≥14px bold/18px; o mock usa em 11px → decisão de produto (fidelidade × AA). Registrar [!] |
| TOK-09 | ✅ | brand-500 #14B8A6 / #2DD4BF | — | — |
| TOK-10 | ✅ | accent-dark #0F766E claro ✅ / #14B8A6 escuro (spec HTML #2DD4BF, README #14B8A6 — DISC) | — | manter README |
| TOK-11 | ✅ | accent-soft rgba(20,184,166,.10) claro (spec .12) / .14 escuro ✅ | — | `.12` opcional |
| TOK-12 | ✅ | `--color-btn-primary-bg` #0F766E / #2DD4BF | — | — |
| TOK-13 | ✅ | `--color-btn-primary-fg` #FFFFFF / #04201D | — | — |
| TOK-14 | ✅ | `--color-status-active` #15803D claro ✅ (bg .08, spec .10) / escuro #4ADE80 (spec #22C55E = `--color-success` ✅) | dois tokens concorrentes (status-active vs success) | usar `success` p/ texto/ícone, `status-active-bg` p/ fundo |
| TOK-15 | ❌ | `--color-danger` claro #DC2626 (spec #B91C1C; `--color-btn-danger-bg` = #B91C1C ✅) / escuro #EF4444 ✅ | texto/borda de erro no claro mais claro que o mock | `--color-danger: #B91C1C` no bloco claro |
| TOK-16 | ✅ | `--color-status-pending` #B45309 (bg .08; spec .10) / #FBBF24 (bg .12; spec .14) | — | opcional |
| TOK-17 | ✅ | `--rowhover` rgba(15,23,42,.035) / rgba(255,255,255,.04) (spec sólido #F5F6F8 / #1B2525 — resultado visual equivalente) | — | — |
| TOK-18 | ✅ | `--color-overlay` #FFFFFF / #1E2A2A | — | — |
| TOK-19 | ✅ | `--color-overlay-border` #D5DAE3 / #324646 | — | — |
| TOK-20 | ✅ | `--shadow-overlay` idêntico nos 2 temas | — | — |
| TOK-21 | ✅ | `--color-scrim-soft` rgba(15,23,42,.18) / rgba(0,0,0,.35) (spec .4) — **Modal/Drawer não usam** | — | MODAL-07 |
| TOK-22 | ❌ | não existe `--toast/--toasttx` | — | criar (#1A1F2E/#FFFFFF claro, #ECF1F1/#060909 escuro) — TOAST-01 |
| TOK-23 | ❌ | não existe `--tooltip/--tooltiptx` | — | criar (mesmos valores) — TIP-01 |
| TOK-24 | ✅ | `--color-avatar-surface/initials` #374151/#FFFFFF claro, #B5C8C8/#060909 escuro | — | — |
| TOK-25 | ✅ | `--ink-target/--ink-amount` #000/40% claro | — | — |
| TOK-26 | ❓ | layout/ (sidebar) — fora de ui/ | — | spec shell |
| TOK-27 | ❓ | layout/ | — | spec shell |
| TOK-28 | ✅ | `--color-bubble-out` #0F766E/#16443C, `--color-bubble-in` #FFFFFF/#161E1E | — | — |
| TOK-29 | ✅ | `--color-composer-bg` #F5F6F8 / #0E1414 | — | — |
| TOK-30 | ✅ | `--connector-tile-mix` 12% / 0%; `--tilebdmix` (22%/0%) não existe | — | ver spec conectores |
| TOK-31 | ❌ | index.css:483-503 | body sem `font-size:13px`/`line-height:1.5`; `:root { font-size:110% }` em ≥768px escala tudo em rem; `tabular-nums` não é global | **decisão de sistema** (TYPE-05): o app inteiro foi escrito com `text-sm` = corpo; mudar a base afeta todas as telas. Registrar como [!] pro usuário |
| **LAY** | | (composição da própria página 1a — não se aplica ao app) | | |
| LAY-01..04 | ❓ | n/a | — | — |

## Resumo por status

- ✅ **78** · ❌ **62** · ❓ **23** · [!] **2** (TOK-08 tx3 claro vs AA; TOK-31/TYPE-05 base 13px do corpo) — total 165.
- Os 4 primitivos corrigidos em `527a4e6` (Tabs, EmptyState, Card `elevated`, WizardProgress) fecham limpos; os ❌ concentram-se em **Toast, Tooltip, Dropdown, DataTable, Badge, Modal/Banner, Input, Button neutral/ghost** e nos tokens de texto do tema claro.

## ❌ por arquivo, em ordem de impacto (telas afetadas)

1. **`index.css`** (todas as telas) — TOK-07 `surface-400` claro → #5C657A; TOK-15 `danger` claro → #B91C1C; criar `--toast/--toasttx` e `--tooltip/--tooltiptx` (TOK-22/23); `.eyebrow` 10px/.14em/`accent-dark` (TYPE-09); [!] TOK-08 tx3 e TOK-31 base do corpo.
2. **`DataTable.tsx`** (Contatos, Campanhas, Auditoria, Admin, Faturamento) — TABLE-01 container com borda/raio/fundo; TABLE-02/03 hairlines `surface-700` (**hoje invisíveis no claro**), cabeçalho 600/--tx2 sem uppercase, linha 13px; TABLE-06 célula --tx; TABLE-08 ativo = rowhover + barra; TABLE-10 paginação no primitivo; TABLE-12 checkbox 14px/4px.
3. **`Button.tsx`** (todas) — BTN-06 neutral borda `--bd2`; BTN-08 ghost `--tx2` + hover rowhover; BTN-01/13 secondary/ghost 600 e hover "1 passo"; BTN-02/03 padding 14/10 e md 13px; BTN-10 `iconOnly` 28×28; BTN-12 `opacity-60` no loading.
4. **`Input.tsx` / `Select.tsx` / `Textarea.tsx` / `FormField.tsx`** (todos os formulários) — FIELD-03 borda `--bd2`, 13px, placeholder --tx3; FIELD-04 foco anel 3px `--acsoft` + caret; FIELD-05 erro com ícone 12px/11.5px; FIELD-02 label sem uppercase; FIELD-09 switch off `--bd2`; FIELD-08 tirar `border-2`/`shadow-lg` do Switch.
5. **`Badge.tsx`** (Conversas, Campanhas, Contatos) — BADGE-04..08 status de sistema em modo *soft* (fundo 10–14% + texto na cor, 20px, 11/600) em vez de `.color-chip` cheio; BADGE-09 contador 18px pílula 10.5/700 (extrair do ConversationItem); **`StageBadge.tsx`** BADGE-01 remover ícone Milestone, 600, --tx; **`ComingSoonBadge`** BADGE-10 `--bd2`/--tx3.
6. **`Toast.tsx`** (global) — TOAST-01/02/03 fundo invertido único 40px/8px/12.5, disco de status 16px, ação teal sem sublinhado.
7. **`Tooltip.tsx`** (global) — TIP-01/02 fundo invertido 24px/5px/11.5/500, sem borda/sombra, slot de atalho.
8. **`Dropdown.tsx`** (global) — DROP-01..04 raio 8, padding 4, item 30px/5px/13px/--tx, hover rowhover, slot de atalho.
9. **`Modal.tsx` + `Banner.tsx`** (todos os diálogos) — MODAL-01/08 fundo `--sf`; MODAL-02 header sem hairline, 15/700; MODAL-03 Banner *soft* 12px; MODAL-05 Cancelar neutral; MODAL-06 corpo 14/18; MODAL-07 scrim `--color-scrim-soft` sem blur (Modal e Drawer).
10. **`ErrorState.tsx`** (DataTable error, painéis) — EMPTY-ERR espelhar o EmptyState novo.
11. **`Card.tsx`** — CARD-02 título 13px; CARD-03 `CardHeaderAction`; CARD-10 `selected`.
12. **`SegmentedControl.tsx`** — ELEV-02 `shadow-sm` no ativo (spec sem sombra; ativo = `--sf2`… ver spec 1d LIST).

## Fora do escopo dos 165 itens (registro)

- `ui/*` ainda usa `text-[10px]` ×6 e `text-[11px]` ×4 (TYPE-17) — trocar por `text-3xs`/`text-2xs`.
- Componentes de `ui/` sem item na 1a (avaliar nas specs de tela): `Stepper`, `TagPicker`, `ContextMenu`, `UserPicker`, `RadioOptionList`, `ProgressBar`, `TipCard`, `PageHeader`, `BottomSheet`, `FormDialog`, `ColorPicker`, `sidebar`/`dock`.

## Rodada 2 — 1a vocabulário: uso dos primitivos nas telas do Farol (2026-09-21)

PNG `1a-vocabulario-componentes` (claro+escuro) confrontado com o que as telas 1b/2a/2b/2c usam:

| ID | Primitivo (mock) | Uso encontrado | Ação |
|---|---|---|---|
| R2-1A-01 | Button md 36 / sm 28, neutral (borda --bd2), primary `--btn` | botões artesanais `rounded-xl` com fundo brand tintado/invertido (AgentDetail, AutomationBuilder, wizard de agente, Campaign*) | **✅** trocados por `Button` (`AgentsPage`, `AutomationBuilder`, `CampaignWizard`) ou pelo mesmo vocabulário (outline `--bd2` raio 7 / primary `--btn`) onde o `Button` não cabia (botões inline de lista) |
| R2-1A-02 | Chip de status suave (`.color-chip-soft`) × etiqueta cheia (`.color-chip`) | `.color-chip` sólido usado como status (Ativo, Agendada, chip de linha WhatsApp, valores de "Atividade") | **✅** status → `.color-chip-soft`/neutro; `.color-chip` só em etiquetas |
| R2-1A-03 | Input md 36 raio 7 borda --bd2; seleção de card = borda --ac + anel 3px --acsoft | `rounded-xl`, seleção `brand/10` ou verde sólido | **✅** wizards de agente/automação/campanha |
| R2-1A-04 | Tabs com contagem 11px --tx3 | `Tabs` já usado; "(N)" entre parênteses em "Ferramentas (N)" no AgentDetail | `❓` menor — não alterado (rótulo dinâmico dentro do array de abas) |
| R2-1A-05 | EmptyState em caixa tracejada, Card sem sombra, ConfirmModal danger com banner | cards sem sombra ✅ (dashboard); dropzones/empties tracejados `rounded-lg` ✅ | conferido |

Tudo `❓ ao vivo`.
