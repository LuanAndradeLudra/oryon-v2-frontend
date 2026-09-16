# Mapa de gaps — Dashboard (`1b`) · Fase B

Spec: `spec/1b-dashboard.md` (29 itens). Código: `src/pages/DashboardPage.tsx`,
`src/components/dashboard/{KpiGrid,VolumeChart,SalesFunnelCard,TeamMiniCard,LiveNowCard}.tsx`,
`src/components/layout/{TopBar,TopBarReadinessIndicator}.tsx`. Estático (leitura), zero edição.
Tokens canvas→projeto: `--bg`=surface-950 · `--sf`=surface-800 · `--sf2`=surface-900/`var(--sf2)` ·
`--bd`=surface-700 · `--bd2`=`var(--bd2)` · `--tx`=surface-100 · `--tx2`=surface-400 · `--tx3`=surface-500 ·
`--ac`=brand-500 · `--acs`=accent-dark · `--acsoft`=accent-soft · `--rowhover`=`var(--rowhover)`.
Raio xs6/sm7/md-lg8/xl10. Legenda: ✅ bate · ❌ difere · ❓ só ao vivo/decisão · [!] dado/decisão de produto.

**Achado transversal (afeta 5 cards):** todos os cards do Dashboard usam
`bg-surface-900 border border-surface-800 rounded-xl` (+ `card-glow` em 2). Na escala do projeto
isso é superfície-2 + borda um degrau escura demais + raio 10 + sombra/glow no hover (e sombra em
repouso no claro, `index.css:1366`). A spec (`CARD-01`, `DASH-*-01`) pede `--sf` (surface-800),
`--bd` (surface-700), raio 8, **sem sombra**. Menor mudança: `bg-surface-800 border border-surface-700 rounded-lg`
e retirar `card-glow` — ou usar o primitivo `Card`, que já tem exatamente isso.

## Tabela

