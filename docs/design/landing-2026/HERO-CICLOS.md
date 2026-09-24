# Hero — registro de ciclos (noite de 24→25/09/2026)

Formato por ciclo, conforme pedido do PO: **problema · hipótese · mudança ·
evidência · resultado · próximo gap**. Medições ao vivo no portal Maestri
(`localhost:3011`), viewport 1440×901 salvo indicação em contrário.

Capturas de tela não estão disponíveis nesta sessão: `maestri portal
screenshot` devolve *"the page is not rendering (its window may be
minimized)"*. Toda evidência abaixo é medida por `getBoundingClientRect` /
`getComputedStyle` / `innerText` na página viva, que é o método já adotado no
projeto e não depende da janela estar à frente.

---

## Estado de partida (fim da rodada anterior)

Cinco "frames" de uma tela só (Conversas), painel do contato sempre aberto,
progressão visível quase só em etiquetas e linhas de Timeline, legenda
explicando o que a interface não mostrava. `HeroRealScreen` já montava
`ConversationList` + `ChatHeader` + `MessageList` + `MessageInput` +
`ContactPanel` de produção — essa conquista foi preservada inteira.

---

## Ciclo 1 — a história atravessa duas telas

**Problema.** A movimentação do negócio era descrita em texto; o card no funil
nunca aparecia. Não havia transição entre Conversas e Funis. Situação do
contato, status da conversa, etiqueta e etapa do negócio não estavam
diferenciados.

**Hipótese.** Enquanto a operação couber numa tela só, a legenda continuará
fazendo o trabalho que a interface deveria fazer. A história precisa de duas
vistas do MESMO registro.

**Mudança.**
- `heroMoments.ts` — sete momentos (`demanda · atende · painel · proposta ·
  funis · avanca · resultado`), cada um com tela, estado do painel, legenda e
  permanência. Tabela explícita de qual dos quatro conceitos muda em qual
  momento.
- `heroRealData.ts` reescrito como **fonte única**: contato, conversa,
  situação, etiquetas, mensagens, atividades, funil, etapas e negócio saem
  todos daqui, derivados do momento. O card do quadro é o mesmo objeto `Deal`
  que o painel mostra — não há segundo conjunto de dados.
- `HeroFunisScreen.tsx` — o `DealsBoard` **de produção**. É prop-only e não
  importa `services/` nem `contexts/`; contagem e soma de cada coluna são
  derivadas dos negócios recebidos, pelo mesmo código do app.
- `HeroPanelDeals.tsx` — a seção NEGÓCIOS do painel com o `DealSummary` real
  (densidade `row`), porque o `ContactPanelDeals` de produção renderiza `null`
  sem o flag `FF_MULTI_PIPELINE` do `/auth/me`.
- `ContactPanel` ganhou `stagesOverride` e `dealsSlot` (além de
  `timelineEntries`, da rodada anterior). São costuras de DADOS: o componente
  continua único e a implementação de produção intocada.

**Evidência.** Sequência completa medida ao vivo, um ciclo inteiro:

| momento | colunas (px) | janela |
|---|---|---|
| 01 demanda | 360 · 830 | Conversas |
| 02 atende | 360 · 830 | Conversas |
| 03 painel | 360 · 522 · 308 | Conversas |
| 04 proposta | 360 · 522 · 308 | Conversas |
| 05–07 funis | 1190 | Funis |

**Resultado.** A operação atravessa as duas telas com o mesmo negócio, e o
título da janela acompanha a tela exibida.

**Próximo gap.** Provar que o card realmente percorre a distância entre as
colunas, em vez de sumir e reaparecer.

---

## Ciclo 2 — o painel abre em vez de estar sempre aberto

**Problema.** Com as três regiões abertas desde o primeiro quadro, a conversa
ficava com ~400px e a demanda — a primeira coisa a ser lida — perdia o palco.

**Hipótese.** A abertura do painel é, ela mesma, um momento da história: uma
redistribuição de espaço do produto.

