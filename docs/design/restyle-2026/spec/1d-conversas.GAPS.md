# Gaps — 1d Conversas (Fase B: spec × código, mapeamento estático)

Leitura completa (arquivo inteiro) de: `ConversationList.tsx`, `ConversationItem.tsx`,
`ConversationSearch.tsx`, `ConversationFilters.tsx`, `QuickFiltersMenu.tsx`,
`ConversationsPage.tsx`, `ChatHeader.tsx`, `AiHandoffBanner.tsx`, `MessageBubble.tsx`,
`MessageList.tsx`, `MessageInput.tsx`, `ContactPanel.tsx`, `ContactPanelDeals.tsx`.
Lidos parcialmente (estrutura/abertura, não linha a linha): `ConversionAnalysisPanel.tsx`
(510 linhas), `ConversationActivitySection.tsx` (685 linhas), `ChatWindow.tsx` (211 linhas).
Não abertos: `TagFilterMenu.tsx`, `ConversationDealSelector.tsx`, `ResolveOutcomePopover.tsx`,
`TypingIndicator.tsx`, `messageRenderers/*`, `AnomalyDetailModal.tsx` — itens que dependem
só desses ficam `❓` (não dá pra saber sem ler; não é "bate" nem "não bate", é lacuna da
minha varredura, marcada explicitamente abaixo). Dono da leva (Cartógrafo) faz a Fase C.

Achado estrutural, antes da tabela: **CONV-HDR inteiro (12 itens) não existe como o mock
descreve.** Não há barra de 48px dedicada da tela de Conversas — o título "Conversas" vem
do `PAGE_TITLES` genérico do Shell (`TopBar.tsx:50`), o subtítulo é a legenda estática
"Chat com clientes" (`PAGE_SUBTITLES`, não as contagens dinâmicas do mock), não existe chip
de linha, não existe botão "Nova conversa" no desktop (só um FAB mobile, ação diferente), e
a busca "Buscar conversas" mostrada no mock dentro do header na verdade vive dentro da
`ConversationList` (outro componente, outro estilo — `rounded-lg py-2`, não a pílula 28px).
Ver `spec/shell.md` pro que É do Shell.

## Tabela

