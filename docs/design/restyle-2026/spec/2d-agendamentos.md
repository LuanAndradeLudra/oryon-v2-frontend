# Spec visual — 2d Agendamentos

Extração Fase A (método em `AUDITORIA-NOTURNA.md`) — só referência, zero código.
Tela fora da leva do Cartógrafo (é da Bússola), extraída de propósito por quem
não a implementou, para não puxar a leitura pro que já existe.

**Fontes tentadas, em ordem de autoridade:**
1. `Oryon-Reestilizacao-canvas.html` — **inviável**: o arquivo é um bundle
   minificado numa linha só (`grep` encontra a ocorrência mas o conteúdo é
   ilegível, sem quebras). Nenhum item abaixo vem desta fonte.
2. `telas/01-2d-agendamentos.png` (claro) e `telas/02-2d-agendamentos.png`
   (escuro) — fonte primária de facto.
3. `README.md` § 3.8 (linhas 412-427) — fonte de valores exatos em px/hex
   quando o texto os declara; fonte de intenção/regra no resto.

Prefixo dos itens: `SCHED-`. Regiões: PAGE, HEADER, TOOLBAR, GRID, NOWLINE,
EVENT, POPOVER.

## PAGE (fundo geral)

1. **SCHED-PAGE-01** — Fundo da página: claro = branco/quase-branco (`#FAFAFC`
   pela paleta já estabelecida no restyle); escuro = superfície escura padrão
   do app. Fonte: PNG (estimado, cor consistente com o resto do reestilo, não
   lida em hex exato aqui).
2. **SCHED-PAGE-02** — Grade e popover flutuam sobre o fundo sem um container
   de borda externo visível ao redor de toda a área de calendário — o fundo da
   página e o fundo da grade se confundem, só as hairlines internas separam
   células. Fonte: PNG.

## HEADER (barra de título, acima do toolbar de navegação)

3. **SCHED-HEADER-01** — Título "Agendamentos": tamanho grande (~18-20px),
   peso 700, cor de texto primário (quase-preto no claro, quase-branco no
   escuro). Fonte: PNG (estimado).
4. **SCHED-HEADER-02** — Subtítulo inline ao lado do título: "27 esta semana ·
   3 aguardando confirmação", texto secundário/terciário, tamanho pequeno
   (~12-13px), peso normal, separado do título por um `·` ou espaço. Fonte:
   PNG.
5. **SCHED-HEADER-03** — Botão primário "+ Novo agendamento": fundo cor de
   marca (teal), texto branco, ícone `+` à esquerda, canto arredondado
   pequeno (raio consistente com o resto dos botões primary do app), tamanho
   de botão padrão (sm/md). Fonte: PNG.
6. **SCHED-HEADER-04** — Campo de busca (ícone lupa) à direita do botão
   primário, com atalho de teclado indicado (visível como caractere `/` no
   canto do campo). Fonte: PNG.
7. **SCHED-HEADER-05** — Ícone de notificações (sino) com badge de contagem,
   e avatar do usuário logado, ambos no canto direito extremo — mesmo padrão
   do header global do app (TopBar), não específico desta tela. Fonte: PNG.
8. **SCHED-HEADER-06** — Diferença claro×escuro: nenhuma mudança estrutural
   observada nesta região além da inversão de cor de fundo/texto padrão do
   tema. Fonte: PNG.

## TOOLBAR (barra de navegação do calendário — README declara 44px)

9. **SCHED-TOOLBAR-01** — Altura da barra: 44px. Fonte: README.
10. **SCHED-TOOLBAR-02** — Botões de navegação `‹` `›`: quadrados pequenos de
    28px, ícone centralizado, sem preenchimento no estado padrão. Fonte:
    README (tamanho) + PNG (aparência).
11. **SCHED-TOOLBAR-03** — Botão "Hoje": pílula/botão neutro pequeno, texto
    curto, imediatamente à direita dos botões de navegação. Fonte: PNG.