**Mudança.** `panelOpen` por momento; a coluna entra animando `width`
(0 → 308) em 720ms com `cubic-bezier(.32,.72,0,1)`, e o conteúdo interno fica
travado em 308px para o painel não se reflowar durante o movimento (sem isso o
cabeçalho se espreme e as linhas quebram no meio do caminho). Além disso o
palco ficou mais largo que a coluna de texto a partir de `xl`
(`max-w-[1240px]`), porque travado em 1120 sobrava pouco para a conversa
justamente quando o painel abre.

**Evidência.** Conversa a 830px com o painel fechado e 522px com ele aberto,
contra 402px na versão anterior. Nenhum `overflow-x` no corpo do quadro em
nenhum dos sete momentos.

**Resultado.** A demanda é legível no primeiro quadro; a abertura lê como
mudança de layout.

**Próximo gap.** Temas claro/escuro e larguras menores.

---

## Ciclo 3 — reprodução: três defeitos, um deles do produto

**Problema 1 (relatado pelo PO).** Ao pausar, os controles sumiam.
**Causa.** `mode === 'live'` governava ao mesmo tempo a capacidade de animar e
o estado de reprodução; pausar derrubava o gate que desenhava o botão de
retomar.
**Mudança.** `useHeroSequence.ts` separa cinco sinais independentes —
`canAnimate`, `inView`, `tabVisible`, `paused`, `index`. Os controles dependem
só de `canAnimate`.

**Problema 2 (relatado pelo PO).** Fora da viewport a cena pulava para o
resultado e voltava atrás ao reaparecer.
**Mudança.** Sair da viewport agora SUSPENDE preservando o índice. O quadro
final só é forçado quando não há capacidade de animar (reduced motion), que é o
caso em que ele é o estado estático compreensível.

**Problema 3 (achado na medição, e é um defeito de produto).** A sequência
congelava sozinha no momento 2. Medido: o palco estava em `top: -470` numa
viewport de 901px — **a página tinha rolado sozinha 470px**.
**Causa.** `MessageList.smoothScrollToBottom` usava
`bottomRef.scrollIntoView({behavior:'smooth'})`, que rola TODOS os ancestrais
roláveis. Dentro do `AppShell` a página não rola e o efeito é inócuo; fora
dele, arrasta a landing inteira quando a resposta da IA chega.
**Mudança.** Passou a rolar o próprio contêiner
(`el.scrollTo({top: el.scrollHeight, behavior:'smooth'})`). Mesmo resultado
visual, sem efeito colateral em ancestral. Corrigido no componente de
produção, não contornado no Hero.

**Problema 4 (ambiente).** O `IntersectionObserver` do navegador embutido do
portal ora não responde, ora responde `isIntersecting:false` para um elemento
inteiramente dentro da viewport — o palco ficava congelado.
**Mudança.** Quando observador e geometria discordam, vale a geometria
(`getBoundingClientRect`, uma vez por mudança de interseção, não por quadro).
Num navegador comum os dois nunca discordam; em webview que suspende a
composição, isto é a diferença entre tocar e não tocar.

**Evidência.** Ciclo completo com `data-hero-running=true` e `top=347` estável
nos nove pontos amostrados, passando por 01→07 e voltando a 01.

**Próximo gap.** Verificar pausa/retomada/replay por clique, reduced motion,
ausência de rede, temas e mobile.

---

## Ciclo 4 — isolamento de dados

**Problema.** Callbacks no-op não garantem ausência de rede. Era preciso
provar, não supor.

**Hipótese.** Alguma coisa montada busca na montagem.

**Mudança e evidência.** Instrumentei `fetch`, `XMLHttpRequest.open` e
`WebSocket` na página viva e observei um ciclo inteiro. Achado real:

```
xhr GET http://localhost:3000/api/canned-responses?page=1&limit=100
xhr GET http://localhost:3000/api/canned-responses?page=1&limit=100
```

