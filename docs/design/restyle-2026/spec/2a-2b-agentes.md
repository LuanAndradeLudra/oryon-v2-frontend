# Spec de extração — 2a Agentes IA · 2b Wizards

Fase A do método (AUDITORIA-NOTURNA.md). Só referência; nenhuma avaliação do código.

Fontes: (1) `Oryon-Reestilizacao-canvas.html` — markup das telas `2a` e `2b` (bytes ~405k–453k) e
mapa de tokens do protótipo (`renderVals`, fim do arquivo); (2) `telas/01-2a-agentes-ia.png`,
`02-2a-agentes-ia.png`, `01-2b-wizard-agente-tela-cheia.png`, `02-2b-wizard-agente-tela-cheia.png`,
`01-2b-automacao-drawer.png`, `02-2b-automacao-drawer.png`; (3) `README.md` §1 (fundamentos),
§2 (vocabulário), §3.5, §3.6.

Rótulo do canvas — 2a: "Agentes IA — lista + detalhe inline (sem rota), abas com auto-save
'Salvo' no header, sem botão Salvar". 2b: "Wizards — os 2 padrões atuais reestilizados (tela
cheia com Tutor · drawer com nav vertical) + proposta unificada: drawer 72rem, trilha 260px,
mesmo visual nos modos guiado (travado) e livre" (a "proposta unificada" NÃO está nos PNGs
nem no markup extraído — só os 2 padrões atuais; README §3.6 confirma "não unificar").

Convenções: valores vêm do HTML salvo indicação "estimado pelo PNG". `L`/`D` = claro/escuro.
Todo texto de exemplo (números, nomes, CSAT…) é dado mock; anotado como `[dado]` quando o
mock depende de informação que pode não existir no backend.

## 0. Mapa de tokens do protótipo (canvas `renderVals`) → hex

| token | Claro | Escuro | equivalente de produção sugerido pelo README |
|---|---|---|---|
| `--bg` fundo | `#FAFAFC` | `#060909` | `--color-surface-950` |
| `--sf` superfície | `#FFFFFF` | `#161E1E` | `--color-surface-900` |
| `--sf2` superfície-2 | `#F5F6F8` | `#0E1414` | `--sf2` / `--color-surface-800` |
| `--bd` borda | `#E4E6EC` | `#243333` | `--color-surface-700` |
| `--bd2` borda de ênfase | `#C8CDD8` | `#2E4040` | `--color-surface-600` |
| `--tx` texto | `#1A1F2E` | `#ECF1F1` | `--color-surface-50/100` |
| `--tx2` secundário | `#5C657A` | `#8FA5A5` | `--color-surface-400/300` |
| `--tx3` terciário | `#9098AA` | `#6B8080` | `--color-surface-500` |
| `--ac` acento | `#14B8A6` | `#2DD4BF` | `--color-brand-500` |
| `--acs` acento forte (texto) | `#0F766E` | `#2DD4BF` ⚠ README diz `#14B8A6` no escuro; canvas usa `#2DD4BF` | `--color-brand-600` |
| `--acsoft` acento suave | `rgba(20,184,166,.12)` | `rgba(45,212,191,.14)` | `bg-accent-soft` |
| `--btn` / `--btntx` primário | `#0F766E` / `#FFFFFF` | `#2DD4BF` / `#04201D` | `--color-btn-primary-bg/fg` |
| `--ok` / `--okbg` | `#15803D` / `rgba(21,128,61,.10)` | `#22C55E` / `rgba(34,197,94,.14)` | status-active |
| `--dg` / `--dgbg` | `#B91C1C` / `rgba(185,28,28,.08)` | `#EF4444` / `rgba(239,68,68,.14)` | danger |
| `--amber` / `--amberbg` | `#B45309` / `rgba(180,83,9,.10)` | `#FBBF24` / `rgba(251,191,36,.14)` | status-pending |
| `--rowhover` | `#F5F6F8` | `#1B2525` | `--rowhover` |
| `--ov` / `--ovbd` overlay | `#FFFFFF` / `#D5DAE3` | `#1E2A2A` / `#324646` | overlay |
| `--ovsh` sombra de overlay | `0 0 0 1px rgba(15,23,42,.03), 0 4px 12px rgba(15,23,42,.10), 0 16px 40px rgba(15,23,42,.16)` | `inset 0 1px 0 rgba(255,255,255,.05), 0 4px 12px rgba(0,0,0,.45), 0 12px 32px rgba(0,0,0,.55)` | `--shadow-overlay` |
| `--scrim` | `rgba(15,23,42,.18)` | `rgba(0,0,0,.4)` | `--color-scrim-soft` |
| `--avs` / `--avi` avatar | `#374151` / `#FFFFFF` | `#B5C8C8` / `#060909` | avatar |
| `--sb` / `--sbtx` sidebar | `#0E1414` / `#8FA5A5` | idem | nav-sidebar |

