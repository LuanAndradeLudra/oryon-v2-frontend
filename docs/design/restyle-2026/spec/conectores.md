# Spec — Conectores (Catálogo `5b` + Card `4a` + Modal detalhe `3d` + Modal credencial `3e`)

Fase A (extração pura) da Auditoria Noturna — SCRUM-1097. Zero código, zero opinião.
Tela nova (`/settings/connectors`), sem UI legada — extraída **fora da própria leva**
(Conectores é da Bússola/leva 12), de propósito.

**Fontes, em ordem de autoridade:**
1. `Oryon-Reestilizacao-canvas.html`, blocos `id="5b"`, `id="4a"`, `id="3d"`, `id="3e"` —
   HTML real com `style=""` inline.
2. `telas/01-*.png` (claro) + `telas/02-*.png` (escuro) — 4 pares (8 imagens):
   `5b-conectores-catalogo`, `4a-card-conector`, `3d-conector-modal-detalhe`,
   `3e-conector-credencial`.
3. `README.md` § 3.10 "Conectores (`5b`, `4a`, `3d`, `3e`)".

**Tokens de tema** — mesmo mapa de `1e-funis.md` (é o mesmo `<script>` compartilhado
pelo canvas inteiro); tokens específicos desta tela, não usados em Funis:

| var | claro | escuro | uso |
|---|---|---|---|
| `--tilemix` | `12%` | `0%` | mistura da cor da marca no fundo do tile de logo |
| `--tilebdmix` | `22%` | `0%` | mistura da cor da marca na borda do tile de logo |

Demais tokens (`--bg`, `--sf`, `--sf2`, `--bd`, `--bd2`, `--tx`/`--tx2`/`--tx3`, `--ac`,
`--acs`, `--btn`/`--btntx`, `--ok`/`--okbg`, `--dg`/`--dgbg`, `--amber`/`--amberbg`,
`--rowhover`, `--avs`/`--avi`, `--ovbd`/`--ovsh`, `--scrim`) — ver tabela completa em
`1e-funis.md`, idênticos aqui.

**Cor de marca por conector (`--brand`, setado inline por item, hex exato do mock):**
Feegow `#0FB5AE` · Doctoralia `#00C4B3` · HubSpot `#FF7A59` · ActiveCampaign `#356AE6`
· Amplimed `#7C3AED` · Asaas `#0030B9` · Calendly `#006BFF` · Clinicorp `#E4572E` ·
Google Calendar `#4285F4` · Google Sheets `#0F9D58` · iClinic `#00A5A8`.

---

## CONN-CAT — Catálogo (`5b`)

**CONN-CAT-01 — Header da página.**
Breadcrumb `"Automação / Integrações / Conectores"`, `font-size:12px;color:var(--tx3)`
(último item, "Conectores", em `color:var(--tx2)` — mais forte, indica posição
atual). [HTML]

**CONN-CAT-02 — Título "Conectores".**
`font-size:20px;font-weight:700;letter-spacing:-.015em`. Confere README: "título
20px/700". [HTML+README]

**CONN-CAT-03 — Subtítulo.**
`font-size:13px;color:var(--tx2);line-height:1.55;margin-top:4px;max-width:640px`.
Texto exato: `"Conecte sistemas externos aos agentes de IA. Instale uma vez aqui;
depois ative por agente na aba Skills de cada um."` [HTML]

**CONN-CAT-04 — Botão "Solicitar integração".**
`margin-left:auto`, `height:32px`, padding `0 12px`, `border-radius:7px`,
`border:1px solid var(--bd2)`, `background:var(--sf)`, `font-size:12.5px;
font-weight:600`, ícone 14px. Variant **neutral** (borda, não preenchido) — confere
README: "`Solicitar integração` (neutral, 32px)". [HTML+README]

**CONN-CAT-05 — Toolbar, container.**
`display:flex;align-items:center;gap:8px`, `margin-top:18px`, `padding-bottom:12px`,
`border-bottom:1px solid var(--bd)`. [HTML]

**CONN-CAT-06 — Busca.**
`width:340px;height:32px`, padding `0 10px`, `border-radius:7px`,
`border:1px solid var(--bd2)`, `background:var(--sf)`, `color:var(--tx3)`,
`font-size:12.5px`, ícone de lupa 14px, placeholder `"Nome, fornecedor ou o que
faz…"`. Confere README: "busca de 340px (32px)". [HTML+README]

**CONN-CAT-07 — Dropdown "Categoria".**
`height:32px`, padding `0 10px`, `border-radius:7px`, `border:1px solid var(--bd2)`,
`background:var(--sf)`, `font-size:12.5px;font-weight:600`. Texto `"Categoria"` +
`"· Todas"` em `color:var(--tx3);font-weight:500` + chevron 13px. README documenta
que são **9 categorias**, cada item com contagem — o HTML só renderiza o dropdown
fechado (valor "Todas"), a lista de 9 itens não está no snippet capturado.
[HTML+README — lista de categorias não verificada, só a existência do dropdown]

**CONN-CAT-08 — SegmentedControl Todos/Instalados/Em breve.**
Container: `border:1px solid var(--bd);border-radius:7px;overflow:hidden;font-size:
12px;font-weight:600`. Cada item `height:32px`, padding `0 10px` (nota: **32px**
aqui, diferente dos 28px do SegmentedControl de Funis — telas diferentes, alturas
diferentes). Ativo ("Todos"): `background:var(--sf2);color:var(--tx)`. Contagem
inline depois do label, `color:var(--tx2)` (ativo) ou peso normal (inativo). Valores
do mock: `"Todos 30"`, `"Instalados 1"`, `"Em breve 27"`. [HTML]

