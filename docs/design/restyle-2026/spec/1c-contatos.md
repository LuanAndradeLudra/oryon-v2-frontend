# Spec 1c — Contatos/CRM (lista + drawer + modal Configurar colunas)

Fase A (extração pura). Fontes, em ordem de autoridade: (1) `Oryon-Reestilizacao-canvas.html`
(markup do frame `1c` e do painel "Modal · Configurar colunas da lista" — valores exatos);
(2) `telas/01-1c-contatos-lista-drawer.png`, `02-1c-contatos-lista-drawer.png`,
`01-1c-modal-configurar-colunas.png`, `02-1c-modal-configurar-colunas.png` (não há outros `*-1c-*`);
(3) `README.md` §1 (fundamentos/vocabulário) e §3.2. Zero avaliação de código.

Convenção: `[H]` = valor exato do HTML · `[P]` = estimado pelo PNG · `[R]` = regra do README.
Valores citados como tokens do protótipo (`--sf`, `--bd`…) resolvem pela tabela abaixo.

## Tokens do protótipo (mapa exato do canvas, claro → escuro) `[H]`

| token | claro | escuro | papel |
|---|---|---|---|
| `--bg` | `#FAFAFC` | `#060909` | fundo da área de conteúdo |
| `--sf` | `#FFFFFF` | `#161E1E` | superfície (TopBar, filtros, tabela, drawer, modal) |
| `--sf2` | `#F5F6F8` | `#0E1414` | superfície-2 (cabeçalho de tabela, busca da TopBar, segmento ativo) |
| `--bd` | `#E4E6EC` | `#243333` | borda/hairline |
| `--bd2` | `#C8CDD8` | `#2E4040` | borda de ênfase (chips inativos, inputs, checkbox, botão neutral) |
| `--tx` / `--tx2` / `--tx3` | `#1A1F2E` / `#5C657A` / `#9098AA` | `#ECF1F1` / `#8FA5A5` / `#6B8080` | texto principal / secundário / terciário |
| `--ac` / `--acs` / `--acsoft` | `#14B8A6` / `#0F766E` / `rgba(20,184,166,.12)` | `#2DD4BF` / `#2DD4BF` / `rgba(45,212,191,.14)` | acento / acento forte / acento suave |
| `--btn` / `--btntx` | `#0F766E` / `#FFFFFF` | `#2DD4BF` / `#04201D` | botão primário (fundo/texto) |
| `--rowhover` | `#F5F6F8` | `#1B2525` | fundo de linha ativa/hover |
| `--avs` / `--avi` | `#374151` / `#FFFFFF` | `#B5C8C8` / `#060909` | avatar (disco / inicial) |
| `--ok` / `--okbg` | `#15803D` / `rgba(21,128,61,.10)` | `#22C55E` / `rgba(34,197,94,.14)` | sucesso |
| `--amber` / `--amberbg` | `#B45309` / `rgba(180,83,9,.10)` | `#FBBF24` / `rgba(251,191,36,.14)` | atenção (banner Mock) |
| `--ovbd` | `#D5DAE3` | `#324646` | borda de overlay (drawer, modal) |
| `--ovsh` | `0 0 0 1px rgba(15,23,42,.03), 0 4px 12px rgba(15,23,42,.10), 0 16px 40px rgba(15,23,42,.16)` | `inset 0 1px 0 rgba(255,255,255,.05), 0 4px 12px rgba(0,0,0,.45), 0 12px 32px rgba(0,0,0,.55)` | sombra de overlay (única sombra da tela) |
| `--scrim` | `rgba(15,23,42,.18)` | `rgba(0,0,0,.4)` | scrim atrás do drawer |
| `--sb` / `--sbtx` | `#0E1414` / `#8FA5A5` | `#0E1414` / `#8FA5A5` | sidebar (sempre escura) |

Wrapper de toda a tela `[H]`: `font-family:'Plus Jakarta Sans'`, `font-size:13px`, `line-height:1.5`,
`font-variant-numeric:tabular-nums`, `color:var(--tx)`. Frame 1440×880.

