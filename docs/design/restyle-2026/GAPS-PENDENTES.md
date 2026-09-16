# Gaps pendentes — Levas 3, 4, 5 (Contatos, Conversas, Funis)

Itens do mockup (`Oryon-Reestilizacao-canvas.html` / `telas/*.png` / README seções 3.2–3.4)
que **não foram implementados** nas levas 3–5, porque descrevem funcionalidade, dado ou
decisão de produto sem lastro no código atual — não são bugs de execução, são perguntas
para o usuário/PO responder antes de alguém poder implementá-los de verdade. Nenhum foi
"resolvido" inventando dado falso ou comportamento não confirmado.

Cada seção: o que o mockup mostra, por que não dá pra construir hoje, e o que precisaria
ser decidido/existir para desbloquear.

## 1. Contatos/CRM (leva 3, README 3.2)

### 1.1 Coluna "Responsável" + SegmentedControl "Todos/Meus"

O mockup mostra uma coluna "Responsável" na tabela e um filtro rápido "Todos/Meus" acima
dela. O tipo `Contact` não tem nenhum campo de dono/atribuição (`ownerId`/`assignedTo`) —
esse conceito só existe hoje para **conversas** (`Conversation.assignedUser`), não para
contatos. Sem esse campo, a coluna ficaria sempre vazia e o filtro "Meus" não teria o que
filtrar.

**Para desbloquear:** decidir se "responsável pelo contato" é um conceito novo de produto
(campo no backend, regras de quem pode atribuir/reatribuir) ou se a intenção era reusar o
responsável da conversa mais recente do contato (o que traria ambiguidade em contatos com
múltiplas conversas/atendentes ao longo do tempo).

### 1.2 Rodapé de paginação → rodapé de seleção

O mockup substitui o rodapé de paginação por um rodapé de seleção (`N selecionado ·
Atribuir · Etiquetar · Exportar`) quando há itens marcados. A tela real não usa paginação —
usa scroll infinito (`hasMore`/`loadMore`) — e a seleção já tem sua própria UI (`BulkActionBar`,
barra flutuante). Trocar a arquitetura de interação (infinito → paginado) só para caber o
rodapé do mockup quebraria um padrão de UX já testado e usado em outras listas do produto.

**Para desbloquear:** decisão de produto — vale trocar scroll infinito por paginação em
Contatos? Se não, o rodapé de seleção do mockup não se aplica; a `BulkActionBar` flutuante
já cobre a mesma necessidade.

### 1.3 Drawer com estado em `?contact=&tab=`

As notas de implementação do mockup (`telas/01-1c-modal-configurar-colunas.png`) pedem
explicitamente que o drawer do contato tenha seu estado (aberto/fechado + aba ativa)
refletido na URL (`?contact=&tab=`), para permitir voltar/compartilhar/atualizar a página
sem perder o contexto. Hoje `ContactsPage` só LÊ `?contact=` uma vez no mount (pra abrir o
drawer vindo de um link) e nunca escreve `?tab=` — trocar de aba ou abrir/fechar o drawer
pela UI não atualiza a URL.

**Para desbloquear:** não é falta de dado, é escopo — implementar exige sincronizar
`useSearchParams` nos dois sentidos (URL → estado E estado → URL) com cuidado para não
conflitar com `useListScrollMemory` e com a navegação do botão "Voltar" do browser. Dá pra
fazer sem decisão de produto nenhuma; ficou de fora desta leva por ser mudança de
comportamento (não só visual) e por risco de regressão em fluxos de navegação já testados.

## 2. Conversas/Inbox (leva 4, README 3.3)

### 2.1 SegmentedControl "Minhas/Fila/Todas" como eixo primário da lista

O mockup organiza a lista de conversas por um SegmentedControl de atendimento
(Minhas/Fila/Todas). A lista real usa abas de **status** (Todas/Abertas/Pendentes/
Resolvidas) como eixo primário — madura, testada, com badges de contagem por status.
Atendimento/atribuição já existe como filtro, só que **secundário**, dentro do menu
"Filtros rápidos" (`QuickFiltersMenu`).

**Para desbloquear:** decisão de produto — trocar o eixo de organização primário da lista
(status → atendimento) é uma mudança de arquitetura de informação, não um reestilo. Precisa
de validação de que operadores preferem navegar por "de quem é" antes de "em que estado
está".

