import { Link, useParams } from 'react-router-dom'
import { cn } from '@/lib/utils'

interface SettingsSidebarItemProps {
  section: string
  label: string
  adminOnly?: boolean
  currentRole?: string
}

// Item de navegação text-first (padrão Linear/Vercel): sem ícone, sem pill.
// O estado ativo é dito pela tipografia (texto forte) + barra de acento de
// 2px — sinal periférico que não adiciona container nenhum.
export function SettingsSidebarItem({ section, label, adminOnly, currentRole }: SettingsSidebarItemProps) {
  const { section: activeSection } = useParams()
  const isActive = activeSection === section

  // Defense-in-depth duplicate of the parent's filter — accept all "admin"
  // tiers (admin / business_admin / super_admin), not just literal 'admin'.
  if (
    adminOnly
    && currentRole !== 'admin'
    && currentRole !== 'business_admin'
    && currentRole !== 'super_admin'
  ) return null

  return (
    <Link
      to={`/settings/${section}`}
      aria-current={isActive ? 'page' : undefined}
      style={isActive ? { boxShadow: 'inset 2px 0 0 var(--color-brand-500)', borderRadius: '0 6px 6px 0' } : undefined}
      className={cn(
        'flex items-center h-[26px] pl-[22px] pr-2 text-[13px] transition-colors duration-100',
        isActive
          ? 'text-surface-50 font-semibold bg-[var(--rowhover)]'
          : 'text-surface-400 hover:text-surface-100 rounded-md',
      )}
    >
      {label}
    </Link>
  )
}
