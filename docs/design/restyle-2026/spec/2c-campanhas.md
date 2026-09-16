# Spec extraída — tela 2c · Disparos/Campanhas

Fase A do método (AUDITORIA-NOTURNA.md). Só referência; nenhuma avaliação do código.

**Fontes e autoridade:** (1) `Oryon-Reestilizacao-canvas.html`, frame `id="2c"`
(offsets ~446.2k–476k do arquivo decodificado) — valor exato quando citado sem
marca; (2) `telas/01-2c-*.png` (claro) e `telas/02-2c-*.png` (escuro) — composição
e estados, marcados **[PNG]** quando o valor é estimado; (3) `README.md` §3.7,
§1.3 (cor), §2 (Button/Badge/DataTable/Tabs/Modal) — marcado **[README]**.

## Variáveis do canvas → hex (README §1.3; o HTML só referencia `var(--x)`)

| var canvas | papel | claro | escuro |
|---|---|---|---|
| `--bg` | fundo da página | `#FAFAFC` | `#060909` |
| `--sf` | superfície (card/modal/tabela) | `#FFFFFF` | `#161E1E` |
| `--sf2` | superfície-2 (header de tabela, busca, chip Rascunho) | `#F5F6F8` | `#0E1414` |
| `--bd` | borda / hairline | `#E4E6EC` | `#243333` |
| `--bd2` | borda de ênfase (botão neutral, kbd `/`) | `#C8CDD8` | `#2E4040` |
| `--tx` / `--tx2` / `--tx3` | texto / secundário / terciário | `#1A1F2E` / `#5C657A` / `#9098AA` | `#ECF1F1` / `#8FA5A5` / `#6B8080` |
| `--ac` | acento (linha do breadcrumb) | `#14B8A6` | `#2DD4BF` |
| `--acs` | acento forte (texto "Editar", check das etapas) | `#0F766E` | `#14B8A6` |
| `--acsoft` | acento suave (fundo chip Enviando, bolinha concluída) | `rgba(20,184,166,.12)` | `rgba(45,212,191,.14)` |
| `--btn` / `--btntx` | botão primário / texto | `#0F766E` / `#FFFFFF` | `#2DD4BF` / `#04201D` |
| `--ok` / `--okbg` | sucesso / fundo | `#15803D` / `rgba(21,128,61,.10)` | `#22C55E` / 14% |
| `--amber` / `--amberbg` | atenção / fundo | `#B45309` / `rgba(180,83,9,.10)` | `#FBBF24` / 14% |
| `--dg` / `--dgbg` | perigo / fundo | `#B91C1C` / `rgba(185,28,28,.08)` | `#EF4444` / 14% |
| `--sb` / `--sbtx` | sidebar (sempre escura) | `#0E1414` / texto claro | idem |
| `--avs` / `--avi` | avatar disco / inicial | `#374151` / `#FFFFFF` (index.css) | claro / `#0A0F0F` |
| `--scrim`, `--ovbd`, `--ovsh` | scrim do modal, borda e sombra de overlay | `--color-scrim-soft`, `--color-overlay-border`, `--shadow-overlay` do projeto — valor não está no HTML | idem |

Fonte de tudo: Plus Jakarta Sans; mono = JetBrains Mono.

---

## CAMP-HDR — TopBar da tela (48px)

- **CAMP-HDR-01** Container: `height:48px; padding:0 16px; gap:12px; border-bottom:1px solid --bd; background:--sf`. Sem sombra.
- **CAMP-HDR-02** Título "Disparos": `14px/700, letter-spacing:-.01em`, cor `--tx`.
- **CAMP-HDR-03** Subtítulo na mesma linha (baseline, gap 8px): "Campanhas em massa pelo WhatsApp · limite diário 1.000 · 412 usados", `12px`, cor `--tx2`. Os dois números são dado real (limite da linha e uso do dia).
- **CAMP-HDR-04** Grupo direito `margin-left:auto; gap:8px`, ordem: Nova campanha → busca → sino → avatar.
- **CAMP-HDR-05** Botão "Nova campanha": **neutral** (README §3.7: "botão principal do módulo permanece `variant="neutral"`"), `height:28px (sm); padding:0 10px; border-radius:7px; border:1px solid --bd2; background:--sf; 12px/600; gap:6px`; ícone `+` 14px stroke 2.2. **Não** é teal.
- **CAMP-HDR-06** Busca: pílula `width:200px; height:28px; padding:0 10px; radius 7px; border:1px solid --bd; background:--sf2; color:--tx3; 12px`; ícone lupa 14px; texto "Buscar"; atalho `/` à direita em `JetBrains Mono 10.5px`, `border:1px solid --bd2; radius 4px; padding:0 4px`.
- **CAMP-HDR-07** Sino: `28×28, radius 7px`, ícone 16px, cor `--tx2`, sem fundo.
- **CAMP-HDR-08** Avatar: `28×28; border-radius:30%; background:--avs; color:--avi; 10.5px/700`, iniciais "RC".
- **CAMP-HDR-09** Claro × escuro: apenas tokens; sem diferença estrutural [PNG].