> Nota de escopo: o mockup NÃO contém contador "5.190", botão "Configurar", botão "Novo Lead",
> chips "Todos/Sem negócio/Com negócio aberto/Cliente", nem colunas Score/Intenção/Sentimento/
> Funis/Fonte/Opt-in/E-mail na tabela. O que a referência mostra está abaixo; itens ausentes dela
> não são especificados aqui.

---

## CONT-HDR — TopBar da página `[H]`

- **CONT-HDR-01** Container: altura **48px**, `display:flex; align-items:center; gap:12px; padding:0 16px`, `border-bottom:1px solid var(--bd)`, `background:var(--sf)`. Sem sombra.
- **CONT-HDR-02** Título "Contatos": **14px / 700 / letter-spacing -.01em**, cor `--tx`. (README §1.1 lista "título de página 16px/700"; o canvas de 1c usa 14px — prevalece o canvas para esta tela.)
- **CONT-HDR-03** Subtítulo ao lado do título (mesma linha, `align-items:baseline; gap:8px`): "2.318 contatos · 47 novos esta semana", **12px / 400**, cor `--tx2`.
- **CONT-HDR-04** Bloco direito: `margin-left:auto; display:flex; align-items:center; gap:8px`, na ordem: Importar → Novo contato → divisor → busca → sino → avatar.
- **CONT-HDR-05** Botão "Importar" (neutral sm): altura **28px**, `padding:0 10px`, raio **7px**, `border:1px solid var(--bd2)`, fundo `--sf`, texto **12px/600** `--tx`, ícone `upload` 14px stroke 2, `gap:6px`.
- **CONT-HDR-06** Botão "Novo contato" (primary sm): 28px, `padding:0 10px`, raio 7px, fundo `--btn`, texto `--btntx` 12px/600, ícone `plus` 14px stroke 2.2, gap 6px. Sem borda, sem sombra.
- **CONT-HDR-07** Divisor vertical: **1×18px**, fundo `--bd`, `margin:0 2px`.
- **CONT-HDR-08** Busca global: pílula **200px × 28px**, `padding:0 10px`, raio 7px, `border:1px solid var(--bd)`, fundo **`--sf2`**, placeholder "Buscar" 12px `--tx3`, ícone `search` 14px; atalho "/" à direita (`margin-left:auto`) em JetBrains Mono **10.5px**, `border:1px solid var(--bd2)`, raio 4px, `padding:0 4px`.
- **CONT-HDR-09** Sino: botão ícone **28×28**, raio 7px, sem fundo/borda, ícone `bell` 16px, cor `--tx2`. (Sem badge neste frame.)
- **CONT-HDR-10** Avatar do usuário: **28×28**, `border-radius:30%` (não círculo), fundo `--avs`, iniciais "RC" **10.5px/700** cor `--avi`.
- **CONT-HDR-11** Claro×escuro: só tokens mudam; avatar inverte (disco escuro/letra branca no claro; disco claro `#B5C8C8`/letra `#060909` no escuro).

## CONT-FILTERS — Barra de filtros `[H]`

