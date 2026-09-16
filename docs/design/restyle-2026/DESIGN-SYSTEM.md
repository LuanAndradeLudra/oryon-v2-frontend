# Oryon — Design System para a sessão do Claude Design

Guia de referência pra reestilizar TODAS as telas do Oryon (WhatsApp Business
CRM/automação). Decidido em sessão de 2026-09-15 a partir de provas visuais
reais (não descrições — ver `PROMPT-SESSAO.md` pra como abrir a sessão).

## 1. O produto

Oryon é um CRM de atendimento via WhatsApp com automação (agentes de IA,
funis de negócio, campanhas/disparos, agendamento). Uso operacional intenso:
atendentes ficam com a tela aberta o dia inteiro. Módulos principais:
Dashboard, Conversas (Inbox), Contatos/CRM, Funis/Negócios (Pipelines),
Agentes IA, Disparos/Campanhas, Agendamentos, Configurações.

## 2. Diagnóstico — o que está sendo corrigido

O produto hoje tem tokens de cor bons, mas os **componentes são
reimplementados à mão em dezenas de arquivos** em vez de vir de um sistema
único: 54 arquivos reimplementam botão à mão vs. 32 usando o componente
compartilhado; 99 arquivos reimplementam spinner vs. 25 usando o componente
compartilhado; mais de 1.200 usos de tamanho de fonte "solto" (`text-[10px]`)
por falta de token. É isso que dá o ar "vibe-codado" — não a paleta.

**Regra de ouro da sessão:** a cor e os ícones já estão certos e ficam. Tudo
o resto — tipografia, grade, cards, modais, formulários, estados vazios,
densidade, hierarquia — está aberto pra reconstruir.

## 3. Cor — MANTER exatamente (não é reaberto nesta sessão)

Tema **Workspace Glow · Teal**, já em produção. Princípio 90/10: 90% neutro
(grafite/off-white + cinzas), 10% teal — o teal é cerimônia (logo, 1 CTA por
seção, avatar de IA, glow de fundo), nunca em fundo inteiro, texto longo,
sidebar inteira ou borda de tudo.

**Claro**
| Papel | Hex |
|---|---|
| Fundo de página | `#FAFAFC` |
| Superfície / card | `#FFFFFF` |
| Borda padrão | `#E4E6EC` |
| Borda de ênfase | `#C8CDD8` |
| Texto principal | `#1A1F2E` |
| Texto secundário | `#5C657A` |
| Texto terciário/dim | `#9098AA` |
| Acento (teal) | `#14B8A6` |
| Acento forte (hover/texto) | `#0F766E` |
| Acento suave (fundo de pílula) | `rgba(20,184,166,.12)` |
| Gradiente (só cerimônia) | `linear-gradient(135deg,#5EEAD4,#14B8A6,#0F766E)` |

**Escuro**
| Papel | Hex |
|---|---|
| Fundo de página | `#060909` |
| Superfície / card | `#161E1E` |
| Borda padrão | `#243333` |
| Borda de ênfase | `#2E4040` |
| Texto principal | `#ECF1F1` |
| Texto secundário | `#8FA5A5` |
| Texto terciário/dim | `#6B8080` |
| Acento (teal, sobe luminância no escuro) | `#2DD4BF` |
| Acento forte | `#14B8A6` |
| Gradiente (só cerimônia) | `linear-gradient(135deg,#5EEAD4,#2DD4BF,#14B8A6)` |

**Status (nunca substituir por teal):** sucesso `#22C55E`/`#15803D`,
perigo `#EF4444`/`#B91C1C` (fundo de botão destrutivo: `#B91C1C` sólido —
branco sobre `#EF4444` puro falha contraste AA, débito conhecido a corrigir
nesta reestilização).

## 4. Tipografia — NOVA: Plus Jakarta Sans

Decisão da sessão de provas visuais: sai o par Satoshi (display) + Inter
(corpo) que está em produção hoje, entra **Plus Jakarta Sans como família
única** para display e corpo — humanista, geométrica, premium, na linha do
que CRMs modernos (Attio) vêm usando. Menos "costura" entre título e corpo
do que um par de duas famílias.

- Títulos de página / números-herói: Plus Jakarta Sans 700–800
- Título de card / seção: Plus Jakarta Sans 600
- Corpo: Plus Jakarta Sans 400–500
- Eyebrow / label uppercase: Plus Jakarta Sans 700, `letter-spacing: .14em`,
  cor acento forte
- Números tabulares (KPIs, valores, timestamps em tabela): sempre
  `font-variant-numeric: tabular-nums`
- Mono (IDs, código, timestamp técnico): mantém JetBrains Mono — não foi
  reaberto, é um uso muito pontual e já funciona
- Fonte: Google Fonts (`family=Plus+Jakarta+Sans:wght@400;500;600;700;800`)

## 5. Forma, sombra e espaçamento — NOVO: Compacto

Decisão da sessão de provas visuais: densidade **compacta** (linha
Attio/Stripe/Linear) — cantos quase retos, bordas finas no lugar de sombra,
pouco respiro perdido. Isso **substitui** a régua atual de produção (que era
mais arredondada — cards em 16px, modais em 24px, sombra em tudo).

| Elemento | Antes (produção) | Novo (compacto) |
|---|---|---|
| Chip / badge / pílula | `rounded-md` (~8px) | `6px` |
| Botão / input | `rounded-lg/xl` (10–12px) | `7–8px` |
| Card | `rounded-xl` (16px) | `8–10px` |
| Modal / drawer / painel | `rounded-2xl` (24px) | `10–12px` |
| Sombra | `shadow-card`/`shadow-elevated` em quase tudo | borda `1px solid` no lugar de sombra; sombra só em overlay (modal sobre backdrop) |
| Padding de card | generoso | ~14–16px |
| Gap entre campos | `gap-4` | mantém — não é sobre respiro entre campos, é sobre cantos/sombra/padding do container |

