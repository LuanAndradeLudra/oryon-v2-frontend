import { useState } from 'react'
import { Eye, EyeOff, CheckCircle2, XCircle, Loader2, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { ConnectorTile } from './ConnectorTile'
import type { Connector, CredentialFieldSchema } from './connectorsMock'

type TestState = 'idle' | 'testing' | 'success' | 'error'

interface ConnectorCredentialModalProps {
  connector: Connector
  onClose: () => void
  onSaved: () => void
}

function defaultValues(fields: CredentialFieldSchema[]): Record<string, string> {
  const values: Record<string, string> = {}
  for (const f of fields) {
    if (f.kind === 'segmented') values[f.key] = f.options[0]
    else if (f.kind === 'select') values[f.key] = ''
    else values[f.key] = ''
  }
  return values
}

function defaultPermissions(fields: CredentialFieldSchema[]): Record<string, boolean> {
  const perms: Record<string, boolean> = {}
  for (const f of fields) {
    if (f.kind === 'permissions') {
      for (const item of f.items) perms[item.id] = item.defaultChecked
    }
  }
  return perms
}

export function ConnectorCredentialModal({ connector, onClose, onSaved }: ConnectorCredentialModalProps) {
  const schema = connector.credential
  const [values, setValues] = useState<Record<string, string>>(() => defaultValues(schema?.fields ?? []))
  const [permissions, setPermissions] = useState<Record<string, boolean>>(() => defaultPermissions(schema?.fields ?? []))
  const [revealSecret, setRevealSecret] = useState<Record<string, boolean>>({})
  const [editingSecret, setEditingSecret] = useState<Record<string, boolean>>({})
  const [testState, setTestState] = useState<TestState>('idle')
  const [testedAt, setTestedAt] = useState<string | null>(null)

  if (!schema) return null

  const errored = testState === 'error'
  const erroredField = errored && schema.testResult.ok === false ? schema.testResult.fieldKey : null

  function runTest() {
    setTestState('testing')
    // Casca visual — resultado fixo do mock (connectorsMock.ts), sem chamada real.
    setTimeout(() => {
      setTestState(schema!.testResult.ok ? 'success' : 'error')
      setTestedAt('agora')
    }, 700)
  }

  return (
    <Modal
      open
      onClose={onClose}
      className="max-w-[520px]"
      title={
        <div className="flex items-start gap-2.5 min-w-0">
          <ConnectorTile connector={connector} size={32} radius={8} />
          <div className="min-w-0">
            <h2 className="text-[15px] font-bold text-surface-50 truncate">
              {connector.status === 'installed' ? 'Credencial' : 'Conectar'} · {connector.name}
            </h2>
            <p className="text-2xs text-surface-500 mt-0.5">
              Válida para todo o workspace. Agentes escolhem usar ou não.
            </p>
          </div>
        </div>
      }
      footer={
        <div className="flex items-center gap-2">
          {connector.status === 'installed' && (
            <button type="button" className="text-xs font-medium text-danger hover:opacity-80 mr-auto">
              Remover credencial
            </button>
          )}
          <span className="flex-1" />
          {testState !== 'success' && (
            <span className="text-2xs text-surface-500">Salvar libera após um teste OK</span>
          )}
          <Button variant="neutral" onClick={onClose}>Cancelar</Button>
          <Button
            variant="primary"
            disabled={testState !== 'success'}
            onClick={onSaved}
          >
            {connector.status === 'installed' ? 'Salvar credencial' : 'Salvar e conectar'}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-3.5">
        {schema.fields.map((field) => {
          if (field.kind === 'segmented') {
            return (
              <FormField key={field.key} label={field.label}>
                <SegmentedControl
                  label={field.label}
                  value={values[field.key]}
                  onChange={(v) => setValues((s) => ({ ...s, [field.key]: v }))}
                  options={field.options.map((o) => ({ value: o, label: o }))}
                />
              </FormField>
            )
          }
          if (field.kind === 'select') {
            return (
              <FormField key={field.key} label={field.label} requirement={field.optional ? 'optional' : undefined}>
                <Select value={values[field.key]} onChange={(e) => setValues((s) => ({ ...s, [field.key]: e.target.value }))}>
                  <option value="">Selecione…</option>
                  {field.options.map((o) => <option key={o} value={o}>{o}</option>)}
                </Select>
              </FormField>
            )
          }
          if (field.kind === 'secret') {
            const revealed = !!revealSecret[field.key]
            return (
              <FormField
                key={field.key}
                label={field.label}
                hint={field.hint}
                error={erroredField === field.key && schema.testResult.ok === false ? schema.testResult.message : undefined}
              >
                <div className="relative">
                  {/* Segredo já salvo (conector instalado), ainda não editado nesta
                      sessão: mostra a prévia mascarada com prefixo/sufixo visíveis
                      (mock), não um campo vazio nem o mascaramento nativo do
                      `type="password"` (esconde tudo, sem pista do valor). Ao
                      digitar, vira campo normal — a prévia representa o valor
                      salvo, não o que está sendo digitado agora. */}
                  {!revealed && field.savedPreview && values[field.key] === '' && !editingSecret[field.key] ? (
                    <button
                      type="button"
                      onClick={() => setEditingSecret((s) => ({ ...s, [field.key]: true }))}
                      className="w-full h-9 flex items-center px-3 rounded-lg border border-surface-700 bg-surface-800 font-mono text-sm text-surface-300 pr-9 text-left"
                    >
                      {field.savedPreview}
                    </button>
                  ) : (
                    <Input
                      type={revealed ? 'text' : 'password'}
                      className="font-mono pr-9"
                      value={values[field.key]}
                      placeholder="••••••••••••"
                      onChange={(e) => { setValues((s) => ({ ...s, [field.key]: e.target.value })); setTestState('idle') }}
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => setRevealSecret((s) => ({ ...s, [field.key]: !s[field.key] }))}
                    aria-label={revealed ? 'Ocultar' : 'Mostrar'}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-surface-500 hover:text-surface-300"
                  >
                    {revealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                {!erroredField && (
                  <p className="text-2xs text-surface-600">Armazenado criptografado. Nunca mostrado inteiro depois de salvo.</p>
                )}
              </FormField>
            )
          }
          if (field.kind === 'permissions') {
            return (
              <FormField key={field.key} label={field.label}>
                <div className="border border-surface-700 rounded-[7px] divide-y divide-surface-700">
                  {field.items.map((item) => {
                    const checked = permissions[item.id]
                    return (
                      <label key={item.id} className="flex items-center gap-2.5 px-3 py-2 text-sm text-surface-200 cursor-pointer">
                        <span
                          className={cn(
                            'w-3.5 h-3.5 rounded-full border flex items-center justify-center flex-shrink-0',
                            checked ? 'border-success bg-success/15 text-success' : 'border-surface-600',
                          )}
                          aria-hidden
                        >
                          {checked && <Check className="w-2.5 h-2.5" strokeWidth={3} />}
                        </span>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => setPermissions((s) => ({ ...s, [item.id]: e.target.checked }))}
                          className="sr-only"
                        />
                        <span className="flex-1">{item.label}</span>
                        {item.optional && <span className="text-2xs text-surface-500">opcional</span>}
                      </label>
                    )
                  })}
                </div>
              </FormField>
            )
          }
          return (
            <FormField key={field.key} label={field.label} hint={field.hint}>
              <Input
                className="font-mono"
                value={values[field.key]}
                placeholder={field.placeholder}
                onChange={(e) => { setValues((s) => ({ ...s, [field.key]: e.target.value })); setTestState('idle') }}
              />
            </FormField>
          )
        })}

        <div className="flex items-center gap-3 pt-1">
          <Button size="sm" variant="neutral" onClick={runTest} loading={testState === 'testing'}>
            {testState === 'error' ? 'Testar de novo' : 'Testar conexão'}
          </Button>
          {testState === 'success' && schema.testResult.ok && (
            <span className="flex items-center gap-1.5 text-xs text-success">
              <CheckCircle2 className="w-3.5 h-3.5" /> Conexão OK · {schema.testResult.detail} · {schema.testResult.ms} ms · {testedAt}
            </span>
          )}
          {testState === 'error' && !schema.testResult.ok && (
            <span className="flex items-center gap-1.5 text-xs text-danger">
              <XCircle className="w-3.5 h-3.5" /> Falhou · {schema.testResult.code} · há 5 s
            </span>
          )}
          {testState === 'testing' && (
            <span className="flex items-center gap-1.5 text-xs text-surface-500">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Testando…
            </span>
          )}
        </div>
      </div>
    </Modal>
  )
}
