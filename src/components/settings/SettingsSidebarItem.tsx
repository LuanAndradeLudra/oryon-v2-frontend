import { Link, useParams, useSearchParams } from 'react-router-dom'
import { preservarVolta } from '@/lib/voltarPara'
import { cn } from '@/lib/utils'

interface SettingsSidebarItemProps {
  section: string
  label: string
  adminOnly?: boolean
  currentRole?: string
  /** Item de sub-grupo (ex. CRM): recuo extra de ~7px, medido no PNG do mock 2e. */
  nested?: boolean
}

// Item de navegação text-first (padrão Linear/Vercel): sem ícone, sem pill.
// O estado ativo é dito pela tipografia (texto forte) + barra de acento de
// 2px — sinal periférico que não adiciona container nenhum.
export function SettingsSidebarItem({ section, label, adminOnly, currentRole, nested }: SettingsSidebarItemProps) {
  const { section: activeSection } = useParams()
  const isActive = activeSection === section
  // Trocar de seção mantém o "Voltar para…" de quem veio de uma tela de trabalho.
  const [searchParams] = useSearchParams()

  // Defense-in-depth duplicate of the parent's filter — accept all "admin"
  // tiers (admin / business_admin / super_admin), not just literal 'admin'.
  if (
    adminOnly
    && currentRole !== 'admin'
    && currentRole !== 'business_admin'
    && currentRole !== 'super_admin'
  ) return null

  // Canvas 2e (medido): item de topo h28 px10; sub-item (filho de CRM/Integrações)
  // h26 pl22; 12.5px; inativo --tx2; ativo --tx/600 + inset 2px acento + rowhover
  // + raio 0 6 6 0.
  return (
    <Link
      to={preservarVolta(`/settings/${section}`, searchParams)}
      aria-current={isActive ? 'page' : undefined}
      style={isActive ? { boxShadow: 'inset 2px 0 0 var(--color-brand-500)', borderRadius: '0 6px 6px 0' } : undefined}
      className={cn(
        'flex items-center pr-[10px] text-[12.5px] transition-colors duration-100',
        nested ? 'h-[26px] pl-[22px]' : 'h-7 pl-[10px]',
        isActive
          ? 'text-surface-100 font-semibold bg-[var(--rowhover)]'
          : 'text-surface-400 hover:text-surface-100 rounded-md',
      )}
    >
      {label}
    </Link>
  )
}
