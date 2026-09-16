# Spec 1d — Conversas/Inbox (Fase A: extração, sem código)

Fontes, por autoridade: (1) `Oryon-Reestilizacao-canvas.html`, bloco `id="1d"`
(byte ~653k–681k, markup inline exato) e o mapa de tokens `light`/`dark` do
`renderVals()`; (2) `telas/01-1d-conversas-inbox.png` (claro) e
`02-1d-conversas-inbox.png` (escuro); (3) `README.md` §3.3 + §1–2.
Tudo abaixo vem do HTML salvo onde marcado **[PNG]** (estimado pela imagem) ou
**[README]** (regra não visível no protótipo). Onde README e HTML divergem, os
dois valores estão anotados — o HTML manda.

## T — Tokens resolvidos (o protótipo usa só estes nomes)

| token | claro | escuro | uso na tela |
|---|---|---|---|
| `--bg` | `#FAFAFC` | `#060909` | fundo da área de chat |
| `--sf` | `#FFFFFF` | `#161E1E` | topbar, coluna da lista, header do chat, painel, pílula "Hoje" |
| `--sf2` | `#F5F6F8` | `#0E1414` | busca, segmento ativo, chip "Resolvida" |
| `--bd` | `#E4E6EC` | `#243333` | TODA separação (colunas, linhas, bolhas in, cards) |
| `--bd2` | `#C8CDD8` | `#2E4040` | borda de ênfase: botões neutral, composer, kbd |
| `--tx` / `--tx2` / `--tx3` | `#1A1F2E` / `#5C657A` / `#9098AA` | `#ECF1F1` / `#8FA5A5` / `#6B8080` | principal / secundário / terciário |
| `--ac` | `#14B8A6` | `#2DD4BF` | inset do item ativo, badge não-lida, check duplo |
| `--acs` | `#0F766E` | `#2DD4BF` | acento forte: texto do chip ativo, Copilot, "Editar" |
| `--acsoft` | `rgba(20,184,166,.12)` | `rgba(45,212,191,.14)` | fundo chip ativo, tile da IA, barra Copilot |
| `--btn` / `--btntx` | `#0F766E` / `#FFFFFF` | `#2DD4BF` / `#04201D` | Assumir, Enviar, texto do badge não-lida |
| `--rowhover` | `#F5F6F8` | `#1B2525` | fundo do item ativo/hover |
| `--bin` | `#FFFFFF` | `#161E1E` | bolha inbound |
| `--bout` | `#0F766E` | `#16443C` | bolha outbound (texto `#fff` fixo) |
| `--comp` | `#F5F6F8` | `#0E1414` | fundo do composer |
| `--ok` / `--okbg` | `#15803D` / `rgba(21,128,61,.10)` | `#22C55E` / `rgba(34,197,94,.14)` | chip humano assumiu |
| `--amber` / `--amberbg` | `#B45309` / `rgba(180,83,9,.10)` | `#FBBF24` / `rgba(251,191,36,.14)` | chip IA no controle, evento handoff, verificação |
| `--dg` | `#B91C1C` | `#EF4444` | "18 min sem resposta" |
| `--avs` / `--avi` | `#374151` / `#FFFFFF` | `#B5C8C8` / `#060909` | disco / inicial do avatar (papéis trocados por tema) |
| `--sb` / `--sbtx` | `#0E1414` / `#8FA5A5` | idem | rail (shell, fora deste spec) |

Hardcodes que NÃO trocam por tema: ponto verde da linha `#22C55E`; hex de
etiqueta/etapa do tenant (`#EC4899`, `#0EA5E9`, `#F59E0B`, `#10B981`, `#7C3AED`);
texto da bolha out `#fff` e meta `rgba(255,255,255,.7)`.

Frame: 1440×880, `font-family:'Plus Jakarta Sans'`, `font-variant-numeric:
tabular-nums`, 13px/1.5, `color:var(--tx)`. Rail de 62px à esquerda é o Shell
(spec 7a) — fora daqui.

---

## CONV-FRAME — layout das 3 colunas

