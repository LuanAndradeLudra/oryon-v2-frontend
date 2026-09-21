# Mapa de gaps — Shell (`7a`/`6b`) · Fase B

Spec: `spec/shell.md` (30 itens). Código: `src/components/layout/{AppShell,NavSidebar,TopBar,AiCreditsIndicator}.tsx`,
`src/components/ui/{sidebar,Avatar}.tsx`, `src/index.css` (`.nav-sidebar`, `.workspace-shell`, `.overlay-surface`).
Estático (leitura), zero edição. Não lidos nesta passada (primitivos): `ui/Dropdown.tsx` (`DropdownItem`/`DropdownSeparator`),
`ui/SegmentedControl.tsx` — itens que dependem deles estão ❓ com o valor esperado anotado.
Tokens canvas→projeto: `--bg`=surface-950 · `--sf`=surface-800 · `--sf2`=surface-900/`var(--sf2)` ·
`--bd`=surface-700 · `--bd2`=`var(--bd2)` · `--tx`=surface-100 · `--tx2`=surface-400 · `--tx3`=surface-500 ·
`--ac`=brand-500 · `--acs`=accent-dark · `--acsoft`=accent-soft · `--rowhover`=`var(--rowhover)` ·
`--ov`/`--ovbd`/`--ovsh` = `.overlay-surface`. Dentro de `.nav-sidebar` (`index.css:1084`) a escala surface é
remapeada pro escuro nos 2 temas — a sidebar é sempre escura, como a spec pede.
Legenda: ✅ bate · ❌ difere · ❓ só ao vivo / decisão do orquestrador · [!] depende de dado.

## Tabela

