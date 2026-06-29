import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';

/** Repõe o scroll no topo ao mudar de página. */
export function ScrollToTop() {
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    document.getElementById('app-main')?.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
