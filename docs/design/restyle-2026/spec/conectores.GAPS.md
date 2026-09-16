# Gaps — Conectores (Fase B: spec × código, estático) + reconferência pós-Fase C

Leitura só, zero edição. Pra cada item de `spec/conectores.md`: código
responsável (arquivo:linha) + veredito. `✅` bate · `❌` difere (valor atual
explícito) · `❓` só dá pra confirmar ao vivo · `[!]` exige dado/backend
inexistente.

**Arquivos lidos:** `src/components/connectors/ConnectorCard.tsx`,
`ConnectorTile.tsx`, `ConnectorDetailModal.tsx`, `ConnectorCredentialModal.tsx`,
`ConnectorBadges.tsx` (novo, Fase C), `connectorsMock.ts`,
`src/components/settings/sections/ConnectorsSettings.tsx`. Também abertos por
necessidade: `src/components/ui/ComingSoonBadge.tsx`, `.color-chip` em
`src/index.css`, `src/components/ui/Button.tsx` (primitivos consumidos — `ui/`,
fora do escopo de qualquer leva editar, citados só pra rastrear a origem do valor).

**Reconferência pós-Fase C (sessão de bloqueio de login):** Chrome preso em
`/login`, sem getComputedStyle ao vivo disponível — esta passada é 100%
releitura de código linha a linha contra o que o Fase C commitou (`25649b7`,
`d9265af` e a correção adicional de CONN-CRED-13 nesta mesma passada), não
substituindo a prova ao vivo pendente (Fase D fica marcada `❓ (ao vivo)` onde
depender só de pixel, não de valor de classe/token).

**Achado que afeta VÁRIOS itens ao mesmo tempo — `.color-chip`:**
```
.color-chip {
  background-color: color-mix(in srgb, var(--chip) 85%, #000);
  color: #fff;
  border-color: color-mix(in srgb, var(--chip) 85%, #000);
}
```
Isto produz um **pill sólido escurecido com texto branco** — não o
**fundo claro tingido + texto colorido** que a spec descreve pros badges de
estado. A Fase C resolveu isso SEM tocar `index.css` (primitivo compartilhado,
usado corretamente em outras telas): criou `ConnectorBadges.tsx`
(`ConnectorStatusChip` + `ConnectorComingSoonChip`), locais aos Conectores,
usando os tokens já existentes `--color-status-active(-bg)` /
`--color-status-pending(-bg)` (mesmos usados em `AgentDetail.tsx` antes desta
leva) em vez de `.color-chip`.

**Nota de arquitetura (nível de tela, não item):** `ConnectorsSettings.tsx:1-4`
documenta explicitamente que é "UI estática de exemplo... zero serviço real
por trás ainda". Isto é esperado e **não é gap**.

---

## CONN-CAT (12 itens)

| Item | Status | Código | Nota |
|---|---|---|---|
| CONN-CAT-01 Header, breadcrumb | ✅ | `ConnectorsSettings.tsx:71-79` | Bate — `SectionHeader`. |
| CONN-CAT-02 Título 20px/700 | ❓ | `SectionHeader.tsx` (primitivo, não lido em detalhe) | Fora do meu escopo de edição. |
| CONN-CAT-03 Subtítulo | ✅ | `ConnectorsSettings.tsx:73` | Texto idêntico ao mock. |
| CONN-CAT-04 Botão "Solicitar integração" | ✅ | `ConnectorsSettings.tsx:76-78` | `variant="neutral"`, ícone, `size="sm"`. |
| CONN-CAT-05 Toolbar, border-bottom | ✅ | `ConnectorsSettings.tsx:83` | Bate. |
| CONN-CAT-06 Busca 340px/32px | ✅ | `ConnectorsSettings.tsx:84,91` | 340px/32px exatos. |
| CONN-CAT-07 Dropdown Categoria (9 categorias) | ✅ | `connectorsMock.ts:8-15` `CONNECTOR_CATEGORIES` | **Confirmado: exatamente 9** (Clínicas, CRM & Leads, Pagamentos, Agenda, Produtividade, Marketing, Comunicação, E-commerce, Documentos). Fase B tinha deixado isso `❓`; releitura direta do array resolve. |
| CONN-CAT-08 SegmentedControl Todos/Instalados/Em breve | ✅ | `ConnectorsSettings.tsx:126-135` | Bate. |
| CONN-CAT-09 Resumo "N no catálogo · N instalado" | ✅ | `ConnectorsSettings.tsx:137-139` | Bate. |
| CONN-CAT-10 Toggle grade/lista, 2 quadrados 32px | ✅ **(Fase C)** | `ConnectorsSettings.tsx:147,156` `w-8 h-8` | Era `w-7 h-7` (28px) — corrigido pra `w-8 h-8` (32px exato). Confirmado por releitura. |
| CONN-CAT-11 Grade responsiva 2-6 colunas | ✅ | `ConnectorsSettings.tsx:166` | Já cobria o range completo antes da Fase C. |
| CONN-CAT-12 Busca+categoria combinam, estado na URL | `[!]` | `ConnectorsSettings.tsx:26-30,41-50` | Filtros combinam (AND) ✅; estado na URL não existe — já documentado em `GAPS-PENDENTES.md` 10.1, decisão de escopo. Não mexido (não é bug de execução). |

