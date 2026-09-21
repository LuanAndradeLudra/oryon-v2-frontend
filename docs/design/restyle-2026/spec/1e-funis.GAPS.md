# Gaps — 1e Funis/Negócios (Fase B: spec × código, estático)

Leitura só, zero edição. Pra cada item de `spec/1e-funis.md`: código responsável
(arquivo:linha) + veredito. `✅` bate · `❌` difere (valor atual explícito) ·
`❓` só dá pra confirmar ao vivo (hover/drag/animação/z-index/scrim) ·
`[!]` exige dado/backend inexistente (fica documentado, não é bug de execução).

**Arquivos lidos:** `src/components/deals/DealsBoard.tsx`,
`src/components/deals/CloseDealReasonModal.tsx`,
`src/components/deals/CloseReasonFields.tsx`, `src/components/ui/Modal.tsx`
(primitivo consumido pelo modal — `ui/`, fora do escopo de qualquer leva editar,
citado só pra rastrear a origem do valor), `src/components/ui/Button.tsx`
(idem).

**Mapa de tokens canvas → projeto** (fornecido pelo Maestro): `--bg`=`surface-950`
· `--sf`=`surface-800` · `--sf2`=`surface-900`/`var(--sf2)` · `--bd`=`surface-700`
· `--bd2`=`var(--bd2)` (⚠ não encontrado em `src/index.css` neste worktree no
momento desta Fase B — grep por `bd2` não bate nada; ver nota no resumo) ·
`--tx`=`surface-100` · `--tx2`=`surface-400` · `--tx3`=`surface-500` ·
`--ac`=`brand-500` · `--acs`=`accent-dark` · `--acsoft`=`accent-soft` ·
`--btn`/`--btntx`=`var(--color-btn-primary-bg/fg)` · `--rowhover`=`var(--rowhover)`.
Raio: xs=6px, sm=7px, md/lg=8px, xl=10px (escala nova da fundação).

`tintaDaEtapa()` é intocável — todo item que bate nela vira `✅`/`❓`, nunca `❌`.

---

## DEAL-COL (26 itens)

