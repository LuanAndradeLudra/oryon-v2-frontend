# Auditoria de a11y — camadas sobrepostas (23/09, Bússola, por leitura)

Escopo: todo componente de `src/components/ui/` que abre camada + os popovers de
`TopBar.tsx`. **Só leitura — nada foi editado.** Nada foi verificado ao vivo
(nem com leitor de tela): "✓" = o código faz; "✗" = o código não faz;
"—" = não se aplica ao tipo de camada. Números são linhas no HEAD desta branch.

Alcance dos primitivos (usos no app, sem contar testes): **Modal 32 · ConfirmModal 46 ·
FormDialog 4** (os dois últimos herdam tudo do Modal) → **~82 diálogos** dependem
do que o `Modal` faz ou deixa de fazer.

## Tabela

Colunas: **Papel** = `role=dialog/alertdialog/menu…` · **Nome** = `aria-labelledby`/`aria-label` ·
**Foco in** = foco inicial movido pra dentro · **Foco out** = foco devolvido ao gatilho ao fechar ·
**Esc** · **Scrim** = clique fora fecha · **Trap** = Tab não vaza.

| Componente | Papel | Nome | Foco in | Foco out | Esc | Scrim | Trap |
|---|---|---|---|---|---|---|---|
| **Modal** `ui/Modal.tsx` | ✗ (sem `role`, sem `aria-modal`; painel `:102`, wrapper `:83`) | ✗ (título é `<h2>` `:117` sem `id`; sem `aria-labelledby`) | ✗ | ✗ | ✓ via `useLayer` (`:62`) | ✓ (`:90`, painel `stopPropagation` `:108`) | ✗ |
| **ConfirmModal** `ui/Modal.tsx:191` | ✗ herda; deveria ser `alertdialog` quando `danger` | ✗ herda; `description` (`:210`) não vira `aria-describedby` | ✗ (nem em "Cancelar", que seria o foco seguro num destrutivo) | ✗ | ✓ herda — **fecha mesmo com `loading`** (`:196` passa `onClose` cru) | ✓ herda, idem `loading` | ✗ |
| **FormDialog** `ui/FormDialog.tsx` | ✗ herda | ✗ herda (`title` string vai pro `<h2>` sem id) | ✗ (primeiro campo não recebe foco) | ✗ | ✓ herda — também fecha com `loading` | ✓ herda | ✗ |
| **Drawer** `ui/Drawer.tsx` | ✓ `role="dialog"` + `aria-modal` (`:101-102`) | ⚠ `aria-label` (`:103`) mas o **default é `'Drawer'`** (`:42`) — nome inútil se o consumidor não passar. Hoje os 2 consumidores reais (via `BottomSheet`: `ResolveOutcomePopover:290`, `NewDealDialog:773`) passam nome; é risco de uso futuro, não bug atual | ✗ (só guarda `activeElement`, não move foco pra dentro `:53`) | ✓ (`:59`) | ✓ via `useLayer` (`:49`), respeita `dismissible` | ✓ (`:92`), respeita `dismissible` | ✗ |
| **BottomSheet** `ui/BottomSheet.tsx` | ✓ herda do Drawer | ⚠ default `'Bottom sheet'` (`:28`) | ✗ herda | ✓ herda | ✓ herda | ✓ herda | ✗ herda |
| **Dropdown** `ui/Dropdown.tsx` | ✓ `role="menu"` + `aria-orientation` (`:155-156`) | ✗ sem `aria-label`/`labelledby` no menu | ✓ 1º item, via rAF (`:101-107`) | ⚠ **só no Esc** (`:124`); clique fora (`:111-115`), clique num item e `onClose` externo **não** devolvem | ✓ (`:116-125`, `stopPropagation` correto p/ não fechar o Modal atrás) | ✓ mousedown fora (`:111`) | — (menu: falta tratar `Tab` → fechar; hoje Tab sai pra elementos atrás do scrim) |
| **Dropdown — gatilho** (consumidor) | — | — | — | — | — | — | ✗ o `Dropdown` não injeta `aria-haspopup`/`aria-expanded` no `anchor`; cada consumidor tem que lembrar (o `UserMenu` lembra: `TopBar.tsx:1147-1149`) |
| **ContextMenu** `ui/ContextMenu.tsx` | ✓ `role="menu"` (`:150`) | ✗ sem nome | ✗ **foco virtual**: `focusedIndex` só pinta o item (`:88`, `:242`), nenhum elemento recebe foco real nem `aria-activedescendant` — leitor de tela não anuncia o item | ✗ | ⚠ ✓ fecha (`:109`) **mas** o listener é `document` sem `stopPropagation` (`:108-113`) e ignora o `LayerContext` → com um Modal aberto, um Esc fecha o menu **e** o Modal | ✓ (`:105`) | — |
| **Tooltip** `ui/Tooltip.tsx` | ✓ `role="tooltip"` (`:68`) | ⚠ nome ok (conteúdo) mas **não ligado ao gatilho** (sem `aria-describedby`) | — | — | ✗ não dispensa com Esc (WCAG 1.4.13) | — | — |
| **Tooltip — foco/toque** | — | — | ✓ abre no `onFocus` (`:62`) | — | — | — | — |
| **Toast** `ui/Toast.tsx` | ✗ **sem live region** (`:50-84`: nenhum `role="status"/"alert"`, nenhum `aria-live`) — o toast nunca é anunciado; erro (`type:'error'`) deveria ser `role="alert"` | ⚠ botão fechar tem `aria-label` (`:79`) | — (não rouba foco, correto) | — | ✗ não fecha com Esc | — | — |
| **TagPicker / UserPicker** `ui/` | herdam do Dropdown | ✗ | ✓ `autoFocus` no campo de busca (`UserPicker:43`) — **mas** o Dropdown também foca o 1º `menuitem` via rAF (`Dropdown:104`); os dois disputam | ⚠ herda a limitação do Dropdown | ✓ herda | ✓ herda | — |
| **ColorPicker** `ui/ColorPicker.tsx` | — inline, não abre camada | ✓ `aria-label` nos botões (`:67`, `:100`) | — | — | — | — | — |
| **Popover de notificações** `layout/TopBar.tsx:795` (painel `:948`) | ✗ o painel não tem `role`/`aria-label` (só o miolo tem `role="list"` `:1003`) | ✗ | ✗ nada foca o painel ao abrir; navegação é por `focusedIndex` virtual em `document` (`:874-895`) — atalhos `j/k/e/u/a` valem em qualquer lugar enquanto o painel existe | ✗ (`notifOpen` só vira `false`, `:1321`/`:1465`) | ✗ **Esc não fecha o painel** (só há `Escape` em `:575` e `:1344`, ambos de outra camada) | ✓ scrim (`:1465`) + mousedown fora (`:1321`) | ✗ |
| **Popover — gatilho (sino)** `TopBar.tsx:1447` | — | ✓ `aria-label` com contagem (`:1450`) | — | — | — | — | ✗ sem `aria-haspopup`/`aria-expanded`/`aria-controls` |
| **Modal de detalhe da notificação** `TopBar.tsx:613` | ✓ `dialog` + `aria-modal` | ✓ `aria-labelledby="notif-modal-title"` → `<h3 id>` (`:632`) | ✓ 1º focável (`:572`) | ✓ (`:596`, com guarda `document.contains`) | ✓ (`:575`) | ✓ (`:618`) | ✓ (`:576-590`) |
| **Palette de busca** `TopBar.tsx:1482` | ✗ sem `role="dialog"`/`aria-modal` | ✗ o `<input>` só tem `placeholder` (`:1510`); sem `aria-label`, sem `role="combobox"`/`listbox` p/ os resultados | ✓ `autoFocus` (`:1507`) | ✗ o Esc faz `blur()` (`:1345-1346`) → foco vai pro `body` | ✓ **só com foco no input** (`:1344`) | ✓ (`:1490`) | ✗ |
| **Popover de agendamento** `schedule/ScheduleEventPopover.tsx:76` | ✓ `role="dialog"` (`:80`, não-modal: correto) | ✓ `aria-label` com o título (`:81`) | ✗ | ✗ | ✓ (`:44-48`, `stopPropagation`) + `useLayer` | ✓ mousedown fora (`:40`) | — |
| **Popover de créditos de IA** `layout/AiCreditsIndicator.tsx:213` | ✗ | ✗ conteúdo do popover sem nome | — | — | ✓ via `useLayer(hovered)` mas **só existe se `hovered`** | ✓ sai ao tirar o mouse | ✗ **abre só com `onMouseEnter`** (`:147`): sem foco/teclado/toque, o detalhe (300px, `:213-`) é inacessível; o botão só tem `aria-label` com o % |

