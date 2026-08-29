# F10 — Resolver a conversa com desfecho do registro (SCRUM-819) · Verificação

Evidências da execução da F10 em 2026-08-29, branch `story/SCRUM-819-resolver-com-desfecho` (empilhada na F9 `f265734`; PR #47 da F9 ainda aberto), subtarefas SCRUM-880..883. Implementa a **prancheta 5 · Resolver com desfecho** sobre §4.7-Conversas (`resolve` com `dealOutcome`, F5-853) e o requisito R3. Companheiro no backend: `oryonsolutions/oryon-platform` **PR #53** (`amountCents` direto no `PATCH /deals/:id`, empilhado no #52).

## O que mudou

| Sub | Entrega |
|---|---|
| 881 | `src/lib/resolveOutcome.ts` — lógica pura: opções por tipo (venda: *Fechou · Não fechou · Sem decisão*; processo: *Concluiu · Não concluiu · Sem decisão*), motivos do catálogo por desfecho (vêm no envelope do alvo; sem catálogo → "Outro"), valor só em **venda + fechou** (`parseBrlToCents`: "129", "129,90", "R$ 1.290,50"), `buildResolvePayload` → `{ dealOutcome?, amountCents? }` (valor igual ao atual não gera PATCH). |
| 882 | `conversationsApi.updateStatus(id, status, dealOutcome?)` · `useConversations.updateStatus` · `ChatWindow`/`ConversationsPage` repassam `dealOutcome` (toast "Conversa resolvida · desfecho registrado ✓") · `dealsApi.conversationTarget(conversationId)` = `GET /deals/ai/stages` (F6) — **a mesma precedência que o backend usa ao fechar** (§4.7: conversa de origem → campanha única → `no_target`) · hook **`useResolveWithOutcome`**: sem flag ou `no_target` (ou erro na consulta) → resolve exatamente como hoje, **nenhuma chamada a `/deals`**; com alvo → abre o popover; "Só resolver"/"Sem decisão" → resolve **sem** `dealOutcome` (registro segue aberto); com desfecho → (venda, valor novo) `PATCH /deals/:id {amountCents}` → `PATCH /conversations/:id/status {status:'resolved', dealOutcome}` → evento local `oryon:deals-invalidate`. |
| 880 | `ResolveOutcomePanel`/`ResolveOutcomePopover` (`ChatWindow/ResolveOutcomePopover.tsx`): resumo "X está em <funil> · <etapa>", radiogroup com as 3 saídas (default *Fechou*), motivo (`Select` do catálogo; motivo único já vem escolhido), valor pré-preenchido com o atual, observação, botões **Cancelar · Só resolver · Resolver e marcar <Ganho/Perdido | Concluído/Cancelado>**. `ChatHeader`: escolher "Resolvidas" chama `requestResolve()` em vez de `onStatusChange('resolved')`; gatilho fica `disabled/aria-busy` enquanto consulta o alvo. |
| 883 | Desktop = painel ancorado sob o status (`role=dialog`, scrim); mobile = `BottomSheet` (tall). Teclado: foco na 1ª opção ao abrir, setas nos radios nativos, `Esc` fecha. `ConversationDealIndicator` ganha `conversationId`: o registro **desta conversa** continua como chip depois de fechado — etapa terminal + ícone ✓/✕ (`lib/dealIndicator.ts`), e recarrega no evento local antes do socket `deal:changed`. |

## Testes automatizados

| Suite | Cobre | Casos |
|---|---|---|
| `lib/resolveOutcome.test.ts` | opções/rótulos por tipo · motivos por desfecho e fallback · valor só em venda+fechou · parse BRL · payload (sem decisão, motivo obrigatório, valor novo, valor igual, inválido, processo ignora valor) | 5 |
| `hooks/useResolveWithOutcome.test.tsx` | sem flag → resolve direto sem consultar · `no_target` → como hoje · erro na consulta → como hoje · alvo venda: valor atual, confirmar grava valor + resolve com desfecho + evento · "só resolver" sem `dealOutcome` e sem PATCH (processo não busca valor) | 5 |
| `ChatWindow/ResolveOutcomePopover.test.tsx` | **critério** Fechou · valor · observação → `{won, fechou, note, amountCents}` · **critério** Não fechou · Preço → `{lost, preco}` (exige motivo, sem valor) · Sem decisão / Só resolver → `{}` · vocabulário de processo · erro da API inline + Esc · popover: sem alvo nada, desktop dialog, mobile sheet | 7 |
| `ChatWindow/ConversationDealIndicator.test.tsx` | `pickIndicatorDeals` (abertos sempre; fechados só desta conversa) · chip fechado com ícone após o evento local | 2 |
| Suíte completa | regressão | **189/192** — as mesmas 3 da base: `DesktopRecommendedBanner` (pré-existente) e 2 do `smoke.test.tsx` (timeout só sob carga; **2/2 isolado**). F9: 170; **+19** |

`tsc -b --noEmit` limpo · `eslint` sem avisos nos arquivos da F10 (baseline intocado: `onTransfer`/`Date.now()` em `ChatWindow`, `CURRENT_USER`/`totalUnread`/`syncActive` em `ConversationsPage`).

### backend (PR #53)

`UpdateDealDto.amountCents?` aplicado em `update()` só sem `lineItems`; specs +2 (`deals.service.spec.ts`); suíte **595/595**.

## Critérios de aceite da história

| Critério | Estado |
|---|---|
| Resolver com "Fechou · Adesão ao plano Família · R$ 129/mês" → `deal.won` publicado, card em Ganho, contato movido pela automação seedada | ✅ UI → `PATCH /deals/:id {amountCents:12900}` + `PATCH status {resolved, dealOutcome:{won, fechou, note}}`; o backend fecha pela porta única **antes** de resolver e publica `deal.won` pós-commit (F3/F5-853); seed 100 (`deal.won` → `move_stage(cliente)`, só `pipelineKind=sales`) já existe (F5-854). Teste do popover + hook |
| Resolver com "Não fechou · Preço" → `deal.lost` com motivo | ✅ teste do popover (`{lost, preco}`); backend valida o motivo pelo catálogo do tipo (I5) e devolve 400 sem resolver se inválido — erro aparece inline |
| Resolver conversa sem deal aberto → nenhuma chamada a `/deals` | ✅ teste do hook (`no_target` → resolve como hoje; só a consulta do alvo é feita, e nem essa sem o flag) |
| Acessível por teclado; mobile (BottomSheet) coberto | ✅ foco inicial, radios nativos (setas), `Esc`; `BottomSheet` no mobile (teste do popover) — conferência visual no browser pendente |

## Decisões de implementação registradas

- **Alvo pelo envelope da IA** (`GET /deals/ai/stages?conversationId`): é o mesmo `resolveTarget` que o `PATCH status` usa — o popover nunca mostra um registro diferente do que o backend fecharia. Custo: 1 GET ao escolher "Resolvida" (+1 `GET /deals/:id` em venda, para o valor atual).
- **"Só resolver" sempre disponível**, mesmo com "Fechou" marcado — a história pede os dois botões; "Sem decisão" só esconde motivo/valor.
- **Valor via `PATCH /deals/:id {amountCents}`** (PR #53), não via `dealOutcome`: o contrato da F5 não muda e a porta única continua sem saber de valor.
- **Vocabulário por tipo** no popover (Fechou/Concluiu) e terminais do funil nos botões — nada de "Ganho" fixo em processo.
- **Chip fechado só para o registro desta conversa** (`originConversationId`), para o cabeçalho não acumular histórico de outros atendimentos.
- Evento local `oryon:deals-invalidate` para o chip atualizar no mesmo clique; o socket `deal:changed` segue como fonte para as outras telas.

## Fora do escopo (registrado)

- Conferência visual claro/escuro e do BottomSheet no dispositivo — homologação (mesma pendência das F7–F9).
- Motivo/valor ao resolver conversas de funil de processo sem catálogo do tipo (backend antigo) — cai no fallback "Outro".
