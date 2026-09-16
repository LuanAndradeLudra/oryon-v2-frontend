# Gaps — Conectores (Fase B: spec × código, estático)

Leitura só, zero edição. Pra cada item de `spec/conectores.md`: código
responsável (arquivo:linha) + veredito. `✅` bate · `❌` difere (valor atual
explícito) · `❓` só dá pra confirmar ao vivo · `[!]` exige dado/backend
inexistente.

**Arquivos lidos:** `src/components/connectors/ConnectorCard.tsx`,
`ConnectorTile.tsx`, `ConnectorDetailModal.tsx`, `ConnectorCredentialModal.tsx`,
`src/components/settings/sections/ConnectorsSettings.tsx`. Também abertos por
necessidade: `src/components/ui/ComingSoonBadge.tsx`, `.color-chip` em
`src/index.css:732-736`, `src/components/ui/Modal.tsx`, `src/components/ui/
Button.tsx` (primitivos consumidos — `ui/`, fora do escopo de qualquer leva
editar, citados só pra rastrear a origem do valor).

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
estado (`--okbg`/`--ok`, `--amberbg`/`--amber`). É um mixin de UM padrão
visual (usado em chips de tag/etapa em várias telas do produto), aplicado
aqui a um padrão visual DIFERENTE do mock. Todo item que usa `.color-chip`
pra um badge de estado (Instalado/Business/Disponível) marca `❌` por causa
disso — repetido caso a caso abaixo, não é 1 achado só.

**Nota de arquitetura (nível de tela, não item):** `ConnectorsSettings.tsx:1-4`
documenta explicitamente que é "UI estática de exemplo... zero serviço real
por trás ainda" (`CONNECTORS`/`connectorsMock`, sem API). Isto é esperado e
**não é gap** — mesma natureza do que já está registrado sobre a leva 9
(Agendamentos) na memória do projeto. Não repetir isso item a item abaixo.

---

## CONN-CAT (12 itens)

| Item | Status | Código | Nota |
|---|---|---|---|
| CONN-CAT-01 Header, breadcrumb | ✅ | `ConnectorsSettings.tsx:71-79` `<SectionHeader breadcrumb={['Automação','Integrações','Conectores']} ...>` | Bate — usa o primitivo `SectionHeader`, mesma estrutura. |
| CONN-CAT-02 Título 20px/700 | ❓ | `SectionHeader` não lido nesta Fase B | Tipografia do título vem do primitivo `SectionHeader.tsx` — não confirmado por leitura direta. |
| CONN-CAT-03 Subtítulo | ✅ | `ConnectorsSettings.tsx:73` `description="Conecte sistemas externos aos agentes de IA. Instale uma vez aqui; depois ative por agente na aba Skills de cada um."` | Texto **idêntico, literal**, ao do mock. |
| CONN-CAT-04 Botão "Solicitar integração" | ✅ | `ConnectorsSettings.tsx:76-78` `variant="neutral"` | Bate — variant correto, ícone `MessageSquarePlus`, `size="sm"` (o mock não especifica o `size` do `Button` primitivo, mas a altura de 32px é plausível pro `sm`). |
| CONN-CAT-05 Toolbar, border-bottom | ✅ | `ConnectorsSettings.tsx:83` `border-b border-surface-800/60` | Bate a estrutura. |
| CONN-CAT-06 Busca 340px/32px | ✅ | `ConnectorsSettings.tsx:84,91` `w-[340px] max-w-full`, `h-8` | 340px e 32px exatos. Placeholder também bate literalmente: "Nome, fornecedor ou o que faz…". |
| CONN-CAT-07 Dropdown Categoria (9 categorias, contagem) | ✅ | `ConnectorsSettings.tsx:95-124`, `categoryCounts` (`:34-39`) | Implementado com contagem por categoria (`categoryCounts.get(c)`), igual ao mock. Número real de categorias depende de `CONNECTOR_CATEGORIES` (`connectorsMock.ts`, não lido) — não confirmado se são exatamente 9. |
| CONN-CAT-08 SegmentedControl Todos/Instalados/Em breve | ✅ | `ConnectorsSettings.tsx:126-135` | Bate: mesmos 3 valores, com contagem (`count:`) em cada opção — usa o primitivo `SegmentedControl` (`ui/`), que já suporta contagem nativa. |
| CONN-CAT-09 Resumo "N no catálogo · N instalado" | ✅ | `ConnectorsSettings.tsx:137-139` | Texto praticamente idêntico ao mock (`"{CONNECTORS.length} no catálogo · {installedCount} instalado(s)"`). |
| CONN-CAT-10 Toggle grade/lista, 2 quadrados 32px | ✅ | `ConnectorsSettings.tsx:141-160` `w-7 h-7` | `w-7 h-7` = 28px, não 32px — `❌` no tamanho exato (4px de diferença), mas a estrutura (2 botões, ativo com `bg-surface-700`) bate. Ajustando veredito pro tamanho errado: **❌**. |
| CONN-CAT-11 Grade `repeat(5, 1fr)`, responsivo 2-6 colunas | ✅ | `ConnectorsSettings.tsx:166` `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6` | **Já implementado** o range completo de 2 a 6 colunas que a Fase A marcou como "só intenção, não renderizado" no mock — o código real vai ALÉM do que a Fase A conseguiu confirmar visualmente. Bom achado: a leva já cobriu isso. |
| CONN-CAT-12 Busca+categoria combinam (AND), estado na URL | ❌ | `ConnectorsSettings.tsx:26-30,41-50` `useState` puro (`search`, `category`, `status`, `view`) | Filtros COMBINAM corretamente (AND, mesmo `.filter()` encadeado, `:41-50`) — ✅ nessa metade. Mas **nada vai pra URL** (`useSearchParams` não importado/usado). **Já documentado** em `GAPS-PENDENTES.md` 10.1 como decisão consciente de escopo (mesmo padrão do gap 1.3 de Contatos). Marcar `[!]`, não `❌` de execução nova. |

