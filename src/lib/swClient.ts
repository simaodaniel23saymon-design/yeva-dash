/**
 * Cliente do service worker — registo, update e recuperação de cache.
 */

export const SW_CRASH_KEY = 'yeva_sw_crash_recover_v1';

export const SW_CACHE_VERSION: string = String(import.meta.env.VITE_BUILD_ID || 'dev');

export async function clearYevaCaches(): Promise<void> {
  if ('caches' in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
  }
  if ('serviceWorker' in navigator) {
    const regs = await navigator.serviceWorker.getRegistrations();
    for (const reg of regs) {
      try {
        reg.active?.postMessage({ type: 'YEWA_CLEAR_CACHES' });
        reg.waiting?.postMessage({ type: 'YEWA_SKIP_WAITING' });
      } catch {
        /* */
      }
      try {
        await reg.unregister();
      } catch {
        /* */
      }
    }
  }
}

export async function recoverAndReload(): Promise<void> {
  try {
    sessionStorage.setItem(SW_CRASH_KEY, '1');
  } catch {
    /* */
  }
  try {
    await clearYevaCaches();
  } catch {
    /* */
  }
  const url = new URL(window.location.href);
  url.searchParams.set('_recover', String(Date.now()));
  window.location.replace(url.toString());
}

export function clearCrashFlag(): void {
  try {
    sessionStorage.removeItem(SW_CRASH_KEY);
  } catch {
    /* */
  }
}

export function hasCrashRecoverAttempt(): boolean {
  try {
    return sessionStorage.getItem(SW_CRASH_KEY) === '1';
  } catch {
    return false;
  }
}

export function registerYevaServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    const url = `/sw.js?v=${encodeURIComponent(SW_CACHE_VERSION)}`;
    navigator.serviceWorker
      .register(url, { scope: '/' })
      .then((reg) => {
        // Novo SW à espera → forçar activação
        if (reg.waiting) {
          reg.waiting.postMessage({ type: 'YEWA_SKIP_WAITING' });
        }
        reg.addEventListener('updatefound', () => {
          const sw = reg.installing;
          if (!sw) return;
          sw.addEventListener('statechange', () => {
            if (sw.state === 'installed' && navigator.serviceWorker.controller) {
              sw.postMessage({ type: 'YEWA_SKIP_WAITING' });
            }
          });
        });
      })
      .catch(() => {
        /* SW opcional */
      });

    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      // Novo SW assumiu controlo — refresh único para apanhar assets novos
      try {
        if (sessionStorage.getItem('yeva_sw_reloaded') === SW_CACHE_VERSION) return;
        sessionStorage.setItem('yeva_sw_reloaded', SW_CACHE_VERSION);
      } catch {
        /* */
      }
      window.location.reload();
    });
  });
}
