# Spec — 1e Funis/Negócios (Kanban + card + CloseDealReasonModal)

Fase A (extração pura) da Auditoria Noturna — SCRUM-1097. Zero código, zero opinião:
só o que as 3 fontes mostram. Tela extraída **fora da própria leva** (Funis é do
Cartógrafo/leva 5), de propósito, para reduzir viés de quem já reestilizou o código.

**Fontes, em ordem de autoridade:**
1. `Oryon-Reestilizacao-canvas.html`, bloco `id="1e"` — HTML real com `style=""` inline,
   não just um desenho: todo valor abaixo marcado "HTML" vem direto desse markup.
2. `telas/01-1e-*.png` (claro) + `telas/02-1e-*.png` (escuro) — 2 arquivos, cada um em
   2 temas = 4 imagens: `funis-kanban-modal` (board completo + CloseDealReasonModal
   aberto por cima) e `card-negocio-estados` (4 estados do card lado a lado + notas).
3. `README.md` § 3.4 "Funis/Negócios (`1e`)" — intenção/regra por trás do valor.

**Tokens de tema** (mesmo mapa CSS custom properties usado no `id="1e"` do canvas —
resolvidos abaixo onde o HTML usa `var(--x)`; útil pra achar rapidamente o hex real):

| var | claro | escuro |
|---|---|---|
| `--bg` | `#FAFAFC` | `#060909` |
| `--sf` (surface) | `#FFFFFF` | `#161E1E` |
| `--sf2` (surface-2) | `#F5F6F8` | `#0E1414` |
| `--bd` (borda) | `#E4E6EC` | `#243333` |
| `--bd2` (borda ênfase) | `#C8CDD8` | `#2E4040` |
| `--tx` (texto) | `#1A1F2E` | `#ECF1F1` |
| `--tx2` (texto secundário) | `#5C657A` | `#8FA5A5` |
| `--tx3` (texto terciário) | `#9098AA` | `#6B8080` |
| `--ac` (acento) | `#14B8A6` | `#2DD4BF` |
| `--acs` (acento forte) | `#0F766E` | `#2DD4BF` |
| `--acsoft` (acento anel/glow) | `rgba(20,184,166,.12)` | `rgba(45,212,191,.14)` |
| `--btn` (fundo botão primary) | `#0F766E` | `#2DD4BF` |
| `--btntx` (texto botão primary) | `#FFFFFF` | `#04201D` |
| `--ok` (sucesso) | `#15803D` | `#22C55E` |
| `--okbg` (fundo sucesso) | `rgba(21,128,61,.10)` | `rgba(34,197,94,.14)` |
| `--dg` (perigo) | `#B91C1C` | `#EF4444` |
| `--dgbg` (fundo perigo) | `rgba(185,28,28,.08)` | `rgba(239,68,68,.14)` |
| `--amber` | `#B45309` | `#FBBF24` |
| `--amberbg` | `rgba(180,83,9,.10)` | `rgba(251,191,36,.14)` |
| `--rowhover` | `#F5F6F8` | `#1B2525` |
| `--avs` (fundo avatar) | `#374151` | `#B5C8C8` |
| `--avi` (texto avatar) | `#FFFFFF` | `#060909` |
| `--ink` / `--inkamt` (usados por `tintaDaEtapa()`) | `#000` / `40%` | `#fff` / `0%` |
| `--ovbd` (borda overlay) | `#D5DAE3` | `#324646` |
| `--ovsh` (sombra overlay) | `0 0 0 1px rgba(15,23,42,.03),0 4px 12px rgba(15,23,42,.10),0 16px 40px rgba(15,23,42,.16)` | `inset 0 1px 0 rgba(255,255,255,.05),0 4px 12px rgba(0,0,0,.45),0 12px 32px rgba(0,0,0,.55)` |
| `--scrim` (fundo por trás de modal) | `rgba(15,23,42,.18)` | `rgba(0,0,0,.4)` |

Fonte de todo o mapa acima: HTML (`Component.renderVals()`, objetos `light`/`dark` no
`<script type="text/x-dc">` ao final do bloco `id="1e"` — mesmo script serve todo o
canvas, não é exclusivo desta tela).

---

