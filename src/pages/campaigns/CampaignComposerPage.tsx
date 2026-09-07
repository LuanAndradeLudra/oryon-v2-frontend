// ─── CampaignComposerPage ──────────────────────────────────────────────────
// A página do Composer (D2 · SCRUM-1020) — mockup `p3-disparos.html` §D2.
// Substitui o esqueleto da W0.1 (`EmptyState` "Composer em construção").
//
// É aqui que a D2 vira tela. O núcleo (#127), os hooks de rede (#130), o
// chassi (#141) e os quatro blocos (#144) já estavam mesclados e ninguém os
// montava, então `/campaigns/new` continuava no esqueleto: quatro PRs de
// código sem um pixel de diferença para quem usa.
//
// A página é a ÚNICA que amarra rascunho e rede — blocos e barra recebem tudo
// por props, para serem exercitados em teste sem servidor (D2-plano §3/§5).
import { useState, useEffect, useMemo } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { FileText, Users, SlidersHorizontal, CalendarClock, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Banner } from '@/components/ui/Banner'
import { ComposerBlock } from '@/components/campaigns/composer/ComposerBlock'
import { ComposerPhonePreview } from '@/components/campaigns/composer/ComposerPhonePreview'
import { ContactListModal } from '@/components/campaigns/composer/ContactListModal'
import { ComposerBar } from '@/components/campaigns/composer/ComposerBar'
import { ReadinessChecklist } from '@/components/campaigns/composer/ReadinessChecklist'
import { BlockTemplate } from '@/components/campaigns/composer/blocks/BlockTemplate'
import { BlockPublico } from '@/components/campaigns/composer/blocks/BlockPublico'
import { BlockVariaveis } from '@/components/campaigns/composer/blocks/BlockVariaveis'
import { BlockEnvio } from '@/components/campaigns/composer/blocks/BlockEnvio'
import {
  templateSummary, publicoSummary, variaveisSummary, envioSummary,
} from '@/components/campaigns/composer/blocks/summaries'
import { useComposerDraft, type BlockId } from '@/components/campaigns/composer/useComposerDraft'
import { useCostEstimate } from '@/components/campaigns/composer/useCostEstimate'
import { useTestSend } from '@/components/campaigns/composer/useTestSend'
import { AudienceBlock } from '@/components/campaigns/audience/AudienceBlock'
import { useAudiencePreview } from '@/components/campaigns/audience/useAudiencePreview'
import {
  createEmptyDefinition, toSegmentDefinition,
  type AudienceDefinition,
  type AudienceDraft as EditorAudienceDraft,
} from '@/components/campaigns/audience/segmentBuilder'

/** Definicao estavel para quando o modal esta fechado: sem condicao nenhuma o
 *  `useAudiencePreview` devolve vazio SEM ir a' rede, entao a lista so' custa
 *  requisicao quando alguem clica em "ver os N". */
const SEM_PUBLICO: AudienceDefinition = createEmptyDefinition()

const CONTATOS_POR_PAGINA = 50

const BLOCK_ICON = {
  template:  FileText,
  publico:   Users,
  variaveis: SlidersHorizontal,
  envio:     CalendarClock,
} as const