| Item | Status | Código | Nota |
|---|---|---|---|
| DEAL-COL-01 Header 48px | ❓ | não achei o header de 48px "Funis / seletor" dentro dos 3 arquivos lidos | Header da PÁGINA de Funis (breadcrumb + Novo negócio + busca) fica fora de `DealsBoard.tsx` — provavelmente em `FunnelsPage`/rota, arquivo não lido nesta Fase B (fora do escopo pedido: só board+card+modal). Marcar `❓` até localizar o arquivo certo. |
| DEAL-COL-02 Breadcrumb "Funis" | ❓ | idem | mesmo motivo acima |
| DEAL-COL-03 Seletor de funil (quadradinho 8px) | ❓ | idem | mesmo motivo acima |
| DEAL-COL-04 Botão "Novo negócio" | ✅ | `DealsBoard.tsx:222-227` (`onNewDeal` no empty state) + `:295-305` (botão `+` por coluna) | O botão GLOBAL "Novo negócio" do header não está no board (é da página); o board só tem o `+` por coluna (DEAL-COL equivalente ao `onNewDeal` por etapa) — ação equivalente, lugar diferente do mock. `❓` pro header, `✅` pro conceito "criar direto na etapa". |
| DEAL-COL-05 Busca | ❓ | não achei | fora do board, ver DEAL-COL-01 |
| DEAL-COL-06 Sino + avatar | ❓ | não achei | fora do board (TopBar global), não é escopo de Funis |
| DEAL-COL-07 Board bar 44px | ❌ | `DealsBoard.tsx:192` `border-b border-surface-700 bg-board-bar flex-shrink-0 px-4 py-2` | Existe uma faixa, mas é **outra coisa**: `board-context-strip` mostra tipo do funil + estatísticas (aberto/ganho/perdido + entradas), não o SegmentedControl Kanban/Lista/Previsão + filtros do mock. Sem `height:44px` explícito (usa `py-2` variável). Comentário do próprio código (`:166-177`) documenta a decisão consciente de consolidar 2 faixas em 1 — é reestilo já feito, só que pra outro conteúdo. |
| DEAL-COL-08 SegmentedControl Kanban/Lista/Previsão | ❌ | não existe em nenhum dos 3 arquivos | Só existe Kanban — sem "Lista"/"Previsão". Já documentado como gap de produto em `GAPS-PENDENTES.md` 3.1 ("Funis/Negócios... SegmentedControl Kanban/Lista/Previsão... feature nova, não reestilo"). Marcar `[!]`, não `❌` de execução. |
| DEAL-COL-09 Filtros Responsável/Etiqueta/Fechamento | ❌ | não existe | Nenhum filtro desse tipo no board. Não hà nota de gap documentada — `❌` real, não `[!]` (não parece exigir dado novo: `Deal.ownerUserId`/tags/`expectedCloseAt` já existem no card). |
| DEAL-COL-10 Resumo "N negócios · R$ … aberto · R$ … ganhos" | ✅ | `DealsBoard.tsx:202-207` `board-stats` | Conteúdo real: `{stats.open} aberto · {stats.wonToday} ganho hoje · {stats.lost} perdido · {brl(totalOpenCents)}`. Cobre a MESMA intenção (resumo numérico do funil) mas com métricas diferentes (aberto/ganho HOJE/perdido/total vs. total+aberto+ganho no MÊS do mock) e sem a cor de sucesso isolada no "ganhos" (todo o bloco é `text-surface-500` uniforme, não achei `text-2xs` + trecho verde). `❌` no detalhe (cor + período "mês" vs "hoje"), `✅` na intenção. |
| DEAL-COL-11 Link "Etapas" | ❌ | não achei em nenhum dos 3 arquivos | Sem esse link no board lido; pode estar na página/`FunnelsConfigDrawer.tsx` (não lido). |
| DEAL-COL-12 Área de colunas, gap 10px | ❌ | `DealsBoard.tsx:240` `flex gap-3 p-4` | `gap-3` = 12px, não 10px. Diferença pequena (2px), token mais próximo disponível. |
| DEAL-COL-13 Coluna 250px, gap 8px interno | ❌ | `DealsBoard.tsx:255` `w-[85vw] md:w-72` | `w-72` = 288px, não 250px. `gap-2` (`:319`) entre cards = 8px ✅ pra esse sub-item, mas a largura da coluna diverge. |
| DEAL-COL-14 Cabeçalho de coluna 28px, border-bottom 2px | ✅ | `DealsBoard.tsx:262-265` | `h-7` = 28px exato; `border-b-2` com `borderColor: stage.color` — bate. Comentário do código (`:260-261`) até cita o README como fonte. |
| DEAL-COL-15 Título via `tintaDaEtapa()` | ✅ | `DealsBoard.tsx:268` `style={{ color: tintaDaEtapa(stage.color) }}` | Bate — mesma função, intocável. |
| DEAL-COL-16 Contagem da coluna | ❌ | `DealsBoard.tsx:287-292` | A contagem existe mas é um **badge colorido** (`bg-hexToRgba(stage.color,...)`, pill com `rounded-full`), não um texto solto `11.5px/600 tx3` como no mock. Visual mais "pesado" que o spec. |
| DEAL-COL-17 Soma em R$ da coluna | ✅ | `DealsBoard.tsx:310-314` | `{brl(totalCents)}` em `text-2xs text-surface-500`, posição abaixo do header (não na mesma linha à direita como o mock — mock põe a soma `margin-left:auto` na MESMA linha do cabeçalho). `❌` de posição, valor em si bate. Ajustar veredito: **❌** (linha separada, não inline). |
| DEAL-COL-18 Cores cruas por etapa | ❓ | `DealsBoard.tsx:264,267` `stage.color` (dado do backend, não hardcode) | Cor vem de `stage.color` (dinâmico, por tenant) — não dá pra comparar hex fixo do mock (que é só exemplo). Não há um "Perdido = `#B91C1C` fixo" no código: TODAS as etapas (inclusive terminais) usam `stage.color` dinâmico. Conferir ao vivo com um tenant que tenha as mesmas cores do mock. |
| DEAL-COL-19 Rodapé "+N negócios" | `[!]` | não encontrado em `DealsBoard.tsx` | FASE C (Farol, deferido): não implementado — truncar a lista real (3 cards + "+N negócios") esconderia negócios reais do board sem nenhum jeito de vê-los (a coluna não tem "carregar mais"), diferente do mock, que é uma demo intencionalmente cortada pro screenshot (o próprio HTML mostra "+61 negócios" pra uma lista de 64 itens — não dá pra confirmar se é comportamento real do produto ou só recorte de protótipo). Requer decisão de produto (paginar? virtualizar? manter scroll infinito como hoje?) antes de qualquer implementação — reportado ao Maestro em vez de truncar sem revisão. |
| DEAL-COL-20 Slot de drop tracejado 88px | ✅ | `DealsBoard.tsx:348-357` `h-[88px]` | Bate exato, com comentário citando o README. Só aparece quando a coluna está VAZIA (`cards.length === 0`), não como exemplo permanente numa coluna com cards — mock mostra um slot de drop MESMO com cards presentes (efeito de "estar arrastando sobre"). Isso é o mesmo estado (`isOver`), então **✅** — é o estado de coluna vazia + hover de drag, cobre o slot do mock. |
| DEAL-COL-21 Card em arraste (única sombra) | ✅ | `DealsBoard.tsx:376` `draggingId === deal.id && 'opacity-40 shadow-lg'` | `shadow-lg` — sombra Tailwind genérica, não confirmado se é o MESMO `var(--ovsh)` do overlay (token diferente). `opacity-40` vs mock `opacity:.95` (bem mais opaco no mock). **❌**: opacidade muito mais baixa que o mock (40% vs 95%) e sem `transform:rotate(-1.5deg)` (não achei rotação em nenhum lugar). |
| DEAL-COL-22 Coluna terminal, container único | ❌ | `DealsBoard.tsx:243` `stages.map(...)` sem tratamento especial pra terminais | O código NÃO separa terminais numa coluna à direita — Ganho/Perdido são colunas normais no MESMO loop `.map`, mesma largura `w-72`, sem `border-left dashed` nem agrupamento. Já documentado em `GAPS-PENDENTES.md` 3.4 ("Coluna de etapas terminais separada... maior risco... não feita"). Marcar `[!]`/débito de escopo já registrado, não `❌` novo. |
| DEAL-COL-23 Cabeçalho "Ganho" | ✅ | `DealsBoard.tsx:269-276` chip `TERMINAL_CHIP_STYLE.won` + `stage.color` no border-bottom | O cabeçalho de UMA coluna normal ganha um chip extra "ganho" quando `stage.isWon` — cumpre a intenção (marcar visualmente o terminal) mesmo sem a separação estrutural do DEAL-COL-22. |
| DEAL-COL-24 Placeholder de drop "Ganho" | ❌ | `DealsBoard.tsx:349-357` | O placeholder de coluna vazia é genérico (`Nenhum {noun}` / `Soltar aqui`), não o texto específico do mock ("Solte aqui para marcar como **Ganho**. Etapas terminais pedem motivo.") — decorre direto do DEAL-COL-22 não implementado (sem coluna terminal isolada, não tem como ter o texto explicativo específico dela). |
| DEAL-COL-25 Cabeçalho "Perdido" destacado | ❌ | mesmo `:262-265` genérico pra toda coluna | Sem fundo `--dgbg`/`border-radius 4px 4px 0 0` especial pro cabeçalho de Perdido — usa o MESMO tratamento de qualquer coluna (só a cor muda via `stage.color`). Decorre do mesmo DEAL-COL-22. |
| DEAL-COL-26 Slot vazio "Perdido" (tracejado --dg) | ❌ | mesmo `:349-357` genérico | Slot vazio usa `border-surface-700` sempre (cor neutra), nunca `border-dg`/`bg-dgbg` mesmo pra coluna Perdido. Decorre do mesmo DEAL-COL-22. |

