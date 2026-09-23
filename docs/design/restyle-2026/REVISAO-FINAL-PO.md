# Revisão final com o PO — SCRUM-1097

Roteiro pra revisar o que foi decidido sozinho enquanto você estava fora (regra
combinada: "não parar pra perguntar", aplicar a opção mais fiel ao mock e
registrar pra revisão depois). Organizado por tela, não por número — abra cada
rota, compare com o que descrevo, e decida se fica como está ou se ajusta.

Cada item traz: **o que mudou** · **onde ver** · **é reversível** (sim/não e
como, se algo não agradar).

---

## Conversas (`/conversations`)

**Botão "Resolver" voltou pro cabeçalho do chat.** Estava dentro do menu
`···` desde 08/09 (você tinha tirado de lá por duplicar o status
Aberta/Pendente/Resolvida) — voltou pro lugar porque a duplicação não
aconteceu na prática: um é ação (resolver), o outro é status (o quê está
acontecendo). Onde ver: abra uma conversa, olhe o topo. Reversível: sim,
commit `41e7eeb` desfaz.

**"Adicionar ao funil" saiu do cabeçalho do chat.** Ficava apertado ao lado do
nome do contato e o mock não tem esse botão ali. Continua disponível no menu
`···` do cabeçalho e também no painel do contato (botão "Novo negócio").
Reversível: sim, é só devolver o botão ao cabeçalho.

**Cabeçalho da lista diz "pendentes" em vez de "aguardando".** Só o texto —
"pendentes" já é a palavra usada nas abas de filtro logo abaixo, então ficou
mais consistente. Reversível: trivial, é troca de string.

**Botão "Enviar" do composer só aparece quando você digita algo.** É o
comportamento que o app já tinha; o mock mostra o botão sempre visível
(desabilitado quando vazio), do lado do aviso de janela de atendimento.
Mantivemos o comportamento atual por ser mais limpo com o composer vazio.
Reversível: sim, é trocar a condição de exibição.

---

## Funis (`/pipelines`)

**Rodapé do card de negócio virou 1 linha:** valor · chip da IA · previsão
(se houver) · tempo · avatarzinho de 18px do dono. O nome do dono e a origem
do lead (WhatsApp, indicação etc.) viraram tooltip ao passar o mouse, em vez
de aparecerem escritos. Onde ver: abra o quadro, repare nos cards. Se preferir
ver a origem sem precisar passar o mouse, dá pra devolver a linha.

**O quadro só tem "Quadro" e "Relatórios"**, não o segmentado
Kanban/Lista/Previsão do mock (o app não tem essas duas visões implementadas,
então não inventamos telas vazias). Repare também que negócio sem etiqueta
mostra um aviso discreto no card e no filtro de Etiqueta, e "Ganhos no mês"
soma só os negócios que o quadro já carregou (não é o total do mês inteiro se
você não rolou a página até o fim) — isso é limitação de dado, não de layout.

---

## Contatos (`/contacts`)

**Faixa de resumo do topo virou um botão "Resumo"** (abre os números sob
demanda) em vez de ficar sempre visível ocupando espaço. "Situação comercial"
e "Fonte", que eram filtros fixos, foram para o menu "+ Filtro" junto com os
outros. Onde ver: abra a lista de contatos, topo da página.

**Colunas fora da referência (Score, Intenção, Sentimento, Funis, Fonte,
Opt-in, E-mail) continuam existindo**, só que desligadas por padrão — você
liga pelo menu de colunas se quiser. O mock não tem essas colunas; a decisão
foi manter em vez de apagar, porque já existiam e alguém pode depender delas.
Reversível: sim, removê-las de vez é uma decisão fácil de aplicar depois.

---

## Dashboard (`/dashboard`)

