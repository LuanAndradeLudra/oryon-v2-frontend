# Spec visual — 2e Configurações/Vocabulário

Extração Fase A (método em `AUDITORIA-NOTURNA.md`) — só referência, zero código.
Tela fora da leva do Cartógrafo (é da Bússola), extraída de propósito por quem
não a implementou, para não puxar a leitura pro que já existe.

**Fontes tentadas, em ordem de autoridade:**
1. `Oryon-Reestilizacao-canvas.html` — **inviável**: o arquivo é um documento
   HTML inteiro serializado como STRING JSON numa única linha (`\n`/`\"`
   escapados dentro de um blob de ~440KB) — não é HTML navegável por grep de
   texto simples, e desescapar/buscar dentro da string não valeria o esforço
   frente às outras duas fontes, que já são muito precisas para esta tela em
   particular. Nenhum item abaixo vem desta fonte.
2. `telas/01-2e-configuracoes-vocabulario.png` (claro) e
   `telas/02-2e-configuracoes-vocabulario.png` (escuro) — composição, estados
   visíveis (erro no campo "Negativo · funil de tarefas"), cores por tema.
3. `README.md` § 3.9 (linhas 429-448) — **excepcionalmente rica em valores
   exatos** (px, grid, raio, peso) para esta tela específica; tratada como
   fonte primária de valor numérico sempre que o texto os declara, com o PNG
   como confirmação visual e fonte do que o texto não cobre (cores exatas,
   estado de erro, ícones).

Prefixo dos itens: `SETT-`. Regiões: SHELL (barra superior, comum ao app),
NAV (sidebar secundária de configurações), HEADER (breadcrumb + título da
página), SECTION (bloco `SettingsSection`), FIELD (campos dentro de uma
seção), PREVIEW (bloco de prévia do vocabulário), TABLE (tabela de
referência "Onde isso aparece"), OUTLINE (índice "Nesta página" à direita).

## SHELL (barra superior — contexto da página, não exclusivo desta tela)

1. **SETT-SHELL-01** — Barra superior mostra, à esquerda: "Configurações"
   (peso maior/destacado) seguido de "Workspace Acme · 4 usuários · plano
   Pro" em texto secundário, separados por `·`. Fonte: PNG.
2. **SETT-SHELL-02** — À direita da barra superior: campo de busca com atalho
   de teclado indicado (ícone `/`), ícone de notificações (sino), avatar do
   usuário (iniciais "RC" num círculo). Fonte: PNG.
3. **SETT-SHELL-03** — Fundo da barra superior: claro = branco; escuro =
   superfície escura, indistinguível do fundo da página logo abaixo (sem
   sombra separando as duas). Fonte: PNG.

## NAV (sidebar secundária de configurações, 248px)

4. **SETT-NAV-01** — Largura fixa: **248px**. Fonte: README l.433.
5. **SETT-NAV-02** — Estrutura de 3 níveis, **100% tipográfica** — sem ícones
   por item e sem pílulas/badges decorativos. Fonte: README l.433.
6. **SETT-NAV-03** — Campo de busca "Buscar configuração...", topo da
   sidebar, altura **28px**. Fonte: README l.434.
7. **SETT-NAV-04** — Campo de busca: ícone de lupa à esquerda, placeholder em
   texto terciário/apagado, fundo levemente distinto do fundo da sidebar
   (claro: cinza muito claro; escuro: um tom acima do fundo). Fonte: PNG
   (estimado para as cores exatas).
8. **SETT-NAV-05** — Nível 1 — **eyebrow de domínio**: texto tamanho **10px**,
   peso **700**, letter-spacing **`.14em`**, cor terciária, maiúsculo (ex.:
   "WORKSPACE", "CRM", "AUTOMAÇÃO", "CONTA"). Fonte: README l.434.
9. **SETT-NAV-06** — Nível 2 — **cluster**: altura **28px**, texto **12.5px**,
   peso normal, cor secundária (ex.: nenhum cluster nomeado visível — os
   eyebrows de domínio já cumprem esse papel nesta tela; grupos visíveis:
   Workspace, CRM, Automação, Conta). Fonte: README l.434 + PNG.
10. **SETT-NAV-07** — Nível 3 — **item**: altura **26px**, `padding-left:
    22px`, texto ~12.5-13px, cor secundária quando inativo. Fonte: README
    l.435.