| ID | Status | arquivo:linha | o que o código faz hoje | menor mudança |
|---|---|---|---|---|
| DASH-HEADER-01 | ❌ | TopBar.tsx:52,72,1627-1638 · DashboardPage.tsx:244-246 | título `Relatórios` 14px/700 `font-display` (spec "Dashboard", sem `letter-spacing:-.01em`); subtítulo fixo "Relatórios e análises" `text-sm` (14px) `surface-500` com "·"; o metadado de atualização ("Atualizado às HH:mm", 11px) vive dentro do header do KpiGrid, não na TopBar; `lastUpdated` é relógio real ✓ | subtítulo do `/dashboard` = data + "atualizado há Ns" (relativo, `lastUpdated` já existe) em 12px `surface-400`, publicado via `useTopBarActions`/subtítulo dinâmico; título 14/700 + `tracking-[-0.01em]`; copy "Dashboard"×"Relatórios" = ❓ decisão (nav e título usam "Relatórios") |
| DASH-HEADER-02 | ❌ [!] | TopBarReadinessIndicator.tsx:49-51,57-71 · TopBar.tsx:1649 | só renderiza BLOQUEIOS (pílula âmbar); estado positivo "WhatsApp conectado" não existe; fica no cluster direito | estado saudável: dot 6px `#22C55E` + "WhatsApp conectado" 11.5/600 `text-status-active`, à esquerda logo após o subtítulo; [!] confirmar que `useWorkspaceReadiness` expõe o check de WhatsApp como "ok" (hoje só lista os não-atendidos) |
| DASH-HEADER-03 | ❌ ❓ | DashboardPage.tsx:247 (`DateRangePicker` dentro do header do KpiGrid) | filtro de período não está no slot de ações da TopBar (`pageActions` existe em `TopBarActionsContext`, não é usado aqui) | mover `DateRangePicker` pro slot via `useTopBarActions`; estilo da pílula (28px, raio 7, borda `--bd2`, 12/600) ❓ — `DateRangePicker.tsx` não lido nesta passada |
| DASH-HEADER-04 | ❓ | TopBar.tsx:1710-1714 (sino) · 1362 (avatar) | sino sempre variante "contagem" 16px (`w-4 h-4`, `-top-0.5 -right-0.5`, `bg-brand-cta`, 9px); avatar 28px `rounded-[30%]` sem anel fechado ✓ | ver SHELL-TOPBAR-05/06 no `shell.GAPS.md`; qual variante do sino (dot × 9+) é decisão do orquestrador |
| DASH-KPI-01 | ❌ | KpiGrid.tsx:180-184 | `card-glow bg-surface-900 border-surface-800 rounded-xl grid sm:grid-cols-5 divide-x divide-surface-800`; célula `px-3.5 py-3` (14/12 ✓) | `bg-surface-800 border-surface-700 rounded-lg divide-surface-700`, sem `card-glow` |
| DASH-KPI-02 | ❌ | KpiGrid.tsx:147-165 | rótulo 11px/500 `surface-400` ✓; valor `text-[26px] font-extrabold tabular leading-none` (spec `letter-spacing:-.02em; line-height:1.15; margin-top:2px`); apoio 11.5px ✓, delta `text-online`/`text-danger` ✓, contexto `surface-600` (spec `--tx3`=surface-500); sem gradiente ✓; `gap-1` (4px) no lugar de mt 2/3px | valor `tracking-[-0.02em] leading-[1.15] mt-0.5`; contexto `text-surface-500`; `gap-0` + margens |
| DASH-KPI-03 | [!] | KpiGrid.tsx:155-165 · DashboardPage.tsx:177-180 | linha de apoio = só `±N%` (trend) — e `trend` é sempre `0` ("sem histórico"), então a linha fica vazia (`&nbsp;`) | "12 aguardando · 3 sem resposta > 15 min" precisa de dado (fila + sem resposta >15min); `queueCount` existe em `/home/stats`, "sem resposta >15min" não — [!] parcial |
| DASH-KPI-04 | [!] | idem | sem delta vs. ontem (trend=0) | precisa de histórico diário — backend |
| DASH-KPI-05 | ✅/[!] | KpiGrid.tsx:138-144 | semântica invertida coberta por `trendIsGood` (delta positivo = ruim → `text-danger`) ✓; "meta 0:45" não existe | [!] meta de TMR é config inexistente |
| DASH-KPI-06 | [!] | idem | "Resolvidas pela IA" 61% / "+4 pts · 782 conversas": `bot_resolved`/`bot_deflection` são sempre `0` em DashboardPage.tsx:164-165 | backend |
| DASH-KPI-07 | [!] | idem | "Negócios ganhos · mês" não está no catálogo de KPIs (`KPI_CATALOG`); primeiro span em `--tx` (sem cor) não é representável (código colore por trend) | dado existe em `pipelineAnalyticsApi` (won no mês) — [!] decisão: novo KpiId `deals_won_month` |
| DASH-CHART-01 | ❌ [!] | VolumeChart.tsx:36-38 | container `bg-surface-900 border-surface-800 rounded-xl p-4` (transversal); header `min-h-10` (40 ✓) `pb-2.5 mb-2.5 border-b surface-800`, título `text-sm` (14px; spec 13) `font-semibold` ✓; título "Volume de Mensagens" (dado diário Recebidas/Enviadas — [!] documentado no próprio arquivo) | container transversal; header sem padding do card (`-mx-4 px-3.5`) ou `p-0` + header `px-3.5`; título `text-[13px]`; borda `surface-700` |
| DASH-CHART-02 | ❌ | VolumeChart.tsx:39-48 | legenda `gap-4 text-xs surface-400`; quadrado `w-2 h-2 rounded-[2px]` ✓; cores `C.brand`/`C.online` (spec `--ac`/`--bd2`) | `gap-3.5 text-[11.5px]`; 2ª série em `var(--bd2)` (a série secundária é neutra no mock) |
| DASH-CHART-03 | ❌ [!] | VolumeChart.tsx (ausente) · DashboardPage.tsx:247 | não há SegmentedControl Hoje/7 dias/30 dias no header do gráfico; o período é global (`dateRange`) | `SegmentedControl` (ui/) `size="sm"` no header, `ml-auto`; [!] período por widget exige fetch separado — se não, ligar ao `dateRange` global (Hoje/7d/30d já são valores de `DateRange`) |
| DASH-CHART-04 | ❌ [!] | VolumeChart.tsx:50-62 | recharts empilhado, `min-h-[170px]` ✓, raio `[3,3,0,0]` (spec 2), camada de cima `fillOpacity .55` (spec `--bd2` sólido), sem barras "futuras" tracejadas, `CartesianGrid` + `YAxis` (spec não tem) | raio `[2,2,0,0]`, camada IA em `var(--bd2)` opaca, remover grid e YAxis; [!] split Humano/IA por hora e horas futuras = dado inexistente (documentado) |
| DASH-CHART-05 | ❌ [!] | VolumeChart.tsx:54 | eixo X com uma label por dia (dado diário), `fontSize 10.5` ✓, cor `C.axis` ❓ | 5 labels (00h/06h/12h/18h/23h) só faz sentido com dado por hora — [!]; cor `text-surface-500` |
| DASH-FUNNEL-01 | ❌ | SalesFunnelCard.tsx:80-92 | container transversal + `p-4` (spec header full-bleed 40px, `overflow-hidden`); `CardHeader` empilha "por etapa · mês atual" abaixo do título em `text-xs surface-400 mt-0.5` (spec inline 11.5 `--tx3` `margin-left:8px`); link "Abrir funil" `text-xs font-medium text-brand-400` + ícone (spec 12/600 `--acs`, "→" textual) | container transversal, `p-0` + header `h-10 px-3.5 border-b border-surface-700`; subtítulo inline `text-[11.5px] text-surface-500 ml-2`; link `font-semibold text-accent-dark` |
| DASH-FUNNEL-02 | ❌ | SalesFunnelCard.tsx:99-105 | `<thead>` 11px/600 `surface-500` **uppercase tracking-wider**, `pb-2`, sem fundo | linha de 30px com `bg-[var(--sf2)] border-b border-surface-700`, 11/600 `text-surface-400`, **sem** uppercase/tracking, `px-3.5`; colunas `1.4fr 80px 120px 1.6fr 90px` (hoje `<table>` auto) |
| DASH-FUNNEL-03 | ❌ | SalesFunnelCard.tsx:113-137 | `border-t surface-800/60` por linha (spec `border-b --bd`, última sem); `py-2.5` ≈36px ✓; 13px ✓; dot 8px ✓ via `tintaDaEtapa` (intocável ✓); trilha `bg-surface-800` (spec `--sf2`); conversão `surface-400` sempre (spec "—" `--tx2`, % em `--tx`) | `border-b border-surface-700 last:border-b-0`; trilha `bg-[var(--sf2)]`; % em `text-surface-100`, "—" em `text-surface-400` |
| DASH-FUNNEL-04 | ✅ | SalesFunnelCard.tsx:63-77,111 | etapas/contagens reais do funil padrão; largura normalizada pelo topo ✓; cor = tinta da etapa do tenant ✓ | — |
| DASH-QUEUE-01 | [!] | LiveNowCard.tsx:48-70 | é um card AGREGADO ("Ao Vivo", 4 métricas), não a lista "Fila agora" por conversa — gap documentado em GAPS-PENDENTES.md ("widget diferente") | [!] decisão de produto; nota: o dado existe (`conversationsApi` com status/fila + `lastMessageAt`) — se aprovado, é reestilo com dado real. Independente disso: `card-glow bg-surface-900 border-surface-800 rounded-xl` transversal ❌ e valores em `kpi-hero-value`/`kpi-hero-orange` = **gradiente em texto de KPI**, proibido pela README (CARD-11) ❌ |
| DASH-QUEUE-02 | [!] | — | não existe item de conversa | idem |
| DASH-QUEUE-03 | [!] | — | thresholds de SLA por minuto não existem em lugar nenhum | idem; se aprovado, cortes viram config |
| DASH-QUEUE-04 | [!] | — | não existe rodapé "Ver todas as N" | idem |
| DASH-TEAM-01 | ❌ | TeamMiniCard.tsx:21-27 | container transversal (+ `overflow-hidden` ✓); header `min-h-10 px-4` (16; spec 14) `border-b surface-800`; título `text-sm` (14; spec 13); "N online" `text-xs surface-500` (spec 11.5 `--tx2`) | container transversal; `px-3.5 border-surface-700`; título `text-[13px]`; contador `text-[11.5px] text-surface-400` |
| DASH-TEAM-02 | ❌ | TeamMiniCard.tsx:33-37 | `flex px-4 py-1.5 text-[10px] font-semibold surface-600 uppercase tracking-wider`, 1ª coluna "Nome" | `grid grid-cols-[1fr_60px_60px] px-3.5 pt-1.5 pb-0.5 text-[10.5px] font-semibold text-surface-500`, sem uppercase/tracking, 1ª coluna vazia |
| DASH-TEAM-03 | ❌ | TeamMiniCard.tsx:39-46 · ui/Avatar.tsx:22,43,85-99 | linha `h-8` (32 ✓) `px-4 gap-2 border-t surface-800/60` (spec sem borda por linha); `Avatar size="xs"` = 24px (spec 20) `rounded-[30%]` ✓ com `avatar-operador` (gradiente teal; spec `--avs/--avi` mono); dot 6px `border-2 border-surface-900 bg-online` (spec 7px, borda 1.5 `--sf`); nome `text-xs` (12; spec 12.5) `font-medium` ✓; Abertas `surface-300` (spec `--tx`), TMR `surface-400` ✓ | remover `border-t`; grid `1fr 60px 60px`; avatar 20px — **primitivo**: `Avatar` não tem tamanho 20 nem variante mono pra operador (reportar ao orquestrador: AVATAR-* da spec 1a) |
| DASH-TEAM-04 | ✅/[!] | TeamMiniCard.tsx:40 · Avatar.tsx:99 | dados reais; presença binária `bg-online`/`bg-offline` | [!] 3º estado "ausente" `#F97316` não existe no dado (`isOnline` booleano) |
| DASH-TEAM-05 | [!] | TeamMiniCard.tsx:11-13 | linha do agente de IA omitida de propósito (P14: `AgentMetrics` só tem humanos) | [!] documentado; se o agent-server expuser abertas/TMR do agente, a linha é reestilo (tile 20px raio 6 `--acsoft`/`--acs`) |

