import DOMPurify from 'dompurify'
import { cn } from '@/lib/utils'
import type { TemplateButton, WhatsAppTemplate } from '@/types'

/**
 * Prévia de modelo do WhatsApp — SCRUM-1097, reescrita em 22/09.
 *
 * ORIGEM DOS VALORES: todos os números e cores abaixo foram **amostrados pixel
 * a pixel** de três capturas do painel de modelos da Meta enviadas pelo PO
 * (canvas + getImageData; moda da região para fundo, pixel mais escuro para
 * texto, mais saturado para acento). Nada aqui é estimativa — a versão
 * anterior era feita de memória e errava em quase tudo.
 *
 * O que estava errado antes e por quê importa:
 *  - papel de parede `#EFE7DD` → o certo é **`#E5DDD5`**;
 *  - havia uma moldura de celular com cabeçalho verde `#075E54`: a prévia da
 *    Meta **não tem** moldura, cabeçalho de conversa nem barra de digitação;
 *  - a bolha mostrava `✓✓`: mensagem **recebida não tem tique** — tique só
 *    existe no que o próprio contato envia;
 *  - os botões eram cards soltos FORA da bolha: no WhatsApp eles ficam
 *    DENTRO, separados por um divisor de 1px;
 *  - todo botão era azul: a cor **depende do tipo** — resposta rápida sai em
 *    verde `#1B8755`, link/telefone/copiar saem em azul `#077CB3`;
 *  - o texto herdava a fonte do produto: o WhatsApp usa a fonte do sistema.
 *
 * Só o tema CLARO é fiel. O tema escuro do WhatsApp não foi amostrado (não há
 * captura de referência), e depois de todo o retrabalho não faz sentido voltar
 * a inventar valores — quando houver uma captura no escuro, entra aqui.
 */

/* ── Paleta amostrada (tema claro do WhatsApp) ───────────────────────────── */
const WA = {
  papel: '#E5DDD5',
  balao: '#FFFFFF',
  texto: '#11191D',
  meta: '#6C7E85',   // hora e rodapé
  divisor: '#EEF2F1',
  azul: '#077CB3',   // URL · telefone · copiar código · flow
  verde: '#1B8755',  // resposta rápida
} as const

/** Fonte do sistema — o WhatsApp não usa a tipografia do produto. */
const FONTE_WA = '"Segoe UI", "Helvetica Neue", Roboto, system-ui, sans-serif'

/** Papel de parede: rabiscos de baixíssimo contraste, como no original. */
const PAPEL_PAREDE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='96' height='96' viewBox='0 0 96 96'%3E%3Cg fill='none' stroke='%23DCD3C9' stroke-width='1.2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M12 18h9M16.5 13.5v9M68 10l5 5M73 10l-5 5M31 57c2.7-3.8 8-3.8 10.7 0M77 68h8M81 64v8M20 80c3.8-2.7 8-2.7 11.8 0M52 31h8M56 27v8M39 88l4 4M43 88l-4 4M84 39l4 4M88 39l-4 4M8 48c3.4-2.3 6.8-2.3 10.2 0M59 75c3-3 6.8-3 9.8 0M26 34c2-2.4 5.2-2.4 7.2 0'/%3E%3Ccircle cx='75' cy='33' r='3.4'/%3E%3Ccircle cx='25' cy='43' r='2.8'/%3E%3Ccircle cx='59' cy='70' r='3.2'/%3E%3Ccircle cx='14' cy='66' r='2.5'/%3E%3Ccircle cx='45' cy='16' r='2.6'/%3E%3C/g%3E%3C/svg%3E\")"

interface TemplatePreviewProps {
  template: WhatsAppTemplate
  /** Substituição de variáveis: { '1': 'João', '2': 'Produto X' } */
  variables?: Record<string, string>
  /** Versão reduzida, para caber dentro do card do catálogo. */
  compact?: boolean
  /** 'frame' — com o papel de parede em volta; 'card' — só a bolha, para
   *  quem já tem o próprio fundo. Mantido da API anterior. */
  variant?: 'frame' | 'card'
  className?: string
}

const SAFE_TAGS = ['strong', 'em', 's', 'br']

function renderBody(text: string, vars: Record<string, string>): string {
  const html = text
    .replace(/\*(.*?)\*/g, '<strong>$1</strong>')
    .replace(/_(.*?)_/g, '<em>$1</em>')
    .replace(/~(.*?)~/g, '<s>$1</s>')
    .replace(/\n/g, '<br />')
    .replace(/\{\{(\d+)\}\}/g, (_, n) => (vars[n] ? `<strong>${vars[n]}</strong>` : `{{${n}}}`))
  return DOMPurify.sanitize(html, { ALLOWED_TAGS: SAFE_TAGS })
}