### 2.2 "Evento de sistema (handoff)" como linha inline no histórico de mensagens

O mockup mostra uma linha de evento de sistema no meio da conversa (hairlines dos dois
lados, texto âmbar) marcando quando o handoff IA↔humano acontece. Não existe tipo de
mensagem "system" no modelo de dados (`Message.type` não tem essa variante) — hoje o
handoff é sinalizado só no cabeçalho (`HandoffChip`) e por uma listra de 2px
(`HandoffStripe`), não como um evento no fluxo de mensagens.

**Para desbloquear:** o backend precisaria emitir/persistir um evento de handoff na
timeline da conversa (quem pausou/reativou a IA e quando) para o frontend ter o que
renderizar como uma mensagem de sistema.

### 2.3 "Resumo da IA" com `ComingSoonBadge` "beta" no ContactPanel

O mockup prevê uma seção "Resumo da IA" com selo "beta" no painel de contato do inbox. Já
existe uma feature real e completa ocupando esse espaço conceitual —
`ConversionAnalysisPanel` ("Análise de Conversão IA"), com análise, confiança, sinais e
ações de confirmar/rejeitar. Adicionar um card decorativo "em breve" ao lado seria confuso
(duas seções de "resumo de IA" na mesma tela, uma funcional e outra vazia).

**Para desbloquear:** não é bem um gap — provavelmente o mockup foi desenhado achando que
essa feature ainda não existia. Vale confirmar com quem fez o mockup se "Resumo da IA" era
outra coisa (ex.: um resumo textual da conversa, distinto da análise de conversão) antes de
descartar de vez.

## 3. Funis/Negócios (leva 5, README 3.4)

### 3.1 SegmentedControl "Kanban/Lista/Previsão" na board bar

O mockup mostra 3 modos de visualização do funil. Hoje só existe o Kanban — a página do
funil tem abas "Board/Relatórios", que é outra divisão (visualização × analytics, não 3
modos da mesma lista). Construir uma visão em lista e uma visão de previsão (forecast) do
zero é feature nova, não reestilo de uma tela existente.

**Para desbloquear:** escopo de produto — o que "Lista" e "Previsão" mostrariam de
diferente do board e dos Relatórios já existentes? Sem essa definição não dá para nem
estimar o tamanho do trabalho.

### 3.2 Chips de etiqueta de 16px no card de negócio

O mockup mostra chips de etiqueta no card do board (`telas/01-1e-funis-kanban-modal.png`,
ex. "VIP"/"Indicação" no card "Plano Pro anual"). Reexaminando a imagem, são provavelmente
etiquetas do CONTATO do negócio (não um conceito novo de "etiqueta de negócio") — mas
mesmo assim é um gap de dado: `Deal.contact` no board é uma projeção enxuta (`{ id,
displayName, profilePicUrl, phone }`, ver `src/types/index.ts`), sem `tags`. A listagem do
board (`GET /deals?pipelineId=`) não traz as etiquetas do contato junto.

**Para desbloquear:** confirmar se são mesmo etiquetas do contato (mais provável) ou um
conceito novo de etiqueta do negócio; no primeiro caso, o backend precisa incluir `tags` na
projeção de contato que o board recebe.

### 3.3 Avatar de 18px `rounded-[30%]` para o dono do negócio (card de venda)

O card hoje mostra o dono como texto + ícone (`sales-card-owner`, com teste cobrindo esse
formato). O mockup usa avatar. Diferença puramente visual, mas trocar muda o `data-testid`
e a leitura do card sem ganho de informação (o texto já mostra o nome) — não fiz a troca
sem uma razão mais forte que "é assim no mockup".

**Para desbloquear:** não é um gap de dado, é uma escolha visual — pode ser feito a
qualquer momento se o usuário confirmar preferência pelo avatar.

### 3.4 Coluna de etapas terminais separada à direita (borda tracejada)

O mockup isola Ganho/Perdido numa área visualmente separada do board, à direita, com borda
tracejada. Hoje essas colunas ficam na mesma fileira das demais, com um badge inline
identificando-as como terminais. Fazer a separação visual real é mudança de layout (afeta
scroll horizontal, ordenação de colunas, largura do board) — maior risco que os outros
ajustes cirúrgicos feitos nesta leva.

**Para desbloquear:** não depende de dado nem decisão de produto — é só maior escopo/risco
do que os outros itens da leva. Pode ser puxado como item próprio quando houver folga para
testar o layout com boards de tamanhos variados (2 a 8+ etapas).