- **CONV-FRAME-01** Coluna principal: `flex:1;min-width:0;flex-direction:column;background:var(--bg);overflow:hidden`.
- **CONV-FRAME-02** Lista: `width:360px;flex:none;border-right:1px solid var(--bd);background:var(--sf)`. Sem sombra.
- **CONV-FRAME-03** Chat: `flex:1;min-width:0;background:var(--bg)` (mais escuro/claro que as colunas laterais que são `--sf`).
- **CONV-FRAME-04** Painel do contato: `width:308px;flex:none;border-left:1px solid var(--bd);background:var(--sf);font-size:12.5px` (tamanho-base do painel é 12.5, não 13).
- **CONV-FRAME-05** Separação entre colunas é EXCLUSIVAMENTE a hairline `--bd` de 1px — [README] "nada de sombra entre colunas".
- **CONV-FRAME-06** [PNG] Nenhuma coluna tem raio, padding externo ou "canvas flutuante"; encostam no topbar e no rail.

## CONV-HDR — topbar da página (48px)

- **CONV-HDR-01** Barra: `height:48px;flex:none;display:flex;align-items:center;gap:12px;padding:0 16px;border-bottom:1px solid var(--bd);background:var(--sf)`.
- **CONV-HDR-02** Grupo do título: `display:flex;align-items:baseline;gap:8px`.
- **CONV-HDR-03** Título "Conversas": `14px/700; letter-spacing:-.01em; color:var(--tx)`. (README §1.1 tabela diz 16px para "Título de página"; o protótipo desta tela usa **14px** — HTML manda.)
- **CONV-HDR-04** Subtítulo "38 abertas · 12 aguardando": `12px/400; color:var(--tx2)`, na mesma linha, baseline alinhada.
- **CONV-HDR-05** Chip de linha "Linha Vendas · conectada": `inline-flex;gap:6px;11.5px/600;color:var(--ok)`; sem fundo, sem borda.
- **CONV-HDR-06** Ponto do chip de linha: `6×6px;border-radius:50%;background:#22C55E` (hardcode, os 2 temas).
- **CONV-HDR-07** Grupo direito: `margin-left:auto;display:flex;align-items:center;gap:8px`. Ordem: Nova conversa → Busca → Sino → Avatar.
- **CONV-HDR-08** Botão "Nova conversa" (= Button `neutral sm`): `h28;padding:0 10px;border-radius:7px;border:1px solid var(--bd2);background:var(--sf);12px/600;gap:6px`; ícone `+` 14px, `stroke-width:2.2`, à esquerda.
- **CONV-HDR-09** Busca: `width:200px;h28;padding:0 10px;border-radius:7px;border:1px solid var(--bd);background:var(--sf2);color:var(--tx3);12px;gap:8px`; ícone lupa 14px stroke 2; placeholder "Buscar".
- **CONV-HDR-10** Kbd "/" dentro da busca: `margin-left:auto;font-family:'JetBrains Mono';10.5px;border:1px solid var(--bd2);border-radius:4px;padding:0 4px`.
- **CONV-HDR-11** Sino: `28×28;border-radius:7px;color:var(--tx2)`; ícone 16px stroke 2; sem fundo/borda; [PNG] sem badge nesta tela.
- **CONV-HDR-12** Avatar do usuário: `28×28;border-radius:30%;background:var(--avs);color:var(--avi);10.5px/700` iniciais "RC".

## CONV-LIST — coluna da lista (360px)

### Toolbar
- **CONV-LIST-01** Linha da toolbar: `display:flex;align-items:center;gap:6px;padding:10px 12px 0` (sem padding inferior; a linha de chips fecha o bloco).
- **CONV-LIST-02** SegmentedControl: `inline-flex;border:1px solid var(--bd);border-radius:7px;overflow:hidden;12px/600`; segmentos colados.
- **CONV-LIST-03** Segmento (todos): `padding:0 10px;height:28px;inline-flex;align-items:center`.
- **CONV-LIST-04** Segmento ativo "Minhas": `background:var(--sf2);color:var(--tx)`; contagem "7" em `<span>` `margin-left:5px;color:var(--tx2)`.
- **CONV-LIST-05** Segmentos inativos "Fila 12" / "Todas": `color:var(--tx2);border-left:1px solid var(--bd)` (divisor entre segmentos é borda, não gap); contagem "12" `margin-left:5px` herda `--tx2`.
- **CONV-LIST-06** Botão de filtro: `margin-left:auto;28×28;border-radius:7px;border:1px solid var(--bd2);color:var(--tx2)`; ícone funil 14px stroke 2; sem fundo.