## CAMP-TABS — Abas do módulo

- **CAMP-TABS-01** Container: `display:flex; gap:18px; padding:12px 16px 0; border-bottom:1px solid --bd; background:--sf; 13px/500; color:--tx2`.
- **CAMP-TABS-02** Itens, nesta ordem: "Disparos 14" · "Templates 9" · "Atribuição".
- **CAMP-TABS-03** Aba ativa ("Disparos"): `color:--tx; font-weight:600; box-shadow:inset 0 -2px 0 --tx` (sublinhado 2px na cor do TEXTO, não teal — README §2 Tabs). `padding:0 0 9px`.
- **CAMP-TABS-04** Abas inativas: `13px/500 --tx2`, sem sublinhado, mesmo `padding:0 0 9px`.
- **CAMP-TABS-05** Contagem ao lado do rótulo: `11px; color:--tx3; margin-left:2px` — "14" e "9". "Atribuição" sem contagem.
- **CAMP-TABS-06** Sem indicador deslizante, sem ícone nas abas.

## CAMP-TABLE — Lista de disparos (DataTable)

- **CAMP-TABLE-01** Container da lista: `background:--sf`, sem borda externa própria (é a superfície da página); ocupa todo o resto da altura.
- **CAMP-TABLE-02** Grid de colunas (header e linhas): `1.6fr 120px 1fr 90px 90px 90px 90px 120px 36px` = Campanha · Status · Template · Público · Entregues · Lidas · Respostas · Envio · menu.
- **CAMP-TABLE-03** Header: `height:32px; padding:0 8px 0 16px; border-bottom:1px solid --bd; background:--sf2; 11px/600; color:--tx2`. Rótulos: "Campanha", "Status", "Template", "Público", "Entregues", "Lidas", "Respostas", "Envio" (sem "Ações"; última coluna vazia). Sem uppercase.
- **CAMP-TABLE-04** Colunas numéricas (Público, Entregues, Lidas, Respostas) e Envio: `text-align:right` no header e nas linhas.
- **CAMP-TABLE-05** Linha: `height:36px; padding:0 8px 0 16px; border-bottom:1px solid --bd; 13px`. Sem zebra, sem raio, sem borda lateral.
- **CAMP-TABLE-06** Hover/ativo de linha [README §2 DataTable]: `background:--rowhover + box-shadow:inset 2px 0 0 --ac`. (Não aparece no PNG; regra do primitivo.)
- **CAMP-TABLE-07** Nome da campanha: `13px/600 --tx`. Rascunho ("Black Friday · rascunho"): `600` mas cor `--tx2` (rebaixado).
- **CAMP-TABLE-08** Chip de status — base: `inline-flex; height:20px; padding:0 7px; border-radius:6px; 11px/600; gap:5px`. Variantes exatas:
  - Enviando: `background:--acsoft; color:--acs` + **dot** `6×6 radius 50% background:currentColor` antes do texto.
  - Agendada: `background:--amberbg; color:--amber`, sem dot.
  - Concluída: `background:--okbg; color:--ok`, sem dot.
  - Rascunho: `background:--sf2; border:1px solid --bd; color:--tx2` (neutro com borda), sem dot.
  - `Falhou · 12%`: `background:--dgbg; color:--dg`, sem dot; o `· 12%` faz parte do texto do chip.
  - (Nota do canvas: status vem do enum via `.color-chip`, não são tokens novos.)
