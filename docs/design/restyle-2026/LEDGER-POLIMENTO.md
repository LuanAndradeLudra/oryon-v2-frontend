# Ledger — loop de polimento enterprise (SCRUM-1097)

Regras em `PROMPT-LOOP-POLIMENTO-ENTERPRISE.md` (mesma pasta). Atualizado pelo agente ao fim de cada ciclo.

## Rotação de alvos
Ordem: segue a tabela; a cada 3º ciclo, pegue o próximo **fluxo** em vez da próxima tela.
Status: `pendente` · `em curso` · `saturado` (2 ciclos seguidos só com S3 e notas ≥ 4).

### Telas
| # | Alvo | Status | Ciclos | Última nota média |
|---|------|--------|--------|-------------------|
| T1 | Conversas (lista, chat, composer, painel do contato) | em curso | 1 | 3,7 |
| T2 | Contatos (tabela, filtros, drawer) | em curso | 1 | 4,0 |
| T3 | Funis / Negócios (quadro, card, detalhe, Relatórios) | em curso | 1 | 3,7 |
| T4 | Dashboard | pendente | — | — |
| T5 | Home | pendente | — | — |
| T6 | Agentes IA | pendente | — | — |
| T7 | Campanhas / Disparos | pendente | — | — |
| T8 | Automação | pendente | — | — |
| T9 | Agenda | pendente | — | — |
| T10 | Conectores | pendente | — | — |
| T11 | Configurações | em curso | 1 | 3,9 |
| T12 | Navegação global (sidebar, TopBar, busca, notificações, créditos) | pendente | — | — |

### Fluxos (a cada 3º ciclo)
| # | Fluxo | Status | Ciclos | Cliques / trocas de contexto |
|---|-------|--------|--------|------------------------------|
| F1 | Atender conversa da fila até resolver (atribuir, responder, template, etiquetar, resolver) | pendente (próximo: ciclo 3) | — | — |
| F2 | Lead → contato → negócio → mover etapas → ganhar/perder | pendente | — | — |
| F3 | Criar e disparar campanha, depois acompanhar o resultado | pendente | — | — |
| F4 | Configurar agente de IA do zero e testá-lo | pendente | — | — |
| F5 | Primeiro acesso de um usuário que não conhece o produto | pendente | — | — |

## Ciclos
<!-- Uma entrada por ciclo, mais recente no fim. Modelo:

### Ciclo N — <alvo> — AAAA-MM-DD HH:MM
Notas: hierarquia · eficiência · feedback · consistência · densidade · copy · a11y · perf · mercado
Achados:
- PL-N-1 [S2] (P7) <o quê> — evidência: <medida> — proposta: <…> — esforço P — **feito** `<sha>` (antes → depois)
- PL-N-2 [S3] <o quê> — **aberto**
Registrado em DECISOES: #<n> …
Próximo: <alvo>
-->

### Ciclo 1 — T1 Conversas (tela) — 2026-09-22 20:0x
Notas: hierarquia 4 · eficiência 4 · feedback 3 · consistência 4 · densidade 4 · copy 3 · a11y 3 · perf 4 · mercado 4 (média 3,7)
Achados:
- PL-1-1 [S1] (P12/P14) Inbox abria com o período **"Hoje"** ligado por padrão (`resolveRange('today')` no estado inicial de `ConversationsPage`): esconde tudo que chegou antes de hoje e, em tenant sem mensagem no dia, a caixa nasce vazia — o operador acha que não há trabalho. Intercom/Front/Zendesk abrem a caixa sem recorte de data. — evidência: ao vivo a lista abria com **0 conversas** e chip "Hoje"; sem o padrão, **50**. — esforço P — **feito** `25f236a`
- PL-1-2 [S2] (P6) Estado "sem resultados" da lista era bloco local, centrado, sem ação e sem dizer o filtro ("Nenhuma conversa com esses filtros"). — proposta: primitivo `EmptyState` com os filtros ativos no hint + "Limpar filtros" — esforço P — **feito** `e4122dd` (ao vivo: hint `Filtros ativos: busca "zzzxyq".`; botão recupera as 50)
- PL-1-3 [S3] (P10) "x" dos chips de filtro removível com alvo de **10×10 px**. — proposta: 16×16 com hover, ícone segue 10px — esforço P — **feito** `f96140b` (ao vivo: 16×16)
Observações: console sem erro/warning na rota; contraste no claro limpo; a lista não é virtualizada (50 linhas, DOM ~265 nós — sem problema neste volume, revisitar se paginar mais).
Registrado em DECISOES: nenhum (os três são correção de defeito, sem ambiguidade).
Próximo: T2 Contatos (ciclo 2); ciclo 3 = fluxo F1.

