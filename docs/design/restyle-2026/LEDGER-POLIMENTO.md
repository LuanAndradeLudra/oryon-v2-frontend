# Ledger — loop de polimento enterprise (SCRUM-1097)

Regras em `PROMPT-LOOP-POLIMENTO-ENTERPRISE.md` (mesma pasta). Atualizado pelo agente ao fim de cada ciclo.

## Rotação de alvos
Ordem: segue a tabela; a cada 3º ciclo, pegue o próximo **fluxo** em vez da próxima tela.
Status: `pendente` · `em curso` · `saturado` (2 ciclos seguidos só com S3 e notas ≥ 4).

### Telas
| # | Alvo | Status | Ciclos | Última nota média |
|---|------|--------|--------|-------------------|
| T1 | Conversas (lista, chat, composer, painel do contato) | em curso | 1 | 3,7 |
| T2 | Contatos (tabela, filtros, drawer) | pendente | — | — |
| T3 | Funis / Negócios (quadro, card, detalhe, Relatórios) | pendente | — | — |
| T4 | Dashboard | pendente | — | — |
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

## Achados abertos (backlog do loop)
<!-- Achados vistos e não feitos, para ciclos futuros priorizarem S1/S2 de qualquer tela. -->
- PL-1-4 [S3] (P6) O "carregando" da lista ainda é spinner + "Carregando…" em vez de skeleton de linhas (`ConversationList.tsx` ~l.175). Perf percebida.