- **CAMP-TABLE-09** Template: `JetBrains Mono 11.5px; color:--tx2` (ex. `reativacao_v3`, `lancamento_agenda`). Sem template: texto "sem template" `12px --tx3`, não mono.
- **CAMP-TABLE-10** Números: `13px --tx`, tabulares, separador de milhar com ponto (`1.240`, `2.318`, `2.040`). Ausente: `—` em `--tx3`.
- **CAMP-TABLE-11** Envio: `text-align:right; color:--tx2`; formatos "hoje 09:00", "17 set 10:00", "12 set", "08 set", "01 set"; ausente `—` `--tx3`.
- **CAMP-TABLE-12** Menu de linha: `···` `color:--tx3; text-align:center` na coluna de 36px (sempre visível, não só no hover) [HTML]; no PNG aparece em `--tx3` bem discreto.
- **CAMP-TABLE-13** Linhas do mock (6): Reativação · clínicas inativas 90d / Lançamento agenda online / Follow-up proposta · setembro / NPS pós-implantação / Black Friday · rascunho / Aviso de manutenção. Sem paginação visível neste frame (README §2 DataTable: rodapé 40px `border-top` quando houver).
- **CAMP-TABLE-14** Sem checkbox de seleção na lista de campanhas (diferente de Contatos).

## CAMP-WIZ — CampaignWizard, etapa Revisão (modal)

