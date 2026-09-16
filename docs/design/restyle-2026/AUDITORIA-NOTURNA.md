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

## Log da noite

- 05:50 — arquivo criado. Conversas lista plana mesclada (`aaf4ca1` + `712ba02`).
