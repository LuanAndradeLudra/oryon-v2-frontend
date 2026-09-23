# Achados — API de contatos × segmentos do mockup (Direção A, decisão #33)

Auditoria **só por leitura** (23/09), sem editar telas nem backend. Fontes:
`backend/src/modules/contacts/{contacts.controller,contacts.service}.ts`,
`backend/src/modules/conversations/{conversations.controller,conversations.service,entities/*}.ts`,
`frontend/src/services/api.ts` (`contactsApi`), `src/hooks/useContacts.ts`, `src/types/index.ts`.
Nada foi testado ao vivo — as afirmações abaixo são do código.

## 1. Veredito por segmento

| Segmento | Só com a API atual? | Query / caminho | O que falta |
|---|---|---|---|
| **Todas** | **Sim** | `GET /contacts?sortBy=lastContactedAt&sortDir=desc&page=1&limit=50` → `{data,total,page,limit}` | Ver §5 (contatos sem `lastContactedAt` vêm **primeiro** em DESC). |
| **Quentes** | **Sim** (por intenção) | `GET /contacts?intent=high&sortBy=leadScore&sortDir=desc` (o `total` é o contador da aba) | Faixa por score (`≥ 80`) **não existe** no servidor — ver §3. Definição de "quente" é decisão do PO: `intent=high` funciona hoje; `leadScore ≥ X` exige param novo. |
| **Novos hoje** | **Sim, com ressalva** (client-side) | `GET /contacts?sortBy=createdAt&sortDir=desc&limit=100`, filtrar no cliente `createdAt >= meia-noite local` | Sem filtro de data no servidor: contador exato só enquanto houver < 100 novos no dia (senão "99+"). Param novo `createdFrom` resolve limpo. |
| **Meus** | **Não** (na API de contatos) | — | Contato **não tem responsável**. Responsável mora em `conversations.assignedUserId` (por conversa/linha) e em `deals.ownerUserId`. `GET /contacts` não filtra nem devolve nenhum dos dois. Caminho alternativo com a API atual: `GET /conversations?assignedTo=me&limit=100` (o `contact` vem embutido) — lista por **conversa**, não por contato. Fiel: param novo `assignedTo=me|<uuid>|unassigned` em `/contacts`. |
| **Sem resposta** | **Parcial** (via conversas) | `GET /conversations?awaitingReply=true` (server: `lastAgentReplyAt IS NULL OR lastAgentReplyAt < lastMessageAt`, status ≠ resolved/abandoned) | Regra **frouxa**: `lastAgentReplyAt` só marca resposta de **humano**. Conversa em que a IA (ou uma campanha/template) foi a última a falar conta como "sem resposta". O critério fiel é `lastMessageSenderKind = 'client'` — **não é filtrável** hoje. Em `/contacts` não existe nada disso. |

Contadores das abas: cada aba precisa do seu `total`. Para as baseadas em `/contacts` (Todas, Quentes, Novos hoje)
é 1 request `limit=1` cada; para as baseadas em `/conversations`, o `total` é de **conversas** (um contato com 2
linhas conta 2 — a constraint única é `(tenantId, contactId, whatsappNumberId)`).

## 2. O que `GET /contacts` aceita e devolve hoje

Controller (`contacts.controller.ts`, `list`) → `ContactsService.findAll`. **Filtros aceitos:**

| Param | Semântica no servidor |
|---|---|
| `search` | `ILIKE` em `name`, `phone`, `email`, `company` |
| `stage` | lista separada por vírgula → `c.stage IN (...)` (string livre por tenant) |
| `intent` | igualdade (`low`/`medium`/`high`/`unknown`) — **um valor só** |
| `sentiment` | igualdade em `aiSentiment` |
| `source` | igualdade |
| `tagId` | vírgula → `contact_tags` **ou** `conversation_tags` (OR) |
| `optIn` | `'true'` / outro = false |
| `commercial` | `no_deal` \| `open_deal` \| `customer` (via `DealReadModel.applyCommercialFacet`) |
| `sortBy` | só `displayName`, `leadScore`, `lastContactedAt`, `createdAt` (default `createdAt`) — qualquer outro vira `createdAt` |
| `sortDir` | `asc` \| resto = `desc` |
| `page`/`limit` | `limit` máx. 100 (default 50); resposta `{data,total,page,limit}` |