**Resumo CONN-CAT:** 9 `✅` · 2 `❌` · 1 `[!]` (CONN-CAT-02 fica `❓`, recontar:
9 ✅, 2 ❌, 1 ❓, 1 [!] — 12 no total, ver tabela de status logo abaixo por
região é só a soma das linhas acima).

---

## CONN-CARD (25 itens)

| Item | Status | Código | Nota |
|---|---|---|---|
| CONN-CARD-01 Container (borda 1px, raio 8px, padding 14px, gap 10px, sem sombra) | ❌ | `ConnectorCard.tsx:40` `rounded-lg border bg-surface-900/40 p-3.5 gap-2.5` | Padding (`p-3.5`=14px) e gap (`gap-2.5`=10px) batem exatos. Raio (`rounded-lg`=8px) bate. **Fundo é `bg-surface-900/40` (40% opacidade), não sólido** como o mock pede ("fundo surface") — essa é a divergência real. Sem `box-shadow` explícito, bate "sem sombra". |
| CONN-CARD-02 Tile 40px, raio 9px | ✅ | `ConnectorTile.tsx:17,23-24` `size = 40, radius = 9` (default) | Exato. |
| CONN-CARD-03 Fórmula do fundo do tile (`--tilemix`) | ✅ | `ConnectorTile.tsx:25` `color-mix(in srgb, var(--brand) var(--connector-tile-mix), #fff)` | **Bate exatamente a fórmula do README** — usa o token `--connector-tile-mix`, não percentuais hardcoded como o bloco `4a` do mock (a divergência que a Fase A achou é só entre 2 PARTES do mock, o código real já segue a versão "definitiva"). Confirmado em `src/index.css:92` (`0%` escuro) e `:865` (`12%` claro) — bate literalmente com o README. |
| CONN-CARD-04 Tile no escuro: branco puro vs. PNG colorido | ✅ | mesmo `ConnectorTile.tsx:25` + `index.css:92` `--connector-tile-mix: 0%` | **O código está correto** — a 0% de mix o resultado É branco puro matematicamente (`color-mix(brand 0%, #fff)` = 100% `#fff`). A contradição achada na Fase A é entre o TEXTO do README e o PNG do MOCK, não entre o README e o código real. Conferir ao vivo (zoom no tile, tema escuro) pra confirmar que o browser realmente renderiza branco — se sim, o "gap" era só do gerador de PNG do mock, não do produto. |
| CONN-CARD-05 Borda do tile (`--tilebdmix`) | ❌ | `ConnectorTile.tsx:26` `borderColor: 'color-mix(in srgb, var(--brand) 22%, #fff)'` | **22% fixo, sempre** — não usa nenhum token `--connector-tile-border-mix` equivalente ao `--connector-tile-mix` do fundo. No tema escuro a borda deveria ir a 0% (README: par de tokens 12%/22% claro, 0%/0% escuro) mas o código aplica 22% nos 2 temas. `❌` real — falta o token par pra borda. |
| CONN-CARD-06 Inicial no tile (fallback) | ✅ | `ConnectorTile.tsx:33-38` `font-extrabold`, `fontSize: size * 0.425` | `size * 0.425` com `size=40` = 17px — bate exato com o "17px/800" do mock (`font-extrabold` = 800). |
| CONN-CARD-07 Opacidade do tile em "Em breve" | ✅ | `ConnectorTile.tsx:30` `connector.status === 'comingSoon' && 'opacity-70'` | `.7` exato. |
| CONN-CARD-08 Badge "Instalado" | ❌ | `ConnectorCard.tsx:9,50-57` `.color-chip` com `chip: 'var(--color-success)'` | Ver achado geral do `.color-chip` no topo — produz pill sólido verde-escuro + texto branco, não o fundo claro (`--okbg`) + texto verde (`--ok`) do mock. Ícone de check bate (`w-2.5 h-2.5` = 10px). |
| CONN-CARD-09 Badge "Business" | ❌ | `ConnectorCard.tsx:10` `.color-chip` com `chip: 'var(--color-warning)'` | Mesmo problema do `.color-chip` — deveria ser `--amberbg`/`--amber`, é sólido âmbar-escuro + branco. Ícone de cadeado bate. |
| CONN-CARD-10 Badge "Em breve" | ❌ | `ConnectorCard.tsx:48-49` `<ComingSoonBadge />` | `ComingSoonBadge` (primitivo `ui/`) usa **borda tracejada**, `rounded-[4px]`, `uppercase`, `10px` — o mock quer borda SÓLIDA, `border-radius:5px`, texto normal (não uppercase), `10.5px/700`, com ícone de relógio. Divergência visual real, mas o componente reusado é primitivo compartilhado — a leva PODE optar por não usá-lo aqui e montar um chip próprio (mesmo padrão que outras levas já usaram quando um primitivo genérico não encaixava num mock específico), sem precisar editar `ui/`. |
| CONN-CARD-11 Ausência de badge (Disponível) | ✅ | `ConnectorCard.tsx:48-58` `comingSoon ? <ComingSoonBadge/> : badge && (...)` | Quando `status` não tem entrada em `STATUS_BADGE` (que só define `installed`/`business`) e não é `comingSoon`, `badge` é `undefined` e nada renderiza — bate a regra "Disponível não tem badge". |
| CONN-CARD-12 Nome do conector 13px/600 | ✅ | `ConnectorCard.tsx:62-64` `text-[13px] font-semibold` | Exato. |
| CONN-CARD-13 Nome em "Em breve" (cor rebaixada) | ✅ | `ConnectorCard.tsx:62` `comingSoon ? 'text-surface-400' : 'text-surface-100'` | Bate a intenção (cor mais fraca em breve), token exato (`--tx2`) não confirmado mas plausível. |
| CONN-CARD-14 Linha "Categoria · por Fornecedor" 11px terciário | ✅ | `ConnectorCard.tsx:65` `text-2xs text-surface-500` | `text-2xs` (provável 11px na escala nova) + `text-surface-500` (terciário) — bate a intenção; texto real: `{connector.category} · por {connector.vendor}`, sempre com fornecedor (o mock às vezes omite "por Fornecedor" quando não existe) — não confirmado se o código trata fornecedor ausente. |
| CONN-CARD-15 Descrição 12px/1.45, flex:1 | ✅ | `ConnectorCard.tsx:68-70` `text-xs leading-[1.45] flex-1` | Bate exato — `leading-[1.45]` literal. |
| CONN-CARD-16 Rodapé, métrica + CTA | ❌ | `ConnectorCard.tsx:72` `flex items-center justify-between gap-2` | Sempre `justify-between` (nunca `flex-end`), mesmo quando `metric` é `undefined` — nesse caso sobra um espaço vazio à esquerda em vez do CTA colar na direita como o mock faz quando não há métrica (ex. "Disponível"/"Business" sem métrica). Diferença de alinhamento pequena mas real. |
| CONN-CARD-17 Métrica "N agentes" | ✅ | `ConnectorCard.tsx:29-30` | Bate. |
| CONN-CARD-18 Métrica "N pedidos" (em breve) | ❌ | `ConnectorCard.tsx:31-33` `comingSoon \|\| connector.status === 'business' ? ... : undefined` | O código mostra "N pedidos" também pro estado **`business`** (bloqueado por plano) — o mock (card HubSpot, `4a`) NÃO mostra métrica nenhuma pro estado business, só o CTA "Ver planos" sozinho à direita. `❌` real: métrica extra que o mock não tem nesse estado específico. |
| CONN-CARD-19 CTA "Gerenciar" (neutral) | ✅ | `ConnectorCard.tsx:23` `variant: 'neutral'` | Bate. |
| CONN-CARD-20 CTA "Conectar" (primary) | ✅ | `ConnectorCard.tsx:26` `variant: 'primary'` | Bate (é o `default` do `cta` — status não listado explicitamente cai aqui). |
| CONN-CARD-21 CTA "Ver planos" (neutral) | ✅ | `ConnectorCard.tsx:24` `variant: 'neutral'` | Bate. |
| CONN-CARD-22 CTA "Priorizar" (ghost) | ✅ | `ConnectorCard.tsx:25,77` `variant: 'ghost'`, `className: 'text-surface-400'` | Bate variant; cor customizada extra (`text-surface-400`) não contradiz o mock (ghost já é neutro/apagado por padrão). |
| CONN-CARD-23 Regra de 1 CTA único | ✅ | `ConnectorCard.tsx:22-27,74-81` — a função `cta` sempre retorna EXATAMENTE 1 objeto `{label, variant}` | Estrutura do código já força 1 único CTA por construção (não há como renderizar 2). |
| CONN-CARD-24 Borda tracejada em "Em breve" | ✅ | `ConnectorCard.tsx:41-43` `comingSoon ? 'border-dashed border-surface-700 ...' : 'border-surface-800 ...'` | Bate. |
| CONN-CARD-25 Card inteiro clicável | ✅ | `ConnectorCard.tsx:36-38` `<button type="button" onClick={onOpen} ...>` | O card INTEIRO é um `<button>` — bate, inclusive pro estado `comingSoon` (não há `disabled` condicional no elemento). |

