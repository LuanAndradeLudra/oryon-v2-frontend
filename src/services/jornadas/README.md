# Jornadas — telas com dados de exemplo (ORY-60)

As telas do Motor de Jornadas foram feitas **antes do backend**, com dados de exemplo.
Este README diz o que é de exemplo, o que trocar e onde cada tela busca os dados.

- Épico: **ORY-48** (Motor de Jornadas). Esta parte: **ORY-60** (telas), dentro da **ORY-51**.
- Desenho completo: `docs/jornadas/MOTOR-DE-JORNADAS.md` (com `.html`), principalmente:
  - §2.3 (tabelas);
  - §2.4 (gatilhos);
  - §2.5 (passos);
  - §2.10 (rotas e MCP);
  - §2.11 (telas);
  - Anexo A (o que o ORY-11 já entrega).
- Branch: `story/ORY-51-telas-das-jornadas`, que sai de `epic/ORY-48-motor-de-jornadas`. Esta, por sua vez, sai do `epic/ORY-11-api-plataforma-mcp` do frontend.
  - Essa base está alguns commits atrás da `master`. Traga a `master` antes de continuar.
- Dependência nova: `@xyflow/react` (React Flow 12, MIT), para o canvas (decisão 11).

## Onde fica cada coisa

| Arquivo | O que é |
|---|---|
| `tipos.ts` | Os formatos das rotas `/v1/journeys`. **É o contrato que o backend deve devolver.** |
| `catalogo.ts` | O catálogo de passos, eventos e operações do conector. No produto vem de `GET /v1/journeys/catalog`. A tela gera o formulário de cada passo a partir dele. |
| `jornadasApi.ts` | **A única porta das telas para os dados.** A interface `JornadasApi` tem uma função por rota; a implementação de hoje é a de exemplo. |
| `dados-exemplo.ts` | As jornadas, receitas, pessoas e números inventados. Sai quando a API real entrar. |
| `validar.ts` | Validação ao vivo do desenho (§2.11). O backend repete a mesma regra no `validate` e no `publish`. Em `required`, o problema traz `field` (a chave do campo) para a tela marcar o campo; o backend deve devolver o mesmo. |
| `simulador.ts` | O "Testar" (contato de teste + relógio adiantado), rodando na tela. |
| `layout.ts` | O botão "Organizar" (camadas de cima para baixo). Também reorganiza sozinho quando um passo entra no meio de uma ligação ou sai do meio do caminho. |
| `src/components/jornadas/` | As telas: lista, galeria, editor (canvas, seletor de passo, painel do passo), testar, simular, publicar, pessoas e resultados. O movimento fica em `jornadas.css` e no framer-motion, e some com "reduzir movimento" do sistema. |
| `src/pages/JornadasPage.tsx` e `JornadaPage.tsx` | As rotas `/jornadas` e `/jornadas/:id`. |

## Como ligar o backend (ORY-62)

1. Crie `jornadasApiReal` em `jornadasApi.ts`, com as **mesmas assinaturas** de `JornadasApi`, chamando as rotas da tabela abaixo pelo cliente HTTP do app.
2. Troque a linha `export const jornadasApi: JornadasApi = jornadasApiDeExemplo` por `jornadasApiReal`. As telas já estão no visual final: nenhuma delas indica que os dados são de exemplo.
3. Troque `CATALOGO_EXEMPLO` (que o `validar.ts` e o editor usam) pelo catálogo lido da API.
4. Apague `dados-exemplo.ts` e a função `restaurarExemplos`.