Frame de cada tela: 1440×880, `font-variant-numeric:tabular-nums`, base 13px / lh 1.5 /
Plus Jakarta Sans, cor `--tx`. Cores de agente (`#0EA5E9`, `#8B5CF6`, `#F59E0B`) = paleta
literal do `AgentIcon` (exceção deliberada, README §3.5).

---

## 2a — Agentes IA

### AGT-SHELL — rail + TopBar visíveis na tela (dono: spec 7a; listados só pra cobertura)

- **AGT-SHELL-01** Rail colapsado 62px, `--sb`, cor `--sbtx`, padding `10px 0 12px`; logo 26px
  raio 6 gradiente `135deg #5EEAD4→#14B8A6→#0F766E`, "O" `#04201D` 14/800, mb 14.
- **AGT-SHELL-02** Itens do rail 36×32, raio 6, ícone 18 stroke 1.9, gap 4. Ativo (Agentes IA):
  fundo `rgba(255,255,255,.88)`, cor `#0A0F0F`, stroke 2. Divisor 20×1 `#243333` margem `8px 0`.
- **AGT-SHELL-03** Rodapé do rail: divisor 20×1 + anel de créditos 36×36 raio 6 fundo
  `rgba(255,255,255,.06)`, círculo r9 stroke 2.5 trilha `#243333` + progresso `#2DD4BF`
  (`dasharray 56.5 / dashoffset 52.9` ≈ 6,4%), title "Créditos de IA · 64 / 1.000".
- **AGT-SHELL-04** TopBar 48px, `padding 0 16`, gap 12, `border-bottom 1px --bd`, fundo `--sf`.
- **AGT-SHELL-05** Título "Agentes IA" **14px/700 `-.01em`** (⚠ README §1.1 diz 16px pra título de
  página; canvas usa 14) + subtítulo 12px `--tx2` "3 ativos · 782 conversas resolvidas hoje",
  alinhados por baseline, gap 8. `[dado]` contagens.
- **AGT-SHELL-06** Direita (ml auto, gap 8): botão **Novo agente** primário `sm`: h28, padding
  `0 10`, raio 7, fundo `--btn`, texto `--btntx` 12/600, ícone plus 14 stroke 2.2, gap 6.
- **AGT-SHELL-07** Busca 200×28, padding `0 10`, raio 7, borda 1px `--bd`, fundo `--sf2`, texto
  `--tx3` 12px, ícone 14, kbd "/" JetBrains Mono 10.5 borda 1px `--bd2` raio 4 padding `0 4`
  ml auto.
- **AGT-SHELL-08** Sino 28×28 raio 7 cor `--tx2` ícone 16 (sem badge nesta tela). Avatar 28×28
  raio **30%**, fundo `--avs`, texto `--avi` 10.5/700 "RC".

### AGT-LIST — coluna de agentes (300px)

- **AGT-LIST-01** Coluna 300px fixa, `border-right 1px --bd`, fundo `--sf`, coluna flex; sem
  padding externo (itens encostam nas bordas).
- **AGT-LIST-02** Barra de filtros: flex gap 6, padding `10px 12px`, `border-bottom 1px --bd`,
  11px/600.
- **AGT-LIST-03** Chip de filtro h22, padding `0 8`, raio 6. Ativo ("Todos · 4"): fundo `--acsoft`,
  texto `--acs`, sem borda. Inativos ("Ativos", "Rascunho"): borda 1px `--bd`, texto `--tx2`,
  sem fundo. Contagem inline no rótulo ("Todos · 4").