**Resumo CONN-CARD:** 16 `✅` · 9 `❌` · 0 `❓` · 0 `[!]`.

---

## CONN-DET (30 itens)

| Item | Status | Código | Nota |
|---|---|---|---|
| CONN-DET-01 Container 760×460, raio 10px, sem faixa | ✅ | `ConnectorDetailModal.tsx:58` `w-[760px] max-w-full h-[460px] max-h-[90vh] ... rounded-[10px] ... flex` | Exato — inclusive confirma "sem faixa" (não há elemento de topo colorido antes do `flex` de 2 colunas). |
| CONN-DET-02 Coluna esquerda 240px, tinta 7% | ✅ | `ConnectorDetailModal.tsx:61-66` `w-[240px]`, `color-mix(in srgb, ${brandColor} ${comingSoon ? 5 : 7}%, var(--color-surface-900))` | Bate exato, inclusive a variante 5%/7% por estado (ver CONN-DET-15). |
| CONN-DET-03 Tile 52px | ✅ | `ConnectorDetailModal.tsx:68-74` `w-[52px] h-[52px] rounded-[10px] bg-white`, `boxShadow: inset 0 -3px 0 ${brandColor}` | Exato, inclusive o `inset` de 3px. |
| CONN-DET-04 Nome 17px/700 | ✅ | `ConnectorDetailModal.tsx:76` `text-[17px] font-bold` | Exato. |
| CONN-DET-05 "por Fornecedor · versão" | ✅ | `ConnectorDetailModal.tsx:77-79` `por {vendor}{version ? ' · ' + version : ''}` | Bate, com fallback correto quando não há versão. |
| CONN-DET-06 Chips categoria + estado | ✅ | `ConnectorDetailModal.tsx:81-95` | Estrutura bate (2 chips lado a lado). |
| CONN-DET-07 Chip "Disponível" (okbg/ok) | ❌ | `ConnectorDetailModal.tsx:88-93` `.color-chip` com `--chip: connector.status === 'installed' ? 'var(--color-success)' : 'var(--color-brand-500)'` | Mesmo problema do `.color-chip` (ver topo) — sólido, não claro+colorido. Além disso, o estado "Disponível" usa `--color-brand-500` (teal), não `--color-success` (verde) como o "Instalado" — o mock usa `--okbg`/`--ok` (verde) pros dois. **2 divergências**: mixin errado + cor errada pro estado Disponível. |
| CONN-DET-08 Chip "Em breve" (na coluna) | ❌ | `ConnectorDetailModal.tsx:85-86` `<ComingSoonBadge />` | Mesmo componente genérico do CONN-CARD-10, mesma divergência (dashed/uppercase vs. sólido/normal). |
| CONN-DET-09 Ficha técnica, hairline | ✅ | `ConnectorDetailModal.tsx:97` `divide-y divide-surface-800/70` | Bate a intenção (hairline entre linhas via `divide-y`). |
| CONN-DET-10 Linha da ficha (label+valor) | ✅ | `ConnectorDetailModal.tsx:224-231` `FichaRow` — `text-2xs text-surface-500` (label) / `text-xs text-surface-300 mt-0.5` (valor) | Estrutura bate; `font-weight:500` do mock pro valor não confirmado explicitamente na classe (`text-xs` sozinho não define peso — herda 400 normal, não 500 do mock). `❓`/`❌` leve — marcar **❌** no peso do valor. |
| CONN-DET-11 Campos ficha (Doctoralia, disponível) | ✅ | `ConnectorDetailModal.tsx:102-106` `{auth && <FichaRow .../>}` etc. | Estrutura data-driven bate os 4 campos condicionalmente — conteúdo real depende de `connectorsMock.ts` (não lido), mas o MECANISMO bate. |
| CONN-DET-12 Campos ficha (em breve, com "Fila") | ✅ | `ConnectorDetailModal.tsx:98-99` `comingSoon ? <FichaRow label="Fila" value={...} /> : (...)` | Bate exatamente a troca de campo pro estado em breve. |
| CONN-DET-13 CTA fixo rodapé (disponível) | ✅ | `ConnectorDetailModal.tsx:110-118` `size="md"`, `className="w-full mt-3"` | Bate — largura total, botão primary quando disponível. |
| CONN-DET-14 CTA fixo rodapé (em breve) | ✅ | `ConnectorDetailModal.tsx:112,114,117` `variant="neutral"`, ícone `Clock`, texto "Priorizar" | Bate — ícone de relógio (não seta-pra-cima como a Fase A supôs pelo HTML do mock, mas cumpre a mesma intenção "aguardando"). Nota: Fase A leu ícone de seta no HTML (`m18 15-6-6-6 6`), código usa `Clock` — **❌ leve no ícone específico**, mantendo o resto ✅. Ajustando: **❌** por causa do ícone. |
| CONN-DET-15 Coluna esquerda variante "em breve" (5%, dashed) | ✅ | `ConnectorDetailModal.tsx:62-66` já citado acima | 5% e `border-dashed` batem exatos. |
| CONN-DET-16 Tile em "em breve" (opacidade) | ❌ | `ConnectorDetailModal.tsx:68-70` sem `opacity` condicional no tile | O tile de 52px NÃO tem `opacity:.8` (nem `.7`) no estado comingSoon — só o `boxShadow` (inset) é condicionalmente removido (`comingSoon ? undefined : ...`), a opacidade do tile inteiro não muda. `❌` real. |
| CONN-DET-17 Header de abas | ✅ | `ConnectorDetailModal.tsx:123-134` usa `Tabs` (primitivo) | Estrutura bate (abas + X na mesma linha). |
| CONN-DET-18 Aba ativa (inset shadow 2px) | ❓ | `Tabs.tsx` não lido nesta Fase B | Tratamento visual da aba ativa vem do primitivo — não confirmado se usa `box-shadow: inset 0 -2px 0` ou outro mecanismo (ex. `border-bottom`). |
| CONN-DET-19 3 Abas (Visão geral/Como funciona/Requisitos) | ✅ | `ConnectorDetailModal.tsx:129-133` | Nomes idênticos, literais. |
| CONN-DET-20 Botão fechar (×) na linha das abas | ✅ | `ConnectorDetailModal.tsx:123,135-142` `flex items-center justify-between` | Bate — X na MESMA linha das tabs, canto direito, `w-7 h-7` = 28px (mock: 28px, exato). |
| CONN-DET-21 Corpo da aba, padding 18-20px | ✅ | `ConnectorDetailModal.tsx:146` `px-5 py-[18px]` | `px-5` = 20px, `py-[18px]` = 18px — exato nos 2 eixos. `text-[13px] leading-[1.55]` também exato. |
| CONN-DET-22 Banner "em breve" (neutro) | ✅ | `ConnectorDetailModal.tsx:152-155` `<Banner variant="neutral">` texto quase idêntico ao mock | Texto real: "Ainda não construída. Ao priorizar, você recebe um aviso quando ficar disponível — e o pedido conta na nossa fila." — **idêntico, literal**, ao que a Fase A extraiu do HTML. |
| CONN-DET-23 Parágrafo de descrição funcional | ✅ | `ConnectorDetailModal.tsx:160` `<p>{connector.howItWorks}</p>` | Estrutura bate; conteúdo real depende do mock de dados. |
| CONN-DET-24 Eyebrow "O que o agente passa a fazer" | ✅ | `ConnectorDetailModal.tsx:163-165` texto idêntico, `text-2xs font-bold uppercase tracking-wide text-surface-500` | Bate — mas cor é `text-surface-500` (terciário) SEMPRE, não `--acs` (acento) como o mock pede pro estado disponível. **❌** de cor — o eyebrow nunca fica na cor de acento, é sempre neutro. |
| CONN-DET-25 Eyebrow "Previsto" (em breve, cor neutra) | ❌ | não encontrado texto "Previsto" | O código não tem uma aba/seção "Previsto" separada pro estado comingSoon — reusa a MESMA seção "O que o agente passa a fazer" (`connector.capabilities`) pros dois estados, só estilizando os mini-cards como tracejados (ver CONN-DET-28). Rótulo "Previsto" do mock não existe no código. |
| CONN-DET-26 Grid 2×2 de mini-cards | ✅ | `ConnectorDetailModal.tsx:166` `grid grid-cols-2 gap-2.5` | Bate. |
| CONN-DET-27 Mini-card (disponível) | ✅ | `ConnectorDetailModal.tsx:170-177` `rounded-[7px] border ... border-surface-800 bg-surface-800/40` | Raio exato (7px). Mock não define fundo pro mini-card disponível (só borda) — código adiciona `bg-surface-800/40`, extra não-contraditório. |
| CONN-DET-28 Mini-card (em breve, tracejado) | ✅ | `ConnectorDetailModal.tsx:172` `comingSoon ? 'border-dashed border-surface-700' : ...` | Bate — tracejado no estado certo. |
| CONN-DET-29 Rodapé prova social + link | ✅ | `ConnectorDetailModal.tsx:207-216` `{(socialProof \|\| guideUrl) && (...)}` | Bate — só aparece condicionalmente, mesma regra do mock (ausente no exemplo "em breve"). |
| CONN-DET-30 Bloqueado por plano (Banner âmbar + Ver planos) | ✅ | `ConnectorDetailModal.tsx:147-150` `<Banner variant="warning">Disponível no plano Business — o conteúdo abaixo continua legível, conectar exige upgrade.</Banner>` | **Já implementado**, e melhor do que a Fase A conseguiu confirmar (o mock não tinha exemplo renderizado desse estado — a Fase A tinha marcado como "estimado por analogia"). O texto real do código nem é o mesmo do README (que também é truncado com "…"), mas cumpre a MESMA intenção (banner âmbar, conteúdo legível, CTA "Ver planos" já coberto no CONN-DET-14/`handleConnect`). Achado da Fase B resolve o `❓` da Fase A: **✅**, comportamento existe e é coerente. |

