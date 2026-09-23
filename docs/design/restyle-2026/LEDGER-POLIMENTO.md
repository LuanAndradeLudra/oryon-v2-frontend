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
| T5 | Home | em curso | 1 | 4,0 |
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
| F1 | Atender conversa da fila até resolver (atribuir, responder, template, etiquetar, resolver) | em curso | 1 | Fila→abrir→Assumir→responder→etiquetar(3)→Resolver ≈ 8 cliques; J/K/E/R existem |
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

### Ciclo 3 — F1 Atender conversa da fila até resolver (fluxo) — 2026-09-22 20:0x
Percurso medido ao vivo: aba **Fila** (1 clique) → abrir conversa (1) → ações do header disponíveis (Assumir · Resolver · ··· · Info) → responder no composer → etiquetar (Editar → buscar → aplicar, 3) → Resolver (1). ≈ **8 cliques**; com teclado, J/K/E/R cobrem navegar, resolver e atribuir.
Notas: hierarquia 4 · eficiência 4 · feedback 3 · consistência 4 · densidade 4 · copy 4 · a11y 4 · perf 4 · mercado 3 (média 3,8)
Achados:
- PL-3-1 [S2] (P7) Resolver/reabrir é ação **reversível de 1 clique (ou da tecla E)** e o toast só informava — sem "Desfazer". O board de Funis já usa esse padrão (`PipelineBoardTab`). — **feito** `3bd0d65` (toast 8 s com Desfazer; sem Desfazer quando há desfecho de negócio, porque aí a reversão não é só de status)
- PL-3-2 [S2] (P5) Atalhos **J/K/E/R** só eram ensinados no estado vazio do chat; depois de abrir a conversa ninguém mais descobre (Intercom/Front ensinam no tooltip do próprio botão). — **feito** `ee0dd4f` (tooltip "Assumir a conversa (R)" e "Resolver e ir para a próxima (E)")
- PL-3-3 [S1] (P6) **Dashboard fica em esqueleto infinito quando a API não responde** — derrubei o backend e recarreguei /dashboard: 11–12 blocos `animate-pulse` por mais de 30 s, sem ErrorState, sem "Tentar de novo", nada no console. O `ErrorState` que o Farol acabou de adicionar cobre o catch do fetch, mas não o caminho de falha de rede. — **repassado ao Farol** (PL-C3-FAR-1), fora do meu orçamento de 3 itens.
Medições ao vivo feitas para os agentes: seletor de período do Dashboard agora tem só Hoje/7 dias e **filtra de verdade** (39 → 13 elementos no gráfico ao escolher Hoje).
Registrado em DECISOES: nenhum.
Próximo: T5 Home (ciclo 4); ciclo 6 = fluxo F2.

### Ciclo 4 — T5 Home (tela) — 2026-09-22 20:4x — **ênfase visual/layout (eixo 10)**
Notas: hierarquia 4 · eficiência 4 · feedback 4 · consistência 3 · densidade 4 · copy 4 · a11y 4 · perf 4 · mercado 4 · **visual/layout 3** (média 3,8)
Achados:
- PL-4-1 [S2] (eixo 10 / P8) **Padding desigual na mesma família de cards**: 8 cards refeitos à mão com `p-5` (20px) + 1 `Card` com `p-4` (16px), enquanto o primitivo usa `p-3.5` (14px) — três medidas lado a lado na mesma tela. — evidência ao vivo: paddings 20/16/0; depois **todos 14**. — **feito** `828c8a2`
- PL-4-2 [S3] (eixo 10 / P15) **Números sem separador de milhar** na Home ("1948", "5191", "1019") enquanto o resto do app escreve "5.191". — **feito** `828c8a2` + `e0d91c4` (ao vivo: "1.948 conversas abertas aguardando atendimento")
Verificado e SEM defeito: ritmo vertical constante de **24px** entre cards nas duas colunas; topo das colunas alinhado (y=182 nas duas); larguras 984 + 480 com gap 24; faixa de KPIs com a mesma escala do Dashboard (valor 26/800, −0,02em).
Registrado em DECISOES: nenhum.
Próximo: T12 Navegação global (ciclo 5) — sidebar/TopBar/busca/notificações/créditos, medindo alinhamento e alturas entre as peças.

