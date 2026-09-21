# Gaps — 2a Agentes IA · 2b Wizards (Fase B: spec × código, mapeamento estático)

Leitura completa (arquivo inteiro): `src/pages/AgentsPage.tsx` (405 linhas),
`src/components/agents/AgentIcons.tsx` (33 linhas), `src/components/automations/
AutomationBuilder.tsx` (421 linhas). Leitura parcial, por trecho/grep (arquivos grandes,
~2100–2300 linhas cada): `src/components/agents/AgentDetail.tsx` (header 1–400 e
2080–2260; lista de tabs; grep pra confirmar ausência de conteúdo) e
`src/components/agents/AgentBuilderWizard.tsx` (topo com `WizardData`/`STEP_LABELS`/
listas de opção; grep pontual pro Tutor/eyebrow/footer). **Não lidos**: `CapabilitiesTab.tsx`,
`DecisionCriteriaTab.tsx`, `SkillsTab.tsx`, `AgentCatalogTab.tsx`, `HandoffRuleBuilder.tsx`,
`PromptArtifact.tsx`, `AutomationWizard.tsx` (`Step1/Step2/Step3` — conteúdo de
Gatilho/Condições/Ações do drawer). Itens que dependem só desses ficam `❓`, marcados
explicitamente. Dono da leva (Farol) faz a Fase C.

## Achados estruturais (antes da tabela)

1. **AGT-DET-16…24 ("Comportamento": Objetivo/Tom de voz/Limites) não existe como aba
   pós-criação.** Fiz `grep` por "Objetivo", "Tom de voz", "Meta principal", "Consultivo",
   "Não informa preço" etc. em todo `src/components/agents/`: só aparecem em
   `AgentBuilderWizard.tsx` (o wizard de criação) e `agentBuilderTeachings.ts`. As 9 abas
   reais do `AgentDetail.tsx` (`tabs` em `AgentDetail.tsx:2112-2128`) são: Visão geral,
   System Prompt, Capacidades, Critérios, [Skills condicional], [Ferramentas condicional],
   Regras, Conhecimento, Catálogo, Métricas — nenhuma se chama "Comportamento" nem
   reproduz a estrutura de grupos Objetivo/Tom de voz/Limites do mock. Uma vez criado, o
   agente aparentemente só edita esses campos via texto livre em "System Prompt" (não
   confirmado — não abri `PromptArtifact.tsx`). Isso é MAIOR que o `[!]` de taxonomia já
   citado pelo usuário (9 vs 6 abas) — não é só nome de aba diferente, é uma seção INTEIRA
   do mock sem equivalente estruturado no código atual.
2. **"Zero cards" violado por toda a `OverviewTab`.** `AgentDetail.tsx:196, 322, 355, 386`
   usam repetidamente `bg-[var(--sf2)] border border-surface-800/60 rounded-xl p-4` pra
   "Status do agente", "Comportamento da IA", "Atividade", "Informações" — caixas com
   fundo+borda+raio+padding, exatamente o padrão que o método chama de `❌` direto (AGT-DET-16
   pede "zero cards", grid `200px 1fr` com hairline).
3. **Rail direito (320px, KPIs 2×2 + "Sugestão do sistema") não existe.** `grep` por
   "Sugestão do sistema", "CSAT", "Handoffs", "Sem humano" no arquivo inteiro: zero
   ocorrências. Confirma e não duplica o `[!]` já catalogado em `AUDITORIA-NOTURNA.md`
   ("AgentDetail painel 'HOJE' — sem endpoint agregado").
4. **AgentBuilderWizard tem 8 etapas (mesma contagem do mock) mas nomes/ordem
   completamente diferentes.** Mock (AGT-WIZ-09): Identidade · Objetivo · Tom de voz · Hub
   da empresa · Conhecimento · Regras de handoff · Canais · Teste. Código
   (`STEP_LABELS`, `AgentBuilderWizard.tsx:92`): Identidade · Personalidade · Escopo ·
   Negócio · Passar para humano · Base de Conhecimento · **Gerar Prompt** · Revisão. A
   etapa final do mock é um teste interativo ("Teste"); a etapa final real é uma
   "Revisão" (resumo, não teste ao vivo) — e existe uma etapa "Gerar Prompt" sem
   equivalente no mock. Coincidência de contagem (8=8), divergência de conteúdo real.