Continua valendo da régua atual (não foi reaberto): altura de botão/input
`sm 28px · md 36px · lg 44px`; borda de divisor é sempre `border` (nunca um
tom mais escuro que isso); transição de hover 150ms, entrada de conteúdo
200–250ms ease-out.

## 6. Ícones — mantém Lucide

100% `lucide-react` hoje, é limpo e consistente — não é reaberto. Densidade
de traço padrão do Lucide (`strokeWidth={1.75–2}`), tamanho 16–20px em
contexto de lista/formulário, 20–24px em cabeçalho.

## 7. Grid & layout — princípios (a sessão de Claude Design propõe os números)

- Densidade de informação é prioridade sobre respiro — é ferramenta de
  operação usada o dia inteiro, não landing page.
- Sidebar é moldura do workspace (sempre escura, mesmo no tema claro) — não
  reabrir esse conceito, só a forma/borda dela.
- Estado de tela vive na URL (filtros, aba ativa, modal aberto) — qualquer
  novo padrão de navegação/drawer precisa preservar isso.
- Tabelas e listas densas (Contatos, Conversas) são o teste de estresse do
  sistema de componentes — se funcionar ali, funciona em qualquer lugar mais
  simples.

## 8. Componentes prioritários pra reestilizar

Nesta ordem de impacto (o que mais se repete pela plataforma):
1. **Botão** (primário, secundário, ghost, destrutivo, ícone) — hoje
   reimplementado à mão em 54 arquivos.
2. **Card** (contato, negócio/deal, conversa, KPI) — mesmo container,
   variações de conteúdo.
3. **Modal / Drawer / Dialog de confirmação** — inclui o padrão de
   confirmação destrutiva (ex.: mover negócio pra perdido).
4. **Tabela / lista densa** (Contatos, Conversas) — cabeçalho, linha,
   zebra/hover, paginação.
5. **Formulário** (label, input, select, erro inline) — hoje validação é
   100% manual, sem padrão visual de erro consistente.
6. **Badge / pílula de status** (etapa de funil, SLA, tag de contato).
7. **Estado vazio** e **spinner/skeleton** — hoje 99 arquivos reimplementam
   spinner cru em vez do componente compartilhado.
8. **Wizard / fluxo de setup em etapas** (criação de agente, campanha,
   funil) — precisa indicar progresso e "não perder o que já preenchi".

## 9. Checklist anti-genérico

Não fazer, mesmo que pareça "moderno":
- ❌ Gradiente cobrindo fundo inteiro de seção ou card — só cerimônia (regra
  90/10, seção 3).
- ❌ Sombra decorativa em tudo — nesta reestilização, sombra é para overlay,
  borda fina é para elevação de card (seção 5).
- ❌ Tudo centralizado — telas de operação são grid/tabela, alinhamento à
  esquerda é o padrão, centralizar é exceção pontual.
- ❌ Emoji como marcador de seção.
- ❌ `rounded-lg` em tudo por padrão sem pensar no papel do elemento —
  seguir a tabela da seção 5.
- ❌ Números sem `tabular-nums` em tabela/KPI (desalinha coluna).
- ❌ Inventar uma variação nova de componente quando já existe uma — esse
  foi o problema original, a sessão existe pra não repetir.

## 10. Ordem sugerida de sessões no Claude Design

Não dá pra reestilizar as ~13 telas numa sessão só com qualidade. Ordem que
estabelece o "vocabulário" (botão/card/modal/tabela) primeiro pra propagar
mais rápido pro resto:

1. **Dashboard** — layout de KPI + visão geral (só estrutura visual; os
   números do Dashboard atual são sabidamente falsos e já estão sendo
   corrigidos à parte — não é sobre isso aqui).
2. **Contatos/CRM** (lista + ficha do contato + drawer de configuração) —
   maior superfície de dados densos, valida tabela/formulário/drawer.
3. **Conversas/Inbox** — módulo mais usado no dia a dia.
4. **Funis/Negócios** (Kanban + card de negócio + modal de mudança de
   etapa) — valida o modal de confirmação destrutiva da seção 8.
5. Agentes IA → Disparos/Campanhas → Agendamentos → Configurações, cada um
   consumindo o vocabulário já fechado nas 4 primeiras.

---

# PARTE 2 — Inventário técnico do frontend atual

Auditoria minuciosa feita em 2026-09-15 (9 leituras paralelas do código real,
não só nomes de arquivo) para que o Claude Design tenha o máximo de contexto
de como a interface está estruturada HOJE. **O mandato desta reestilização é
trocar a pele, não a estrutura**: todo nome de prop, toda regra de
comportamento, todo mecanismo de estado listado abaixo como "preservar" tem
que continuar funcionando depois do redesign. Onde o código atual já tem uma
inconsistência (hex hardcoded, valor arbitrário, componente duplicado), ela
está sinalizada — não é para copiar, mas também não é o foco desta sessão
corrigir sozinha, a menos que o próprio Claude Design vá tocar naquele
componente de qualquer forma.

## 11. Tokens adicionais descobertos na auditoria (complementam a seção 3)

Além da paleta teal e dos status já listados na seção 3, o CSS de produção
(`frontend/src/index.css`) define estas famílias de token que qualquer
componente reestilizado precisa continuar respeitando:

- **`.color-chip` + `--chip`** — mecanismo universal pra "cor vinda de
  dado dinâmico" (etiqueta, tipo de automação, categoria de KPI, status de
  template): `background-color: color-mix(in srgb, var(--chip)
  var(--chip-mix, 85%), #000)`, texto branco fixo. Setado via `style={{
  '--chip': cor }}` inline. É como o app pinta qualquer cor arbitrária (de
  tenant ou de enum) sem hardcodar hex em componente.
- **`tintaDaEtapa(hex, alpha?)`** (`src/lib/utils.ts`) — a correção de
  contraste para cor de etapa de funil, que é dado do tenant (ver seção 14.1,
  é o achado mais crítico de toda a auditoria).