**CONN-CAT-09 — Resumo textual.**
`margin-left:auto`, `font-size:12px;color:var(--tx2)`. `"30"` em `<b>`
(`font-weight:700;color:var(--tx)`). Texto exato: `"30 no catálogo · 1 instalado"`.
[HTML]

**CONN-CAT-10 — Toggle grade/lista.**
2 quadrados: `border:1px solid var(--bd);border-radius:7px;overflow:hidden`, cada
`32×32px`. Ativo (grade): `background:var(--sf2);color:var(--tx)`. Inativo (lista):
`color:var(--tx2);border-left:1px solid var(--bd)`. Confere README: "toggle
grade/lista (dois quadrados de 32px)". [HTML+README]

**CONN-CAT-11 — Grade de cards.**
`display:grid;grid-template-columns:repeat(5, minmax(0,1fr));gap:12px;margin-top:14px`.
5 colunas fixas no HTML (a 1440px de frame) — README documenta responsivo "de 2 a 6
colunas" e grade a 1728px "com 6 colunas" (nota `dv-next` do próprio canvas, achado
como intenção declarada, não como frame renderizado — **não há um frame do mock
mostrando literalmente 6 colunas**, é a intenção anotada pro próximo passo do
processo de design). [HTML+README, 6 colunas = intenção documentada, não renderizada]

**CONN-CAT-12 — Combinação de filtros e URL.**
Não verificável por HTML/PNG estático (é comportamento, não visual). Fonte: só
README — "Busca e filtro de categoria combinam (AND), e o estado vive na URL."
[README apenas]

**Contagem CONN-CAT: 12 itens.**

---

## CONN-CARD — Card de conector (`4a`)

Fonte principal: bloco `id="4a"`, que renderiza 5 cards width fixa 200px (grade
`repeat(5,200px)`, diferente do `1fr` responsivo de 5b — aqui é vitrine de estados,
não o catálogo real) cobrindo os estados: instalado, disponível, bloqueado por
plano ("Business"), em breve (2 exemplos). Cruzado com os 30 cards do catálogo
completo em `id="5b"` pra confirmar variação de conteúdo.

**CONN-CARD-01 — Container.**
`border:1px solid var(--bd)`, `border-radius:8px`, `background:var(--sf)`, padding
`14px`, `display:flex;flex-direction:column;gap:10px`. Sem `box-shadow`. Confere
README: "borda 1px, raio 8px, fundo surface, padding 14px, gap 10px. Sem sombra."
[HTML+README]

**CONN-CARD-02 — Tile do logo.**
`40×40px`, `border-radius:9px`. Confere README: "Tile do logo 40px, raio 9px".
[HTML+README]

**CONN-CARD-03 — Fundo do tile (fórmula).**
`background: color-mix(in srgb, var(--brand) var(--tilemix), #fff)` — no bloco `5b`
(catálogo real). **Divergência achada:** no bloco `4a` (vitrine de estados), a MESMA
fórmula usa `#fff` misturado com percentuais **literais diferentes por card**
(`12%` nos "disponível/instalado", `8%` nos "em breve") em vez de `var(--tilemix)` —
ou seja, `4a` não usa a variável de tema, hardcoda o percentual. Isto pode ser só
uma imprecisão de quem montou o frame de demo (`4a` é mais antigo — o `dv-next` de
`5b` aponta "aplica o mesmo tile no modal 3d e na credencial 3e", sugerindo `5b` é
a versão consolidada depois de `4a`). **Fonte de verdade pro valor: README + `5b`**
(`--tilemix: 12%` claro / `0%` escuro, via token dedicado `--connector-tile-mix`
segundo o comentário do próprio `index.css` do projeto). [HTML — divergência entre
2 blocos do próprio mock, ❓ pra Fase B/D]

**CONN-CARD-04 — Fundo do tile no tema escuro: hex vs. render.**
README declara literal: "`--tilemix: 12%` no tema claro e `0%` (branco puro) no
tema escuro" — ou seja, o tile deveria ficar **branco puro** (`color-mix(brand 0%,
#fff)` = 100% `#fff`) no escuro. Mas o PNG `02-4a-card-conector.png` mostra tiles
com fundo visivelmente **colorido** (não branco) no tema escuro — ex. tile do "F"
(Feegow) com tom esverdeado, "H" (HubSpot) com tom alaranjado. **Contradição direta
entre o texto do README e o render do próprio mock**, não reconciliada por leitura.
Hipóteses possíveis (nenhuma confirmada): (a) o HTML usa `#fff` como base do
`color-mix` mas o navegador/gerador do PNG resolveu diferente; (b) o `4a` (com
percentuais hardcoded 12%/8%, ver CONN-CARD-03) não é o frame que gerou o PNG —
pode ter sido regenerado depois de `5b` consolidar `--tilemix`, e o PNG ficou
desatualizado em relação ao texto; (c) o comentário do README descreve a INTENÇÃO
("branco puro" = "janela" neutra pra qualquer logo) mas o valor real do token
`--tilemix` no escuro não é de fato `0%`. **Marcar `❓` — precisa checagem ao vivo
com zoom na região do tile, nos 2 temas, comparando o hex pixel-a-pixel contra
`#fff` puro.** [PNG × README, contradição não resolvida]