| ID | Status | arquivo:linha | o que o código faz hoje | menor mudança |
|---|---|---|---|---|
| SHELL-SIDEBAR-01 | ❌ | ui/sidebar.tsx:80-84 · AppShell.tsx:24 · index.css:1386 | largura 62/228 ✓; sidebar `bg-transparent` sobre `.workspace-shell` = gradiente radial `#000→#050808` (spec fundo chapado `--sb` `#0E1414`); `py-4` (16; spec 10 em cima/12 embaixo); sem raio ✓ (colada) | `.workspace-shell { background:#0E1414 }` (ou `bg-[#0E1414]` na sidebar); `pt-2.5 pb-3` |
| SHELL-SIDEBAR-02 | ❌ ❓ | NavSidebar.tsx:46-76 | logo = `oryon-logo.svg` 36px + wordmark PNG 27px (spec: tile 26px raio 6 com gradiente `#5EEAD4→#14B8A6→#0F766E` e letra "O" 14/800 `#04201D`, `mb 12`) | ❓ decisão: o mock usa um tile-placeholder; o app usa o logo real da marca. Se seguir o mock à risca: tile 26px; senão, só ajustar tamanho (36→26) e `mb-3` |
| SHELL-SIDEBAR-03 | ❌ | ui/sidebar.tsx:152-157,160 · NavSidebar.tsx:132-175 | ativo `px-2 py-1 rounded-lg bg-white/85 text-black` (spec 36×32, raio 6, `.88`, ícone `#0A0F0F`); inativo `text-white` (spec herda `--sbtx` `#8FA5A5`) `rounded-xl hover:bg-white/10`; ícones 16.5px (spec 18, stroke 1.9); `gap-0.5` (2px; spec 4) | inativo `text-[#8FA5A5]` (= `text-surface-400` dentro de `.nav-sidebar`); `rounded-[6px]` nos 2 estados; `bg-white/[.88]`; ícone `w-[18px] h-[18px]`; `gap-1`; ativo stroke 2 ❓ |
| SHELL-SIDEBAR-04 | ❌ | AiCreditsIndicator.tsx:142 | divisor `mx-3 border-t border-surface-800/60` (largura total menos 24, cor `#161E1E` a 60%) — spec hairline `20px × 1px` `#243333` centrada | colapsada: `w-5 h-px bg-[#243333] mx-auto` |
| SHELL-SIDEBAR-05 | ❌ | ui/sidebar.tsx:84 | 228px ✓; padding `py-4` sem `px` (itens têm `px-1.5` no `<nav>`, spec container `10px 10px 12px`) | `pt-2.5 pb-3 px-2.5` no container e tirar o `px-1.5` dos `<nav>` |
| SHELL-SIDEBAR-06 | ❌ [!] | NavSidebar.tsx:49-73 | header `flex gap-3 px-3 mb-2` (spec `h-9 px-1.5 mb-2 gap-[9px]`); sem nome do workspace à direita ("Acme" 10.5/600 `#6B8080`); wordmark imagem no lugar de "Oryon" 14/700 `#ECF1F1` | `h-9 gap-[9px] px-1.5`; wordmark: ver SIDEBAR-02 ❓; [!] nome do workspace: confirmar campo (tenant/organization name) em `useAuth().user` — se existir, `ml-auto text-[10.5px] font-semibold text-surface-500` |
| SHELL-SIDEBAR-07 | ❌ ❓ [!] | ui/sidebar.tsx:152-193 · NavSidebar.tsx:131-176 | item inativo `px-3 py-2 rounded-xl text-white` ≈ 36px (spec 32, `px-2.5`, raio 6, gap 10, texto `#8FA5A5`); label `text-sm` (14; spec 13) `font-medium` nos 2 estados (spec ativo 600); ativo `bg-white/85 text-black` ✓≈; **badge de contagem renderiza só um DOT vermelho** `w-2 h-2 bg-danger` no canto do ícone (`:162-172`, decisão anterior comentada) — spec pílula `ml-auto` 18px, `px-1.5`, 10.5/700 com o número; lista real: Geral (Home, Relatórios, Conversas, Contatos, Funis) · Nexus · Ferramentas (Disparos, Agendamentos, Marketing, Automações, Agentes IA, Copilot) vs mock (Dashboard, Conversas, Contatos, Funis · AUTOMAÇÃO: Agentes IA, Disparos, Agendamentos) | `h-8 px-2.5 gap-2.5 rounded-[6px] text-[13px]`, inativo `text-surface-400`, ativo `font-semibold`; badge: pílula com `whatsappUnread` (dado existe) — cor ❓ decisão do orquestrador (7a `#0F766E`/`#fff` × 1b `#2DD4BF`/`#04201D`; a spec sugere o par escuro por a sidebar ser sempre escura); [!] conjunto/ordem/rótulo de grupo dos itens = produto real (rotas a mais), não pontuar |
| SHELL-SIDEBAR-08 | ❌ | ui/sidebar.tsx:105-115 | `px-3 pt-5 pb-1 text-[10px] font-bold uppercase tracking-widest text-surface-600` — `tracking-widest` = `.1em` (spec `.14em`); `surface-600` dentro de `.nav-sidebar` resolve pro degrau escuro (spec `#6B8080` = `surface-500` escuro); padding 20/4/12 (spec 14/6/10); rótulos "Geral"/"Ferramentas" (mock "AUTOMAÇÃO" — ver SIDEBAR-07 [!]) | `px-2.5 pt-3.5 pb-1.5 tracking-[.14em] text-surface-500` |
| SHELL-SIDEBAR-09 | ❌ ❓ | AiCreditsIndicator.tsx:138-142 | rodapé `mt-1` + divisor `mx-3 border-surface-800/60` (spec `border-top:1px #243333` largura total, `padding-top:8px`) | `border-t border-[#243333] pt-2` no wrapper; ❓ cor de presença tokenizada (`bg-online`) × hex literal do mock — decisão global do orquestrador (vale pra TopBar/Dashboard também) |
| SHELL-TOPBAR-01 | ❌ | TopBar.tsx:1621 | `conv-surface h-12 bg-surface-950 border-b border-surface-800/60 px-4 gap-3` — 48px ✓, `px-4` ✓, `gap-3` ✓; fundo `--bg` (spec `--sf` = surface-800); borda `surface-800/60` (spec `--bd` sólida) | `bg-surface-800 border-b border-surface-700`; conferir o que `conv-surface` sobrescreve ❓ |
| SHELL-TOPBAR-02 | ❌ | TopBar.tsx:1627-1638 · TopBarReadinessIndicator.tsx | título `text-sm font-display font-bold text-surface-50` ✓ (falta `tracking-[-0.01em]`); subtítulo `text-sm` (14; spec 12) `surface-500` (spec `--tx2`=surface-400) com "·" extra; readiness só negativo e à direita (ver `1b-dashboard.GAPS.md` DASH-HEADER-02) | subtítulo `text-xs text-surface-400`, sem bullet; título `tracking-[-0.01em]`; readiness positivo à esquerda |
| SHELL-TOPBAR-03 | ✅ | TopBar.tsx:1652-1657 (`pageActions` via `TopBarActionsContext`) | slot existe, primeiro do cluster direito ✓; divisor `w-px h-5` após o slot (não está no mock) | opcional: remover o divisor |
| SHELL-TOPBAR-04 | ❌ ❓ | TopBar.tsx:1664-1676 | pílula `h-8 px-3 rounded-lg border-surface-700/60 bg-surface-800 text-xs text-surface-400 w-[160px]`; ícone 14px ✓; kbd `px-1.5 py-0.5 rounded bg-surface-700 text-3xs font-medium` (spec mono 10.5, `border:1px --bd2`, raio 4, `padding:0 4px`, sem fundo) | `h-7 px-2.5 rounded-[7px] border-surface-700 bg-[var(--sf2)] text-surface-500`; kbd `font-mono text-[10.5px] border border-[var(--bd2)] rounded px-1 bg-transparent`; largura ❓ decisão (7a 200 × 1b 220) — hoje 160, abaixo das duas |
| SHELL-TOPBAR-05 | ❌ ❓ | TopBar.tsx:1703-1715 | botão `w-8 h-8 rounded-lg` (spec 28, raio 7); badge sempre "contagem": `w-4 h-4` (16; spec `min-w 14 h 14 px 3`) `-top-0.5 -right-0.5` (spec `top:2 right:0`) `bg-brand-cta` (spec `--ac`) texto `surface-950` (spec `--btntx`) 9px/700 ✓; sem variante "dot"; painel próprio `NotificationsPanel` ✓ (sem mockup — [!] da spec) | `w-7 h-7 rounded-[7px]`; badge `min-w-[14px] h-[14px] px-[3px] top-0.5 right-0 bg-brand-500 text-[var(--color-btn-primary-fg)]`; dot × 9+ = ❓ decisão |
| SHELL-TOPBAR-06 | ❌ | TopBar.tsx:1359-1375,1400-1410 · index.css `.avatar-operador` | 28px `rounded-[30%]` ✓, sem anel fechado ✓; iniciais `text-[11px] font-semibold` sobre `avatar-operador` (gradiente teal) — spec `--avs/--avi` mono, 10.5/700; wrapper extra `w-8 h-8 rounded-lg hover:bg-surface-800` | `text-[10.5px] font-bold`; fundo mono `bg-avatar-surface text-avatar-initials` — **primitivo** (`.avatar-operador`/`Avatar kind="operator"` decide o gradiente; reportar ao orquestrador, spec 1a AVATAR-*) |
| SHELL-TOPBAR-07 | ❌ | TopBar.tsx:1364 | anel `0 0 0 2px var(--color-surface-950), 0 0 0 4px var(--color-accent)` — camada interna na cor do `--bg` (spec `--sf`); como a TopBar hoje é `bg-surface-950`, casa com o fundo atual, mas erra junto com TOPBAR-01 | `0 0 0 2px var(--color-surface-800), 0 0 0 4px var(--color-accent)` (junto com TOPBAR-01) |
| SHELL-USERMENU-01 | ❓ | TopBar.tsx:1394-1398 · ui/Dropdown.tsx (não lido) | `Dropdown align="right" className="w-60"` (240 ✓) | ❓ conferir no primitivo: `overlay-surface`, raio 8, `padding:4px`, `font-size:12.5px`, `top:54px` |
| SHELL-USERMENU-02 | ❌ | TopBar.tsx:1414-1422 | `px-3 py-3 gap-3 border-b border-surface-700` (spec `8px 8px 10px`, gap 10, `mb 4`); `Avatar size="sm"` 32px ✓ `rounded-[30%]` ✓ (gradiente — ver TOPBAR-06); nome `text-sm` (14; spec 13) `font-semibold` ✓; linha 2 `text-[11px] text-surface-500 truncate` ✓ formato "e-mail · papel" ✓ | `px-2 pt-2 pb-2.5 gap-2.5 mb-1`; nome `text-[13px]` |
| SHELL-USERMENU-03 | ❓ | TopBar.tsx:1424-1426 · ui/Dropdown.tsx | `DropdownItem icon={User}` "Meu perfil" | ❓ primitivo: `h-[30px] gap-[9px] px-2 rounded-[5px]`, ícone 14px `--tx3` |
| SHELL-USERMENU-04 | ❌ ❓ | TopBar.tsx:1428-1433 | `flex-1` + `kbd font-mono text-3xs text-surface-500` (spec 11px mono `--tx3`); hover `--rowhover` ❓ (primitivo); rota `/settings` ✓ | kbd `text-[11px]`; ❓ confirmar que `⌘,` está de fato ligado a um `keydown` (não vi handler em TopBar.tsx — se não existir, é ❌ funcional: atalho anunciado sem efeito) |
| SHELL-USERMENU-05 | ❌ ❓ | TopBar.tsx:1438-1447 · ui/SegmentedControl.tsx (não lido) | linha `px-3 py-2.5 justify-between` ✓; rótulo `text-sm` (spec 12.5); `SegmentedControl size="sm"` (spec segmentos `h-5 px-1.5` 10.5/600, raio 5, ativo `--sf2`/`--tx`, borda `--bd`) ❓; não fecha o menu ✓ | rótulo `text-[12.5px]`; ❓ conferir `size="sm"` do primitivo |
| SHELL-USERMENU-06 | ❓ | TopBar.tsx:1449,1471 · ui/Dropdown.tsx | `DropdownSeparator` 2× nas posições certas ✓ | ❓ primitivo: `h-px bg-surface-700 my-1` |
| SHELL-USERMENU-07 | ❌ [!] | TopBar.tsx:1454-1469 | tile `w-5 h-5 rounded-[6px]` (spec 14px raio 4) gradiente 2 paradas `accent→accent-dark` (spec 3: `#5EEAD4,#14B8A6,#0F766E`); nome fixo "Meu workspace" `text-sm` (spec nome real 12.5); "Trocar ›" `text-2xs text-surface-600` desabilitado (spec 11px `--tx3`) | `w-3.5 h-3.5 rounded` + gradiente 3 paradas; "Trocar ›" `text-[11px] text-surface-500`; [!] nome do workspace (mesmo dado de SIDEBAR-06); [!] troca não existe — desabilitado com tooltip é o comportamento certo ✓ |
| SHELL-USERMENU-08 | ❓ | TopBar.tsx:1473-1475 · ui/Dropdown.tsx | `DropdownItem danger` "Sair" | ❓ primitivo: linha inteira `text-danger`, ícone herda |
| SHELL-USERMENU-09 | ✅ ❓ | TopBar.tsx:1364,1386-1387,1435-1447,1702-1722 · NavSidebar.tsx:318-325 | anel só com menu aberto ✓; itens fecham (`go`→`close`) ✓; Tema não fecha ✓; sino com painel próprio ✓; `/settings` continua rota ✓; sidebar = nav + créditos ✓ | ❓ atalho `⌘,` (ver USERMENU-04) e atalhos J/K/E do painel de notificações não conferidos (NotificationsPanel não lido) |
| SHELL-CREDITS-01 | ❌ | AiCreditsIndicator.tsx:144-164 · 58-78 | anel 24px, r9, stroke 2.5, trilha `#243333`, progresso `#2DD4BF`, dasharray 56.5, rotate ✓✓; botão 36px ✓ mas `rounded-xl` (spec 6) e fundo `rgba(255,255,255,.06)` **só no hover** (spec em repouso) | `rounded-[6px] bg-white/[0.06]` |
| SHELL-CREDITS-02 | ❌ | AiCreditsIndicator.tsx:150-185 | `h-10 px-2 gap-2.5` ✓; anel 22 ✓; linha 1 `text-xs font-semibold text-white` ✓; linha 2 `text-[10.5px] text-surface-500` ✓ formato "64 / 1.000 · renova em 15 d" ✓; `rounded-xl` (spec 6) e fundo só no hover | `rounded-[6px] bg-white/[0.06]` |
| SHELL-CREDITS-03 | ❌ | AiCreditsIndicator.tsx:188-267 | popover 300px `overlay-surface rounded-lg` ✓; header `p-3.5 gap-3` ✓, anel 36 ✓ mas trilha `#243333` fixa (spec `var(--bd)` no popover — tokenizado); título `text-sm font-semibold` (spec 13/700); subtítulo `text-2xs surface-500` (spec `--tx2`); `%` 16/800 ✓ sem o rótulo "usado" (11 `--tx3`); detalhe em **3 colunas centradas** (spec grid `1fr auto` rótulo→valor: Usados / Disponíveis / Ritmo "≈ 4,2/dia · sobra" em `--ok`); rodapé `Button neutral sm` + `ghost sm text-accent-dark` ✓ (28px vs 26 ≈) | `CreditRing` com prop de cor da trilha (`var(--color-surface-700)` no popover); título `font-bold text-[13px]`; "usado" `text-[11px] text-surface-500`; grid `grid-cols-[1fr_auto] gap-x-3 gap-y-1` com rótulo à esquerda; "· sobra" `text-status-active` |
| SHELL-CREDITS-04 | ❌ [!] | AiCreditsIndicator.tsx:39-45,178-182,214-234 | 3 faixas e thresholds ✓ exatos; cores `#2DD4BF/#FBBF24/#EF4444` ✓; mas na sidebar a linha 2 fica **sempre** `surface-500` com "renova em N d" — spec ≥70% troca o texto ("acaba antes do ciclo" / "agentes pausam em N") na cor da faixa, e ≥90% ganha chip "Comprar" inline 10.5/700 `#2DD4BF`; o código mostra essas mensagens só dentro do popover (banner) | mover as mensagens pra linha 2 com `style={{color}}` por faixa + chip "Comprar" `ml-auto` quando ≥90%; [!] "N" da projeção: hoje usa `days` até renovar, não projeção de consumo (o próprio arquivo diz que não há data de início do ciclo) |
| SHELL-CREDITS-05 | ✅ | NavSidebar.tsx:318-325 · TopBar.tsx:1341-1347 | Configurações e avatar migraram pra TopBar; rodapé só créditos | — |

