import { describe, expect, it } from 'vitest';
import { accessTokenExpMs, accessTokenExpiresWithin, bearerToken } from './authToken';

function fakeJwt(payload: Record<string, unknown>): string {
  const enc = (o: unknown) => btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${enc({ alg: 'HS256', typ: 'JWT' })}.${enc(payload)}.sig`;
}

describe('authToken', () => {
  const now = Date.UTC(2026, 9, 2, 12, 0, 0);
  const expSec = (offsetMs: number) => Math.floor((now + offsetMs) / 1000);

  it('lê exp do payload', () => {
    expect(accessTokenExpMs(fakeJwt({ exp: expSec(60_000) }))).toBe(expSec(60_000) * 1000);
  });

  it('expira dentro da janela', () => {
    expect(accessTokenExpiresWithin(fakeJwt({ exp: expSec(10_000) }), 30_000, now)).toBe(true);
    expect(accessTokenExpiresWithin(fakeJwt({ exp: expSec(-5_000) }), 30_000, now)).toBe(true);
  });

  it('não renova token com validade folgada', () => {
    expect(accessTokenExpiresWithin(fakeJwt({ exp: expSec(10 * 60_000) }), 30_000, now)).toBe(false);
  });

  it('token ilegível ou sem exp não dispara refresh proactivo', () => {
    for (const t of ['', 'abc', 'a.b', 'a.!!!.c', fakeJwt({ userId: 'x' }), fakeJwt({ exp: 'soon' })]) {
      expect(accessTokenExpiresWithin(t, 30_000, now)).toBe(false);
    }
  });

  it('extrai bearer', () => {
    expect(bearerToken('Bearer abc')).toBe('abc');
    expect(bearerToken('Basic abc')).toBeNull();
    expect(bearerToken(undefined)).toBeNull();
  });
});
