# Carta de Padrões — Oryon Frontend

> Checklist de bolso pra quem vai tocar uma tela nova (pessoa ou agente de IA). Leitura: ~10 min. Não substitui `design-system/ux-audit/PRINCIPIOS-DE-INTERFACE.md` (P1–P15 + glossário completo, 413 linhas) nem `GUIA-REFACTOR.md` (cor/tipografia/raio/sombra) — é o resumo acionável dos dois, com exemplos reais do código de hoje. Na dúvida, o arquivo de princípios é a fonte; este arquivo é o atalho.
>
> Regra geral: **toda exceção a um item abaixo leva uma linha no PR** dizendo qual item, por quê, e até quando.

---

## 1. Quando criar um overlay (modal / drawer / popover / toast)

A forma não é gosto — é o conteúdo que decide (P3.1):

| Use... | ...para | Nunca para |
|---|---|---|
| **Inline** (expande no lugar) | editar 1 campo, ≤3 linhas a mais, ≤3 filtros, acordeão | fluxo com passos |
| **Popover** (ancorado, sem scrim) | escolher 1 de ≤12, menu `⋯`, mini-form ≤2 campos | conteúdo com título+X, form com validação |
| **Modal** (centrado) | confirmação, form de **4–6 campos** de 1 registro, ver 1 item sem sair da lista | espaço de trabalho, lista longa, wizard |
| **Drawer** (lateral) | detalhe/edição de objeto da lista, form de **7–20 campos**, construtor ≤5 passos | drawer que abre drawer; escolher 1 item |
| **Takeover** (tela cheia, rota própria) | wizard >5 passos, editor | confirmação, escolha |
| **Toast** | feedback de 1 linha + "Desfazer" | erro que exige ação, pergunta |

Atalho de edição de item de lista: **≤3 campos → inline · 4–6 → modal · ≥7 ou com abas → drawer.**

O que já existe hoje pra usar, não reinventar:
- `src/components/ui/Modal.tsx` — `Modal` (genérico, `footer`/`fillHeight`) e `ConfirmModal` (`open`, `onConfirm`, `title`, `description`, `confirmLabel?`, `danger?`, `loading?` — ver §5 sobre a prop `impact` que falta).
- `src/components/ui/Drawer.tsx:14` — já tem `dismissible?: boolean` (evita fechar sem querer); ainda não tem `dirty` (P3.2/P7) — se sua tela precisa bloquear fechamento com trabalho em andamento, hoje isso é feito manualmente no componente, não pela primitiva.
- Mecânica de camada: `createPortal` já é usado em `Modal.tsx:66` e `Drawer.tsx:85`. O gerenciador único de z-index por ordem de montagem (`useLayer`, P3.2) ainda **não existe** — hoje cada overlay ainda pode ter z-index literal. Se você está criando um overlay novo, não invente um valor de `z-*`; se não existir uma forma limpa de empilhar, isso é sinal de que o overlay deveria ser um `Modal`/`Drawer` existente, não um `fixed inset-0` novo.

Verificação rápida: `grep -rlE "fixed inset-0" src --include=*.tsx | grep -v "components/ui/"` deveria estar caminhando para 0 (P3.2) — se seu PR adiciona uma ocorrência nova fora de `ui/`, provavelmente devia ter usado `Modal`/`Drawer`.

---

## 2. Antes de criar uma primitiva nova em `components/ui/`

Regra de adoção (S11 §5.0, citada em `PRINCIPIOS-DE-INTERFACE.md:411` e `design-system/ux-audit/BACKLOG.md:89`):

> Uma primitiva nova só entra se casa o visual de fato, tem os slots que as cópias já têm, empilha sem z-index manual, é controlável — **e migra ≥80% das cópias existentes no mesmo PR.**

Criar sem migrar é como a 22ª primitiva parada ficou parada. Se você não tem orçamento pra migrar 80% das cópias no mesmo PR, ou reduz o escopo (menos uma primitiva, mais uma função utilitária local) ou não é a hora de criar a primitiva ainda — documenta a necessidade e segue com o padrão manual existente.

Antes de escrever a primitiva, procure se já não existe uma parecida subutilizada — ver §7.

---

## 3. Nomenclatura — um conceito, um nome

