import axios from 'axios';

export interface FriendlyError {
  message: string;
  status: number;
  code: string;
}

/**
 * Converte qualquer erro (axios, rede, genérico) numa mensagem amigável em PT-PT
 * pronta a mostrar ao utilizador final.
 */
export function getFriendlyError(error: unknown): FriendlyError {
  // Sem ligação à internet (deteção do browser)
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { message: 'Sem ligação à internet. Verifica a tua ligação.', status: 0, code: 'OFFLINE' };
  }

  if (axios.isAxiosError(error)) {
    // Erro de rede: DNS não resolve, servidor offline ou CORS bloqueado
    if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
      return {
        message: 'Não foi possível ligar ao servidor. Tenta novamente dentro de momentos.',
        status: 0,
        code: 'NETWORK_ERROR',
      };
    }

    // Tempo de espera esgotado
    if (error.code === 'ECONNABORTED') {
      return { message: 'O servidor demorou a responder. Tenta novamente.', status: 408, code: 'TIMEOUT' };
    }

    const status = error.response?.status ?? 0;
    const data = error.response?.data as { error?: string; message?: string } | undefined;
    const serverMsg = data?.error ?? data?.message;

    const map: Record<number, { message: string; code: string }> = {
      400: { message: serverMsg ?? 'Dados inválidos. Verifica as informações e tenta novamente.', code: 'VALIDATION_ERROR' },
      401: { message: 'Credenciais inválidas. Verifica o email e a password.', code: 'UNAUTHORIZED' },
      403: { message: 'Não tens permissão para aceder a este recurso.', code: 'FORBIDDEN' },
      404: { message: 'Recurso não encontrado.', code: 'NOT_FOUND' },
      405: { message: 'Operação não permitida. Verifica a ligação ao servidor.', code: 'METHOD_NOT_ALLOWED' },
      409: { message: serverMsg ?? 'Este email já está registado. Tenta iniciar sessão.', code: 'CONFLICT' },
      429: { message: 'Demasiadas tentativas. Aguarda um pouco e tenta novamente.', code: 'RATE_LIMITED' },
      500: { message: 'Erro no servidor. Tenta novamente mais tarde.', code: 'SERVER_ERROR' },
      503: { message: 'Serviço temporariamente indisponível. Tenta novamente dentro de alguns minutos.', code: 'SERVICE_UNAVAILABLE' },
    };

    const info = map[status] ?? { message: serverMsg ?? 'Ocorreu um erro inesperado. Tenta novamente.', code: 'UNKNOWN' };
    return { message: info.message, status, code: info.code };
  }

  const message = (error as { message?: string })?.message;
  return { message: message ?? 'Ocorreu um erro inesperado. Tenta novamente.', status: 0, code: 'UNKNOWN' };
}
