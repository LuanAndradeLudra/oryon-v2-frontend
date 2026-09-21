# Rodada 2 — SCRUM-1097 (2026-09-21)

O usuário reabriu o épico depois de rever o resultado local:

> "Dê continuidade ao redesign, mesma metodologia. Vá sempre comparando com os
> PNG e ajustando até o máximo de fidelidade."
> "Ainda faltam muitos pontos: painel de informação de contato na página de
> conversas · a lista de conversas · o esquema de filtros · os drawers de
> informação do contato e de negócios · a página de configurações."
> "Não esqueça de revisar nenhuma tela e seja extremamente criterioso e rigoroso."

## Por que a Rodada 1 "fechou" telas que o usuário ainda vê diferentes

1. **Fase C ✅ (código × spec) não é fidelidade.** O usuário compara com o PNG.
   A spec só cobre o que o extrator listou; o que ele NÃO listou (ou classificou
   `[!]`) ficou de fora e ninguém voltou a olhar.
2. **`[!]` classificado cedo demais.** Regra do projeto: reorganizar dado/ação
   que JÁ existe no layout do mockup É restyle. Exemplo real desta rodada:
   "SegmentedControl Minhas/Fila/Todas" estava `[!]`, mas
   `ConversationFilters.assignedTo` já aceita `'me' | 'unassigned' | 'all'`
   (`src/types/index.ts` ~l.1120) — é só layout. Antes de manter qualquer `[!]`,
   **grep no tipo/API**; só é `[!]` se o dado realmente não existir.
3. **Inventário por imagem, não por texto.** Abra o PNG (Read de imagem), claro E
   escuro, e liste TODO elemento visível (ícone, chip, rótulo, divisor, contagem,
   botão, estado vazio). Cada elemento vira uma linha: existe no app? posição,
   tamanho, cor, peso batem? Não confie só no `*.GAPS.md` — ele já disse ✅ para
   coisas que o usuário vê erradas.

## Protocolo de cada tela (não pule etapas)

1. Inventário do PNG claro + escuro (imagem) → tabela `elemento | mock | app`.
2. Confrontar com o HTML do canvas para valor exato (px/hex/peso/raio).
3. Corrigir a menor mudança; commit citando IDs (crie IDs novos `R2-<TELA>-nn`
   para o que a spec não tinha e registre no `*.GAPS.md`).
4. **Prova ao vivo** (Chrome, `localhost:3011`, os 2 temas) assim que houver
   navegador conectado. Sem navegador: marque `❓ ao vivo` — NUNCA `✅`.
5. Registrar no `GAPS.md` da tela + linha no log do `AUDITORIA-NOTURNA.md`.

Regras que não mudam: nada de dado/comportamento inventado; separação no claro é
BORDA 1px (`surface-700`), nunca sombra; `ui/`, `index.css`, `layout/` são do
orquestrador (escale); commits só na própria branch; sem backtick em `maestri ask`.

## Atribuição

| Agente | Telas (revisar TODAS as da lista, não só o item do usuário) |
|---|---|
| **Cartógrafo** | **1d Conversas**: (a) lista de conversas, (b) esquema de filtros — segmentado Minhas/Fila/Todas + botão de filtro + linha de chips (Não lidas · Com IA · SLA · Etiqueta ▾) mapeados nos filtros existentes, (c) painel de contato (ContactPanel), (d) header/chat/composer. **1c Contatos**: drawer de contato. **1e Funis**: drawer/painel de negócio (DealPanel), card. |
| **Bússola** | **2e Configurações** (item do usuário — refazer o inventário do zero, incluindo TODAS as seções/rotas de settings, não só Vocabulário), 2d Agendamentos, 6a Faturamento, Conectores (3d/3e/4a/5b). |
| **Farol** | 1b Dashboard, 2a Agentes, 2b Automação drawer + wizard de agente, 2c Campanhas (+ wizard + templates), 1a vocabulário (conferir uso dos primitivos nas telas dele). |
| **Orquestrador** | Shell/TopBar/Sidebar, `ui/*`, `index.css`, Fase D ao vivo, merge/gate. |

## Mapeamento de filtros (1d) — ponto de partida para o Cartógrafo

