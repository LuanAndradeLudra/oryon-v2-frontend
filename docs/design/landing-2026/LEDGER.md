# Ledger — porta de entrada (landing `/` + login)

- **Dia 0 (`c7f3acf`)**: contrato do palco + stubs, `/pricing` removido, README da fase. Linha de base da landing antiga: hero 760 · como-funciona 608 · planos 820 · CTA 360 = 2 882 px; H1 72 px "Conversas que crescem.".
- **Frente C — landing (Farol, 8 commits até `9ba1364`)**: `WelcomePage` reescrita sobre `landing/sections/*` + `landingCopy.ts`; testes barram dígito na copy, link morto, "bot", planos/preços/depoimento e módulos desligados. **Medido (1240, claro):** nav 64 · hero 1176 (H1 64 px/700, 2 linhas; palco 1072 largo) · como-funciona 1043 · produto 889 · confiança 707 · cta 354 · footer 89 = 4 321 px; 0 links ruins, 0 dígitos; CTA "Entrar" 36 px em `--color-btn-primary-bg`. **390:** sem estouro-x, H1 36 px em 4 linhas, nav = logo · tema · Entrar (âncoras somem), posters 355; seções como-funciona 2 442 · produto 1 463 · confiança 949 (longas — ajustar densidade).
- **Frente A — `LinkButton` (`f6bc1de`^)**: receita do botão extraída para `ui/buttonStyles.ts`; `LinkButton` (`to` → Link, `href` → a) com o visual exato do `Button`; `Button` passa a consumir a receita (sem mudança visual). Farol troca `sections/ctaStyles.ts`.
- **Frente B — palco (Cartógrafo `63a638d` + `4b9735c`)**: StageFrame escalado por ResizeObserver, timeline por um `setTimeout` encadeado, playback por `useInView` ≥ 30 % + aba visível + reduced-motion → poster, cursor por motion values, primitivos espelhando `ConversationItem`/`ChatHeader`/`AiHandoffBanner`/`MessageBubble` com comentário de origem, `guardReasonTimelineLabel` da lib pura; 12 testes. **Medido:** quadro 1072×613 (escala 0,957), `data-stage-playing=true` ao carregar, alvo "assumir" existe, rótulo presente, menor fonte renderizada ≈ 10 px; aos ~8 s `playing=false` com o palco em tela (a confirmar: hold do loop?). Tabs de cena só aparecem com > 1 cena (só inbox por ora).
- **Frente D — auth (Bússola, 6 commits até `ee829bc`)**: `AuthLayout` (painel de marca `surface-900` + coluna 480; abaixo de `lg` coluna única sem palco), `StagePoster` por `lazy()` + Suspense, `PasswordInput` (olho focável, `aria-pressed`), `SsoSlot` com `SSO_PROVIDERS = []` (nada renderiza), sem "Criar conta", toggle de tema no canto superior direito com ícones por CSS, Forgot/Reset no mesmo layout; 13 testes de auth + smoke 2/2. Desvios aceitos: hairline `surface-700` (surface-800 é branco no claro), `STAGE_DESIGN` importado de `stage/types` (o index derrubaria o `lazy`), frase-âncora local de 8 palavras. **Prova de bundle:** `npm run build` ok; o rótulo "Dados de demonstração" aparece em UM chunk (`index-BXkmMcte.js`) — confirmar que não é o de entrada. Medição do login ao vivo pendente: a sessão do portal está logada e `/login` redireciona.

## Virada técnica — dissecação da Attio (24/09)

O PO reprovou o palco ("cópia genérica das telas, animações travadas, sem moldura de browser"). Dissequei o HTML real
de attio.com; a técnica deles é outra, e os fatos derrubaram a hipótese de "gravar vídeo do produto":

| Medição | Valor |
|---|---|
| Bibliotecas de animação | **zero** framer-motion / GSAP / Lottie; Rive em peças pontuais |
| Transições CSS | **1 318**, concentradas em 50 ms (373×), 150 ms (252×), 200 ms, 300 ms; 87 `will-change` |
| `@keyframes` de produto | 3, todos **ambientes e infinitos**: `pipeline-radar-ring` 3,6 s · `pipeline-radar-bob` 4 s · `signal-roller-roll` 24 s |
| Timeline de passos / cursor falso | **não existe** |
| Telas | DOM remontado em **pixels literais ×2** por breakpoint: `h-[14px] lg:h-[28px]`, `text-[3px] lg:text-[6px]`, `border-[0.54px] lg:border-[1.08px]`, `rounded-[7px] lg:rounded-[15px]`. Sem `transform: scale`, sem screenshot |
| Vídeo | **1** na página inteira — demo de vendas de 28 min com controles, não o hero |
| Moldura | `rounded-t-[13px] border border-subtle-stroke border-b-0 shadow-attio-5`, tela cortada embaixo |
| Tipografia | `clamp(64px, 16px + 5.333svh, 80px)`, `leading .95`, `letter-spacing: clamp(-2.4px, 2.08px − 0.3733svh, −1.28px)` — atada à **altura** da viewport |
| Entradas | `filter: blur(…) → 0` + opacidade; easing `cubic-bezier(.32,.72,0,1)` |
| Arquitetura | 12 páginas `/platform/*` — uma por capacidade |

**Consequência:** não se grava nada. O efeito é DOM + CSS, e é superior ao vídeo (nítido em qualquer resolução,
acompanha o tema claro/escuro, não envelhece com a UI).