| Função | Rota (planejada na ORY-61) | Observação |
|---|---|---|
| `listar` | `GET /v1/journeys` (`?deleted=true` = lixeira) | Resumo com números de 30 dias e erros de 24 h, `labels`, `deletedAt`, `alertRecipients`. P2: `doors`, `channels`, `updatedBy`, `metaCostThisMonthBrl`, `pendingApproval`, `scheduledPublish`, `endsAt` |
| `duplicar` | `POST /v1/journeys/{id}/duplicate` | Rascunho novo "Cópia de …", com o mesmo desenho |
| `apagar` | `POST /v1/journeys/bulk` `{ ids, action: 'delete' }` | Vai para a lixeira (90 dias). Ativa ou em sombra volta em `blocked` com o motivo ("pause antes") |
| `restaurar` | `POST /v1/journeys/{id}/restore` | Sai da lixeira |
| `etiquetar` | `POST /v1/journeys/bulk` `{ ids, action: 'label', add, remove }` | Etiquetas livres para organizar a lista |
| `tratarAlerta` | `POST /v1/journeys/{id}/alerts/{kind}` `{ action, note }` | `resolved` (some), `snooze_24h` (`snoozedUntil`), `ignore` (o tipo não volta nesta jornada) |
| `configurarAlertas` | `PATCH /v1/journeys/{id}` `{ alertRecipients }` | Quem é avisado (ids de usuários) e por onde (`email`, `whatsapp`) quando abre um alerta. Fora da versão |
| `ver` | `GET /v1/journeys/{id}` | Com o rascunho (`draft`) e `enrolledByVersion` |
| `catalogo` | `GET /v1/journeys/catalog` | Passos, eventos, operações, campos de condição |
| `apoio` | já existem na v1 do ORY-11 | `/v1/templates`, `/v1/whatsapp-numbers`, `/v1/tags`, `/v1/stages`, `/v1/users`, `/v1/departments`. Mais `connector`: nome e `logoUrl` do sistema do cliente (o conector ligado), para o selo dos passos "Sistema do cliente" e "Agenda do sistema". Sem logo, a tela mostra só o ícone do passo. O logo da Feegow está em `public/conectores/feegow.png` (ícone oficial, recortado com cantos de 24%) |
| `receitas` | `GET /v1/journeys/recipes` | Galeria |
| `criar` | `POST /v1/journeys` | Com `recipeId` ou em branco com `door` (o tipo da porta: começa pela entrada) |
| `salvarRascunho` | `PATCH /v1/journeys/{id}/draft` | Mandar a versão esperada; **409** se outra pessoa salvou antes |
| `validar` | `POST /v1/journeys/{id}/validate` | |
| `simular` | `POST /v1/journeys/{id}/simulate` `{ draft, days: 1\|7 }` | Não executa nada. P2: com `days: 7` vêm `byDay` e `totals`; sempre vem `math` (a conta das mensagens, passo a passo) e `current` (a automação que já faz isso hoje, para comparar) |
| `publicar` | `POST /v1/journeys/{id}/publish` | **Duas etapas** (padrão do ORY-11): sem `X-Oryon-Confirmation`, responde `422 confirmation_required` com a prévia e o token; com o token, publica. A prévia traz `changes` (o diff, ver `diff.ts`) e `backfill` (porta de segmento ou evento: quantos já se encaixam hoje). Na confirmação, `{ backfill: true }` inscreve também esses |
| `previaDaPausa` | `GET /v1/journeys/{id}/pause-preview` | Dentro agora, esperando resposta e mensagens nas próximas 24 h |
| `pausar` | `POST /v1/journeys/{id}/pause` `{ inFlight }` | Uma etapa (parar é seguro). `inFlight`: `continue` (terminam o caminho, padrão), `hold` (parados até retomar) ou `exit` (saem agora, motivo "pausa"). Volta em `pauseMode` |
| `retomar` | `POST /v1/journeys/{id}/resume` | **Duas etapas** |
| `inscricoes` | `GET /v1/journeys/{id}/enrollments?situation=&status=&node=&version=&search=&page=&perPage=` | Filtros de `FiltroDeInscricoes` |
| `tirarVarias` | `POST /v1/journeys/{id}/enrollments/remove` `{ ids }` | Tirar várias de uma vez (motivo "manual") |
| `exportarInscricoes` | `GET /v1/journeys/{id}/enrollments.csv` (mesmos filtros) | CSV com ponto e vírgula; **telefone sempre mascarado** (LGPD) |
| `registro` | `GET /v1/journeys/{id}/actions?errorsOnly=&node=&search=&page=` | O registro de ações da jornada inteira (`ItemDoRegistro`), com o erro (código da Meta ou do conector, tentativas, se dá para tentar de novo) |
| `tentarDeNovo` | `POST /v1/journeys/{id}/actions/{actionId}/retry` | Repete o passo que falhou, na versão em que a pessoa está. Só quando `error.retryable` |
| `exportarRegistro` | `GET /v1/journeys/{id}/actions.csv` (mesmos filtros) | |
| `linhaDoTempo` | `GET /v1/enrollments/{id}/timeline` | |
| `tirarDaJornada` | `DELETE /v1/enrollments/{id}` | |
| `porQueNaoEntrou` | `GET /v1/journeys/{id}/why-not?contactId=` | No exemplo busca por nome; no real, escolher o contato e mandar o id |
| `resultados` | `GET /v1/journeys/{id}/analytics?days=7\|30\|90` | Com `previous` (o período anterior), `series` (por dia) e, em cada envio (`byMessage`), `failedReasons` (motivo da Meta) e `costBrl` (tarifa estimada). P2: `skipped` (pulos por código padronizado) e `attribution` (receita do funil do CRM) |
| `limites` | `GET /v1/journeys/limits` | Do plano do cliente: jornadas ligadas, passos por jornada, prazo máximo, créditos de IA no mês |
| `versoes` | `GET /v1/journeys/{id}/versions` | Versões publicadas, com o que mudou e quantos ainda estão em cada uma |
| `voltarParaVersao` | `POST /v1/journeys/{id}/versions/{version}/republish` | **Duas etapas.** "Voltar" publica a anterior de novo, como versão nova; o rascunho não muda |
| `versao` | `GET /v1/journeys/{id}/versions/{version}` | O desenho de uma versão publicada: "Ver no desenho" (só leitura) e o diff com o rascunho |
| `buscarContatos` | `GET /v1/contacts?search=` | Mascarado, para a inscrição manual |
| `inscrever` | `POST /v1/journeys/{id}/enrollments` | **Duas etapas** quando a jornada envia mensagem: a prévia diz quantos entram e quem é barrado |
| `enviarTeste` | `POST /v1/journeys/{id}/test-send` `{ nodeId, contactId?, data? }` | "Enviar um teste para mim": manda UMA mensagem do passo ao WhatsApp de quem edita, com os dados de teste ou de um contato escolhido. O "Testar" usa a mesma rota em cada mensagem quando "mandar de verdade" está ligado. Não inscreve ninguém nem conta nos resultados; devolve `{ to }` mascarado |
| `contextoDoContato` | `GET /v1/journeys/{id}/test-context?contactId=` | Os dados de um contato de verdade (mascarados) para o teste e para a prévia no celular: nome, telefone mascarado, o próximo agendamento ou evento |
| `checarEntrada` | `POST /v1/journeys/{id}/test-run/checks` `{ contactId?, data }` | "Entraria?": porta, cada condição do filtro, reentrada, opt-out, outra jornada com a conversa, horário de envio (`ChecagemDeEntrada`) |
| `testarPasso` | `POST /v1/journeys/{id}/nodes/{nodeId}/test` `{ contactId?, data }` | Roda só este passo (sistema, webhook, IA): o sistema do cliente **não grava** (ensaio). A IA roda de verdade e **não gasta crédito** (decisão do João, 16/11), com um **limite diário de testes de IA por empresa** (20 na tela de exemplo; no backend, parâmetro em `src/config/runtime/`, sem flag). Passou do limite: `429` com a mensagem. A resposta traz `testesDeIaRestantesHoje`; `limites` traz `aiStepTestsPerDay` |
| `comentarios` | `GET /v1/journeys/{id}/comments` | Comentários dos passos e da jornada. Fora da versão |
| `comentar` | `POST /v1/journeys/{id}/comments` `{ nodeId, text, mentions }` | Quem é mencionado (ids de usuário) recebe aviso no app |
| `resolverComentario` | `PATCH /v1/journeys/{id}/comments/{commentId}` `{ resolved }` | |
| `pedirAprovacao` | `POST /v1/journeys/{id}/publish-requests` `{ mode, note }` | P2. Quem não pode publicar pede; volta em `pendingApproval`. Quem pode vê "Aprovar e publicar" (o `publicar` de sempre) ou recusa |
| `recusarAprovacao` | `DELETE /v1/journeys/{id}/publish-requests` `{ reason }` | P2. Recusar (ou desistir do pedido) |
| `cancelarAgendamento` | `DELETE /v1/journeys/{id}/scheduled-publish` | P2. Cancela a publicação marcada (`scheduledPublish`) |
| `restaurarComoRascunho` | `POST /v1/journeys/{id}/versions/{version}/restore-draft` | P2. O desenho da versão vira o rascunho; o rascunho de antes fica no histórico |
| `historicoDoRascunho` | `GET /v1/journeys/{id}/draft-history` | P2. Quem mudou o quê no rascunho (`AlteracaoDoRascunho`), com o antes e o depois. Mudanças da mesma pessoa em até 10 min viram uma linha só |
| `presenca` | `POST` e `GET /v1/journeys/{id}/presence` | P2. A tela manda o próprio sinal (com o passo aberto) a cada 20 s e lê quem mais está ali (`PresencaNoEditor`). Sugestão: sai da lista quem passa 60 s sem sinal |
| `pessoasDoRecorte` | `GET /v1/journeys/{id}/analytics/people?days=&cut=` | P2. As pessoas por trás de um número de Resultados (`RecorteDosResultados`: passo, ramo, saída, meta, pulo). Até 50, das mais recentes, mascaradas; `total` = o número clicado |
| `exportarRecorte` | `GET /v1/journeys/{id}/analytics/people.csv` (mesmos filtros) | P2. O recorte inteiro, telefone sempre mascarado |
| `saude` | `GET /v1/journeys/health` | P2. Um semáforo por jornada publicada (`SaudeDaJornada`), com os motivos e onde resolver |
| `conexoes` | `GET /v1/journeys/connections` | P2. Eventos usados por 2 jornadas ou mais (papel e ordem) e as linhas de WhatsApp com o volume do mês (`ConexoesDasJornadas`) |
| `proporComIa` | `POST /v1/journeys/ai/propose` `{ description, journeyId?, draft? }` | P2, "Criar com IA" (Copiloto v2). Devolve `PropostaDaIa`; **nada é salvo**. Com `journeyId` e `draft`, propõe a mudança sobre aquele rascunho |
| `criarDaProposta` | `POST /v1/journeys` `{ name, description, draft }` | P2. Cria a jornada com o desenho da proposta, como rascunho desligado |