5. **AutomationBuilder é o que mais bate com o mock dos 4 arquivos.** Drawer 880px ✅, nav
   200px ✅, fundo do nav `--sf2` ✅, item de nav 30px ✅, bolinha de estado de 3 cores ✅
   (conceito idêntico). Principal divergência: a 4ª seção do nav é "Coexistência c/ IA" no
   código, não "Horário" do mock — e o rodapé mostra "N ações · pronto pra ativar" em vez
   do timestamp "Alterado há N min · não publicado" que o mock exibe.

## Tabela — 2a (AGT-SHELL, AGT-LIST, AGT-DET, AGT-THEME)

| Item | Verdito | Arquivo:linha | Nota |
|---|---|---|---|
| AGT-SHELL-01…04 | ✅ | (Shell, spec/shell.md) | Rail/TopBar genéricos — já cobertos por `shell.md`, não há nada específico de Agentes aqui além do conteúdo (abaixo). |
| AGT-SHELL-05 | ❌ | TopBar.tsx `PAGE_SUBTITLES['/agents']` = "Construtor de IA" | Estático, não a contagem dinâmica "N ativos · N conversas resolvidas hoje" do mock — mesmo padrão já visto em Conversas (`spec/1d-conversas.GAPS.md`). |
| AGT-SHELL-06 | ❌ (leve) | AgentsPage.tsx:204-213 | Botão "Novo agente" existe (bom — Conversas nem isso tinha), mas `rounded-xl` + `py-1.5` em vez de `h28`/`raio 7` do mock; texto `text-xs`≈12px bate. |
| AGT-SHELL-07/08 | ✅/❓ | (Shell) | Busca/sino/avatar genéricos — ver `shell.md`. Não há nada de Agentes que os altere. |
| AGT-LIST-01 | ✅ | AgentsPage.tsx:279 | `w-[300px] flex-shrink-0` — bate exato. |
| AGT-LIST-02/03 | ❌ | AgentsPage.tsx:289-311 | Mock pede chips individuais h22 (ativo: fundo `--acsoft`/texto `--acs`, sem borda; inativos: borda `--bd`, sem fundo). Código usa um `SegmentedControl`-like (`bg-surface-900 border rounded-xl p-1`, botões `flex-1 rounded-lg`, ativo `bg-surface-700 shadow-sm`) — grupo de abas coladas, não chips soltos. Também tem uma linha de cabeçalho extra "Agentes · N" (AgentsPage.tsx:281-286) sem equivalente no mock. |
| AGT-LIST-04/05 | ❌ | AgentsPage.tsx:141-145, 314 | Contradição direta: mock pede "sem raio, sem borda própria, sem gap lateral" — código usa `rounded-2xl border` em CADA item + `space-y-2` (gap) entre eles no container da lista. É exatamente o padrão "card por item" que o resto do design system já tirou de Conversas/Contatos, mas ficou aqui. Estado selecionado usa o inset 2px certo (`shadow-[inset_2px_0_0_0_var(--color-brand-500)]`, AgentsPage.tsx:143) — isso bate — mas convive com a borda/raio que não deveria existir. |
| AGT-LIST-06 | ✅ | AgentsPage.tsx:148, AgentIcons.tsx:29 | Tile 34px (`w-[34px] h-[34px]`) bate exato. Raio: ver AGT-LIST-07 abaixo — o componente `AgentIcon` usa `rounded-2xl` (16px) pra QUALQUER estado, não o `raio 8` do mock. |
| AGT-LIST-07 | ❌ | AgentIcons.tsx:29 | `rounded-2xl` (16px) em vez de raio 8; `shadow-lg` sempre aplicado (mock/README: sem sombra em tile). Não encontrei um estado visual "rascunho" diferente (borda tracejada, sem fundo) — `AgentIcon` sempre pinta um fundo sólido de cor, então o tile de rascunho não parece distinto do tile ativo por cor/borda, só teoricamente pelo `agent.icon` escolhido. |
| AGT-LIST-08…10 (chip de estado) | ❌ | AgentsPage.tsx:154-163 | Mock pede chip preenchido (fundo `--okbg`/`--sf2`, raio 5, padding). Código mostra só texto colorido + um ponto de 6px (`<span style={{color}}>texto</span>` + dot), sem fundo/borda nenhuma — perdeu o "chip", virou rótulo solto. |
| AGT-LIST-11/12 | `[!]` (validado) | AgentsPage.tsx:150-153, 164-169 | O próprio código documenta a decisão: "nada de sparkline/CSAT fictício, o AgentConfig de hoje só tem conversation_count/updated_at" — mostra só "N conversas" e "atualizado há X" em vez de "Linha · N conversas agora" / "61% sem humano · CSAT 4,6". Confirma que os dados do mock (% sem humano, CSAT, linha atribuída) **não existem no backend hoje** — código evitou inventar, decisão correta. Mesmo `[!]` já citado pelo usuário. |
| AGT-LIST-13 | ❓ | — | Ordem/conteúdo real depende de dados ao vivo. |
| AGT-DET-01 | ✅ | AgentDetail.tsx:2139 | `flex flex-col h-full`, sem card envolvendo — bate. |
| AGT-DET-02/03 | ✅ | AgentDetail.tsx:2144-2145 | Tile 40px (`w-10 h-10`) bate exato o tamanho; raio herda de `AgentIcon` (`rounded-2xl`=16px, não raio 9 — mesmo problema do AGT-LIST-07, ❌ no raio especificamente). |
| AGT-DET-04 | ❌ (leve) | AgentDetail.tsx:2153-2156 | Nome `text-lg font-display font-bold` (~18px), mock pede 16px/700. Chip de status é `rounded-full` (pílula total), mock pede `raio 5` (semi-arredondado, não pílula). |
| AGT-DET-06/07 | ✅ | AgentDetail.tsx:2169-2177 | "Salvo às HH:MM" com ícone de check — bate no CONCEITO exato do mock ("texto, não barra nem botão Salvar"), usando `agent.updated_at` como fonte (validado: é dado real, não fictício). Posição no header (entre nome e Testar) também bate a ordem do mock. |
| AGT-DET-08 | ❌ | AgentDetail.tsx:2179-2185 | "Testar" usa fundo tingido + anel (`bg-brand-600/15 ring-1 ring-brand-500/30`), mock pede neutral outline sem fundo (`borda --bd2, sem fundo`). Altura `h-9`=36px, não h28. |
| AGT-DET-09 | ✅ | AgentDetail.tsx:2189-2199 | `Switch` + rótulo "Ligado/Desligado" — bate o conceito e a posição (depois de Testar). |
| AGT-DET-10 | ❌ (leve) | AgentDetail.tsx:2201-2213 | Kebab `w-9 h-9 rounded-xl` (36px/raio maior), mock pede 28px/raio7. |
| AGT-DET-11/12/13 (abas) | ❌ | AgentDetail.tsx:2112-2128, `Tabs.tsx` (não lido) | Usa o primitivo `<Tabs>` com `accent` POR ABA (violet/green/cyan/amber/blue/rose — comentário do próprio código explica a intenção: "accent dá identidade categórica pra cada seção"). O mock é explícito: sublinhado "na cor do TEXTO, não no acento" — uma única convenção neutra pra todas as abas. Código faz o oposto de propósito (múltiplas cores por categoria). Lista de abas também diverge (9 reais vs 6 do mock — `[!]` de taxonomia já citado, mas o ESTILO da sublinha colorida por categoria é um `❌` à parte, não coberto pelo `[!]`). |
| AGT-DET-14…24 (corpo/grupos Objetivo/Tom de voz/Limites) | ❌ (estrutural, grande) | AgentDetail.tsx (ausente); AgentDetail.tsx:196-397 (OverviewTab real) | Ver achado estrutural #1 e #2 acima. Não existe a aba "Comportamento" com os 3 grupos do mock; a aba que de fato existe na posição "padrão" (`overview`/Visão geral) mostra Status/Comportamento-da-IA(pause/debounce)/Atividade/Informações em CARDS (`bg-[var(--sf2)] border rounded-xl p-4`), não o grid `200px 1fr` com hairline que o mock pede pra QUALQUER aba de configuração. |
| AGT-DET-25…30 (rail 320px, KPIs, Sugestão do sistema) | `[!]` (já catalogado) | AgentDetail.tsx (ausente, grep confirmado) | Ver achado estrutural #3. Não duplicar no `GAPS-PENDENTES.md`. |
| AGT-DET-31 | ❌ | AgentDetail.tsx (várias) | "Nenhuma sombra em lugar nenhum da tela" — falso: `AgentIcon` tem `shadow-lg` fixo (tile do header e da lista), botão "Testar" tem leve profundidade via `ring`. "Nenhum breadcrumb" — bate (não vi breadcrumb). "Nenhum botão Salvar" — bate no sentido geral (auto-save por campo), mas a `AiBehaviorCard` (dentro de Overview) TEM um botão "Salvar" explícito (`AgentDetail.tsx:230-243`) — contradição pontual com essa ausência declarada. |
| AGT-THEME-01…04 | ❓ | — | Não verificado ao vivo nos 2 temas — depende de captura de tela real, fora do escopo desta Fase B estática. |

