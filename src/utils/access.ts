/**
 * Decisões de acesso na UI. Só UX: a proteção real está no backend (adminMiddleware).
 * isAdmin vem sempre de GET /auth/me.
 */

export type AccessUser = { isAdmin?: boolean } | null | undefined;

export type RouteAccess = 'loading' | 'login' | 'denied' | 'allow';

export function isAdminUser(user: AccessUser): boolean {
  return user?.isAdmin === true;
}

/** Spot Paper é o laboratório global — só administradores. */
export function canAccessSpotPaper(user: AccessUser): boolean {
  return isAdminUser(user);
}

/** Nunca decide enquanto /auth/me ainda está a carregar. */
export function routeAccess(i: { loading: boolean; user: AccessUser; requireAdmin: boolean }): RouteAccess {
  if (i.loading) return 'loading';
  if (!i.user) return 'login';
  if (i.requireAdmin && !isAdminUser(i.user)) return 'denied';
  return 'allow';
}