11. **SETT-NAV-08** — Item **ativo** ("Vocabulário" no exemplo): peso **600**,
    `inset 2px 0 0` de acento (barra vertical à esquerda, cor de marca/teal),
    fundo `--rowhover` (tingimento sutil), `border-radius: 0 6px 6px 0`
    (raio só do lado direito, já que a borda esquerda é reta por causa do
    acento). Fonte: README l.436.
12. **SETT-NAV-09** — Itens do grupo "CRM" na ordem do mockup: Etapas e
    funis, Etiquetas e cores, Campos personalizados, **Vocabulário**
    (ativo), Horário de atendimento. Fonte: PNG.
13. **SETT-NAV-10** — Grupos visíveis, em ordem: WORKSPACE (Geral, Números
    WhatsApp, Departamentos e time), CRM (5 itens, ver acima), AUTOMAÇÃO
    (Agentes IA, Regras de handoff, Respostas rápidas), CONTA (Notificações,
    Faturamento, Segurança e acesso, Integrações e API). Fonte: PNG.
14. **SETT-NAV-11** — Hairline separando o fim de um grupo do eyebrow do
    próximo (não é gap grande, é uma linha fina). Fonte: PNG.
15. **SETT-NAV-12** — Fundo da sidebar: claro = branco (mesmo tom da página,
    sem card); escuro = mesmo fundo da página. Sem borda externa em nenhum
    tema — a separação da coluna de leitura é só o espaço em branco. Fonte:
    PNG.

## HEADER (breadcrumb + título da página de configuração)

16. **SETT-HEADER-01** — Breadcrumb acima do título: "Workspace / CRM /
    Vocabulário", tamanho **12px**, cor terciária. Fonte: README l.438.
17. **SETT-HEADER-02** — À direita do breadcrumb, na mesma linha: indicador
    "✓ Salvo" — check verde + texto em cor de sucesso, tamanho pequeno
    (~12px). Fonte: README l.438 + PNG.
18. **SETT-HEADER-03** — Título da página "Vocabulário": tamanho **20px**,
    peso **700**. Fonte: README l.438.
19. **SETT-HEADER-04** — Subtítulo abaixo do título: "Como o Oryon chama as
    coisas na sua operação. Os termos abaixo substituem os padrões em menus,
    tabelas, botões e mensagens do sistema — em todo o workspace.", tamanho
    **13px**, `line-height: 1.55`, cor secundária. Fonte: README l.438.
20. **SETT-HEADER-05** — Coluna de leitura (header + seções): largura máxima
    **896px** (`max-w-4xl`). Fonte: README l.437.
21. **SETT-HEADER-06** — Padding da coluna de leitura: **26px 40px 32px**
    (topo/laterais/base). Fonte: README l.437.

## SECTION (`SettingsSection` — bloco recorrente de cada grupo de campos)

22. **SETT-SECTION-01** — Grid de 2 colunas: **`260px | 1fr`**. Fonte: README
    l.439.
23. **SETT-SECTION-02** — Gap entre as duas colunas: **24px**. Fonte: README
    l.439.
24. **SETT-SECTION-03** — Padding vertical do bloco: **22px** (topo e base).
    Fonte: README l.439.
25. **SETT-SECTION-04** — Separação entre seções consecutivas: **hairline**
    (borda de 1px), não gap nem sombra. Fonte: README l.439.
26. **SETT-SECTION-05** — Coluna esquerda do grid: título **13px/600**.
    Fonte: README l.440.
27. **SETT-SECTION-06** — Coluna esquerda do grid: descrição abaixo do
    título, **12px**, `line-height: 1.5`, cor secundária. Fonte: README
    l.440.
28. **SETT-SECTION-07** — Coluna direita do grid: os campos propriamente
    ditos (ver região FIELD). Fonte: README l.440.
29. **SETT-SECTION-08** — **Nenhuma seção tem container próprio** (sem
    `rounded-2xl border bg-surface-900` nem qualquer variante de "card") —
    gramática deliberada da tela inteira ("zero cards dentro da página").
    Fonte: README l.431.
30. **SETT-SECTION-09** — Seções visíveis nesta tela, em ordem: "Registros do
    funil" (singular/plural), "Gênero gramatical", "Fechamento"
    (positivo/negativo por tipo de funil), "Pessoas" (quem escreve/quem
    atende), "Onde isso aparece" (tabela de referência, não editável).
    Fonte: PNG.