## Tabela — 2b(i) AgentBuilderWizard

| Item | Verdito | Arquivo:linha | Nota |
|---|---|---|---|
| AGT-WIZ-01/02 | ❓ | — | Não confirmei o layout de 2 painéis (Tutor 320px + conteúdo) na renderização real — só os DADOS que alimentam o Tutor (labels/teachings), não o JSX do painel em si (não lido, fora dos trechos que abri). |
| AGT-WIZ-04 | ✅ | AgentBuilderWizard.tsx:2088 | `Etapa {step} de {STEP_LABELS.length}` — formato "Etapa N de M" bate exato o padrão do mock ("Etapa 3 de 8"). |
| AGT-WIZ-09 | ❌ (grande) | AgentBuilderWizard.tsx:92 | Ver achado estrutural #4. `STEP_LABELS = ['Identidade','Personalidade','Escopo','Negócio','Passar para humano','Base de Conhecimento','Gerar Prompt','Revisão']` — mesma contagem (8) que o mock, nomes e conteúdo por etapa substancialmente diferentes (mock: Identidade/Objetivo/Tom de voz/Hub da empresa/Conhecimento/Regras de handoff/Canais/Teste). "Tom de voz" do mock parece estar dentro de "Personalidade" (há um seletor `TONES` com Formal/Casual/Técnico/Empático/Entusiasmado — 5 opções, não as 4 do mock "Consultivo/Direto/Caloroso/Formal", nomes diferentes também). "Limites" (can_do/cannot_do) parece estar em "Escopo" (`CAN_DO_PRESETS`/`CANNOT_DO_PRESETS` existem, `AgentBuilderWizard.tsx:137-161`) mas como PRESETS de múltipla escolha, não os 2 campos de texto livre do mock ("Não informa preço..."). |
| AGT-WIZ-10 | ❓ (parcial) | AgentBuilderWizard.tsx:2167 | "Só etapas concluídas são clicáveis." confirmado literal. Não confirmei se a 2ª frase do mock ("Rascunho salvo automaticamente.") está presente no mesmo bloco — não apareceu no grep pontual que rodei; pode estar em outro lugar do arquivo. |
| AGT-WIZ-13/14 | ❓ | — | Barra de progresso segmentada (8 segmentos) e "Rascunho salvo" à direita — não localizados no grep rápido; existe uma OUTRA barra de progresso (`progressPct`, linha 951-1010) mas é de uma tela de GERAÇÃO (loading steps), não a barra de navegação do wizard em si — pode ser um componente diferente não coberto pelos meus greps. `❓`, precisa leitura completa do JSX do wizard (não fiz por causa do tamanho do arquivo). |
| AGT-WIZ-16…23 (corpo, cards de opção, textarea) | ❓ | — | Não lido — os campos existem (dados/listas confirmadas), mas o JSX exato (grid 4 colunas, card raio 8, seleção com anel `--acsoft`) não foi verificado. |
| AGT-WIZ-24…27 (footer 64px, Voltar/Continuar) | ✅ (parcial) | AgentBuilderWizard.tsx:2226 | `step === 7 ? 'Revisar' : 'Continuar →'` confirma o botão "Continuar" com seta — bate o conceito. Não confirmei altura do footer (64px) nem o botão "← Voltar" especificamente (não apareceu no grep, mas é presumível que exista dado o padrão `ChevronLeft` importado). |