### Ciclos paralelos dos agentes — 2026-09-22 20:3x–20:5x (registrados pelo Maestro)
**Farol — T4 sobras + T7 Campanhas (eixo 10) e o S1 de rede**
- PL-C3-FAR-1 [S1] (P6) Loading infinito com a API fora do ar. Causa-raiz **não era do Dashboard**: o interceptor de retry (`services/api.ts`) tratava qualquer erro sem status como transitório, inclusive `ECONNABORTED` (timeout) — com timeout de 30 s e 2 retentativas, ~91,5 s antes de qualquer catch. Agora timeout não é retentado. — `db31620` — **verificado ao vivo: esqueleto some em ~15 s**
- PL-C4-FAR-1 [S1] (P6) **ABERTO, sucessor do anterior**: sem API, a área de conteúdo do Dashboard fica só com o título "Métricas Principais" — página em branco silenciosa, sem ErrorState e sem "Tentar de novo" (medido ao vivo com o backend derrubado; volta ao normal quando sobe). Repassado ao Farol como prioridade.
- PL-C2-FAR-eixo10-1 [S3] cabeçalho `min-h-10` em SalesFunnelCard (2×) e TeamMiniCard contra `h-10` dos irmãos do mesmo grid — `a5018b8`
- PL-C3-FAR-eixo10-1 [S3] (P4) kebab de TemplatesTab (p-1/ícone 14) menor que o gêmeo de CampaignsTab (p-1.5/ícone 16) na mesma tela — `f10dc92`
**Bússola — T11 Configurações + T10 Conectores (eixo 10)**
- PL-C2-BUS-6 [S3] gap da coluna de campos: Vocabulário em 12px (canvas 2e) e Minha Conta/Perfil da Empresa/Perfil do WhatsApp em 16px para a mesma peça — `762b0b8`
- PL-C2-BUS-7 [S3] chips de status de WhatsAppHealth e WhatsAppNumbers sem altura fixa (10–12px) contra o padrão já convergido h-20/px-7/r-5/11-bold — `1231972`
**Decisão do Maestro (raio de 4px):** os ~15 mini-chips do wizard de campanha em `rounded` (4px) **ficam como estão** — 4px é o piso real da escala (canvas 1a RAD-09: contador, checkbox, "Em breve"); faltava token. Criado `--radius-2xs` (4px) e a régua do `index.css` atualizada — `bec4ef6`.
**Medição para a Bússola:** ação de linha em /settings/agents mede 28×28 (padding 6, raio 8, ícone 14) com linha de 48px → recomendado unificar os 3 padrões em 28×28 raio **6** com hover `--rowhover` (CONV-CHAT-36).
Não verificável neste ambiente: VolumeChart no caso "sem mensagem hoje" (o dataset local tem mensagens de hoje — conversa de teste do composer).

## Achados abertos (backlog do loop)
<!-- Achados vistos e não feitos, para ciclos futuros priorizarem S1/S2 de qualquer tela. -->
- PL-1-4 [S3] (P6) O "carregando" da lista ainda é spinner + "Carregando…" em vez de skeleton de linhas (`ConversationList.tsx` ~l.175). Perf percebida.
- PL-C2-CAR-4 [S3] (P8) "Mover ▾" do card do board (alternativa ao drag por toque) tem 22px de altura — abaixo do piso de 32px desktop do P8 (`DealsBoard.tsx`, botão com `h-[22px]`).
- PL-C2-CAR-5 [S3] (P4) Aba Relatórios do funil não usa o vocabulário do resto da tela: pílula de período em `bg-brand-600` cru (deveria ser o mesmo `SegmentedControl`/chip do board bar) e filtro de dono é um `<select>` nativo (o board bar já tem o padrão `Dropdown` com avatar+nome pro mesmo filtro, em `BoardFilterBar.tsx`).
- PL-C2-CAR-6 [S3/proposta de produto] (mercado) Card do kanban não tem ação rápida "Marcar ganho/perdido" fora do drag/ficha (HubSpot e Pipedrive têm um atalho no `⋯` do card). Mudaria o menu do card — não implementado por não ser defeito, é decisão de produto; registrar se aparecer de novo.
- PL-C2-BUS-4 [S2] (P9) Modelo de salvamento "registro único" (MyAccount, CompanyProfile, CompanyBrain, WhatsAppBusinessProfile) usa botão sempre visível + toast, não a barra fixa "Alterações não salvas · Descartar · Salvar" com guarda de navegação que o P9 pede. Esforço G (dirty-tracking + guard em 4 arquivos) — candidato a ciclo próprio, não a item avulso.
- PL-C2-BUS-5 [S3] `SecuritySettings.tsx` mostra "Em breve" (P4 proíbe explicitamente — a própria origem do princípio cita este arquivo). Sem dado de sessões/log — implementar exigiria backend; esconder a seção inteira equivale a tirar um item do menu (fora do escopo do ciclo). Registrar como proposta de produto se for revisitado.

### Ciclo 5 — T12 Navegação global (tela) — 2026-09-22 20:5x–21:3x — **ênfase visual/layout (eixo 10)**
Notas: hierarquia 4 · eficiência 4 · feedback 4 · consistência **2** · densidade 4 · copy 4 · a11y 4 · perf 4 · mercado 4 · **visual/layout 2** (média 3,6)
Achados:
- PL-5-1 [S2] (eixo 10 / P4) **Duas escalas de ícone convivendo no produto, invisíveis no código.** `src/lib/icons.tsx` é um drop-in do `lucide-react` (alias no `vite.config.ts`) e o `index.css` escalava `svg[data-oryon-icon]` em **1,4×**; o que o set da casa não desenha cai no lucide de verdade (`svg.lucide`) e ficava **sem a escala**. — evidência ao vivo na sidebar: 11 ícones desenhando **23,1px** ao lado de 2 desenhando **16,5px**, todos com a **mesma classe `w-[16.5px]`** (40% de diferença); mesmo desencontro em 14px (19,6 × 14,0). Atinge o app inteiro, não a sidebar. — corrigido na origem (a regra passa a cobrir `svg.lucide`) — **feito** `81c6495` (depois: 16,5 → 23,1 e 14,0 → 19,6; sobreposição ao contêiner igual à que os ícones da casa já tinham).
  - **Consequência de método, vale para todos os agentes:** classe de tamanho de ícone **não** é o tamanho na tela. Nenhum achado de "ícone maior que o irmão" pode ser feito por leitura de código.
