/**
 * @rafters/design-tokens
 * Revolutionary dependency-aware design token system with W3C DTCG compliance
 */

export * from './dependencies.js';
// Exporters - convert tokens to various output formats
export * from './exporters/index.js';
export * from './generation-rules.js';
// Generators - produce complete base design system tokens
export * from './generators/index.js';
export * from './persistence/index.js';
export { default as calcPlugin } from './plugins/calc.js';
export { default as contrastPlugin } from './plugins/contrast.js';
export { default as examplePlugin } from './plugins/example.js';
export { default as invertPlugin } from './plugins/invert.js';
// Per-plugin default exports (underlying shape changed; export paths preserved)
export { default as scalePlugin } from './plugins/scale.js';
export { default as statePlugin } from './plugins/state.js';
export type { Plugin } from './plugins.js';
// Plugin protocol
export {
  ColorValueSchema,
  cascade,
  clearPlugins,
  definePlugin,
  getPlugin,
  loadPlugins,
  OKLCHSchema,
  PluginSpecSchema,
  regenerate,
  registerPlugin,
  resolveInput,
} from './plugins.js';
export * from './registry.js';
export * from './registry-factory.js';