**CONN-CARD-05 — Borda do tile.**
`border:1px solid color-mix(in srgb, var(--brand) var(--tilebdmix), #fff)`. Mesma
ressalva de CONN-CARD-03/04 quanto a `--tilebdmix` (22% claro / 0% escuro) vs.
percentuais hardcoded no bloco `4a`. [HTML — mesma divergência]

**CONN-CARD-06 — Inicial no tile (fallback sem logo).**
`color:var(--brand)`, `font-weight:800;font-size:17px`, 1 letra maiúscula (inicial
do nome). Confere README: "Fallback sem SVG: inicial 17px/800 na cor da marca."
[HTML+README]

**CONN-CARD-07 — Opacidade do tile em "Em breve".**
`opacity:.7` no `<span>` do tile (só no tile — o resto do card em breve tem suas
próprias regras de opacidade de texto, ver CONN-CARD-13/14/15). [HTML]

**CONN-CARD-08 — Badge "Instalado".**
`display:inline-flex;align-items:center;gap:4px;height:18px`, padding `0 6px`,
`border-radius:5px`, `background:var(--okbg)`, `color:var(--ok)`, `font-size:10.5px;
font-weight:700`, ícone de check 10px. Confere README: "`Instalado` (sucesso, com
check)". [HTML+README]

**CONN-CARD-09 — Badge "Business" (bloqueado por plano).**
Mesma métrica (18px, `0 6px`, `border-radius:5px`), `background:var(--amberbg)`,
`color:var(--amber)`, ícone de cadeado 10px. Confere README: "`Business` (âmbar, com
cadeado)". [HTML+README]

**CONN-CARD-10 — Badge "Em breve".**
Mesma métrica, `background:var(--sf2)`, `border:1px solid var(--bd)`,
`color:var(--tx2)`, ícone de relógio 10px. Confere README: "`Em breve` (neutro com
borda)". Único badge com `border` (Instalado e Business não têm). [HTML+README]

**CONN-CARD-11 — Ausência de badge (Disponível).**
Estado "Disponível" (ex. card Doctoralia) **não tem badge** — a posição fica vazia
(o `<div>` de header do card, com `justify-content:space-between`, só mostra o
tile, sem elemento à direita). Confere README: "Disponível não tem badge." [HTML+README]

**CONN-CARD-12 — Nome do conector.**
`font-size:13px;font-weight:600`. Cor: `var(--tx)` (padrão) OU `var(--tx2)`
(secundário, só nos cards "Em breve" — ver CONN-CARD-13). [HTML+README]

**CONN-CARD-13 — Nome em "Em breve" (cor rebaixada).**
Mesmo `font-size:13px;font-weight:600`, mas `color:var(--tx2)` em vez de `var(--tx)`
— nome perde ênfase de cor (mantém peso). [HTML]

**CONN-CARD-14 — Linha "Categoria · por Fornecedor".**
`font-size:11px;color:var(--tx3);margin-top:1px`. Formato completo quando tem
fornecedor: `"Clínicas · por Feegow"`; só categoria quando não: `"Agenda"`,
`"Pagamentos"`. Confere README: "linha `Categoria · por Fornecedor` em 11px
terciário". [HTML+README]

**CONN-CARD-15 — Descrição.**
`font-size:12px;color:var(--tx2);line-height:1.45;flex:1` (padrão) ou `color:var(--tx3)`
(em breve — mais uma cor rebaixada nesse estado). `flex:1` empurra o rodapé pra
base do card mesmo com descrições de tamanho variável entre cards vizinhos.
Confere README: "descrição 12px/1.45 secundária com `flex:1`". [HTML+README]

**CONN-CARD-16 — Rodapé, container.**
`display:flex;align-items:center;margin-top:2px`; `justify-content:space-between`
quando há métrica à esquerda, `justify-content:flex-end` quando não (CTA sozinho).
[HTML]

**CONN-CARD-17 — Métrica à esquerda (instalado).**
`"N agentes"`, `font-size:11px;color:var(--tx2)`. Só aparece em conectores
instalados com pelo menos 1 agente usando. [HTML]