**Testar:** hoje roda na tela (`simulador.ts`). No produto, o teste roda no backend com um contato marcado como teste (`POST /v1/journeys/{id}/test-run`). O relógio avança só para essa inscrição. A tela pode continuar igual, trocando `iniciarTeste`/`avancarTeste` por chamadas à API.

## O que já está decidido e a tela respeita

- **O status é a chave**, sem flag nova: rascunho, sombra, ativa, pausada.
- **Duas etapas** em publicar, retomar, voltar para uma versão e inscrever contatos. Pausar tem uma etapa só.
- **Erro por passo (§2.6):** passo com efeito (envio, CRM, sistema, IA) traz `onError` no catálogo (padrão: repetir 3 vezes e entregar a humano); o painel mostra "E se der erro?" e grava `NoDoGrafo.onError` só quando muda.
- **Posse na hora de enviar (§2.7):** "Enviar modelo" e "Enviar texto" têm `ifHuman` (esperar até 24 h e pular, pular ou sair). "Segurar a conversa" vai até 72 h; a validação barra mais que isso.
- **Barreiras da entrada:** quem pediu para não receber nunca entra; "outra jornada segura a conversa" barra por padrão (`skipIfHeldByOtherJourney`). Reentrada: uma de cada vez (padrão), por assunto, uma vez só ou com intervalo.
- **Variáveis que os passos produzem:** o que "Extrair dados" guarda vira `contexto.extraido.<dado>`, e "Resumir" pode gerar `contexto.resumo` (`variaveisDoDesenho` em `validar.ts`).
- **Teto mensal de IA por jornada** (`Metas.aiMonthlyCap`): bateu, os passos de IA seguem pelo caminho de reserva e a jornada não para.
- **Alertas** (`ResumoDaJornada.alerts`): inscrição presa, disjuntor do conector, erro fora do normal. Aparecem na lista (coluna Saúde) e numa faixa na jornada.
- **Permissões:** a rota `/jornadas` abre para supervisor e acima (`lib/rotasPorPapel.ts`). A trava fina, em que o supervisor monta e pausa e só o admin publica e retoma, entra com a API, pelo papel devolvido.
- **Celular:** só leitura. O canvas fica sem "+" e sem arrastar, e "Nova jornada" mostra o `MobileFeatureGate`.
- **Modo foco:** no computador, a página de uma jornada esconde o menu lateral e a barra do topo do app (`contexts/modoFoco.ts`) e usa uma barra só, com voltar, nome, status, abas e ações.
- **Como se monta o desenho:** pelo "+" embaixo de cada saída, pelo "+" no meio de uma ligação, pelo botão "Adicionar passo" (ou a tecla A) e arrastando do seletor. Apagar um passo do meio religa o caminho quando ele tinha uma continuação só. Ctrl+Z e Ctrl+Y desfazem e refazem.
- **Feature universal, para qualquer segmento.** O catálogo fala em agendamento, e não em consulta: `evento.data`, `evento.profissional`, `evento.servico`, `conector.agenda.profissional`, `confirmar_agendamento`. O backend deve devolver o catálogo com esses nomes.
- **Receitas por segmento:** clínica, imobiliária, loja, contabilidade, jurídico e "qualquer negócio", os mesmos segmentos da landing (`SegmentoDaReceita`). Nas receitas, os campos de cada empresa (linha, modelo, setor, etiqueta) vêm em branco, e a validação aponta o que falta. No produto, a galeria pode abrir já filtrada pelo segmento da empresa.
- **Webhook de entrada e evento externo:** qualquer `evento.*` vale como variável, porque os campos vêm do mapeamento que o operador faz ("ouvir um exemplo").
- **Cores sólidas por tema, sem translucidez nem borda colorida** (padrão do app): os pares `--jt-<tom>-fundo` / `--jt-<tom>-sobre` em `jornadas.css`, um conjunto para o escuro e outro para o claro. Categoria do passo: mensagem verde, conversa azul, controle âmbar, CRM rosa, sistema ardósia, IA violeta, entrada teal.
- **IA com custo à vista:** o seletor de passo, o painel e a barra do topo mostram os créditos (0,2 na pergunta rápida, 1 na missão). Os passos do próximo épico (tarefa de bastidor, aprovação humana) aparecem como "Próximo épico" e não podem ser usados.
- **Limite do plano:** as jornadas ativas contam no limite `automations` (2, 5, 15 ou sem limite), e as do sistema não contam. Isso entra com o backend (ORY-59).

