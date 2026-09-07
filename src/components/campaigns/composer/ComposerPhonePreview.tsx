// ─── ComposerPhonePreview ──────────────────────────────────────────────────
// A coluna esquerda do Composer (D2 · SCRUM-1020) — mockup `p3-disparos.html`
// §D2, `.phonecol` + `.phone`.
//
// O telefone existe para responder uma pergunta que nenhum dos outros blocos
// responde: COMO A MENSAGEM CHEGA. Por isso ele renderiza o template com os
// dados reais de um contato (`previewVars.ts`), e não com o rótulo do campo —
// que é o que o `Step3Variaveis` e o `Step5Revisao` mostram, porque ali a
// pergunta é "de onde vem o dado".
//
// A BOLHA é o `TemplatePreview` do repo, em `compact` + paleta escura. É o
// único renderizador de template do projeto (Biblioteca, criador e os dois
// steps usam o mesmo), e um segundo aqui divergiria no dia em que alguém
// acrescentasse um tipo de cabeçalho. Duas consequências visuais em relação
// ao mockup estão declaradas no PR: os botões do template saem DENTRO da
// bolha (o mockup os desenha como blocos soltos, `.wbtn`) e o raio/corpo da
// bolha são os do componente compartilhado.
//
// As cores do WhatsApp vêm do `WHATSAPP_PALETTE` (cromo de terceiro, não cor
// categórica do produto — a justificativa está no próprio arquivo). Os hexes
// que sobram são a CARCAÇA do aparelho, que não é do WhatsApp nem do produto.
import { useState, type CSSProperties } from 'react'
import { ChevronLeft, MoreVertical, Plus, Mic, Signal, Wifi, BatteryFull, MessageSquareText } from 'lucide-react'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { TemplatePreview, WHATSAPP_PALETTE } from '../TemplatePreview'
import { resolvePreviewVars, shortName } from './previewVars'
import type { CampaignVariableMapping, Contact, WhatsAppTemplate } from '@/types'

type SampleMode = 'first' | 'random'

interface ComposerPhonePreviewProps {
  template: WhatsAppTemplate | null
  mappings: CampaignVariableMapping[]
  /** Amostra de contatos reais. Vazio = ainda carregando ou base vazia: o
   *  telefone mostra o template com os `{{n}}` à vista, sem inventar gente. */
  contacts: Contact[]
  /** Como o contato vê o remetente. Sem linha escolhida ainda, fica o texto
   *  neutro — o nome comercial da conta não é dado que esta tela conheça. */
  senderName?: string
}

