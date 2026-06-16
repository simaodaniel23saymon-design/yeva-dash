interface ErrorMessageProps {
  message: string;
  onClose?: () => void;
}

export function ErrorMessage({ message, onClose }: ErrorMessageProps) {
  if (!message) return null;

  return (
    <div className="bg-red-dim border border-red-30 p-3 flex items-start justify-between gap-3" role="alert">
      <div className="flex items-start gap-2">
        <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"
          className="text-red flex-shrink-0 mt-px">
          <path fillRule="evenodd" clipRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" />
        </svg>
        <span className="font-mono text-[10px] text-red leading-relaxed">{message}</span>
      </div>
      {onClose && (
        <button type="button" onClick={onClose}
          className="text-red/70 hover:text-red transition-colors flex-shrink-0"
          aria-label="Fechar">
          <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" clipRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" />
          </svg>
        </button>
      )}
    </div>
  );
}
