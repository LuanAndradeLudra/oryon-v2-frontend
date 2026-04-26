import { useState } from 'react'
import { Copy, Check, Megaphone } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Contact } from '@/types'

function CopyableId({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(value).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button onClick={copy} className="inline-flex items-center gap-1 font-mono text-[10px] text-surface-400 hover:text-surface-200 transition-colors group">
      <span className="truncate max-w-[160px]">{value}</span>
      {copied
        ? <Check className="w-3 h-3 text-online flex-shrink-0" />
        : <Copy className="w-3 h-3 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />}
    </button>
  )
}

function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="flex justify-between gap-3 items-start">
      <span className="text-xs text-surface-500 shrink-0">{label}</span>
      <span className="text-xs text-surface-200 text-right">{value}</span>
    </div>
  )
}

interface Props {
  contact: Contact
}

export function AttributionCard({ contact }: Props) {
  const { metaAdsReferral: meta, googleAdsAttribution: google } = contact
  if (!meta && !google) return null

  return (
    <div className="rounded-xl border overflow-hidden"
      style={{ borderColor: meta ? '#1877f230' : '#EA433530' }}>
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-2.5"
        style={{ backgroundColor: meta ? '#1877f20d' : '#EA43350d' }}>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: meta ? '#1877f21a' : '#EA43351a', color: meta ? '#1877f2' : '#EA4335' }}>
          <Megaphone className="w-3.5 h-3.5" />
        </div>
        <div>
          <p className="text-xs font-semibold text-surface-100">Origem: Anúncio Pago</p>
          <p className="text-[10px] text-surface-400">{meta ? 'Meta Ads (Click-to-WhatsApp)' : 'Google Ads (UTM)'}</p>
        </div>
        <span className="ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
          style={{ backgroundColor: meta ? '#1877f21a' : '#EA43351a', color: meta ? '#1877f2' : '#EA4335' }}>
          {meta ? 'Meta' : 'Google'}
        </span>
      </div>

      {/* Body */}
      <div className="px-4 py-3 space-y-2 bg-surface-900">
        {meta && (
          <>
            <Field label="Campanha"  value={meta.campaignName} />
            <Field label="Conjunto"  value={meta.adSetName} />
            <Field label="Anúncio"   value={meta.adName} />
            <Field label="Headline"  value={meta.headline} />
            {meta.ctwaClickId && (
              <div className="flex justify-between gap-3 items-center">
                <span className="text-xs text-surface-500">Click ID</span>
                <CopyableId value={meta.ctwaClickId} />
              </div>
            )}
            {meta.clickedAt && (
              <Field
                label="Clicou"
                value={formatDistanceToNow(new Date(meta.clickedAt), { addSuffix: true, locale: ptBR })}
              />
            )}
          </>
        )}
        {google && (
          <>
            <Field label="Campanha"  value={google.utmCampaign} />
            <Field label="Origem"    value={google.utmSource} />
            <Field label="Mídia"     value={google.utmMedium} />
            <Field label="Termo"     value={google.utmTerm} />
            <Field label="Conteúdo"  value={google.utmContent} />
            {google.gclid && (
              <div className="flex justify-between gap-3 items-center">
                <span className="text-xs text-surface-500">GCLID</span>
                <CopyableId value={google.gclid} />
              </div>
            )}
            {google.clickedAt && (
              <Field
                label="Clicou"
                value={formatDistanceToNow(new Date(google.clickedAt), { addSuffix: true, locale: ptBR })}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}