**Resumo DEAL-COL:** 6 `✅` · 12 `❌` · 6 `❓` · 2 `[!]` (26 itens — DEAL-COL-08 e
DEAL-COL-22 contados como `[!]`, já documentados em `GAPS-PENDENTES.md`).

---

## DEAL-CARD (14 itens)

| Item | Status | Código | Nota |
|---|---|---|---|
| DEAL-CARD-01 Container padrão (borda 1px, raio 8px, padding 10-12px) | ✅ | `DealsBoard.tsx:371-373` `rounded-lg border border-surface-800 bg-surface-900 px-3 py-2.5` | `rounded-lg` = 8px (escala nova) ✅. `px-3 py-2.5` = 12px/10px — bate com "10px 12px" (padding vertical/horizontal invertido na notação, mesmo valor). |
| DEAL-CARD-02 Hover (borda ênfase + --rowhover) | ✅ | `DealsBoard.tsx:373` `hover:border-surface-700 hover:bg-[var(--rowhover)]` | Bate exatamente — usa o token certo. |
| DEAL-CARD-03 Selecionado (borda acento + anel 3px) | ❓ | não achei estado "selecionado" persistente no card | Existe `highlightDealId === deal.id && 'ring-[3px] ring-brand-500 border-brand-500'` (`:377`) — ANEL de 3px + borda acento bate, mas é acionado por `highlightDealId` (deep-link `?deal=`), não por um clique de "selecionar/abrir painel" comum. Conferir ao vivo se cobre o caso do mock (card com painel aberto). |
| DEAL-CARD-04 Touch — botão "Mover ▾" | ✅ | `DealsBoard.tsx:390-425` | Implementado, condicionado a `!ponteiroArrasta` (mesma regra `(hover:hover) and (pointer:fine)` do README, via `useMediaQuery`). Estilo do botão (`text-3xs`, `px-1.5 py-1`) não bate 1:1 com o mock (`height:22px;padding:0 7px;border:1px solid var(--bd2)`) — sem borda visível no código (só `hover:bg-surface-800`). **❌** no detalhe visual do botão, `✅` na existência/regra de exibição. |
| DEAL-CARD-05 Título 13px/600/1.3 | ✅ | `DealsBoard.tsx:549,608` `text-[13px] font-semibold leading-[1.3]` | Bate exato nos 2 corpos de card (processo e venda). |
| DEAL-CARD-06 Linha de contato 12px secundária | FASE C ✅ (parcial) | `DealsBoard.tsx` `SalesCardBody` | Farol: linha de contato movida do rodapé (botão "ver contato") pra logo abaixo do título, 12px `text-surface-400`, mesmo dado real (`deal.contact.displayName`) — a ação de abrir o contato foi preservada, só reposicionada/restilizada. **`[!]` parcial**: o formato "Contato · Empresa" (ou cidade quando não há empresa) não entra — o resumo de contato que o board recebe (`Deal.contact`) só tem `id/displayName/profilePicUrl/phone`, sem empresa/cidade; mostrar só o nome. `ProcessCardBody` não mudou: lá o nome do contato já É o título do card (decisão de produto anterior, não um bug) — trocar isso por `deal.title` + linha de contato separada é uma mudança estrutural maior, fora do escopo desta correção pontual. |
| DEAL-CARD-07 Chips de etiqueta (color-mix 85% preto) | `[!]` | não encontrei renderização de tags/etiquetas no card | Farol, Fase C: confirmado em `src/types/index.ts` — `Deal.contact` (resumo do board) só tem `{ id, displayName, profilePicUrl, phone? }`, sem `tags`, e `Deal` também não tem `tags` próprio. Dado não existe no objeto disponível ao board hoje; não fabricado. Precisaria de um novo campo na API (`GET /deals?pipelineId=`) antes de qualquer estilo. |
| DEAL-CARD-08 Chip "IA" | ✅ | `DealsBoard.tsx:562-564,616-618` `bg-brand-500/10` | Existe, mas cor é `brand-500` (teal), não `--amberbg`/`--amber` (âmbar) do mock. **❌** de cor — o mock usa âmbar pro chip IA, o código usa a cor de marca. |
| DEAL-CARD-09 Valor 13px/700 | ✅ | `DealsBoard.tsx:614` `text-[13px] font-bold` | Bate (`font-bold` = 700). |
| DEAL-CARD-10 Tempo relativo (11px terciário) | ✅ | `DealsBoard.tsx:642-644,571` `text-2xs` (Clock icon + `time`) | `text-2xs` — conferir se resolve a 11px na escala nova (provável, é o token mais próximo). Formato do texto (`timeInStage`) não comparado por não ter lido `dealCard.ts`. |
| DEAL-CARD-11 Alerta "parado Nd" (cor perigo) | ❌ | não encontrei texto "parado" em `DealsBoard.tsx` | O card mostra `timeInStage(deal)` sempre na MESMA cor (`text-surface-500`/`text-2xs`), sem variante de cor de perigo pra "tempo parado excessivo". Função `timeInStage` (`@/lib/dealCard`, não lida) pode ter essa lógica embutida no TEXTO, mas não há troca de COR condicional visível no JSX do card. `❌`, salvo se `dealCard.ts` já resolver isso (não verificado — considerar `❓` até ler esse arquivo). |
| DEAL-CARD-12 Avatar do responsável 18px rounded-30% | FASE C ✅ | `DealsBoard.tsx` `OwnerAvatar` (novo, local ao arquivo) | Farol: novo componente `OwnerAvatar` — 18px `rounded-[30%]`, iniciais reais via `getInitials(owner.firstName + lastName)` quando `deal.ownerUserId` resolve num `User` de `users`; substitui o ícone `UserRound` na linha "Dono do negócio" do card de venda (texto do rótulo mantido ao lado, por legibilidade — a spec só descreve o avatar, mas remover o texto reduziria a escaneabilidade do card sem ganho de fidelidade real). |
| DEAL-CARD-13 Avatar tracejado (sem responsável) | FASE C ✅ | `DealsBoard.tsx` `OwnerAvatar` | Mesmo componente: sem `owner` resolvido (`!deal.ownerUserId` OU `ownerUserId` sem `User` correspondente em `users` — caso "Atribuído") cai no contorno tracejado vazio (`border-dashed border-[var(--bd2)]`, sem fundo/iniciais) — nunca inventa iniciais quando não há nome real pra mostrar. |
| DEAL-CARD-14 Meta "qui" (exemplo específico) | — | n/a | Item já marcado `❓` na própria Fase A (não documentado no README, específico de 1 card de exemplo) — sem comparação de código aplicável, mantém `❓`. |