### Chips rápidos
- **CONV-LIST-07** Linha de chips: `display:flex;gap:6px;padding:8px 12px 10px;border-bottom:1px solid var(--bd);11px/600`.
- **CONV-LIST-08** Chip ativo "Não lidas · 5": `h22;padding:0 8px;border-radius:6px;background:var(--acsoft);color:var(--acs)`; SEM borda.
- **CONV-LIST-09** Chips inativos "Com IA", "SLA", "Etiqueta ▾": `h22;padding:0 8px;border-radius:6px;border:1px solid var(--bd);color:var(--tx2)`; sem fundo.
- **CONV-LIST-10** "Etiqueta ▾": caret é o caractere `▾` no texto (não ícone SVG).

### Item da lista (estrutura)
- **CONV-LIST-11** Item: `display:flex;gap:10px;padding:10px 12px;border-bottom:1px solid var(--bd)`. **Sem raio, sem borda própria, sem margem/gap entre itens, sem sombra** — a única separação é a hairline inferior.
- **CONV-LIST-12** Item ativo (Mariana): `background:var(--rowhover);box-shadow:inset 2px 0 0 var(--ac)` (barra de 2px colada na borda esquerda). [README] "substitui o hack de gradiente de borda do tema claro".
- **CONV-LIST-13** Item hover: [README] fundo `--rowhover`; [PNG] nenhum outro efeito (sem borda, sem elevação).
- **CONV-LIST-14** Avatar: `36×36;border-radius:50%;background:var(--avs);color:var(--avi);12px/700;flex:none`; iniciais de 2 letras.
- **CONV-LIST-15** Coluna de conteúdo: `flex:1;min-width:0;flex-direction:column;gap:2px`; 3 linhas.
- **CONV-LIST-16** Linha 1: `display:flex;align-items:center;gap:6px` — nome `13px/600;flex:1;nowrap;ellipsis` + hora `11px;color:var(--tx3)` (sem peso, sem "há").
- **CONV-LIST-17** Nome NÃO muda de peso/cor entre lida e não-lida (todos 600 `--tx`); a não-lida é sinalizada só pelo badge.
- **CONV-LIST-18** Linha 2: `display:flex;align-items:center;gap:6px` — prévia `12px;color:var(--tx2);flex:1;nowrap;ellipsis`.
- **CONV-LIST-19** Prefixo de autoria na prévia: `<span style="color:var(--tx3)">Você:</span>` seguido do texto em `--tx2` (Acme, Eduardo).
- **CONV-LIST-20** Prévia de mídia: texto simples "Áudio · 0:42" / "Proposta_Acme.pdf" — [HTML] sem ícone de mídia na prévia.
- **CONV-LIST-21** Badge não-lida: `min-width:18px;height:18px;padding:0 5px;border-radius:9px;background:var(--ac);color:var(--btntx);10.5px/700`; à direita da prévia.
- **CONV-LIST-22** Check duplo (última mensagem sua, entregue): SVG `14×14;stroke:var(--ac);stroke-width:2.2` no lugar do badge (Acme).
- **CONV-LIST-23** Linha 3: `display:flex;align-items:center;gap:6px;margin-top:2px` — [chip de ator] [pontos de etiqueta…] [sinal à direita `margin-left:auto`].
- **CONV-LIST-24** Chip de ator, IA no controle ("Agente Vendas", "Agente Suporte"): `inline-flex;gap:4px;h17;padding:0 6px;border-radius:5px;background:var(--amberbg);color:var(--amber);10.5px/700` + ícone bot 10px `stroke-width:2.4`. **Âmbar = IA** (convenção invertida deliberada, [README] "não corrigir").
- **CONV-LIST-25** Chip de ator, humano assumiu ("Você", "Rafael", "Ana"): mesmas medidas, `background:var(--okbg);color:var(--ok)`, SEM ícone. **Verde = humano**.
- **CONV-LIST-26** Chip de status "Resolvida" (Carlos): `h17;padding:0 6px;border-radius:5px;background:var(--sf2);border:1px solid var(--bd);color:var(--tx2);10.5px/600`; substitui o chip de ator; sem badge; sem linha 3 extra.
- **CONV-LIST-27** Etiquetas na linha 3: só PONTOS `6×6px;border-radius:50%;background:<hex cru do tenant>` (`#EC4899`, `#0EA5E9`, `#F59E0B`, `#10B981`), até 2, sem texto, sem pílula. [README] "pontos de 6px para etiquetas (não pílulas)".
- **CONV-LIST-28** Sinal SLA estourado: `margin-left:auto;10.5px/600;color:var(--dg)` "18 min sem resposta" (Mariana).
- **CONV-LIST-29** Sinal verificação: `margin-left:auto;inline-flex;gap:3px;10.5px/600;color:var(--amber)` + ícone triângulo 10px stroke 2.4 "Verificação pendente" (Beatriz).
- **CONV-LIST-30** Sinal janela: `margin-left:auto;10.5px/400;color:var(--tx3)` "janela fecha em 3 h" (Eduardo).
- **CONV-LIST-31** Item sem sinal à direita (João, Acme, Renata): linha 3 termina no último ponto; nada preenche o espaço.
- **CONV-LIST-32** Ordem/conteúdo do mockup (7 itens): Mariana (ativa, badge 2, IA, 2 pontos, SLA vermelho) · João (badge 1, "Você" verde, 1 ponto) · Acme ("Você:" + check duplo, "Rafael", 2 pontos) · Beatriz (áudio, IA "Agente Suporte", verificação âmbar) · Carlos ("Resolvida") · Renata ("Ana", 1 ponto) · Eduardo ("Você:" pdf, "Rafael", janela).
- **CONV-LIST-33** [PNG] Lista rola dentro da coluna; sem rodapé, sem paginação, sem "carregar mais" visível.

