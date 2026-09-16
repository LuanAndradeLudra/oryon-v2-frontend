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
