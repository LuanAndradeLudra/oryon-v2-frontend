# F13 (frontend) — Onboarding sem configuração de CRM · verificação

**História:** SCRUM-894 · **Subtarefas:** 899–905 · **Data:** 2026-08-29
**Branch:** `story/SCRUM-894-onboarding-ciclo-vida` (a partir do épico `bd42795`) · **Seção:** `backend/docs/pipelines-modelo.md` §4.12
**Companheiro backend:** PR #56, merge `fbed648` (seed do ciclo de vida no cadastro).

## O problema que a história resolve

O primeiro uso pedia ao cliente que **decidisse a estrutura do CRM** — a IA gerava estágios, gravava em `tenant_stages` e chamava aquilo de "Pipeline". Três consequências: quem pulava ficava com zero estágios e `contacts.stage = null`; quem não pulava ganhava um eixo de ciclo de vida inventado por LLM; e todo mundo passava a confundir "situação do contato" com "etapa do funil". Além disso o wizard era um overlay sem rota: fechar a aba no meio voltava ao começo, e ele mandava o usuário para uma seção de Configurações que **não existia**.

## O que mudou

### SCRUM-899/900 — `/setup`, retomável, três passos

| Antes | Depois |
|---|---|
| Overlay sem URL, renderizado pelo `OnboardingGate` | Rota **`/setup`**, fora do `AppShell` e fora do gate (o gate só redireciona — dentro dele o redirect entraria em loop) |
| 2 passos: contexto da IA → CRM (geração por IA) | 3 passos: **conectar WhatsApp** → **time/setores** (opcional) → **contexto da IA** |
| Fechar a aba = voltar ao início | Passo salvo por tenant em `localStorage` (`oryon.setup.step.<tenantId>`) |
| Sem "voltar" | "Voltar" em todos os passos depois do primeiro; "Passo N de 3" com trilha |

`src/lib/setupProgress.ts` guarda **só o passo** — o conteúdo já vive no servidor (linhas, setores) ou no serviço de contexto (Hub); duplicar criaria duas verdades. `localStorage` indisponível (aba privada) não quebra o wizard: ele só deixa de retomar.

Os passos 1 e 2 **reaproveitam as seções de Configurações** (`WhatsAppNumbers`, `Departments`) em vez de reimplementá-las — duas versões da tela de conectar linha divergiriam na primeira mudança. Por isso `SetupPage` monta o `WorkspaceNumberProvider`, que normalmente vem do `AppShell`.

### SCRUM-901 — a geração de CRM sai do primeiro uso

`CRMOnboarding.tsx` (988 linhas) e `useOnboarding.ts` removidos, junto do preview *"Pipeline — N estágios"* e do tipo órfão `AIOnboardingConfig`. O "pular" deixou de existir como conceito: não há mais nada a pular — o backend já criou funil e situações no cadastro.

**Achado durante a remoção:** `useOnboarding` era o único lugar que chamava `POST /onboarding/complete`; `completeOnboarding()` do `AuthContext` só atualiza a sessão local. Removê-lo sem mais nada deixaria o tenant marcado como configurado **só no navegador** — e o gate reabriria `/setup` a cada login novo. A chamada foi para o `finish()` do wizard, best-effort: se a rede falhar o usuário entra na plataforma mesmo assim, e o wizard que reabre é retomável.

### SCRUM-902 — "Situação do contato"

"Estágio do contato" → **"Situação do contato"** em toda a UI, e "pipeline" fora dos textos voltados ao usuário:

`ContactsTable` (cabeçalho) · `CRMConfigDrawer` (aba) · `StagesManager` (título) · `MoveStageModal` (3 textos) · `NewContactDrawer` · `ImportContactsDrawer` · `DealModal` · `AiSuggestionsModal` · `BulkActionBar` · `ContactsStatsBar` · `ContactsHeader` · `VerticalSettings` (que apontava para uma tela inexistente) · `AutomationWizard` (categoria "CRM / Pipeline" → "CRM / Contatos"; gatilho "Estágio do pipeline alterado" → "Situação do contato alterada"; ação "Mudar estágio / Mover no pipeline do CRM" → "Mudar situação / Mover o contato no ciclo de vida") · `CampaignWizard` (segmento "Estágio do CRM" → "Situação do contato").

Identificadores de código, `data-testid` e aliases de importação de CSV **não** mudaram — só o que o usuário lê.