12. **SCHED-TOOLBAR-04** — Rótulo do período ("15 – 21 de setembro"): 14px,
    peso 700. Fonte: README.
13. **SCHED-TOOLBAR-05** — Rótulo da granularidade ("semana"), ao lado do
    período: cor terciária, peso normal, tamanho menor que o período (~11px).
    Fonte: README (menciona "semana em terciário") + PNG.
14. **SCHED-TOOLBAR-06** — SegmentedControl "Dia / Semana / Lista": pílula de
    3 opções, opção ativa com fundo destacado (contraste sutil), as outras
    neutras — mesmo vocabulário de SegmentedControl usado em outras telas do
    reestilo. Fonte: README + PNG.
15. **SCHED-TOOLBAR-07** — Dropdown "Todos os agentes ⌄": filtro por agente,
    à direita do SegmentedControl. Fonte: PNG.
16. **SCHED-TOOLBAR-08** — Dropdown "Tipo ⌄": filtro por tipo de evento, mais
    à direita, último elemento da toolbar. Fonte: PNG + README ("filtros de
    agente e tipo").
17. **SCHED-TOOLBAR-09** — A barra inteira tem um `border-bottom` de 1px
    separando-a da grade abaixo (mesma hairline usada em toda a UI para
    separar barras de filtro do conteúdo). Fonte: PNG (estimado, consistente
    com o padrão do resto do app).
18. **SCHED-TOOLBAR-10** — Diferença claro×escuro: cor de fundo da barra
    acompanha a superfície do tema; nenhuma mudança de layout. Fonte: PNG.

## GRID (grade semanal)

19. **SCHED-GRID-01** — `grid-template-columns: 56px repeat(7, 1fr)` — coluna
    fixa de horários (56px) + 7 colunas de dias iguais. Fonte: README.
20. **SCHED-GRID-02** — `grid-template-rows: 44px repeat(9, 1fr)` — linha de
    cabeçalho de 44px + 9 linhas de hora (08h–16h, 9 slots visíveis na tela
    sem rolar). Fonte: README.
21. **SCHED-GRID-03** — Cabeçalho de cada dia: sigla do dia da semana ("SEG",
    "TER"...) em 11px, peso 600, uppercase, tracking levemente aberto. Fonte:
    README.
22. **SCHED-GRID-04** — Abaixo da sigla, o número do dia ("15", "16"...) em
    14px, peso 600. Fonte: README.
23. **SCHED-GRID-05** — Coluna do dia atual ("hoje", TER 16 no mockup): fundo
    com tingimento em cor de acento suave, cobrindo a coluna inteira (cabeçalho
    + todas as células abaixo), visível nos dois temas com intensidade baixa
    o bastante pra não competir com os eventos. Fonte: README + PNG.
24. **SCHED-GRID-06** — Rótulo "HOJE" dentro do cabeçalho da coluna atual:
    10px, peso 700, cor de acento (mesma família do tingimento de fundo).
    Fonte: README.
25. **SCHED-GRID-07** — Colunas de fim de semana (SÁB/DOM): fundo no token
    `--sf2` (fundo de rail/nav secundário), distinguindo-as visualmente dos
    dias úteis sem crítica visual forte. Fonte: README.
26. **SCHED-GRID-08** — Hairlines nos dois eixos: linhas finas de 1px
    separando cada célula de hora × dia, formando a grade completa. Fonte:
    README + PNG.
27. **SCHED-GRID-09** — Rótulo de hora ("08:00", "09:00"...) na coluna fixa
    à esquerda: 10.5px, cor terciária, alinhado à direita (colado à borda da
    célula seguinte). Fonte: README.
28. **SCHED-GRID-10** — Rótulos de hora ficam alinhados ao TOPO de cada célula
    de hora (a hora "09:00" marca o início do slot, não o centro). Fonte: PNG.
29. **SCHED-GRID-11** — Diferença claro×escuro: hairlines mais claras/sutis no
    escuro (baixo contraste line-on-dark) e mais definidas no claro (linha
    cinza sobre branco); tingimento de "hoje" e `--sf2` de fim de semana
    mudam de tom mas mantêm o mesmo papel semântico nos dois temas. Fonte:
    PNG (estimado).

## NOWLINE (linha do agora)

30. **SCHED-NOWLINE-01** — Linha horizontal de 2px, cor de perigo (vermelho),
    cruzando a largura da coluna do dia atual na altura correspondente à hora
    corrente. Fonte: README.
31. **SCHED-NOWLINE-02** — Bolinha de 8px na cor de perigo, centrada no início
    (extremidade esquerda) da linha, marcando visualmente o ponto exato.
    Fonte: README.
32. **SCHED-NOWLINE-03** — A linha aparece SOMENTE na coluna de hoje — nas
    demais colunas do mesmo grid não há marcação de hora atual. Fonte:
    README.
33. **SCHED-NOWLINE-04** — Confirmado no PNG (claro e escuro): a linha atravessa
    horizontalmente por cima dos eventos da coluna, sem interromper sua
    visibilidade — fica por cima, não atrás. Fonte: PNG.

## EVENT (card de evento na grade)

34. **SCHED-EVENT-01** — Posicionamento: absoluto sobre a grade (`position:
    absolute`), dimensionado pela duração do evento em pixels proporcionais
    à grade de horas. Fonte: README.
35. **SCHED-EVENT-02** — Raio do card: 6px. Fonte: README.
36. **SCHED-EVENT-03** — Fundo do card: cor de superfície (mesma superfície
    do tema, não uma cor própria do evento). Fonte: README.
37. **SCHED-EVENT-04** — Borda: 1px, cor neutra/de ênfase padrão (mesma
    borda usada em outros cards do app). Fonte: README.
38. **SCHED-EVENT-05** — `border-left` de 3px, na cor do agente OU do tipo do
    evento (dado — cada evento carrega uma cor própria vinda do backend, não
    é uma paleta fixa de 2-3 cores). Fonte: README.
39. **SCHED-EVENT-06** — Padding interno: `5px 8px`. Fonte: README.
40. **SCHED-EVENT-07** — Título do evento ("Demo · Mariana Costa"): 11.5px,
    peso 600. Fonte: README.
41. **SCHED-EVENT-08** — Linha de detalhe abaixo do título ("10:00 – 11:30 ·
    Ana Nunes"): cor secundária, tamanho menor que o título (~10-10.5px,
    estimado por proporção no PNG). Fonte: README (menciona "linha de
    detalhe secundária") + PNG (tamanho exato).
42. **SCHED-EVENT-09** — Chip de status opcional, 16px de altura, aparece
    quando o evento tem um status a comunicar (ex.: "Confirmado" em verde,
    "Aguardando confirmação" em âmbar) — visto nos cards "Demo · Mariana
    Costa" (verde "Confirmado") e "Retorno · Beatriz Fonseca" (âmbar
    "Aguardando confirmação") no PNG. Fonte: README (tamanho) + PNG (cores e
    condição de aparecer).
43. **SCHED-EVENT-10** — Estado selecionado: borda passa a cor de acento +
    anel (`ring`) de 3px ao redor do card inteiro — visto no card "Demo ·
    Mariana Costa · Acme" nos dois PNGs (com o popover de detalhe aberto ao
    lado). Fonte: README + PNG.
