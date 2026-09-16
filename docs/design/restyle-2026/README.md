# Handoff: Oryon — reestilização da UI (pele nova, estrutura igual)

## Visão geral

Reestilização visual completa do Oryon (CRM de atendimento via WhatsApp com automação).
Cobre 14 telas/estados: Dashboard, Contatos/CRM, Conversas/Inbox, Funis/Negócios,
Agentes IA, Wizards, Disparos/Campanhas, Agendamentos, Configurações, Conectores,
Plano & Faturamento, além do shell (sidebar + TopBar) e do vocabulário de componentes.

**Mandato: trocar a pele, não a estrutura.** Todo nome de prop, rota, mecanismo de estado
e regra de negócio descritos em `DESIGN-SYSTEM.md` (Parte 2 — inventário técnico) continuam
valendo. As mudanças são de tipografia, forma, densidade, hierarquia e layout.

## Sobre os arquivos de design

`Oryon-Reestilizacao-canvas.html` (e os PNGs em `telas/`) é uma **referência de design feita em HTML** — um protótipo que
mostra a aparência e o comportamento pretendidos, **não código de produção para copiar**.
A tarefa é **recriar estes desenhos no ambiente já existente do projeto** (React + Tailwind +
`lucide-react`, componentes em `frontend/src/components/ui/`), usando os padrões e a biblioteca
que já estão lá. Nada de portar o HTML: o HTML usa estilo inline e tokens locais (`--tx`, `--sf`,
`--bd`…) que existem só para o protótipo; no código real, use os tokens de produção
(`--color-surface-*`, `--color-brand-*`, `.color-chip`, etc.).

O arquivo é um canvas com várias "rodadas" de trabalho. Cada tela tem um id visível
(`1a`, `1b`, … `7a`) usado como referência neste documento. **Cada tela aparece duas vezes,
lado a lado: tema claro à esquerda, tema escuro à direita.** É o mesmo markup — só os tokens mudam.

## Fidelidade

**Alta fidelidade (hifi).** Cores, tipografia, espaçamentos, alturas e estados são finais.
Recrie a UI fielmente usando os componentes do próprio codebase. Onde há divergência entre o
mockup e o componente atual, **o mockup é a especificação nova do componente** — atualize o
componente compartilhado, não crie uma variante paralela (foi exatamente esse o problema de
origem: 54 arquivos reimplementando botão à mão).

Logos de terceiros nos Conectores são **placeholders** (tile com a inicial na cor da marca).
Use os SVGs reais quando existirem; o fallback de inicial é o comportamento desenhado para
quando não houver SVG.

---

# 1. Fundamentos

## 1.1 Tipografia — NOVA: Plus Jakarta Sans (família única)

Sai o par Satoshi (display) + Inter (corpo). Entra **Plus Jakarta Sans** para display e corpo.
Google Fonts: `family=Plus+Jakarta+Sans:wght@400;500;600;700;800`.
`JetBrains Mono` permanece para IDs, timestamps técnicos e nomes de template.

| Papel | Valor |
|---|---|
| Título de página | 16px / 700 / `letter-spacing:-.01em` |
| Título de seção em página de leitura | 20px / 700 / `-.015em` |
| Título de card / seção | 13px / 600 |
| Corpo | 13px / 400 · `line-height:1.5` |
| Secundário | 12px / 400 |
| Terciário | 11px / 400 (token `--text-2xs`) |
| Micro | 10px / 700 (token `--text-3xs`) |
| Eyebrow / label uppercase | 10px / 700 / `letter-spacing:.14em` / cor acento forte |
| KPI hero | 26px / 800 / `-.02em` / `line-height:1.15` |
| KPI secundário (rail, detalhe) | 22px / 800 / `-.02em` |
| Label de campo | 12px / 600 |
| Botão | md/lg 13px / 600 · sm 12px / 600 |
| Badge / chip | 11px / 600 (micro 10.5px / 700) |

**`font-variant-numeric: tabular-nums` em todo número de KPI, valor monetário, timestamp de
tabela e contador.** O protótipo aplica isso no wrapper de cada tela.

Substitua os 1200+ usos de `text-[10px]`/`text-[11px]` arbitrários pelos tokens
`--text-3xs`/`--text-2xs` conforme tocar em cada componente.

## 1.2 Forma, sombra e densidade — NOVO: compacto

| Elemento | Antes | Novo |
|---|---|---|
| Chip / badge | ~8px | **6px** (StageBadge: **5px**) |
| Botão / input | 10–12px | **7px** |
| Card | 16px | **8px** |
| Modal / drawer / popover | 24px | **10px** (popover/dropdown 8px) |
| Sombra | em quase tudo | **só em overlay** (`--shadow-overlay`). Elevação de card = borda 1px |
| Padding de card | generoso | **14px** |

Alturas mantidas (régua canônica do Button, agora válida para todos os controles):
`sm 28px · md 36px · lg 44px`. **Formalize `size` nos campos de texto** (Input, Textarea, Select,
NumberField, MoneyInput, PhoneField) alinhando a essas alturas — hoje só o Button implementa.

Transições: hover 150ms; entrada de conteúdo 200–250ms ease-out.

## 1.3 Cor — MANTIDA (não reaberta)

Tema **Workspace Glow · Teal**, 90% neutro / 10% teal como cerimônia.

**Claro:** fundo `#FAFAFC` · superfície `#FFFFFF` · superfície-2 `#F5F6F8` · borda `#E4E6EC` ·
borda de ênfase `#C8CDD8` · texto `#1A1F2E` · secundário `#5C657A` · terciário `#9098AA` ·
acento `#14B8A6` · acento forte `#0F766E` · acento suave `rgba(20,184,166,.12)` ·
shell/sidebar `#0E1414`.

**Escuro:** fundo `#060909` · superfície `#161E1E` · superfície-2 `#0E1414` · borda `#243333` ·
borda de ênfase `#2E4040` · texto `#ECF1F1` · secundário `#8FA5A5` · terciário `#6B8080` ·
acento `#2DD4BF` · acento forte `#14B8A6` · acento suave `rgba(45,212,191,.14)`.

