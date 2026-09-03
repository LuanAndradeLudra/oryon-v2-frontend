# F7 — Criar funil com tipo e template; gate da UI pelo flag (SCRUM-816) · Verificação

Evidências da execução da F7 em 2026-08-28, branch `story/SCRUM-816-criar-funil-tipo-gate-ff` (a partir de `epic/SCRUM-809-funis-modelo-b` = `SCRUM-104` + gate SCRUM-498 + hotfix, `39c9f72`), subtarefas SCRUM-863..868. Implementa a **prancheta 1 · Novo funil** do canvas e consome os contratos da F1 (`backend/docs/pipelines-modelo.md` §4.2: `kind`, `terminalLabels`, templates, `POST /settings/pipelines` com `stages[]`). Primeira história de **frontend** da rodada.

## O que mudou

| Sub | Entrega |
|---|---|
| 863 | **Absorvida pela SCRUM-498** (commit `ae08947`, PR #41): `AuthContext` já expõe `featureFlags` de `GET /auth/me` na sessão (`AuthSession.featureFlags`), hidratação best-effort após login/register/activate, `multiPipelineEnabled()` + `useMultiPipeline()`. Nenhuma mudança nesta história. |
| 864 | **Auditoria** (tabela abaixo): toda superfície de múltiplos funis está atrás de `useMultiPipeline()` — direta ou pelo pai que a renderiza. Sem o flag: comportamento de funil único, nenhuma chamada de pipeline/roteamento/board, nunca 403 pela UI. Nenhuma superfície nova sem gate nesta história (o modal e o empty state só existem dentro do bloco gateado da `ContactsPage`). |
| 865 | **`CreatePipelineModal`** reescrito (prancheta 1): Nome · **Tipo** (dois cards, Vendas/Processo, `role=radio`) · **Etapas** (select de modelo filtrado por tipo, vindo de `GET /settings/pipelines/templates` em uma chamada). Trocar o tipo troca o vocabulário inteiro (modelo padrão + terminais do novo tipo). Chama `POST /settings/pipelines` com `kind` + `stages[]` (a `key` fica com o backend). Edição (`editPipeline`) mantém só nome/cor com o tipo **travado** (imutável, F1). Backend sem `/templates` (anterior ao épico) → rascunho mínimo do tipo, ainda criável. |
| 866 | **`createPipelineForm.ts`** (lógica pura): rascunho de etapas com papéis `normal/won/lost`; **terminais fixos e renomeáveis** (`removeStage` em terminal é no-op; `renameStage` vale para qualquer papel); `addNormalStage` insere antes dos terminais; reordenação por drag só das normais (`useDragReorder`); `createBlocker` (nome → ≥1 normal → nenhum rótulo vazio) alimenta o botão desabilitado + hint; `toCreatePipelineDto` monta o payload na ordem canônica. Cor da etapa por clique no ponto (rodízio de 6 cores) — sem picker dentro da linha. |
| 867 | Criar funil **abre o board direto** (`fetchPipelines(created.id)` seleciona o funil; a lista já vem com `stages` embutidas → zero chamadas extras de estágio). O redirect da SCRUM-293 para o editor de estágios e os estados `crmConfigInitialTab/PipelineId` saíram. **`DealsBoard`** ganha `onAddContact` + `itemNoun`: sem nenhum card (dados carregados, CTA fornecido) mostra o `EmptyState` "Nenhum negócio/registro neste funil ainda" com **"Adicionar contato ao funil"** (abre `NewContactDrawer`, que já recebe `defaultPipelineId={selectedPipelineId}`), mantendo as colunas visíveis. |
| 868 | **`PipelineStagesManager`**: chips e tooltips dos terminais por tipo (`terminalLabels` do backend, fallback por `kind`), badge do tipo ao lado do select de funil; "não remover o último terminal" já existia e agora fala o vocabulário certo. **`PipelineStageModal`** recebe `terminalLabels` (opções Normal / Concluído / Cancelado em processo). Tema: só tokens (`surface-*`, `brand-*`, `color-chip`) — o claro vem de `[data-theme="light"]` sem override. |

### Auditoria do gate (SCRUM-864)

| Superfície | Onde | Gate |
|---|---|---|
| Segmentado de funis, "Novo funil", menu do funil, board (`DealsBoard`), callout/strip de roteamento, faceta comercial | `ContactsPage` | `multiPipeline` — `selectedPipelineId` é `null` sem o flag; `fetchPipelines`/roteamento viram no-op; `useKanbanDeals(null)` não busca |
| "Mover para funil" (menu do card) | `DealsBoard` ← `pipelines` | pai gateado; sem flag `pipelines = []` → menu não aparece |
| Aba "Estágios do funil" do drawer Configurar | `CRMConfigDrawer` | `useMultiPipeline` (aba some; `initialTab` inválido cai em `stages`) |
| Seções CRM › Estágios do funil / Roteamento por canal | `SettingsLayout` (`MULTI_PIPELINE_SECTIONS`) + `SettingsPage` | nav esconde; URL direta → `Navigate` para a 1ª seção visível |
| `PipelineStagesSettings`/`PipelineStagesManager`/`PipelineRoutingSettings` | Configurações | alcançáveis só pelas seções acima (gate no pai) |
| Campo Funil em Novo contato / Importar / Novo negócio | `NewContactDrawer`, `ImportContactsDrawer`, `DealModal` | `useMultiPipeline` (SCRUM-498 `0a80fa8`) |
| Coluna Negócios, cabeçalhos por funil na ficha/painel, indicador na conversa | `ContactsTable`/`ContactRow`, `DealsTab`, `ContactPanelDeals`, `ConversationDealIndicator` | `useMultiPipeline` (SCRUM-498 `321aac6`, `507fc62`) |
| Cache de funis | `CRMConfigContext` | `loadPipelines`/`refetchPipelines` no-op sem o flag |
| Modal "Novo funil" e empty state do board (novos nesta história) | `ContactsPage` | dentro do bloco `multiPipeline` |

## Testes automatizados (vitest + Testing Library)

| Suite | Cobre | Casos |
|---|---|---|
| `createPipelineForm.test.ts` | modelo → rascunho; modelo padrão por tipo; fallback sem `/templates`; terminais fixos (remoção no-op) e renomeáveis; adicionar antes dos terminais com rodízio de cor; reordenação só das normais; `createBlocker` nas 3 condições; payload `kind + stages[]` sem `key` | 9 |
| `CreatePipelineModal.test.tsx` | abre em Vendas com o modelo padrão (1 chamada a `/templates`); trocar para Processo → modelo Suporte, terminais Concluído/Cancelado, só modelos de processo, terminais sem botão de remover; **critério** "Suporte (Processo, modelo Suporte)" → `kind=process` + 5 etapas com `isWon`/`isLost` certos; **critério** sem etapa normal → botão desabilitado com hint, "adicionar etapa" reabilita; terminal renomeado vai no payload; **critério** erro do backend aparece no formulário e o modal fica aberto; `/templates` 404 → rascunho mínimo; edição: só nome/cor, tipo travado, sem buscar modelos | 8 |
| `DealsBoard.test.tsx` | 5 colunas + empty state com CTA (chama `onAddContact`); "negócio" por padrão × "registro"; sem empty state durante loading / com card / sem CTA | 3 |
| Suíte completa | regressão | **139/141** — as 2 falhas são pré-existentes: `DesktopRecommendedBanner.test.tsx` (falha também na base do épico, conferido) e `smoke.test.tsx` (timeout só sob carga da suíte completa; passa isolado). Base: 121; +20 |

`tsc -b --noEmit` limpo · `eslint` sem avisos novos nos arquivos tocados (pré-existentes na base: `currentUser` em `ContactsPage`, `customFields` em `api.ts`).

## Critérios de aceite da história

| Critério | Estado |
|---|---|
| Criar "Suporte" (Processo, modelo Suporte) → board abre com 5 colunas, terminais "Concluído"/"Cancelado", zero chamadas extras de estágio | ✅ teste do modal (payload) + teste do board (5 colunas + empty state) + `handleCreatePipeline` usa a lista já com `stages` |
| Tentar criar sem etapa normal → botão desabilitado com hint; erro do backend aparece no formulário | ✅ testes do modal |
| Tenant sem `FF_MULTI_PIPELINE` não vê nenhuma superfície de funis e cria contato/negócio normalmente | ✅ auditoria acima + testes da SCRUM-498 (`featureFlags.test.ts`, `SettingsLayout.test.ts`) |
| Tema claro e escuro conferidos | ⚠️ **não conferido no browser nesta rodada** (mesma pendência da SCRUM-498: o backend local está com `FF_MULTI_PIPELINE` do Hub Test desligado). Os componentes novos usam só tokens temáticos; a conferência visual fica registrada como pendência para a homologação da SCRUM-104/F12. |

## Decisões de implementação registradas

- **Tipo antes de tudo**: trocar o card de tipo descarta edições nas etapas do tipo anterior (modelo padrão + terminais do novo tipo). É o comportamento da prancheta ("decide vocabulário, campos e terminais").
- **Terminais sempre presentes, nunca removíveis, sempre renomeáveis** (I2 na UI, espelhando o backend). O usuário não escolhe "qual etapa é Ganho".
- **`key` das etapas fica com o backend** (derivada do rótulo, F1-825) — o modal não inventa slug.
- **Cor da etapa**: ponto clicável com rodízio de 6 cores em vez do `ColorPicker` de 12 swatches por linha (largura). Cor completa continua no editor de estágios.
- **Compat com backend anterior ao épico**: `Pipeline.kind`/`terminalLabels` são opcionais no tipo; `pipelineKindOf`/`terminalLabelsOf` assumem `sales`/Ganho-Perdido; `/templates` 404 → rascunho mínimo.
- **Empty state mantém as colunas** (o usuário vê as etapas que acabou de montar) e o CTA reaproveita `NewContactDrawer` com `defaultPipelineId` — "Adicionar ao funil" completo (conversa, ficha, tabela, conflito) é a F9 (SCRUM-818).
- **SCRUM-863 é registro, não código**: já entregue pelo gate SCRUM-498 (#41), agora dentro do épico via fast-forward.

## Fora do escopo (registrado)

- Vocabulário por tipo no board/cards (valor só em venda, origem/ator no card, terminais) — F8 (SCRUM-817).
- `NewContactDrawer`/`ImportContactsDrawer` ainda chamam `POST /deals` por conta própria; `pipelineId` no `POST /contacts` — F9 (SCRUM-818).
- Descrição do funil como "critério de entrada" do Judge (§4.11) no modal — F6b/Fatia 2.
- Conferência visual claro/escuro no browser — homologação.
