import { useState, useEffect, useRef } from 'react'
import { appLogger } from '@/services/appLogger'

function readSession() {
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
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, ChevronRight, ChevronLeft, Check, Plus, Trash2, Workflow,
  MessageSquare, User, Building2, Tag, GitBranch, FileText,
  CheckCircle, StickyNote, Webhook, Star, XCircle,
} from 'lucide-react'
import type {
  Automation, AutomationType, AutomationTrigger,
  InternalEventCategory, InternalEventKey, InternalEventParams,
  AutomationCondition, AutomationConditionField, AutomationConditionOperator,
  AutomationAction, TenantStage, WhatsAppTemplate,
} from '@/types'
import { TYPE_CONFIG, TypeBadge } from './TypeBadge'
import { automationsApi, stagesApi, templatesApi, tagsApi, usersApi, departmentsApi } from '@/services/api'
import { useSmartLineDefault } from '@/hooks/useSmartLineDefault'
import { useWorkspaceNumber } from '@/contexts/WorkspaceNumberContext'
import { WhatsappLineRow } from '@/components/copilot/WhatsappLineRow'
import { Banner } from '@/components/ui/Banner'
import { cn } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────

export type WizardDraft = Omit<Automation, 'id' | 'tenantId' | 'executionCount' | 'lastExecutedAt' | 'createdAt' | 'updatedAt'>

// ── Step indicator ────────────────────────────────────────────────────────────