Status — claro: sucesso `#15803D` (fundo `rgba(21,128,61,.10)`), perigo `#B91C1C`
(fundo `rgba(185,28,28,.08)`), atenção `#B45309` (fundo `rgba(180,83,9,.10)`).
Escuro: `#22C55E` / `#EF4444` / `#FBBF24`, fundos a 14%.

### Duas mudanças deliberadas de cor (confirmar antes de implementar)

1. **Botão primário**: claro usa `#0F766E` com texto branco; escuro usa `#2DD4BF` com texto
   grafite `#04201D`. Motivo: contraste AA. O teal `#14B8A6` puro segue em ícone, foco, glow e link.
2. **Botão destrutivo**: `#B91C1C` sólido nos dois temas (fecha o débito conhecido — branco sobre
   `#EF4444` falha AA).

### Cor vinda de dado (regra permanente)

Cor de etapa de funil, pipeline, etiqueta e qualquer chip de enum é **dado do tenant** (hex
arbitrário do banco). Continua via `.color-chip` + `--chip` inline e `tintaDaEtapa()`:

- **texto e linha fina** sempre passam por `tintaDaEtapa()` (`color-mix` com `--ink-target`/`--ink-amount`);
- **área** (ponto, fundo translúcido, glow, barra de 2px) usa o hex cru ou `hexToRgba()`.

Nenhuma paleta fechada substitui isso. Se quiser mudar a fórmula de contraste, ajuste os dois
tokens, nunca hardcode cor de etapa em componente.

`--color-accent-{blue,green,violet,amber,rose,cyan}` continua sendo a paleta **categórica**
(abas de AgentDetail, ícones de KpiGrid), distinta do teal de marca.

## 1.4 Ícones

`lucide-react`, `strokeWidth` 1.75–2. Tamanhos: 16–20px em lista/formulário, 20–24px em
cabeçalho, 13–14px dentro de botão `sm`, 10–12px dentro de badge.

## 1.5 Shell (mudança estrutural aprovada)

O "canvas flutuante" saiu: **sidebar e conteúdo formam uma superfície única**, sem margem
(`py-1.5 pr-1.5`), sem borda e sem `rounded-2xl` em volta do conteúdo. O fundo `--color-shell`
deixa de ser visível nessa função.

- **NavSidebar**: 228px expandida / 62px colapsada (px fixo), sempre escura nos dois temas
  (`.nav-sidebar` remapeia superfícies localmente). Hover-expand e pin em
  `localStorage['oryon:sidebar-pinned']` inalterados.
- **Rodapé da sidebar**: só o bloco de créditos de IA (ver tela `6b`). Configurações e avatar
  **saíram da sidebar**.
- **TopBar** `h-12` (48px): título/subtítulo à esquerda; à direita, da esquerda para a direita —
  readiness indicator → slot de ações da página → busca (pílula 200px, atalho `/`) →
  notificações (sino com badge, painel `w-[26rem]` próprio) → **avatar 28px `rounded-[30%]`, que
  abre o menu do usuário** (ver `7a`).
- Item de navegação: 32px de altura, raio 6px, gap 10px, ícone 17px, 13px/500. Ativo:
  `bg-white/85` + texto `#0A0F0F` (hardcode intencional, sidebar é sempre escura).
  Badge de contagem: 18px, raio 9px, fundo acento, 10.5px/700.
- Eyebrow de grupo na sidebar: 10px/700, `.14em`, `#6B8080`, padding `14px 10px 6px`.

---

# 2. Vocabulário de componentes (tela `1a`)

## Button
Variantes `primary | neutral | secondary | ghost | danger`; tamanhos `sm 28 · md 36 · lg 44`;
raio 7px; 13px/600; gap 6px; ícone 16px (14px no `sm`).

- `primary`: fundo `--btn` (`#0F766E` claro / `#2DD4BF` escuro), texto `--btntx`.
- `neutral`: fundo surface, borda 1px de ênfase, texto principal.
- `secondary`: fundo acento suave, texto acento forte, sem borda.
- `ghost`: sem fundo nem borda, texto secundário, padding horizontal 12px.
- `danger`: `#B91C1C` sólido, texto branco.
- Ícone puro: quadrado do tamanho da altura, raio 7px.
- `loading`: substitui `leftIcon` por spinner de 14px, opacidade .6, `disabled`.
- Foco: anel 2px teal com offset 2px. Hover: escurece um passo em 150ms.

## Badge / StageBadge / chip
- **Situação (etapa)**: 20px, raio **5px**, borda 1px `border`, fundo surface, ponto de 6px na cor
  crua do tenant, texto 11px/600.
- **Etiqueta (tag)**: 20px, raio **6px**, `.color-chip` cheio (cor do tenant), texto branco, 11px/600.
- **Não colapsar os dois num componente** — a diferença de forma é semântica e documentada.
- **Status de sistema**: 20px, raio 6px, fundo a 10–14% + texto na cor do status.
- **Contador**: min 18px, raio 9px, fundo acento, 10.5px/700.
- **ComingSoonBadge**: 18px, raio 4px, borda **tracejada**, 10px/700 uppercase `.08em`.

## FormField / Input
Campo 36px, raio 7px, borda 1px de ênfase, texto 13px, padding horizontal 10px.
Label 12px/600 com sufixo opcional em terciário (`· opcional`).
Foco: borda acento + `box-shadow 0 0 0 3px` acento suave.
Erro: borda cor de perigo + linha de ajuda 11.5px na cor de perigo com ícone `alert-circle` de 12px.
Switch: 32×18px, raio 9px, thumb branco de 14px (fixo nos dois temas).
Hint 11.5px terciário. Gap entre campos 12px; entre grupos 14–18px.

