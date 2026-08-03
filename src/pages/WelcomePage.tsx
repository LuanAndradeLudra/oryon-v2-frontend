import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sun, Moon, MessageSquare, Bot, Users, BarChart3,
  Check, Instagram, Linkedin, ArrowRight, Zap, Menu, X,
} from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'

// ── Rotating word (hero) ───────────────────────────────────────────────────────
const WORDS = ['convertem.', 'encantam.', 'fidelizam.', 'crescem.']

function RotatingWord() {
  const [i, setI] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % WORDS.length), 2400)
    return () => clearInterval(t)
  }, [])
  return (
    <span className="relative inline-block overflow-hidden h-[1.15em] align-bottom">
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={i}
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: '0%', opacity: 1 }}
          exit={{ y: '-100%', opacity: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="inline-block text-brand-400"
        >
          {WORDS[i]}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}

// ── Beam canvas (hero background) ─────────────────────────────────────────────
interface Beam { x: number; y: number; width: number; length: number; angle: number; speed: number; opacity: number; pulse: number; pulseSpeed: number }
function mkBeam(w: number, h: number): Beam {
  const angle = -35 + Math.random() * 10
  return { x: Math.random() * w, y: Math.random() * h, width: 14 + Math.random() * 10, length: h * 2.5, angle, speed: 0.18 + Math.random() * 0.28, opacity: 0.05 + Math.random() * 0.09, pulse: Math.random() * Math.PI * 2, pulseSpeed: 0.007 + Math.random() * 0.011 }
}
const DARK_COLORS  = [{ r: 163, g: 163, b: 163 }, { r: 115, g: 115, b: 115 }, { r: 212, g: 212, b: 212 }]
const LIGHT_COLORS = [{ r: 20, g: 184, b: 166 }, { r: 45, g: 212, b: 191 }, { r: 15, g: 118, b: 110 }]

function HeroBeams({ isLight }: { isLight: boolean }) {
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const beamsRef   = useRef<Beam[]>([])
  const frameRef   = useRef<number>(0)
  const isLightRef = useRef(isLight)
  useEffect(() => { isLightRef.current = isLight }, [isLight])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    let w = 0, h = 0
    const resize = () => {
      w = canvas.offsetWidth; h = canvas.offsetHeight
      canvas.width = w; canvas.height = h
      beamsRef.current = Array.from({ length: 12 }, () => mkBeam(w, h))
    }
    resize()
    window.addEventListener('resize', resize)
    const draw = () => {
      ctx.fillStyle = isLightRef.current ? '#ffffff' : '#0a0f0f'
      ctx.fillRect(0, 0, w, h)
      for (const b of beamsRef.current) {
        b.y -= b.speed; b.pulse += b.pulseSpeed
        if (b.y + b.length < -50) { b.y = h + 50; b.x = Math.random() * w }
        const palette = isLightRef.current ? LIGHT_COLORS : DARK_COLORS
        const { r, g, b: bl } = palette[Math.floor(Math.random() * palette.length)]
        const alpha = Math.min(1, b.opacity * (0.8 + Math.sin(b.pulse) * 0.35))
        ctx.save(); ctx.translate(b.x, b.y); ctx.rotate((b.angle * Math.PI) / 180)
        const grad = ctx.createLinearGradient(0, 0, 0, b.length)
        grad.addColorStop(0,   `rgba(${r},${g},${bl},0)`)
        grad.addColorStop(0.2, `rgba(${r},${g},${bl},${alpha * 0.4})`)
        grad.addColorStop(0.5, `rgba(${r},${g},${bl},${alpha})`)
        grad.addColorStop(0.8, `rgba(${r},${g},${bl},${alpha * 0.4})`)
        grad.addColorStop(1,   `rgba(${r},${g},${bl},0)`)
        ctx.fillStyle = grad
        ctx.fillRect(-b.width / 2, 0, b.width, b.length)
        ctx.restore()
      }
      frameRef.current = requestAnimationFrame(draw)
    }
    draw()
    return () => { window.removeEventListener('resize', resize); cancelAnimationFrame(frameRef.current) }
  }, [])

  return (
    <>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full z-0 pointer-events-none" style={{ filter: 'blur(7px)' }} />
      {!isLight && (
        <div className="absolute inset-0 z-[1] pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at center, transparent 30%, rgba(9,9,15,0.75) 100%)' }} />
      )}
    </>
  )
}

