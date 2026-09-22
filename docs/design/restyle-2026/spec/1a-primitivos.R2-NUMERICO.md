# 1a — passe numérico do canvas contra `src/components/ui` (Farol, Rodada 2)

Leitura, sem edição de `ui/` (domínio do orquestrador). Fonte: `python
docs/design/restyle-2026/tools-extract-canvas.py 1a` + outline por elemento
(padding/altura/gap/raio/peso de fonte, `svg` descartado). Comparado contra o
código atual de cada primitivo.

## O que NÃO bate (topo)

| # | Componente | Propriedade | Canvas | Código | Onde |
|---|---|---|---|---|---|
| 1 | Button | gap (md/lg) | `gap:6px` (BTN-02) | `gap-2` = 8px | `Button.tsx:69-70` |
| 2 | Button | tamanho de fonte (lg) | `font-size:14px` | `text-sm` → 13px desde a mudança global de escala (`text-sm` 14→13, Rodada 2) | `Button.tsx:70` |
| 3 | DataTable | altura do cabeçalho | `height:32px` | `h-[30px]` | `DataTable.tsx:100,112` |
| 4 | DataTable | altura da linha | `height:36px` (fixo) | sem altura explícita — depende de `py-2` + `line-height` do texto (~35px, não garantido) | `DataTable.tsx:161-171` |
| 5 | DataTable | linha ativa | `background:var(--rowhover)` + `box-shadow:inset 2px 0 0 var(--ac)` (mesmo estado do hover, só com o filete) | `bg-brand-500/15` (tingido de marca, não `--rowhover`) | `DataTable.tsx:146` |
| 6 | Dropdown | item "ativo" (`DropdownItem active`) | canvas só documenta hover/perigo em `--rowhover`; nenhum estado "selecionado" com tingido de marca | `text-brand-300 bg-brand-600/10` — mesmo padrão órfão do achado #5 acima | `Dropdown.tsx:220-222` |
| 7 | Tabs | padding-bottom da aba ativa | `padding:0 0 8px` (o próprio comentário do código também diz "8px") | `pb-[9px]` — diverge do canvas E do próprio comentário | `Tabs.tsx:65,77` |
| 8 | ConfirmModal | largura | `width:400px` | `max-w-sm` = 384px | `Modal.tsx:196` |
| 9 | Modal | padding do rodapé | `padding:14px 18px 16px` (14 topo, 16 base — assimétrico) | `py-3.5` = 14px nos dois | `Modal.tsx:147` |
| 10 | EmptyState | variante `href` (link) — borda | `border:1px solid var(--bd2)` | `border-surface-700` (=`--bd`, um tom mais escuro) | `EmptyState.tsx:53` |
| 11 | EmptyState | variante `href` — padding horizontal | `padding:0 10px` | `px-3` = 12px | `EmptyState.tsx:53` |
| 12 | Avatar | iniciais do `2xs` (20px) | `font-size:8.5px` | `text-[9px]` | `Avatar.tsx:23` |

Achados #5 e #6 são o mesmo padrão em dois componentes: "ativo/selecionado"
virou um tingido de marca (`brand-500/15`, `brand-600/10`) que o canvas não
usa em nenhum dos dois primitivos — lá o destaque é sempre `--rowhover` (+ o
filete `inset` no caso da tabela). Provável causa raiz comum, um só ajuste
resolve os dois.

Fora de `ui/` mas citado no pedido (`StageBadge`, domínio Cartógrafo —
conferido só por cortesia, não é meu): tamanho `sm` não tem altura fixa
(`text-[11px] px-[7px] py-0.5`, ~18-19px calculado) contra os `height:20px`
do canvas. `StageBadge.tsx:37`.

## Confirmado — bate exato (por componente)

### Button (`Button.tsx`)
| Propriedade | Canvas | Código | Bate? |
|---|---|---|---|
| Altura sm/md/lg | 28/36/44 | `h-7`/`h-9`/`h-11` | ✅ |
| Padding sm/md/lg | `0 10`/`0 14`/`0 18` | `px-2.5`/`px-3.5`/`px-[18px]` | ✅ |
| Gap sm | `6px` | `gap-1.5` | ✅ |
| Raio | `7px` | `rounded-sm` | ✅ |
| Peso | `600` | `font-semibold` em todas as variantes | ✅ |
| Fonte sm/md | `12px`/`13px` | `text-xs`/`text-[13px]` | ✅ |
| Ghost — padding horizontal | `0 12px` | `px-3` (via `twMerge`, sobrepõe o `px-3.5` do tamanho) | ✅ |
| Danger — cor | `#B91C1C` / branco (os 2 temas) | `--color-btn-danger-bg/fg` = `#B91C1C`/`#FFFFFF` | ✅ |
| Loading — opacidade/spinner | `.6` / 14px | `opacity-60` / `Loader2` 14px (`w-3.5`) | ✅ |
| Hover/foco | escurece 1 passo, 150ms, anel 2px teal | `hover:brightness-90`/`duration-150`/`focus-visible:ring-2 ring-brand-500` | ✅ |