## Achados por prioridade

**1. `Modal` sem semântica de diálogo (alcance ~82).** É o maior: role/`aria-modal`, nome,
foco inicial, devolução de foco e trap faltam em 100% dos `Modal`/`ConfirmModal`/`FormDialog`.
Só Esc e clique no scrim funcionam. **A receita já existe no repo** — `TopBar.tsx:562-598`
(`NotificationDetailModal`) faz foco inicial + trap + devolução + Esc; e `Drawer.tsx:51-61`
já guarda/devolve o foco. Sugestão: extrair um hook (`useDialogFocus(ref, open)`) e usar em
Modal **e** Drawer; ligar `aria-labelledby` a um `id` gerado (`useId`) no `<h2>` (quando `title`
é string; quando é nó, aceitar `titleId`).

**2. `ConfirmModal`.** Além do item 1: `role="alertdialog"` quando `danger`; `description` →
`aria-describedby`; foco inicial em **"Cancelar"** (padrão seguro pra destrutivo); ignorar
Esc/scrim enquanto `loading` (hoje `onClose` sai direto, `:196`; um Esc no meio de uma exclusão
fecha o modal com a operação em voo). Mesmo para `FormDialog` com `loading`.

**3. Notificações (popover do sino).** Esc não fecha (`:1321`/`:1465` só mouse). Trocar por
`useLayer` (como Dropdown/Popover de agendamento) resolve Esc + z-index + pilha de uma vez.
Gatilho precisa de `aria-haspopup="dialog"`, `aria-expanded`, `aria-controls`. Painel: `role="dialog"`
+ `aria-label="Notificações"` (é não-modal, sem `aria-modal`). Foco: mover pro painel ao abrir e
devolver ao sino ao fechar. Os atalhos `j/k/e/u/a` em `document` (`:874`) disparam com o foco em
qualquer lugar da página enquanto o painel está aberto — restringir a "foco dentro do painel".

