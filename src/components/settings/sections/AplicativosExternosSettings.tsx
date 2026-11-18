// Aplicativos de IA externos (ORY-98, épico ORY-94, decisão D7) — a política do workspace.
// Backend: /oauth/politica (admin ou dono). Desligada por padrão: quem decide se dados do
// workspace saem para um assistente de IA de fora (Claude, ChatGPT…) é a empresa.
import { useEffect, useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { SectionHeader } from '../SectionHeader'
import { Banner } from '@/components/ui/Banner'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { ErrorState } from '@/components/ui/ErrorState'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { Switch } from '@/components/ui/Switch'
import { showToast } from '@/hooks/useToast'
import { useAuth } from '@/contexts/AuthContext'
import { publicApiEnabled } from '@/config/featureFlags'
import { roleLabel } from '@/lib/roleHelpers'
import {
  erroDoOAuth,
  lerPoliticaOAuth,
  mensagemDoOAuth,
  salvarPoliticaOAuth,
  type ClienteOAuthDisponivel,
  type PoliticaOAuth,
} from '@/services/oauthApi'

export function AplicativosExternosSettings() {
  const { featureFlags } = useAuth()
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(false)
  const [politica, setPolitica] = useState<PoliticaOAuth | null>(null)
  const [clientes, setClientes] = useState<ClienteOAuthDisponivel[]>([])
  const [papeis, setPapeis] = useState<string[]>([])
  // Revisão ORY-94: a versão lida vai de volta no salvar (a aba velha não desfaz o corte de outro admin).
  const [versao, setVersao] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [tentativa, setTentativa] = useState(0)

  useEffect(() => {
    let vivo = true
    lerPoliticaOAuth()
      .then((r) => {
        if (!vivo) return
        setPolitica(r.politica)
        setClientes(r.clientesDisponiveis)
        setPapeis(r.papeis)
        setVersao(r.versao)
        setErro(false)
      })
      .catch(() => vivo && setErro(true))
      .finally(() => vivo && setCarregando(false))
    return () => {
      vivo = false
    }
  }, [tentativa])

  const salvar = async () => {
    if (!politica) return
    setSalvando(true)
    try {
      // Só os aplicativos que a Oryon aprova hoje (um que ela bloqueou depois nunca trava o salvar).
      const disponiveis = new Set(clientes.map((c) => c.clientId))
      const r = await salvarPoliticaOAuth({
        ...politica,
        clientesPermitidos: politica.clientesPermitidos.filter((c) => disponiveis.has(c)),
        versao,
      })
      setPolitica(r.politica)
      setVersao(r.versao)
      showToast(r.conexoesEncerradas > 0 ? `Política salva. ${r.conexoesEncerradas} conexão(ões) que deixaram de ser permitidas foram encerradas.` : 'Política salva.')
    } catch (e) {
      showToast(mensagemDoOAuth(e, 'Não foi possível salvar a política.'), 'error')
      // Outra pessoa salvou antes: recarrega a versão atual (nada desta aba foi gravado).
      if (erroDoOAuth(e).codigo === 'politica_mudou') {
        setCarregando(true)
        setTentativa((n) => n + 1)
      }
    } finally {
      setSalvando(false)
    }
  }

  const cabecalho = (
    <SectionHeader
      title="Aplicativos de IA externos"
      description="Decida se as pessoas deste workspace podem conectar assistentes de IA de fora (como Claude e ChatGPT) à Oryon, e o que eles podem fazer."
    />
  )

  if (carregando) return <div>{cabecalho}<SkeletonCard /></div>
  if (erro || !politica) {
    return (
      <div>
        {cabecalho}
        <ErrorState title="Não foi possível carregar a política" onRetry={() => { setCarregando(true); setTentativa((n) => n + 1) }} />
      </div>
    )
  }

  const alternarCliente = (id: string, marcado: boolean) =>
    setPolitica({ ...politica, clientesPermitidos: marcado ? [...politica.clientesPermitidos, id] : politica.clientesPermitidos.filter((c) => c !== id) })
  const alternarPapel = (p: string, marcado: boolean) => {
    const atuais = politica.papeisPermitidos ?? []
    setPolitica({ ...politica, papeisPermitidos: marcado ? [...atuais, p] : atuais.filter((x) => x !== p) })
  }
  const papeisInvalidos = politica.ativo && politica.papeisPermitidos !== null && politica.papeisPermitidos.length === 0

  return (
    <div className="flex flex-col gap-5 max-w-2xl">
      {cabecalho}

      {!publicApiEnabled(featureFlags) && (
        <Banner variant="warning">A API da Oryon ainda não está liberada para este workspace. Fale com a Oryon para usar aplicativos externos.</Banner>
      )}

      <div className="flex items-start justify-between gap-4 rounded-[10px] bg-surface-800 px-4 py-3.5">
        <div>
          <p className="text-sm font-medium text-surface-100" id="oauth-ativo">Permitir aplicativos de IA externos</p>
          <p className="text-xs text-surface-400 mt-0.5">Desligado, ninguém conecta e as conexões que existem são encerradas.</p>
        </div>
        <Switch checked={politica.ativo} onChange={(v) => setPolitica({ ...politica, ativo: v })} disabled={salvando} aria-labelledby="oauth-ativo" />
      </div>

      {politica.ativo && (
        <>
          <fieldset className="flex flex-col gap-2" disabled={salvando}>
            <legend className="text-xs font-semibold text-surface-200 mb-1.5">Aplicativos permitidos</legend>
            {clientes.length === 0 ? (
              <p className="text-sm text-surface-400">A Oryon ainda não aprovou nenhum aplicativo.</p>
            ) : (
              clientes.map((c) => (
                <label key={c.clientId} className="flex items-center gap-3 rounded-[8px] bg-surface-800 px-3.5 py-2.5 cursor-pointer">
                  <Checkbox checked={politica.clientesPermitidos.includes(c.clientId)} onChange={(e) => alternarCliente(c.clientId, e.target.checked)} />
                  <span className="flex flex-col">
                    <span className="text-sm text-surface-100">{c.nome}</span>
                    <span className="text-xs text-surface-400">{c.dominio}</span>
                  </span>
                </label>
              ))
            )}
          </fieldset>

          <fieldset className="flex flex-col gap-2" disabled={salvando}>
            <legend className="text-xs font-semibold text-surface-200 mb-1.5">O máximo que um aplicativo pode fazer</legend>
            {(['leitura', 'escrita'] as const).map((n) => (
              <label key={n} className="flex items-start gap-3 rounded-[8px] bg-surface-800 px-3.5 py-2.5 cursor-pointer">
                <input type="radio" name="nivelMaximo" checked={politica.nivelMaximo === n} onChange={() => setPolitica({ ...politica, nivelMaximo: n })} className="mt-0.5 accent-brand-500" />
                <span className="flex flex-col">
                  <span className="text-sm text-surface-100">{n === 'leitura' ? 'Só consultar' : 'Consultar e fazer alterações'}</span>
                  <span className="text-xs text-surface-400">
                    {n === 'leitura' ? 'Os aplicativos só veem as informações.' : 'Também criam e alteram o que o papel da pessoa permite.'}
                  </span>
                </span>
              </label>
            ))}
          </fieldset>

          <fieldset className="flex flex-col gap-2" disabled={salvando}>
            <legend className="text-xs font-semibold text-surface-200 mb-1.5">Quem pode conectar</legend>
            <label className="flex items-center gap-3 rounded-[8px] bg-surface-800 px-3.5 py-2.5 cursor-pointer">
              <input type="radio" name="papeis" checked={politica.papeisPermitidos === null} onChange={() => setPolitica({ ...politica, papeisPermitidos: null })} className="accent-brand-500" />
              <span className="text-sm text-surface-100">Todas as pessoas do workspace</span>
            </label>
            <label className="flex items-center gap-3 rounded-[8px] bg-surface-800 px-3.5 py-2.5 cursor-pointer">
              <input type="radio" name="papeis" checked={politica.papeisPermitidos !== null} onChange={() => setPolitica({ ...politica, papeisPermitidos: politica.papeisPermitidos ?? ['admin', 'business_admin'] })} className="accent-brand-500" />
              <span className="text-sm text-surface-100">Só alguns papéis</span>
            </label>
            {politica.papeisPermitidos !== null && (
              <div className="flex flex-wrap gap-x-5 gap-y-2 pl-1 pt-1">
                {papeis.map((p) => (
                  <label key={p} className="flex items-center gap-2 text-sm text-surface-200 cursor-pointer">
                    <Checkbox checked={politica.papeisPermitidos?.includes(p) ?? false} onChange={(e) => alternarPapel(p, e.target.checked)} />
                    {roleLabel(p)}
                  </label>
                ))}
              </div>
            )}
            {papeisInvalidos && <p className="text-xs text-danger">Escolha ao menos um papel.</p>}
          </fieldset>

          <Banner variant="neutral" icon={<ShieldCheck className="w-4 h-4" aria-hidden />}>
            Ações importantes (enviar mensagens, convidar pessoas, mudar regras de agentes) sempre pedem a aprovação da pessoa aqui na Oryon. Os
            dados que o aplicativo consultar passam a ser processados por ele, sob a responsabilidade da empresa.
          </Banner>
        </>
      )}

      <div className="flex justify-end">
        <Button onClick={() => void salvar()} loading={salvando} disabled={papeisInvalidos}>
          Salvar
        </Button>
      </div>
    </div>
  )
}