**Resumo CONN-DET:** 22 `✅` · 7 `❌` · 1 `❓` · 0 `[!]`.

---

## CONN-CRED (27 itens)

| Item | Status | Código | Nota |
|---|---|---|---|
| CONN-CRED-01 Container 520px | ✅ | `ConnectorCredentialModal.tsx:66` `className="max-w-[520px]"` | Exato. |
| CONN-CRED-02 Header, container | ✅ | `Modal.tsx:114` (primitivo) `px-5 py-4 border-b` | Vem do `Modal` genérico — bate a estrutura (o mock também usa header com borda inferior). |
| CONN-CRED-03 Tile 32px (header) | ✅ | `ConnectorCredentialModal.tsx:69` `<ConnectorTile connector={connector} size={32} radius={8} />` | Exato — `size={32}`; `radius={8}` (mock: 8px, README confere "tile de 32px" sem especificar raio exato, mas HTML mostrava `border-radius:8px` — bate). |
| CONN-CRED-04 Título 15px/700, verbo muda por estado | ✅ | `ConnectorCredentialModal.tsx:71-73` `text-[15px] font-bold`, `{status === 'installed' ? 'Credencial' : 'Conectar'} · {name}` | Bate exato, inclusive a troca de verbo achada como nuance na Fase A. |
| CONN-CRED-05 Subtítulo | ✅ | `ConnectorCredentialModal.tsx:74-76` `text-2xs text-surface-500` `"Válida para todo o workspace. Agentes escolhem usar ou não."` | Texto **idêntico, literal**, ao mock (exemplo Feegow). Variante Doctoralia ("Schema diferente...") não implementada — o código mostra o MESMO subtítulo fixo sempre, não um subtítulo dinâmico por conector. `❌` leve (subtítulo estático vs. dinâmico no mock), mas o caso coberto (Feegow) bate literal — manter **✅** com a ressalva. |
| CONN-CRED-06 Botão fechar (×) | ✅ | `Modal.tsx:118-124` (primitivo) | Herdado do `Modal` genérico. |
| CONN-CRED-07 Corpo, container | ✅ | `ConnectorCredentialModal.tsx:100` `flex flex-col gap-3.5` | `gap-3.5` = 14px — mock não especifica gap exato entre campos, plausível. |
| CONN-CRED-08 Label de campo + sufixo opcional | ✅ | `ConnectorCredentialModal.tsx:116,177` `requirement={field.optional ? 'optional' : undefined}`, `hint={field.hint}` | Mecanismo genérico via `FormField` (primitivo) — plausível que já trate o sufixo "· opcional" no padrão certo (não confirmado por leitura direta do `FormField.tsx`). `❓`. |
| CONN-CRED-09 Campo "Ambiente" (toggle Produção/Sandbox) | ✅ | `ConnectorCredentialModal.tsx:102-112` `field.kind === 'segmented'` → `<SegmentedControl>` | Mecanismo genérico existe e é usado condicionalmente por schema — bate a intenção (campo dinâmico por conector). Dados reais (se Feegow tem esse campo) dependem de `connectorsMock.ts`, não lido. |
| CONN-CRED-10 Campo texto simples, mono | ✅ | `ConnectorCredentialModal.tsx:176-184` `<Input>` sem `font-mono` explícito nesse branch | O branch "default" (campo de texto genérico, usado pra URL/ID) NÃO tem `className="font-mono"` — só o branch `secret` (`:136`) tem `className="font-mono pr-9"`. **❌**: o mock quer mono pra campos TÉCNICOS em geral (URL da API), não só os sensíveis; o código só aplica mono ao campo mascarado. |
| CONN-CRED-11 Campo mascarado, 2 formatos de máscara | ❌ | `ConnectorCredentialModal.tsx:134-140` `type={revealed ? 'text' : 'password'}` nativo do HTML | O código usa **máscara nativa do browser** (`type="password"`, esconde tudo) — NÃo reproduz nenhum dos 2 formatos do mock (`fg_live_••••7k2Q` com prefixo/sufixo visíveis, nem `dp_9f31c…e2a` com reticências). Divergência real e visível: o usuário não vê nenhuma pista do valor quando oculto, diferente da UX do mock. |
| CONN-CRED-12 Hint "Armazenado criptografado..." | ✅ | `ConnectorCredentialModal.tsx:150-152` texto idêntico, condicionado a `!erroredField` | Texto **idêntico, literal**. Condição de exibição (só quando não há erro) é uma regra a MAIS que o mock não define explicitamente, mas não contradiz. |
| CONN-CRED-13 Grid 2 colunas (campos curtos) | ❓ | não encontrado grid 2 colunas explícito em `ConnectorCredentialModal.tsx` | O componente é 100% data-driven (`schema.fields.map`, sempre 1 coluna, `flex flex-col`) — não achei um layout de grid 2 colunas pra campos curtos lado a lado (tipo "ID da clínica" + "Unidade padrão"). Se o schema real (`connectorsMock.ts`) não agrupar campos, o layout sai sempre empilhado verticalmente, não como o mock. `❓`/`❌` — sem ver `connectorsMock.ts` não dá pra confirmar 100%, mas a AUSÊNCIA de qualquer lógica de agrupamento no componente sugere **❌**. |
| CONN-CRED-14 Linha "Testar conexão" + resultado | ✅ | `ConnectorCredentialModal.tsx:187` `flex items-center gap-3 pt-1` | Bate a estrutura. |
| CONN-CRED-15 Botão "Testar conexão"/"Testar de novo" | ❌ | `ConnectorCredentialModal.tsx:188-190` texto sempre `"Testar conexão"`, nunca muda pra "Testar de novo" | O mock troca o texto do botão depois de uma falha (`"Testar de novo"`) — o código usa o MESMO texto sempre, independente de `testState`. `size="sm"` não explicitado (usa default do `Button`) — mock quer 32px, plausível que `sm` já seja isso (não confirmado). |
| CONN-CRED-16 Resultado sucesso | ✅ | `ConnectorCredentialModal.tsx:191-195` `text-success`, ícone `CheckCircle2`, texto "Conexão OK · {detail} · {ms} ms · {testedAt}" | Bate quase literal — falta o "✓" explícito no texto (o ícone `CheckCircle2` já cumpre esse papel visualmente). |
| CONN-CRED-17 Resultado erro (linha de status) | ✅ | `ConnectorCredentialModal.tsx:196-200` `"Falhou · {code} · há 5 s"` | Texto **idêntico** ao mock, incluindo o "há 5 s" fixo (não calculado dinamicamente — mesma simplificação que o mock, plausível ser proposital pro "casca visual"). |
| CONN-CRED-18 Erro inline no campo (borda + mensagem) | ✅ | `ConnectorCredentialModal.tsx:127-132` `error={erroredField === field.key && ... ? schema.testResult.message : undefined}` (via `FormField`) | Mecanismo bate — erro passado pro `FormField`, que presumivelmente pinta a borda (mesma ressalva `❓` do DEAL-MODAL-06 em Funis, primitivo não lido em detalhe). |
| CONN-CRED-19 Lista de permissões, container | ❌ | `ConnectorCredentialModal.tsx:159` `border border-surface-700 rounded-md divide-y divide-surface-800` | `rounded-md` = 8px na escala nova — mock pede 7px. 1px de diferença, técnico mas real. |
| CONN-CRED-20 Item de permissão concedida (check colorido) | ❌ | `ConnectorCredentialModal.tsx:162-167` `<input type="checkbox" ... accent-brand-500 />` | Checkbox NATIVO do browser (quadrado, cor de marca via `accent-*`), não o ícone de check customizado 13px em `stroke="var(--ok)"` do mock. Visual bem diferente (quadrado marcado vs. ícone check solto). |
| CONN-CRED-21 Item de permissão opcional (círculo vazio) | ❌ | mesmo `:162-167` — mesmo `<input type="checkbox">`, só desmarcado | Decorre do CONN-CRED-20: não há um círculo vazio customizado, é o MESMO checkbox nativo, só sem `checked`. Tag "opcional" à direita (`:169`) bate (`text-2xs text-surface-500`). |
| CONN-CRED-22 Footer, container | ✅ | `Modal.tsx:144-148` (primitivo) `px-5 py-4 border-t` | Herdado do `Modal` genérico. |
| CONN-CRED-23 Link "Remover credencial" | ✅ | `ConnectorCredentialModal.tsx:82-86` `text-danger`, só quando `status === 'installed'` | Bate a condição e a cor; é um `<button>` cru com `text-xs font-medium`, não o `Button` primitivo variant ghost-danger — resultado visual provavelmente equivalente (sem borda, cor de perigo), mas vale nota. |
| CONN-CRED-24 Texto substituto (schema novo) | ✅ | não encontrado literal "Salvar libera após um teste OK" no CORPO, mas SIM no `title` do botão (`:92`) | O texto existe como `title` (tooltip nativo do HTML), NÃO como texto visível permanente ao lado do botão como o mock mostra. **❌**: só aparece em hover/tooltip, não é um texto sempre visível. |
| CONN-CRED-25 Botão "Cancelar" (footer) | ❌ | `ConnectorCredentialModal.tsx:88` `variant="ghost"` | **Mesmo padrão errado do Funis** (DEAL-MODAL-12) — deveria ser `neutral` (com borda), é `ghost` (sem borda). Sistêmico entre as 2 telas. |
| CONN-CRED-26 Botão "Salvar credencial" (habilitado) | ✅ | `ConnectorCredentialModal.tsx:89-96` `variant="primary"` | Bate. |
| CONN-CRED-27 Botão "Salvar e conectar" (desabilitado, opacidade) | ❓ | `ConnectorCredentialModal.tsx:91` `disabled={testState !== 'success'}` — opacidade vem do `Button.tsx` (`disabled:opacity-40`) | Mecanismo de desabilitar bate; opacidade real é `.40` (padrão do primitivo `Button`), mock pede `.45` — diferença de 5 pontos percentuais, negligível mas tecnicamente `❌`. Marcar **❌** menor. |

