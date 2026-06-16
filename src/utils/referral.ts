const REFERRAL_BASE = 'https://dashboard.yevatrade.com/signup';

/** Gera o link de indicação correcto com o código real do utilizador. */
export function buildReferralLink(referralCode?: string | null): string {
  if (!referralCode) return REFERRAL_BASE;
  return `${REFERRAL_BASE}?ref=${encodeURIComponent(referralCode)}`;
}