export function ComposerPhonePreview({
  template, mappings, contacts, senderName,
}: ComposerPhonePreviewProps) {
  const [mode, setMode] = useState<SampleMode>('first')
  const [randomIndex, setRandomIndex] = useState(0)

  const contact = contacts.length === 0
    ? null
    : contacts[(mode === 'first' ? 0 : randomIndex) % contacts.length]

  const pickSample = (next: SampleMode) => {
    setMode(next)
    // Sortear um índice DIFERENTE do atual: clicar em "aleatório" e ver a
    // mesma pessoa faria o controle parecer quebrado.
    if (next === 'random' && contacts.length > 1) {
      let i = randomIndex
      while (i === randomIndex) i = Math.floor(Math.random() * contacts.length)
      setRandomIndex(i)
    }
  }

  // Duas perguntas diferentes, e antes elas estavam na mesma condicao: um
  // contato com nome em branco escondia o seletor INTEIRO, inclusive o
  // "aleatorio", que funcionaria (N3 do Calibre). Quem decide se ha' seletor e'
  // a existencia de contatos; o nome so' decide o ROTULO.
  const firstLabel = contacts.length > 0
    ? (shortName(contacts[0].displayName) || '1º da base')
    : ''
  const clock = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  return (
    <div
      className="border-r border-surface-800 p-6 flex flex-col items-center gap-4 bg-[radial-gradient(ellipse_at_50%_30%,rgba(37,211,102,.06),transparent_60%)]"
      style={WHATSAPP_PALETTE.dark as CSSProperties}
    >
      <div className="w-[320px] flex items-center justify-between gap-3">
        {/* O mockup escreve "Prévia · como o cliente vê", e essa promessa e'
            maior do que a fonte sustenta: a amostra sai de `contactsApi.list`,
            que traz os 500 primeiros contatos do tenant SEM filtro, e nao o
            publico deste disparo. Dizer "o cliente" faria a tela garantir
            justamente o que ela nao pode checar — o operador veria a Marina com
            tudo resolvido e os Leads reais receberiam `{{2}}` no WhatsApp.
            Quando a fonte nao sabe, quem cede e' a promessa (achado F2 do
            Calibre; mesma familia da D4 e da D52). */}
        <span className="text-3xs font-bold tracking-widest uppercase text-surface-500">
          Prévia · exemplo da sua base
        </span>
        {contacts.length > 0 && (
          <SegmentedControl<SampleMode>
            label="Contato da prévia"
            value={mode}
            onChange={pickSample}
            options={[
              { value: 'first',  label: firstLabel },
              { value: 'random', label: 'aleatório' },
            ]}
          />
        )}
      </div>

      {/* Carcaça do aparelho — não é paleta do WhatsApp nem token do produto. */}
      <div className="w-[320px] h-[560px] rounded-[38px] bg-[#0B0F0E] border-[6px] border-[#1A2321] shadow-[0_20px_60px_rgba(0,0,0,.6),inset_0_0_0_1px_rgba(255,255,255,.05)] overflow-hidden flex flex-col">
        {/* Barra de status do sistema */}
        <div className="flex justify-between px-5 pt-2.5 pb-1 text-2xs font-semibold text-white">
          <span>{clock}</span>
          <span className="flex items-center gap-1" aria-hidden>
            <Signal className="w-2.75 h-2.75" />
            <Wifi className="w-2.75 h-2.75" />
            <BatteryFull className="w-3.25 h-3.25" />
          </span>
        </div>

        {/* Cabeçalho da conversa */}
        <div className="flex items-center gap-2.5 px-3 py-2 bg-[#1F2C34] border-b border-white/6">
          <ChevronLeft className="w-3.5 h-3.5 text-[var(--wa-action)]" aria-hidden />
          <span className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-600 to-[#0F766E] text-brand-950 text-[12px] font-bold flex items-center justify-center flex-shrink-0" aria-hidden>
            {(senderName ?? 'Oryon').slice(0, 2).toUpperCase()}
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-semibold text-white leading-[1.1] truncate">
              {senderName ?? 'Sua conta comercial'}
            </div>
            <div className="text-3xs text-[#9AB0AE]">Conta comercial · WhatsApp</div>
          </div>
          <MoreVertical className="w-3.5 h-3.5 text-[#AEBAC1]" aria-hidden />
        </div>

        {/* Conversa. O ponteado é o papel de parede do WhatsApp; entra por
            `style` porque é data-URI, que não vira classe utilitária. */}
        <div
          className="flex-1 bg-[var(--wa-chat)] px-3 py-3.5 flex flex-col gap-1.5 overflow-auto"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Ccircle cx='20' cy='20' r='1' fill='%23ffffff' fill-opacity='.03'/%3E%3C/svg%3E")` }}
        >
          <span className="self-center text-3xs text-[var(--wa-meta)] bg-[var(--wa-ph-soft)] px-2.5 py-0.75 rounded-[8px] mb-1.5">
            HOJE
          </span>

          {template ? (
            <div className="max-w-[92%] self-start">
              <TemplatePreview
                template={template}
                variables={resolvePreviewVars(mappings, contact)}
                theme="dark"
                compact
              />
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center px-4">
              <MessageSquareText className="w-6 h-6 text-[var(--wa-meta)]" aria-hidden />
              <p className="text-[12.5px] text-[var(--wa-meta)]">
                Escolha um template para ver como a mensagem chega.
              </p>
            </div>
          )}
        </div>

        {/* Rodapé do WhatsApp — decoração: nada aqui é interativo. */}
        <div className="px-2.5 py-2 bg-[var(--wa-chat)] flex gap-2 items-center" aria-hidden>
          <Plus className="w-3.5 h-3.5 text-[var(--wa-meta)]" />
          <div className="flex-1 h-8 rounded-lg bg-[var(--wa-bubble)] text-[12px] text-[var(--wa-meta)] flex items-center px-3">
            Mensagem
          </div>
          <Mic className="w-3.5 h-3.5 text-[var(--wa-meta)]" />
        </div>
      </div>

      <p className="text-3xs text-surface-500 text-center max-w-[300px] leading-[1.5]">
        {contact ? (
          <>
            Exemplo com{' '}
            <strong className="text-surface-400">{contact.displayName}</strong>, um contato real da
            sua base — não necessariamente do público deste disparo. Onde falta o dado, a variável
            fica à vista como <code>{'{{n}}'}</code>; outros contatos podem ter outras faltas.
          </>
        ) : (
          'Assim que houver contatos carregados, as variáveis aparecem preenchidas com os dados de um contato real.'
        )}
      </p>
    </div>
  )
}