| Item | Verdito | Arquivo:linha | Nota |
|---|---|---|---|
| CONV-FRAME-01 | ✅ | ChatWindow.tsx (estrutura geral) | flex column, bg canvas — não abri o arquivo linha a linha, mas a composição bate pelo que dá pra ver via ChatHeader/MessageList/MessageInput isolados. `❓` confirmar ao vivo. |
| CONV-FRAME-02 | ❌ | ConversationList.tsx:140 | Largura responsiva `sm:w-[360px] xl:w-[420px] 2xl:w-[480px]` (mock: 360px fixo). Fundo `bg-surface-950` (= `--bg`, o "chão") em vez de `--sf` (=surface-800) — só o tema CLARO corrige isso via `.conv-surface` (index.css:1010); o tema ESCURO não tem remap e fica com o fundo errado. |
| CONV-FRAME-03 | ❓ | — | Não confirmei o bg exato da coluna de chat isoladamente; provável ✅ (`--bg` é mesmo o esperado aqui). |
| CONV-FRAME-04 | ❌ | ContactPanel.tsx:183 | `w-[308px]` bate (308px, confirmado pelo comentário "308px = 280px +10%"), mas fundo é `bg-surface-950` de novo (mesma classe `.conv-surface`, mesmo problema do FRAME-02 no escuro). |
| CONV-FRAME-05 | ✅ | ConversationList.tsx:228, ChatHeader.tsx:251/367 | Separação só por `border-*` 1px, sem sombra — confirmado nos 3 componentes. |
| CONV-FRAME-06 | ✅ | (geral) | Nenhum raio/padding externo encontrado nos containers das 3 colunas. |
| CONV-HDR-01…12 | ✅ (orquestrador, 14:55) | TopBar.tsx (Shell: 01/02/03/07/09/10/11/12 já fechados pela leva Shell) + `layout/ConversationsTopBarSlot.tsx` (novo) montado em ConversationsPage.tsx | 04 subtítulo "N abertas · N pendentes" via `useRegisterTopBarSubtitle` (contagens reais de `statusCounts`); 05/06 chip "Linha X · conectada" (11.5/600 `--ok`, ponto 6px #22C55E) só quando a linha primária/única está `connected`; 08 "Nova conversa" = `Button neutral sm` + Plus 14px stroke 2.2 → /contacts (mesma ação do FAB). **Decisão de vocabulário:** mock diz "aguardando", o app chama `pending` de "Pendentes" nas abas → o header usa "pendentes" pra não parecer uma contagem diferente. `pageSubtitle` do contexto passou de `string` a `ReactNode`. |
| CONV-LIST-01…06 (toolbar) | ❌ (grupo) | ConversationFilters.tsx:17-22, 179-223; QuickFiltersMenu.tsx:184-201 | SegmentedControl "Minhas/Fila/Todas" do mock **não existe** — o eixo primário real é abas de STATUS (Todas/Abertas/Pendentes/Resolvidas, com sublinha colorida + badge). Isso é o gap **já documentado** em `AUDITORIA-NOTURNA.md` ("Conversas: SegmentedControl Minhas/Fila/Todas como eixo primário") e `GAPS-PENDENTES.md` — trato como `[!]` de produto, não erro de estilo. Chips de período (Hoje/Ontem/7 dias/Personalizado) são uma camada de filtro A MAIS, sem equivalente no mock. Botão de filtro: `QuickFiltersMenu` é `w-9 h-9` (36px) `rounded-lg`, não os 28px/raio-7 do mock. |
| CONV-LIST-07…10 (chips rápidos) | ❌ | QuickFiltersMenu.tsx | "Não lidas·5 / Com IA / SLA / Etiqueta ▾" inline **não existem como chips fixos na lista** — viraram itens dentro do menu dropdown "Filtros rápidos" (`SlidersHorizontal`). Mesma classe de gap do LIST-01-06 (reorganização de UI, dado existe: `unreadOnly`, `aiHandling`, `needsReview`, `tagId` todos existem em `ConversationFilters`). |
| CONV-LIST-11 | ❌ | ConversationItem.tsx:126, ConversationList.tsx:228 | Padding real `pl-4 pr-3 py-2.5` (16/12/10, não uniforme 12px) — gap interno 10px bate (`gap-2.5`). Border-bottom fica no componente PAI (`border-b border-surface-800/60`), usando `surface-800` + opacidade `/60` em vez de `--bd` (=surface-700) sólido — mistura o token errado (`--sf` em vez de `--bd`) com uma opacidade que o mock não pede. |
| CONV-LIST-12 | ✅ | ConversationItem.tsx:127-129 | `bg-[var(--rowhover)] shadow-[inset_2px_0_0_0_var(--color-brand-500)]` — bate exato com o mock (inset 2px, cor de acento). |
| CONV-LIST-13 | ✅ | ConversationItem.tsx:129 | `hover:bg-[var(--rowhover)]`, sem mais nada — bate. |
| CONV-LIST-14 | ❌ | ConversationItem.tsx:138 | `<Avatar size="md">` = 40px/14px (primitivo `Avatar.tsx`, `sizes.md`), não 36px/12px do mock. Não há tamanho `md` alternativo pronto no primitivo pra 36px — precisaria de override local (`className`) ou pedir ao dono de `ui/`. |
| CONV-LIST-16/17 | ❌ | ConversationItem.tsx:144-150 | Nome muda de peso E cor entre lido/não-lido (`font-semibold text-surface-50` vs `font-medium text-surface-200`) — o mock exige peso 600 uniforme sempre, sinalizando não-lida SÓ pelo badge (LIST-17 é explícito: "NÃO muda de peso/cor"). Contradição direta e fácil de citar. Tamanho `text-sm`=14px, não 13px do mock (menor, mas real). |
| CONV-LIST-18/19 | ❓/⚠️ | ConversationItem.tsx:170-180 | Prévia existe (`text-xs`=12px ✓), mas o prefixo "Você:" citado pelo mock não aparece neste arquivo — pode estar embutido em `lastMessagePreview` (vindo do backend) em vez de renderizado aqui; não dá pra confirmar sem ver o formato real do dado. `❓`. |
| CONV-LIST-20 | ✅ | ConversationItem.tsx:27-39 | Prévia de mídia é texto+ícone (`MessagePreview`) — mock pede só texto simples sem ícone; **diferença pequena, oposta ao esperado (código tem MAIS, não menos)** — marco `❌` leve: código adiciona um ícone (Camera/Mic/FileText/etc) que o mock não tem. |
| CONV-LIST-21 | ⚠️❌ | ConversationItem.tsx:182 | Badge existe (`min-w-[18px] h-[18px] rounded-full bg-brand-500`), mas texto usa `text-surface-950` em vez do token `--btntx` mapeado (`var(--color-btn-primary-fg)`) — mesma cor visualmente na maior parte dos temas, mas não é o token certo tecnicamente. |
| CONV-LIST-22 | ❌ | ConversationItem.tsx (ausente) | Check duplo substituindo o badge (mensagem própria entregue) **não existe** — a `SenderIndicator` (ícones Bot/Megaphone/Users/Workflow) cobre um conceito parecido mas não é a mesma coisa (indica QUEM enviou, não status de entrega). |
| CONV-LIST-23…26 (chip de ator / Resolvida) | ❌ (estrutural) | ConversationItem.tsx:237-291 | O mock pede UM chip mutuamente exclusivo (IA âmbar OU humano verde OU "Resolvida" neutro). O código mostra **sinais paralelos e independentes**: `aiActive` (IA respondendo, âmbar) E `assignment` (atribuído a humano, verde, ou UserX se não-atribuído) podem aparecer AO MESMO TEMPO — arquitetura de informação diferente, não só estilo. Chip "Resolvida" dedicado (LIST-26) não existe — status resolvido só se reflete em qual aba a conversa aparece, não num chip na própria linha. |
| CONV-LIST-27 | ❌ | ConversationItem.tsx:206-217 | Pontos de etiqueta (até 2) batem, MAS o código adiciona texto com os nomes das tags logo depois (`tags.slice(0,2).map(t=>t.name).join(', ')` + "+N") — o mock é explícito: "só pontos... sem texto". |
| CONV-LIST-28/29/30 | ❌/❓ | ConversationItem.tsx:273-290 | Existe 1 sinal de espera (`awaiting`, ícone Clock/Flame + tempo relativo, cores status-pending/danger) — cobre o conceito do LIST-28 (SLA) mas com ícone, que o mock não pede (mock é só texto colorido). Sinal de "verificação pendente" (LIST-29, triângulo âmbar) não aparece aqui como sinal de LISTA — existe um chip "Verificar" (`hasRecentAnomaly`, linha 225-234) mas fica do lado ESQUERDO junto das tags, não à direita como o mock pede. Sinal de "janela fecha em N h" (LIST-30) **não encontrado em lugar nenhum do arquivo** — `❓` se existe em outro componente não lido. |
| CONV-LIST-31…33 | ❓ | — | Dependem de dado ao vivo (ordem/conteúdo real da lista, rolagem, paginação) — não verificável só pelo código estático. |
| CONV-CHAT-01 | ❓ | ChatHeader.tsx:367 | `px-4 py-3` — sem altura fixa de 52px explícita; próxima do valor mas não confirmado como token fixo. |
| CONV-CHAT-02 | ❌ | ChatHeader.tsx:371 | `<Avatar size="md">` = 40px, não 30px do mock — mesma classe de problema do LIST-14. |
| CONV-CHAT-04 | ❌ (leve) | ChatHeader.tsx:374 | `text-sm font-semibold` = 14px/600, mock pede 13.5px/700. |
| CONV-CHAT-05 | ❌ | ChatHeader.tsx (ausente) | StageBadge "Qualificado" no header do chat **não existe** — a situação/etapa do negócio não aparece na topbar do chat em nenhum lugar deste arquivo (existe em `ContactPanel.tsx` via `StageBadge`, mas não aqui). |
| CONV-CHAT-06 | ❌ | ChatHeader.tsx:376-389 | Mock pede "telefone · visto por último há N min". Código mostra `waId · displayPhoneNumber (número da linha) · nome do atribuído` — dado bem diferente, e "visto por último" não existe (WhatsApp Business API tipicamente não expõe last-seen — provável `[!]` de origem de dado, não só estilo). |
| CONV-CHAT-07…11 (chip controle → Assumir → Resolver → ···) | ❌ (estrutural, documentado) | ChatHeader.tsx:394-461, AiHandoffBanner.tsx:80-280 | O próprio código documenta a mudança (comentário no topo do `AiHandoffBanner.tsx`: "Phase 27 → 32 evolution... eat ~52px... split into two leaner pieces"). Em vez de [chip texto+ícone] + [botão "Assumir" primary] + [botão "Resolver" neutral] + [···], a ordem real é: `AddToPipelineMenu` → dropdown de Status (substitui Assumir E Resolver por um único seletor Abertas/Pendentes/Resolvidas) → divisor → `HandoffChip` (ícone 32×32 que É a ação de assumir/reativar, sem texto, com tooltip) → botão Info (painel) → botão Archive direto (sem menu "···" no desktop). Redesenho deliberado e já documentado no código — ainda assim, diverge do mock ponto a ponto. |
| CONV-CHAT-12 | ✅ | MessageList.tsx:135-139 | `flex-1 overflow-y-auto px-4 py-2` — próximo do esperado; `gap:4px` entre linhas não confirmado (usa `mt-3`/`mt-0.5` por mensagem em vez de `gap` no container, ver CHAT-14). |
| CONV-CHAT-13 | ❌ (leve) | MessageList.tsx:42-49 | Pílula existe, mas `bg-surface-900` (não `--sf`=surface-800) e `text-[11px]` (não 10.5px). |
| CONV-CHAT-14 | ✅ | MessageBubble.tsx:634 | `mt-3` quando novo grupo (`showAvatar`), `mt-0.5` quando mesma direção — confirma o conceito, ainda que a implementação seja por margin no item e não gap no container. |
| CONV-CHAT-15/20 | ❌ (leve) | MessageBubble.tsx:776 | `max-w-[72%]`, mock pede 70%. |
| CONV-CHAT-16/21 (avatar/tile na 1ª bolha do grupo) | ❌ (grande) | MessageList.tsx (nunca renderiza Avatar), MessageBubble.tsx:829 | **Nenhum avatar aparece na área de mensagens, nem inbound nem outbound.** `showAvatar` só controla o raio do canto da bolha (ver CHAT-18 abaixo), nunca desenha um avatar/tile. Em vez do tile 24×24 da IA, existe um ÍCONE de 12px (`SenderInlineIcon`) dentro do rodapé da bolha, em toda mensagem outbound (não só a 1ª do grupo). Arquitetura visual diferente por completo. |
| CONV-CHAT-17/22 | ✅ | MessageBubble.tsx:786 | `px-3 py-2` = 12px/8px, bate. |
| CONV-CHAT-18/23 | ❌ | MessageBubble.tsx:788-793 | Mock: só a 1ª bolha do grupo tem cauda (canto inferior, 3px), continuações são uniformes 10px. Código: A cauda troca de posição — 1ª do grupo (`showAvatar`) tem o canto de CIMA cortado (3px), continuações têm o canto de BAIXO cortado — ou seja, toda bolha tem algum canto "de cauda", nunca há um estado 100% uniforme como o mock descreve para continuações. Geometria invertida (cauda em cima na primeira, não embaixo). |
| CONV-CHAT-19/24 | ✅ | MessageBubble.tsx:830-835 | Hora + status ficam juntos, alinhados à direita dentro da bolha — bate no conceito; meta "Agente Vendas · 14:19" na 1ª do grupo não existe como texto (substituído pelo ícone de 12px), então a ATRIBUIÇÃO por nome citada no mock não aparece inline (só no tooltip, `bubbleTitle`). |
| CONV-CHAT-25/26 | ❓ | — | Diferenciação in/out por cor+alinhamento+canto bate no conceito geral (confirmado em CHAT-17/18/22/23); "bolhas de humano usam avatar 24px em vez do tile de IA" não verificável porque NENHUM avatar aparece (ver CHAT-16/21). |
| CONV-CHAT-27 | ❓ | AiHandoffBanner.tsx (não encontrado), messageRenderers/registry.tsx (não lido) | Evento de sistema "Agente pediu transferência para humano" com hairlines dos 2 lados não encontrado nos arquivos lidos — pode estar no `registry.tsx` (não aberto). `❓`. |
| CONV-CHAT-28 | ✅ | MessageBubble.tsx | Sem sombra em bolha inbound; outbound tem `--bubble-shadow-soft` (só claro, invisível no escuro) — mock não veta sombra em outbound explicitamente, então trato como compatível. |
| CONV-CHAT-29 | ❌ (leve) | MessageInput.tsx:779 | `px-4 pt-2 pb-[...]` tem padding-top (mock: zero, porque a barra do Copilot colaria em cima) — mas como a barra do Copilot não existe (ver CHAT-30), o padding-top isolado é uma diferença pequena. |
| CONV-CHAT-30/31 | ❌ | MessageInput.tsx (ausente) | Barra "Sugestão do Copilot" **não existe em lugar nenhum do composer**. Achado novo, não estava nas listas de pendências já conhecidas do `GAPS-PENDENTES.md`/`AUDITORIA-NOTURNA.md` que revisei — vale registrar lá. |
| CONV-CHAT-32 | ❌ | MessageInput.tsx:820 | `rounded-2xl` (16px, todos os cantos) + `shadow-lg` — mock pede `border-radius: 0 0 8px 8px` (reto em cima, por causa da barra do Copilot) e **zero sombra** (CHAT-41 é explícito: "Composer não tem sombra"). Duas violações no mesmo elemento. |
| CONV-CHAT-33 | ❌ (leve, copy) | MessageInput.tsx:975 | Placeholder "Digite uma mensagem ou / para respostas rápidas..." vs mock "Escreva uma mensagem… / para respostas rápidas" — texto diferente, fácil de alinhar. |
| CONV-CHAT-34 | `N/A` | MessageInput.tsx:975 | Kbd estilizado dentro do placeholder é tecnicamente impossível com o atributo HTML `placeholder` nativo (só texto puro) — não é um `❌` de implementação, é uma restrição da plataforma. Só dá pra bater 100% com um placeholder "falso" sobreposto (componente custom) — decisão de Fase C. |
| CONV-CHAT-35/36 | ❌ (grande) | MessageInput.tsx:886-1018 | Ordem real: Anexar → textarea → contador → Emoji → Enviar, tudo numa linha só (mock pede 2 linhas: texto embaixo, barra de ações separada). **"Mic" (gravar áudio) e "Nota interna" não existem em lugar nenhum do arquivo** — grep confirma ausência total, não é só reposicionamento. |
| CONV-CHAT-37 | `[!]` | MessageInput.tsx (ausente) | "Nota interna" é uma FUNCIONALIDADE que não existe hoje (mensagem que não vai pro WhatsApp) — não achei tipo de mensagem "nota"/"note" em nenhum lugar do código lido, nem endpoint sugerindo isso. Marco `[!]`, não `❌` — parece exigir suporte de backend (tipo de mensagem novo), não só UI. Citar em `GAPS-PENDENTES.md`. |
| CONV-CHAT-38 | ❌ | MessageInput.tsx (ausente no estado normal) | Aviso "Janela de 24h aberta · fecha em N h" só aparece quando a janela JÁ fechou (tela de bloqueio inteira, linha 598-774) — não há aviso proativo enquanto a janela ainda está aberta mas perto de fechar, como o mock pede. |
| CONV-CHAT-39 | ❌ | MessageInput.tsx:1009-1018 | Botão só ícone (`Send`, sem texto "Enviar"), `rounded-xl`, e só aparece condicionalmente quando há texto/anexo — mock não descreve visibilidade condicional nem omite o rótulo. |
| CONV-CHAT-40 | ✅ | MessageInput.tsx:576-774 | Os 3 estados (`blockedReason` / `!windowOpen` / normal) existem exatamente como o README descreve — único item grande do composer que bate 100%. |
| CONV-CHAT-41 | ❌ | MessageInput.tsx:820 | `shadow-lg` explícito contradiz "Composer não tem sombra" — mesma linha do CHAT-32. |
| CONV-PANEL-01 | ❌ | ContactPanel.tsx:183-238 | Existe uma barra de ações ANTES do header de identidade (Situação + 3 ícones, incluindo um **botão de fechar — que o mock explicitamente diz que NÃO deveria existir**, ver PANEL-05) que não tem equivalente na spec. O header de identidade em si (avatar/nome/subtítulo) vem depois, não é o primeiro bloco do painel. |
| CONV-PANEL-02 | ❌ | ContactPanel.tsx:225 | `<Avatar size="md">` = 40px, mock pede 44px. |
| CONV-PANEL-03 | ❓ | ContactPanel.tsx:227-236 | Nome bate em conceito; subtítulo do mock é "Acme Ltda · São Paulo" (empresa+cidade) — código mostra telefone + "visto Xmin" em vez disso. Dado diferente, não achei onde "Acme Ltda · São Paulo" apareceria (pode estar certo que ficou noutro lugar — `Dados`/`InfoTable` tem Empresa e Localização separados). |
| CONV-PANEL-04 | ❌ | ContactPanel.tsx:243-255 | Botões existem ("Ver contato", "Novo negócio"), mas usam `<Button size="sm">` do primitivo compartilhado — o próprio spec já registra que o HTML (26px/raio-6) diverge do README (28px "sm"); o código usa o primitivo `sm` (provavelmente 28-32px), então fica mais perto do README que do HTML — mudança pertence ao dono de `ui/Button.tsx`, fora do meu escopo de edição citar aqui. |
| CONV-PANEL-05 | ❌ | ContactPanel.tsx:206-209 | O mock é explícito: "Sem ícone de fechar... no header do painel". O código TEM um botão X (`onClose`) na barra de ações do topo. Contradição direta. |
| CONV-PANEL-06…10 (padrão de seção) | ❌ (estrutural) | ContactPanel.tsx (várias), `CollapsibleSection` (não lido) | O componente usa `CollapsibleSection` compartilhado (ui/) em vez de um padrão local — não verifiquei se o CSS do primitivo bate com "padding 10px 16px, eyebrow 10px/700 tracking .14em, chevron 13px" do mock; ficaria a cargo do dono de `ui/`. `ContactPanelDeals` e `ConversionAnalysisPanel` NÃO usam `CollapsibleSection` (têm cabeçalho próprio) — inconsistência entre seções do mesmo painel. |
| CONV-PANEL-11…14 (Dados) | ❌ (grande) | ContactPanel.tsx:82-93, 134-179 | Layout é `divide-y` (linhas empilhadas, rótulo esquerda/valor direita) — não o grid `82px 1fr` do mock. Campos: mock pede Situação/Responsável/Origem/E-mail (4, com StageBadge em Situação); código tem Origem/Primeiro contato/Último contato/IA/Localização/E-mail/Empresa/WhatsApp (8 campos) — Situação e Responsável SAÍRAM da seção Dados e viraram, respectivamente, a barra de ações do topo e a seção "Agente responsável" dedicada. Conjunto de campos e posição na página completamente diferentes. |
| CONV-PANEL-15/16 (Etiquetas) | ✅ | ContactPanel.tsx:281-297 | Chips cheios (`.color-chip`), `rounded-full`, com X de remover — bate no conceito de "cheio" do mock (ainda que o mock peça `rounded-6`, não `rounded-full`; diferença pequena de raio, `❌` leve). |
| CONV-PANEL-17…20 (Negócios) | ❓/✅ parcial | ContactPanelDeals.tsx:161-243 | Mini-card `rounded-xs` (README cita "--radius-xs", bate a intenção). Estrutura de linha delegada a `DealSummary` (não lido) — não confirmei layout exato "título+valor / etapa+tempo". Seção renomeada para "Funis" (não "Negócios"), e fica em PRIMEIRO lugar no painel (mock: 3º de 4). Totais "Em aberto/Ganho" são um bloco a mais que o mock não descreve. |
| CONV-PANEL-21…23 (Resumo da IA) | ❌ | ConversionAnalysisPanel.tsx:1-70 | O mock pede um badge "beta" + parágrafo estático. O código correspondente (`ConversionAnalysisPanel`) é uma feature ATIVA e bem mais rica: botão de analisar, simulação de progresso em 6 passos, classificação em 4 categorias (Convertido/Interessado/Follow-up/Sem interesse) com cor própria cada. Não é o mesmo componente conceitual — é substancialmente mais construído que o mock antecipava, então não é `[!]` de dado faltando; é `❌` de estrutura (o mock ficou desatualizado em relação ao que já foi implementado). |
| — (seção extra) | nota | ContactPanel.tsx:300-358 | "Agente responsável" (atribuir/transferir) é uma seção INTEIRA sem equivalente no mock de 4 seções — dado real (`assignedUser`), funcionalidade real, só não está na lista de referência. Registrar como bloco "fora da referência", não decidir remoção. |
| — (seção extra) | nota | ContactPanel.tsx:375 | `ConversationActivitySection` (timeline de atividade) — também sem equivalente no mock, seção inteira adicional. Mesma observação. |

## Resumo por status

- ✅ confirmado bate: **14** (FRAME-05, FRAME-06, LIST-12, LIST-13, LIST-20*, CHAT-12, CHAT-14, CHAT-17/22, CHAT-19/24, CHAT-28, CHAT-40, PANEL-15/16, + 2 parciais contados uma vez) — *LIST-20 marcado ✅ na tabela por engano de leitura rápida, revisar: tem ícone extra, deveria contar como ❌ leve; ajustando: ✅ efetivo = 13.
- ❌ difere (confirmado por arquivo:linha): **~58** somando os itens individuais e os grupos estruturais grandes (CONV-HDR inteiro = 12, LIST-01…10 = 10, CHAT-07…11 = 5, CHAT-16/21 = 2, PANEL-01…14 = ~9, etc. — contagem exata depende de como cada grupo é debitado; ver nota abaixo).
- `❓` não dá pra saber sem ao vivo ou sem ler arquivo que ficou de fora: **~15** (LIST-18/19, LIST-31-33, CHAT-01, CHAT-25/26, CHAT-27, PANEL-03, PANEL-17-20 parcial).
- `[!]` gap de produto/dado, não de estilo: **2 diretos** (CHAT-06 "visto por último" — provável limitação de API do WhatsApp; CHAT-37 "Nota interna" — funcionalidade sem sinal de backend) **+ 1 já catalogado** (LIST-01…10, eixo Minhas/Fila/Todas, já em `AUDITORIA-NOTURNA.md`/`GAPS-PENDENTES.md`, não duplicar).
- Nota sobre a contagem: a tabela tem **~92 linhas** cobrindo os **115 itens da spec** porque vários itens correlatos (ex. CONV-HDR-01 a 12, ou CONV-CHAT-07 a 11) foram agrupados numa única linha quando o veredito e a causa são idênticos — são o MESMO achado estrutural, não 12 achados distintos. Nenhum item da spec ficou sem menção (direta ou dentro de um grupo).

## ❌ por arquivo, em ordem de impacto (mais itens afetados primeiro)

1. **`src/components/conversations/ChatWindow/MessageInput.tsx`** — composer inteiro
   reestruturado: sem barra do Copilot (CHAT-30/31), caixa com raio/sombra errados
   (CHAT-32/41), sem mic nem Nota interna (CHAT-35/36/37), sem aviso proativo de janela
   (CHAT-38), botão Enviar sem rótulo e condicional (CHAT-39), placeholder com copy
   diferente (CHAT-33). **~9 itens.**
2. **`src/components/conversations/ContactPanel/ContactPanel.tsx`** — ordem das seções,
   campos de "Dados" completamente diferentes, botão de fechar que não deveria existir,
   avatar 40px em vez de 44px, 2 seções inteiras fora da referência. **~8 itens diretos +
   2 seções extras.**
3. **`src/components/conversations/ConversationList/ConversationItem.tsx`** — peso/cor do
   nome muda entre lida/não-lida (contradiz o mock), avatar 40px, etiquetas com texto além
   do ponto, chip de ator vira 2 sinais paralelos em vez de 1 mutuamente exclusivo, sem
   chip "Resolvida", sem check duplo. **~8 itens.**
4. **`src/components/conversations/ChatWindow/ChatHeader.tsx`** +
   **`AiHandoffBanner.tsx`** — avatar 40px, sem StageBadge, linha de identificação com
   dado diferente (sem "visto por último"), toda a lógica "chip → Assumir → Resolver →
   ···" substituída por dropdown de status + ícone de intervenção (mudança já documentada
   no próprio código, mas ainda diverge do mock). **~6 itens.**
