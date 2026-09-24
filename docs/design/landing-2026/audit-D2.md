# Auditoria D2 → palco (frente B, Cartógrafo) — por leitura

Auditor: Bússola (frente D). Data: 24/09/2026. Escopo: `src/components/landing/stage/**`
(28 arquivos, ~2062 linhas, testes incluídos). **Nada foi editado.** Cruzado contra as
7 perguntas da mensagem do orquestrador (dissecção do HTML da attio.com, 24/09) e as
medições dela citadas ali. Nada medido ao vivo — leitura de código e do CSS já mesclado
(`index.css`, tokens/classes da leva `eea007a`).

## Veredito em uma linha

**A arquitetura do palco hoje é o oposto da técnica da Attio em 3 dos 4 pilares** — timeline
de passos + cursor falso (ela não tem nenhum dos dois), `transform: scale()` num design
único em vez de dois conjuntos de pixel literais, e zero adoção das classes/tokens novos
(`.reveal`, `.ambient-*`, `--ease-emph`, `--frame-*`) que já estão no `index.css` desde a
leva `eea007a`. Isto **explica o "parecem cópia genérica" e "animações travadas"** do PO —
não é polimento, é modelo de construção.

## As 7 perguntas, respondidas

| # | Pergunta | Resposta | Evidência |
|---|---|---|---|
| 1 | Existe `transform: scale()` sobrando? | **Sim, estrutural.** O quadro inteiro é desenhado no tamanho de design fixo (1120×640 / 360×560) e escalado por `transform: scale()` via `ResizeObserver` para caber na largura do contêiner. | `StageFrame.tsx:37,58` |
| 1b | (achado extra) | O cursor também usa `scale` decorativo (aperto de clique 0,9→1) e uma barra de progresso usa `scaleX`. Estes dois são efeito, não o problema arquitetural — o item acima é o que importa. | `StageCursor.tsx:57`; `primitives/StageCampaignCard.tsx:78` |
| 2 | As medidas têm os dois conjuntos literais (base × lg, razão 2×)? | **Não, nenhuma.** Não há um único par de classes tipo `text-[Npx] lg:text-[2Npx]` em `stage/**` — todo o dimensionamento é o design único acima, escalado por JS. Zero ocorrências de `lg:`/`sm:` com valor em pixel dobrado. | busca em todo `stage/**` |
| 3 | A moldura tem cantos só no topo, sem borda inferior, sombra profunda? | **Não.** `StageFrame` desenha `rounded-lg` (4 cantos), `border` (4 lados) e a classe `overlay-frame` (sombra de overlay comum, não a nova). Os tokens `--frame-stroke/--frame-shadow/--frame-chrome` — que já existem no CSS — **não são referenciados em nenhum arquivo `.tsx` de `stage/`**. | `StageFrame.tsx:57` (`rounded-lg border overlay-frame`); comparar `--shadow-overlay` (`index.css:450`, sombra rasa de 3 camadas ~28px de espalhamento) com `--frame-shadow` (`index.css:121`, 3 camadas até 64px — "profunda" de propósito) |
| 4 | Sobrou timeline/cursor? | **Sobraram os dois, ativos por padrão.** `useStageTimeline` é uma máquina de passos inteiros (`setTimeout` encadeado, `def.delays[step]`) e `HeroStage` liga `showCursor` sempre que anima (`AnimatedScene`, chamada única em `HeroStage.tsx:17`). O cursor é um `motion.div` de framer-motion que desliza (750ms) até `[data-stage-target]` e "clica" (scale 0,9). Isto é exatamente a dupla que a Attio não usa — é provavelmente a origem do "travado": uma sequência de passos discretos com pausas fixas *parece* automação de QA, não um produto vivo. | `useStageTimeline.ts` (motor); `StageCursor.tsx` (cursor); `HeroStage.tsx:14-17` (liga os dois) |
| 5 | Os laços usam as classes ambiente e respeitam reduced-motion? | **Zero adoção das classes; o respeito a reduced-motion existe, por outro caminho.** Nenhum arquivo usa `.ambient-ring`/`.ambient-bob`/`.ambient-roll`/`.reveal`/`--ease-emph` — são infraestrutura pronta e não conectada. O palco de fato para com reduced-motion, mas via `useStagePlayback` caindo em `mode:'poster'` (congela tudo), não pelo mecanismo `@media (prefers-reduced-motion)` das classes novas. Não há nenhum laço "ambiente" (contínuo, decorativo) no palco hoje — só a timeline de passos do item 4. | busca por `ambient-`/`reveal`/`ease-emph` em `stage/**` = 0 resultados; `useStagePlayback.ts` (poster em vez de laço) |
| 6 | Durações de micro-interação em 50–150ms com `var(--ease-emph)`? | **Fora da faixa e sem o easing novo, em toda parte.** `StageMotion.tsx:22` usa 220ms/`easeOut`; `StageCursor.tsx:19` usa 750ms (glide) com um cubic-bezier PRÓPRIO (`[0.22,1,0.36,1]`, não `--ease-emph`); `StageCursor.tsx:58` usa 200ms/120ms (mais perto, mas ainda com easing implícito do framer); `StageCampaignCard.tsx:77` usa `duration-500` (Tailwind, 500ms) numa barra de progresso — 3,3× o teto da faixa. As duas ocorrências de `duration-100` (`StageChatHeader.tsx:47`, `StageCampaignReview.tsx:60`, ambas o mesmo padrão de "aperto de botão") são as únicas dentro da faixa 50–150ms, e mesmo essas usam o easing padrão do Tailwind, não `var(--ease-emph)`. | grep de durações em todo `stage/**` |
| 7 | Há dado que viole P14? | **Não — este pilar está limpo.** `demoData.ts` é só nomes fictícios (Ana Modelo, Bruno Amostra, Marina Exemplo…), telefones no bloco `90000-xxxx`, valores de negócio/campanha plausíveis e rotulados como demonstração; `STAGE_DEMO_LABEL` aparece no chrome de todo quadro (`Badge` em `StageFrame.tsx:62`); nenhum emoji, badge "AI-powered", gradiente roxo, glow, shimmer ou tilt em `stage/**`. | `demoData.ts` inteiro; `StageFrame.tsx:62`; busca do checklist anti-genérico = 0 resultados |

