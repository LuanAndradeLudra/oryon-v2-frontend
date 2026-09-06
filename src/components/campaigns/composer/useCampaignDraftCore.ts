// ─── useCampaignDraftCore ──────────────────────────────────────────────────
// Núcleo compartilhado entre os DOIS modelos de criação de disparo:
//   • `useWizardDraft`   — o wizard de 5 passos (modal legado, CampaignWizard)
//   • `useComposerDraft` — o Composer de 4 blocos (D2/SCRUM-1020)
//
// Aqui mora só o que os dois têm em comum de verdade: carregar os dados de
// apoio, escolher template, nomear a campanha, mapear variáveis, escolher
// linha do WhatsApp, escolher quando enviar e, por fim, criar (e opcionalmente
// disparar) a campanha. Tudo que é específico de um modelo de interação —
// navegação por etapas e telemetria de wizard num lado, blocos e público novo
// do outro — fica no hook fino correspondente.
//
// Decisão registrada em coord/D2-plano.md §0/§2/§7.1: núcleo + hooks finos,
// nunca um hook só servindo aos dois modelos com flags.
import { useState, useEffect, useCallback, useRef } from 'react'
import { campaignsApi, contactsApi, templatesApi, tagsApi, whatsappNumbersApi } from '@/services/api'
import { useSmartLineDefault } from '@/hooks/useSmartLineDefault'
import { useCRMConfig } from '@/contexts/CRMConfigContext'
import type {
  Campaign, Contact, WhatsAppTemplate, CampaignSegment, CampaignVariableMapping, Tag,
} from '@/types'
import type { CampaignSegmentDefinition } from '@/types/campaignsV2'

/** Linha de WhatsApp reduzida ao que os seletores de campanha usam. */
export interface DraftLineOption {
  id: string
  displayPhoneNumber: string
  label?: string
}

export interface CampaignDraftSession {
  userId: string | null
  tenantId: string | null
  actorName: string | null
}

/** Lê a sessão do localStorage para telemetria. Compartilhado porque os dois
 *  modelos registram eventos com o mesmo par tenant/usuário. */
export function readSession(): CampaignDraftSession {
  try {
    const raw = localStorage.getItem('oryon:session')
    if (!raw) return { userId: null, tenantId: null, actorName: null }
    const s = JSON.parse(raw) as { user?: { id?: string; tenantId?: string; firstName?: string; lastName?: string } }
    return {
      userId: s.user?.id ?? null, tenantId: s.user?.tenantId ?? null,
      actorName: s.user ? `${s.user.firstName ?? ''} ${s.user.lastName ?? ''}`.trim() || null : null,
    }
  } catch { return { userId: null, tenantId: null, actorName: null } }
}

type CreateDto = Parameters<typeof campaignsApi.create>[0]

/** Como o público viaja para o backend. Exatamente uma das três formas
 *  (Decisão D25, `types/campaignsV2.ts`): o `segment` legado que o wizard
 *  manda hoje, ou `segmentId`/`audience` que o Composer manda quando o BE.3
 *  existir (coord/D6-plano.md §0). */
export type SubmitAudienceFields =
  | { segment: CampaignSegment; segmentId?: never; audience?: never }
  | { segmentId: string; segment?: never; audience?: never }
  | { audience: CampaignSegmentDefinition; segment?: never; segmentId?: never }

export interface SubmitCampaignInput {
  audienceFields: SubmitAudienceFields
  /** Presente → `PATCH /campaigns/:id` (modo edição do Composer). Ausente →
   *  `POST /campaigns`. Só a criação dispara o envio imediato: editar uma
   *  campanha já existente nunca a dispara como efeito colateral. */
  campaignId?: string
}

export type SubmitCampaignResult =
  | { ok: true; campaign: Campaign; sendError?: string }
  /** `rawMessage` é a mensagem do backend sem tratamento — quem chama usa
   *  para telemetria; o texto amigável já foi para o estado `error`. */
  | { ok: false; rawMessage?: string }

export interface CampaignDraftCoreOptions {
  /** `false` desliga carregamento e zera o rascunho (o wizard passa `open`;
   *  o Composer, que é uma página, passa `true`). */
  active: boolean
  initialName?: string
}