**Os filtros de período "30 dias" e "Este mês" saíram** do seletor de
período e do gráfico de volume. Ficaram só "Hoje" e "7 dias", que agora
filtram de verdade (antes eram enfeite: nenhum gráfico do Dashboard tinha
dado de mais de 7 dias pra mostrar, então escolher "30 dias" não mudava
nada na tela). O mock mostra as duas opções extras — é um desvio deliberado
por causa do dado disponível hoje, não por preferência de layout. Onde ver:
topo do Dashboard e dentro do card do gráfico de volume. Reversível: sim,
commit `444f486`; devolver as opções quando o backend aceitar uma janela
maior que 7 dias.

---

## Disparos (`/campaigns`, aba "Disparos")

**Os disparos viraram cards com o resultado já embutido**, em vez de uma
tabela. "Ver relatório" é um botão direto no card (antes ficava escondido
dentro do menu `···`). Rascunho e campanha agendada não mostram barra de
progresso nem métricas — não faz sentido mostrar resultado de algo que ainda
não rodou. Campanha que falhou mostra o relatório mesmo assim (pra você ver
o que deu errado). Essa foi uma escolha sua mesmo, feita em conversa durante
o trabalho. Reversível: sim, commit `0052b60` volta pra tabela.

**Dentro do relatório** (botão "Ver relatório" de qualquer card), os números
grandes (alcance, cliques, conversões etc.) estão menores que os números do
Dashboard — é proposital: dentro de um relatório com vários números lado a
lado, um tamanho mais compacto cabe melhor; o tamanho grande é reservado pro
KPI de destaque de página. Isso está documentado no código, então ninguém vai
"corrigir" sem querer depois.

---

## Modelos (`/campaigns`, aba "Templates")

**O catálogo virou uma lista com painel de detalhe do lado**, não mais uma
grade de cartões. Cada linha tem 44px: ícone da categoria, nome, um trecho
do texto do modelo, idioma, status e data. Em telas largas (desktop) o
painel de detalhe fica fixo ao lado da lista; em telas mais estreitas ele
abre como modal por cima. A referência aqui foi o Twilio/WhatsApp Manager,
que também é lista — a decisão foi sua, o PO não queria grade. Reversível:
sim, commits `5495228` + `6b4b7db` voltam pra grade.

**"Autenticação" saiu do segmentado de categoria** (Marketing / Utilidade /
Autenticação) e virou uma nota "Autenticação em breve". O motivo é técnico:
o controle de categoria não sabia mostrar uma opção "desabilitada" sem
mentir que ela funciona — um cartão apagado dava a entender que dava pra
clicar. Reversível: sim, commit `805ed4e`.

**Os ícones de categoria (megafone, sino, chave) foram padronizados** entre
os dois lugares que os mostram — antes um lugar usava chave-inglesa e escudo,
inconsistente com o resto. Mesmo commit `805ed4e`.

**O modal de prévia rápida do catálogo foi removido** — o painel/modal de
detalhe (o mesmo do item acima) já mostra a prévia, então virou duplicado.
Reversível: sim, commit `5495228`.

---

## Criação de modelo (`/campaigns` → aba Templates → botão "Novo template")

**A tela toda segue uma linguagem visual nova** (a mesma do catálogo, do
Disparos e do relatório de Atribuição): faixas finas de 1px separando seções,
em vez de caixas com fundo e borda; rótulo do campo à esquerda numa coluna
fixa; contraste vem do peso da fonte, não de cor. Essa direção foi escolhida
comparando 3 alternativas lado a lado, com você decidindo — **não** é o
visual "arejado" que o resto do Oryon usa, nem o visual claro da Meta. A
Meta entrou só como referência de **estrutura** (dois painéis lado a lado,
prévia sempre visível, 3 passos, contador de caracteres dentro do campo).
Onde ver: abra "Novo template" e percorra os 3 passos. Não reversível sem
refazer a tela — é uma escolha de direção, não um ajuste pontual.