- PL-5-2 [S3] (eixo 10) Traço: set da casa usa 1.75, lucide usa 2. Os 2 ícones da sidebar fora do set (`Handshake`/Funis, `LineChart`/AI Observabilidade) pesavam mais que os 11 vizinhos — `strokeWidth={1.75}` no call site — **feito** `81c6495`.
- PL-5-3 [S3] (eixo 10) **Barra recolhida torta:** com a sidebar em 62px, os 13 ícones tinham centro em **x=28** contra o centro real da barra em **30,5** — e o avatar do rodapé já estava centrado (30,6), então a coluna de ícones lia como deslocada. Causa: `px-2` + `gap-2` + **`flex-1` no rótulo**, que tem largura 0 mas continua *crescendo* e empurrando o ícone. (Primeira tentativa só com `justify-center px-0 gap-0` **piorou** para x=20 — foi a medição que pegou; o `flex-1` era o culpado.) — **feito** `81c6495`: os 14 elementos passam a compartilhar o centro 30,6. Expandida: inalterada (cx=28, item 207px).
- PL-5-4 [S2] (eixo 10, fidelidade ao canvas 7a) **Fileira direita do TopBar com duas alturas e dois raios:** canvas mede busca 200×28 r7 · sino 28×28 r7 · avatar 28; o app tinha busca 28/r7 mas sino e Copilot em **32×32 r8**. Junto, o contador de não lidas era 16px pendurado **2px para fora** do botão, enquanto o canvas o põe dentro (top 2 / right 0, 14px). — **feito** `7f76381` (medido depois: sino 28×28 r7, contador 17×14 contido no alvo).
Verificado e SEM defeito: TopBar 48px, `px-16`, fundo `#161E1E`, hairline inferior `#243333` (canvas bate); os 9 elementos da barra compartilham a mesma linha de centro (cy 23,6); pílula de busca e `kbd` "/" batem número a número com o canvas 7a (200×28 r7 · kbd r4 pad 0 4px borda `--bd2`); item da sidebar 32px, raio 6, passo 34px (32+2), grupos separados por 35px.
Registrado em DECISOES: **#18** (escala única de ícone) — ver `DECISOES-PENDENTES.md`.
Aberto, não feito (fora do orçamento): contador do sino usa `rounded-full` onde o canvas pede raio 7 (idêntico a 14px de altura, sem efeito visual — só vocabulário); `kbd` com 3 grafias diferentes de raio no app (`TopBar.tsx` tem `rounded` cru **e** `rounded-[4px]` no mesmo arquivo, `ChatWindow.tsx` usa `rounded-xs`) — todos computam 4px hoje, então é higiene de token (`--radius-2xs`), não defeito visual.
Próximo: ciclo 6 = **fluxo F2** (Lead → contato → negócio → mover etapas → ganhar/perder), pela regra do 3º ciclo.

### Ciclos paralelos dos agentes — 2026-09-22 21:0x–21:4x (registrados pelo Maestro)
**Cartógrafo — T3 Funis (revisita visual) + T6 Agentes IA (completo)**
- PL-C2-CAR-5/7 chip secundário do cabeçalho de coluna em `rounded` cru contra os 30+ `.color-chip-soft` do app em `rounded-xs`; skeleton do card com raio 10 anunciando um card de raio 8 — `c534726`
- PL-C2-CAR-6 [S2] (P4) aba Relatórios do funil usava `rounded-xl` + pílula de período em `bg-brand-600` **sólido** (único segmentado assim no app) + `<select>` nativo pro dono, na MESMA página onde a aba Quadro já usa `SegmentedControl` e o recipe de `FilterSelect` — trocado pelos componentes de verdade, não só pelas cores — `196690a`
- PL-C2-CAR-8/10/13 raio cru → token (`rounded-sm` no input de probabilidade, `--radius-2xs` nos `kbd` do diálogo e no mini-chip do catálogo) — `2c11055`, `244b3aa`, `5a50cea`
- PL-C2-CAR-9 `DocStatusBadge` (aba Conhecimento) usava `.color-chip` **sólido** — classe de etiqueta — para um STATUS; virou `color-chip-soft` nos 4 estados — `7541ab2`
- **PL-C2-CAR-11 [S2] o melhor achado da rodada:** os 4 botões do rodapé do `AgentBuilderWizard` eram `<button>` à mão reproduzindo o primitivo com a franja errada — **sem `focus-visible` nenhum dos 4** e, no CTA primário (Continuar/Publicar), `hover:brightness-110` onde todo primary do app usa `brightness-90`: **o botão mais importante do wizard reagia ao contrário do resto do produto**. Trocados pelo `Button`; segundo caso idêntico em "Gerar System Prompt com IA" — `5ef01d9`, `20c43d8`
- PL-C2-CAR-12 raio 10 onde a escala pede 8, espalhado por Agentes — prova de que era acidente: o **mesmo** botão (mesmo handler, mesmo ícone) aparece 2× na mesma tela com raios diferentes — `6129bc9`
- Aberto: `HandoffRuleBuilder.tsx` (1.295 linhas) tem mais `rounded-xl` não tocados — decidiu não julgar em bloco sem ver a tela; medir ao vivo quando voltar.
**Bússola — T10 Conectores + T11 Configurações + início de T9 Agenda**
- PL-C2-BUS-8 botão de ação de linha unificado em 28×28 (ícone 14, `--radius-xs`, hover `--rowhover`) em **11 arquivos** — a partir da medição ao vivo em `/settings/agents` — `4da0e83`, `d65421d`
- PL-C2-BUS-9 `ConnectorDetailModal`: X de fechar em raio 8 contra os 28×28/raio 7 do canvas, e `hover:bg-surface-800` **idêntico ao fundo do próprio modal** (hover invisível); `ConnectorCredentialModal`: prévia mascarada da credencial com geometria diferente do `Input` que ela substitui — havia um "pulo" visual ao clicar para editar — `20b8ece`
- PL-C2-BUS-10 `strokeWidth={1.75}` nos ícones que caem no lucide e ficam ao lado de ícones da casa (ConnectorBadges, WhatsAppHealth, WhatsAppNumbers) — aplicação direta do PL-5-1 — `d00ee75`
- PL-C2-BUS-11 [S2] T9 Agenda: o chip de Origem do popover tinha **2 caminhos para o mesmo slot** (primitivo para "Agente Vendas", `span` à mão para as demais origens, com altura/raio/peso diferentes) — **o card mudava de tamanho conforme o compromisso** — `1760181`
- PL-C2-BUS-12 limpeza de token: mais 9 arquivos com `rounded-[7px]/[8px]/[10px]` arbitrário → tokens existentes — `259d9a7`
**Farol — causa raiz do PL-C4-FAR-1 (fechada pelo Maestro, ver abaixo)**
- Teto de 35 s → 15 s — `cb45a9b`; descartou por leitura proxy do Vite e instância paralela de axios.
- PL-C2-FAR-eixo10-2 chip do Step 3 do wizard de campanha com opacidade/padding próprios contra o `chipBase/chipOff` dos outros 4 grupos do mesmo wizard — `ab9e83a`