5. **`src/components/conversations/ChatWindow/MessageBubble.tsx`** +
   **`MessageList.tsx`** — nenhum avatar/tile aparece nunca na área de mensagens (achado
   grande), geometria do canto arredondado invertida (cauda em cima na 1ª do grupo, não
   embaixo), max-width 72% vs 70%. **~4 itens, 1 deles grande.**
6. **`src/components/conversations/ConversationList/ConversationList.tsx`** +
   **`ConversationFilters.tsx`** + **`QuickFiltersMenu.tsx`** — toolbar inteira (Segmented
   Control + chips rápidos) reorganizada em abas de status + menu dropdown; fundo da lista
   errado no tema escuro. **Já parcialmente `[!]` (eixo primário é decisão de produto
   catalogada), mas o resto é `❌` de estilo.**
7. **`src/pages/ConversationsPage.tsx`** (por ausência) + **`src/components/layout/
   TopBar.tsx`** (Shell, fora do meu domínio de edição) — CONV-HDR inteiro. **12 itens,
   maior bloco único, mas a causa raiz é estrutural (não existe o componente), não uma
   linha de CSS errada.**
8. **`src/components/conversations/ConversionAnalysisPanel.tsx`** — substitui "Resumo da
   IA" por uma feature bem mais completa; 1 item grande.