**Escopo por papel:** AGENT/SUPERVISOR só veem contatos com ao menos uma conversa numa linha WhatsApp do próprio
departamento (`resolveAllowedWhatsappIds`) — o mesmo segmento tem contagens diferentes por papel.

**Não existe:** filtro por responsável/dono, por faixa de `leadScore`, por data (`createdAt`/`lastContactedAt`),
por direção da última mensagem, por linha WhatsApp, por sem-resposta.

**Payload por contato:** `id, waId, displayName, phone, email, company, jobTitle, industry, city, state, country,
profilePicUrl, stage, leadScore, intent, source, optIn, optInUpdatedAt, aiSummary/aiSentiment/aiPainPoints/
aiInterests/aiObjections/aiNextBestAction/aiLastInteractionSummary/aiUpdatedAt, conversationCount, lastContactedAt,
firstContactedAt, lastSeenAt, createdAt, tags[], customFields[]`.
**Não vem:** texto/direção da última mensagem, responsável, linha WhatsApp, valor de negócios (este último o front
busca à parte em `dealsApi.summary`, em lote).

## 3. Achado: dois filtros da tela atual são no-op (filtro fingido)

`ContactFilters` (`src/types/index.ts`) declara `leadScoreBand` ("interpretada no backend: high≥80…") e
`lastContact` (`24h|7d|30d|none`, "interpretada no backend a partir de lastContactedAt"), e
`ContactsFiltersBar.tsx` (linhas ~410 e ~416) tem os selects **"Lead score"** e **"Atividade"**. O `contactsApi.list`
os manda em `params` (`...filters`), mas o controller **não lê nenhum dos dois** (`grep leadScoreBand|lastContact`
em `backend/src` = 0 ocorrências) e o front também não filtra no cliente (só aparecem na barra e no tipo). Ou seja:
**escolher esses filtros hoje não muda a lista**, mas o chip aparece como ativo. Pela regra "nada fingido", ou entram
no backend (é justamente o param que "Quentes" e um "Sem contato há X" pedem) ou saem da barra.

## 4. Última mensagem, direção, responsável — onde existe

| Dado da 2ª linha / do lado direito | `GET /contacts` | Onde existe hoje |
|---|---|---|
| Texto da última mensagem | **não** | `conversations.lastMessagePreview` (cortado em 100 chars, texto como gravado — não verifiquei como mídia/template aparecem). `GET /conversations` devolve; `GET /contacts/:id/conversations` também. |
| Direção / quem falou | **não** | `conversations.lastMessageSenderKind` = `client` \| `operator` \| `ai` \| `campaign`. Só `GET /conversations` devolve; `/contacts/:id/conversations` **não** inclui. Dá para derivar o prefixo do mockup: `operator`→"Você:", `ai`→"Agente IA:", `campaign`→template, `client`→sem prefixo. |
| Quando | `lastContactedAt` (**sim**) | Toca em toda mensagem in/out (`touchContactInteraction`); é o contato inteiro, não por linha. `conversations.lastMessageAt` por linha. |
| Linha WhatsApp ("Linha 2") | **não** | `conversations.whatsappNumberId` + `whatsappNumber.label/displayPhoneNumber` em `GET /conversations`. **Um contato tem uma conversa por linha** — "a linha" do contato é ambígua se ele fala em duas. |
| Responsável (nome) | **não** | `conversations.assignedUserId` → `assignedUser {id, firstName, lastName, email, role}` em `GET /conversations`; `GET /contacts/:id/stats` devolve o nome do responsável (de qualquer conversa com assignee). Também `deals.ownerUserId`. |
| Responsável (avatar) | **não existe** | `users` **não tem campo de avatar** (grep em `user.entity.ts` = 0). O "AL" do mockup é só iniciais — o primitivo `Avatar` com iniciais cobre; foto não. |
| Situação (chip) | `stage` (**sim**) | String livre por tenant (`tenant stages`), já usada pelo `StageBadge`. |
| Não lidas | **não** | `conversations.unreadCount` (por conversa). |