**Regra (P15).** Um conceito tem um nome em todo o produto, e o nome diz o **resultado**, não o mecanismo interno. Termos técnicos (`UUID`, `WABA`, `RAG`, `handoff`, `tenant`, `system prompt`, `webhook`, `slug`) só aparecem em `/admin/*` ou atrás de "Detalhes técnicos" colapsado.

Alguns já fixados que valem a pena conhecer antes de escrever um label novo (tabela completa em `PRINCIPIOS-DE-INTERFACE.md:317-404`):
- Papel humano: **Atendente** (nunca "Agente" sozinho — isso é a IA). A IA é sempre **Agente IA**.
- Ciclo de vida do contato: **Situação**. Posição no funil: **Etapa**. Não confundir os dois (ver `StagesManager.tsx` vs `PipelineStagesManager.tsx` — são coisas diferentes, arquivos diferentes, propositalmente).
- Tirar a IA da conversa: **Passar para humano** (não "Roteamento", "Handoff", "Encaminhamento" nem "Implantação" — 5 nomes concorrentes hoje, 1 correto).
- Ação reversível: nome da ação = nome do estado resultante (Arquivar → **Arquivada**, não "Abandonada").

Verificação antes de escrever um label novo: `grep -rniE "\b(handoff|tenant|waba|rag|uuid|system prompt|webhook|slug)\b" src/components src/pages --include=*.tsx | grep -v "admin/"` — se o termo técnico que você ia usar aparece aqui fora de `admin/`, é sinal de que já existe a mesma dívida em outro lugar; não some mais um.

---

## 4. Onde uma configuração mora

**Regra (P13).** Esquema/estrutura (campos do contato, situações, funis e etapas, etiquetas, setores, base de conhecimento da empresa, taxonomia de setor) é editado **só** em Configurações. A tela de operação (board, lista, ficha) configura apenas a **própria visão** (colunas, filtros salvos, funil ativo) e no máximo linka "Configurar →" quando o papel permite escrever.

Exemplos reais de onde cada estrutura mora hoje:
- Contexto da empresa: `src/components/settings/sections/CompanyBrain.tsx` (Configurações → Contexto da IA) — é a fonte; `KnowledgePanel` do Copilot é leitura, não escrita.
- Estágios/etapas: `src/components/settings/sections/crm/PipelineStagesManager.tsx` e `src/components/settings/sections/crm/StagesManager.tsx` — ambos em `settings/sections/crm/`, não dentro da tela do board.

Antes de adicionar um botão "Editar X" numa tela de operação: pergunte se X é dado do REGISTRO (edita ali mesmo, ok) ou é ESTRUTURA que vale pra todos os registros (edita em Configurações, a tela de operação só usa/linka).

---

## 5. Confirmação de ações destrutivas ou em massa

**Regra (P7).** Toda ação destrutiva, em massa, ou com efeito no cliente (enviar mensagem/campanha, transferir, mudar papel, desconectar linha) passa pela mesma anatomia: **o que vai acontecer** (verbo + objeto) → **pra quem/quantos** (contagem real do servidor, nunca estimativa) → **é reversível?** → **ação rotulada com o número** ("Excluir 3 contatos", não "Confirmar").

`ConfirmModal` (`src/components/ui/Modal.tsx:138-147`) hoje tem `title`, `description`, `confirmLabel`, `danger`, `loading` — mas **ainda não tem uma prop `impact`** estruturada (lista de itens afetados, contagem do servidor) — cada call-site hoje monta essa informação manualmente dentro de `description`. Isso está **em construção em paralelo**: PR #100 (`feat/confirm-modal-impact`). Não espere por ela pra usar `ConfirmModal` — use o que existe hoje e migre quando o PR mesclar.

O que nunca confirma, mas também nunca é silencioso: uma ação **reversível de 1 clique** (mover etapa, arquivar, assumir a IA) executa direto e mostra toast com "Desfazer" por 8s — não abre `ConfirmModal` pra isso, isso seria fricção sem necessidade.

`window.confirm`/`alert`/`prompt` são proibidos (P6) — sempre `ConfirmModal`, mesmo pra um caso "rápido". Ver o lote de `TeamChatPage.tsx` corrigido no PR #89 como exemplo do antes/depois.

---

## 6. Densidade visual

