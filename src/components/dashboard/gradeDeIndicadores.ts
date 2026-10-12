/**
 * Colunas de um cartão de indicadores (SCRUM-1253, PO 08/10). O grid
 * `auto-fit` encaixava quantas células coubessem — com 4 indicadores e espaço
 * para 3, o 4º caía sozinho numa linha com 2/3 vazios. Aqui o número de
 * colunas divide a quantidade: 4 → 2×2 ou 4 numa linha; 6 → 2/3/6. O cartão é
 * um container (`@container`), então quem decide é a largura DELE.
 */
export function classeDaGrade(n: number): string {
  switch (n) {
    case 1: return 'grid-cols-1'
    case 2: return 'grid-cols-2'
    case 3: return 'grid-cols-1 @[480px]:grid-cols-3'
    case 4: return 'grid-cols-2 @[640px]:grid-cols-4'
    case 5: return 'grid-cols-2 @[800px]:grid-cols-5'
    case 6: return 'grid-cols-2 @[480px]:grid-cols-3 @[960px]:grid-cols-6'
    default: return 'grid-cols-2 @[640px]:grid-cols-4'
  }
}