## DEAL-COL — Header, board bar e colunas do Kanban

**DEAL-COL-01 — Header da página (48px).**
Container: `height:48px`, `border-bottom:1px solid var(--bd)`, `background:var(--sf)`,
padding `0 16px`, `display:flex;align-items:center;gap:12px`. [HTML]

**DEAL-COL-02 — Breadcrumb "Funis".**
`"Funis"` em `font-size:14px;font-weight:700;letter-spacing:-.01em`, seguido de `"/"`
em `color:var(--tx3)`. [HTML]

**DEAL-COL-03 — Seletor de funil.**
Pill: `height:28px`, padding `0 9px`, `border-radius:7px`, `border:1px solid var(--bd2)`,
`font-size:12.5px;font-weight:600`. Contém: quadradinho de **8×8px**,
`border-radius:2px`, `background:#14B8A6` (hex cru, cor do pipeline — não passa por
`tintaDaEtapa()` aqui) + texto `"Vendas · Clínicas"` + chevron 13×13px.
README confirma: "quadradinho de 8px na cor do pipeline". [HTML+README]

**DEAL-COL-04 — Botão "Novo negócio".**
`height:28px`, padding `0 10px`, `border-radius:7px`, `background:var(--btn)`,
`color:var(--btntx)`, `font-size:12px;font-weight:600`, ícone `+` de 14px. [HTML]

**DEAL-COL-05 — Busca.**
`width:200px;height:28px`, padding `0 10px`, `border-radius:7px`,
`border:1px solid var(--bd)`, `background:var(--sf2)`, `color:var(--tx3)`,
`font-size:12px`; atalho `"/"` em `font-family:'JetBrains Mono',monospace;
font-size:10.5px`, `border:1px solid var(--bd2)`, `border-radius:4px`, alinhado à
direita dentro do campo. [HTML]

**DEAL-COL-06 — Sino de notificação + avatar.**
Sino: `28×28px`, `border-radius:7px`, ícone 16px, `color:var(--tx2)`. Avatar: `28×28px`,
`border-radius:30%` (não círculo — mesma família "operador" de `rounded-[30%]` usada em
avatar de dono de negócio), `background:var(--avs)`, `color:var(--avi)`,
`font-size:10.5px;font-weight:700`, iniciais `"RC"`. [HTML]

**DEAL-COL-07 — Board bar (44px).**
Container: `height:44px`, `border-bottom:1px solid var(--bd)`, `background:var(--sf)`,
padding `0 16px`, `display:flex;align-items:center;gap:8px`. Confere com README:
"Board bar 44px". [HTML+README]

**DEAL-COL-08 — SegmentedControl Kanban/Lista/Previsão.**
Container: `border:1px solid var(--bd);border-radius:7px`, `overflow:hidden`,
`font-size:12px;font-weight:600`. Cada item `height:28px`, padding `0 10px`. Ativo
("Kanban"): `background:var(--sf2)`, `color:var(--tx)`. Inativos ("Lista"/"Previsão"):
`color:var(--tx2)`, `border-left:1px solid var(--bd)` entre eles. [HTML]

**DEAL-COL-09 — Filtros "Responsável"/"Etiqueta"/"Fechamento previsto".**
3 pills idênticos: `height:28px`, padding `0 9px`, `border-radius:7px`,
`border:1px solid var(--bd2)`, `font-size:12px;font-weight:600`, chevron 12px. [HTML]

**DEAL-COL-10 — Resumo (`147 negócios · R$ … em aberto · R$ … ganhos no mês`).**
`font-size:12px;color:var(--tx2)`. `"147 negócios"` em `<b>` (`font-weight:700;
color:var(--tx)`). `"R$ 128.400 ganhos no mês"` em `color:var(--ok);font-weight:600`
(cor de sucesso — confirma README: "ganhos em cor de sucesso"). Valor exato do mock:
`147 negócios · R$ 266.200 em aberto · R$ 128.400 ganhos no mês`. [HTML+README]

**DEAL-COL-11 — Link "Etapas".**
`height:28px`, padding `0 9px`, `border-radius:7px`, `color:var(--tx2)`,
`font-size:12px;font-weight:600`, ícone de "colunas" 14px + texto. Sem borda (é o
único item da board bar sem contorno). [HTML]

