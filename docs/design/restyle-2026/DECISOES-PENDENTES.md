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

## Sem dado no backend (`[!]`, não implementado)
Split Humano/IA por hora e deltas dos KPIs (Dashboard); painel "HOJE"/CSAT do agente; "Rascunho salvo" nos wizards;
custo estimado e "enviar teste" na campanha; check duplo e nome do agente no chip da lista; Copilot, Nota interna e
microfone no composer; evento "agente pediu transferência"; horário de atendimento/handoff/webhooks sem rota;
contagens por segmento Minhas/Fila; tags em negócio. Faturamento 6a atrás da flag `settingsBilling` (desligada).