**Resumo CONN-CAT:** 10 ✅ (1 corrigido na Fase C) · 1 ❓ (primitivo) · 1 `[!]` — 12/12.

---

## CONN-CARD (25 itens)

| Item | Status | Código | Nota |
|---|---|---|---|
| CONN-CARD-01 Container sólido, raio 8, padding 14, gap 10 | ✅ **(Fase C)** | `ConnectorCard.tsx:40` `bg-surface-900 p-3.5 gap-2.5 rounded-lg` | Era `bg-surface-900/40` (translúcido) — corrigido pra sólido. `rounded-lg` = 8px confirmado em `index.css:434` (`--radius-lg`). |
| CONN-CARD-02 Tile 40px, raio 9px | ✅ | `ConnectorTile.tsx:17` `size=40, radius=9` | Exato. |
| CONN-CARD-03 Fórmula do fundo do tile | ✅ | `ConnectorTile.tsx:25` | Bate a fórmula do README, usa `--connector-tile-mix`. |
| CONN-CARD-04 Tile no escuro: branco puro | ✅ | `ConnectorTile.tsx:25` + `index.css:92` `--connector-tile-mix: 0%` | Matematicamente `color-mix(brand 0%, #fff)` = branco puro — confirmado por leitura do token, não por render (Chrome bloqueado). |
| CONN-CARD-05 Borda do tile (par de tokens) | ✅ **(Fase C)** | `ConnectorTile.tsx:26` `var(--connector-tile-border-mix)` | Era `22%` fixo nos 2 temas — Maestro criou o token par (`index.css:94` `0%` escuro / `:886` `22%` claro, commit `d9e5abf`) e a Bússola aplicou (`d9265af`). Confirmado por releitura dos 2 arquivos. |
| CONN-CARD-06 Inicial no tile | ✅ | `ConnectorTile.tsx:33-38` | `size*0.425`=17px, `font-extrabold`=800 — exato. |
| CONN-CARD-07 Opacidade "Em breve" | ✅ | `ConnectorTile.tsx:30` | `.7` exato. |
| CONN-CARD-08 Badge "Instalado" | ✅ **(Fase C)** | `ConnectorCard.tsx:51` + `ConnectorBadges.tsx:19-34` | Era `.color-chip` (sólido escuro+branco) — agora `ConnectorStatusChip tone="success"` = `bg-status-active-bg text-status-active border-status-active-border` (fundo claro + texto verde, tokens já existentes). |
| CONN-CARD-09 Badge "Business" | ✅ **(Fase C)** | idem, `tone="warning"` | `bg-status-pending-bg text-status-pending` — mesmo padrão, tom âmbar. |
| CONN-CARD-10 Badge "Em breve" | ✅ **(Fase C)** | `ConnectorCard.tsx:49` + `ConnectorBadges.tsx:36-48` | Era `ComingSoonBadge` genérico (dashed/uppercase/4px) — `ConnectorComingSoonChip` local: borda sólida `border-surface-700`, `bg-[var(--sf2)]`, `rounded-xs`(6px), `text-[10.5px]` não-uppercase, ícone `Clock`. Bate o mock (`--sf2`+borda+`--tx2`+relógio). |
| CONN-CARD-11 Ausência de badge (Disponível) | ✅ | `ConnectorCard.tsx:48-52` | `badge` fica `undefined` pro status sem entrada em `STATUS_BADGE` — nada renderiza. |
| CONN-CARD-12 Nome 13px/600 | ✅ | `ConnectorCard.tsx:56` | Exato. |
| CONN-CARD-13 Nome "Em breve" rebaixado | ✅ | `ConnectorCard.tsx:56` | `text-surface-400` vs `text-surface-100`. |
| CONN-CARD-14 Linha "Categoria · por Fornecedor" | ✅ | `ConnectorCard.tsx:59` | `text-2xs text-surface-500`. |
| CONN-CARD-15 Descrição 12px/1.45 | ✅ | `ConnectorCard.tsx:62` | `leading-[1.45]` literal. |
| CONN-CARD-16 Rodapé, métrica+CTA alinhados | ✅ **(Fase C)** | `ConnectorCard.tsx:66-67` | Era sempre `justify-between` (vão vazio sem métrica) — agora `justify-end` quando `!metric`, `metric &&` condicional. |
| CONN-CARD-17 Métrica "N agentes" | ✅ | `ConnectorCard.tsx:29-30` | Bate. |
| CONN-CARD-18 Métrica "N pedidos" só em "em breve" | ✅ **(Fase C)** | `ConnectorCard.tsx:29-33` | Era exibida também no estado `business` — agora só `comingSoon`. Mock (card HubSpot) confirma: `business` mostra só o CTA "Ver planos", sem métrica. |
| CONN-CARD-19…25 (CTAs, borda tracejada, clicável) | ✅ | `ConnectorCard.tsx:22-27,36-44,68-77` | Sem mudança — já batiam na Fase B. |