- **CAMP-WIZ-01** Scrim: `position:absolute; inset:0; background:--scrim; display:flex; align-items:center; justify-content:center` (modal centralizado vertical e horizontalmente).
- **CAMP-WIZ-02** Modal: `width:760px; border:1px solid --ovbd; border-radius:10px; background:--sf; box-shadow:--ovsh; flex column`. Altura pelo conteúdo (≈300px no mock) [PNG].
- **CAMP-WIZ-03** Header: `padding:16px 20px 0; gap:12px; align-items:center`. Sem border-bottom no header em si (a borda fica abaixo do breadcrumb).
- **CAMP-WIZ-04** Título "Nova campanha": `15px/700; letter-spacing:-.01em`.
- **CAMP-WIZ-05** Indicador "Rascunho salvo": `margin-left:auto; 11.5px; color:--tx3; gap:5px`; ícone check 12px `stroke:--ok` width 2.5. (Comportamento = autosave; ver [!] em AUDITORIA-NOTURNA — não inventar.)
- **CAMP-WIZ-06** Fechar: `28×28; radius 7px; color:--tx2`; ícone X 16px.
- **CAMP-WIZ-07** Breadcrumb de etapas: `padding:14px 20px; border-bottom:1px solid --bd; 12px/600; color:--tx2; gap:0` — 5 etapas: Nome · Template · Público · Agendamento · Revisão.
- **CAMP-WIZ-08** Bolinha de etapa **concluída**: `18×18; radius 50%; background:--acsoft; color:--acs`, check 10px stroke 3.
- **CAMP-WIZ-09** Bolinha da etapa **atual** ("5" Revisão): `18×18; radius 50%; background:--btn; color:--btntx; 10px/700` com o número.
- **CAMP-WIZ-10** Rótulo da etapa: `12px/600`; concluídas em `--tx2`; a atual em `--tx` (o `span` pai da atual recebe `color:--tx`).
- **CAMP-WIZ-11** Conector entre etapas: `flex:1; height:1px; background:--ac; margin:0 10px` — linha **sólida** de 1px em acento (README §3.7 "ligadas por linha de 1px (concluídas em acento)"). O PNG lê como pontilhado por anti-aliasing; o HTML é sólido.
- **CAMP-WIZ-12** Etapa **futura**: não ocorre neste frame (Revisão é a última). Pelo README §3.6 (wizard de agente): "futuro = borda de ênfase". Extrapolação, marcar **[README §3.6]**.
- **CAMP-WIZ-13** Bolinha + rótulo dentro de `inline-flex; gap:6px`.
- **CAMP-WIZ-14** Corpo: `display:grid; grid-template-columns:1fr 250px; gap:20px; padding:18px 20px`.
- **CAMP-WIZ-15** Coluna esquerda = lista plana `13px`, **sem caixa, sem fundo, sem raio**: cada linha `grid 120px | 1fr | auto; align-items:center; gap:10px; padding:9px 0; border-bottom:1px solid --bd`. A última linha (Custo estimado) **sem** border-bottom e grid `120px | 1fr` (sem "Editar").
- **CAMP-WIZ-16** Rótulo da linha: `12px; color:--tx2` (Nome, Template, Público, Linha, Envio, Custo estimado).
- **CAMP-WIZ-17** Link "Editar": `11.5px/600; color:--acs`, alinhado à direita (coluna `auto`). Presente em Nome, Template, Público, Linha, Envio; ausente em Custo estimado.
- **CAMP-WIZ-18** Valor Nome: `600` ("Lançamento agenda online").
- **CAMP-WIZ-19** Valor Template: `flex gap:6px` → nome em `JetBrains Mono 11.5px` + chip `height:18px; padding:0 6px; radius 5px; background:--okbg; color:--ok; 10.5px/700` "Aprovado · Meta".
- **CAMP-WIZ-20** Valor Público: `<b 600>2.318 contatos</b> · Situação = Qualificado, Proposta · com consentimento` (resto em peso normal).
- **CAMP-WIZ-21** Valor Linha: `500` — "Vendas · +55 11 3456-7890".
- **CAMP-WIZ-22** Valor Envio: `500` — "Qua, 17 set · 10:00 · ritmo 200/h".
- **CAMP-WIZ-23** Valor Custo estimado: `600` "R$ 812,00" + sufixo `color:--tx3; 500` "· 2.318 × R$ 0,35 (marketing)". (Dado calculado; se não existir no backend = [!].)
- **CAMP-WIZ-24** Banner de limite diário: `flex; gap:8px; align-items:flex-start; padding:9px 10px; border-radius:6px; background:--amberbg; color:--amber; 12px; line-height:1.45; margin-top:8px`; ícone triângulo 14px stroke 2 `margin-top:1px`. Texto: "Envio ultrapassa o limite diário (1.000). A campanha será dividida em 3 dias automaticamente." Sem borda.
- **CAMP-WIZ-25** Coluna direita (250px): eyebrow "Prévia no WhatsApp" `10px/700; letter-spacing:.14em; uppercase; color:--tx3`, `gap:6px` até a prévia (ver CAMP-PREVIEW).
- **CAMP-WIZ-26** Footer: `flex; gap:8px; padding:14px 20px 16px; border-top:1px solid --bd`.
- **CAMP-WIZ-27** "← Voltar": ghost — `height:36px; padding:0 14px; radius 7px; 13px/600; color:--tx2`, sem borda/fundo; seta é caractere `←` no texto.
- **CAMP-WIZ-28** "Enviar teste para mim": neutral — `margin-left:auto; height:36px; padding:0 14px; radius 7px; border:1px solid --bd2; 13px/600`, sem fundo próprio.
- **CAMP-WIZ-29** "Agendar campanha": primary — `height:36px; padding:0 16px; radius 7px; background:--btn; color:--btntx; 13px/600`. (Rótulo muda para "Enviar agora" quando envio imediato — não está no mock; [PNG/README] não cobre.)
- **CAMP-WIZ-30** Não existe bloco de ícone+título da etapa acima do conteúdo; o nome da etapa só aparece no breadcrumb.
- **CAMP-WIZ-31** Claro × escuro: idênticos em estrutura; só tokens. No escuro o modal é `--sf #161E1E` sobre scrim; a prévia do WhatsApp **mantém** `#EFE7DD` (ver CAMP-PREVIEW-01).

## CAMP-PREVIEW — Prévia do WhatsApp (hex fixos, não tokenizar)

- **CAMP-PREVIEW-01** Container: `border-radius:10px; background:#EFE7DD; padding:12px 10px; flex column; gap:6px; min-height:230px; border:1px solid --bd`. Mesmo `#EFE7DD` nos dois temas [HTML + README §3.7].
- **CAMP-PREVIEW-02** Pílula de dia "Hoje": `align-self:center; 10px; color:#54656F; background:#fff; padding:2px 8px; radius 6px; box-shadow:0 1px 1px rgba(0,0,0,.08)`.
- **CAMP-PREVIEW-03** Bolha recebida: `background:#fff; border-radius:8px 8px 8px 2px` (cauda inferior-esquerda); `padding:6px 8px 4px; 12px; line-height:1.4; color:#111B21; max-width:92%; box-shadow:0 1px 1px rgba(0,0,0,.08)`.
- **CAMP-PREVIEW-04** Variáveis resolvidas em negrito: `<b>Mariana</b>`, `<b>Acme</b>`.
- **CAMP-PREVIEW-05** Hora dentro da bolha: `text-align:right; 10px; color:#667781; margin-top:2px` — "10:00".
- **CAMP-PREVIEW-06** Botões de resposta rápida (2): `background:#fff; radius 8px; padding:8px; text-align:center; 12px/500; color:#027EB5; box-shadow:0 1px 1px rgba(0,0,0,.08); max-width:92%` — "Quero ver a demo", "Não tenho interesse". Empilhados com o `gap:6px` do container, sem borda.
- **CAMP-PREVIEW-07** Única sombra permitida na tela fora de overlay: `0 1px 1px rgba(0,0,0,.08)` nas peças do WhatsApp (mock fiel de produto de terceiro).

