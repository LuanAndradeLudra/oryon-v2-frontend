# Storyboard do Hero — "a Oryon entende o contexto e opera o negócio"

Rodada de correção (24/09). Substitui a cena de guarda/handoff como **primeira** demonstração; a guarda continua
existindo e vai para uma seção inferior. Pergunta de controle: *"o visitante entende que a Oryon recebeu uma
demanda, compreendeu o contexto, executou uma ação e produziu um resultado?"*

## 1. A operação (lastro verificado no código, 24/09)

| Elo da história | Onde isso existe no produto |
|---|---|
| Agente consulta produtos liberados a ele | `src/components/agents/AgentCatalogTab.tsx` — "Catálogo do agente" (SCRUM-222): escolhe quais produtos do tenant este agente pode usar |
| Preço e quantidade na proposta | `src/components/deals/dealItems.ts` — `unitPriceCents`, `quantity` |
| Agente move o negócio de etapa | `crmCapabilitiesCatalog.tsx` → `manage_deal_pipeline` — "Mover negócio ou registro no funil" |
| Agente etiqueta o contato | `crmCapabilitiesCatalog.tsx` → `tag_contact` — "Etiquetar contato" |

**Limite obrigatório (está escrito na própria capacidade):** *"Fechar venda nunca é permitido, mesmo com o opt-in:
o backend recusa."* → o resultado da história é **proposta registrada**, jamais venda ganha. Também não mostrar
nome de API, nem "pensando…", nem métrica de receita.

## 2. Dados fixos (os mesmos nos 5 frames — continuidade)

- Pessoa: **Marina Alves** · empresa **Loja Vida Natural** · linha **WhatsApp · Comercial**
- Demanda: *"Oi! Preciso de uma proposta pra 12 licenças do plano anual."*
- Agente: **Agente Vendas**
- Catálogo: **Plano Pro · anual — R$ 375 / licença**
- Negócio: **Loja Vida Natural — Plano Pro anual**, 12 licenças, **R$ 4.500**
- Funil **Vendas**: Novo lead · Qualificado · **Proposta** · Negociação
- Etiqueta aplicada: **proposta enviada**
- Rótulo permanente do quadro: `STAGE_DEMO_LABEL`

## 3. Planos da composição (quatro, não "cards flutuantes")

| Plano | Papel | Tratamento |
|---|---|---|
| **P0 shell** | contexto de que isto é um produto | rail + sliver da lista, **recortado** pelas bordas, contraste baixo; nunca ganha foco |
| **P1 conversa** | entrada da demanda | coluna do chat; **nunca some** — recua em opacidade/escala, permanece ancorada |
| **P2 execução** | o que o agente entendeu / consultou / fez | painel à direita; é o foco dos frames 2–4 |
| **P3 resultado** | consequência no negócio | card do negócio + etapa; entra no frame 4 e fica |

Regra de dominância: **um elemento domina por frame**; os demais existem como contexto. Nada de três painéis com
o mesmo peso.

## 4. Os cinco frames

### F1 · `demanda`
- **Precisa ser compreendido:** uma pessoa real pediu uma proposta pelo WhatsApp.
- **Domina:** a bolha inbound de Marina (P1), ~46 % da largura útil, alinhada ao terço esquerdo.
- **Secundário:** P0 recortado à esquerda (rail + 2 linhas da lista, atenuado); cabeçalho do chat com nome, empresa e o chip do Agente Vendas.
- **Ausente:** P2 e P3.
- **Recorte intencional:** a lista de conversas é cortada pela borda esquerda — não é uma tela inteira.

### F2 · `contexto`
- **Precisa ser compreendido:** a Oryon já sabe quem é e o que está em aberto.
- **Permanece:** a bolha de F1, no mesmo lugar (continuidade), recuada.
- **Entra e domina:** P2 — ficha compacta: *Loja Vida Natural · cliente desde março · negócio aberto: **Qualificado*** · *2 conversas anteriores*.
- **Muda:** o foco passa da conversa para a ficha; P1 cai para ~70 % de opacidade, sem sair.

### F3 · `consulta`
- **Precisa ser compreendido:** o agente foi buscar uma informação real e ela voltou.
- **Domina:** dentro de P2, o item do catálogo retornado — **Plano Pro · anual · R$ 375/licença** — como um bloco com peso, não uma linha de log.
- **Acima dele, em texto miúdo:** *Consultando catálogo do agente*. Sem checkmark genérico: o que prova a consulta é **o retorno**, não o ✓.
- **Permanece:** ficha do F2 colapsada em uma linha; P1 ainda visível na borda.

### F4 · `ação`
- **Precisa ser compreendido:** algo mudou no negócio, não só na conversa.
- **Entra e domina:** P3 — card **Loja Vida Natural · 12 licenças · R$ 4.500**, com a etapa saindo de *Qualificado* e assentando em **Proposta** (deslocamento curto, não arraste).
- **Secundário:** P2 vira uma linha: *Etiqueta "proposta enviada" aplicada ao contato*.
- **Regra:** a etapa final é **Proposta**. Nunca "Ganho".

### F5 · `resultado`
- **Precisa ser compreendido:** a conversa e o CRM contam a mesma história.
- **Domina em conjunto (lado a lado):** a resposta do Agente Vendas em P1 — *"Enviei a proposta: 12 licenças do Plano Pro anual, R$ 4.500 por ano. Quer que eu agende uma conversa pra fechar?"* — e o card do negócio em **Proposta** (P3), já assentado.
- **Ligação visual obrigatória:** o card carrega o nome da empresa e o avatar de Marina, para o resultado apontar de volta à pessoa que originou a demanda.
- **Permanece parado tempo suficiente para leitura** (é o quadro do poster e do reduced-motion).

## 5. Enquadramento e leitura

- Escala moderada é permitida como **enquadramento** (aproximar de P2/P3), nunca para miniaturizar o app inteiro.
- Deslocamentos curtos + opacidade; `transform-origin` no elemento que ganha foco.
- Movimento de câmera ~700–1100 ms; **cada estado precisa de tempo de leitura além da transição**.
- Sequência desktop ~14–18 s como ponto de partida, ajustável pelo conteúdo.
- **Proibido:** cursor falso, digitação longa, entrada animada linha a linha, desfoque duplicado (palco + filhos),
  zoom que prejudique nitidez, reset abrupto, laço ambiente competindo com a ação.
- Pausa e replay discretos, alcançáveis por teclado. `prefers-reduced-motion` → **F5 completo e estático**.

## 6. Mobile (composição própria, três momentos)

`demanda → execução → resultado`. Menos planos simultâneos: P0 sai; P1 e P2/P3 nunca dividem a tela ao mesmo tempo.
**Texto essencial ≥ 14 px** (metadado pode ser menor, mas não carrega a explicação). Validar em 390, 360 e uma
largura intermediária, e a troca entre breakpoints.

## 7. Contratos (arrumar ao consolidar)

`stage/types.ts` ainda descreve "toca a timeline quando visível", `loop` e "escala por ResizeObserver" — nada disso
existe. A descrição acessível não pode narrar ações que o frame estático não executa. O dimensionamento do Hero
**não** pode alterar `StagePoster` (login e seções) — contratos separados.

## 8. Ordem de trabalho

1. **Frames estáticos primeiro**, renderizados num playground, revisados em 1440×900 e 1240×751.
2. Só então a primeira transição (F1→F2), verificada isoladamente.
3. Depois execução e resultado; duas reproduções completas observadas.
4. Depois mobile. Depois integração no hero e verificação de login/posters.

Enquanto o Hero não estiver resolvido, a expansão estética das demais seções está **congelada**.
