# Auditoria D → landing (frente C) — por leitura

Auditor: Bússola (frente D). Data: 24/09/2026. Escopo: `src/pages/WelcomePage.tsx`,
`src/components/landing/sections/*`, `src/components/landing/landingCopy.ts`. **Nada foi
editado.** Nada foi medido ao vivo: contrastes são **calculados** dos tokens de `index.css`
(WCAG 2.x), alturas de viewport são **estimativas por soma de classes**, e cada afirmação
de P14 foi cruzada com o código do app (não com o backend — onde só o backend responde, está
marcado "confirmar").

Severidade: **Alta** = afirma algo que o produto não faz/nomeia assim (P14/P15) · **Média** =
degrada hierarquia, acessibilidade ou a regra da casa de forma visível · **Baixa** = acabamento ·
**Info** = registro.

## Resumo

| Sev. | Qtde | Destaques |
|---|---|---|
| Alta | 2 | "Devolver à IA" não existe no produto (é "Reativar IA"); "um Agente IA por linha" sem lastro no front |
| Média | 6 | corpo ≈ título no claro (1,25:1); foco teal < 3:1 no claro; 2 CTAs teal acima da dobra; grade de 6 cards genérica; palco cortado na dobra; sem pausa para animação em loop |
| Baixa | 14 | "janela" em Disparos, ano fixo no ©, receita de CTA duplicada do `LinkButton`, vocabulário, ritmo 6px/2px, ordem do fluxo sem numeração, absolutos na copy, etc. |
| Info | 2 | relevo do hero some no claro; sem "pular para o conteúdo" |
| Contraste (texto) | 0 falhas | `text-surface-300/400` no claro são **escuros** (#1F2937/#374151) — a hipótese "cinza claro sobre #FAFAFC" não se confirma |

## Achados

| # | Achado | Arquivo:linha | Sev. | Sugestão |
|---|---|---|---|---|
| 1 | **"Devolver à IA" não existe na interface.** O passo 3 vende um verbo de produto (capitalizado como ação) que o app não tem: o botão que religa o agente é **"Reativar IA"** (`AiHandoffBanner.tsx:213`); "Assumir" existe (`ChatHeader.tsx:371-452`), mas o app também usa "Intervir agora" (`AiHandoffBanner.tsx:51,182`). O README lista "Assumir / Devolver à IA" como vocabulário P15, mas P15 descreve o produto — e o produto diz "Reativar IA". | `landingCopy.ts:67` (e o comentário `:10`) | **Alta** | Trocar por "pode Reativar a IA" (verbo do app). Se o PO quiser "Devolver à IA", é mudança de **produto** primeiro, landing depois. |
| 2 | **"Cada linha do WhatsApp tem um Agente IA" / "Um Agente IA por linha".** Não achei vínculo agente↔linha no front: `Agent` não tem `whatsappNumberId` (só `Department` tem, `types/index.ts:119`); o wizard de agente tem passos de Identidade/Personalidade/Escopo/… sem escolher linha. A frase é uma afirmação estrutural do produto. | `landingCopy.ts:50`, `landingCopy.ts:85` | **Alta** | **Confirmar com o backend.** Se agentes são por tenant/escopo (funis permitidos), reescrever: "Agentes IA com o tom e as regras de transferência definidos pela sua equipe." |
| 3 | **Corpo quase igual ao título no tema claro.** Lead/corpo usam `text-surface-300` (claro = #1F2937), títulos `text-surface-50` (claro = #0F1422): razão de contraste **entre os dois textos 1,25:1** (luminância 0,022 × 0,007); no escuro a separação existe (0,553 × 0,949). No claro o lead "lê como título" e a hierarquia achata. | `Hero.tsx:29`; `HowItWorks.tsx:19,28`; `ProductGrid.tsx:29,40`; `Trust.tsx:28,41`; `Footer.tsx:16` | **Média** | Corpo/lead em `text-surface-400` (claro #374151 = 9,9:1 sobre #FAFAFC; escuro #8FA5A5 = 7,7:1 sobre #060909 — passa AA nos dois e restaura o degrau de peso). Só tokens, sem ternário. |
| 4 | **Anel de foco teal abaixo de 3:1 no claro.** `focus-visible:ring-brand-500` = #14B8A6 sobre #FAFAFC = **2,39:1** (WCAG 1.4.11 pede 3:1 para indicador de foco). No escuro é 10,7:1. Vale para nav, CTAs e links do rodapé. | `ctaStyles.ts:10`; `LandingNav.tsx:29,40,52`; `Footer.tsx:16` (e o `:focus-visible` global do app, `index.css` ~1099) | **Média** | Usar o teal do CTA no anel (`--color-btn-primary-bg`: claro #0F766E = 5,25:1; escuro #2DD4BF). É token/`index.css` do orquestrador — a landing herdaria. |
| 5 | **Dois CTAs primários (teal) acima da dobra.** Nav "Entrar" e hero "Entrar" são ambos `ctaPrimary`; regra 90/10 = 1 CTA teal por seção, e a página tem 3 (nav, hero, fecho). | `LandingNav.tsx:58`; `Hero.tsx:33`; `FinalCta.tsx:18` | **Média** | Nav em `ctaNeutral` (ou ghost) e teal só no hero e no fecho. Attio/Linear costumam deixar o botão da nav secundário quando o hero tem o principal. |
| 6 | **Grade de 6 cards idênticos (ícone + título + texto)** é a "feature grid" genérica — o oposto da referência (Attio/Linear mostram o produto). Os módulos Funis e Disparos **já têm cena no palco** (`funil`, `disparo`). | `ProductGrid.tsx:31-43` | **Média** | Trocar 2–3 dos cards por mini-`StagePoster` da cena correspondente, ou virar lista de 2 colunas sem caixa (como `Trust`, que é o trecho mais "Linear" da página). Se ficar como está, tirar a caixa do ícone (item 8). |
| 7 | **O produto fica cortado na dobra.** Soma por classes em 1440×900: nav 64 + `pt-20` 80 + H1 2 linhas × 66,6 ≈ 133 + `mt-5` 20 + lead 2 linhas ≈ 58 + `mt-8` 32 + CTA 44 + `mt-16` 64 ≈ **palco começa em y≈495** → só ~405 px dos 640 visíveis (63 %). Em 1280×720: ~225 px (35 %). A ideia da Attio é o produto "logo abaixo". | `Hero.tsx:18,29,32,45` | **Média** *(medir ao vivo)* | Compactar em lg: `pt-14`, `mt-6` no lead, `mt-10` até o palco; ou CTAs ao lado do H1 em ≥ lg. Estimar de novo com a medição do orquestrador. |
| 8 | **Animação em loop sem controle de pausa** (WCAG 2.2.2: movimento automático > 5 s precisa poder ser pausado). O palco respeita reduced-motion (poster) e congela fora da viewport (`useStagePlayback`), mas não há botão Pausar/Reproduzir nem `aria-label` de controle em `stage/*`. | `Hero.tsx:47` (o controle é do palco) | **Média** | Pedir à frente B um botão de pausa no chrome do quadro (ícone 28 px, `aria-pressed`). Não é arquivo do Farol. |
| 9 | **"Respeitando a janela de atendimento do WhatsApp" em Disparos** — zero menção a 24 h/janela em `components/campaigns/*`; a janela é regra do chat (composer, `conversationEntry.ts`). Disparo com Modelo aprovado é justamente o meio de falar **fora** da janela; a frase pode induzir o contrário. | `landingCopy.ts:100` | Baixa (Média se o PO ler como promessa) | Cortar a cláusula: "Envio de Modelos de mensagem aprovados pela Meta para listas de contatos." — ou confirmar a regra com o backend. |
| 10 | **Ano do © fixo** (`© 2026 Oryon`) — desatualiza em 2027; única "exceção numérica" da página. | `landingCopy.ts:150` | Baixa | `© ${new Date().getFullYear()} Oryon` no `Footer.tsx` (mantém P14: número derivado, não inventado). |
| 11 | **Receita de CTA duplicada.** `ctaStyles.ts` diz que "um `LinkButton` em `ui/` substitui isto" — o `LinkButton` **já existe** (`ui/LinkButton.tsx`, `buttonStyles.ts`, ed55109). Hoje há duas receitas do botão (uma ajuste de token no Button, outra aqui). | `ctaStyles.ts:1-21`; `Hero.tsx:33,36`; `LandingNav.tsx:58`; `FinalCta.tsx:18` | Baixa | Migrar os 4 CTAs para `<LinkButton to/href variant size>` e apagar `ctaStyles.ts` ("primitivo antes de valor"). |
| 12 | **Ritmo monótono:** `HowItWorks`, `ProductGrid`, `Trust` e `FinalCta` repetem `border-t border-surface-700 bg-surface-950 py-16 sm:py-24` e o mesmo H2 (`clamp(1.75rem,3.4vw,2.5rem)`); 4 blocos em fila com o mesmo chão e a mesma hairline. | `HowItWorks.tsx:13`; `ProductGrid.tsx:23`; `Trust.tsx:21`; `FinalCta.tsx:11` | Baixa | Variar: `Trust` em faixa cheia `bg-surface-900`; `FinalCta` sem `border-t` e com `py-24/32`. Linear alterna densidade e fundo. |
| 13 | **"Como funciona" sem numeração nem conector.** `<ol>` com 3 posters do mesmo frame compacto; o reset do Tailwind apaga o número, então a **ordem** (cliente → IA → humano, referência Intercom) só existe no texto. | `HowItWorks.tsx:21-30` | Baixa | Índice visível (`01 02 03` em 11 px, `text-surface-500`) ou traço conector entre as colunas em `md+`. |
| 14 | **"Tema claro e escuro" não é item de confiança.** Diluí a seção "segurança" com uma feature trivial; os outros 4 itens são fatos operacionais. | `landingCopy.ts:134-138`; `Trust.tsx:9` | Baixa | Remover o item (e o `Palette` do mapa de ícones) — 4 itens sólidos > 5 com um de enchimento. |
| 15 | **Vocabulário:** "Agentes de IA" no título do card; o app (sidebar) e o P15 dizem **"Agentes IA"** (`NavSidebar.tsx:234`). | `landingCopy.ts:84` | Baixa | "Agentes IA". |
| 16 | **Absolutos na copy:** "respondem **cada** conversa" e "com **todo** o contexto". Um agente pode estar pausado/sem regra e o handoff leva o histórico e o resumo do contato, não "tudo". | `landingCopy.ts:42` | Baixa | "respondem as conversas … com o histórico" (mesma força, sem promessa absoluta). |
| 17 | **"A IA começa a conversa"** sugere iniciativa da IA; quem inicia conversa no produto é o Disparo/o cliente — a IA **responde**. | `landingCopy.ts:49` | Baixa | "A IA atende primeiro. A sua equipe entra quando precisa." |
| 18 | **Resumo no handoff — confirmar.** "o Atendente recebe o histórico e o resumo" (`:61`, `:122`): histórico ✓ (mesma conversa); o "RESUMO DA IA" existe no painel do contato (`ContactPanel.tsx:309`, `ConversionAnalysisPanel`), mas não achei que seja **entregue no momento** do handoff. | `landingCopy.ts:61,122` | Baixa | Confirmar; se for sob demanda: "o Atendente vê o histórico e o resumo do Lead". |
| 19 | **`h-screen` no contêiner rolável** — no mobile (100vh inclui a barra do navegador) o rodapé pode ficar sob a barra. | `WelcomePage.tsx:19` | Baixa | `h-[100dvh]` (mesma correção já feita no login). |
| 20 | **Âncoras somem no mobile:** `nav` com `hidden md:flex`; abaixo de 768 px só sobram tema + "Entrar" (o hero tem "Ver o produto", mas "Como funciona" fica sem acesso). | `LandingNav.tsx:35` | Baixa | Aceitável (a página é curta); se quiser, um menu de 2 itens. |
| 21 | **Ritmo de 4 px:** `gap-1.5` (6 px) e `mt-1.5`, `mt-0.5` (2 px) fogem da grade. `gap-1.5` replica o `Button`, então é consistente com o primitivo; os demais são só desta página. | `ProductGrid.tsx:40`; `Trust.tsx:36`; `ctaStyles.ts:9` | Baixa | `mt-1.5`→`mt-2`, `mt-0.5`→`mt-1`. O `gap-1.5` do CTA some ao adotar o `LinkButton` (item 11). |
| 22 | **Ícone-tile de 32 px duplicado** (hairline + `--sf2`) em duas seções, com a mesma classe copiada. | `ProductGrid.tsx:36`; `Trust.tsx:36` | Baixa | Extrair (ou eliminar — item 6). |
| 23 | **Relevo do hero some no claro:** gradiente `surface-900 → surface-950` = #F5F6F8 → #FAFAFC (≈ 1 % de luminância). No escuro é o "relevo sutil" pedido; no claro é invisível (inofensivo, mas a intenção não chega). | `Hero.tsx:20` | Info | Aceitar, ou reforçar só no claro por token (`--sf2` → `--color-surface-800`). |
| 24 | **Sem "pular para o conteúdo"** com nav sticky + contêiner de rolagem próprio. | `WelcomePage.tsx:17-30` | Info | Link visível no foco para `#inicio`/`main`. |

## Contraste calculado (WCAG 2.x)

| Par (uso) | Escuro | Claro |
|---|---|---|
| `surface-50` sobre `950` (H1/H2) | 19,0 | 17,6 |
| `surface-300` sobre `950 / 900 / 800` (lead, corpo) | 11,5 / 10,7 / 9,7 | 14,1 / 13,6 / 14,7 |
| `surface-400` sobre `950 / 900 / 800` (nav, © do rodapé) | 7,7 / 7,2 / 6,5 | 9,9 / 9,5 / 10,3 |
| `surface-500` sobre `950` (não usado; referência) | 4,8 | 7,5 |
| CTA primário (`btn-primary-fg` sobre `-bg`) | 9,2 (#04201D / #2DD4BF) | 5,5 (#FFFFFF / #0F766E) |
| Botão primário contra a página | — | 5,3 (#0F766E / #FAFAFC) |
| **Anel de foco `brand-500` sobre o piso** | 10,7 | **2,4 — abaixo de 3:1 (achado 4)** |
| Hairline `surface-700` sobre o piso | 1,5 | 1,5 (decorativa; ok) |

Conclusão: **nenhum texto falha AA em nenhum tema**. O problema do claro não é contraste
absoluto e sim **contraste relativo** entre níveis (achado 3): a escala de superfície é invertida
por tema, então `300` e `50` ficam vizinhos no claro.

## P14, linha a linha da copy

Legenda: ✓ verificado no código do app · ~ plausível, confirmar · ✗ não confere.

| Copy (`landingCopy.ts`) | Lastro | |
|---|---|---|
| `:29-36` nav (Como funciona, Produto, Entrar) | âncoras existem (`#como-funciona`, `#produto`); "Entrar" → `/login` | ✓ |
| `:40-41` H1 "atende sozinho / o humano entra na hora certa" | agente responde quando `aiPausedUntil` é nulo; pausa/handoff existem (`AiHandoffBanner`) — texto aprovado pelo PO | ✓ |
| `:42` "respondem cada conversa… com todo o contexto" | absolutos | ~ (item 16) |
| `:49` "A IA começa a conversa" | a IA responde, não inicia | ~ (item 17) |
| `:50` "Cada linha do WhatsApp tem um Agente IA" | sem vínculo agente↔linha no front | ✗ (item 2) |
| `:50` "regras de transferência decidem o momento" | `HandoffRuleBuilder` | ✓ |
| `:55` "no tom que a sua equipe definiu" | `TONES` no `AgentBuilderWizard.tsx:113` | ✓ |
| `:55` "registra no Lead o que descobriu" | `aiSummary/aiPainPoints/aiInterests` (`Contact`) escritos pela IA | ✓ |
| `:61` "recebe o histórico e o resumo … pode Assumir" | histórico ✓, "Assumir" ✓ (`ChatHeader`); resumo no handoff ~ | ~ (item 18) |
| `:67` "Devolver à IA" | app diz "Reativar IA" | ✗ (item 1) |
| `:75` "Da primeira mensagem ao fechamento" | conversa → lead → funil/negócio | ✓ |
| `:80` Conversas: "várias linhas … Setores, atribuição de Atendente e Etiquetas" | `Department`, `assignedUser`, `tags` | ✓ |
| `:85` Agentes: "um por linha" | idem `:50` | ✗ (item 2); "tom … regras de transferência" ✓ |
| `:90` Funis: "Etapas, valor e responsável" | `Deal.ownerUserId`, valor, etapas. **Depende da flag `multiPipeline` (SCRUM-498)** | ✓ (confirmar flag ligada no público-alvo) |
| `:95` Leads: "Situação, Etiquetas, resumo da última interação por IA" | `stage`, `tags`, `aiLastInteractionSummary` | ✓ |
| `:100` Disparos: "Modelos aprovados pela Meta … listas" | ✓; "respeitando a janela" | ✓ / ~ (item 9) |
| `:105` Relatórios: "volume, desempenho dos agentes, andamento dos Funis" | Dashboard (`AgentTable`) + aba Relatórios do funil | ✓ |
| `:112` "limites que a sua equipe enxerga e controla" | regras de transferência + modal de verificação | ✓ |
| `:117` "API oficial do WhatsApp Business, da Meta" | liberado pelo PO (README, decisão 5) | ✓ |
| `:127` Guarda: "valores, horários, nomes e ações … conferidos … mensagem retida" | `guardReason.ts` (money/temporal/entity/action), `AnomalyDetailModal` ("Mensagem retida (não enviada ao cliente)") | ✓ |
| `:132` "adota os termos do seu tipo de operação" | `TenantVocabContext` + Configurações › Vocabulário | ✓ |
| `:137` "Tema claro e escuro" | verdadeiro, mas não é confiança | ✓ (item 14) |
| `:143-145` fecho | subjetivo | ✓ |
| `:150` "© 2026" | ano fixo | ~ (item 10) |

Módulos desligados (Agendamentos, Conectores, Copilot, Automações, Marketing, Nexus): **nenhum
aparece** ✓. Números: **zero** além do ano ✓. Depoimento/logo de cliente: **zero** ✓. Botão/link
morto: **zero** — todo `href`/`to` aponta para `/login` ou para um `id` que existe (`#inicio`,
`#como-funciona`, `#produto`) ✓. Checklist anti-genérico do README: sem logo gigante, glow, badge
"AI-powered", eyebrow, palavra rotativa, beams/canvas, gradiente roxo, emoji, shimmer ou tilt ✓;
H1 = 10 palavras ✓.

## O que está bom (manter)

- Hero no molde Attio: H1 grande e preciso, lead curto, **dois** caminhos, produto operando no mesmo
  quadro (só falta caber melhor na dobra — item 7).
- `Trust` (5/7 + lista com `divide-y`) é a seção mais próxima de Linear: sem caixas, ritmo de lista.
- Teal com parcimônia: só CTA (e foco). Zero teal decorativo.
- Tokens em tudo: nenhum hex, nenhum ternário de tema; o botão de tema alterna o ícone por
  `[data-theme=light]` (mesma técnica do login).
- `data-section` em todas as seções e `scroll-mt-16` batendo com a nav de 64 px; `scroll-smooth`
  com `motion-reduce:scroll-auto`.
- Hierarquia de títulos correta (h1 → h2 → h3), `<ol>` para passos, `role="img"` + `aria-label`
  nos posters.

## Ordem sugerida de correção

1. **Copy P14** (itens 1, 2, então 9/16/17/18): é o que o PO pode ler como promessa falsa.
2. **Hierarquia no claro** (3) e **foco** (4): dois ajustes de token/classe com efeito em todas as seções.
3. **Dobra do hero** (7) depois da medição ao vivo; **CTA da nav** (5).
4. **Grade de produto** (6) e **fluxo numerado** (13) — o ganho "enterprise" visual.
5. Limpeza: `LinkButton` (11), ano (10), `h-[100dvh]` (19), vocabulário (15).
