/**
 * shadcn importer.
 *
 * Extracts every `--name: value` declaration from top-level `:root { ... }`
 * rules in source CSS. `.dark { ... }` blocks are skipped -- dark mode is
 * computed by the system from light values via the invert plugin + the
 * Tailwind exporter's `dependsOn[1]` convention.
 */

import * as csstree from 'css-tree';
import type { CssDeclaration } from './shapes.js';

/**
 * Read every `--name: value` declaration inside any rule whose selector list
 * contains `:root`. Compound selectors like `:root, :host` (Tailwind v4 emits
 * this so tokens reach both the document and web-component shadow roots) and
 * nested-under-`@layer` blocks both qualify. Selectors with class/pseudo
 * suffixes (`:root.dark`) are not matched -- those are scoped overrides, not
 * the base layer. Malformed CSS is parsed permissively by css-tree;
 * unrecognized nodes are skipped rather than thrown on.
 */
export function extractShadcnRoot(css: string): readonly CssDeclaration[] {
  const ast = csstree.parse(css);
  const out: CssDeclaration[] = [];
  csstree.walk(ast, {
    visit: 'Rule',
    enter(rule) {
      const selectors = csstree
        .generate(rule.prelude)
        .split(',')
        .map((s) => s.trim());
      if (!selectors.includes(':root')) return;
      csstree.walk(rule.block, {
        visit: 'Declaration',
        enter(decl) {
          if (!decl.property.startsWith('--')) return;
          out.push({
            name: decl.property.slice(2),
            value: csstree.generate(decl.value).trim(),
          });
        },
      });
    },
  });
  return out;
}
