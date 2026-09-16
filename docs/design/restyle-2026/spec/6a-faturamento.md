# Spec — 6a Plano & Faturamento

Extração pura (Fase A da auditoria noturna, `AUDITORIA-NOTURNA.md`). Fontes: PNG
`telas/01-6a-plano-faturamento.png` (claro) e `telas/02-6a-plano-faturamento.png`
(escuro) + README.md § 3.11. **`Oryon-Reestilizacao-canvas.html` não rendeu texto
utilizável** — é um bundle de página única com o HTML de referência embutido como
string JSON-escapada dentro de uma única linha (382) de dezenas de KB; uma
tentativa de desescapar via `JSON.parse` falhou (aspas internas não-escapadas
quebram a extração ingênua) e o grep direto por texto visível ("Faturamento",
"Upgrade", etc.) não retorna nada utilizável por não haver o texto renderizado
como HTML puro no arquivo. Nenhum valor abaixo vem dessa fonte; todo item
marcado "HTML" na verdade não existe aqui — a fonte mais precisa disponível foi
o README (valores exatos de px/peso já documentados em texto) e o PNG.
Zero avaliação de código-fonte nesta extração — isso é Fase B, de outro agente.

Nesta tela **não há elementos "hover/ativo" interativos óbvios além dos botões**
(é uma tela de leitura/configuração, não uma lista) — os estados aplicáveis são
sobretudo "normal" e os 2 temas.

## PAGE — Página / gramática geral

- **PAGE-01** — Fundo da página: mesmo tom de superfície do resto de
  Configurações ("mesma gramática", README l.516) — sem cards/caixas
  envolvendo as seções. Fonte: README.
- **PAGE-02** — Breadcrumb "Administração / Plano & faturamento", texto pequeno
  (~11-12px), cor terciária, separador "/" também terciário. Fonte: PNG (estimado).
- **PAGE-03** — Título "Plano & Faturamento": ~20-22px, peso 700/800, cor de
  texto primária (quase preto no claro / quase branco no escuro). Fonte: PNG (estimado).
- **PAGE-04** — Subtítulo "Assinatura, créditos de IA e histórico de pagamentos.":
  ~13px, peso 400, cor secundária, logo abaixo do título. Fonte: PNG (estimado).
- **PAGE-05** — Espaçamento vertical generoso entre PAGE-03/04 e o Banner de
  ativação (bloco 1) — ~20-24px. Fonte: PNG (estimado).