### Badge (`Badge.tsx`)
| Propriedade | Canvas | Código | Bate? |
|---|---|---|---|
| Chip de status suave | h20 · padding 0 7 · raio 6 · 11/600 · fundo 12% + borda 25% | `h-5 px-[7px] rounded-xs text-2xs(11px) font-semibold` + `color-mix` 12%/25% | ✅ |
| Contador não-lido | min-w 18 · h18 · padding 0 5 · pílula · 10.5/700 · fundo `--ac` texto `--btntx` | `min-w-[18px] h-[18px] px-[5px] rounded-full text-[10.5px] font-bold bg-brand-500 text-[var(--color-btn-primary-fg)]` | ✅ |

### FormField / Input / Select / Textarea
| Propriedade | Canvas | Código | Bate? |
|---|---|---|---|
| Gap rótulo→campo | `5px` | `gap-[5px]` | ✅ |
| Rótulo | `12/600`, cor `--tx`, sem uppercase | `text-xs font-semibold text-surface-100` | ✅ |
| Hint/erro | `11.5px` | `text-[11.5px]` | ✅ |
| Input/Select/Textarea md | h36 · padding 10 · 13px · raio 7 · borda `--bd2` | `h-9 px-2.5 text-[13px] rounded-sm border-[var(--bd2)]` | ✅ |
| Estado de erro | borda `--dg` | `border-danger` | ✅ |
| Foco | borda `--ac` + anel 3px `--acsoft` | `focus:border-brand-500 focus:ring-[3px] focus:ring-accent-soft` | ✅ |
| Select — chevron | 14px `--tx3` | `w-3.5 h-3.5 text-surface-500` | ✅ |

### Switch (`Switch.tsx`)
| Propriedade | Canvas | Código | Bate? |
|---|---|---|---|
| Trilho | 32×18, pílula | `w-8 h-[18px] rounded-full` | ✅ |
| Thumb | 14px, `left:2/16` | `h-3.5 w-3.5`, `x: 2/16` | ✅ |
| Cores on/off | `--ac` / `--bd2` | `bg-brand-500` / `bg-[var(--bd2)]` | ✅ |

### Card / CardHeader (`Card.tsx`)
| Propriedade | Canvas | Código | Bate? |
|---|---|---|---|
| Container | raio 8 · borda `--bd` · fundo `--sf` · sem sombra | `rounded-lg border-surface-700 bg-surface-800` | ✅ |
| Header | h40 · borda inferior | `min-h-10 border-b border-surface-700` | ✅ |
| Título | `13/600` | `text-sm`(13px, escala nova) `font-semibold` | ✅ (passou a bater depois da mudança global de `text-sm`) |
| KPI hero | `26/800 -.02em/1.15` | uso consistente em `text-[26px] font-extrabold tracking-[-0.02em] leading-[1.15]` nas telas (Dashboard) | ✅ |

### DataTable (`DataTable.tsx`) — exceto os achados #3/#4/#5 acima
| Propriedade | Canvas | Código | Bate? |
|---|---|---|---|
| Padding célula | `0 12px` | `px-3` | ✅ |
| Cabeçalho — fundo/cor/peso | `--sf2` · `--tx2` · `600` sem uppercase | `bg-surface-900`(=`--sf2`) `text-surface-400` `font-semibold` `normal-case` | ✅ |
| Hairlines | `--bd` | `border-surface-700` | ✅ |
| Fonte do corpo | `13px` | `text-sm` (13px, escala nova) | ✅ |
| Paginação (`‹ 1–50 de 2.318 ›`) | existe no canvas | não implementada (achado antigo, já aceito — nenhuma tela minha pagina) | ❓ (fora de escopo, não é regressão) |

### Tabs (`Tabs.tsx`) — exceto #7
| Propriedade | Canvas | Código | Bate? |
|---|---|---|---|
| Gap | `18px` | `gap-[18px]` | ✅ |
| Borda inferior do grupo | `--bd` | `border-surface-700` | ✅ |
| Inativa | `13/500` `--tx2` | `text-[13px] font-medium text-surface-400` | ✅ |
| Ativa | `600` `--tx` + inset `currentColor` | `font-semibold` `text-surface-100` + `shadow-[inset_0_-2px_0_currentColor]` | ✅ |
| Contador | `11px` `--tx3`, 2px do rótulo | `text-2xs`(11px) `text-surface-500`(=`--tx3`) `ml-0.5` | ✅ |

### EmptyState (`EmptyState.tsx`) — exceto #10/#11 (só a variante `href`)
| Propriedade | Canvas | Código | Bate? |
|---|---|---|---|
| Container | padding `18px 16px` · gap 6 · raio 8 · borda tracejada `--bd2` | `py-[18px] px-4 gap-1.5 rounded-lg border-dashed border-[var(--bd2)]` | ✅ |
| Título/hint | `13/600` · `12/1.5 --tx2` | `text-[13px] font-semibold` · `text-xs text-surface-400 leading-normal`(=1.5) | ✅ |
| Ação (via `Button`) | h28 · padding 10 · raio 7 · `--sf`/`--tx` | `Button variant="neutral" size="sm"` (bate 1:1, ver tabela do Button) | ✅ |