- **CONT-FILTERS-01** Container: altura **44px**, `display:flex; align-items:center; gap:8px; padding:0 16px`, `border-bottom:1px solid var(--bd)`, fundo `--sf`.
- **CONT-FILTERS-02** Busca da lista: **240px × 28px**, `padding:0 10px`, raio 7px, `border:1px solid var(--bd2)`, fundo `--sf` (não sf2), placeholder "Nome, telefone ou e-mail" 12px `--tx3`, ícone `search` 14px, gap 8px.
- **CONT-FILTERS-03** Divisor vertical 1×18px `--bd`, `margin:0 4px`, entre a busca e os chips.
- **CONT-FILTERS-04** Chip de filtro **ATIVO** ("Situação · Qualificado, Proposta"): 28px, `padding:0 9px`, raio 7px, `border:1px solid var(--ac)`, fundo `--acsoft`, cor `--acs`, 12px/**600**, o valor ("· Qualificado, Proposta") em **700**; à direita ícone `x` **12px** stroke 2.4; gap 5px. `[R]` "é a única cerimônia teal da toolbar além do botão primário".
- **CONT-FILTERS-05** Chips **inativos** "Etiqueta", "Responsável", "Funil": 28px, `padding:0 9px`, raio 7px, `border:1px solid var(--bd2)`, fundo `--sf`, cor `--tx`, 12px/600, ícone `chevron-down` 12px stroke 2 à direita, gap 5px.
- **CONT-FILTERS-06** "+ Filtro" (ghost): 28px, `padding:0 9px`, raio 7px, sem borda/fundo, cor `--tx2`, 12px/600, ícone `plus` **13px** à esquerda.
- **CONT-FILTERS-07** SegmentedControl "Todos | Meus" (`margin-left:auto`): container `border:1px solid var(--bd)`, raio 7px, `overflow:hidden`, 12px/600; cada segmento 28px, `padding:0 10px`; **ativo** ("Todos") fundo `--sf2` cor `--tx`; inativo ("Meus") sem fundo, cor `--tx2`, `border-left:1px solid var(--bd)`.
- **CONT-FILTERS-08** "Colunas" (ghost): 28px, `padding:0 9px`, raio 7px, cor `--tx2`, 12px/600, ícone `sliders-horizontal` 14px à esquerda, gap 5px. Último item da barra.
- **CONT-FILTERS-09** `[R]` Ordem/semântica: filtro ativo = borda acento + fundo acento suave + valor 700 + ×; inativo = borda de ênfase; nenhum chip tem sombra.

## CONT-TABLE — Tabela (DataTable) `[H]`

- **CONT-TABLE-01** Container da tabela: `flex:1; min-height:0; display:flex; flex-direction:column`, fundo `--sf`. Sem borda externa, sem raio, sem sombra (encostada na barra de filtros).
- **CONT-TABLE-02** Grid de colunas (cabeçalho e linhas): `grid-template-columns: 40px 1.5fr 130px 1fr 1.3fr 130px 120px 80px 36px` → checkbox · Nome · Telefone · Situação · Etiquetas · Responsável · Último contato · Negócios · menu.
- **CONT-TABLE-03** Cabeçalho: altura **32px**, `padding:0 8px 0 12px`, `border-bottom:1px solid var(--bd)`, fundo **`--sf2`**, texto **11px/600** cor `--tx2`. Rótulos: (checkbox) · Nome · Telefone · Situação · Etiquetas · Responsável · Último contato · Negócios · (vazio). Sem `text-transform:uppercase` no HTML (o PNG lê como caixa normal "Nome", "Telefone"…).
- **CONT-TABLE-04** Coluna ordenada ("Nome"): rótulo em cor `--tx` (não tx2) + ícone `chevron-up` **11px** stroke 2.4, `gap:4px`.
- **CONT-TABLE-05** Cabeçalhos numéricos "Último contato" e "Negócios": `text-align:right`.
- **CONT-TABLE-06** Checkbox do cabeçalho: **14×14**, raio **4px**, `border:1px solid var(--bd2)`, fundo `--sf`.
- **CONT-TABLE-07** Linha: altura **36px**, `padding:0 8px 0 12px`, `border-bottom:1px solid var(--bd)`, texto 13px, `align-items:center`. **Sem zebra**, sem raio, sem borda lateral.
- **CONT-TABLE-08** Linha **selecionada/ativa** (Mariana Costa): fundo **`--rowhover`** + `box-shadow: inset 2px 0 0 var(--ac)` (filete de 2px à esquerda na cor acento). `[R]` hover usa o mesmo par.
- **CONT-TABLE-09** Checkbox marcado (linha selecionada): 14×14, raio 4px, fundo **`--btn`**, sem borda, ícone `check` **10px** stroke 3.5 na cor `--btntx`.
- **CONT-TABLE-10** Checkbox desmarcado nas linhas: 14×14, raio 4px, `border:1px solid var(--bd2)`, sem fundo.
- **CONT-TABLE-11** Célula Nome: `display:flex; align-items:center; gap:9px; min-width:0`; avatar **22×22 circular** (`border-radius:50%`), fundo `--avs`, iniciais **9px/700** `--avi`; nome **13px/600** `--tx`, `white-space:nowrap; overflow:hidden; text-overflow:ellipsis`.
- **CONT-TABLE-12** Célula Telefone: 13px, cor `--tx2`, formato "+55 11 98765-4321".
- **CONT-TABLE-13** Célula Situação = StageBadge: altura **20px**, `padding:0 7px`, raio **5px**, `border:1px solid var(--bd)`, fundo `--sf`, texto **11px/600** `--tx`, ponto **6×6** circular na cor **crua** do tenant (ex.: `#7C3AED` Qualificado, `#0EA5E9` Novo lead, `#F59E0B` Proposta, `#EC4899` Negociação), `gap:5px`.
- **CONT-TABLE-14** Célula Etiquetas: `display:flex; gap:4px; min-width:0; overflow:hidden`; cada chip **18px** de altura, `padding:0 7px`, raio **6px**, fundo `color-mix(in srgb, <hex> 85%, #000)`, texto **#fff 10.5px/600** (ex.: VIP `#EC4899`, Indicação `#0EA5E9`, Reativar `#F59E0B`, B2B `#10B981`).
- **CONT-TABLE-15** Overflow de etiquetas: "+2" em **11px** cor `--tx3`, `align-self:center`, após os chips visíveis (máx. 2 visíveis no mockup).
- **CONT-TABLE-16** Sem etiqueta: "—" em **12px** cor `--tx3`.
- **CONT-TABLE-17** Célula Responsável: `display:flex; align-items:center; gap:6px`, **12.5px**; avatar **18×18**, `border-radius:30%`, fundo `--avs`, iniciais **8px/700** `--avi`; nome abreviado "Ana N." em `--tx`.
- **CONT-TABLE-18** Sem responsável: texto "Sem responsável" **12px** cor `--tx3`.
- **CONT-TABLE-19** Célula Último contato: `text-align:right`, cor `--tx2`, valores relativos/curtos ("há 18 min", "há 2 h", "ontem", "12 set").
- **CONT-TABLE-20** Célula Negócios: `text-align:right`, número em `--tx`; quando **0** usa cor `--tx3`.
- **CONT-TABLE-21** Célula menu: "···" cor `--tx3`, `text-align:center`, coluna de 36px.
- **CONT-TABLE-22** Ordem/conteúdo das 10 linhas do mockup (ref. para densidade): Mariana Costa (selecionada) · João Pedro Alves · Acme Ltda · Beatriz Fonseca · Carlos Siqueira · Dra. Renata Lima · Eduardo Martins · Fernanda Oliveira · Grupo Tavares · Helena Prado.
- **CONT-TABLE-23** Números tabulares em toda a tabela (herdado do wrapper).

## CONT-FOOTER — Rodapé da tabela `[H]`

- **CONT-FOOTER-01** Container: `margin-top:auto`, altura **40px**, `display:flex; align-items:center; padding:0 16px; gap:14px`, `border-top:1px solid var(--bd)`, **12px** cor `--tx2`.
- **CONT-FOOTER-02** Estado com seleção (o do mockup): à esquerda "**1 selecionado** · Atribuir · Etiquetar · Exportar" — "1 selecionado" em **600** cor `--tx`, ações em `--tx2` (mesmo 12px).
- **CONT-FOOTER-03** Paginação à direita (`margin-left:auto`): "1–50 de 2.318" 12px `--tx2`; setas **24×24**, raio **6px**, `border:1px solid var(--bd)`, `gap:4px`; "‹" em `--tx3` (desabilitada), "›" em `--tx`.
- **CONT-FOOTER-04** `[R]` Regra: com seleção, a barra de seleção **substitui** o rodapé de paginação na mesma altura de 40px, sem pulo de layout. (No canvas ambos aparecem na mesma faixa: seleção à esquerda, contagem/setas à direita.)

## CONT-DRAWER — Drawer do contato `[H]`

- **CONT-DRAWER-01** Scrim: `position:absolute; inset:0`, fundo `--scrim`.
- **CONT-DRAWER-02** Painel: `position:absolute; top:0; right:0; bottom:0`, largura **768px** (48rem), fundo `--sf`, `border-left:1px solid var(--ovbd)`, `box-shadow:var(--ovsh)`, **raio 0** (colado à borda direita), `display:flex; flex-direction:column`. `[R]` `useLayer`, portal em body; estado em `?contact=&tab=`.
- **CONT-DRAWER-03** Header: `display:flex; align-items:center; gap:12px; padding:14px 18px 0`. Sem borda inferior própria (a borda vem da faixa de abas).
- **CONT-DRAWER-04** Avatar do contato: **40×40 circular**, fundo `--avs`, iniciais **14px/700** `--avi`.
- **CONT-DRAWER-05** Bloco de identidade: coluna com `gap:3px; min-width:0`. Linha 1: nome **16px/700 letter-spacing -.01em** + StageBadge (20px, raio 5px, `border:1px solid var(--bd)`, ponto 6px cor crua, 11px/600), `gap:8px`. Linha 2: "+55 11 98765-4321 · mariana@acme.com.br · cliente desde mar 2026" em **12px** cor `--tx2` (telefone · e-mail · "cliente desde <mês ano>", separador " · ").
- **CONT-DRAWER-06** Ações (`margin-left:auto; gap:6px`): "Conversar" **primary sm** (28px, `padding:0 10px`, raio 7px, fundo `--btn`, texto `--btntx` 12px/600, ícone `message-square` 14px, gap 6px).
- **CONT-DRAWER-07** "Novo negócio" **neutral sm** (28px, `padding:0 10px`, raio 7px, `border:1px solid var(--bd2)`, sem fundo, 12px/600 `--tx`, sem ícone).
- **CONT-DRAWER-08** Kebab "···": botão ícone **28×28**, raio 7px, `border:1px solid var(--bd2)`, ícone `more-horizontal` 15px, cor `--tx2`.
- **CONT-DRAWER-09** Fechar "×": 28×28, raio 7px, **sem borda**, ícone `x` 16px, cor `--tx2`, `margin-left:4px`.
- **CONT-DRAWER-10** Faixa de abas: `display:flex; gap:18px; padding:14px 18px 0`, `border-bottom:1px solid var(--bd)`, **13px/500** cor `--tx2`; cada aba `padding:0 0 9px`. Ordem: Visão geral · Negócios 2 · Histórico · Conversas 7 · Disparos.
- **CONT-DRAWER-11** Aba ativa ("Negócios"): cor `--tx`, **600**, sublinhado `box-shadow: inset 0 -2px 0 var(--tx)` (2px, na cor do texto — não teal). Sem indicador deslizante.
- **CONT-DRAWER-12** Contador da aba ("2", "7"): `span` **11px** cor `--tx3`, `margin-left:2px`, dentro do rótulo.
- **CONT-DRAWER-13** Link "Abrir ficha completa ↗" à direita da faixa (`margin-left:auto; padding:0 0 9px`): **12px/600** cor `--acs`.
- **CONT-DRAWER-14** Corpo: `flex:1; min-height:0; display:grid; grid-template-columns: 260px 1fr`. Coluna esquerda com `border-right:1px solid var(--bd)`.
- **CONT-DRAWER-15** Coluna esquerda: `padding:14px 18px`, `display:flex; flex-direction:column; gap:14px`, **12.5px**. Grupos na ordem: Dados · Etiquetas · Campos personalizados. Nenhum grupo tem borda, fundo ou raio próprio.
- **CONT-DRAWER-16** Eyebrow de grupo ("DADOS", "ETIQUETAS", "CAMPOS PERSONALIZADOS"): **10px/700, letter-spacing .14em, uppercase**, cor `--tx3`, `margin-bottom:8px`.
- **CONT-DRAWER-17** Grid rótulo/valor (Dados e Campos): `grid-template-columns: 88px 1fr; gap:6px 8px`; rótulo em `--tx2`; valor **500** em `--tx`.
- **CONT-DRAWER-18** Dados — linhas: Responsável (avatar **16×16** `border-radius:30%`, iniciais **7.5px/700**, + "Ana Nunes", `gap:6px`) · Origem "Instagram Ads" · Empresa "Acme Ltda" · Cidade "São Paulo · SP" · Criado em "03 mar 2026".
- **CONT-DRAWER-19** Etiquetas — cabeçalho do grupo é `flex; justify-content:space-between` com eyebrow à esquerda e ação "Editar" à direita (**11.5px/600** `--acs`).
- **CONT-DRAWER-20** Etiquetas — chips: **20px**, `padding:0 8px`, raio **6px**, fundo `color-mix(in srgb, <hex> 85%, #000)`, texto #fff **11px/600**; `flex-wrap; gap:4px`. Após os chips, botão "+" **20×20**, raio 6px, `border:1px dashed var(--bd2)`, cor `--tx3`, 13px.
- **CONT-DRAWER-21** Campos personalizados — linhas: Plano "Pro · anual" (500) · CNPJ "12.345.678/0001-90" em **JetBrains Mono 11.5px** · Consent LGPD = ícone `check` 12px stroke 2.5 + "Sim", cor `--ok`, **600**, `gap:4px`.
- **CONT-DRAWER-22** Coluna direita: `padding:14px 18px; display:flex; flex-direction:column; gap:12px` (conteúdo da aba Negócios no mockup).
- **CONT-DRAWER-23** Banner "Dados de exemplo": `display:flex; gap:8px; align-items:center; padding:8px 10px`, raio **6px**, fundo `--amberbg`, cor `--amber`, **12px/500**; ícone `triangle-alert` 14px stroke 2 (`flex:none`); texto com "**Dados de exemplo.**" em 700 + "Esta aba ainda não está ligada ao servidor — os valores abaixo são ilustrativos."; badge "MOCK" à direita (`margin-left:auto`): **18px**, `padding:0 6px`, raio **4px**, `border:1px solid currentColor`, **10px/700, .08em, uppercase**. `[R]` obrigatório enquanto `PROFILE_MOCKS_ENABLED`.
- **CONT-DRAWER-24** Linha de resumo: `flex; justify-content:space-between`; "2 negócios abertos" **13px/600** + "· R$ 23.100" em `--tx2` 500; botão "+ Negócio" **neutral sm** (28px, `padding:0 10px`, raio 7px, `border:1px solid var(--bd2)`, 12px/600, ícone `plus` 13px stroke 2.2, gap 5px).
- **CONT-DRAWER-25** Tabela de negócios: wrapper `border:1px solid var(--bd)`, raio **8px**, `overflow:hidden` (único bloco com borda+raio na coluna direita). Grid `1fr 130px 110px 90px` (Negócio · Etapa · Valor · Atualizado).
- **CONT-DRAWER-26** Cabeçalho da tabela de negócios: **30px**, `padding:0 12px`, fundo `--sf2`, `border-bottom:1px solid var(--bd)`, **11px/600** `--tx2`; Valor e Atualizado `text-align:right`.
- **CONT-DRAWER-27** Linhas da tabela de negócios: **36px**, `padding:0 12px`, `border-bottom:1px solid var(--bd)` (última sem), 13px; nome do negócio **500**; Etapa = StageBadge (20px/raio 5/ponto 6px/11px 600, sem fundo explícito); Valor à direita; Atualizado à direita em `--tx2`.
- **CONT-DRAWER-28** Negócio fechado ("Upgrade armazenamento · Ganho"): linha inteira em cor `--tx2`, badge "Ganho" com ponto `#22C55E` e texto `--tx2`.
- **CONT-DRAWER-29** Eyebrow "ATIVIDADE RECENTE": 10px/700/.14em/uppercase `--tx3`, `margin-top:6px`.
- **CONT-DRAWER-30** Timeline: lista `gap:0`, **12.5px**; cada item `display:grid; grid-template-columns: 64px 1fr; gap:10px; padding:7px 0; border-bottom:1px solid var(--bd)` (último sem borda). Coluna de tempo **11.5px** `--tx3` ("há 2 h", "ontem", "03 mar"). Texto: ator em **600**, nome de negócio em `--tx2` (não itálico), link "ver conversa" **600** cor `--acs`.
- **CONT-DRAWER-31** Claro×escuro: painel `--sf` (`#FFFFFF`/`#161E1E`), borda `--ovbd`, sombra `--ovsh` (a única sombra da tela), scrim `--scrim`; chips de etiqueta mantêm o mesmo `color-mix` nos dois temas; avatar inverte.
- **CONT-DRAWER-32** `[P]` Aba "Visão geral" (não renderizada no canvas): `[R]` coluna direita idem; estrutura da esquerda (Dados/Etiquetas/Campos) é a mesma em qualquer aba — a coluna esquerda pertence ao corpo do drawer, não à aba.

## CONT-COLS — Modal "Configurar colunas" `[H]`

- **CONT-COLS-01** Container: largura **520px**, `border:1px solid var(--ovbd)`, raio **10px**, fundo `--sf`, `box-shadow:var(--ovsh)`. (README §Modal: scrim `--color-scrim-soft`, portal + `useLayer`.)
- **CONT-COLS-02** Header: `display:flex; align-items:flex-start; justify-content:space-between; padding:16px 18px 12px`, `border-bottom:1px solid var(--bd)`.
- **CONT-COLS-03** Título "Configurar colunas": **15px/700, letter-spacing -.01em**. Subtítulo "Ordem e visibilidade valem só para você.": **12.5px** `--tx2`, `margin-top:2px`.
- **CONT-COLS-04** Fechar: botão ícone 28×28, raio 7px, sem borda/fundo, ícone `x` 16px stroke 2, cor `--tx2`.
- **CONT-COLS-05** Lista: `padding:6px 18px`. Cada linha **36px**, `display:flex; align-items:center; gap:10px`, `border-bottom:1px solid var(--bd)` (última sem), **13px**.
- **CONT-COLS-06** Handle "⋮⋮": cor `--tx3`, **14px**, `letter-spacing:-2px`.
- **CONT-COLS-07** Nome do campo: `flex:1`, **500**, cor `--tx`.
- **CONT-COLS-08** Linha "Nome" (fixa): sem Switch; à direita texto "fixa" **11px** `--tx3`.
- **CONT-COLS-09** Switch ligado (Telefone, Situação, Etiquetas, Último contato): **32×18**, raio **9px**, fundo `--ac`, thumb **14×14** branco (`#fff` fixo) em `top:2px; left:16px`.
- **CONT-COLS-10** Switch desligado (Funis, E-mail): 32×18, raio 9px, fundo **`--bd2`**, thumb 14×14 branco em `top:2px; left:2px`.
- **CONT-COLS-11** Linha "Funis" traz badge "MULTI-FUNIL" após o nome: **16px** de altura, `padding:0 5px`, `margin-left:4px`, raio **4px**, `border:1px dashed var(--bd2)`, cor `--tx3`, **9.5px/700, .08em, uppercase**, `vertical-align:middle`. `[R]` condicional a `useMultiPipeline()`.
- **CONT-COLS-12** Ordem das linhas: Nome (fixa) · Telefone (on) · Situação (on) · Etiquetas (on) · Funis MULTI-FUNIL (off) · E-mail (off) · Último contato (on).
- **CONT-COLS-13** Footer: `display:flex; align-items:center; padding:12px 18px 16px`, `border-top:1px solid var(--bd)`. Esquerda: "Restaurar padrão" ghost **12px/600** cor `--tx2` (sem borda/fundo). Direita (`margin-left:auto; gap:8px`): "Cancelar" neutral **md** (36px, `padding:0 14px`, raio 7px, `border:1px solid var(--bd2)`, 13px/600) e "Salvar" primary **md** (36px, `padding:0 14px`, raio 7px, fundo `--btn`, texto `--btntx`, 13px/600).
- **CONT-COLS-14** `[P]` No PNG (claro e escuro) o modal aparece sobre um painel `--bg` sem scrim visível — o canvas mostra o modal isolado; o scrim de produção segue o README.
- **CONT-COLS-15** Claro×escuro: switch ligado `#14B8A6` → `#2DD4BF`; desligado `#C8CDD8` → `#2E4040`; thumb sempre branco; borda do modal `--ovbd`; sombra `--ovsh`.

## CONT-SHELL — Shell visível no frame (contexto, não é a tela) `[H]`

- **CONT-SHELL-01** Sidebar sempre escura nos dois temas (`--sb #0E1414`), item ativo "Contatos" com fundo `rgba(255,255,255,.85)`-like e texto escuro `[P]`; rodapé "Créditos de IA · 64 / 1.000 · renova em 15 d" com anel 22px (`#243333` trilha, `#2DD4BF` progresso), fundo `rgba(255,255,255,.06)`, raio 6px, 40px. Detalhado em spec 7a/6b — aqui só como referência de contraste com a área `--bg`.

---

**Total: 11 + 9 + 23 + 4 + 32 + 15 + 1 = 95 itens.**
