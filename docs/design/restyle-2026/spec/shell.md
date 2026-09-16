# Spec — Shell (NavSidebar + TopBar + UserMenu + Créditos de IA)

Fase A (extração pura) da Auditoria Noturna SCRUM-1097. Zero código, zero opinião sobre o
que já existe no app — só o que os mockups/HTML/README dizem. Telas cobertas: **7a**
(`01-7a-shell-topbar-sidebar.png` / `02-7a-shell-topbar-sidebar.png`) e **6b**
(`01-6b-consumo-sidebar.png` / `02-6b-consumo-sidebar.png`). Toda ocorrência do widget de
créditos dentro de OUTRAS telas (1b Dashboard, 2e Configurações, 6a Billing etc.) foi conferida
contra este mesmo componente — não há uma 4ª variante.

Fontes, em ordem de autoridade:
1. `Oryon-Reestilizacao-canvas.html` — grep pelos ids `id="7a"` (linha 11) e `id="6b"` (linha 485)
   no arquivo original de 384 linhas (uma delas com ~450k caracteres; reflow em `><`→`>\n<`
   necessário pra grep funcionar). Valores exatos citados abaixo vêm daqui.
2. `telas/01-7a-*.png` + `02-7a-*.png`, `telas/01-6b-*.png` + `02-6b-*.png`.
3. `README.md` §1.5 (Shell, mudança estrutural), §3.12 (Consumo `6b`), §3.13 (Shell final `7a`).

## Tabela de cores — fonte única (canvas, `Component.renderVals()`)

O HTML define os 2 temas via `const light = {...}` / `const dark = {...}` (mesma linha do
`themes: [mk(light,"Claro"), mk(dark,"Escuro")]`). Toda cor `var(--xx)` citada abaixo resolve
por esta tabela — não é o `index.css` do app (que é outra fonte, mantida por tokens próprios).

| var | Claro | Escuro | Uso nas telas 7a/6b |
|---|---|---|---|
| `--bg` | `#FAFAFC` | `#060909` | fundo da página (canvas) |
| `--sf` | `#FFFFFF` | `#161E1E` | superfície (TopBar, popover créditos) |
| `--sf2` | `#F5F6F8` | `#0E1414` | busca (pílula), "Auto" ativo no seletor de Tema |
| `--bd` | `#E4E6EC` | `#243333` | borda 1px padrão |
| `--bd2` | `#C8CDD8` | `#2E4040` | borda de pílula (Hoje/Buscar), trilha do anel (não — trilha é fixa `#243333`, ver SHELL-CREDITS-02) |
| `--tx` | `#1A1F2E` | `#ECF1F1` | texto primário |
| `--tx2` | `#5C657A` | `#8FA5A5` | texto secundário |
| `--tx3` | `#9098AA` | `#6B8080` | texto terciário |
| `--ac` | `#14B8A6` | `#2DD4BF` | acento (ring do avatar, dot do bell) |
| `--acs` | `#0F766E` | `#2DD4BF` | acento "sólido"/link (texto) |
| `--btn` / `--btntx` | `#0F766E` / `#FFFFFF` | `#2DD4BF` / `#04201D` | botão primário sólido |
| `--ov` / `--ovbd` | `#FFFFFF` / `#D5DAE3` | `#1E2A2A` / `#324646` | overlay (menu do usuário, popover créditos) |
| `--ovsh` | `0 0 0 1px rgba(15,23,42,.03),0 4px 12px rgba(15,23,42,.10),0 16px 40px rgba(15,23,42,.16)` | `inset 0 1px 0 rgba(255,255,255,.05),0 4px 12px rgba(0,0,0,.45),0 12px 32px rgba(0,0,0,.55)` | sombra do overlay |
| `--rowhover` | `#F5F6F8` | `#1B2525` | item de menu em hover/ativo |
| `--avs` / `--avi` | `#374151` / `#FFFFFF` | `#B5C8C8` / `#060909` | avatar sem foto (disco/inicial) |
| `--sb` / `--sbtx` | `#0E1414` / `#8FA5A5` | `#0E1414` / `#8FA5A5` | **sidebar — idêntico nos 2 temas** (sempre escura) |
| `--dg` (perigo) | `#B91C1C` | `#EF4444` | "Sair" no menu do usuário |
| `--ok` | `#15803D` | `#22C55E` | — (não usado direto em 7a/6b; presença online usa hex literal, ver nota SHELL-SIDEBAR-09) |