### P1 do benchmark (16/11) — o que o motor precisa saber

O relatório `docs/jornadas/benchmark` listou 22 lacunas de paridade com o mercado (P1). As telas estão prontas; o que segue é o contrato para o motor e a API.

- **Passos novos no catálogo** (`catalogo.ts`):
  - `send_and_wait` ("Enviar e esperar resposta"): modelo + espera + segurar a conversa num passo só. Saídas: uma por botão do modelo (`params.replies`, gerado na tela a partir dos botões), `outra_resposta` e `sem_resposta`. Pode ser executado como os três passos de hoje em sequência.
  - `ask_question` ("Perguntar e guardar a resposta"): pergunta, tipo (`text`, `number`, `date`, `email`, `option`, `rating`), opções, campo de destino (`saveTo`), novas tentativas e prazo. Saídas: `respondeu`, `invalida`, `sem_resposta`. A resposta também fica em `contexto.resposta`.
  - `branch_message_status` ("Ramificar pelo status da mensagem"): olha uma mensagem anterior do desenho (`messageNodeId`) até o prazo. Saídas: `respondeu`, `leu`, `entregue` (chegou e não leu), `nao_chegou`. Usa os status do WhatsApp que a plataforma já recebe.
- **Ramo de falha no desenho:** `PoliticaDeErro.then = 'branch'`. O passo ganha a saída `falhou`. As tentativas acontecem antes; esgotadas, segue por `falhou` em vez de entregar a humano.
- **Regras de envio** (`VersaoDaJornada.rules`, versionadas): janela (`days`, `from`, `to`, `blockedDates`, `outside: wait|skip`) e limite por pessoa (`frequencyCap: { maxMessages, perDays }`). Valem para os passos que mandam mensagem; o limite pulado fica no registro.
- **Janela de conversão da meta:** `Metas.goals[].windowDays`. A meta conta se acontecer até N dias depois da última mensagem da jornada, mesmo que a pessoa já tenha saído.
- **Notas adesivas** (`Grafo.notes`, posição em `layout`): não mudam o comportamento, não entram no diff nem na validação.
- **Pausar com escolha** (`inFlight`) e **publicar com backfill** (ver a tabela).