### 3.5 Banner âmbar de alcance no `CloseDealReasonModal`

O mockup pede um aviso "Encerra a conversa vinculada e pausa 1 automação" ao fechar um
negócio. Não encontrei, no código do frontend, confirmação de que fechar um negócio
realmente dispara esses dois efeitos colaterais no backend — declarar um comportamento no
banner sem ter certeza de que ele acontece seria pior que não ter o banner (informação
errada é pior que informação ausente).

**Para desbloquear:** confirmar com o backend/PO se fechar um negócio de fato encerra a
conversa de origem e pausa automações vinculadas. Se sim, o banner é uma adição de baixo
risco (reusa `Banner` do `ui/`, já usado em `ConfirmModal`).

### 3.6 "Tempo/alerta de parado" em cor de perigo

README 3.4 pede que o tempo na etapa vire cor de perigo quando o negócio está "parado" —
confirmado visualmente (`telas/01-1e-funis-kanban-modal.png` mostra "parado 6d"/"parado 9d"
em vermelho em 2 cards). O dado (tempo na etapa) já existe e já é exibido
(`timeInStage(deal)`, cinza, sempre) — falta só a REGRA de quando ele deixa de ser "tempo
normal" e vira "parado". Sem um limiar definido eu inventaria um número (quantos dias?
mesmo limiar pra todo funil/etapa, ou por etapa?), que é exatamente o tipo de regra de
negócio que não deveria sair de um chute meu.

**Para desbloquear:** decisão de produto — qual o limiar de "parado"? É fixo (ex. 5 dias) ou
configurável por etapa/funil (algumas etapas são naturalmente mais lentas que outras)?

### 3.7 `CloseDealReasonModal`: botão desabilitado × erro inline

