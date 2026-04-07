/**
 * Invert Rule Plugin
 *
 * Finds the WCAG-safe dark mode counterpart for a light mode scale position.
 * Uses the ColorValue accessibility matrix -- AAA first, falls back to AA
 * if the AAA match is too close (< 3 positions apart).
 */

import type { ColorValue } from '@rafters/shared';
import type { TokenRegistry } from '../registry';
import { findDarkCounterpartIndex, INDEX_TO_POSITION, POSITION_TO_INDEX } from '../scale-positions';

export default function invert(
  registry: TokenRegistry,
  tokenName: string,
  dependencies: string[],
): { family: string; position: string } {
  if (dependencies.length === 0) {
    throw new Error(`No dependencies found for invert rule on token: ${tokenName}`);
  }

  const familyTokenName = dependencies[0];
  if (!familyTokenName) {
    throw new Error(`No dependency token name for invert rule on token: ${tokenName}`);
  }

  const familyToken = registry.get(familyTokenName);
  if (!familyToken || typeof familyToken.value !== 'object') {
    throw new Error(`ColorValue family token ${familyTokenName} not found for invert rule`);
  }

  const colorValue = familyToken.value as ColorValue;
  const lightIndex = extractLightIndex(tokenName, dependencies);
  const darkIndex = findDarkCounterpartIndex(lightIndex, colorValue);

  const darkPosition = INDEX_TO_POSITION[darkIndex];
  if (!darkPosition) {
    throw new Error(`Invalid dark index ${darkIndex} for token: ${tokenName}`);
  }

  return { family: familyTokenName, position: darkPosition };
}

/**
 * Extract the light mode scale index from token context.
 * Checks the second dependency first, then the token name suffix.
 */
function extractLightIndex(tokenName: string, dependencies: string[]): number {
  if (dependencies.length > 1 && dependencies[1]) {
    const posMatch = dependencies[1].match(/-(\d+)$/);
    if (posMatch?.[1]) {
      const idx = POSITION_TO_INDEX[posMatch[1]];
      if (idx !== undefined) return idx;
    }
  }

  const nameMatch = tokenName.match(/-(\d+)$/);
  if (nameMatch?.[1]) {
    const idx = POSITION_TO_INDEX[nameMatch[1]];
    if (idx !== undefined) return idx;
  }

  return 5;
}