- **AGT-LIST-04** Item: flex gap 10, padding 12, `border-bottom 1px --bd` (hairline entre itens,
  sem raio, sem caixa, sem gap lateral).
- **AGT-LIST-05** Item ativo: fundo `--rowhover` + `box-shadow inset 2px 0 0 --ac` (filete de
  2px na esquerda). Hover (README §3.5): mesmo `--rowhover`. Sem borda extra.
- **AGT-LIST-06** Tile do agente 34×34, raio 8, fundo = cor do agente (`#0EA5E9` Vendas,
  `#8B5CF6` Suporte, `#F59E0B` Agendamento), ícone bot 17 stroke 2 branco, `flex:none`.
- **AGT-LIST-07** Tile de rascunho ("Pós-venda"): 34×34 raio 8, **sem fundo**, borda 1px
  **tracejada** `--bd2`, ícone `--tx3`.
- **AGT-LIST-08** Conteúdo do item: coluna gap 2, `min-width:0`. Linha 1 = flex gap 6: nome
  13px/600 `flex:1` (rascunho: nome em `--tx2`) + chip de estado.
- **AGT-LIST-09** Chip "Ativo" na lista: h18, padding `0 6`, raio 5, fundo `--okbg`, texto `--ok`
  10.5/700, ponto 5px `currentColor` gap 4.
- **AGT-LIST-10** Chip "Rascunho": h18, padding `0 6`, raio 5, fundo `--sf2`, borda 1px `--bd`,
  texto `--tx2` 10.5/700, **sem ponto**.
- **AGT-LIST-11** Linha 2: 11.5px `--tx2` "Linha Vendas · 23 conversas agora" `[dado]` (linha +
  conversas ativas). Rascunho: 11.5px `--tx3` "Etapa 4 de 8 · editado há 3 dias" e **sem linha 3**.
- **AGT-LIST-12** Linha 3: 11px `--tx3` "61% resolvidas sem humano · CSAT 4,6" `[dado: % sem
  humano, CSAT]`.
- **AGT-LIST-13** Ordem/conteúdo do mock: Agente Vendas (ativo/selecionado) · Agente Suporte ·
  Agendamento Clínicas · Pós-venda (rascunho). Nenhum "···" na linha; nenhum contador de
  não-lidas; nenhum avatar de pessoa.

### AGT-DET — detalhe inline (coluna restante)

- **AGT-DET-01** Coluna `flex:1; min-width:0`, coluna flex, fundo `--bg` (herdado). Sem card
  envolvendo o detalhe.
- **AGT-DET-02** Header: flex align center gap 12, padding `14px 20px 0` (sem borda própria — a
  hairline fica abaixo das abas).
- **AGT-DET-03** Tile 40×40 raio **9**, fundo cor do agente, ícone bot 20 stroke 2 branco.
- **AGT-DET-04** Bloco de título (coluna gap 2): linha = nome 16px/700 `-.01em` + chip "Ativo"
  h20, padding `0 7`, raio 5, fundo `--okbg`, `--ok` 11/700, ponto 5px gap 4 (gap 8 até o nome).
- **AGT-DET-05** Subtítulo 12px `--tx2` "Qualifica leads da linha Vendas e agenda demonstrações
  · modelo Claude · v14" `[dado: descrição, modelo, versão]`.
- **AGT-DET-06** Ações à direita (ml auto, gap 10), nesta ordem: indicador de auto-save →
  Testar → Switch Ligado → kebab.
- **AGT-DET-07** Indicador de auto-save: inline-flex gap 5, 11.5px `--tx3`, ícone check 12
  stroke `--ok` 2.5, texto "Salvo às 14:31". **Texto, não barra nem botão Salvar.**
- **AGT-DET-08** Botão **Testar** = neutral `sm`: h28, padding `0 10`, raio 7, borda 1px `--bd2`,
  **sem fundo**, 12/600, ícone message-square 13 stroke 2, gap 6.
- **AGT-DET-09** Switch **Ligado**: 32×18 raio 9, fundo `--ac` (ligado), thumb 14px branco
  `top 2 / left 16`; rótulo 12/600 gap 8 à direita do switch.
