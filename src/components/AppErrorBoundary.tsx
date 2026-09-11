import { Component, type ErrorInfo, type ReactNode } from 'react';
import {
  clearCrashFlag,
  hasCrashRecoverAttempt,
  recoverAndReload,
} from '../lib/swClient';

type Props = { children: ReactNode };
type State = { hasError: boolean; recovering: boolean };

/**
 * Em crash: 1ª vez limpa caches SW e recarrega;
 * se repetir, mostra página Recuperar.
 */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, recovering: false };

  static getDerivedStateFromError(): Partial<State> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[AppErrorBoundary]', error, info.componentStack);
    if (!hasCrashRecoverAttempt() && !this.state.recovering) {
      this.setState({ recovering: true });
      void recoverAndReload();
    }
  }

  componentDidMount(): void {
    // Boot OK após recover → limpar flag
    if (!this.state.hasError) clearCrashFlag();
  }

  render() {
    if (this.state.recovering) {
      return (
        <div className="min-h-screen bg-bg0 text-text1 flex items-center justify-center p-6">
          <p className="font-mono text-[12px] text-text2">A recuperar… a limpar cache</p>
        </div>
      );
    }

    if (this.state.hasError && hasCrashRecoverAttempt()) {
      return (
        <div className="min-h-screen bg-bg0 text-text1 flex flex-col items-center justify-center p-6 text-center gap-4">
          <h1 className="text-lg font-semibold">Não foi possível abrir o dashboard</h1>
          <p className="font-mono text-[12px] text-text2 max-w-sm leading-relaxed">
            Ocorreu um erro repetido (comum em Chrome Android com cache antigo). Limpa o cache
            da app e tenta de novo — não precisas de limpar todos os dados do telemóvel.
          </p>
          <button
            type="button"
            className="px-4 py-3 border border-cyan-20 bg-cyan-dim text-cyan font-mono text-[11px] uppercase tracking-wider"
            onClick={() => {
              clearCrashFlag();
              void recoverAndReload();
            }}
          >
            Limpar cache e abrir
          </button>
          <a
            href="/recuperar.html"
            className="font-mono text-[10px] text-text3 underline"
          >
            Página de recuperação
          </a>
        </div>
      );
    }

    return this.props.children;
  }
}