function StepDots({ step }: { step: number }) {
  const steps = ['Gatilho', 'Condições', 'Ações']
  return (
    <div className="flex items-center mb-6">
      {steps.map((label, i) => {
        const num = i + 1
        const done = step > num
        const active = step === num
        return (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <div className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors',
                done   ? 'bg-brand-600 text-surface-950' :
                active ? 'bg-brand-600/20 border-2 border-brand-600 text-brand-400' :
                         'bg-surface-800 border border-surface-700 text-surface-500',
              )}>
                {done ? <Check className="w-3.5 h-3.5" /> : num}
              </div>
              <span className={cn('text-[10px] font-medium whitespace-nowrap', active ? 'text-surface-200' : 'text-surface-600')}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={cn('flex-1 h-px mx-2 mt-[-10px]', done ? 'bg-brand-600' : 'bg-surface-800')} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Keyword input helper ──────────────────────────────────────────────────────

function KeywordInput({ onAdd }: { onAdd: (kw: string) => void }) {
  const [val, setVal] = useState('')
  const submit = () => { const t = val.trim(); if (t) { onAdd(t); setVal('') } }
  return (
    <div className="flex gap-2">
      <input
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submit() } }}
        placeholder="Digite e pressione Enter…"
        className="flex-1 bg-surface-700 border border-surface-600 rounded-lg px-3 py-1.5 text-xs text-surface-100 placeholder-surface-600 focus:outline-none focus:border-brand-600"
      />
      <button onClick={submit} className="px-3 py-1.5 bg-surface-700 border border-surface-600 rounded-lg text-xs text-surface-300 hover:text-surface-100 transition-colors">
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

// ── Internal event catalog ─────────────────────────────────────────────────────

type EventParamKey = 'minutes' | 'tagName' | 'threshold' | 'direction' | 'stageKey' | 'fieldName'

interface InternalEventDef {
  key:     InternalEventKey
  label:   string
  desc:    string
  params?: EventParamKey[]
}

const INTERNAL_EVENTS: Record<InternalEventCategory, { label: string; icon: string; events: InternalEventDef[] }> = {
  conversa: {
    label: 'Conversa', icon: 'conversa',
    events: [
      { key: 'conversa_iniciada',    label: 'Nova conversa iniciada',        desc: 'Qualquer novo atendimento começa no WhatsApp' },
      { key: 'conversa_resolvida',   label: 'Conversa resolvida',            desc: 'Agente ou sistema marca como resolvida' },
      { key: 'conversa_reaberta',    label: 'Conversa reaberta',             desc: 'Cliente responde após a conversa ser resolvida' },
      { key: 'conversa_atribuida',   label: 'Conversa atribuída a agente',   desc: 'Conversa ganha um responsável definido' },
      { key: 'conversa_transferida', label: 'Transferida entre setores',     desc: 'Conversa muda de departamento' },
      { key: 'sem_resposta_agente',  label: 'Agente sem responder por X min',desc: 'Violação de SLA interno de primeira resposta', params: ['minutes'] },
    ],
  },
  mensagem: {
    label: 'Mensagem', icon: 'mensagem',
    events: [
      { key: 'mensagem_recebida',  label: 'Mensagem recebida do cliente',    desc: 'Toda mensagem enviada pelo cliente' },
      { key: 'mensagem_com_midia', label: 'Mensagem com mídia recebida',     desc: 'Foto, áudio, vídeo, documento etc.' },
      { key: 'mensagem_enviada',   label: 'Mensagem enviada pelo agente',    desc: 'Toda mensagem enviada pelo time' },
    ],
  },
  contato: {
    label: 'Contato', icon: 'contato',
    events: [
      { key: 'contato_criado',     label: 'Novo contato criado',             desc: 'Contato adicionado ao CRM pela primeira vez' },
      { key: 'contato_atualizado', label: 'Campo do contato atualizado',     desc: 'Qualquer campo de dados editado', params: ['fieldName'] },
      { key: 'tag_adicionada',     label: 'Tag adicionada ao contato',       desc: 'Tag específica aplicada', params: ['tagName'] },
      { key: 'tag_removida',       label: 'Tag removida do contato',         desc: 'Tag específica removida', params: ['tagName'] },
      { key: 'lead_score_mudou',   label: 'Lead score alterado',             desc: 'Pontuação do lead mudou para cima ou baixo' },
      { key: 'lead_score_atingiu', label: 'Lead score cruzou um valor',      desc: 'Score atingiu um limiar configurado', params: ['threshold', 'direction'] },
    ],
  },
  crm: {
    label: 'CRM / Pipeline', icon: 'crm',
    events: [
      { key: 'estagio_mudou',    label: 'Estágio do pipeline alterado',      desc: 'Contato avançou ou regrediu no funil', params: ['stageKey'] },
      { key: 'lead_qualificado', label: 'Lead marcado como qualificado',     desc: 'Contato atingiu critérios de qualificação' },
      { key: 'deal_ganho',       label: 'Oportunidade ganha',               desc: 'Deal fechado com sucesso' },
      { key: 'deal_perdido',     label: 'Oportunidade perdida',             desc: 'Deal marcado como perdido' },
    ],
  },
  agente: {
    label: 'Agente / Equipe', icon: 'agente',
    events: [
      { key: 'agente_offline',         label: 'Agente ficou offline',          desc: 'Membro da equipe saiu do ar' },
      { key: 'sem_agente_disponivel',  label: 'Nenhum agente disponível',      desc: 'Toda equipe está offline ou ocupada' },
    ],
  },
  campanha: {
    label: 'Campanhas', icon: 'campanha',
    events: [
      { key: 'campanha_enviada',    label: 'Campanha disparada com sucesso', desc: 'Disparo de campanha concluído' },
      { key: 'campanha_falha_alta', label: 'Alta taxa de falha em campanha', desc: 'Taxa de falha acima do limite', params: ['threshold'] },
    ],
  },
}

const CATEGORY_ORDER: InternalEventCategory[] = ['conversa', 'mensagem', 'contato', 'crm', 'agente', 'campanha']

// ── Custom trigger sub-form ────────────────────────────────────────────────────

type CustomTrigger = Extract<AutomationTrigger, { type: 'custom' }>

function CustomTriggerForm({
  trigger,
  stages,
  onChange,
}: {
  trigger: CustomTrigger
  stages: TenantStage[]
  onChange: (t: CustomTrigger) => void
}) {
  const [activeCat, setActiveCat] = useState<InternalEventCategory>(trigger.eventCategory ?? 'conversa')

  const selectedDef = INTERNAL_EVENTS[activeCat]?.events.find((e) => e.key === trigger.eventKey)

  const selectEvent = (def: InternalEventDef) => {
    onChange({ type: 'custom', eventCategory: activeCat, eventKey: def.key, eventLabel: def.label, params: {} })
  }

  const updateParam = (patch: Partial<InternalEventParams>) =>
    onChange({ ...trigger, params: { ...trigger.params, ...patch } })

  return (
    <div className="space-y-3">
      {/* Category tabs */}
      <div className="flex flex-wrap gap-1.5">
        {CATEGORY_ORDER.map((cat) => {
          const cfg = INTERNAL_EVENTS[cat]
          return (
            <button
              key={cat}
              onClick={() => setActiveCat(cat)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                activeCat === cat
                  ? 'bg-brand-600/20 border-brand-600 text-brand-300'
                  : 'bg-surface-800 border-surface-700 text-surface-400 hover:text-surface-200 hover:border-surface-600',
              )}
            >
              {cfg.label}
            </button>
          )
        })}
      </div>

      {/* Events list */}
      <div key={activeCat} className="space-y-1.5">
        {INTERNAL_EVENTS[activeCat].events.map((def) => {
          const isSelected = trigger.eventKey === def.key
          return (
            <button
              key={def.key}
              onClick={() => selectEvent(def)}
              className={cn(
                'w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-colors',
                isSelected
                  ? 'border-brand-600 bg-brand-600/10'
                  : 'border-surface-700 bg-surface-800 hover:border-surface-600 hover:bg-surface-800',
              )}
            >
              <div className={cn(
                'w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 transition-colors',
                isSelected ? 'border-brand-500 bg-brand-500' : 'border-surface-600',
              )} />
              <div className="min-w-0">
                <p className={cn('text-xs font-semibold', isSelected ? 'text-surface-100' : 'text-surface-300')}>
                  {def.label}
                </p>
                <p className="text-[10px] text-surface-500 mt-0.5">{def.desc}</p>
              </div>
            </button>
          )
        })}
      </div>

      {/* Params form */}
      {selectedDef?.params && selectedDef.params.length > 0 && (
        <div className="bg-surface-800/60 border border-surface-700 rounded-xl p-3 space-y-3">
          <p className="text-[10px] font-semibold text-surface-400 uppercase tracking-wider">Configuração do evento</p>

          {selectedDef.params.includes('minutes') && (
            <div>
              <label className="block text-xs font-medium text-surface-300 mb-1.5">Tempo sem resposta (minutos)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number" min={1} max={1440}
                  value={trigger.params?.minutes ?? 30}
                  onChange={(e) => updateParam({ minutes: Math.max(1, Number(e.target.value)) })}
                  className="w-20 bg-surface-700 border border-surface-600 rounded-lg px-2.5 py-1.5 text-xs text-surface-100 focus:outline-none focus:border-brand-600"
                />
                <div className="flex gap-1.5">
                  {[15, 30, 60, 120].map((m) => (
                    <button key={m} onClick={() => updateParam({ minutes: m })}
                      className={cn('px-2 py-1 rounded-lg text-[10px] font-medium border transition-colors',
                        (trigger.params?.minutes ?? 30) === m
                          ? 'bg-brand-600/20 border-brand-600 text-brand-400'
                          : 'bg-surface-700 border-surface-600 text-surface-500 hover:text-surface-300',
                      )}>
                      {m}min
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {selectedDef.params.includes('tagName') && (
            <div>
              <label className="block text-xs font-medium text-surface-300 mb-1.5">Nome da tag</label>
              <input
                value={trigger.params?.tagName ?? ''}
                onChange={(e) => updateParam({ tagName: e.target.value })}
                placeholder="Ex: VIP, Urgente, Prospect..."
                className="w-full bg-surface-700 border border-surface-600 rounded-lg px-2.5 py-1.5 text-xs text-surface-100 placeholder-surface-600 focus:outline-none focus:border-brand-600"
              />
              <p className="text-[10px] text-surface-500 mt-1">Deixe em branco para disparar com qualquer tag.</p>
            </div>
          )}

          {selectedDef.params.includes('fieldName') && (
            <div>
              <label className="block text-xs font-medium text-surface-300 mb-1.5">Campo específico <span className="text-surface-600 font-normal">(opcional)</span></label>
              <input
                value={trigger.params?.fieldName ?? ''}
                onChange={(e) => updateParam({ fieldName: e.target.value })}
                placeholder="Ex: email, telefone, empresa... (vazio = qualquer campo)"
                className="w-full bg-surface-700 border border-surface-600 rounded-lg px-2.5 py-1.5 text-xs text-surface-100 placeholder-surface-600 focus:outline-none focus:border-brand-600"
              />
            </div>
          )}

          {selectedDef.params.includes('threshold') && (
            <div>
              <label className="block text-xs font-medium text-surface-300 mb-1.5">
                {trigger.eventKey === 'campanha_falha_alta' ? 'Taxa de falha (%)' : 'Valor do score (0–100)'}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number" min={0} max={100}
                  value={trigger.params?.threshold ?? 70}
                  onChange={(e) => updateParam({ threshold: Math.min(100, Math.max(0, Number(e.target.value))) })}
                  className="w-20 bg-surface-700 border border-surface-600 rounded-lg px-2.5 py-1.5 text-xs text-surface-100 focus:outline-none focus:border-brand-600"
                />
                {trigger.eventKey !== 'campanha_falha_alta' && (
                  <div className="flex gap-1.5">
                    {[25, 50, 70, 90].map((v) => (
                      <button key={v} onClick={() => updateParam({ threshold: v })}
                        className={cn('px-2 py-1 rounded-lg text-[10px] font-medium border transition-colors',
                          (trigger.params?.threshold ?? 70) === v
                            ? 'bg-brand-600/20 border-brand-600 text-brand-400'
                            : 'bg-surface-700 border-surface-600 text-surface-500 hover:text-surface-300',
                        )}>
                        {v}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {selectedDef.params.includes('direction') && (
            <div>
              <label className="block text-xs font-medium text-surface-300 mb-1.5">Direção</label>
              <div className="flex gap-2">
                {(['above', 'below'] as const).map((d) => (
                  <button key={d} onClick={() => updateParam({ direction: d })}
                    className={cn('flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                      (trigger.params?.direction ?? 'above') === d
                        ? 'bg-brand-600/20 border-brand-600 text-brand-400'
                        : 'bg-surface-700 border-surface-600 text-surface-400 hover:text-surface-200',
                    )}>
                    {d === 'above' ? '↑ Atingiu ou ultrapassou' : '↓ Caiu abaixo de'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {selectedDef.params.includes('stageKey') && (
            <div>
              <label className="block text-xs font-medium text-surface-300 mb-1.5">Estágio <span className="text-surface-600 font-normal">(opcional — vazio = qualquer)</span></label>
              <select
                value={trigger.params?.stageKey ?? ''}
                onChange={(e) => updateParam({ stageKey: e.target.value })}
                className="w-full bg-surface-700 border border-surface-600 rounded-lg px-2.5 py-1.5 text-xs text-surface-200 focus:outline-none focus:border-brand-600"
              >
                <option value="">Qualquer estágio</option>
                {stages.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Step 1 — Trigger ──────────────────────────────────────────────────────────

export function Step1({ draft, onChange, hideMeta }: { draft: WizardDraft; onChange: (d: Partial<WizardDraft>) => void; hideMeta?: boolean }) {
  const types: AutomationType[] = ['boas_vindas', 'follow_up', 'fora_horario', 'triagem_keyword', 'estagio_crm', 'inatividade', 'custom']
  const [stages, setStages] = useState<TenantStage[]>([])
  useEffect(() => { stagesApi.list().then((r) => setStages(r.data)).catch(() => {}) }, [])

  const setType = (type: AutomationType) => {
    const defaults: Record<AutomationType, AutomationTrigger> = {
      boas_vindas:     { type: 'boas_vindas' },
      follow_up:       { type: 'follow_up',      afterHours: 24 },
      fora_horario:    { type: 'fora_horario' },
      triagem_keyword: { type: 'triagem_keyword', keywords: [], matchMode: 'any' },
      estagio_crm:     { type: 'estagio_crm',     stageKey: stages[0]?.key ?? '' },
      inatividade:     { type: 'inatividade',     afterDays: 7 },
      custom:          { type: 'custom',          eventCategory: 'conversa', eventKey: 'conversa_iniciada', eventLabel: 'Nova conversa iniciada' },
    }
    onChange({ type, trigger: defaults[type] })
  }

  const trigger = draft.trigger

  return (
    <div className="space-y-5">
      {!hideMeta && (
      <>
      {/* Name */}
      <div>
        <label className="block text-xs font-medium text-surface-300 mb-1.5">Nome <span className="text-danger">*</span></label>
        <input
          value={draft.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Ex: Follow-up de leads qualificados"
          className="w-full bg-surface-800 border border-surface-700 rounded-xl px-3.5 py-2.5 text-sm text-surface-100 placeholder-surface-600 focus:outline-none focus:border-brand-600 transition-colors"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs font-medium text-surface-300 mb-1.5">Descrição <span className="text-surface-600 font-normal">(opcional)</span></label>
        <input
          value={draft.description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="Descreva o objetivo desta automação"
          className="w-full bg-surface-800 border border-surface-700 rounded-xl px-3.5 py-2.5 text-sm text-surface-100 placeholder-surface-600 focus:outline-none focus:border-brand-600 transition-colors"
        />
      </div>

      {/* Status */}
      <div>
        <label className="block text-xs font-medium text-surface-300 mb-1.5">Status inicial</label>
        <div className="flex gap-2">
          {(['active', 'inactive', 'draft'] as const).map((s) => (
            <button
              key={s}
              onClick={() => onChange({ status: s })}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                draft.status === s
                  ? 'bg-brand-600/20 border-brand-600 text-brand-400'
                  : 'bg-surface-800 border-surface-700 text-surface-400 hover:text-surface-200',
              )}
            >
              {s === 'active' ? 'Ativa' : s === 'inactive' ? 'Inativa' : 'Rascunho'}
            </button>
          ))}
        </div>
      </div>
      </>
      )}

      {/* Trigger type grid */}
      <div>
        <label className="block text-xs font-medium text-surface-300 mb-2">Quando disparar? <span className="text-danger">*</span></label>
        <div className="grid grid-cols-2 gap-2">
          {types.map((t) => {
            const cfg = TYPE_CONFIG[t]
            const active = draft.type === t
            return (
              <button
                key={t}
                onClick={() => setType(t)}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-xl border text-left transition-colors',
                  active ? 'border-brand-600 bg-brand-600/10' : 'border-surface-700 bg-surface-800 hover:border-surface-600',
                )}
              >
                <span className="text-surface-400 flex-shrink-0">{cfg.icon}</span>
                <div className="min-w-0">
                  <p className={cn('text-xs font-semibold', active ? 'text-surface-100' : 'text-surface-300')}>{cfg.label}</p>
                  <p className="text-[10px] text-surface-500 leading-tight mt-0.5 line-clamp-1">{cfg.triggerLabel}</p>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Trigger config */}
      {trigger && (
        <div key={trigger.type} className="bg-surface-800/60 border border-surface-700 rounded-xl p-4 space-y-3">
            {(trigger.type === 'boas_vindas') && (
              <p className="text-xs text-surface-400">Dispara na <strong className="text-surface-200">primeira mensagem</strong> de qualquer contato novo. Ideal para saudações personalizadas.</p>
            )}
            {(trigger.type === 'fora_horario') && (
              <div className="space-y-2">
                <p className="text-xs text-surface-400">Dispara quando mensagem chega <strong className="text-surface-200">fora do horário comercial</strong> configurado em Configurações → Conta.</p>
                <p className="text-[10px] text-surface-500">Útil para informar o horário de retorno ou coletar dados enquanto a equipe está offline.</p>
              </div>
            )}
            {trigger.type === 'follow_up' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-surface-300 mb-1.5">Horas sem resposta do cliente</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number" min={1} max={168}
                      value={(trigger as Extract<AutomationTrigger, { type: 'follow_up' }>).afterHours}
                      onChange={(e) => onChange({ trigger: { type: 'follow_up', afterHours: Math.max(1, Number(e.target.value)) } })}
                      className="w-24 bg-surface-700 border border-surface-600 rounded-lg px-3 py-2 text-sm text-surface-100 focus:outline-none focus:border-brand-600"
                    />
                    <div className="flex gap-1.5">
                      {[6, 12, 24, 48, 72].map((h) => (
                        <button key={h} onClick={() => onChange({ trigger: { type: 'follow_up', afterHours: h } })}
                          className={cn('px-2 py-1 rounded-lg text-[10px] font-medium border transition-colors',
                            (trigger as Extract<AutomationTrigger, { type: 'follow_up' }>).afterHours === h
                              ? 'bg-brand-600/20 border-brand-600 text-brand-400'
                              : 'bg-surface-700 border-surface-600 text-surface-500 hover:text-surface-300',
                          )}>
                          {h}h
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <p className="text-[10px] text-surface-500">Conta horas a partir da última mensagem recebida na conversa.</p>
              </div>
            )}
            {trigger.type === 'inatividade' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-surface-300 mb-1.5">Dias sem nenhuma atividade</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number" min={1} max={90}
                      value={(trigger as Extract<AutomationTrigger, { type: 'inatividade' }>).afterDays}
                      onChange={(e) => onChange({ trigger: { type: 'inatividade', afterDays: Math.max(1, Number(e.target.value)) } })}
                      className="w-24 bg-surface-700 border border-surface-600 rounded-lg px-3 py-2 text-sm text-surface-100 focus:outline-none focus:border-brand-600"
                    />
                    <div className="flex gap-1.5">
                      {[3, 7, 14, 30].map((d) => (
                        <button key={d} onClick={() => onChange({ trigger: { type: 'inatividade', afterDays: d } })}
                          className={cn('px-2 py-1 rounded-lg text-[10px] font-medium border transition-colors',
                            (trigger as Extract<AutomationTrigger, { type: 'inatividade' }>).afterDays === d
                              ? 'bg-brand-600/20 border-brand-600 text-brand-400'
                              : 'bg-surface-700 border-surface-600 text-surface-500 hover:text-surface-300',
                          )}>
                          {d}d
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <p className="text-[10px] text-surface-500">Sem mensagens, sem mudança de estágio, sem notas. Qualquer atividade reinicia o contador.</p>
              </div>
            )}
            {trigger.type === 'triagem_keyword' && (() => {
              const t = trigger as Extract<AutomationTrigger, { type: 'triagem_keyword' }>
              return (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-surface-300 mb-1.5">Palavras ou frases detectadas</label>
                    <div className="flex flex-wrap gap-1.5 mb-2 min-h-[28px]">
                      {t.keywords.map((kw, i) => (
                        <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-surface-700 border border-surface-600 rounded-full text-xs text-surface-200">
                          {kw}
                          <button onClick={() => onChange({ trigger: { ...t, keywords: t.keywords.filter((_, j) => j !== i) } })} className="text-surface-500 hover:text-danger ml-0.5">×</button>
                        </span>
                      ))}
                      {t.keywords.length === 0 && <span className="text-[11px] text-surface-600">Nenhuma palavra adicionada</span>}
                    </div>
                    <KeywordInput onAdd={(kw) => onChange({ trigger: { ...t, keywords: [...t.keywords, kw] } })} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-surface-300 mb-1.5">Lógica de correspondência</label>
                    <div className="flex gap-2">
                      {(['any', 'all'] as const).map((m) => (
                        <button key={m} onClick={() => onChange({ trigger: { ...t, matchMode: m } })}
                          className={cn('flex-1 px-3 py-2 rounded-lg text-xs font-medium border transition-colors',
                            t.matchMode === m ? 'bg-brand-600/20 border-brand-600 text-brand-400' : 'bg-surface-700 border-surface-600 text-surface-400 hover:text-surface-200',
                          )}>
                          {m === 'any' ? 'Qualquer palavra' : 'Todas as palavras'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <p className="text-[10px] text-surface-500">A detecção é case-insensitive e funciona em mensagens do cliente, não do agente.</p>
                </div>
              )
            })()}
            {trigger.type === 'estagio_crm' && (
              <div className="space-y-2">
                <label className="block text-xs font-medium text-surface-300 mb-1.5">Quando o contato avançar para:</label>
                <select
                  value={(trigger as Extract<AutomationTrigger, { type: 'estagio_crm' }>).stageKey}
                  onChange={(e) => onChange({ trigger: { type: 'estagio_crm', stageKey: e.target.value } })}
                  className="w-full bg-surface-700 border border-surface-600 rounded-lg px-3 py-2 text-sm text-surface-100 focus:outline-none focus:border-brand-600"
                >
                  <option value="">Selecione um estágio…</option>
                  {stages.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                </select>
                <p className="text-[10px] text-surface-500">Dispara quando qualquer usuário mover um contato para este estágio no pipeline.</p>
              </div>
            )}
            {trigger.type === 'custom' && (
              <CustomTriggerForm
                trigger={trigger as Extract<AutomationTrigger, { type: 'custom' }>}
                stages={stages}
                onChange={(t) => onChange({ trigger: t })}
              />
            )}
        </div>
      )}
    </div>
  )
}

// ── Step 2 — Conditions ───────────────────────────────────────────────────────

const CONDITION_FIELDS: { value: AutomationConditionField; label: string }[] = [
  { value: 'stage',        label: 'Estágio CRM'    },
  { value: 'tag',          label: 'Tag'             },
  { value: 'source',       label: 'Origem'          },
  { value: 'department',   label: 'Departamento'    },
  { value: 'assigned_to',  label: 'Atribuído a'     },
  { value: 'intent',       label: 'Intenção'        },
  { value: 'lead_score',   label: 'Lead Score'      },
]

const OPERATORS_FOR_FIELD: Record<AutomationConditionField, { value: AutomationConditionOperator; label: string }[]> = {
  stage:       [{ value: 'equals', label: 'é' }, { value: 'not_equals', label: 'não é' }],
  tag:         [{ value: 'contains', label: 'tem tag' }, { value: 'not_contains', label: 'não tem tag' }],
  source:      [{ value: 'equals', label: 'é' }, { value: 'not_equals', label: 'não é' }],
  department:  [{ value: 'equals', label: 'é' }, { value: 'not_equals', label: 'não é' }],
  assigned_to: [{ value: 'is_set', label: 'está atribuído' }, { value: 'is_not_set', label: 'não atribuído' }, { value: 'equals', label: 'é específico' }],
  intent:      [{ value: 'equals', label: 'é' }, { value: 'not_equals', label: 'não é' }],
  lead_score:  [{ value: 'greater_than', label: 'maior que' }, { value: 'less_than', label: 'menor que' }, { value: 'equals', label: 'igual a' }],
  none:        [],
}

const SOURCE_OPTIONS = [
  { value: 'meta_ads',  label: 'Meta Ads' },
  { value: 'whatsapp',  label: 'WhatsApp (orgânico)' },
  { value: 'google_ads',label: 'Google Ads' },
  { value: 'import',    label: 'Importação' },
  { value: 'manual',    label: 'Manual' },
  { value: 'api',       label: 'API' },
]

const INTENT_OPTIONS = [
  { value: 'high',    label: 'Alta' },
  { value: 'medium',  label: 'Média' },
  { value: 'low',     label: 'Baixa' },
  { value: 'unknown', label: 'Desconhecida' },
]

export function Step2({ draft, onChange }: { draft: WizardDraft; onChange: (d: Partial<WizardDraft>) => void }) {
  const conditions = draft.conditions ?? []
  const [stages, setStages] = useState<TenantStage[]>([])
  const [tags, setTags]     = useState<Array<{ id: string; name: string }>>([])
  const [users, setUsers]   = useState<Array<{ id: string; name: string }>>([])
  const [depts, setDepts]   = useState<Array<{ id: string; name: string }>>([])

  useEffect(() => {
    stagesApi.list().then((r) => setStages(r.data)).catch(() => {})
    tagsApi.list().then((r) => setTags(r.data.map((t) => ({ id: t.id, name: t.name })))).catch(() => {})
    usersApi.list().then((r) => setUsers(r.data.map((u) => ({ id: u.id, name: `${u.firstName} ${u.lastName}` })))).catch(() => {})
    departmentsApi.list().then((r) => setDepts(r.data.map((d: any) => ({ id: d.id, name: d.name })))).catch(() => {})
  }, [])

  const addCondition = () =>
    onChange({ conditions: [...conditions, { field: 'stage', operator: 'equals', value: '' }] })

  const updateCondition = (i: number, patch: Partial<AutomationCondition>) =>
    onChange({ conditions: conditions.map((c, j) => j === i ? { ...c, ...patch } : c) })

  const removeCondition = (i: number) =>
    onChange({ conditions: conditions.filter((_, j) => j !== i) })

  const noValueOps: AutomationConditionOperator[] = ['is_set', 'is_not_set']

  const renderValueInput = (cond: AutomationCondition, i: number) => {
    const selectClass = "w-full bg-surface-700 border border-surface-600 rounded-lg px-2.5 py-1.5 text-xs text-surface-200 focus:outline-none focus:border-brand-600"

    switch (cond.field) {
      case 'stage':
        return (
          <select value={cond.value} onChange={(e) => updateCondition(i, { value: e.target.value })} className={selectClass}>
            <option value="">Selecione um estágio…</option>
            {stages.map((s) => <option key={s.key ?? s.id} value={s.key ?? s.id}>{s.label ?? s.name}</option>)}
          </select>
        )
      case 'tag':
        return (
          <select value={cond.value} onChange={(e) => updateCondition(i, { value: e.target.value })} className={selectClass}>
            <option value="">Selecione uma tag…</option>
            {tags.map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}
          </select>
        )
      case 'department':
        return (
          <select value={cond.value} onChange={(e) => updateCondition(i, { value: e.target.value })} className={selectClass}>
            <option value="">Selecione um departamento…</option>
            {depts.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
          </select>
        )
      case 'assigned_to':
        return (
          <select value={cond.value} onChange={(e) => updateCondition(i, { value: e.target.value })} className={selectClass}>
            <option value="">Selecione um agente…</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        )
      case 'source':
        return (
          <select value={cond.value} onChange={(e) => updateCondition(i, { value: e.target.value })} className={selectClass}>
            <option value="">Selecione a origem…</option>
            {SOURCE_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        )
      case 'intent':
        return (
          <select value={cond.value} onChange={(e) => updateCondition(i, { value: e.target.value })} className={selectClass}>
            <option value="">Selecione a intenção…</option>
            {INTENT_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        )
      case 'lead_score':
        return (
          <input
            type="number" min={0} max={100}
            value={cond.value}
            onChange={(e) => updateCondition(i, { value: e.target.value })}
            placeholder="ex: 70"
            className={selectClass}
          />
        )
      default:
        return (
          <input
            value={cond.value}
            onChange={(e) => updateCondition(i, { value: e.target.value })}
            placeholder="valor…"
            className={selectClass}
          />
        )
    }
  }

  return (
    <div className="space-y-4">
      {/* Info */}
      <div className="flex items-start gap-2.5 p-3.5 bg-surface-800/60 border border-surface-700 rounded-xl">
        <div>
          <p className="text-xs font-semibold text-surface-200">Passo opcional</p>
          <p className="text-xs text-surface-400 mt-0.5 leading-relaxed">
            Adicione filtros para que a automação dispare apenas para contatos específicos. Ex: somente leads com intenção "Alta", somente do departamento de Suporte, etc.
          </p>
        </div>
      </div>

      {/* AND/OR toggle */}
      {conditions.length > 1 && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-surface-500">Combinar condições com:</span>
          <div className="flex gap-1.5">
            {(['and', 'or'] as const).map((l) => (
              <button key={l} onClick={() => onChange({ conditionsLogic: l })}
                className={cn('px-3 py-1 rounded-lg text-xs font-semibold border transition-colors',
                  draft.conditionsLogic === l ? 'bg-brand-600/20 border-brand-600 text-brand-400' : 'bg-surface-800 border-surface-700 text-surface-500 hover:text-surface-300',
                )}>
                {l === 'and' ? 'E (todas verdadeiras)' : 'OU (qualquer verdadeira)'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Conditions */}
      <div className="space-y-2">
        {conditions.map((cond, i) => {
          const ops = OPERATORS_FOR_FIELD[cond.field] ?? []
          const hideValue = noValueOps.includes(cond.operator)
          return (
            <div key={i} className="bg-surface-800 border border-surface-700 rounded-xl p-3 space-y-2">
              <div className="flex items-center gap-2">
                {/* Field */}
                <select
                  value={cond.field}
                  onChange={(e) => {
                    const f = e.target.value as AutomationConditionField
                    const newOp = (OPERATORS_FOR_FIELD[f]?.[0]?.value ?? 'equals') as AutomationConditionOperator
                    updateCondition(i, { field: f, operator: newOp, value: '' })
                  }}
                  className="flex-1 bg-surface-700 border border-surface-600 rounded-lg px-2.5 py-1.5 text-xs text-surface-200 focus:outline-none focus:border-brand-600"
                >
                  {CONDITION_FIELDS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
                {/* Operator */}
                <select
                  value={cond.operator}
                  onChange={(e) => updateCondition(i, { operator: e.target.value as AutomationConditionOperator })}
                  className="w-36 bg-surface-700 border border-surface-600 rounded-lg px-2.5 py-1.5 text-xs text-surface-200 focus:outline-none focus:border-brand-600"
                >
                  {ops.map((op) => <option key={op.value} value={op.value}>{op.label}</option>)}
                </select>
                <button onClick={() => removeCondition(i)} className="text-surface-600 hover:text-danger transition-colors flex-shrink-0">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              {/* Value */}
              {!hideValue && renderValueInput(cond, i)}
            </div>
          )
        })}
      </div>

      {conditions.length < 5 && (
        <button onClick={addCondition} className="flex items-center gap-2 text-xs text-brand-400 hover:text-brand-300 transition-colors">
          <Plus className="w-3.5 h-3.5" />
          Adicionar condição {conditions.length > 0 ? `(${5 - conditions.length} restantes)` : ''}
        </button>
      )}
    </div>
  )
}

// ── Step 3 — Actions ──────────────────────────────────────────────────────────

type ActionType = AutomationAction['type']

const ACTION_OPTIONS: { type: ActionType; label: string; description: string; icon: React.ReactNode; color: string }[] = [
  { type: 'send_message',        label: 'Enviar template',      description: 'Template aprovado pela Meta',       icon: <FileText className="w-3.5 h-3.5" />,     color: '#a1a1aa' },
  { type: 'send_text',           label: 'Enviar texto',          description: 'Mensagem de texto livre (24h)',     icon: <MessageSquare className="w-3.5 h-3.5" />, color: '#a1a1aa' },
  { type: 'assign_agent',        label: 'Atribuir agente',       description: 'Designar para um atendente',       icon: <User className="w-3.5 h-3.5" />,          color: '#a1a1aa' },
  { type: 'assign_dept',         label: 'Atribuir depto.',       description: 'Encaminhar para departamento',     icon: <Building2 className="w-3.5 h-3.5" />,     color: '#a1a1aa' },
  { type: 'add_tag',             label: 'Adicionar tag',         description: 'Marcar o contato com uma tag',     icon: <Tag className="w-3.5 h-3.5" />,           color: '#a1a1aa' },
  { type: 'remove_tag',          label: 'Remover tag',           description: 'Remover tag do contato',           icon: <XCircle className="w-3.5 h-3.5" />,       color: '#a1a1aa' },
  { type: 'change_stage',        label: 'Mudar estágio',         description: 'Mover no pipeline do CRM',         icon: <GitBranch className="w-3.5 h-3.5" />,     color: '#a1a1aa' },
  { type: 'set_lead_score',      label: 'Definir lead score',    description: 'Atribuir pontuação 0–100',         icon: <Star className="w-3.5 h-3.5" />,          color: '#a1a1aa' },
  { type: 'resolve_conversation',label: 'Resolver conversa',     description: 'Marcar conversa como resolvida',   icon: <CheckCircle className="w-3.5 h-3.5" />,   color: '#a1a1aa' },
  { type: 'send_note',           label: 'Nota interna',          description: 'Adicionar nota à conversa',        icon: <StickyNote className="w-3.5 h-3.5" />,    color: '#a1a1aa' },
  { type: 'send_webhook',        label: 'Webhook / API',         description: 'Chamar URL externa (POST/GET)',    icon: <Webhook className="w-3.5 h-3.5" />,       color: '#a1a1aa' },
]

function ActionSubForm({
  action,
  onUpdate,
  templates,
  stages,
  users,
  tags,
  depts,
}: {
  action: AutomationAction
  onUpdate: (patch: AutomationAction) => void
  templates: WhatsAppTemplate[]
  stages: TenantStage[]
  users: Array<{ id: string; name: string }>
  tags: Array<{ id: string; name: string }>
  depts: Array<{ id: string; name: string }>
}) {
  return (
    <div key={action.type} className="mt-2 space-y-2">
        {action.type === 'send_message' && (
          <div>
            <label className="block text-[10px] font-medium text-surface-400 mb-1">Template WhatsApp (aprovado)</label>
            <select
              value={action.templateId}
              onChange={(e) => {
                const tpl = templates.find((t) => t.id === e.target.value)
                onUpdate({ type: 'send_message', templateId: e.target.value, templateName: tpl?.name ?? '' })
              }}
              className="w-full bg-surface-900 border border-surface-700 rounded-lg px-2.5 py-1.5 text-xs text-surface-200 focus:outline-none focus:border-brand-600"
            >
              <option value="">Selecione um template…</option>
              {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            {templates.length === 0 && <p className="text-[10px] text-surface-500 mt-1">Nenhum template aprovado. Crie em Disparos → Templates.</p>}
          </div>
        )}
        {action.type === 'send_text' && (
          <div>
            <label className="block text-[10px] font-medium text-surface-400 mb-1">Mensagem de texto</label>
            <textarea rows={3} value={action.body}
              onChange={(e) => onUpdate({ type: 'send_text', body: e.target.value })}
              placeholder="Olá! Estamos aqui para ajudar..."
              className="w-full bg-surface-900 border border-surface-700 rounded-lg px-2.5 py-1.5 text-xs text-surface-200 placeholder-surface-600 focus:outline-none focus:border-brand-600 resize-none"
            />
            <p className="text-[10px] text-surface-600 mt-0.5">Apenas em conversas abertas dentro da janela de 24h.</p>
          </div>
        )}
        {action.type === 'send_note' && (
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] font-medium text-surface-400 mb-1">Nota interna (opcional)</label>
              <textarea rows={2} value={action.note}
                onChange={(e) => onUpdate({ ...action, type: 'send_note', note: e.target.value })}
                placeholder="Opcional. Se deixar vazio, o Oryon gera o texto a partir do contexto."
                className="w-full bg-surface-900 border border-surface-700 rounded-lg px-2.5 py-1.5 text-xs text-surface-200 placeholder-surface-600 focus:outline-none focus:border-brand-600 resize-none"
              />
              <p className="text-[10px] text-surface-500 mt-1 leading-relaxed">
                O sistema já gera título e descrição com a origem real (ex: &quot;disparada manualmente por João&quot;).
                Essa nota aparece como observação extra. Você pode usar variáveis:{' '}
                <code className="text-brand-300">{'{{contact.name}}'}</code>,{' '}
                <code className="text-brand-300">{'{{contact.phone}}'}</code>,{' '}
                <code className="text-brand-300">{'{{source.label}}'}</code>,{' '}
                <code className="text-brand-300">{'{{automation.name}}'}</code>,{' '}
                <code className="text-brand-300">{'{{trigger.label}}'}</code>.
              </p>
            </div>

            {/* Phase 19: who receives this notification? */}
            <div>
              <label className="block text-[10px] font-medium text-surface-400 mb-1">Notificar</label>
              <select
                value={action.notifyScope ?? 'admins'}
                onChange={(e) => {
                  const scope = e.target.value as 'admins' | 'department' | 'user' | 'all'
                  onUpdate({
                    ...action,
                    type: 'send_note',
                    notifyScope: scope,
                    // Clear dependent fields when scope changes
                    ...(scope !== 'department' ? { departmentId: undefined, departmentName: undefined } : {}),
                    ...(scope !== 'user' ? { notifyUserId: undefined, notifyUserName: undefined } : {}),
                  })
                }}
                className="w-full bg-surface-900 border border-surface-700 rounded-lg px-2.5 py-1.5 text-xs text-surface-200 focus:outline-none focus:border-brand-600"
              >
                <option value="admins">Apenas administradores</option>
                <option value="department">Um departamento</option>
                <option value="user">Um usuário específico</option>
                <option value="all">Todos os usuários ativos</option>
              </select>
              <p className="text-[10px] text-surface-500 mt-1">
                Default: administradores. Evite &quot;todos&quot; em automações que disparam com alta frequência.
              </p>
            </div>

            {action.notifyScope === 'department' && (
              <div>
                <label className="block text-[10px] font-medium text-surface-400 mb-1">Departamento</label>
                <select
                  value={action.departmentId ?? ''}
                  onChange={(e) => {
                    const d = depts.find((d) => d.id === e.target.value)
                    onUpdate({
                      ...action,
                      type: 'send_note',
                      departmentId: e.target.value,
                      departmentName: d?.name ?? '',
                    })
                  }}
                  className="w-full bg-surface-900 border border-surface-700 rounded-lg px-2.5 py-1.5 text-xs text-surface-200 focus:outline-none focus:border-brand-600"
                >
                  <option value="">Selecione um departamento…</option>
                  {depts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
            )}

            {action.notifyScope === 'user' && (
              <div>
                <label className="block text-[10px] font-medium text-surface-400 mb-1">Usuário</label>
                <select
                  value={action.notifyUserId ?? ''}
                  onChange={(e) => {
                    const u = users.find((u) => u.id === e.target.value)
                    onUpdate({
                      ...action,
                      type: 'send_note',
                      notifyUserId: e.target.value,
                      notifyUserName: u?.name ?? '',
                    })
                  }}
                  className="w-full bg-surface-900 border border-surface-700 rounded-lg px-2.5 py-1.5 text-xs text-surface-200 focus:outline-none focus:border-brand-600"
                >
                  <option value="">Selecione um usuário…</option>
                  {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
            )}
          </div>
        )}
        {action.type === 'assign_agent' && (
          <div>
            <label className="block text-[10px] font-medium text-surface-400 mb-1">Atribuir para</label>
            <select
              value={action.userId}
              onChange={(e) => {
                const u = users.find((u) => u.id === e.target.value)
                onUpdate({ type: 'assign_agent', userId: e.target.value, userName: u?.name ?? '' })
              }}
              className="w-full bg-surface-900 border border-surface-700 rounded-lg px-2.5 py-1.5 text-xs text-surface-200 focus:outline-none focus:border-brand-600"
            >
              <option value="">Selecione um agente…</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
        )}
        {action.type === 'assign_dept' && (
          <div>
            <label className="block text-[10px] font-medium text-surface-400 mb-1">Departamento</label>
            <select
              value={action.departmentId}
              onChange={(e) => {
                const d = depts.find((d) => d.id === e.target.value)
                onUpdate({ type: 'assign_dept', departmentId: e.target.value, departmentName: d?.name ?? '' })
              }}
              className="w-full bg-surface-900 border border-surface-700 rounded-lg px-2.5 py-1.5 text-xs text-surface-200 focus:outline-none focus:border-brand-600"
            >
              <option value="">Selecione um departamento…</option>
              {depts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            {depts.length === 0 && <p className="text-[10px] text-surface-500 mt-1">Nenhum departamento cadastrado. Crie em Configurações → Setores.</p>}
          </div>
        )}
        {(action.type === 'add_tag' || action.type === 'remove_tag') && (
          <div>
            <label className="block text-[10px] font-medium text-surface-400 mb-1">{action.type === 'add_tag' ? 'Tag a adicionar' : 'Tag a remover'}</label>
            <select
              value={action.tagId}
              onChange={(e) => {
                const tag = tags.find((t) => t.id === e.target.value)
                onUpdate({ type: action.type, tagId: e.target.value, tagName: tag?.name ?? '' } as AutomationAction)
              }}
              className="w-full bg-surface-900 border border-surface-700 rounded-lg px-2.5 py-1.5 text-xs text-surface-200 focus:outline-none focus:border-brand-600"
            >
              <option value="">Selecione uma tag…</option>
              {tags.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        )}
        {action.type === 'change_stage' && (
          <div>
            <label className="block text-[10px] font-medium text-surface-400 mb-1">Mover para estágio</label>
            <select
              value={action.stageKey}
              onChange={(e) => {
                const s = stages.find((s) => s.key === e.target.value)
                onUpdate({ type: 'change_stage', stageKey: e.target.value, stageLabel: s?.label ?? '' })
              }}
              className="w-full bg-surface-900 border border-surface-700 rounded-lg px-2.5 py-1.5 text-xs text-surface-200 focus:outline-none focus:border-brand-600"
            >
              <option value="">Selecione um estágio…</option>
              {stages.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </div>
        )}
        {action.type === 'set_lead_score' && (
          <div>
            <label className="block text-[10px] font-medium text-surface-400 mb-1">Pontuação (0–100)</label>
            <div className="flex items-center gap-3">
              <input type="number" min={0} max={100} value={action.score}
                onChange={(e) => onUpdate({ type: 'set_lead_score', score: Math.min(100, Math.max(0, Number(e.target.value))) })}
                className="w-20 bg-surface-900 border border-surface-700 rounded-lg px-2.5 py-1.5 text-xs text-surface-200 focus:outline-none focus:border-brand-600"
              />
              <div className="flex gap-1.5">
                {[0, 25, 50, 75, 100].map((v) => (
                  <button key={v} onClick={() => onUpdate({ type: 'set_lead_score', score: v })}
                    className={cn('px-2 py-1 rounded-lg text-[10px] font-medium border transition-colors',
                      action.score === v ? 'bg-brand-600/20 border-brand-600 text-brand-400' : 'bg-surface-800 border-surface-700 text-surface-500 hover:text-surface-300',
                    )}>
                    {v}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        {action.type === 'resolve_conversation' && (
          <p className="text-[11px] text-surface-500">A conversa será marcada como <strong className="text-surface-300">resolvida</strong> automaticamente. Nenhuma configuração adicional necessária.</p>
        )}
        {action.type === 'send_webhook' && (
          <div className="space-y-2">
            <div>
              <label className="block text-[10px] font-medium text-surface-400 mb-1">URL do endpoint</label>
              <input placeholder="https://sua-api.com/webhook" value={action.url}
                onChange={(e) => onUpdate({ type: 'send_webhook', url: e.target.value, method: action.method })}
                className="w-full bg-surface-900 border border-surface-700 rounded-lg px-2.5 py-1.5 text-xs text-surface-200 placeholder-surface-600 focus:outline-none focus:border-brand-600"
              />
            </div>
            <div className="flex gap-2">
              {(['POST', 'GET'] as const).map((m) => (
                <button key={m} onClick={() => onUpdate({ type: 'send_webhook', url: action.url, method: m })}
                  className={cn('px-3 py-1 rounded-lg text-xs font-mono font-bold border transition-colors',
                    action.method === m ? 'bg-brand-600/20 border-brand-600 text-brand-400' : 'bg-surface-800 border-surface-700 text-surface-500 hover:text-surface-300',
                  )}>
                  {m}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-surface-600">O payload inclui: contactId, conversationId, triggerType, timestamp.</p>
          </div>
        )}
    </div>
  )
}

export function Step3({ draft, onChange, hideAgentBehavior }: { draft: WizardDraft; onChange: (d: Partial<WizardDraft>) => void; hideAgentBehavior?: boolean }) {
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([])
  const [stages, setStages]       = useState<TenantStage[]>([])
  const [users, setUsers]         = useState<Array<{ id: string; name: string }>>([])
  const [tags, setTags]           = useState<Array<{ id: string; name: string }>>([])
  const [depts, setDepts]         = useState<Array<{ id: string; name: string }>>([])

  useEffect(() => {
    templatesApi.list('APPROVED').then((r) => setTemplates(r.data)).catch(() => {})
    stagesApi.list().then((r) => setStages(r.data)).catch(() => {})
    usersApi.list().then((r) => setUsers(r.data.map((u) => ({ id: u.id, name: `${u.firstName} ${u.lastName}` })))).catch(() => {})
    tagsApi.list().then((r) => setTags(r.data.map((t) => ({ id: t.id, name: t.name })))).catch(() => {})
    departmentsApi.list().then((r) => setDepts(r.data.map((d: any) => ({ id: d.id, name: d.name })))).catch(() => {})
  }, [])

  const actions = draft.actions ?? []

  const addAction = (type: ActionType) => {
    const defaults: Record<ActionType, AutomationAction> = {
      send_message:         { type: 'send_message',         templateId: '', templateName: '' },
      send_text:            { type: 'send_text',            body: '' },
      assign_agent:         { type: 'assign_agent',         userId: '', userName: '' },
      assign_dept:          { type: 'assign_dept',          departmentId: '', departmentName: '' },
      add_tag:              { type: 'add_tag',              tagId: '', tagName: '' },
      remove_tag:           { type: 'remove_tag',           tagId: '', tagName: '' },
      change_stage:         { type: 'change_stage',         stageKey: '', stageLabel: '' },
      set_lead_score:       { type: 'set_lead_score',       score: 50 },
      resolve_conversation: { type: 'resolve_conversation' },
      send_note:            { type: 'send_note',            note: '' },
      send_webhook:         { type: 'send_webhook',         url: '', method: 'POST' },
    }
    onChange({ actions: [...actions, defaults[type]] })
  }

  const updateAction = (i: number, updated: AutomationAction) =>
    onChange({ actions: actions.map((a, j) => j === i ? updated : a) })

  const removeAction = (i: number) =>
    onChange({ actions: actions.filter((_, j) => j !== i) })

  const usedTypes = new Set(actions.map((a) => a.type))

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 p-3 bg-surface-800/60 border border-surface-700 rounded-xl">
        <p className="text-xs text-surface-400 leading-relaxed">
          Adicione <strong className="text-surface-200">uma ou mais ações</strong> que serão executadas em sequência quando o gatilho disparar.
        </p>
      </div>

      {/* Current actions */}
      {actions.length > 0 && (
        <div className="space-y-2">
          {actions.map((action, i) => {
            const opt = ACTION_OPTIONS.find((o) => o.type === action.type)
            if (!opt) return null
            return (
              <div key={i} className="bg-surface-800 border border-surface-700 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: opt.color + '20', color: opt.color }}>
                    {opt.icon}
                  </div>
                  <span className="text-xs font-semibold text-surface-200 flex-1">{i + 1}. {opt.label}</span>
                  <button onClick={() => removeAction(i)} className="text-surface-600 hover:text-danger transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <ActionSubForm
                  action={action}
                  onUpdate={(updated) => updateAction(i, updated)}
                  templates={templates} stages={stages} users={users} tags={tags} depts={depts}
                />
              </div>
            )
          })}
        </div>
      )}

      {/* Add action */}
      {actions.length < 5 && (
        <div>
          <p className="text-xs font-medium text-surface-400 mb-2">
            {actions.length === 0 ? 'Escolha a primeira ação:' : '+ Adicionar outra ação:'}
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {ACTION_OPTIONS.filter((o) => !usedTypes.has(o.type) || ['add_tag', 'remove_tag', 'send_note'].includes(o.type)).map((opt) => (
              <button
                key={opt.type}
                onClick={() => addAction(opt.type)}
                className="flex items-center gap-2 p-2.5 rounded-xl border border-surface-700 bg-surface-800 hover:border-surface-600 text-left transition-colors"
              >
                <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: opt.color + '20', color: opt.color }}>
                  {opt.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-surface-300">{opt.label}</p>
                  <p className="text-[10px] text-surface-500 leading-tight">{opt.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {!hideAgentBehavior && <AgentBehaviorSelector draft={draft} onChange={onChange} />}
    </div>
  )
}

/**
 * Controls whether the AI agent stays silent when this automation matches
 * an inbound WhatsApp message. Sits at the end of Step 3 (actions) because
 * the 'auto' mode reads the actions list to decide, so the preview here
 * updates as the operator adds/removes actions.
 *
 * Kept intentionally verbose on the helper copy — this is the one setting
 * most likely to surprise operators ("why isn't my agent replying?") so
 * every option ships with a one-liner explaining the exact outcome.
 */
export function AgentBehaviorSelector({
  draft,
  onChange,
}: {
  draft: WizardDraft
  onChange: (d: Partial<WizardDraft>) => void
}) {
  const behavior = draft.agentBehavior ?? 'auto'
  const MESSAGING = new Set(['send_message', 'send_template', 'send_text'])
  const hasMessaging = (draft.actions ?? []).some((a) => MESSAGING.has(a.type))

  const autoOutcome = hasMessaging
    ? 'Esta automação envia mensagem → a IA ficará em silêncio quando ela disparar.'
    : 'Esta automação não envia mensagem → a IA continuará respondendo normalmente.'

  const options: Array<{
    value: 'auto' | 'always_silence' | 'never_silence'
    label: string
    help: string
  }> = [
    { value: 'auto',            label: 'Automático (recomendado)', help: autoOutcome },
    { value: 'always_silence',  label: 'Sempre silenciar IA',       help: 'Quando esta automação disparar, a IA nunca responde, mesmo que a automação não envie mensagem.' },
    { value: 'never_silence',   label: 'Nunca silenciar IA',        help: 'A IA sempre responde em paralelo — útil para automações de log, tag ou webhook.' },
  ]

  return (
    <div className="mt-4 pt-4 border-t border-surface-700">
      <label className="block text-xs font-medium text-surface-300 mb-1">
        Comportamento do agente IA
      </label>
      <p className="text-[11px] text-surface-500 mb-2.5 leading-relaxed">
        Quando esta automação dispara em uma conversa que tem IA ativa, como os dois devem coexistir?
      </p>
      <div className="space-y-1.5">
        {options.map((opt) => {
          const active = behavior === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange({ agentBehavior: opt.value })}
              className={cn(
                'w-full text-left p-2.5 rounded-xl border transition-colors',
                active
                  ? 'border-brand-600 bg-brand-600/10'
                  : 'border-surface-700 bg-surface-800 hover:border-surface-600',
              )}
            >
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'w-3.5 h-3.5 rounded-full border-2 flex-shrink-0',
                    active ? 'border-brand-500 bg-brand-500' : 'border-surface-600',
                  )}
                />
                <span className={cn('text-xs font-semibold', active ? 'text-surface-100' : 'text-surface-300')}>
                  {opt.label}
                </span>
              </div>
              <p className="text-[10px] text-surface-500 leading-tight mt-1 ml-5">{opt.help}</p>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Wizard root ───────────────────────────────────────────────────────────────

export const EMPTY_DRAFT: WizardDraft = {
  name: '', description: '', type: 'boas_vindas', status: 'active',
  trigger: { type: 'boas_vindas' }, conditionsLogic: 'and', conditions: [], actions: [],
  agentBehavior: 'auto',
}