## Resumo por status

- ✅ 3 (TOPBAR-03, USERMENU-09 parcial, CREDITS-05) · ❌ 20 · ❓ 7 (USERMENU-01/03/06/08 dependem de
  `Dropdown.tsx`; USERMENU-05 de `SegmentedControl.tsx`; SIDEBAR-02 e a largura da busca são decisões) ·
  [!] 4 (nome do workspace ×2, troca de workspace, projeção de créditos).
- Decisões pro orquestrador (a spec não resolve): (a) cor do badge "Conversas 12" — `#0F766E/#fff` (7a) ×
  `#2DD4BF/#04201D` (1b); o código hoje nem mostra número, só um dot vermelho. (b) largura da busca 200 × 220
  (hoje 160). (c) sino: dot × "9+" (hoje só "9+"). (d) logo: tile-gradiente do mock × logo real. (e) cor de
  presença/status: hex literal (mock) × token (`bg-online`/`brand-cta`).

## ❌ por arquivo, em ordem de impacto

1. **`TopBar.tsx:1621`** — TopBar em `bg-surface-950` com borda `surface-800/60`: no claro fica `#FAFAFC` sem
   linha visível; spec é superfície branca `--sf` com hairline `--bd`. Junto: anel do avatar (1364) usa
   `surface-950` como camada interna. — TOPBAR-01/07.