**A trilha de passos (1, 2, 3 no topo) e os campos de formulário usam os
componentes padrão do app** (o mesmo trecho de passos, o mesmo tamanho de
campo de texto/seleção usado em todo o resto do Oryon), não o desenho
específico que existia num rascunho anterior. Ganho: qualquer ajuste futuro
nesses componentes vale pra essa tela também, de graça.

---

## Prévia do WhatsApp

Aparece dentro da Criação de modelo (painel da direita) e também dentro do
fluxo de criar um Disparo, quando você escolhe qual modelo enviar.

**A prévia é fiel só no tema claro.** As cores (fundo da conversa, balão,
textos, ícone de check azul etc.) foram tiradas pixel a pixel de 3 prints
que você mandou do WhatsApp real. **Não existe uma versão para o tema
escuro** — precisaríamos de um print do WhatsApp no escuro pra fazer o
mesmo trabalho de amostragem; por ora, no tema escuro a prévia usa uma
aproximação. A prévia também não tem moldura de celular (o print da Meta
que usamos de referência também não tem) e não mostra o tique de "mensagem
recebida" (não é o padrão nas referências que você mandou). Onde ver: mude
pro tema claro (veja a seção "Tema claro" abaixo em como) e abra a Criação
de modelo. Reversível: sim, commit `3d8a96b`.

**Um dos traços da prévia foi escurecido a seu pedido em 23/09** — a linha
fina que separa o corpo da mensagem dos botões estava quase invisível na cor
original amostrada do print; deixamos um pouco mais escura pra dar pra ver.
É o único valor da prévia que não veio direto do print. Reversível: sim,
está isolado num único lugar no código (`TemplatePreview.tsx`).

---

## Navegação (barra lateral, barra superior, busca, botão flutuante)

**Cor da barra lateral e da barra superior ajustada depois de testar
variações com você** — testamos deixar as duas mais escuras e iguais, e
também deixar os painéis internos na cor do fundo; todas essas variações
foram rejeitadas. Ficou: barra superior na cor do mock original, barra
lateral um pouco mais escura que o mock (com uma linha fina de 1px
separando ela do resto da tela). **Este ponto está marcado como "em
avaliação" — vale seu olhar com mais calma**, é o item de navegação menos
fechado da lista.

**O logo é a marca real do Oryon em 26px**, não o "O" genérico que aparece
no mock (lá é só um placeholder de posição). Não é reversível no sentido de
"desfazer" — é manter a marca de verdade em vez de usar um rascunho.

**A pílula de busca da barra superior e os botões-seletor usam a mesma
borda fina que o resto da interface**, não a borda um pouco mais grossa dos
campos de formulário (input, seleção). Se achar que eles deveriam parecer
mais "clicáveis"/com mais destaque, dá pra levar pra borda de campo também.

**O botão flutuante do mobile (Contatos/Conversas) manteve a sombra**
(faz sentido, é um elemento flutuante por cima do conteúdo), mas a cor e a
sombra em si foram trocadas pelas mesmas usadas no botão principal do resto
do app — antes ele tinha uma cor e sombra próprias, fora do padrão.

---

## Tema claro

Isso é o item mais espalhado da lista, então virou **um item só**: uma
varredura tela por tela do app inteiro procurando 4 problemas que só
aparecem no tema claro (o app foi desenhado primeiro pro escuro):

1. **Fundos escuros por trás de janelas/menus** ("escurecer o resto da tela"
   quando abre um modal) que continuavam pretos mesmo no claro — pareciam
   um erro, não um efeito intencional.
2. **Realces de "passar o mouse por cima" que ficavam brancos sobre fundo já
   branco** — o efeito existia, mas não dava pra perceber.
3. **Linhas finas divisórias que quase somem** no claro (ficam claras demais
   sobre fundo já claro).
4. **Textos e ícones brancos "chapados"** dentro de avisos/banners que, no
   claro, ficam com uma cor de fundo muito pálida — o branco por cima
   desaparecia.

