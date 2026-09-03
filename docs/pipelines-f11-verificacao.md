# F11 — Visão consolidada: chips Funil · Etapa na tabela e seção Funis na ficha; Roteamento sai do menu (SCRUM-820) · Verificação

Evidências da execução da F11 em 2026-08-29, branch `story/SCRUM-820-visao-consolidada` (a partir do épico `018ab9c`, já com F7–F10), subtarefas SCRUM-884..888. Implementa as **pranchetas 6 · Tabela** e **7 · Ficha** sobre §4.5 (`byPipeline` com `stageKey/stageLabel`, F4) e a decisão (b). Companheiro no backend: `oryonsolutions/oryon-platform` **PR #54** (`story/SCRUM-820-visao-consolidada-backend`, a partir do épico).

## O que mudou

| Sub | Entrega |
|---|---|
| 884 | Tabela: coluna **"Negócios" → "Funis"**. `DealsSummaryChips` (compartilhado com a lista mobile) vira um chip **`● Funil · Etapa`** por registro **aberto** (I1: um por funil), com o ícone do tipo; clique abre o board (`/contacts?pipeline=<id>`). Sem registro aberto: chip tracejado **"nenhum aberto"**. Lê só o `dealsSummary` já carregado em lote — `lib/contactPipelines.ts: openPipelineChips`. A coluna "Fase" (`contacts.stage`) continua separada. |
| 885 | Ficha (desktop: topo da coluna esquerda, abaixo do cabeçalho; mobile: topo do "Resumo"): **`ContactPipelinesSection`** — "Funis · N abertos", um **stepper** por registro aberto (etapas normais; feitas / atual com anel / a fazer), linha de contexto "há X na etapa · movido por <humano/IA/automação/campanha> · origem <Manual/Campanha · nome/…>", ações **"Mover ▾"** (etapas normais → `PATCH /deals/:id/stage`; terminais → `CloseDealReasonModal` com motivo do catálogo → `PATCH /deals/:id/status`) e **"Ver no board"**. Recarrega no evento local `oryon:deals-invalidate` e no socket `deal:changed`. A aba "Negócios" segue para itens/valor de `sales`. |
| 886 | Passagens fechadas: linha compacta `✓/✕ Funil · Terminal · fechado há X · motivo` com **"ver histórico"** → `GET /deals/:id/history` → lista "Novo → Em atendimento · IA · há 3 dias". |
| 887 | `ConversationDealIndicator` **não chama mais `GET /settings/pipeline-routing`** — só `CRMConfigContext` + 1 `GET /deals?contactId=`; o destaque passa a ser o **registro que nasceu nesta conversa** (`originConversationId`, `data-origin`), não o funil roteado da linha. |
| 888 | Configurações → CRM: **"Roteamento por canal" sai do menu** (`NavItem.hidden`); a rota `/settings/pipeline-routing` continua existindo e gateada pelo flag (`MULTI_PIPELINE_SECTIONS` inalterado) até a remoção física. **"Estágios do funil" já mostra o tipo** desde a F7-868 (`pipeline-kind-badge`) — nada a fazer. |

### backend (PR #54)

- `GET /deals?contactId=` devolve `BoardDeal[]` — mesmo `enrichBoardRows` do board (`stageEnteredAt`, `lastMovedByKind/ActorName`, `originLabel`); campos só se somam ao contrato.
- **`GET /deals/:id/history`** — passagens em ordem, com `fromStageLabel/toStageLabel` resolvidos; mesma checagem de escopo do `findOne`.

## Testes automatizados

### frontend (vitest + Testing Library)