**CONN-CARD-18 — Métrica à esquerda (em breve).**
`"N pedidos"`, `font-size:11px;color:var(--tx3)` (terciário — mais apagado que a
métrica de "agentes" acima, que é secundário). Confere README: "métrica = `N
pedidos`" pro estado em breve. [HTML+README]

**CONN-CARD-19 — CTA "Gerenciar".**
`height:28px`, padding `0 10px`, `border-radius:7px`, `border:1px solid var(--bd2)`,
`font-size:12px;font-weight:600`. Variant **neutral**. Estado: instalado.
[HTML+README]

**CONN-CARD-20 — CTA "Conectar".**
Mesma métrica (28px, `0 10px`, `border-radius:7px`), `background:var(--btn)`,
`color:var(--btntx)`, `font-size:12px;font-weight:600`. Variant **primary**. Estado:
disponível. [HTML+README]

**CONN-CARD-21 — CTA "Ver planos".**
Mesma métrica, `border:1px solid var(--bd2)`, sem background. Variant **neutral**.
Estado: bloqueado por plano. [HTML+README]

**CONN-CARD-22 — CTA "Priorizar".**
Mesma métrica, SEM borda nem background, só `color:var(--tx2);font-weight:600`.
Variant **ghost**. Estado: em breve. Confere README: "`Priorizar` (ghost sm)".
[HTML+README]

**CONN-CARD-23 — Regra de 1 CTA único.**
Cada card mostra **exatamente 1** dos 4 CTAs acima, nunca 2 ao mesmo tempo — regra
explícita do README ("um único CTA à direita (nunca dois)"), confirmada em todos
os 30 cards do catálogo (`5b`): nenhum tem mais de 1 botão no rodapé. [HTML+README]

**CONN-CARD-24 — Borda tracejada em "Em breve".**
`border:1px dashed var(--bd2)` no container do card inteiro (não só o tile —
CONN-CARD-01 tem `border:1px solid`, este substitui por tracejado). Confere README:
"borda do card tracejada". [HTML+README]

**CONN-CARD-25 — Card inteiro clicável.**
Não verificável por HTML estático (comportamento). Fonte: só README — "Card inteiro
é clicável e abre o modal de detalhe — inclusive nos 'em breve'." [README apenas]

**Contagem CONN-CARD: 25 itens.**

---

## CONN-DET — Modal de detalhe (`3d`)

Fonte: bloco `id="3d"`, que renderiza 2 exemplos lado a lado (Doctoralia = disponível/
conectável; Google Calendar = em breve/bloqueado) — ambos já no layout **definitivo**
("coluna de identidade"; a nota "A vs. B" ao final do bloco é justificativa de design
de uma variante **descartada** ["A", com faixa colorida no topo], não um segundo
estado válido — o `dv-olabel` do bloco já rotula tudo como "(definitivo)").

**CONN-DET-01 — Container.**
`width:760px;height:460px`, `border:1px solid var(--ovbd)`, `border-radius:10px`,
`background:var(--sf)`, `box-shadow:var(--ovsh)`, `overflow:hidden;display:flex`.
Confere README: "760px × 460px, raio 10px, `--shadow-overlay`." **Sem faixa/hero
colorido** — confirmado, não há nenhum elemento de topo colorido no HTML, o modal
começa direto no `display:flex` de 2 colunas. [HTML+README]

**CONN-DET-02 — Coluna esquerda, container.**
`width:240px` (flex:none), `border-right:1px solid var(--bd)`,
`background:color-mix(in srgb, var(--brand) 7%, var(--sf))`, padding `20px 18px
18px`, `display:flex;flex-direction:column`. Confere README: "Coluna esquerda 240px
com border-right e fundo `color-mix(in srgb, var(--brand) 7%, surface)`."
[HTML+README]

**CONN-DET-03 — Tile do logo (52px).**
`52×52px`, `border-radius:10px`, `background:#fff` (branco fixo, não `color-mix` —
diferente do tile de 40px do card, que mistura a marca; aqui o tile é sempre branco
puro nos 2 temas), `border:1px solid var(--bd)`, `color:var(--brand)`,
`font-weight:800;font-size:22px`, `box-shadow:inset 0 -3px 0 var(--brand)` — traço
de **3px** na cor da marca, por dentro, colado na base do tile. Confere README:
"tile de 52px (raio 10px, branco com `inset 0 -3px 0 var(--brand)`)." [HTML+README]

**CONN-DET-04 — Nome do conector.**
`font-size:17px;font-weight:700;letter-spacing:-.01em;margin-top:12px`. Confere
README: "nome 17px/700". [HTML+README]

**CONN-DET-05 — "por Fornecedor · versão".**
`font-size:12px;color:var(--tx2);margin-top:2px`. Formato completo:
`"por Docplanner · v1.2"`. Quando não há versão, só `"por Google"` (Google Calendar
no mock não mostra versão). [HTML]

**CONN-DET-06 — Chips de categoria + estado.**
`display:flex;gap:4px;margin-top:8px`. Chip de categoria: `height:20px`, padding
`0 7px`, `border-radius:5px`, `border:1px solid var(--bd)`, `background:var(--sf)`,
`color:var(--tx2)`, `font-size:11px;font-weight:600` (ex. "Clínicas", "Agenda").
Chip de estado ao lado: mesma métrica, sem borda própria — cor por estado (ver
CONN-DET-07/08). [HTML+README]

**CONN-DET-07 — Chip "Disponível".**
`background:var(--okbg);color:var(--ok)`, sem ícone (diferente do badge do card,
que tem check — aqui é só texto). [HTML]

**CONN-DET-08 — Chip "Em breve" (na coluna de identidade do modal).**
`background:var(--sf2);border:1px solid var(--bd);color:var(--tx2)`, ícone de
relógio 10px + texto. Mesma família visual do badge "Em breve" do card
(CONN-CARD-10), mas aqui SEM fundo `--okbg`/`--amberbg` — reaproveita `--sf2`+borda.
[HTML]

**CONN-DET-09 — Ficha técnica, container.**
`display:flex;flex-direction:column;font-size:12px;margin-top:18px`. Cada linha:
padding `8px 0` (primeira linha `0 0 8px`, sem padding-top), `border-bottom:1px
solid var(--bd)` (última linha sem borda). Confere README: "ficha técnica em linhas
de 12px com hairline". [HTML+README]