// ── Fade-in wrapper ────────────────────────────────────────────────────────────
function FadeIn({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1], delay }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// ── Data ───────────────────────────────────────────────────────────────────────
const FEATURES = [
  { icon: <MessageSquare className="w-6 h-6" />, title: 'WhatsApp Centralizado', desc: 'Todas as conversas em um inbox inteligente. Nunca perca um atendimento importante.' },
  { icon: <Bot className="w-6 h-6" />,           title: 'IA que Atende e Qualifica', desc: 'Agente IA responde 24/7, triia e escala para humanos no momento certo.' },
  { icon: <Users className="w-6 h-6" />,         title: 'Gestão de Contatos', desc: 'Histórico completo, tags, segmentação e CRM nativo em um só lugar.' },
  { icon: <BarChart3 className="w-6 h-6" />,     title: 'Relatórios em Tempo Real', desc: 'Dashboard com métricas de atendimento e performance da IA.' },
]

const PLANS = [
  {
    name: 'Starter',
    price: 'R$ 97',
    period: '/mês',
    desc: 'Ideal para pequenos negócios começando no atendimento digital.',
    features: ['1 número WhatsApp', 'Até 3 usuários', 'IA básica de respostas', 'Relatórios simples', 'Suporte por e-mail'],
    cta: 'Começar grátis',
    highlight: false,
  },
  {
    name: 'Growth',
    price: 'R$ 197',
    period: '/mês',
    desc: 'Para times que precisam escalar atendimento com eficiência.',
    features: ['Múltiplos números', 'Até 15 usuários', 'IA avançada + qualificação', 'Dashboard completo', 'Suporte prioritário', 'Automações ilimitadas'],
    cta: 'Escolher Growth',
    highlight: true,
    badge: 'Mais popular',
  },
  {
    name: 'Enterprise',
    price: 'Sob consulta',
    period: '',
    desc: 'Solução completa para grandes operações com SLA dedicado.',
    features: ['Usuários ilimitados', 'API personalizada', 'Onboarding assistido', 'SLA dedicado', 'Integrações customizadas', 'Gerente de conta exclusivo'],
    cta: 'Falar com vendas',
    highlight: false,
  },
]