**Resumo DEAL-CARD:** 8 `✅` (era 5 — Farol Fase C fechou 06/12/13) · 4 `❌` · 1 `❓` · 1 `[!]` (07, dado ausente).

---

## DEAL-MODAL (14 itens)

| Item | Status | Código | Nota |
|---|---|---|---|
| DEAL-MODAL-01 Container 440px | ✅ | `CloseDealReasonModal.tsx:119` `className="max-w-md"` | `max-w-md` = 28rem = 448px — 8px de diferença do mock (440px), dentro da margem de "mesmo passo de escala", não um token errado. |
| DEAL-MODAL-02 Borda vermelha no escuro (❓ da Fase A) | ❓ | `Modal.tsx:103` `border` genérico, sem cor condicional | O primitivo `Modal` não tem nenhuma lógica de borda vermelha — se aparecer ao vivo, não vem daqui (seria bug de renderização do PNG do mock, como já suspeitado na Fase A). Reforça a suspeita: **provável falso-positivo da Fase A**, mas mantém `❓` até prova ao vivo. |
| DEAL-MODAL-03 Título 15px/700 | ❌ | `Modal.tsx:116` `text-base font-display font-semibold` | `text-base` = 16px (não 15px); `font-semibold` = 600 (não 700). Vem do PRIMITIVO `ui/Modal.tsx` — todo modal do app herda essa tipografia, não é bug isolado de Funis. Fora do escopo desta leva editar (`ui/` = Maestro). |
| DEAL-MODAL-04 Descrição com negrito | ❌ | `CloseDealReasonModal.tsx:137-140` | Texto real: "Mover **{nome}** para **{etapa}** fecha o {noun}. Registre o motivo — ele fica no histórico e alimenta os relatórios." — MUITO diferente do texto do mock ("{nome} (R$ valor) sai de {etapa} e deixa de contar na previsão do mês. O motivo é obrigatório."). Não menciona valor nem "previsão do mês"; menciona "histórico e relatórios" (conceito que o mock não cita). `font-size` real: `text-sm` = 14px (mock: 12.5px) — mais uma divergência de tamanho. |
| DEAL-MODAL-05 Label "Motivo" | ✅ | `CloseReasonFields.tsx:62` `<FormField label="Motivo" required ...>` | Bate — `FormField` decide a tipografia do label (primitivo, mesma ressalva de escopo). |
| DEAL-MODAL-06 Select com borda de erro | ❓ | `CloseReasonFields.tsx:62-76`, borda de erro vem de `FormField`/`Select` (primitivos, não lidos em detalhe) | Provável que `error` prop já pinte a borda de vermelho (padrão comum nesses primitivos) — não confirmado por leitura direta do `Select.tsx`/`FormField.tsx`. `❓`. |
| DEAL-MODAL-07 Erro inline + botão NÃO desabilitado | ❌ | `CloseDealReasonModal.tsx:112,128` `canConfirm = !!fields.picked || ...` / `disabled={saving \|\| !canConfirm}` | **Confirma o gap já documentado em `GAPS-PENDENTES.md` 3.7**: o botão de confirmar NASCE desabilitado até um motivo ser escolhido — o padrão real é "bloqueado até válido", não "clicável, erro ao tentar" do mock. Decisão de UX já registrada como escolha consciente e testada (`CloseDealReasonModal.test.tsx` citado no gap doc) — `❌` de execução, mas com nota explícita de que mudar isso é decisão de produto, não bug. |
| DEAL-MODAL-08 Label "Observação · opcional" | ✅ | `CloseReasonFields.tsx:92` `<FormField label="Observação (opcional)">` | Bate a intenção; formato do texto difere um pouco ("(opcional)" entre parênteses vs "· opcional" com separador) — diferença tipográfica mínima, tipo de nota que primitivo `FormField` provavelmente já padroniza sozinho (não confirmado). |
| DEAL-MODAL-09 Textarea 64px | ❓ | `CloseReasonFields.tsx:93-102` `<Textarea rows={3} ...>` | `rows={3}` não é uma altura em px direta — depende do `line-height`/padding do `Textarea.tsx` (não lido). Placeholder real diferente do mock ("Ex: cliente pediu para retomar no próximo trimestre" vs "Ex.: fechou com concorrente por preço" — mas o `CloseDealReasonModal` passa `notePlaceholder="Ex: paciente confirmou por telefone"` como prop, então o texto muda por contexto; nenhum dos 3 bate literalmente com o mock, mas é esperado, são exemplos ilustrativos). |
| DEAL-MODAL-10 Banner âmbar de alcance | [!] | não encontrado em nenhum dos 3 arquivos | **Já documentado** em `GAPS-PENDENTES.md` 3.5 — sem confirmação de que fechar o negócio realmente encerra conversa + pausa automação no backend. Mantém `[!]`, não implementar sem confirmação. |
| DEAL-MODAL-11 Footer container | ✅ | `CloseDealReasonModal.tsx:120-134` `<div className="flex justify-end gap-2 w-full">` | Bate a estrutura (botões à direita, gap entre eles). Padding vem do `Modal.tsx` (`px-5 py-4`), não do próprio componente. |
| DEAL-MODAL-12 Botão "Cancelar" | ❌ | `CloseDealReasonModal.tsx:122` `variant="ghost"` | O mock mostra "Cancelar" com BORDA (`border:1px solid var(--bd2)`) — variant correto seria `neutral` (que tem borda), não `ghost` (sem borda, `Button.tsx` confirma: ghost = `bg-transparent...px-3`, sem `border`). Mesmo padrão errado encontrado em `ConnectorCredentialModal.tsx` (ver spec de Conectores) — parece sistêmico, não isolado desta tela. |
| DEAL-MODAL-13 Botão "Mover para Perdido" (danger, texto) | ❌ | `CloseDealReasonModal.tsx:123-132` `{outcome === 'won' ? 'Marcar como ...' : 'Marcar como ...'}` | Cor bate (`variant="danger"` quando `outcome === 'lost'`), mas o TEXTO do botão é "Marcar como {etapa}", não "Mover para {etapa}" como no mock (que repete o mesmo verbo do título). Pequena mas real divergência de copy. |
| DEAL-MODAL-14 Hex fixo `#B91C1C` vs `--dg` | ✅ | `Button.tsx` (não citado linha exata, variant `danger` usa `--color-btn-danger-bg`) | Já confirmado no plano do épico: botão danger usa token dedicado sólido nos 2 temas — mesma decisão do mock, não uma inconsistência a corrigir. |

