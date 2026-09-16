# Spec 1a — Vocabulário de componentes (primitivos)

Fase A (extração pura). Fontes, por autoridade: **HTML** = `Oryon-Reestilizacao-canvas.html`
(bloco `id="1a"`, offsets ~538k–562k, valores inline exatos; tokens no `renderVals()` ~offset 720k) ·
**PNG** = `telas/01-1a-*.png` (claro) e `02-1a-*.png` (escuro) · **README** = `README.md` §1.1–1.4 e §2.
Quando HTML e README divergem, os dois valores ficam registrados e o item é marcado `⚠ divergência`.
Nada aqui avalia o código.

Convenção de nomes de token do HTML (usada nos itens): `--bg` fundo · `--sf` superfície ·
`--sf2` superfície-2 · `--bd` borda · `--bd2` borda de ênfase · `--tx/--tx2/--tx3` texto
principal/secundário/terciário · `--ac` acento · `--acs` acento forte · `--acsoft` acento suave ·
`--btn/--btntx` botão primário · `--ok/--okbg` sucesso · `--dg/--dgbg` perigo · `--amber/--amberbg`
atenção · `--rowhover` · `--ov/--ovbd/--ovsh` overlay (fundo/borda/sombra) · `--scrim` ·
`--toast/--toasttx` · `--tooltip/--tooltiptx` · `--avs/--avi` avatar (disco/inicial).

---

## TOKENS — tema (HTML `renderVals()`, bate com README §1.3)

| # | Token | Claro | Escuro |
|---|---|---|---|
| TOK-01 | `--bg` fundo da página | `#FAFAFC` | `#060909` |
| TOK-02 | `--sf` superfície (card, input, tabela) | `#FFFFFF` | `#161E1E` |
| TOK-03 | `--sf2` superfície-2 (cabeçalho de tabela, chip Pendente, segmentado ativo) | `#F5F6F8` | `#0E1414` |
| TOK-04 | `--bd` borda | `#E4E6EC` | `#243333` |
| TOK-05 | `--bd2` borda de ênfase (neutral, input, tracejado) | `#C8CDD8` | `#2E4040` |
| TOK-06 | `--tx` texto | `#1A1F2E` | `#ECF1F1` |
| TOK-07 | `--tx2` secundário | `#5C657A` | `#8FA5A5` |
| TOK-08 | `--tx3` terciário | `#9098AA` | `#6B8080` |
| TOK-09 | `--ac` acento (ícone, foco, contador, link) | `#14B8A6` | `#2DD4BF` |
| TOK-10 | `--acs` acento forte (eyebrow, texto do secondary) | `#0F766E` | `#2DD4BF` |
| TOK-11 | `--acsoft` acento suave (fundo secondary, anel de foco) | `rgba(20,184,166,.12)` | `rgba(45,212,191,.14)` |
| TOK-12 | `--btn` fundo primário | `#0F766E` | `#2DD4BF` |
| TOK-13 | `--btntx` texto primário | `#FFFFFF` | `#04201D` |
| TOK-14 | `--ok` / `--okbg` | `#15803D` / `rgba(21,128,61,.10)` | `#22C55E` / `rgba(34,197,94,.14)` |
| TOK-15 | `--dg` / `--dgbg` | `#B91C1C` / `rgba(185,28,28,.08)` | `#EF4444` / `rgba(239,68,68,.14)` |
| TOK-16 | `--amber` / `--amberbg` | `#B45309` / `rgba(180,83,9,.10)` | `#FBBF24` / `rgba(251,191,36,.14)` |
| TOK-17 | `--rowhover` | `#F5F6F8` | `#1B2525` |
| TOK-18 | `--ov` fundo de overlay (dropdown) | `#FFFFFF` | `#1E2A2A` |
| TOK-19 | `--ovbd` borda de overlay (modal/dropdown) | `#D5DAE3` | `#324646` |
| TOK-20 | `--ovsh` sombra de overlay (única sombra permitida) | `0 0 0 1px rgba(15,23,42,.03), 0 4px 12px rgba(15,23,42,.10), 0 16px 40px rgba(15,23,42,.16)` | `inset 0 1px 0 rgba(255,255,255,.05), 0 4px 12px rgba(0,0,0,.45), 0 12px 32px rgba(0,0,0,.55)` |
| TOK-21 | `--scrim` | `rgba(15,23,42,.18)` | `rgba(0,0,0,.4)` |
| TOK-22 | `--toast` / `--toasttx` (fundo invertido) | `#1A1F2E` / `#FFFFFF` | `#ECF1F1` / `#060909` |
| TOK-23 | `--tooltip` / `--tooltiptx` | `#1A1F2E` / `#FFFFFF` | `#ECF1F1` / `#060909` |
| TOK-24 | `--avs` / `--avi` avatar disco/inicial | `#374151` / `#FFFFFF` | `#B5C8C8` / `#060909` |
| TOK-25 | `--ink` / `--inkamt` (tintaDaEtapa) | `#000` / `40%` | `#fff` / `0%` |
| TOK-26 | `--sb` / `--sbtx` sidebar (sempre escura) | `#0E1414` / `#8FA5A5` | `#0E1414` / `#8FA5A5` |
| TOK-27 | `--shell` | `#E2E6ED` | `#000000` |
| TOK-28 | `--bin` / `--bout` bolha entrada/saída | `#FFFFFF` / `#0F766E` | `#161E1E` / `#16443C` |
| TOK-29 | `--comp` composer | `#F5F6F8` | `#0E1414` |
| TOK-30 | `--tilemix` / `--tilebdmix` (tile de conector) | `12%` / `22%` | `0%` / `0%` |
| TOK-31 | Base do frame: `font-family:'Plus Jakarta Sans',system-ui,sans-serif; font-variant-numeric:tabular-nums; font-size:13px; line-height:1.5; color:var(--tx)`; painel 1a `padding:20px` (HTML) | | |

