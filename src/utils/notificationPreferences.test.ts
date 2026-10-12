import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import {
  canEditPreferences,
  loadNotificationPreferences,
  parsePreferences,
  PREFERENCES_UNAVAILABLE_MESSAGES,
  PREFERENCES_URL,
  saveNotificationPreference,
  type PreferencesGet,
  type PreferencesPut,
  type PreferencesState,
} from './notificationPreferences';

const root = path.join(__dirname, '..');
const read = (f: string) => fs.readFileSync(path.join(root, f), 'utf8');
const PANEL = 'components/notifications/NotificationChannelsPanel.tsx';

const SERVER = { gasLow: true, takeProfit: false, stopLoss: true, dailyReport: false, configured: true, updatedAt: '2026-10-12T16:00:00.000Z' };
const httpError = (status: number, data: unknown = {}) => Object.assign(new Error(`HTTP ${status}`), { response: { status, data } });

function descOf(src: string, title: string): string {
  const m = src.match(new RegExp(`title: '${title}',\\s*desc: '([^']*)'`));
  if (!m) throw new Error(`descrição de ${title} não encontrada`);
  return m[1];
}

describe('descrições TP/SL do painel', () => {
  const src = read(PANEL);

  it('TP e SL referem o ciclo DCA, não limites diários', () => {
    const tp = descOf(src, 'TP atingido');
    const sl = descOf(src, 'SL atingido');
    expect(tp).toMatch(/ciclo DCA/);
    expect(tp).toMatch(/take profit/);
    expect(sl).toMatch(/ciclo DCA/);
    expect(sl).toMatch(/stop loss/);
    for (const d of [tp, sl]) expect(d).not.toMatch(/di[aá]ri[oa]/i);
  });

  it('indica que o circuit breaker de perda diária é sempre enviado', () => {
    expect(src).toMatch(/circuit breaker de perda diária[^<]*sempre enviados/);
  });
});

describe('parsePreferences', () => {
  it('aceita a resposta completa do servidor', () => {
    expect(parsePreferences(SERVER)).toEqual({
      prefs: { gasLow: true, takeProfit: false, stopLoss: true, dailyReport: false },
      configured: true,
    });
  });

  it('recusa respostas incompletas ou mal formadas (não assume "ligado")', () => {
    for (const bad of [null, undefined, '', 'ok', [], {}, { gasLow: true }, { ...SERVER, stopLoss: 'true' }, { ...SERVER, dailyReport: null }]) {
      expect(parsePreferences(bad), JSON.stringify(bad)).toBeNull();
    }
  });
});

describe('loadNotificationPreferences', () => {
  it('estado inicial do painel é "loading" e não é editável', () => {
    const initial: PreferencesState = { status: 'loading' };
    expect(canEditPreferences(initial)).toBe(false);
    expect(read(PANEL)).toMatch(/useState<PreferencesState>\(\{ status: 'loading' \}\)/);
  });

  it('resposta válida ⇒ loaded com os valores do servidor', async () => {
    const get = vi.fn<PreferencesGet>().mockResolvedValue({ data: SERVER });
    const s = await loadNotificationPreferences(get);
    expect(get).toHaveBeenCalledWith(PREFERENCES_URL);
    expect(s).toEqual({ status: 'loaded', prefs: { gasLow: true, takeProfit: false, stopLoss: true, dailyReport: false }, configured: true });
    expect(canEditPreferences(s)).toBe(true);
  });

  it('sem configuração guardada ⇒ loaded com configured=false (valores vindos do servidor)', async () => {
    const data = { gasLow: true, takeProfit: true, stopLoss: true, dailyReport: true, configured: false, updatedAt: null };
    const s = await loadNotificationPreferences(async () => ({ data }));
    expect(s).toMatchObject({ status: 'loaded', configured: false });
  });

  it.each([
    [404, {}, 'NOT_AVAILABLE'],
    [503, { code: 'PREFERENCES_UNAVAILABLE' }, 'SERVICE_UNAVAILABLE'],
    [401, {}, 'UNAUTHORIZED'],
    [403, {}, 'UNAUTHORIZED'],
    [502, {}, 'NO_RESPONSE'],
    [504, {}, 'NO_RESPONSE'],
    [500, {}, 'ERROR'],
  ])('HTTP %i ⇒ unavailable(%s)', async (status, data, reason) => {
    const s = await loadNotificationPreferences(async () => {
      throw httpError(status, data);
    });
    expect(s).toEqual({ status: 'unavailable', reason, message: PREFERENCES_UNAVAILABLE_MESSAGES[reason as keyof typeof PREFERENCES_UNAVAILABLE_MESSAGES] });
    expect(canEditPreferences(s)).toBe(false);
    expect('prefs' in s).toBe(false);
  });

  it('falha de rede ⇒ unavailable(NO_RESPONSE), sem preferências', async () => {
    const s = await loadNotificationPreferences(async () => {
      throw new Error('Network Error');
    });
    expect(s).toMatchObject({ status: 'unavailable', reason: 'NO_RESPONSE' });
    expect('prefs' in s).toBe(false);
  });

  it('200 com corpo inesperado ⇒ unavailable(INVALID_RESPONSE)', async () => {
    const s = await loadNotificationPreferences(async () => ({ data: '<html>' }));
    expect(s).toMatchObject({ status: 'unavailable', reason: 'INVALID_RESPONSE' });
  });

  it('mensagens de indisponibilidade não afirmam que os alertas estão ligados', () => {
    for (const m of Object.values(PREFERENCES_UNAVAILABLE_MESSAGES)) {
      expect(m).not.toMatch(/\bativ[oa]s?\b.*\bligad/i);
      expect(m).not.toMatch(/Activo/);
    }
  });
});