## CONV-CHAT — coluna do chat

### Header (52px)
- **CONV-CHAT-01** Header: `height:52px;flex:none;display:flex;align-items:center;gap:10px;padding:0 16px;border-bottom:1px solid var(--bd);background:var(--sf)`.
- **CONV-CHAT-02** Avatar: `30×30;border-radius:50%;background:var(--avs);color:var(--avi);11px/700`.
- **CONV-CHAT-03** Bloco de nome: `flex-direction:column;line-height:1.25`; linha 1 `display:flex;align-items:center;gap:8px`.
- **CONV-CHAT-04** Nome: `13.5px/700`.
- **CONV-CHAT-05** StageBadge "Qualificado": `inline-flex;gap:5px;h18;padding:0 6px;border-radius:5px;border:1px solid var(--bd);10.5px/600`; ponto `5×5px;border-radius:50%;background:#7C3AED` (hex cru da etapa); sem fundo.
- **CONV-CHAT-06** Linha de identificação: `11.5px;color:var(--tx2)` "+55 11 98765-4321 · visto por último há 3 min".
- **CONV-CHAT-07** Grupo direito: `margin-left:auto;gap:8px`. Ordem: chip de controle → Assumir → Resolver → `···`.
- **CONV-CHAT-08** Chip "Agente Vendas no controle": `inline-flex;gap:6px;h28;padding:0 10px;border-radius:7px;background:var(--amberbg);color:var(--amber);12px/700` + ícone bot 13px stroke 2.2. Sem borda.
- **CONV-CHAT-09** "Assumir" (= `primary sm`): `h28;padding:0 10px;border-radius:7px;background:var(--btn);color:var(--btntx);12px/600`.
- **CONV-CHAT-10** "Resolver" (= `neutral sm`): `h28;padding:0 10px;border-radius:7px;border:1px solid var(--bd2);background:var(--sf);12px/600`.
- **CONV-CHAT-11** `···`: `28×28;border-radius:7px;border:1px solid var(--bd2);color:var(--tx2)`; ícone 15px (3 círculos r=1).