## Tabela — 2b(ii) AutomationBuilder

| Item | Verdito | Arquivo:linha | Nota |
|---|---|---|---|
| AUTO-WIZ-01 | ✅ | AutomationBuilder.tsx:191-197 | Backdrop `bg-black/50` sobre o shell — cobre o conceito de scrim (cor exata `black/50` não é literalmente `--scrim` tokenizado, mas visualmente equivalente). |
| AUTO-WIZ-02 | ❌ (leve) | AutomationBuilder.tsx:202 | `w-[min(880px,95vw)]` = 880px ✅ exato. `bg-surface-950` — pela tabela de tokens desta própria spec, `--sf` (fundo do drawer) mapeia pra `--color-surface-900`, não 950; o código usa um tom mais escuro que o esperado. `overlay-frame` (classe compartilhada) provavelmente cobre borda+sombra — não verificado a fundo (`❓` parcial), mas o token de fundo já é uma divergência confirmada. |
| AUTO-WIZ-03/04 | ❌ | AutomationBuilder.tsx:205-212 | Altura via `min-h-14 py-2.5` ≈ 56px, plausível ✅. `px-6`=24px vs mock `padding 0 20`. Subtítulo é `flowSummary(summ)` (resumo dinâmico gerado, ex. "Gatilho → Ação") em vez do rótulo estático "Automação" do mock — mudança de estratégia de conteúdo (mais informativo, mas diferente do mock). |
| AUTO-WIZ-05 | ❌ | AutomationBuilder.tsx:205-216 (ausente) | Chip de estado "Ativa" no header **não existe** — não há badge de status visível na barra de título do drawer. |
| AUTO-WIZ-06 | ✅ | AutomationBuilder.tsx:213 | Botão X presente, `p-1.5 rounded-lg`, cor `--tx2`-equivalente — conceito bate, tamanho exato (28×28) não confirmado. |
| AUTO-WIZ-07/08 | ✅ | AutomationBuilder.tsx:221 | `w-[200px]` e `bg-[var(--sf2)]` — **bate exato** os 2 valores mais específicos do mock. |
| AUTO-WIZ-09/10/11/12 | ✅ (conceito) | AutomationBuilder.tsx:234-260 | Item `h-[30px]` ✅ exato. Bolinha de estado 6px (`w-1.5 h-1.5 rounded-full`) com 3 estados (`bg-online`/`bg-away`/borda) — mapeia 1:1 pro conceito ok/pendente/não-visitada do mock, ainda que os NOMES de token (`online`/`away`) não sejam literalmente `--ok`/`--amber` (verificar se resolvem pras mesmas cores — `❓` fina). Item ativo `bg-surface-800 border-surface-700` — mock pede fundo `--sf` (=surface-900 por esta spec) + borda `--bd`; código usa surface-800/700, um degrau errado em cada. Contador no item (`{count}`) só quando > 0, só em Ações/Condições — bate exato a regra do mock (AUTO-WIZ-12). |
| AUTO-WIZ-13 | ❌ | AutomationBuilder.tsx:52-58 | Mock: Gatilho · Condições · Ações · **Horário** · Revisão. Código: Gatilho · Condições · Ações · **Coexistência c/ IA** · Revisar — a 4ª seção é conceitualmente diferente (comportamento da IA durante a automação, não agendamento de horário). Pode ser evolução de produto real (`AgentBehaviorSelector` existe e é usado, `AutomationBuilder.tsx:317`) — não achei sinal de uma seção "Horário" em lugar nenhum do arquivo. |
| AUTO-WIZ-14 | ❌ (leve) | AutomationBuilder.tsx:267 | `px-6 py-5 space-y-8` (24/20/32px) vs mock `padding 20px 24px`, gap 22 — valores próximos, não exatos. |
| AUTO-WIZ-16…25 (conteúdo de Gatilho/Condições/Ações) | ❓ | `AutomationWizard.tsx` (não lido) | Delegado a `Step1`/`Step2`/`Step3`, arquivo fora da lista lida — não dá pra confirmar grid `1fr 130px 1fr 28px`, cores de erro, ícones de ação etc. |
| AUTO-WIZ-26/27 | ❌ | AutomationBuilder.tsx:352-355 | Footer existe (`px-6 py-4`), mas o texto à esquerda é "Adicione ao menos uma ação..." / "N ações · pronto para ativar" — **não** o timestamp "Alterado há N min · não publicado" do mock. Dado de auditoria/edição (`updatedAt`) existe no tipo `Automation` (visto em `editTarget` destructuring, linha 91) mas não é usado nesta string — poderia ser corrigido reaproveitando esse campo, não é um `[!]` de backend. |
| AUTO-WIZ-28/29 | ❌ (leve, rótulos) | AutomationBuilder.tsx:357-387 | Para edição: só 1 botão "Salvar alterações" (mock pede 2: Descartar + Salvar e publicar). Para criação: 2 botões, mas "Salvar rascunho" (não "Descartar") + "Ativar automação" (não "Salvar e publicar") — conceitos próximos, rótulos e semântica diferentes (rascunho≠descartar). |
| AUTO-WIZ-30 | nota | — | É uma observação sobre o ENQUADRAMENTO do PNG (a imagem só capturou até "Ações"), não um requisito funcional — não tratar como item de fidelidade. |
| WIZ-THEME-01…04 | ❓ | — | Não verificado ao vivo. |

