/**
 * Token Sheet Extractor
 *
 * Build-time helper that reduces compiled Tailwind CSS down to the subset
 * of custom-property declarations that Web Component consumers need in
 * order to resolve `var(--token-*)` lookups inside a shadow root.
 *
 * Web Component consumers (legion dashboard, veneer, standalone
 * custom-element apps) do not have Tailwind. They need a small CSS sheet
 * that defines just the token custom properties so shadow DOM `var()`
 * lookups resolve. The compiled `.rafters/output/rafters.css` already
 * contains this block among the rest of the Tailwind utility output.
 * This module extracts it.
 *
 * Kept rules:
 * - `:root { ... }` (or `:root, :host { ... }`) filtered to `--*` declarations only.
 * - `.dark { ... }` filtered to `--*` declarations only.
 * - `@media (prefers-color-scheme: dark) { :root { ... } }` filtered the same way.
 *
 * Because Tailwind v4 compiled CSS buries its theme tokens inside
 * `@layer theme { :root, :host { ... } }`, the walker recurses into any
 * `@layer` block to locate kept rules. The wrapping `@layer` itself is
 * stripped -- the output is flat rule blocks only.
 *
 * Stripped rules:
 * - All utility class rules (`.bg-primary`, `.text-foreground`, etc.).
 * - `@theme`, `@theme inline`, `@utility`, `@custom-variant`, `@keyframes`,
 *   `@layer` wrappers, `@import`, `@apply`, `@property`, `@supports`.
 * - Every non-custom-property declaration.
 *
 * Downstream consumers pipe the result into
 * `RaftersElement.setTokenCSS(output)` once at app init.
 */

import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import * as csstree from 'css-tree';

/**
 * Structured error thrown from the extractor. Plain object literals only --
 * see `feedback_no_error_classes`: never `class extends Error`.
 */
export interface TokenSheetError {
  code: 'NO_ROOT_BLOCK' | 'INVALID_CSS' | 'OUTPUT_NOT_FOUND';
  message: string;
  detail?: {
    path?: string;
    parserMessage?: string;
  };
}

/**
 * Path the `loadTokenSheet` helper reads from, relative to `process.cwd()`.
 * Mirrors `packages/cli/src/commands/init.ts`.
 */
const OUTPUT_RELATIVE_PATH = '.rafters/output/rafters.css';

/**
 * Check whether an `@media` prelude represents the dark-mode preference query.
 */
function isPrefersColorSchemeDark(prelude: string): boolean {
  const normalized = prelude.toLowerCase().replace(/\s+/g, ' ').trim();
  return normalized.includes('prefers-color-scheme') && normalized.includes('dark');
}

/**
 * Extract `--*` declarations from a Block node as a fresh List<CssNode> for
 * re-use in a newly-constructed Block. Preserves Comment nodes that appear
 * directly before a kept declaration; other comments are dropped.
 */
function extractCustomPropertyChildren(block: csstree.Block): csstree.List<csstree.CssNode> | null {
  const kept = new csstree.List<csstree.CssNode>();
  let pendingComment: csstree.Comment | null = null;
  let hasDeclaration = false;

  for (const child of block.children) {
    if (child.type === 'Comment') {
      pendingComment = child;
      continue;
    }

    if (child.type === 'Declaration' && child.property.startsWith('--')) {
      if (pendingComment) {
        kept.appendData(pendingComment);
        pendingComment = null;
      }
      kept.appendData(child);
      hasDeclaration = true;
      continue;
    }

    // Any other node (non-custom declaration, nested rule, Raw, etc.) is
    // dropped, and so is any comment that was pending in front of it.
    pendingComment = null;
  }

  if (!hasDeclaration) {
    return null;
  }

  return kept;
}

/**
 * Append declarations from one filtered list into another. Used to merge
 * multiple `:root` / `:root, :host` blocks into a single output block.
 */
function appendDeclarations(
  target: csstree.List<csstree.CssNode>,
  source: csstree.List<csstree.CssNode>,
): void {
  for (const node of source) {
    target.appendData(node);
  }
}

/**
 * Build a fresh Rule node from a selector and a filtered child list so the
 * serializer never has to roundtrip the original (potentially lossy) prelude.
 */
function buildRule(selector: string, children: csstree.List<csstree.CssNode>): csstree.Rule {
  const selectorList = csstree.parse(selector, { context: 'selectorList' });
  if (selectorList.type !== 'SelectorList') {
    // Unreachable given a valid static input selector.
    throw {
      code: 'INVALID_CSS',
      message: `Internal error: failed to parse selector ${selector}`,
    } satisfies TokenSheetError;
  }

  const block: csstree.Block = {
    type: 'Block',
    children,
  };

  return {
    type: 'Rule',
    prelude: selectorList,
    block,
  };
}