---

## TYPE — tipografia (HTML bloco "Tipografia" + README §1.1)

| # | Papel | Valor | Fonte |
|---|---|---|---|
| TYPE-01 | Família | Plus Jakarta Sans 400/500/600/700/800 (única; sai Satoshi+Inter). Mono = JetBrains Mono p/ ID, timestamp técnico, nome de template, atalho | README, HTML |
| TYPE-02 | Título de página | 16px / 700 / `letter-spacing:-.01em` | HTML, README |
| TYPE-03 | Título de seção em página de leitura | 20px / 700 / `-.015em` | README |
| TYPE-04 | Título de card / seção | 13px / 600 | HTML, README |
| TYPE-05 | Corpo | 13px / 400 / `line-height:1.5` / `--tx` | HTML, README |
| TYPE-06 | Secundário | 12px / 400 / `--tx2` | HTML, README |
| TYPE-07 | Terciário | 11px / 400 / `--tx3` (token `--text-2xs`) | HTML, README |
| TYPE-08 | Micro | 10px / 700 (token `--text-3xs`) | README |
| TYPE-09 | Eyebrow / label uppercase (títulos de seção da 1a) | 10px / 700 / `letter-spacing:.14em` / uppercase / `color:var(--acs)` / `margin-bottom:10px` | HTML, README |
| TYPE-10 | KPI hero | 26px / 800 / `-.02em` / `line-height:1.15` (1.1 na amostra da 1a) / tabular | HTML, README |
| TYPE-11 | KPI secundário (rail, detalhe) | 22px / 800 / `-.02em` | README |
| TYPE-12 | Label de campo | 12px / 600 | HTML, README |
| TYPE-13 | Botão | md/lg 13px / 600 · sm 12px / 600 · lg na amostra 14px / 600 | HTML (lg 14), README (13) ⚠ divergência lg |
| TYPE-14 | Badge / chip | 11px / 600 · contador 10.5px / 700 | HTML, README |
| TYPE-15 | Mono técnico | 11.5px `--tx2` (`conv_8f3a2c · 14:32:07`); atalho em dropdown/tooltip 11px | HTML |
| TYPE-16 | `font-variant-numeric: tabular-nums` em todo KPI, valor monetário, timestamp de tabela e contador (aplicado no wrapper de cada tela) | README |
| TYPE-17 | Substituir `text-[10px]`/`text-[11px]` arbitrários por `--text-3xs`/`--text-2xs` | README |
| TYPE-18 | Transições: hover 150ms; entrada de conteúdo 200–250ms ease-out | README |