**Resumo CONN-CRED:** 15 `✅` · 9 `❌` · 3 `❓` · 0 `[!]`.

---

## Resumo geral (94 itens)

| Região | ✅ | ❌ | ❓ | `[!]` |
|---|---|---|---|---|
| CONN-CAT | 9 | 2 | 1 | 1 |
| CONN-CARD | 16 | 9 | 0 | 0 |
| CONN-DET | 22 | 7 | 1 | 0 |
| CONN-CRED | 15 | 9 | 3 | 0 |
| **Total** | **62** | **27** | **5** | **1** |

**❌ por arquivo, em ordem de impacto:**

1. **`src/components/connectors/ConnectorCard.tsx` (+ `ConnectorTile.tsx`) —
   10 itens `❌`.** Fundo do card translúcido em vez de sólido
   (CONN-CARD-01), badges de estado usando `.color-chip` (mixin errado —
   CONN-CARD-08/09), badge "Em breve" com componente genérico incompatível
   (CONN-CARD-10), borda do tile sem token de tema (CONN-CARD-05), métrica
   extra no estado bloqueado-por-plano (CONN-CARD-18), alinhamento do
   rodapé sem métrica (CONN-CARD-16), toggle grade/lista 4px menor
   (CONN-CAT-10).
2. **`src/components/connectors/ConnectorCredentialModal.tsx` — 9 itens
   `❌`.** Máscara de valor sensível usa `type="password"` nativo em vez do
   padrão visual do mock (CONN-CRED-11), checkbox nativo em vez de
   ícone/círculo customizado (CONN-CRED-20/21), botão "Testar" não muda de
   texto (CONN-CRED-15), campo texto simples sem mono (CONN-CRED-10), sem
   grid 2 colunas pra campos curtos (CONN-CRED-13), texto de "salvar
   bloqueado" só em tooltip (CONN-CRED-24), `Cancelar` com variant errado
   (CONN-CRED-25, mesmo padrão do Funis).
