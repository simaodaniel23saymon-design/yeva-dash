import { useEffect, useRef } from 'react'
import { sanitizeOtpInput, shouldAutoSubmitOtp, TOTP_LENGTH } from '../../utils/totpCode'

type Props = {
  value: string
  onChange: (code: string) => void
  /** Chamado uma vez quando o código fica com 6 dígitos (escrito, colado ou autopreenchido). */
  onComplete?: (code: string) => void
  busy?: boolean
  disabled?: boolean
  autoFocus?: boolean
  id?: string
  label?: string
  className?: string
}

/**
 * Campo único para o código da app autenticadora: aceita colar ("123 456"), autopreenchimento do sistema
 * (`one-time-code`) e teclado numérico no telemóvel. O código nunca é guardado fora do estado do formulário.
 */
export default function OtpCodeInput({ value, onChange, onComplete, busy = false, disabled = false, autoFocus = false, id, label = 'Código de 6 dígitos', className }: Props) {
  const lastSubmitted = useRef<string | null>(null)

  useEffect(() => {
    if (value.length < TOTP_LENGTH) lastSubmitted.current = null
  }, [value])

  const accept = (raw: string) => {
    const next = sanitizeOtpInput(raw)
    onChange(next)
    if (onComplete && shouldAutoSubmitOtp(next, lastSubmitted.current, busy || disabled)) {
      lastSubmitted.current = next
      onComplete(next)
    }
  }

  return (
    <input
      id={id}
      name="one-time-code"
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      autoComplete="one-time-code"
      enterKeyHint="done"
      spellCheck={false}
      aria-label={label}
      placeholder="000000"
      value={value}
      disabled={disabled}
      autoFocus={autoFocus}
      onChange={(e) => accept(e.target.value)}
      onPaste={(e) => {
        const text = e.clipboardData.getData('text')
        if (!text) return
        e.preventDefault()
        accept(text)
      }}
      className={
        className ??
        'w-full max-w-[14rem] bg-bg3 border border-border2 text-center text-2xl font-bold tracking-[0.5em] text-cyan font-mono px-3 py-3 outline-none focus:border-cyan transition-colors disabled:opacity-50'
      }
    />
  )
}