---

## RADIUS / ELEV — forma, sombra, densidade (README §1.2 + anotações HTML)

| # | Item | Valor | Fonte |
|---|---|---|---|
| RAD-01 | Chip / badge de status e etiqueta | 6px | README, HTML |
| RAD-02 | StageBadge (situação) | 5px | README, HTML |
| RAD-03 | Botão / input / select / switch-container | 7px (switch 9px) | README, HTML |
| RAD-04 | Card / DataTable container / EmptyState | 8px | README, HTML |
| RAD-05 | Modal / drawer | 10px (drawer 0, encostado) | README, HTML |
| RAD-06 | Popover / dropdown / toast | 8px | README, HTML |
| RAD-07 | Item de dropdown / tooltip | 5px | HTML |
| RAD-08 | Seta de paginação / ação de card header | 6px | HTML |
| RAD-09 | Contador | 9px (pílula) · ComingSoon 4px · checkbox 4px | HTML, README |
| RAD-10 | Avatar | `border-radius:30%` (18px em select, 28px na TopBar) | HTML |
| ELEV-01 | "Elevação = borda 1px. `elevated` passa a usar `--bd2` (borda de ênfase), não sombra. `glow` só no card de IA." — anotação literal | HTML, README §2 Card |
| ELEV-02 | Sombra **só em overlay** (`--ovsh`/`--shadow-overlay`): modal, dropdown, toast, popover. Card/tabela/input: nunca | README §1.2, HTML (só modal/dropdown/toast têm `box-shadow:var(--ovsh)`) |
| ELEV-03 | Hover global: "escurece 1 passo em 150ms" | HTML anotação, README |
| ELEV-04 | Foco global: "anel 2px teal com offset 2px" (input: borda `--ac` + `0 0 0 3px --acsoft`) | HTML anotação, README |
| ELEV-05 | Padding de card 14px; densidade compacta | README |
| ELEV-06 | Alturas canônicas de controle: sm 28 · md 36 · lg 44 — válidas pra Button e todos os campos (formalizar `size` em Input/Textarea/Select/NumberField/MoneyInput/PhoneField) | README |
| ELEV-07 | Ícones lucide, stroke 1.75–2 (amostra: 2 padrão; 2.2 em ícone de 11–12px dentro de badge/erro; 1.75 no ícone 20px do EmptyState); tamanhos 16–20 lista/form, 20–24 cabeçalho, 13–14 em botão sm, 10–12 em badge | README §1.4, HTML |
| ELEV-08 | Cor de dado (etapa/tag/funil): hex do tenant via `.color-chip` + `--chip` e `tintaDaEtapa()` (texto/linha fina = `color-mix` com `--ink`/`--inkamt`; área/ponto/barra = hex cru). Nunca hardcode | README §1.3 |

---

## BTN — Button (HTML "Button · md 36px" + README §2)