## CAMP-TPL — Aba Templates (grade de cards)

- **CAMP-TPL-01** Grade: `grid-template-columns:repeat(4,1fr); gap:10px` (4 colunas no frame de ~1100px; README: "grade de 4 cards").
- **CAMP-TPL-02** Card: `border:1px solid --bd; border-radius:8px; background:--sf; flex column`. Sem sombra, sem hover descrito.
- **CAMP-TPL-03** Header do card: `padding:10px 12px; flex column; gap:4px; border-bottom:1px solid --bd`.
- **CAMP-TPL-04** Linha 1 do header: `flex; gap:6px` → nome `JetBrains Mono 12px/500; flex:1` + chip de status Meta.
- **CAMP-TPL-05** Chip de status Meta: `height:18px; padding:0 6px; radius 5px; 10.5px/700`. Aprovado `--okbg/--ok`; Em análise `--amberbg/--amber`; Rejeitado `--dgbg/--dg`. Sem dot, sem borda.
- **CAMP-TPL-06** Linha 2 do header: `11px; color:--tx3` — "Categoria · idioma · extra": "Marketing · pt_BR · 2 botões", "Marketing · pt_BR · 1 botão", "Marketing · pt_BR · enviado há 4 h", "Utilidade · pt_BR · motivo: categoria".
- **CAMP-TPL-07** Corpo do card (prévia): `padding:10px 12px; background:#EFE7DD; border-radius:0 0 8px 8px; flex:1` — fundo WhatsApp só no corpo, cantos inferiores arredondados acompanhando o card.
- **CAMP-TPL-08** Bolha da prévia: `background:#fff; border-radius:6px 6px 6px 2px; padding:6px 8px; 11px; line-height:1.4; color:#111B21`, texto truncado com "…" e placeholders `{{1}}`, `{{2}}` literais.
- **CAMP-TPL-09** Cards do mock: lancamento_agenda (Aprovado) · reativacao_v3 (Aprovado) · promo_bf_2026 (Em análise) · cobranca_2via (Rejeitado).
- **CAMP-TPL-10** Eyebrow acima da grade no canvas ("Aba Templates · grade de cards + status Meta", `10px/700 .14em uppercase --acs`) é rótulo do próprio canvas, não da tela.
- **CAMP-TPL-11** `TemplateCreator` continua substituindo o conteúdo da aba (não é modal) [README §3.7].
- **CAMP-TPL-12** Claro × escuro: card `--sf/--bd` muda; corpo `#EFE7DD` e bolha `#fff` **não** mudam [HTML].

## Notas transversais (do canvas)

- **CAMP-NOTE-01** Botão principal do módulo é `variant="neutral"`; teal aqui "dizia botão, não importante". Mantido.
- **CAMP-NOTE-02** `TemplatePreview` usa hex fixo do WhatsApp (`#EFE7DD`, `#111B21`, `#027EB5`, `#667781`, `#54656F`) nos dois temas — exceção documentada.
- **CAMP-NOTE-03** Status de template e de campanha vêm do enum via `.color-chip`; não são tokens novos.
- **CAMP-NOTE-04** Sidebar do frame: 62px colapsada, ícone ativo (Disparos) com `background:rgba(255,255,255,.88); color:#0A0F0F`; anel de créditos no rodapé — pertence à tela 7a/6b, não a 2c.

**Total: 81 itens** (HDR 9 · TABS 6 · TABLE 14 · WIZ 31 · PREVIEW 7 · TPL 12 · NOTE 4 — TABLE-08 e TPL-05 contêm sub-variantes).
