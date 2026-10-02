/**
 * Rótulos e helpers do Exchange Hub. O catálogo (exchanges, estados, mercados, ligação, fluxos)
 * vem só do backend em GET /api/spot/venues — nada de dados de exchanges duplicados aqui.
 */

import type { SpotVenue, SpotVenueStatus, VenueAction, VenueMarketState } from '../types/spot';

export type HubStatus = SpotVenueStatus;

export const HUB_STATUS_LABEL: Record<HubStatus, string> = {
  CONNECTED: 'Conectada',
  AVAILABLE: 'Disponível',
  NOT_CONNECTED: 'Não conectada',
  COMING_SOON: 'Em breve',
  NOT_SUPPORTED: 'Não suportada',
};

export const AUTH_LABEL: Record<SpotVenue['auth'], string> = {
  API_KEY: 'API Key + Secret (encriptados no servidor)',
  WALLET: 'Carteira do utilizador + assinatura',
};

export const ACTION_LABEL: Record<VenueAction, string> = {
  MANAGE: 'Gerir',
  CONNECT: 'Conectar',
  LEARN: 'Saber como funciona',
  DISABLED: 'Indisponível',
};

export const MARKET_LABEL: Record<string, string> = { SPOT: 'Spot', FUTURES: 'Futures', PERP: 'Perpétuos' };

export function marketStateLabel(state: VenueMarketState | null): string {
  if (!state) return 'Não suportado';
  const base = HUB_STATUS_LABEL[state.status];
  if (state.status !== 'CONNECTED') return base;
  if (state.trading === 'LIVE') return `${base} · trading ativo`;
  if (state.trading === 'BOTS') return `${base} · via bots`;
  return `${base} · trading desativado`;
}

export function venuesByType(venues: readonly SpotVenue[], type: SpotVenue['type']): SpotVenue[] {
  return venues.filter((v) => v.type === type);
}

export function findVenue(venues: readonly SpotVenue[], id: string): SpotVenue | null {
  return venues.find((v) => v.exchange === id) ?? null;
}

export function hubStatusTone(s: HubStatus): string {
  if (s === 'CONNECTED') return 'text-cyan border-cyan-30';
  if (s === 'COMING_SOON' || s === 'NOT_SUPPORTED') return 'text-text3 border-border2';
  return 'text-text2 border-border2';
}

/** Requisitos mostrados no detalhe por tipo (texto de produto; estado vem do backend). */
export const CEX_DETAIL_ITEMS = ['Conta', 'API Key', 'API Secret', 'Restrição de IP', 'Permissões'] as const;
export const DEX_DETAIL_ITEMS = ['Carteira', 'Rede', 'Assinatura', 'Segurança', 'Simulação'] as const;