| # | Item | Valor | Fonte |
|---|---|---|---|
| BTN-01 | Base (todas): `inline-flex; align-items:center; gap:6px; border-radius:7px; font-weight:600` | HTML |
| BTN-02 | md: `height:36px; padding:0 14px; font-size:13px` (ghost `padding:0 12px`) | HTML |
| BTN-03 | sm: `height:28px; padding:0 10px; font-size:12px`; ícone 14px | HTML |
| BTN-04 | lg: `height:44px; padding:0 18px; font-size:14px` (README diz 13px) ⚠ | HTML / README |
| BTN-05 | `primary`: `background:var(--btn); color:var(--btntx)`; sem borda. Claro `#0F766E`/branco · escuro `#2DD4BF`/`#04201D`. Amostra "+ Novo contato" com ícone plus 16px stroke 2 | HTML, README |
| BTN-06 | `neutral`: `background:var(--sf); border:1px solid var(--bd2); color:var(--tx)` | HTML, README |
| BTN-07 | `secondary`: `background:var(--acsoft); color:var(--acs)`; sem borda | HTML, README |
| BTN-08 | `ghost`: sem fundo nem borda; `color:var(--tx2)`; `padding:0 12px` | HTML, README |
| BTN-09 | `danger`: `background:#B91C1C; color:#fff` — sólido nos DOIS temas (hardcode, não token) | HTML, README |
| BTN-10 | Ícone puro (sm): `width:28px; height:28px; justify-content:center; border-radius:7px`; neutral; ícone 16px `--tx2` (amostra `···`). README: "quadrado do tamanho da altura" | HTML, README |
| BTN-11 | Com chevron (sm "Filtrar"): neutral + chevron-down 14px stroke 2 à direita | HTML |
| BTN-12 | `loading` ("Salvando"): primary com `opacity:.6`, `gap:8px`, spinner 14px = círculo `border:2px solid currentColor; border-right-color:transparent`; substitui `leftIcon`; `disabled` | HTML, README |
| BTN-13 | Hover: escurece 1 passo em 150ms (anotação). Foco: anel 2px `--ac` com offset 2px | HTML, README |
| BTN-14 | "Ghost só em toolbar e linhas de tabela." (anotação literal) | HTML |
| BTN-15 | Linha 1 da amostra: `+ Novo contato` · `Neutral` · `Secondary` · `Ghost` · `Excluir`; linha 2 (`margin-top:10px`): `sm 28` · `Filtrar ⌄` · `···` · `lg 44` · `⟳ Salvando`; `gap:8px; flex-wrap` | HTML, PNG |
| BTN-16 | Escuro (PNG): neutral mantém borda visível `#2E4040` sobre `#161E1E`; primary `#2DD4BF` com texto grafite; secondary fundo `rgba(45,212,191,.14)` texto `#2DD4BF` | PNG, tokens |

---

## BADGE — Badge / StageBadge / chip (HTML "Badge · StageBadge · chip de tenant")

| # | Item | Valor | Fonte |
|---|---|---|---|
| BADGE-01 | StageBadge (situação/etapa): `height:20px; padding:0 7px; gap:5px; border-radius:5px; border:1px solid var(--bd); background:var(--sf); color:var(--tx); font-size:11px; font-weight:600` + ponto `6px` redondo na cor CRUA do tenant (amostra `#7C3AED` Qualificado, `#0EA5E9` Proposta, `#F59E0B` Negociação) | HTML, README |
| BADGE-02 | Etiqueta (tag) `.color-chip` cheia: `height:20px; padding:0 8px; border-radius:6px; background:color-mix(in srgb, <chip> 85%, #000); color:#fff; 11px/600`; sem borda (amostra VIP `#EC4899`, Indicação `#0EA5E9`, Reativar `#F59E0B`) | HTML, README |
| BADGE-03 | "Situação (etapa) = borda + ponto na cor do tenant, canto 5px. Etiqueta = `.color-chip` cheio, canto 6px. Formas diferentes de propósito." — não colapsar num só componente | HTML anotação, README |
| BADGE-04 | Status "IA ativa": `height:20px; padding:0 7px; gap:5px; radius 6px; background:var(--amberbg); color:var(--amber)` + ícone bot 11px stroke 2.2 | HTML |
| BADGE-05 | Status "Humano assumiu": mesmo formato, `background:var(--okbg); color:var(--ok)` (sem ícone) | HTML |
| BADGE-06 | Status "Pendente": `background:var(--sf2); border:1px solid var(--bd); color:var(--tx2)` | HTML |
| BADGE-07 | Status "SLA estourado": `background:var(--dgbg); color:var(--dg)` | HTML |
| BADGE-08 | Regra geral de status de sistema: 20px, raio 6, fundo a 10–14% + texto na cor do status | README |
| BADGE-09 | Contador: `min-width:18px; height:18px; padding:0 5px; border-radius:9px; background:var(--ac); color:var(--btntx); font-size:10.5px; font-weight:700; centered` | HTML, README |
| BADGE-10 | ComingSoonBadge "Em breve": `height:18px; padding:0 6px; border-radius:4px; border:1px dashed var(--bd2); color:var(--tx3); font-size:10px; font-weight:700; letter-spacing:.08em; uppercase` | HTML, README |
| BADGE-11 | Layout da amostra: 2 linhas `gap:8px; flex-wrap`, segunda com `margin-top:10px`; anotação em 11.5px `--tx3` `margin-top:12px` | HTML |