export function CampaignComposerPage() {
  const { id: campaignId } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const draft = useComposerDraft({ campaignId, onSaved: () => navigate('/campaigns') })

  // Qual bloco está aberto é estado de UI, não de rascunho: não entra no
  // `useComposerDraft` (§3). Nasce no Template, que é o primeiro passo real.
  const [openBlock, setOpenBlock] = useState<BlockId | null>('template')

  const {
    templates, loadingTemplates, selectedTemplate, setSelectedTemplate, contacts, stages,
    campaignName, setCampaignName, mappings, updateMapping, mappingsComplete, fieldDefs,
    scheduleMode, setScheduleMode, scheduledAt, setScheduledAt,
    waNumbers, whatsappNumberId, setWhatsappNumberId,
    audience, setAudience, onAudienceResolved, audienceCount,
    blocks, firstPending, submit, saving, error, setError,
  } = draft

  // ── Público ──────────────────────────────────────────────────────────────
  // Duas formas do mesmo rascunho, de propósito:
  //
  //  - `editorDraft` é a do CONSTRUTOR (`audience/segmentBuilder`), com os ids
  //    de UI que o editor usa para identificar grupo e condição. É o `value`
  //    controlado do `AudienceBlock` e vive aqui, na página, porque devolver
  //    uma versão reconstruída regeneraria os ids a cada render e faria o
  //    editor perder a posição.
  //  - o que vai para o `useComposerDraft` é a do CONTRATO
  //    (`CampaignSegmentDefinition`), sem os ids de UI.
  //
  // A conversão é do Crivo (`toSegmentDefinition`) e acontece uma vez, aqui na
  // fronteira. Sem ela os ids de editor vazariam para o `POST /campaigns` E
  // para o corpo do `cost-estimate`, que consome a mesma definição.
  const [editorDraft, setEditorDraft] = useState<EditorAudienceDraft>(
    () => ({ definition: createEmptyDefinition() }),
  )

  const handleAudienceChange = (next: EditorAudienceDraft) => {
    setEditorDraft(next)
    setAudience({ segmentId: next.segmentId, definition: toSegmentDefinition(next.definition) })
  }

  // ── ?template=<id> vindo da Biblioteca (D4, contrato do Crivo §6c) ───────
  // Quem clicou em "Usar" já escolheu; chegar numa tela que não sabe disso
  // perderia a escolha no caminho. Search param e não state de navegação:
  // sobrevive a refresh e a link colado, que é o que se faz com uma
  // pré-seleção dessas.
  const requestedTemplateId = searchParams.get('template')
  useEffect(() => {
    if (!requestedTemplateId || selectedTemplate || templates.length === 0) return
    const found = templates.find((t) => t.id === requestedTemplateId)
    // Id que não corresponde a nada é ignorado em silêncio: a tela abre no
    // bloco Template, que é o que a pessoa faria a seguir de qualquer jeito.
    // Um erro aqui culparia quem clicou por um link velho.
    if (found) setSelectedTemplate(found)
  }, [requestedTemplateId, selectedTemplate, templates, setSelectedTemplate])

  // Auto-nome a partir do template, enquanto o campo estiver vazio (§3).
  useEffect(() => {
    if (selectedTemplate && !campaignName.trim()) setCampaignName(selectedTemplate.name)
  }, [selectedTemplate, campaignName, setCampaignName])

  // ── "ver os N" ──────────────────────────────────────────────────────────
  // A definicao vem do proprio `onViewAll` do AudienceBlock (contrato D6), e
  // nao do rascunho: e' o que o operador esta olhando naquele instante.
  const [listaDe, setListaDe] = useState<AudienceDefinition | null>(null)
  const [listaPagina, setListaPagina] = useState(1)
  const lista = useAudiencePreview(listaDe ?? SEM_PUBLICO, {
    page: listaPagina, limit: CONTATOS_POR_PAGINA,
  })

  const cost = useCostEstimate(audience, selectedTemplate?.id)
  const testSend = useTestSend({
    templateId: selectedTemplate?.id,
    variableMappings: mappings,
    whatsappNumberId,
  })

  const selectedLine = useMemo(
    () => waNumbers.find((n) => n.id === whatsappNumberId) ?? null,
    [waNumbers, whatsappNumberId],
  )

  // Os três pré-requisitos do disparo. Não repetem os 4 blocos: o bloco
  // Template fica verde com template + nome, e esta linha só fica verde se o
  // template estiver APROVADO pela Meta, que é o que o backend exige na hora
  // de enviar.
  const readiness = [
    { label: 'Template aprovado',         done: selectedTemplate?.status === 'APPROVED' },
    { label: 'Variáveis mapeadas',        done: mappings.length === 0 || mappingsComplete },
    { label: 'Linha e horário definidos', done: blocks.envio === 'done' },
  ]

  const pendentes = Object.values(blocks).filter((s) => s !== 'done').length
  const toggle = (id: BlockId) => setOpenBlock((cur) => (cur === id ? null : id))
  const blockProps = (id: BlockId) => ({
    status: blocks[id],
    icon: BLOCK_ICON[id],
    open: openBlock === id,
    onToggle: () => toggle(id),
  })

  return (
    <div className="flex flex-col h-full">
      {/* O nome do disparo é editável inline no título, como o nome do agente
          no AgentWorkspacePage — por isso o BlockTemplate não pede nome (§3). */}
      <header className="flex items-center gap-3 px-6 py-4 border-b border-surface-800">
        <div className="flex-1 min-w-0">
          <input
            value={campaignName}
            onChange={(e) => setCampaignName(e.target.value)}
            aria-label="Nome do disparo"
            placeholder={campaignId ? 'Editar disparo' : 'Novo disparo'}
            className="w-full bg-transparent text-lg font-semibold text-surface-50 placeholder:text-surface-500 border-b border-transparent focus:outline-none focus:border-brand-500 transition-colors"
          />
          <p className="text-xs text-surface-500 mt-0.5">
            {pendentes === 0
              ? 'Os 4 blocos estão completos'
              : `${4 - pendentes} de 4 blocos prontos`}
          </p>
        </div>
        <Button variant="ghost" onClick={() => navigate('/campaigns')} aria-label="Fechar o Composer">
          <X className="w-4 h-4" />
        </Button>
      </header>

      {/* Duas colunas, como o `.comp` do mockup: o telefone à esquerda não
          rola, os blocos à direita rolam sozinhos. */}
      <div className="flex-1 grid grid-cols-[420px_1fr] min-h-0">
        <ComposerPhonePreview
          template={selectedTemplate}
          mappings={mappings}
          contacts={contacts}
          senderName={selectedLine?.label}
        />

        <div className="overflow-y-auto px-7 py-6">
          {error && (
            <div className="mb-3">
              <Banner
                variant="danger"
                action={
                  <Button variant="ghost" onClick={() => setError('')} aria-label="Dispensar o erro">
                    <X className="w-4 h-4" />
                  </Button>
                }
              >
                {error}
              </Banner>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <ComposerBlock
              {...blockProps('template')}
              title="Template"
              summary={templateSummary(selectedTemplate)}
            >
              <BlockTemplate
                templates={templates}
                loading={loadingTemplates}
                selected={selectedTemplate}
                onSelect={(t) => { setSelectedTemplate(t); setOpenBlock('publico') }}
              />
            </ComposerBlock>

            <ComposerBlock
              {...blockProps('publico')}
              title="Público"
              summary={publicoSummary(audienceCount)}
            >
              {/* O construtor do Crivo entra pelo slot. `onConfirm` é sinal puro
                  de "terminei" — quem carrega o rascunho é o `onChange` (§9.1),
                  porque só ele traz o `segmentId`. */}
              <BlockPublico>
                <AudienceBlock
                  value={editorDraft}
                  onChange={handleAudienceChange}
                  onResolvedChange={onAudienceResolved}
                  onConfirm={() => setOpenBlock('variaveis')}
                onViewAll={(def) => { setListaPagina(1); setListaDe(def) }}
                  estimatedCostCents={cost.estimate?.totalCents}
                />
              </BlockPublico>
            </ComposerBlock>

            <ComposerBlock
              {...blockProps('variaveis')}
              title="Variáveis"
              summary={variaveisSummary(mappings, mappingsComplete)}
            >
              <BlockVariaveis mappings={mappings} onUpdate={updateMapping} fieldDefs={fieldDefs} />
            </ComposerBlock>

            <ComposerBlock
              {...blockProps('envio')}
              title="Envio"
              summary={envioSummary(scheduleMode, scheduledAt, selectedLine)}
            >
              <BlockEnvio
                scheduleMode={scheduleMode}
                onScheduleMode={setScheduleMode}
                scheduledAt={scheduledAt}
                onScheduledAt={setScheduledAt}
                lines={waNumbers}
                whatsappNumberId={whatsappNumberId}
                onLineChange={setWhatsappNumberId}
                // BE.5 ainda não implantado: sem uso por linha a cota some, em
                // vez de virar um "0 / 0 hoje" inventado (§6).
                usageByLine={null}
                audienceCount={audienceCount}
              />
            </ComposerBlock>

            <ReadinessChecklist items={readiness} />
          </div>

          <ComposerBar
            cost={cost.estimate}
            costLoading={cost.loading}
            costAvailable={cost.available}
            firstPending={firstPending}
            scheduleMode={scheduleMode}
            onSubmit={() => { void submit() }}
            submitting={saving}
            testSend={{
              send: () => { void testSend.send() },
              sending: testSend.sending,
              available: testSend.available,
              ready: testSend.ready,
            }}
          />
        </div>
      </div>

      <ContactListModal
        open={listaDe !== null}
        items={lista.data}
        total={lista.total}
        page={listaPagina}
        limit={CONTATOS_POR_PAGINA}
        loading={lista.loading}
        error={lista.error}
        stages={stages}
        onPageChange={setListaPagina}
        onClose={() => setListaDe(null)}
      />
    </div>
  )
}