Duas chamadas por ciclo — `MessageInput` carrega as respostas rápidas na
montagem, e a tela remonta ao trocar Conversas ↔ Funis. Sem sessão, as duas só
podiam voltar 401.

**Correção.** `MessageInput` ganhou a prop `demo`, que desliga esse único
efeito de montagem. A fronteira ficou explícita no componente, em vez de
escondida atrás de um callback vazio.

**Resultado.** Novo ciclo completo instrumentado: **0 chamadas**. Confirmado
por outra via, independente da minha instrumentação — a Resource Timing API da
própria página não lista **nenhum** recurso de `/api/` desde o carregamento:

```js
performance.getEntriesByType('resource').filter(r => r.name.includes('/api/'))  // []
```

**Próximo gap.** Fronteira de teclado.

---

## Ciclo 5 — o palco era navegável por teclado

**Problema.** O PO avisou: *"não dependa de `aria-hidden` ou
`pointer-events:none` para impedir efeitos de rede ou foco por teclado"*.
Medido: **43 elementos focáveis** dentro da moldura decorativa — botões da
barra de filtros, o campo de mensagem, os cards do quadro. Quem navega por
teclado cairia em 43 paradas mortas no meio da landing. E `aria-hidden` sobre
conteúdo focável é, por si só, uma violação de ARIA.

**Mudança.** `inert` no `StageFrame` (vale para o Hero e para os posters do
login e das seções).

**Evidência.** `b.focus()` num `<input>` de dentro do palco:
`document.activeElement` continua em `BODY`. A descrição `sr-only` abaixo da
moldura segue sendo o que o leitor de tela recebe.

---

## Ciclo 6 — legibilidade, enquadramento e mobile

**Problema 1.** Legenda e controles caíam **abaixo da dobra** (y = 954 numa
viewport de 901). O visitante não via a frase que explica o quadro.
**Mudança.** Legenda + régua de progresso + controles passaram para **cima** do
quadro. Medido: legenda em y = 347, controles na mesma linha, quadro começando
em 397 com 85 % visível — cortado embaixo de propósito, como a janela sem borda
inferior pede.

**Problema 2.** Em 1240×751 sobravam 230px de quadro abaixo da dobra.
**Mudança.** `h-[420px] lg:h-[min(560px,62svh)]`. Em 1440×901 nada muda
(594px); em 1240×751 o quadro passou de 61 % para 72 % visível.

**Problema 3 (mobile).** Abaixo de `lg`, painel e lista ficavam escondidos por
CSS — os momentos 3 e 4 seriam idênticos aos 1 e 2, e a abertura do painel, que
É o momento, não apareceria.
**Mudança.** `useMediaQuery('(min-width: 1024px)')`: abaixo disso o painel
**assume a área principal** e a conversa sai, que é como o app se comporta no
celular. Medido em 390px: M1–M2 conversa 353px; M3–M4 painel 353px; M5–M7
quadro 353px. Sem `overflow-x` em 360, 390, 768, 1240 e 1440.

**Problema 4 (legibilidade).** O selo "Dados de demonstração" estava em 6px no
celular e em 4,45:1 no tema escuro; a legenda caía em 13px em 390px.
**Mudança.** Selo em 9px/`surface-400`; legenda em 15px no celular.

**Contraste medido** (composição de alpha e gradiente, não aproximação):
tema claro reprova 3 nós, tema escuro 12 — **todos** com valores do próprio
design system do app (horários e metadados em `text-surface-500`, 4,06:1; o
contador de não lidas em branco sobre `brand-500`, 2,49:1). Nenhum foi
introduzido por esta rodada. Fica registrado como **débito do DS**, não como
achado do Hero.

---

## Ciclo 7 — três ciclos consecutivos

261 amostras a cada 400ms (~4 voltas completas), em 1440×901:

| o que | resultado |
|---|---|
| posição do palco | `top = 347` em **todas** as amostras — nenhum scroll acumulado, nenhuma mudança de altura |
| telas coexistindo | 1, e 2 só durante a troca — nada fica para trás |
| molduras na página | 7, constante — sem vazamento de montagem |
| sequência | `01>02>03>04>05>06>07` quatro vezes, sem pulo e sem voltar atrás |
| animações simultâneas | máximo 8 |

