# Mapa de gaps — 2e Configurações/Vocabulário (Fase B, estático)

Spec: `spec/2e-configuracoes.md` (65 itens, PNG+README §3.9 — README traz px
exatos; itens "estimado" recebem `✅~` quando o código está a ±2px/tom vizinho).
Código: `SettingsLayout.tsx`, `SettingsSidebarItem.tsx`, `SettingsSection.tsx`
(+ `SettingsOutline`), `SectionHeader.tsx`, `sections/VerticalSettings.tsx`,
`pages/SettingsPage.tsx`. Tokens: --bd=surface-700, --bd2=var(--bd2),
--sf2=var(--sf2), --tx2=surface-400, --tx3=surface-500, --ac=brand-500.

**Achado transversal (mesmo de 2d/6a):** hairlines em `border-surface-800`/
`surface-800/60` — após `527a4e6` `surface-800` é a SUPERFÍCIE (#FFFFFF no
claro), então as linhas entre seções, no SectionHeader, na prévia e na tabela
somem no tema claro. Trocar por `border-surface-700` (`--bd`).

## Tabela

| ID | Status | arquivo:linha | o que o código faz hoje | menor mudança |
|---|---|---|---|---|
| SETT-SHELL-01 | ❓ | layout/TopBar.tsx (PAGE_TITLES/PAGE_SUBTITLES `/settings`) | título/subtítulo da TopBar são do shell (orquestrador) — não lidos aqui | conferir na Fase B do Shell |
| SETT-SHELL-02 | ✅~ | layout/TopBar.tsx | busca `/`, sino, avatar são do shell | — |
| SETT-SHELL-03 | ✅~ | layout/TopBar.tsx | fundo por tema | — |
| SETT-NAV-01 | ✅ | SettingsLayout.tsx:230 | `md:w-[248px]` | — |
| SETT-NAV-02 | ✅ | SettingsSidebarItem.tsx:11-13 | sem ícone, sem pill | — |
| SETT-NAV-03 | ✅ | SettingsLayout.tsx:239 | `h-7` (28px) | — |
| SETT-NAV-04 | ✅~ | SettingsLayout.tsx:233-239 | lupa 14px, placeholder `surface-600`, `bg-transparent border-surface-700/60 rounded-lg` (fundo transparente; spec estima "levemente distinto") | opcional `bg-[var(--sf2)]` |
| SETT-NAV-05 | ✅ | SettingsLayout.tsx:249 | `text-[10px] font-bold uppercase text-surface-500` + `letterSpacing .14em` | — |
| SETT-NAV-06 | ❌ | SettingsLayout.tsx:255 | `h-7 text-[12.5px] font-medium text-surface-600` — `surface-600` no escuro é #2E4040 (cor de borda, quase invisível); peso 500 vs normal | `text-surface-400 font-normal` |
| SETT-NAV-07 | ✅ | SettingsSidebarItem.tsx:33-36 | `h-[26px] pl-[22px] text-[13px] text-surface-400` | — |
| SETT-NAV-08 | ✅ | SettingsSidebarItem.tsx:31-35 | `font-semibold bg-[var(--rowhover)]` + `inset 2px 0 0 brand-500` + `borderRadius 0 6px 6px 0` | — |
| SETT-NAV-09 | [!] | SettingsLayout.tsx:130-143 | cluster CRM real: Produtos · Situação do contato · Campos personalizados · Funis (gate); "Vocabulário" vive em Geral como "Vertical & vocabulário", "Tags" em Atendimento; "Etapas e funis" e "Horário de atendimento" não existem como rota | taxonomia do menu = decisão de produto; "Horário de atendimento" não tem tela |
| SETT-NAV-10 | ❌ | SettingsLayout.tsx:85-167,247-258 | 2 domínios (Conta/Workspace) + 8 clusters em sentence-case; mock = 4 eyebrows de topo WORKSPACE / CRM / AUTOMAÇÃO / CONTA sem nível de cluster | reagrupar os itens EXISTENTES nos 4 eyebrows do mock (Workspace: Geral, Números, Setores/Usuários; CRM: Produtos, Situação, Campos, Vocabulário, Tags; Automação: Agentes/Contexto IA, Respostas rápidas; Conta: Minha conta, Notificações, Faturamento, Segurança, Conectores/API) e remover o nível de cluster. Itens sem rota (Regras de handoff, Horário) = [!] |
| SETT-NAV-11 | ❌ | SettingsLayout.tsx:248 | grupos separados por `mb-6`, sem linha | `border-t border-surface-700 pt-3` em cada domínio a partir do 2º (e reduzir `mb-6`) |
| SETT-NAV-12 | ❌ | SettingsLayout.tsx:230 | `md:border-r border-surface-800/60` (borda externa na sidebar) | remover `md:border-r` (separação só por espaço) |
| SETT-HEADER-01 | ✅ | SectionHeader.tsx:26; VerticalSettings.tsx:226 | `text-xs text-surface-500`, "Workspace / CRM / Vocabulário" | — |
| SETT-HEADER-02 | ✅ | SectionHeader.tsx:28-31; VerticalSettings.tsx:227 | `Check` 12px + "Salvo" em `text-success`, à direita | — |
| SETT-HEADER-03 | ✅ | SectionHeader.tsx:36 | `text-xl` (20px) `font-bold` | — |
| SETT-HEADER-04 | ✅ | SectionHeader.tsx:38 | `text-[13px] leading-[1.55] text-surface-400` | — |
| SETT-HEADER-05 | ✅ | SettingsLayout.tsx:282 | `max-w-4xl` (896px) | — |
| SETT-HEADER-06 | ✅~ | SettingsLayout.tsx:279 | `md:py-8 md:px-10` = 32/40/32 (spec 26/40/32) | opcional `md:pt-[26px]` |
| SETT-SECTION-01 | ✅ | SettingsSection.tsx:89 | `md:grid-cols-[260px_1fr]` | — |
| SETT-SECTION-02 | ✅ | SettingsSection.tsx:89 | `md:gap-6` (24px) | — |
| SETT-SECTION-03 | ✅ | SettingsSection.tsx:88 | `py-[22px]` | — |
| SETT-SECTION-04 | ❌ | SettingsSection.tsx:88; SectionHeader.tsx:21 | `border-b border-surface-800/60` (superfície a 60% → invisível no claro) | `border-surface-700` nos dois |
| SETT-SECTION-05 | ❌ | SettingsSection.tsx:94 | `text-sm` (14px) `font-semibold` — README exato 13px/600 | `text-[13px]` |
| SETT-SECTION-06 | ✅~ | SettingsSection.tsx:99 | `text-xs text-surface-500 leading-relaxed` (12px, tx3, 1.625) vs 12px tx2 1.5 | opcional `text-surface-400 leading-normal` |
| SETT-SECTION-07 | ✅ | SettingsSection.tsx:102 | coluna direita = children | — |
| SETT-SECTION-08 | ✅ | SettingsSection.tsx:85-92 | sem fundo/borda/raio (só hairline inferior) | — |
| SETT-SECTION-09 | ✅~ | VerticalSettings.tsx:231-444 | Registros do funil (Gênero como campo dentro, não seção própria) · Fechamento · Pessoas · Onde isso aparece · **+ Templates por setor + Outros termos** (não estão no mock — funcionalidade real, "fora da referência") | — (não decidir) |
| SETT-FIELD-01 | ✅~ | VerticalSettings.tsx:235-242 | `grid-cols-2 gap-3` com `FormField`/`Input` (rótulo é o primitivo FormField — 1a) | — |
| SETT-FIELD-02 | ✅ | VerticalSettings.tsx:233 | descrição dinâmica na coluna esquerda | — |
| SETT-FIELD-03 | ✅~ | ui/Input.tsx (primitivo 1a) | — | ver 1a FIELD-* |
| SETT-FIELD-04 | ✅ | VerticalSettings.tsx:244-252 | `SegmentedControl` Masculino/Feminino | — |
| SETT-FIELD-05 | ❌ | VerticalSettings.tsx:243 | legenda passada como `hint` do FormField → renderiza ABAIXO do campo, `text-xs text-surface-500`; spec = inline ao lado do rótulo | rótulo `Gênero gramatical` + `<span class="text-surface-500 font-normal"> · para "novo/nova", "ganho/ganha"</span>` na mesma linha (FormField aceita ReactNode em `label`? se não, ❌ vai pro primitivo) |
| SETT-FIELD-06 | ❌ | VerticalSettings.tsx:265-306 | eyebrow extra em caixa-alta "POSITIVO · FUNIL DE VENDAS" (`text-2xs uppercase`) ACIMA do par e depois rótulos "Positivo"/"Negativo" repetidos; spec = par com qualificador inline no rótulo | remover os 2 `<p>` eyebrow; rótulos `Positivo · funil de vendas` / `Negativo` e `Positivo · funil de tarefas` / `Negativo` |
| SETT-FIELD-07 | ✅ | VerticalSettings.tsx:262 | descrição dinâmica com `PIPELINE_KIND_OPTIONS` | — |
| SETT-FIELD-08 | ❌ | VerticalSettings.tsx:295-300 → ui/FormField.tsx:96 | `error` renderiza `<p class="text-xs text-danger">` sem ícone; borda vermelha do input depende de `aria-invalid` no primitivo (❓ ao vivo) | **primitivo (orquestrador)**: FormField error com `AlertCircle` 12px + texto; Input `aria-invalid` → `border-danger` |
| SETT-FIELD-09 | ❌ | ui/FormField.tsx:96 | 12px sem ícone (spec ~11px + ícone `!` circular) | idem FIELD-08 — `text-2xs` + ícone (primitivo) |
| SETT-FIELD-10 | ✅ | VerticalSettings.tsx:139-165,313-320 | `PersonSelect` = `Select` com "Contato"/"Atendente" + Personalizado | — |
| SETT-FIELD-11 | ✅ | VerticalSettings.tsx:312 | descrição | — |
| SETT-FIELD-12 | ✅~ | VerticalSettings.tsx:321-323 | `text-2xs text-surface-500` "Opções: …" abaixo do PAR (spec: abaixo de "Quem escreve") | opcional mover pra `hint` do 1º FormField |
| SETT-FIELD-13 | ✅~ | ui/FormField.tsx (primitivo) | rótulo do FormField | ver 1a |
| SETT-PREVIEW-01 | ✅ | VerticalSettings.tsx:254 | `bg-[var(--sf2)]` | — |
| SETT-PREVIEW-02 | ❌ | VerticalSettings.tsx:254 | `border border-surface-800` (superfície) | `border-surface-700` |
| SETT-PREVIEW-03 | ❌ | VerticalSettings.tsx:254 | `rounded-md` (8px) | `rounded-xs` (6px) |
| SETT-PREVIEW-04 | ❌ | VerticalSettings.tsx:254 | `px-3 py-2` (12/8) — README exato 12px | `p-3` |
| SETT-PREVIEW-05 | ❌ | VerticalSettings.tsx:255 | exemplos em `text-surface-300` sem destaque nos termos | termos configurados em `font-semibold text-surface-100` (ou `text-accent-dark`) dentro das aspas |
| SETT-PREVIEW-06 | ✅ | VerticalSettings.tsx:213-216,255 | deriva de `vocab` (estado) | — |
| SETT-TABLE-01 | ✅ | VerticalSettings.tsx:335 | `grid-cols-[160px_1fr]` | — |
| SETT-TABLE-02 | ✅ | VerticalSettings.tsx:335 | `py-[7px]` | — |
| SETT-TABLE-03 | ❌ | VerticalSettings.tsx:328,335 | linhas separadas por `border-t border-surface-800` (superfície) E o bloco inteiro dentro de `border border-surface-800 rounded-md overflow-hidden` (container = card, viola SECTION-08) | remover o container (`border rounded-md overflow-hidden`); hairline entre linhas `border-t border-surface-700`; sem `px-3` externo |
| SETT-TABLE-04 | ✅ | VerticalSettings.tsx:327 | "Referência, não editável." | — |
| SETT-TABLE-05 | ✅ | VerticalSettings.tsx:329-332 | conteúdo com o vocabulário atual | — |
| SETT-TABLE-06 | ❌ | VerticalSettings.tsx:338 | coluna direita uniforme `text-surface-300` | termos entre aspas em `font-semibold text-surface-100`, texto fixo `text-surface-400` |
| SETT-OUTLINE-01 | ✅ | SettingsSection.tsx:45 | `w-[180px]` | — |
| SETT-OUTLINE-02 | ❌ | SettingsSection.tsx:46 | eyebrow `text-surface-600` (escuro = #2E4040, invisível) | `text-surface-500` (tx3) |
| SETT-OUTLINE-03 | ✅ | SettingsSection.tsx:52 | `text-xs` (12px) | — |
| SETT-OUTLINE-04 | ❌ | SettingsSection.tsx:41-60 | **não existe estado ativo** (só hover); `pl-3` (12px) | scroll-spy (`IntersectionObserver` nas `section#id`) → item ativo `font-semibold text-surface-100` + `boxShadow: inset 2px 0 0 var(--color-brand-500)` + `pl-[10px]` |
| SETT-OUTLINE-05 | ❌ | SettingsSection.tsx:43,45 | itens espelham as seções ✅, mas só aparece com ≥3 seções e em `2xl` (≥1536px) — o mock é 1440px | `xl:block` (1280) |
| SETT-OUTLINE-06 | ❌ | SettingsSection.tsx:47,52 | lista com `border-l border-surface-800/60` (rail) e `border-l` por item | remover as duas `border-l` — só o inset do ativo |
| SETT-THEME-01 | ✅ | — | tokens | — |
| SETT-THEME-02 | ✅ | — | (após corrigir SECTION-04/TABLE-03) | — |
| SETT-THEME-03 | ✅ | — | brand-500 + `--rowhover` por tema | — |
| SETT-THEME-04 | ✅ | — | `text-danger` por tema | — |

## Resumo por status

✅ 31 · ✅~ 11 · ❌ 20 · ❓ 1 · [!] 1 — 65/65 (⚠ 2 dos ❌ são no primitivo
`FormField`/`Input`, FIELD-08/09 → orquestrador).

## ❌ por arquivo, em ordem de impacto

1. **`SettingsSection.tsx`** — hairline entre seções invisível no claro
   (SECTION-04, afeta TODAS as telas de Configurações), título 14→13px
   (SECTION-05); `SettingsOutline` sem estado ativo/scroll-spy (OUTLINE-04),
   só em 2xl (OUTLINE-05), rail com borda (OUTLINE-06), eyebrow em
   `surface-600` (OUTLINE-02).
2. **`SettingsLayout.tsx`** — reagrupar o menu nos 4 eyebrows do mock
   (NAV-10, com [!] pros itens sem rota), hairline entre grupos (NAV-11),
   tirar a borda direita da sidebar (NAV-12), cluster em `surface-600`
   (NAV-06).
3. **`sections/VerticalSettings.tsx`** — tabela "Onde isso aparece" ainda em
   caixa (TABLE-03) e sem destaque nos termos (TABLE-06); prévia com
   borda/raio/padding errados (PREVIEW-02/03/04) e sem destaque
   (PREVIEW-05); eyebrows extras + rótulos repetidos no Fechamento
   (FIELD-06); legenda do gênero abaixo em vez de inline (FIELD-05).
4. **`SectionHeader.tsx`** — hairline `surface-800/60` (SECTION-04).
5. **`ui/FormField.tsx` / `ui/Input.tsx`** (orquestrador) — erro sem ícone,
   12px em vez de 11 (FIELD-08/09).

## Fora da referência (não decidido aqui)

- Seções "Templates por setor" e "Outros termos" (VerticalSettings:345-444)
  — funcionalidade real sem mockup; mantidas.
- Menu: itens do mock sem rota (Regras de handoff, Horário de atendimento,
  Etapas e funis como item único) — [!] produto.
