import type { OKLCH } from '@rafters/shared';

export interface ColorCardConfig {
  name: string;
  oklch: OKLCH;
  srgb: boolean;
  p3: boolean;
  apca?: { onWhite: number; onBlack: number };
  perceptual?: { density: string; weight: number };
  atmospheric?: { role: string; temperature: string };
}

export type ColorCardState = Record<never, never>;