- **`--color-status-{pending,active,open,muted,info}`** e
  **`--color-cstatus-{pending,resolved}`** (+ `-bg`/`-border` cada) — status
  de conversa/registro, usados via `.color-chip`. Note que `status-*` e
  `cstatus-*` são famílias **distintas** (não intercambiáveis).
- **`--color-accent-{blue,green,violet,amber,rose,cyan}`** — acentos
  categóricos usados em abas do `AgentDetail`, ícones do `KpiGrid`, `Tabs`
  (`TabAccent`). Não são o teal de marca — são uma paleta categórica separada
  para diferenciar tipos de conteúdo dentro de uma mesma tela.
- **`--color-bubble-{in,out}` / `-fg`** — cor de bolha de mensagem
  inbound/outbound (ver seção 13, Conversas).
- **`--color-avatar-surface` / `-initials`** — invertem papel por tema (ver
  Avatar, seção 12.3).
- **`--color-online` / `-away` / `-offline`** — presença; reaproveitados
  também pelo `ProgressBar` como semântica de risco (ok/atenção/crítico).
- **`--ink-target` / `--ink-amount`** — os dois tokens que `tintaDaEtapa`
  usa para corrigir contraste (`0%`/branco no escuro, `40%`/preto no claro).
- **`--color-board-bar`** — chão da barra de contexto do funil (`#060909`
  escuro / `#FFFFFF` claro — no claro ela "sobe" sobre o cinza da página).
- **`--color-composer-bg` / `-border`** — fundo do campo de envio de
  mensagem, mais escuro que qualquer surface padrão (2 iterações de ajuste
  documentadas no CSS).
- **`--color-shell`** — o chão por trás do "canvas" do workspace (mais
  escuro que `surface-950`, cria a moldura elevada do `AppShell`).
- **`--color-overlay` / `-border` / `--color-scrim-soft`** — usados pelas
  classes `.overlay-surface` (dropdown/popover) e `.overlay-frame`
  (drawer/modal, só borda+sombra, fundo próprio).
- **`--shadow-overlay`** — sombra composta (inset highlight + 2 camadas)
  usada por `.overlay-surface`/`.overlay-frame`, diferente por tema.
- **`--text-2xs` (11px) / `--text-3xs` (10px)** — criados especificamente
  pra substituir os 1200+ usos de `text-[10px]`/`text-[11px]` arbitrário
  encontrados na auditoria de 2026-08. **Ainda quase não adotados** (a
  auditoria desta sessão achou o mesmo padrão arbitrário repetido em
  `FormField`, `SegmentedControl`, `TagPicker`, `UserPicker`, `DataTable`,
  `Avatar`, `Stepper`, `WizardProgress`, `ComingSoonBadge`, `SettingsLayout`
  e mais) — é a limpeza mecânica mais óbvia e de menor risco pra fazer
  junto da reestilização, em `px` fixo (não `rem`, não segue a escala do
  desktop).
- **Gradiente de KPI** — `--kpi-gradient-start/end` (+ variantes `-green-*`
  `-orange-*`), aplicado via `.kpi-hero-value`/`.kpi-hero-green`/
  `.kpi-hero-orange` com `background-clip: text` — família de token
  **separada** do gradiente de marca (`.gradient-teal`).

## 12. Sistema de overlay e camadas (`useLayer`)

Existem **dois sistemas de z-index coexistindo** — importante entender antes
de redesenhar qualquer modal/drawer/menu:

1. **`useLayer()`** (`src/contexts/LayerContext.tsx`), registrado uma vez em
   `App.tsx`. Cada overlay que chama `useLayer(open, onClose)` entra numa
   pilha por ordem de montagem; z-index = `BASE_Z (60) + posição na pilha`
   (nunca cresce sem limite). Um único listener de `Escape` no `window`
   fecha **só o item do topo**. Consumidores confirmados: `Modal`,
   `ConfirmModal` (variante de `Modal`), `Drawer`, `BottomSheet` (herda de
   `Drawer`), `DealPanelContext` (painel de negócio), `CRMConfigDrawer`,
   `ContactDetailPanel`. **Qualquer novo modal/drawer da reestilização deve
   entrar nesse sistema**, não hardcodar `z-[N]`.
2. **Z-index hardcoded, fora do `useLayer`** — calibrados manualmente pra
   ficar sempre acima: `ContextMenu` (`z-[100]`/`z-[101]` submenu, Esc e
   clique-fora com listener próprio, não integrado ao `useLayer`),
   `Tooltip` (`z-[9999]`, o maior do app, sem flip de borda de viewport),
   `Toast` (`z-[200]`), `Dropdown` (`z-40` scrim / `z-50` painel),
   `EmojiPickerButton` (`z-50`). Funciona hoje por calibração manual, não
   por garantia estrutural.

**Padrão de portal**: `Modal`, `Drawer`, `ContextMenu`, `Dropdown`, `Toast`,
`Tooltip`, `MobileFeatureGate`, drawer mobile do `ContactPanel` — todos usam
`createPortal(document.body)`, deliberadamente, para escapar de ancestrais
com `transform` (framer-motion) que quebrariam `position:fixed`. Preservar
esse padrão em qualquer novo overlay.

**Scroll lock + foco**: `Modal`/`Drawer` bloqueiam scroll do `body` enquanto
abertos e restauram no cleanup; `Drawer` guarda o elemento focado antes de
abrir e devolve o foco a ele ao fechar (não faz trap de foco interno). Nenhum
overlay do app faz trap de foco completo hoje — não é uma lacuna desta
reestilização resolver, mas também não fingir que existe.

## 13. Primitivos de UI (`src/components/ui/`) — inventário completo

53 componentes primitivos hoje. Abaixo, por grupo funcional, com o essencial
pra reestilizar sem quebrar. Onde um componente já usa bem os tokens (Banner,
ConfirmModal, PhoneField, NumberField), está marcado — são a referência de
"como deveria ser" para os que não usam.

### 13.1 Formulário e controle