3. **`src/components/connectors/ConnectorDetailModal.tsx` — 7 itens `❌`.**
   Chip "Disponível" com cor e mixin errados (CONN-DET-07), badge "Em
   breve" genérico (CONN-DET-08), tile sem opacidade no estado em breve
   (CONN-DET-16), ícone do CTA "Priorizar" diferente (CONN-DET-14), eyebrow
   nunca fica na cor de acento (CONN-DET-24), seção "Previsto" reaproveita
   o rótulo de "O que o agente passa a fazer" em vez de ter o próprio
   (CONN-DET-25), peso de fonte do valor na ficha técnica (CONN-DET-10).
4. **`src/components/settings/sections/ConnectorsSettings.tsx` — 1 item
   `❌`** (toggle grade/lista 28px vs. 32px, CONN-CAT-10 — já contado acima
   por afetar o mesmo arquivo do card).

**Achado transversal, não contado por arquivo:** `Button.tsx` (primitivo)
com `variant="ghost"` usado onde o mock pede um Cancelar com borda
(`neutral`) — se repete em CONN-CRED-25 **e** em `DEAL-MODAL-12` (spec de
Funis). Não é bug de um componente só, é um padrão de uso errado repetido
em pelo menos 2 telas — vale corrigir nos 2 lugares junto, não como itens
isolados.

**Boas notícias da Fase B** (itens que a Fase A não conseguiu confirmar e o
código JÁ resolve, sem precisar de Fase C): CONN-CAT-11 (grade 2-6 colunas
já implementada), CONN-DET-30 (banner de bloqueio por plano já existe, com
texto equivalente ao do README), CONN-CARD-03/04 (fórmula do tile já usa o
token certo — a "contradição" da Fase A era só entre 2 partes do MOCK, não
entre mock e código).
