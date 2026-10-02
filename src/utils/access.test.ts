import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { canAccessSpotPaper, isAdminUser, routeAccess } from './access';

const read = (f: string) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

describe('routeAccess', () => {
  it('não decide enquanto /auth/me carrega', () => {
    expect(routeAccess({ loading: true, user: null, requireAdmin: true })).toBe('loading');
    expect(routeAccess({ loading: true, user: { isAdmin: false }, requireAdmin: true })).toBe('loading');
  });

  it('sem sessão ⇒ login', () => {
    expect(routeAccess({ loading: false, user: null, requireAdmin: false })).toBe('login');
    expect(routeAccess({ loading: false, user: null, requireAdmin: true })).toBe('login');
  });

  it('rota admin: utilizador normal ⇒ denied; admin ⇒ allow', () => {
    expect(routeAccess({ loading: false, user: { isAdmin: false }, requireAdmin: true })).toBe('denied');
    expect(routeAccess({ loading: false, user: {}, requireAdmin: true })).toBe('denied');
    expect(routeAccess({ loading: false, user: { isAdmin: true }, requireAdmin: true })).toBe('allow');
  });

  it('rota normal (/spot): qualquer utilizador autenticado', () => {
    expect(routeAccess({ loading: false, user: { isAdmin: false }, requireAdmin: false })).toBe('allow');
    expect(routeAccess({ loading: false, user: { isAdmin: true }, requireAdmin: false })).toBe('allow');
  });

  it('Spot Paper só com isAdmin === true', () => {
    expect(canAccessSpotPaper({ isAdmin: true })).toBe(true);
    for (const u of [null, undefined, {}, { isAdmin: false }, { isAdmin: 'true' as unknown as boolean }]) {
      expect(canAccessSpotPaper(u)).toBe(false);
      expect(isAdminUser(u)).toBe(false);
    }
  });
});

describe('Spot Paper na UI', () => {
  it('/spot-paper exige admin e mostra página 403 (sem redirect silencioso); /spot fica aberto', () => {
    const app = read('App.tsx');
    expect(app).toMatch(/path="\/spot-paper" element=\{<AppRoute element=\{<SpotPaperPage \/>\} requireAdmin denied=\{\{ kind: 'page'/);
    expect(app).toMatch(/path="\/spot" element=\{<AppRoute element=\{<SpotPage \/>\} \/>\}/);
    expect(app).toMatch(/<AccessDenied/);
  });

  it('sidebar só mostra Spot Paper ao admin; Spot fica para todos', () => {
    const layout = read('components/Layout.tsx');
    expect(layout).toMatch(/\{canAccessSpotPaper\(user\) && \(\s*<NavLink to="\/spot-paper"/);
    expect(layout).toMatch(/<NavLink to="\/spot" /);
  });

  it('métricas dos paper tracks só são pedidas para admin', () => {
    const hook = read('hooks/useMomentumRanking.ts');
    expect(hook).toMatch(/includePaperMetrics\s*\?\s*api\.get<MetricsResponse>\('\/auto-ops\/momentum\/metrics'/);
    const section = read('components/dashboard/MomentumWinnersLosersSection.tsx');
    expect(section).toMatch(/useMomentumRanking\(60_000, isAdmin\)/);
  });

  it('nenhum link para /spot-paper fora dos sítios protegidos', () => {
    const allowed = new Set(['App.tsx', 'components/Layout.tsx', 'components/dashboard/MomentumWinnersLosersSection.tsx']);
    const root = path.join(__dirname, '..');
    const walk = (dir: string): string[] =>
      fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
        const p = path.join(dir, e.name);
        return e.isDirectory() ? walk(p) : /\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name) ? [p] : [];
      });
    const offenders = walk(root)
      .map((p) => path.relative(root, p).replace(/\\/g, '/'))
      .filter((rel) => !allowed.has(rel) && /to="\/spot-paper"/.test(fs.readFileSync(path.join(root, rel), 'utf8')));
    expect(offenders).toEqual([]);
  });
});