### Histórico
- **CONV-CHAT-12** Área: `flex:1;min-height:0;padding:16px 20px;display:flex;flex-direction:column;gap:4px;justify-content:flex-end;overflow:hidden` — mensagens ancoradas embaixo; **4px entre linhas do mesmo grupo**.
- **CONV-CHAT-13** Separador de dia "Hoje": `align-self:center;10.5px/600;color:var(--tx3);padding:2px 8px;border:1px solid var(--bd);border-radius:6px;background:var(--sf);margin-bottom:8px`. [README] "pílula centrada com borda".
- **CONV-CHAT-14** Novo grupo (troca de remetente): `margin-top:8px` na primeira linha do grupo.
- **CONV-CHAT-15** Linha inbound: `display:flex;gap:8px;align-items:flex-end;max-width:70%` (alinhada à esquerda por padrão).
- **CONV-CHAT-16** Avatar inbound: `24×24;border-radius:50%;background:var(--avs);color:var(--avi);9px/700` SÓ na primeira bolha do grupo; nas seguintes um espaçador `width:24px;flex:none` mantém o recuo.
- **CONV-CHAT-17** Bolha inbound: `padding:8px 12px;background:var(--bin);border:1px solid var(--bd);13px;line-height:1.45;color:var(--tx)`.
- **CONV-CHAT-18** Raio inbound: primeira do grupo `10px 10px 10px 3px` (cauda no canto inferior-esquerdo); continuação `10px` uniforme.
- **CONV-CHAT-19** Hora inbound: `display:block;text-align:right;10.5px;color:var(--tx3);margin-top:3px` dentro da bolha.
- **CONV-CHAT-20** Linha outbound: `display:flex;flex-direction:row-reverse;gap:8px;align-items:flex-end;max-width:70%;align-self:flex-end`.
- **CONV-CHAT-21** Tile da IA (outbound por agente): `24×24;border-radius:6px;background:var(--acsoft);color:var(--acs)` + ícone bot 13px stroke 2.2 — quadrado arredondado, NÃO círculo; só na primeira bolha do grupo (depois espaçador 24px).
- **CONV-CHAT-22** Bolha outbound: `padding:8px 12px;background:var(--bout);13px;line-height:1.45;color:#fff`; **sem borda**.
- **CONV-CHAT-23** Raio outbound: primeira do grupo `10px 10px 3px 10px` (cauda inferior-direita); continuação `10px`.
- **CONV-CHAT-24** Meta outbound: `display:flex;justify-content:flex-end;align-items:center;gap:4px;10.5px;color:rgba(255,255,255,.7);margin-top:3px` — primeira do grupo "Agente Vendas · 14:19", continuação só "14:19"; check duplo SVG 13px stroke 2.2 `currentColor` após a hora.
- **CONV-CHAT-25** Bolhas de humano (operador) [README]: mesmo `--bout`, avatar 24px em vez do tile de IA (não aparece no mockup, regra do README §3.3).
- **CONV-CHAT-26** Diferenciação obrigatória in/out [README]: cor (`--bin` + borda vs `--bout` sem borda), alinhamento (`row-reverse`), forma do canto (cauda 3px só na primeira do grupo).
- **CONV-CHAT-27** Evento de sistema (handoff): `display:flex;align-items:center;gap:8px;margin:10px 0 0;11.5px;color:var(--tx2)`; hairlines `flex:1;height:1px;background:var(--bd)` dos DOIS lados; texto central `inline-flex;gap:5px;color:var(--amber);font-weight:600` + ícone bot 12px stroke 2.2: "Agente pediu transferência para humano · 14:32".
- **CONV-CHAT-28** [PNG] Nenhuma bolha tem sombra; nenhum avatar tem borda/anel.

