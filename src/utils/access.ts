/**
 * Decisões de acesso na UI. Só UX: a proteção real está no backend (authMiddleware / adminMiddleware).
 * isAdmin vem sempre de GET /auth/me.
 */

export type AccessUser = { isAdmin?: boolean } | null | undefined;

export type RouteAccess = 'loading' | 'login' | 'unavailable' | 'denied' | 'allow';

export function isAdminUser(user: AccessUser): boolean {
  return user?.isAdmin === true;
}

/** Spot Paper é o laboratório global — só administradores. */
export function canAccessSpotPaper(user: AccessUser): boolean {
  return isAdminUser(user);
}

/**
 * Spot Pilot: qualquer utilizador autenticado gere o piloto das SUAS contas. O servidor valida o dono de cada
 * conta em todas as rotas; os controlos da plataforma continuam só para administradores.
 */
export function canAccessSpotPilot(user: AccessUser): boolean {
  return user != null;
}

/** Nunca decide enquanto /auth/me ainda está a carregar; servidor sem resposta ≠ sessão terminada. */
export function routeAccess(i: { loading: boolean; user: AccessUser; requireAdmin: boolean; sessionUnavailable?: boolean }): RouteAccess {
  if (i.loading) return 'loading';
  if (!i.user) return i.sessionUnavailable ? 'unavailable' : 'login';
  if (i.requireAdmin && !isAdminUser(i.user)) return 'denied';
  return 'allow';
}