| Componente | Props visuais | Comportamento a preservar |
|---|---|---|
| **Input** (`Input.tsx`) | sem `size` formal; `error?` | `forwardRef`; usa `useFormFieldAria()`/`mergeFieldAria()`; `invalid = !!error \|\| !!field?.invalid` |
| **Textarea** (`Textarea.tsx`) | igual ao Input + `resize-none` | mesmo mecanismo de contexto |
| **Select** (`Select.tsx`) | `appearance-none` + chevron | opções não estilizadas (nativas do browser) |
| **NumberField** (`NumberField.tsx`) | delega 100% ao Input | `value: number\|null`; `min`/`max` só aplicados no `onBlur`, nunca durante digitação — não mudar essa ordem |
| **MoneyInput** (`MoneyInput.tsx`) | prefixo "R$", `pl-9 text-right tabular-nums` | opera em **centavos inteiros**, nunca locale-parse; `MAX_CENTS = 2147483647`; seleciona tudo no focus; **não é `forwardRef`** (diferente dos outros) |
| **PhoneField** (`PhoneField.tsx`, referência de boas práticas) | herda do Input | mostra formatado, entrega dígitos puros; DDI 55 assumido; `maxLength=17` |
| **FormField** (`FormField.tsx`) | `requirement?`, `filled?`, `comingSoon?` | gera `id` estável via `useFieldAria`; clona filho só se for input/select/textarea nativo direto; outro filho recebe via Context — **não remover essa dualidade** |
| **FormDialog** (`FormDialog.tsx`) | `danger?` | submit por Enter E por clique levam ao mesmo `onSubmit`; bloqueia duplo-submit; depende do `Modal` para todo o resto |
| **formField.context.ts** | infraestrutura, não visual | `useFieldAria()` é usado **fora deste diretório também** — API intocável; regra de precedência: `id` do contexto sempre vence a prop, `aria-describedby` soma |
| **Dropdown** (`Dropdown.tsx`) | `align?` | posição calculada em JS (`useDropdownPosition`, vira pra cima se não couber); portal; foco vai pro 1º item ao abrir e volta ao gatilho ao fechar; Esc com `stopPropagation` (não fecha Modal por trás) |
| **Switch** (`Switch.tsx`) | única variante | `role="switch"`; thumb branco fixo nos dois temas; offsets do thumb (`x:1→20px`) são hardcoded ao tamanho atual |
| **RadioOptionList** (`RadioOptionList.tsx`) | `noneLabel?` | usa `accent-brand-500` (radio nativo do browser, não customizado — diferente do resto do DS) |
| **SegmentedControl** (`SegmentedControl.tsx`) | `size: sm\|md`, `variant: subtle\|solid`, `count?` | **`subtle` é o padrão em toolbars/abas por todo o app — não alterar sem revisar todos os usos**; `role="tablist"` |
| **TagPicker** (`TagPicker.tsx`) | 2 exports: `TagPickerContent` (headless) e `TagPicker` (com Dropdown) | campo de busca **reimplementado cru** (não usa `Input`) — mesma duplicação em `UserPicker`, candidato a `SearchField` compartilhado |
| **ColorPicker** (`ColorPicker.tsx`) | `swatchesOnly?` | usa `react-colorful`; lógica de paleta curada vem de `@/lib/colorPalette` — não duplicar |
| **EmojiPickerButton** (`EmojiPickerButton.tsx`) | `position: top\|bottom` | picker (emoji-mart) montado 1x e mantido no DOM (nunca desmonta); **`theme:'dark'` hardcoded** — não acompanha tema claro, ponto de atenção se a reestilização mexer no claro |
| **UserPicker** (`UserPicker.tsx`) | único | mesma duplicação de busca cru do TagPicker |
| **Button** (`Button.tsx`, **referência oficial da régua de altura/radius**) | `variant: primary\|neutral\|secondary\|ghost\|danger`; `size: sm\|md\|lg`; `loading?`; `leftIcon`/`rightIcon` | `sm h-7 · md h-9 · lg h-11`; `disabled={disabled\|\|loading}`; loading substitui leftIcon por spinner |

**Achado transversal mais importante deste grupo**: a régua `sm/md/lg`
documentada no topo do `index.css` como canônica **só é implementada de
verdade pelo `Button`**. `Input`/`Textarea`/`Select`/`NumberField`/
`MoneyInput`/`PhoneField` não têm prop `size` — altura vem implícita de
`py-2 text-sm`. **Decisão para a sessão**: formalizar `size` nos campos de
texto alinhando às alturas do Button, ou documentar que campos de texto não
seguem essa régua. Além disso duas famílias de token teal coexistem
(`--color-brand-*` na maioria dos componentes vs. `--color-accent*` só no
`Button` ghost) — vale uma decisão explícita: consolidar, ou confirmar que
`accent` = tinta de interação e `brand` = cor de componente.

**Inconsistências pontuais já mapeadas** (não é para copiar): radius do
`Button` usa `rounded-[10px]/[11px]/[12px]` em colchete em vez dos tokens
`--radius-sm/md` (o `md` de 11px nem bate com token nenhum); a sombra do
`Button primary` duplica o valor de `--shadow-glow` em vez de usar a classe;
`hover:bg-red-600` no `danger` é cor crua do Tailwind, não token.

### 13.2 Superfícies e overlays