**CONN-DET-10 — Linha da ficha técnica (label + valor).**
Label: `color:var(--tx3)`. Valor: `font-weight:500;margin-top:1px`, cor padrão
(`var(--tx)` implícito, sem override). [HTML]

**CONN-DET-11 — Campos da ficha técnica (Doctoralia, disponível).**
4 linhas: `Autenticação` → `"API key da clínica"`; `Dados acessados` → `"Agenda,
profissionais, pacientes"`; `Sincronização` → `"Webhook + 15 min"`; `Plano` →
`"Todos"`. Confere README: "Autenticação, Dados acessados, Sincronização, Plano".
[HTML+README]

**CONN-DET-12 — Campos da ficha técnica (Google Calendar, em breve).**
Só 3 linhas (schema diferente por conector, igual ao card de credencial):
`Autenticação` → `"OAuth 2.0 (Google)"`; `Plano` → `"Pro ou superior"`; `Fila` →
`"34 clientes pediram"` — campo `Fila` só existe no estado "em breve" (substitui
"Dados acessados"/"Sincronização", que não fazem sentido pra algo ainda não
construído). [HTML]

**CONN-DET-13 — CTA fixo no rodapé da coluna (disponível).**
`margin-top:auto` (empurra pro final da coluna, `flex-direction:column` do
container), `width:100%`, `height:36px`, `border-radius:7px`,
`background:var(--btn)`, `color:var(--btntx)`, `font-size:13px;font-weight:600`,
texto `"Conectar"`. Confere README: "CTA fixo no rodapé da coluna (largura total,
36px)". [HTML+README]

**CONN-DET-14 — CTA fixo no rodapé da coluna (em breve).**
Mesma métrica (36px, largura total), `border:1px solid var(--bd2);background:
var(--sf)` (neutral, não primary), ícone de seta-pra-cima 14px + texto
`"Priorizar"`. [HTML+README]

**CONN-DET-15 — Coluna esquerda, variante "em breve" (border/tinta).**
`border-right:1px dashed var(--bd2)` (tracejado — difere do `solid` do estado
disponível, CONN-DET-02) e `color-mix(in srgb, var(--brand) 5%, var(--sf))` (5% de
tinta, não 7%). Confere README: "coluna com border-right tracejado, tinta a 5%".
[HTML+README]

**CONN-DET-16 — Tile em "em breve".**
Mesmo tile 52px, `opacity:.8` (o tile do card em breve usa `.7`; aqui no modal é
`.8` — valores diferentes entre card e modal para o mesmo conceito de "em breve").
[HTML]

**CONN-DET-17 — Coluna direita, header de abas.**
`display:flex;align-items:center;gap:18px`, padding `16px 20px 0`,
`border-bottom:1px solid var(--bd)`, `font-size:13px;font-weight:500;color:var(--tx2)`.
[HTML+README]

**CONN-DET-18 — Aba ativa.**
`padding:0 0 10px`, `color:var(--tx);font-weight:600`, `box-shadow:inset 0 -2px 0
var(--tx)` — sublinhado de **2px** via `box-shadow` inset (não `border-bottom`).
Aba ativa no mock: sempre "Visão geral" (nenhum exemplo mostra outra aba ativa).
[HTML]

**CONN-DET-19 — Abas.**
3 abas: `"Visão geral"`, `"Como funciona"`, `"Requisitos"`. Confere README: "Tabs
`Visão geral · Como funciona · Requisitos`". [HTML+README]

**CONN-DET-20 — Botão fechar (×).**
`margin-left:auto;margin-bottom:8px`, `28×28px`, `border-radius:7px`,
`color:var(--tx2)`, ícone X 16px. Fica na MESMA linha das abas, alinhado à direita
— não um header separado. Confere README: "com o `×` de fechar na mesma linha, à
direita". [HTML+README]

**CONN-DET-21 — Corpo da aba, container.**
Padding `18px 20px`, `display:flex;flex-direction:column;gap:16px` (disponível) ou
`gap:14px` (em breve — gap ligeiramente menor, 1 a menos por causa do banner extra
no topo), `font-size:13px;line-height:1.55`. Confere README: "corpo com padding
`18px 20px`, texto 13px/1.55". [HTML+README]

**CONN-DET-22 — Banner "em breve" (dentro do corpo, só nesse estado).**
`display:flex;gap:8px;align-items:flex-start`, padding `9px 10px`,
`border-radius:6px`, `background:var(--sf2)`, `border:1px solid var(--bd)`,
`color:var(--tx2)`, `font-size:12px;line-height:1.45`; ícone de relógio 14px.
Texto exato: `"Ainda não construída. Ao priorizar, você recebe um aviso quando
ficar disponível — e o pedido conta na nossa fila."` Este é um banner **neutro**
(`--sf2`+borda, não âmbar) — README confirma: "corpo abre com um Banner neutro
explicando que ainda não foi construída". [HTML+README]

**CONN-DET-23 — Parágrafo de descrição funcional.**
`color:var(--tx)` (cor de texto padrão, sem secundário — é o texto mais
"importante" do corpo). Ex.: "Sincroniza a agenda da Doctoralia com o Oryon. Os
agentes passam a consultar horários livres, agendar e confirmar consultas direto
na conversa, sem o paciente sair do WhatsApp." [HTML]

**CONN-DET-24 — Eyebrow "O que o agente passa a fazer".**
`font-size:10px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;
color:var(--acs);margin-bottom:8px`. Só no estado disponível. [HTML]

