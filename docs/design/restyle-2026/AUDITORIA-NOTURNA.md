# Auditoria noturna de fidelidade — SCRUM-1097

Checklist persistente da varredura autônoma (usuário dormindo, 2026-09-16 ~05:50).
Objetivo declarado pelo usuário: "quando eu acordar, quero que o software esteja
exatamente igual a todas as telas mockups de referência criadas pelo Claude Design".

## Protocolo de cada ciclo (a cada ~15-20 min)

1. `maestri check` nos 3 agentes + `git status`/`git log` nos worktrees a/b/c.
   Mesclar qualquer entrega pronta no `epic/SCRUM-1097-restyle-visual`
   (worktree `frontend-restyle-visual`, que serve `localhost:3011`), gate
   completo (`npx tsc -b` + suite), propagar pros 3 worktrees.
2. Pegar o próximo item `[ ]` desta lista (ordem = risco decrescente).
3. Verificar AO VIVO via Chrome (`localhost:3011`, sessão já autenticada; se
   cair: `admin@test.local` / `admin123` — usar `find`+`ref`, nunca coordenada
   bruta, o viewport real é maior que o screenshot devolvido). Comparar contra
   `telas/01-*.png` (claro) e `telas/02-*.png` (escuro) e, pra valor exato,
   grep no `Oryon-Reestilizacao-canvas.html` pelo id da tela.
4. Achou gap: diagnosticar até arquivo:linha. Primitivo/`index.css`/`layout/`
   = orquestrador corrige direto. Tela específica = despachar pro dono da leva
   com o diagnóstico exato (Cartógrafo=3/4/5, Farol=6/7/8, Bússola=9/10/11/12).
5. Marcar aqui: `[x]` verificado ao vivo e batendo, `[~]` gap achado/fix em
   andamento, `[!]` gap de produto/backend (documentar em GAPS-PENDENTES.md,
   NÃO inventar dado nem comportamento).
6. Nenhum agente ocioso: quem terminar recebe o próximo item da fila da sua leva.
7. `ScheduleWakeup` de novo. Nunca usar AskUserQuestion esta noite — usuário
   dorme; decisão de produto vira `[!]`, não pergunta.

## Método — extração → checklist → aplicação → prova ao vivo

Por que este método: os gaps que escaparam hoje escaparam porque a comparação
era "a tela PARECE com o mockup?" (juízo de gestalt, fácil de racionalizar —
"é maduro, deixa"). Um juízo vira fato quando o mockup é decomposto em
propriedades atômicas verificáveis uma a uma. "Linha da lista não tem borda
nem raio próprio" é verdadeiro ou falso no código; não tem "quase".

**Fase A — Extração (só referência, zero código).** Pra cada tela, gerar
`spec/<id>-<tela>.md` com TODA propriedade visual como item numerado
(`CONV-LIST-03`), agrupado por região da tela (header / lista / detalhe /
rodapé…). Três fontes, nesta ordem de autoridade:
  1. `Oryon-Reestilizacao-canvas.html` (grep pelo id da tela) → valor exato:
     hex, px, raio, peso, espaçamento.
  2. `telas/01-*.png` + `02-*.png` → composição, presença/ausência de CADA
     elemento, estados (hover/ativa/selecionada/vazio), posição relativa.
  3. `README.md` § da tela → intenção, regra, exceção documentada.
  Cada item: container (fundo/borda/raio/sombra/padding), tipografia
  (tamanho/peso/cor), espaçamento, estado, condição de aparecer.

**Fase B — Mapa de gaps (spec × código, estático).** Pra cada item da spec,
achar o código responsável (arquivo:linha) e marcar: `✅` bate / `❌` difere
(dizer o que o código faz de fato) / `❓` não dá pra saber lendo → só ao vivo
/ `[!]` exige dado/backend inexistente. Sai uma lista de correção sem
interpretação.

**Fase C — Aplicação.** Cada `❌` vira a menor mudança que torna o item
verdadeiro. Fronteiras de dono valem. A mensagem de commit cita os IDs que
fecha (rastreabilidade: toda mudança ↔ item de spec, todo item ↔ mudança ou
motivo documentado).