As notas de implementação do mockup (`telas/01-1e-card-negocio-estados.png`) são
explícitas: "Ganho/Perdido não são alvo de clique direto; a 'porta única' continua sendo o
CloseDealReasonModal, **com o erro inline do FormField no lugar de bloquear o botão**" — ou
seja, o botão de confirmar deveria ficar sempre clicável, e tentar confirmar sem motivo
escolhido é o que dispara o erro inline (`Select` com borda vermelha + "Informe o motivo
para continuar"), em vez de o botão nascer desabilitado.

O comportamento atual é o oposto: o botão fica `disabled` até um motivo ser escolhido
(`canConfirm`), e isso é intencional e **testado** — `CloseDealReasonModal.test.tsx` tem
casos com nome descrevendo exatamente esse comportamento ("confirmar fica desabilitado até
escolher"). Trocar unilateralmente o padrão de validação (bloquear × validar-ao-tentar) é
uma decisão de UX, não um bug — os dois padrões são defensáveis e este já foi escolhido,
testado e usado em produção.

**Para desbloquear:** decisão de produto/UX — vale trocar o padrão de validação deste modal
(e possivelmente do `ResolveOutcomePopover` do inbox, que compartilha `CloseReasonFields`)
de "bloqueado até válido" para "clicável, valida ao tentar"? Se sim, dá pra fazer sem
depender de nenhum dado novo — só precisa atualizar os testes que hoje afirmam o
comportamento antigo.

---

## Auditoria 2 — Levas 6, 7, 8, 9, 10 (Dashboard, Agentes/Wizards, Campanhas, Agendamentos, Configurações)

Segunda rodada do mesmo exercício (gate visual por leitura + consolidação de gaps),
agora sobre as levas do Farol e da Bússola já mescladas no worktree. Mesma regra: só
entra aqui divergência real, com evidência (imagem do mockup e/ou código), nunca chute.

**Leva 11 (Plano & Faturamento) ficou de fora desta rodada por um motivo à parte:** o
commit `f2e45f9` ("leva 11 — reestilização de Plano & Faturamento") existe no
repositório, mas **não está mesclado no branch do épico**
(`epic/SCRUM-1097-restyle-visual`) — ele só aparece na branch
`SCRUM-1107-leva9-agendamentos`, aparentemente commitado ali por engano. Como o código
real do épico não reflete essa leva, auditar contra ele agora documentaria gaps
fantasmas. Fica para o Maestro decidir: recuperar o commit pra branch/PR certos, ou pedir
pra quem fez para refazer o merge.

## 4. Dashboard (leva 6, README 3.1)

### 4.1 "Fila agora" é um resumo agregado, não a lista de conversas em espera

O mockup (`telas/01-1b-dashboard.png`) mostra, no rail, um card "Fila agora" com uma
**lista** de conversas individuais aguardando (avatar 26px, nome, trecho da última
mensagem, tempo colorido por SLA, chip de ator) e rodapé "Ver todas as N". O card real
equivalente, `LiveNowCard.tsx`, é um resumo agregado — 4 números (usuários online,
conversas ativas, em fila, espera média) num grid 2×2, sem nenhuma lista de itens. Não é
diferença de estilo, é um widget diferente: falta o componente que lista as conversas
individuais em fila.

**Para desbloquear:** não é gap de dado — a lista de conversas pendentes já existe (é a
mesma consulta que alimenta a aba "Pendentes" do Inbox). É trabalho de construir o
componente (lista + item de 44px + link "ver todas") e decidir se ele substitui o
`LiveNowCard` atual ou convive ao lado dele (o card agregado também tem valor próprio).

### 4.2 "Equipe": sem a linha fixa do Agente IA

Já documentado no próprio commit da leva (`bf27136`): o mockup mostra a mini-tabela
"Equipe" com uma última linha fixa para o agente de IA (tile de acento suave). O
`TeamMiniCard` real lista os top-5 agentes HUMANOS por conversas abertas hoje
(`agentMetrics`, mesmo dado da `AgentTable`) e não inclui essa linha — o dado de hoje
(`agentMetrics`) não cobre métricas do agente de IA no mesmo formato comparável, e
fabricar um número ali viraria estatística fictícia.

**Para desbloquear:** decisão de produto — o que a linha do "Agente IA" deveria mostrar
(conversas resolvidas pela IA hoje? taxa de resolução?) e se esse dado já existe em algum
endpoint (ex. os KPIs `bot_resolved`/`bot_deflection`, hoje zerados no snapshot) ou precisa
ser calculado no backend.

## 5. Agentes IA + Wizards (leva 7, README 3.5/3.6)

### 5.1 Taxonomia de abas do detalhe do agente

Já documentado no próprio commit da leva (`6d2bc48`): o mockup descreve 6 abas
(Desempenho · Comportamento · Conhecimento · Handoff · Canais · Histórico — confirmado
visualmente em `telas/01-2a-agentes-ia.png`). O `AgentDetail.tsx` real tem 9 abas
(overview/prompt/capabilities/criteria/skills/tools/rules/knowledge/catalog/metrics),
mantidas como estão de propósito — consolidar 9 em 6 é reorganização de informação, não
reestilo.

**Para desbloquear:** decisão de produto — quais das 9 abas reais se agrupam em cada uma
das 6 do mockup (ex. capabilities+criteria+skills+tools+rules dentro de "Comportamento"?),
e se algo se perde nesse agrupamento.

### 5.2 `AgentDetail.tsx` não foi atualizado para o token `--sf2` (já existe, ficou pendente)

A leva 7 flagou pro Maestro que o token `--sf2` (fundo de rail/nav secundário, usado em
5+ telas) não existia em `index.css` e aproximou com `surface-800/60`/`surface-900/60` como
solução temporária. O Maestro já adicionou `--sf2` à fundação (`index.css`,
`--sf2: var(--color-surface-900)`) — mas só o `AutomationBuilder.tsx` (mesma leva) foi
atualizado para consumir o token de verdade (`bg-[var(--sf2)]`). O rail direito do
`AgentDetail.tsx` ("KPIs 2×2... rail em `--sf2`", README 3.5) continua na classe de
aproximação antiga (`bg-surface-900/60`).

Achado relacionado nas outras 2 auditorias desta rodada: o mesmo padrão se repete em
`ScheduleWeekGrid.tsx` (fim de semana, leva 9) e `VerticalSettings.tsx` (bloco de prévia,
leva 10) — nenhuma das telas que o comentário de `--sf2` em `index.css` lista
(3.5/3.6/3.8/3.9/3.11) migrou pro token de verdade além do `AutomationBuilder`.

**Para desbloquear:** não depende de decisão nenhuma — é troca mecânica de classe
(`bg-surface-900/60` ou `bg-surface-900/40` → `bg-[var(--sf2)]`) nos 3+ lugares
encontrados. Baixo risco, puramente visual; vale fazer de uma vez só, não tela por tela.

## 6. Disparos/Campanhas (leva 8, README 3.7)

### 6.1 Aba Templates continua em lista, não na "grade de 4 cards"

O mockup (`telas/01-2c-templates-preview-whatsapp.png`) mostra a aba Templates como uma
grade de 4 cards (header com nome em mono + chip de status Meta, corpo com a prévia em
fundo `#EFE7DD`). O código real manteve `TemplatesTab.tsx` como lista de linhas — uma
tabela bem mais densa, com edição/exclusão/duplicar/atribuir linha/motivo de rejeição por
linha, que a leva não teve tempo de encaixar com segurança na grade do mockup sem perder
funcionalidade (achado já registrado no commit `d6cc939`, confirmado aqui contra o código
atual e a imagem).

**Para desbloquear:** não é gap de dado — é escopo/risco. Migrar pra grade de cards exige
decidir onde cabem as ações hoje disponíveis por linha (edição/exclusão/duplicar/atribuir
linha/motivo de rejeição) dentro de um card menor.

### 6.2 Banner âmbar de limite diário do WABA não aparece no CampaignWizard

O mockup mostra, na etapa Revisão do wizard, um banner de aviso quando o envio ultrapassa
o limite diário da linha WhatsApp ("Envio ultrapassa o limite diário (1.000). A campanha
será dividida em 3 dias automaticamente."). O dado real (`messagingLimit`) existe em
`WhatsAppNumberDetailed`, mas não está disponível no contexto que o wizard já consome
(`useWorkspaceNumber` só expõe `WhatsAppNumber` básico) — buscar via `/whatsapp/numbers`
só para isso ficou fora do escopo da leva (registrado no commit `d6cc939`).

**Para desbloquear:** não é decisão de produto, é trabalho técnico — expor
`messagingLimit` no contexto que o wizard consome (ou buscar sob demanda na etapa de
Revisão).

## 7. Agendamentos (leva 9, README 3.8)

Leva 9 foi deliberadamente escopada como "casca visual de exemplo" (sem rota/API real de
agenda no backend — dado fixo em `scheduleMock.ts`, documentado em comentário e Banner na
própria tela). Isso é esperado e **não é gap** (mesma natureza do que já está registrado na
memória do projeto sobre esta leva). Verificação item a item contra o mockup e o código:
toolbar, grade semanal 08–17h, header de dia com "HOJE", popover de detalhe
(Contato/Responsável/Origem/Status + ações), linha do "agora" (2px cor de perigo + bolinha
de 8px) e visualização Lista batem com o mockup. A entrada de navegação
(NavSidebar/TopBar), que o commit da leva previa deixar para o Maestro, já está presente.

### 7.1 Fim de semana não usa o token `--sf2`

Ver 5.2 — mesmo padrão, aqui em `ScheduleWeekGrid.tsx` (colunas de fim de semana e
cabeçalho de dia usam `bg-surface-900/40` em vez de `bg-[var(--sf2)]`).

## 8. Configurações (leva 10, README 3.9)

### 8.1 Bloco de prévia (Vocabulário) não usa o token `--sf2`

Ver 5.2 — mesmo padrão, aqui em `VerticalSettings.tsx` (bloco de prévia da seção
"Registros do funil" usa `bg-surface-900/60` em vez de `bg-[var(--sf2)]`).

Fora esse ponto, a leva 10 bate com o mockup com alta fidelidade: `SettingsSection` já usa
exatamente o grid `260px | 1fr`, gap 24px e padding vertical 22px do README; o índice
"Nesta página" já é 180px; o texto de erro obrigatório do campo de Fechamento vazio
("Obrigatório — usado no modal de motivo") e o texto da prévia batem literalmente com o
PNG.

## 9. Plano & Faturamento (leva 11, README 3.11)

Commit `f2e45f9` recuperado pro branch do épico — auditoria feita contra o código real
(`BillingPlan.tsx`, `BillingSettings.tsx`) e `telas/01-6a-plano-faturamento.png`.

**Nenhum gap novo encontrado.** A leva bate com alta fidelidade: `SettingsSection` (zero
cards) em todas as 5 seções, com o Banner de ativação como única exceção documentada no
próprio README (borda acento + fundo acento suave, ícone 18px, título 13px/600, CTA
primary); trilha de créditos 6px com borda e raio 3px; tabela de Upgrade em 3 colunas
dentro de 1 borda só, com o meio marcado `Recomendado` (inset accent + chip) — tudo
conferindo com o PNG, incluindo o índice "Nesta página" à direita (que aparece de graça
via `SettingsOutline`, o mesmo mecanismo compartilhado da leva 10 — bastou a página usar
`SettingsSection`, não precisou de código novo).

Uma divergência aparece na imagem — a grade "Limites do plano" do mockup mostra barra de
uso preenchida em TODAS as linhas (créditos, usuários, números, agentes, automações,
Copilot), mas o código só preenche a barra da linha de créditos (única com dado real de
uso hoje, `billing.creditsUsed`); as demais mostram só o limite. Isso **já está
documentado no próprio commit da leva** ("fabricar uso que a API não expõe seria KPI
sabidamente falso, mesma cautela do Dashboard") — decisão correta e consistente com o
resto do épico, só registrando aqui pra fechar o ciclo de auditoria, não é gap novo.

## Auditoria 3 — Levas 11, 12 (Faturamento, Conectores)

Terceira e última rodada, pedida como gate final antes do PR do épico contra `developer`.
Leva 11 (recuperada da branch órfã — ver nota da Auditoria 2) e leva 12 (tela nova,
`/settings/connectors`) auditadas contra `telas/01-6a-*`, `01-5b-*`, `01-4a-*`, `01-3d-*`,
`01-3e-*.png` e o código real. A seção 9 (Plano & Faturamento) já foi atualizada acima com
o resultado da leva 11 — **nenhum gap novo**, alta fidelidade. O restante desta seção cobre
a leva 12.

## 10. Conectores (leva 12, README 3.10)

Leva 12 é a tela mais fiel ao mockup do épico inteiro — modal de detalhe e modal de
credencial batem quase literalmente com o README (inclusive as mensagens de teste de
conexão, ex. "Chave recusada pela Doctoralia (401)"), e a decisão de arquitetura visual do
tile (`--connector-tile-mix`, cor da marca só no tile do logo, nunca em faixa/hero de
card) foi seguida à risca. Confirmado deliberadamente sem backend real (dados em
`connectorsMock.ts`, mesmo padrão da leva 9 Agendamentos) — não é gap, é escopo já
documentado no próprio commit `5acae4e`.

2 dos 3 achados abaixo eram bugs concretos (não dúvidas de produto) e já foram corrigidos
nesta mesma auditoria — ver commit desta branch.

### 10.1 Estado do catálogo não vive na URL

README 3.10 (Catálogo, `5b`) é explícito: "busca e filtro de categoria combinam (AND), e
**o estado vive na URL**". `ConnectorsSettings.tsx` implementa a combinação AND
corretamente, mas busca, categoria, status e modo de visualização são só `useState`
local — recarregar a página ou compartilhar um link com filtro aplicado perde tudo.

**Para desbloquear:** não é decisão de produto — é sincronizar os 4 filtros com
`useSearchParams`, mesmo padrão que já falta em outras telas (ver gap 1.3, drawer de
Contatos). Não corrigido aqui pelo mesmo motivo do 1.3: mudança de comportamento de
navegação, não só visual, com risco de regressão fora do escopo de uma auditoria.

### 10.2 Grade parava em 5 colunas, mockup pedia até 6 — CORRIGIDO

README: "grade responsiva de 2 a 6 colunas". `ConnectorsSettings.tsx` não tinha breakpoint
para 6 colunas em telas largas (`xl:grid-cols-5` era o teto). Ajuste mecânico, sem risco —
adicionado `2xl:grid-cols-6`.

### 10.3 Card mostrava "Conectar" pra conector bloqueado por plano — CORRIGIDO

README 3.10 (Card, `4a`) lista os 4 CTAs possíveis, incluindo `Ver planos (neutral sm)`
para o caso bloqueado por plano. `ConnectorCard.tsx` usava "Conectar" (primary) pro status
`business`, mas o clique já navegava pra `/settings/billing` (nunca abria um fluxo de
conexão) — rótulo e ação não combinavam. O `ConnectorDetailModal.tsx`, construído no MESMO
commit, já tinha a lógica certa (`blockedByPlan ? 'Ver planos' : 'Conectar'`): inconsistência
entre dois componentes irmãos, não dúvida de produto. `ConnectorCard.tsx` corrigido para
espelhar a lógica que o modal já tinha certa.
