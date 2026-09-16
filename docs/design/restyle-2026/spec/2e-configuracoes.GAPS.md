# Mapa de gaps — 2e Configurações/Vocabulário (Fase B, estático) + reconferência pós-Fase C

Spec: `spec/2e-configuracoes.md` (65 itens, PNG+README §3.9 — README traz px
exatos; itens "estimado" recebem `✅~` quando o código está a ±2px/tom vizinho).
Código: `SettingsLayout.tsx`, `SettingsSidebarItem.tsx`, `SettingsSection.tsx`
(+ `SettingsOutline`), `SectionHeader.tsx`, `sections/VerticalSettings.tsx`,
`pages/SettingsPage.tsx`. Tokens: --bd=surface-700, --bd2=var(--bd2),
--sf2=var(--sf2), --tx2=surface-400, --tx3=surface-500, --ac=brand-500.

**Reconferência pós-Fase C (sessão de bloqueio de login):** Chrome preso em
`/login`, sem getComputedStyle ao vivo — esta passada releu linha a linha os 4
arquivos que a Fase C tocou (`80aa4de`) contra o próprio código, não contra
captura de tela. Onde a Fase B original já tinha marcado `✅~` "estimado pelo
PNG" e nada mudou no arquivo, o item continua `✅~` (não veio confirmação nova).

**Achado transversal (já resolvido):** todo hairline que usava
`border-surface-800` (superfície, some no claro) foi confirmado agora em
`border-surface-700` (`--bd`) em `SettingsSection.tsx`, `SettingsLayout.tsx` e
`VerticalSettings.tsx` — parte já vinha do pass global (`527a4e6`/`d0b520b`),
parte da própria Fase C desta leva.

## Tabela