2. **`ui/sidebar.tsx:152-193` + `NavSidebar.tsx`** — item inativo branco (spec `#8FA5A5`), 36px/raio 10
   (spec 32/raio 6), label 14px (spec 13), ativo sem peso 600; **badge vira dot vermelho em vez da pílula
   com o número** (dado `whatsappUnread` existe). — SIDEBAR-03/07.
3. **`AppShell.tsx:24` / `index.css:1386`** — fundo da sidebar é gradiente radial preto; spec `#0E1414` chapado. — SIDEBAR-01.
4. **`TopBar.tsx:1664-1676`** — busca 32px/raio 8/fundo `--sf`/kbd com fundo (spec 28/7/`--sf2`/kbd com
   borda `--bd2` sem fundo), 160px. — TOPBAR-04.
5. **`AiCreditsIndicator.tsx`** — bloco sem fundo em repouso e raio 10 (spec `.06` + raio 6); linha 2 não
   muda de cor/texto por faixa nem tem chip "Comprar"; popover com grid 3 colunas centradas (spec
   rótulo→valor), trilha do anel fixa (spec tokenizada no popover), sem "usado". — CREDITS-01..04.
6. **`ui/sidebar.tsx:105-115`** — eyebrow `.1em`/cor escura demais/padding (spec `.14em`, `#6B8080`, 14/6/10). — SIDEBAR-08.
7. **`TopBar.tsx:1414-1469`** — header do menu (paddings/13px), tile do workspace 20px→14px com gradiente
   3 paradas, "Trocar ›" 11px `--tx3`, kbd 11px. — USERMENU-02/04/07.
