/** Conta DEMO da plataforma: credenciais fictícias, sem ligação real a nenhuma exchange. */
export function isDemoExchangeAccount(
  account?: { exchange?: string; accountType?: string } | null
): boolean {
  if (!account) return false;
  return (
    String(account.exchange ?? '').toUpperCase() === 'DEMO' ||
    String(account.accountType ?? '').toUpperCase() === 'DEMO'
  );
}

/** Teste automático (sem clique) só para contas reais ligadas. Falhas não são repetidas automaticamente. */
export function shouldAutoTestConnection(input: {
  connected: boolean;
  account?: { exchange?: string; accountType?: string } | null;
  editMode: boolean;
}): boolean {
  return input.connected && !input.editMode && !isDemoExchangeAccount(input.account);
}