44. **SCHED-EVENT-11** — Estado cancelado: opacidade reduzida a .55 + texto
    com `line-through` (tachado) — visto no card "Demo · Eduardo Martins ...
    cancelado pelo contato" nos dois PNGs, mais apagado que os demais e com
    o texto riscado. Fonte: README + PNG.
45. **SCHED-EVENT-12** — Bloco de campanha (ex.: envio em massa, não reunião
    1:1): borda tracejada em vez de sólida, e SEM a faixa `border-left`
    colorida de agente/tipo (já que não pertence a um agente específico).
    Fonte: README.
46. **SCHED-EVENT-13** — Cards de eventos adjacentes na mesma coluna/faixa de
    horário aparecem lado a lado, dividindo a largura da coluna (visto na
    coluna QUI 18 do PNG com dois eventos simultâneos às 11h). Fonte: PNG.
47. **SCHED-EVENT-14** — Diferença claro×escuro: a cor de superfície do card
    e a cor da borda acompanham o tema; a faixa `border-left` colorida (dado)
    e os chips de status mantêm a MESMA cor nos dois temas (são dado, não
    token de UI) — confirmado comparando os dois PNGs lado a lado (ex.: chip
    verde "Confirmado" idêntico nos dois). Fonte: PNG.

## POPOVER (detalhe do evento, ao clicar/selecionar)