**Causa raiz do carregamento longo (medida pelo Maestro, sem instrumentar código)** — técnica: `performance.getEntriesByType('resource')` com o backend derrubado dá o tempo de CADA requisição.
1. Conexão recusada **não é instantânea nesta máquina**: `fetch` para uma porta sem ninguém escutando leva **2.385 ms** (Windows tenta `::1` e depois `127.0.0.1`).
2. **Cada URL aparece 2–3× no timing** → o interceptor ainda retenta **erro de conexão** (o `db31620` tirou só o timeout; erro de rede sem status continua "transitório").
3. As durações sobem em degraus exatos (2360 / 4707 / 8243 / 10591) — assinatura da fila de 6 conexões do Chrome. ~14 endpoints no mount × 3 tentativas ÷ 6 canais × 2,4 s → passa de 15 s.
→ Fix pedido ao Farol: parar de retentar erro de conexão (manter retry só para 502/503/504). Esperado: ~40 requisições viram ~14, erro na tela em ~4 s, e o teto de 15 s vira rede de segurança de verdade. **Medição de fechamento pendente.**

**PL-C4-FAR-1 — FECHADO (medição de fechamento pelo Maestro, 2026-09-22 21:5x)**
Fix do Farol `09df445`: retry só para 502/503/504/408/429 (infra que de fato respondeu) + `ECONNRESET`; erro de conexão pura não é mais retentado.
Linha do tempo do defeito, toda medida ao vivo com o backend derrubado: **>35 s com página em branco** → 35 s com ErrorState (`9eca7ca`) → 15 s pelo teto (`cb45a9b`) → **entre 6 s e 12 s sem depender do teto** (`09df445`). Com o backend de volta: dashboard normal, 174 números, zero erro — o interceptor é compartilhado por todo o app, então essa era a verificação que importava.
Nota para não reabrir: depois do fix ainda aparecem 34 requisições para 17 URLs únicas (`auth/me` ×4, `internal/channels` ×3, o resto ×2). **Não é retry residual — é o React StrictMode**, que monta efeito 2× em desenvolvimento e não existe no build de produção. Em produção são ~17 requisições → ~7 s até o erro.

