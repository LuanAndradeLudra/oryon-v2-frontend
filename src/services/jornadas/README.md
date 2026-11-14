# Jornadas — telas com dados de exemplo (ORY-60)

As telas do Motor de Jornadas foram feitas **antes do backend**, com dados de exemplo.
Este README diz o que é de exemplo, o que trocar e onde cada tela busca os dados.

- Épico: **ORY-48** (Motor de Jornadas). Esta parte: **ORY-60** (telas), dentro da **ORY-51**.
- Desenho completo: `docs/jornadas/MOTOR-DE-JORNADAS.md` (com `.html`), principalmente:
  - §2.3 (tabelas);
  - §2.4 (gatilhos);
  - §2.5 (passos);
  - §2.10 (rotas e MCP);
  - §2.11 (telas);
  - Anexo A (o que o ORY-11 já entrega).
- Branch: `story/ORY-51-telas-das-jornadas`, que sai de `epic/ORY-48-motor-de-jornadas`. Esta, por sua vez, sai do `epic/ORY-11-api-plataforma-mcp` do frontend.
  - Essa base está alguns commits atrás da `master`. Traga a `master` antes de continuar.
- Dependência nova: `@xyflow/react` (React Flow 12, MIT), para o canvas (decisão 11).

## Onde fica cada coisa

| Arquivo | O que é |
|---|---|
| `tipos.ts` | Os formatos das rotas `/v1/journeys`. **É o contrato que o backend deve devolver.** |
| `catalogo.ts` | O catálogo de passos, eventos e operações do conector. No produto vem de `GET /v1/journeys/catalog`. A tela gera o formulário de cada passo a partir dele. |
| `jornadasApi.ts` | **A única porta das telas para os dados.** A interface `JornadasApi` tem uma função por rota; a implementação de hoje é a de exemplo. |
| `dados-exemplo.ts` | As jornadas, receitas, pessoas e números inventados. Sai quando a API real entrar. |
| `validar.ts` | Validação ao vivo do desenho (§2.11). O backend repete a mesma regra no `validate` e no `publish`. |
| `simulador.ts` | O "Testar" (contato de teste + relógio adiantado), rodando na tela. |
| `layout.ts` | O botão "Organizar" (camadas de cima para baixo). |
| `src/components/jornadas/` | As telas: lista, galeria, editor (canvas, paleta, painel), testar, simular, publicar, pessoas e resultados. |
| `src/pages/JornadasPage.tsx` e `JornadaPage.tsx` | As rotas `/jornadas` e `/jornadas/:id`. |

## Como ligar o backend (ORY-62)

1. Crie `jornadasApiReal` em `jornadasApi.ts`, com as **mesmas assinaturas** de `JornadasApi`, chamando as rotas da tabela abaixo pelo cliente HTTP do app.
2. Troque a linha `export const jornadasApi: JornadasApi = jornadasApiDeExemplo` por `jornadasApiReal`. O aviso "Protótipo com dados de exemplo" some sozinho.
3. Troque `CATALOGO_EXEMPLO` (que o `validar.ts` e o editor usam) pelo catálogo lido da API.
4. Apague `dados-exemplo.ts` e a função `restaurarExemplos`.

| Função | Rota (planejada na ORY-61) | Observação |
|---|---|---|
| `listar` | `GET /v1/journeys` | Resumo com números de 30 dias e erros de 24 h |
| `ver` | `GET /v1/journeys/{id}` | Com o rascunho (`draft`) e `enrolledByVersion` |
| `catalogo` | `GET /v1/journeys/catalog` | Passos, eventos, operações, campos de condição |
| `apoio` | já existem na v1 do ORY-11 | `/v1/templates`, `/v1/whatsapp-numbers`, `/v1/tags`, `/v1/stages`, `/v1/users`, `/v1/departments` |
| `receitas` | `GET /v1/journeys/recipes` | Galeria |
| `criar` | `POST /v1/journeys` | Vazio ou com `recipeId` |
| `salvarRascunho` | `PATCH /v1/journeys/{id}/draft` | Mandar a versão esperada; **409** se outra pessoa salvou antes |
| `validar` | `POST /v1/journeys/{id}/validate` | |
| `simular` | `POST /v1/journeys/{id}/simulate` | Não executa nada |
| `publicar` | `POST /v1/journeys/{id}/publish` | **Duas etapas** (padrão do ORY-11): sem `X-Oryon-Confirmation`, responde `422 confirmation_required` com a prévia e o token; com o token, publica |
| `pausar` | `POST /v1/journeys/{id}/pause` | Uma etapa (parar é seguro) |
| `retomar` | `POST /v1/journeys/{id}/resume` | **Duas etapas** |
| `inscricoes` | `GET /v1/journeys/{id}/enrollments` | |
| `linhaDoTempo` | `GET /v1/enrollments/{id}/timeline` | |
| `tirarDaJornada` | `DELETE /v1/enrollments/{id}` | |
| `porQueNaoEntrou` | `GET /v1/journeys/{id}/why-not?contactId=` | No exemplo busca por nome; no real, escolher o contato e mandar o id |
| `resultados` | `GET /v1/journeys/{id}/analytics` | |