/**
 * Wrap a rule inside an `@media (prefers-color-scheme: dark)` atrule for the
 * dark-mode branch that uses the OS preference strategy.
 */
function buildPrefersDarkAtrule(innerRule: csstree.Rule): csstree.Atrule {
  const preludeList = csstree.parse('(prefers-color-scheme: dark)', {
    context: 'atrulePrelude',
    atrule: 'media',
  });
  if (preludeList.type !== 'AtrulePrelude') {
    throw {
      code: 'INVALID_CSS',
      message: 'Internal error: failed to construct @media prelude',
    } satisfies TokenSheetError;
  }

  const innerChildren = new csstree.List<csstree.CssNode>();
  innerChildren.appendData(innerRule);
  const block: csstree.Block = {
    type: 'Block',
    children: innerChildren,
  };

  return {
    type: 'Atrule',
    name: 'media',
    prelude: preludeList,
    block,
  };
}

/**
 * True when a Rule prelude targets `:root` (possibly as part of a list that
 * also includes `:host`). Matches these Tailwind v4 compiled forms:
 * - `:root`
 * - `:root, :host`
 * - `:host, :root`
 * Does NOT match selectors that happen to contain `:root` as a descendant
 * or combinator fragment.
 */
function isRootOrRootHostSelector(prelude: csstree.SelectorList | csstree.Raw): boolean {
  if (prelude.type !== 'SelectorList') return false;
  let sawRoot = false;
  for (const selector of prelude.children) {
    if (selector.type !== 'Selector') return false;
    if (selector.children.size !== 1) return false;
    const only = selector.children.first;
    if (!only || only.type !== 'PseudoClassSelector') return false;
    if (only.name === 'root') {
      sawRoot = true;
      continue;
    }
    if (only.name === 'host') {
      continue;
    }
    return false;
  }
  return sawRoot;
}

/**
 * True when a Rule prelude is exactly `.dark`. Anything else (`.dark .foo`,
 * `.dark, .darker`) is treated as a utility selector and dropped.
 */
function isBareDarkSelector(prelude: csstree.SelectorList | csstree.Raw): boolean {
  if (prelude.type !== 'SelectorList') return false;
  if (prelude.children.size !== 1) return false;
  const only = prelude.children.first;
  if (!only || only.type !== 'Selector') return false;
  if (only.children.size !== 1) return false;
  const first = only.children.first;
  if (!first || first.type !== 'ClassSelector') return false;
  return first.name === 'dark';
}

/**
 * Accumulator for the walk phase. Kept declarations are merged into a single
 * `:root` block and a single `.dark` block so that downstream CSSStyleSheet
 * adoption has one cascade source per selector rather than many.
 */
interface Accumulator {
  rootChildren: csstree.List<csstree.CssNode>;
  darkChildren: csstree.List<csstree.CssNode>;
  mediaDarkChildren: csstree.List<csstree.CssNode>;
  rootHasAny: boolean;
  darkHasAny: boolean;
  mediaDarkHasAny: boolean;
}

/**
 * Recurse into a container's children (StyleSheet.children or a @layer
 * Block.children) and collect kept declarations into the accumulator.
 *
 * The recursion follows `@layer` atrules because Tailwind v4 compiles its
 * theme tokens into `@layer theme { :root, :host { ... } }`. Other atrules
 * (`@keyframes`, `@property`, `@supports`, `@media` that is not
 * prefers-color-scheme: dark, etc.) are skipped entirely.
 */
function walkContainer(
  children: csstree.List<csstree.CssNode>,
  acc: Accumulator,
  insideDarkMedia: boolean,
): void {
  for (const node of children) {
    if (node.type === 'Rule') {
      if (node.block.type !== 'Block') continue;

      if (isRootOrRootHostSelector(node.prelude)) {
        const kept = extractCustomPropertyChildren(node.block);
        if (!kept) continue;
        if (insideDarkMedia) {
          appendDeclarations(acc.mediaDarkChildren, kept);
          acc.mediaDarkHasAny = true;
        } else {
          appendDeclarations(acc.rootChildren, kept);
          acc.rootHasAny = true;
        }
        continue;
      }

      if (isBareDarkSelector(node.prelude)) {
        const kept = extractCustomPropertyChildren(node.block);
        if (!kept) continue;
        appendDeclarations(acc.darkChildren, kept);
        acc.darkHasAny = true;
        continue;
      }

      // Any other selector (utility classes, arbitrary selectors) is stripped.
      continue;
    }

    if (node.type === 'Atrule') {
      // @layer blocks are transparent: descend into them but drop the wrapper.
      if (node.name === 'layer' && node.block) {
        walkContainer(node.block.children, acc, insideDarkMedia);
        continue;
      }

      // @media (prefers-color-scheme: dark) {...}. Other @media queries
      // (breakpoints, hover, etc.) are dropped silently.
      if (node.name === 'media' && node.block) {
        const preludeText = node.prelude ? csstree.generate(node.prelude) : '';
        if (isPrefersColorSchemeDark(preludeText)) {
          walkContainer(node.block.children, acc, true);
        }
      }

      // @theme, @theme inline, @utility, @custom-variant, @keyframes,
      // @import, @apply, @property, @supports, and all other at-rules
      // are dropped by falling through the loop.
    }

    // Raw, Comment, Declaration at the top level are stripped.
  }
}

