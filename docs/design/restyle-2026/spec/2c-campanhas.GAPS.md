# Mapa de gaps — tela 2c · Disparos/Campanhas (Fase B, estático)

Spec: `spec/2c-campanhas.md` (81 itens). Código lido inteiro: `pages/CampaignsPage.tsx`,
`campaigns/{CampaignsTab,CampaignWizard,TemplatePreview,TemplatesTab}.tsx`,
`ui/{WizardProgress,DataTable,Banner}.tsx`, `layout/TopBar.tsx` (render 1621-1729),
`index.css` (`.color-chip`, `.overlay-frame`, tokens). Skim: `AttributionTab`,
`CampaignLeadsDrawer`, `SubcategoryPreview`, `copilot/WhatsappLineRow` (sem item na spec).
Nenhum arquivo editado além deste.

Mapa canvas→projeto usado: `--bg`=surface-950 · `--sf`=surface-800 · `--sf2`=surface-900 ·
`--bd`=surface-700 · `--bd2`=var(--bd2) · `--tx`=surface-100 · `--tx2`=surface-400 ·
`--tx3`=surface-500 · `--ac`=brand-500 · `--acs`=accent-dark · `--acsoft`=accent-soft ·
`--btn/--btntx`=var(--color-btn-primary-bg/fg) · `--amber/--amberbg`=status-pending(-bg) ·
`--ok/--okbg`=status-active(-bg) · `--dg/--dgbg`=danger(/10) · raio xs6 sm7 md/lg8 xl/2xl10.

Dono: `ui/`, `index.css`, `layout/` = orquestrador (marcado **[orq]**); resto = Farol.

## Tabela