**DEAL-COL-12 — Área de colunas.**
Container: `display:flex;gap:10px`, padding `12px 16px`, `overflow:hidden`. Gap de
**10px** entre colunas confere com README ("Coluna 250px, gap 10px"). [HTML+README]

**DEAL-COL-13 — Coluna individual (não-terminal).**
`width:250px` (flex:none), `display:flex;flex-direction:column;gap:8px` — **8px** entre
cabeçalho e cards, e entre cards (não 10px — 10px é só o gap ENTRE colunas, DEAL-COL-12).
[HTML]

**DEAL-COL-14 — Cabeçalho de coluna.**
`height:28px`, padding `0 4px`, `display:flex;align-items:center;gap:7px`,
`border-bottom:2px solid <hex cru da etapa>` — a linha de 2px usa o **hex cru**, não
passa por `tintaDaEtapa()` (nota do painel de estados, ver DEAL-CARD-notas). Confirma
README: "border-bottom 2px na cor crua da etapa". [HTML+README]

**DEAL-COL-15 — Título da coluna.**
`font-size:12.5px;font-weight:700`, `color:color-mix(in srgb, var(--ink) var(--inkamt),
<hex-etapa>)` — isto É a implementação de `tintaDaEtapa()`: mistura o hex da etapa com
preto a 40% no claro (`--ink:#000;--inkamt:40%`) e com branco a 0% no escuro
(`--ink:#fff;--inkamt:0%`, ou seja, no escuro o hex passa cru pro texto também). Confere
literalmente com a nota manuscrita do mock: "Título da coluna: texto passa por
tintaDaEtapa() (aqui: color-mix(var(--ink) var(--ink-amount), hex)); a linha de 2px
embaixo usa a hex cru. Funciona para qualquer cor do tenant." [HTML+PNG-nota+README]

**DEAL-COL-16 — Contagem da coluna.**
`font-size:11.5px;color:var(--tx3);font-weight:600`, ex. `"64"`. Fica logo depois do
título, mesma linha. [HTML]

**DEAL-COL-17 — Soma em R$ da coluna.**
`margin-left:auto` (empurra pra direita), `font-size:11.5px;color:var(--tx2)`, ex.
`"R$ 96.200"`. [HTML]

**DEAL-COL-18 — Cores cruas das etapas (hex exato por etapa, valor do mock).**
Novo lead `#0EA5E9` (azul) · Qualificado `#7C3AED` (violeta) · Proposta `#F59E0B`
(âmbar) · Negociação `#EC4899` (rosa) · Ganho usa `var(--ok)` direto (não hex cru
próprio — é a única etapa que usa o token semântico de sucesso) · Perdido `#B91C1C`
(hex cru fixo, = `--dg` do tema claro; no HTML o border-bottom de Perdido está fixo em
`#B91C1C` mesmo no bloco compartilhado por tema — verificar ao vivo se isto muda para
`--dg`/`#EF4444` no escuro ou fica fixo). [HTML]

**DEAL-COL-19 — Rodapé "+N negócios".**
`text-align:center;font-size:11.5px;color:var(--tx3)`, padding `6px 0`. Um por coluna,
sempre que há mais itens do que os renderizados (mock mostra 3 cards + "+61 negócios"
na 1ª coluna, por exemplo — a lista completa (64 itens) não é renderizada, é
propositalmente truncada como demo). [HTML]

**DEAL-COL-20 — Slot de drop tracejado (exemplo na coluna "Proposta").**
`border:1px dashed var(--bd2)`, `border-radius:8px`, `height:88px`,
`background:var(--sf2)`. Confere com README: "Slot de drop: retângulo tracejado de
88px." [HTML+README]