### SCRUM-903 — seção própria em Configurações → CRM

`ContactStagesSettings` embrulha o `StagesManager` que só existia dentro do drawer de Contatos. Fica **ao lado** de "Estágios do funil", justamente para os dois eixos aparecerem lado a lado. **Não é gateada** pelo flag: a situação do contato é anterior ao módulo de funis e vale para todo tenant.

### SCRUM-904 — "Sugerir etapas com IA" no Novo funil `[V2]`

A geração por IA não morreu: mudou de lugar. Sai do onboarding (onde configurava o CRM inteiro às escondidas) e entra no modal de **Novo funil**, onde o usuário já escolheu nome e tipo. O resultado é **rascunho editável**: `stagesFromAiSuggestion` usa só as etapas **normais** sugeridas — os dois terminais continuam sendo os do tipo, porque a invariante I2 é do funil, não da opinião do modelo. Corta em 8 normais, descarta rótulos vazios, trunca em 60 caracteres, e cai no rascunho mínimo se a sugestão vier inútil. Falha de rede vira aviso, não bloqueio.

`businessContextFromHub` é o único ponto onde o Hub da empresa encontra o formato do agent-server — função pura, testada sem rede. O modal recebe `tenantId` por **prop** (e não via `useAuth`) para seguir renderizável sem provider: é um componente de formulário, não de sessão.

## Verificação

- `npx tsc --noEmit`: **limpo**.
- `eslint` nos arquivos novos/reescritos: **limpo**. Os erros que sobram estão em arquivos tocados só para renomear texto e **já existiam na base** (`AutomationWizard`, `CampaignWizard`, `AiSuggestionsModal`, `BulkActionBar`, `VerticalSettings`, `ContactsPage`, `SettingsLayout`).
- **Suíte 233/235** — era 202/205 no épico: **+30 testes**, nenhuma falha nova. As 2 restantes são as pré-existentes (`DesktopRecommendedBanner`, que falha também na base, e o `smoke` por timeout sob carga).

| Spec | Testes | Cobre |
|---|---|---|
| `lib/setupProgress.test.ts` | 8 | ordem dos passos · retoma o passo salvo · não vaza entre tenants · valor corrompido · limpeza ao concluir · `localStorage` indisponível · navegação · `isSetupStep` |
| `components/onboarding/SetupWizard.test.tsx` | 7 | abre no passo 1 reaproveitando a seção · avança salvando o progresso · retoma no passo salvo · "Voltar" regrava · concluir chama `/onboarding/complete`, marca a sessão e limpa o progresso · funil "Vendas" na tela final só com o flag (SCRUM-498) · **nenhum passo menciona estágio/campo/pipeline** |
| `deals/createPipelineForm.test.ts` | +4 | normais da IA + terminais do tipo · sugestão inútil cai no rascunho mínimo · corte em 8 · truncagem do rótulo |
| `deals/CreatePipelineModal.test.tsx` | +3 | sugestão substitui as normais e preserva os terminais · falha vira aviso sem estragar o rascunho · botão ausente na edição |
| `services/anthropicService.test.ts` | 4 | mapeamento Hub → contexto · campos não coletados vão vazios · nome do funil como fallback · Hub vazio |
| `settings/SettingsLayout.test.ts` | +4 | "Situação do contato" aparece com e sem o flag · não entrou nas seções gateadas · fica antes de "Estágios do funil" · só admin |

## Não testado no browser

Como nas histórias anteriores desta fatia, a verificação é de tsc/lint/testes. Falta conferir no navegador: o passo 1 com o fluxo real de conexão da Meta, o tema claro/escuro das telas novas e a rota `/setup` num tenant recém-cadastrado de ponta a ponta — este último entra no roteiro manual da SCRUM-905, que depende de staging (conta nova de verdade).

## Decisões

- **`/setup` fora do `OnboardingGate`.** Dentro dele o redirect se autoalimentaria.
- **Só o passo é persistido.** O conteúdo tem dono no servidor.
- **Passos 1 e 2 reaproveitam as seções de Configurações.** Uma cópia divergiria na primeira mudança.
- **Concluir é best-effort.** Prender alguém na tela final por causa de um POST seria pior que reabrir um wizard retomável.
- **`tenantId` por prop no `CreatePipelineModal`.** Um formulário não deveria depender do provider de sessão para renderizar.
