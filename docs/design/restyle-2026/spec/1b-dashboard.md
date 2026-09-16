# Spec — Dashboard (`1b`)

Fase A (extração pura) da Auditoria Noturna SCRUM-1097. Zero código, zero opinião sobre o que
já existe no app. Tela: **1b** (`01-1b-dashboard.png` / `02-1b-dashboard.png`). O Shell que
envolve esta tela (sidebar, TopBar genérica, menu do usuário, créditos) está em
`spec/shell.md` — aqui só o que é específico do conteúdo do Dashboard.

Fontes, em ordem de autoridade:
1. `Oryon-Reestilizacao-canvas.html`, `id="1b"` (linha 2889 do arquivo reflowed em `><`→`>\n<`;
   linha 382 do arquivo original, ~450k caracteres numa linha só).
2. `telas/01-1b-dashboard.png` (claro) + `telas/02-1b-dashboard.png` (escuro).
3. `README.md` §3.1 (Dashboard `1b`).

Tabela de cores: mesma do Shell (`spec/shell.md`, seção "Tabela de cores") — o Dashboard usa
os mesmos `var(--xx)` resolvidos pelo `Component.renderVals()` do canvas. Não duplicada aqui.

---

## DASH-HEADER — cabeçalho específico do Dashboard (dentro da TopBar genérica do Shell)

A caixa/tipografia da TopBar em si é `SHELL-TOPBAR-*`; os itens abaixo são só o CONTEÚDO que
é específico desta tela.

### DASH-HEADER-01 — Título + metadado de atualização
- **Tipografia**: `"Dashboard"` `font-size:14px; font-weight:700; letter-spacing:-.01em`;
  ao lado `"Terça, 15 set · atualizado há 20 s"` `font-size:12px; color:var(--tx2)`.
  `display:flex; align-items:baseline; gap:8px` (container = `SHELL-TOPBAR-02`).
- **Condição**: `"atualizado há 20 s"` sugere polling/refresh automático — `[!]` confirmar
  fonte real do timestamp (dado de exemplo vs. relógio real do último fetch).

### DASH-HEADER-02 — Indicador "WhatsApp conectado"
- Ver `SHELL-TOPBAR-02` (é o "readiness indicator" do Shell) — mas o TEXTO em si
  (`"WhatsApp conectado"`) é conteúdo do Dashboard, não genérico do Shell.
- **Tipografia**: dot 6px `background:#22C55E` (hex literal, não `var(--ok)`) + texto
  `font-size:11.5px; font-weight:600; color:var(--ok)` — nota: dot e texto usam fontes de cor
  DIFERENTES para o "mesmo verde" (uma hardcoded, outra tokenizada); `[!]` mesma família de
  achado do SHELL-SIDEBAR-09 (cor de status/presença não uniformemente tokenizada).
- **Condição de aparecer**: `[!]` provavelmente condicional a WhatsApp de fato conectado —
  variante "desconectado" não tem mockup nesta extração (não encontrada em nenhuma das 6 telas
  lidas).

### DASH-HEADER-03 — Filtro de período "Hoje ⌄"
- Ver `SHELL-TOPBAR-03` (slot de ações da página). Único exemplo de conteúdo desse slot
  encontrado nas telas extraídas.
- **Tipografia/Container**: `height:28px; padding:0 10px; border-radius:7px; border:1px solid
  var(--bd2); background:var(--sf); font-size:12px; font-weight:600`, chevron-down 13px.
- **Estado**: `[!]` sem mockup do dropdown aberto (não há lista de opções visível em nenhuma
  das 2 imagens) — presumível "Hoje / 7 dias / 30 dias" pelo paralelo com `DASH-CHART-03`,
  mas isso é inferência, não extração.

### DASH-HEADER-04 — Busca, sino, avatar
- Idênticos ao Shell — ver `SHELL-TOPBAR-04`, `SHELL-TOPBAR-05` (variante "dot", **não**
  "9+" — é a fonte dessa variante), `SHELL-TOPBAR-06` (avatar fechado, iniciais "RC", sem
  anel). Nada específico do Dashboard aqui além de confirmar QUAL variante do sino aparece.