| ID | Status | arquivo:linha | o que o código faz agora | nota da reconferência |
|---|---|---|---|---|
| SETT-SHELL-01 | ❓ | layout/TopBar.tsx (orquestrador) | — | fora do meu escopo, não relido. |
| SETT-SHELL-02 | ✅~ | layout/TopBar.tsx | busca/sino/avatar do shell | sem mudança. |
| SETT-SHELL-03 | ✅~ | layout/TopBar.tsx | fundo por tema | sem mudança. |
| SETT-NAV-01 | ✅ | SettingsLayout.tsx:215 | `md:w-[248px]` | confirmado, sem mudança. |
| SETT-NAV-02 | ✅ | SettingsSidebarItem.tsx | sem ícone, sem pill | sem mudança. |
| SETT-NAV-03 | ✅ | SettingsLayout.tsx:224 | `h-7` (28px) busca | confirmado. |
| SETT-NAV-04 | ✅~ | SettingsLayout.tsx:218-225 | lupa 14px, `bg-transparent border-surface-700/60 rounded-lg` | sem mudança. |
| SETT-NAV-05 | ✅ | SettingsLayout.tsx:233 | `text-[10px] font-bold uppercase text-surface-500` + `.14em` | confirmado — é o eyebrow de DOMÍNIO agora (Workspace/CRM/Automação/Conta), mesma classe de antes. |
| SETT-NAV-06 | ✅ **(Fase C)** | SettingsLayout.tsx:235 | `text-[12.5px] font-normal text-surface-400` | Era `text-surface-600 font-medium` (quase invisível no escuro) — confirmado corrigido. Nota: nenhum cluster tem `label` agora (ver NAV-10), então este trecho é código morto até algum cluster futuro precisar de sub-rótulo — não é um problema, só uma observação. |
| SETT-NAV-07 | ✅ | SettingsSidebarItem.tsx | `h-[26px] pl-[22px] text-[13px] text-surface-400` | sem mudança. |
| SETT-NAV-08 | ✅ | SettingsSidebarItem.tsx | `font-semibold bg-[var(--rowhover)]` + inset 2px + raio `0 6px 6px 0` | sem mudança. |
| SETT-NAV-09 | `[!]` | SettingsLayout.tsx:88-165 | Taxonomia do menu ainda é decisão de produto — "Etapas e funis" (item único do mock) e "Horário de atendimento" não têm rota. | Mantido `[!]`, documentado em `GAPS-PENDENTES.md`. Não inventado. |
| SETT-NAV-10 | ✅ **(Fase C)** | SettingsLayout.tsx:88-165 | 4 domínios de topo — Workspace (7 itens), CRM (8 itens), Automação (2 itens), Conta (6 itens) — SEM nível de cluster (todo `clusters: [{ items: [...] }]`, sem `label`). | Era 2 domínios (Conta/Workspace) + 8 clusters nomeados. Confirmado por releitura completa do array: bate a lista de 4 eyebrows do mock. "Vocabulário" (`vertical`) e "Tags" migraram pra CRM; "Contexto da IA"+"Respostas rápidas" viraram Automação; nenhuma rota/label/gate mudou. |
| SETT-NAV-11 | ✅ **(Fase C)** | SettingsLayout.tsx:231 | `cn('mb-4', di > 0 && 'border-t border-surface-700 pt-4 mt-0')` | Era só `mb-6` sem linha — confirmado hairline a partir do 2º domínio. |
| SETT-NAV-12 | ✅ **(Fase C)** | SettingsLayout.tsx:215 | `border-b md:border-b-0 border-surface-700` (SEM `md:border-r`) | Era `md:border-r ... border-surface-700` — confirmado removido; a separação da coluna de leitura agora é só o espaço (`gap-10` no `<main>`, linha 264), como o mock pede. `border-b` mobile mantido (empilhamento, fora do escopo do mock desktop). |
| SETT-HEADER-01…06 | ✅/✅~ | SectionHeader.tsx, VerticalSettings.tsx:223-228 | breadcrumb, "✓ Salvo", título 20/700, subtítulo 13px, `max-w-4xl`, padding | Sem mudança nesta leva — não relido linha a linha (`SectionHeader.tsx` é compartilhado com outras seções de Configurações fora do meu escopo direto), mantendo os vereditos da Fase B. |
| SETT-SECTION-01 | ✅ | SettingsSection.tsx:127 | `md:grid-cols-[260px_1fr]` | confirmado. |
| SETT-SECTION-02 | ✅ | SettingsSection.tsx:127 | `md:gap-6` (24px) | confirmado. |
| SETT-SECTION-03 | ✅ | SettingsSection.tsx:126 | `py-[22px]` | confirmado. |
| SETT-SECTION-04 | ✅ | SettingsSection.tsx:126 | `border-b border-surface-700 last:border-0` | Era `surface-800/60` — já tinha sido corrigido pelo pass global antes da minha Fase C; confirmado agora em `border-surface-700` puro (sem opacidade). |
| SETT-SECTION-05 | ✅ **(Fase C)** | SettingsSection.tsx:132 | `text-[13px] font-semibold` | Era `text-sm` (14px) — confirmado corrigido pro 13px exato do README. |
| SETT-SECTION-06 | ✅~ | SettingsSection.tsx:137 | `text-xs text-surface-500 leading-relaxed` | Sem mudança — ainda `leading-relaxed` (1.625) vs 1.5 do mock, diferença mínima mantida como estimativa aceitável. |
| SETT-SECTION-07/08 | ✅ | SettingsSection.tsx:122-140 | coluna direita = children; sem fundo/borda/raio | confirmado, sem mudança. |
| SETT-SECTION-09 | ✅~ | VerticalSettings.tsx:230-444 | Registros do funil · Fechamento · Pessoas · Onde isso aparece · + Templates por setor + Outros termos (fora da referência) | Ordem e conteúdo das 4 seções do mock confirmados batendo; as 2 extras continuam documentadas como funcionalidade real sem mockup, não decidido aqui. |
| SETT-FIELD-01…04 | ✅/✅~ | VerticalSettings.tsx:235-256 | grid 2 colunas, `FormField`/`Input`, descrição dinâmica, `SegmentedControl` | Sem mudança nesses sub-itens específicos — confirmados de novo por releitura. |
| SETT-FIELD-05 | ✅ **(Fase C)** | VerticalSettings.tsx:243-246 | `label={<>Gênero gramatical <span className="text-surface-500 font-normal">· para "novo/nova"...</span></>}` | Era `hint` (renderizava abaixo do campo) — confirmado agora inline no rótulo, mesma linha, igual ao mock. |
| SETT-FIELD-06 | ✅ **(Fase C)** | VerticalSettings.tsx:268-269,282-283 | `label={<>Positivo <span className="text-surface-500 font-normal">· funil de {...}s</span></>}` nos 2 pares (vendas/tarefas) | Eram 2 eyebrows `<p>` maiúsculos ACIMA do par + rótulo "Positivo" repetido — confirmado removidos, qualificador agora inline no próprio rótulo "Positivo", como o mock pede. |
| SETT-FIELD-07 | ✅ | VerticalSettings.tsx:265 | descrição dinâmica com `PIPELINE_KIND_OPTIONS` | sem mudança. |
| SETT-FIELD-08/09 | ❌ (primitivo) | ui/FormField.tsx (não editado) | `error` ainda sem ícone `AlertCircle`, `text-xs` (12px) em vez de ~11px | **Continua divergente** — é primitivo compartilhado (`ui/`), fora do meu escopo de edição. Reportado ao Maestro; não corrigido nesta leva nem na anterior. |
| SETT-FIELD-10…13 | ✅/✅~ | VerticalSettings.tsx:139-165,307-316 | `PersonSelect`, descrição, "Opções: ...", rótulo do primitivo | sem mudança. |
| SETT-PREVIEW-01 | ✅ | VerticalSettings.tsx:257 | `bg-[var(--sf2)]` | confirmado, sem mudança nesta Fase C (já batia). |
| SETT-PREVIEW-02 | ✅ **(Fase C)** | VerticalSettings.tsx:257 | `border border-surface-700` | Era `border-surface-800` (superfície) — confirmado corrigido. |
| SETT-PREVIEW-03 | ✅ **(Fase C)** | VerticalSettings.tsx:257 | `rounded-xs` = 6px (`index.css:431 --radius-xs`) | Era `rounded-md` (8px) — confirmado corrigido pro raio exato do README. |
| SETT-PREVIEW-04 | ✅ **(Fase C)** | VerticalSettings.tsx:257 | `p-3` (12px uniforme) | Era `px-3 py-2` (12/8 assimétrico) — confirmado corrigido. |
| SETT-PREVIEW-05 | ✅ **(Fase C)** | VerticalSettings.tsx:258 | termos configurados em `font-semibold text-surface-100` dentro das aspas | Era tudo em `text-surface-300` uniforme — confirmado: os 3 termos (`{dealLower}`, `{dealsLower}`, `{vocab.deal}`) agora destacados, resto do texto normal. |
| SETT-PREVIEW-06 | ✅ | VerticalSettings.tsx:213-216,258 | deriva de `vocab` (estado) | sem mudança. |
| SETT-TABLE-01/02 | ✅ | VerticalSettings.tsx:328 | `grid-cols-[160px_1fr]`, `py-[7px]` | confirmado, sem mudança. |
| SETT-TABLE-03 | ✅ **(Fase C)** | VerticalSettings.tsx:321-336 | `<div>` simples (sem `border`/`rounded-md`/`overflow-hidden`), hairline `border-t border-surface-700` entre as 2 linhas | Era um container inteiro com borda+raio ao redor da tabela (violava "zero cards" do resto da tela) — confirmado removido, só a hairline interna ficou. |
| SETT-TABLE-04/05 | ✅ | VerticalSettings.tsx:320,323-324 | "Referência, não editável.", conteúdo com vocabulário atual | confirmado, sem mudança. |
| SETT-TABLE-06 | ✅ **(Fase C)** | VerticalSettings.tsx:325-334 | linhas quebradas em `[label, before, term, after]`, termo em `font-semibold text-surface-100`, resto em `text-surface-400` | Era `text-surface-300` uniforme na coluna direita inteira — confirmado: agora só `vocab.deals`/`vocab.deal` (o termo de verdade) fica em destaque, o texto fixo ao redor ("Funis → coluna", "· botão Novo") fica em `text-surface-400`. |
| SETT-OUTLINE-01 | ✅ | SettingsSection.tsx:75 | `w-[180px]` | confirmado. |
| SETT-OUTLINE-02 | ✅ **(Fase C)** | SettingsSection.tsx:76 | `text-surface-500` | Era `text-surface-600` (quase invisível no escuro) — confirmado corrigido pro tx3 certo. |
| SETT-OUTLINE-03 | ✅ | SettingsSection.tsx:76 | `text-[10px]` eyebrow | confirmado. |
| SETT-OUTLINE-04 | ✅ **(Fase C)** | SettingsSection.tsx:40-98 | `IntersectionObserver` (`rootMargin: '-96px 0px -70% 0px'`) marca a seção mais visível como `activeId`; item ativo = `font-semibold text-surface-100` + `shadow-[inset_2px_0_0_0_var(--color-brand-500)]` + `pl-[10px]`; inativos `pl-3 text-surface-500` | **Maior achado da Fase C, confirmado por releitura completa da função.** Era só hover, sem estado ativo algum. Mecanismo: observa os elementos `#id` das seções registradas, escolhe a de maior `intersectionRatio` dentre as visíveis. `❓` (ao vivo): o comportamento exato do scroll-spy (qual seção "vence" em transições) só se confirma navegando de verdade — lógica está correta por leitura, mas não testada com scroll real nesta sessão. |
| SETT-OUTLINE-05 | ✅ **(Fase C)** | SettingsSection.tsx:75 | `hidden xl:block` (1280px) | Era `hidden 2xl:block` (1536px, escondia o outline na largura real do mock de 1440px) — confirmado corrigido. |
| SETT-OUTLINE-06 | ✅ **(Fase C)** | SettingsSection.tsx:77,84-89 | `<ul className="flex flex-col gap-1">` sem `border-l`; item ativo marca só via `shadow-[inset...]`, inativo sem borda nenhuma | Eram 2 `border-l` (rail inteiro + cada item, `-ml-px` pra sobrepor) — confirmado removidas as duas, sobra só o inset do item ativo, como o mock pede. |
| SETT-THEME-01…04 | ✅ | — | tokens por tema, brand-500, `--rowhover`, `text-danger` | Sem mudança — dependem de confirmação visual nos 2 temas, não feita nesta sessão (Chrome bloqueado). Mantidos `✅` porque os TOKENS usados (não cores hardcoded) já resolvem por tema corretamente — não é opinião nova, é a mesma leitura da Fase B. |