| Componente | Props visuais | Comportamento a preservar |
|---|---|---|
| **Card** (`Card.tsx`) | `elevated?`, `glow?`, `noPadding?`, `onClick?` | estático, sem overlay; 3 sombras estão como valores arbitrários idênticos aos tokens `--shadow-card/elevated/glow` (deveriam usar os tokens) |
| **Modal** (`Modal.tsx`) | `footer?`, `fillHeight?`, `className?`, `bodyClassName?` | `createPortal`; `framer-motion` (overlay fade 150ms, painel scale+y 180ms); scroll lock; Esc/z-index via `useLayer`; sem trap de foco |
| **ConfirmModal** (dentro de `Modal.tsx`, usado em **~36 arquivos**) | `title`, `description`, `impact?` (bloco de alcance via `Banner`), `confirmLabel?`, `danger?`, `loading?` | herda 100% do Modal; **componente mais consistente do lote** (100% via token) |
| **Drawer** (`Drawer.tsx`) | `side: left\|right\|bottom`, `dismissible?`, `ariaLabel?` | portal; `useLayer`; restaura foco ao elemento anterior (não trap); drag-to-close **só no `side="bottom"`** (threshold 100px/velocidade 500) |
| **BottomSheet** (`BottomSheet.tsx`) | `size: half\|tall`, `hideHandle?` | wrapper fino sobre Drawer `side="bottom"`, herda tudo |
| **ContextMenu** (`ContextMenu.tsx` + `contextMenuCore.ts`) | item: `label,icon?,shortcut?,danger?,disabled?,children?` | Provider+Context, portal pro menu raiz e pro submenu; flip de borda de viewport; navegação por teclado; **fora do `useLayer`**, Esc com listener próprio |
| **Tooltip** (`Tooltip.tsx`) | `side: top\|right\|bottom\|left`, `wide?` | portal; **sem flip de borda de viewport** (admitido no código); **sem animação de entrada/saída** (único overlay flutuante assim) |
| **Toast** (`Toast.tsx`) | tipo `success\|error\|info\|warning`; `action?` | `ToastContainer` mostra **só o toast mais recente** (não empilha); portal; cores de `success`/`warning` são **Tailwind cru** (`emerald-600`/`amber-500`), não os tokens `--color-success/warning` — inconsistência a reconciliar se o Toast for tocado |
| **Banner** (`Banner.tsx`, **referência de bom uso de token**) | `variant: warning\|danger\|info\|success\|neutral`, `icon?`, `action?` | 100% via `.color-chip`+`--chip`; `role="alert"`/`"status"` conforme variante |
| **PageHeader** (`PageHeader.tsx`) | `title`, `subtitle?`, `actions?`, `children?` | estático |
| **CollapsibleSection** (`CollapsibleSection.tsx`) | `title`, `count?`, `defaultOpen?`, `storageKey?`, `actions?` | persiste estado em `localStorage`; sem animação de altura (show/hide condicional) |
| **dock.tsx** | magnificação por proximidade do mouse | toda a geometria é `framer-motion` (`useMotionValue`/`useSpring`); `DockLabel` duplica o padrão do `Tooltip` |
| **sidebar.tsx** | ver seção 15 (shell) | — |

### 13.3 Dados e feedback

| Componente | Props visuais | Comportamento a preservar |
|---|---|---|
| **DataTable** (`DataTable.tsx`) | colunas tipadas (`align`, `widthClass`, `sortable`, `responsiveClass`); `dense?`; `activeKey?`; `selectedKeys?` | ordem de fallback loading→error→empty; **sem paginação embutida** (responsabilidade do caller); **⚠️ só é usado por Automações — a tabela de Contatos (`ContactsTable.tsx`) é 100% reimplementada à mão, não usa este componente** (ver seção 14.3) |
| **Badge** (`Badge.tsx`) | `variant: default\|pending\|open\|resolved\|abandoned\|unread` | duas famílias: "chip" (via `.color-chip`) vs "plain" (`default`/`unread`) |
| **Avatar** (`Avatar.tsx`) | `size: xs\|sm\|md\|lg`; `online?`; `kind: contact\|operator` | forma por `kind` (`contact`=círculo, `operator`=`rounded-[30%]`); cor de iniciais **deliberadamente monocromática**, não hash-based (decisão de produto documentada) — não reintroduzir cor por identidade |
| **ActorChip** (`ActorChip.tsx`) | `actorType`, `actorName?`, `maxNameWidth?` | normalização defensiva pra `actorType` desconhecido → `'system'` |
| **EmptyState** (`EmptyState.tsx`) | `icon`, `title`, `hint?`, `action?` (union href/onClick) | CTA **deliberadamente neutro** (`surface-100`), não teal — "teal virou marca de botão genérica demais"; **13 telas reimplementam esse padrão à mão em vez de usar o componente** (ver 14.3) |
| **ErrorState** (`ErrorState.tsx`) | `title?`, `hint?`, `onRetry?`, `compact?` | mesmo shell visual do EmptyState (duplicado, não compartilhado via classe); `role="alert"` |
| **Skeleton** (`Skeleton.tsx`) | 5 exports: `Skeleton/SkeletonText/SkeletonCard/SkeletonTable/SkeletonList` | todos `aria-hidden="true"` |
| **Spinner** (`Spinner.tsx`, **padrão oficial recente**) | `label?` | sem label = decorativo (`aria-hidden`); com label = `role="status"` + texto sr-only; **91 arquivos ainda reimplementam `&lt;Loader2 className="animate-spin"&gt;` cru** em vez de usar este componente (ver 14.3) |
| **ProgressBar** (`ProgressBar.tsx`) | `value`, `max`, `colorClass?`, `showLabel?` | cor automática por faixa de risco (`≥90 danger`, `≥70 away`, senão `online`) — reaproveita tokens de presença/status, não tem paleta própria |
| **Stepper** (`Stepper.tsx`) | `sections`, `active`, `onJump` | navegação **livre** (todas as seções clicáveis) — diferente do WizardProgress |
| **WizardProgress** (`WizardProgress.tsx`) | `steps`, `currentStep`, `onStepClick` | navegação **travada** (só passos já concluídos são clicáveis); `layoutId` do framer-motion anima o dot ativo; usado por `CampaignWizard`, `TemplateCreator`, `AgentBuilderWizard` |
| **Tabs** (`Tabs.tsx`) | `tabs` (com `accent?: TabAccent`), `value`, `onChange` | sublinhado 2px, sem indicador deslizante; **controlado sem guarda de no-op** (clicar na aba já ativa ainda dispara `onChange`, testado deliberadamente); sem roving tabindex/setas (intencional) |
| **ComingSoonBadge** (`ComingSoonBadge.tsx`) | `label?` | estático |
| **TipCard** (`TipCard.tsx`) | `icon` (ReactNode, não LucideIcon), `title`, `description`, `onDismiss?`, `children?` | exige `AnimatePresence` no consumidor para animar a saída |
| **WhatsAppIcon** (`WhatsAppIcon.tsx`) | `variant: brand\|mono` | `brand` usa hex fixo (`#25D366`) **deliberadamente** — exceção documentada da régua "cor sempre via token" (marca de terceiro) |

