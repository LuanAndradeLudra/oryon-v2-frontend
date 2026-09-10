# Débito — 72 botões teal fora do componente `Button`

> **Card: [SCRUM-1060](https://oryonsolutions-team.atlassian.net/browse/SCRUM-1060)** —
> História sob o épico SCRUM-104 (Design System), 5 pontos.
> Este arquivo é o anexo do card: o inventário completo e o comando que reproduz a medição.

## Resumo

O produto tem **86 botões com o teal da marca**. Só **14** passam pelo componente
`Button`; os outros **72** são `<button>` crus com `bg-brand-500/600/cta` escrito à mão,
espalhados por **54 arquivos**.

Isso ficou visível ao aplicar a variante `neutral` (09/09): trocar a cor dos que usam o
componente custou **uma palavra por arquivo**; os crus exigiriam reescrever cada botão,
porque cada um tem o próprio tamanho, raio e estado de foco.

## Por que corrigir

1. **Toda mudança de padrão custa 54 arquivos em vez de 1.** Foi exatamente o que
   impediu de fechar os grupos 1 e 2 por inteiro na passada de 09/09 — cinco "Salvar"
   ficaram de fora (`AgentDetail`, `AgentBuilderWizard`, `CapabilitiesTab`,
   `SchemaFieldsBuilder`, `SkillTemplateForm`).
2. **Os estados divergem em silêncio.** O `Button` entrega `disabled`, `loading`,
   `focus-visible` com anel e offset, e altura por tamanho. Os botões crus entregam o
   que cada autor lembrou na hora: alguns têm `disabled:opacity-50`, outros
   `disabled:opacity-40`, outros nada. **Foco visível é acessibilidade**, e é o que mais
   falta.
3. **Três raios diferentes para o mesmo papel** — `rounded-md`, `rounded-lg` e
   `rounded-xl` aparecem em botões equivalentes.

## Escopo

Converter `<button>` cru → `<Button>`, escolhendo a variante pelo papel:

| Papel | Variante |
|---|---|
| Confirmar diálogo · salvar formulário | `neutral` |
| Abrir um fluxo (cabeçalho, estado vazio) | `secondary` |
| Momento comercial / marca | `primary` (mantém o teal) |
| Ação destrutiva | `danger` |

**Fora do escopo:** ícones sem rótulo, `Fab`, alternadores e selos que usam `bg-brand`
como cor de estado — não são botões de ação e não têm variante correspondente.

## Casos que exigem decisão, não conversão

- **`ui/Dropdown.tsx` e `ui/EmptyState.tsx`** — primitivos do próprio DS com teal cru
  dentro. Devem consumir o `Button`, senão o DS contradiz a si mesmo.
- **Páginas de autenticação** (`LoginPage`, `RegisterPage`, `ForgotPasswordPage`,
  `ResetPasswordPage`, `SetPasswordPage`, `ActivateAccountPage`) — 6 arquivos, um botão
  cada, todos "entrar/enviar". São a primeira tela do produto: manter o teal ali pode
  ser proposital. **Decidir antes de converter.**
- **`PricingPage`, `CheckoutModal`, `SetupWizard`** — momento comercial; o teal
  provavelmente fica.

## Inventário completo (72 em 54 arquivos)

Medido em 09/09/2026 na `chore/ajustes-ui-ux-922`, contando `<button>` cujo `className`
contém `bg-brand-400|500|600|cta`.

| n | arquivo |
|---|---|
| 5 | `components/agents/AgentDetail.tsx` |
| 3 | `components/contacts/ImportContactsDrawer.tsx` |
| 3 | `components/onboarding/SetupWizard.tsx` |
| 3 | `components/settings/modals/CheckoutModal.tsx` |
| 3 | `pages/CopilotPage.tsx` |
| 2 | `components/agents/AgentBuilderWizard.tsx` |
| 2 | `components/agents/HandoffRuleBuilder.tsx` |
| 2 | `components/contacts/AiSuggestionsModal.tsx` |
| 2 | `components/settings/sections/VerticalSettings.tsx` |
| 2 | `pages/AgentsPage.tsx` |
| 2 | `pages/PricingPage.tsx` |
| 1 | `components/admin/EditAgentSkillConfigModal.tsx` |
| 1 | `components/admin/SchemaFieldsBuilder.tsx` |
| 1 | `components/admin/SkillTemplateForm.tsx` |
| 1 | `components/admin/SkillTemplateTester.tsx` |
| 1 | `components/agents/CapabilitiesTab.tsx` |
| 1 | `components/agents/DecisionCriteriaTab.tsx` |
| 1 | `components/campaigns/CampaignReport.tsx` |
| 1 | `components/campaigns/CampaignWizard.tsx` |
| 1 | `components/campaigns/TemplateCreator.tsx` |
| 1 | `components/common/Fab.tsx` |
| 1 | `components/contacts/ContactsHeader.tsx` |
| 1 | `components/contacts/ContactsTable.tsx` |
| 1 | `components/contacts/NewContactDrawer.tsx` |
| 1 | `components/contacts/SendTemplateDrawer.tsx` |
| 1 | `components/contacts/tabs/ContactInfoCard.tsx` |
| 1 | `components/contacts/tabs/CustomFieldsCard.tsx` |
| 1 | `components/contacts/tabs/QualificationCard.tsx` |
| 1 | `components/conversations/ChatWindow/MessageInput.tsx` |
| 1 | `components/copilot/AgentBuilderApprovalPreviews.tsx` |
| 1 | `components/copilot/CopilotMessage.tsx` |
| 1 | `components/copilot/CopilotPanel.tsx` |
| 1 | `components/internal-chat/CreateChannelDrawer.tsx` |
| 1 | `components/layout/TopBar.tsx` |
| 1 | `components/settings/sections/AuditTrail.tsx` |
| 1 | `components/settings/sections/CompanyBrain.tsx` |
| 1 | `components/settings/sections/WhatsAppBusinessProfile.tsx` |
| 1 | `components/settings/sections/crm/PipelineAccessManager.tsx` |
| 1 | `components/settings/sections/crm/PipelineCloseReasonsManager.tsx` |
| 1 | `components/ui/Dropdown.tsx` |
| 1 | `components/ui/EmptyState.tsx` |
| 1 | `components/ui/TagPicker.tsx` |
| 1 | `pages/ActivateAccountPage.tsx` |
| 1 | `pages/AutomationsPage.tsx` |
| 1 | `pages/ForgotPasswordPage.tsx` |
| 1 | `pages/LoginPage.tsx` |
| 1 | `pages/RegisterPage.tsx` |
| 1 | `pages/ResetPasswordPage.tsx` |
| 1 | `pages/SetPasswordPage.tsx` |
| 1 | `pages/TeamChatPage.tsx` |
| 1 | `pages/admin/AdminAgentEditorPage.tsx` |
| 1 | `pages/admin/AssignSkillPage.tsx` |
| 1 | `pages/admin/AuditPage.tsx` |
| 1 | `pages/admin/SkillTemplatesPage.tsx` |

## Como reproduzir a medição

```bash
python -c "
import io, os, re
pat_btn = re.compile(r'<button\b[^>]*?>', re.S)
pat_brand = re.compile(r'bg-brand-(?:400|500|600|cta)\b')
tot = 0
for dp, _, fs in os.walk('src'):
    for f in fs:
        if not f.endswith('.tsx'): continue
        s = io.open(os.path.join(dp, f), encoding='utf-8', errors='ignore').read()
        tot += sum(1 for m in pat_btn.finditer(s) if pat_brand.search(m.group(0)))
print(tot)
"
```

## Critério de pronto

- Nenhum `<button>` com `bg-brand-*` fora dos casos decididos como exceção.
- `grep -rn 'variant=' src --include=*.tsx` cobre todo botão de ação.
- Toda página de autenticação com o mesmo tratamento entre si.