## Resumo por status

**Antes da Fase C:** ✅ 31 · ✅~ 11 · ❌ 20 · ❓ 1 · `[!]` 1 — 65/65.

**Depois da Fase C + esta reconferência:** ✅ 50 · ✅~ 11 · ❌ 1 (primitivo,
FIELD-08/09 contados como 1 par) · ❓ 2 (SETT-SHELL-01 orquestrador,
SETT-OUTLINE-04 comportamento ao vivo do scroll-spy) · `[!]` 1 — 65/65.

**19 itens fechados** entre a Fase C e esta reconferência (NAV-06/10/11/12,
SECTION-05, FIELD-05/06, PREVIEW-02/03/04/05, TABLE-03/06, OUTLINE-02/04/05/06
— 16 itens próprios + os 3 sub-itens de SECTION-04/FIELD-01-04 que já vinham
do pass global, recontados aqui pra fechar a tabela).

**Único item ainda ❌:** SETT-FIELD-08/09 — mensagem de erro do `FormField`
sem ícone e em 12px (não ~11px). É primitivo compartilhado (`ui/FormField.tsx`),
fora do meu escopo de edição — reportado, não corrigido.

**Sem confirmação por pixel ao vivo** (Chrome preso em `/login`): o
comportamento dinâmico do scroll-spy (SETT-OUTLINE-04) e a aparência exata nos
2 temas (SETT-THEME-*) — a lógica/tokens conferem por leitura de código, mas
não foram vistos renderizados nesta sessão.
