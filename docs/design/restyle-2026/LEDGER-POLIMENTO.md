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
| T3 | Funis / Negócios (quadro, card, detalhe, Relatórios) | pendente | — | — |
| T4 | Dashboard | em curso | 1 | 3,8 |
| T5 | Home | pendente | — | — |
| T6 | Agentes IA | pendente | — | — |
| T7 | Campanhas / Disparos | pendente | — | — |
| T8 | Automação | pendente | — | — |
| T9 | Agenda | pendente | — | — |
| T10 | Conectores | pendente | — | — |
| T11 | Configurações | pendente | — | — |
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

### Ciclo 2 — T4 Dashboard (Farol, em paralelo) — 2026-09-22 20:0x
Escolhi **T4 Dashboard** entre T4/T7 (Campanhas fica para o próximo ciclo): sem navegador conectado nesta sessão,
rastreio de código prova rigorosamente as duas classes de achado que encontrei em T4 (fetch/estado, dado exposto
no catálogo) sem precisar de medição ao vivo — em T7 os achados que eu já suspeitava (confirmação de "Enviar" sem
`impact`, `catch {}` nas abas do relatório) exigem abrir o wizard e ver o modal renderizado pra confirmar, o que eu
não conseguia fazer sem o portal.
Notas (avaliação por código, sem browser — hierarquia/a11y ficam conservadoras até uma medição ao vivo confirmar):
hierarquia 4 · eficiência 4 · feedback 4 · consistência 4 · densidade 4 · copy 4 · a11y 3 · perf 4 · mercado 3 (média 3,8)
Achados:
- PL-C2-FAR-1 [S1] (P14) `DateRangePicker` do header + segmentado do `VolumeChart` eram controle 100% inerte:
  nenhum dos dois endpoints do backend (`dashboard.controller.ts`) declara `@Query`, e `getMessagesAnalytics`
  sempre busca uma janela fixa de 7 dias — trocar "Hoje/7 dias/30 dias/Este mês" não mudava nenhum número da
  tela. — evidência: rastreio de código (controller sem `@Query`; comentário antigo do código estava errado) —
  esforço P — **feito** `444f486` (antes: 4 opções, nenhuma funcional → depois: 2 opções reais, "Hoje" filtra o
  gráfico no cliente de verdade)
- PL-C2-FAR-2 [S1] (P6) Falha de fetch do Dashboard (`catch` vazio) virava `buildEmptySnapshot()` — visualmente
  idêntico a "sem atividade hoje"; nenhum "tentar de novo". — esforço P — **feito** `0ee1514` (antes: dashboard
  zerado sem aviso → depois: `ErrorState` com retry, primitiva já existente)
- PL-C2-FAR-3 [S1] (P14) Customizador "Personalizar KPIs" oferecia 38 métricas como se fossem todas reais; só 13
  têm fonte em `fetchDashboard` (as outras 25 — bot/CSAT/NPS/SLA/Disparos/Marketing — caem no fallback `value: 0`
  sempre). — esforço P — **feito** `b58bd5e` (antes: 38 selecionáveis sem distinção → depois: 25 com rótulo "Sem
  dado" e desabilitadas pra adicionar; quem já tinha salvo continua podendo remover)
Achados vistos e não feitos (backlog, não é S1/S2 óbvio o bastante pro limite de 3 do ciclo):
- (P14/P1) `KpiStrip`/`KpiStripCell` não herdaram o aviso "sem dado" das células já ativas com `hasData: false` —
  só o customizador ganhou o aviso; alguém que já tinha CSAT/NPS salvo antes deste ciclo ainda vê um "0" mudo na
  faixa em vez de um rótulo explicando por quê. Esforço P, mesma raiz do PL-C2-FAR-3.
- (P9) `KpiCustomizerPanel` é um drawer feito à mão (`fixed right-0 … z-50`) em vez de `ui/Drawer` — mesmo padrão
  de "14 drawers manuais" já catalogado em `CATALOGO-PRIMITIVAS.md` §1.2. Esforço M (migrar sem quebrar o layout
  específico de categorias).
Verificado e SEM defeito (não virou achado): `KpiGrid` estrutura via localStorage sobrevive a KPI removido do
catálogo (`loadSlots` cai pro default só se o JSON falhar, não filtra ids órfãos — baixo risco, catálogo é
append-only hoje); loading skeleton espelha o grid real (sem layout shift) — já cumpria P6/perf antes deste ciclo.
Registrado em DECISOES-PENDENTES.md: #17 (seletor de período).
Gate: `tsc -b` limpo nos 3 commits; eslint só achados pré-existentes fora dos meus hunks (confirmado via
`git diff` a cada commit); suite completa rodada no fim do ciclo — 627 passed, os mesmos 4 falhas conhecidas do
baseline, nenhuma nova.
Pendente (medição ao vivo, sem navegador nesta sessão): confirmar visualmente que "Hoje" no `VolumeChart` filtra
de verdade (1 barra) e que o `ErrorState` renderiza corretamente ao derrubar o backend.
Próximo: T7 Campanhas/Disparos (ciclo seguinte do Farol).

## Achados abertos (backlog do loop)
<!-- Achados vistos e não feitos, para ciclos futuros priorizarem S1/S2 de qualquer tela. -->
- PL-1-4 [S3] (P6) O "carregando" da lista ainda é spinner + "Carregando…" em vez de skeleton de linhas (`ConversationList.tsx` ~l.175). Perf percebida.
- PL-C2-FAR-4 [S3] (P14/P1) `KpiStrip`/`KpiStripCell` não herdam o rótulo "sem dado" das células com `hasData: false` já salvas antes do ciclo 2 (só o customizador ganhou o aviso, `KpiGrid.tsx`). Esforço P, mesma raiz do PL-C2-FAR-3.
- PL-C2-FAR-5 [S3] (P9) `KpiCustomizerPanel` (`KpiGrid.tsx`) é um drawer feito à mão (`fixed right-0 … z-50`) em vez de `ui/Drawer` — um dos "14 drawers manuais" de `CATALOGO-PRIMITIVAS.md` §1.2. Esforço M.
