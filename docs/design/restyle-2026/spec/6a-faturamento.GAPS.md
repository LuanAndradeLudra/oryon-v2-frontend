# Mapa de gaps — 6a Plano & Faturamento (Fase B, estático)

Spec: `spec/6a-faturamento.md` (51 itens, PNG+README §3.11 — itens "estimado"
recebem `✅~` quando o código está a ±2px/tom vizinho). Código:
`sections/BillingPlan.tsx`, `sections/BillingSettings.tsx` (+ `SectionHeader`,
`SettingsSection`/`SettingsOutline` compartilhados — ver `2e-configuracoes.GAPS.md`
pros itens de layout/outline). Tokens: --bd=surface-700, --sf2=var(--sf2),
--tx2=surface-400, --tx3=surface-500, --ac=brand-500, --amber=warning/status-pending.

**Achado transversal:** `surface-800` usado como borda/trilha em 4 pontos —
após `527a4e6` é a superfície (branca no claro): divisórias da tabela de
upgrade, fundo da coluna atual, trilha das mini-barras e hairlines das linhas.

## Tabela

| ID | Status | arquivo:linha | o que o código faz hoje | menor mudança |
|---|---|---|---|---|
| PAGE-01 | ✅ | BillingSettings.tsx:391,429,454,471,498 | tudo em `SettingsSection` (sem card) | — |
| PAGE-02 | ✅~ | BillingPlan.tsx:10; SectionHeader.tsx:26 | breadcrumb `text-xs text-surface-500` — "Workspace / Administração / Plano & faturamento" (mock sem "Workspace") | — (segue a IA do menu) |
| PAGE-03 | ✅~ | SectionHeader.tsx:36 | `text-xl font-bold` (20/700) | — |
| PAGE-04 | ✅~ | BillingPlan.tsx:9; SectionHeader.tsx:38 | 13px `surface-400`; copy "Gerencie sua assinatura, …" vs "Assinatura, créditos de IA e histórico de pagamentos." | opcional: copy do mock |
| PAGE-05 | ✅~ | SectionHeader.tsx:21 + BillingSettings.tsx:363 | `pb-6 mb-2` + `mt-2` ≈ 34px | — |
| PAGE-06 | ✅~ | layout/TopBar.tsx | alerta de setor é do shell (fora do escopo) | — |
| PAGE-07 | ✅ | BillingSettings.tsx:182 | só a tabela de upgrade tem borda (uma) | — |
| BANNER-01 | ✅~ | BillingSettings.tsx:363 | `rounded-xs border border-brand-500/40 bg-accent-soft` (raio 6 vs ~8 est.; borda a 40%) | opcional `border-brand-500/60` |
| BANNER-02 | ❌ | BillingSettings.tsx:365 | `Zap` 18px `text-brand-400` solto, sem tile | envolver em `span.w-7.h-7.rounded-xs.bg-brand-500/20.flex.items-center.justify-center` |
| BANNER-03 | ✅ | BillingSettings.tsx:367 | `text-[13px] font-semibold text-surface-100` | — |
| BANNER-04 | ❌ | BillingSettings.tsx:368 | `text-xs text-surface-400` ✅ mas copy "Contrate o plano X (gateway mock confirma na hora)." — mock: "Você está em um período de avaliação. Contrate o plano Start para manter os agentes ativos após 30 set." | copy do mock com `billing.plan.displayName` e a data de `billing.planResetsAt` (dado existe) |
| BANNER-05 | ❌ | BillingSettings.tsx:371-386 | `Button size="sm"` = 28px (README exato 32px) | `className="h-8"` (ou size md 36 se o orquestrador preferir a escala) |
| BANNER-06 | ✅ | — | tokens por tema | — |
| BANNER-07 | ✅ | BillingSettings.tsx:362 | só com `!isSubscribed && !isCanceled` | — |
| PLAN-01 | ✅~ | BillingSettings.tsx:391-393 | "Plano atual" é o título 13/600 da `SettingsSection` (coluna esquerda), não eyebrow acima — gramática da página | — |
| PLAN-02 | ✅ | BillingSettings.tsx:397-398 | `w-9 h-9 rounded-md bg-accent-soft` + `Zap` `text-accent-dark` | — |
| PLAN-03 | ✅ | BillingSettings.tsx:401 | `text-base font-bold` | — |
| PLAN-04 | ❌ | BillingSettings.tsx:400-408 | **sem chip** "Avaliação · N dias restantes" | quando `!isSubscribed`: `span.color-chip` com `--chip: var(--color-status-pending)` "Avaliação · {dias} dias restantes" (dias = `planResetsAt − hoje`, dado existe) ao lado do nome |
| PLAN-05 | ✅~ | BillingSettings.tsx:393 | subtítulo do bloco na descrição da seção | — |
| PLAN-06 | ❌ | BillingSettings.tsx:402-407 | `text-sm text-surface-400` (14px) "Próxima renovação: 01 de outubro de 2026 · ≈ N atendimentos/mês" | `text-xs text-surface-500`; "Cobrança mensal · ≈ N atendimentos/mês · próximo ciclo {dd mmm}" |
| PLAN-07 | ✅ | BillingSettings.tsx:411-413 | `text-[22px] font-extrabold tabular-nums` | — |
| PLAN-08 | ❌ | BillingSettings.tsx:414 | "/mês" em `<p>` separado, linha abaixo; spec = imediatamente após o valor | `<span class="text-[11.5px] text-surface-500 font-normal ml-0.5">/mês</span>` inline |
| PLAN-09 | ❌ | BillingSettings.tsx:49 | rótulo `text-sm text-surface-400` (14px) | `text-xs text-surface-500` |
| PLAN-10 | ❌ | BillingSettings.tsx:50-52 | "used / total" inteiro em `font-semibold`, sem "· 6%" | `<b>63,67</b> / <b>1.000</b> · <b>6</b>%` — só dígitos em 700, adicionar o % |
| PLAN-11 | ✅ | BillingSettings.tsx:54 | `h-1.5 border border-surface-700 rounded-[3px]` | — |
| PLAN-12 | ✅ | BillingSettings.tsx:56 | `bg-brand-500` proporcional (warning/danger extras são estado real) | — |
| PLAN-13 | ✅~ | BillingSettings.tsx:423-425 | `text-xs text-surface-500`, copy um pouco mais longa | — |
| PLAN-14 | ❌ | BillingSettings.tsx:423 | **sem** "Renova em N dias" à direita | rodapé em `flex justify-between`: nota à esquerda + `Renova em {dias} dias` `text-[11.5px] text-surface-500` (de `planResetsAt`) |
| PLAN-15 | ✅ | BillingSettings.tsx:395 | sem fundo/borda | — |
| PLAN-16 | ✅~ | SettingsSection.tsx:88 | `py-[22px]`×2 + hairline (spec: só espaço) | — |
| LIMITS-01 | ✅~ | BillingSettings.tsx:430-431 | título+descrição; copy "Recursos incluídos na sua assinatura atual." vs "… Uso atual à esquerda, limite à direita." | opcional copy |
| LIMITS-02 | ✅ | BillingSettings.tsx:101 | `grid-cols-[1fr_160px_90px]` | — |
| LIMITS-03 | ✅ | BillingSettings.tsx:101 | `h-9` (36px) | — |
| LIMITS-04 | ❌ | BillingSettings.tsx:433-438 | ícones `w-4 h-4` (16px) — README exato 14px | `w-3.5 h-3.5` |
| LIMITS-05 | ✅~ | BillingSettings.tsx:102 | `text-sm text-surface-300` (14 vs ~13) | — |
| LIMITS-06 | ❌ | BillingSettings.tsx:106 | `h-1 rounded-full` ✅, trilha `bg-surface-800` (= superfície, some no claro) | `bg-surface-700` |
| LIMITS-07 | ✅ | BillingSettings.tsx:109 | `bg-brand-500` | — |
| LIMITS-08 | [!] | BillingSettings.tsx:78-83,434-438 | estilo "no teto" existe (`bg-warning`), mas só a linha de créditos tem `used` — não há endpoint de uso por tenant pra usuários/números/agentes/automações/Copilot (comentário no código; DESIGN-SYSTEM §19) | dado de backend |
| LIMITS-09 | [!] | BillingSettings.tsx:114-115 | `tabular-nums text-right`, âmbar no teto ✅ — mas as 5 linhas sem uso mostram só o limite | idem LIMITS-08 |
| LIMITS-10 | ❌ | BillingSettings.tsx:101 | `border-b border-surface-800/50` entre linhas (spec: sem divisórias) | remover `border-b … last:border-0` |
| LIMITS-11 | ✅ | BillingSettings.tsx:429-450 | sem borda/fundo | — |
| UPGRADE-01 | ✅ | BillingSettings.tsx:182 | `border border-surface-700 rounded-md` único | — |
| UPGRADE-02 | ✅~ | BillingSettings.tsx:455-456 | "O próximo plano libera mais usuários, números e agentes." (mock: "3 limites no teto. …" — contagem depende de LIMITS-08 [!]) | — |
| UPGRADE-03 | ❌ | BillingSettings.tsx:208 | divisórias `border-l border-surface-800` (superfície) ≠ container `surface-700` | `border-surface-700` |
| UPGRADE-04 | ❌ | BillingSettings.tsx:209 | coluna atual `bg-[var(--color-surface-800)]` = superfície (branco no claro) — spec `--sf2` | `bg-[var(--sf2)]` |
| UPGRADE-05 | ✅ | BillingSettings.tsx:213-214 | nome + "· atual" `text-2xs text-surface-500` | — |
| UPGRADE-06 | ✅ | BillingSettings.tsx:206 | `inset 0 2px 0 brand-500` | — |
| UPGRADE-07 | ❌ | BillingSettings.tsx:216-218 | `color-chip` com `--chip: brand-500` = pill CHEIA (teal sólido, texto branco — `.color-chip` é sempre cheio); spec = fundo acento suave + texto acento | `bg-accent-soft text-accent-dark border-0 text-2xs font-semibold px-1.5 py-px rounded-xs` |
| UPGRADE-08 | ✅ | BillingSettings.tsx:204-210 | 3ª coluna sem tratamento | — |
| UPGRADE-09 | ✅ | BillingSettings.tsx:221-223 | `text-lg font-extrabold` + `/mês` `text-xs font-normal` | — |
| UPGRADE-10 | ✅~ | BillingSettings.tsx:196-201,224 | 1 linha `text-2xs` (11px) "· " (spec 2 linhas ~12px) | opcional `text-xs` e quebra em 2 |
| UPGRADE-11 | ✅ | BillingSettings.tsx:226-235 | `primary` `w-full` na recomendada | — |
| UPGRADE-12 | ✅~ | BillingSettings.tsx:228,234 | `neutral` `w-full`; rótulo "Falar com vendas" só sem `opt` (3ª coluna real = tier `scale` com preço → "Mudar para Scale") | — (dado real) |
| UPGRADE-13 | ✅ | BillingSettings.tsx:225 | atual sem CTA | — |
| UPGRADE-14 | ✅~ | BillingSettings.tsx:208 | `p-3.5` (14px vs 16-20 est.) | opcional `p-4` |
| UPGRADE-15 | ✅ | — | `--sf2` e brand-500 por tema | — |
| OUTLINE-01 | ✅ | SettingsSection.tsx:46 | eyebrow (cor: ver 2e OUTLINE-02 ❌) | — |
| OUTLINE-02 | ✅~ | BillingSettings.tsx:392,430,455,472,499 | Plano atual · Limites do plano · Upgrade · Comprar créditos avulsos · Extrato de créditos (nomes ≈ mock) | — |
| OUTLINE-03 | ❌ | SettingsSection.tsx:41-60 | sem estado ativo/scroll-spy (mesmo ❌ de 2e OUTLINE-04) | ver 2e |
| OUTLINE-04 | ✅ | SettingsSection.tsx:52 | `text-xs text-surface-500` | — |
| OUTLINE-05 | ✅ | SettingsSection.tsx:45 | `sticky top-8` | — |
| OUTLINE-06 | ✅~ | SettingsSection.tsx:45 | 180px (README 2e é exato; PNG 6a estimou 140-160) | — |