### P2 do benchmark (16/11) — o que o motor precisa saber

As lacunas P2 do mesmo relatório. As telas estão prontas com os dados de exemplo; o que segue é o contrato.

- **Publicar com governança** (`OpcoesDePublicar` em `jornadasApi.ts`):
  - `note` (nota da versão, aparece em Versões);
  - `scheduleAt` (publicar numa data; volta em `scheduledPublish`);
  - `endsAt` (desligar sozinha numa data);
  - `inFlight` para quem já está dentro: `finish_old` (termina na versão antiga, o padrão), `migrate` (passa para a nova no passo equivalente) ou `exit` (sai).
  - Quem não pode publicar usa `pedirAprovacao`.
- **Restaurar como rascunho e histórico do rascunho:** cada `salvarRascunho` que muda o comportamento grava uma linha em `draft-history`, com autor, tipo e o antes e o depois. Só mover passos não conta.
- **Copiar e colar passos entre jornadas:** só na tela (`localStorage`, chave `oryon.jornadas.copia.v1`). Ao colar, os passos ganham ids novos. Não precisa de rota.
- **Entrada:**
  - evento `conversation.inactive` ("a conversa parou"), com as horas em `params.hours`. Conta da última mensagem da empresa que ficou sem resposta do contato;
  - `Entrada.recheckBeforeSend`: confere o filtro de novo antes de cada mensagem. Quem não passa sai com o código `recheck_failed`;
  - `Entrada.limit { max, per: day|week|total }`: passou do limite, a pessoa fica de fora com o código `entry_limit`.
- **Texto fixo no dado do modelo:** em `params.variables[i]`, um valor sem `{{ }}` é texto literal, igual para todos.
- **Simular** (`ResultadoDaSimulacao`):
  - `math`: cada passo que manda mensagem, com `reachPct` (quantos % de quem entra chegam até ele, pelos últimos 30 dias desta jornada ou de jornadas parecidas, se é nova) e `via` (o ramo). "Avisar a equipe" com lista do dia conta 1 mensagem (`groupedPeople` = quantas pessoas vão na lista);
  - `current`: a automação que já faz isso hoje para o mesmo público (no Oryon de hoje, o lembrete e a confirmação do n8n). Média por dia dos últimos 7 dias, pela mesma fonte das métricas de envio; `null` quando não há equivalente.
