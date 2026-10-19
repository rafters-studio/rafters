import type { Plugin } from '../graph.js';
import { contrastPlugin } from './contrast.js';
import { invertPlugin } from './invert.js';
import { mirrorPlugin } from './mirror.js';
import { scalePlugin } from './scale.js';
import { shadowRungPlugin } from './shadow-rung.js';
import { statePlugin } from './state.js';

export { calcPlugin } from './calc.js';
export { contrastPlugin, invertPlugin, mirrorPlugin, scalePlugin, shadowRungPlugin, statePlugin };

/**
 * Every plugin a generated or stored token set binds to. A registry built from
 * those tokens takes this list, so a consumer (the CLI, veneer, Studio) does not
 * break when a generator starts binding to a new plugin.
 */
export const REGISTRY_PLUGINS: readonly Plugin[] = [
  scalePlugin,
  contrastPlugin,
  statePlugin,
  invertPlugin,
  mirrorPlugin,
  shadowRungPlugin,
];