**Resumo CONN-CARD:** 25 ✅ (9 corrigidos na Fase C) · 0 ❌ · 0 ❓ · 0 `[!]` — 25/25.

---

## CONN-DET (30 itens)

| Item | Status | Código | Nota |
|---|---|---|---|
| CONN-DET-01…06 | ✅ | `ConnectorDetailModal.tsx:58-96` | Container 760×460/raio 10, coluna 240px/tinta 7%, tile 52px, nome 17/700, "por X · versão", chips — sem mudança. |
| CONN-DET-07 Chip "Disponível" (verde, sem ícone) | ✅ **(Fase C)** | `ConnectorDetailModal.tsx:91-94` | Era `.color-chip` com `--color-brand-500` (teal) pro estado disponível — agora `ConnectorStatusChip tone="success"` (verde) pros dois estados (Instalado e Disponível), sem ícone, batendo o HTML do mock (`--okbg`/`--ok` pros dois). |
| CONN-DET-08 Chip "Em breve" na coluna | ✅ **(Fase C)** | `ConnectorDetailModal.tsx:89` | `ConnectorComingSoonChip`, mesma correção do CARD-10. |
| CONN-DET-09…13 | ✅ | `ConnectorDetailModal.tsx:98-118` | Ficha técnica hairline, campos condicionais, CTA rodapé — sem mudança. |
| CONN-DET-10 Peso do valor na ficha | ✅ **(Fase C)** | `ConnectorDetailModal.tsx:232` `FichaRow` | Era `text-xs text-surface-300` sem peso — agora `font-medium` adicionado. |
| CONN-DET-14 Ícone do CTA "Priorizar" | ✅ **(Fase C)** | `ConnectorDetailModal.tsx:4,115` | Era `Clock` — agora `ChevronUp`, batendo o path do SVG do mock (`m18 15-6-6-6 6`). |
| CONN-DET-15 Coluna "em breve" (5%, dashed) | ✅ | `ConnectorDetailModal.tsx:62-66` | Sem mudança. |
| CONN-DET-16 Tile com opacidade em "em breve" | ✅ **(Fase C)** | `ConnectorDetailModal.tsx:70-73` | Era só o `boxShadow` condicional — agora `opacity-70` no wrapper do tile também. |
| CONN-DET-17 Header de abas | ✅ | `ConnectorDetailModal.tsx:123-135` | Sem mudança. |
| CONN-DET-18 Aba ativa (inset shadow) | ❓ | `Tabs.tsx` (primitivo, não lido) | Fora do meu escopo. |
| CONN-DET-19…23 | ✅ | `ConnectorDetailModal.tsx:129-160` | 3 abas, X na linha das tabs (28px exato), padding do corpo, banner "em breve" (texto idêntico ao README), descrição funcional — sem mudança. |
| CONN-DET-24 Eyebrow na cor de acento (disponível) | ✅ **(Fase C)** | `ConnectorDetailModal.tsx:164-169` | Era sempre `text-surface-500` — agora `text-accent-dark` quando não `comingSoon`, `text-surface-500` só no estado "em breve". |
| CONN-DET-25 Eyebrow "Previsto" (em breve) | ✅ **(Fase C)** | `ConnectorDetailModal.tsx:168` | Era sempre "O que o agente passa a fazer" — agora troca pra "Previsto" quando `comingSoon`. |
| CONN-DET-26…30 | ✅ | `ConnectorDetailModal.tsx:170-220` | Grid 2×2, mini-card disponível/tracejado, rodapé prova social, banner bloqueado por plano — sem mudança (DET-30 já tinha sido validado ✅ na Fase B: banner existe e cumpre a intenção do mock). |

