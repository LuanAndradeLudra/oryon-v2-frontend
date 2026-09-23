# Decisões pendentes — SCRUM-1097 (revisão final com o usuário)

Instrução do usuário (2026-09-21): **não parar para perguntar**. Cada ponto de decisão é aplicado na
opção mais fiel ao mock (ou mais conservadora), registrado aqui e revisado no fim, em ajustes finos.

Formato: o que foi decidido provisoriamente · alternativa · como reverter.

## Produto / comportamento
1. **Botão "Resolver" no header do chat** — reintroduzido como no mock (1d); o status (Aberta/Pendente/Resolvida)
   foi para o menu `···`. O PO tinha removido em 08/09 por duplicar o dropdown de status (a duplicação não voltou).
   Reverter: commit `41e7eeb`.
2. **Rodapé do card de negócio em 1 linha** (canvas 1e): valor · chip IA · previsão (se houver) · tempo · avatar 18px.
   Nome do dono e origem viraram tooltip (R2-1E-CARD-02). Alternativa: devolver a linha de origem visível.
3. **"Adicionar ao funil" saiu do header do chat** (espremia a identidade; o mock não o tem) → menu `···`, abre o
   fluxo com escolha de funil. O painel do contato mantém "Novo negócio".
4. **Header de Conversas diz "pendentes"** (mesma palavra das abas) em vez de "aguardando" (texto do mock).
5. **Contatos: colunas fora da referência** (Score, Intenção, Sentimento, Funis, Fonte, Opt-in, E-mail) seguem
   existindo, desligadas por padrão. Alternativa: remover.
6. **Contatos: faixa de resumo** virou botão "Resumo"; "Situação comercial" e "Fonte" foram para o menu "+ Filtro".
7. **Funis: segmentado Kanban/Lista/Previsão** do mock → o app só tem Quadro/Relatórios; usamos esses dois.
   Etiqueta no card e filtro de Etiqueta: `[!]` (Deal sem tags). "Ganhos no mês" soma só os negócios carregados pelo board.

## Visual / sistema
8. **Tema claro com linhas mais escuras que o handoff** (pedido do usuário): `--color-surface-700` `#E4E6EC → #C9CFDA`,
   `--bd2` `#C8CDD8 → #A3ACBD`, borda de overlay `#D5DAE3 → #B9C0CE`, e borda de TODO input/select/textarea em `--bd2`.
   Ajuste fino possível: mais/menos contraste. Reverter: bloco claro de `src/index.css`.
9. **Escala da UI**: raiz 110% → 100% (tudo em rem estava 10% maior que o mock). Reverter: `font-size: 110%` no `:root`.
10. **Corpo 13px** (`text-sm` 14 → 13px / lh 1,5, spec TYPE-05). Reverter: token `--text-sm`.
11. **`--tx3` `#9098AA`** no claro (mock) tem contraste 3,0:1 em 11px (falha AA); mantido o valor atual, mais escuro.
12. **Logo**: mock usa placeholder "O" 26px; mantida a marca real em 26px.
13. **Pílula "Buscar" do TopBar e seletores em botão** usam a linha comum (`--bd`), não a borda de input (`--bd2`).
    Alternativa: levar também para `--bd2`.
14. **Fab (botão flutuante mobile de Contatos/Conversas)**: mantida sombra (categoria overlay, elemento flutuante
    sobre conteúdo) mas trocada para `--shadow-overlay` do sistema em vez de `shadow-brand-600/30` arbitrário;
    cor trocada de `bg-brand-600`/`hover:bg-brand-500` cru para os tokens do botão primário (`--color-btn-primary-bg/fg`,
    `hover:brightness-90`), igual ao `Button` variant="primary". Revisão mobile R2, commit ver mensagem.

15. **Botão "Enviar" do composer só aparece com texto digitado** (comportamento atual do app). No mock (1d) ele está
    sempre visível, ao lado do aviso de janela. Alternativa: mostrar sempre, desabilitado quando vazio.

