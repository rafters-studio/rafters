/**
 * TailwindAdapter -- DesignSystemAdapter for plain Tailwind v4 projects.
 *
 * Today this is functionally identical to ShadcnAdapter: shadcn IS
 * Tailwind with a semantic color layer on top, and the underlying
 * detection functions already handle both the `:root` (shadcn) and
 * `@theme` (Tailwind v4) extraction paths. The separation exists so a
 * pure Tailwind project (no shadcn color layer) can import cleanly and
 * so future divergence (e.g. skipping shadcn-specific semantic name
 * classification) has a seam to land in without editing the shadcn path.
 *
 * Per the acceptance criteria: existing import behavior is unchanged --
 * same tokens, same events, same test results. This adapter is the
 * default when `config.source` is absent or set to `"tailwind"`.
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

const tailwindAdapter: DesignSystemAdapter = {
  name: 'tailwind',

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

register(tailwindAdapter);

export { tailwindAdapter };