### Composer
- **CONV-CHAT-29** Wrapper: `flex:none;padding:0 16px 14px` (sem padding-top: a barra do Copilot cola no histórico).
- **CONV-CHAT-30** Barra do Copilot: `display:flex;gap:8px;align-items:center;padding:8px 10px;border:1px solid var(--bd);border-radius:6px 6px 0 0;border-bottom:0;background:var(--acsoft);12px;color:var(--acs)`.
- **CONV-CHAT-31** Ícone bot da barra 13px stroke 2.2; texto `<b style="font-weight:700">Sugestão do Copilot:</b>` + frase entre aspas curvas “ ”; "Usar ↵" `margin-left:auto;font-weight:700;white-space:nowrap` (é texto, não botão com fundo).
- **CONV-CHAT-32** Caixa do campo: `border:1px solid var(--bd2);border-radius:0 0 8px 8px;background:var(--comp)` — encaixa embaixo da barra (topo reto).
- **CONV-CHAT-33** Área de texto: `padding:10px 12px 6px;13px;color:var(--tx3);min-height:40px`; placeholder "Escreva uma mensagem… `/` para respostas rápidas".
- **CONV-CHAT-34** Kbd "/" do placeholder: `font-family:'JetBrains Mono';11px;border:1px solid var(--bd2);border-radius:4px;padding:0 4px;color:var(--tx3)`.
- **CONV-CHAT-35** Barra de ações: `display:flex;align-items:center;gap:4px;padding:4px 8px 8px`. Ordem: clipe · emoji · mic · Nota interna · (auto) aviso 24h · Enviar.
- **CONV-CHAT-36** Ícones de ação: `28×28;border-radius:6px;color:var(--tx2)`; SVG 16px stroke 2; sem fundo/borda (ghost quadrado).
- **CONV-CHAT-37** "Nota interna" (= `ghost sm`): `inline-flex;gap:5px;h28;padding:0 9px;border-radius:6px;12px/600;color:var(--tx2)`; [HTML] sem ícone.
- **CONV-CHAT-38** Aviso de janela: `margin-left:auto;11px;color:var(--tx3);margin-right:8px` "Janela de 24 h aberta · fecha em 22 h".
- **CONV-CHAT-39** "Enviar" (= `primary sm` com ícone): `inline-flex;gap:6px;h28;padding:0 12px;border-radius:7px;background:var(--btn);color:var(--btntx);12px/600`; ícone send 13px stroke 2.2 **depois** do rótulo.
- **CONV-CHAT-40** [README] Os 3 layouts do composer (`blockedReason` → `windowOpen=false` → normal) continuam; o mockup mostra só o normal.
- **CONV-CHAT-41** [PNG] Composer não tem sombra; a borda `--bd2` é o único relevo; fundo `--comp` é 1 degrau abaixo de `--sf`.

## CONV-PANEL — painel do contato (308px)

### Header
- **CONV-PANEL-01** Header: `display:flex;flex-direction:column;align-items:flex-start;gap:8px;padding:16px 16px 14px;border-bottom:1px solid var(--bd)` — empilhado (avatar / nome / botões), alinhado à esquerda.
- **CONV-PANEL-02** Avatar: `44×44;border-radius:50%;background:var(--avs);color:var(--avi);15px/700`.
- **CONV-PANEL-03** Nome: `14px/700`. Subtítulo "Acme Ltda · São Paulo": `11.5px;color:var(--tx2)`.
- **CONV-PANEL-04** Linha de ações: `display:flex;gap:6px`; "Ver contato" e "Novo negócio": `inline-flex;h26;padding:0 9px;border-radius:6px;border:1px solid var(--bd2);11.5px/600`; sem fundo, sem ícone. (README diz "duas ações `sm`" = 28px; HTML usa **26px/raio 6** — HTML manda.)
- **CONV-PANEL-05** [PNG] Sem ícone de fechar, sem "Perfil completo", sem lixeira no header do painel (diferente do drawer de Contatos).