**Regra (P8).** Existem 3 densidades — compacto / padrão / confortável — declaradas **por região do layout**, nunca por componente isolado, via `--control-h`, `--row-h`, `--gap-y`, `--pad`, `--fs`, `--icon` (tokens completos em `PRINCIPIOS-DE-INTERFACE.md:170-179`).

Onde cada uma se aplica hoje:
- **Compacto**: tabela/lista desktop (contatos, agentes, campanhas), lista de conversas.
- **Padrão**: formulário (modal, drawer, Configurações), cabeçalhos, barras de ação, dashboard.
- **Confortável**: **todo mobile** (<768px), sem exceção, pra qualquer coisa interativa — alvo mínimo 44px.

Regra prática: se você está estilizando uma tela nova, pergunte "essa região é tabela/lista densa, formulário, ou vai rodar no mobile?" antes de copiar padding/altura de outra tela — não existe um valor "padrão da casa" único.

---

## 7. Reuso antes de inventar

Antes de escrever um componente, hook ou padrão visual novo, procure se já não existe — exemplos reais de peças já extraídas que evitam duplicação:

| Precisa de... | Já existe em | Nota |
|---|---|---|
| Seção de formulário em Configurações (título + descrição + campos, 2 colunas, sem card) | `src/components/settings/SettingsSection.tsx:69` | Consumido por `CompanyBrain.tsx:438` e outras seções — não crie outro wrapper de "card de settings". |
| Cor categórica (não-status) pra um chip/badge | `--color-accent-blue/green/violet/amber/rose/cyan` em `src/index.css:182-187` | Ver `src/components/agents/HandoffRuleBuilder.tsx:154-159` (`ACTION_CHIP`) pro padrão de uso: `var(--color-accent-X)` + `color-mix()` pro tint, nunca hex cru. |
| Drag-and-drop pra reordenar uma lista | `src/hooks/useDragReorder.ts:14` | Já compartilhado por 4 consumidores (`StagesManager.tsx`, `PipelineStagesManager.tsx`, `PipelineCloseReasonsManager.tsx`, `CreatePipelineModal.tsx`) — existe exatamente pra não reimplementar drag-handle + highlight + reorder-on-drop a cada tela nova. |
| Abas dentro de uma tela | `Tabs` — extraído de `AgentDetail.tsx` no PR #86 (**em revisão**, ainda não mesclado no momento em que este documento foi escrito) | Confirme se o PR já mesclou antes de reimplementar abas do zero; se ainda não, pelo menos avise no seu PR que está ciente da duplicação temporária. |

Se depois de procurar você não achou nada parecido, tudo bem criar — mas documente no PR que procurou (mesmo que a busca tenha sido só um `grep` rápido pelo nome do padrão).

---

## 8. Checklist antes de commitar

- [ ] O overlay que criei/usei é a forma certa pro conteúdo (§1)? Não é um `fixed inset-0` novo fora de `ui/`?
- [ ] Se criei uma primitiva nova em `ui/`, migrei ≥80% das cópias existentes no mesmo PR (§2)? Se não, isso devia ser uma primitiva agora?
- [ ] Os labels novos batem com o glossário (§3)? `grep` por termo técnico vazando pra fora de `admin/`?
- [ ] Se toquei em algo que parece "configuração de estrutura", isso mora em Configurações, não na tela de operação (§4)?
- [ ] Ação destrutiva/em massa passa por `ConfirmModal` com contagem real, nunca `window.confirm`/`alert` (§5)?
- [ ] Densidade da região bate com o resto do produto — compacto pra lista, padrão pra formulário, confortável pra mobile (§6)?
- [ ] Procurei uma peça existente antes de escrever a minha (§7)?
- [ ] Todo botão só-ícone tem `aria-label` descrevendo a ação (não o nome do ícone) — mesmo se já tiver `title` (P5; ver PRs #97/#99 pro padrão)?
- [ ] `npm run typecheck` limpo; suite relevante rodando (`npx jest --clearCache` depois de qualquer troca de branch/worktree, daí `npx vitest run`)?
- [ ] Toda exceção a um item acima tem uma linha no PR dizendo qual item, por quê, e até quando?

---

*Fonte primária: `design-system/ux-audit/PRINCIPIOS-DE-INTERFACE.md` (P1–P15, 2026-08-30, sessão S12). Este documento é uma síntese derivada, não substitui a leitura completa pra quem for decidir uma exceção a um princípio.*