**DEAL-COL-21 — Card "em arraste" (exemplo na coluna "Proposta").**
Mesmo container do card padrão, MAIS: `border:1px solid var(--bd2)` (em vez de
`var(--bd)` — borda de ênfase mesmo em arraste), `box-shadow:var(--ovsh)` (a MESMA
sombra de overlay, não uma sombra própria — README/nota confirmam: "única sombra fora
de overlay, ele É um overlay enquanto flutua"), `transform:rotate(-1.5deg)`,
`opacity:.95`. [HTML+README+PNG-nota]

**DEAL-COL-22 — Coluna terminal (Ganho + Perdido), container.**
`flex:1;min-width:180px`, `display:flex;flex-direction:column;gap:8px`,
`border-left:1px dashed var(--bd2)`, `padding-left:10px` — as 2 etapas terminais
dividem UMA coluna à direita, separada do resto por borda tracejada (não são 2
colunas de 250px cada). Confere README: "coluna à direita separada por borda
tracejada". [HTML+README]

**DEAL-COL-23 — Cabeçalho "Ganho".**
`border-bottom:2px solid #22C55E` (hex verde cru), título em `color:var(--ok)`
(único cabeçalho de etapa que usa o token semântico direto, não hex cru misturado por
`tintaDaEtapa()`). Mesma tipografia 12.5px/700 + contagem 11.5px/600 + soma 11.5px à
direita dos demais cabeçalhos. [HTML]

**DEAL-COL-24 — Placeholder de drop "Ganho".**
Caixa dentro da coluna Ganho: `border:1px solid var(--bd)`, `border-radius:8px`,
`background:var(--sf2)`, padding `10px 12px`, `font-size:12px;color:var(--tx2);
line-height:1.5`. Texto: `"Solte aqui para marcar como "` + `<b>Ganho</b>`
(`font-weight:700;color:var(--tx)`) + `". Etapas terminais pedem motivo."` — substitui
os cards quando a coluna está vazia (é o estado vazio da coluna Ganho no mock, não um
card real). [HTML]

**DEAL-COL-25 — Cabeçalho "Perdido".**
Visualmente destacado dos demais: `border-bottom:2px solid #B91C1C`,
`background:var(--dgbg)`, `border-radius:4px 4px 0 0` (só os 2 cantos de cima
arredondados — o cabeçalho "veste" um fundo próprio, os outros cabeçalhos de coluna
não têm fundo). `margin-top:8px` (separa visualmente de "Ganho" acima). Título em
`color:var(--dg)`. [HTML]

**DEAL-COL-26 — Slot vazio "Perdido".**
`border:1px dashed var(--dg)` (tracejado NA COR de perigo, diferente do
`border-dashed var(--bd2)` neutro do slot de drop comum em DEAL-COL-20),
`background:var(--dgbg)`, `border-radius:8px`, `height:88px`, sem texto interno (ao
contrário do placeholder de "Ganho", que tem texto explicativo). [HTML]

**Contagem DEAL-COL: 26 itens.**

---

## DEAL-CARD — Card de negócio (container + 4 estados + conteúdo)

Fonte principal: painel anotado "CARD DE NEGÓCIO · ESTADOS" (`telas/01/02-1e-card-
negocio-estados.png`), que mostra os 4 estados lado a lado + notas de texto; cruzado
com os cards reais dentro do board (`funis-kanban-modal.png`) e o HTML de ambos.

**DEAL-CARD-01 — Container padrão.**
`width:250px` (ou 100% da coluna), `border:1px solid var(--bd)`, `border-radius:8px`,
`background:var(--sf)`, padding `10px 12px`, `display:flex;flex-direction:column;
gap:6px`. Confere README: "borda 1px, raio 8px, padding 10px 12px". [HTML+README]

**DEAL-CARD-02 — Estado hover.**
`border:1px solid var(--bd2)` (borda de ênfase — sobe um degrau de `var(--bd)`),
`background:var(--rowhover)` (não fica `var(--sf)`; o fundo muda pro token universal
de hover). Confere README: "hover (borda de ênfase + `--rowhover`)". [HTML+README]

**DEAL-CARD-03 — Estado selecionado / painel aberto.**
`border:1px solid var(--ac)` (cor de acento, não `--bd2`), `background:var(--sf)`
(volta ao fundo padrão — só a borda muda), `box-shadow:0 0 0 3px var(--acsoft)` — anel
de **3px** na cor de acento suave. Confere README: "selecionado (borda acento + anel
de 3px)". [HTML+README]