8. **`TopBar.tsx:1627-1638`** — subtítulo 14→12px `--tx2`, sem bullet; readiness positivo à esquerda. — TOPBAR-02.
9. **`TopBar.tsx:1703-1715`** — sino 28px/raio 7, badge 14px `--ac`/`--btntx`. — TOPBAR-05.
10. **Primitivo `Avatar`/`.avatar-operador`** — operador com gradiente teal; spec mono `--avs/--avi`
    (10.5/700). Afeta TopBar, menu, TeamMiniCard. **Só o orquestrador** (spec 1a). — TOPBAR-06.

## Fora dos 30 itens — registrar, não pontuar

- `NavSidebar.tsx:209-221` pin da sidebar, `nudge` "Novo/Configurar/Setup" (`sidebar.tsx:174-192`),
  seção "Oryon" (staff), item "Nexus", "Copilot AI", botão Copilot na TopBar (`:1690-1699`), busca como
  command-palette em overlay (`:1736-1807`), `TopBarReadinessIndicator` negativo — produto real, sem item.
- `sidebar.tsx:119` divisor de seção na colapsada (`h-px bg-surface-700/60`) — o mock colapsado não tem
  eyebrow nem divisor entre grupos (só 4 ícones + rodapé).

## Rodada 2 — 6b consumo na sidebar (canvas via tools-extract-canvas.py 6b) — desvios para o orquestrador (`layout/` não é meu)