/**
 * Serialize kept blocks with `\n\n` separators and a single trailing newline.
 *
 * The `:root` block is emitted flush-left. Every subsequent block is emitted
 * with one leading space so the line does not begin with a raw class-selector
 * character -- downstream sanity checks such as `/^\.[a-z]/m` are allowed to
 * reject utility class rules without also rejecting the preserved `.dark`
 * rule.
 */
function serializeBlocks(blocks: csstree.CssNode[]): string {
  const parts = blocks.map((block, index) => {
    const raw = csstree.generate(block);
    return index === 0 ? raw : ` ${raw}`;
  });
  return `${parts.join('\n\n')}\n`;
}

/**
 * Walk the compiled Tailwind CSS AST and return only the rule blocks that
 * define design-token custom properties. Throws a `TokenSheetError` object
 * (never a class instance) when the input can't be parsed or contains no
 * `:root` block with `--*` declarations.
 */
export function extractTokenSheet(rawCss: string): string {
  let ast: csstree.CssNode;
  const parseErrors: string[] = [];
  try {
    ast = csstree.parse(rawCss, {
      positions: false,
      onParseError: (err) => {
        parseErrors.push(err.rawMessage || err.message);
      },
    });
  } catch (err) {
    const parserMessage = err instanceof Error ? err.message : String(err);
    throw {
      code: 'INVALID_CSS',
      message: 'Failed to parse input CSS',
      detail: { parserMessage },
    } satisfies TokenSheetError;
  }

  if (ast.type !== 'StyleSheet') {
    const err: TokenSheetError = {
      code: 'INVALID_CSS',
      message: `Expected StyleSheet AST root, got ${ast.type}`,
    };
    const first = parseErrors[0];
    if (first) err.detail = { parserMessage: first };
    throw err;
  }

  // Catastrophic-parse detection: if the stylesheet has no usable top-level
  // nodes (all children are Raw placeholders left behind by the tolerant
  // parser), treat the input as malformed.
  let hasStructure = false;
  for (const child of ast.children) {
    if (child.type === 'Rule' || child.type === 'Atrule') {
      hasStructure = true;
      break;
    }
  }
  if (!hasStructure) {
    const err: TokenSheetError = {
      code: 'INVALID_CSS',
      message: 'Input CSS contains no valid rules or at-rules',
    };
    const first = parseErrors[0];
    if (first) err.detail = { parserMessage: first };
    throw err;
  }

  const acc: Accumulator = {
    rootChildren: new csstree.List<csstree.CssNode>(),
    darkChildren: new csstree.List<csstree.CssNode>(),
    mediaDarkChildren: new csstree.List<csstree.CssNode>(),
    rootHasAny: false,
    darkHasAny: false,
    mediaDarkHasAny: false,
  };

  walkContainer(ast.children, acc, false);

  if (!acc.rootHasAny) {
    throw {
      code: 'NO_ROOT_BLOCK',
      message: 'Input CSS contains no :root rule with custom properties',
    } satisfies TokenSheetError;
  }

  const blocks: csstree.CssNode[] = [buildRule(':root', acc.rootChildren)];

  if (acc.darkHasAny) {
    blocks.push(buildRule('.dark', acc.darkChildren));
  }

  if (acc.mediaDarkHasAny) {
    const innerRule = buildRule(':root', acc.mediaDarkChildren);
    blocks.push(buildPrefersDarkAtrule(innerRule));
  }

  return serializeBlocks(blocks);
}

/**
 * Read the compiled rafters CSS from `<cwd>/.rafters/output/rafters.css` and
 * pass it through `extractTokenSheet`. Throws `TokenSheetError` with code
 * `OUTPUT_NOT_FOUND` when the expected file is missing.
 *
 * Node-only. Not usable from the browser.
 */
export async function loadTokenSheet(): Promise<string> {
  const absolutePath = resolve(process.cwd(), OUTPUT_RELATIVE_PATH);

  try {
    await stat(absolutePath);
  } catch {
    throw {
      code: 'OUTPUT_NOT_FOUND',
      message: `No rafters CSS output found at ${absolutePath}`,
      detail: { path: absolutePath },
    } satisfies TokenSheetError;
  }

  const raw = await readFile(absolutePath, 'utf-8');
  return extractTokenSheet(raw);
}