## Resumo por status

- ✅ 2 (FUNNEL-04, TEAM-04 dado) · ❌ 15 · ❓ 2 (HEADER-04, parte de HEADER-03) · [!] 12
  (KPI-03..07 apoio/delta sem histórico, CHART-03/04/05 dado por hora, QUEUE-01..04 widget, TEAM-04/05).
- Vários itens são ❌ + [!] ao mesmo tempo: o ESTILO é reestilo puro mesmo onde o DADO não existe.

## ❌ por arquivo, em ordem de impacto

1. **Transversal (5 cards)** — `KpiGrid.tsx:182`, `VolumeChart.tsx:36`, `SalesFunnelCard.tsx:80`, `TeamMiniCard.tsx:21`, `LiveNowCard.tsx:56`: `bg-surface-900 border-surface-800 rounded-xl [card-glow]` → `bg-surface-800 border-surface-700 rounded-lg`, sem `card-glow` (sombra/glow proibidos fora de overlay). É a diferença mais visível da tela nos dois temas (no claro os cards saem cinza `#F5F6F8` sobre página `#FAFAFC` em vez de brancos; no escuro saem um degrau abaixo, borda quase invisível). — KPI-01, CHART-01, FUNNEL-01, QUEUE-01, TEAM-01.
2. **`LiveNowCard.tsx:29-44,79`** — `kpi-hero-value`/`kpi-hero-orange` = gradiente em texto (README: proibido). → cor sólida `text-surface-100` / `text-warning`.
3. **Headers de card** — `SalesFunnelCard`, `TeamMiniCard`, `VolumeChart`: título 14px → 13px; padding 16 → 14; subtítulo inline; borda `surface-700`. — CHART-01, FUNNEL-01, TEAM-01.
4. **`SalesFunnelCard.tsx:99-137`** — cabeçalho da tabela em faixa `--sf2` 30px sem uppercase; hairline por linha em `--bd`; trilha `--sf2`; cores de conversão. — FUNNEL-02/03.
5. **`TopBar.tsx` (via `useTopBarActions`) + `DashboardPage.tsx:242-256`** — subtítulo dinâmico com "atualizado há Ns", período no slot da TopBar, readiness positivo à esquerda. — HEADER-01/02/03.
6. **`TeamMiniCard.tsx:33-46`** — grid `1fr 60px 60px`, cabeçalho 10.5 sem uppercase, sem borda por linha. Avatar 20px/mono é **primitivo** (orquestrador). — TEAM-02/03.
7. **`VolumeChart.tsx:39-62`** — legenda 11.5/gap 14, 2ª série `--bd2`, raio 2, sem grid/YAxis. — CHART-02/04.
8. **`KpiGrid.tsx:149-161`** — tracking/line-height do valor, contexto em `--tx3`. — KPI-02.

## Fora dos 29 itens — registrar, não pontuar

- `DashboardPage.tsx:263` envolve tudo em `max-w-[1440px] px-6`; o mock não mostra container. `TipCard` de setup (`:266-275`), `AiInsightsSection` (flag), `TagsChart`/`CsatChart`/`PeakHoursHeatmap`/`AgentTable`/`StatusDonut`/`ActivityFeed` não estão no mock 1b — produto real, sem item (mas todos usam o mesmo container transversal `bg-surface-900 border-surface-800 rounded-xl`; ao corrigir o item 1 acima vale aplicar neles pela consistência).
- `KpiGrid.tsx:86-129` (`KpiCard` da grade secundária, slots 6+) e o botão "Personalizar" (`:336-342`): fora do mock; `KpiCard` ainda tem ícone em tile colorido + `rounded-xl` + `card-glow`.
- Skeleton (`DashboardPage.tsx:277-304`) usa `rounded-xl` — acompanhar o raio 8 quando o item 1 for aplicado.