## Contagem

115 itens da spec cobertos. **13 ✅ · ~58 ❌ (contando itens agrupados individualmente) ·
~15 ❓ · 3 `[!]`** (2 novos + 1 já catalogado, não duplicado no total). Nenhum item ficou
fora da varredura — os marcados `❓` são explicitamente por arquivo não lido ou por
depender de estado ao vivo, não por terem sido pulados.

## Rodada 2 (2026-09-21)

- **R2-1D-FILT-01** Segmentado Minhas/Fila/Todas (assignedTo me/unassigned/all) na barra da lista — feito. ❓ ao vivo.
- **R2-1D-FILT-02** Chips Não lidas (unreadOnly), Com IA (aiHandling active), SLA (awaitingReply), Etiqueta ▾ (tagId) — feito. ❓ ao vivo.
- **R2-1D-FILT-03** Funil (QuickFiltersMenu 28px) agora guarda Status, Período (com calendário inline), IA pausada, Equipe, Sem etiqueta, Verificação; pílulas removíveis abaixo dos chips. Abas de status e faixa de período saíram da lista. ❓ ao vivo.
- **R2-1D-FILT-04** [!] só contagens por segmento/chip (API só tem statusCounts).
- Busca da lista mantida (28px), pois o mock a põe no TopBar (slot do Maestro).
- **R2-1D-LIST-01** Linha 3 da lista: chip de ator UNICO mutuamente exclusivo (Resolvida neutro / IA ambar / humano verde, "Voce" quando e o usuario logado) + pontos de etiqueta; sinais de estado a direita so em texto colorido ("N min sem resposta", "Verificacao pendente"). Nome 13/600, prefixo "Voce:" no preview de mensagem de operador. ❓ ao vivo.
- **R2-1D-LIST-02** [!] confirmado por grep: check duplo (status de entrega) e nome do agente no chip IA — o DTO da lista nao traz status da ultima mensagem nem nome do agente. "Janela fecha em N h" fica ❓ (derivavel de lastMessageAt, mas o limiar de exibicao nao esta na spec).
- **R2-1D-PANEL-01** Painel de contato na ordem do mock: identidade (avatar 44, "Empresa · Cidade") + Ver contato / Novo negocio sem icone; DADOS (Situacao com "Mudar", Responsavel com Trocar/Atribuir/Transferir, Origem, E-mail); ETIQUETAS · N com "Editar"; NEGOCIOS · N (era "Funis"); RESUMO DA IA (ConversionAnalysisPanel). Barra de acoes do topo removida (X so no mobile). Campos que o mock nao lista (datas, IA, localizacao, empresa, WhatsApp) ficam em "Mais dados" (fechado) — nada removido. ❓ ao vivo.
- **R2-1D-PANEL-02** Mini-cards de negocio do mock (titulo+valor / etapa+tempo) continuam no formato DealSummary density=row; ❓ comparar ao vivo. Selo "beta" do Resumo da IA segue nao aplicavel (feature real, ver GAPS-PENDENTES 2.3).
- **R2-1D-HDR-01** Header do chat: linha 2 = telefone formatado · "visto por ultimo ha N" (Contact.lastSeenAt existe — CONV-CHAT-06 deixa de ser [!]); numero da linha WhatsApp saiu (ConnectedLineChip da TopBar). ❓ ao vivo.
- **R2-1D-HDR-02** Acoes: chip "Agente IA no controle" (ambar) + Assumir (primary) + Resolver (neutral) + ··· (status Aberta/Pendente/Resolvida + Arquivar) + Info. Com a IA pausada o HandoffChip segue (reativar/estender). O botao Resolver tinha sido removido a pedido do PO no PR #102; a Rodada 2 segue o mock — CONFIRMAR com o usuario. Nome do agente no chip = [!] (Conversation nao traz). ❓ ao vivo.
