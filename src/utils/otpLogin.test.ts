import fs from 'node:fs';
import path from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import OtpCodeInput from '../components/ui/OtpCodeInput';
import { httpStatusOf, isRefreshRejected, isSessionRejected, SESSION_BOOT_RETRY_DELAYS_MS } from '../lib/sessionPolicy';
import { routeAccess } from './access';
import { loginTotpError } from './loginTotp';
import { sanitizeOtpInput, shouldAutoSubmitOtp } from './totpCode';

const root = path.join(__dirname, '..');
const read = (f: string) => fs.readFileSync(path.join(root, f), 'utf8');
const http = (status: number, data: unknown = {}) => Object.assign(new Error(`HTTP ${status}`), { isAxiosError: true, response: { status, data } });

describe('campo OTP', () => {
  it('colar ou autopreencher com espaços/hífen fica com os 6 dígitos', () => {
    expect(sanitizeOtpInput('123 456')).toBe('123456');
    expect(sanitizeOtpInput('123-456')).toBe('123456');
    expect(sanitizeOtpInput(' 12a3456789')).toBe('123456');
    expect(sanitizeOtpInput('12')).toBe('12');
  });

  it('validação automática só com 6 dígitos, sem pedido em curso e sem repetir o mesmo código', () => {
    expect(shouldAutoSubmitOtp('123456', null, false)).toBe(true);
    expect(shouldAutoSubmitOtp('12345', null, false)).toBe(false);
    expect(shouldAutoSubmitOtp('123456', '123456', false)).toBe(false);
    expect(shouldAutoSubmitOtp('123456', null, true)).toBe(false);
    expect(shouldAutoSubmitOtp('654321', '123456', false)).toBe(true);
  });

  it('campo único com teclado numérico e autopreenchimento do sistema', () => {
    const html = renderToStaticMarkup(createElement(OtpCodeInput, { value: '', onChange: () => {} }));
    expect(html).toMatch(/autocomplete="one-time-code"/i);
    expect(html).toMatch(/inputmode="numeric"/i);
    expect(html).toContain('name="one-time-code"');
    expect(html).not.toMatch(/maxlength/i);
  });
});

describe('login com 2FA', () => {
  it('página de login usa o campo único, valida ao 6.º dígito e envia um único pedido', () => {
    const src = read('pages/LoginPage.tsx');
    expect(src).toContain('<OtpCodeInput');
    expect(src).toMatch(/onComplete=\{\(code\) => void submitTotp\(code\)\}/);
    expect(src).toMatch(/if \(submittingTotp\.current\) return;/);
    expect(src).not.toMatch(/totpDigits|maxLength=\{1\}/);
    expect(src).not.toMatch(/24h de inactividade/);
    expect(src).not.toMatch(/console\.|localStorage|sessionStorage/);
  });

  it('mensagens claras por código do servidor; bloqueio distinto de código errado', () => {
    expect(loginTotpError(http(401, { code: 'TOTP_INVALID' })).message).toMatch(/Código inválido/);
    expect(loginTotpError(http(401, { code: 'TOTP_REPLAYED' })).message).toMatch(/já foi usado/);
    expect(loginTotpError(http(429, { code: 'TOTP_LOCKED' }))).toMatchObject({ code: 'TOTP_LOCKED', rateLimited: true });
    expect(loginTotpError(http(429, { error: 'x' }))).toMatchObject({ code: 'RATE_LIMITED' });
  });
});

describe('sessão persistente', () => {
  it('só um 401 (ou 400 do refresh sem token) termina a sessão; rede, 429 e 5xx não', () => {
    expect(isRefreshRejected(http(401))).toBe(true);
    expect(isRefreshRejected(http(400))).toBe(true);
    for (const s of [429, 500, 502, 503]) expect(isRefreshRejected(http(s))).toBe(false);
    expect(isRefreshRejected(new Error('Network Error'))).toBe(false);
    expect(isSessionRejected(http(401))).toBe(true);
    expect(isSessionRejected(http(503))).toBe(false);
    expect(httpStatusOf({})).toBeNull();
    expect(SESSION_BOOT_RETRY_DELAYS_MS.length).toBeGreaterThan(0);
  });

  it('servidor sem resposta ≠ sessão terminada: rota mostra "tentar novamente" em vez do login', () => {
    expect(routeAccess({ loading: false, user: null, requireAdmin: false, sessionUnavailable: true })).toBe('unavailable');
    expect(routeAccess({ loading: false, user: null, requireAdmin: false })).toBe('login');
  });

  it('interceptor e contexto: só redirecionam/limpam com rejeição real da sessão', () => {
    const api = read('lib/api.ts');
    expect(api.match(/if \(isRefreshRejected\(refreshError\)\) \{\s*redirectToLogin\(true\);/g)?.length).toBe(2);
    const ctx = read('context/AuthContext.tsx');
    expect(ctx).toMatch(/if \(isSessionRejected\(err\) \|\| !getAccessToken\(\)\) \{\s*clearAuthStorage\(\);/);
    expect(ctx).toContain('setSessionUnavailable(true)');
  });
});