/** Ícones do WhatsApp para cada tipo de botão, no traço do app (1.9). */
function IconeBotao({ type }: { type: TemplateButton['type'] }) {
  const comum = {
    width: 15, height: 15, viewBox: '0 0 24 24', fill: 'none',
    stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
  }
  if (type === 'QUICK_REPLY') {
    return <svg {...comum}><path d="M9 17 4 12l5-5" /><path d="M20 18v-2a4 4 0 0 0-4-4H4" /></svg>
  }
  if (type === 'PHONE_NUMBER') {
    return <svg {...comum}><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.6a2 2 0 0 1-.4 2.1L8 9.8a16 16 0 0 0 6 6l1.4-1.3a2 2 0 0 1 2.1-.5c.8.3 1.7.5 2.6.6a2 2 0 0 1 1.7 2Z" /></svg>
  }
  if (type === 'COPY_CODE') {
    return <svg {...comum}><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
  }
  return <svg {...comum}><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><path d="M15 3h6v6" /><path d="M10 14 21 3" /></svg>
}

function corDoBotao(type: TemplateButton['type']) {
  // Amostrado dos prints: resposta rápida é verde, o resto é azul.
  return type === 'QUICK_REPLY' ? WA.verde : WA.azul
}

export function TemplatePreview({
  template, variables = {}, compact = false, variant = 'frame', className,
}: TemplatePreviewProps) {
  const headerText = template.headerText
    ? template.headerText.replace(/\{\{(\d+)\}\}/g, (_, n) => variables[n] ?? `{{${n}}}`)
    : undefined

  const bolha = (
    <div
      className="relative"
      style={{
        width: compact ? '100%' : 296,
        maxWidth: '100%',
        background: WA.balao,
        borderRadius: '7.5px',
        borderTopLeftRadius: 0,
        padding: 3,
        boxShadow: '0 1px .5px rgba(11,20,26,.13)',
        fontFamily: FONTE_WA,
      }}
    >
      {/* Rabinho: recorte triangular preso ao topo-esquerdo, como no WhatsApp. */}
      <span
        aria-hidden
        style={{
          position: 'absolute', top: 0, left: -8, width: 8, height: 13,
          background: WA.balao, clipPath: 'polygon(100% 0, 100% 100%, 0 0)',
        }}
      />

      {/* ── Cabeçalho ── */}
      {template.headerType === 'IMAGE' && (
        <div style={{ height: compact ? 96 : 158, borderRadius: 6, overflow: 'hidden', background: '#d9dbdd' }}>
          {template.headerMediaUrl
            ? <img src={template.headerMediaUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ display: 'flex', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#6b7280', fontSize: 12 }}>Imagem</span>}
        </div>
      )}
      {template.headerType === 'VIDEO' && (
        <div style={{ height: compact ? 84 : 132, borderRadius: 6, background: '#1f2937', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 12 }}>▶ Vídeo</div>
      )}
      {template.headerType === 'DOCUMENT' && (
        <div style={{ borderRadius: 6, background: '#F3F4F6', padding: '9px 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#B91C1C', background: '#FEE2E2', borderRadius: 3, padding: '2px 4px' }}>PDF</span>
          <span style={{ fontSize: 13, color: WA.texto, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>documento.pdf</span>
        </div>
      )}

      <div style={{ padding: '6px 7px 4px' }}>
        {template.headerType === 'TEXT' && headerText && (
          <p style={{ fontSize: compact ? 13 : 14.5, lineHeight: compact ? '17px' : '19px', fontWeight: 600, color: WA.texto, marginBottom: 2 }}>
            {headerText}
          </p>
        )}
        <p
          style={{
            fontSize: compact ? 12.5 : 14.5,
            lineHeight: compact ? '16.5px' : '19px',
            color: WA.texto,
            wordBreak: 'break-word',
            ...(compact ? { display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden' } : null),
          }}
          dangerouslySetInnerHTML={{ __html: renderBody(template.body, variables) }}
        />
        {template.footer && (
          <p style={{ fontSize: compact ? 11.5 : 13, lineHeight: compact ? '15px' : '17px', color: WA.meta, marginTop: 5 }}>
            {template.footer}
          </p>
        )}
        {/* Sem tique: quem recebe nunca vê confirmação de entrega. */}
        <p style={{ fontSize: 11, color: WA.meta, textAlign: 'right', marginTop: 1, padding: '0 1px 1px' }}>
          {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>

      {/* ── Botões: dentro da bolha, um divisor de 1px entre cada ── */}
      {template.buttons?.map((btn, i) => (
        <div key={`${btn.type}-${i}`}>
          <div style={{ height: 1, background: WA.divisor, margin: '0 -3px' }} />
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            height: compact ? 32 : 40, fontSize: compact ? 13 : 14.5, color: corDoBotao(btn.type),
          }}>
            <IconeBotao type={btn.type} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{btn.text}</span>
          </div>
        </div>
      ))}
    </div>
  )

  if (variant === 'card') return <div className={className}>{bolha}</div>

  return (
    <div
      className={cn('flex justify-start', className)}
      style={{
        background: `${PAPEL_PAREDE}, ${WA.papel}`,
        backgroundColor: WA.papel,
        borderRadius: 4,
        padding: compact ? '10px 10px 10px 18px' : '14px 12px 14px 20px',
        minHeight: compact ? 140 : 300,
      }}
    >
      {bolha}
    </div>
  )
}