**Pausa, retomada e replay**, por clique real: pausei em 05 e nove segundos
depois continuava em 05 com os dois controles na tela (o primeiro virou
"Retomar"); retomei e a história seguiu de 05 para 07 sem voltar atrás; o
replay zerou tudo — voltou a 01, sem a etiqueta "proposta enviada" e sem a
resposta do agente na thread.

**O movimento do card**, capturado em `document.getAnimations()` durante a
volta:

```
transform: translate(-231.991px, 86.0864px)  →  translate(0px, 0px)
```

O card real percorre a distância entre as colunas; não some de uma e aparece na
outra.

---

## Ciclo 8 — revisão independente, e o que ela derrubou

Um revisor sem envolvimento na implementação confrontou o resultado com os
critérios do PO, com instrução explícita de **procurar falhas**. Achou 3 de
severidade alta e 10 médias. As de impacto estão corrigidas; as decisões estão
abaixo com a evidência de cada uma.

### A1 · a legenda anunciava o que a tela não mostrava

O momento 2 dizia *"responde e muda a situação dela para Em negociação"* — com
o painel **fechado**. A situação do contato existe num único lugar da árvore
montada, o `StageBadge` dentro do painel. O visitante lia a frase e via só uma
bolha nova. Exatamente o critério 1 falhando.

**Correção.** A situação passou a mudar no momento 3, junto com a abertura que
a torna visível; o momento 2 fala só da resposta, que está na thread.

**E o teste que deveria ter pego, não pegou**: ele comparava `heroTimeline`
com `heroContact` — dois dados — e chamava isso de visibilidade. Agora a suíte
pergunta pela tupla *(dado que mudou × superfície montada)*: nenhuma legenda
pode falar de situação ou etiqueta em momento de painel fechado, nenhuma pode
falar de etapa fora da tela de Funis, e uma linha nova de Timeline só entra em
momento com o painel aberto.

### A2 · no celular, o card da história ficava fora da tela

Abaixo de `md` cada coluna do `DealsBoard` ocupa 85vw num scroller com `snap`.
O quadro abria em **Entrada**; o card da Marina está em **Qualificação**. Nos
10,6 s dos três momentos de Funis o telefone mostrava negócios de terceiros
enquanto a legenda falava do card — e, com a moldura `inert`, o visitante nem
podia rolar.

**Correção.** O palco enquadra a coluna que contém o card, rolando o contêiner
**do quadro** (nunca `scrollIntoView`, que arrastaria a página). Medido em
390x844:

| momento | scroll do quadro | card |
|---|---|---|
| 05 | 358px | visível, 332px de largura |
| 06 | 699px | visível — o enquadramento seguiu o card de coluna |
| 07 | 699px | mantido |

### A3 · o card não atravessava: entrava pela borda

O FLIP aplicado ao próprio elemento não funcionava. A lista de cards de cada
coluna é `overflow-y-auto`, e pelo modelo de overflow do CSS isso faz o eixo X
recortar junto. O card já pertence à coluna de destino quando a animação
começa, então o primeiro quadro — 260px à esquerda — caía inteiro fora da caixa
de recorte. O efeito construído para resolver a crítica do PO estava
neutralizado por ela.

**Correção.** Quem viaja é um **clone** (`cloneNode(true)`) em
`position: fixed`, acima do quadro e fora de qualquer recorte; o card real fica
invisível durante o voo. Nada é redesenhado nem deformado.

**E a medição estava errada em 28px**: a tela entra com `translateX(28px)` do
`AnimatePresence`, e medir em coordenadas de viewport embutia esse offset.
Agora as medidas são relativas ao host, que se move junto. A prova está nos
keyframes capturados ao vivo:

```
antes:  translate(-231.991px, 86.0864px)     <- 28px de erro
agora:  translate(0,0) -> translate(259.991px, -86.0864px)
```

