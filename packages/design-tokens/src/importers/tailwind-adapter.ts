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
import { sharedDetection } from './shadcn-adapter.js';

const tailwindAdapter: DesignSystemAdapter = { name: 'tailwind', ...sharedDetection };

register(tailwindAdapter);

export { tailwindAdapter };