| Suite | Cobre | Casos |
|---|---|---|
| `lib/contactPipelines.test.ts` | chips por registro aberto (tipo e etapa; fechado não vira chip) · stepper aberto/fechado · ordenação · "movido por" · alvos do "Mover" | 5 |
| `contacts/DealsSummaryChips.test.tsx` | **critério** 2 funis → 2 chips com ícone do tipo; clique abre o board certo · sem aberto → "nenhum aberto" | 2 |
| `profile/ContactPipelinesSection.test.tsx` | **critério** 2 funis → 2 steppers, "2 abertos", etapa atual, quem moveu, origem, linha dos fechados · Mover normal → `PATCH stage` + recarrega; Ver no board · Mover terminal → modal de motivo → `setStatus` · ver histórico → `GET /deals/:id/history` · nada sem o flag | 5 |
| `ChatWindow/ConversationDealIndicator.test.tsx` | +1: destaque = registro desta conversa, sem consultar roteamento | 1 |
| `settings/SettingsLayout.test.ts` | ajustado: roteamento fora do menu; `MULTI_PIPELINE_SECTIONS` ainda o gateia | (6) |
| Suíte completa | regressão | **202/205** — as mesmas 3 da base: `DesktopRecommendedBanner` (pré-existente) e 2 do `smoke.test.tsx` (timeout só sob carga; **2/2 isolado**). F10: 189; **+13** |

`tsc -b --noEmit` limpo · `eslint` sem avisos novos (baseline intocado: `react-refresh/only-export-components` em `SettingsLayout`, `setState` no efeito de `ContactProfilePage:194`, `customFields` em `api.ts`).

### backend (jest)

`deals.service.spec.ts` +2 (enriquecimento por contato; histórico com rótulos) · deals 128/128 · suíte completa **597/597**.

## Critérios de aceite da história

| Critério | Estado |
|---|---|
| Contato em 2 funis mostra 2 chips na tabela e 2 steppers na ficha; clicar no chip abre o board certo | ✅ testes de `DealsSummaryChips` e `ContactPipelinesSection` (`navigate('/contacts?pipeline=v')`) |
| Nenhuma chamada a `/settings/pipeline-routing` na navegação normal | ✅ único leitor fora da tela de roteamento era o `ConversationDealIndicator` (removido; teste sem o mock). Só `PipelineRoutingSettings` (rota oculta) ainda chama |
| Menu sem "Roteamento por canal"; a rota direta ainda abre | ✅ `visibleSettingsNav` filtra `hidden`; `SettingsPage` mantém a seção mapeada; teste ajustado |
| Performance: 50 contatos = 1 chamada a `/deals/summary` | ✅ os chips não fazem fetch — leem o `dealsSummary` do lote (`useContacts`, inalterado). A ficha faz 1 `GET /deals?contactId=` (por contato aberto) |

## Decisões de implementação registradas

- **Um chip por registro aberto**, não por funil com histórico — o chip é "onde está agora"; passagens fechadas ficam na ficha.
- **Clique no chip vai ao board** (história), não mais ao painel/aba Negócios; a prop `onOpenDeals` ficou como compat (não usada pelos chips).
- **Stepper só com etapas normais** para registro aberto; fechado mostra todas feitas + o terminal — evita dois terminais competindo no mesmo stepper.
- **"Mover ▾" reaproveita as regras do board**: terminal sempre pede motivo (`CloseDealReasonModal`, I5) — sem atalho para fechar sem motivo pela ficha.
- **Enriquecimento no backend, não no cliente**: `findAllByContact` usa o mesmo `enrichBoardRows` (2 `find` por lote) em vez de N chamadas de histórico na ficha.
- **Roteamento só sai do menu** (Modelo B decisão b: "congela agora, remove depois"); rota e gate preservados para não quebrar links salvos.

## Fora do escopo (registrado)

- Remoção física de `pipeline_channel_routing` (rota/tela/API) — quando o backend a apagar.
- Conferência visual (claro/escuro, mobile) — homologação (F12), como nas F7–F10.
- Painel lateral do contato (`ContactDetailPanel`, quick-view) não ganhou a seção Funis — a história fala da ficha (`/contacts/:id`); o quick-view continua com a aba "Negócios".
