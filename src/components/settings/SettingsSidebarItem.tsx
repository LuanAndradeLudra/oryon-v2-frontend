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
      className={cn(
        'relative flex items-center px-2 py-[5px] rounded-md text-sm transition-colors duration-100',
        isActive
          ? 'text-surface-50 font-medium'
          : 'text-surface-400 hover:text-surface-100',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'absolute -left-1 top-1/2 -translate-y-1/2 w-[2px] h-4 rounded-full transition-colors',
          isActive ? 'bg-brand-500' : 'bg-transparent',
        )}
      />
      {label}
    </Link>
  )
}