## Discrepâncias entre fontes (da própria spec, não recontar como achado meu)

DISC-01 a DISC-05 já registradas na spec (`2a-2b-agentes.md`) — não duplicadas aqui.

## Resumo por status

- ✅ confirmado bate: **~16** (AGT-SHELL-01…04/07/08 [herdados do Shell], AGT-LIST-01/06,
  AGT-DET-01/02(tamanho)/06/07/09, AGT-WIZ-04/24-27(parcial), AUTO-WIZ-01/06/07/08/09-12(conceito)).
- ❌ difere (confirmado por arquivo:linha): **~26** contando os grupos estruturais grandes
  uma vez cada (achados #1, #2, #4 valem por si só como itens grandes cobrindo ~15 IDs
  da spec).
- `❓` não verificável sem ler arquivo de fora do escopo ou sem estado ao vivo: **~25**
  (Tabs.tsx interno, CapabilitiesTab/DecisionCriteriaTab/SkillsTab/AgentCatalogTab/
  HandoffRuleBuilder/PromptArtifact/AutomationWizard não lidos; AGT-THEME e WIZ-THEME
  inteiros; partes não lidas do corpo do AgentBuilderWizard).
- `[!]` gap de produto/dado: **2** (AGT-LIST-11/12 — CSAT/% sem humano/linha, já
  catalogado e agora VALIDADO pelo próprio comentário do código; AGT-DET-25…30 — painel
  HOJE, já catalogado, confirmado ausente via grep).

