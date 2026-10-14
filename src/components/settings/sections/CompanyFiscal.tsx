// ─── Configurações > Empresa > Dados fiscais (SCRUM-1212) ─────────────────────
// Só o dono da conta vê e edita: é o e-mail que recebe as faturas e o
// documento da nota. O backend trava igual (PUT /organizations/current/fiscal
// com @Roles(BUSINESS_ADMIN)); esconder aqui só evita oferecer o que a API recusa.

import { useEffect, useState } from 'react'
import { Receipt } from 'lucide-react'
import { SettingsSection } from '../SettingsSection'
import { Button } from '@/components/ui/Button'
import { ErrorState } from '@/components/ui/ErrorState'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { FiscalDataForm, validateFiscal, type FiscalErrors } from '@/components/billing/FiscalDataForm'
import { firstAccessApi, pickFiscal, type FiscalData } from '@/services/firstAccessApi'
import { useAuth } from '@/contexts/AuthContext'
import { isOwnerTier } from '@/lib/roleHelpers'
import { showToast } from '@/hooks/useToast'
import { getApiErrorMessage } from '@/lib/utils'

export function CompanyFiscal() {
  const { user } = useAuth()
  const owner = isOwnerTier(user?.role)
  const [data, setData] = useState<FiscalData | null>(null)
  const [errors, setErrors] = useState<FiscalErrors>({})
  const [failed, setFailed] = useState(false)
  const [saving, setSaving] = useState(false)
  // "Tentar novamente" sobe a chave e o efeito refaz o fetch (como no CompanyProfile).
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (!owner) return
    let alive = true
    firstAccessApi.getFiscal()
      // CL1 — guarda só os campos do formulário (sem complete/confirmedAt).
      .then((r) => { if (alive) setData(pickFiscal(r)) })
      .catch(() => { if (alive) setFailed(true) })
    return () => { alive = false }
  }, [owner, reloadKey])

  if (!owner) return null

  async function save() {
    if (!data) return
    const errs = validateFiscal(data)
    setErrors(errs)
    if (Object.values(errs).some(Boolean)) return
    setSaving(true)
    try {
      await firstAccessApi.saveFiscal(data)
      showToast('Dados fiscais salvos.', 'success')
    } catch (e) {
      showToast(getApiErrorMessage(e, 'Não foi possível salvar os dados fiscais.'), 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <SettingsSection
      title="Dados fiscais e cobrança"
      description="Usados nas faturas e na nota fiscal. Só o dono da conta pode alterar."
    >
      {failed ? (
        <ErrorState compact onRetry={() => { setFailed(false); setData(null); setReloadKey((k) => k + 1) }} />
      ) : !data ? (
        <SkeletonCard lines={4} />
      ) : (
        <div className="space-y-4">
          <FiscalDataForm value={data} onChange={setData} errors={errors} />
          <div className="flex justify-end">
            <Button onClick={save} loading={saving} leftIcon={<Receipt className="w-4 h-4" />}>Salvar dados fiscais</Button>
          </div>
        </div>
      )}
    </SettingsSection>
  )
}