259,99px é exatamente o passo entre colunas (250px + 10px de `gap`).

### As médias

| # | achado | decisão |
|---|---|---|
| M1 | o painel lia o `localStorage` do app: quem já recolheu "Dados" veria a demonstração com a situação escondida | prop `demo` no `ContactPanel` isola as chaves (`hero-demo.*`) |
| M2 | pausar não pausava o card — a animação seguia no compositor | a `Animation` é guardada, pausa/retoma com a sequência e é cancelada no cleanup |
| M5 | `replay()` era no-op no momento 1 (bail-out do React, timer pendente intacto) | nonce `runId` nas dependências do timer |
| M6 | ao abrir o painel, a última mensagem saía por baixo do contêiner | `MessageList` re-ancora no fim quando o **contêiner** muda de tamanho, e só para quem já estava perto do fim — correção no componente de produção, vale para o app ao arrastar o divisor ou girar o celular |
| M7 | entre 1024 e 1279px sobravam ~308px para a conversa | nessa faixa a lista sai quando o painel entra, como o app faz ao ficar estreito |
| M8 | `search_catalog` e `manage_deal_pipeline` caíam no `default` da Timeline — ponto cinza justamente na linha do clímax | os dois casos entraram no mapa de produção (melhora a Timeline real do app, não só o palco) |
| M9 | o botão **"Novo negócio"** só não aparecia por acidente: sem sessão não há funil, mas `/` continua acessível **logado** — e aí a demonstração exibiria um CTA contradizendo a própria história | `demo` deixa de renderizar as ações do contato |
| M10 | nenhum teste montava as telas | `HeroScreens.test.tsx` monta as duas de verdade, com os contextos em estado **deslogado** |
| M4 | reduced motion entregava só o último quadro (o funil sozinho, sem a conversa) | o quadro estático virou escolha de narrativa: `HERO_STATIC_INDEX` = momento 4, o único que se explica sozinho |
| B1/B2/B3/B4/B5/B7 | não lidas numa conversa aberta; ids de mensagem vindos de contador de módulo; "Ana Prado" como atendente e como cliente; "Ganho R$ 0,00" permanente; `panelOpen` mentindo nos momentos de Funis; vocabulário misturando contato e conversa | todos corrigidos |

### Uma decisão contra a recomendação

O revisor sugeriu manter a linha *"Moveu o negócio para Proposta"* na Timeline.
**Removi.** Esse momento se passa na tela de Funis, com o painel fora de cena:
a linha nunca chegaria a ser vista. A evidência desse momento é mais forte que
qualquer registro — o card percorre a distância entre as colunas e os totais
das duas etapas se recalculam à vista:

| coluna | momento 05 | momento 06 |
|---|---|---|
| Qualificação | 3 · R$ 10.875,00 | 2 · R$ 6.375,00 |
| Proposta | 1 · R$ 1.875,00 | 2 · R$ 6.375,00 |

A diferença é exatamente R$ 4.500,00 — o valor da proposta.

### Também mudou

A legenda perdeu o `aria-live`. Ela troca a cada ~3,6 s e interromperia quem
usa leitor de tela indefinidamente; quem narra o palco para tecnologia
assistiva é a descrição `sr-only` da moldura, lida uma vez.

---

## Verificações finais

| verificação | resultado |
|---|---|
| `npm run typecheck` | limpo |
| `npx eslint src/components/landing/` | limpo |
| `npx vitest run` | **771 passam**; 4 falham em 3 arquivos **pré-existentes** e não tocados (`DesktopRecommendedBanner`, `smoke`, `SettingsLayout`) |
| rede, 2 ciclos completos | `performance.getEntriesByType('resource')` filtrado por `/api/`: **0** |
| clones órfãos no `body` | máximo 1 por vez, sempre removido |
| ordem dos momentos, 2 ciclos | `01` a `07` duas vezes, sem pulo nem retrocesso |
| 1440x901 | quadro 1192px, 85 % visível |
| 1240x751 | quadro 1072px, 72 % visível |
| 1600x1000 | quadro 1192px, 100 % visível |
| 390x845 / 360x800 | 86 % / 81 % visíveis, `overflow-x` ausente nas quatro larguras |
| contraste, tema claro | 3 nós abaixo de AA — todos do DS do app |
| contraste, tema escuro | 11 nós abaixo de AA — todos do DS do app |