**Testar:** hoje roda na tela (`simulador.ts`). No produto, o teste roda no backend com um contato marcado como teste (`POST /v1/journeys/{id}/test-run`). O relógio avança só para essa inscrição. A tela pode continuar igual, trocando `iniciarTeste`/`avancarTeste` por chamadas à API.

## O que já está decidido e a tela respeita

- **O status é a chave**, sem flag nova: rascunho, sombra, ativa, pausada.
- **Duas etapas** em publicar e retomar. Pausar tem uma etapa só.
- **Permissões:** a rota `/jornadas` abre para supervisor e acima (`lib/rotasPorPapel.ts`). A trava fina, em que o supervisor monta e pausa e só o admin publica e retoma, entra com a API, pelo papel devolvido.
- **Celular:** só leitura. O canvas fica sem paleta e sem arrastar, e "Nova jornada" mostra o `MobileFeatureGate`.
- **Selos com fundo sólido em tom suave, sem borda colorida** (padrão do app).
- **IA com custo à vista:** a paleta, o painel e a barra do topo mostram os créditos (0,2 na pergunta rápida, 1 na missão). Os passos do próximo épico (tarefa de bastidor, aprovação humana) aparecem como "Próximo épico" e não podem ser usados.
- **Limite do plano:** as jornadas ativas contam no limite `automations` (2, 5, 15 ou sem limite), e as do sistema não contam. Isso entra com o backend (ORY-59).

## Como ver localmente

```bash
npm run dev
```

Há dois jeitos:

- **Sem backend e sem login:** abra `http://localhost:5173/jornadas-previa.html`.
  - Use `?rota=/jornadas/j_confirmacao` para abrir direto uma jornada, e `&tema=light` para o tema claro.
  - Por baixo é o mesmo backend em memória da demonstração da landing (`src/demo/`), e nenhuma requisição sai.
  - O que você muda some ao recarregar.
  - Arquivos: `jornadas-previa.html` e `src/demo/jornadas/`. Eles não entram no build, porque o `vite.config.ts` só empacota `index.html` e `demo.html`.
- **No app de verdade:** entre com um supervisor ou admin e abra **Jornadas** no menu (ou `/jornadas`).
  - O que você muda fica guardado no navegador (`localStorage`, chave `oryon.jornadas.exemplo.v1`).
  - O botão "Restaurar exemplos", no aviso do topo, volta tudo ao início.

Roteiro rápido para ver tudo:
1. **Reduzir faltas — confirmação de consulta:**
   - Desenho: os contadores por passo; "Testar" com os quatro ramos (confirmou, cancelou, outra resposta, silêncio); "Simular"; "Publicar mudanças", que mostra a prévia e depois a confirmação.
   - Pessoas: a linha do tempo de cada pessoa e o "Por que não entrou?" (tente Marcos, Lúcia, Pedro, Joana ou Renata).
   - Resultados: o funil, as respostas e a comparação v2 × v3.
2. **Boas-vindas a quem chega pelo site:** é um rascunho com um erro de propósito. O modelo ainda não foi aprovado pela Meta, e a validação barra a publicação.
3. **Galeria de receitas:** criar uma jornada a partir de "Recuperar cancelados", que usa a missão do agente (IA).