**Fase D — Prova ao vivo (obrigatória, sem exceção).** Render no Chrome, nos
2 temas, item a item; `zoom` na região pra detalhe de pixel (borda, raio,
espaçamento). Um item só vira `✅` confirmado no render, nunca por leitura de
código. Screenshot fica salvo como evidência.

**Fase E — Registro.** Atualizar este arquivo + a spec da tela. Nada depende
da memória de ninguém (nem da minha pós-compactação, nem de agente reiniciado).

**Garantia de cobertura.** Universo enumerado antes (13 telas × regiões + ~61
primitivos); tela só fecha com 100% dos itens `✅` ou `[!]`. Evita o "abri 8
de 61".

**Divisão.** Fase A paraleliza em forks por tela (só leitura, sem conflito).
B–C pelo dono da leva. D pelo orquestrador (ou delegada, mas SEMPRE ao vivo).

## Regras que NÃO mudam (mesmo sem o usuário acordado)

- Não inventar dado/funcionalidade que o backend não tem (painel "HOJE" do
  AgentDetail, "Rascunho salvo", banner de efeito colateral ao fechar negócio
  = `[!]` documentados, ficam assim).
- Reorganizar dados/ações que JÁ existem em layout novo É reestilo — fazer.
- Vocabulário do mockup no tema claro: fundo ≈ superfície, separação por
  BORDA 1px (`--color-surface-700` = #E4E6EC), NUNCA sombra/caixa por item.
  `shadow-*` só em overlay flutuante (modal/dropdown/tooltip/copilot), drag
  e glow de IA/CTA.
- Cada agente só edita arquivos da própria leva; `ui/`, `index.css`, `layout/`
  = orquestrador.

## Fila — telas (ordem de risco)

- [~] **4 Conversas** — lista de conversas: card por linha → linha plana
  (`aaf4ca1`, mesclado, aguardando confirmação ao vivo do Cartógrafo nos 2 temas).
  Ainda falta varrer ao vivo: ChatHeader, MessageInput/composer (mockup mostra
  barra "Sugestão do Copilot" + composer com "Nota interna" + "Enviar"),
  ContactPanel (botões Ver contato/Novo negócio + DADOS já mesclados — confirmar
  ao vivo), MessageList separador de dia, bolhas nos 2 temas.
- [ ] **8 Campanhas** — verificar ao vivo: breadcrumb novo do wizard, Step5
  lista plana, TemplatePreview, TemplatesTab grade 4, CampaignsTab (DataTable),
  CampaignLeadsDrawer, AttributionTab. Abrir "Nova campanha" de verdade.
- [ ] **3 Contatos** — drawer já confirmado ao vivo (botões, DADOS, abas com
  contagem, painel persistente). Falta: ContactsTable vs mockup 1c (colunas,
  chips de situação, densidade), ContactsFiltersBar, modal Configurar colunas
  ao vivo, ContactProfilePage (página cheia, `/contacts/:id`) nos 2 temas.
- [ ] **7 Agentes** — AgentsPage lista, AgentDetail abas (9 reais vs 6 mock =
  `[!]` taxonomia), AgentBuilderWizard (trilha vertical + max-w 720 do Farol),
  AutomationBuilder drawer (contadores no nav). Painel "HOJE" = `[!]`.
- [ ] **1 Primitivos (cobertura profunda)** — o fork só abriu ~8 dos ~61.
  Faltam ao vivo/no código: Modal, ConfirmModal, Drawer, DataTable (header,
  paginação "1-50 de 2.318", seleção), Dropdown, Toast (40px, fundo invertido
  `#1A1F2E` claro / `#ECF1F1` escuro — README), Tooltip, Avatar, Badge,
  SegmentedControl, FormField/Input/Select/Textarea (36px md, erro vermelho +
  mensagem "Informe um e-mail válido"), Switch, Spinner/Skeleton, Banner,
  CollapsibleSection, ContextMenu, TagPicker.
- [ ] **6 Dashboard** — já visto ao vivo (bordas ok). Falta comparar célula a
  célula contra 1b: KpiGrid vs "faixa de KPIs em card único", VolumeChart
  legenda, SalesFunnelCard, TeamMiniCard, "Fila agora" (`[!]` widget diferente).
- [ ] **5 Funis** — DealsBoard ao vivo nos 2 temas (header de coluna 28px com
  border-b-2 na cor da etapa, card 8px/1px/padding 10-12, estados hover/
  seleção/drag), CloseDealReasonModal (título já "Mover para Perdido").
- [ ] **2 Shell** — TopBar 48px, UserMenu (Tema segmentado, ⌘,), NavSidebar
  rail colapsado vs 7a, AiCreditsIndicator no rodapé, nos 2 temas.
- [ ] **12 Conectores** — catálogo, card, modal detalhe, modal credencial ao
  vivo (fork confirmou alta fidelidade lendo; falta o olho).
- [ ] **9 Agendamentos** — grade semanal, popover, lista, nos 2 temas.
- [ ] **10 Configurações** — VerticalSettings "zero cards", rail "Nesta página".
- [ ] **11 Faturamento** — BillingPlan/BillingSettings, tabela 3 colunas em
  uma borda.
- [ ] **0 Fundação** — tokens do tema claro corrigidos (`67819b9`). Falta
  conferir ao vivo o tema ESCURO contra README (fundo/superfície/borda do
  escuro), tipografia Plus Jakarta em todos os pesos, `--text-2xs/3xs`, raio.

## Já verificado ao vivo e batendo (não reabrir sem motivo)

- [x] Drawer de Contatos abre sem travar; botões Conversar/Novo negócio;
  DADOS flat; abas "Negócios N"/"Conversas N"; painel de identidade persiste
  entre abas (bug de `useContactPipelines` duplicado corrigido em `52dcaec`).
- [x] Tema claro: fundo #FAFAFC / superfície #FFFFFF / superfície-2 #F5F6F8 /
  borda #E4E6EC (README l.93) — visto ao vivo em /contacts e /dashboard.
- [x] Dashboard: cards com borda 1px, sem sombra, fundo ≈ página.
- [x] Primitivos corrigidos por mim: EmptyState (sem caixa tracejada, Button
  real), Card (`elevated` = borda + `--sf2`), Tabs (`count`), WizardProgress
  (breadcrumb compacto), DataTable (`--rowhover`).

## Gaps de produto/backend — `[!]` (ficam documentados, não inventar)

- AgentDetail painel "HOJE" (Conversas/Sem humano/Handoffs/CSAT) — sem
  endpoint agregado; agent-server é repo separado. GAPS-PENDENTES 5.3.
- Wizards "Rascunho salvo" — nenhum wizard salva progresso incremental.
- CloseDealReasonModal banner "encerra conversa e pausa automação" — sem
  evidência de backend no frontend.
- Dashboard "Fila agora" — mock é lista por conversa; real é card agregado.
- AgentDetail 9 abas reais vs 6 do mock — taxonomia, decisão de produto.
- Conversas: SegmentedControl Minhas/Fila/Todas como eixo primário; evento de
  sistema inline; "Resumo da IA" beta. (GAPS-PENDENTES 1.x/2.x)
- Contatos: campo Responsável/owner; filtro Meus/Todos; drawer URL `?contact=`.

## Restrição descoberta às 06:02 — limite de sessão do orquestrador

Os forks do orquestrador (Agent tool) compartilham a cota da sessão principal
e caíram com HTTP 429 ("session limit, resets 09:20 America/Sao_Paulo") no
meio da Fase B. **A sessão inteira do orquestrador ficou parada de ~06:02 até
09:20** (3h18 perdidas; retomou sozinha às 09:2x — os commits `527a4e6`…
`1a2c844` são de 09:25–09:30, não de 06:xx como o log abaixo dizia antes da
correção). Desde 09:20 forks voltaram, mas 5 forks pesados (~600k tokens cada)
esgotam a cota em ~10 min: usar poucos, magros, e mandar escrever o arquivo
de saída INCREMENTALMENTE (por região) pra progresso parcial sobreviver. Os 3
terminais Maestri têm cotas próprias e seguem. O orquestrador gasta o próprio orçamento só em: mesclar,
gate, propagar, despachar, atualizar este arquivo, e provas ao vivo decisivas
(poucas). Fase B e C ficam com os agentes; primitivos/index.css continuam
sendo editados só pelo orquestrador, mas o MAPA (B) dos primitivos pode ser
feito por agente (só leitura, reporta ❌).

## Fase A — specs extraídas (todas commitadas no epic)

| Spec | Itens | Fonte |
|---|---|---|
| spec/1a-primitivos.md | 165 | fork |
| spec/1c-contatos.md | 95 | fork — referência tem cabeçalho/filtros/colunas ≠ app (ver cabeçalho) |
| spec/1d-conversas.md | 115 | fork |
| spec/2a-2b-agentes.md | 124 | fork |
| spec/2c-campanhas.md | 81 | fork |
| spec/1e-funis.md | 54 | Farol |
| spec/conectores.md | 94 | Farol |
| spec/1b-dashboard.md | 29 | Bússola |
| spec/shell.md | 30 | Bússola |
| spec/2d-agendamentos.md · 2e-configuracoes.md · 6a-faturamento.md | 61 · 65 · 51 | Cartógrafo — **só PNG+README** (não conseguiu parsear o canvas; precisão menor que as outras — se um item de 2d/2e/6a precisar de valor exato, extrair do HTML via `JSON.parse` do `<script type=__bundler/template>` + `grep -bo` pelo id) |

Divergências entre fontes registradas dentro de cada spec (DISC-*, EMPTY-06,
CARD-08, título 14px vs README 16px, `--acs` escuro). Regra: **HTML do canvas
é a autoridade**; README só onde o HTML não mostra o estado.

## Regra transversal descoberta às 09:45 (aplicada em `src/` fora de contacts/campaigns)

`border-surface-800` / `divide-surface-800` (com ou sem `/NN`) = hairline
INVISÍVEL no claro (surface-800 é a superfície). Hairline é **`surface-700`**
(`--bd`). Sweep mecânico feito no epic em 139 arquivos; dentro de
`contacts/*` e `campaigns/*` os donos aplicam na própria branch de Fase C.
Fundos (`bg-surface-800`, `hover:bg-surface-800/50`) NÃO entram na regra.

## Fase B/C — atribuição atual

| Tela | B (mapa) | C (correção) | Estado |
|---|---|---|---|
| 1a primitivos | **feito** (fork, `1a-primitivos.GAPS.md`: 78 ✅ · 62 ❌ · 23 ❓ · 2 [!]) | orquestrador | C em partes: `527a4e6` (--bd2, superfície, Card, EmptyState, Tabs, WizardProgress), `e0ed622` (Button, DataTable hairlines), parte 3 `b52871c` (FormField, Input, Select, Textarea, Switch, Button paddings/foco/iconOnly), parte 4 `ad5a486` (Modal, Drawer, Banner suave, Badge suave + contador), partes 5-6 (Toast/Tooltip invertidos, Dropdown, SegmentedControl, ErrorState, Avatar mono, CardHeader 13, eyebrow, TYPE-17). **C dos primitivos essencialmente completa.** Sobras: BADGE-01 StageBadge → Cartógrafo (contacts/); TYPE-02 título de página 14 vs 16 → Shell; TYPE-05 corpo 13px vs 14px (`text-sm`) e TOK-08 `--tx3` #9098AA (3.0:1) → **[!] decisão de sistema/AA pro usuário**; FIELD-06 avatar em Select → UserPicker (tela) |
| 1d Conversas | **feito** (Bússola, `1d-conversas.GAPS.md`: 13 ✅ · ~58 ❌ · ~15 ❓ · 3 [!]) | **Cartógrafo — C em curso, 2 pedaços mesclados** (`df1ff86` LIST-16/17/21/27 + PANEL-02/05/11-16 + CHAT-32..41; `075c7bf` CHAT-02/04/13/15/20): item com nome sempre 600 e não-lida só pelo Badge `unread`, etiquetas só pontos, painel com X só no mobile e Dados em grid 82/1fr, composer em 2 partes sem sombra, ChatHeader avatar 32/nome 13.5, bolha 70%. **Orquestrador — CONV-HDR-04..08 mesclado `4c527ce`** (`layout/ConversationsTopBarSlot.tsx`: "N abertas · N pendentes" real, chip "Linha X · conectada" só com linha connected, "Nova conversa" neutral sm; `pageSubtitle` virou ReactNode) + CONV-CHAT-17/28 bolha in com borda `--bd`, sem sombra. Faltam (Cartógrafo): fundo lista/painel em `--sf` nos 2 temas (FRAME-02/04, respondido), ChatHeader com StageBadge, avatar/tile na 1ª bolha do grupo (CHAT-16/21). Decisão de vocabulário: "pendentes" (= abas) em vez de "aguardando" | B ✅ · C ~70% |
| 1b Dashboard | **feito** (fork) | **Farol — C mesclada `f61071c` → `eda220b`** (5 cards em `--sf`/`--bd`/8 sem glow; LiveNowCard sem gradiente; headers 13/14; SalesFunnel faixa --sf2; TeamMini grid). Sobras: TEAM-03 usar `Avatar size="2xs"` (existe em `d9e5abf`); DASH-HEADER-01 usar `useRegisterTopBarSubtitle`; DASH-HEADER-02 readiness positivo [!] até conferir `useWorkspaceReadiness` | C ✅ (sobras pequenas) |
| Shell | **feito** (fork) | **orquestrador — C mesclada `d9e5abf`** (.workspace-shell chapado, TopBar --sf+hairline+subtítulo 12, busca 28/7/--sf2/200, user menu, sidebar 32/6/13 + contador numérico, eyebrow .14em, créditos raio 6 + fundo em repouso). Sobras ❓/[!]: nome do workspace (campo do tenant), largura da busca 200×220, cor do badge (usei tokens do botão primário), atalho ⌘, sem handler (conferir) | C ✅ · **D ✅ claro e escuro** (10:17: rail #0E1414, TopBar --sf + hairline, contador "Conversas 99+" em pílula) |
| 2d/2e/6a | **feito** (fork) | Bússola — **2e C mesclada `80aa4de` → `4a82c71`** (scroll-spy no SettingsOutline, 4 eyebrows sem mudar rota, hairlines, sem cards no Vocabulário); 2d em andamento; 6a na fila | 2e C ✅ |
| 2c Campanhas · Conectores | feito | **Farol — 2c C mesclada `a73de2b` → `2db2385`**; **Bússola — conectores C mesclada `25649b7` → `aa8103b`** (~20/27; CONN-CARD-05 aguarda ela consumir `--connector-tile-border-mix`) | C ✅ |
| 1c Contatos | **feito** (fork, `1c-contatos.GAPS.md`, 95/95 + bloco "fora da referência") | **Cartógrafo — C mesclada `2c88e11` → `1d9ec6e`** (tabela sem card, colunas da referência, filtros em linha única, drawer kebab + link, identidade `flat`, DealsTab tabela). Sobras: CONT-HDR-09 subtítulo "N contatos" via `useRegisterTopBarSubtitle`; TABLE-06/07 checkbox custom ❓; bloco "fora da referência" = decisão do usuário | C ✅ · **D ✅ claro** (10:25) |
| 2c Campanhas | **feito** (fork, `2c-campanhas.GAPS.md`, 83 itens + notas Step1–4) | Farol (após B de 1e/conn) | B ✅ |
| 2a/2b Agentes | **feito** (Bússola) | **Farol — C mesclada `7f01299`** (AgentDetail corpo 2 colunas 1fr/320: grupos 200/1fr com hairline, rail único --sf2; abas neutras; lista hairline edge-to-edge; wizard trilha nos tokens, header 52/8 segmentos, sem card no formulário) **+ `4188b01` → `7b1cd7e`**: footer 64px sob o formulário com Voltar/Continuar/Publicar (AGT-WIZ-24..26; rail só marca+ensino+trilha), TEAM-03 Avatar 2xs, DASH-HEADER-01 subtítulo "Terça, 15 set · atualizado há Ns" (tick 5s) e duplicata removida do slot de ações. Farol → itens de card de 1e Funis (DEAL-CARD-06/07/12/13, DEAL-COL-19; reatribuídos do Cartógrafo). [!]: painel HOJE, aba Comportamento pós-criação, 9 vs 6 abas, CSAT | C ✅ |
| 1e Funis | Farol | Cartógrafo | B em andamento |
| Conectores | Farol | Bússola | B em andamento |
| 1b Dashboard · Shell | — | Farol · orquestrador | aguarda B |
| 2d/2e/6a | — | Bússola | aguarda A do Cartógrafo |

## Log da noite

- 05:50 — arquivo criado. Conversas lista plana mesclada (`aaf4ca1` + `712ba02`).
- 05:55 — Fase A disparada: 5 forks + 3 agentes (cruzado). Specs 1a/1c/1d/2a-2b/2c chegam entre 06:00 e 06:08 (`b5a3131`, `d1dafa6`).
- 06:00 — Fase C nos primitivos contra a spec 1a (`527a4e6`): descoberta e corrigida a inversão 900/800 do tema claro feita mais cedo (`67819b9`); EmptyState e Card `elevated` voltaram pro que a referência mostra (a reauditoria anterior tinha lido errado). Suite 617/621 após atualizar Tabs.test ao contrato TABS-03.
- 14:56 — **Farol `a245470` mesclado** (1e card do negócio: DEAL-CARD-06 linha de contato sob o título, 12/13 avatar do responsável 18px raio 30% com tracejado quando sem dono; [!] DEAL-CARD-07 tags — Deal/contact sem campo — e DEAL-COL-19 "+N" — truncar esconderia negócios reais sem "carregar mais"; 2 asserções de DealsBoard.process.test atualizadas de propósito; suite 617/621). **Cartógrafo `a5c4191` mesclado (`b0c06fe`)**: FRAME-02/04 lista/painel em surface-800 nos 2 temas, StageBadge no ChatHeader, avatar/tile 24px na 1ª bolha do grupo (CHAT-16/21), cauda corrigida. **Orquestrador `efc315b`**: Avatar ganhou `size` 30/36/44 (px da spec 1d) e iniciais 700 → Cartógrafo aplica em ChatHeader/ConversationItem/ContactPanel. [!] restantes de 1d: SegmentedControl Minhas/Fila/Todas, barra "Sugestão do Copilot" (sem fonte de dado); chip de ator único mantido por racional escrito. **Os 3 agentes agora em Fase D estática** (reconferir GAPS linha a linha contra o código, valor exato por arquivo:linha) enquanto o navegador está sem sessão.
- 14:48 — Suite completa no epic (disparada 14:33): **617/621, baseline**. **Farol `4188b01` mesclado (`7b1cd7e`)**: footer do wizard + TEAM-03 + DASH-HEADER-01 → Farol reatribuído aos itens de card de 1e Funis (Cartógrafo fica só em 1d). **Cartógrafo 2 pedaços de 1d mesclados** (`df1ff86`, `075c7bf`); respondido: lista/painel em `--sf` nos 2 temas (spec FRAME-02/04), comentário antigo do `.conv-surface` estava errado (corrigido). **Orquestrador `4c527ce`**: CONV-HDR-04..08 (contagens/chip de linha/Nova conversa via slot em `layout/`) + bolha inbound com borda em vez de sombra (CHAT-17/28); tsc limpo, lint sem erro novo (5 = 3+2 baseline), 18 testes de layout/chat verdes. Artifact do usuário atualizado (v2, 14:35). **BLOQUEIO Fase D**: a sessão do Chrome em :3011 caiu pro /login (token expirou); a Bússola não digita credencial por regra e o meu classificador de permissões negou a senha no `form_input` — não contornei. Fase D por navegador fica parada até o usuário logar (`admin@test.local`); Bússola reconfere os 4 GAPS contra o código enquanto isso. Memória 2,0 GB.
- 14:33 — **6a Faturamento (Bússola) mesclada** (`9a09165`): banner de ativação, chips "Avaliação · N dias"/"Renova em N dias" (planResetsAt), /mês inline, barra com %, coluna atual --sf2, Recomendado suave; SCHED-HEADER-02 fechado com o hook. **Fila da Bússola concluída** (conectores/2e/2d/6a) → Fase D por estilos computados das 4 telas. Suite completa disparada (memória 1,8 GB).
- 14:30 — **1e Funis (Cartógrafo) mesclada** (`c25c877`): DealsBoard gap 10/coluna 250/contagem e soma no cabeçalho/arraste 95%/chip IA âmbar; CloseDealReasonModal Cancelar neutral + verbo "Mover para X". Fila dele: 1d Conversas (agora) → DEAL-CARD-06/07/12/13 + DEAL-COL-19 (dado existente = reestilo). [!] mantidos: coluna terminal (COL-22..26), Kanban/Lista/Previsão (COL-07..11). CONT-HDR-09 fechado (`d1b95a9`).
- 14:25 — **Segunda parada geral 10:28 → 14:20**: orquestrador E os 3 terminais bateram as cotas próprias (Farol avisou 94% às 10:2x; reset 14:20). Retomada 14:22: 2a/2b Agentes (Farol) mesclada `7f01299`; CONT-HDR-09 subtítulo "N contatos" (Cartógrafo, `d1b95a9`) mesclado. Em curso: Farol footer do wizard + sobras do Dashboard; Cartógrafo 1e Funis (testes escopados rodando); Bússola 6a + subtítulo de Agendamentos. Memória 650 MB; janela do Chrome com largura 0 de novo (Fase D só por estilos computados até voltar).
- 10:26 — **2d Agendamentos (Bússola) mesclada** (`7a418b3` → `1793b9e`: popover, grade). Bússola → 6a Faturamento. Farol em 2a/2b (AgentBuilderWizard sem card em volta do formulário, AGT-WIZ-27); Cartógrafo em 1e (DealsBoard).
- 10:22 — **1c Contatos (Cartógrafo) mesclada** (`2c88e11`+sweep → `1d9ec6e`): tabela sem card, colunas/ordem da referência (extras só off por padrão), filtros em linha única, drawer com kebab/abas com link, painel de identidade `flat`, DealsTab em tabela. DataTable th 30px/11/600 sem uppercase + tabular-nums e Tabs pb 9px (`4d34ed1`). Suite completa no epic: 617/621 (baseline). Cartógrafo → 1e Funis.
- 10:05 — Fase C mesclada: 1b Dashboard (Farol), Conectores + 2e Configurações (Bússola), Shell (orquestrador `d9e5abf`), primitivos partes 5-6 (`43df2d2`), slot de subtítulo dinâmico (`e392820`). **D ✅ Shell claro** ao vivo. Farol → 2a/2b; Bússola → 2d → 6a; Cartógrafo em 1c (depois 1e → 1d). Cartógrafo travou uma vez num prompt de ação destrutiva — respondido "No" + instrução de nunca descartar (o epic é fast-forwardado na branch dele a cada ciclo).
- 09:55 — **Farol: Fase C de 2c Campanhas mesclada (`a73de2b` → `2db2385`)**, suite 617/621; Step1–4 também no vocabulário novo. Farol → C de 1b Dashboard. Primitivos parte 4 (`ad5a486`: Modal/Drawer/Banner suave/Badge suave) e parte 5 em gate (Toast/Tooltip invertidos com tokens `--toast/--toasttx`, Dropdown 30px/raio 5/atalho, SegmentedControl sem sombra). Memória do host ~400 MB: agentes instruídos a não rodar suite em paralelo.
- 09:50 — Fase B completa (só 2a/2b pendente, Bússola). Fase C primitivos parte 2 (`e0ed622`: Button, DataTable) + sweep de hairlines em 139 arquivos (`d0b520b`). **Fase D ✅ TABLE-02/03 (claro)** ao vivo em /contacts: hairlines de linha/cabeçalho visíveis de novo. Filas de C despachadas: Cartógrafo 1c→1e→1d; Farol 2c→1b→2a/2b; Bússola conectores→2e→2d→6a. Suite condicionada a memória > 1,5 GB.
- 09:31 — Farol entregou B de 1e+conectores (`660f48d`, mesclado) e já está na C de 2c; Cartógrafo abriu `fix/SCRUM-1097-fase-c-contatos`; Bússola na B de 1d. Forks de volta: 3 magros lançados pra B de 1a, 1b+shell, 2d/2e/6a. Memória 530 MB — sem suite do orquestrador agora.
- 09:30 (log anterior dizia 06:10) — **Fase D ✅ TOK-01..04 (claro)** ao vivo em /dashboard: página #FAFAFC, cards brancos por cima com hairline — relação fundo/superfície da spec; antes do `527a4e6` os cards saíam mais cinzas que a página (invertido). Escuro intacto. Specs 2d/2e/6a mescladas (`d488064`), Cartógrafo → Fase C de 1c.
- 06:02 — 5 forks de Fase B morrem por 429; **sessão do orquestrador parada até 09:20** (limite da sessão até 09:20). 2 deixaram arquivo (1c, 2c). Fase B redistribuída: Farol → 1e+conectores (em curso), Bússola → 1d (+1c se o arquivo do fork estiver incompleto). Specs de Farol (`36aaa3b`) e Bússola (`678b867`) mescladas; epic em `b59c70e`, propagado.