## ❌ por arquivo, em ordem de impacto

1. **`src/components/agents/AgentDetail.tsx`** — maior divergência: aba "Comportamento"
   inteira (Objetivo/Tom de voz/Limites) sem equivalente pós-criação, `OverviewTab` toda em
   cards (`bg-[var(--sf2)] border rounded-xl`) contradizendo "zero cards", tabs com cor de
   acento por categoria em vez de sublinhado neutro, avatar/tile com raio e sombra errados,
   botão "Testar" com estilo preenchido em vez de neutral outline. **~9 itens/grupos.**
2. **`src/components/agents/AgentBuilderWizard.tsx`** — 8 etapas com nomes/conteúdo
   completamente reorganizados vs. mock (mesma contagem por coincidência); etapa final é
   "Revisão", não "Teste". **1 achado grande cobrindo ~9 itens da spec (AGT-WIZ-09 sozinho
   já invalida o mapeamento 1:1 de conteúdo por etapa).**
3. **`src/components/agents/AgentIcons.tsx`** — raio (`rounded-2xl` vs 8/9), sombra sempre
   ligada, paleta de 12 cores fixas por ÍCONE (não hex livre por agente como o mock supõe).
   Afeta AGT-LIST-06/07 e AGT-DET-03. **~3 itens, mas usado em 2 lugares.**