describe('saveNotificationPreference', () => {
  it('envia só a chave alterada e devolve o estado do servidor', async () => {
    const put = vi.fn<PreferencesPut>().mockResolvedValue({ data: { ...SERVER, takeProfit: true } });
    const r = await saveNotificationPreference(put, 'takeProfit', true);
    expect(put).toHaveBeenCalledTimes(1);
    expect(put).toHaveBeenCalledWith(PREFERENCES_URL, { takeProfit: true });
    expect(r).toEqual({ ok: true, prefs: { gasLow: true, takeProfit: true, stopLoss: true, dailyReport: false }, configured: true });
  });

  it('erros HTTP e de rede ⇒ falha, nunca lança', async () => {
    const cases: Array<[unknown, string]> = [
      [httpError(404), 'NOT_AVAILABLE'],
      [httpError(503, { code: 'PREFERENCES_UNAVAILABLE' }), 'SERVICE_UNAVAILABLE'],
      [httpError(400, { code: 'INVALID_PREFERENCES' }), 'ERROR'],
      [new Error('Network Error'), 'NO_RESPONSE'],
    ];
    for (const [err, reason] of cases) {
      const r = await saveNotificationPreference(async () => {
        throw err;
      }, 'gasLow', false);
      expect(r).toMatchObject({ ok: false, reason });
    }
  });

  it('resposta sem estado completo ⇒ INVALID_RESPONSE', async () => {
    const r = await saveNotificationPreference(async () => ({ data: { ok: true } }), 'gasLow', false);
    expect(r).toMatchObject({ ok: false, reason: 'INVALID_RESPONSE' });
  });
});

describe('painel — estados e envio (verificação de fonte)', () => {
  const src = read(PANEL);

  it('não há defaults "tudo ligado" no frontend', () => {
    expect(src).not.toMatch(/DEFAULT_PREFS/);
    expect(src).not.toMatch(/gasLow:\s*true/);
  });

  it('distingue loading, unavailable e loaded', () => {
    expect(src).toMatch(/prefsState\.status === 'loading'/);
    expect(src).toMatch(/prefsState\.status === 'unavailable'/);
    expect(src).toMatch(/data-testid="notification-prefs-unavailable"/);
    expect(src).toMatch(/data-testid="notification-prefs-loaded"/);
    expect(src).toMatch(/Tentar novamente/);
  });

  it('só envia com preferências carregadas e um envio de cada vez', () => {
    expect(src).toMatch(/if \(!canEditPreferences\(prefsState\) \|\| savingKey\) return;/);
    expect(src).toMatch(/disabled=\{savingKey !== null\}/);
    expect(src).not.toMatch(/api\.put\(['"]\/notifications\/preferences['"]/);
  });
});
