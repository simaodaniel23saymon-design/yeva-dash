/**
 * Preferências de notificação — contrato de GET/PUT /api/notifications/preferences.
 *
 * GET ⇒ { gasLow, takeProfit, stopLoss, dailyReport, configured, updatedAt }.
 * PUT { [chave]: boolean } ⇒ o mesmo objeto, já guardado. Erros: { error, code? }.
 * Sem resposta válida não há estado conhecido: nada aparece como ligado e nada é enviado.
 */

export const NOTIFICATION_PREFERENCE_KEYS = ['gasLow', 'takeProfit', 'stopLoss', 'dailyReport'] as const;

export type NotificationPreferenceKey = (typeof NOTIFICATION_PREFERENCE_KEYS)[number];

export type NotificationPreferences = Record<NotificationPreferenceKey, boolean>;

export type UnavailableReason = 'NOT_AVAILABLE' | 'SERVICE_UNAVAILABLE' | 'NO_RESPONSE' | 'UNAUTHORIZED' | 'INVALID_RESPONSE' | 'ERROR';

export type PreferencesState =
  | { status: 'loading' }
  | { status: 'loaded'; prefs: NotificationPreferences; configured: boolean }
  | { status: 'unavailable'; reason: UnavailableReason; message: string };

export const PREFERENCES_UNAVAILABLE_MESSAGES: Readonly<Record<UnavailableReason, string>> = Object.freeze({
  NOT_AVAILABLE: 'As preferências de alertas ainda não estão disponíveis neste servidor. Os alertas continuam a ser enviados como até agora.',
  SERVICE_UNAVAILABLE: 'As preferências de alertas estão temporariamente indisponíveis. Os alertas continuam a ser enviados como até agora.',
  NO_RESPONSE: 'Sem resposta do servidor. Não foi possível saber que alertas estão ativos.',
  UNAUTHORIZED: 'Sessão expirada. Inicia sessão novamente para ver as preferências de alertas.',
  INVALID_RESPONSE: 'Resposta inesperada do servidor. Não foi possível saber que alertas estão ativos.',
  ERROR: 'Não foi possível carregar as preferências de alertas.',
});

type HttpErrorLike = { response?: { status?: number; data?: { code?: unknown } } };

function unavailable(reason: UnavailableReason): PreferencesState {
  return { status: 'unavailable', reason, message: PREFERENCES_UNAVAILABLE_MESSAGES[reason] };
}

function reasonFromError(err: unknown): UnavailableReason {
  const e = err as HttpErrorLike | null;
  if (!e || typeof e !== 'object' || !e.response) return 'NO_RESPONSE';
  const status = Number(e.response.status ?? 0);
  if (status === 404) return 'NOT_AVAILABLE';
  if (status === 503 || e.response.data?.code === 'PREFERENCES_UNAVAILABLE') return 'SERVICE_UNAVAILABLE';
  if (status === 401 || status === 403) return 'UNAUTHORIZED';
  if (status === 502 || status === 504) return 'NO_RESPONSE';
  return 'ERROR';
}

/** Só aceita a resposta completa: uma chave em falta não é tratada como "ligada". */
export function parsePreferences(data: unknown): { prefs: NotificationPreferences; configured: boolean } | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const d = data as Record<string, unknown>;
  const prefs = {} as NotificationPreferences;
  for (const k of NOTIFICATION_PREFERENCE_KEYS) {
    if (typeof d[k] !== 'boolean') return null;
    prefs[k] = d[k] as boolean;
  }
  return { prefs, configured: d.configured === true };
}

export type PreferencesGet = (url: string) => Promise<{ data: unknown }>;
export type PreferencesPut = (url: string, body: Partial<NotificationPreferences>) => Promise<{ data: unknown }>;

export const PREFERENCES_URL = '/notifications/preferences';

/** Nunca lança. */
export async function loadNotificationPreferences(get: PreferencesGet): Promise<PreferencesState> {
  try {
    const res = await get(PREFERENCES_URL);
    const parsed = parsePreferences(res?.data);
    if (!parsed) return unavailable('INVALID_RESPONSE');
    return { status: 'loaded', ...parsed };
  } catch (err) {
    return unavailable(reasonFromError(err));
  }
}

export function canEditPreferences(state: PreferencesState): state is Extract<PreferencesState, { status: 'loaded' }> {
  return state.status === 'loaded';
}

export const SAVE_FAILED_MESSAGES: Readonly<Record<UnavailableReason, string>> = Object.freeze({
  NOT_AVAILABLE: 'As preferências de alertas ainda não estão disponíveis neste servidor. Nada foi alterado.',
  SERVICE_UNAVAILABLE: 'As preferências de alertas estão temporariamente indisponíveis. Nada foi alterado.',
  NO_RESPONSE: 'Sem resposta do servidor. A alteração pode não ter sido guardada; recarrega as preferências.',
  UNAUTHORIZED: 'Sessão expirada. Inicia sessão novamente.',
  INVALID_RESPONSE: 'Resposta inesperada do servidor. Recarrega as preferências.',
  ERROR: 'Não foi possível guardar a preferência.',
});

export type SaveOutcome =
  | { ok: true; prefs: NotificationPreferences; configured: boolean }
  | { ok: false; reason: UnavailableReason; message: string };

/**
 * Envia só a chave alterada. O estado mostrado depois é o devolvido pelo servidor.
 * Só deve ser chamado com preferências carregadas (canEditPreferences). Nunca lança.
 */
export async function saveNotificationPreference(
  put: PreferencesPut,
  key: NotificationPreferenceKey,
  value: boolean
): Promise<SaveOutcome> {
  try {
    const res = await put(PREFERENCES_URL, { [key]: value });
    const parsed = parsePreferences(res?.data);
    if (!parsed) return { ok: false, reason: 'INVALID_RESPONSE', message: SAVE_FAILED_MESSAGES.INVALID_RESPONSE };
    return { ok: true, ...parsed };
  } catch (err) {
    const reason = reasonFromError(err);
    return { ok: false, reason, message: SAVE_FAILED_MESSAGES[reason] };
  }
}