export function useCampaignDraftCore({ active, initialName }: CampaignDraftCoreOptions) {
  // ── Dados de apoio ────────────────────────────────────────────────────────
  const [templates, setTemplates]               = useState<WhatsAppTemplate[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(false)
  const [tags, setTags]                         = useState<Tag[]>([])
  const [contacts, setContacts]                 = useState<Contact[]>([])
  const [loadingContacts, setLoadingContacts]   = useState(false)
  const { stages, fieldDefs } = useCRMConfig()

  // ── Rascunho ──────────────────────────────────────────────────────────────
  const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplate | null>(null)
  const [campaignName, setCampaignName]         = useState('')
  const [mappings, setMappings]                 = useState<CampaignVariableMapping[]>([])
  const [scheduleMode, setScheduleMode]         = useState<'now' | 'later'>('now')
  const [scheduledAt, setScheduledAt]           = useState('')

  // Linha do WhatsApp — padrão inteligente (setor → primária → única → escolha
  // manual). O operador ainda pode trocar.
  const smartDefault = useSmartLineDefault()
  const [waNumbers, setWaNumbers]               = useState<DraftLineOption[]>([])
  const [whatsappNumberId, setWhatsappNumberId] = useState('')

  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  const staleRef = useRef(false)

  // ── Reset + carga quando o rascunho abre ──────────────────────────────────
  useEffect(() => {
    if (!active) return
    staleRef.current = false

    setSelectedTemplate(null)
    setCampaignName(initialName ?? '')
    setMappings([])
    setScheduleMode('now'); setScheduledAt('')
    setWhatsappNumberId('')
    setError('')

    setLoadingTemplates(true)
    setLoadingContacts(true)
    Promise.all([
      templatesApi.ensureFromMeta().then(() => templatesApi.list('APPROVED')),
      tagsApi.list(),
      contactsApi.list({}, 1, 500),
      whatsappNumbersApi.list(),
    ]).then(([tplRes, tagRes, ctRes, waRes]) => {
      if (staleRef.current) return
      setTemplates(tplRes.data)
      setTags(tagRes.data)
      setContacts(ctRes.data.data)
      const nums: DraftLineOption[] = waRes.data.map((n) => ({
        id: n.id, displayPhoneNumber: n.displayPhoneNumber, label: n.label,
      }))
      setWaNumbers(nums)
      // Padrão inteligente aplicado aqui (única linha ativa → escolhe
      // sozinho; senão setor/primária; senão em branco para escolha
      // explícita). A escolha de template mais adiante ainda pode
      // sobrescrever — ver efeito abaixo.
      if (!smartDefault.loading && smartDefault.lineId && nums.some((n) => n.id === smartDefault.lineId)) {
        setWhatsappNumberId(smartDefault.lineId)
      } else if (nums.length === 1) {
        setWhatsappNumberId(nums[0].id)
      }
    }).finally(() => {
      if (!staleRef.current) {
        setLoadingTemplates(false)
        setLoadingContacts(false)
      }
    })

    return () => { staleRef.current = true }
    // Roda só na abertura do rascunho: `initialName` e `smartDefault` são
    // lidos como valor inicial de propósito — incluí-los na lista
    // reiniciaria o rascunho do usuário no meio da edição.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])

  // ── Mapeamentos de variáveis seguem o template escolhido ──────────────────
  useEffect(() => {
    if (!selectedTemplate) { setMappings([]); return }
    // Seleciona automaticamente a linha associada ao template
    if (selectedTemplate.whatsappNumberId) setWhatsappNumberId(selectedTemplate.whatsappNumberId)
    const vars = selectedTemplate.bodyVariables ?? []
    setMappings(vars.map((variableName, i) => ({
      position: i + 1,
      variableName,
      source: 'contact_field',
      contactField: 'displayName',
    })))
  }, [selectedTemplate])

  const updateMapping = useCallback((position: number, patch: Partial<CampaignVariableMapping>) => {
    setMappings((prev) => prev.map((m) => m.position === position ? { ...m, ...patch } : m))
  }, [])

  /** Todo mapeamento resolvido? Regra idêntica nos dois modelos. */
  const mappingsComplete = mappings.every((m) => {
    if (m.source === 'literal')       return (m.literal ?? '').trim().length > 0
    if (m.source === 'contact_field') return !!m.contactField
    if (m.source === 'custom_field')  return !!m.customFieldKey
    return false
  })

  // Trava multi-WABA — com mais de uma linha, exige escolha explícita.
  const needsExplicitLine = waNumbers.length > 1 && !whatsappNumberId

  /** `true` quando o "quando enviar" está resolvido (agora, ou data escolhida). */
  const scheduleReady = scheduleMode === 'now' || !!scheduledAt

  // ── Criação/edição (e disparo imediato, no modo "agora") ──────────────────
  const submitCampaign = useCallback(async (input: SubmitCampaignInput): Promise<SubmitCampaignResult> => {
    if (!selectedTemplate) return { ok: false }
    const editing = !!input.campaignId
    setSaving(true); setError('')
    try {
      const dto = {
        name: campaignName.trim(),
        templateId: selectedTemplate.id,
        variableMappings: mappings,
        // Converte para ISO UTC antes de enviar. O datetime-local devolve
        // "YYYY-MM-DDTHH:mm" sem timezone — new Date() no browser interpreta
        // como hora local do usuário, e .toISOString() converte para UTC.
        // Isso garante que o servidor (UTC na AWS) dispare no horário certo.
        scheduledAt: scheduleMode === 'later' ? new Date(scheduledAt).toISOString() : undefined,
        ...(whatsappNumberId ? { whatsappNumberId } : {}),
        ...input.audienceFields,
      }
      // Nem `whatsappNumberId` nem `segmentId`/`audience` estão nos DTOs de
      // `campaignsApi` (services/api.ts é congelado — ver cabeçalho de
      // campaignsV2Api.ts), mas o backend aceita os três. Cast estreito por
      // endpoint, sem `any`.
      const res = input.campaignId
        ? await campaignsApi.update(input.campaignId, dto as Partial<Campaign>)
        : await campaignsApi.create(dto as unknown as CreateDto)

      let campaign = res.data
      let sendError: string | undefined

      // Quando o modo é "agora", disparar imediatamente após criar. Editar
      // uma campanha existente nunca dispara — quem edita está corrigindo
      // um rascunho, não mandando enviar.
      if (scheduleMode === 'now' && !editing) {
        try {
          const sendRes = await campaignsApi.send(res.data.id)
          campaign = sendRes.data
        } catch (sendErr) {
          // Campanha foi criada mas o envio falhou — informar sem
          // desfazer a criação (o usuário pode tentar na lista).
          sendError = messageOf(sendErr)?.trim()
            || 'Campanha criada, mas o envio automático falhou. Use "Enviar" na lista.'
          setError(sendError)
        }
      }

      return { ok: true, campaign, sendError }
    } catch (submitErr) {
      const rawMessage = messageOf(submitErr)
      setError(rawMessage?.trim() || (editing
        ? 'Erro ao salvar campanha. Verifique os campos e tente novamente.'
        : 'Erro ao criar campanha. Verifique os campos e tente novamente.'))
      return { ok: false, rawMessage }
    } finally {
      setSaving(false)
    }
  }, [selectedTemplate, campaignName, mappings, scheduleMode, scheduledAt, whatsappNumberId])

  return {
    // dados de apoio
    templates, loadingTemplates, tags, contacts, loadingContacts, stages, fieldDefs,
    // rascunho
    selectedTemplate, setSelectedTemplate, campaignName, setCampaignName,
    mappings, updateMapping, mappingsComplete,
    scheduleMode, setScheduleMode, scheduledAt, setScheduledAt, scheduleReady,
    waNumbers, whatsappNumberId, setWhatsappNumberId, needsExplicitLine,
    // submissão
    saving, error, setError, submitCampaign,
  }
}

/** Extrai a mensagem de erro do backend (string ou lista) sem depender do axios. */
function messageOf(err: unknown): string | undefined {
  const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message
  return Array.isArray(msg) ? msg.join('; ') : msg
}