### Ciclo 6 — F2 Lead → contato → negócio, **percorrido como fluxo e julgado pelo eixo visual** — 2026-09-22 21:4x
Desvio deliberado da regra "3º ciclo = fluxo": a ênfase do usuário é visual, então percorri o fluxo medindo **a mesma peça em cada tela** em vez de contar cliques. É o melhor teste de eixo 10 que existe ("a mesma peça com a mesma medida em telas diferentes").
Notas: hierarquia 4 · eficiência 4 · feedback 4 · consistência 3 · densidade 4 · copy 4 · a11y 4 · perf 4 · mercado 4 · **visual/layout 3** (média 3,8)
Achados:
- PL-6-1 [S2] (eixo 10 / P4) **Primitivo presente mas anulado.** As duas ações do header do painel do contato eram `Button size="sm"` com override em `!important`: `!h-[26px] !px-[9px] !text-[11.5px] !rounded-xs`. O README §3.3 pede "duas ações `sm`", e `sm` é h-7/px-2.5/raio 7/texto 12. O componente certo estava no código, anulado por cima — **invisível numa revisão por leitura**, que vê `Button size="sm"` e dá por bom. — **feito** `06c425f`
- PL-6-2 [S3] (eixo 10) **Terceira geometria no mesmo painel de 308px:** o filtro "Hoje" da Timeline era botão à mão (raio 10, `py-1` → 25,7px, borda `--bd`) ao lado das duas ações acima. — **feito** `06c425f` (os três agora: h28 / px10 / raio 7 / borda `--bd2`, medido ao vivo)
- **Varredura do padrão, resultado negativo e útil:** `grep` por `!h-[`, `!px-[`, `!py-[`, `!w-[`, `!text-[`, `!rounded` em todo o `src` → **0 ocorrências restantes**. O caso do painel era o único no produto; o padrão não é sistêmico e não precisa de regra de lint.
Verificado e SEM defeito: `/contacts` tem uma só altura de botão (28) e um só raio (7) na barra superior; avatares da tabela todos 24px; TopBar idêntico entre `/contacts`, `/conversations` e `/home`.
Aberto (registrado, não feito): **nenhuma tela tem `h1`/`h2`** — o título da página é um `span` no TopBar (o canvas 7a também desenha um `span`), então leitores de tela não têm cabeçalho de página. É a11y, não visual; fora da ênfase atual.
Suite: **não rodada** — 0,37 GB de RAM livre contra o piso de 1,5 GB. `tsc -b` limpo. Pendente: suite de `conversations` + a do interceptor (mudança do Farol em `services/api.ts`).
Próximo: T2 Contatos está com o Cartógrafo (drawer/ficha), T8 com o Farol, T9 com a Bússola. Meu próximo alvo: revisita de T1 Conversas (composer e cabeçalho do chat) ou o fechamento da rotação.

### T8 Automação — primeira passada (Farol) + a maior divergência da rodada — 2026-09-22 22:0x
**Medição do Maestro que abriu o achado:** em `/automations`, a pílula "Buscar" do TopBar (h28 / raio 7) estava na MESMA tela servindo de régua ao lado de controles que mediam **29,7 / 28 / 33** de altura e **8 / 7** de raio. Quatro alturas e dois raios numa barra só. Causa comum aos quatro: **altura vinda de `py-1.5` em vez de altura fixa** — por isso caía em 29,7, um número que nenhuma escala produz.
- **Fix na primitiva, não na tela** (`1dead99`, `70437bc`): `LineFilterChip` é compartilhado (Campanhas/Automações/Conversas) e tinha o mesmo defeito → `h-7`/`rounded-sm` lá conserta os 4 usos. `TypeFilterChip` (cópia local do mesmo componente em `AutomationsPage`) recebeu a mesma correção. "Nova automação"/"Descrever com IA" trocaram o `<button>` à mão pelo `Button` (`size="sm"`), o que resolveu de brinde o `bg-brand-600` cru.
- **Verificado ao vivo pelo Maestro:** `/automations` passou a ter **uma altura (28) e um raio (7)**; e como a mudança foi num componente compartilhado, medi os outros consumidores — `/campaigns` e `/conversations` sem regressão. (Abas medem 27,5 em Campanhas e 28,0 em Conversas: arredondamento da borda de 0,87px do contorno, mesmo `size="sm"` — descartado, não perseguir.)
- Outros achados de T8, todos token contra primitivo documentado (não exigem navegador): menu "Mais ações" feito à mão alinhado ao `Dropdown` (`c8cba65`); 11 tipos de ação do Step 3 com `#a1a1aa` cru — zinc do Tailwind, nenhum token — trocados por `--color-surface-400`, preservando o `TYPE_ACCENT` que É deliberado (`8f0011f`); 3 modais de confirmação à mão com scrim cru, `bg-surface-950` (fundo de PÁGINA) no painel e `max-w-sm` em vez do `max-w-[400px]` do `ConfirmModal` (`0443d9f`).
**T1 Conversas (Cartógrafo)**: badge "Movida para X" era pílula solta (`rounded-full`, 9px, caixa alta) sem par em lugar nenhum do app, duas linhas acima dos chips de status corretos do mesmo item — alinhado ao vocabulário deles (`484c0fb`); busca do flyout "Equipe" com receita própria contra a busca principal da MESMA tela (`74a3939`); ícone de remover atribuição com preenchimento estático (`76dfd81`).
**Decisão do Maestro:** `AgentActivitySection` — sucesso discreto × falha com par completo de cor **fica como está**; é o padrão correto de feed de atividade (o usuário só precisa parar quando deu errado). Não criar `status-success-900/300` só por simetria: token nasce de necessidade.
**Correção de rumo registrada:** o Cartógrafo relatou os botões do painel do contato como "batendo"; não batiam — eram o primitivo anulado por `!important` (ver PL-6-1). Regra que passou a valer para todos: **`Button size="sm"` com `!h-`/`!px-`/`!rounded-` por cima não conta como "usa o primitivo"** — é botão à mão até prova em contrário, e é onde a divergência se esconde de uma revisão por leitura.
**Achado a11y de passagem (registrado, não mexido):** a linha da tabela de automações não expõe link nem botão — não é alcançável por teclado.