---

## FIELD — FormField / Input / Select / Switch (HTML "FormField · Input md 36px")

| # | Item | Valor | Fonte |
|---|---|---|---|
| FIELD-01 | Grid do formulário: 2 colunas `gap:12px`; cada campo `flex-column; gap:5px` (label→input) | HTML (README: gap entre campos 12, grupos 14–18) |
| FIELD-02 | Label: `12px/600; color:var(--tx)`; sufixo `· opcional` em `color:var(--tx3); font-weight:500` | HTML, README |
| FIELD-03 | Input md (repouso): `height:36px; border-radius:7px; border:1px solid var(--bd2); background:var(--sf); padding:0 10px; font-size:13px`; placeholder `color:var(--tx3)` ("Ex.: Mariana Costa") | HTML, README |
| FIELD-04 | Foco: `border:1px solid var(--ac); box-shadow:0 0 0 3px var(--acsoft)`; texto `--tx`; caret = barra `1px × 16px` cor `--ac` | HTML, README |
| FIELD-05 | Erro: `border:1px solid var(--dg)`; linha de ajuda abaixo `font-size:11.5px; color:var(--dg); gap:5px` + ícone alert-circle 12px stroke 2.2; texto "Informe um e-mail válido" | HTML, README |
| FIELD-06 | Select com avatar ("Responsável"): input md + `justify-content:space-between`; conteúdo `gap:7px` com avatar `18px; border-radius:30%; background:var(--avs); color:var(--avi); 9px/700` + nome; chevron-down 14px `--tx3` à direita | HTML |
| FIELD-07 | Hint (não-erro): 11.5px terciário | README |
| FIELD-08 | Switch ON: container `32×18px; border-radius:9px; background:var(--ac)`; thumb `14px` branco `#fff` em `top:2px; left:16px`; label 12.5px `--tx` | HTML, README |
| FIELD-09 | Switch OFF: `background:var(--bd2)`; thumb `left:2px`; label `--tx2` | HTML |
| FIELD-10 | Linha de switches: `gap:18px; margin-top:12px`; label a 8px do switch | HTML |
| FIELD-11 | Alturas: sm 28 / md 36 / lg 44 também pra Textarea, Select, NumberField, MoneyInput, PhoneField | README §1.2 |

---

## CARD — Card / CardHeader / KPI (HTML "Card · CardHeader · KPI")

| # | Item | Valor | Fonte |
|---|---|---|---|
| CARD-01 | Container: `border:1px solid var(--bd); border-radius:8px; background:var(--sf)`; **sem sombra** | HTML, README |
| CARD-02 | CardHeader: `height:40px; padding:0 14px; border-bottom:1px solid var(--bd); flex space-between`; título `13px/600` | HTML, README |
| CARD-03 | Ação do header ("Hoje ⌄"): pílula `height:24px; padding:0 8px; gap:4px; border-radius:6px; border:1px solid var(--bd); font-size:11.5px; font-weight:500; color:var(--tx2)` + chevron 12px | HTML |
| CARD-04 | Corpo KPI: `grid 1fr 1fr; gap:0 14px; padding:12px 14px` (padding de card geral: 14px) | HTML, README |
| CARD-05 | KPI rótulo: `11px/500; color:var(--tx2)` ("Atendidas", "Tempo 1ª resposta") | HTML |
| CARD-06 | KPI valor: `26px/800; letter-spacing:-.02em; line-height:1.15; margin-top:2px` tabular ("1.284", "0:48") | HTML |
| CARD-07 | KPI delta: `11.5px/600; margin-top:2px`; positivo `color:var(--ok)` ("+12,4%"), negativo `color:var(--dg)` ("+0:06"); sufixo "vs. ontem" `color:var(--tx3); font-weight:500` | HTML |
| CARD-08 | `elevated` = `border:1px solid var(--bd2)` (borda de ênfase) — "não sombra" | HTML anotação, README |
| CARD-09 | `glow` — só no card de IA (única exceção de sombra fora de overlay) | HTML anotação, README |
| CARD-10 | Card clicável hover: fundo `--rowhover` + borda de ênfase. Selecionado: borda `--ac` + `0 0 0 3px --acsoft` | README |
| CARD-11 | Sem gradiente em texto de KPI (nota do turno 1) | HTML (bloco de premissas) |

