import { useCallback, useEffect, useState } from 'react'
import { OryonLogo } from '@/components/brand/OryonLogo'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Banner } from '@/components/ui/Banner'
import { Checkbox } from '@/components/ui/Checkbox'
import { termsApi, DOCUMENT_LABEL, type TermsDocument, type TermsVersionInfo } from '@/services/termsApi'
import { LeitorDeDocumentos, paraDocumentos } from './LeitorDeDocumentos'

/**
 * Pedido de aceite dos termos (SCRUM-777 / H3).
 *
 * ── Por que é dispensável ───────────────────────────────────────────────────
 *
 * O cartão da SCRUM-777 é explícito: *"Contrato vigente **não** é suspenso por
 * falta de re-aceite — a operação decide o que fazer."* Um modal que trava o
 * painel seria exatamente uma suspensão, decidida pelo código em vez da
 * operação — e aplicada a um cliente que está pagando em dia.
 *
 * Então ele pede, registra e sai do caminho. Volta no próximo acesso enquanto
 * houver pendência, porque `GET /terms/pending` continua devolvendo.
 *
 * O portão duro que o corpo da história menciona ("cliente não acessa sem
 * aceitar") é do fluxo de ATIVAÇÃO de conta nova — que é o console de
 * provisionamento, SCRUM-656, e não existe. Confundir os dois transformaria
 * uma regra de entrada numa punição para quem já é cliente.
 *
 * ── Apresentação (SCRUM-1200, 13/10, PO) ────────────────────────────────────
 *
 * O mesmo leitor do primeiro acesso, com o texto aberto, e o aceite explícito
 * por checkbox antes do botão. Segue o tema do usuário (está dentro do app).
 * No topo, o símbolo da Oryon e um título que diz o que mudou: quem vê o
 * pedido é funcionário do cliente, e a marca deixa claro que o aceite é com a
 * Oryon, não com a empresa dele (padrão Google/Microsoft para termos). O
 * cartão do checkbox é neutro nos dois estados — o teal fica no "Aceitar".
 */

/** "os Termos de Uso" · "os Termos de Uso e a Política de Privacidade". */
function nomes(pendentes: TermsVersionInfo[]) {
  const n = pendentes.map((v) => DOCUMENT_LABEL[v.document as TermsDocument] ?? v.document)
  const artigo = (s: string) => (s.startsWith('Política') ? `a ${s}` : `os ${s}`)
  if (n.length <= 1) return n[0] ? artigo(n[0]) : 'os documentos'
  return `${n.slice(0, -1).map(artigo).join(', ')} e ${artigo(n[n.length - 1])}`
}

export function TermsAcceptanceModal() {
  const [pendentes, setPendentes] = useState<TermsVersionInfo[]>([])
  const [dispensado, setDispensado] = useState(false)
  const [concordo, setConcordo] = useState(false)
  // Não exige leitura (re-aceite de quem já é cliente), mas informa o que foi lido.
  const [lidos, setLidos] = useState<string[]>([])
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    let vivo = true
    termsApi
      .pending()
      .then((p) => { if (vivo) setPendentes(p) })
      // Silencioso de propósito: termos indisponíveis não podem quebrar a
      // aplicação inteira. Sem pendência conhecida, o painel segue normal.
      .catch(() => { if (vivo) setPendentes([]) })
    return () => { vivo = false }
  }, [])

  const aceitar = useCallback(async () => {
    setEnviando(true); setErro(null)
    try {
      // Um por vez, na ordem: cada versão é um registro próprio.
      for (const v of pendentes) await termsApi.accept(v.id, { readToEnd: lidos.includes(v.id) })
      setPendentes([])
    } catch {
      setErro('Não foi possível registrar o aceite. Tente novamente.')
    } finally { setEnviando(false) }
  }, [pendentes, lidos])

  const varios = pendentes.length > 1
  const documentos = paraDocumentos(pendentes)
  const titulo = `Atualizamos ${nomes(pendentes)}`

  return (
    <Modal
      open={!dispensado && pendentes.length > 0}
      onClose={() => setDispensado(true)}
      aria-label={titulo}
      className="max-w-2xl"
      title={
        <span className="block min-w-0">
          <OryonLogo variant="symbol" decorativa className="h-8 mb-3.5" />
          <span className="block text-base font-semibold text-surface-50">{titulo}</span>
          <span className="block text-[13px] font-normal text-surface-400 mt-1">Leia e confirme para continuar usando a plataforma. O aceite vale para a sua conta e fica registrado com data, hora, IP e versão.</span>
        </span>
      }
      footer={
        // Como no primeiro acesso: o aceite ao lado dos botões (marca e clica).
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
          <label className="flex items-center gap-2.5 cursor-pointer min-w-0">
            <Checkbox checked={concordo} onChange={(e) => setConcordo(e.target.checked)} />
            <span className="text-[13px] font-medium text-surface-100">Li e aceito {varios ? 'as novas versões' : 'a nova versão'}</span>
          </label>
          <span className="flex gap-2 ml-auto">
            <Button variant="ghost" onClick={() => setDispensado(true)}>Agora não</Button>
            <Button onClick={aceitar} loading={enviando} disabled={!concordo}>Aceitar</Button>
          </span>
        </div>
      }
    >
      <div className="space-y-4">
        <LeitorDeDocumentos documentos={documentos} onLidos={setLidos} altura="h-[clamp(200px,calc(100dvh-400px),440px)]" />
        {erro && <Banner variant="danger">{erro}</Banner>}
      </div>
    </Modal>
  )
}