4. **`src/pages/AgentsPage.tsx`** — coluna de filtro vira grupo de abas em vez de chips,
   itens da lista em card (`rounded-2xl border` + gap) em vez de hairline flat, chip de
   status perde o fundo/pílula. **~5 itens.**
5. **`src/components/automations/AutomationBuilder.tsx`** — mais fiel dos 4, mas com 4ª
   seção de nav trocada (IA em vez de Horário), sem chip de estado no header, rodapé sem
   timestamp de edição, rótulos de botão semanticamente diferentes. **~6 itens, a maioria
   leve.**

## Contagem

124 itens da spec cobertos (67 de 2a: SHELL 8 + LIST 13 + DET 31 + THEME 4 · 28 de
AGT-WIZ · 31 de AUTO-WIZ, mais as 5 discrepâncias já catalogadas na própria spec). **~16
✅ · ~26 ❌ (contando grupos estruturais) · ~25 ❓ (arquivos fora do escopo lido ou estado
ao vivo) · 2 `[!]`.** Itens `❓` são por arquivo não lido (listado no topo) ou por
dependerem de captura ao vivo nos 2 temas — nenhum foi pulado sem motivo declarado.

## Fase D — reconferência linha a linha (Farol, sem navegador)

Reconferido contra o código atual do epic: `OverviewTab` em `AgentDetail.tsx`
(grid `1fr_320px`, `SettingsGroup` 200px/1fr com hairline pros grupos
Status/Comportamento da IA, rail direito único bloco `bg-[var(--sf2)]` com
Atividade/Informações) confere; abas sem `accent` por categoria confere
(sublinhado volta neutro); lista de agentes (`AgentsPage.tsx`) hairline
edge-to-edge confere; `AgentBuilderWizard.tsx` — trilha do Tutor nos tokens
`--acsoft/--acs`/`--btn/--btntx`/`--bd2`+`--tx3` confere, header 52px com 8
segmentos (padding 24, segmento inativo `--bd`) confere, corpo sem card em
volta do formulário confere, footer 64px sob o formulário com
Voltar/Continuar/Publicar (aprovado depois da Fase C original) confere.
Nenhuma divergência de valor exato encontrada nesta reconferência — zero
achados novos, zero correções necessárias.

## Rodada 2 — 2a Agentes, inventário por imagem (Farol, 2026-09-21)

| ID | Elemento (mock) | App antes | Ação |
|---|---|---|---|
| R2-AGT-01 | Tile do agente raio 8, sem sombra; rascunho tracejado sem fundo (AGT-LIST-07/DET-31, ficaram ❌ na Fase C) | `rounded-2xl shadow-lg` sempre preenchido | **✅ código** `AgentIcon` (+ prop `dashed`) |
| R2-AGT-02 | Chip de estado suave h18 raio 5 (Ativo --okbg/--ok; Rascunho --sf2+borda) (AGT-LIST-08..10, DET-04) | texto colorido+dot na lista; `.color-chip` sólido pílula no detalhe | **✅ código** lista e detalhe |
| R2-AGT-03 | Testar = outline neutro h28; kebab 28/raio 7; "Ligado" 12/600 --tx; nome 16/700; chips de status do overview h28 (sel. --ac/--acsoft/--acs); Atividade em linhas simples (zero caixa); eyebrows do rail 10/700 .14em (AGT-DET-04/08/10) | botão brand preenchido h36, kebab 36/raio 12, nome 18, pílulas sólidas | **✅ código** |
| R2-AGT-04 | Barra de chips h22 "Todos 4 · Ativos · Rascunho" no lugar do segmentado + cabeçalho "Agentes · N"; sem chevron nos itens; "Novo agente" primary sm (AGT-LIST-02/03, SHELL-06) | segmentado 4 abas `rounded-xl` + cabeçalho + chevron | **✅ código** |
| R2-AGT-05 | Subtítulo do header com a descrição do agente | "Atualizado dd/mm" | **✅ código**: usa `agent.objective` (existe no tipo) antes do "Atualizado"; "modelo Claude · v14" `[!]` (grep: `AgentConfig` sem model/versão) |
| — | "Linha X · N conversas agora", "61% sem humano · CSAT", painel HOJE, Sugestão do sistema | — | `[!]` mantido (grep `AgentConfig`: só `conversation_count` total; sem CSAT/handoffs/linha) |