**CONN-DET-25 — Eyebrow "Previsto" (em breve).**
Mesma métrica, mas `color:var(--tx3)` em vez de `var(--acs)` — eyebrow perde a cor
de acento no estado em breve (fica neutro/terciário). [HTML]

**CONN-DET-26 — Grid de mini-cards de capacidade.**
`display:grid;grid-template-columns:1fr 1fr;gap:8px`. Confere README: "capacidades
como grid 2×2 de mini-cards de 7px" — 2×2 = 4 itens, confirmado no exemplo
Doctoralia (Consultar horários / Agendar e remarcar / Cancelar / Pedir avaliação);
exemplo Google Calendar mostra só 2 (1×2, não 2×2 — grid é o mesmo `1fr 1fr`, só
tem menos itens pra preencher). [HTML+README]

**CONN-DET-27 — Mini-card de capacidade (disponível).**
`border:1px solid var(--bd);border-radius:7px;padding:10px 12px`. Título
`font-size:12.5px;font-weight:600`. Descrição `font-size:12px;color:var(--tx2);
line-height:1.45;margin-top:2px`. "7px" do README = o `border-radius`. [HTML+README]

**CONN-DET-28 — Mini-card de capacidade (em breve/previsto).**
Mesma métrica, `border:1px dashed var(--bd2)` (tracejado), `color:var(--tx2)` no
container inteiro (aplica a cor no pai, título/descrição herdam — não redefinem
cor própria como no card disponível). Confere README: "mini-cards **tracejados**".
[HTML+README]

**CONN-DET-29 — Rodapé com prova social + link.**
`display:flex;align-items:center;gap:6px;font-size:12px;color:var(--tx2)`, ícone de
pessoas 13px. Texto: `"Usado por 41 clínicas no Oryon · "` + link `"Guia de conexão
↗"` em `color:var(--acs);font-weight:600`. Só no estado disponível — não aparece no
exemplo "em breve" (Google Calendar não tem essa linha, faz sentido: não tem uso
real ainda). Confere README: "rodapé com prova social + `Guia de conexão ↗`".
[HTML+README]

**CONN-DET-30 — Bloqueado por plano (estado sem exemplo renderizado).**
README descreve mas **nenhum dos 2 exemplos do bloco `3d` mostra este estado** (só
disponível e em-breve estão renderizados). Fonte é só texto: "Banner âmbar
(`Disponível no plano Business…`), CTA `Ver planos`; o conteúdo continua legível —
ler é permitido, conectar não." Valor exato do texto do banner (`"Disponível no
plano Business…"`) é reticências no próprio README — **não há string completa
confirmada em nenhuma fonte**. Cor do banner (âmbar) inferida por analogia com
CONN-DET-22 (mesma estrutura, trocando `--sf2`+borda por `--amberbg`/`--amber`,
igual ao card `4a` badge "Business"). **Marcar como estimado — sem exemplo visual
pra conferir pixel a pixel.** [README apenas, valor estimado por analogia]

**Contagem CONN-DET: 30 itens.**

---

## CONN-CRED — Modal de credencial (`3e`)

Fonte: bloco `id="3e"`, 2 exemplos lado a lado — Feegow (credencial já configurada,
teste OK, 4 campos) e Doctoralia (conectando pela 1ª vez, teste com erro, 1 campo +
lista de permissões). README confirma: "o mockup mostra dois schemas diferentes".

**CONN-CRED-01 — Container.**
`width:520px`, `border:1px solid var(--ovbd)`, `border-radius:10px`,
`background:var(--sf)`, `box-shadow:var(--ovsh)`. Confere README: "520px".
[HTML+README]

**CONN-CRED-02 — Header, container.**
`display:flex;align-items:center;gap:12px`, padding `16px 18px 12px`,
`border-bottom:1px solid var(--bd)`. [HTML]

**CONN-CRED-03 — Tile do logo (header).**
`32×32px`, `border-radius:8px`, `background:#fff`, `border:1px solid var(--bd)`,
`color:var(--brand)`, `font-weight:800;font-size:14px`,
`box-shadow:inset 0 -3px 0 var(--brand)` (mesmo traço de 3px do tile de 52px do
modal de detalhe, CONN-DET-03 — proporcionalmente maior aqui por ser um tile menor).
Confere README: "tile de 32px". [HTML+README]

**CONN-CRED-04 — Título do modal.**
`font-size:15px;font-weight:700;letter-spacing:-.01em`. 2 formatos vistos:
`"Credencial · Feegow"` (já instalado, gerenciando) vs. `"Conectar · Doctoralia"`
(conectando pela 1ª vez) — o verbo no título muda conforme o estado (Gerenciar
credencial existente vs. Conectar pela primeira vez). Confere README: "título
15px/700". [HTML+README — variação do verbo não documentada explicitamente no
README, achado só no HTML]

**CONN-CRED-05 — Subtítulo.**
`font-size:12px;color:var(--tx2);margin-top:1px`. Explica o escopo. Exemplos:
`"Válida para todo o workspace. Agentes escolhem usar ou não."` (Feegow);
`"Schema diferente: só uma chave. "` + `"Estado de erro no teste."` em
`color:var(--tx3)` (Doctoralia — segunda frase mais apagada, é meta-anotação do
exemplo, não necessariamente copy real de produto). Confere README: "subtítulo
explicando o escopo (workspace, não agente)". [HTML+README]

