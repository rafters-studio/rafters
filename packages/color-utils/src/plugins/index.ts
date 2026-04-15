/**
 * Color domain plugins for the design token rule engine.
 *
 * Usage:
 *   import { colorPlugins } from '@rafters/color-utils/plugins';
 *   import { registerPlugin } from '@rafters/design-tokens';
 *   for (const p of colorPlugins) registerPlugin(p);
 */

import type { Plugin } from '@rafters/design-tokens';
import contrastPlugin from './contrast';
import scalePlugin from './scale';
import statePlugin from './state';

// Named exports for individual plugins
export { contrastPlugin, scalePlugin, statePlugin };

// Array of all color domain plugins, ready for batch registration
export const colorPlugins: Plugin<unknown, unknown>[] = [
  scalePlugin as Plugin<unknown, unknown>,
  statePlugin as Plugin<unknown, unknown>,
  contrastPlugin as Plugin<unknown, unknown>,
];