| ID | Status | arquivo:linha | O que o código faz hoje | Menor mudança |
|---|---|---|---|---|
| CAMP-HDR-01 | ❌ | layout/TopBar.tsx:1621 | `h-12 px-4 gap-3` ✓; `border-b border-surface-800/60` (no claro surface-800=#FFF → hairline invisível) e `bg-surface-950` (=--bg; spec --sf) | `border-surface-700 bg-surface-800` **[orq]** |
| CAMP-HDR-02 | ❌ | TopBar.tsx:1628 | `text-sm font-bold text-surface-50` — 14/700 ✓; sem `-.01em`; cor 50 em vez de --tx | `tracking-[-0.01em] text-surface-100` **[orq]** |
| CAMP-HDR-03 | ❌ + [!] | TopBar.tsx:77,1634 | subtítulo "Campanhas em massa" em `text-sm text-surface-500` (14px/--tx3); spec 12px/--tx2 com "limite diário 1.000 · 412 usados" | estilo: `text-xs text-surface-400` **[orq]**; números: limite existe por linha (`messagingLimit`, tier "1K") mas "usados hoje" não existe → [!] |
| CAMP-HDR-04 | ❌ | CampaignsTab.tsx:125-148; TopBar.tsx:1642-1657 | "Nova campanha" vive numa toolbar própria abaixo das abas (com SegmentedControl + LineFilterChip, que não existem no mock); TopBar tem slot `pageActions` vazio; grupo direito `gap-1.5` | CampaignsPage passa `<Button …>Nova campanha</Button>` pro slot `pageActions` do TopBar (ordem Nova → busca → sino → avatar); toolbar vira só filtros (ou some) |
| CAMP-HDR-05 | ❌ | CampaignsTab.tsx:140-148; ui/Button.tsx neutral | `variant="neutral"` ✓ mas tamanho md (36px, px-16); `Plus w-4` (16px) gap-2; Button.neutral usa `border-surface-700` (--bd), spec --bd2 | `size="sm"`, `leftIcon={<Plus className="w-3.5 h-3.5" strokeWidth={2.2}/>}`; Button.neutral → `border-[var(--bd2)]` **[orq]** |
| CAMP-HDR-06 | ❌ | TopBar.tsx:1664-1676 | pílula `w-[160px] h-8 px-3 rounded-lg border-surface-700/60 bg-surface-800 text-surface-400`; kbd `bg-surface-700 rounded text-3xs font-medium` | `w-[200px] h-7 px-2.5 rounded-sm border-surface-700 bg-surface-900 text-surface-500`; kbd `font-mono text-[10.5px] border border-[var(--bd2)] rounded px-1 bg-transparent` **[orq]** |
| CAMP-HDR-07 | ❌ | TopBar.tsx:1707 | `w-8 h-8 rounded-lg` (32/8); ícone 16 ✓; --tx2 ✓ sem fundo ✓ | `w-7 h-7 rounded-sm` **[orq]** |
| CAMP-HDR-08 | ❓ | TopBar.tsx:1355-1362 (UserMenu) | avatar `w-7 h-7 rounded-[30%]` ✓, tokens `--color-avatar-*` ✓; tamanho/peso da inicial (10.5/700) não lido | conferir ao vivo |
| CAMP-HDR-09 | ✅ | TopBar.tsx | só tokens; sem diferença estrutural | — |
| CAMP-TABS-01 | ❌ | pages/CampaignsPage.tsx:50-54 | tablist artesanal `gap-1 px-6 border-surface-800/60 text-xs font-medium` (12px; hairline invisível no claro) | trocar por `<Tabs tabs value onChange label className="px-4 pt-3"/>` (ui/Tabs já está em gap-18/13px/500/--tx2/--bd) |
| CAMP-TABS-02 | ❌ | CampaignsPage.tsx:72-74 | ordem ✓; contagem como `(14)` entre parênteses | `count: campaignsCount` no `TabOption` (sem parênteses) |
| CAMP-TABS-03 | ❌ | CampaignsPage.tsx:63-68 | ativa `text-surface-50 border-b-2 border-brand-500` (sublinhado TEAL) | via `<Tabs>`: inset 2px currentColor, --tx 600 |
| CAMP-TABS-04 | ❌ | CampaignsPage.tsx:67 | inativa `text-surface-500` (--tx3) 12px, `px-3 py-2.5` | via `<Tabs>`: 13px/500 --tx2, `pb-2` |
| CAMP-TABS-05 | ❌ | CampaignsPage.tsx:73 | `text-surface-600` herda 12px, parênteses | via `<Tabs>` count: 11px --tx3 ml-0.5 |
| CAMP-TABS-06 | ❌ | CampaignsPage.tsx:70 | sem indicador deslizante ✓, **com ícone** (`Send/FileText/Target w-3.5`) | remover `icon` das abas |
| CAMP-TABLE-01 | ❓ | CampaignsTab.tsx:113; AppShell | tabela sem borda externa ✓; fundo herda do conteúdo da página (--bg), spec --sf — depende do bg da área de conteúdo no AppShell (fora deste escopo) | conferir ao vivo no escuro (#060909 vs #161E1E) |
| CAMP-TABLE-02 | ✅ | CampaignsTab.tsx:330-411 | 9 colunas na ordem certa; `w-[120px]/w-[90px]/w-9` ✓; `<table w-full>` auto, não grid (proporções ≈); chips extra na célula Nome (linha WhatsApp/WABA) são dado real | — (opcional: `table-fixed`) |
| CAMP-TABLE-03 | ❌ | ui/DataTable.tsx:93-115 | thead `bg-surface-900` (--sf2 ✓); th `px-3 py-2 text-[11px] font-medium text-surface-500 uppercase tracking-wide`; tr `border-surface-800` | `h-8 text-[11px] font-semibold text-surface-400 normal-case tracking-normal border-surface-700`, 1º th `pl-4 pr-2` **[orq]** |
| CAMP-TABLE-04 | ❌ | CampaignsTab.tsx:389-394 | Público/Entregues/Lidas/Respostas `align:'right'` ✓ (th e td); **Envio sem align** | `align: 'right'` na coluna `sendDate` |
| CAMP-TABLE-05 | ❌ | ui/DataTable.tsx:141,164-166 | td `px-3 py-2` (≈36px ✓); tr `border-b border-surface-800/60` (claro: invisível); sem zebra/raio ✓ | `border-surface-700`; `first:pl-4` **[orq]** |
| CAMP-TABLE-06 | ✅ | ui/DataTable.tsx:143-147 | hover `bg-[var(--rowhover)]` ✓; ativa = `bg-brand-500/15` + inset brand-500 (spec: --rowhover + inset --ac) — campanhas não usa `activeKey` | opcional: ativa `bg-[var(--rowhover)]` **[orq]** |
| CAMP-TABLE-07 | ❌ | CampaignsTab.tsx:336 | `text-[13px] font-semibold text-surface-100` ✓; rascunho não rebaixa pra --tx2 | `c.status==='draft' ? 'text-surface-400' : 'text-surface-100'` |
| CAMP-TABLE-08 | FASE D ✅ | `CampaignsTab.tsx` `statusChip()`/`STATUS_CHIP_CLASS` | Farol (reconferência): chip local sem `.color-chip`, todas as cores/formas conferidas — `h-5 px-[7px] rounded-xs text-[11px] font-semibold gap-[5px]`, sending `bg-accent-soft text-accent-dark` + dot, scheduled `bg-status-pending-bg text-status-pending`, sent `bg-status-active-bg text-status-active`, draft/cancelled `bg-surface-900 border border-surface-700 text-surface-400`, failed `bg-danger/10 text-danger`, sem ícones — bate. **Achado na reconferência**: o rótulo do status `sent` ainda dizia "Enviada" em vez de "Concluída" (`STATUS_CONFIG`, não tocado na Fase C original) — corrigido agora. Campos `chip`/`icon` de `STATUS_CONFIG`, mortos desde a Fase C (sobraram do `.color-chip` antigo), removidos. |
| CAMP-TABLE-09 | ❌ | CampaignsTab.tsx:351 | `font-mono text-[11.5px] text-surface-400` ✓; sem template renderiza vazio | fallback `c.templateName ?? <span className="text-xs text-surface-500">sem template</span>` |
| CAMP-TABLE-10 | ❌ | CampaignsTab.tsx:358-388 | `tabular-nums text-surface-300` (spec --tx); número cru sem `1.240`; Entregues/Lidas mostram "600 · 95%" (spec só contagem); `—` em surface-300 (spec --tx3) | `text-surface-100`, `n.toLocaleString('pt-BR')`, `—` em `text-surface-500`; manter/retirar "· %" é decisão (fora do mock) |
| CAMP-TABLE-11 | ❌ | CampaignsTab.tsx:251-259,393 | `text-surface-400` ✓; sem align right; formato `17/09` / `17/09 10:00` (spec "hoje 09:00", "17 set 10:00", "12 set") | `align:'right'`; formatter `{d} {mmm}` + "hoje HH:mm" quando hoje |
| CAMP-TABLE-12 | ✅ | CampaignsTab.tsx:282-288 | ícone `MoreHorizontal` sempre visível, `text-surface-500` ✓ (spec `···` --tx3); hover bg extra | — |
| CAMP-TABLE-13 | ✅ | — | sem paginação (lista não paginada) — frame também não mostra | — |
| CAMP-TABLE-14 | ✅ | CampaignsTab.tsx:156-171 | sem `selectedKeys` → sem checkbox ✓ | — |
| CAMP-WIZ-01 | ✅ | CampaignWizard.tsx:418-433 | `fixed inset-0 bg-black/60` + container `flex items-center justify-center` ✓ (valor de --scrim não está no HTML) | — |
| CAMP-WIZ-02 | ❌ | CampaignWizard.tsx:435 | `bg-surface-900` (=--sf2; spec --sf) `overlay-frame border rounded-2xl max-w-3xl` (10px ✓, --ovbd/--ovsh ✓, 768≈760 ✓) | `bg-surface-800` |
| CAMP-WIZ-03 | ❌ | CampaignWizard.tsx:439 | header `px-5 py-4 border-b border-surface-800` (borda sob o header) | `px-5 pt-4 pb-0`, remover `border-b` |
| CAMP-WIZ-04 | ❌ | CampaignWizard.tsx:440 | `text-base font-semibold text-surface-50` (16/600) | `text-[15px] font-bold tracking-[-0.01em] text-surface-100` |
| CAMP-WIZ-05 | [!] | — | sem "Rascunho salvo"; nenhum wizard salva progresso (documentado) | — |
| CAMP-WIZ-06 | ❌ | CampaignWizard.tsx:441 | `p-1.5 rounded-lg text-surface-500` + X 16 (28px ✓; raio 8; --tx3) | `rounded-sm text-surface-400` |
| CAMP-WIZ-07 | ❌ | CampaignWizard.tsx:460 | wrapper `px-5 py-3 border-b border-surface-800` (12px vertical; hairline invisível no claro) | `py-3.5 border-surface-700` |
| CAMP-WIZ-08 | ✅ | ui/WizardProgress.tsx:50,54 | concluída `bg-accent-soft text-accent-dark`, check 10px stroke 3 | — |
| CAMP-WIZ-09 | ✅ | ui/WizardProgress.tsx:51 | atual `--color-btn-primary-bg/fg`, 10px/700 | — |
| CAMP-WIZ-10 | ✅ | ui/WizardProgress.tsx:56-59 | rótulo `text-xs font-semibold`; atual --tx, demais --tx2 | — |
| CAMP-WIZ-11 | ❌ (mínimo) | ui/WizardProgress.tsx:30,37,62 | conector `h-px bg-brand-500 mx-2.5` ✓ sólido/acento; mas `gap-2` no container externo e interno soma 8px além dos 10px de margem (spec gap 0) | `gap-0` nos dois flex **[orq]** |
| CAMP-WIZ-12 | ✅ | ui/WizardProgress.tsx:52 | futura `border-[var(--bd2)]` sem fundo, texto --tx2 | — |
| CAMP-WIZ-13 | ✅ | ui/WizardProgress.tsx:43 | `gap-1.5` (6px) inline-flex | — |
| CAMP-WIZ-14 | ❌ | CampaignWizard.tsx:469,1514,1687 | conteúdo `p-5` (spec 18/20); Step5 `flex gap-5` ✓; coluna direita `w-[240px]` (spec 250) | `px-5 py-[18px]`; `w-[250px]` |
| CAMP-WIZ-15 | ❌ | CampaignWizard.tsx:1518-1587 | dois grupos com eyebrow maiúsculo ("Campanha"/"Segmento") + `divide-y divide-surface-800/60`; linhas `flex justify-between py-2`; linhas extras (Categoria, Variáveis, Alcance) | uma lista só, sem eyebrows: linha `grid grid-cols-[120px_1fr_auto] items-center gap-2.5 py-[9px] border-b border-surface-700 last:border-b-0`; ordem Nome·Template·Público·Linha·Envio(·Custo) |
| CAMP-WIZ-16 | ❌ | CampaignWizard.tsx:1524 etc. | rótulo `text-[11px] text-surface-500` | `text-xs text-surface-400` |
| CAMP-WIZ-17 | ❌ | CampaignWizard.tsx:1411-1417 | `text-[11.5px] font-semibold text-brand-400` (--ac; spec --acs); presente em Nome/Template/Envio/Tipo; ausente em Linha (documentado) | `text-accent-dark`; "Editar" também na linha Público |
| CAMP-WIZ-18 | ❌ | CampaignWizard.tsx:1526 | `text-xs font-medium` (12/500) | `text-[13px] font-semibold text-surface-100` |
| CAMP-WIZ-19 | ❌ | CampaignWizard.tsx:1533 | pílula teal `font-mono text-brand-300 bg-brand-400/10 px-2 rounded`; sem chip Meta | `font-mono text-[11.5px] text-surface-100` sem fundo + chip `h-[18px] px-1.5 rounded-[5px] text-[10.5px] font-bold bg-status-active-bg text-status-active` "Aprovado · Meta" (de `template.status`, dado real) |
| CAMP-WIZ-20 | ❌ | CampaignWizard.tsx:1567-1586 | "Tipo: Toda a base" + pill verde "N contatos" separada | linha única "Público": `<b>{reach} contatos</b> · {descrição do segmento}`, sem pill |
| CAMP-WIZ-21 | ❌ | CampaignWizard.tsx:1544 | `text-xs text-surface-300` | `text-[13px] font-medium text-surface-100` |
| CAMP-WIZ-22 | ❌ + [!] | CampaignWizard.tsx:1507-1511,1550 | `text-xs text-surface-300`; "Imediatamente após criar" / `dd/mm/yy hh:mm` | estilo `text-[13px] font-medium text-surface-100`; formato "Qua, 17 set · 10:00"; "ritmo 200/h" não existe no código → [!] |
| CAMP-WIZ-23 | [!] | — | sem "Custo estimado"; nenhum custo/preço por mensagem no frontend | — |
| CAMP-WIZ-24 | ❌ + [!] | ui/Banner.tsx:31-38; CampaignWizard.tsx:1678-1683 | `Banner warning` = `.color-chip` **sólido laranja** (--color-warning #F97316) + texto branco, `px-3.5 py-2.5 text-[13px]`, ícone 16 | Banner precisa de modo suave: `bg-status-pending-bg text-status-pending px-2.5 py-[9px] text-xs leading-[1.45]` ícone 14 stroke 2, sem borda **[orq]**; copy "será dividida em N dias" = comportamento não confirmado → [!] |
| CAMP-WIZ-25 | ❌ | CampaignWizard.tsx:1688 | `text-xs text-surface-500 mb-3 text-center` "Prévia da mensagem" | `text-[10px] font-bold uppercase tracking-[.14em] text-surface-500 mb-1.5 text-left` "Prévia no WhatsApp" |
| CAMP-WIZ-26 | ❌ | CampaignWizard.tsx:571 | `px-5 py-4 border-t border-surface-800` | `pt-3.5 pb-4 gap-2 border-surface-700` |
| CAMP-WIZ-27 | ❌ | CampaignWizard.tsx:572-590 | artesanal `px-4 py-2 rounded-xl text-sm font-medium text-surface-400` + `ChevronLeft` | `<Button variant="ghost">← Voltar</Button>` (ghost = h-9 ✓ px-3; 13/600 vs Button 14/500 → ajuste no Button **[orq]** se quiser exato) |
| CAMP-WIZ-28 | [!] | — | sem "Enviar teste para mim"; `campaignsApi` não tem envio de teste | — |
| CAMP-WIZ-29 | ❌ | CampaignWizard.tsx:593-638 | "Próximo"/"Agendar campanha"/"Criar e enviar agora" artesanais `bg-surface-100 text-surface-950 rounded-xl px-5 py-2 text-sm font-medium` (invertido neutro, raio 10) | `<Button variant="primary">` (h-9, `--btn/--btntx`, raio 7, 600); rótulo "Agendar campanha" ✓ |
| CAMP-WIZ-30 | ✅ | CampaignWizard.tsx:455-459 | bloco ícone+título removido ✓ | — |
| CAMP-WIZ-31 | ✅ | — | estrutura igual nos dois temas; hex da prévia fixo ✓ | — |
| CAMP-PREVIEW-01 | ❌ | CampaignWizard.tsx:1689; TemplatePreview.tsx:34-60 | Step5 usa `compact` → só a bolha, **sem container** `#EFE7DD` (raio 10, borda --bd, padding 12/10, gap 6, min-h 230); não-compact tem moldura de celular (`#075E54`, `rounded-2xl shadow-2xl`) que não está na spec | no Step5: envolver em `rounded-xl bg-[#EFE7DD] border border-surface-700 px-2.5 py-3 flex flex-col gap-1.5 min-h-[230px]` (ou TemplatePreview ganha `variant="frame"` com esse container) |
| CAMP-PREVIEW-02 | ❌ | TemplatePreview.tsx | pílula "Hoje" inexistente | `<span class="self-center text-[10px] text-[#54656F] bg-white px-2 py-0.5 rounded-xs shadow-[0_1px_1px_rgba(0,0,0,.08)]">Hoje</span>` no container |
| CAMP-PREVIEW-03 | ❌ | TemplatePreview.tsx:72,100-105 | bolha `bg-white rounded-xl shadow-sm max-w-full`; corpo `px-3 pt-2 pb-1 text-[13px] leading-relaxed` | `rounded-[8px_8px_8px_2px] max-w-[92%] shadow-[0_1px_1px_rgba(0,0,0,.08)]`; corpo `px-2 pt-1.5 pb-1 text-xs leading-[1.4]` |
| CAMP-PREVIEW-04 | ❌ | TemplatePreview.tsx:11-13 | variáveis substituídas em texto normal (negrito só via `*…*`) | `substituteVars` devolve `<strong>${v}</strong>` (strong já é SAFE_TAG) |
| CAMP-PREVIEW-05 | ✅ | TemplatePreview.tsx:115-117 | `text-[10px] text-[#667781]` à direita ("12:00 ✓✓") | — |
| CAMP-PREVIEW-06 | ❌ | TemplatePreview.tsx:120-133 | botões **dentro** da bolha como linhas `border-t divide-y py-2 text-xs font-medium text-[#027EB5]` com ícone por tipo | botões como cards irmãos fora da bolha: `bg-white rounded-lg p-2 text-center text-xs font-medium text-[#027EB5] shadow-[0_1px_1px_rgba(0,0,0,.08)] max-w-[92%]`, sem ícone, `gap-1.5` do container |
| CAMP-PREVIEW-07 | ❌ | TemplatePreview.tsx:38,72 | bolha `shadow-sm` (tailwind 0 1px 2px .05); moldura não-compact `shadow-2xl` (viola "única sombra") | `shadow-[0_1px_1px_rgba(0,0,0,.08)]`; retirar `shadow-2xl` da moldura (ou a moldura toda) |
| CAMP-TPL-01 | ✅ | TemplatesTab.tsx:228 | `lg:grid-cols-4 gap-3` (12 vs 10) | opcional `gap-2.5` |
| CAMP-TPL-02 | ❌ | TemplatesTab.tsx:339 | `bg-surface-800/50 hover:bg-surface-800 border-surface-800 rounded-xl` (borda invisível no claro, raio 10, hover) | `bg-surface-800 border-surface-700 rounded-lg`, sem hover |
| CAMP-TPL-03 | ❌ | TemplatesTab.tsx:341 | header linha única `px-3 py-2.5 gap-2 border-b border-surface-800` | `px-3 py-2.5 flex flex-col gap-1 border-surface-700` (linha 1 nome+chip, linha 2 meta) |
| CAMP-TPL-04 | ❌ | TemplatesTab.tsx:342 | `text-[13px] font-medium font-mono` | `text-xs` (12/500) |
| CAMP-TPL-05 | ❌ | TemplatesTab.tsx:23-29,343-349 | `.color-chip border rounded-full px-1.5 py-0.5 text-[10.5px] font-medium` + ícone (sólido, pílula) | `h-[18px] px-1.5 rounded-[5px] text-[10.5px] font-bold` + Aprovado `bg-status-active-bg text-status-active` / Em análise `bg-status-pending-bg text-status-pending` / Rejeitado `bg-danger/10 text-danger`; sem ícone/borda |
| CAMP-TPL-06 | ❌ | TemplatesTab.tsx:403-427 | meta no **rodapé** como chips (categoria em pílula `bg-surface-700`, idioma, linha, contadores, data) | linha 2 do header `text-[11px] text-surface-500`: "{categoria} · {idioma} · {n botões}"; remover rodapé |
| CAMP-TPL-07 | ✅ | TemplatesTab.tsx:394-400 | corpo `bg-[#EFE7DD] p-3` (12 vs 10/12), cantos via `overflow-hidden` do card | opcional `py-2.5 px-3 flex-1` |
| CAMP-TPL-08 | FASE D ✅ | `TemplatePreview.tsx` `MessageBubble` (`dense`) | Farol (reconferência): variante "card" (`TemplatesTab.tsx:418` passa `variant="card"`) confere — `rounded-[6px_6px_6px_2px]`, `text-[11px] leading-[1.4] line-clamp-3`. **Achado na reconferência**: padding do corpo estava assimétrico (`pt-1.5 pb-1`, spec pede `py-1.5` simétrico) — corrigido pra `pt-1.5 pb-1.5`. |
| CAMP-TPL-09 | ✅ | — | dado real | — |
| CAMP-TPL-10 | ✅ | — | rótulo só do canvas | — |
| CAMP-TPL-11 | ✅ | TemplatesTab.tsx:116-124 | `TemplateCreator` substitui o conteúdo da aba ✓ | — |
| CAMP-TPL-12 | ✅ | TemplatesTab.tsx:396; TemplatePreview.tsx | card em tokens; `#EFE7DD`/`#fff` fixos ✓ | — |
| CAMP-NOTE-01 | ✅ | CampaignsTab.tsx:141 | `variant="neutral"` ✓ (posição: ver HDR-04) | — |
| CAMP-NOTE-02 | ✅ | TemplatePreview.tsx | `#EFE7DD #111B21 #027EB5 #667781` ✓ (`#54656F` só entra com a pílula "Hoje") | — |
| CAMP-NOTE-03 | ❌ | index.css:739-743 | `.color-chip` do projeto = **sólido** (mix 85% preto + texto branco); os chips da spec são **suaves** (fundo tinta + texto colorido, raio 6, sem pílula). Conflito nota×valores: o HTML manda | criar variante `.color-chip-soft` (`background: color-mix(in srgb, var(--chip) 12%, transparent); color: var(--chip); border: 0`) **[orq]** e usar em status de campanha/template |
| CAMP-NOTE-04 | ✅ | — | sidebar é 7a, fora do escopo | — |

## Resumo por status

- ✅ 29 · ❌ 45 (3 deles também [!]) · ❓ 2 · [!] 4 puros (WIZ-05, WIZ-23, WIZ-28 + parte de HDR-03/WIZ-22/WIZ-24) — total 81 (contando WIZ-11 como ❌).

## ❌ por arquivo, em ordem de impacto

1. **CampaignWizard.tsx** (Farol) — WIZ-02/03/04/06/07/14/15/16/17/18/19/20/21/22/25/26/27/29, PREVIEW-01 (wrapper do Step5). Mais barulho visível: revisão ainda em 2 grupos com eyebrow; botões do rodapé artesanais (invertido neutro, raio 10) em vez de primary/ghost do sistema; modal em --sf2.
2. **TemplatePreview.tsx** (Farol) — PREVIEW-01..04/06/07, TPL-08: sem container WhatsApp no compact, botões dentro da bolha, raio/sombra/tamanhos, sem "Hoje", variáveis sem negrito, moldura de celular com `shadow-2xl`.
3. **CampaignsTab.tsx** (Farol) — HDR-04/05 (botão fora do TopBar, tamanho md), TABLE-04/07/08/09/10/11: chip de status sólido+ícone+pílula com mapeamento de cor errado (Agendada azul, Enviando âmbar), números sem separador e em --tx2, Envio sem align/formato.
4. **CampaignsPage.tsx** (Farol) — TABS-01..06: tablist artesanal (teal, 12px, ícones, parênteses) quando `ui/Tabs` já implementa a spec.
5. **TemplatesTab.tsx** (Farol) — TPL-02..06: card com raio 10/borda invisível/hover, header de uma linha, meta no rodapé, chip sólido.
6. **ui/DataTable.tsx** [orq] — TABLE-03/05: header maiúsculo/tracking/--tx3 e hairlines em `surface-800` (invisíveis no claro).
7. **ui/Banner.tsx** [orq] — WIZ-24: banner sólido laranja vs âmbar suave.
8. **index.css `.color-chip`** [orq] — NOTE-03: falta variante suave usada por 3 chips desta tela (TABLE-08, TPL-05, WIZ-19).
9. **layout/TopBar.tsx** [orq] — HDR-01/02/03/06/07: fundo/hairline, subtítulo 14px, busca 160/32/8px, sino 32px.
10. **ui/WizardProgress.tsx** [orq] — WIZ-11: `gap-2` duplo além da margem do conector (só isso; o resto bate).

## Fora dos 81 itens (frame só cobre a Revisão) — registrar, não pontuar

- ~~Step1–Step4 e `FilterGroup`/`ContactListModal` seguem o vocabulário antigo~~ — **FASE C ✅** (fechado antes desta reconferência): seleção de cards virou `border-brand-500 ring-[3px] ring-accent-soft` (README 3.6), inputs de texto `rounded-xl` → `rounded-sm` (7px). Confirmado na reconferência de Fase D — os valores atuais em `CampaignWizard.tsx` (linhas ~713/837/1341 pros cards, ~674/689/938/1367/1778 pros inputs) batem.
- `WhatsappLineRow` (callout no topo do wizard), `SegmentedControl` + `LineFilterChip` na toolbar e `TipCard` de setup não existem no mock — dado/produto real, sem item.
- `AttributionTab`/`CampaignLeadsDrawer` (raio 10, `bg-surface-900 border-surface-800`, tooltip `shadow-lg` legítimo) e `SubcategoryPreview` (`shadow-2xl`, `shadow-inner`, `rounded-2xl`) não têm mockup — só nota.
- Taxonomia das etapas: código Template·Segmento·Variáveis·Agendar·Revisão vs mock Nome·Template·Público·Agendamento·Revisão → [!] decisão de produto (o estilo de cada etapa foi avaliado mesmo assim: WIZ-08..13 ✅).

## Fase D — reconferência linha a linha (Farol, sem navegador)

Pedido do usuário: reler cada item marcado como corrigido contra o `arquivo:linha`
atual do epic e conferir o valor exato (px/hex/peso/raio). Prioridade: modal do
wizard e preview do template (itens citados como as piores divergências
percebidas pelo usuário).

**Conferidos e batem exatamente com a spec** (sem mudança):
WIZ-02/03/04/06/07/14/15/16/17/18/19/20/21/22/24/25/26/27/29 · PREVIEW-01/02/03/04/06/07 ·
TABS-01..06 · TABLE-04/07/09/10/11 · TPL-02/03/04/05.

**Achados e corrigidos nesta reconferência** (não estavam no radar da Fase C
porque a "menor mudança" original não cobria, ou porque o campo ficou morto
depois da própria Fase C):
- CAMP-TABLE-08: rótulo do chip `sent` = "Enviada" → "Concluída" (o valor
  certo já estava documentado na coluna "O que o código faz hoje" da Fase B,
  mas a "menor mudança" prescrita não tinha incluído a troca de texto —
  ficou pra trás). Campos `chip`/`icon` mortos em `STATUS_CONFIG` (Campaigns
  e Templates) removidos — sobraram de antes do chip virar `STATUS_CHIP_CLASS`.
- CAMP-TPL-08: padding do corpo da bolha densa assimétrico (`pt-1.5 pb-1`)
  corrigido pra simétrico (`pt-1.5 pb-1.5`, spec `py-1.5`).
- Nota "Fora dos 81 itens" (Step1-4): já estava fechada desde a Fase C
  original, só não tinha sido riscada aqui — confirmado.

**Não verificável sem navegador** (Fase D "com" browser continua bloqueada —
sessão caiu pro /login): CAMP-HDR-08 (peso/tamanho da inicial do avatar),
CAMP-TABLE-01 (fundo herdado do AppShell nos 2 temas) — ambos já eram `❓`
antes desta reconferência, sem mudança de status.

Nenhuma outra divergência de valor exato encontrada nos itens Farol de
CampaignWizard.tsx/TemplatePreview.tsx/CampaignsTab.tsx/CampaignsPage.tsx/
TemplatesTab.tsx além dos 2 achados acima.

## Fase D — achados ao vivo (navegador, usuário/Maestro)

Sessão do navegador voltou depois do bloqueio — 3 achados em `/campaigns`
(claro/escuro + wizard), reportados pelo usuário via Maestro, corrigidos
na branch `fix/SCRUM-1097-fase-d-campanhas-live`:

1. **Linha de 36px quebrada** (célula não identificada por ID de spec —
   próxima do escopo de CAMP-TABLE-10): `CampaignsTab.tsx` colunas
   Público/Entregues/Lidas/Respostas — "600 · 95%" quebrava em 2 linhas na
   largura `w-[90px]` (a tabela é `table-layout: auto`, então a célula
   cresceria em vez de cortar, mas sem `whitespace-nowrap` o span quebrava
   no espaço antes de a coluna alargar). Corrigido: `whitespace-nowrap` nas
   4 colunas numéricas — mantém "· %" (decisão já tomada em TABLE-10),
   linha volta a 36px.
2. **`WhatsappLineChip` gritava mais que o chip de status** — chip
   solid verde-marca (`.color-chip` + `--color-brand-600`) com ícone de
   telefone, sem equivalente no mock. `src/components/common/
   WhatsappLineChip.tsx` (compartilhado com Automations, fora do meu
   domínio de tela mas não é `ui/`/`index.css`/`layout/` — autorizado
   explicitamente pelo usuário): virou chip neutro suave — `h-5 text-[11px]
   font-semibold`, `bg-[var(--sf2)] border-surface-700 text-surface-400`,
   ícone 12px, mesmo vocabulário do chip "Rascunho". Variante "sem linha"
   unificada no mesmo tratamento neutro (só o conteúdo muda).
3. **Coluna Envio parecia centralizada no screenshot** — conferido em
   `ui/DataTable.tsx:114,170-171`: `align:'right'` já propaga certo pro
   `<th>` e `<td>` (com `tabular-nums` automático); o span da célula não
   tem `text-align` próprio, herda do `td`. Não é bug — um "—" sozinho
   right-aligned numa coluna de 120px com padding lateral pode parecer
   "no meio" num screenshot pequeno. Nenhuma mudança de código.

Gate: tsc -b limpo, eslint zero problemas. Suite completa NÃO rodada —
memória caiu pra ~340 MB durante o gate (outro agente rodando algo pesado
em paralelo, provavelmente a própria sessão de navegador da Fase D);
tsc+eslint bastam pra este tamanho de mudança (2 arquivos, CSS/classe só,
sem lógica nova) e não há teste dedicado pra `CampaignsTab.tsx` ou
`WhatsappLineChip.tsx`.

## Rodada 2 — 2c Campanhas, inventário por imagem (Farol, 2026-09-21)

PNG claro+escuro (`2c-disparos-wizard-revisao`, `2c-templates-preview-whatsapp`) elemento a elemento:

| ID | Elemento (mock) | App antes | Ação |
|---|---|---|---|
| R2-CAMP-01 | Linha "Público" descreve o recorte: "2.318 contatos · Situação = Qualificado, Proposta · com consentimento" | só o tipo ("Filtro avançado"/"Por tags…") | **✅ código**: descrição montada com dado real do wizard (tags, etapas, filtros, seleção manual) + `toLocaleString`; valor da linha passa a quebrar em 2 linhas (`break-words`, `items-baseline`) |
| R2-CAMP-02 | Breadcrumb "Nome · Template · Público · Agendamento · Revisão" | Template·Segmento·Variáveis·Agendar·Revisão | **✅ parcial**: renomeados p/ Template·Público·Variáveis·Agendamento·Revisão (a etapa "Variáveis" não tem par no mock — `[!]` produto) |
| R2-CAMP-03 | Chips de status/etiqueta suaves com a classe do sistema | classes locais `bg-status-*-bg` | **✅ código**: `.color-chip-soft` + `--chip` (campanha, template, agente, automação) |
| R2-CAMP-04 | Raio de controles 7 / cards 8 / modais 10 nas telas do meu escopo | `rounded-xl` em inputs/botões/caixas (AgentDetail 31×, TemplateCreator 20×, CampaignReport 18×…) | **✅ código**: varredura — inputs/botões `rounded-sm` + borda `--bd2`, caixas `rounded-lg`, modais `rounded-xl`; botões tintados brand → outline neutro |
| — | "Custo estimado R$ 812,00 · 2.318 × R$ 0,35" | — | `[!]` **confirmado por grep** (frontend + `backend/src/modules/campaigns`): nenhum preço/custo por mensagem |
| — | "Enviar teste para mim" | — | `[!]` **confirmado por grep**: sem endpoint de teste em `campaignsApi`/backend |
| — | "Rascunho salvo" no header do modal | — | `[!]`: o wizard não persiste progresso |
| — | Subtítulo TopBar "limite diário 1.000 · 412 usados" | — | `[!]` parcial: limite existe por linha (`messagingLimit`), "usados hoje" não |

Templates (grade): card já conferido na Rodada 1 (nome mono + chip Meta + meta em linha + prévia em fundo #EFE7DD); sem divergência nova visível no PNG. Tudo `❓ ao vivo`.