### Ciclo 2 — T2 Contatos (tela) — 2026-09-22 20:2x
Notas: hierarquia 4 · eficiência 4 · feedback 4 · consistência 4 · densidade 4 · copy 4 · a11y 3 · perf 4 · mercado 4 (média 4,0)
Achados:
- PL-2-1 [S2] (P5) Menu "···" de cada linha **sem nome acessível** — 50 botões por página que um leitor de tela anuncia só como "botão"; hover em `surface-700`, que escureceu no claro. — evidência: 50 `<button>` sem texto e sem `aria-label` na rota. — **feito** `47aef0f` (ao vivo: 0 botões sem nome; rótulo "Mais ações — <contato>")
- PL-2-2 [S2] (P7/P12) "Selecionar todos" marca **apenas os carregados**, e a barra dizia "50 selecionados" com 5.191 no filtro — ação em massa parecendo maior do que é (o P7 cita este caso). — **feito** `e87f770` (ao vivo: "50 selecionados de 5.191 no filtro"; checkbox do cabeçalho = "Selecionar todos os itens carregados")
Verificado e SEM defeito (não virou achado): rolagem infinita funciona (50 → 97 ao rolar o container da tabela); ordenação por coluna funciona nos dois sentidos e publica `aria-sort`; rodapé "1–50 de 5.191" honesto; console sem erro/warning; contraste no claro limpo.
Registrado em DECISOES: nenhum.
Próximo: **ciclo 3 = fluxo F1** (atender conversa da fila até resolver).
Em paralelo (agentes, mesma rubrica): Cartógrafo T3 Funis · Farol T4 Dashboard/T7 Campanhas · Bússola T11 Configurações/T10 Conectores.