**CONN-CRED-06 — Botão fechar (×).**
`margin-left:auto`, `28×28px`, `border-radius:7px`, `color:var(--tx2)`, ícone X
16px. Mesma métrica de CONN-DET-20. [HTML]

**CONN-CRED-07 — Corpo, container.**
Padding `16px 18px`, `display:flex;flex-direction:column;gap:12px`. [HTML]

**CONN-CRED-08 — Label de campo (padrão).**
`font-size:12px;font-weight:600`. Sufixo opcional em `color:var(--tx3);
font-weight:500` (ex. `"· Feegow › Configurações › API"`, `"· opcional"`, `"· painel
Doctoralia Pro › Integrações"` — instrução de onde achar o valor, ou marcação de
campo opcional). [HTML+README]

**CONN-CRED-09 — Campo "Ambiente" (toggle Produção/Sandbox).**
`display:inline-flex;width:max-content`, `border:1px solid var(--bd);border-radius:
7px;overflow:hidden;font-size:12px;font-weight:600`. Item ativo ("Produção"):
`background:var(--sf2);color:var(--tx)`. Inativo ("Sandbox"): `color:var(--tx2);
border-left:1px solid var(--bd)`. Cada item `height:28px`, padding `0 12px`. Só no
schema Feegow (Doctoralia não tem esse campo — confirma "schema dinâmico" do
README). [HTML+README]

**CONN-CRED-10 — Campo de texto simples (URL da API).**
`height:36px`, `border-radius:7px`, `border:1px solid var(--bd2)`,
`background:var(--sf)`, padding `0 10px`, `font-size:13px;font-family:
'JetBrains Mono',monospace` — **mono**, não a fonte padrão (Plus Jakarta Sans),
porque é um valor técnico (URL). Confere README: "régua padrão" + "valores
sensíveis em mono" (aqui não é sensível, mas É técnico — mono usado em ambos os
casos, técnico E sensível). [HTML+README]

**CONN-CRED-11 — Campo mascarado (token/chave, com olho).**
Mesma métrica (36px), `display:flex;align-items:center;justify-content:
space-between`, valor em mono com máscara: `"fg_live_••••••••••••••••••••7k2Q"`
(Feegow, estado OK) ou `"dp_9f31c…e2a"` (Doctoralia, formato de reticências no
meio em vez de bullets — **2 formatos de máscara diferentes entre os 2 exemplos**,
não documentado como intencional). Ícone de olho 14px à direita,
`color:var(--tx3)`. Confere README: "valores sensíveis em mono com máscara
(`fg_live_••••7k2Q`) e olho de 14px". [HTML+README — 2 formatos de máscara
distintos entre os exemplos, ❓]

**CONN-CRED-12 — Hint abaixo do campo mascarado.**
`font-size:11.5px;color:var(--tx3)`. Texto exato: `"Armazenado criptografado.
Nunca mostrado inteiro depois de salvo."` Só no exemplo Feegow (campo já salvo);
Doctoralia (ainda não salvo) não tem esse hint — tem a mensagem de erro no lugar
(ver CONN-CRED-16). [HTML+README]

**CONN-CRED-13 — Grid 2 colunas (campos curtos).**
`display:grid;grid-template-columns:1fr 1fr;gap:12px`. Contém "ID da clínica" (campo
de texto simples, sem mono) + "Unidade padrão · opcional" (select, placeholder
`"Todas"`, chevron 14px). Só no schema Feegow. [HTML]

**CONN-CRED-14 — Linha "Testar conexão" + resultado, container.**
`display:flex;align-items:center;gap:10px;margin-top:2px`. [HTML]

**CONN-CRED-15 — Botão "Testar conexão"/"Testar de novo".**
`height:32px`, padding `0 12px`, `border-radius:7px`, `border:1px solid var(--bd2)`,
`font-size:12.5px;font-weight:600`, ícone de raio 14px. Texto muda: `"Testar
conexão"` (1ª vez) vs. `"Testar de novo"` (depois de uma falha). Variant
**neutral**. Confere README: "`Testar conexão` (neutral, 32px)". [HTML+README]

**CONN-CRED-16 — Resultado do teste: sucesso.**
`display:inline-flex;align-items:center;gap:6px;font-size:12px;color:var(--ok);
font-weight:600`, ícone de check 14px. Texto: `"Conexão OK"` + detalhe em
`color:var(--tx2);font-weight:500`: `"· 3 unidades, 14 profissionais · 240 ms ·
agora"`. Confere README: "sucesso = `✓ Conexão OK · 3 unidades, 14 profissionais ·
240 ms · agora` em cor de sucesso". [HTML+README]

**CONN-CRED-17 — Resultado do teste: erro (linha de status).**
`font-size:12px;color:var(--dg);font-weight:600`. Texto: `"Falhou · 401 · há 5 s"`.
Confere README: "`Falhou · 401 · há 5 s`". [HTML+README]

**CONN-CRED-18 — Erro inline no campo culpado.**
O campo com problema (API key da Doctoralia) ganha `border:1px solid var(--dg)`
(em vez de `var(--bd2)`). Abaixo dele: `display:flex;align-items:center;gap:5px;
font-size:11.5px;color:var(--dg)`, ícone de alerta circular 12px + mensagem com
código: `"Chave recusada pela Doctoralia (401). Confira se a chave é do plano
Pro."` Confere README: "borda de perigo no campo culpado + mensagem inline com o
código". Mesmo padrão visual do erro do Select em `DEAL-MODAL-07` (ícone + texto
`--dg`, 11.5px) — vocabulário de erro inline é compartilhado entre as 2 telas.
[HTML+README]