## Card
Borda 1px `border`, raio 8px, fundo surface, **sem sombra**. Padding 14px.
`CardHeader`: 40px de altura, `border-bottom` 1px, título 13px/600, ação à direita.
`elevated` passa a usar borda de ênfase (não sombra). `glow` só no card de IA.
Hover (card clicável): fundo `--rowhover` + borda de ênfase.
Selecionado: borda acento + `0 0 0 3px` acento suave.

## DataTable
Cabeçalho 32px, fundo surface-2, `border-bottom` 1px, 11px/600 secundário.
Linha **36px**, `border-bottom` 1px `border`, texto 13px. Sem zebra.
Hover/ativo: fundo `--rowhover` + `box-shadow: inset 2px 0 0` acento.
Numérico à direita, tabular. Menu de linha: `···` terciário em coluna de 36px.
Rodapé de paginação 40px, `border-top`, 12px secundário; setas 24px, raio 6px.
Checkbox 14px, raio 4px; marcado usa fundo `--btn` com check branco de 10px.

## Tabs
Sublinhado de 2px (`box-shadow: inset 0 -2px 0 currentColor`), sem indicador deslizante.
13px/500 secundário; ativo 13px/600 principal. Gap 18px. Contagem ao lado em 11px terciário.
Comportamento atual preservado (dispara `onChange` mesmo na aba ativa, sem roving tabindex).

## Modal / ConfirmModal
Raio 10px, borda 1px `--color-overlay-border`, `--shadow-overlay`, fundo surface.
Título 15px/700 `-.01em`; descrição 12.5px/1.5 secundária.
Header padding `16px 18px`; corpo `14px 18px`; footer `14px 18px 16px` com botões `md` à direita.
Bloco de alcance (`impact`) = `Banner`: raio 6px, padding `9px 10px`, fundo 10–14% + texto do status,
ícone 14px. `danger` usa `#B91C1C` no botão de confirmação.
Scrim: `--color-scrim-soft`. Portal em `document.body` + `useLayer` — obrigatório para qualquer
overlay novo; nunca `z-[N]` fixo.

## Drawer
Raio 0 (encostado na borda), borda esquerda 1px `--color-overlay-border` + `--shadow-overlay`.
Larguras: contato 768px (48rem), automação 880px.

## EmptyState / ErrorState
Borda **tracejada** 1px de ênfase, raio 8px, padding `18px 16px`, alinhado à esquerda.
Ícone 20px terciário, título 13px/600, hint 12px/1.5 secundário, CTA `neutral` `sm`
(deliberadamente **não** teal).

## Dropdown / Toast / Tooltip
- Dropdown: raio 8px, padding 4px, item 30px com raio 5px, 13px; separador 1px com margem 4px;
  item destrutivo em cor de perigo; atalho em mono 11px terciário.
- Toast: 40px, raio 8px, fundo invertido (`#1A1F2E` claro / `#ECF1F1` escuro), 12.5px/500,
  ícone de status em círculo de 16px, ação em acento 600. Continua mostrando só o mais recente.
- Tooltip: 24px, raio 5px, fundo invertido, 11.5px/500, atalho em mono com opacidade .7.

---

# 3. Telas

Cada seção abaixo aponta o id no canvas. **Sempre confira o mockup para a contagem e a ordem
exata dos elementos** — as descrições abaixo cobrem estrutura, medidas e regras.

## 3.1 Dashboard (`1b`)

**Grade reaberta (mudança aprovada):** a narrativa 8/4 permanece, mas os KPIs deixam de ser
5 cards soltos e passam a ser **um card único dividido por hairlines**.

- Conteúdo com padding 16px, gap 14px entre blocos.
- **Faixa de KPI**: card 8px, `grid-template-columns: repeat(5,1fr)`, `border-right` 1px entre
  células, padding de célula `12px 14px`. Por célula: rótulo 11px/500 secundário → valor 26px/800
  tabular → linha de apoio 11.5px com delta colorido (sucesso/perigo) + contexto terciário.
  **Sem gradiente em texto de KPI** (a família `--kpi-gradient-*` não é usada aqui).
- **Coluna principal (2fr)**: card "Conversas por hora" com `CardHeader` de 40px (título, legenda
  de 2 séries com quadradinhos de 8px, SegmentedControl Hoje/7 dias/30 dias à direita), corpo com
  24 colunas empilhadas (humano = acento, IA = borda de ênfase), altura 170px, horas futuras em
  barra tracejada com opacidade .45; eixo X 10.5px terciário.
  Abaixo, card "Funil de vendas": tabela de etapas com colunas
  `Etapa | Negócios | Valor | Distribuição | Conversão`, ponto de 8px na cor do tenant, barra de
  distribuição de 6px com a cor da etapa a 85%.
- **Rail (1fr)**: card "Fila agora" (header com dot verde "ao vivo"; itens de 44px: avatar 26px,
  nome 12.5px/600 + trecho 11px secundário truncado, tempo colorido por SLA e chip de ator;
  rodapé "Ver todas as N" em 32px) e card "Equipe" (mini-tabela `nome | abertas | TMR`, linhas de
  32px, avatar 20px `rounded-[30%]` com dot de presença de 7px e borda de 1.5px na cor da
  superfície; última linha é o agente de IA com tile de acento suave).
- Números do Dashboard são exemplo — o protótipo não corrige os KPIs zerados no código.

## 3.2 Contatos/CRM (`1c`)

- **TopBar da página**: título + contagem; ações `Importar` (neutral sm) e `Novo contato`
  (primary sm), divisor, busca, sino, avatar.
- **Barra de filtros** 44px com `border-bottom`: busca de 240px; divisor; chips de filtro de 28px
  (raio 7px). **Filtro ativo** = borda acento + fundo acento suave + valor em 700 + `×` de 12px.
  Inativo = borda de ênfase. `+ Filtro` em ghost. À direita: SegmentedControl Todos/Meus e
  `Colunas` (ghost com ícone `sliders-horizontal`).
