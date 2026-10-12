import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import {
  approvalExpiry,
  approveThenRefresh,
  checkTotpCode,
  DETAIL_REFRESH_FAILED_NOTE,
  isIntentExpired,
  NO_RESPONSE_MESSAGE,
  PILOT_APPROVE_ERROR_MESSAGES,
  pilotReasonLabel,
  sanitizeTotpInput,
  submitPilotApproval,
  type ApprovePost,
} from './pilotApproval';

const root = path.join(__dirname, '..');
const read = (f: string) => fs.readFileSync(path.join(root, f), 'utf8');

const ACCOUNT = '9d6b3fe3-3630-4161-9551-a69ed3359917';
const KEY = 'pilot:9d6b3fe3-3630-4161-9551-a69ed3359917:abc';
const NOW = Date.UTC(2026, 9, 12, 13, 0, 0);
const TTL = 10 * 60_000;

/** Erro no formato do axios com resposta HTTP. */
const httpError = (status: number, data: unknown) => Object.assign(new Error(`HTTP ${status}`), { response: { status, data } });

function okPost(expiresAt = new Date(NOW + TTL).toISOString()) {
  return vi.fn<ApprovePost>(async () => ({ data: { ok: true, expiresAt, orderExecution: false } as { expiresAt?: unknown } }));
}
function failingPost(err: unknown) {
  return vi.fn<ApprovePost>(async () => {
    throw err;
  });
}
const submit = (post: ApprovePost, totpCode: string) => submitPilotApproval(post, { accountId: ACCOUNT, idempotencyKey: KEY, totpCode, approvalTtlMs: TTL, nowMs: NOW });

describe('pilotApproval — entrada do código TOTP', () => {
  it('sanitiza para 6 dígitos', () => {
    expect(sanitizeTotpInput('12 34-56')).toBe('123456');
    expect(sanitizeTotpInput('1234567890')).toBe('123456');
    expect(sanitizeTotpInput('abc')).toBe('');
  });

  it('código ausente ou mal formado falha localmente', () => {
    expect(checkTotpCode('').ok).toBe(false);
    expect(checkTotpCode('   ').ok).toBe(false);
    for (const bad of ['12345', '1234567', '12a456', '12 456']) expect(checkTotpCode(bad).ok).toBe(false);
    expect(checkTotpCode('012345').ok).toBe(true);
  });
});