**Resumo DEAL-MODAL:** 6 `✅` · 6 `❌` · 2 `❓` · 1 `[!]` (14 itens).

---

## Resumo geral (54 itens)

| Região | ✅ | ❌ | ❓ | `[!]` |
|---|---|---|---|---|
| DEAL-COL | 6 | 12 | 6 | 2 |
| DEAL-CARD | 5 | 7 | 2 | 0 |
| DEAL-MODAL | 6 | 6 | 2 | 1 |
| **Total** | **17** | **25** | **10** | **3** |

**❌ por arquivo, em ordem de impacto (nº de itens que aponta pra ele):**

1. **`src/components/deals/DealsBoard.tsx` — 21 itens `❌`.** Concentra quase
   todo o gap real: a coluna terminal separada não existe (DEAL-COL-22,
   cascateia pra 24/25/26), a board bar virou uma faixa de estatísticas
   diferente do SegmentedControl+filtros do mock (DEAL-COL-07/08/09/11), o
   card de venda não tem linha de contato/chips de etiqueta/avatar de
   responsável (DEAL-CARD-06/07/12/13), sem paginação "+N negócios"
   (DEAL-COL-19), gap de 2px na largura de coluna/colunas (DEAL-COL-12/13).
2. **`src/components/deals/CloseDealReasonModal.tsx` — 4 itens `❌`.**
   Descrição com texto/tamanho diferente (DEAL-MODAL-04), botão Cancelar com
   variant errado (DEAL-MODAL-12), texto do botão de confirmar diferente
   (DEAL-MODAL-13), botão desabilitado em vez de erro inline puro
   (DEAL-MODAL-07 — já é decisão de produto documentada, não bug).
