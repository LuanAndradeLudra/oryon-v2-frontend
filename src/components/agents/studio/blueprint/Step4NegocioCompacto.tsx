import { INPUT, TEXTAREA } from '../steps/constants'
import type { WizardData } from '../types'

/**
 * Corpo REDUZIDO da etapa 4 no Studio — só Empresa e Descrição, como o mockup
 * desenha (`p2b-agentes.html#a3`).
 *
 * Regra que decidiu isto (`coord/A3-decisoes.md` §1): **o Studio cria, o
 * Workspace refina.** O `steps/Step4Negocio.tsx` é o editor completo do Company
 * Context Hub (sincroniza com Configurações, salva no backend, edita tipos de
 * negócio e links de marca) e foi desenhado para o painel largo do wizard
 * modal; numa coluna de 292px ele não cabe. Aquele arquivo segue **intocado**
 * servindo o modal e o Workspace — este aqui não o substitui, só cobre o que o
 * agente precisa para existir.
 *
 * Escreve direto em `company_name`/`company_description` do `WizardData`, que é
 * o que o `publish()` manda. O `useStudioDraft` já pré-preenche os dois a
 * partir do hub no mount, então quem já tem contexto salvo encontra os campos
 * preenchidos e só ajusta.
 */
export function Step4NegocioCompacto({
  data, setData,
}: {
  data: WizardData
  setData: React.Dispatch<React.SetStateAction<WizardData>>
}) {
  return (
    <div className="space-y-3">
      <div>
        <label htmlFor="studio-empresa" className="block text-[11px] font-medium text-surface-400 mb-1.5">
          Empresa
        </label>
        <input
          id="studio-empresa"
          value={data.company_name}
          onChange={e => {
            // Valor capturado ANTES do updater: ler `e.target.value` lá dentro
            // é ler o DOM depois do re-render, e num input controlado ele já
            // voltou ao valor da prop.
            const v = e.target.value
            setData(d => ({ ...d, company_name: v }))
          }}
          placeholder="Ex: Nuvem Moda"
          className={INPUT}
        />
      </div>

      <div>
        <label htmlFor="studio-descricao" className="block text-[11px] font-medium text-surface-400 mb-1.5">
          Descrição
        </label>
        <textarea
          id="studio-descricao"
          value={data.company_description}
          onChange={e => {
            const v = e.target.value
            setData(d => ({ ...d, company_description: v }))
          }}
          placeholder="O que a empresa vende, para quem, e o que é importante o agente saber."
          rows={4}
          className={TEXTAREA}
        />
      </div>

      <p className="text-[11px] leading-relaxed text-surface-500">
        O contexto completo da empresa — tipos de negócio, links de marca, FAQs — fica em
        <span className="text-surface-400"> Configurações → Contexto da IA</span> e pode ser
        ajustado depois, sem refazer o agente.
      </p>
    </div>
  )
}