Cada ocorrência foi trocada pela versão que já existe corretamente nos dois
temas (não inventamos cor nova, só paramos de usar a errada). **3 telas boas
pra conferir rápido**, uma de cada ponta do app:

- **Configurações → Conectores** (`/settings/connectors`): tela mais densa
  de configurações, várias linhas e botões.
- **Conversas** (`/conversations`): abra uma conversa, teste o menu `···`,
  o painel do contato e o composer (anexar arquivo, respostas rápidas).
- **Disparos e Modelos** (`/campaigns`): as duas abas, mais a Criação de
  modelo.

**Como alternar o tema pra testar:** clique no seu avatar no canto superior
direito (qualquer tela) → alternar tema claro/escuro.

**Além da varredura**, houve um ajuste de contraste pedido por você: no tema
claro, as linhas divisórias e bordas de campo ficaram mais escuras que a
primeira versão (você achou a primeira versão apagada demais). Se achar que
foi longe demais ou de menos, é um ajuste fino de cor, rápido de refazer.
Reversível: sim, é um bloco isolado de cor no código pro tema claro.

---

## Primitivos (peças usadas em toda tela — um ajuste aqui vale em todo lugar)

**Tamanho geral da interface reduzido em ~10%.** O app estava desenhando
tudo 10% maior que o mock (um detalhe técnico de como o navegador calcula
tamanhos, não uma escolha de design). Corrigido pra bater com o mock.
Reversível: sim, é um único número no código.

**Texto do corpo ficou 1px menor** (14px → 13px, com espaçamento entre
linhas um pouco mais folgado). Segue a régua de tipografia validada com o
mock. Reversível: sim, um único valor.

**Um tom de cinza usado em textos pequenos e secundários foi mantido mais
escuro** que o valor exato do mock, porque o valor do mock não passa no
teste de legibilidade mínima em textos pequenos (contraste insuficiente).
Prioridade: dar pra ler > seguir o mock à risca nesse ponto específico.

**Ícones do sistema todos no mesmo tamanho de traço/espessura.** Existiam
dois "estilos" de ícone convivendo — o de casa (mais fino) e alguns de
biblioteca genérica (mais grossos) — que na sidebar chegavam a desenhar com
40% de diferença de tamanho aparente mesmo pedindo o mesmo tamanho no
código. Agora os dois escalam juntos; o traço mais grosso dos ícones de
biblioteca genérica que sobraram foi ajustado um por um onde apareciam
lado a lado com os de casa. Se ainda notar algum ícone "gordo" perto de um
"fino", é provável que seja um desses residuais — aponte que ajustamos.

**Correções silenciosas em componentes de base** (modal, tabela, seletor de
cor, barra de progresso de wizard): pequenos ajustes de cor que não mudam
como as telas se comportam, só corrigem casos em que um realce ficava
invisível — inclusive um em que o botão de fechar de qualquer modal do app
tinha o mesmo tom do fundo do próprio modal (não dava pra perceber o realce
ao passar o mouse, em nenhum dos dois temas). Não são decisões de design,
são correções de bug — mencionadas aqui só por transparência, não precisam
da sua aprovação.

---

## Coisas que sabidamente ainda não têm dado real (`[!]` no código)

Fica registrado pra não parecer esquecimento: divisão Humano/IA por hora e
variação dos números do Dashboard; painel "Hoje"/CSAT do agente; "rascunho
salvo" nos assistentes passo a passo; custo estimado e "enviar teste" ao
criar uma campanha; check duplo e nome do agente na lista de conversas;
Copilot, nota interna e microfone no campo de mensagem; horário de
atendimento/transferência/webhooks sem uma tela própria ainda; contagem por
"minhas conversas"/"fila"; etiquetas em negócio. Faturamento (tela 6a) está
pronto mas atrás de uma chave que ainda não foi ligada.