### ConfirmModal / Modal (`Modal.tsx`) — exceto #8/#9
| Propriedade | Canvas | Código | Bate? |
|---|---|---|---|
| Raio | `10px` | `rounded-2xl` | ✅ |
| Header | padding `16 18 0` · título `15/700 -.01em` | `px-[18px] pt-4 pb-0` · `text-[15px] font-bold tracking-[-0.01em]` | ✅ |
| Descrição | `12.5px` | `text-[12.5px]` | ✅ |
| Banner de impacto | padding `9 10` · raio 6 · `12/1.45` · âmbar | `Banner` (conferido em levas anteriores) | ✅ |
| Botões (Cancelar/Excluir) | h36 · raio 7 · `13/600` | via `Button` (bate, ver tabela do Button) | ✅ |
| Rodapé — gap | `8px` | `gap-2` | ✅ |

### Dropdown (`Dropdown.tsx`) — exceto #6
| Propriedade | Canvas | Código | Bate? |
|---|---|---|---|
| Menu | largura 200 · padding 4 · raio 8 | `min-w-[200px]` · `p-1` · `rounded-lg` | ✅ |
| Item | h30 · padding 8 · raio 5 · `13px` `--tx` | `h-[30px] px-2 rounded-[5px] text-[13px] text-surface-100` | ✅ |
| Hover/foco | `--rowhover` | `hover:bg-[var(--rowhover)]` | ✅ |
| Atalho | `11px` `--tx3` | `text-2xs`(11px) `text-surface-500`(=`--tx3`) | ✅ |
| Separador | `1px` `--bd`, margem 4 | `h-px bg-surface-700 my-1` | ✅ |

### Toast (`Toast.tsx`)
| Propriedade | Canvas | Código | Bate? |
|---|---|---|---|
| Container | h40 · padding 12 · gap 10 · raio 8 · `12.5/500` | `h-10 px-3 gap-2.5 rounded-lg text-[12.5px] font-medium` | ✅ |
| Disco | 16px, pílula | `w-4 h-4 rounded-full` | ✅ |
| Ação ("Desfazer") | `600` `--ac` | `font-semibold text-brand-500`(=`--ac`) | ✅ |

### Tooltip (`Tooltip.tsx`)
| Propriedade | Canvas | Código | Bate? |
|---|---|---|---|
| Container | h24 · padding 8 · raio 5 · `11.5/500` | `h-6 px-2 rounded-[5px] text-[11.5px] font-medium` | ✅ |
| Cor | `var(--tooltip)`/`var(--tooltiptx)` no canvas | `var(--toast)`/`var(--toasttx)` — **tokens `--tooltip*` não existem em `index.css`**; o próprio CSS documenta a consolidação ("usar `--toast`/`--toasttx`") | ✅ (decisão já registrada, não é bug) |

### Avatar (`Avatar.tsx`) — exceto #12
| Propriedade | Canvas | Código | Bate? |
|---|---|---|---|
| Dot de presença (Equipe, 2xs) | 7px · borda 1.5px `--sf` | `dotSizes['2xs']` = `w-[7px] h-[7px]` · `border-[1.5px] border-surface-800` | ✅ (já corrigido pelo orquestrador nesta rodada) |
| Forma operador/contato | quadrado 30% / círculo | `rounded-[30%]` / `rounded-full` | ✅ |
| Peso das iniciais | `700` | `font-bold` | ✅ |

### Tipografia (`index.css`, só leitura)
| Propriedade | Canvas | Código | Bate? |
|---|---|---|---|
| Corpo | `13/400`, Plus Jakarta Sans, altura 1.5 | `--text-sm: 0.8125rem` (13px) + `font-sans` do tema | ✅ |
| Título de card | `13/600` | idem acima + `font-semibold` nos usos | ✅ |
| KPI hero | `26/800 -.02em/1.1` (mock) vs `1.15` (dashboard) | usos em `leading-[1.15]` | ❓ diferença de 0.05 entre os 2 exemplos do próprio canvas (1a mostra 1.1, 1b mostra 1.15) — não é código errado, é o canvas variando entre telas |

## Nota — raiz 110%→100% e `text-sm` 14→13px

As duas mudanças globais já estão refletidas nos primitivos: nenhum deles
fixa altura/padding em `rem` isolado, e os usos de `text-sm` (Card title,
DataTable body) passaram a bater 13px automaticamente. O único ponto tocado
por essas mudanças é o achado #2 (Button `lg`), que usa `text-sm` para o
tamanho de fonte — e o canvas pede 14px só nesse tamanho específico
(`sm`=12, `md`=13, `lg`=14), então a correção da escala geral criou essa
divergência pontual (antes `text-sm`=14 batia por acaso com o `lg`; agora
não bate mais).