### Seções (padrão comum)
- **CONV-PANEL-06** Seção: `padding:10px 16px;border-bottom:1px solid var(--bd)`; a última ("Resumo da IA") sem border-bottom. **Sem card, sem fundo próprio, sem raio** — dados soltos no `--sf` do painel.
- **CONV-PANEL-07** Cabeçalho de seção: `display:flex;align-items:center;justify-content:space-between;height:24px`.
- **CONV-PANEL-08** Eyebrow: `10px/700;letter-spacing:.14em;text-transform:uppercase;color:var(--tx3)` — "Dados", "Etiquetas · 2", "Negócios · 2", "Resumo da IA" (contagem faz parte do eyebrow, separada por " · ").
- **CONV-PANEL-09** Controle direito do cabeçalho: chevron-up 13px stroke 2 `--tx3` (Dados, Negócios = colapsáveis); "Editar" `11.5px/600;color:var(--acs)` (Etiquetas); badge beta (Resumo). [README] seções colapsáveis com chevron.
- **CONV-PANEL-10** Corpo da seção: `margin-top:4px`.

### Dados
- **CONV-PANEL-11** Grid: `display:grid;grid-template-columns:82px 1fr;gap:5px 8px` (linha 5px, coluna 8px).
- **CONV-PANEL-12** Rótulos (Situação, Responsável, Origem, E-mail): `color:var(--tx2)`, 12.5px herdado, peso 400.
- **CONV-PANEL-13** Valores: `font-weight:500`, `--tx`; E-mail `nowrap;ellipsis`.
- **CONV-PANEL-14** Valor de Situação = StageBadge idêntico ao do header do chat (`h18;radius 5;border --bd;ponto 5px #7C3AED;10.5px/600`).

### Etiquetas
- **CONV-PANEL-15** Corpo: `display:flex;flex-wrap:wrap;gap:4px`.
- **CONV-PANEL-16** Tag chip (`.color-chip` cheio): `inline-flex;h20;padding:0 8px;border-radius:6px;background:color-mix(in srgb,<hex> 85%,#000);color:#fff;11px/600` — "VIP" `#EC4899`, "Indicação" `#0EA5E9`. Igual nos 2 temas (mix com preto).

### Negócios
- **CONV-PANEL-17** Corpo: `display:flex;flex-direction:column;gap:6px`.
- **CONV-PANEL-18** Mini-card: `border:1px solid var(--bd);border-radius:6px;padding:8px 10px`; sem fundo distinto, sem sombra.
- **CONV-PANEL-19** Linha 1 do card: `display:flex;justify-content:space-between;gap:8px` — título `600;nowrap;ellipsis` + valor `600` ("R$ 18.900", tabular).
- **CONV-PANEL-20** Linha 2: `display:flex;align-items:center;gap:6px;margin-top:4px;11px;color:var(--tx2)` — ponto `6×6px` na cor crua da etapa (`#F59E0B` Proposta, `#7C3AED` Qualificado) + "Proposta · há 2 h" / "Qualificado · ontem".

### Resumo da IA
- **CONV-PANEL-21** Badge "beta" (= ComingSoonBadge): `inline-flex;h16;padding:0 5px;border-radius:4px;border:1px dashed var(--bd2);color:var(--tx3);9.5px/700;letter-spacing:.08em;text-transform:uppercase`.
- **CONV-PANEL-22** Corpo: `margin-top:4px;color:var(--tx2);line-height:1.5;12px` — parágrafo corrido, sem card.
- **CONV-PANEL-23** [PNG] Painel rola inteiro; Resumo da IA é a última seção, sem rodapé/ação abaixo.

## Divergências README × HTML (registradas, HTML manda)

- Título da página: README 16px/700 → HTML **14px/700**.
- Ações do ContactPanel: README "sm" (28px, raio 7) → HTML **26px, raio 6**.
- README cita chip de ator sem medida → HTML **17px, raio 5, 10.5px/700**.
- README "linha de identificação 11.5px" ✓; "avatar 30/36/44" ✓; "chips 22px raio 6" ✓; "ícones do composer 28px" ✓; "bolha 8px 12px / 13px/1.45 / hora 10.5 / max 70%" ✓.

## Contagem

FRAME 6 · HDR 12 · LIST 33 · CHAT 41 · PANEL 23 = **115 itens** (+ tabela de 19 tokens).
