import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { extractTotpCode, formatManualKey } from './totpCode';

describe('extractTotpCode', () => {
  it('aceita 6 dígitos com separadores comuns', () => {
    expect(extractTotpCode('123456')).toBe('123456');
    expect(extractTotpCode(' 123 456 ')).toBe('123456');
    expect(extractTotpCode('123-456')).toBe('123456');
  });

  it('recusa tudo o que não tenha exatamente 6 dígitos', () => {
    for (const bad of ['', '12345', '1234567', 'abcdef', '12a45']) {
      expect(extractTotpCode(bad)).toBeNull();
    }
  });
});

describe('formatManualKey', () => {
  it('agrupa em blocos de 4 sem perder caracteres', () => {
    const key = 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP';
    const formatted = formatManualKey(key);
    expect(formatted).toBe('JBSW Y3DP EHPK 3PXP JBSW Y3DP EHPK 3PXP');
    expect(formatted.replace(/ /g, '')).toBe(key);
  });
});

describe('SettingsPage — fluxo 2FA', () => {
  const src = fs.readFileSync(path.join(__dirname, '../pages/SettingsPage.tsx'), 'utf8');

  it('mostra o erro dentro do modal e limpa os dígitos após falha', () => {
    expect(src).toMatch(/role="alert" data-testid="twofa-error"/);
    expect(src).toMatch(/<TotpInput key=\{totpAttempt\} onComplete=\{handle2FAEnable\}/);
    expect(src).toMatch(/<TotpInput key=\{totpAttempt\} onComplete=\{handle2FADisable\}/);
    expect(src).toMatch(/const fail2FA[\s\S]*setTwofaError\(getFriendlyError\(err\)\.message\)[\s\S]*setTotpAttempt/);
  });

  it('o modal mostra a chave manual do segredo devolvido pelo setup', () => {
    expect(src).toContain('data-testid="twofa-manual-key"');
    expect(src).toContain('formatManualKey(qrData.secret)');
  });

  it('só fecha o modal de ativação depois de o servidor confirmar', () => {
    const enable = src.slice(src.indexOf('const handle2FAEnable'), src.indexOf('const handle2FADisable'));
    expect(enable.indexOf("api.post('/auth/2fa/enable'")).toBeLessThan(enable.indexOf('close2FAModal()'));
    expect(enable).toMatch(/catch \(err: unknown\) \{\s*fail2FA\(err\)/);
  });

  it('colar o código usa a validação de 6 dígitos', () => {
    expect(src).toMatch(/extractTotpCode\(e\.clipboardData\.getData\('text'\)\)/);
  });
});