48. **SCHED-POPOVER-01** — Largura: 300px. Fonte: README.
49. **SCHED-POPOVER-02** — Raio: 8px. Fonte: README.
50. **SCHED-POPOVER-03** — Sombra: `--shadow-overlay` (mesmo token de sombra
    usado em outros overlays flutuantes do app — dropdown, tooltip, modal).
    Fonte: README.
51. **SCHED-POPOVER-04** — Cabeçalho: quadradinho de 10px na cor do tipo do
    evento (mesmo princípio de cor-por-dado do `border-left` do card), ao
    lado do título. Fonte: README.
52. **SCHED-POPOVER-05** — Título do popover ("Demo · Mariana Costa"): 14px,
    peso 700. Fonte: README.
53. **SCHED-POPOVER-06** — Ícone de menu "···" no canto superior direito do
    popover (ações extras) — visto nos dois PNGs. Fonte: PNG.
54. **SCHED-POPOVER-07** — Linha de subtítulo abaixo do título ("Ter, 16 set
    · 10:00 – 11:30 · Google Meet"): cor secundária, tamanho pequeno. Fonte:
    PNG.
55. **SCHED-POPOVER-08** — Corpo em grid de 2 colunas, `82px | 1fr` (rótulo à
    esquerda, valor à direita) — campos observados no PNG: "Contato" (valor
    em cor de link/acento — "Mariana Costa · Acme Ltda"), "Responsável"
    (valor com avatar circular pequeno + nome — "Ana Nunes"), "Origem" (chip
    colorido — "Agente Vendas", laranja/âmbar), "Status" (chip verde —
    "Confirmado pelo contato"). Fonte: README (grid) + PNG (campos e chips
    exatos).
56. **SCHED-POPOVER-09** — Rótulos do grid (Contato/Responsável/Origem/
    Status): cor terciária, tamanho pequeno (~11-12px, estimado). Fonte: PNG
    (estimado).
57. **SCHED-POPOVER-10** — Rodapé do popover, separado do corpo por hairline:
    3 ações — "Abrir conversa" (primary, sm), "Reagendar" (neutral, sm),
    "Cancelar" (ghost, em cor de perigo/vermelho). Fonte: README.
58. **SCHED-POPOVER-11** — Ordem das 3 ações no rodapé, da esquerda pra
    direita: Abrir conversa → Reagendar → Cancelar (confirmado nos dois
    PNGs, mesma ordem nos dois temas). Fonte: PNG.
59. **SCHED-POPOVER-12** — O popover aparece ANCORADO ao lado do card
    selecionado na grade (não centralizado na tela como um modal) — visto
    nos dois PNGs, popover encostado à direita do card "Demo · Mariana
    Costa · Acme". Fonte: PNG.
60. **SCHED-POPOVER-13** — Diferença claro×escuro: fundo do popover
    acompanha a superfície elevada do tema (mais clara que o fundo da
    página no claro, mais clara que a grade no escuro); chips de status/
    origem mantêm cor idêntica nos dois temas (mesmo princípio do item
    EVENT-14). Fonte: PNG.
61. **SCHED-POPOVER-14** — Condição de aparecer: só existe quando um evento
    está selecionado/clicado — nos dois PNGs aparece exatamente 1 popover
    aberto, ancorado a exatamente 1 card (o mesmo card em estado
    "selecionado", ver EVENT-10). Fonte: PNG.

**Total: 61 itens.**