- **AGT-DET-10** Kebab 28×28 raio 7, borda 1px `--bd2`, cor `--tx2`, ícone more-horizontal 15.
- **AGT-DET-11** Abas: flex gap **18**, padding `14px 20px 0`, `border-bottom 1px --bd`, 13px/500
  `--tx2`; cada aba `padding 0 0 9px`.
- **AGT-DET-12** Aba ativa: cor `--tx`, 600, sublinhado `box-shadow inset 0 -2px 0 var(--tx)` —
  **na cor do texto, não no acento** (README §2 "currentColor").
- **AGT-DET-13** Abas do mock, nesta ordem: **Desempenho · Comportamento (ativa) ·
  Conhecimento 12 · Handoff · Canais · Histórico** (6). Contagem "12" 11px `--tx3` ml 2.
- **AGT-DET-14** Corpo: `grid-template-columns: 1fr 320px`, gap 0, `flex:1; min-height:0`.
- **AGT-DET-15** Painel esquerdo: padding `18px 20px`, coluna gap 18, `border-right 1px --bd`
  (hairline vertical entre formulário e rail).
- **AGT-DET-16** Grupo (SettingsSection): `grid 200px 1fr`, gap 16, `padding-bottom 18`,
  `border-bottom 1px --bd`; último grupo sem padding-bottom/borda. **Zero cards.**