- **Tabela**: `grid-template-columns: 40px 1.5fr 130px 1fr 1.3fr 130px 120px 80px 36px`
  (checkbox, Nome, Telefone, Situação, Etiquetas, Responsável, Último contato, Negócios, menu).
  Cabeçalho 32px com seta de ordenação de 11px na coluna ativa. Linhas 36px.
  Nome: avatar 22px circular + 13px/600. Telefone em secundário. Situação = StageBadge.
  Etiquetas: chips de 18px, overflow como `+N` em 11px terciário. Sem responsável/sem tag = `—`
  ou texto terciário. Coluna numérica à direita, `0` em terciário.
- **Rodapé contextual**: quando há seleção, o rodapé de paginação é **substituído** (mesma altura
  de 40px, sem pulo de layout) por `N selecionado · Atribuir · Etiquetar · Exportar`.
- **Drawer do contato** (768px, `useLayer`, estado em `?contact=&tab=`):
  header com avatar 40px, nome 16px/700, StageBadge, linha de identificação 12px secundária e
  ações `Conversar` (primary sm) / `Novo negócio` (neutral sm) / `···` / fechar;
  Tabs (Visão geral · Negócios · Histórico · Conversas · Disparos) + link
  `Abrir ficha completa ↗` à direita; corpo em 2 colunas `260px | 1fr` com `border-right`.
  Coluna esquerda: grupos `Dados`, `Etiquetas`, `Campos personalizados` com eyebrow de 10px e
  grid `88px | 1fr` em 12.5px.
  Coluna direita: **Banner de dado de exemplo** (fundo âmbar 10–14%, ícone `triangle-alert` de
  14px, texto com `Dados de exemplo.` em 700 e badge `Mock` com borda de 1px) — obrigatório,
  `PROFILE_MOCKS_ENABLED`; depois resumo `N negócios abertos · valor` + botão `+ Negócio`,
  tabela de negócios (linhas 36px) e timeline `64px | 1fr` com hairline entre itens.
- **Modal Configurar colunas** (520px): header com título 15px/700 + subtítulo; linhas de 36px com
  handle `⋮⋮`, nome do campo e Switch (coluna Nome é `fixa`, texto terciário);
  `ComingSoonBadge`-style para a coluna condicional a `useMultiPipeline()`; footer com
  `Restaurar padrão` (ghost) à esquerda e Cancelar / Salvar à direita.

**Débito bloqueante:** `ContactsTable.tsx` não usa o `DataTable` compartilhado. Reestilizar o
`DataTable` sozinho **não** alcança esta tela — migre a tabela de Contatos para o componente
compartilhado ao implementar.

## 3.3 Conversas/Inbox (`1d`)

Três colunas: lista **360px** + chat `flex-1` + `ContactPanel` **308px**, com `border-right`/
`border-left` de 1px (nada de sombra entre colunas).

- **Lista**: SegmentedControl Minhas/Fila/Todas (28px) + botão de filtro; linha de chips rápidos
  (22px, raio 6px) com `border-bottom`; itens com padding `10px 12px`, avatar 36px,
  nome 13px/600 + hora 11px terciária, prévia 12px secundária truncada, badge de não-lido de 18px,
  e uma **terceira linha** com: chip de ator (âmbar = IA no controle, verde = humano assumiu —
  convenção invertida deliberada, **não corrigir**), pontos de 6px para etiquetas (não pílulas) e
  SLA à direita. Item ativo: fundo `--rowhover` + `inset 2px 0 0` acento (substitui o hack de
  gradiente de borda do tema claro).
- **Header do chat** 52px: avatar 30px, nome 13.5px/700 + StageBadge, linha de identificação
  11.5px; à direita chip de controle (`Agente Vendas no controle`, âmbar, 700), `Assumir` (primary
  sm), `Resolver` (neutral sm), `···`.
- **Bolhas** — os 3 canais de diferenciação são obrigatórios: (a) cor
  (`--color-bubble-in/out` + `-fg`), (b) alinhamento (`flex-row-reverse` no outbound),
  (c) forma do canto (raio 10px com o canto "de cauda" em 3px, só na primeira bolha do grupo).
  Padding `8px 12px`, texto 13px/1.45, hora 10.5px, check duplo de 13px no outbound,
  largura máxima 70%. Avatar 24px só na primeira bolha do grupo (agrupamento por `senderKey()`
  inalterado); IA usa tile de 24px em acento suave em vez de avatar.
  Separador de dia: pílula centrada de 10.5px/600 com borda.
  Evento de sistema (handoff): linha com hairlines dos dois lados e texto âmbar de 11.5px/600.
- **Composer**: sugestão do Copilot acoplada acima (fundo acento suave, raio `6px 6px 0 0`,
  sem borda inferior, ação `Usar ↵` em 700); campo com borda de ênfase, raio `0 0 8px 8px`,
  fundo `--color-composer-bg`; barra de ações com ícones de 28px, `Nota interna` em ghost,
  aviso de janela de 24h em 11px terciário e `Enviar` (primary sm com ícone).
  Os **3 layouts mutuamente exclusivos** (`blockedReason` → `windowOpen=false` → normal) continuam.
- **ContactPanel**: seções colapsáveis com eyebrow de 10px + chevron; `Dados` em grid
  `82px | 1fr`; `Etiquetas`; `Negócios` como mini-cards de 6px de raio; `Resumo da IA` com
  `ComingSoonBadge` "beta". Header com avatar 44px e duas ações `sm`.

## 3.4 Funis/Negócios (`1e`)

- **Board bar** 44px: SegmentedControl Kanban/Lista/Previsão, filtros, resumo à direita
  (`147 negócios · R$ … em aberto · R$ … ganhos no mês`, ganhos em cor de sucesso), `Etapas`.
  Seletor de funil no header com quadradinho de 8px na cor do pipeline.
- **Coluna** 250px, gap 10px. Cabeçalho de coluna: 28px, `border-bottom` **2px na cor crua da
  etapa**, título 12.5px/700 passando por `tintaDaEtapa()`, contagem em terciário e soma à direita.
