/**
 * Design Token Importers
 *
 * Pure parsers + classifiers: source bytes -> structured declarations the
 * registry write path (`registry.set`) can consume. Importers do not call
 * into the registry; the caller (CLI / Studio) prompts the designer for
 * assignment and translates declarations into `set(name, value, {reason})`
 * calls.
 */

export { classifyDeclarations } from './classify.js';
export { colorsFromClassification } from './colors.js';
export {
  type DetectedFamily,
  type FamilyGroupingResult,
  groupIntoFamilies,
} from './families.js';
export { senseShadcnCss } from './sense.js';
export { extractShadcnRoot } from './shadcn.js';
export {
  type ClassificationResult,
  type ClassifiedDeclaration,
  type ColorDeclaration,
  type CssDeclaration,
  RAFTERS_IMPORT_NAMESPACES,
  type RaftersImportNamespace,
  type SensedSummary,
} from './shapes.js';
export { extractThemeBlocks } from './theme.js';
