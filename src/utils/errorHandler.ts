import axios from 'axios';

export interface FriendlyError {
  message: string;
  status: number;
  code: string;
}

/** Mensagens do servidor seguras para mostrar ao utilizador */
function sanitizeServerMessage(msg?: string): string | undefined {
  if (!msg || typeof msg !== 'string') return undefined;
  const trimmed = msg.trim();
  if (trimmed.length > 160) return undefined;
  const blocked = /(\bat\s+\w|stack|ECONNREFUSED|prisma|sql|undefined|null pointer|internal server)/i;
  if (blocked.test(trimmed)) return undefined;
  return trimmed;
}

export function getFriendlyError(error: unknown): FriendlyError {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { message: 'Sem ligação à internet. Verifica a tua ligação.', status: 0, code: 'OFFLINE' };
  }

  if (axios.isAxiosError(error)) {
    if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
      return {
        message: 'Não foi possível ligar ao servidor. Tenta novamente dentro de momentos.',
        status: 0,
        code: 'NETWORK_ERROR',
      };
    }

    if (error.code === 'ECONNABORTED') {
      return { message: 'O servidor demorou a responder. Tenta novamente.', status: 408, code: 'TIMEOUT' };
    }

    const status = error.response?.status ?? 0;
    const data = error.response?.data as { error?: string; message?: string } | undefined;
    const serverMsg = sanitizeServerMessage(data?.error ?? data?.message);

    const map: Record<number, { message: string; code: string }> = {
      400: { message: serverMsg ?? 'Dados inválidos. Verifica as informações e tenta novamente.', code: 'VALIDATION_ERROR' },
      401: { message: 'Credenciais inválidas. Verifica o email e a password.', code: 'UNAUTHORIZED' },
      403: { message: 'Não tens permissão para aceder a este recurso.', code: 'FORBIDDEN' },
      404: { message: 'Recurso não encontrado.', code: 'NOT_FOUND' },
      405: { message: 'Operação não permitida.', code: 'METHOD_NOT_ALLOWED' },
      409: { message: serverMsg ?? 'Este email já está registado. Tenta iniciar sessão.', code: 'CONFLICT' },
      429: { message: 'Demasiadas tentativas. Aguarda um pouco e tenta novamente.', code: 'RATE_LIMITED' },
      500: { message: 'Erro no servidor. Tenta novamente mais tarde.', code: 'SERVER_ERROR' },
      503: { message: 'Serviço temporariamente indisponível.', code: 'SERVICE_UNAVAILABLE' },
    };

    const info = map[status] ?? { message: serverMsg ?? 'Ocorreu um erro inesperado. Tenta novamente.', code: 'UNKNOWN' };
    return { message: info.message, status, code: info.code };
  }

  return { message: 'Ocorreu um erro inesperado. Tenta novamente.', status: 0, code: 'UNKNOWN' };
}
