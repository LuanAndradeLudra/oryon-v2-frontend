# Gaps 1c — Contatos/CRM (Fase B, estático)

Spec: `spec/1c-contatos.md` (95 itens). Código lido inteiro: `pages/ContactsPage.tsx`,
`contacts/{ContactsTable,ContactsFiltersBar,ContactsHeader,ContactsStatsBar,ContactsColumnsModal,
ContactDetailPanel,ContactDetailHeader,ContactDetailTabs,ContactIdentityPanel,StageBadge,BulkActionBar}`,
`contacts/tabs/{OverviewTab,TagsCard,ContactInfoCard,CustomFieldsCard,DealsSummaryCard,DealsTab,HistoryTab}`,
`hooks/useContactColumnsConfig.ts`, `ui/{DataTable,Modal,Switch,Avatar,CollapsibleSection,ComingSoonBadge,
Tabs,Button}`, `layout/TopBar.tsx` (linhas 1620-1728), `deals/DealSummary.tsx` (card), `index.css` (tokens).
Nenhum arquivo editado além deste.

Tokens (canvas → projeto): `--bg`=surface-950 · `--sf`=surface-800 · `--sf2`=surface-900/`var(--sf2)` ·
`--bd`=surface-700 · `--bd2`=`var(--bd2)` · `--tx`=surface-100 · `--tx2`=surface-400 · `--tx3`=surface-500 ·
`--ac`=brand-500 · `--acs`=accent-dark · `--acsoft`=accent-soft · `--btn/--btntx`=`var(--color-btn-primary-*)` ·
`--rowhover`=`var(--rowhover)` · `--ovbd`=`--color-overlay-border` (#D5DAE3/#324646 ✓ exato) ·
`--ovsh`=`--shadow-overlay` (✓) · `--scrim`≈`--color-scrim-soft` (.18 claro ✓ / .35 escuro vs .40) ·
`--avs/--avi`=`--color-avatar-*` (✓ exato). Raio: xs 6 / sm 7 / md-lg 8 / xl 10.

Legenda: ✅ bate · ❌ difere (mudança mínima anotada) · ❓ só ao vivo · [!] dado/backend inexistente.

## Tabela

| ID | St | arquivo:linha | o que o código faz hoje | menor mudança |
|---|---|---|---|---|
| CONT-HDR-01 | ❌ | TopBar.tsx:1621 | `h-12 px-4 gap-3` ✓; `bg-surface-950 border-b border-surface-800/60` | `bg-surface-800 border-b border-surface-700` (fundo `--sf`, hairline `--bd` sólida) |
| CONT-HDR-02 | ❌ | TopBar.tsx:1628 | `text-sm font-bold text-surface-50`, sem tracking | `text-surface-100 tracking-[-0.01em]` (14/700 ✓) |
| CONT-HDR-03 | ❌/[!] | TopBar.tsx:1631-1637, PAGE_SUBTITLES | subtítulo estático "Base de clientes", `text-sm text-surface-500` com "·" | subtítulo dinâmico "N contatos" (`total` já existe em ContactsPage — expor via `useRegisterTopBarActions`/novo slot de subtítulo), `text-xs text-surface-400`, sem "·". "· 47 novos esta semana" = [!] (sem endpoint; `ContactsStatsBar.newThisWeek` conta só a página carregada) |
| CONT-HDR-04 | ❌ | TopBar.tsx:1642-1657; ContactsPage.tsx:183-232 | ordem `[badge 5.190][Configurar][Importar][Novo]` → divisor → busca → (copilot) → sino → avatar; `gap-1.5` | `gap-2`; tirar o badge de contagem (vira subtítulo, HDR-03); "Configurar" → ver bloco *fora da referência* |
| CONT-HDR-05 | ❌ | ContactsPage.tsx:211-217 | botão manual `px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-800 border-surface-700 text-surface-300` (~30px) | `<Button variant="neutral" size="sm" leftIcon={<Upload className="w-3.5 h-3.5" />}>Importar</Button>` (28px, raio 7, 12/600 `--tx`; borda `--bd2` depende do BTN neutral — 1a) |
| CONT-HDR-06 | ❌ | ContactsPage.tsx:218-224 | `bg-surface-100 text-surface-950 shadow-sm rounded-lg` (mono invertido + sombra) | `<Button variant="primary" size="sm" leftIcon={<Plus/>}>Novo {vocab.contact}</Button>` (fundo `--btn`, sem sombra; rótulo continua vindo do vocabulário) |
| CONT-HDR-07 | ❌ | TopBar.tsx:1655 | `w-px h-5 bg-surface-700/60 mx-0.5` | `h-[18px] bg-surface-700 mx-0.5` (1×18, `--bd` sólida) |
| CONT-HDR-08 | ❌ | TopBar.tsx:1664-1676 | `w-[160px] h-8 rounded-lg border-surface-700/60 bg-surface-800 text-xs`; kbd `bg-surface-700 text-3xs rounded` | `w-[200px] h-7 rounded-sm border-surface-700 bg-surface-900 text-surface-500`; kbd `font-mono text-[10.5px] border border-[var(--bd2)] rounded px-1 bg-transparent` |
| CONT-HDR-09 | ❌ | TopBar.tsx:1707 | `w-8 h-8 rounded-lg text-surface-400` | `w-7 h-7 rounded-sm` (28px, raio 7) — badge de não lidas é extra do app, manter |
| CONT-HDR-10 | ✅/❓ | TopBar.tsx:1355-1362 | `w-7 h-7 rounded-[30%]` | iniciais 10.5/700 — confirmar ao vivo |
| CONT-HDR-11 | ✅ | index.css:257-258, 824-825 | `--color-avatar-*` iguais ao canvas nos 2 temas | — |
| CONT-FILTERS-01 | ❌ | ContactsFiltersBar.tsx:250 | `flex-col gap-2 px-4 py-2.5 border-b border-surface-800` (altura livre, fundo herdado `--bg`, borda em `surface-800` = branco no claro) | `h-11 flex items-center gap-2 px-4 border-b border-surface-700 bg-surface-800`; chips ativos em linha (não 2ª linha) |
| CONT-FILTERS-02 | ❌ | ContactsFiltersBar.tsx:253-274 | busca `flex-1` largura toda, `py-2 rounded-lg text-sm bg-surface-800 border-surface-700 pl-9`, placeholder longo | `w-60 h-7 rounded-sm border-[var(--bd2)] bg-surface-800 text-xs pl-8`, placeholder "Nome, telefone ou e-mail", ícone 14px |
| CONT-FILTERS-03 | ❌ | ContactsFiltersBar.tsx | não existe divisor | `<div className="w-px h-[18px] bg-surface-700 mx-1" />` após a busca |
| CONT-FILTERS-04 | ❌ | ContactsFiltersBar.tsx:119-124, 294-299 | ativo = `bg-brand-600/15 border-brand-500/40 text-brand-300 py-2 text-sm` | chip 28px `rounded-sm border-brand-500 bg-accent-soft text-accent-dark text-xs font-semibold`, valor `font-bold`, `X` 12px à direita, gap 5 |
| CONT-FILTERS-05 | ❌/[!] | ContactsFiltersBar.tsx:59-83 (FilterSelect), 117-129, 292-312 | Fonte = `<select>` nativo; Etiquetas/Filtros = botões `py-2 text-sm bg-surface-800 border-surface-700 text-surface-300` | chips 28px `rounded-sm border-[var(--bd2)] bg-surface-800 text-surface-100 text-xs font-semibold` + chevron 12px. Conjunto da referência: **Situação** (❓ confirmar `stage` em `ContactFilters`/`useContacts`; dado existe), **Etiqueta** (✓ existe), **Responsável** [!] (sem owner — GAPS-PENDENTES), **Funil** (❓ filtro por pipeline no backend; `dealsSummary.byPipeline` existe no contato) |
| CONT-FILTERS-06 | ❌ | ContactsFiltersBar.tsx:292-312 | "Filtros" bordeado com badge de contagem | ghost 28px `text-surface-400 text-xs font-semibold` ícone `Plus` 13px, rótulo "+ Filtro" (o menu atual vira o conteúdo do "+ Filtro") |
| CONT-FILTERS-07 | ❌/[!] | ContactsFiltersBar.tsx | não existe | `SegmentedControl` Todos|Meus com `ml-auto` (28px, borda `--bd`, ativo `bg-surface-900`); "Meus" = [!] (owner) — renderizar só quando o dado existir |
| CONT-FILTERS-08 | ❌ | ContactsFiltersBar.tsx:349-358 | bordeado `bg-surface-800 border-surface-700 text-sm` | ghost 28px `text-surface-400 text-xs font-semibold`, ícone 14px, último da barra |
| CONT-FILTERS-09 | ❌ | idem 04/05 | ativo teal-translúcido; inativo borda `--bd` | regra: ativo = borda `--ac` + `--acsoft` + valor 700 + ×; inativo = borda `--bd2` |
| CONT-TABLE-01 | ❌ | ContactsPage.tsx:358 | wrapper `mx-4 mb-4 mt-1 bg-surface-900 border border-surface-800 rounded-xl` (card solto) | remover wrapper; container `flex-1 min-h-0 flex flex-col bg-surface-800` encostado na barra |
| CONT-TABLE-02 | ❌/[!] | ContactsTable.tsx:380-388; useContactColumnsConfig.ts:16-40 | colunas padrão visíveis: Nome·Telefone·Situação·Score·Intenção·Sentimento·Etiquetas·Funis*·Fonte·Último contato·Opt-in·menu; larguras automáticas | padrão = Nome·Telefone·Situação·Etiquetas·(Responsável [!])·Último contato·**Negócios**·menu; `widthClass` por coluna (40/1.5fr/130/1fr/1.3fr/130/120/80/36). Coluna Negócios: contar `dealsSummary.byPipeline[].openCount` (dado existe). Colunas extras → bloco *fora da referência* |
| CONT-TABLE-03 | ❌ | DataTable.tsx:93-115 | thead `bg-surface-900` ✓(`--sf2`); `border-b border-surface-800`; th `px-3 py-2 text-[11px] font-medium text-surface-500 uppercase tracking-wide` | `border-surface-700`; th `text-[11px] font-semibold text-surface-400` **sem uppercase/tracking**; `pl-3 pr-2` (0 8 0 12) |
| CONT-TABLE-04 | ❌ | DataTable.tsx:114-125 | coluna ordenada mantém `text-surface-500`; chevron 12px | `sort?.key===col.key && 'text-surface-100'`; chevron `w-[11px] h-[11px]` stroke 2.4, gap 1 |
| CONT-TABLE-05 | ❌ | ContactsTable.tsx:346-351 | "Último contato" sem `align` | `align:'right'` em lastContactedAt e Negócios |
| CONT-TABLE-06 | ❌ | DataTable.tsx:96-104 | `<input type=checkbox accent-brand-500>` nativo | checkbox custom 14×14 `rounded border-[var(--bd2)] bg-surface-800` (componente `Checkbox` em ui/) |
| CONT-TABLE-07 | ❌ | DataTable.tsx:141,162-166 | `border-b border-surface-800/60`; td `px-3 py-2` + avatar 24px (≈40px) | `border-surface-700`; `dense` → `py-1.5` + avatar 22px (=36px); `pl-3 pr-2` |
| CONT-TABLE-08 | ❌ | DataTable.tsx:143-144; ContactsTable.tsx:414 | `activeKey` pinta `bg-brand-500/15`; ContactsTable **não passa** `activeKey` (linha do drawer aberto não é marcada) | `activeKey ? 'bg-[var(--rowhover)] [&>td:first-child]:shadow-[inset_2px_0_0_0_var(--color-brand-500)]'`; passar `activeKey={selectedContactId}` de ContactsPage |
| CONT-TABLE-09 | ❌ | DataTable.tsx:152-158 | checkbox nativo | marcado: 14×14 `bg-[var(--color-btn-primary-bg)]` + check 10px stroke 3.5 `--btntx` |
| CONT-TABLE-10 | ❌ | idem | nativo | desmarcado: `border-[var(--bd2)]` sem fundo |
| CONT-TABLE-11 | ❌ | ContactsTable.tsx:365-370; Avatar.tsx:22 | `Avatar size="xs"` = 24px/10px, `gap-2.5` | avatar 22px iniciais 9/700 (novo `size="2xs"` em Avatar ou classe), `gap-[9px]`; nome 13/600 ✓ |
| CONT-TABLE-12 | ❌ | ContactsTable.tsx:263 | `text-xs text-surface-400` + waId cru | `text-[13px]` + formatador "+55 11 98765-4321" (helper de telefone) |
| CONT-TABLE-13 | ❌ | StageBadge.tsx:35-63 | `Milestone` ícone + ponto 6px + `font-medium text-surface-200` | remover o ícone `Milestone`; `font-semibold text-surface-100`; `px-[7px]`; altura 20 ✓ raio 5 ✓ borda `--bd` ✓ |
| CONT-TABLE-14 | ❌ | ContactsTable.tsx:311-318 | `rounded-full text-[10px] font-medium px-1.5 h-[18px]` | `rounded-xs text-[10.5px] font-semibold px-[7px]` (color-mix 85% ✓, #fff ✓) |
| CONT-TABLE-15 | ❌ | ContactsTable.tsx:321 | `text-[10px] text-surface-500` | `text-[11px]` (cor ✓) |
| CONT-TABLE-16 | ❌ | ContactsTable.tsx:323 | `text-surface-600 text-xs` | `text-surface-500` |
| CONT-TABLE-17 | [!] | — | não há campo Responsável no contato | GAPS-PENDENTES (owner) — só quando existir: avatar 18px `rounded-[30%]` iniciais 8/700 + "Ana N." 12.5px |
| CONT-TABLE-18 | [!] | — | idem | "Sem responsável" 12px `--tx3` |
| CONT-TABLE-19 | ❌ | ContactsTable.tsx:350 | esquerda, `text-xs text-surface-400`, `relativeDate` ✓ | `align:'right'`, `text-[13px]` |
| CONT-TABLE-20 | ❌ | — | coluna inexistente | nova coluna "Negócios" (right, tabular): `openCount` somado de `dealsSummary.byPipeline`; 0 em `text-surface-500` |
| CONT-TABLE-21 | ❌ | ContactsTable.tsx:373-378, 48-83 | ícone `MoreHorizontal` em botão `p-1.5 rounded-lg`, coluna `w-10` | `w-9` (36px), gatilho `text-surface-500` centrado — ícone aceitável como "···" |
| CONT-TABLE-22 | ✅ | — | referência de densidade, sem código | — |
| CONT-TABLE-23 | ❌ | DataTable.tsx:92,168 | `tabular-nums` só em células `align:right` | `tabular-nums` na `<table>` |
| CONT-FOOTER-01 | ❌ | ContactsTable.tsx:413-435 | sem rodapé (scroll infinito + spinner) | rodapé 40px `flex items-center px-4 gap-3.5 border-t border-surface-700 text-xs text-surface-400` |
| CONT-FOOTER-02 | ❌ | BulkActionBar.tsx:131-140 | barra FLUTUANTE `fixed bottom-6 overlay-surface rounded-xl` | com seleção, o rodapé (FOOTER-01) mostra "N selecionado(s)" 600 `--tx` + ações "Atribuir · Etiquetar · Exportar" em `--tx2` (mover situação/etiquetas/vCard já existem no BulkActionBar — migrar pra inline) |
| CONT-FOOTER-03 | ❌/❓ | useContacts (loadMore) | scroll infinito; `total` existe | texto "1–{carregados} de {total}" 12px `--tx2` (dado existe); setas 24×24 `rounded-xs border-surface-700` — ❓ exigem paginação por página (verificar se `useContacts` aceita offset/page) |
| CONT-FOOTER-04 | ❌ | idem 02 | — | mesma faixa de 40px, sem pulo de layout |
| CONT-DRAWER-01 | ❌ | ContactsPage.tsx:572 | `bg-black/40` | `bg-[var(--color-scrim-soft)]` (`overlay-scrim`) |
| CONT-DRAWER-02 | ❌/[!] | ContactsPage.tsx:581 | `w-[48rem]` ✓ 768; `bg-surface-950`; `border-l overlay-frame` ✓ (`--ovbd`/`--ovsh`); raio 0 ✓ | `bg-surface-800` (`--sf`). `?contact=&tab=` na URL = [!] documentado (GAPS-PENDENTES 1.3); `useLayer` ❓ (z-40 manual) |
| CONT-DRAWER-03 | ❌ | ContactDetailHeader.tsx:54 | `items-start gap-3 px-5 pt-5 pb-4` | `items-center gap-3 px-[18px] pt-3.5 pb-0` |
| CONT-DRAWER-04 | ❌ | ContactDetailHeader.tsx:55; Avatar.tsx:25 | `size="lg"` = 48px / 16px | `size="md"` = 40px; iniciais 14/700 (`text-sm font-bold`) |
| CONT-DRAWER-05 | ❌ | ContactDetailHeader.tsx:58-84 | nome `text-base font-semibold`; linha 2 `text-sm` (14px) com waId cru + ícone copiar + e-mail + "cliente desde"; linha extra cargo·empresa | nome `font-bold tracking-[-0.01em]`; linha 2 `text-xs text-surface-400`, telefone formatado, gap 3px; ícone copiar e linha cargo·empresa → *fora da referência* (Empresa vive em DADOS) |
| CONT-DRAWER-06 | ✅ | ContactDetailHeader.tsx:87-89 | `Button primary sm` + `MessageSquare` 14px | — |
| CONT-DRAWER-07 | ❌ | ContactDetailHeader.tsx:90-99; Button.tsx:34 | `neutral sm` ✓ mas com `leftIcon Handshake`; neutral usa `border-surface-700` | remover ícone; borda `--bd2` é item BTN da 1a (não mexer aqui) |
| CONT-DRAWER-08 | ❌ | ContactDetailHeader.tsx:103-135 | "Perfil completo" (botão bordeado h-8) + lixeira solta | kebab 28×28 `rounded-sm border-[var(--bd2)] text-surface-400` (`MoreHorizontal` 15px) com Dropdown: Excluir (admin) etc.; "Perfil completo" migra pra DRAWER-13 |
| CONT-DRAWER-09 | ✅ | ContactDetailHeader.tsx:136-142 | 28px, sem borda, ícone 16 | (`rounded-lg`→`rounded-sm`, cosmético) |
| CONT-DRAWER-10 | ❌ | ContactDetailTabs.tsx:27-33; ui/Tabs.tsx | Tabs já `gap-[18px] 13/500 --tx2 border --bd pb-2`; wrapper `px-5` sem `pt` | `className="px-[18px] pt-3.5"`; `pb-[9px]` na aba (Tabs usa pb-2=8) |
| CONT-DRAWER-11 | ✅ | ui/Tabs.tsx | ativa `--tx` 600 + inset currentColor | — |
| CONT-DRAWER-12 | ✅ | ui/Tabs.tsx; ContactDetailTabs.tsx:20-22 | contador 11px `--tx3` ml 2px; dado real (`dealsCount`/`conversationCount`) | — |
| CONT-DRAWER-13 | ❌ | ContactDetailHeader.tsx:104-114 | "Perfil completo" no header | link "Abrir ficha completa ↗" `ml-auto pb-[9px] text-xs font-semibold text-accent-dark` na faixa de abas (mesmo `onExpand`/gate de flag) |
| CONT-DRAWER-14 | ❌ | ContactDetailPanel.tsx:181; ContactIdentityPanel.tsx:23 | `flex md:flex-row`; coluna `w-[260px] border-r border-surface-800` | `border-surface-700` (`--bd`); grid `md:grid-cols-[260px_1fr]` |
| CONT-DRAWER-15 | ❌ | ContactIdentityPanel.tsx:23; TagsCard/ContactInfoCard/CustomFieldsCard (CollapsibleSection) | `p-4 gap-4`; cada grupo é acordeão (`CollapsibleSection`: chevron, toggle, `px-3 py-2.5`) | `px-[18px] py-3.5 gap-3.5 text-[12.5px]`; grupos = eyebrow + conteúdo, **sem acordeão** (trocar `CollapsibleSection` por seção plana `<section><p class=eyebrow/>…</section>` nos 3 cards quando `hideTitle=false`, ou nova prop `flat`) |
| CONT-DRAWER-16 | ❌ | CollapsibleSection.tsx:64; index.css `.eyebrow` | `.eyebrow` 11px/700 .16em + `text-surface-400` | 10px/700 `.14em` uppercase `text-surface-500` `mb-2` |
| CONT-DRAWER-17 | ❌ | ContactInfoCard.tsx:94-101; CustomFieldsCard.tsx:197-215 | Info: grid 88px ✓, label `text-[11px] text-surface-500`, valor `text-[12px] text-surface-200` (400); Campos: label uppercase empilhado + valor `text-sm` | ambos: `grid-cols-[88px_1fr] gap-x-2 gap-y-1.5`; label `text-[12.5px] text-surface-400`; valor `text-[12.5px] font-medium text-surface-100` |
| CONT-DRAWER-18 | ❌/[!] | ContactInfoCard.tsx:20-28 | FIELDS: E-mail, Empresa, Cargo, Setor, Cidade, Estado, País | adicionar **Origem** (`contact.source`, dado existe), **Cidade "São Paulo · SP"** (juntar city+state), **Criado em** (`createdAt`); **Responsável** [!] (owner). E-mail já está na linha 2 do header — manter em Dados é extra |
| CONT-DRAWER-19 | ❌ | TagsCard.tsx:37-46 | ação "+ Gerenciar" 10px `text-brand-400` | "Editar" `text-[11.5px] font-semibold text-accent-dark`, `justify-between` com o eyebrow |
| CONT-DRAWER-20 | ❌ | TagsCard.tsx:55-84 | chip `rounded-full text-xs px-2 py-1 font-medium` + ponto + × por chip | chip 20px `rounded-xs px-2 text-[11px] font-semibold` sem ponto/×; gap-1; botão "+" 20×20 `rounded-xs border border-dashed border-[var(--bd2)] text-surface-500` abrindo o picker (remoção fica no picker) |
| CONT-DRAWER-21 | ❌ | CustomFieldsCard.tsx:100-123 | boolean = "Sim/Não" `text-sm`; valores `text-sm text-surface-200` | mesmo grid de DRAWER-17; boolean true = `Check` 12px stroke 2.5 + "Sim" `text-success font-semibold`; documento/número em `font-mono text-[11.5px]` (❓ sem tipo "documento" nos defs — aplicar a `number`/`phone`) |
| CONT-DRAWER-22 | ❌ | DealsTab.tsx:100; OverviewTab.tsx:37 | DealsTab `p-5` gap-3; Overview `p-4 gap-4` | `px-[18px] py-3.5 gap-3` |
| CONT-DRAWER-23 | ✅ | profile/MockBadge.tsx; mockData.ts:21 | `PROFILE_MOCKS_ENABLED=false` → drawer mostra dado real, banner não se aplica | — |
| CONT-DRAWER-24 | ❌ | DealsTab.tsx:101-134 | h3 `text-sm font-semibold` "{vocab.deals} · N abertos" (contador 12px tx3) + linha descritiva + `AddToPipelineMenu`/botão mono | "N {vocab.deals} abertos" 13/600 + "· R$ {soma dos abertos}" `text-surface-400 font-medium` (somar `amountCents` dos `open` de venda — dado existe); remover a descrição; botão `neutral sm` "+ {vocab.deal}" ícone 13px (AddToPipelineMenu como gatilho neutral sm) |
| CONT-DRAWER-25 | ❌ | DealsTab.tsx:163-206; DealSummary.tsx:328-420 | um CARD por negócio (`bg-surface-900 border-surface-800 rounded-xl px-4 py-3`, stepper, meta, botões Mover/Abrir/Editar/Excluir) | tabela: wrapper `border border-surface-700 rounded-lg overflow-hidden`, grid `1fr 130px 110px 90px` (Negócio·Etapa·Valor·Atualizado). Ações por linha → menu "···"/clique abre o painel (dados: título, etapa, valor, `updatedAt` existem) |
| CONT-DRAWER-26 | ❌ | idem | sem cabeçalho | header 30px `px-3 bg-surface-900 border-b border-surface-700 text-[11px] font-semibold text-surface-400`, Valor/Atualizado à direita |
| CONT-DRAWER-27 | ❌ | idem | card | linha 36px `px-3 border-b border-surface-700 text-[13px]`; nome 500; Etapa = StageBadge (20/raio 5/ponto 6/11 600, sem fundo); Valor direita; Atualizado direita `--tx2` |
| CONT-DRAWER-28 | ❌ | DealSummary.tsx (closed) | fechados como card com histórico | linha inteira `text-surface-400`; badge "Ganho" ponto `--ok` texto `--tx2` |
| CONT-DRAWER-29 | ❌ | DealsTab.tsx | sem timeline na aba Negócios (vive em HistoryTab) | eyebrow "ATIVIDADE RECENTE" (`mt-1.5`) abaixo da tabela |
| CONT-DRAWER-30 | ❌ | HistoryTab.tsx:71-119 (fontes), 199-226 (visual) | timeline com chips de ícone coloridos, `text-sm`, filtro segmentado — em OUTRA aba | lista compacta na aba Negócios reusando `loadHistory` (extrair pra hook): item `grid-cols-[64px_1fr] gap-2.5 py-[7px] border-b border-surface-700 text-[12.5px]`; tempo `text-[11.5px] text-surface-500`; ator 600; nome do negócio `--tx2`; "ver conversa" 600 `text-accent-dark` (link p/ conversa existe) |
| CONT-DRAWER-31 | ❌ | ContactsPage.tsx:581 | painel `bg-surface-950` | `bg-surface-800`; borda/sombra/scrim/avatar ✓ após DRAWER-01/02 |
| CONT-DRAWER-32 | ✅ | ContactDetailPanel.tsx:181-201 | coluna de identidade persiste em todas as abas | — |
| CONT-COLS-01 | ❌ | Modal.tsx:103; ContactsColumnsModal.tsx:83 | `bg-surface-900 overlay-frame rounded-2xl max-w-[520px]` | `bg-surface-800` (`--sf`); largura ✓ raio ✓ borda/sombra ✓ |
| CONT-COLS-02 | ❌ | Modal.tsx:114 | `px-5 py-4 border-b border-surface-800` | `px-[18px] pt-4 pb-3 border-surface-700` |
| CONT-COLS-03 | ❌ | ContactsColumnsModal.tsx:79-80 | título `text-[15px] font-semibold`; subtítulo `text-xs text-surface-500` "Escolha e reordene…" | `font-bold tracking-[-0.01em]`; subtítulo `text-[12.5px] text-surface-400 mt-0.5` "Ordem e visibilidade valem só para você." |
| CONT-COLS-04 | ❌ | Modal.tsx:118-124 | `w-7 h-7 rounded-lg` | `rounded-sm` (28 ✓, ícone 16 ✓) |
| CONT-COLS-05 | ❌ | ContactsColumnsModal.tsx:95-127 | `divide-surface-800`, `h-9 px-5 gap-3` | lista `px-[18px] py-1.5`; linha `h-9 gap-2.5 border-b border-surface-700` (última sem), `text-[13px]` |
| CONT-COLS-06 | ❌ | ContactsColumnsModal.tsx:118 | `GripVertical` 16px `text-surface-700` | `text-surface-500` 14px (glifo "⋮⋮" ou ícone) |
| CONT-COLS-07 | ❌ | ContactsColumnsModal.tsx:119 | `text-sm text-surface-200` | `text-[13px] font-medium text-surface-100` |
| CONT-COLS-08 | ❌ | ContactsColumnsModal.tsx:97-101 | linha fixa ✓, "fixa" `text-surface-600` | `text-surface-500` |
| CONT-COLS-09 | ❌ | Switch.tsx:22-31 | 32×18 ✓ thumb 14 ✓ `bg-brand-500` ✓; thumb `shadow-lg`; `border-2 border-transparent` | remover `shadow-lg`; posição thumb top 2/left 16 (sem borda fantasma) |
| CONT-COLS-10 | ❌ | Switch.tsx:25 | desligado `bg-surface-700` | `bg-[var(--bd2)]` |
| CONT-COLS-11 | ❌ | ContactsColumnsModal.tsx:122-124; ComingSoonBadge.tsx:4 | badge "Módulo inativo" **substitui** o Switch; 18px `border-surface-600 text-surface-300 text-[10px]` | badge "MULTI-FUNIL" **após o nome** (`ml-1` 16px `border-dashed border-[var(--bd2)] text-surface-500 text-[9.5px]`) e Switch continua (off); condicional `useMultiPipeline()` |
| CONT-COLS-12 | ❌ | useContactColumnsConfig.ts:16-28, 40 | ordem padrão Telefone·E-mail·Situação·Score·Intenção·Sentimento·Etiquetas·Funis·Fonte·Último contato·Opt-in; E-mail oculto | ordem padrão Telefone·Situação·Etiquetas·Funis·E-mail·Último contato (+ Negócios); Funis e E-mail off por padrão; colunas extras → *fora da referência* |
| CONT-COLS-13 | ❌ | ContactsColumnsModal.tsx:85-93; Modal.tsx:145 | footer `px-5 py-4`; Cancelar `ghost sm`; Salvar `primary sm` (28px) | `px-[18px] pt-3 pb-4 border-surface-700`; "Restaurar padrão" ghost 12/600 `--tx2` ✓≈; Cancelar `neutral md`; Salvar `primary md` (36px, 13/600) |
| CONT-COLS-14 | ❌ | Modal.tsx:97 | `bg-black/60 backdrop-blur-[2px]` | `bg-[var(--color-scrim-soft)]` sem blur (README) |
| CONT-COLS-15 | ❌ | Switch.tsx | ligado ✓ (`brand-500` = #14B8A6/#2DD4BF); desligado surface-700 | desligado `--bd2` (#C8CDD8/#2E4040) |
| CONT-SHELL-01 | ✅ | — | spec 7a/6b | — |

## Resumo por status

- ✅ 11 (HDR-11, TABLE-22, DRAWER-06/09/11/12/23/32, COLS-—, SHELL-01, HDR-10 parcial)
- ❌ 78 (inclui os ❌/[!] e ❌/❓ mistos)
- ❓ 4 embutidos (HDR-10 fonte, FILTERS-05 `stage`/funil, FOOTER-03 setas, DRAWER-02 `useLayer`)
- [!] 6 (HDR-03 "novos esta semana", FILTERS-05/07 Responsável/Meus, TABLE-17/18, DRAWER-18 Responsável, DRAWER-02 URL)

## ❌ por arquivo, em ordem de impacto

1. **`ui/DataTable.tsx`** (orquestrador): hairlines `surface-700`; th sem uppercase, 11/600 `--tx2`, coluna ordenada em `--tx`; ativo = `--rowhover` + inset (não tinta teal); checkbox custom 14×14; `dense` = 36px; `tabular-nums` global. — TABLE-03/04/06/07/08/09/10/23
2. **`pages/ContactsPage.tsx`**: tirar o card em volta da tabela; drawer `bg-surface-800` + scrim token; passar `activeKey`; botões do header via `Button` (neutral/primary sm); badge de contagem vira subtítulo. — TABLE-01/08, DRAWER-01/02/31, HDR-04/05/06
3. **`contacts/DealsTab.tsx` + `deals/DealSummary.tsx`**: cards → tabela bordeada 4 colunas + linha-resumo com soma + "ATIVIDADE RECENTE" compacta. — DRAWER-24..30 (maior mudança de composição; todos os dados existem)
4. **`contacts/ContactsFiltersBar.tsx`**: barra 44px em linha única; busca 240×28; chips 28px (ativo acento/inativo `--bd2`); "+ Filtro" e "Colunas" ghost; divisor; SegmentedControl. — FILTERS-01..09
5. **`contacts/ContactsTable.tsx` + `hooks/useContactColumnsConfig.ts`**: conjunto/ordem/larguras das colunas; coluna Negócios; alinhamento à direita; telefone formatado; avatar 22px; chips de etiqueta `rounded-xs` 10.5/600. — TABLE-02/05/11/12/14/15/16/19/20/21, COLS-12
6. **`contacts/ContactDetailHeader.tsx`**: avatar 40; nome 700 tracking; linha 2 em 12px formatada; kebab no lugar de "Perfil completo"+lixeira; link "Abrir ficha completa" na faixa de abas; padding 14/18. — DRAWER-03/04/05/07/08/13
7. **`contacts/tabs/{TagsCard,ContactInfoCard,CustomFieldsCard}.tsx` + `ContactIdentityPanel.tsx`**: seções planas (sem acordeão), eyebrow 10/700 .14em `--tx3`, grid 88px/1fr 12.5px, "Editar" `--acs`, chips 20px `rounded-xs` + "+" tracejado, Origem/Cidade·UF/Criado em, boolean com check verde. — DRAWER-14..21
8. **`contacts/ContactsColumnsModal.tsx` + `ui/Modal.tsx` + `ui/Switch.tsx` + `ui/ComingSoonBadge.tsx`**: modal `--sf`, scrim sem blur, paddings 18, título 700, linhas 13/500, badge MULTI-FUNIL ao lado do nome com Switch, botões md, Switch off `--bd2` sem sombra. — COLS-01..15
9. **`layout/TopBar.tsx`** (orquestrador): fundo `--sf` + hairline `--bd`; subtítulo dinâmico 12px; busca 200×28 em `--sf2` com kbd mono bordeado; sino 28; divisor 18px; gap 8. — HDR-01/02/03/07/08/09
10. **`ui/Tabs.tsx`/`ContactDetailTabs.tsx`**: só `pt-3.5 px-[18px]` e `pb-[9px]` — DRAWER-10
11. **Rodapé da tabela** (novo, `ContactsTable.tsx`): 40px com seleção inline e "1–N de total"; aposenta `BulkActionBar` flutuante. — FOOTER-01..04
12. **`contacts/StageBadge.tsx`**: sem `Milestone`, 11/600 `--tx`, `px-[7px]`. — TABLE-13 (afeta Conversas/Funis também — coordenar)

## Fora da referência (decisão do usuário — NÃO decidido aqui)

Existem no app, com dado real, e o mockup 1c não os mostra. Opções: (a) manter como coluna/controle **opcional** (off por padrão, ligável em "Configurar colunas"/"+ Filtro"); (b) esconder por padrão; (c) manter como está.

- **Colunas** da tabela: Score (`leadScore`), Intenção, Sentimento, Funis (chips `DealsSummaryChips`), Fonte, Opt-in, E-mail. A referência tem Telefone·Situação·Etiquetas·Responsável·Último contato·Negócios.
- **Filtros**: Fonte (select), menu "Filtros" (Intenção, Sentimento, Lead score, Atividade, Opt-in, Ordenar por) e os chips removíveis da 2ª linha. A referência tem Situação·Etiqueta·Responsável·Funil·+Filtro.
- **Faceta comercial** `Todos / Sem negócio / Com negócio aberto / Cliente` (ContactsPage.tsx:337-356, só com `multiPipeline`).
- **`ContactsStatsBar`** (linha-resumo colapsável "5.190 contatos · 7 opt-in · 15 c/ etiquetas · predominante Lead" + cards Total/Situação predominante + Insights da IA). A referência resume tudo no subtítulo da TopBar.
- **Badge "5.190"** e botão **"Configurar"** (abre `CRMConfigDrawer`) no slot de ações da TopBar; botão **Copilot** (gate admin) e `TopBarReadinessIndicator`.
- **Header do drawer**: ícone copiar telefone; linha "cargo · empresa"; botão "Perfil completo" (vira link "Abrir ficha completa ↗" em DRAWER-13 — isso é reestilo, não decisão); lixeira solta (vai pro kebab, DRAWER-08).
- **Aba Visão geral** (`OverviewTab`: AIContextCard, AttributionCard, ContactInsightsCard, EngagementCard, DealsSummaryCard, QualificationCard) — o canvas não renderiza essa aba (DRAWER-32); mantida como está.
- **Aba Histórico** (`HistoryTab` com filtro segmentado e chips de ícone) — não está na referência; a timeline compacta da referência vive na aba Negócios (DRAWER-29/30).
- **`DealSummary` card**: stepper de etapas, "Mover etapa ▾", "Abrir negócio", Editar/Excluir por card — precisam de nova casa (menu por linha) se DRAWER-25 for aplicado.
- **`ContactsHeader.tsx`** (título xl + toggle Tabela/Kanban + Configurar/Importar/Novo Contato): não é importado por `ContactsPage.tsx` — aparentemente órfão; confirmar uso antes de remover.
- **Mobile**: `ContactsMobileList`, `MobilePageHeader`, `Fab` — frame da referência é 1440px; sem spec mobile.

## Rodada 2 (2026-09-21) — drawer de contato

- **R2-1C-DRAWER-01** Header: Conversar / Novo negocio / ··· / X na linha do nome (antes ficavam abaixo); linha 2 volta a ser "telefone · e-mail · cliente desde mes/ano" (Fase C tinha cortado e-mail e cliente desde — dado existe). ❓ ao vivo.
- **R2-1C-DRAWER-02** DADOS na ordem do mock: Origem, Empresa, Cargo/Setor (quando ha), Cidade · UF, Criado em; e-mail sobe pro header. Responsavel continua [!] (Contact sem owner — confirmado por grep). ❓ ao vivo.
- **R2-1C-DRAWER-03** CAMPOS PERSONALIZADOS: leitura em grade rotulo | valor (88px/1fr), numero/telefone em mono, boolean com check verde. ❓ ao vivo.
- **R2-1C-PROFILE-01** (telas SEM mock, vocabulario da 1a) ContactProfilePage /contacts/:id: hairlines dos dois blocos `border-surface-800` (branca no claro = invisivel) → `surface-700`; header: titulo 16/700 -.01em (era 20/600), Conversar = primary, Novo negocio/Nota/Tarefa = neutral (era acento suave), chip da janela 24h em `color-chip-soft`, kebab 28px borda --bd2. Titulos dos drawers/modais de Contatos (Importar, Novo contato, Configurar CRM, Sugestoes IA) 15/700, cabecalho/rodape 18/14; `shadow-sm` removido dos pills ativos de segmentado (separacao no claro = borda, nunca sombra) em Contatos/Funis/Importacao/Configurar CRM. ❓ ao vivo (sem PNG).
- **R2-1C-FILT-01** (CONT-FILTERS-05, era ❓) Chip `Situação ▾` (multi-seleção com as etapas do CRM, "Situação · Qualificado" / "Situação · N") na barra de filtros: `ContactFilters.stage` ja existia no tipo e o backend filtra `stage IN (...)` (split por virgula) — faltava o controle. `contactsApi.list` agora manda `stage`/`tagId` como lista separada por virgula (axios mandava `stage[]=a`, que o controller recebe como array). Faceta "Situação comercial" (so multi-funil) no mesmo vocabulario: 28px raio sm, ativo acento suave, borda --bd2 (era pill `rounded-full` com `border-surface-800` = invisivel no claro). "Configurar colunas" e BulkActionBar/rodape conferidos contra o PNG: ja no mock (Fase C). Importar contatos: so cabecalho/titulo nesta rodada; corpo do fluxo nao reauditado. ❓ ao vivo.
- **R2-1C-FILT-02** (medido ao vivo pelo orquestrador) Area de filtros em UMA linha, como o mock (busca · Situacao · Etiquetas · + Filtro · Colunas): (1) a faixa de resumo de 36px saiu — vira botao ghost `Resumo` na barra (abre o mesmo painel com totais/estagio/insights da IA; estado lembrado em localStorage) e o texto "N contatos · opt-in · c/ etiquetas · predominante" fica no tooltip do botao e do subtitulo da TopBar (`lib/contactsSummary.ts`); (2) a faceta "Situacao comercial" (Todos/Sem negocio/…, so multi-funil) foi para o menu `+ Filtro` (grupo proprio) e, quando ativa, aparece como chip removivel; (3) o select nativo `Fonte` foi para o menu `+ Filtro` (grupo "Origem") e tambem vira chip removivel quando ativo. ❓ ao vivo.
- **R2-1C-PIX-01** (extração numérica do canvas 1c): chips da barra de filtros `padding 0 9px`, gap 5 (eram pl-12/pr-10); "Etiquetas" → "Etiqueta"; "+ Filtro"/"Colunas" 9px. Drawer conferido (260px | 1fr, padding 14/18, gap 14, DADOS 88px/1fr gap 6/8, abas gap 18, header 14/18, avatar 40, botoes 28): já bate. Tabela/rodape/modal de colunas: bate com a Fase C. [!] permanecem: Responsável, Funil, segmentado Todos/Meus (sem dono de contato).