- **Testar no celular:** os itens do teste trazem `choice` (a resposta escolhida) e `clockTo` (até quando o relógio andou). Quando o teste rodar no backend, devolver os mesmos campos.
- **Motivos padronizados** (`CodigoDePulo`; textos em `motivos.ts`): o motor grava o código em todo pulo, na entrada (`filter`, `reentry`, `other_journey`, `opt_out`, `invalid_phone`, `entry_limit`), no envio (`recheck_failed`, `no_whatsapp`, `meta_marketing_limit`, `window_closed`, `frequency_cap`) e nos adiamentos (`quiet_hours`, `paused`). `resultados.skipped` soma por código. O "por que não entrou" e o registro usam os mesmos códigos.
- **Quem está num passo:** o número do cartão abre `inscricoes` com `situacao=dentro&node=`, ordenado por `nextWakeAt` (quem segue primeiro). Não precisa de rota nova.
- **Receita atribuída** (`resultados.attribution`): negócios do CRM das pessoas que entraram, ganhos até `windowDays` dias depois de entrar (padrão 30). A receita soma só os ganhos, e `previousRevenueBrl` traz o período anterior. **A decidir:** que funil conta (sugestão: todos, mostrando o nome do que tem mais negócios) e se a janela fica configurável em Metas.
- **Lista:**
  - `doors` e `channels` vêm do desenho publicado (a regra está em `canais.ts`);
  - `metaCostThisMonthBrl` = mensagens do mês × tarifa da categoria de cada modelo;
  - `updatedBy` = quem salvou o rascunho por último.
- **Saúde** (`SaudeDaJornada`). Sugestão de regras:
  - grave: disjuntor do conector aberto, ou modelo não aprovado num passo do desenho publicado;
  - atenção: outro alerta aberto, erros em 24 h, entrega de 7 dias abaixo de 90%, ou jornada ativa sem ninguém entrar há mais de 7 dias.
  - Cada motivo traz `target`, que diz onde a tela abre.
- **Links que abrem no problema:** `/jornadas/:id?alertas=1` (o balão do alerta), `?aba=pessoas&erros=1` (o registro só com erros), `?aba=pessoas`, `?config=1`. A lista e a Saúde usam esses links.
- **Conexões** (`ConexoesDasJornadas`): por evento, quem entra, bate a meta ou sai por ele. Entre as que entram, a publicada há mais tempo é avaliada primeiro, e `skipsIfInOther` reflete `skipIfHeldByOtherJourney`. Por linha de WhatsApp: as jornadas e as mensagens do mês.
- **Criar com IA** (Copiloto v2):
  - `proporComIa` nunca aplica nada sozinho. A jornada nova nasce rascunho desligado, e a mudança numa jornada que existe só entra no rascunho depois que a pessoa vê o diff (`diff.ts`) e aplica. Ctrl+Z desfaz;
  - o exemplo escolhe a receita-base por palavras; o motor usa o modelo do Copiloto;
  - **a decidir:** o custo. Sugestão: como o teste de IA, grátis com limite diário por empresa, com o parâmetro em `src/config/runtime/`.
- **Galeria:** `Receita.goal` (`ObjetivoDaReceita`) para o filtro por objetivo. O filtro por canal usa `canaisDoDesenho`.

### A vez de responder e a IA no fluxo (16/11, decisões do João)

Completam o §2.7 (posse) e o §2.8 (IA no fluxo) do desenho do motor. Valem para a ORY-58 e a ORY-52.

- **Brecha 1: mensagem que não casa com nenhum caminho.** Enquanto a jornada segura a conversa, pode chegar algo que ela não espera (ex.: "qual o endereço?" com o passo esperando só os botões).
  - Essa mensagem vai ao agente **naquele turno**, com o bloco `<jornada>` (ver a brecha 3).
  - A nota automática diz: "chegou enquanto a jornada X esperava a resposta de Y".
  - A jornada **continua segurando e esperando**: o botão apertado depois ainda segue pelo caminho dela.
  - A validação avisa no desenho (`held_without_free_text`).
- **Brecha 2: esperar botão sem segurar a conversa.** Sem a posse, o agente também responde ao botão e a pessoa recebe duas respostas.
  - A validação avisa: `buttons_without_hold`, em "Aguardar resposta" sem "Segurar a conversa" logo antes (`seguraAntes` em `validar.ts`) e em "Enviar e esperar resposta" com `holdConversation: false`.
  - As receitas de exemplo já seguram a conversa antes de esperar um botão e mandam o texto livre ao agente.