### Ciclo 2 — T3 Funis/Negócios (Cartógrafo) — 2026-09-22 19:4x
Sem navegador nesta sessão (worktree isolado) — inspeção por leitura de código + testes, não por `getComputedStyle` ao vivo. Notas marcadas com essa ressalva.
Notas: hierarquia 4 · eficiência 4 · feedback 4 (era 3, antes do PL-C2-CAR-1) · consistência 3 · densidade 4 · copy 4 · a11y 3 · perf 4 · mercado 3 (média 3,7)
Achados:
- PL-C2-CAR-1 [S2] (P7) Mover um negócio para uma etapa ABERTA (arrasto ou "Mover ▾") não dava nenhum sinal de sucesso — só o fechamento (Ganho/Perdido) tinha toast+Desfazer (`toastDealClosedWithUndo`); mover entre etapas abertas só tostava no ERRO. É exatamente o caso que o P7 descreve ("ação reversível de 1 clique... executa e mostra toast com Desfazer"), e dropar na coluna errada não tinha saída rápida. — proposta: reusar `moveStage` do próprio board pro Desfazer (chama de novo com a etapa de origem), toast "Movido para `<etapa>`." — esforço P — **feito** `5b283b8`
- PL-C2-CAR-2 [S2] (P3) Os menus "Mover ▾" e "Transferir de funil" do card eram um `<div absolute>` posicionado à mão (sem portal, sem `useLayer`, fechado por um `document.addEventListener('click', …)` global) — dentro da coluna, que é `overflow-y-auto`, um card perto do fim da lista tinha o menu CORTADO pelo scroll (às vezes de vez invisível). Viola P3.2 (toda camada usa portal + gerenciador). — evidência: `grep -n "absolute right-0 top-full" DealsBoard.tsx` (2 ocorrências, nenhuma via `Dropdown`), enquanto `DealSummary.tsx` no mesmo domínio já usa o primitivo pro mesmo gesto ("Mover etapa"). — proposta: trocar pelo `Dropdown` (portal + pilha de camadas), como o resto do produto — esforço P — **feito** `fcb9b43` (teste ajustado: `DropdownItem` é `role="menuitem"`, não `"button"`)
- PL-C2-CAR-3 [S2] (P6/P8) Card "Em aberto" dos Relatórios: (a) em funil de processo o hint repetia literalmente o valor já mostrado ("X negócios" no valor, "X negócios hoje" no hint — mesma informação duas vezes); (b) o backend documenta esse bucket como "aberto, HOJE — não filtrado pelo período" (`types/pipelineAnalytics.ts:30`), mas nada na tela avisa — trocar o filtro de Período pra "Ontem" e ver esse número parado, sem explicação, lê como filtro quebrado. De brinde, o hint estava em `text-[11px]`, abaixo do piso de 12px do P8 pra texto informativo. — proposta: hint condicional (nunca repete o valor) + "não filtra por período" explícito + `text-xs` — esforço P — **feito** `0bc3564`
Observações: `npx tsc -b` limpo e sem erro de lint novo nos 4 commits; suite de `src/components/deals` e `src/components/deals/reports` verde. Não implementado (fora do orçamento de 3 itens, registrado como achado aberto): alvo de toque do "Mover ▾" do card em 22px (abaixo do piso de 32px desktop do P8); Relatórios ainda destoa visualmente do resto do board (pílula de período em `bg-brand-600` cru e `<select>` nativo pro dono, em vez dos chips/`Dropdown` que a barra do quadro já usa — P4 consistência); board sem virtualização de lista (carrega o funil inteiro de uma vez; sem problema no volume de hoje, revisitar se o tenant crescer); sem ação rápida "Marcar ganho/perdido" no `⋯` do card fora do drag (paridade Pipedrive/HubSpot — mudaria o menu do card, registrar se o próximo ciclo achar isso recorrente).
Registrado em DECISOES: nenhum (os três são correção de defeito, sem ambiguidade — mesmo padrão do Ciclo 1/T1 e Ciclo 2/T2).
Próximo: revisitar T3 (card/ficha ainda tem G's não abertos: kebab de ação rápida, virtualização) ou aguardar rotação do Maestro.
### Ciclo 2 — T11 Configurações (tela) — 2026-09-22 (Bússola, sem navegador — medição ao vivo pendente)
Notas: hierarquia 4 · eficiência 4 · feedback 3 · consistência 4 · densidade 4 · copy 4 · a11y 4 · perf 5 · mercado 3 (média 3,9)
Achados:
- PL-C2-BUS-1 [S2] (P6) Busca "Buscar configuração..." (`SettingsLayout.tsx`) não tinha jeito de limpar além de apagar letra a letra, e "Nenhuma configuração encontrada." não citava o termo nem oferecia ação — quem errava a palavra ficava sem próximo passo. — proposta: X para limpar dentro do campo + mensagem com o termo + "Limpar busca" — esforço P — **feito** `522510c`
- PL-C2-BUS-2 [S2] (P6) Catálogo de Conectores (`ConnectorsSettings.tsx`): busca + categoria + status combinam com AND, mas o "sem resultado" só dizia "ajuste a busca ou a categoria" sem ação nem citar o que estava ativo (mesmo padrão do QW-01/PL-1-2 já corrigido em Conversas). — proposta: hint cita os filtros ativos + "Limpar filtros" reseta os 3 de uma vez — esforço P — **feito** `afebb4d`
- PL-C2-BUS-3 [S2] (P6) Auditoria (`AuditTrail.tsx`): "Nenhuma atividade no período" nunca oferecia limpar filtro mesmo com ator/ação/entidade/severidade/período ativos. — proposta: título muda para "…com esses filtros" + "Limpar filtros" só quando há filtro ativo; `FilterBar` (estado de rascunho interno) remonta via `key` pra não mostrar valor velho após o reset externo — esforço P — **feito** `f6ff4d4`
Observações: revisão feita por leitura de código (sem navegador nesta sessão) — os 3 achados vêm do mesmo padrão de defeito (P6 "no-results" sem ação), já visto e corrigido em T1/Conversas no ciclo 1; provável que o mesmo padrão exista em outras listas fora de Configurações (candidato a achado transversal num ciclo futuro). Modelo de salvamento (P9) auditado: Vocabulário usa "controle isolado" (auto-save + indicador — correto pro padrão); MyAccount/CompanyProfile/CompanyBrain/WhatsAppBusinessProfile usam "registro único" com toast em vez da barra fixa "Alterações não salvas" com guarda de navegação do P9 — real, mas G de esforço (dirty-tracking + guard em 4 arquivos); registrado abaixo em vez de implementado neste ciclo (regra: no máx. 3 itens, S1/S2 primeiro, e os 3 P6 encontrados já eram mais isolados e comprovados). T10 Conectores (card/modal/catálogo) não teve achado extra além do PL-C2-BUS-2 (que é da mesma tela física, `/settings/connectors`).
Registrado em DECISOES: nenhum (os três são correção de defeito, sem ambiguidade — mesmo critério do Ciclo 1).
Próximo: T10 Conectores (fluxo de instalar/credenciar um conector) ou T2 Contatos, conforme a rotação; ao vivo pendente (sem portal nesta sessão).

## Achados abertos (backlog do loop)
<!-- Achados vistos e não feitos, para ciclos futuros priorizarem S1/S2 de qualquer tela. -->
- PL-1-4 [S3] (P6) O "carregando" da lista ainda é spinner + "Carregando…" em vez de skeleton de linhas (`ConversationList.tsx` ~l.175). Perf percebida.
- PL-C2-CAR-4 [S3] (P8) "Mover ▾" do card do board (alternativa ao drag por toque) tem 22px de altura — abaixo do piso de 32px desktop do P8 (`DealsBoard.tsx`, botão com `h-[22px]`).
- PL-C2-CAR-5 [S3] (P4) Aba Relatórios do funil não usa o vocabulário do resto da tela: pílula de período em `bg-brand-600` cru (deveria ser o mesmo `SegmentedControl`/chip do board bar) e filtro de dono é um `<select>` nativo (o board bar já tem o padrão `Dropdown` com avatar+nome pro mesmo filtro, em `BoardFilterBar.tsx`).
- PL-C2-CAR-6 [S3/proposta de produto] (mercado) Card do kanban não tem ação rápida "Marcar ganho/perdido" fora do drag/ficha (HubSpot e Pipedrive têm um atalho no `⋯` do card). Mudaria o menu do card — não implementado por não ser defeito, é decisão de produto; registrar se aparecer de novo.
- PL-C2-BUS-4 [S2] (P9) Modelo de salvamento "registro único" (MyAccount, CompanyProfile, CompanyBrain, WhatsAppBusinessProfile) usa botão sempre visível + toast, não a barra fixa "Alterações não salvas · Descartar · Salvar" com guarda de navegação que o P9 pede. Esforço G (dirty-tracking + guard em 4 arquivos) — candidato a ciclo próprio, não a item avulso.
- PL-C2-BUS-5 [S3] `SecuritySettings.tsx` mostra "Em breve" (P4 proíbe explicitamente — a própria origem do princípio cita este arquivo). Sem dado de sessões/log — implementar exigiria backend; esconder a seção inteira equivale a tirar um item do menu (fora do escopo do ciclo). Registrar como proposta de produto se for revisitado.