## Achados

| # | Achado | Arquivo:linha | Sev. | Sugestão |
|---|---|---|---|---|
| 1 | **Timeline de passos + cursor falso** — a dupla que a Attio não tem, ativa por padrão em toda cena animada (`HeroStage` sempre chama `AnimatedScene` com `showCursor`). É a causa mais provável de "parecem cópia genérica, animações travadas": um passo fixo, pausa, próximo passo, é o padrão de uma demonstração gravada, não de um produto respirando. | `useStageTimeline.ts` (motor); `StageCursor.tsx` (cursor); `HeroStage.tsx:14-17` | **Alta** | Reformular ao redor de **micro-interações + laços ambientes**, no espírito Attio: elementos que já estão na tela pulsam/mudam de estado sozinhos (chip "IA" com `.ambient-ring` ao responder, avatar do agente com `.ambient-bob`) em vez de um cursor guiando um roteiro. Se uma sequência de handoff (IA → humano) ainda for necessária, ela pode trocar de ESTADO com `.reveal` (o elemento novo entra com blur→nítido) sem precisar de um ponteiro percorrendo a tela. |
| 2 | **`transform: scale()` no design inteiro**, em vez dos dois conjuntos de pixels literais que a Attio escreve. Não é só estética: o site deles escala a TIPOGRAFIA por `svh` (independente da largura), então o texto muda com a altura da janela sem re-layout; aqui a escala é uniforme (largura), então nada responde à altura. | `StageFrame.tsx:28,37,58` | **Alta** | Reescrita estrutural — fora do escopo de um ajuste pontual. Se o Cartógrafo mantiver o "design único escalado" por ora (funciona, é só uma técnica diferente), pelo menos documentar a divergência deliberada no arquivo, como pedido pela regra da casa. |
| 3 | **Moldura sem os tokens novos.** `--frame-stroke`/`--frame-shadow`/`--frame-chrome` existem desde `eea007a` e não são usados; `StageFrame` continua com `rounded-lg border overlay-frame` (chrome de cartão comum: 4 cantos, 4 bordas, sombra rasa). O quadro do login (meu, `AuthBrandPanel.tsx`, commit `b2c32bd`) já aplica a moldura Attio por FORA do `StageFrame`, então hoje ele renderiza **frame-dentro-de-frame** (a moldura minha cortada embaixo, com o card de 4 cantos dele por dentro) — visível e temporário, documentado no meu arquivo. | `StageFrame.tsx:57` | **Alta** | Aplicar os tokens diretamente no `StageFrame`: `rounded-t-[Npx] border border-b-0 border-[var(--frame-stroke)] shadow-[var(--frame-shadow)] bg-[var(--frame-chrome)]`, tirando `rounded-lg`/`overlay-frame`. Depois disso eu simplifico `AuthBrandPanel.tsx` (removo a moldura externa, já que o `StageFrame` passa a ser a janela). |
| 4 | **Zero uso de `.reveal`/`.ambient-*`/`--ease-emph`.** A infraestrutura pedida pelo orquestrador está pronta e não conectada em nenhum ponto do palco — as entradas de elemento (`StageEnter`, `StageMotion.tsx`) ainda usam `framer-motion` com easing/duração próprios. | `StageMotion.tsx` inteiro | **Alta** | `StageEnter` é candidato direto: trocar `motion.div` por `<div className="reveal" style={{'--d': delayMs+'ms'}}>` mantém a mesma função (entrada de elemento) com a técnica da Attio, e livra o `stage/` de uma dependência de runtime para um efeito que agora é CSS puro. |
| 5 | **`framer-motion` ainda em uso em 2 arquivos** (`StageCursor.tsx`, `StageMotion.tsx`) — o pedido do orquestrador foi "não voltar a usar framer-motion nas peças novas"; estas duas são anteriores à leva Attio, mas ficam como a superfície a esvaziar se os achados 1 e 4 forem aplicados (sem cursor, `StageCursor.tsx` inteiro sai; sem `StageEnter` em framer, `StageMotion.tsx` sai). `StageFrame`/`HeroStage`/`StageBoard`/todos os `primitives/*` e `scenes/*` **já são framer-free** — a dependência está isolada nesses dois arquivos, o que facilita a remoção. | `StageCursor.tsx:2`; `StageMotion.tsx:2` | Média | Consequência natural dos achados 1 e 4, não uma tarefa própria. |
| 6 | **Durações fora da faixa 50–150ms, sem `--ease-emph`.** `StageMotion.tsx:22` (220ms/`easeOut`), `StageCursor.tsx:19` (750ms, easing próprio), `StageCampaignCard.tsx:77` (`duration-500`, uma barra de progresso — aceitável ficar mais longa que uma micro-interação, mas seria o candidato a usar `--ease-emph` em vez do `ease` padrão do Tailwind). As únicas dentro da faixa (`duration-100`, 2 ocorrências) não usam o easing novo. | ver tabela acima | Média | Ao tocar em cada arquivo pelos achados 1/2/4, trocar a duração/easing junto — não vale um commit só para isso. |
| 7 | **`will-change` — zero ocorrências.** A Attio usa 87; não é obrigatório (a maioria dos efeitos aqui já é opacity/transform, que o browser otimiza sozinho na maioria dos casos), mas o `transform: scale()` do achado 2, se mantido, é o candidato natural (recalcula em todo resize). | — | Baixa | Se o achado 2 não for resolvido logo, `will-change: transform` no nó escalado evita recomposição cara durante o resize. |
| 8 | **Teste cobre timeline/cursor como comportamento esperado** — `HeroStage.test.tsx` tem asserções sobre o avanço de passos e `data-stage-target`, então os achados 1/4 são mudança de contrato testado, não só de estilo. | `HeroStage.test.tsx` | Info | Ajustar os testes junto de qualquer reforma nesses dois pontos. |