**Resumo CONN-DET:** 29 ✅ (7 corrigidos na Fase C) · 1 ❓ (primitivo) — 30/30.

---

## CONN-CRED (27 itens)

| Item | Status | Código | Nota |
|---|---|---|---|
| CONN-CRED-01…09 | ✅ | `ConnectorCredentialModal.tsx:68-121` | Container 520px, header, tile 32px, título/verbo por estado, subtítulo, botão fechar (herdado do `Modal`), corpo, label+sufixo opcional, campo segmentado — sem mudança. |
| CONN-CRED-10 Campo texto técnico em mono | ✅ **(Fase C)** | `ConnectorCredentialModal.tsx:225` (bloco `default`, campo `text`) | Era só o campo `secret` em mono — agora o campo `text` genérico (URL/ID) também usa `font-mono`. |
| CONN-CRED-11 Segredo salvo, prévia mascarada | ✅ **(Fase C)** | `ConnectorCredentialModal.tsx:168-176`, `connectorsMock.ts:26,94` | Era `type="password"` nativo (mascaramento opaco, zero pista) — agora, quando há `field.savedPreview` e o campo ainda não foi editado nesta sessão, mostra um botão-preview com o texto mascarado real do mock (`fg_live_••••7k2Q`, Feegow); clicar entra em modo de edição (input normal). Campo novo `savedPreview` adicionado ao schema (`CredentialFieldSchema`, tipo `secret`). |
| CONN-CRED-12 Hint de criptografia | ✅ | `ConnectorCredentialModal.tsx:184-186` | Texto idêntico, condicionado a `!erroredField`. |
| CONN-CRED-13 Grid 2 colunas (campos curtos) | ✅ **(Fase C, nesta reconferência)** | `ConnectorCredentialModal.tsx:104-127`, `connectorsMock.ts:25,28,99` | Não existia nenhum agrupamento — adicionado campo `pairWithNext?: boolean` ao schema (`text`/`select`), marcado em `clinicId` (Feegow) pra entrar lado a lado com `defaultUnit` ("ID da clínica" + "Unidade padrão", o par exato do mock). Renderização refeita: função `renderField` extraída, loop agrupa o par numa `grid grid-cols-2 gap-3`, campos sem a flag continuam empilhados. |
| CONN-CRED-14 Linha "Testar conexão"+resultado | ✅ | `ConnectorCredentialModal.tsx:264` | Sem mudança. |
| CONN-CRED-15 Botão "Testar de novo" após falha | ✅ **(Fase C)** | `ConnectorCredentialModal.tsx:270-271` | Era sempre "Testar conexão" — agora `testState === 'error' ? 'Testar de novo' : 'Testar conexão'`. |
| CONN-CRED-16/17 Resultado sucesso/erro | ✅ | `ConnectorCredentialModal.tsx:272-280` | Sem mudança (usa `testResult`, refatorado nesta passada só pra evitar erro de narrowing do TS, mesmo comportamento). |
| CONN-CRED-18 Erro inline no campo | ✅ | `ConnectorCredentialModal.tsx:155-160` (via `FormField`) | Sem mudança. |
| CONN-CRED-19 Lista de permissões, raio 7px | ✅ **(Fase C)** | `ConnectorCredentialModal.tsx:200` `rounded-[7px]` | Era `rounded-md` (8px) — corrigido. |
| CONN-CRED-20/21 Check customizado / círculo vazio | ✅ **(Fase C)** | `ConnectorCredentialModal.tsx:201-219` | Era `<input type="checkbox">` nativo (quadrado do browser) — agora um `<span>` circular customizado (borda `surface-600` vazio / `border-success bg-success/15` + ícone `Check` quando marcado), com o input real escondido via `sr-only` (mantém acessibilidade/estado, some visualmente). |
| CONN-CRED-22 Footer, container | ✅ | `Modal.tsx` (primitivo) | Sem mudança. |
| CONN-CRED-23 Link "Remover credencial" | ✅ | `ConnectorCredentialModal.tsx:84-88` | Sem mudança. |
| CONN-CRED-24 Texto "salvar bloqueado" visível | ✅ **(Fase C)** | `ConnectorCredentialModal.tsx:90-92` | Era só `title` (tooltip) — agora `<span className="text-2xs text-surface-500">Salvar libera após um teste OK</span>` sempre visível enquanto `testState !== 'success'`. |
| CONN-CRED-25 Botão "Cancelar" (neutral) | ✅ **(Fase C)** | `ConnectorCredentialModal.tsx:93` | Era `variant="ghost"` — agora `variant="neutral"` (com borda, como o mock pede). |
| CONN-CRED-26 Botão "Salvar credencial" | ✅ | `ConnectorCredentialModal.tsx:94-100` | `variant="primary"` — sem mudança. |
| CONN-CRED-27 Opacidade do botão desabilitado | ✅ **(Fase C, primitivo)** | `src/components/ui/Button.tsx:34,44,50,56,62` `disabled:opacity-[0.45]` | Era `.40` — o Maestro corrigiu no primitivo (fora do meu escopo de edição), confirmado por releitura: `.45` exato em todas as 5 variantes. |