## Resumo por status

✅ 26 · ✅~ 14 · ❌ 12 · ❓ 0 · [!] 2 — 51/51 (⚠ OUTLINE-03 é no
`SettingsOutline` compartilhado, já contado em 2e).

## ❌ por arquivo, em ordem de impacto

1. **`BillingSettings.tsx` — Plano atual**: sem chip "Avaliação · N dias"
   (PLAN-04), sem "Renova em N dias" (PLAN-14), metadados em 14px/formato
   diferente (PLAN-06), "/mês" fora da linha (PLAN-08), rótulo/contador da
   barra (PLAN-09/10).
2. **`BillingSettings.tsx` — Upgrade**: coluna atual em superfície em vez de
   `--sf2` (UPGRADE-04), divisórias em `surface-800` (UPGRADE-03), chip
   "Recomendado" cheio em vez de suave (UPGRADE-07).
3. **`BillingSettings.tsx` — Limites**: trilha `surface-800` (LIMITS-06),
   ícones 16→14 (LIMITS-04), divisórias entre linhas (LIMITS-10).
4. **`BillingSettings.tsx` — Banner**: ícone sem tile (BANNER-02), copy
   (BANNER-04), botão 28→32 (BANNER-05).
5. `SettingsOutline` (compartilhado, ver 2e).

## Rodada 2 (2026-09-21) — reconferência estática feita

| ID | Achado (PNG) | Correção | Status |
|---|---|---|---|
| R2-6A-01 | ícone do banner "Ative sua assinatura" sem tile; copy "no período de avaliação"; datas "30 set"/"01 out" | BillingSettings.tsx (`formatDayMonth`) | ✅ código · ❓ ao vivo |
| R2-6A-02 | chip "Avaliação · N dias restantes" era `.color-chip` sólido; mock é soft | classes `status-pending-*` | ✅ código · ❓ ao vivo |
| R2-6A-03 | coluna do rótulo ~198px no 6a | `SettingsSection labelWidth={198}` | ✅ código · ❓ ao vivo |

Breadcrumb do 6a no PNG é "Administração / Plano & faturamento"; o app deriva
da nav ("Conta / Plano & faturamento") — conflito de mocks, ver 2e-GAPS.
Seções "Créditos avulsos" e "Extrato" (abaixo da dobra no PNG) existem no app.