describe('pilotApproval — pedido de aprovação', () => {
  it('código válido: um único POST com idempotencyKey + totpCode e sem repetição de sessão', async () => {
    const post = okPost();
    const out = await submit(post, '123456');
    expect(post).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledWith(`/spot-pilot/accounts/${ACCOUNT}/approve`, { idempotencyKey: KEY, totpCode: '123456' }, { skipAuthRetry: true });
    expect(out.kind).toBe('APPROVED');
    if (out.kind === 'APPROVED') expect(out.expiresAt).toBe(new Date(NOW + TTL).toISOString());
    expect(JSON.stringify(out)).not.toContain('123456');
  });

  it('código ausente: não envia pedido', async () => {
    const post = okPost();
    const out = await submit(post, '');
    expect(out.kind).toBe('INVALID_INPUT');
    expect(post).not.toHaveBeenCalled();
  });

  it('código mal formado: não envia pedido (não gasta tentativas no servidor)', async () => {
    const post = okPost();
    for (const bad of ['12345', '1234567', '12a456']) expect((await submit(post, bad)).kind).toBe('INVALID_INPUT');
    expect(post).not.toHaveBeenCalled();
  });

  it.each([
    [400, 'TOTP_REQUIRED'],
    [403, 'TOTP_NOT_CONFIGURED'],
    [401, 'TOTP_INVALID'],
    [401, 'TOTP_REPLAYED'],
    [429, 'TOTP_LOCKED'],
    [503, 'TOTP_UNAVAILABLE'],
    [404, 'ACCOUNT_NOT_FOUND'],
    [400, 'INTENT_NOT_FOR_ACCOUNT'],
    [409, 'PILOT_NOT_ARMED'],
    [404, 'INTENT_NOT_FOUND'],
    [409, 'INTENT_NOT_PENDING'],
    [409, 'INTENT_EXPIRED'],
    [503, 'PILOT_STORE_UNAVAILABLE'],
    [500, 'PILOT_ERROR'],
  ])('erro do servidor %i %s: mensagem própria, um só pedido, sem o código', async (status, code) => {
    const post = failingPost(httpError(status, { error: code }));
    const out = await submit(post, '654321');
    expect(post).toHaveBeenCalledTimes(1);
    expect(out).toMatchObject({ kind: 'REFUSED', status, code, message: PILOT_APPROVE_ERROR_MESSAGES[code] });
    expect(JSON.stringify(out)).not.toContain('654321');
  });

  it('repetição: TOTP_REPLAYED é recusado e não é reenviado', async () => {
    const post = failingPost(httpError(401, { error: 'TOTP_REPLAYED' }));
    const out = await submit(post, '111111');
    expect(post).toHaveBeenCalledTimes(1);
    expect(out).toMatchObject({ kind: 'REFUSED', code: 'TOTP_REPLAYED' });
  });

  it('erro de rede/timeout: NO_RESPONSE, sem novo pedido automático', async () => {
    const post = failingPost(Object.assign(new Error('Network Error'), { code: 'ERR_NETWORK' }));
    const out = await submit(post, '222222');
    expect(post).toHaveBeenCalledTimes(1);
    expect(out).toEqual({ kind: 'NO_RESPONSE', message: NO_RESPONSE_MESSAGE });
  });

  it('pedido repetido após rede incerta: ALREADY_APPROVED (servidor não duplica)', async () => {
    const approvedAt = new Date(NOW - 60_000).toISOString();
    const out = await submit(failingPost(httpError(409, { error: 'ALREADY_APPROVED', approval: { approvedAt } })), '333333');
    expect(out).toMatchObject({ kind: 'REFUSED', code: 'ALREADY_APPROVED', expiry: { expired: false, expiresAt: new Date(NOW - 60_000 + TTL).toISOString() } });
  });

  it('expiração: aprovação existente fora do TTL ⇒ APPROVAL_EXPIRED', async () => {
    const approvedAt = new Date(NOW - TTL - 1).toISOString();
    const out = await submit(failingPost(httpError(409, { error: 'ALREADY_APPROVED', approval: { approvedAt } })), '444444');
    expect(out).toMatchObject({ kind: 'REFUSED', code: 'ALREADY_APPROVED', expiry: { expired: true } });
    expect(out.message).toContain('APPROVAL_EXPIRED');
  });

  it('expiração: intent expirado no servidor ⇒ INTENT_EXPIRED', async () => {
    const out = await submit(failingPost(httpError(409, { error: 'INTENT_EXPIRED' })), '555555');
    expect(out).toMatchObject({ kind: 'REFUSED', code: 'INTENT_EXPIRED' });
  });

  it('401/403 do middleware (texto livre): sessão / só administradores', async () => {
    expect((await submit(failingPost(httpError(401, { error: 'Não autenticado' })), '123456')).message).toMatch(/Sessão expirada/);
    expect((await submit(failingPost(httpError(403, { error: 'Acesso negado — apenas administradores.' })), '123456')).message).toMatch(/administradores/);
  });

  it.each([502, 503, 504])('HTTP %i sem código do backend: resultado incerto, um só pedido', async (status) => {
    for (const data of [undefined, '<html>Bad Gateway</html>', {}, { error: 'UPSTREAM_TIMEOUT' }]) {
      const post = failingPost(httpError(status, data));
      const out = await submit(post, '777777');
      expect(post).toHaveBeenCalledTimes(1);
      expect(out).toEqual({ kind: 'NO_RESPONSE', message: NO_RESPONSE_MESSAGE });
    }
  });

  it('503 com código reconhecido continua a ser recusa definitiva', async () => {
    expect(await submit(failingPost(httpError(503, { error: 'TOTP_UNAVAILABLE' })), '123456')).toMatchObject({ kind: 'REFUSED', code: 'TOTP_UNAVAILABLE' });
    expect(await submit(failingPost(httpError(503, { error: 'PILOT_STORE_UNAVAILABLE' })), '123456')).toMatchObject({ kind: 'REFUSED', code: 'PILOT_STORE_UNAVAILABLE' });
  });

  it('código desconhecido: não inventa significado', async () => {
    const out = await submit(failingPost(httpError(418, { error: 'SOMETHING_NEW' })), '123456');
    expect(out).toMatchObject({ kind: 'REFUSED', status: 418, code: 'SOMETHING_NEW' });
    expect(out.message).toContain('HTTP 418');
  });
});