**DEAL-CARD-04 — Estado touch (menu "Mover").**
Mesmo container padrão (`border:1px solid var(--bd)`), MAIS um botão `"Mover ▾"` no
canto superior direito do card, ao lado do título: `height:22px`, padding `0 7px`,
`border-radius:6px`, `border:1px solid var(--bd2)`, `font-size:11px;font-weight:600`,
chevron 11px. Substitui o drag-and-drop nativo em touch — confirma README: "variante
touch com botão `Mover ▾` (DnD é HTML5 nativo condicionado a
`(hover:hover) and (pointer:fine)`)". [HTML+README]

**DEAL-CARD-05 — Título do negócio.**
`font-size:13px;font-weight:600;line-height:1.3`. Confere README: "13px/600/1.3".
[HTML+README]

**DEAL-CARD-06 — Linha de contato.**
`font-size:12px;color:var(--tx2)`. Formato `"Contato · Empresa"` (ex.: "Carlos
Siqueira · Curitiba", "Mariana Costa · Acme Ltda"). Quando não há empresa, só a
cidade (ex.: "Goiânia", "Porto Alegre", "Belo Horizonte"). [HTML]

**DEAL-CARD-07 — Chips de etiqueta.**
Container: `display:flex;gap:4px`, entre a linha de contato e o rodapé. Chip: `height:
16px`, padding `0 6px`, `border-radius:5px`, `background:color-mix(in srgb, <hex-tag>
85%, #000)` (a cor da tag escurecida com preto a 15% — não é a cor crua da tag),
`color:#fff`, `font-size:10px;font-weight:600`. Exemplos de valor: `"VIP"` (#EC4899),
`"Indicação"` (#0EA5E9), `"B2B"` (#10B981). Confere README: "chips de etiqueta de
16px" — mas README não documenta o `color-mix` de escurecimento; achado só no HTML.
[HTML+README]

**DEAL-CARD-08 — Chip "IA".**
Mesma família de badge (16px), mas cores fixas: `background:var(--amberbg);
color:var(--amber)`, texto `"IA"`. Aparece no rodapé do card, entre o valor e o
tempo — não junto aos chips de etiqueta. Confirma README: "chip de IA opcional".
[HTML+README]

**DEAL-CARD-09 — Valor do negócio.**
`font-size:13px;font-weight:700`, ex. `"R$ 6.400"`. Confere README: "valor
13px/700". [HTML+README]

**DEAL-CARD-10 — Tempo relativo (normal).**
`margin-left:auto` (dentro do rodapé), `font-size:11px;color:var(--tx3)`. Valores do
mock: `"há 1 h"`, `"há 2 h"`, `"ontem"`, `"05 set"`, `"08 set"`, `"10 set"`. [HTML]

**DEAL-CARD-11 — Alerta "parado Nd" (cor de perigo).**
Mesma posição/tamanho do tempo normal, mas `color:var(--dg);font-weight:600` (ganha
peso 600 — o tempo normal não tem `font-weight` setado, herda 400). Valores do mock:
`"parado 6 d"`, `"parado 9 d"`. Confere README: "tempo/alerta de parado (cor de
perigo)". [HTML+README]

**DEAL-CARD-12 — Avatar do responsável.**
`18×18px`, `border-radius:30%`, `background:var(--avs)`, `color:var(--avi)`,
`font-size:8px;font-weight:700`, iniciais (ex. "RC", "AN", "LM"). Confere README:
"avatar de 18px `rounded-[30%]`". [HTML+README]

**DEAL-CARD-13 — Avatar tracejado (sem responsável).**
Mesmo tamanho/raio (18px, `rounded-[30%]`), mas `border:1px dashed var(--bd2)`, sem
`background` nem iniciais — só o contorno tracejado vazio. Confere README:
"(tracejado quando sem responsável)". [HTML+README]

**DEAL-CARD-14 — Meta de "qui" (dia da semana) em card de demo agendada.**
Elemento extra visto só num card (`"Dra. Renata — demo quinta 10h"`): ícone de
calendário 11px + texto `"qui"`, `display:inline-flex;gap:3px;font-size:11px;
color:var(--tx2)`, entre o valor e o tempo relativo. Não documentado no README — só
achado no HTML/PNG; parece um detalhe específico de um card de exemplo (reunião
marcada), não necessariamente um estado geral do card. [HTML, sem README — marcar
`❓` na Fase B]

**Notas do painel anotado (texto integral, ver DEAL-CARD-notas):**

- "Título da coluna: texto passa por `tintaDaEtapa()` (aqui: `color-mix(var(--ink)
  var(--ink-amount), hex)`); a linha de 2px embaixo usa o hex cru. Funciona para
  qualquer cor do tenant." — já capturado em DEAL-COL-15.
- "Cartão em arrasto: única sombra fora de overlay — ele *é* um overlay enquanto
  flutua." — já capturado em DEAL-COL-21.
- "Ganho/Perdido não são alvo de clique direto; a 'porta única' continua sendo o
  `CloseDealReasonModal`, com o erro inline do FormField no lugar de bloquear o
  botão." — regra de interação, ver DEAL-MODAL-07.

**Contagem DEAL-CARD: 14 itens** (+ 3 notas transcritas, sem numeração própria por
já mapearem 1:1 pra itens DEAL-COL/DEAL-MODAL).

---

## DEAL-MODAL — CloseDealReasonModal ("Mover para Perdido")

**DEAL-MODAL-01 — Container.**
`width:440px`, `border:1px solid var(--ovbd)`, `border-radius:10px`,
`background:var(--sf)`, `box-shadow:var(--ovsh)`. Confere README: "440px". Fica
centralizado sobre um scrim (`position:absolute;inset:0;background:var(--scrim);
display:flex;align-items:center;justify-content:center`) que cobre a área do board
(não a tela inteira — no mock o scrim está contido dentro do frame do board, não do
app inteiro; verificar ao vivo se é `position:fixed` na implementação real).
[HTML+README]

**DEAL-MODAL-02 — Borda do modal em modo escuro.**
No PNG escuro (`02-1e-funis-kanban-modal.png`), a borda do modal aparece com um tom
vermelho/perigo visível — mais saturada que `var(--ovbd)` (#324646) sozinha
explicaria. **Não confirmado no HTML** (o HTML só define `border:1px solid
var(--ovbd)`, sem variação condicional de cor). Pode ser efeito óptico do fundo escuro
+ glow do banner âmbar por baixo, ou uma diferença real não capturada no snippet
extraído. **Marcar para conferir ao vivo (Fase D) nos 2 temas, zoom na borda.**
[PNG, ❓ — não reconciliado com HTML]

**DEAL-MODAL-03 — Título.**
`"Mover para Perdido"`, `font-size:15px;font-weight:700;letter-spacing:-.01em`,
padding do bloco `16px 18px 0`. Confere README: "título `Mover para Perdido`".
[HTML+README]

**DEAL-MODAL-04 — Descrição.**
`font-size:12.5px;color:var(--tx2);line-height:1.5;margin-top:4px`. Nomeia o negócio
em `<b>` (`font-weight:600;color:var(--tx)`) + valor entre parênteses + texto fixo.
Valor exato do mock: `"Plano Pro anual · 12 licenças (R$ 18.900) sai de Proposta e
deixa de contar na previsão do mês. O motivo é obrigatório."` Confere README:
"descrição nomeando o negócio e o valor". [HTML+README]

**DEAL-MODAL-05 — Label "Motivo".**
`font-size:12px;font-weight:600`. [HTML]

**DEAL-MODAL-06 — Select "Motivo" (estado de erro).**
`height:36px`, `border-radius:7px`, `border:1px solid var(--dg)` (borda de perigo —
já nasce em erro no mock, sem ter sido "tocado"), `background:var(--sf)`, padding
`0 10px`, `display:flex;align-items:center;justify-content:space-between`,
`font-size:13px;color:var(--tx3)` (placeholder `"Selecione um motivo"`), chevron
14px. [HTML]

**DEAL-MODAL-07 — Erro inline do Select.**
Abaixo do campo: `display:flex;align-items:center;gap:5px;font-size:11.5px;
color:var(--dg)`, ícone de alerta circular 12px + texto `"Informe o motivo para
continuar"`. Este é o "erro inline do FormField no lugar de bloquear o botão" citado
na nota do card — ou seja, **o botão de confirmar não nasce `disabled`**; o erro
aparece porque o Select está sem valor, não porque o usuário tentou submeter (no
mock estático não dá pra saber se o erro já aparece "de fábrica" ou só depois de uma
tentativa de clique — **conferir ao vivo**, é justamente o achado documentado em
`GAPS-PENDENTES.md` 3.7 sobre este mesmo modal). Confere README: "Select de motivo
obrigatório com erro inline". [HTML+README+PNG-nota]

**DEAL-MODAL-08 — Label "Observação · opcional".**
`font-size:12px;font-weight:600` pro texto "Observação"; `" · opcional"` em
`color:var(--tx3);font-weight:500` (peso mais leve, cor mais fraca — diferencia
visualmente o rótulo obrigatório do opcional). [HTML]

**DEAL-MODAL-09 — Textarea "Observação".**
`height:64px`, `border-radius:7px`, `border:1px solid var(--bd2)`,
`background:var(--sf)`, padding `8px 10px`, `font-size:13px;color:var(--tx3)`
(placeholder `"Ex.: fechou com concorrente por preço"`). Confere README: "Textarea
opcional de 64px". [HTML+README]

**DEAL-MODAL-10 — Banner âmbar de alcance.**
`display:flex;gap:8px;align-items:flex-start`, padding `9px 10px`,
`border-radius:6px`, `background:var(--amberbg)`, `color:var(--amber)`,
`font-size:12px;line-height:1.45`; ícone de alerta triangular 14px
(`flex:none;margin-top:1px`, alinhado ao topo do texto, não centralizado). Texto
exato do mock: `"Encerra a conversa vinculada e pausa 1 automação de follow-up."`
Confere README: "Banner âmbar de alcance (`Encerra a conversa vinculada e pausa 1
automação`)". **Nota de produto (já documentada em `GAPS-PENDENTES.md` 3.5, não
repetir aqui como se fosse nova):** o frontend não tem confirmação de que fechar um
negócio realmente dispara esses 2 efeitos colaterais no backend. [HTML+README]

**DEAL-MODAL-11 — Footer.**
`display:flex;justify-content:flex-end;gap:8px`, padding `16px 18px`. [HTML]

**DEAL-MODAL-12 — Botão "Cancelar".**
`height:36px`, padding `0 14px`, `border-radius:7px`, `border:1px solid var(--bd2)`,
`font-size:13px;font-weight:600`, sem `background` (transparente/neutral). [HTML]

**DEAL-MODAL-13 — Botão "Mover para Perdido" (danger).**
`height:36px`, padding `0 14px`, `border-radius:7px`, `background:#B91C1C` (hex cru
fixo — **não** `var(--dg)`; mesmo no tema escuro o HTML usa o hex claro `#B91C1C`,
não `#EF4444`. Ver DEAL-MODAL-14), `color:#fff`, `font-size:13px;font-weight:600`.
Confere README: "footer Cancelar / `Mover para Perdido` (danger)". [HTML+README]