### Ciclo 7 — T1 Conversas (chat) + tema claro — 2026-09-22 22:2x — **ênfase visual/layout**
Verificado e **SEM defeito** (registro para ninguém reabrir):
- **Cabeçalho do chat**: "Assumir", "Resolver", "Mais ações", "Informações do contato" — os quatro em h28 / raio 7, iguais entre si e iguais à barra superior. Composer: ícones de ação 28×28 (README §3.3 pede 28), campo 13px.
- **Tema claro**: a moldura (shell + sidebar) **continua escura de propósito** — está documentado no `index.css` ("SEMPRE escuro, independente do tema; shell + sidebar são a moldura do app"), então a hairline `#243333` e o texto `#8FA5A5` na sidebar **não são vazamento de token do escuro**. TopBar no claro: branco com borda `#C9CFDA` (o tom escurecido que o usuário pediu, DECISÕES #8). Medido, não deduzido.

### Pendente para a retomada — pergunta do Farol em aberto (varredura transversal `py-` sem `h-`)
Ele rodou o grep: **116 candidatos em ~55 arquivos**, 69 com `rounded-lg`. Conferiu 3 amostras antes de mandar a contagem e mostrou que a assinatura sozinha mistura **4 categorias**: (A) chip/gatilho de barra — o defeito provado em Automações; (B) botão de rodapé de modal/wizard, que é categoria própria (h-9/h-10); (C) botão dentro de banner colorido (`bg-white/15`), família consistente entre suas 5 instâncias; (D) falso positivo (cabeçalho de acordeão, texto). Perguntou se refina o grep ou classifica os 116 um a um.
**Resposta a dar quando retomarmos:** nem um nem outro — **medir em tempo de execução**. O sintoma real é "controles-irmãos no mesmo contêiner flex com alturas ou raios diferentes entre si", que é exatamente o que medi em Automações. Isso é detectável no DOM sem nenhum falso positivo (o grep não sabe o que é irmão de quem nem qual altura de fato sai na tela — e, depois do achado da escala 1,4× dos ícones, já sabemos que o código não diz o tamanho renderizado). Sonda pronta em `scratchpad/irmaos.js`: percorre cada contêiner `display:flex` em linha, pega os filhos clicáveis, ignora grupos de `role="tab"` (legitimamente iguais) e reporta divergência de altura/raio entre irmãos. O Maestro roda por rota e entrega a lista pronta; o Farol corrige. Divisão certa: quem tem navegador mede, quem não tem corrige.

### T4 Dashboard (Cartógrafo) — 2026-09-22 22:2x
- PL-C2-CAR-20 `InsightCard` (e o skeleton dele) em `p-4` contra os **6 irmãos do mesmo grid** em `p-5`, todos na mesma receita `bg-surface-800 border border-surface-700 rounded-lg`. Skeleton corrigido junto — senão a troca carregando→carregado produzia layout shift. É o mesmo defeito do Ciclo 4 na Home (três paddings na mesma família de cards).
- PL-C2-CAR-21 `rounded` genérico → `rounded-2xs` em 2 pontos (skeleton do InsightCard, legendas do CsatChart).
- Verificado e sem defeito: os 4 cards do grid superior já em `h-10` fixo (correção anterior do Farol); cores dos gráficos vêm de token via `useChartColors()`, nenhum hex cru dentro dos arquivos de gráfico. `ActivityFeed`/`AgentTable` usam cabeçalho com divisor em vez de título solto — **arquitetural** (corpo com scroll interno precisa de cabeçalho fixo), não é defeito de vocabulário; não mexido, e concordo.

### Decisão pendente para a retomada — PL-C2-CAR-22 (token da categoria "Marketing")
`KpiGrid.tsx:17`, mapa `CATEGORY_COLORS` do seletor "Configurar KPIs": 8 das 9 categorias usam token (`--color-accent-*`, `--color-status-muted`, `--color-warning`); só **Marketing** usa `#1877f2` cru. Não é cor de plataforma externa (o azul da Meta é coincidência) — é categoria interna do produto, logo deveria ser token como as outras 8. O Cartógrafo parou no lugar certo: os 6 `accent` disponíveis (blue/green/violet/amber/rose/cyan) já estão ocupados pelas outras categorias, então não dá para trocar sem colisão — exige **token novo no `index.css`**, que é domínio do Maestro.
**Recomendação a aplicar na retomada:** criar um 7º tom de categoria em vez de reusar (reuso faria duas categorias com o mesmo ponto colorido, que é pior que um hex cru — o ponto existe justamente para distinguir). Uma paleta de categorias que "acabou" é sinal de que falta uma entrada, não de que a última categoria deva se repetir. Verificar antes se `#1877f2` não é simplesmente o valor de `--color-accent-blue`; se for o mesmo tom, o novo token deve nascer com hue distinto o suficiente do azul de Atendimento.

## Rodada 3 — reestilização TOTAL de Disparos, Modelos e Criação de modelo (2026-09-22 23:0x → 23-09 00:5x)
Pedido do PO: "não estou gostando dessa grade"; "o botão de relatório sumiu"; "reestruturação total da criação de templates, alinhada com o painel da Meta"; prévias "exatamente o padrão do WhatsApp". Autonomia dada; decisões por AskUserQuestion + artifact comparativo (https://claude.ai/artifact/BRiyynAuahmCdRYASuKmhV): **Disparos = cards com resultado embutido · Criação = dois painéis com prévia fixa · Prévia = fiel ao WhatsApp · Linguagem = C (Attio/Linear, densa e elegante)**.

**Prévia do WhatsApp (`TemplatePreview.tsx`, `3d8a96b`)** — reescrita com valores **amostrados pixel a pixel** de 3 prints do painel da Meta (canvas + getImageData; moda p/ fundo, pixel mais escuro p/ texto, mais saturado p/ acento): papel `#E5DDD5` (era `#EFE7DD`), balão `#FFFFFF`, texto `#11191D`, hora/rodapé `#6C7E85`, divisor `#EEF2F1`, **botão link/telefone/copiar `#077CB3` e resposta rápida `#1B8755` (verde!)**. Erros estruturais da versão antiga: moldura de celular com cabeçalho `#075E54` (a prévia da Meta não tem moldura), `✓✓` em mensagem RECEBIDA (tique só existe no que o contato envia), botões fora do balão, fonte do produto (WhatsApp usa a do sistema). API mantida → 4 consumidores corrigidos de uma vez. **Tema escuro não implementado: sem captura de referência, não voltar a inventar.**
**Catálogo de modelos (`5495228`)** — grade → lista de 44px + painel de detalhe (Twilio/WhatsApp Manager são lista). Regressão minha pega ao vivo: painel em `xl` sumia em 1240px sem modal → `lg` + 360px. Farol (`6b4b7db`, `aeefa3b`): modal abaixo de 1024 (confirmado em 768: abre/fecha com Esc), idioma+data ocultos <640, busca da barra 37→28px.
**Disparos (`0052b60`)** — tabela → cards com progresso + métricas; **"Ver relatório" vira botão** (estava dentro do `···`); `failed` também mostra relatório. Farol: nome `min-w-0`, data oculta <sm (390: 0 cards estourando, kebab 17px dentro).
**Criação de modelo** — `ce9ce4e` ícone da categoria no cabeçalho (pedido do PO) + barra lateral de 176px removida (formulário 662→838px); **`Section` vira faixa rótulo-à-esquerda (104px) → os 4 passos mudam juntos** (`805ed4e`); passo 1 no padrão do print da Meta (segmentado + rádio); passo 2: contador DENTRO do campo, pílulas de cabeçalho, sem caixas de dicas. `constants.ts`: sino/chave como a Meta.
**Erros meus, registrados como regra:** (1) escrevi uma trilha de passos à mão ao lado do `WizardProgress` — o Cartógrafo apontou; substituído pelo primitivo, cujos valores vêm do canvas (CAMP-WIZ-07..13). (2) copiei valores de campo à mão em **32px, fora da régua sm 28/md 36/lg 44** do `Input` — trocado pelos primitivos `Input/Select/Textarea` md. **Regra: quando o mockup for meu, procurar primitivo antes de desenhar — inclusive contra o mockup.**
Aberto: a11y — `Modal` não expõe `role=dialog`; resumo do modelo invisível em 390 (S3, opção: ocultar <sm). Suíte de testes **ainda não rodou** (RAM 0,25–1,24 GB; piso 1,5 GB).

### Rodada 3 — continuação (23-09 00:5x → 01:4x)
- **Criação de modelo, passos 2/3/4** (`e2bb0c8`, `795912b`, `6e84b73`): campos passam a ser os primitivos `Input/Select/Textarea` **md 36px** (a 1ª versão copiava 32px à mão — fora da régua; erro meu, registrado como regra); passo 3 em faixas com `Select sm` + ação de linha 28px + `Input md` com contador dentro; passo 4 = lista rótulo/valor + linha de 3 etapas. Lint pegou `Contador/Ajuda/Linha/Etapa` criados **dentro do render** (remontam a cada render) → içados pro módulo. Painel direito mostrava **duas prévias empilhadas** no passo 4 → uma só (`commit acima`).
- **Medido ao vivo (1240):** passo 3 — faixa x=90, "Adicionar botão" 28/r7, tipo `Select` 28×192, remover 28×28, texto 36px + `0/25`; passo 4 — faixas x=90, linhas 29px, etapas 600/500/500, rodapé 36px.
- **Cartógrafo — `CampaignWizard.tsx` (`0420430`)**: 4 etapas na direção C; **copiou a minha receita errada** (3× `h-8`, 3× `bg-surface-900`, 0 primitivos, 9 campos crus) → devolvido com número; regra: quando a referência for código meu, conferir se usa primitivo — se não, apontar, não copiar.
- **Bússola — `CampaignReport` + `AttributionTab` (`4669247`, `a62a5e9`, `2c9f2f2`)**: `StatStrip.tsx` novo (6 repetições → 1 componente); rótulo 10→11px (P8); número 18/700 documentado como **tier compacto** distinto do KPI 26/800 (`KpiGrid.tsx:50`). Catch silencioso → `ErrorState` (P6). Medido ao vivo: item 80px, 18/700, 11px, hairline `--bd`, grupo r8.
- **Farol — responsivo + modais (`6b4b7db`, `aeefa3b`, `2920a26`, `a51af43`, `a8251c8`)**: modal de prévia <1024 (medido em 768: abre/fecha), idioma/data/resumo ocultos <sm, card de Disparos em 390 sem estouro (kebab 17px dentro), `DuplicateTemplateModal`/`AssignWabaModal` com scrim/hover/seleção em token. Próximo: `SubcategoryPreview.tsx` na paleta amostrada.
- Portal está em **tema claro** (`oryon-theme=light`) desde ~01:00 — não fui eu desta vez; medições de cor a partir daí são do claro.

### Quase-acidente de medição — 23-09 ~02:0x (registrado como regra)
Ao percorrer o `CampaignWizard` com sonda automática, o wizard fechou no meio, o seletor de "avançar" caiu no `document` inteiro e **clicou em "Excluir"** no painel de detalhe do catálogo de modelos. A exclusão exige confirmação: o `ConfirmModal` ficou aberto, foi fechado com Esc, e a contagem conferida — **61 modelos na lista, 61 no banco (`whatsapp_templates`)**. Nada perdido.
**Regra a partir daqui:** (1) sonda de medição **só lê** — `getBoundingClientRect`/`getComputedStyle`; (2) qualquer clique automático é **escopado ao painel-alvo** (ancestral `position:fixed` da trilha de passos) e ao **rótulo exato** do botão, nunca "o botão mais à direita do rodapé"; (3) botão cujo rótulo contenha Excluir/Remover/Apagar/Enviar nunca é clicado por sonda; (4) fluxo de várias etapas que exige dados é medido **etapa a etapa com o usuário ou o agente deixando a tela no passo**, não por travessia automática.
**Medido de verdade no wizard (etapas 1–2):** painel 1191×730; nome `Input md` 36, busca e linha `sm` 28, raio 7; faixas "Nome/Template/Destinatários" alinhadas em x=275; opções de público em linhas de 50px sem cartão; **linhas da lista de templates em 71px** (S3: a lista de rádio do criador ficou em 54 com duas linhas — vale nivelar). Etapas 3–5: `0` campos crus / `9` primitivos por leitura (`47bc3a1`); medição visual fica para quando a tela estiver parada no passo.

### Rodada 3 — fechamentos (23-09 02:1x–02:4x)
- **Suíte de testes rodou — 627 passaram, sem regressão** (Farol, no worktree dele, com a rodada quase inteira mesclada). Era a pendência mais antiga da sessão; só o fix "uma prévia só" (`5762066`) ficou de fora e é trivial.
- **`SubcategoryPreview.tsx` (Farol, `ba675fc`)** na paleta amostrada, sem moldura/cabeçalho/tique; `WA`/`FONTE_WA` exportados do `TemplatePreview` (fonte única). **Medido ao vivo no passo 1:** papel `rgb(229,221,213)` 304px, 0 cabeçalho verde, sem tique, balão branco com rabinho, Segoe UI.
- **`CampaignLeadsDrawer.tsx` (Bússola, `a756133`)**: P6 (catch → ErrorState), pílulas raio 5, busca no `Input` do produto, piso de 11px. **Não verificável localmente:** a aba Atribuição responde `Cannot GET /api/analytics…` (404 no backend local) — o que, por sinal, mostrou o `ErrorState` dela funcionando.
- **`CampaignWizard` (Cartógrafo, `47bc3a1`)**: 0 campos crus / 9 primitivos; etapas 1–2 medidas (nome 36, busca/linha 28, faixas x=275, público 50px). Linha de template em 71px = 3ª linha de variáveis (conteúdo, não padding) → decisão: **cortar a 3ª linha** (duplica a etapa 3; "mesma peça, mesma medida").
- Próximos: Farol → `CampaignsPage.tsx` (casca/abas); Bússola → varredura do que ninguém tocou em `campaigns/`; Cartógrafo → corte da 3ª linha + medição das etapas 3–5 pelo portal dele.
- **`CampaignWizard` passo 3 medido ao vivo (Cartógrafo dirigindo, eu só lendo):** segmentado "Origem do valor de {{1}}" 30/r7 com 3 abas; `Select` md 36; prévia compact em coluna de 220 com balão de 192 (cabe, sem tique); rodapé Voltar/Próximo 36px visível (y=585/760). Os 3 textos <11px encontrados eram da **sidebar atrás do modal** (eyebrow 10px TYPE-09 e badge "99+"), deliberados — nada do wizard abaixo do piso. Lista de templates após o corte da 3ª linha: **55px** (alvo 54–56). S3 aberto: passo 3 sem faixa `Section` (1 e 2 têm).
- `CampaignsPage.tsx` (Farol): varredura sem achado (0 raio fora da escala, 0 hex cru, 0 py+rounded-lg, Tabs canvas-verificado). Resultado negativo honesto, registrado como tal.
- **`CampaignWizard` passo 4 medido ao vivo:** opções Enviar agora/Agendar 598×52 sem cartão; rodapé 36px visível; sem texto do corpo <11px. **S3 devolvidos ao Cartógrafo:** (1) rótulo "Envio" em **x=261** vs x=275 dos passos 1–2 — coluna de rótulo deslizou 14px entre etapas; (2) opções sem `role=radio`/`aria-checked` (copiar o padrão da lista "Tipo" do criador). Passo 3 ganhou faixa "Variáveis" (`017808f`, **a mesclar só após o passo 5** — mesclar agora recarregaria o `:3011` e derrubaria o wizard parado).