- **PAGE-06** — Alerta laranja/âmbar no topo da TopBar ("Nenhum setor
  cadastrado" + botão "Criar setor") — elemento GLOBAL do shell (TopBar), não
  específico desta tela; presente nos 2 temas, mesma posição. Fora do escopo
  desta spec (pertence à tela de Shell, `7a`) — só registrado pra não ser
  confundido com algo de Faturamento. Fonte: PNG.
- **PAGE-07** — Nenhum "card" (`border-radius` + fundo elevado + sombra)
  envolvendo as 4 seções principais (Plano atual / Limites / Upgrade / rail) —
  elas se separam por espaçamento vertical e, no caso da tabela de Upgrade, por
  UMA borda compartilhada (ver UPGRADE-01). Fonte: README ("mesma gramática de
  Configurações, sem cards") + PNG (confirma visualmente).

## BANNER — Banner de ativação

- **BANNER-01** — Container: borda de cor de acento (1px), fundo em acento
  suave (tint muito claro do teal/brand), `border-radius` pequeno (~8px, mesma
  família dos outros containers "sf2"-like da fundação). Ocupa a largura da
  coluna principal (não a página inteira — a lista "Nesta página" à direita
  fica FORA do banner). Fonte: README (borda+fundo acento) + PNG (raio, largura).
- **BANNER-02** — Ícone à esquerda: raio/relâmpago (⚡), 18px, cor de acento
  (teal), dentro de um pequeno tile circular/quadrado com fundo acento mais
  forte que o do banner. Fonte: README (18px) + PNG (forma do tile).
- **BANNER-03** — Título "Ative sua assinatura": 13px, peso 600 (semibold),
  cor de texto escura/forte mesmo sobre o fundo suave (não usa a cor de acento
  no texto, só no ícone/borda). Fonte: README (13px/600) + PNG (cor).
- **BANNER-04** — Texto de corpo "Você está em um período de avaliação.
  Contrate o plano Start para manter os agentes ativos após 30 set.": 12px,
  peso 400, cor secundária, logo abaixo do título, mesma largura do banner
  (quebra em 1 linha nesta resolução). Fonte: README (12px).
- **BANNER-05** — Botão "Contratar Start": variant primary, altura 32px, canto
  arredondado pequeno (raio de botão padrão da fundação), alinhado à direita
  do banner, centralizado verticalmente com o bloco de texto. Fonte: README (32px, primary).
- **BANNER-06** — Diferença claro×escuro: no claro o fundo do banner é um teal
  bem claro quase branco com leve tint; no escuro é um teal muito escuro
  (quase preto com tint verde) — a BORDA de acento mantém saturação similar
  nos 2 temas (funciona como "moldura" que não lava). Fonte: PNG (estimado).
- **BANNER-07** — O banner é condicional: só aparece com assinatura em
  avaliação/trial (implícito pelo texto "período de avaliação... após 30 set").
  Fora desse estado (plano pago ativo), presume-se que o banner não aparece —
  não há evidência visual de um estado alternativo nas 2 imagens capturadas
  (só o estado "em trial" foi mockado). Fonte: PNG + inferência textual.

## PLAN — Plano atual

- **PLAN-01** — Eyebrow "Plano atual": ~10-11px, uppercase, tracking largo,
  cor terciária, acima do card/bloco. Fonte: PNG (estimado, consistente com o
  vocabulário de eyebrow já usado em outras telas do reestilo).
- **PLAN-02** — Tile de ícone à esquerda do nome do plano: 36px (quadrado ou
  levemente arredondado), fundo em acento suave, ícone de raio/relâmpago (⚡)
  central, cor de acento. Fonte: README (36px, acento suave).
- **PLAN-03** — Nome do plano "Oryon Start": 16px, peso 700, cor de texto
  primária, à direita do tile. Fonte: README (16px/700).
- **PLAN-04** — Chip de avaliação "Avaliação · 14 dias restantes": pílula
  pequena, fundo âmbar suave, texto âmbar, ~10-11px peso 500/600, ao lado do
  nome do plano na mesma linha. Fonte: README (chip âmbar) + PNG (formato pílula).
- **PLAN-05** — Subtítulo "Assinatura, ciclo de cobrança e consumo de créditos
  de IA.": ~12px, cor secundária, abaixo do nome/chip — repete quase o mesmo
  texto do subtítulo da página (redundância aparente no mock, ou é o
  subtítulo específico do BLOCO "Plano atual", não da página). Fonte: PNG.
- **PLAN-06** — Segunda linha de metadados: "Cobrança mensal · ≈ 1.000
  atendimentos/mês · próximo ciclo 01 out" — texto pequeno (~11.5-12px),
  cor terciária, itens separados por "·". Fonte: PNG (estimado) + README (padrão "·").
- **PLAN-07** — Preço "R$ 1.497": alinhado à direita do bloco, tamanho grande
  (22px), peso 800 (extra-bold), números tabulares (alinhamento de dígitos).
  Fonte: README (22px/800 tabular).
- **PLAN-08** — Unidade "/mês" junto ao preço: 11.5px, cor secundária/terciária,
  peso normal, imediatamente após o valor. Fonte: README (11.5px).
- **PLAN-09** — Bloco "Créditos de IA" — eyebrow/rótulo "Créditos de IA
  utilizados": ~11px, cor terciária, acima da barra. Fonte: PNG (estimado).
- **PLAN-10** — Números do consumo "63,67 / 1.000 · 6%": os números (63,67,
  1.000, 6%) em peso 700 (negrito), o resto ("/", "·", "%") em peso normal —
  contraste tipográfico dentro da mesma linha. Fonte: README ("números em 700").
- **PLAN-11** — Trilha (track) da barra de créditos: altura 6px, com BORDA
  (1px) e `border-radius` de 3px (pílula quase-reta, raio pequeno igual à
  metade da altura). Fonte: README (6px, borda, raio 3px).
- **PLAN-12** — Preenchimento da barra de créditos: cor de acento (teal/brand),
  largura proporcional ao % consumido (6% neste exemplo — visualmente quase
  vazia). Fonte: README ("preenchimento em acento") + PNG (proporção).
- **PLAN-13** — Nota de rodapé da barra, coluna esquerda: "1 crédito = 1
  atendimento (~7.000 tokens). Não acumulam entre períodos." — texto pequeno
  (~11px), cor terciária, quebra em 2 linhas. Fonte: PNG.
- **PLAN-14** — Nota de rodapé da barra, coluna direita: "Renova em 15 dias"
  — 11.5px, cor terciária, alinhado à direita (mesma linha de base da nota
  esquerda, mas coluna oposta). Fonte: README (11.5px terciário).
- **PLAN-15** — Diferença claro×escuro: o bloco "Plano atual" não parece ter
  fundo/borda própria em NENHUM dos 2 temas (é texto solto sobre o fundo da
  página, sem card) — confirma a gramática "zero cards" também aqui, não só
  nas seções abaixo. Fonte: PNG (estimado).
- **PLAN-16** — Espaçamento entre PLAN (bloco "Plano atual") e a seção
  "Limites do plano": ~24-28px, maior que o espaçamento interno de cada seção
  — funciona como separador visual sem precisar de linha divisória. Fonte: PNG (estimado).

## LIMITS — Limites do plano

- **LIMITS-01** — Cabeçalho da seção "Limites do plano": mesmo padrão de
  título de seção (~14-15px, peso 600/700) + subtítulo "Recursos incluídos.
  Uso atual à esquerda, limite à direita." (~12px, cor secundária), igual ao
  padrão de `SettingsSection` (rótulo + descrição). Fonte: PNG + README (texto).
- **LIMITS-02** — Layout de cada linha: grid de 3 colunas, proporção
  aproximada `1fr 160px 90px` — coluna 1 = ícone+rótulo, coluna 2 = mini-barra,
  coluna 3 = "uso/limite" numérico alinhado à direita. Fonte: README (grid
  `1fr 160px 90px`).
- **LIMITS-03** — Altura de cada linha: 36px. Fonte: README.
- **LIMITS-04** — Ícone à esquerda do rótulo em cada linha: 14px, cor
  secundária/terciária, um ícone distinto por tipo de recurso (raio para
  créditos, pessoa para usuários, telefone para números, robô para agentes,
  engrenagem/fluxo para automações, chat para Copilot). Fonte: README (14px) +
  PNG (ícones distintos por linha).
- **LIMITS-05** — Rótulo textual de cada linha ("Créditos de IA / mês",
  "Usuários", "Números WhatsApp", "Agentes de IA", "Automações ativas",
  "Interações Copilot / mês"): ~13px, peso 400/500, cor de texto secundária/
  primária. Fonte: PNG.
- **LIMITS-06** — Mini-barra de progresso (coluna 2): altura 4px, cantos
  arredondados (pílula), trilha em cor neutra clara/escura conforme tema,
  preenchimento colorido conforme proximidade do limite. Fonte: README (4px).
- **LIMITS-07** — Cor do preenchimento da mini-barra — estado NORMAL (longe do
  limite): teal/acento (linhas "Créditos de IA" e "Automações ativas" no
  exemplo, ambas com barra bem curta = uso baixo). Fonte: PNG.
- **LIMITS-08** — Cor do preenchimento da mini-barra — estado "NO TETO"
  (uso = limite, ex. "Usuários 3/3", "Números WhatsApp 1/1", "Agentes de IA
  1/1"): laranja/âmbar sólido, barra CHEIA (100%). Fonte: README ("limite no
  teto pinta a barra e o número em âmbar") + PNG (3 linhas em laranja).
- **LIMITS-09** — Número "uso/limite" (coluna 3, ex. "64/1.000", "3/3",
  "1/1", "2/5", "12/50"): tabular, alinhado à direita, cor acompanha a barra
  — cinza/neutro quando normal, ÂMBAR quando no teto (mesma cor do
  preenchimento da barra nesse estado). Fonte: README (número em âmbar no teto).
- **LIMITS-10** — Espaçamento vertical entre as 6 linhas de limite: pequeno e
  uniforme (~4-8px), sem divisórias (`border-b`) visíveis entre elas nas
  capturas — a altura de 36px por linha já dá a separação. Fonte: PNG (estimado).
- **LIMITS-11** — Nenhuma borda/fundo envolvendo o bloco de 6 linhas (mais uma
  confirmação da gramática "zero cards"). Fonte: PNG.

## UPGRADE — Tabela de upgrade

- **UPGRADE-01** — Container: UMA borda envolvendo as 3 colunas (Start / Pro /
  Business) — não são 3 cards separados, é uma única superfície com
  divisórias internas entre colunas. `border-radius` pequeno (~8-10px) no
  container externo. Fonte: README ("uma tabela de 3 colunas dentro de UMA
  borda, não três cards").
- **UPGRADE-02** — Cabeçalho da seção "Upgrade" + texto "3 limites no teto. O
  Pro libera usuários, números e agentes.": mesmo padrão título+subtítulo de
  LIMITS-01, acima da tabela. Fonte: PNG.
- **UPGRADE-03** — Divisórias entre as 3 colunas: linha vertical 1px, mesma
  cor de borda do container externo. Fonte: PNG (estimado).
- **UPGRADE-04** — Coluna "Start" (plano atual): fundo `--sf2` (token de
  fundo de rail/superfície secundária) — visualmente um pouco mais escuro/
  diferenciado que o fundo da página, sem borda própria adicional (só o fundo
  já marca "este é o atual"). Fonte: README (fundo `--sf2`).
- **UPGRADE-05** — Rótulo "Start · atual" no topo da coluna 1: nome do plano
  + qualificador "atual" em cor terciária, tamanho menor que o nome (~11-12px
  pro qualificador). Fonte: PNG.
- **UPGRADE-06** — Coluna "Pro" (recomendado): destaque via `inset 0 2px 0`
  acento — uma linha de 2px na cor de acento colada na borda TOPO (dentro do
  container, "inset"), efeito de "sublinhado invertido"/barra superior de
  destaque. Fonte: README ("inset 0 2px 0 acento").
- **UPGRADE-07** — Chip "Recomendado" na coluna Pro: pílula pequena, fundo
  acento suave, texto em cor de acento, ~10px peso 600, ao lado do nome do
  plano. Fonte: PNG (posição/formato) + README (menciona o chip).
- **UPGRADE-08** — Coluna "Business" (terceiro plano): sem destaque especial
  — mesmo fundo da página (sem o `--sf2` da coluna 1, sem o inset da coluna 2).
  Fonte: README (implícito, só as colunas 1 e 2 têm tratamento especial) + PNG.
- **UPGRADE-09** — Preço de cada coluna (ex. "R$ 1.497", "R$ 2.997", "R$
  5.997"): 18px, peso 800, seguido de "/mês" em tamanho menor e peso normal
  na mesma linha. Fonte: README (18px/800).
- **UPGRADE-10** — Lista de features por coluna (ex. "1.000 créditos · 3
  usuários", "1 número · 1 agente" para Start; "3.000 créditos · 10 usuários",
  "3 números · 5 agentes" para Pro; "10.000 créditos · ilimitado", "10
  números · 20 agentes" para Business): texto pequeno (~12px), cor
  secundária, 2 linhas por coluna, itens separados por "·". Fonte: PNG.
- **UPGRADE-11** — CTA da coluna Pro: "Mudar para Pro" — botão primary,
  largura total da coluna (full-width dentro da célula), alinhado na base do
  bloco. Fonte: README (CTA primary) + PNG (full-width).
- **UPGRADE-12** — CTA da coluna Business: "Falar com vendas" — botão
  neutral (mesma largura/altura do botão primary da coluna Pro, só a cor/
  variante muda). Fonte: README (CTA neutral) + PNG.
- **UPGRADE-13** — Coluna Start (atual) NÃO tem botão de CTA — faz sentido
  (já é o plano vigente, não há ação "mudar para" o próprio plano). Fonte: PNG.
- **UPGRADE-14** — Padding interno de cada célula/coluna: generoso, uniforme
  entre as 3 colunas (~16-20px). Fonte: PNG (estimado).
- **UPGRADE-15** — Diferença claro×escuro do destaque "Recomendado": a linha
  `inset` de topo e o chip mantêm a MESMA cor de acento saturada nos 2 temas
  (não dessatura no escuro) — o que muda é o fundo da coluna 1 (`--sf2`), que
  no claro é um cinza muito claro e no escuro é um cinza-azulado escuro.
  Fonte: PNG (estimado).

## OUTLINE — "Nesta página" (rail direito)

- **OUTLINE-01** — Eyebrow "NESTA PÁGINA": uppercase, ~10px, tracking largo,
  cor terciária, no topo do rail. Fonte: PNG (consistente com o padrão já
  confirmado em Configurações/`SettingsOutline`).
- **OUTLINE-02** — Itens da lista: "Plano atual", "Limites do plano",
  "Upgrade", "Créditos avulsos", "Extrato" — 5 itens, um por seção da página
  (os 2 últimos, "Créditos avulsos" e "Extrato", não aparecem na dobra
  capturada no PNG — presume-se que existem mais seções abaixo do que o
  screenshot mostra). Fonte: PNG.
- **OUTLINE-03** — Item ativo/atual (o que corresponde à seção visível no
  topo do viewport, "Plano atual" nas 2 capturas): cor de texto mais forte
  (quase branco/preto conforme tema) + uma marcação lateral (traço vertical
  fino à esquerda do texto, na cor de acento) — mesmo padrão de indicador
  lateral usado em outras listas do app. Fonte: PNG.
- **OUTLINE-04** — Itens inativos: cor terciária, sem marcação lateral,
  ~12px, peso 400. Fonte: PNG (estimado).
- **OUTLINE-05** — Rail é sticky/fixo (README documenta esse comportamento em
  outras telas de Configurações via `SettingsOutline` — presume-se igual
  aqui dado o mesmo "gramática de Configurações"). Fonte: README (por
  analogia com 3.9) + PNG (posição consistente com scroll da página).
- **OUTLINE-06** — Largura do rail: estreita (~140-160px), alinhada à direita
  da página, com margem/gutter em relação ao conteúdo principal. Fonte: PNG (estimado).

**Total: 51 itens.**