---

## TABLE — DataTable (HTML "DataTable · linha 36px")

| # | Item | Valor | Fonte |
|---|---|---|---|
| TABLE-01 | Container: `border:1px solid var(--bd); border-radius:8px; background:var(--sf); overflow:hidden` | HTML |
| TABLE-02 | Cabeçalho: `height:32px; padding:0 12px; background:var(--sf2); border-bottom:1px solid var(--bd); font-size:11px; font-weight:600; color:var(--tx2)` | HTML, README |
| TABLE-03 | Linha: `height:36px; padding:0 12px; border-bottom:1px solid var(--bd); font-size:13px`; sem zebra; última linha sem border-bottom (container fecha) | HTML, README |
| TABLE-04 | Nome (célula principal): `font-weight:500` | HTML |
| TABLE-05 | Situação na célula: StageBadge (BADGE-01) `width:max-content` | HTML |
| TABLE-06 | Valor numérico: `text-align:right`, tabular, `--tx` ("R$ 4.200") | HTML, README |
| TABLE-07 | Menu de linha: coluna fixa `32px` (README: 36px) ⚠, `···` `color:var(--tx3); text-align:center` | HTML / README |
| TABLE-08 | Hover / ativo: `background:var(--rowhover); box-shadow:inset 2px 0 0 var(--ac)` (barra 2px à esquerda); rótulo de amostra "hover / ativo" 11px `--tx3` | HTML, README |
| TABLE-09 | Colunas da amostra: `grid-template-columns:1.5fr 1fr 90px 32px` | HTML |
| TABLE-10 | Paginação: `margin-top:8px; flex space-between; font-size:11.5px; color:var(--tx3)`; texto "1–50 de 2.318"; setas `‹ ›` `24×24px; border-radius:6px; border:1px solid var(--bd); gap:4px`; seta habilitada `color:var(--tx)` | HTML |
| TABLE-11 | ⚠ README: rodapé de paginação 40px com `border-top`, 12px secundário; setas 24px raio 6 (HTML da 1a mostra versão solta, sem rodapé) | README |
| TABLE-12 | Checkbox: 14px, raio 4px; marcado = fundo `--btn` + check branco 10px | README |

---

## TABS — Tabs (HTML "Tabs · EmptyState")

| # | Item | Valor | Fonte |
|---|---|---|---|
| TABS-01 | Lista: `flex; gap:18px; border-bottom:1px solid var(--bd); font-size:13px; font-weight:500; color:var(--tx2)` | HTML, README |
| TABS-02 | Aba: `padding:0 0 8px` (sem padding horizontal) | HTML |
| TABS-03 | Ativa: `color:var(--tx); font-weight:600; box-shadow:inset 0 -2px 0 var(--tx)` (sublinhado 2px na cor do texto = currentColor); sem indicador deslizante | HTML, README |
| TABS-04 | Contador: `font-size:11px; color:var(--tx3); margin-left:2px` ("Negócios 4") | HTML, README |
| TABS-05 | Comportamento preservado: `onChange` dispara mesmo na aba ativa; sem roving tabindex | README |
| TABS-06 | Amostra: Visão geral (ativa) · Negócios 4 · Histórico · Conversas | HTML, PNG |

---

## EMPTY — EmptyState / ErrorState