**Duas peças de "progresso" com propósitos diferentes, não unificar sem
entender o contrato**: `ProgressBar` (cor sólida por faixa de risco,
quantitativo genérico) vs. `WizardProgress` (gradiente de marca, navegação
travada por validação) vs. `Stepper` (navegação livre, sem noção de
progresso %).

## 14. Shell, layout e componentes comuns

### 14.1 AppShell / NavSidebar / TopBar (a moldura de TODAS as telas)

**Decisão desktop×mobile é puramente CSS** — `useIsMobile()` = media query
`(max-width: 767px)` via `matchMedia`, sem checar `Capacitor.isNativePlatform()`.
O app nativo roda a mesma media query do browser.

**Como as páginas entram no shell**: não é `&lt;Outlet&gt;` — `ProtectedRoute`
envolve cada rota individualmente (`RequireAuth` → `OnboardingGate` →
`AppShell` → `{children}`). `/setup` é a única rota protegida fora do
`AppShell` (tela cheia).

**Desktop (`AppShell.tsx`/`ShellLayout`)**: `flex` horizontal — `NavSidebar`
+ coluna (`TopBar` + conteúdo), **não CSS grid**. O conteúdo vive num
"canvas" flutuante (`rounded-2xl border border-surface-800/70
bg-surface-950`) que não encosta nas bordas da viewport (`py-1.5 pr-1.5` de
folga) sobre um `--color-shell` mais escuro por trás — é essa diferença de
profundidade que cria a sensação de painel elevado. `#main-content` é uma
`&lt;div&gt;` (não `&lt;main&gt;` — cada página declara o seu); o shell não impõe
padding/scroll ao conteúdo além de `flex-1 min-w-0 overflow-hidden`.

**NavSidebar — números reais**: largura **228px expandida / 62px
colapsada** (px fixo, não token), definida em `sidebar.tsx`
(`DesktopSidebar`). Mecanismo padrão: **hover-expand**
(`onMouseEnter`/`onMouseLeave`). Pin: estado `pinned` persistido em
`localStorage['oryon:sidebar-pinned']` — pinada ignora hover e fica sempre
aberta. Itens de menu são **arrays de config declarativa** dentro do
componente (`{icon,label,href,badge?,nudge?}`), com itens condicionais a
feature flags (`useMultiPipeline()`, `isRouteVisible`, `isOryonStaffHelper`).
Estado ativo usa `bg-white/85`/`text-black` **hardcoded** (não tokens
`surface-*`) — funciona porque a sidebar é **sempre escura nos dois temas**
por design (classe `.nav-sidebar` remapeia os tokens de superfície
localmente).

**TopBar**: `h-12` (48px), título/subtítulo lidos de dicionários estáticos
por rota (`PAGE_TITLES`/`PAGE_SUBTITLES`). Da esquerda pra direita à direita:
`TopBarReadinessIndicator` (fail-soft, unificado com o
`WorkspaceReadinessBanner` via `useWorkspaceReadiness` — os dois têm que
ficar consistentes se o visual mudar) → slot de ações da página
(`TopBarActionsContext`) → busca (pílula, atalho `/`, overlay via portal) →
atalho do Copilot (condicional) → notificações (painel `w-[26rem]`, atalhos
J/K/Enter/E/U/A).

**Mobile (`AppShellMobile.tsx`)**: vertical simples, **sem** NavSidebar/TopBar
globais — `h-[100dvh]` (não `h-screen`, por causa da barra de endereço
mobile). Cada página renderiza seu próprio `MobilePageHeader`.
`BottomTabBar` (4-5 abas dinâmicas por `useMultiPipeline()`) some quando o
chat está fullscreen. Safe-area via classes utilitárias (`.pt-safe` etc.,
`env(safe-area-inset-*)`) para o Capacitor.

### 14.2 Componentes `common/` e `shared/`

Praticamente todos usam classes Tailwind + tokens direto, ou o padrão
`.color-chip`/`--chip` — nada de CSS-in-JS. Os que têm regra de exibição
condicional **não são só estilo**:
- **`LineFilterChip`/`WhatsappLineChip`**: `if (numbers.length &lt; 2) return
  null` — somem completamente em tenant de linha única, não é CSS
  escondendo.
- **`Fab`** (mobile): posição calculada explicitamente
  (`bottom-[calc(4.5rem+env(safe-area-inset-bottom))]`) pra ficar **acima**
  da `BottomTabBar` — não remover esse cálculo ao restylar.
- **`MobileFeatureGate`**: portal, tela cheia, substitui wizards pesados em
  mobile com CTA "copiar link pra abrir no desktop"; usado por
  `AdminMobileBlock` e como fallback de telas `DESKTOP_FIRST_SECTIONS`.
- **`WorkspaceReadinessBanner`**: fail-soft; modo `inline` mostra só o
  **primeiro** blocker (evita empilhar banners).

## 15. Módulo Conversas/Inbox

**Layout de 3 colunas** (desktop): lista (`w-[360px]→[480px]` conforme
breakpoint) + chat (`flex-1`) + `ContactPanel` (`w-[308px]`, condicional a
`infoOpen`). Mobile: lista/chat são telas alternativas full-screen
(nunca as duas juntas), `ContactPanel` vira drawer via portal.

**Diferenciação inbound/outbound da bolha — 3 canais simultâneos, não só
cor**: (a) tokens `--color-bubble-in/out` (+ `-fg`), (b) alinhamento
(`flex-row-reverse` para outbound), (c) forma do canto (`rounded-*-xs` só no
lado "de baixo", alternando — efeito "cauda" só na 1ª bolha de um grupo).
**Um reestilo pode trocar a paleta, mas remover qualquer um dos 3 canais
reduz a legibilidade rápida do histórico.**

