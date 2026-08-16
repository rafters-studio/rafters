/**
 * ShadcnAdapter -- DesignSystemAdapter for shadcn/ui projects.
 *
 * Wraps the existing detection functions without reimplementing them.
 * shadcn IS Tailwind with a semantic color layer on top, so every
 * detection method delegates to the same underlying parsers that init
 * called directly before the adapter pattern. Output is identical to
 * the bare-function composition -- no new detection behavior.
 */

import type { DesignSystemAdapter } from './adapter.js';
import { register } from './adapter.js';
import {
  detectFocusRingWidth,
  detectFontSizeBase,
  detectRadiusBase,
  detectSpacingBase,
} from './bases.js';
import { classifyDeclarations } from './classify.js';
import { colorsFromClassification } from './colors.js';
import { detectFonts } from './fonts.js';
import { extractShadcnRoot } from './shadcn.js';

const shadcnAdapter: DesignSystemAdapter = {
  name: 'shadcn',

  detectFonts(css: string) {
    return [...detectFonts(css)];
  },

  detectColors(css: string) {
    const declarations = extractShadcnRoot(css);
    const classification = classifyDeclarations(declarations);
    return [...colorsFromClassification(classification)];
  },

  detectSpacing(css: string) {
    const value = detectSpacingBase(css);
    return value !== null ? { base: value } : {};
  },

  detectRadius(css: string) {
    const value = detectRadiusBase(css);
    return value !== null ? { base: value } : {};
  },

  detectFocusRing(css: string) {
    const value = detectFocusRingWidth(css);
    return value !== null ? { width: value } : {};
  },

  detectFontSize(css: string) {
    const value = detectFontSizeBase(css);
    return value !== null ? { base: value } : {};
  },
};

register(shadcnAdapter);

export { shadcnAdapter };