Ícones/gradiente do logo `O`: `linear-gradient(135deg,#5EEAD4,#14B8A6,#0F766E)` fundo, texto
`#04201D` — **hardcoded, idêntico nos 2 temas** (não é `var()`).

---

## SHELL-SIDEBAR — NavSidebar (colapsada e expandida)

### SHELL-SIDEBAR-01 — Container colapsado
- **Container**: `width:62px`, altura visível no mock = 284px (7a, é um recorte comparativo;
  na tela real é `height:100%`/full viewport — a spec de altura fixa é só do artboard de
  comparação). `background: var(--sb)` (#0E1414 fixo). `border-radius:8px` **só no mockup
  comparativo** (a sidebar real, colada no shell, não tem raio próprio — ver README §1.5
  "sem `rounded-2xl` em volta do conteúdo"; `[!]` confirmar ao vivo se a versão standalone
  tem raio 0). `display:flex; flex-direction:column; align-items:center; padding:10px 0 12px`.
- **Fonte**: canvas `id="7a"`, bloco "Sidebar final · colapsada e expandida".
- **Claro×Escuro**: nenhuma — sidebar sempre `#0E1414`/`#8FA5A5` nos 2 temas.

### SHELL-SIDEBAR-02 — Logo (colapsada)
- **Container**: quadrado 26px, `border-radius:6px`, `background: linear-gradient(135deg,#5EEAD4,#14B8A6,#0F766E)`.
- **Tipografia**: letra "O", `font-weight:800`, `font-size:14px`, `color:#04201D`.
- **Espaçamento**: `margin-bottom:12px` até o primeiro ícone de navegação.
- **Claro×Escuro**: nenhuma (hardcoded).

### SHELL-SIDEBAR-03 — Itens de navegação (colapsada, ícone só)
- **Container**: cada item `width:36px; height:32px; border-radius:6px`, `display:inline-flex`
  centralizado. **Ativo**: `background: rgba(255,255,255,.88)`, ícone `color:#0A0F0F`. Inativo:
  sem fundo, ícone herda `--sbtx` (implícito, `currentColor`/`stroke` sem cor definida no item
  em si — herda do container `color: var(--sbtx)` do pai).
  Vertical `gap:4px` entre ícones, `flex-direction:column; align-items:center`.
- **Tipografia**: ícone 18px, `stroke-width:1.9` (ativo usa `stroke-width:2` — ver nota: o item
  ativo do exemplo, "Conversas", tem `stroke-width:2` enquanto os inativos têm `1.9`; `[!]`
  confirmar se é regra (ativo = traço mais grosso) ou detalhe do SVG específico daquele ícone).
- **Ordem observada** (4 ícones): Dashboard (grid 2×2), Conversas (balão — ativo no exemplo),
  Contatos (dois usuários), Funis (3 barras verticais de altura crescente).
- **Fonte**: canvas `id="7a"`.

### SHELL-SIDEBAR-04 — Rodapé colapsado (divisor + créditos)
- **Container**: `margin-top:auto` empurra pro fim; hairline `width:20px; height:1px;
  background:#243333` (hex fixo, não `var(--bd)`) antes do bloco de créditos.
- **Créditos colapsado**: ver **SHELL-CREDITS-01**.
- **Fonte**: canvas `id="7a"`.

### SHELL-SIDEBAR-05 — Container expandido
- **Container**: `width:228px`, `background: var(--sb)`, `display:flex; flex-direction:column;
  padding:10px 10px 12px`. No mockup comparativo tem `border-radius:8px` (mesma ressalva de
  SHELL-SIDEBAR-01 sobre raio isolado vs. colado no shell).
- **Fonte**: canvas `id="7a"` e `id="1b"` (idêntico nas duas fontes).

### SHELL-SIDEBAR-06 — Header (logo + nome + workspace)
- **Container**: `height:36px; padding:0 6px; margin-bottom:8px` (7a) ou `10px` (1b — `[!]`
  discrepância de 2px entre as duas fontes, provavelmente arredondamento; não normativo).
  `display:flex; align-items:center; gap:9px`.
- **Logo expandido**: `24px×24px`, `border-radius:6px`, mesmo gradiente, `font-size:13px` pro "O".
- **Tipografia**: "Oryon" `font-size:14px; font-weight:700; color:#ECF1F1` (hardcode, não
  `var(--tx)` — sidebar sempre escura então a cor é fixa mesmo com o resto do app trocando de
  tema). `letter-spacing:-.01em` (só na versão do 1b; ausente na versão 7a — `[!]` diferença
  mínima, mesma ressalva de arredondamento).
- **Nome do workspace**: `margin-left:auto`, "Acme", `font-size:10.5px; font-weight:600;
  color:#6B8080`.

### SHELL-SIDEBAR-07 — Itens de navegação (expandida)
- **Container**: `height:32px; padding:0 10px; border-radius:6px; gap:10px`, `display:flex;
  align-items:center`. Lista vertical `gap:2px`.
- **Tipografia**: ícone 17px `stroke-width:1.9`; label `font-size:13px; font-weight:500`
  (inativo) / `600` (ativo).
- **Estado ativo**: `background:rgba(255,255,255,.88); color:#0A0F0F` — aplicado à linha
  inteira (fundo + texto + ícone), não só ao ícone.
- **Badge de contagem** (ex.: "Conversas 12"): `margin-left:auto; min-width:18px; height:18px;
  padding:0 5px; border-radius:9px; font-size:10.5px; font-weight:700`.
  **`[!]` INCONSISTÊNCIA ENTRE FONTES** — cor do badge difere entre os dois mockups do mesmo
  elemento: em `id="7a"` é `background:#0F766E; color:#fff`; em `id="1b"` (Dashboard, mesmo
  item "Conversas 12") é `background:#2DD4BF; color:#04201D`. São hex literais nos dois casos
  (não `var()`), e nenhum dos dois bate exatamente com um par claro/escuro só — `#2DD4BF`/`#04201D`
  é o par `--ac`/`--btntx` do tema ESCURO; `#0F766E` é o `--acs` do tema CLARO com `--btntx`
  branco (que é o par do tema claro, não do escuro). Fase B decide qual prevalece — sugestão:
  como a sidebar é sempre escura, o par escuro (`#2DD4BF`/`#04201D`, versão do 1b) é o mais
  consistente com "hardcode porque a sidebar não muda de tema", mas isso é interpretação, não
  extração.
- **Itens observados (1b Dashboard, lista completa)**: Dashboard · Conversas (badge 12) ·
  Contatos · Funis · **eyebrow "AUTOMAÇÃO"** · Agentes IA · Disparos · Agendamentos.
  **Itens observados (7a, lista parcial/preview)**: Dashboard · Conversas (badge 12) ·
  Contatos · Funis — sem os itens de Automação (`[!]` 7a é um recorte reduzido só pra mostrar
  o padrão de item, não a lista completa; não tratar como "Automação sumiu no shell final").
- **Fonte**: canvas `id="7a"` + `id="1b"`.

### SHELL-SIDEBAR-08 — Eyebrow de grupo ("AUTOMAÇÃO")
- **Tipografia**: `font-size:10px; font-weight:700; letter-spacing:.14em; text-transform:
  uppercase; color:#6B8080`.
- **Espaçamento**: `padding:14px 10px 6px`.
- **Fonte**: canvas `id="1b"`. Confirma README §1.5 ("Eyebrow de grupo na sidebar: 10px/700,
  `.14em`, `#6B8080`, padding `14px 10px 6px`") — bate exato, 0 divergência.

### SHELL-SIDEBAR-09 — Rodapé expandido (créditos)
- Ver **SHELL-CREDITS-02**. `margin-top:auto; border-top:1px solid #243333; padding-top:8px`
  (hex fixo de novo, não `var(--bd)`).
- **Nota lateral**: no card "Equipe" do Dashboard (fora do escopo desta spec, ver
  `spec/1b-dashboard.md` DASH-TEAM), os dots de presença dos membros usam hex literal
  `#22C55E` (online) / `#F97316` (ausente) — **nenhum dos dois é `var(--ok)`/`var(--amber)`
  do tema**, inclusive no tema claro onde `--ok` seria `#15803D`. Mesmo padrão de "hardcode
  proposital porque presença é absoluta, não temática" que os badges de contagem — mas aqui
  é ainda mais explícito porque nem tenta usar o par do tema claro. `[!]` confirmar em Fase B
  se presença/status (online, badge de contagem, chip "ao vivo") é uma categoria deliberada
  de cor NÃO-tokenizada em todo o design system, ou descuido pontual do mockup.

---

## SHELL-TOPBAR — barra superior (48px)

### SHELL-TOPBAR-01 — Container
- **Container**: `height:48px`, `border:1px solid var(--bd); border-radius:8px` (mockup
  comparativo — real é colada, sem raio próprio, ver ressalva SHELL-SIDEBAR-01),
  `background:var(--sf)`, `display:flex; align-items:center; gap:12px; padding:0 16px`.
- **Fonte**: canvas `id="7a"` (bloco "TopBar 48px · menu do avatar aberto") e `id="1b"`
  (topo do Dashboard) — estrutura idêntica nas duas fontes.

### SHELL-TOPBAR-02 — Bloco de título (esquerda)
- **Tipografia**: título `font-size:14px; font-weight:700; letter-spacing:-.01em`; ao lado,
  metadado `font-size:12px; color:var(--tx2)`. `display:flex; align-items:baseline; gap:8px`.
- **Conteúdo observado**: 7a mostra "Conversas" + "38 abertas · 12 aguardando" (contexto da
  tela de Conversas, usado aqui só como exemplo genérico do padrão). 1b mostra "Dashboard" +
  "Terça, 15 set · atualizado há 20 s" (conteúdo específico do Dashboard — ver
  `spec/1b-dashboard.md` DASH-HEADER). **Confirma que o conteúdo do título/subtítulo é
  por-tela, não fixo do Shell** — só a caixa/tipografia é do Shell.
- **Readiness indicator** (1b only, README §1.5 cita como parte do Shell): logo após o
  subtítulo, ainda dentro do bloco esquerdo (não no cluster `margin-left:auto` da direita) —
  dot 6px `background:#22C55E` (hex literal) + texto `"WhatsApp conectado"` `font-size:11.5px;
  font-weight:600; color:var(--ok)`. `[!]` README descreve a ordem da DIREITA como "readiness
  → ações → busca → notificações → avatar", mas no mock o readiness aparece à ESQUERDA (colado
  no título), não dentro do cluster direito — a leitura mais provável é que "à direita" no
  README se refere a "à direita do título", não "dentro do grupo `margin-left:auto`"; ainda
  assim, sinalizando pra Fase B confirmar contra o código, já que é uma tela (1b) que não é
  minha responsabilidade de implementação.

### SHELL-TOPBAR-03 — Slot de ações da página
- **Exemplo observado (1b)**: pílula "Hoje ⌄" — `height:28px; padding:0 10px; border-radius:7px;
  border:1px solid var(--bd2); background:var(--sf); font-size:12px; font-weight:600`, chevron-
  down 13px. Em 7a esse slot não aparece (a tela de exemplo do 7a — Conversas — não tem ação
  de página nesse recorte, ou o recorte foi feito sem ela).
- **Posição**: dentro do cluster `margin-left:auto`, primeiro item antes da busca.

### SHELL-TOPBAR-04 — Busca
- **Container**: pílula, `height:28px; padding:0 10px; border-radius:7px; border:1px solid
  var(--bd); background:var(--sf2); color:var(--tx3); font-size:12px`, ícone de lupa 14px,
  atalho `/` em `font-family:'JetBrains Mono',monospace; font-size:10.5px; border:1px solid
  var(--bd2); border-radius:4px; padding:0 4px` alinhado à direita dentro da pílula
  (`margin-left:auto` interno).
- **Largura**: `[!]` **INCONSISTÊNCIA ENTRE FONTES** — `width:200px` em `id="7a"`,
  `width:220px` em `id="1b"`. Mesma pílula, mesmo conteúdo ("Buscar" + `/`), 20px de diferença.
  Fase B decide qual é a intenção final (nenhuma das duas fontes marca a outra como errada).
- **Fonte**: canvas `id="7a"` + `id="1b"`.

### SHELL-TOPBAR-05 — Notificações (sino)
- **Container**: `width:28px; height:28px; border-radius:7px`, ícone 16px, `position:relative`.
- **Estados observados — dois variantes, não confirmado qual é o padrão**:
  - **Variante "contagem"** (`id="7a"`): badge `position:absolute; top:2px; right:0;
    min-width:14px; height:14px; padding:0 3px; border-radius:7px; background:var(--ac);
    color:var(--btntx); font-size:9px; font-weight:700`, conteúdo `"9+"`.
  - **Variante "dot"** (`id="1b"`, Dashboard): só um ponto — `position:absolute; top:5px;
    right:5px; width:6px; height:6px; border-radius:50%; background:var(--ac)`, sem número.
  - `[!]` Fase B decide se são dois ESTADOS do mesmo componente (dot = tem não-lidas mas sem
    contagem alta / contagem = 9 ou mais) ou se uma das duas é a versão desatualizada.
- **Painel de notificações**: README §3.13 diz que é painel próprio de `26rem` com atalhos
  `J/K/Enter/E/U/A`, fora do menu do usuário — **não há mockup dedicado do painel aberto**
  nas telas 6b/7a (só é mencionado no texto “Regras” do 7a e no README). `[!]` painel em si
  fica sem spec visual — se existir um mockup em outra tela/rodada, não foi encontrado nesta
  extração.

### SHELL-TOPBAR-06 — Avatar (fechado)
- **Container**: `width:28px; height:28px; border-radius:30%` (não é círculo — é o "quadrado
  arredondado" de operador), `background:var(--avs); color:var(--avi); font-size:10.5px;
  font-weight:700`, iniciais (ex. "RC", "JL").
- **Sem anel** quando o menu está fechado (visto em `id="1b"`, avatar "RC" sem `box-shadow`).
- **Fonte**: canvas `id="1b"`.

### SHELL-TOPBAR-07 — Avatar (aberto, com anel)
- **Diferença única**: `box-shadow: 0 0 0 2px var(--sf), 0 0 0 4px var(--ac)` — anel de 2
  camadas (contorno da cor da superfície, depois o acento). É o **único estado em que o
  avatar recebe cor** (README §3.13, confirmado literal no HTML).
- **Fonte**: canvas `id="7a"`.

---

## SHELL-USERMENU — menu do avatar (dropdown, 240px)

### SHELL-USERMENU-01 — Container
- **Container**: `position:absolute; right:0; top:54px` (relativo à TopBar), `width:240px;
  border:1px solid var(--ovbd); border-radius:8px; background:var(--ov); box-shadow:var(--ovsh);
  padding:4px; font-size:12.5px`.
- **Fonte**: canvas `id="7a"`.

### SHELL-USERMENU-02 — Header (identidade)
- **Container**: `display:flex; align-items:center; gap:10px; padding:8px 8px 10px;
  border-bottom:1px solid var(--bd); margin-bottom:4px`.
- **Avatar**: `32px×32px; border-radius:30%`, iniciais "JL".
- **Tipografia**: nome `font-size:13px; font-weight:600` ("João Lima"); linha de baixo
  `font-size:11px; color:var(--tx3); white-space:nowrap; overflow:hidden; text-overflow:
  ellipsis` — formato `"e-mail · papel"` (ex. `"joao@acme.com.br · Gestor"`).

### SHELL-USERMENU-03 — Item "Meu perfil"
- **Container**: `height:30px; display:flex; align-items:center; gap:9px; padding:0 8px;
  border-radius:5px`. Ícone 14px `color:var(--tx3)` (user icon).
- **Estado**: sem hover ativo no mock (é o item "de repouso" mostrado).

### SHELL-USERMENU-04 — Item "Configurações" (hover/destacado no mock)
- **Container**: mesmo formato de -03, mas com `background:var(--rowhover)` — é o item
  mostrado em estado hover/foco no mockup.
- **Direita**: atalho `⌘,` em `font-size:11px; color:var(--tx3); font-family:'JetBrains Mono',
  monospace`.
- **Layout**: `justify-content:space-between` (ícone+label à esquerda, atalho à direita) —
  difere de "Meu perfil" que não tem elemento à direita.
- **Nota de contrato**: README §3.13 — continua sendo rota `/settings`, "o menu é só mais uma
  porta". Confirmado no texto "Regras" do próprio canvas (ver SHELL-USERMENU-08).

### SHELL-USERMENU-05 — Item "Tema" (SegmentedControl inline)
- **Container**: mesmo formato height 30px, `justify-content:space-between`.
- **Controle**: `display:inline-flex; border:1px solid var(--bd); border-radius:5px;
  overflow:hidden; font-size:10.5px; font-weight:600`. 3 segmentos: "Auto" (ativo —
  `background:var(--sf2); color:var(--tx)`), "Claro", "Escuro" (inativos — `color:var(--tx2);
  border-left:1px solid var(--bd)`). Cada segmento `padding:0 6px; height:20px`.
- **Estado especial**: README §3.13 + texto "Regras" do canvas — **é o único item do menu que
  NÃO fecha o menu ao clicar** (controle inline, os outros fecham).
- **Fonte**: canvas `id="7a"`.

### SHELL-USERMENU-06 — Separador
- `height:1px; background:var(--bd); margin:4px 0`. Aparece 2×: antes do item de workspace e
  antes de "Sair".

### SHELL-USERMENU-07 — Item de workspace ("Trocar ›")
- **Container**: height 30px, `justify-content:space-between`.
- **Esquerda**: quadradinho `14px×14px; border-radius:4px; background:linear-gradient(135deg,
  #5EEAD4,#14B8A6,#0F766E)` (mesmo gradiente do logo `O`, mas sem a letra) + nome do workspace
  ("Acme Clínicas").
- **Direita**: `"Trocar ›"` `font-size:11px; color:var(--tx3)`.
- **Nota**: README lista "menu de trocar workspace aberto" como item da lista `dv-next`
  ("Próximos") do canvas — ou seja, **o submenu/estado aberto de troca de workspace ainda não
  tem mockup**; só a linha fechada existe. `[!]`.

### SHELL-USERMENU-08 — Item "Sair"
- **Container**: height 30px, `display:flex; align-items:center; gap:9px; padding:0 8px;
  border-radius:5px`, `color:var(--dg)` (aplicado à linha inteira — ícone + texto).
- **Ícone**: log-out, 14px, herda `color:var(--dg)` (sem override próprio de cor, diferente
  dos outros itens que forçam `color:var(--tx3)` no ícone).

### SHELL-USERMENU-09 — Texto "Regras" (anotação do canvas, transcrição integral)
Bloco de anotação ao lado do mockup 7a, `max-width:280px; font-size:12px; color:var(--tx2);
line-height:1.55`, eyebrow "REGRAS" (`10px/700`, `.14em`, cor `var(--acs)`). Conteúdo exato:

> Avatar com anel teal = menu aberto (o único estado em que o avatar recebe cor). Menu fecha
> ao clicar num item; Tema é o único controle inline, não fecha.
>
> Sino mantém painel próprio (26rem, atalhos J/K/E) — ação frequente e operacional não vive
> dentro de menu de navegação.
>
> Configurações continua rota (`/settings`) com atalho ⌘, — o menu é só mais uma porta, a URL
> não muda de contrato.
>
> Sidebar: navegação em cima, créditos embaixo, nada mais. Vale para todas as telas das
> rodadas anteriores.

Nota: o atalho do sino é citado como "J/K/E" nesta anotação, mas o README §3.13 lista
"J/K/Enter/E/U/A" (mais completo). `[!]` — a anotação do canvas é mais curta/antiga que o
README; tratar README como a versão mais atual (é o documento consolidado, o canvas é o
rascunho de trabalho da rodada 7).

---

## SHELL-CREDITS — bloco "Créditos de IA" no rodapé da sidebar

### SHELL-CREDITS-01 — Colapsada (só o anel)
- **Container**: `width:36px; height:36px; border-radius:6px; background:rgba(255,255,255,.06)`,
  `display:inline-flex` centralizado.
- **Anel SVG**: `24px×24px`, dois círculos concêntricos `r=9`: trilha `stroke:#243333;
  stroke-width:2.5` (hex fixo, igual nos 2 temas — sidebar sempre escura) + progresso
  `stroke:#2DD4BF; stroke-width:2.5; stroke-linecap:round; stroke-dasharray:56.5;
  stroke-dashoffset:52.9; transform:rotate(-90 12 12)`.
  Com `dasharray=56.5` (perímetro do círculo r=9) e `dashoffset=52.9`, a fração preenchida é
  `(56.5-52.9)/56.5 ≈ 6,4%` — bate com o dado de exemplo "64/1.000 = 6,4%" usado em todo o
  resto da spec (Dashboard, popover). Fórmula confirmada pelo README §3.12:
  `stroke-dashoffset = 56.5*(1-uso)`.
- **Cor do progresso no exemplo**: `#2DD4BF` — cor de "faixa 1" (< 70%, ver SHELL-CREDITS-04).
  Hex fixo (não seleciona automaticamente por tema; é a MESMA cor de acento do tema escuro
  mesmo — consistente com sidebar sempre escura).

### SHELL-CREDITS-02 — Expandida/pinada (anel + 2 linhas)
- **Container**: `height:40px` (dentro do rodapé do 1b/7a) ou `36px` (dentro do 6b, variante
  "3 faixas" — `[!]` diferença de 4px entre as duas fontes, mesma ressalva de arredondamento
  já anotada em SHELL-SIDEBAR-06), `padding:0 8px; border-radius:6px;
  background:rgba(255,255,255,.06); display:flex; align-items:center; gap:10px`.
- **Anel**: `22px×22px` (README confirma "anel de 22px" pra essa variante — o SVG do colapsado
  é 24px; **os dois tamanhos coexistem**, 24px colapsado vs 22px expandido, não é erro).
- **Tipografia**: linha 1 "Créditos de IA" `font-size:12px; font-weight:600; color:#ECF1F1`
  (hex fixo); linha 2 `font-size:10.5px; color:#6B8080` (hex fixo) — formato
  `"64 / 1.000 · renova em 15 d"`. `line-height:1.2` no bloco de texto, `flex:1`.
- **Fonte**: canvas `id="7a"`, `id="1b"`, `id="6b"` — idêntico nas 3.

### SHELL-CREDITS-03 — Popover no hover (300px)
- **Container**: `width:300px; border:1px solid var(--ovbd); border-radius:8px;
  background:var(--ov); box-shadow:var(--ovsh); padding:14px; display:flex;
  flex-direction:column; gap:10px; font-size:12.5px`. Posição: ancorado à direita da sidebar
  colapsada, `margin:0 0 6px 10px` (10px de respiro horizontal do rail).
- **Header do popover**: anel maior `36px×36px` (trilha `var(--bd)`, progresso `var(--ac)` —
  aqui SIM usa `var()`, tokenizado por tema, diferente do anel da sidebar que é hex fixo),
  título `"Créditos de IA · Start"` `font-size:13px; font-weight:700`, subtítulo `"Renova em
  15 dias · 01 out"` `color:var(--tx2)`; à direita, percentual `"6%"` `font-size:16px;
  font-weight:800; letter-spacing:-.02em` + rótulo `"usado"` `font-size:11px; color:var(--tx3)`.
- **Grid de detalhe**: `display:grid; grid-template-columns:1fr auto; gap:4px 12px;
  padding-top:8px; border-top:1px solid var(--bd)`. 3 linhas: `Usados` → `63,67`;
  `Disponíveis` → `936,33`; `Ritmo` → `≈ 4,2/dia` + qualificador `"· sobra"` em `color:var(--ok)`
  (este SIM usa `var(--ok)`, tokenizado).
- **Rodapé**: `display:flex; gap:6px; padding-top:8px; border-top:1px solid var(--bd)`.
  `"Ver faturamento"` — pílula `height:26px; padding:0 9px; border-radius:6px; border:1px
  solid var(--bd2); font-size:11.5px; font-weight:600` (estilo "neutral"). `"Comprar créditos"`
  — mesma altura/tamanho mas sem borda, `color:var(--acs)` (estilo "ghost em acento").
- **Fonte**: canvas `id="6b"`. Confirma README §3.12 quase palavra-por-palavra.

### SHELL-CREDITS-04 — As 3 faixas de cor (colapsada/expandida)
Reaproveita a semântica de risco do `ProgressBar` (citado no README, mas o componente em si
é primitivo — fora do escopo de extração desta spec).

| Faixa | Cor do anel | Texto da 2ª linha | Cor do texto | Ação extra |
|---|---|---|---|---|
| `< 70%` | `#2DD4BF` (hex fixo) | `"64 / 1.000 · renova em 15 d"` | `#6B8080` | nenhuma |
| `≥ 70%` | `#FBBF24` (hex fixo) | `"780 / 1.000 · acaba antes do ciclo"` | `#FBBF24` (mesma cor do anel) | nenhuma |
| `≥ 90%` | `#EF4444` (hex fixo) | `"950 / 1.000 · agentes pausam em 50"` | `#EF4444` (mesma cor do anel) | chip `"Comprar"` inline, `font-size:10.5px; font-weight:700; color:#2DD4BF` (à direita da linha, dentro do mesmo item) |
- **Nota**: as 3 cores (`#2DD4BF`/`#FBBF24`/`#EF4444`) são EXATAMENTE `--ac`/`--amber`/`--dg`
  do tema ESCURO. Mais um caso de "hardcode = valores do tema escuro fixos", consistente com
  a nota de SHELL-SIDEBAR-09.
- **Threshold exatos**: confirmados pelo README §3.12 ("`< 70%` acento · `≥ 70%` âmbar ...
  `≥ 90%` perigo"), não são estimativa.
- **Mensagens de aviso por faixa** (`"acaba antes do ciclo"`, `"agentes pausam em N"`) — `[!]`
  o texto exato ("N" = 50 no exemplo) depende de projeção de consumo; fonte real do dado é
  backend, marcar como dado de exemplo na Fase B se não houver endpoint de projeção.
- **Fonte**: canvas `id="6b"`, bloco "Sidebar expandida · 3 faixas".

### SHELL-CREDITS-05 — Texto de nota (anotação do canvas, transcrição integral)
Ao lado do bloco "3 faixas", `font-size:11.5px; color:var(--tx2); line-height:1.5;
max-width:228px`:

> Colapsada: só o anel. Expandida/pinada: anel + 2 linhas. O rodapé da sidebar fica só com o
> bloco de créditos — Configurações e avatar migram para a TopBar (à direita do sino), como
> em `6a`.

---

## Contagem total

- SHELL-SIDEBAR: 9 itens (01–09)
- SHELL-TOPBAR: 7 itens (01–07)
- SHELL-USERMENU: 9 itens (01–09)
- SHELL-CREDITS: 5 itens (01–05)
- **Total: 30 itens numerados.**
- Flags `[!]` levantadas: 9 (2× discrepância de medida entre fontes 7a/1b, 1× cor de badge
  divergente entre fontes, 1× largura de busca divergente, 1× ambiguidade de posição do
  readiness indicator, 1× dois estados não resolvidos do sino, 1× painel de notificações sem
  mockup dedicado, 1× submenu de troca de workspace sem mockup, 1× categoria "cor de presença
  não-tokenizada" a confirmar como regra geral, 1× textos de aviso de faixa como dado de
  exemplo/backend).