## Gaps que ficam (sem esconder)

1. **Débito de contraste do design system.** Horários e metadados em
   `text-surface-500` batem 4,06:1 no escuro; o contador de não lidas (branco
   sobre `brand-500`) dá 2,49:1 no claro. São valores do app inteiro — mexer
   neles é uma rodada de DS, não uma decisão do Hero. Nenhum foi introduzido
   aqui.
2. **A landing depende dos provedores do app.** `ConversationItem` usa
   `useAuth` e `useContextMenu`; `ContactPanel` usa `useDealPanel` — os três
   lançam sem provedor. Hoje funciona porque `App.tsx` envolve todas as rotas.
   Se um dia a landing for pré-renderizada ou servida estaticamente, isso
   precisa virar um provedor próprio; os testes já marcam o ponto exato.
3. **Capturas de tela.** `maestri portal screenshot` não funcionou em nenhum
   momento desta sessão (janela ocluída). Toda a evidência é medida na página
   viva; não há imagens para anexar.
4. **Correspondência visual entre o painel e o card do quadro.** O PO
   mencionou como opcional ("pode ajudar"). Hoje a ligação é feita pelo anel de
   seleção no card e pela identidade repetida (nome, título, valor). Um morph
   de elemento compartilhado entre as duas telas não foi tentado — deformaria
   o componente ou exigiria uma segunda versão dele.

## Onde revisar

- **A demonstração no lugar dela:** `http://localhost:3011/` — o Hero é a
  primeira coisa da página.
- **Os sete momentos parados, um abaixo do outro:** `http://localhost:3011/_hero`
  — o playground traz a sequência tocando no topo e, em seguida, cada momento
  como quadro estático rotulado (a ordem de trabalho do storyboard: composição
  antes de movimento).
- **Pausa, retomada e replay:** os dois controles ficam acima do quadro, à
  direita da legenda, e funcionam por teclado.

---

# Rodada de 25/09 — de mundo panorâmico para janelas independentes

## O que estava errado (e por que não era acabamento)

A rodada anterior montou um **plano panorâmico de 2.672px** com Conversas e
Funis lado a lado, e uma câmera que aplicava `translate`/`scale` a esse plano
dentro de UMA moldura. A consequência não era estética, era estrutural: as duas
telas dividiam o mesmo `overflow-hidden`, então o funil aparecia como sobra
cortada na lateral da conversa, o card parecia atravessar para a tela errada, e
qualquer destaque exigia ampliar o plano inteiro — escalas agressivas que
borravam o texto.

## A arquitetura nova

```
palco (sem recorte de conteúdo, só posiciona)
├── janela de Conversas   ← moldura, overflow e dimensão próprios
├── janela da ficha       ← idem
├── janela de Funis       ← idem, + camada local de transição
```

| arquivo | papel |
|---|---|
| `heroComposition.ts` | a tabela de arranjos: posição, escala, opacidade e camada de cada janela em cada momento |
| `HeroWindow.tsx` | a moldura de uma janela — barra de título, borda, sombra, recorte |
| `HeroSurfaces.tsx` | as três superfícies, com os componentes de produção |
| `HeroStage.tsx` | o palco: escolhe desktop ou celular e aplica um único fator de ajuste |
| `HeroCinema.tsx` | junta palco, linha do tempo, nota e pausa |
| `useHeroTimeline.ts` | duas camadas (produto × composição) numa linha do tempo só |

Removidos: `HeroWorld.tsx`, `useCamera.ts`, `heroWorldGeometry.ts` e o
`heroStory` de enquadramentos.

## Componentes reais preservados

