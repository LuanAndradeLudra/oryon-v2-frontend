/**
 * Progresso do wizard de primeiro uso (F13-899 · §4.12).
 *
 * O wizard antigo era um overlay sem rota: fechar a aba no meio jogava o
 * usuário de volta no primeiro passo. Agora o passo atual fica guardado por
 * tenant no `localStorage`, então `/setup` retoma de onde parou — inclusive
 * depois de um F5, que é o caso real (conectar o WhatsApp leva o usuário para
 * fora da aba e ele volta).
 *
 * Só o **passo** é persistido. O conteúdo de cada passo já vive no servidor
 * (linhas, setores) ou no serviço de contexto da empresa (Hub) — duplicar
 * aqui só criaria duas verdades.
 */
export const SETUP_STEPS = ['whatsapp', 'team', 'hub'] as const;
export type SetupStep = (typeof SETUP_STEPS)[number];

const KEY_PREFIX = 'oryon.setup.step.';

const keyFor = (tenantId: string | undefined | null) => `${KEY_PREFIX}${tenantId ?? 'anon'}`;

/** Passo salvo do tenant, ou o primeiro quando não há nada válido guardado. */
export function loadSetupStep(tenantId: string | undefined | null): SetupStep {
  try {
    const raw = localStorage.getItem(keyFor(tenantId));
    return isSetupStep(raw) ? raw : SETUP_STEPS[0];
  } catch {
    // localStorage indisponível (modo privado, storage cheio): o wizard
    // continua funcionando, só não retoma.
    return SETUP_STEPS[0];
  }
}

export function saveSetupStep(tenantId: string | undefined | null, step: SetupStep): void {
  try {
    localStorage.setItem(keyFor(tenantId), step);
  } catch {
    /* best effort */
  }
}

/** Chamado ao concluir o wizard — não deixa lixo para o próximo login. */
export function clearSetupProgress(tenantId: string | undefined | null): void {
  try {
    localStorage.removeItem(keyFor(tenantId));
  } catch {
    /* best effort */
  }
}

export function isSetupStep(value: unknown): value is SetupStep {
  return typeof value === 'string' && (SETUP_STEPS as readonly string[]).includes(value);
}

/** Índice 1-based do passo, para o "Passo N de 3". */
export function stepNumber(step: SetupStep): number {
  return SETUP_STEPS.indexOf(step) + 1;
}

export function nextStep(step: SetupStep): SetupStep | null {
  return SETUP_STEPS[SETUP_STEPS.indexOf(step) + 1] ?? null;
}

export function previousStep(step: SetupStep): SetupStep | null {
  const i = SETUP_STEPS.indexOf(step);
  return i > 0 ? SETUP_STEPS[i - 1] : null;
}
