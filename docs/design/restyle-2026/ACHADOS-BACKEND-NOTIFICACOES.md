# Achados do backend — produtores de notificação (SCRUM-1097)

Levantamento só de leitura em `backend/src/modules` (nada foi editado no backend). Método: `grep -rn --include=*.ts` por chamadas a `create(` / `createOrAppend(` / `createOrIncrement(` do `NotificationsService`, mais uma busca por `link:`. Achou **16 produtores** que cobrem os **14 tipos**. A varredura por `link:` pegou um produtor que a busca por chamada em uma linha só perdeu (`conversations.service.ts:3887`, chamada quebrada em várias linhas). Migrations e specs ficaram de fora.

Rotas conferidas em `src/App.tsx` (frontend): existem `/conversations` (lê `?id=`), `/team` (lê `?channel=` e `?message=` desde `4bb28bf`), `/automations` (lê `?automation=`), `/contacts/:id`, `/settings/:section`. **Não existem** `/team-chat` nem `/campaigns/:id`; `/campaigns` só lê `?tab=` (ver "Dependências do frontend").

## 1. Produtores: arquivo:linha → tipo → link atual → link correto

Linha = a da chamada `create/createOrAppend/createOrIncrement`. Caminhos relativos a `backend/src/modules/`.

| # | arquivo:linha | tipo | link atual | link correto | situação |
|---|---|---|---|---|---|
| 1 | `auth/auth.service.ts:113` | `security_alert` | `/settings/account` | igual | ok |
| 2 | `automations/automations.processor.ts:390` | `automation_executed` | `/automations` | `/automations?automation=${automation.id}` | perde o id |
| 3 | `automations/automations.processor.ts:866` | `automation_note` | `/contacts/${contact.id}` (l. 826) | `/automations?automation=${autoId}` | aponta para o contato, não para a automação |
| 4 | `campaigns/campaigns.processor.ts:356` | `campaign_complete` | `/campaigns/${campaignId}` (l. 361) | `/campaigns?report=${campaignId}` | rota inexistente |
| 5 | `campaigns/campaigns.processor.ts:388` | `campaign_failed` (crash no meio) | `/campaigns/${campaignId}` (l. 392) | `/campaigns?report=${campaignId}` | rota inexistente |
| 6 | `campaigns/campaigns.processor.ts:511` | `campaign_failed` (`markFailed`) | `/campaigns/${campaign.id}` (l. 515) | `/campaigns?report=${campaign.id}` | rota inexistente |
| 7 | `conversations/conversations.service.ts:1288` | `conversation_assigned` | `/conversations?id=${conv.id}` | igual | ok |
| 8 | `conversations/conversations.service.ts:1344` | `conversation_transferred` | `/conversations?id=${conv.id}` | igual | ok |
| 9 | `conversations/conversations.service.ts:2308` | `new_message` (agrupada) | `/conversations?id=${conv.id}` | igual | ok |
| 10 | `conversations/conversations.service.ts:2694` | `agent_handoff` (regra de palavras-chave) | `/conversations?id=${conv.id}` | igual | ok |
| 11 | `conversations/conversations.service.ts:3529` | `agent_ai_response` | `/conversations?id=${conv.id}` | igual | ok |
| 12 | `conversations/conversations.service.ts:3887` | `agent_handoff` (guarda de IA / verificação) | `/conversations?id=${conv.id}` (l. 3894) | igual | ok |
| 13 | `integration-events/integration-events.service.ts:137` | `whatsapp_integration_error` | `/settings/numbers` | igual | ok |
| 14 | `internal-chat/internal-chat.service.ts:272` | `mention` | `/team-chat?channel=${channelId}&message=${saved.id}` (l. 276) | `/team?channel=${channelId}&message=${saved.id}` | rota inexistente |
| 15 | `internal-chat/internal-chat.service.ts:289` | `team_message` (agrupada) | `/team-chat?channel=${channelId}` (l. 293) | `/team?channel=${channelId}` | rota inexistente |
| 16 | `notifications/sla-watcher.scheduler.ts:129` | `conversation_waiting` (agrupada) | `/conversations?id=${conv.id}` (l. 133) | igual | ok |

