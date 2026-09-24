import { Sun, Moon } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useTheme } from '@/hooks/useTheme'

/**
 * Alternar tema. Só tokens/CSS: os dois ícones existem e o CSS mostra o do tema
 * atual (`[data-theme=light]` no <html>) — nenhum ternário de tema no JSX.
 */
export function ThemeToggleButton({ className }: { className?: string }) {
  const { toggle } = useTheme()
  return (
    <Button
      type="button"
      variant="ghost"
      size="md"
      iconOnly
      onClick={toggle}
      aria-label="Alternar tema claro/escuro"
      title="Alternar tema"
      className={className}
    >
      <Moon className="w-4 h-4 [[data-theme=light]_&]:hidden" strokeWidth={1.75} />
      <Sun className="w-4 h-4 hidden [[data-theme=light]_&]:block" strokeWidth={1.75} />
    </Button>
  )
}