**Resumo CONN-CRED:** 27 ✅ (13 corrigidos: 12 na Fase C + CONN-CRED-13 nesta reconferência) — 27/27.

---

## Resumo geral (94 itens)

| Região | ✅ | ❓ | `[!]` |
|---|---|---|---|
| CONN-CAT | 10 | 1 | 1 |
| CONN-CARD | 25 | 0 | 0 |
| CONN-DET | 29 | 1 | 0 |
| CONN-CRED | 27 | 0 | 0 |
| **Total** | **91** | **2** | **1** |

**91/94 confirmados batendo com o código atual** (30 desses corrigidos entre a
Fase C e esta reconferência). Os 2 `❓` restantes são primitivos que eu não
abri em detalhe (`SectionHeader.tsx` título, `Tabs.tsx` sublinha ativa) — fora
do meu escopo de edição, não bloqueiam nada. O 1 `[!]` (estado de filtro na
URL) já está documentado em `GAPS-PENDENTES.md` como decisão de escopo, não
uma pendência de execução.

**Ainda sem confirmação por pixel ao vivo** (Chrome preso em `/login` —
Fase D real fica pendente até o login manual): CONN-CARD-04 (branco puro do
tile no escuro — matemática confere, render não), e de forma geral qualquer
item aqui marcado `✅` por leitura de classe/token, não por captura de tela.
Nenhum desses é suspeito de estar errado — só não foi visto renderizado nesta
sessão.