`AiCreditsIndicator.tsx` (popover de 300px) × canvas:
| # | Canvas | Código hoje |
|---|---|---|
| 1 | popover em coluna única `padding 14`, `gap 10`, 12.5px; SEM anel no cabeçalho | cabeçalho com `CreditRing` 36px + seções separadas por `border-b` (`p-3.5`, `p-2.5`) |
| 2 | título "Créditos de IA · Start" 13/700; subtítulo "Renova em 15 dias · 01 out" `--tx2` (com a data) | `text-sm`/600 e subtítulo `text-2xs` tx3 só com "Renova em N dias" (sem a data) |
| 3 | direita: "6%" 16/800 -.02em lh 1.1 + "usado" 11px tx3 embaixo | só o % colorido, sem "usado" |
| 4 | corpo: grade `1fr auto` gap 4/12 com `padding-top 8` + `border-top`: Usados / Disponíveis / Ritmo ("≈ 4,2/dia" com 1 casa + "· sobra" verde) — rótulo tx2, valor 600 | 3 colunas centradas (`grid-cols-3`), valor 12px sobre rótulo `text-3xs`; "Ritmo/dia" inteiro |
| 5 | rodapé: botões `h26 px9 raio 6 11.5/600` alinhados à esquerda (Ver faturamento `--bd2`; Comprar créditos cor `--acs`), `border-top pt 8`, gap 6 | 2 `Button sm` `flex-1` (h28) |
| 6 | avisos de teto são estados da FAIXA da sidebar (780/1000 âmbar "acaba antes", 950/1000 vermelho "agentes pausam" + Comprar `#2DD4BF` 10.5/700) | tira de aviso DENTRO do popover (`bg-warning/10`/`bg-danger/10`) |

7a shell: amostra conferida (logo 26px/gap 9/h36, menu do avatar `w-60`=240, TopBar `h-12`) sem desvio; passe numérico completo do 7a fica para a medição ao vivo (sem sessão no portal).