Tudo `❓ ao vivo` (sem navegador). Dashboard: chip "WhatsApp conectado" ligado ao subtítulo via `usePrimaryConnectedLine` (DASH-HEADER-02, ver 1b-dashboard.GAPS.md).

## Rodada 2 — 2b Wizards, inventário por imagem (Farol, 2026-09-21)

**Wizard de agente (tela cheia)** — PNG claro+escuro vs app:

| ID | Elemento (mock) | App antes | Ação |
|---|---|---|---|
| R2-WIZ-01 | Painel Tutor `--sf` sólido, marca "O · Novo agente" 12px, eyebrow `--acs`, título 18/700, trilha logo abaixo do texto, nota no rodapé; sem orbs/blur | orbs animadas + blur, tile gradiente "Studio/Criar Agente IA", X no Tutor, tile de ícone colorido no título, trilha colada no rodapé | **✅ código** shell reescrito; `BackgroundOrbs` removido; dicas de ensino mantidas (conteúdo real) como lista simples sem tiles |
| R2-WIZ-02 | X no header da direita (28px raio 7) | no Tutor | **✅ código** |
| R2-WIZ-03 | Header/footer do painel de conteúdo `--sf` (sem translucidez) | `surface-950/85` + blur | **✅ código** |
| R2-WIZ-04 | Cards de opção: borda --bd, raio 8, título 13/600 + descrição 11.5 --tx2, à esquerda; selecionado borda --ac + anel 3px --acsoft; inputs raio 7 borda --bd2 | cards centralizados, seleção verde-sólida (`status-active`), inputs `rounded-xl` | **✅ código** (Tom de comunicação, Idioma, INPUT, textareas, caixas `bg-surface-900/60 rounded-xl`) |
| — | "Rascunho salvo" no header | — | `[!]` mantido: o wizard não persiste rascunho (grep `AgentBuilderWizard`: só `createAgent` no fim) |
| — | Nomes das 8 etapas (Objetivo/Tom de voz/Hub/Conhecimento/Handoff/Canais/Teste) | Identidade·Personalidade·Escopo·Negócio·Passar p/ humano·KB·Gerar Prompt·Revisão | `[!]` mantido: conteúdo por etapa é produto (achado estrutural #4), não só rótulo |

**Drawer de automação:**

| ID | Elemento (mock) | App antes | Ação |
|---|---|---|---|
| R2-AUTO-01 | Header: título 14/700 + subtítulo 12 --tx2 + chip de estado ("Ativa") + X 28px; sem tile de ícone | tile brand 36px + título 14/600 + subtítulo 11px; sem chip (AUTO-WIZ-05) | **✅ código**: chip de `editTarget.status` (Ativa/Pausada/Rascunho) — dado real |
| R2-AUTO-02 | Footer: "Alterado há N min" + Descartar/primary (AUTO-WIZ-26..29) | "N ações · pronto para ativar" + botões artesanais raio 12 | **✅ código**: `updatedAt` real ("Alterado há …"); botões viram `Button` do sistema. "não publicado"/"Descartar" `[!]`: não existe versão publicada; Descartar = fechar já tem confirmação |
| R2-AUTO-03 | Nav: bolinha à ESQUERDA do rótulo, sem ícone, item raio 7; seções em eyebrow 10/700 uppercase sem ícone/descrição em linha | ícone + rótulo + contagem + bolinha à direita; títulos com ícone brand e linha de dica abaixo | **✅ código** |
| R2-AUTO-04 | Fundo do drawer `--sf`; campos raio 7 borda --bd2; cards de trigger/tipo/coexistência com borda --ac + anel 3px --acsoft; caixas raio 8 | `surface-950`, `rounded-xl`, seleção `brand-600/10` | **✅ código** (`AutomationBuilder` + `AutomationWizard`) |
| — | 4ª seção "Horário" | "Coexistência com a IA" | `[!]` mantido: não existe agendamento de horário na automação (grep `Automation`/`automationsApi`) |

Tudo `❓ ao vivo` (sem navegador).

- **R2-AGT-06** — empty state legado (tile `rounded-3xl` 80px + botão grande) → `EmptyState` + `Button sm` (via `action`). ✅ código, `❓ ao vivo`.
