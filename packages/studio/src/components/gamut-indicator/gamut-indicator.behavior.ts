export type GamutTier = 'srgb' | 'p3' | 'out';

export interface GamutIndicatorConfig {
  tier: GamutTier;
}

export type GamutIndicatorState = Record<never, never>;