## FIELD (campos dentro de uma seção)

31. **SETT-FIELD-01** — Par de campos lado a lado "Singular"/"Plural": cada
    um com label acima (12px, cor secundária) e input de texto abaixo.
    Fonte: PNG.
32. **SETT-FIELD-02** — Descrição auxiliar abaixo do rótulo da seção
    "Registros do funil": "Singular e plural. Usados em 'Novo negócio', '3
    negócios', na coluna do Kanban e nas notificações.", tamanho pequeno, cor
    terciária. Fonte: PNG.
33. **SETT-FIELD-03** — Input de texto: borda 1px, raio pequeno (~6-7px,
    consistente com o resto do vocabulário de inputs do app), fundo levemente
    distinto do fundo da página. Fonte: PNG (estimado — sem px exato aqui).
34. **SETT-FIELD-04** — Campo "Gênero gramatical" usa **SegmentedControl**
    (não texto livre) com 2 opções: "Masculino" / "Feminino". Fonte: PNG.
35. **SETT-FIELD-05** — Legenda inline ao lado do rótulo "Gênero gramatical":
    "· para 'novo/nova', 'ganho/ganha'", tamanho pequeno, cor terciária,
    mesma linha do rótulo. Fonte: PNG.
36. **SETT-FIELD-06** — Bloco "Fechamento": 2 pares de campos empilhados —
    "Positivo · funil de vendas" / "Negativo" (linha 1), "Positivo · funil de
    tarefas" / "Negativo" (linha 2) — cada par com o qualificador do tipo de
    funil como legenda inline ao lado do rótulo "Positivo". Fonte: PNG.
37. **SETT-FIELD-07** — Descrição da seção "Fechamento": "Nome das etapas
    terminais. Funis do tipo 'tarefa' usam o segundo par automaticamente.",
    cor terciária. Fonte: PNG + README l.447 (regra de negócio:
    `pipelineKindOf` decide Ganho/Perdido vs. Concluído/Cancelado). Fonte:
    README l.447.
38. **SETT-FIELD-08** — **Estado de erro**: o campo "Negativo · funil de
    tarefas" aparece com borda **vermelha** (2px aprox.) e, abaixo dele, um
    texto de erro também vermelho com ícone de alerta circular: "Obrigatório
    — usado no modal de motivo.". Fonte: PNG + README l.447 ("campo
    obrigatório em erro").
39. **SETT-FIELD-09** — Texto de erro: tamanho pequeno (~11px), cor de
    perigo/vermelho, ícone de alerta (`!` num círculo) à esquerda do texto.
    Fonte: PNG.
40. **SETT-FIELD-10** — Bloco "Pessoas": par de campos "Quem escreve" /
    "Quem atende", ambos como **select/dropdown** (não texto livre) — valor
    mostrado: "Contato" e "Atendente", com seta de dropdown à direita.
    Fonte: PNG.
41. **SETT-FIELD-11** — Descrição da seção "Pessoas": "Como chamar quem
    escreve e quem atende.", cor terciária. Fonte: PNG.
42. **SETT-FIELD-12** — Texto auxiliar abaixo do campo "Quem escreve":
    "Opções: Contato · Cliente · Paciente · Lead · Personalizado", tamanho
    pequeno, cor terciária. Fonte: PNG.
43. **SETT-FIELD-13** — Labels dos campos (ex. "Singular", "Plural", "Quem
    escreve"): tamanho ~12px, cor secundária, peso normal (não bold — o peso
    forte fica reservado ao título 13px/600 da seção). Fonte: PNG
    (estimado).

## PREVIEW (bloco de prévia do vocabulário)