| # | Item | Valor | Fonte |
|---|---|---|---|
| EMPTY-01 | Container: `margin-top:12px; border:1px dashed var(--bd2); border-radius:8px; padding:18px 16px; flex-column; align-items:flex-start; gap:6px` — **tem moldura tracejada, alinhado à esquerda** | HTML, README, PNG (claro e escuro mostram o tracejado) |
| EMPTY-02 | Ícone: 20px, stroke 1.75, `color:var(--tx3)` (message-square) | HTML, README |
| EMPTY-03 | Título: `13px/600` ("Nenhuma conversa com este contato") | HTML, README |
| EMPTY-04 | Hint: `12px; color:var(--tx2); line-height:1.5` | HTML, README |
| EMPTY-05 | CTA: botão **neutral sm** — `height:28px; padding:0 10px; radius 7; background:var(--sf); border:1px solid var(--bd2); color:var(--tx); 12px/600; margin-top:4px` ("Iniciar conversa"). README: "deliberadamente **não** teal" | HTML, README |
| EMPTY-06 | ⚠ Nota de fonte: a reauditoria anterior descreveu o EmptyState como "sem moldura, botão secondary" — HTML, README e os dois PNGs concordam em **moldura tracejada `--bd2` + CTA neutral**. Registrar pro orquestrador reconciliar. | fontes |

---

## MODAL — Modal / ConfirmModal · danger

| # | Item | Valor | Fonte |
|---|---|---|---|
| MODAL-01 | Caixa: `width:400px; border:1px solid var(--ovbd); border-radius:10px; background:var(--sf); box-shadow:var(--ovsh)` | HTML, README |
| MODAL-02 | Header: `padding:16px 18px 0`; título `15px/700; letter-spacing:-.01em` ("Excluir etiqueta “VIP”?"); descrição `12.5px; color:var(--tx2); line-height:1.5; margin-top:4px` | HTML, README |
| MODAL-03 | Bloco de alcance (`impact` = Banner): `margin:12px 18px 0; padding:9px 10px; border-radius:6px; gap:8px; align-items:flex-start; font-size:12px; line-height:1.45`; na amostra `background:var(--amberbg); color:var(--amber)` (atenção) com ícone triangle 14px stroke 2 `margin-top:1px`; contagens em `font-weight:700` ("**142 contatos** e **2 automações** afetados.") | HTML, README (fundo 10–14% + texto do status) |
| MODAL-04 | Footer: `flex; justify-content:flex-end; gap:8px; padding:14px 18px 16px`; botões md | HTML, README |
| MODAL-05 | Botões: "Cancelar" = neutral md; "Excluir etiqueta" = danger `#B91C1C`/`#fff` md | HTML, README |
| MODAL-06 | Corpo genérico de Modal: `padding:14px 18px` | README |
| MODAL-07 | Scrim `--scrim`; portal em `document.body` + `useLayer`; nunca `z-[N]` fixo | README |
| MODAL-08 | Drawer: raio 0, borda esquerda 1px `--ovbd` + `--ovsh`; larguras contato 768px (48rem), automação 880px | README |

---

## DROP / TOAST / TIP — Dropdown · Toast · Tooltip

| # | Item | Valor | Fonte |
|---|---|---|---|
| DROP-01 | Caixa: `width:200px; border:1px solid var(--ovbd); border-radius:8px; background:var(--ov); box-shadow:var(--ovsh); padding:4px; font-size:13px` | HTML, README |
| DROP-02 | Item: `height:30px; padding:0 8px; border-radius:5px; color:var(--tx)` | HTML, README |
| DROP-03 | Item realçado/hover: `background:var(--rowhover)` ("Atribuir a mim") | HTML |
| DROP-04 | Atalho: à direita, `font-size:11px; color:var(--tx3); font-family:JetBrains Mono` ("E") | HTML, README |
| DROP-05 | Separador: `height:1px; background:var(--bd); margin:4px 0` | HTML, README |
| DROP-06 | Item destrutivo: `color:var(--dg)` ("Excluir conversa"), mesmo formato | HTML, README |
| DROP-07 | Amostra: Atribuir a mim · Marcar resolvida `E` · Mover para funil… · ─ · Excluir conversa | HTML, PNG |
| TOAST-01 | `height:40px; padding:0 12px; gap:10px; border-radius:8px; background:var(--toast); color:var(--toasttx); font-size:12.5px; font-weight:500; box-shadow:var(--ovsh)` (fundo invertido: `#1A1F2E` claro / `#ECF1F1` escuro) | HTML, README |
| TOAST-02 | Ícone de status: círculo `16px; background:#22C55E` com check branco 10px stroke 3 | HTML, README |
| TOAST-03 | Ação: "Desfazer" `margin-left:8px; color:var(--ac); font-weight:600` | HTML, README |
| TOAST-04 | Continua mostrando só o mais recente | README |
| TIP-01 | `height:24px; padding:0 8px; border-radius:5px; background:var(--tooltip); color:var(--tooltiptx); font-size:11.5px; font-weight:500; width:max-content` | HTML, README |
| TIP-02 | Atalho no tooltip: `margin-left:6px; font-family:JetBrains Mono; opacity:.7` ("Fixar sidebar ⌘.") | HTML, README |