## O que já está certo (não mexer)

- **P14 impecável**: dados de demonstração, rótulo permanente, zero número/emoji/badge/gradiente
  proibido em `stage/**` inteiro.
- **`useStagePlayback`** (pausa fora da viewport, aba oculta, reduced-motion → poster) é sólido e
  não precisa mudar — é ortogonal aos achados acima.
- **`StageFrame` escala por `ResizeObserver`** e não reflowa em breakpoint (mesmo sendo a técnica
  "errada" segundo a Attio, é uma implementação limpa da técnica que ele escolheu — o achado 2 é
  sobre TROCAR a técnica, não sobre um bug nela).
- **`primitives/*` e `scenes/*` já são framer-free** — só `StageCursor.tsx`/`StageMotion.tsx`
  seguram a dependência, o que torna os achados 1/4/5 uma mudança concentrada em 2 arquivos + os
  pontos de chamada (`HeroStage.tsx:17`, `StageBoard.tsx:27-28`, e onde `StageEnter` for usado).

## Ordem sugerida

1. **Achado 3** (moldura): menor risco, maior efeito visual imediato — some o "frame-dentro-de-frame" do login assim que aplicado.
2. **Achados 1 + 4 + 5 juntos**: tirar timeline+cursor E trocar `StageEnter` por `.reveal` são a mesma reforma (ambos vivem na camada de movimento do palco); sai o `framer-motion` do módulo inteiro na mesma leva.
3. **Achado 2**: arquitetural, maior escopo — decidir com o orquestrador se vale a reescrita agora ou registrar como divergência deliberada.
4. **Achado 6**: acabamento, encaixa nos commits dos itens acima.