describe('pilotApproval — aprovação seguida de atualização do detalhe', () => {
  it('falha ao atualizar o detalhe não elimina o aviso de resultado incerto', async () => {
    const post = failingPost(Object.assign(new Error('timeout'), { code: 'ECONNABORTED' }));
    const refresh = vi.fn(async () => {
      throw Object.assign(new Error('Network Error'), { code: 'ERR_NETWORK' });
    });
    const r = await approveThenRefresh(() => submit(post, '123456'), refresh);
    expect(post).toHaveBeenCalledTimes(1);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(r.outcome.kind).toBe('NO_RESPONSE');
    expect(r.refreshFailed).toBe(true);
    expect(r.message.startsWith(NO_RESPONSE_MESSAGE)).toBe(true);
    expect(r.message).toContain(DETAIL_REFRESH_FAILED_NOTE);
  });

  it('gateway 504 + falha no detalhe: aviso incerto mantido, sem reenvio', async () => {
    const post = failingPost(httpError(504, undefined));
    const r = await approveThenRefresh(() => submit(post, '123456'), async () => Promise.reject(new Error('down')));
    expect(post).toHaveBeenCalledTimes(1);
    expect(r.message.startsWith(NO_RESPONSE_MESSAGE)).toBe(true);
  });

  it('outros resultados mantêm a sua mensagem; detalhe atualizado com sucesso não acrescenta nota', async () => {
    const approved = await approveThenRefresh(() => submit(okPost(), '123456'), async () => undefined);
    expect(approved.outcome.kind).toBe('APPROVED');
    expect(approved.message).toBe(approved.outcome.message);
    expect(approved.refreshFailed).toBe(false);

    const refused = await approveThenRefresh(() => submit(failingPost(httpError(401, { error: 'TOTP_INVALID' })), '123456'), async () => Promise.reject(new Error('x')));
    expect(refused.message.startsWith(PILOT_APPROVE_ERROR_MESSAGES.TOTP_INVALID)).toBe(true);
  });

  it('atualização do detalhe só acontece depois da resposta da aprovação', async () => {
    const order: string[] = [];
    await approveThenRefresh(
      async () => {
        order.push('submit');
        return { kind: 'NO_RESPONSE', message: NO_RESPONSE_MESSAGE };
      },
      async () => {
        order.push('refresh');
      }
    );
    expect(order).toEqual(['submit', 'refresh']);
  });
});

describe('pilotApproval — expiração', () => {
  it('approvalExpiry e isIntentExpired', () => {
    expect(approvalExpiry(new Date(NOW).toISOString(), TTL, NOW + TTL - 1)?.expired).toBe(false);
    expect(approvalExpiry(new Date(NOW).toISOString(), TTL, NOW + TTL)?.expired).toBe(true);
    expect(approvalExpiry('x', TTL, NOW)).toBeNull();
    expect(isIntentExpired(new Date(NOW - 5 * 60_000).toISOString(), 10 * 60_000, NOW)).toBe(false);
    expect(isIntentExpired(new Date(NOW - 11 * 60_000).toISOString(), 10 * 60_000, NOW)).toBe(true);
    expect(pilotReasonLabel('APPROVAL_EXPIRED')).toBe('APPROVAL_EXPIRED (aprovação expirada)');
    expect(pilotReasonLabel('OTHER')).toBe('OTHER');
  });
});

describe('pilotApproval — fontes', () => {
  const panel = read('components/spot/SpotPilotAdminPanel.tsx');
  const lib = read('utils/pilotApproval.ts');

  it('painel usa o fluxo com TOTP, limpa o código e bloqueia pedidos em paralelo', () => {
    expect(panel).toContain('submitPilotApproval(');
    expect(panel).toContain('autoComplete="one-time-code"');
    expect(panel).toMatch(/approvingRef\.current\) return/);
    expect(panel).not.toMatch(/\/approve`/);
    expect((panel.match(/setTotpCode\(''\)/g) ?? []).length).toBeGreaterThanOrEqual(3);
  });

  it('M2: a aprovação usa approveThenRefresh e o detalhe é atualizado sem substituir a mensagem', () => {
    expect(panel).toContain('approveThenRefresh(');
    expect(panel).toMatch(/\(\) => fetchDetail\(accountId\)/);
    const confirm = panel.slice(panel.indexOf('async function confirmApprove'), panel.indexOf('async function loadReadiness'));
    expect(confirm).not.toContain('loadDetail(');
    expect(confirm).toContain('text: message');
  });

  it('B2: «Abrir» desativado durante pedidos e respostas de outra conta ignoradas', () => {
    expect(panel).toMatch(/<button type="button" disabled=\{busy\}[^>]*onClick=\{\(\) => openAccount\(a\.id\)\}>Abrir<\/button>/);
    expect(panel).toMatch(/const openAccount = \(id: string\) => \{\s*if \(busy \|\| approvingRef\.current\) return;/);
    expect(panel).toMatch(/if \(selectedRef\.current === id\) setDetail\(data\)/);
    expect(panel).toMatch(/if \(selectedRef\.current === id\) setMsg\(/);
    expect((panel.match(/setSelected\(/g) ?? []).length).toBe(1);
  });

  it('B2: aprovação em curso fica presa à conta e ao intent do clique', () => {
    const confirm = panel.slice(panel.indexOf('async function confirmApprove'), panel.indexOf('async function loadReadiness'));
    expect(confirm).toContain('const accountId = selected;');
    expect(confirm).toMatch(/accountId,\s*idempotencyKey,/);
  });

  it('código TOTP nunca é registado nem persistido', () => {
    for (const src of [panel, lib]) {
      expect(src).not.toMatch(/console\.|localStorage|sessionStorage/);
    }
  });

  it('interceptor não repete pedidos com skipAuthRetry em 401', () => {
    expect(read('lib/api.ts')).toMatch(/status === 401 && !isAuthRequest\(requestUrl\) && !originalRequest\._retry && !originalRequest\.skipAuthRetry/);
  });
});