// ── Main page ──────────────────────────────────────────────────────────────────
export function WelcomePage() {
  const { theme, toggle } = useTheme()
  const isLight = theme === 'light'
  const [menuOpen, setMenuOpen] = useState(false)

  const navBg   = isLight ? 'bg-white/80 border-gray-200' : 'bg-surface-950/80 border-surface-800/60'
  const textPri = isLight ? 'text-gray-900' : 'text-surface-50'
  const textSec = isLight ? 'text-gray-500' : 'text-surface-400'
  const cardBg  = isLight ? 'bg-white border-gray-200' : 'bg-surface-900 border-surface-800'

  return (
    <div className={`h-screen w-full overflow-y-auto ${isLight ? 'bg-white text-gray-900' : 'bg-surface-950 text-surface-50'}`}>

      {/* ── Navbar ── */}
      <header className={`fixed top-0 left-0 right-0 z-50 border-b backdrop-blur-md ${navBg}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <img src="/oryon-logo.svg" alt="Oryon" className="w-8 h-8 select-none" draggable={false} />
            <img src="/oryon-wordmark.png" alt="Oryon" className={`h-6 w-auto select-none ${isLight ? 'oryon-wordmark' : ''}`} draggable={false} />
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6">
            <a href="#como-funciona" className={`text-sm font-medium transition-colors hover:text-brand-400 ${textSec}`}>Como funciona</a>
            <a href="#planos"        className={`text-sm font-medium transition-colors hover:text-brand-400 ${textSec}`}>Planos</a>
            <button onClick={toggle} title={isLight ? 'Tema escuro' : 'Tema claro'}
              className={`p-2 rounded-lg transition-colors hover:bg-surface-800/20 ${textSec}`}>
              {isLight ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>
            <Link to="/login"
              className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-surface-950 text-sm font-semibold transition-colors">
              Entrar
            </Link>
          </nav>

          {/* Mobile menu button */}
          <div className="flex md:hidden items-center gap-3">
            <button onClick={toggle} className={`p-2 rounded-lg ${textSec}`}>
              {isLight ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>
            <button onClick={() => setMenuOpen((v) => !v)} className={`p-2 rounded-lg ${textSec}`}>
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className={`md:hidden border-t ${isLight ? 'bg-white border-gray-200' : 'bg-surface-950 border-surface-800'}`}
            >
              <div className="px-4 py-4 flex flex-col gap-3">
                <a href="#como-funciona" onClick={() => setMenuOpen(false)} className={`text-sm font-medium ${textSec}`}>Como funciona</a>
                <a href="#planos"        onClick={() => setMenuOpen(false)} className={`text-sm font-medium ${textSec}`}>Planos</a>
                <Link to="/login" className="mt-1 px-4 py-2.5 rounded-xl bg-brand-600 text-surface-950 text-sm font-semibold text-center">
                  Entrar
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ── Hero ── */}
      <section className="relative min-h-[100dvh] flex flex-col items-center justify-center overflow-hidden pt-16">
        <HeroBeams isLight={isLight} />

        {/* Oryon logo grande centralizada */}
        <div className="relative z-10 flex flex-col items-center text-center px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="relative mb-10"
          >
            {/* Glow por trás da logo */}
            <div className="absolute inset-0 rounded-full blur-3xl scale-150"
              style={{ background: 'radial-gradient(ellipse, rgba(20,184,166,0.4) 0%, rgba(45,212,191,0.15) 50%, transparent 80%)' }} />
            <img
              src="/oryon-logo.svg"
              alt="Oryon"
              className="relative w-32 h-32 sm:w-40 sm:h-40 lg:w-52 lg:h-52 select-none drop-shadow-2xl"
              draggable={false}
            />
          </motion.div>

          {/* Badge IA */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-brand-500/40 bg-brand-500/10 mb-6"
          >
            <Zap className="w-3.5 h-3.5 text-brand-400" />
            <span className="text-xs font-semibold text-brand-400 uppercase tracking-widest">AI-Powered Automation Active</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className={`text-4xl sm:text-5xl lg:text-7xl font-bold leading-tight tracking-tight mb-6 ${textPri}`}
          >
            Conversas que<br />
            <RotatingWord />
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className={`text-base sm:text-lg lg:text-xl leading-relaxed max-w-xl mb-10 ${textSec}`}
          >
            Plataforma SaaS de atendimento via WhatsApp com IA que automatiza follow-ups,
            qualifica leads e centraliza todo o histórico do cliente em um único lugar.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col sm:flex-row items-center gap-4"
          >
            <Link to="/login"
              className="px-7 py-3.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-surface-950 text-base font-semibold transition-all shadow-[0_6px_20px_rgba(20,184,166,.35)] hover:shadow-[0_8px_28px_rgba(20,184,166,.5)] hover:-translate-y-0.5">
              Começar agora
            </Link>
            <a href="#como-funciona"
              className={`flex items-center gap-1.5 text-sm font-medium transition-colors hover:text-brand-400 ${textSec}`}>
              Ver como funciona <ArrowRight className="w-4 h-4" />
            </a>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
            className="w-5 h-8 rounded-full border-2 border-brand-500/40 flex items-start justify-center pt-1.5"
          >
            <div className="w-1 h-1.5 rounded-full bg-brand-400" />
          </motion.div>
        </motion.div>
      </section>

      {/* ── Como funciona ── */}
      <section id="como-funciona" className={`py-24 px-4 sm:px-6 lg:px-8 ${isLight ? 'bg-gray-50' : 'bg-surface-900'}`}>
        <div className="max-w-7xl mx-auto">
          <FadeIn className="text-center mb-16">
            <p className="text-sm font-semibold text-brand-400 uppercase tracking-widest mb-3">Plataforma completa</p>
            <h2 className={`text-3xl sm:text-4xl font-bold tracking-tight mb-4 ${textPri}`}>
              Tudo que sua equipe de atendimento precisa
            </h2>
            <p className={`text-lg max-w-2xl mx-auto ${textSec}`}>
              Da captação à fidelização, a Oryon cobre cada etapa do atendimento com IA e automação.
            </p>
          </FadeIn>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map((f, i) => (
              <FadeIn key={f.title} delay={i * 0.1}>
                <div className={`group h-full rounded-2xl border p-6 transition-all duration-300 hover:border-brand-500/40 hover:shadow-[0_6px_20px_rgba(20,184,166,.20)] ${cardBg}`}>
                  <div className="w-11 h-11 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400 mb-5 group-hover:bg-brand-500/20 transition-colors">
                    {f.icon}
                  </div>
                  <h3 className={`font-semibold mb-2 ${textPri}`}>{f.title}</h3>
                  <p className={`text-sm leading-relaxed ${textSec}`}>{f.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── Planos ── */}
      <section id="planos" className={`py-24 px-4 sm:px-6 lg:px-8 ${isLight ? 'bg-white' : 'bg-surface-950'}`}>
        <div className="max-w-6xl mx-auto">
          <FadeIn className="text-center mb-16">
            <p className="text-sm font-semibold text-brand-400 uppercase tracking-widest mb-3">Preços</p>
            <h2 className={`text-3xl sm:text-4xl font-bold tracking-tight mb-4 ${textPri}`}>
              Escolha o plano ideal para seu negócio
            </h2>
            <p className={`text-lg ${textSec}`}>Sem taxa de setup. Cancele quando quiser.</p>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            {PLANS.map((plan, i) => (
              <FadeIn key={plan.name} delay={i * 0.1}>
                <div className={`relative rounded-2xl border p-7 flex flex-col transition-all duration-300 ${
                  plan.highlight
                    ? 'border-brand-500/60 shadow-[0_6px_20px_rgba(20,184,166,.35)] scale-105 bg-surface-900'
                    : `${cardBg} hover:border-brand-500/30 hover:shadow-[0_4px_16px_rgba(20,184,166,.15)]`
                }`}>
                  {plan.badge && (
                    <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-brand-400 text-surface-950 text-xs font-bold uppercase tracking-wide">
                      {plan.badge}
                    </span>
                  )}

                  <div className="mb-6">
                    <h3 className={`text-xl font-bold mb-1 ${plan.highlight ? 'text-surface-50' : textPri}`}>{plan.name}</h3>
                    <p className={`text-sm mb-4 ${plan.highlight ? 'text-surface-400' : textSec}`}>{plan.desc}</p>
                    <div className="flex items-end gap-1">
                      <span className={`text-3xl font-bold ${plan.highlight ? 'text-surface-50' : textPri}`}>{plan.price}</span>
                      {plan.period && <span className={`text-sm mb-1 ${plan.highlight ? 'text-surface-400' : textSec}`}>{plan.period}</span>}
                    </div>
                  </div>

                  <ul className="flex flex-col gap-2.5 mb-8 flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2.5">
                        <Check className="w-4 h-4 text-brand-400 flex-shrink-0" />
                        <span className={`text-sm ${plan.highlight ? 'text-surface-300' : textSec}`}>{f}</span>
                      </li>
                    ))}
                  </ul>

                  <Link to="/login"
                    className={`w-full py-3 rounded-xl text-sm font-semibold text-center transition-all ${
                      plan.highlight
                        ? 'bg-brand-600 hover:bg-brand-500 text-surface-950 shadow-[0_4px_12px_rgba(20,184,166,.3)]'
                        : `border ${isLight ? 'border-gray-200 text-gray-700 hover:border-brand-500/60 hover:text-brand-400' : 'border-surface-700 text-surface-300 hover:border-brand-500/60 hover:text-brand-400'}`
                    }`}>
                    {plan.cta}
                  </Link>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className={`py-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden ${isLight ? 'bg-gray-50' : 'bg-surface-900'}`}>
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at center, rgba(20,184,166,0.08) 0%, transparent 70%)' }} />
        <FadeIn className="max-w-3xl mx-auto text-center relative z-10">
          <h2 className={`text-3xl sm:text-4xl font-bold tracking-tight mb-4 ${textPri}`}>
            Pronto para transformar seu atendimento?
          </h2>
          <p className={`text-lg mb-8 ${textSec}`}>
            Junte-se a centenas de empresas que já usam a Oryon para converter conversas em resultados.
          </p>
          <Link to="/login"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-brand-600 hover:bg-brand-500 text-surface-950 text-base font-semibold transition-all shadow-[0_6px_20px_rgba(20,184,166,.35)] hover:shadow-[0_8px_28px_rgba(20,184,166,.5)] hover:-translate-y-0.5">
            Começar agora <ArrowRight className="w-4 h-4" />
          </Link>
        </FadeIn>
      </section>

      {/* ── Footer ── */}
      <footer className={`border-t ${isLight ? 'bg-white border-gray-200' : 'bg-surface-900 border-surface-800'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-10">
            {/* Brand */}
            <div className="col-span-1">
              <div className="flex items-center gap-2 mb-3">
                <img src="/oryon-logo.svg" alt="Oryon" className="w-8 h-8 select-none" draggable={false} />
                <img src="/oryon-wordmark.png" alt="Oryon" className={`h-5 w-auto select-none ${isLight ? 'oryon-wordmark' : ''}`} draggable={false} />
              </div>
              <p className={`text-sm leading-relaxed mb-5 ${textSec}`}>
                Conversas que convertem.<br />CRM inteligente para equipes de atendimento modernas.
              </p>
              <div className="flex items-center gap-3">
                <a href="https://instagram.com" target="_blank" rel="noopener noreferrer"
                  className={`p-2 rounded-lg border transition-colors hover:border-brand-500/50 hover:text-brand-400 ${isLight ? 'border-gray-200 text-gray-400' : 'border-surface-700 text-surface-500'}`}>
                  <Instagram className="w-4 h-4" />
                </a>
                <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer"
                  className={`p-2 rounded-lg border transition-colors hover:border-brand-500/50 hover:text-brand-400 ${isLight ? 'border-gray-200 text-gray-400' : 'border-surface-700 text-surface-500'}`}>
                  <Linkedin className="w-4 h-4" />
                </a>
                <a href="https://wa.me" target="_blank" rel="noopener noreferrer"
                  className={`p-2 rounded-lg border transition-colors hover:border-brand-500/50 hover:text-brand-400 ${isLight ? 'border-gray-200 text-gray-400' : 'border-surface-700 text-surface-500'}`}>
                  <MessageSquare className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Links — só o que tem destino real dentro do app. As colunas
                "Empresa" e "Suporte" e os demais itens de "Produto" foram
                removidos por não terem rota/âncora correspondente (R37);
                apontar para href="#" dava a impressão de link quebrado. */}
            <div>
              <h4 className={`text-xs font-semibold uppercase tracking-widest mb-4 ${isLight ? 'text-gray-400' : 'text-surface-600'}`}>Produto</h4>
              <ul className="flex flex-col gap-2.5">
                <li>
                  <Link to="/pricing" className={`text-sm transition-colors hover:text-brand-400 ${textSec}`}>Planos</Link>
                </li>
              </ul>
            </div>
          </div>

          <div className={`pt-6 border-t flex flex-col sm:flex-row items-center justify-between gap-3 ${isLight ? 'border-gray-200' : 'border-surface-800'}`}>
            <p className={`text-xs ${isLight ? 'text-gray-400' : 'text-surface-600'}`}>
              © 2026 Oryon · Todos os direitos reservados
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