Para a **lista** o gargalo é um só: nenhum desses campos vem em `/contacts`. Buscar por contato seria N+1
(`/contacts/:id/conversations` × 50) e ainda assim sem `lastMessageSenderKind`/responsável/linha — **não recomendo**.

## 5. Pegadinhas que afetam a lista

1. **`ORDER BY lastContactedAt DESC` põe NULL primeiro** (Postgres, `NULLS FIRST` por padrão em DESC; o
   `qb.orderBy(orderCol, orderDir)` do service não passa `NULLS LAST`). Contatos importados/criados sem conversa
   (`lastContactedAt = NULL`) apareceriam **no topo** de "ordenado por última interação". Precisa de `NULLS LAST`
   (1 linha no service) ou tratar no cliente. Não confirmei quantos NULL existem em dados reais.
2. **Contato com N conversas** (uma por linha): "última mensagem" precisa escolher a conversa de maior
   `lastMessageAt`; "responsável" pode divergir entre linhas.
3. **`lastContactedAt` ≠ última mensagem do cliente**: é qualquer interação (inclusive envio de campanha/IA).
   "Sem resposta há 2 h" do mockup precisa de `lastMessageSenderKind`/`lastMessageAt`, não desse campo.
4. `lastAgentReplyAt` é **só humano** (`conversations.service`, comentário em ~3184) — base do `awaitingReply` atual.
5. Segmentos por conversa contam conversas, não pessoas (ver §1).

## 6. Menor mudança de backend que sustenta o mockup inteiro (proposta — nada implementado)

Em `ContactsService.findAll` / `contacts.controller.ts`, no mesmo padrão dos batches de tags que já existem:

1. **Enriquecer cada contato** com `lastConversation: { id, lastMessageAt, lastMessagePreview, lastMessageSenderKind,
   unreadCount, whatsappNumberId, whatsappLabel, assignedUser: {id, firstName, lastName} | null }` — a conversa de
   maior `lastMessageAt` do contato (um `DISTINCT ON ("contactId") ... ORDER BY "lastMessageAt" DESC` em lote pelos
   ids da página). Resolve 2ª linha, direção, "quando", linha e responsável de uma vez.
2. **Filtros novos** (todos opcionais, tolerantes como os atuais): `assignedTo=me|unassigned|<uuid>` (EXISTS em
   `conversations.assignedUserId`, espelhando `conversations.service` ~830); `awaitingReply=true` (EXISTS conversa com
   `lastMessageSenderKind='client'` e status aberto — fiel, ao contrário do critério atual); `createdFrom=<ISO>`;
   `leadScoreMin=<n>` (ou passar a honrar o `leadScoreBand` que o front já manda).
3. `NULLS LAST` na ordenação por `lastContactedAt`.

## 7. O que dá para entregar hoje, sem backend

- **Sim:** aba Todas (com `total`), Quentes = `intent=high`, Novos hoje (client-side, exato até 99/dia); chip de
  situação (`stage`), quando (`lastContactedAt`), etiquetas, valor de negócios (`dealsApi.summary`, já em lote).
- **Não (não aparece, pela regra "nada fingido"):** 2ª linha com texto/direção da última mensagem, "Linha N",
  responsável na linha, abas **Meus** e **Sem resposta** fiéis.
- **Alternativa parcial para Meus / Sem resposta:** trocar a fonte para `/conversations` (`assignedTo=me` /
  `awaitingReply=true`), que já traz preview, `lastMessageSenderKind`, `assignedUser`, `whatsappNumber` e o
  `contact` embutido — porém a lista passa a ser **por conversa** (mesma pessoa pode repetir por linha) e as
  contagens são de conversas. Dá para uma primeira versão, com a ressalva do critério frouxo de "sem resposta".