16. **Junção sidebar/TopBar** — após testes com o usuário (sidebar #0A0F0F, TopBar #0A0F0F/#060909, painéis no
    tom do chão — todos rejeitados): TopBar voltou ao mock (`#161E1E`) e a sidebar ficou em `#0A0F0F` (mock `#0E1414`; fundo das telas mantido em `#060909` após teste com `#0E1414`) e a sidebar ganhou
    uma hairline de 1px `#243333` na borda direita, de onde nasce a linha inferior do TopBar. Em avaliação pelo usuário.

## Loop de polimento enterprise (PL-C2-FAR-*)
17. **Seletor de período do Dashboard (`DateRangePicker` + segmentado do `VolumeChart`)** — as opções "30 dias"/
    "Este mês" saíram (nenhuma fonte de dado do Dashboard tem mais que 7 dias de janela hoje; eram controle 100%
    inerte, PL-C2-FAR-1). "Hoje"/"7 dias" continuam, agora como filtro real no cliente. Mock 1b mostra as duas
    pílulas com 4 opções cada — desvio deliberado do mock por achado de fidelidade de dado, não de layout.
    Reverter: commit `444f486` (`DateRangePicker.tsx`, `VolumeChart.tsx`, `DashboardPage.tsx`); reintroduzir as
    2 opções quando o backend aceitar uma janela maior que 7 dias em `getMessagesAnalytics`.

18. **Escala única de ícone (1,4×) passa a valer também para o `lucide-react`** — `src/lib/icons.tsx` é um
    drop-in do lucide (alias em `vite.config.ts`) e o `index.css` escalava só `svg[data-oryon-icon]`. Efeito medido:
    na sidebar, 11 ícones da casa desenhavam 23,1px ao lado de 2 fallbacks desenhando 16,5px — **mesma classe
    `w-[16.5px]`**, 40% de diferença. A regra agora cobre `svg.lucide` também. Alternativa (não escolhida): desenhar
    os ícones que faltam no estilo da casa — resolve de vez, mas é trabalho de design (G) e muda o desenho, não só a
    escala; ou tirar o 1,4× de todo mundo, que encolheria o produto inteiro e desfaria o visual já aprovado.
    Resíduo conhecido: o traço continua 1.75 (casa) × 2 (lucide) — corrigido caso a caso com `strokeWidth={1.75}`
    no call site (feito nos 2 da sidebar). Reverter: commit `81c6495` (`src/index.css`).

## Rodada 3 — Disparos, Modelos e Criação de modelo (22–23/09, autonomia dada pelo PO)
19. **Disparos em cards com resultado embutido** (escolha do PO por AskUserQuestion): a tabela saiu; "Ver relatório"
    é botão no card (estava dentro do `···`); rascunho/agendada não mostram barra nem métricas (não há resultado);
    `failed` mostra relatório. Reverter: `0052b60`.
20. **Catálogo de modelos = lista + painel de detalhe** (o PO não queria a grade; Twilio/WhatsApp Manager são lista):
    linha de 44px com ícone da categoria, nome, trecho do corpo, idioma, status, data; painel fixo ≥ `lg` (360/392px),
    modal abaixo. Alternativa: manter grade. Reverter: `5495228` + `6b4b7db`.
21. **Direção visual C (Attio/Linear — faixas de 1px, rótulo à esquerda em 104px, contraste por peso)** para as três
    telas, escolhida em artifact comparativo; **não** é a linguagem da Meta (clara) nem o Oryon "arejado".
    A Meta entrou como referência de **estrutura** (dois painéis, prévia fixa, 3 passos, contador dentro do campo).
22. **Prévia do WhatsApp fiel só no tema claro**, com valores amostrados pixel a pixel dos 3 prints do PO
    (`#E5DDD5`, `#FFFFFF`, `#11191D`, `#6C7E85`, `#EEF2F1`, `#077CB3`, `#1B8755`). **Sem tema escuro**: nenhuma
    captura de referência — precisa de um print do WhatsApp escuro para amostrar. Sem moldura de celular (a prévia
    da Meta não tem). Sem tique (mensagem recebida). Fonte do sistema. Reverter: `3d8a96b`.
23. **"Autenticação" sai do segmentado de categoria** (está `comingSoon`): o `SegmentedControl` não tem estado
    desabilitado e um cartão apagado mentia disponibilidade; vira nota "Autenticação em breve". Alternativa: adicionar
    `disabled` ao primitivo. Reverter: `805ed4e`.