- **Card de negócio**: borda 1px, raio 8px, padding `10px 12px`, gap 6px. Título 13px/600/1.3,
  linha de contato 12px secundária, chips de etiqueta de 16px, rodapé com valor 13px/700,
  chip de IA opcional, tempo/alerta de parado (cor de perigo) e avatar de 18px `rounded-[30%]`
  (tracejado quando sem responsável).
  Estados: hover (borda de ênfase + `--rowhover`), selecionado (borda acento + anel de 3px),
  **em arraste (única sombra fora de overlay — enquanto flutua, o card É um overlay)**,
  e variante touch com botão `Mover ▾` (obrigatório: DnD é HTML5 nativo condicionado a
  `(hover:hover) and (pointer:fine)`).
  Slot de drop: retângulo tracejado de 88px.
- **Etapas terminais** numa coluna à direita separada por borda tracejada: cabeçalho `Ganho` com
  borda de sucesso, `Perdido` com borda `#B91C1C` e fundo de perigo a 8–14%. Nunca clicáveis
  diretamente na trilha/stepper.
- **`CloseDealReasonModal`** (440px) — a "única porta de fechamento": título `Mover para Perdido`,
  descrição nomeando o negócio e o valor, **Select de motivo obrigatório com erro inline**
  (`Informe o motivo para continuar`), Textarea opcional de 64px, Banner âmbar de alcance
  (`Encerra a conversa vinculada e pausa 1 automação`), footer Cancelar / `Mover para Perdido`
  (danger). As 3 entradas (drop no board, clique no stepper, atalhos "Marcar ganho/perdido")
  continuam abrindo este mesmo modal; backend recusa sem motivo.

## 3.5 Agentes IA (`2a`)

Lista 300px + detalhe inline (o módulo continua **sem rota de detalhe** — `useState`, não
`useSearchParams`; se quiser deep-link, é mudança de escopo separada).

- **Item da lista**: tile de 34px com raio 8px na cor do agente (as 12 cores literais do
  `AgentIcon` continuam sendo exceção deliberada de paleta), nome 13px/600 + chip de estado,
  duas linhas de métrica em 11.5/11px. Ativo: `--rowhover` + `inset 2px 0 0` acento.
- **Header do detalhe**: tile 40px, nome 16px/700, chip `Ativo`, subtítulo com modelo e versão;
  à direita **indicador textual de auto-save** (`✓ Salvo às 14:31`, 11.5px terciário — sem barra
  de save fixa, contrato atual preservado), `Testar` (neutral sm), Switch `Ligado`, `···`.
- Tabs: Desempenho · Comportamento · Conhecimento (com contagem) · Handoff · Canais · Histórico.
- **Corpo**: `1fr | 320px`. Esquerda = `SettingsSection` (grid `200px | 1fr`, hairline entre
  grupos, zero cards): Objetivo, Tom de voz (cards de opção de 8px + toggles), Limites (linhas de
  32px com borda + `+ Adicionar limite` em ghost).
  Direita = rail em `--sf2` com KPIs 2×2 (22px/800), card de sugestão do sistema (único card com
  borda acento + anel de 3px) e nota de versão publicada.

## 3.6 Wizards (`2b`) — os dois padrões são mantidos

Decisão do PO: **não unificar**. Campanha segue no modal de 5 etapas; Agente segue em wizard.

- **AgentBuilderWizard — tela cheia, 2 painéis fixos**: painel Tutor de 320px em surface com
  `border-right` (eyebrow `Etapa 3 de 8`, título 18px/700, texto didático 12.5px/1.55, trilha de
  8 itens de 30px com bolinhas de 18px — concluído = acento suave com check, ativo = fundo `--btn`,
  futuro = borda de ênfase; nota de rodapé "só etapas concluídas são clicáveis").
  Conteúdo: barra de progresso segmentada de 3px no header de 52px + `✓ Rascunho salvo`;
  corpo com `max-width:720px` e padding `32px 40px`; footer fixo de 64px com `← Voltar` (ghost) e
  `Continuar →` (primary md). Os dois `isDirty` independentes e o `ConfirmModal` ao fechar
  continuam como estão.
- **AutomationBuilder — drawer 880px, nav vertical, scroll único**: header de 56px com nome,
  tipo e chip de estado; nav de 200px em `--sf2` com itens de 30px e **bolinha de estado de 6px**
  (verde ok, âmbar pendente, vazio não visitado), item ativo com fundo surface + borda;
  conteúdo com seções separadas por eyebrow de 10px, linhas de condição em grid
  `1fr 130px 1fr 28px` com erro inline; footer fixo de 60px com `Descartar` / `Salvar e publicar`.

## 3.7 Disparos/Campanhas (`2c`)

