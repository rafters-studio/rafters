/**
 * @rafters/ui package root
 *
 * Re-exports core types that composites and external consumers import
 * from the package root rather than deep paths.
 */

export type {
  AppliedRule,
  EditorBlock,
  EditorControls,
  EditorRulePaletteConfig,
  EditorSidebarConfig,
  RuleConfigField,
  SaveCompositeData,
} from './components/ui/editor.js';