44. **SETT-PREVIEW-01** — Fundo: token **`--sf2`** (o mesmo "fundo de
    rail/nav secundário" usado em várias telas do reestilo). Fonte: README
    l.441.
45. **SETT-PREVIEW-02** — Borda: 1px, cor de ênfase/hairline. Fonte: README
    l.441.
46. **SETT-PREVIEW-03** — Raio: **6px**. Fonte: README l.441.
47. **SETT-PREVIEW-04** — Padding: **12px**. Fonte: README l.441.
48. **SETT-PREVIEW-05** — Conteúdo: rótulo "Prévia" seguido de exemplos entre
    aspas, com os termos configurados em destaque (negrito/cor de marca) —
    "Novo negócio" · "3 negócios em Proposta" · "Negócio ganho". Fonte: PNG.
49. **SETT-PREVIEW-06** — Prévia atualiza em tempo real com o valor digitado
    nos campos acima (mostra "Negócio"/"Negócios" — os valores já
    preenchidos no formulário). Fonte: PNG (comportamento inferido da
    composição, não confirmável só pela imagem estática).

## TABLE (tabela de referência "Onde isso aparece")

50. **SETT-TABLE-01** — Grid de 2 colunas: **`160px | 1fr`**. Fonte: README
    l.442.
51. **SETT-TABLE-02** — Padding vertical de cada linha: **7px**. Fonte:
    README l.442.
52. **SETT-TABLE-03** — Separação entre linhas: **hairline**. Fonte: README
    l.442.
53. **SETT-TABLE-04** — Descrição da seção: "Referência, não editável." —
    indica visualmente (só pelo texto, sem estilo de campo desabilitado
    aparente) que a tabela é somente leitura. Fonte: PNG.
54. **SETT-TABLE-05** — Coluna esquerda: nome do local (ex. "Menu lateral",
    "Ficha do contato"); coluna direita: como o termo aparece lá, com o
    termo entre aspas e em destaque (ex. `Funis → coluna "Negócios"`, `Aba
    "Negócios" · botão "Novo negócio"`). Fonte: PNG.
55. **SETT-TABLE-06** — Texto da coluna direita mistura cor secundária
    (texto fixo, ex. "Funis →") com cor primária/negrito nos termos entre
    aspas (o valor configurável). Fonte: PNG (estimado).

## OUTLINE (índice "Nesta página", 180px, coluna direita)

56. **SETT-OUTLINE-01** — Largura: **180px**. Fonte: README l.443.
57. **SETT-OUTLINE-02** — Eyebrow no topo: "NESTA PÁGINA", maiúsculo, cor
    terciária, tamanho pequeno (consistente com o padrão de eyebrow ~10px
    já visto na NAV). Fonte: README l.443 + PNG.
58. **SETT-OUTLINE-03** — Itens da lista: tamanho **12px**. Fonte: README
    l.443.
59. **SETT-OUTLINE-04** — Item **ativo**: peso **600**, `inset 2px 0 0` de
    acento (mesma linguagem visual do item ativo da NAV, região SETT-NAV-08),
    `padding-left: 10px`. Fonte: README l.444.
60. **SETT-OUTLINE-05** — Itens da lista (rolagem/scroll-spy pela seção
    visível): "Registros do funil" (ativo no exemplo), "Fechamento",
    "Pessoas", "Onde isso aparece" — espelham os títulos das seções
    `SettingsSection` da coluna central. Fonte: PNG.
61. **SETT-OUTLINE-06** — Sem borda nem fundo distinto no bloco do índice —
    ele "flutua" no fundo da página, só o texto e o acento do item ativo o
    diferenciam. Fonte: PNG.

## Diferenças claro × escuro (observadas nos 2 PNGs, aplicam-se a vários itens acima)

62. **SETT-THEME-01** — Fundo geral: claro ≈ branco/quase-branco; escuro ≈
    superfície escura padrão do restyle (mesmo tom usado nas outras telas
    já auditadas). Sem diferença estrutural — só troca de token. Fonte: PNG.
63. **SETT-THEME-02** — Hairlines (entre seções, entre linhas da tabela,
    entre grupos da NAV): claro = cinza muito claro quase imperceptível;
    escuro = cinza escuro, também sutil. Mantêm o mesmo PAPEL nos dois temas
    (nunca viram borda de card). Fonte: PNG.
64. **SETT-THEME-03** — Cor de acento (item ativo, NAV e OUTLINE): mesma cor
    de marca (teal) nos dois temas — não muda de matiz, só o fundo
    `--rowhover` ao redor é que é mais sutil no escuro e mais visível no
    claro (ou vice-versa; a diferença exata de opacidade não dá pra
    calibrar só pela imagem). Fonte: PNG (estimado).
65. **SETT-THEME-04** — Campo em erro (SETT-FIELD-08): vermelho mantém o
    mesmo tom perceptual nos dois temas (não é o mesmo hex — cada tema tem
    seu próprio tom de "perigo" já estabelecido no restyle, mas a
    COMPOSIÇÃO — borda + texto + ícone, todos vermelhos — é idêntica).
    Fonte: PNG.

**Total: 65 itens.**