**4. `Toast` sem live region.** Nenhum toast é anunciado. `role="status"`/`aria-live="polite"`
no contêiner; `type:'error'` → `role="alert"`. Um contêiner sempre montado (o de hoje só existe
quando há toast, `:35` — leitores costumam ignorar região inserida já cheia; manter o nó vazio
montado e trocar só o texto).

**5. `Dropdown` — devolução de foco só no Esc.** Clique num item, clique fora e `onClose`
externo não devolvem o foco ao gatilho (`:96-98` só é chamado em `:124`). Mover pro efeito de
`open→false`. Também: `aria-label` opcional no menu; `Tab` deveria fechar o menu (hoje o foco
escapa pra trás do scrim); o `Dropdown` deveria injetar `aria-haspopup="menu"`/`aria-expanded`
no `anchor` (hoje depende de cada consumidor). `UserPicker` (`:43`) e `Dropdown` (`:104`)
disputam o foco inicial.

**6. `ContextMenu` — foco virtual e Esc vazando.** Sem foco real nem `aria-activedescendant`.
Esc em `document` sem `stopPropagation` e fora do `LayerContext`: com Modal aberto, um Esc fecha
os dois. Já usa `z-[100]` fixo (`:153`), então também ignora a pilha de z-index.

**7. `Drawer` — sem foco inicial/trap; nome default genérico (risco futuro).** `ariaLabel = 'Drawer'`
(`:42`) não descreve nada; tornar obrigatório evita um Drawer futuro sem nome (os 2 consumidores
atuais passam). Falta mover o foco pra dentro ao abrir (`:53` só guarda o anterior) e trap.

**8. `Tooltip`.** Esc não dispensa; sem `aria-describedby` no gatilho (o leitor de tela não
associa o balão ao controle). `role="tooltip"` sozinho não basta.

**9. Palette de busca (`TopBar.tsx:1482`).** Sem `role="dialog"`/`aria-modal`, input sem nome
acessível, resultados sem `combobox/listbox`, Esc faz `blur()` (foco cai no `body`) e só vale
com foco no input. Não usa `LayerContext` (z-60 fixo).

**10. `AiCreditsIndicator`.** Detalhe só por `mouseenter` — inacessível por teclado/toque.
Abrir também no `focus`/`click` (o botão hoje navega pra `/settings/billing`, `goBilling`),
ou expor o mesmo dado como texto acessível no próprio botão.

**11. `ScheduleEventPopover`.** Sem foco inicial nem devolução; o resto (role, nome, Esc, fora,
`useLayer`) está certo — é o mais completo dos popovers.

## Observações laterais (não a11y, mas apareceram lendo)

- `Modal` trava scroll salvando/restaurando `document.body.style.overflow` (`:64-73`); com dois
  overlays abertos e fechados fora de ordem, o valor restaurado pode ser `'hidden'` (o do outro)
  e a página fica travada. Um contador de camadas no `LayerContext` resolveria.
- `TopBar.tsx:613` usa `backdrop-blur-sm` no scrim do modal de detalhe; `Modal`/`Drawer` são
  "sem blur" (MODAL-07). Divergência visual, não a11y.

## Fora do escopo desta leitura (diálogos próprios fora de `ui/`, não auditados)

`connectors/ConnectorDetailModal.tsx:52`, `deals/FunnelsConfigDrawer.tsx:63`,
`contexts/DealPanelContext.tsx:119`, `conversations/ChatWindow/ResolveOutcomePopover.tsx:299`
(todos já têm `role="dialog"`; foco/trap/devolução não foram lidos).

## Como verificar depois de corrigir

Um teste único sobre o `Modal` cobre os ~82: abrir → `role="dialog"` e `aria-modal` presentes,
`aria-labelledby` resolve pro título, `document.activeElement` dentro do painel; `Tab` no último
focável volta pro primeiro; fechar → `activeElement` é o gatilho. Já existe `__tests__/Drawer.test.tsx`
como molde (cobre role/label e fechamento; não cobre foco).