- **Brecha 3: o contexto que o agente recebe.** O passo "Entregar ao agente" grava a nota na conversa. Nas próximas mensagens, o agent-server recebe um bloco `<jornada>` (nome da jornada, assunto e a nota), como hoje recebe o `<estado_conversa>`.
  - O bloco vale até a conversa ser resolvida ou por 24 h, o que vier primeiro.
  - É o mesmo bloco da brecha 1.
  - Isso tira do agente a dependência de reconhecer o lembrete pelo texto do modelo (o "modo resposta ao lembrete" de hoje).
- **Missão = o MESMO agente do número**, não uma IA separada. A missão entra num bloco `<missao>` só na conversa daquele contato e só enquanto durar; os outros contatos falam com o agente de sempre. O agente não guarda nada entre conversas, porque o contexto é montado a cada mensagem.
  - Ordem que vale: regras da plataforma > configuração do agente do cliente > missão.
  - Uma missão por conversa de cada vez.
- **Tipos de missão, no lugar do objetivo livre** (`TIPOS_DE_MISSAO` em `catalogo.ts`):
  - os tipos: `reschedule`, `confirm_attendance`, `recover_quote` e `qualify_lead`;
  - cada tipo tem a instrução escrita e testada pela Oryon (bateria por tipo antes de liberar), versionada no agent-server;
  - o tipo traz o critério de sucesso (`successEvent`), que o operador só troca se o sistema registrar de outro jeito;
  - o operador preenche só as restrições extras (`limits`, que somam e nunca passam por cima), o prazo e o máximo de respostas;
  - nos params do passo, `missionType` substitui o antigo `objective`;
  - **revisto em 17/11** (seção abaixo): há também a "Missão personalizada", com texto livre.
- **Quem decide o fim da missão é o sistema:** o evento de sucesso, o prazo ou o máximo de respostas. O agente só encerra por `concluir_missao` quando a pessoa não quer.
- **A receita "Recuperar cancelados"** passou a usar "Enviar e esperar resposta" (segura a conversa por 48 h). "Quero remarcar" e "Escreveu outra coisa" vão para a missão `reschedule`; "Agora não" põe a etiqueta e sai; o silêncio abre o caso de retomada.

### Escolhas no lugar do texto livre, para qualquer segmento (17/11, pedidos do João)

O operador iniciante não precisa escrever do zero, e nada fica preso a clínicas: cada campo de texto livre ganhou escolhas prontas, e o texto livre continua lá para quem quiser personalizar. Tudo por regra, sem IA (custo zero).

**1. O caminho até o passo sugere o conteúdo** (`components/jornadas/editor/caminho.ts`).
- O editor lê o que veio antes do passo: a pessoa não respondeu, apertou um botão, a IA classificou, a missão não concluiu, o envio falhou. Lê também o assunto pela entrada ("agendamento de 18/11 às 9h").
- Com isso, ao entrar no desenho, o passo já nasce preenchido:
  - o texto do aviso à equipe e da nota interna;
  - o que a equipe deve fazer;
  - o motivo da entrega à equipe;
  - o nome da meta e o motivo de saída;
  - o tipo de missão, pela entrada;
  - o setor, que vem do passo de equipe anterior.
- Se o caminho muda depois, o campo mostra "Pelo caminho que chega aqui: … Usar".
- O "Terminar aqui" usa a mesma leitura.

**2. Listas padronizadas no catálogo** (`padroes.ts`; vão no `GET /v1/journeys/catalog`).
- Campos novos do catálogo:
  - `goalTypes`, para o nome da meta;
  - `exitReasons`, para o motivo de saída;
  - `handoffReasons`, para o motivo da entrega à equipe;
  - `teamActions`, para o que a equipe deve fazer;
  - `missionRestrictions` e `missionTypes`.
- O campo do tipo `standard_choice` guarda o rótulo no próprio parâmetro e o código no `codeKey`:
  - meta: `label` + `goalCode`;
  - saída: `reason` + `reasonCode`;
  - entrega à equipe: `reason` + `reasonCode`.
- "Outro" grava o código `other`, com o nome escrito pela pessoa.
- **O motor grava e agrega pelo código.** Resultados e Pessoas somam por ele, como os motivos de pulo; com texto livre, "Sem resposta" e "sem resposta." contavam como dois.

**3. Parâmetros novos ou mudados.** Todos se somam ao que já existe.
- `notify_team`:
  - `action` (código de `teamActions`);
  - `include`: `subject`, `last_reply` e `ai_summary`, que vão junto do texto; o link da conversa vai sempre.