| Mock | Filtro existente | Nota |
|---|---|---|
| Minhas | `assignedTo:'me'` | |
| Fila | `assignedTo:'unassigned'` | contagem por aba NÃO existe (só `statusCounts`) → sem número, `[!]` só a contagem |
| Todas | `assignedTo:'all'` | |
| Não lidas | `unreadOnly` | |
| Com IA | `aiHandling:'active'` | |
| SLA | `awaitingReply` (mais próximo) | confirmar no código; se não bater, `[!]` só este chip |
| Etiqueta ▾ | `tagId` (`TagFilterMenu`) | |
| ícone de filtro (funil) | menu de filtros avançados (`QuickFiltersMenu`: Equipe, status, período…) | mover o que hoje está espalhado pra dentro dele |

---

## Adendo 2026-09-21 ~20:00 — medições ao vivo (portal Maestri) e mudanças globais

**Portal:** o orquestrador tem um navegador logado em `localhost:3011` (portal Maestri "localhost").
Screenshot do portal expira (janela encoberta), mas `snapshot`/`evaluate` (estilos computados) funcionam.
Os agentes NÃO têm portal: peçam medições ao orquestrador ou marquem `❓ ao vivo`.

**Mudanças globais (afetam TODAS as telas — remeça o que vocês ajustaram em px):**
1. `:root` de 110% → **100%** (`873d553`). Antes, tudo em rem renderizava 10% maior que o mock
   (controle 28px virava 31px, texto 12px virava 13,2px). Agora `h-7`=28, `text-xs`=12.
2. `text-sm` de 14px → **13px / lh 1.5** (`9ab37e1`, spec TYPE-05). Título de card 13/600 = `text-sm font-semibold`.
3. `chat-shell-bg` chapado em `--bg` (`2bff3d4`); lista de Conversas 360px fixa; header do chat 52px em `--sf`.
4. `.color-chip-soft` (chip de status suave) e `ConnectedLineChip`/`usePrimaryConnectedLine` disponíveis.

**Detector de resíduo (censo)** rodado em cada rota: sombras, cantos ≥11px, gradientes, tamanhos de fonte.
Limpas: /dashboard, /contacts, /pipelines, /campaigns (lista e templates), /schedule, /settings, /settings/connectors.
Achados a corrigir:
- **Dashboard (Farol):** `KpiGrid` ainda é grade de cards com tile de ícone e valor `text-xl` 20/700.
  Mock (1b, DASH-KPI-01/02): **UM card** `--sf`/`--bd`/raio 8, `grid repeat(5,1fr)`, célula `padding 12px 14px`,
  `border-right 1px --bd` (menos a última), rótulo 11/500 `--tx2` SEM ícone, valor **26/800** `-.02em` lh 1.15 `--tx`,
  apoio 11.5px. A faixa vai em LARGURA TOTAL acima do grid 2/3+1/3 (hoje está dentro da coluna esquerda).
  Coluna esquerda depois: Conversas por hora, Funil de vendas; direita: Fila agora, Equipe. As seções extras que o
  app tem e o mock não (Tags, Horários de pico, Performance da equipe, Ao vivo, Status, Atividade) ficam ABAIXO.
- **Home (Farol):** card "Seu desempenho hoje" com `card-glow bg-surface-900 rounded-2xl` → primitivo Card (`--sf`, `--bd`, raio 8, sem glow).
- **Agentes (Farol):** empty state legado (tile `w-20 h-20 rounded-3xl` + botão grande 195x39) → `EmptyState` + `Button sm`.
- **Conversas:** empty state "Pronto para atender" e barra de atalhos J/K seguem o vocabulário? conferir (Cartógrafo).

## Cobertura de telas SEM mock (o usuário pediu "não esqueça de revisar nenhuma tela")
Telas que não têm PNG devem seguir o vocabulário da 1a (Card `--sf/--bd/8`, tabela sem card, chips soft, botões
neutral/primary do sistema, hairlines `surface-700`, sem sombra/gradiente/glow, raios 7/8/10). Passem o censo mental:
procurem `rounded-xl|2xl|3xl`, `shadow-`, `card-glow`, `bg-gradient`, `bg-surface-900` como card, botões `bg-brand-*` tintados.
| Agente | Telas sem mock |
|---|---|
| Farol | Home, Dashboard (extras), TeamChat, Copilot, Marketing, Automações (lista) |
| Bússola | Login/Onboarding, /admin/* (Skills, Agentes cross-tenant, Auditoria, AI Observability, AI Executions), Configurações (todas as sub-rotas) |
| Cartógrafo | ContactProfilePage (`/contacts/:id`), Funis (páginas de config), modais de Contatos/Negócios, importação |