- **AGT-DET-17** Coluna de rótulo do grupo: título 13px/600 + descrição 12px `--tx2` lh 1.5
  mt 2 ("O que o agente tenta alcançar em cada conversa." / "Aplica-se a todas as respostas
  geradas." / "O que o agente nunca faz.").
- **AGT-DET-18** Grupo **Objetivo** — coluna de campos gap 10; campo = label 12/600 + controle,
  gap 5.
- **AGT-DET-19** "Meta principal" = select h36, raio 7, borda 1px `--bd2`, fundo `--sf`, padding
  `0 10`, 13px, chevron-down 14 `--tx3` à direita (space-between). Valor "Qualificar e agendar
  demonstração".
- **AGT-DET-20** "Critérios de lead qualificado" = textarea `min-height 64`, raio 7, borda 1px
  `--bd2`, fundo `--sf`, padding `8px 10px`, 13px lh 1.5.
- **AGT-DET-21** Grupo **Tom de voz** — linha de opções gap 6: chip h28, padding `0 10`, raio 7,
  12/600. Selecionado ("Consultivo"): borda 1px `--ac`, fundo `--acsoft`, texto `--acs`. Demais
  ("Direto", "Caloroso", "Formal"): borda 1px `--bd2`, sem fundo, texto `--tx`.
- **AGT-DET-22** Abaixo (gap 10): linha de toggles gap 18, 12.5px: Switch ligado + "Usar primeiro
  nome do contato" (texto `--tx`); Switch desligado (fundo `--bd2`, thumb `left 2`) + "Emojis"
  (texto `--tx2`).
- **AGT-DET-23** Grupo **Limites** — coluna gap 6, 13px. Linha de limite h32, padding `0 10`,
  borda 1px `--bd`, raio 7, fundo `--sf`, texto `flex:1` + "···" `--tx3`. Duas linhas: "Não
  informa preço abaixo da tabela sem humano" / "Não promete prazo de implantação".
- **AGT-DET-24** "Adicionar limite" = ghost `sm`: h28, padding `0 9`, raio 7, 12/600 `--tx2`,
  ícone plus 13 stroke 2.2, gap 5, `width:max-content`, sem borda/fundo.
- **AGT-DET-25** Rail direito (320px): padding `18px 20px`, coluna gap 14, fundo **`--sf2`**
  (L `#F5F6F8` / D `#0E1414`) — único bloco com fundo diferente da página.
- **AGT-DET-26** Eyebrow "Hoje": 10/700, `.14em`, uppercase, cor `--acs`.
- **AGT-DET-27** KPIs 2×2 (`grid 1fr 1fr`, gap 12): rótulo 11px `--tx2`; valor 22px/800
  `-.02em` lh 1.15 (tabular). Conversas 782 · Sem humano 61% · Handoffs 304 · CSAT 4,6.
  `[dado: agregados "de hoje" por agente — handoffs, % sem humano, CSAT]`.
- **AGT-DET-28** Card "Sugestão do sistema" — **único card do detalhe**: borda 1px `--ac`, raio
  8, fundo `--sf`, `box-shadow 0 0 0 3px --acsoft` (anel), padding 12.
- **AGT-DET-29** Título do card: flex gap 6, 12px/700 `--acs`, ícone sparkles 13 stroke 2.2.
  Corpo 12px `--tx2` lh 1.5 mt 4 ("38% dos handoffs de hoje foram por "preço"…") `[dado:
  insight gerado]`. Botão "Ver conversas" h26, padding `0 9`, raio 6, borda 1px `--bd2`, 11.5/600,
  mt 8, sem fundo.
- **AGT-DET-30** Nota de rodapé do rail: 11.5px `--tx3` lh 1.5 "Alterações nesta aba são salvas
  automaticamente. Versão publicada: v14 · 12 set." `[dado: versão publicada]`.
- **AGT-DET-31** Ausências deliberadas: nenhum botão "Salvar"; nenhum breadcrumb; nenhum card
  em volta dos grupos; nenhuma sombra em lugar nenhum da tela.

### AGT-THEME — diferenças claro × escuro (2a)

- **AGT-THEME-01** Só tokens mudam (tabela §0); markup idêntico. No escuro o rail `--sf2`
  (`#0E1414`) fica **mais escuro** que a página (`#060909`?) — não: `--bg` D `#060909` é mais
  escuro que `--sf2` `#0E1414`; o rail fica um degrau mais claro que o fundo, e a coluna da
  lista (`--sf` `#161E1E`) mais clara ainda. No claro a ordem é a inversa (rail `#F5F6F8` mais
  escuro que `--sf` `#FFFFFF`).
- **AGT-THEME-02** Tiles de agente mantêm o hex cru nos 2 temas (sem `tintaDaEtapa`).
- **AGT-THEME-03** Chip Ativo: L `#15803D` sobre `rgba(21,128,61,.10)`; D `#22C55E` sobre
  `rgba(34,197,94,.14)`.
- **AGT-THEME-04** Anel do card de sugestão: L `rgba(20,184,166,.12)` / D `rgba(45,212,191,.14)`;
  borda L `#14B8A6` / D `#2DD4BF`.

---

## 2b (i) — AgentBuilderWizard (tela cheia, 2 painéis)

- **AGT-WIZ-01** Layout: frame inteiro (sem sidebar visível — o wizard cobre a tela), 2 painéis
  fixos: Tutor **320px** à esquerda + conteúdo `flex:1`.
- **AGT-WIZ-02** Painel Tutor: fundo `--sf`, `border-right 1px --bd`, coluna flex, padding
  `18px 20px`, altura total (rodapé com `margin-top:auto`).
- **AGT-WIZ-03** Linha de marca no topo (gap 8, mb 22): tile 22×22 raio 6 gradiente
  `135deg #5EEAD4→#14B8A6→#0F766E`, "O" `#04201D` 12/800; texto 12px `--tx2` "Novo agente"
  (o sufixo "· (i) padrão atual: tela cheia" em `--tx3` é anotação do protótipo, não copy).
- **AGT-WIZ-04** Eyebrow "Etapa 3 de 8": 10/700, `.14em`, uppercase, `--acs`.
- **AGT-WIZ-05** Título da etapa 18px/700 `-.01em` lh 1.25, mt 6 ("Como ele fala?").
- **AGT-WIZ-06** Texto didático 12.5px `--tx2` lh 1.55, mt 8 ("O tom vale para todas as
  respostas…").
- **AGT-WIZ-07** Trilha: coluna gap 2, mt 22, 12.5px; item h30, flex gap 10.
- **AGT-WIZ-08** Bolinha 18×18 circular. **Concluída**: fundo `--acsoft`, ícone check 10
  stroke 3 cor `--acs`; rótulo `--tx2` 400. **Ativa**: fundo `--btn`, número 10/700 `--btntx`;
  rótulo `--tx` 600. **Futura**: sem fundo, borda 1px `--bd2`, número 10/600; rótulo `--tx3`.
- **AGT-WIZ-09** 8 etapas, nesta ordem: 1 Identidade ✓ · 2 Objetivo ✓ · 3 Tom de voz (ativa) ·
  4 Hub da empresa · 5 Conhecimento · 6 Regras de handoff · 7 Canais · 8 Teste.
- **AGT-WIZ-10** Nota de rodapé do Tutor (`margin-top:auto`): 11.5px `--tx3` lh 1.5 "Só etapas
  concluídas são clicáveis. Rascunho salvo automaticamente."
- **AGT-WIZ-11** Painel de conteúdo: coluna flex, fundo `--bg`.
- **AGT-WIZ-12** Header **52px**, padding `0 24`, `border-bottom 1px --bd`, fundo `--sf`.
- **AGT-WIZ-13** Barra de progresso segmentada: flex gap 4, `flex:1`, **8 segmentos** h3 raio 2;
  segmentos 1–3 fundo `--ac` (concluídas + ativa), 4–8 fundo `--bd`.
- **AGT-WIZ-14** À direita da barra (ml 24): "Rascunho salvo" inline-flex gap 5, 11.5px `--tx3`,
  check 12 stroke `--ok` 2.5. `[dado: exige auto-save real]`.
- **AGT-WIZ-15** Fechar (ml 14): 28×28 raio 7, cor `--tx2`, ícone X 16, sem borda.
- **AGT-WIZ-16** Corpo: `flex:1`, padding `32px 40px`, **`max-width 720px`**, coluna gap 22.
- **AGT-WIZ-17** Campo "Estilo base": label 12/600, gap 8 até a grade.
- **AGT-WIZ-18** Grade de opções `repeat(4, 1fr)`, gap 8. Card de opção: borda 1px `--bd`, raio
  8, fundo `--sf`, padding 12; título 13/600; descrição 11.5px `--tx2` lh 1.45 mt 3.
- **AGT-WIZ-19** Card selecionado ("Consultivo"): borda 1px `--ac` + `box-shadow 0 0 0 3px
  --acsoft`. Textos: Consultivo/"Pergunta antes de propor. Bom pra vendas complexas." ·
  Direto/"Respostas curtas, vai ao ponto." · Caloroso/"Empático, acolhe antes de resolver." ·
  Formal/"Sem gírias, trata por "senhor(a)"."
- **AGT-WIZ-20** Campo "Exemplo de saudação": label 12/600 + sufixo `--tx3` 500 "· o agente
  adapta a partir disso"; gap 5.
- **AGT-WIZ-21** Textarea `min-height 72`, raio 7, borda 1px `--bd2`, fundo `--sf`, padding
  `8px 10px`, 13px lh 1.5.
- **AGT-WIZ-22** Hint 11.5px `--tx3` "Máx. 300 caracteres · 118 usados" (contador vivo).
- **AGT-WIZ-23** Linha de toggles gap 18, 12.5px: Switch ligado (32×18 raio 9 `--ac`, thumb 14
  branco left 16) "Usar primeiro nome"; Switch desligado (`--bd2`, thumb left 2) "Emojis"
  (`--tx2`).
- **AGT-WIZ-24** Footer **64px**, padding `0 40`, `border-top 1px --bd`, fundo `--sf`.
- **AGT-WIZ-25** "← Voltar" = ghost `md`: h36, padding `0 14`, raio 7, 13/600 `--tx2`, sem
  borda/fundo (seta faz parte do texto).
- **AGT-WIZ-26** "Continuar →" = primary `md` (ml auto): h36, padding `0 16`, raio 7, fundo
  `--btn`, texto `--btntx` 13/600.
- **AGT-WIZ-27** Ausências: nenhum stepper horizontal com números/rótulos no header (só a barra
  fina); nenhum título repetido da etapa no corpo; nenhum card em volta do formulário; nenhuma
  sombra.
- **AGT-WIZ-28** Estimado pelo PNG: o painel Tutor e o header/footer do conteúdo têm a mesma
  altura da tela (880); o corpo rola internamente.

---

## 2b (ii) — AutomationBuilder (drawer 880px, nav vertical)

- **AUTO-WIZ-01** Cena: shell atrás (rail 62px `--sb` + área `--bg` com `opacity .6`) coberto por
  scrim `--scrim` (L `rgba(15,23,42,.18)` / D `rgba(0,0,0,.4)`).
- **AUTO-WIZ-02** Drawer ancorado à direita, **880px**, altura total, fundo `--sf`, `border-left
  1px --ovbd`, `box-shadow --ovsh`, **raio 0**, coluna flex.
- **AUTO-WIZ-03** Header **56px**, gap 12, padding `0 20`, `border-bottom 1px --bd`.
- **AUTO-WIZ-04** Bloco de título (lh 1.25): nome 15px/700 "Follow-up após proposta"; subtítulo
  11.5px `--tx2` "Automação" (sufixo "· (ii) padrão atual…" em `--tx3` é anotação do protótipo).
- **AUTO-WIZ-05** Chip de estado (ml auto) "Ativa": h20, padding `0 7`, raio 5, fundo `--okbg`,
  texto `--ok` 11/700, **sem ponto**.
- **AUTO-WIZ-06** Fechar 28×28 raio 7, cor `--tx2`, ícone X 16, sem borda.
- **AUTO-WIZ-07** Corpo: flex `min-height:0`; nav **200px** + conteúdo `flex:1`.
- **AUTO-WIZ-08** Nav: `border-right 1px --bd`, padding `14px 10px`, coluna gap 2, 12.5px, fundo
  **`--sf2`**.
- **AUTO-WIZ-09** Item de nav h30, padding `0 10`, raio 6, gap 8, cor `--tx2`, sem fundo.
- **AUTO-WIZ-10** Bolinha de estado **6×6** circular: ok = fundo `--ok`; pendente = fundo
  `--amber`; não visitada = sem fundo, borda 1px `--bd2`.
- **AUTO-WIZ-11** Item ativo ("Condições"): fundo `--sf`, borda 1px `--bd`, texto `--tx` 600
  (bolinha continua).
- **AUTO-WIZ-12** Contador no item ("Ações"): ml auto, 11px `--tx3`, "3".
- **AUTO-WIZ-13** Itens, nesta ordem e estado: Gatilho (ok) · Condições (ok, ativa) · Ações 3
  (ok) · Horário (âmbar/pendente) · Revisão (vazia).
- **AUTO-WIZ-14** Conteúdo: padding `20px 24px`, coluna gap 22, `overflow:hidden` (scroll único do
  drawer, não por seção).
- **AUTO-WIZ-15** Eyebrow de seção 10/700 `.14em` uppercase: "Gatilho" `--tx3`; **"Condições"
  `--acs`** (seção ativa em acento) + helper 11.5px `--tx3` "todas devem ser verdadeiras" gap 8;
  "Ações · 3" `--tx3`.
- **AUTO-WIZ-16** Controle do gatilho (mt 8): h36, padding `0 10`, borda 1px `--bd2`, raio 7,
  fundo `--sf`, 13px, flex gap 8: ponto 8×8 na cor da etapa (`#F59E0B`, `[dado: cor do tenant]`),
  texto "Negócio entra na etapa " + **Proposta** 600, chevron-down 14 `--tx3` ml auto.
- **AUTO-WIZ-17** Linhas de condição (mt 8, gap 6): `grid 1fr 130px 1fr 28px`, gap 6.
- **AUTO-WIZ-18** Célula de condição h36, borda 1px `--bd2`, raio 7, fundo `--sf`, padding `0 10`,
  13px. Célula de valor alinhada à direita com prefixo "R$" `--tx3` mr 6 ("5.000,00").
- **AUTO-WIZ-19** Remover linha: "×" em 28×36, cor `--tx3`, sem borda.
- **AUTO-WIZ-20** Célula com erro ("operador"): borda 1px **`--dg`**, texto placeholder `--tx3`.
- **AUTO-WIZ-21** Mensagem de erro inline (abaixo das linhas): flex gap 5, 11.5px `--dg`, ícone
  alert-circle 12 stroke 2.2, "Escolha um operador para a 2ª condição".
- **AUTO-WIZ-22** "+ Condição" = ghost `sm`: h28, padding `0 9`, raio 7, 12/600 `--tx2`, plus 13,
  `width:max-content`.
- **AUTO-WIZ-23** Linhas de ação (mt 8, gap 6): h40, padding `0 12`, borda 1px **`--bd`**, raio 7,
  fundo `--sf`, 13px, gap 10.
- **AUTO-WIZ-24** Ícone da ação 22×22 raio 6: ação principal (template) fundo `--acsoft`, ícone
  `--acs` 13 stroke 2.2 (message-square); ação secundária (notificar) fundo `--sf2`, borda 1px
  `--bd`, ícone `--tx2` 13 (user).
- **AUTO-WIZ-25** Texto da ação `flex:1`: "Enviar template **proposta_followup_v2**" (nome em
  600; ⚠ README §1.1 pede JetBrains Mono para nome de template — canvas usa a mesma família
  em 600) · "Notificar responsável pelo negócio". "···" `--tx3` à direita.
- **AUTO-WIZ-26** Footer **60px**, gap 8, padding `0 20`, `border-top 1px --bd`.
- **AUTO-WIZ-27** Status à esquerda 12px `--tx3` "Alterado há 2 min · não publicado" `[dado:
  timestamp de alteração/publicação]`.
- **AUTO-WIZ-28** "Descartar" = neutral `md` (ml auto): h36, padding `0 14`, raio 7, borda 1px
  `--bd2`, 13/600, sem fundo.
- **AUTO-WIZ-29** "Salvar e publicar" = primary `md`: h36, padding `0 14`, raio 7, fundo `--btn`,
  texto `--btntx` 13/600.
- **AUTO-WIZ-30** Ausências: nenhuma seção "Horário"/"Revisão" renderizada no corpo (scroll
  único, mas o mock mostra só até Ações); nenhum card por seção; nenhuma sombra dentro do
  drawer (só a do próprio overlay).
- **AUTO-WIZ-31** Estimado pelo PNG: o drawer ocupa ~61% da largura do frame (880/1440); o
  conteúdo à esquerda do drawer permanece visível e esmaecido.

### WIZ-THEME — diferenças claro × escuro (2b)

- **WIZ-THEME-01** Só tokens mudam. Escuro: drawer `#161E1E` sobre scrim `rgba(0,0,0,.4)`,
  borda esquerda `#324646`, sombra `--ovsh` D; nav `#0E1414`; item ativo `#161E1E` + borda
  `#243333`.
- **WIZ-THEME-02** Bolinhas de estado: ok L `#15803D` / D `#22C55E`; âmbar L `#B45309` / D
  `#FBBF24`.
- **WIZ-THEME-03** Erro: borda/texto L `#B91C1C` / D `#EF4444`.
- **WIZ-THEME-04** Wizard: barra segmentada ativa L `#14B8A6` / D `#2DD4BF`; bolinha ativa da
  trilha L `#0F766E` fundo + branco / D `#2DD4BF` fundo + `#04201D`.

---

## Discrepâncias entre fontes (registrar, não decidir aqui)

- **DISC-01** Título de página na TopBar: README §1.1 "16px/700"; canvas 2a usa **14px/700**.
- **DISC-02** `--acs` (acento forte) no escuro: README §1.3 `#14B8A6`; canvas `#2DD4BF`.
- **DISC-03** Nome de template em ação de automação: README §1.1 pede JetBrains Mono; canvas
  usa Plus Jakarta 600.
- **DISC-04** README §3.5 diz "Tabs: … Conhecimento (com contagem)" e §2 "contagem 11px
  terciário" — batem com o canvas (11px `--tx3`).
- **DISC-05** Rótulo do canvas 2b menciona "proposta unificada: drawer 72rem, trilha 260px" —
  não existe markup/PNG dela; README §3.6 registra decisão do PO de **não unificar**.

## Dependências de dado (`[dado]`) que o mock exibe

Lista: contagem "Todos · 4"; conversas ativas por agente; % resolvidas sem humano; CSAT;
etapa/edição de rascunho. Detalhe: descrição/modelo/versão; "Salvo às HH:MM"; KPIs de hoje
(conversas, % sem humano, handoffs, CSAT); texto da sugestão do sistema; versão publicada +
data. Wizard: "Rascunho salvo" (auto-save), contador de caracteres. Automação: cor da etapa
do gatilho, "Alterado há N min · não publicado".

## Contagem

AGT-SHELL 8 · AGT-LIST 13 · AGT-DET 31 · AGT-THEME 4 · AGT-WIZ 28 · AUTO-WIZ 31 ·
WIZ-THEME 4 · DISC 5 = **124 itens**.