- `handoff_agent.note` virou opcional ("algo a mais"). O bloco `<jornada>` passa a levar sozinho o que aconteceu antes (a frase de `contextoParaOAgente`) e o assunto.
- `deal_action.stageId` usa a nova lista `apoio.dealStages`, as etapas do funil de negócios. Antes era o nome da etapa escrito à mão (`stageName`, que só fica para exibir).
- `ai_summarize.focus` (`preset_text`): frases prontas ou "Outro" com texto livre.
- `ai_extract.instruction` se escreve sozinho a partir de `fields`, enquanto ninguém o reescreve.
- `apoio.customFields[].options`: um campo com opções vira escolha no "Campo do cadastro" e na pergunta pronta.
- `apoio.segment`: o segmento da empresa, que é o mesmo da galeria de receitas.

**4. Missão do agente: tipos universais + camada livre.**
- Os tipos `reschedule`, `confirm_attendance`, `recover_quote` e `qualify_lead` servem a qualquer negócio: atendimento, visita, reunião, aula, proposta. Cada tipo traz:
  - `steps`: o que o agente faz, para a tela mostrar;
  - `options`: escolhas testadas, que vão em `missionOptions` (`{ chave: valor }`);
  - `restrictions` e `defaultRestrictions`;
  - `deadline` e `maxReplies` padrão;
  - `goalCode`.
- **`custom` ("Missão personalizada")**: o operador escreve o objetivo em `objective` (texto livre, obrigatório nesse tipo).
  - O critério padrão é `agent.mission_finished`: o agente diz que cumpriu.
  - Não tem `missionOptions`.
  - O agent-server põe o `objective` dentro do bloco `<missao>`, abaixo das regras da plataforma e do agente, que continuam valendo.
  - Esse texto não passa pela bateria da Oryon: a tela avisa, e a aba Testar serve para conferir.
- `limits` virou "Orientações a mais (texto livre)", para qualquer tipo, e soma às regras.

**5. Sugestões por segmento nos textos livres** (`sugestoes.ts`).
- Valem para o objetivo da missão personalizada, as orientações da missão, a nota ao agente e os dados do "Extrair dados". Cada frase pronta é uma ficha: tocar põe a frase numa linha nova, e tocar de novo tira.
- Valem também para as perguntas prontas do "Perguntar" e os modelos do "Classificar resposta". Esses preenchem a pergunta, o tipo de resposta, as opções, o campo ou as respostas possíveis.
- Os segmentos são os da Oryon: qualquer negócio, clínica, imobiliária, loja, contabilidade e jurídico. A lista começa pelo segmento da empresa, e "qualquer negócio" aparece sempre.
- O segmento escolhido vale para o painel inteiro.
- São só textos de ajuda: não entram no contrato.
- Um teste (`caminho.test.ts`) barra texto de clínica no catálogo dos passos. Exemplo de um segmento só vai em `sugestoes.ts`.

## Como ver localmente

```bash
npm run dev
```

Há dois jeitos:

- **Sem backend e sem login:** abra `http://localhost:5173/jornadas-previa.html`.
  - Use `?rota=/jornadas/j_confirmacao` para abrir direto uma jornada, e `&tema=light` para o tema claro.
  - Por baixo é o mesmo backend em memória da demonstração da landing (`src/demo/`), e nenhuma requisição sai.
  - O menu funciona: Home, Dashboard, Conversas, Leads, Funis, Disparos e Agentes IA abrem com os dados da demonstração, para ver a entrada e a saída do editor como no app. Os outros módulos mostram um aviso de que não estão na prévia.
  - Depende do `npm run dev` ligado: com o servidor desligado, abrir uma jornada dá tela em branco (o código do editor não baixa).
  - O que você muda some ao recarregar.
  - Arquivos: `jornadas-previa.html` e `src/demo/jornadas/`. Eles não entram no build, porque o `vite.config.ts` só empacota `index.html` e `demo.html`.
- **No app de verdade:** entre com um supervisor ou admin e abra **Jornadas** no menu (ou `/jornadas`).
  - O que você muda fica guardado no navegador (`localStorage`, chave `oryon.jornadas.exemplo.v1`).
  - Para voltar aos exemplos, apague essa chave no navegador (não há botão na tela).

Roteiro rápido para ver tudo:
1. **Reduzir faltas — confirmação de consulta:**
   - Desenho: os contadores por passo; "Testar" com os quatro ramos (confirmou, cancelou, outra resposta, silêncio); "Simular"; "Publicar mudanças", que mostra a prévia e depois a confirmação.
   - Pessoas: a linha do tempo de cada pessoa e o "Por que não entrou?" (tente Marcos, Lúcia, Pedro, Joana ou Renata).
   - Resultados: o funil, as respostas e a comparação v2 × v3.
2. **Boas-vindas a quem chega pelo site:** é um rascunho com um erro de propósito. O modelo ainda não foi aprovado pela Meta, e a validação barra a publicação.
3. **Galeria de receitas:** criar uma jornada a partir de "Recuperar cancelados", que usa a missão do agente (IA).