- Tabs Disparos (14) · Templates (9) · Atribuição. **Botão principal do módulo permanece
  `variant="neutral"`** (o comentário do código é explícito: "o teal aqui não dizia importante,
  dizia botão").
- **Tabela de disparos**: `1.6fr 120px 1fr 90px 90px 90px 90px 120px 36px` (Campanha, Status,
  Template, Público, Entregues, Lidas, Respostas, Envio, menu). Linhas 36px, numéricos à direita
  tabulares, nome de template em mono 11.5px. Status via `.color-chip`/enum:
  Enviando (acento suave + dot), Agendada (âmbar), Concluída (sucesso), Rascunho (neutro com
  borda), `Falhou · 12%` (perigo).
- **CampaignWizard (modal 760px, 5 etapas)** na etapa **Revisão**: trilha horizontal de bolinhas
  de 18px ligadas por linha de 1px (concluídas em acento); corpo `1fr | 250px`;
  esquerda = linhas de resumo em grid `120px | 1fr | auto` com `Editar` em acento 11.5px/600 e
  hairline entre elas, mais Banner âmbar de limite diário; direita = **prévia do WhatsApp**.
- **Prévia do WhatsApp**: hex fixos deliberados nos dois temas — fundo `#EFE7DD`, bolha `#FFFFFF`,
  texto `#111B21`, hora `#667781`, botão `#027EB5`, pílula de dia `#54656F` sobre branco.
  Não tokenizar: é mockup fiel de produto de terceiro.
- **Aba Templates**: grade de 4 cards com header (nome em mono + chip de status Meta) e corpo com
  a prévia em fundo `#EFE7DD`. `TemplateCreator` continua substituindo o conteúdo da aba (não é modal).

## 3.8 Agendamentos (`2d`)

- Toolbar 44px: navegação `‹ ›` (28px), `Hoje`, período em 14px/700 + semana em terciário,
  SegmentedControl Dia/Semana/Lista, filtros de agente e tipo.
- **Grade semanal**: `grid-template-columns: 56px repeat(7,1fr)`, `grid-template-rows: 44px repeat(9,1fr)`
  (08–16h). Cabeçalho de dia com sigla 11px/600 uppercase + número 14px/600; **hoje** com fundo
  acento suave e rótulo `HOJE` em 10px/700; fim de semana em `--sf2`. Células com hairlines
  nos dois eixos; rótulo de hora 10.5px terciário alinhado à direita.
- **Evento**: absoluto sobre a grade, raio 6px, fundo surface, borda 1px + **`border-left` de 3px
  na cor do agente/tipo** (dado), padding `5px 8px`, título 11.5px/600, linha de detalhe
  secundária, chip de status opcional de 16px. Selecionado: borda acento + anel de 3px.
  Cancelado: opacidade .55 + `line-through`. Bloco de campanha: tracejado, sem cor de agente.
- **Linha do agora**: 2px na cor de perigo com bolinha de 8px, só na coluna de hoje.
- **Popover de detalhe** (300px, raio 8px, `--shadow-overlay`): quadradinho de 10px na cor do
  tipo, título 14px/700, grid `82px | 1fr`, chips de origem e status, rodapé com hairline e
  `Abrir conversa` (primary sm) / `Reagendar` (neutral sm) / `Cancelar` (ghost em cor de perigo).

## 3.9 Configurações (`2e`)

Gramática deliberada — **zero cards dentro da página**.

- **Sidebar secundária 248px** de 3 níveis, 100% tipográfica, sem ícones e sem pílulas:
  campo de busca por sinônimo (28px) → eyebrow de domínio (10px/700 `.14em` terciário) →
  cluster (28px, 12.5px) → item (26px, `padding-left:22px`).
  Item ativo: 600 + `inset 2px 0 0` acento + fundo `--rowhover` + `border-radius: 0 6px 6px 0`.
- **Coluna de leitura** `max-width: 896px` (`max-w-4xl`), padding `26px 40px 32px`:
  breadcrumb 12px terciário (com `✓ Salvo` à direita), título 20px/700, subtítulo 13px/1.55.
- **`SettingsSection`**: grid `260px | 1fr`, gap 24px, padding vertical 22px, **hairline** entre
  seções. Esquerda = título 13px/600 + descrição 12px/1.5. Direita = campos.
  Bloco de prévia: fundo `--sf2` + borda, raio 6px, 12px.
  Tabela de referência: grid `160px | 1fr`, linhas de 7px de padding com hairline.
- **Índice automático** de 180px à direita: eyebrow + itens de 12px, ativo em 600 com
  `inset 2px 0 0` acento e `padding-left:10px`.
- O item mostrado é **Vocabulário** (`useTenantVocab()`): singular/plural dos registros do funil,
  gênero gramatical (SegmentedControl), nomes de fechamento por tipo de funil
  (`pipelineKindOf` — Ganho/Perdido vs. Concluído/Cancelado, com o campo obrigatório em erro) e
  termos de pessoas. Nenhum rótulo desses pode ser hardcoded em componente.

## 3.10 Conectores (`5b`, `4a`, `3d`, `3e`) — tela nova, `/settings/connectors`

Modelo de dois níveis: instala uma vez por tenant aqui, ativa por agente na aba Skills.

### Catálogo (`5b`)
- Header da página: título 20px/700, subtítulo, `Solicitar integração` (neutral, 32px) à direita.
- Toolbar com `border-bottom`: busca de 340px (32px), **dropdown de Categoria** (não pill row —
  são 9 categorias, cada item com contagem), SegmentedControl Todos/Instalados/Em breve,
  resumo à direita e **toggle grade/lista** (dois quadrados de 32px).
- Grade `repeat(5, minmax(0,1fr))` a 1440px, gap 12px; responsivo de 2 a 6 colunas.
- Busca e filtro de categoria **combinam** (AND), e o estado vive na URL.

### Card (`4a`) — **decisão de arquitetura visual**
A cor da marca **não** pinta área: nada de faixa colorida no topo. Ela vive **só no tile do logo**.

- Card: borda 1px, raio 8px, fundo surface, padding 14px, gap 10px. Sem sombra.
- **Tile do logo 40px, raio 9px**: `background: color-mix(in srgb, var(--brand) var(--tilemix), #fff)`
  com **`--tilemix: 12%` no tema claro e `0%` (branco puro) no tema escuro**; borda
  `color-mix(..., var(--brand) 22%/0%, #fff)`. Implemente como **um token por tema
  (`--connector-tile-mix`)**; o card não deve conhecer o tema. Motivo: no escuro o branco é a
  "janela" onde qualquer logo de terceiro funciona; no claro, branco sobre `#FFF` desaparece.
  Fallback sem SVG: inicial 17px/800 na cor da marca.
- `--brand` é setado inline por item (mesma mecânica de `--chip`) — aceita qualquer hex.
- Badge de estado no canto superior direito (18px): `Instalado` (sucesso, com check),
  `Business` (âmbar, com cadeado), `Em breve` (neutro com borda). Disponível não tem badge.
- Nome 13px/600; linha `Categoria · por Fornecedor` em 11px terciário; descrição 12px/1.45
  secundária com `flex:1`; rodapé com métrica à esquerda e **um único CTA** à direita
  (nunca dois): `Gerenciar` (neutral sm) · `Conectar` (primary sm) · `Ver planos` (neutral sm) ·
  `Priorizar` (ghost sm).
- **Em breve**: borda do card **tracejada**, título/descrição em secundário/terciário, tile com
  opacidade .7, métrica = `N pedidos`.
- Card inteiro é clicável e abre o modal de detalhe — **inclusive nos "em breve"**.

### Modal de detalhe (`3d`) — padrão "coluna de identidade"
760px × 460px, raio 10px, `--shadow-overlay`. **Sem faixa/hero colorido.**

- **Coluna esquerda 240px** com `border-right` e fundo `color-mix(in srgb, var(--brand) 7%, surface)`:
  tile de 52px (raio 10px, branco com `inset 0 -3px 0 var(--brand)`), nome 17px/700,
  `por Fornecedor · versão`, chips de categoria e estado, ficha técnica em linhas de 12px com
  hairline (Autenticação, Dados acessados, Sincronização, Plano) e **CTA fixo no rodapé da coluna**
  (largura total, 36px).
- **Direita**: Tabs `Visão geral · Como funciona · Requisitos` (com o `×` de fechar na mesma linha,
  à direita) e corpo com padding `18px 20px`, texto 13px/1.55; capacidades como grid 2×2 de
  mini-cards de 7px; rodapé com prova social + `Guia de conexão ↗`.
- **Em breve**: coluna com `border-right` tracejado, tinta a 5%, chip `Em breve`, ficha com
  `Fila: N clientes pediram`, CTA `Priorizar` (neutral); corpo abre com um Banner neutro
  explicando que ainda não foi construída, e as capacidades vêm como mini-cards **tracejados**.
- **Bloqueado por plano**: Banner âmbar (`Disponível no plano Business…`), CTA `Ver planos`;
  o conteúdo continua legível — ler é permitido, conectar não.

### Modal de credencial (`3e`)
520px. **Formulário dinâmico** a partir do schema do conector (o mockup mostra dois schemas
diferentes: Feegow com 4 campos, Doctoralia com 1 campo + lista de permissões).

- Header: tile de 32px, título 15px/700, subtítulo explicando o escopo (workspace, não agente).
- Campos na régua padrão; valores sensíveis em mono com máscara (`fg_live_••••7k2Q`) e olho de
  14px; hint `Armazenado criptografado. Nunca mostrado inteiro depois de salvo.`
- **`Testar conexão`** (neutral, 32px) com resultado inline ao lado:
  sucesso = `✓ Conexão OK · 3 unidades, 14 profissionais · 240 ms · agora` em cor de sucesso;
  erro = borda de perigo no campo culpado + mensagem inline com o código
  (`Chave recusada pela Doctoralia (401)`) + `Falhou · 401 · há 5 s`.
- Footer: `Remover credencial` (ghost em perigo) à esquerda; Cancelar / Salvar à direita.
  **Salvar fica desabilitado (opacidade .45) até um teste OK**, com a razão em 12px terciário.

## 3.11 Plano & Faturamento (`6a`)

Mesma gramática de Configurações (sem cards). Única exceção: o **Banner de ativação** —
borda acento + fundo acento suave, ícone de 18px, título 13px/600, texto 12px e
`Contratar Start` (primary, 32px).

- **Plano atual**: tile de 36px em acento suave, nome 16px/700, chip de avaliação (âmbar),
  subtítulo com ciclo, preço 22px/800 tabular + `/mês` em 11.5px.
  Barra de créditos: rótulo com `63,67 / 1.000 · 6%` (números em 700), trilha de 6px com borda e
  raio 3px, preenchimento em acento; abaixo, nota de conversão (`1 crédito ≈ 1 atendimento`) e
  `Renova em N dias` em 11.5px terciário.
- **Limites do plano**: linhas de 36px em grid `1fr 160px 90px` — rótulo com ícone de 14px,
  mini-barra de 4px e `uso / limite` à direita. **Limite no teto pinta a barra e o número em âmbar.**
- **Upgrade**: uma tabela de 3 colunas dentro de **uma** borda (não três cards): plano atual com
  fundo `--sf2`, plano recomendado com `inset 0 2px 0` acento + chip `Recomendado` e CTA primary,
  terceiro com CTA neutral. Preço 18px/800.
- Índice à direita: Plano atual · Limites · Upgrade · Créditos avulsos · Extrato.

## 3.12 Consumo sempre visível (`6b`) — componente novo

Substitui a necessidade de entrar em Configurações para ver consumo.

- **Colapsada**: item de 36px no rodapé da sidebar, sobre um hairline, com **anel SVG de 24px** —
  `r=9`, `stroke-width=2.5`, `stroke-dasharray=56.5`, `stroke-dashoffset=56.5*(1-uso)`,
  `transform="rotate(-90 12 12)"`, trilha `#243333`.
- **Expandida/pinada**: 40px com anel de 22px + duas linhas (`Créditos de IA` 12px/600 e
  `64 / 1.000 · renova em 15 d` 10.5px), fundo `rgba(255,255,255,.06)`.
- **Três faixas de cor** (reaproveitando a semântica de risco do `ProgressBar`):
  `< 70%` acento `#2DD4BF` · `≥ 70%` âmbar `#FBBF24` com aviso `acaba antes do ciclo` ·
  `≥ 90%` perigo `#EF4444` com `agentes pausam em N` e atalho `Comprar` inline.
- **Popover no hover** (300px, raio 8px, `--shadow-overlay`, portal + `useLayer`):
  anel de 36px, título `Créditos de IA · Plano`, ciclo, percentual 16px/800; grid
  `Usados / Disponíveis / Ritmo` (com avaliação `· sobra` em sucesso); rodapé com hairline e
  `Ver faturamento` (neutral sm) / `Comprar créditos` (ghost em acento).

## 3.13 Shell final (`7a`)

- **Menu do usuário** (240px, `Dropdown` existente + portal): header com avatar de 32px, nome
  13px/600 e `e-mail · papel` em 11px terciário; itens de 30px — `Meu perfil`,
  `Configurações` (com atalho `⌘,` em mono), `Tema` (SegmentedControl inline Auto/Claro/Escuro —
  **único item que não fecha o menu**), separador, linha de workspace com quadradinho de gradiente
  e `Trocar ›`, separador, `Sair` em cor de perigo.
- **Avatar com anel teal (`0 0 0 2px surface, 0 0 0 4px accent`) é o único estado em que o avatar
  recebe cor** — indica menu aberto.
- **Notificações continuam painel próprio** (26rem, atalhos J/K/Enter/E/U/A), fora do menu:
  o badge precisa ser visível sem clique, e um painel interativo não deve viver dentro de um menu
  de navegação (o `Dropdown` fecha ao clicar num item).
- `Configurações` segue sendo rota (`/settings`) — o menu é só mais uma porta, o contrato de URL
  não muda.

---

# 4. Interações e comportamento

- **Overlays**: todo modal/drawer/painel novo usa `createPortal(document.body)` + `useLayer(open, onClose)`
  (z-index = `BASE_Z 60 + posição na pilha`, Escape fecha só o topo). **Nunca `z-[N]` fixo.**
  Scroll lock no `body` enquanto aberto; `Drawer` devolve o foco ao elemento anterior.
  Nenhum overlay faz focus trap hoje — não finja que faz.
- **Animação**: overlay fade 150ms; painel de modal scale+y 180ms; conteúdo 200–250ms ease-out;
  hover 150ms. `layoutId` do framer-motion continua animando o dot ativo de
  `WizardProgress`/`PipelineTrail`.
- **Estado na URL**: filtros, aba ativa, modal/drawer aberto (`?contact=&tab=`, `?automation=`,
  `?atencao=1`). Regra permanente do produto.
- **Validação**: erro inline no `FormField` (borda de perigo + mensagem com ícone), não alert nem
  botão bloqueado sem explicação. Exceção desenhada: credencial de conector, onde Salvar depende
  de teste OK e a razão aparece em texto ao lado.
- **Estados de carregamento**: use `Spinner` e os `Skeleton*` compartilhados
  (`SkeletonTable` respeita a contagem de colunas). Pare de reimplementar
  `<Loader2 className="animate-spin">` — são ~91 arquivos.
- **Ordem de fallback** das listas: loading → error → empty.
- **Avisos de mock**: as telas/abas com dados de exemplo mantêm o aviso visível
  (Banner âmbar + badge `Mock`, atrás de `PROFILE_MOCKS_ENABLED`).
- **Mobile**: `useIsMobile()` = `(max-width: 767px)`; `AppShellMobile` sem NavSidebar/TopBar,
  `h-[100dvh]`, `MobilePageHeader` por página, `BottomTabBar`, `Fab` com
  `bottom-[calc(4.5rem+env(safe-area-inset-bottom))]`, `MobileFeatureGate` para wizards pesados.
  Os mockups são desktop (1440px) — o mobile herda tokens e componentes, não layout.

# 5. Ordem de implementação sugerida

1. **Fundamentos**: fonte, tokens de raio/densidade, `--text-2xs/3xs`, tile de conector.
2. **Button, Badge/StageBadge, FormField+Input, Card, Modal/ConfirmModal, Drawer, DataTable,
   EmptyState/ErrorState, Spinner/Skeleton, Tabs** (tela `1a` é a especificação).
3. **Shell**: remover o canvas flutuante, mover Configurações/avatar para a TopBar,
   adicionar o bloco de créditos (`6b`, `7a`).
4. Telas, na ordem que propaga mais rápido: Contatos (`1c`, migrando `ContactsTable` para
   `DataTable`) → Conversas (`1d`) → Funis (`1e`) → Dashboard (`1b`) → Agentes/Wizards (`2a`,`2b`)
   → Campanhas (`2c`) → Agendamentos (`2d`) → Configurações (`2e`) → Faturamento (`6a`) →
   Conectores (`5b`,`4a`,`3d`,`3e`, tela nova).

# 6. Checklist anti-genérico (rejeitar no review)

- Gradiente cobrindo fundo inteiro de seção ou card (gradiente só em cerimônia: logo, ícone de IA).
- Sombra decorativa fora de overlay.
- Conteúdo centralizado — esta é uma ferramenta de dados; alinhamento à esquerda é o padrão.
- Emoji como marcador de seção ou bullet.
- `rounded-lg` por padrão sem consultar a tabela de raios.
- Número em tabela ou KPI sem `tabular-nums`.
- Nova variante de componente quando já existe uma.
- Paleta fechada substituindo cor de tenant; rótulo de vocabulário hardcoded.

# 7. Arquivos neste pacote

- `Oryon-Reestilizacao-canvas.html` — **o canvas completo, autocontido** (um único arquivo, abre
  com duplo clique, funciona offline): 14 telas/estados separados por rodada, com títulos,
  ids visíveis e tema claro/escuro lado a lado. É a referência visual principal.
- `telas/*.png` — uma imagem por tela, em 1440px por tema (claro à esquerda, escuro à direita):
  `1a` vocabulário de componentes · `1b` Dashboard · `1c` Contatos + drawer + modal ·
  `1d` Conversas · `1e` Funis + modal destrutivo · `2a` Agentes IA · `2b` Wizards ·
  `2c` Disparos/Campanhas · `2d` Agendamentos · `2e` Configurações (Vocabulário) ·
  `3d` Conector: modal de detalhe · `3e` Conector: credencial · `4a` Card de conector ·
  `5b` Conectores: catálogo · `6a` Plano & Faturamento · `6b` Consumo na sidebar ·
  `7a` Shell final (TopBar + sidebar).
- `DESIGN-SYSTEM.md` — o documento de origem: decisões de cor/tipografia/densidade (Parte 1) e o
  inventário técnico completo do frontend atual, componente por componente, com o que não pode
  quebrar (Parte 2). **Leia a Parte 2 antes de tocar em qualquer componente.**