24. **Ícones de categoria unificados** (megafone / sino / chave, como a Meta) entre `constants.ts` e
    `templateCategory.tsx` — antes o segmentado mostrava chave-inglesa/escudo. Reverter: `805ed4e`.
25. **Trilha de passos = `WizardProgress`** (18px, valores do canvas CAMP-WIZ-07..13) nas três telas; a bolinha de
    14px do meu mockup foi descartada. **Campos de formulário = `Input/Select/Textarea` md 36px**; a receita de
    32px do mockup foi descartada por estar fora da régua sm 28 / md 36 / lg 44.
26. **`StatStrip` (relatório): número 18/700 é um tier compacto**, distinto do KPI de página 26/800 (documentado
    no componente). Rótulo no piso de 11px.
27. **Linha de template no wizard sem a 3ª linha de variáveis** (vira "· N var." inline): duplicava a etapa 3 e
    quebrava o ritmo (54 vs 71px). Reverter: `608fc2d`.
28. **Modal de prévia removido do catálogo** (o painel/modal de detalhe o substitui). Reverter: `5495228`.

29. **Divisor entre corpo e botões na prévia do WhatsApp escurecido a pedido do PO** (23/09): amostrado `#EEF2F1`
    (quase invisível), agora `#D5DBDD`. É o único valor da prévia que **não** é o amostrado. Reverter: `WA.divisor`
    em `TemplatePreview.tsx`.

30. **`--rowhover` no tema escuro sobe de 4% para 7% de branco** (23/09): a troca em massa de `hover:bg-surface-800`
    por `--rowhover` (necessária no claro, onde surface-800 é branco) deixou o hover **2,5× mais fraco no escuro sobre
    o piso `surface-950`** dos drawers (Δlum 0,0094 → 0,0036, contraprova do Cartógrafo). A 7%: 0,0065 no piso 950 e
    0,0083 no piso 800 — acima do antigo em cada piso. Reverter: `--rowhover` no bloco escuro do `index.css`.
31. **Painel de notificações (popover do sino) reestilizado na direção C** (23/09, pedido do PO): cabeçalho 111→44px com
    Marcar todas / Arquivadas / Preferências como botões de ícone; filtros numa linha (Não lidas|Todas + categoria em
    menu, no lugar de 6 chips de 10px); item 101→75/58px com ladrilho colorido por categoria (clicável = filtra), avatar
    quando há contato, "Urgente" como chip, ações no hover. Comportamento e atalhos preservados. Referências: Linear
    Inbox; Smashing Magazine e Courier (guias de notificação). A página `/notifications` (mobile) passa a reusar o
    mesmo item (Farol). Reverter: `5ddca38`.

## Propostas de produto (fora do escopo do redesign)
- **Visão em cards (kanban) de Contatos por situação** — conversa de 22/09: NÃO fazer agora. Nos CRMs de referência o
  kanban é de negócio (Pipedrive, Close, HubSpot); contato é tabela, com a etapa como coluna/filtro. Salesforce e Attio
  permitem kanban em qualquer lista, mas como modo opcional da mesma lista, não tela própria. No Oryon as situações
  (Novo Lead, Qualificado, Proposta…) se sobrepõem aos nomes das etapas dos funis e os dois eixos ainda não conversam
  (auditoria Situação × Funis, 10/09, 6 decisões do PO pendentes) → dois quadros parecidos gerariam confusão.
  Feito no lugar (22/09): **contagem por situação no menu do chip "Situação"** (panorama sem mudar de tela).
  Próximos, se desejado: agrupar a tabela por situação (seções com contagem); quadro opcional por situação só depois
  das decisões Situação × Funis.

## Sem dado no backend (`[!]`, não implementado)
Split Humano/IA por hora e deltas dos KPIs (Dashboard); painel "HOJE"/CSAT do agente; "Rascunho salvo" nos wizards;
custo estimado e "enviar teste" na campanha; check duplo e nome do agente no chip da lista; Copilot, Nota interna e
microfone no composer; evento "agente pediu transferência"; horário de atendimento/handoff/webhooks sem rota;
contagens por segmento Minhas/Fila; tags em negócio. Faturamento 6a atrás da flag `settingsBilling` (desligada).
