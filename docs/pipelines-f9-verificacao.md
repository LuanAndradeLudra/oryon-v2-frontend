# F9 — "Adicionar ao funil" na conversa, ficha e tabela + modal de conflito; funil opcional ao criar/importar (SCRUM-818) · Verificação

Evidências da execução da F9 em 2026-08-28, branch `story/SCRUM-818-adicionar-ao-funil-conflito` (a partir do épico `3815794`, já com F7 + F8), subtarefas SCRUM-874..879. Implementa as **pranchetas 3 · Adicionar ao funil** e **4 · Conflito** sobre §4.3 (`enter` → `conflict`) e §4.9 (drawers). Companheiro no backend: `oryonsolutions/oryon-platform` **PR #52** (`story/SCRUM-818-adicionar-ao-funil-backend`, a partir do épico).

## O que mudou

| Sub | Repo | Entrega |
|---|---|---|
| 874 / 877 | backend | `POST /deals` aceita **`originConversationId`** (uuid, opcional) e o repassa ao `enter` da porta única — o registro nasce **ligado à conversa** (passo 1 da precedência do alvo da IA, §4.7). O **409 de conflito** (I1) devolve `{ message, code: 'open_exists', openDealId, pipelineId }` — a UI abre o modal de conflito sem segunda consulta; a mensagem continua a mesma. |
| 879 | frontend | `useToast`/`Toast` ganham **ação opcional** (`{ label, onClick }`, 6 s): "Ver no board" navega para `/contacts?pipeline=<id>`. |
| 876 | frontend | **`AddToPipelineMenu`**: dropdown "Adicionar ao funil ▾" com os funis ativos e o **ícone do tipo**; funis em que o contato já tem registro aberto aparecem **desabilitados com "já está · <etapa>"** (registros abertos por `GET /deals?contactId=` ao abrir, ou por prop). Rodapé explica onde o registro nasce em processo. Só existe com o flag. |
| 877 | frontend | **`PipelineConflictModal`** (prancheta 4): resumo do registro existente (etapa, tempo na etapa, quem abriu) e **três saídas** — abrir o existente (default) · mover para a 1ª etapa · fechar como Cancelado/Perdido e abrir novo (pede motivo). Confirmar só com o registro carregado. |
| 874 | frontend | **`useAddToPipeline`** (fluxo compartilhado): funil de **processo** → `POST /deals` na hora, com `originConversationId` quando vem da conversa; funil de **venda** → abre o `DealModal` com o funil pré-selecionado e a conversa de origem (valor/itens opcionais); `409 open_exists` → modal de conflito: *abrir* navega ao board, *mover* chama `PATCH /deals/:id/stage` (1ª etapa normal), *fechar e abrir novo* reaproveita o `CloseDealReasonModal` (motivo do catálogo) → `PATCH /deals/:id/status` + novo `POST /deals`. Sucesso → toast com "Ver no board". **`ChatHeader`**: botão ao lado do status (desktop). `DealModal` ganha `initialPipelineId`, `originConversationId` e `onConflict`. |
| 875 | frontend | Mesma ação no **cabeçalho da ficha** (`ContactProfileHeader`, ao lado de "Conversar") e no **menu da linha da tabela** (`ContactRow`: submenu "Adicionar ao funil" com ícone do tipo; "já está · etapa" pelo resumo por funil `dealsSummary.byPipeline`, que agora tipa `stageKey/stageLabel` da F4-848). `ContactsPage` recarrega tabela e badges ao criar. |
| 878 | frontend | `NewContactDrawer` e `ImportContactsDrawer`: campo **"Funil" opcional** (default "— nenhum —"; pré-seleciona só quando o chamador está dentro de um funil); quando preenchido, `pipelineId`/`pipelineStageId` vão no payload de `POST /contacts` e o backend faz o `enter` **na mesma transação** (F2-836; importação = `origin=import`). O frontend **deixa de chamar `POST /deals`** por conta própria; a validação "Funil é obrigatório" saiu; o botão de importar não depende mais do funil. Falha do funil desfaz o contato e cai na mensagem de erro do drawer. |

## Testes automatizados

### frontend (vitest + Testing Library)