`ConversationList`, `ChatHeader`, `HandoffStripe`, `MessageList`,
`MessageInput`, `ContactPanel`, `StageBadge`, `DealSummary`,
`ConversationActivitySection` e o `DealsBoard` inteiro — com as contagens e
somas por coluna derivadas pelo mesmo código do app. Nenhuma versão ilustrativa
foi criada.

A janela de Conversas tem **dois formatos do mesmo componente**: `full` (com a
lista) quando domina o palco, e `chat` (recorte da conversa) quando divide
espaço com o funil. Sem isso, encolher a janela inteira para caber ao lado do
funil daria 63 % de escala e texto de 8px.

## O card

Fica dentro da janela de Funis, sempre. O clone que viaja é anexado a uma
**camada local** dessa janela (`absolute inset-0` sob o mesmo
`overflow-hidden`), não ao `body`, e o deslocamento é convertido para
coordenadas locais dividindo pela escala que a composição aplica à janela. Por
isso ele acompanha a janela em vez de brigar com ela, e não tem como aparecer
por cima do chat.

## Capacidades: auditoria antes do roteiro

Auditei os três repositórios antes de escrever a história. Três coisas que a
versão anterior insinuava não são verdade:

| a IA… | evidência |
|---|---|
| **não define o valor** do negócio | nenhuma ferramenta aceita `amountCents`; a porta única recusa por identidade: *"A IA não define o valor do negócio."* |
| **não se pausa** | não existe ferramenta de pausa; atribuir a conversa a um humano não silencia o agente — quem pausa é a pessoa, ao intervir |
| **não fecha venda** | recusa dupla, válida mesmo com todos os opt-ins: *"A IA só fecha registros de funil de processo. Ganho/perdido de venda é decisão humana."* |

E o catálogo de produtos **não é ferramenta** (é injeção no prompt, atrás de uma
flag desligada por padrão); o que existe é `search_knowledge_base` — cujas
consultas o operador **não vê** em tela nenhuma, porque a Timeline filtra
`kind='crm'` e a busca é `kind='kb'`.

O roteiro foi reescrito dentro desses limites: o negócio **já existia**, aberto
pela Ana dois dias antes, com valor definido; a IA responde, muda a situação,
etiqueta a conversa, avança a etapa e chama uma atendente; a **Ana** intervém
(aí sim a IA pausa) e fecha a venda como Ganho.

## Coerência de dados

Um relógio de demonstração (`heroClock.ts`) ancorado no carregamento da página
substituiu os horários fixos. Resolveu de uma vez: o "5h sem resposta" em
vermelho em todas as linhas (era horário fixo contra o relógio do visitante), o
"5h na etapa" num card recém-movido, e o histórico de ontem marcado com a hora
de agora. Além disso, `lastAgentReplyAt` passou a existir — é o campo que o
produto lê para decidir o aviso de espera —, os negócios secundários ganharam
títulos distintos e nenhum passa de 3 dias na etapa (acima disso o board
estampa "parado N d" em vermelho e rouba a atenção do protagonista).

## Validação visual — feita no navegador

A captura passou a funcionar pelo Claude in Chrome (o portal Maestri seguiu sem
captura). Momentos observados na home, com a demonstração pausada:

| momento | o que a imagem mostra |
|---|---|
| abertura | uma janela só, completa, centrada; nenhum fragmento do funil |
| resposta | a resposta do agente com preço e condição, legível |
| situação | duas janelas: Conversas e a ficha, com "Em negociação" e o negócio |
| ponte | Conversas (recorte de chat) e Funis lado a lado, cada um na sua moldura |
| fecho | coluna **Ganho 1 · R$ 4.500,00** com o card da Marina, e a Ana na conversa |

**Limitação honesta:** com a janela do Chrome minimizada, `requestAnimationFrame`
para, e as animações do framer-motion congelam nos valores iniciais — as
medições de DOM feitas nesse estado mostram poses antigas. As capturas forçam a
pintura e são a fonte confiável. Isso é do ambiente de medição, não do produto.

