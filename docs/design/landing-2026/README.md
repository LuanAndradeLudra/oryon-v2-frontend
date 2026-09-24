# Porta de entrada — página inicial (`/`) e login (`/login`)

Épico SCRUM-1097 · fase aberta em 24/09/2026 · plano aprovado pelo PO.

## Decisões fechadas (PO)
1. Landing pública em `/` + login separado em `/login`.
2. Estética **dark-first tecnológica** (Linear / Vercel / Claude); tema claro pelo toggle.
3. Login: "Esqueci a senha" fica; **sem "Criar conta" público**; espaço para SSO/Google **sem botão que não
   funcione** (não há OAuth no backend → `SSO_PROVIDERS = []`, nada renderiza).
4. Ilustração: **telas reais do app com dados de demonstração**, animadas como se estivessem sendo operadas
   (referência: hero da Attio — headline e, logo abaixo, o produto operando).
5. Pode afirmar "conexão oficial via WhatsApp Business API (Meta)". **Sem** contato público (a página termina
   em "Entrar"). Agente fictício das cenas: **"Agente Vendas"**.
6. Seção de **Planos** e a rota `/pricing` saem. `src/config/plans.ts` fica (usado pós-login).
7. O handoff de landing de junho (`design-system/landing-brief/`) está **descartado** — não usar nada dele.

## Regras da casa que valem aqui
- **P14 — nada falso na tela**: sem número sem fonte, sem depoimento/logo inventado, sem botão/link morto,
  sem módulo desligado vendido como pronto (fora: Agendamentos, Conectores, Copilot, Automações, Marketing, Nexus).
- Plus Jakarta Sans (fechado), Lucide, teal como cerimônia (90/10: 1 CTA + avatar de IA por seção), raios da
  régua (card 8 / botão 7), bordas 1 px, sombra só no frame do palco.
- Vocabulário P15: *Agente IA* (nunca "bot"), *Atendente*, *Conversas*, *Leads*, *Funis · Negócios*,
  *Disparos · Modelos de mensagem*, *Situação · Etapa · Etiquetas*, *Setores*, *Assumir / Devolver à IA*.
- Primitivo antes de valor; medir ao vivo por número; **território por arquivo** (abaixo); quem precisa de
  token/`ui/` novo pede ao orquestrador.
- Checklist anti-genérico: sem logo gigante centralizada, glow atrás de logo, badge "AI-powered", eyebrow
  decorativo, gradiente roxo, emoji, shimmer, mockup 3D/tilt; H1 ≤ 10 palavras.
  **EXCEÇÕES PEDIDAS PELO PO (24/09) — não remover, não "limpar":** os **feixes animados do fundo do login**
  (`ui/LoginBeams.tsx`) e a **headline com palavra rotativa** no login. Eu as tinha posto neste checklist por
  conta própria; o PO as quer de volta. `ui/LoginBeams.tsx` **não** será apagado no fecho.

## Mensagem e argumentos (copy nasce em `src/components/landing/landingCopy.ts`)
Âncora: **"Seu WhatsApp atende sozinho — e o humano entra na hora certa."**
1. Atende sozinho, 24/7 (Agentes IA por linha; debounce; tom por regra).
2. O humano entra na hora certa (chip âmbar IA / verde humano; *Assumir*, *Devolver à IA*; regras em 3 camadas).
3. A IA não inventa (guarda de verificação: valor, horário, nome, ação → *Verificação necessária · Mensagem retida*).
4. Tudo em um lugar (inbox com várias linhas e setores, Leads, Funis, Disparos com modelos aprovados e janela de 24 h, Relatórios).
5. Fala a língua do negócio (vocabulário por vertical).
6. Conexão oficial WhatsApp Business API (Meta).

## Território por frente
| Frente | Dono | Arquivos exclusivos |
|---|---|---|
| A | Orquestrador | `src/App.tsx`, `src/index.css`, `src/components/ui/**`, `src/__tests__/smoke.test.tsx`, `public/**`, `stage/types.ts` + `stage/index.ts` (contrato congelado), `docs/design/landing-2026/*` |
| B | Cartógrafo | `src/components/landing/stage/**` (exceto `types.ts`/`index.ts`) |
| C | Farol | `src/pages/WelcomePage.tsx`, `src/components/landing/sections/**`, `src/components/landing/landingCopy.ts`, `src/pages/WelcomePage.test.tsx` |
| D | Bússola | `src/pages/{Login,ForgotPassword,ResetPassword}Page.tsx`, `src/components/auth/**`, `src/pages/LoginPage.test.tsx` |

Contrato: `stage/types.ts` (`HeroStage`, `StagePoster`, `STAGE_DESIGN`, `STAGE_DEMO_LABEL`). C e D consomem
só `@/components/landing/stage` (index) e `@/components/ui/*`; não se importam. No login o poster entra por
`lazy()` (LoginPage é import estático do App). Achados de auditoria cruzada em `audit-<frente>.md` aqui.

## Ondas
1. Dia 0 (A): contrato + stubs, `/pricing` removido, README, briefings. ✔
2. Onda 1 (paralela): B palco (frame, motor, primitivos, cena inbox, poster) · C landing (nav, hero com stub,
   seções, copy) · D auth (AuthLayout, login, forgot, reset, testes).
3. Onda 2: B entrega inbox → C/D trocam stub; B faz funil e disparo; C liga abas; A mede.
4. Onda 3: polimento cruzado (B audita D; C audita fidelidade de B; D audita C) — 2 ciclos; A mede e consolida
   no `LEDGER.md`.
5. Fecho (A): apagar `ui/LoginBeams.tsx`, smoke, typecheck/lint/test/build, merge no épico. Sem push/PR.

## Verificação (A, ao vivo, 2 temas, 1440 e 390)
LCP < 2,5 s (elemento = H1/frame DOM); alturas por `[data-section]`; contraste AA; 390 sem overflow-x e
palco `compact`; `data-stage-playing="false"` fora da viewport, ~0 rAF em 2 s; reduced-motion → poster;
login 401 → `role=alert`, Tab alcança o olho, Enter envia; build com o palco fora do chunk de entrada.