| Suite | Cobre | Casos |
|---|---|---|
| `AddToPipelineMenu.test.tsx` | funis ativos com tipo, fetch dos abertos ao abrir, `onPick`; "já está · etapa" desabilitado (registro fechado não conta); abertos por prop (sem fetch) e texto do rodapé; nada sem o flag | 4 |
| `PipelineConflictModal.test.tsx` | resumo (etapa, tempo, quem abriu), default "abrir o existente", as três saídas e rótulos do botão; loading sem confirmar | 3 |
| `useAddToPipeline.test.tsx` | **critério** processo pela conversa → `POST /deals` com `originConversationId` + toast "Ver no board" (navega); ficha/tabela sem conversa; **critério** 409 → modal com o existente → abrir navega; mover → `PATCH /deals/:id/stage` 1ª etapa; fechar e abrir novo → motivo → `setStatus lost` + novo `POST`; venda → `DealModal` com funil pré-selecionado (sem POST direto); erro comum → toast de erro | 7 |
| `Toast.action.test.tsx` | botão da ação executa e dispensa; sem ação não renderiza; `showToast` aceita o 3º argumento | 3 |
| F7/F8 (regressão) | 35 | 35 |
| Suíte completa | regressão | **170/173** — `DesktopRecommendedBanner` (pré-existente, falha também na base) e os 2 do `smoke.test.tsx` (timeout só sob carga da suíte completa; **2/2 isolado**). F8: 156; +17 |

`tsc -b --noEmit` limpo · `eslint` sem avisos novos nos arquivos tocados (pré-existentes: `currentUser`/`customFields`, `_opts`/`\[`/`err` em `ImportContactsDrawer`, `err: any` em `NewContactDrawer`, `setState` no efeito de `Toast.tsx`, `useCallback(showToast)` em `useToast.ts`).

### backend (jest)

| Suite | Cobre | Casos |
|---|---|---|
| `deals.service.create.spec.ts` | `originConversationId` chega ao `enter`; corpo do 409 com `code/openDealId/pipelineId` e mensagem inalterada | +2 |
| Suíte completa | regressão | **588/588** (épico após F5+F6+F8: 586) |

## Critérios de aceite da história

| Critério | Estado |
|---|---|
| Adicionar a "Suporte" pela conversa cria o card em "Novo chamado" ligado à conversa (`originConversationId`) e o chip aparece no cabeçalho sem reload | ✅ `POST /deals` com `originConversationId` (teste do hook + backend); o chip (`ConversationDealIndicator`) já reage a `deal:changed` (o backend publica `deal.created` pós-commit, F3) |
| Segunda tentativa no mesmo funil abre o modal de conflito; cada uma das três saídas produz o estado esperado no board | ✅ testes do hook (navegar · `PATCH stage` 1ª etapa · `setStatus lost` com motivo + novo `POST`) |
| Criar contato sem funil não cria nenhum deal; com funil, cria um — e falha do funil não deixa contato órfão de mensagem de erro | ✅ drawers só mandam `pipelineId` quando escolhido (sem `POST /deals`); com funil, `enter` na mesma transação do backend (F2-836: rejeição desfaz o contato) e o erro cai na mensagem do drawer. Cobertura: backend `contacts.service.create-pipeline.spec.ts` (F2); os drawers não têm spec na base (registrado) |

## Decisões de implementação registradas

- **Um fluxo, três lugares**: `useAddToPipeline` concentra criação / `DealModal` em venda / conflito / toast; cada superfície só renderiza `dialogs` e chama `requestAdd`.
- **Processo cria na hora; venda abre o modal** — como a história pede; o `DealModal` recebe `initialPipelineId`/`originConversationId` e devolve o conflito ao chamador (`onConflict`) em vez de mostrar só texto.
- **"Abrir o registro existente" = abrir o board do funil** (`/contacts?pipeline=`), onde o card está visível e editável; não há tela própria de registro.
- **"Fechar e abrir novo"** reaproveita o `CloseDealReasonModal` da F8 (motivo do catálogo, I5) e usa a etapa `isLost` do funil.
- **409 estruturado no backend** (`code/openDealId/pipelineId`) em vez de uma segunda consulta na UI; mensagem preservada para chamadores antigos.
- **Funil opcional nos drawers com default "nenhum"** (história); o CTA "Adicionar contato ao funil" do board (F7) continua pré-selecionando o funil em vista.
- Menu da tabela usa o **resumo por funil** já carregado (`dealsSummary.byPipeline`) para "já está"; conversa e ficha fazem 1 `GET /deals?contactId=` ao abrir o menu.
- Mobile: o botão da conversa fica escondido em telas pequenas (cabeçalho compacto); ficha e tabela cobrem o caso.

## Fora do escopo (registrado)

- Chips "Funil · Etapa" na tabela e seção Funis na ficha — F11 (SCRUM-820).
- Resolver a conversa com desfecho — F10 (SCRUM-819).
- Specs dos drawers (`NewContactDrawer`/`ImportContactsDrawer`) — não existiam na base; a regra do payload está no backend (F2).
- Conferência visual claro/escuro no browser — homologação (mesma pendência das F7/F8).