---

## LAYOUT — composição da própria tela 1a (referência de leitura)

| # | Item | Valor | Fonte |
|---|---|---|---|
| LAY-01 | Grade superior: `repeat(3,1fr); gap:28px 32px` — Botões · Badges · Inputs / Card+KPI · Tabela · Tabs+Empty | HTML |
| LAY-02 | Grade inferior: `1fr 1fr 1fr; gap:32px; margin-top:28px; align-items:start` — ConfirmModal · Dropdown/Toast/Tooltip · Tipografia | HTML |
| LAY-03 | Anotações de rodapé de cada bloco: `margin-top:12px; font-size:11.5px; color:var(--tx3); line-height:1.5`; trechos em mono (`elevated`, `--bd2`, `glow`, `.color-chip`) e "teal" em `color:var(--ac)` | HTML |
| LAY-04 | Frame de tela: 1440×880, `background:var(--sb)`, raio 8, fonte base TOK-31 | HTML `mk()` |

---

## Textos literais das anotações (transcrição)

- "Hover: escurece 1 passo em 150ms. Foco: anel 2px teal com offset 2px. Ghost só em toolbar e linhas de tabela."
- "Situação (etapa) = borda + ponto na cor do tenant, canto 5px. Etiqueta = .color-chip cheio, canto 6px. Formas diferentes de propósito."
- "Elevação = borda 1px. elevated passa a usar --bd2 (borda de ênfase), não sombra. glow só no card de IA."
- Rodapé da tela (PNG): "Dashboard — faixa de KPIs em card único · 8/4 (narrativa + pulso). Números são exemplo."
- Premissas do turno 1 (HTML): "Destrutivo: fundo #B91C1C sólido nos dois temas"; "Dashboard: grade reaberta — faixa de KPIs num único card dividido por hairlines, depois 2 colunas 8/4. Sem gradiente em texto de KPI."; "Shell: sidebar e conteúdo formam uma estrutura única, sem 'canvas flutuante'"; "Pele nova, estrutura igual: nomes de variante (primary · neutral · secondary · ghost · danger), tamanhos sm 28 · md 36 · lg 44, .color-chip/--chip, tintaDaEtapa(), useLayer e portal continuam."

---

## Divergências entre fontes (pro orquestrador decidir — sem opinião aqui)

1. **BTN-04 / TYPE-13** — lg: HTML 14px, README 13px.
2. **TABLE-07** — coluna do menu `···`: HTML 32px, README 36px.
3. **TABLE-10/11** — paginação: HTML (1a) solta com `margin-top:8px` 11.5px `--tx3`; README rodapé 40px com `border-top`, 12px secundário.
4. **EMPTY-06** — reauditoria anterior ("sem moldura, botão secondary") × HTML+README+PNG ("moldura tracejada `--bd2`, CTA neutral").
5. **CARD-08** — `elevated`: HTML e README dizem borda `--bd2`; leitura anterior citou "bg2".

**Total: 31 TOK + 18 TYPE + 10 RAD + 8 ELEV + 16 BTN + 11 BADGE + 11 FIELD + 11 CARD + 12 TABLE + 6 TABS + 6 EMPTY + 8 MODAL + 7 DROP + 4 TOAST + 2 TIP + 4 LAY = 165 itens.**