---

## DASH-KPI — faixa de KPIs (card único, 5 células)

### DASH-KPI-01 — Container da faixa
- **Container**: `display:grid; grid-template-columns:repeat(5,1fr); border:1px solid var(--bd);
  border-radius:8px; background:var(--sf)`. Confirma README §3.1 ("card 8px,
  `grid-template-columns: repeat(5,1fr)`").
- **Espaçamento**: cada célula `padding:12px 14px`; `border-right:1px solid var(--bd)` em
  todas exceto a última (5ª) célula.
- **Fonte**: canvas `id="1b"`, bloco "KPI strip".

### DASH-KPI-02 — Anatomia de célula (padrão comum às 5)
- **Tipografia**: rótulo `font-size:11px; font-weight:500; color:var(--tx2)` → valor
  `font-size:26px; font-weight:800; letter-spacing:-.02em; line-height:1.15; margin-top:2px;
  font-variant-numeric:tabular-nums` (herdado do container raiz) → linha de apoio
  `display:flex; align-items:center; gap:6px; margin-top:3px; font-size:11.5px`, com um span
  colorido (delta) + um span `color:var(--tx3)` (contexto).
- **Regra explícita do README**: "Sem gradiente em texto de KPI" — a família
  `--kpi-gradient-*` (mencionada no README, não encontrada nas cores extraídas desta tela)
  não é usada em nenhuma das 5 células.

### DASH-KPI-03 — Célula 1: "Conversas abertas"
- **Valor**: `38`.
- **Linha de apoio**: `"12 aguardando"` em `color:var(--amber); font-weight:600` +
  `"· 3 sem resposta > 15 min"` em `color:var(--tx3)`.
- **Nota visual**: no PNG essa linha quebra em 2 linhas dentro da célula (célula mais estreita
  por causa do texto mais longo) — é quebra natural do texto, não uma variação estrutural.
- **Fonte do valor**: exemplo (README: "Números do Dashboard são exemplo").

### DASH-KPI-04 — Célula 2: "Atendidas hoje"
- **Valor**: `1.284`.
- **Linha de apoio**: `"+12,4%"` em `color:var(--ok); font-weight:600` + `"vs. ontem"` em
  `color:var(--tx3)`.

### DASH-KPI-05 — Célula 3: "Tempo 1ª resposta"
- **Valor**: `0:48`.
- **Linha de apoio**: `"+0:06"` em `color:var(--dg)` (semântica invertida: tempo de resposta
  MAIOR = pior = cor de perigo, mesmo sendo um delta "positivo" em valor absoluto) +
  `"meta 0:45"` em `color:var(--tx3)`.
- **Nota**: única célula das 5 onde o delta positivo em número é semanticamente negativo —
  confirma que a cor do delta segue o SIGNIFICADO da métrica, não o sinal do número.

### DASH-KPI-06 — Célula 4: "Resolvidas pela IA"
- **Valor**: `61%`.
- **Linha de apoio**: `"+4 pts"` em `color:var(--ok); font-weight:600` + `"782 conversas"` em
  `color:var(--tx3)`.

### DASH-KPI-07 — Célula 5: "Negócios ganhos · mês"
- **Valor**: `R$ 128.400`.
- **Linha de apoio**: `"23 negócios"` em `color:var(--tx)` (cor de texto PRIMÁRIA, não um
  delta colorido sucesso/perigo — única célula sem cor semântica no primeiro span) +
  `"· 64% da meta"` em `color:var(--tx3)`.
- **Nota**: sem `border-right` (é a última célula).

---

## DASH-CHART — "Conversas por hora"

### DASH-CHART-01 — Container e header
- **Container**: `border:1px solid var(--bd); border-radius:8px; background:var(--sf);
  display:flex; flex-direction:column`.
- **Header**: `height:40px; padding:0 14px; border-bottom:1px solid var(--bd); gap:16px`.
  Título `"Conversas por hora"` `font-size:13px; font-weight:600`. Confirma README §3.1
  ("`CardHeader` de 40px").

### DASH-CHART-02 — Legenda de 2 séries
- **Container**: `display:flex; gap:14px; font-size:11.5px; color:var(--tx2); margin-left:6px`.
- **Item**: quadradinho `8px×8px; border-radius:2px` + label. "Humano" → quadrado
  `background:var(--ac)`. "IA" → quadrado `background:var(--bd2)`.
- **Nota semântica**: a série "Humano" usa a cor de ACENTO do tema; a série "IA" usa a cor de
  BORDA secundária (`--bd2`, um cinza) — ou seja, "IA" é visualmente neutro/apagado e "Humano"
  é o dado em destaque. Isso é o oposto do que se poderia assumir (IA como protagonista) —
  extraído literal, sem opinião.

### DASH-CHART-03 — SegmentedControl de período
- **Container**: `margin-left:auto; display:inline-flex; border:1px solid var(--bd);
  border-radius:6px; overflow:hidden; font-size:11.5px; font-weight:600`.
- **Segmentos**: "Hoje" (ativo — `background:var(--sf2); color:var(--tx)`), "7 dias",
  "30 dias" (inativos — `color:var(--tx2); border-left:1px solid var(--bd)`). Cada segmento
  `padding:0 9px; height:24px`.

### DASH-CHART-04 — Corpo do gráfico (grade de 24 colunas)
- **Container**: `padding:14px 14px 8px; display:grid; grid-template-columns:repeat(24,1fr);
  gap:4px; align-items:end; height:170px`. Confirma README §3.1 ("24 colunas empilhadas...
  altura 170px").
- **Barra "passada" (preenchida, colunas 1–16 no exemplo)**: cada coluna é
  `display:flex; flex-direction:column; gap:2px`, altura total = % da hora (dado de exemplo).
  Camada de cima = "IA" (`flex:1; background:var(--bd2); border-radius:2px 2px 0 0`); camada
  de baixo = "Humano" (`height:<pct>%; background:var(--ac)`), sem raio (o raio de topo fica
  só na camada superior do empilhamento).
- **Barra "futura" (tracejada, colunas 17–24 no exemplo)**: `opacity:.45`, uma única camada
  `flex:1; border:1px dashed var(--bd2); border-radius:2px 2px 0 0` — **sem** camada
  `var(--ac)` preenchida (a divisão humano/IA não é mostrada nas horas futuras, faz sentido:
  não houve conversa ainda). Confirma README §3.1 ("horas futuras em barra tracejada com
  opacidade .45").
- **`[!]` Dados de exemplo, por coluna** (24 valores de altura total, todos "número talvez não
  exista" — split Humano/IA por hora é citado no README de Contatos/Conversas como possível
  gap de produto; aqui está o mesmo padrão de dado, extraído porque a Fase B decide):
  22%,16%,12%,10%,9%,14%,28%,52%,78%,92%,100%,86%,60%,70%,88%,94% (passadas, 1–16) e
  80%,66%,48%,40%,36%,30%,24%,20% (futuras/tracejadas, 17–24).
  Camada "Humano" (só nas 16 primeiras): 35%,30%,30%,20%,20%,30%,40%,45%,50%,55%,58%,52%,
  45%,55%,60%,62% (percentual relativo à própria coluna, não à grade toda).

### DASH-CHART-05 — Eixo X
- **Container**: `display:flex; justify-content:space-between; padding:0 14px 10px;
  font-size:10.5px; color:var(--tx3)`.
- **Labels**: `"00h" "06h" "12h" "18h" "23h"` — 5 labels pra 24 colunas (a cada ~6h), não uma
  label por coluna.

---

## DASH-FUNNEL — "Funil de vendas"

### DASH-FUNNEL-01 — Container e header
- **Container**: `border:1px solid var(--bd); border-radius:8px; background:var(--sf);
  overflow:hidden; display:flex; flex-direction:column`.
- **Header**: `height:40px; padding:0 14px; border-bottom:1px solid var(--bd)`. Título
  `"Funil de vendas"` `font-size:13px; font-weight:600` + subtítulo inline `"por etapa · mês
  atual"` `font-size:11.5px; color:var(--tx3); margin-left:8px` + link `"Abrir funil →"`
  `margin-left:auto; font-size:12px; font-weight:600; color:var(--acs)`.

### DASH-FUNNEL-02 — Header de colunas da tabela
- **Container**: `display:grid; grid-template-columns:1.4fr 80px 120px 1.6fr 90px;
  align-items:center; height:30px; padding:0 14px; background:var(--sf2); border-bottom:1px
  solid var(--bd); font-size:11px; font-weight:600; color:var(--tx2)`.
- **Colunas**: `Etapa` (esquerda) · `Negócios` (`text-align:right`) · `Valor`
  (`text-align:right`) · `Distribuição` (`padding-left:16px`) · `Conversão`
  (`text-align:right`). Confirma README §3.1 literal.

### DASH-FUNNEL-03 — Linha de etapa (padrão comum às 4 linhas)
- **Container**: mesmo grid de -02, `height:36px; padding:0 14px; border-bottom:1px solid
  var(--bd)` (linha **4** — última — sem `border-bottom`), `font-size:13px`.
- **Coluna Etapa**: `display:flex; align-items:center; gap:8px; font-weight:500`; dot
  `8px×8px; border-radius:50%` na cor da etapa (dado do tenant, hex do exemplo abaixo).
- **Coluna Distribuição**: barra `display:block; height:6px; border-radius:3px;
  background:var(--sf2); overflow:hidden` (trilha) com preenchimento interno
  `height:100%; width:<pct>%; background:<cor-da-etapa>; opacity:.85`.
- **Coluna Conversão**: `text-align:right`; primeira linha mostra `"—"` em `color:var(--tx2)`
  (sem conversão anterior); demais mostram `%` em cor de texto padrão (sem cor semântica).

### DASH-FUNNEL-04 — Dados de exemplo, por etapa
| Etapa | Cor (dot/barra) | Negócios | Valor | Largura da barra | Conversão |
|---|---|---|---|---|---|
| Novo lead | `#0EA5E9` | 64 | R$ 96.200 | 100% | — |
| Qualificado | `#7C3AED` | 41 | R$ 71.800 | 64% | 64% |
| Proposta | `#F59E0B` | 27 | R$ 58.300 | 42% | 66% |
| Negociação | `#EC4899` | 15 | R$ 39.900 | 23% | 56% |
- **Nota**: 4 etapas apenas (não 5) — README confirma "Etapa | Negócios | Valor |
  Distribuição | Conversão", sem citar quantidade; a contagem de 4 vem só do mockup.
  `[!]` cor de etapa é "hex do tenant" (README geral, Rodada 1) — os 4 hex acima são exemplo,
  não uma paleta fixa do design system.
- **Largura da barra**: normalizada pelo maior valor de "Negócios" (64 = 100%), não pelo
  valor absoluto de cada etapa — 41/64≈64%, 27/64≈42%, 15/64≈23%, bate exato.

---

## DASH-QUEUE — "Fila agora" (rail, 1fr)

### DASH-QUEUE-01 — Container e header
- **Container**: `border:1px solid var(--bd); border-radius:8px; background:var(--sf);
  overflow:hidden`.
- **Header**: `height:40px; padding:0 14px; border-bottom:1px solid var(--bd)`. Título
  `"Fila agora"` `font-size:13px; font-weight:600` + indicador `"ao vivo"` inline
  (`margin-left:8px; font-size:11px; color:var(--tx2)`, dot `6px×6px; border-radius:50%;
  background:#22C55E` — hex literal) + contagem `"12"` `margin-left:auto; font-size:12px;
  color:var(--tx2)`.

### DASH-QUEUE-02 — Item de conversa (padrão comum aos 3 itens visíveis)
- **Container**: `display:flex; align-items:center; gap:10px; height:44px; padding:0 14px;
  border-bottom:1px solid var(--bd)` (as 3 linhas mostradas têm border-bottom — a spec de
  "última linha sem borda" não se aplica aqui porque o rodapé "Ver todas" vem depois,
  separado).
- **Avatar**: `26px×26px; border-radius:50%` (círculo — diferente do avatar "operador" do
  Shell, que é `rounded-[30%]`; aqui é contato/cliente, círculo puro), `background:var(--avs);
  color:var(--avi); font-size:10px; font-weight:700`, 2 iniciais.
- **Coluna nome+mensagem**: `flex:1; min-width:0; display:flex; flex-direction:column;
  line-height:1.25`. Nome `font-size:12.5px; font-weight:600; white-space:nowrap;
  overflow:hidden; text-overflow:ellipsis`. Mensagem `font-size:11px; color:var(--tx2)`
  (mesmo truncamento).
- **Coluna direita**: `display:flex; flex-direction:column; align-items:flex-end; gap:3px`.
  Tempo decorrido `font-size:11px; font-weight:600`, cor por faixa de SLA (ver
  DASH-QUEUE-03). Chip de ator abaixo: `height:16px; padding:0 5px; border-radius:5px;
  font-size:10px; font-weight:700`.

### DASH-QUEUE-03 — Dados de exemplo + regra de cor por SLA
| Nome | Mensagem (truncada) | Tempo | Cor do tempo | Chip | Cor do chip |
|---|---|---|---|---|---|
| Mariana Costa | "Quero saber do plano anual…" | 18 min | `var(--dg)` | "IA" | bg `var(--amberbg)`, texto `var(--amber)` |
| João Pedro Alves | "Boleto venceu ontem, consigo 2ª via?" | 9 min | `var(--amber)` | "Ana" | bg `var(--okbg)`, texto `var(--ok)` |
| Acme Ltda | "Segue o contrato assinado" | 2 min | `var(--tx2)` | "IA" | bg `var(--amberbg)`, texto `var(--amber)` |
- **Regra observada (2 eixos de cor independentes)**:
  1. **Tempo de espera** — 3 cores (perigo/âmbar/neutro) por faixa de minutos. `[!]` os
     thresholds exatos (que minuto vira "amber", que minuto vira "dg") não estão no HTML nem
     no README — só os 3 exemplos (18→dg, 9→amber, 2→tx2); Fase B precisa decidir os cortes
     reais (ou confirmar se vêm de config/backend).
  2. **Quem está atendendo** — chip "IA" sempre âmbar; chip com nome de agente (aqui "Ana",
     abreviado) sempre verde/sucesso. `[!]` "Ana" no chip é abreviação de "Ana Nunes" (nome
     completo aparece no card Equipe, ver DASH-TEAM) — confirmar se o chip trunca pra
     primeiro-nome sempre ou só quando não cabe.
- **Fonte**: canvas `id="1b"`, único bloco com esse padrão de cor dupla.

### DASH-QUEUE-04 — Rodapé "Ver todas as N"
- **Container**: `display:flex; align-items:center; justify-content:center; height:32px;
  font-size:12px; font-weight:600; color:var(--tx2)`. Sem borda própria (fica colado no
  `border-bottom` do último item da lista).
- **Texto**: `"Ver todas as 12"` — número bate com a contagem do header (-01).

---

## DASH-TEAM — "Equipe" (rail, abaixo de Fila agora)

### DASH-TEAM-01 — Container e header
- **Container**: `border:1px solid var(--bd); border-radius:8px; background:var(--sf)`
  (sem `overflow:hidden` explícito, diferente do card Fila agora — `[!]` checar se é
  intencional ou omissão do mock).
- **Header**: `height:40px; padding:0 14px; border-bottom:1px solid var(--bd)`. Título
  `"Equipe"` `font-size:13px; font-weight:600` + `"4 online"` `margin-left:auto;
  font-size:11.5px; color:var(--tx2)`.

### DASH-TEAM-02 — Header de colunas
- **Container**: `display:grid; grid-template-columns:1fr 60px 60px; padding:6px 14px 2px;
  font-size:10.5px; font-weight:600; color:var(--tx3)`.
- **Colunas**: em branco (nome) · `"Abertas"` (`text-align:right`) · `"TMR"`
  (`text-align:right`).

### DASH-TEAM-03 — Linha de membro humano (padrão comum às 3 primeiras linhas)
- **Container**: `display:grid; grid-template-columns:1fr 60px 60px; align-items:center;
  height:32px; padding:0 14px; font-size:12.5px` (última linha humana tem `padding:0 14px 6px`
  — 6px extra embaixo, ausente nas anteriores).
- **Coluna nome**: `display:flex; align-items:center; gap:8px`. Avatar `20px×20px;
  border-radius:30%` (operador — quadrado arredondado, igual ao padrão do Shell/UserMenu,
  diferente do círculo usado em DASH-QUEUE), `background:var(--avs); color:var(--avi);
  font-size:8.5px; font-weight:700`, 2 iniciais. Dot de presença: `position:absolute;
  right:-2px; bottom:-2px; width:7px; height:7px; border-radius:50%;
  border:1.5px solid var(--sf)` (a borda usa a cor de SUPERFÍCIE do tema, pra "recortar" o
  dot do avatar — só essa borda é tokenizada; o fundo do dot é hex fixo, ver -04).
- **Colunas Abertas/TMR**: `text-align:right`; "Abertas" em cor de texto padrão, "TMR" em
  `color:var(--tx2)`.

### DASH-TEAM-04 — Dados de exemplo (linhas humanas)
| Nome | Iniciais | Abertas | TMR | Cor do dot de presença |
|---|---|---|---|---|
| Ana Nunes | AN | 7 | 0:41 | `#22C55E` (hex literal) |
| Rafael Costa | RC | 5 | 0:52 | `#22C55E` (hex literal) |
| Lucas Melo | LM | 3 | 1:10 | `#F97316` (hex literal) |
- **Nota**: `#F97316` não corresponde a nenhum `--amber` de nenhum tema (claro `#B45309`,
  escuro `#FBBF24`) — é uma 3ª cor de "ausente/ocupado" fora da paleta de tokens documentada.
  `[!]` Fase B decide se isso é um estado novo (ex.: "ausente" vs. "online"/"offline" binário)
  ou erro de cor no mock.

### DASH-TEAM-05 — Linha do agente de IA (última linha, estrutura diferente)
- **Diferença de container**: avatar substituído por tile `20px×20px; border-radius:6px;
  background:var(--acsoft); color:var(--acs)` com ícone (mesmo ícone de "Agentes IA" da
  sidebar — automação/robô, `12px`, `stroke-width:2.2`) — **sem** dot de presença (IA não tem
  estado online/ausente).
- **Dados**: `"Agente Vendas"` · Abertas `23` · TMR `0:04` (cor `var(--tx2)`, igual às linhas
  humanas — sem destaque especial apesar do TMR ser 10× mais rápido que os humanos).
- **Fonte**: canvas `id="1b"`.

---

## Contagem total

- DASH-HEADER: 4 itens (01–04)
- DASH-KPI: 7 itens (01–07)
- DASH-CHART: 5 itens (01–05)
- DASH-FUNNEL: 4 itens (01–04)
- DASH-QUEUE: 4 itens (01–04)
- DASH-TEAM: 5 itens (01–05)
- **Total: 29 itens numerados.**
- Flags `[!]` levantadas: 12 (timestamp de atualização real vs. exemplo, cor de status
  dot×texto não uniforme, dropdown "Hoje" sem mockup aberto, split Humano/IA por hora como
  possível dado sem backend — citado explicitamente pelo usuário como esperado, cor de etapa
  do funil é hex do tenant não paleta fixa, thresholds de cor do SLA da fila não
  documentados, abreviação do chip de ator não confirmada, ausência de `overflow:hidden` no
  card Equipe, cor de presença "ausente" `#F97316` fora da paleta de tokens ×2 ocorrências
  correlatas, mensagens de faixa de crédito como dado de exemplo/backend — replicado de
  `spec/shell.md`).