Resumo: **5 produtores com rota inexistente** (#4, #5, #6, #14, #15), **2 com parâmetro perdido ou errado** (#2, #3), **9 corretos**. O frontend ganhou uma correção em `notificationsUx.ts` (`68037b4`) para a ação inline; o `n.link` que vem do servidor continua chegando quebrado até o backend mudar (o Maestro normaliza no `TopBar`).

## 2. Metadados por produtor

"Top-level" = chave direta em `metadata`. Todos os grupos (`createOrAppend`) acrescentam `contacts[]` (`{id,name,phone}`, máx. `MAX_CONTACTS`) e `affectedCount`; os `createOrIncrement` acrescentam `count` e `previews[{id,text}]` (texto cortado em 200).

| # | tipo | metadata emitido | o que **não** existe |
|---|---|---|---|
| 1 | `security_alert` | `context`, `subtype` (`new_device`/`password_changed`/tentativas), `ip`, `userAgent`, `...extra` | — |
| 2 | `automation_executed` | `context`, `automationId`, `automationName`, `automationType`, `actionsExecuted[]`, `source`, `sourceLabel`, `sourceActor`, `trigger{type,label}` + `contacts[]`, `affectedCount` | `totalContacts` (o equivalente é `affectedCount`); `contactName` top-level (o contato só vem em `contacts[0]`) |
| 3 | `automation_note` | `context`, `automationId`, `automationName`, `conversationId`, `userNote`, `source`, `sourceLabel`, `sourceActor`, `trigger`, `notifyScope` + `contacts[]`, `affectedCount` | `contactName` top-level; a chave `note` que o frontend lê não existe (é `userNote`) |
| 4 | `campaign_complete` | `campaignId`, `campaignName`, `stats{sent,failed,total}` | `sent`, `failed`, `totalContacts` **top-level** (estão dentro de `stats`) |
| 5 | `campaign_failed` (crash) | `context:'campaign_crash'`, `campaignId`, `campaignName`, `reason`, `sent`, `failed`, `totalContacts` | — |
| 6 | `campaign_failed` (`markFailed`) | `context:'campaign_failure'`, `campaignId`, `campaignName`, `reason` | `sent`, `failed`, `totalContacts` |
| 7 | `conversation_assigned` | **nenhum metadata** | `conversationId`, `contactId`, `contactName`, quem atribuiu |
| 8 | `conversation_transferred` | **nenhum metadata** | `conversationId`, `contactName`, quem transferiu (`currentUserId` está no escopo da função) |
| 9 | `new_message` | `context`, `conversationId`, `contactId`, `contactName`, `contactPhone` + `count`, `previews[]` | nome da linha WhatsApp |
| 10 | `agent_handoff` (regra) | **nenhum metadata** | `conversationId`, `contactName`, motivo estruturado (só em `description`) |
| 11 | `agent_ai_response` | **nenhum metadata** | `conversationId`, `contactName` |
| 12 | `agent_handoff` (guarda) | **nenhum metadata** | `conversationId`, `contactName`, motivo estruturado (só em `description`) |
| 13 | `whatsapp_integration_error` | `context`, `integration`, `severity`, `code`, `...input.metadata` (variável por origem) | — (formato aberto) |
| 14 | `mention` | `context`, `channelId`, `channelName`, `messageId`, `mentionedBy{id,name}` | `sourceActor` (o autor está em `mentionedBy.name`) |
| 15 | `team_message` | `context`, `channelId`, `channelName`, `lastSenderId`, `lastSenderName` + `count`, `previews[]` (`"Autor: texto"`) | `sourceActor` (o autor está em `lastSenderName`); `messageId` (só nos `previews[].id`) |
| 16 | `conversation_waiting` | `context`, `conversationId`, `waitingMinutes`, `lastMessagePreview`, `thresholdMinutes` + `contacts[0]`, `affectedCount` | `contactName` top-level (vem em `contacts[0]`) |

## 3. O que isso significa para `notificationSentence.ts`

`sentenceFor` foi escrito supondo `contactName`, `channelName`, `campaignName`, `automationName`, `sent`/`failed`/`totalContacts` e `sourceActor`. Cruzando com a tabela acima:

| chave que a frase lê | onde existe de fato | onde falta |
|---|---|---|
| `contactName` | `new_message` (top-level); `contacts[0].name` nos agrupados (`automation_*`, `conversation_waiting`) | `conversation_assigned`, `conversation_transferred`, `agent_handoff`, `agent_ai_response` (sem metadata algum → a frase cai no `title`) |
| `channelName` | só `team_message` e `mention` | nenhuma notificação de conversa traz o nome da linha; o `context` dessas frases fica vazio |
| `campaignName` | `campaign_complete`, `campaign_failed` (os 3 produtores) | — |
| `automationName` | `automation_executed`, `automation_note` | — |
| `sent` / `failed` | `campaign_failed` crash (top-level) | `campaign_complete` (estão em `stats.sent`/`stats.failed`, então a frase mostra "Concluída" e nunca as falhas); `campaign_failed` via `markFailed` |
| `totalContacts` | `campaign_failed` crash | `automation_executed` (existe `affectedCount`, não `totalContacts`) |
| `sourceActor` | só `automation_executed` / `automation_note` | `team_message` e `mention` (o autor vem em `lastSenderName` e `mentionedBy.name`) — hoje a frase cai em `object: n.title` nesses dois tipos |
| `userNote` | `automation_note` | — (a chave `note` que a frase também tenta não existe) |

Ajustes possíveis **só no frontend**, sem esperar backend:
- `campaign_complete`: ler `stats.sent`/`stats.failed`/`stats.total` além do top-level.
- `team_message`: usar `lastSenderName` como ator; `mention`: usar `mentionedBy.name`.
- `automation_executed`: usar `affectedCount` no lugar de `totalContacts`.
- `automation_note`: remover a leitura de `note`.
- `NotificationMetaKnown` (`useNotifications.ts`) não declara `stats`, `messageId`, `mentionedBy`, `lastSenderName`, `reason`, `count`, `previews`, `subtype`, `ip`.

Ajustes que exigem **backend** (não feitos):
- Adicionar metadata em `conversation_assigned`, `conversation_transferred`, `agent_handoff` (2 produtores) e `agent_ai_response`: no mínimo `conversationId`, `contactId`, `contactName`. Sem isso o `inlineActionFor` do frontend devolve `null` para os três primeiros (ele lê `meta.conversationId`) e a frase cai no título. Para atribuição/transferência incluir também `sourceActor` (quem fez).
- Trocar os links dos produtores #2–#6, #14 e #15 conforme a tabela 1.
- Opcional: promover `sent`/`failed`/`total` de `stats` para o top-level em `campaign_complete`, ou manter e o frontend passa a ler `stats`.

## 4. Dependências do frontend para os links propostos

| link proposto | estado no frontend |
|---|---|
| `/team?channel=…&message=…` | pronto (`4bb28bf`) |
| `/automations?automation=…` | pronto (`AutomationsPage` já consome e limpa o param) |
| `/campaigns?report=<id>` | **não existe**: `CampaignsPage` só lê `?tab=` e o relatório abre por `useState` em `CampaignsTab`. Enquanto isso não for implementado, o backend deve manter o link mais próximo que resolve (`/campaigns`) ou o frontend precisa ganhar o param antes da troca |

## 5. Limites deste levantamento

- Só leitura estática; não executei o backend nem confirmei valores reais no banco.
- `input.metadata` em `integration-events.service.ts` é aberto: o conjunto de chaves de `whatsapp_integration_error` depende de quem chama `reportIntegrationEvent` (não mapeei os chamadores).
- Não conferi a migration `1730000000035-EnrichNotificationsMetadata` (backfill de metadados em notificações antigas) — linhas antigas podem ter formato diferente.