**Convenção de cor do handoff IA/humano é INVERTIDA de propósito** (decisão
documentada de 2026-05-15): âmbar = IA está no controle (chama atenção),
esmeralda = humano assumiu (seguro). Contraintuitivo, mas deliberado — não
inverter sem confirmar com o PO.

**Outras regras a preservar**: badge de anomalia/verificação (Verification
Gateway, 3 estados de cor) é sinal de compliance, semântica própria,
independente do badge de não-lido; agrupamento de mensagens por
`senderKey()` controla exibição de avatar (não confundir estilo de "primeira
bolha do grupo" com lógica de agrupamento); scroll com posição de leitura
preservada (`useLayoutEffect` de jump instantâneo ao trocar de conversa +
smooth scroll só em mensagem nova, e só se já estava perto do fundo);
paginação por scroll ao topo; waveform de áudio determinística + progresso
via `requestAnimationFrame` direto em refs de DOM (não recriar sem preservar
esse contrato de performance); composer tem **3 layouts mutuamente
exclusivos** (`blockedReason` → `windowOpen=false` → normal); gradiente de
borda do item ativo da lista (tema claro) é um hack CSS com largura de borda
duplicada em 2 lugares (risco de regressão documentado no próprio CSS);
densidade da lista já foi objeto de reversões deliberadas (telefone virou
`title`, tags viraram ponto em vez de pílula) — não reintroduzir sem
avaliar.

## 16. Módulo Contatos/CRM

**Duas superfícies para abrir um contato**: drawer lateral (`w-[48rem]`,
quick view, 5 abas: Visão Geral/{Negócios}/Histórico/Conversas/Disparos) e
rota própria `/contacts/:id` (Customer 360, atrás de flag) — a rota, sem a
flag, redireciona de volta pro drawer. Navegação preserva estado na URL
(`?contact=`, `?tab=`, `state.voltarPara`) — regra permanente do produto,
não é detalhe implementável de qualquer jeito.

**StageBadge ≠ tag, por FORMA, não por cor** — decisão documentada e
intencional: situação do contato usa `rounded-[5px]` (quase reto) + ponto
colorido; etiqueta usa `.color-chip` pílula cheia. **Não colapsar as duas
num único componente visual.**

**Toda cor vinda do banco passa por `.color-chip`/`--chip`** (etapa, tag,
pipeline) — qualquer novo estilo de chip precisa continuar aceitando hex
arbitrário do tenant.

**Avatar com semântica de forma por `kind`** e tokens
`--color-avatar-surface/-initials` que **invertem papel entre temas** — não
hardcodar.

**Ficha completa (`/contacts/:id`)**: 3 colunas com larguras fixas
(esquerda 360px / direita 400px só ≥1280px), header fixo que não rola.
**3 das 5 abas centrais (Negócios/Campanhas/Automações) são dados MOCK**
(`MockBadge` visível, atrás de `PROFILE_MOCKS_ENABLED`) — não tratar como
dado real, preservar o aviso.

**Vocabulário dinâmico por tenant** (`useTenantVocab()`) — "Negócios" pode
ser outra palavra por tenant, não fixar strings.

**Coluna "Funis" e aba "pipelineStages" são condicionais a
`useMultiPipeline()`** — layout precisa funcionar com e sem.

## 17. Módulo Funis/Negócios (Pipelines/Deals)

**Achado mais crítico de toda a auditoria: cor de etapa é DADO DO TENANT,
não token do design system.** `stage.color`/`pipeline.color` são hex
arbitrários escolhidos livremente por cada tenant no banco. A função
`tintaDaEtapa(hex, alpha?)` (`src/lib/utils.ts`) corrige contraste via
`color-mix` com os tokens `--ink-target`/`--ink-amount` (mistura zero no
escuro, 40% preto no claro) — regra: **texto/linha fina** sempre passa por
`tintaDaEtapa()`; **área** (ponto, fundo translúcido, glow) usa a cor crua ou
`hexToRgba()`. **O restyle não pode substituir isso por uma paleta fixa** —
precisa continuar funcionando para qualquer hex que um tenant cadastre. Se a
sessão quiser mudar a fórmula de contraste, o lugar certo é ajustar os dois
tokens `--ink-target`/`--ink-amount`, não hardcodar cor de etapa em
componente. (Inconsistência já existente, não copiar: `DealDetailHeader`
usa `stage.color` cru no badge de etapa atual, diferente do resto que usa
`tintaDaEtapa`.)

**"Terminal exige modal de motivo" é regra de negócio espalhada em 3
lugares que precisam ficar sincronizados**: drop no board, clique no
stepper da ficha, atalhos "Marcar ganho/perdido" — todos verificam
`stage.isWon || stage.isLost` antes de mover e abrem o mesmo
`CloseDealReasonModal` (a "única porta de fechamento da UI"; o backend
recusa com 400 sem motivo). Etapas terminais **nunca são clicáveis
diretamente** na trilha/stepper.

**Drag-and-drop é HTML5 nativo**, condicionado a `(hover: hover) and
(pointer: fine)` — em touch vira menu "Mover ▾" por card (alternativa
obrigatória, preservar os dois caminhos).

**`PipelineTrail`/`DealProgress` (stepper) tem 4 graus de densidade** por
contagem de etapas e usa `layoutId` do framer-motion para deslizar o
indicador entre etapas (não piscar) — reusado tanto no header da ficha
quanto no diálogo "Novo negócio".

**Vocabulário dinâmico por tipo de funil** (`pipelineKindOf`) — "Ganho/
Perdido" vs. "Concluído/Cancelado", "negócio" vs. "registro" — não hardcodar.

## 18. Módulo Agentes IA / Automações / Skills

**Dois paradigmas de "wizard" diferentes hoje, não por acidente**:
`AgentBuilderWizard` é **tela cheia** com 2 painéis fixos (Tutor 320px +
form) e 8 etapas lineares validadas (só etapas concluídas são clicáveis
pra voltar); `AutomationBuilder` é um **drawer lateral** com nav vertical
e scroll único ("mini-fluxo" com `scrollIntoView`, não troca de tela). Uma
reestilização que tente unificar os dois precisa decidir isso
deliberadamente.

**Agentes é o único módulo principal sem rota de detalhe deep-linkável**
(confirmado: `AgentsPage` não usa `useSearchParams`, é lista+detalhe inline
em `useState`) — Automações já tem `?automation=id`/`?atencao=1`.

**O estado "dirty" do wizard de agente JÁ é respeitado corretamente**
(`isDirty` na linha 1889 de `AgentBuilderWizard.tsx` + `ConfirmModal` ao
fechar) — não é um bug pendente, é comportamento existente a preservar tal
como está. Há um **segundo dirty independente**, escopado só ao editor
inline do Step4 (hub da empresa), com seu próprio "Salvar" — não confundir
os dois ao reestilizar os botões.

**Animações "IA trabalhando agora" são múltiplas e não-reaproveitadas entre
si**: `PromptGeneratingAnimation` (geração de prompt, 60-90s), `WizardKBProgress`
(upload de conhecimento), `TypingIndicator` no `AgentTestModal` (chat de
teste) — cada uma tem timing/semântica própria.

**Modais aninhados do `HandoffRuleBuilder` usam `createPortal(document.body)`
deliberadamente** pra escapar do wrapper framer-motion do wizard — não
herdam o stacking-context do card pai.

**Auto-save debounced silencioso** é o padrão dominante nas abas
pós-criação do agente (indicador textual "Salvando…/Salvo" no header, sem
barra fixa) — contrasta com `AutomationBuilder`, que tem footer fixo com
botões explícitos. Não introduzir barra de save fixa em `AgentDetail` sem
repensar esse contrato.

**`AgentIcon` usa 12 cores Tailwind literais**, não tokens da DS — exceção
deliberada de paleta (identidade visual por agente); se a reestilização
mudar a cor de marca, essa lista não acompanha automaticamente.

## 19. Módulo Dashboard / Campanhas / Configurações / Onboarding

**Dashboard**: layout "narrativa + pulso" — 2 colunas (8/12 principal + 4/12
rail em tempo real), mesmo card base em tudo
(`bg-surface-900 border-surface-800 rounded-xl p-5`). **Vários KPIs são
zerados manualmente no código hoje** (resolved_rate, csat, nps, etc.) — é o
"sabidamente falso" já excluído do escopo (dev externo corrigindo à parte);
só a estrutura visual importa aqui. Todos os gráficos usam **recharts** +
`useChartColors()` (nunca hex fixo em SVG — já é a régua canônica do CSS).

**Campanhas**: 3 abas (Disparos/Templates/Atribuição). `CampaignWizard`
(modal, 5 etapas) e `TemplateCreator` (substitui o conteúdo da aba inteira,
não é modal) — dois padrões diferentes de "wizard" novamente. Botão
principal do módulo é **neutro** (`variant="neutral"`), não teal —
"o teal aqui não dizia importante, dizia botão" (comentário no código).
`TemplatePreview` simula o WhatsApp real com **hex hardcoded deliberado**
(mockup fiel — não confundir com o DS do Oryon).

**Configurações**: não são abas nem accordion — é uma **sidebar secundária
de 3 níveis** (Domínio > Cluster > Item, 100% tipográfica, sem ícones/pills)
com busca por sinônimo. Conteúdo em coluna de leitura central (`max-w-4xl`)
com índice automático opcional à direita. Dentro da página, grupos de campo
usam `SettingsSection` (grid 2-col, hairline entre grupos, **zero cards** —
"gramática nova" deliberada, documentada no próprio código como substituição
de um padrão anterior de cards).

**Onboarding/Setup**: wizard modal full-screen fora do `AppShell`, 3 passos
+ tela final, painel esquerdo fixo compartilhado (`StepChrome`) pros passos
WhatsApp/Time — que **reaproveitam componentes inteiros de Configurações**
(`WhatsAppNumbers`, `Departments`), não duplicam UI. Passo "Hub" (empresa)
reimplementa o chrome manualmente porque precisa de 2 colunas.

## 20. Débitos técnicos já conhecidos (não é objetivo desta sessão resolver sozinha, mas o Claude Design deve saber)

Ao restylar os componentes abaixo, o novo visual **não vai alcançar** essas
telas a menos que alguém migre o componente de dados subjacente também:

1. **`ContactsTable.tsx` (tela de Contatos) não usa o `DataTable`
   compartilhado** — é uma tabela 100% reimplementada à mão, com ~90% do
   mesmo comportamento duplicado. Reestilizar `DataTable.tsx` sozinho não
   muda a tela de maior volume de dados do app.
2. **~91 arquivos reimplementam spinner cru** (`&lt;Loader2
   className="animate-spin"&gt;`) em vez de usar `Spinner.tsx`.
3. **13 telas reimplementam o "empty state tracejado"** à mão em vez de
   usar `EmptyState.tsx`/`ErrorState.tsx`.
4. Duas famílias de token teal coexistindo (`--color-brand-*` vs.
   `--color-accent*`) sem uma regra explícita de quando usar qual.
5. 1200+ usos históricos de `text-[10px]`/`text-[11px]` arbitrário —
   tokens `--text-3xs`/`--text-2xs` já existem mas quase não foram
   adotados (repetido em pelo menos 10 componentes só nesta auditoria).

Nenhum destes é bloqueante para a sessão de reestilização visual — mas o
Claude Design deve saber que reestilizar o componente compartilhado nem
sempre alcança 100% das telas que "deveriam" usá-lo.

---

Ver também: `../landing-brief/02-DESIGN-SYSTEM-TEAL.md` (fonte original da
paleta teal, mantida integralmente aqui).
