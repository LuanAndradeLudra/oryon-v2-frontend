import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useInView, useReducedMotion } from 'framer-motion'
import { Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { home } from '../landingCopy'
import { Capitulo, Revelar } from '../plataforma/SecoesVenda'
import { teclasDasAbas } from '../ui/abasTeclado'
import { BotaoLanding } from '../ui/BotaoLanding'
import { BotaoPausa } from '../ui/BotaoPausa'
import { GRADE_DO_DIA, Metade } from './DiaNoWhatsApp'
import { RITMO, SETORES } from './dorConversas'
import { useNaFaixaCentral, useRelogiosDoDia } from './relogiosDoDia'

/**
 * "POR QUE A ORYON" como UM DIA NO WHATSAPP (30/09, PO): dois iPhones — o
 * mesmo aparelho do palco do Hero — com a mesma cliente e as mesmas
 * perguntas. À esquerda, sem a Oryon: a equipe está ocupada, selos contam as
 * horas sem resposta e a cliente vai embora. À direita, com a Oryon: o agente
 * responde na hora e chama a pessoa certa. Ao lado de cada aparelho, um
 * checklist marca o que acontece, no ritmo da conversa (aparelho → checklist
 * → aparelho → checklist).
 *
 * Lado a lado (tablet e desktop): um setor por vez, em carrossel. Um relógio
 * único (pausa com o botão e fora da tela) comanda as duas conversas; quando
 * terminam, os aparelhos deslizam para o lado e entra o próximo setor.
 *
 * Empilhadas (celular, 02/10, PO): só se vê uma conversa por vez, então cada
 * uma tem o seu relógio, que só anda enquanto ela está na faixa central da
 * tela — rolou para fora, pausa; voltou, retoma de onde parou. O setor não
 * troca sozinho: com as duas terminadas, "Próximo" leva ao setor seguinte e
 * de volta ao título, na ordem problema → solução.
 *
 * Sem movimento, cada setor aparece já terminado e a troca é pelas abas (ou
 * pelo "Próximo", no celular).
 */

export function SecaoDor() {
  const { dor } = home
  const semMovimento = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const tituloRef = useRef<HTMLDivElement>(null)
  const naTela = useInView(ref, { amount: 0.35 })
  // Do md para cima as duas conversas ficam lado a lado (vê-se as duas ao
  // mesmo tempo); abaixo, empilhadas (uma por vez).
  const ladoALado = useMediaQuery('(min-width: 768px)')
  const [refSem, semNaVista] = useNaFaixaCentral()
  const [refCom, comNaVista] = useNaFaixaCentral()
  const [indice, setIndice] = useState(0)
  const [direcao, setDirecao] = useState(1)
  const [pausado, setPausado] = useState(false)
  const setor = SETORES[indice]
  const proximo = SETORES[(indice + 1) % SETORES.length]
  // Um relógio por conversa (tempo real); os roteiros correm em tempo de
  // roteiro (RITMO mais devagar). Lado a lado, os dois andam juntos.
  const { msSem, msCom, total, fimSem, fimCom, zerar } = useRelogiosDoDia(setor, {
    ativo: !pausado && !semMovimento, ladoALado, naTela, semNaVista, comNaVista,
  })

  // Lado a lado, fim do setor: os aparelhos deslizam e entra o próximo.
  useEffect(() => {
    if (!ladoALado || msSem < total) return
    setDirecao(1)
    setIndice((i) => (i + 1) % SETORES.length)
    zerar()
  }, [ladoALado, msSem, total, zerar])

  function escolher(id: string) {
    const novo = SETORES.findIndex((s) => s.id === id)
    if (novo === indice) return
    setDirecao(novo > indice ? 1 : -1)
    setIndice(novo)
    zerar()
  }

  // Empilhadas: o próximo setor e, de volta ao título dele, a comparação
  // recomeça na ordem problema → solução. O foco vai para a aba do setor novo.
  function irParaOProximo() {
    escolher(proximo.id)
    document.getElementById(`dor-aba-${proximo.id}`)?.focus({ preventScroll: true })
    tituloRef.current?.scrollIntoView({ behavior: semMovimento ? 'auto' : 'smooth', block: 'start' })
  }

  const agoraSem = semMovimento ? Infinity : msSem / RITMO
  const agoraCom = semMovimento ? Infinity : msCom / RITMO
  const terminaram = !ladoALado && (semMovimento || (msSem >= fimSem && msCom >= fimCom))
  // O andamento na aba: lado a lado, o setor; empilhadas, as duas conversas somadas.
  const andamento = semMovimento ? 1 : ladoALado ? msSem / total : (msSem + msCom) / (fimSem + fimCom)
  const ids = SETORES.map((s) => s.id)

  return (
    <section id="por-que" data-section="dor" className="relative scroll-mt-16 border-t border-[var(--landing-borda)] bg-[var(--landing-palco)] py-16 sm:py-20 lg:pb-14 lg:pt-12">
      <div className="landing-container">
        {/* O cabeçalho da seção com o índice de setores no canto direito (desktop),
            na linha do título; no celular, o índice desce e fica centralizado. */}
        <Revelar>
          <Capitulo rotulo={dor.eyebrow} className="mb-6" />
          <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between lg:gap-10">
            {/* Os títulos de todos os setores ocupam a mesma célula da grade: a
                altura é a do maior e a troca é um cruzamento, sem a página pular.
                Só o do setor ativo fica visível (e acessível). */}
            {/* scroll-mt: o "Próximo" (celular) traz o título com o sobretítulo
                visível abaixo da barra fixa do topo. */}
            <div ref={tituloRef} className="grid min-w-0 scroll-mt-36">
              {SETORES.map((s) => {
                const ativo = s.id === setor.id
                const texto = dor.setores[s.id as keyof typeof dor.setores]
                return (
                  <div
                    key={s.id}
                    aria-hidden={!ativo}
                    className={cn(
                      '[grid-area:1/1] transition-[opacity,transform,visibility] duration-500 ease-out motion-reduce:transition-none',
                      ativo ? 'visible translate-y-0 opacity-100 delay-150' : 'invisible translate-y-2 opacity-0',
                    )}
                  >
                    <h2 className="max-w-[40rem] font-display font-bold tracking-[-0.03em] leading-[1.06] text-[clamp(1.7rem,3vw,2.5rem)] text-balance text-surface-50">{texto.titulo}</h2>
                    <p className="mt-4 max-w-[60ch] text-[16px] leading-relaxed text-surface-400 sm:text-[18px] text-pretty">{texto.apoio}</p>
                  </div>
                )
              })}
            </div>
            <div className="flex flex-none items-center justify-center gap-2 lg:pt-1">
              <div role="tablist" aria-label={dor.abasLabel} className="landing-abas">
                {SETORES.map((s, i) => {
                  const ativa = i === indice
                  return (
                    <button
                      key={s.id}
                      id={`dor-aba-${s.id}`}
                      type="button"
                      role="tab"
                      aria-selected={ativa}
                      aria-controls="dor-painel"
                      tabIndex={ativa ? 0 : -1}
                      onClick={() => escolher(s.id)}
                      onKeyDown={teclasDasAbas(ids, setor.id, escolher, 'dor-aba-')}
                      className={cn('landing-aba relative rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500', ativa && 'text-surface-50')}
                    >
                      {s.rotulo}
                      {/* O andamento do setor: a linha enche até a troca. */}
                      {ativa && (
                        <span aria-hidden className="absolute bottom-[-1px] left-0 right-[14px] h-[2px] overflow-hidden rounded-full bg-white/[.10]">
                          <span
                            className="block h-full origin-left bg-[var(--landing-destaque)]"
                            style={{ transform: `scaleX(${Math.min(1, andamento)})` }}
                          />
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
              {!semMovimento && <BotaoPausa pausado={pausado} onAlternar={() => setPausado((p) => !p)} />}
            </div>
          </div>
        </Revelar>

        <Revelar atraso={0.1}>
          <div ref={ref} className="mx-auto mt-10 max-w-[1080px] lg:mt-6">
            {/* overflow-x: clip corta o deslizar nas bordas sem cortar a sombra dos aparelhos. */}
            <div id="dor-painel" role="tabpanel" aria-labelledby={`dor-aba-${setor.id}`} className="relative overflow-x-clip">
              <AnimatePresence initial={false} mode="popLayout" custom={direcao}>
                <motion.div
                  key={setor.id}
                  custom={direcao}
                  variants={{
                    entra: (d: number) => ({ x: `${d * 100}%`, opacity: 0.4 }),
                    fica: { x: '0%', opacity: 1 },
                    sai: (d: number) => ({ x: `${-d * 100}%`, opacity: 0.4 }),
                  }}
                  initial={semMovimento ? false : 'entra'}
                  animate="fica"
                  exit={semMovimento ? undefined : 'sai'}
                  transition={{ duration: 0.8, ease: [0.65, 0, 0.35, 1] }}
                  className={GRADE_DO_DIA}
                >
                  <Metade raizRef={refSem} setor={setor} com={false} ms={agoraSem} />
                  <Metade raizRef={refCom} setor={setor} com ms={agoraCom} />
                  {/* Celular: com as duas conversas vistas até o fim, o próximo setor. */}
                  {terminaram && (
                    <motion.div
                      className="flex justify-center md:hidden"
                      initial={semMovimento ? false : { opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <BotaoLanding variante="secundario" tamanho="lg" seta onClick={irParaOProximo}>
                        {dor.proximo} {proximo.rotulo}
                      </BotaoLanding>
                    </motion.div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </Revelar>

        <p className="mt-10 flex items-center justify-center gap-2 lg:mt-8 text-[12.5px] text-surface-500">
          <Info className="h-3.5 w-3.5 flex-shrink-0" aria-hidden />
          {dor.aviso}
        </p>
      </div>
    </section>
  )
}
