import { useCallback, useEffect, useRef, useState } from 'react'
import {
  BellRing, Bot, CalendarCheck2, CalendarClock, CheckCheck, ClipboardList, Cpu, DoorOpen, Hand, HandHeart, Hourglass,
  LogOut, MailQuestionMark, MessageSquare, MessageSquareText, Milestone, PlugZap, RotateCcw, ShieldCheck, Sparkles, Split, SquareKanban,
  Star, StickyNote, Tag, Target, Trophy, UserPlus, UserRound, Webhook, Workflow, type LucideIcon,
  Building2, KeyRound, ReceiptText, ShoppingBag, FolderOpen, Landmark, FileText, Scale,
  NotebookPen, PencilLine, Route, ScanText, Shuffle,
} from 'lucide-react'
import type { StatusDaJornada } from '@/services/jornadas/tipos'

/** ORY-60 — o que as telas de Jornadas dividem e não é componente (os componentes ficam em `comum.tsx`). */

// ── ícones do catálogo ───────────────────────────────────────────────────────

const ICONES: Record<string, LucideIcon> = {
  MessageSquareText, MessageSquare, BellRing, StickyNote, Hand, Bot, UserRound, CheckCheck, Tag, Milestone, UserPlus, SquareKanban,
  PlugZap, Webhook, Hourglass, MailQuestionMark, Split, Trophy, LogOut, Sparkles, Target, Cpu, ShieldCheck, CalendarCheck2,
  CalendarClock, ClipboardList, Star, HandHeart, RotateCcw, DoorOpen,
  Building2, KeyRound, ReceiptText, ShoppingBag, FolderOpen, Landmark, FileText, Scale,
  NotebookPen, PencilLine, Route, ScanText, Shuffle,
}

/** O catálogo manda o nome do ícone; nome desconhecido vira o ícone genérico. */
export function iconeDe(nome: string | undefined): LucideIcon {
  return (nome && ICONES[nome]) || Workflow
}

export const ROTULO_DO_STATUS: Record<StatusDaJornada, string> = {
  draft: 'Rascunho',
  shadow: 'Em sombra',
  active: 'Ativa',
  paused: 'Pausada',
  archived: 'Arquivada',
}

// ── carregar dados ───────────────────────────────────────────────────────────

/** Carrega e recarrega uma leitura da API, com estado de erro. */
export function useCarregar<T>(ler: () => Promise<T>, deps: unknown[]) {
  const [dados, setDados] = useState<T | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const lerRef = useRef(ler)
  useEffect(() => { lerRef.current = ler })
  const recarregar = useCallback(async () => {
    setErro(null)
    try {
      setDados(await lerRef.current())
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível carregar.')
    }
  }, [])
  useEffect(() => {
    let vivo = true
    lerRef.current().then(
      (d) => { if (vivo) { setErro(null); setDados(d) } },
      (e) => { if (vivo) setErro(e instanceof Error ? e.message : 'Não foi possível carregar.') },
    )
    return () => { vivo = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return { dados, erro, recarregar, setDados }
}

// ── formatos ─────────────────────────────────────────────────────────────────

export function quandoFoi(iso: string | null): string {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const futuro = diff < 0
  const min = Math.round(Math.abs(diff) / 60_000)
  if (min < 1) return 'agora'
  const texto = min < 60 ? `${min} min` : min < 60 * 24 ? `${Math.round(min / 60)} h` : `${Math.round(min / 1440)} d`
  return futuro ? `em ${texto}` : `há ${texto}`
}

export function dataHora(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export const numero = (n: number) => n.toLocaleString('pt-BR')

/** Baixa um CSV (com BOM, para o Excel abrir com acento). */
export function baixarCsv(nome: string, conteudo: string) {
  const url = URL.createObjectURL(new Blob(['\ufeff' + conteudo], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = nome
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