Celular (390px, medido ao vivo): **uma janela por momento**, nenhuma fora do
palco, sem `overflow-x`.

## Verificações

| verificação | resultado |
|---|---|
| `npm run typecheck` | limpo |
| `npx eslint src/components/landing/` | limpo |
| `heroComposition.test.ts` | 5 testes — nenhuma janela visível fora do canvas (desktop e celular), escalas entre 0,58 e 1,05, uma superfície dominante por vez |
| `npx vitest run` | 728 passam; falham 3 arquivos **pré-existentes** (`DesktopRecommendedBanner`, `smoke`, `SettingsLayout`) e 1 instável sob carga (`NewConversationModal`, que passa sozinho) |

## O que ainda fica

1. **Contraste do design system** — horários e metadados em `text-surface-500`
   batem 4,06:1 no escuro; o contador de não lidas dá 2,49:1 no claro. São
   valores do app inteiro, não desta rodada.
2. **A landing depende dos provedores do app** para montar (`useAuth`,
   `useContextMenu`, `useDealPanel` lançam sem provider). Hoje funciona porque
   as rotas públicas estão dentro deles; um build estático quebraria.
3. **Reduced motion e repetição de ciclo** foram exercitados pela máquina de
   tempo (quadro estático no cue da ponte, pausa/retomada por clique), mas não
   observei um ciclo completo de ponta a ponta em captura contínua — a janela
   do Chrome minimiza sozinha entre as ações e cada captura precisa reanimá-la.

---

## Rodada seguinte — a caixa externa saiu

**Problema.** Mesmo com janelas independentes, a Hero ainda parecia "uma
aplicacao dentro de uma caixa": havia um retangulo com borda, cantos
arredondados e o selo "Dados de demonstracao" contendo todas as telas. O
visitante percebia o limite do componente antes de perceber as interfaces.

**Mudancas.**

1. **A caixa sumiu.** O palco agora e o proprio espaco da secao: sem borda, sem
   raio, `overflow-visible`, com uma camada de atmosfera (dois gradientes
   radiais suaves) que sangra para fora da coluna de texto. Medido na pagina:
   `border-width 0px`, `border-radius 0px`, `overflow visible`. O aviso de
   dados ficticios virou uma linha discreta no rodape, fora da composicao.

2. **Camada editorial.** `HeroNarrative.tsx` traz eyebrow, titulo e descricao
   por momento, com crossfade e cor por ator (teal para a IA, verde para a
   pessoa). Cinco frases orientadas a valor, cada uma entrando antes da acao
   que descreve. Substitui a nota de 13px que ficava abaixo do palco.

3. **Regime, nao escala unica.** Acima de 1280 a composicao usa duas ou tres
   janelas; entre 768 e 1279 e no celular, uma janela dominante por vez, em
   tamanho de leitura confortavel. A tabela de "uma janela por vez" e derivada
   por funcao, nao escrita a mao tres vezes.

4. **O Funil ganhou o chrome da tela real.** A janela agora monta a
   `BoardFilterBar` de producao com `boardSummary`, `pipelineNoun` e
   `pipelineKindOption`, e o `DealsBoard` voltou a desenhar a faixa de
   contexto. Na tela: chip "Vendas", "7 negocios · R$ 21.525,00 em aberto ·
   R$ 0,00 ganhos no mes" e a faixa com abertos, ganhos do dia, perdidos e
   origens. Antes era "um conjunto de cards coloridos".

**Evidencia visual** (Chrome, 1568x757): na abertura, uma janela unica
flutuando sobre o fundo da secao, sem moldura externa; na ponte, Conversas e
Funis lado a lado com o cabecalho do funil visivel e legivel.

**Verificacoes.** typecheck limpo, lint limpo na pasta da landing, 232 testes
das areas tocadas passando, e o teste de composicao cobre agora os tres
regimes (nenhuma janela visivel fora do canvas, escalas entre 0,58 e 1,05, uma
superficie dominante por vez).