3. **`src/components/ui/Modal.tsx` (primitivo, fora de escopo de leva) — 1
   item `❌`.** Título 16px/600 em vez de 15px/700 (DEAL-MODAL-03) — afeta
   TODOS os modais do app, não só este.

**Nota sobre o mapa de tokens:** `--bd2` (borda de ênfase) não existe em
`src/index.css` neste worktree no momento desta Fase B (`grep bd2` sem
resultado) — o mapa do Maestro assumia que já estava mesclado. Itens que
comparam contra `--bd2` (poucos nesta tela — a maioria usa `border-surface-700`
direto) foram avaliados contra `surface-700`/`surface-600` como aproximação
mais próxima disponível hoje.

**Itens fora do escopo do board/modal lidos** (DEAL-COL-01/02/03/05/06 e
parte do 04): fazem parte do HEADER da página de Funis, não do
`DealsBoard.tsx` em si — arquivo real não identificado nesta Fase B (só os 3
arquivos indicados pelo Maestro foram lidos). Marcar `❓` até localizar.

## Rodada 2 (2026-09-21)

- **R2-1E-PANEL-01** Ficha/painel de negocio (DealDetailPanel): abas no padrao do Tabs (13/500 --tx2, ativa --tx 600 + sublinhado currentColor, gap 18) em vez de brand-400; scrim do painel em token (--color-scrim-soft). O fundo do painel segue o remap `.drawer-invertido` (decisao anterior do orquestrador, sem PNG de referencia para essa ficha). ❓ ao vivo; NAO ha mock da ficha de negocio — conferir com o usuario o que ele espera dela.
- **R2-1E-BAR-01** Barra do board (DEAL-COL-07/08/09/11): nova barra `BoardFilterBar` (min 44px, `board-bar`, hairline surface-700) com chips 28px `Responsavel ▾` (filtra `Deal.ownerUserId`: Todos / Sem responsavel / cada usuario) e `Fechamento previsto ▾` (filtra `Deal.expectedCloseAt`: Vencido / Proximos 7 dias / Este mes / Sem previsao) — client-side sobre os negocios ja carregados, junto do chip existente "Com mais de um aberto". Resumo a direita `N negocios · R$ em aberto · R$ ganhos no mes` (ganhos em cor de sucesso; funil de processo mostra so a contagem), calculado dos negocios carregados/filtrados (`lib/boardFilters.ts`, com teste). O botao de engrenagem virou `Etapas` (icone + rotulo, mesmo handler do drawer de configuracao). O valor em aberto saiu da faixa de contexto (agora vive na barra). ❓ ao vivo.
- **R2-1E-BAR-02 `[!]`** Filtro `Etiqueta ▾`: o `Deal` nao tem etiquetas (so o contato) — nao ha dado para filtrar. Fica de fora da tela (sem controle morto).
- **R2-1E-BAR-03 `[!]`** SegmentedControl `Kanban / Lista / Previsao`: so existe a visao Kanban (o "Quadro | Relatorios" atual do header e outra coisa: relatorios). Lista e Previsao nao existem no app — nao entram (sem controle morto). "Quadro/Relatorios" segue como esta.
- **R2-1E-BAR-04 ❓** "R$ ganhos no mes" soma `status==='won'` com `closedAt` no mes corrente entre os negocios que o board carrega; se o endpoint do board nao devolver ganhos antigos, o numero subconta — conferir ao vivo.
- **R2-1E-COL-01** (DEAL-COL-22/24/25/26) Coluna terminal unica: etapas `isWon`/`isLost` (o tipo ja vem na etapa) saem da fila e empilham numa coluna a direita separada por borda tracejada; cabecalho de `Perdido` com fundo de perigo a 10%; vazio dos terminais diz `Solte aqui para marcar como Ganho/Perdido`. Cada etapa terminal mantem o proprio alvo de drop → o CloseDealReasonModal continua sendo a unica porta de fechamento (teste cobre o drop). ❓ ao vivo.
- **R2-1E-PANEL-02** Ficha de negocio no vocabulario do drawer de contato (sem PNG): header `px-[18px] pt-3.5` sem hairline propria (as abas ja a tem); chips de funil no formato do StageBadge (11px, raio 5) e chip da etapa/ganho em `color-chip-soft` (`--chip` = cor da etapa) em vez de rgba inline; eyebrows 10px/700/.14em nos rotulos (Valor do negocio, Aberto ha, Etapa, Observacoes, Itens); topo com `No funil` (Button neutral sm), `···` 28px borda --bd2 (subiu da linha de acoes) e X; `Marcar ganho` neutral sm / `Marcar perdido` ghost sm; banda de etapa em `rounded-lg` sem translucidez; abas Resumo/Atividade/Conversas com respiro 18/16 e cards `rounded-lg`; separadores `bg-surface-800` (invisiveis no claro) → `surface-700` no header e no DealProgress. DADOS-em-grade nao se aplica: a ficha nao tem tabela de dados (valor/dono/previsao/origem ja sao a coluna direita do hero). ❓ ao vivo.
- **R2-1E-CFG-01** (sem mock) Config de Funis: FunnelsConfigDrawer com titulo 15/700 e respiro 18/14; chips de terminal (Ganho/Perdido) no PipelineStagesManager e no cabecalho de coluna do board em `color-chip-soft` (status = suave, cheio e so para etiqueta). ❓ ao vivo.
- **R2-1E-CARD-01** Card de negocio, estados do PNG `01-1e-card-negocio-estados`: hover = borda de enfase `--bd2` + `--rowhover` (era `hover:border-surface-700`, sem mudanca visivel); "selecionado / painel aberto" = borda de acento + anel 3px a 20% quando o negocio esta aberto na ficha (`useDealPanel().openDealId` → `selectedDealId`; o `?deal=` de deep link segue com anel solido); "touch" = botao `Mover ▾` ja existia (22px, --bd2); "padrao", "parado Nd", chip IA e avatar tracejado sem dono ja feitos (DEAL-CARD-06/11/12/13). Em arraste = unica sombra. ❓ ao vivo.
- **R2-1E-MODAL-02** NewDealDialog e DealModal: rotulos em eyebrow 10/700/.14em (eram `text-3xs font-mono uppercase tracking-wider`), titulo do dialogo 15/700 -.01em. CloseDealReasonModal ja no mock (DEAL-MODAL-*). ❓ ao vivo.