**DEAL-MODAL-14 — Hex fixo do botão danger vs. token `--dg`.**
Achado direto do HTML: o botão usa `background:#B91C1C` **literal**, não
`var(--dg)` (que seria `#EF4444` no escuro). Mesmo padrão documentado alhures no
projeto pra botão destrutivo (`--color-btn-danger-bg`, sólido nos 2 temas — ver
plano do épico, "destrutivo `#B91C1C` sólido nos dois temas"). Ou seja: **isto não é
inconsistência do mock**, é o comportamento intencional já conhecido — o botão
danger não segue a escala semântica `--dg`, usa o token dedicado de botão. [HTML]

**Contagem DEAL-MODAL: 14 itens.**

---

## Resumo de cobertura

| Região | Itens |
|---|---|
| DEAL-COL | 26 |
| DEAL-CARD | 14 |
| DEAL-MODAL | 14 |
| **Total** | **54** |

Itens marcados `❓` (fonte não reconciliada, decidir/confirmar só na Fase D ao vivo):
DEAL-CARD-14 (meta "qui" — específico de 1 card de exemplo, não está no README),
DEAL-MODAL-02 (borda vermelha do modal no escuro — visível no PNG, não no HTML).

Nenhum item exige dado/funcionalidade que não exista hoje (Funis já é uma feature real
e completa) — isto é puramente reestilo, sem candidato a `[!]` nesta tela.