**CONN-CRED-19 — Lista de permissões (schema Doctoralia).**
`display:flex;flex-direction:column;font-size:12.5px;border:1px solid var(--bd);
border-radius:7px;padding:0 12px`. Cada linha `height:32px`,
`border-bottom:1px solid var(--bd)` (exceto a última). Confere README: "régua
padrão" + estrutura própria não descrita em detalhe no README — achado só no HTML.
Label acima: `"Permissões que o Oryon vai pedir"`. [HTML — não no README]

**CONN-CRED-20 — Item de permissão concedida.**
Ícone de check 13px, `stroke="var(--ok)"` (cor no `stroke` do SVG, não em `color`
do texto — único elemento da tela com cor aplicada assim). Texto padrão (`var(--tx)`
implícito). Exemplos: `"Ler agenda e profissionais"`, `"Criar, remarcar e cancelar
consultas"`. [HTML]

**CONN-CRED-21 — Item de permissão opcional (não marcada).**
Círculo vazio (`13×13px;border-radius:50%;border:1px solid var(--bd2)`) no lugar
do check. Texto em `color:var(--tx2)` (mais apagado que os concedidos). Tag
`"opcional"` à direita: `margin-left:auto;font-size:11px;color:var(--tx3)`.
Exemplo: `"Enviar pedidos de avaliação"`. [HTML]

**CONN-CRED-22 — Footer, container.**
`display:flex;align-items:center;gap:8px`, padding `12px 18px 16px`,
`border-top:1px solid var(--bd)`. [HTML]

**CONN-CRED-23 — Link "Remover credencial".**
`font-size:12px;font-weight:600;color:var(--dg)`. Só aparece no estado "credencial
já existe" (Feegow) — não aparece em "conectando pela 1ª vez" (Doctoralia, nada
pra remover ainda). Alinhado à esquerda do footer. Confere README: "`Remover
credencial` (ghost em perigo) à esquerda". [HTML+README]

**CONN-CRED-24 — Texto substituto do link Remover (schema novo).**
No exemplo Doctoralia (sem credencial salva ainda), no lugar do link "Remover" à
esquerda do footer, aparece: `font-size:12px;color:var(--tx3)`, texto `"Salvar
libera após um teste OK"` — explica por que o botão Salvar está desabilitado.
Confere README: "com a razão em 12px terciário". [HTML+README]

**CONN-CRED-25 — Botão "Cancelar" (footer).**
`margin-left:auto` (Feegow) ou posição fixa (Doctoralia, já que o item à esquerda
mudou), `height:36px`, padding `0 14px`, `border-radius:7px`, `border:1px solid
var(--bd2)`, `font-size:13px;font-weight:600`. [HTML]

**CONN-CRED-26 — Botão "Salvar credencial" (habilitado).**
`height:36px`, padding `0 14px`, `border-radius:7px`, `background:var(--btn)`,
`color:var(--btntx)`, `font-size:13px;font-weight:600`, `opacity` normal (1).
Estado: teste OK (Feegow). [HTML]

**CONN-CRED-27 — Botão "Salvar e conectar" (desabilitado).**
Mesma métrica visual do botão habilitado, MAIS `opacity:.45`. Texto muda para
`"Salvar e conectar"` (schema de 1ª conexão, não "Salvar credencial" — verbo
"conectar" reforça que ainda não há vínculo ativo). Confere README: "Salvar fica
desabilitado (opacidade .45) até um teste OK". [HTML+README]

**Contagem CONN-CRED: 27 itens.**

---

## Resumo de cobertura

| Região | Itens |
|---|---|
| CONN-CAT | 12 |
| CONN-CARD | 25 |
| CONN-DET | 30 |
| CONN-CRED | 27 |
| **Total** | **94** |

Itens marcados `❓`/estimados (não reconciliados por leitura, decidir só na Fase D
ao vivo ou por análise adicional):
- CONN-CARD-03/04/05 — fundo/borda do tile: `4a` (percentuais hardcoded) diverge de
  `5b`+README (`var(--tilemix)`/`var(--tilebdmix)`); e o PNG escuro de `4a` mostra
  tiles coloridos onde o README promete "branco puro" a 0% — contradição direta
  entre fonte 1 (README) e fonte 2 (PNG) não resolvida.
- CONN-CRED-11 — 2 formatos de máscara de valor sensível entre os 2 exemplos
  (`••••` vs `…`), sem indicação de qual é o padrão.
- CONN-DET-30 — estado "bloqueado por plano" do modal de detalhe não tem nenhum
  exemplo renderizado em HTML/PNG; valor inteiramente estimado por analogia com o
  badge do card e o texto truncado do README.
- CONN-CAT-11 — grade a 6 colunas (1728px) é intenção anotada (`dv-next`), não um
  frame renderizado — só a grade de 5 colunas a 1440px existe de fato no mock.

Nenhum item exige dado/funcionalidade que não exista — Conectores é tela nova sem
backend ainda descrito neste material (fora do escopo desta extração confirmar se a
API de conectores já existe; isso é pergunta de Fase B, não de Fase A).