**Entregue por mim (`eea007a`, `4fc65a4`):** tokens `--frame-stroke` / `--frame-shadow` / `--frame-chrome` (dois temas),
`--ease-emph`; classes `.reveal` (desfoque→nítido, escalonável por `--d`), `.ambient-ring` 3,6 s, `.ambient-bob` 4 s,
`.ambient-roll` 24 s, todas desligadas por `prefers-reduced-motion`; `STAGE_DEMO_LABEL` movido para `demoLabel.ts`
(em `types.ts` a string vazava para o chunk de entrada via o import do login).

**Redirecionamento das frentes:** B reescreve o palco (mata `scale` e timeline, adota pixels literais ×2, moldura de
janela, movimento ambiente); C adota tipografia por `svh`, troca a grade de 6 cards por seções de capacidade com quadro
e corrige os 2 achados altos da auditoria; D aplica a moldura no login e faz a 2ª auditoria cruzada, agora do palco.

### Medição pós-virada (Farol `a8684a3` + `0fd4ed1` + `f3f3eba`)
**1240×751:** total 4 487 (meta 3 600) — nav 64 · hero 1 078 · como-funciona 834 · produto **1 536** · confiança 532 · cta 354 · footer 89.
H1 com a fórmula da Attio funcionando: 56,07 px / entrelinha 53,27 / tracking −0,84. Stubs do palco zerados (posters reais).
**Defeitos:** (1) o palco caiu para **45 % visível na dobra** (topo y=473; antes 63 %); (2) em **390×844 o H1 sai com 61 px em 7 linhas** —
a fórmula por `svh` só funciona com headline curta: a da Attio tem 4 palavras, a nossa tem 10, e celular é alto (844) e estreito (390).
Correção despachada: `min(8.2vw, 16px + 5.333svh)` e H1 encurtado para "Seu WhatsApp atende sozinho." com o resto no lead.
**Foco AA (`8699e8b`)**: anel global e dos botões passam de `brand-500` para `--color-btn-primary-bg` — 5,25:1 no claro, 10,74:1 no escuro
(medido ao vivo), acima dos 3:1 da WCAG 1.4.11.

### Login com a moldura da Attio (Bússola `b2c32bd`) + 2ª auditoria (`4a5030f`)
**Medido ao vivo em `/login` (escuro):** moldura 679×279 — proporção 1120/460 idêntica à deles —, canto superior 13 px,
**borda inferior 0**, sombra em `--frame-shadow`; o poster é deixado mais alto que a janela e **cortado por baixo**
(`overflow-hidden`), sem escalar: é exatamente o efeito da Attio. Semântica conferida: `h1` "Oryon" (sr-only) visível,
`h2` "Entrar" visível, e o `h2` "Marina Exemplo" do quadro de demonstração dentro de `aria-hidden` — o smoke continua válido.
**Defeito encontrado:** o `StageFrame` ainda desenha o chrome antigo por dentro (raio 8 px nos 4 cantos, borda 0,87 px,
sombra rasa em `overlay-frame`) → **moldura dentro de moldura**.
**audit-D2 (7 perguntas, com evidência):** a arquitetura do palco é o oposto da Attio em 3 pilares — motor de passos
(`useStageTimeline`) + `StageCursor` ligados por padrão, `transform: scale` sobre design fixo 1120×640, e **zero uso**
de `.reveal`/`.ambient-*`/`--ease-emph` apesar de mesclados; durações em 750/220/500 ms contra a faixa 50–150 ms.
`framer-motion` está isolado em 2 arquivos, o que torna a remoção barata. P14 limpo.
**Ordem de ataque despachada:** 1) moldura (defeito visível agora) · 2) tirar timeline+cursor+framer na mesma reforma
· 3) base sem `scale` (pixels literais ×2) · 4) acabamento de durações.

### Palco reescrito na técnica da Attio (Cartógrafo `b97eb6d`)
Um commit só (os primitivos antigos dependiam do motor que saía na mesma reforma). **Medido ao vivo:**
`transform: none` (o `scale` morreu), **zero `setTimeout`** no palco, chrome antigo eliminado (0 elementos
`.overlay-frame`), moldura do hero **1 072×495** = 460 da janela + 34 da barra, a medida literal deles;
texto de **8,5 a 13,5 px em 50 nós, nítido** — a escala dupla (mobile e `lg:`, razão 2×) substituiu a
reamostragem. `useStageTimeline` e `StageCursor` apagados; `framer-motion` sobra só como detector de
`useReducedMotion`. Cenas viraram função pura de `StageFrameKey` (5 estados estáticos cada), 23 testes.
**Defeito medido:** o quadro do hero está **100 % parado** — `.ambient-ring`/`.ambient-bob`/`.ambient-roll`
ausentes, porque o ring só vale no quadro `ia`, o bob no funil e o roll no disparo, e o `liveFrame` da cena
inbox é o pós-handoff. Correção despachada: toda cena precisa de ≥ 1 laço ambiente no seu `liveFrame`.
**Efeito colateral:** a landing subiu de 4 352 para 4 856 px (a moldura é mais alta, e é medida da Attio —
não encolher). Orçamento recalibrado para 4 200 px em 1240, cortando em "produto" (1 506).
**Pendente no login:** `PosterWindow` do `AuthBrandPanel` virou moldura dentro de moldura (medi 679×279 e
678×495, idênticas) agora que o `StageFrame` traz a janela nativamente — remoção despachada, junto com os
feixes e a headline rotativa que o PO pediu de volta.
