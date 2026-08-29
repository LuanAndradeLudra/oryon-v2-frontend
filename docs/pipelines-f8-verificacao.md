# F8 — Board por tipo de funil (SCRUM-817) · Verificação

Evidências da execução da F8 em 2026-08-28, branch `story/SCRUM-817-board-por-tipo` (sobre a F7 `d46f722`, PR #45 ainda aberto), subtarefas SCRUM-869..873. Implementa a **prancheta 2 · Board de processo — Confirmação de consulta** sobre os contratos §4.2 (`kind`, `origin`) e §4.4 (socket = projeção de `deal.*`). Companheiro no backend: `oryonsolutions/oryon-platform` **PR #51** (`story/SCRUM-817-board-por-tipo-backend`, a partir do épico).

## O que mudou

| Sub | Repo | Entrega |
|---|---|---|
| 870 | backend | `GET /deals?pipelineId=` (`findByPipeline`) devolve `BoardDeal`: `contact.phone`, **`stageEnteredAt`** (último movimento do histórico; fallback `updatedAt`/`createdAt`, o mesmo do read-model F4), **`lastMovedByKind` / `lastMovedByActorName`**, **`originLabel`** (nome da campanha quando `originKind='campaign'`). Duas consultas por lote (histórico DESC → 1º por `dealId`; campanhas por id), pulando a de campanha quando não há linha de campanha. `Campaign` no `forFeature` do `DealsModule`. |
| 870 | frontend | `lib/dealCard.ts` (puro): `originInfo` (campanha · evento · automação · IA · manual · importação, com ícone e nome da campanha), `movedByChip` (`IA` / `auto` / nada para humano; fallback por `createdByKind` em backend anterior), `timeInStage` ("3 h na etapa", "2 dias na etapa", "fechado há 2 h"), `boardStats` (abertos · concluídos hoje · cancelados), `entrySources` (origens presentes no board). Tipos `Deal.originKind/originId/originLabel/closeReason/closeNote/stageEnteredAt/lastMovedByKind/lastMovedByActorName`, `contact.phone`. |
| 869 | frontend | `DealsBoard` ganha `pipeline` e lê `kind`: em **processo** o card mostra o **contato como título** (`ProcessCardBody`), esconde valor do card e total da coluna, terminais e "Nenhum registro" no vocabulário do tipo (`terminalLabels`); em **venda** renderiza exatamente como antes (título, valor, chips ganho/perdido, linha do contato). |
| 870 | frontend | Card de processo: chip de origem (ícone + rótulo), selo de quem moveu (`IA` / `auto`), tempo na etapa (relógio) e telefone — tudo do próprio `Deal` do board, nenhuma chamada por card. |
| 871 | frontend | Strip do funil: chip do **tipo**, frase por tipo ("Um registro por contato por passagem. Sem valor, sem produtos." × "Negócios com valor…"), **Entradas** (origens presentes: "campanha Confirmação, manual…") e contagem **"N abertos · M concluídos hoje · K cancelados"** (+ R$ só em venda). "Alimentado por: linha X" saiu e a página **não busca mais** roteamento/linhas WhatsApp (`pipeline_channel_routing` congelada, decisão b). |
| 872 | frontend | Segmentado de funis mostra o **ícone do tipo** (alvo = venda, ciclo = processo) ao lado do ponto de cor. **`CloseDealReasonModal`**: mover um registro de **processo** para um terminal abre o mini-modal — motivo do catálogo do funil (`pipeline.closeReasons`, filtrado pelo desfecho da etapa; `outro` vale para os dois), observação opcional; confirma via `PATCH /deals/:id/status` com `closeReason`/`closeNote` (F2, I5) e recarrega board + badges. Sem motivo, o botão fica desabilitado. Venda continua como antes (arrastar para Ganho/Perdido fecha com o compat `outro`) até a F10. |
| 873 | frontend | `DealModal` em funil de processo: sem seção de itens nem total ("Registro de processo — sem valor nem produtos"), `lineItems: []` no envio, título pré-preenchido com o contato (`contactName` ou `GET /contacts/:id`), título do modal "Novo registro". |

## Testes automatizados

### frontend (vitest + Testing Library)

| Suite | Cobre | Casos |
|---|---|---|
| `lib/dealCard.test.ts` | origem por tipo e fallback; selo IA/auto/humano; duração PT-BR; tempo na etapa (aberto × fechado × sem dado); contagens do strip; entradas sem repetição | 6 |
| `DealsBoard.process.test.tsx` | **processo**: contato como título, nenhum `R$` no DOM, terminais Concluído/Cancelado, origem + IA + tempo + telefone, "ver" abre o contato; selo `auto` × humano; registro fechado "fechado há …"; **venda** (regressão): título, valor, total, ganho/perdido, linha do contato; sem `pipeline` = venda | 5 |
| `CloseDealReasonModal.test.tsx` | terminal Ganho lista só won/any, confirmar desabilitado sem motivo, envia `outcome+reason+note`; terminal Perdido lista lost/any com botão de perigo; erro do backend no formulário; funil sem catálogo → "Outro" | 4 |
| F7 (regressão) | `createPipelineForm` 9 · `CreatePipelineModal` 8 · `DealsBoard` 3 | 20 |
| Suíte completa | regressão | **154/156** — as 2 falhas são as pré-existentes (`DesktopRecommendedBanner` falha também na base; `smoke` timeout só sob carga). F7: 141; +15 |

`tsc -b --noEmit` limpo · `eslint` sem avisos novos (pré-existentes: `currentUser` em `ContactsPage`, `customFields` em `api.ts`, diretiva não usada em `DealModal` linha ~97 da base).

### backend (jest)

| Suite | Cobre | Casos |
|---|---|---|
| `deals.service.spec.ts › findByPipeline` | enriquecimento (telefone, `stageEnteredAt`/`lastMovedBy*` do último movimento, `originLabel` da campanha; fallback `updatedAt` e contato sem nome → telefone); pula o lookup de campanha sem linha de campanha | +2 |
| Suíte completa | regressão | **568/568** (base do épico: 566) |

## Critérios de aceite da história

| Critério | Estado |
|---|---|
| Funil `sales` renderiza exatamente como hoje (regressão visual) | ✅ teste de regressão do board (título, valor, total, chips, linha do contato) — o card de venda não foi tocado |
| Funil `process`: nenhum R$ na tela; terminais rotulados por `kind`; card mostra origem e tempo na etapa | ✅ `DealsBoard.process.test.tsx` (`document.body` sem `R$`; "concluído"/"cancelado"; origem; "3 h na etapa") + strip sem R$ em processo |
| Fechar um card em terminal sem escolher motivo é impossível pela UI | ✅ em processo: drop no terminal abre o modal, botão desabilitado sem motivo (teste); em venda: fora do escopo da F8 (compat `outro`, F10) |
| Socket `deal:changed` continua atualizando o board | ✅ `useKanbanDeals` inalterado (assina `deal:changed`); o fechamento com motivo recarrega o board e os badges explicitamente |

## Decisões de implementação registradas

- **Venda intocada, processo novo**: o critério "sales exatamente como hoje" pesou mais que "origem em todo card" — o `ProcessCardBody` é um componente à parte; levar origem/tempo para o card de venda é uma linha (`isProcess ? … : …`) quando a F11 quiser.
- **Motivo obrigatório só em processo nesta história** (como o escopo diz); venda mantém o compat `outro` até a F10/F11 pedirem motivo pela UI. O invariante I5 continua valendo no banco.
- **Roteamento por linha saiu da página** (fetch + strip): `pipeline_channel_routing` está congelada (F5-855) e nenhum cliente tem rota — menos 2 chamadas por abertura da página.
- **Enriquecimento do board no backend** (2 `find` por lote) em vez de N chamadas do frontend ou de `LATERAL` no query builder — mock-friendly e suficiente para o volume de um board.
- **Compat com backend anterior à F8**: todos os campos novos são opcionais; `originInfo`/`movedByChip` derivam de `createdByKind`; `timeInStage` cai em `updatedAt`.
- `DealModal` busca o nome do contato (`GET /contacts/:id`) só quando o chamador não passa `contactName` e o funil é de processo — uma chamada por abertura, nunca por render.

## Fora do escopo (registrado)

- Motivo ao fechar em funil de **venda** pelo board/modal — F10 (SCRUM-819) / F11.
- Origem e tempo na etapa no card de **venda** — F11 (SCRUM-820), uma linha.
- Vocabulário "registro" nas listas da ficha/painel (`DealsTab`, `ContactPanelDeals`) — F11.
- Conferência visual claro/escuro no browser — homologação (mesma pendência da F7).
