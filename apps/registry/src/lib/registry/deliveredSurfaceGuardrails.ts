/**
 * Delivered-surface guardrails.
 *
 * A static guardrail over the registry-delivered surface (every file returned
 * by `loadComponent` / `loadPrimitive` / `loadSubstrate`) that fails the test
 * suite -- and therefore `pnpm preflight` and CI -- when a delivered file
 * either imports an internal-only workspace package that can never resolve in a
 * consumer install, or reimplements OKLCH gamut math that `@rafters/color-utils`
 * already owns.
 *
 * Why this exists: every gate this repo runs tests SOURCE inside the pnpm
 * workspace, where `@rafters/*` specifiers link locally and always succeed.
 * Nothing tests the PUBLISHED INSTALL PATH, so a delivered file that imports an
 * internal build-time package (`motion-tokens.ts` -> `@rafters/design-tokens`,
 * #2132) or hand-rolls library math (`oklch-gamut.ts`, its color-primitives
 * companion) reaches a consumer silently. This is the regression guard, not the
 * fix for either -- both known offenders are carried as dated exceptions below.
 */

/**
 * Packages a delivered file (packages/ui/src/{components,primitives,<substrate
 * kind>}/**) may declare as a real npm dependency. Every other `@rafters/*`
 * package, and the unscoped `rafters` CLI package, is denied by DEFAULT --
 * adding a package here is a deliberate, reviewed decision, never inferred from
 * package.json fields. Inference does not work: @rafters/design-tokens and
 * @rafters/studio are both `private: true` with no `publishConfig` (a plausible
 * "internal" signal), but the `rafters` CLI package.json has
 * `publishConfig.access: "public"` and must still never be imported by delivered
 * code, and @rafters/shared / @rafters/math-utils are ALSO publishConfig-public
 * without being established deliverable dependencies today. Only
 * @rafters/color-utils is currently sanctioned.
 */
export const DELIVERABLE_LIBRARY_PACKAGES: readonly string[] = ['@rafters/color-utils'];

export interface GuardrailViolation {
  /** RegistryFile.path of the offending file, e.g. "lib/primitives/motion-tokens.ts" */
  file: string;
  /** The offending import specifier, or the shadow symbol name for a math violation */
  found: string;
  /** Names the correct alternative -- what the author should depend on / call instead */
  message: string;
}

/**
 * Import-statement regex. Mirrors the shape componentService.ts's private
 * IMPORT_REGEX matches (componentService.ts:156-157) rather than reusing or
 * exporting that regex, keeping this guardrail additive and file-local. Captures
 * the specifier (group 1) of a value or type import.
 */
const IMPORT_REGEX =
  /import\s+(?:type\s+)?(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+)?['"]([^'"]+)['"]/g;

/**
 * True when `specifier` names a workspace/internal package a delivered file must
 * never import: the unscoped `rafters` CLI, or any `@rafters/*` package not on
 * the hand-maintained DELIVERABLE_LIBRARY_PACKAGES allowlist (subpath imports of
 * an allowlisted package are allowed too). Ordinary npm packages return false.
 */
export function isDisallowedWorkspaceImport(specifier: string): boolean {
  if (specifier === 'rafters') return true;
  if (!specifier.startsWith('@rafters/')) return false;
  return !DELIVERABLE_LIBRARY_PACKAGES.some(
    (pkg) => specifier === pkg || specifier.startsWith(`${pkg}/`),
  );
}

/**
 * Strip block comments while leaving string literals intact.
 *
 * The import scan must ignore a JSDoc `@example import ... from '@rafters/ui'`
 * block (documentation, not a delivered import), but a naive regex strip of
 * everything between a comment-open and the next comment-close is unsafe: a
 * source STRING that contains a comment-open sequence -- a glob like `"src/*"`,
 * a URL, a regex-shaped literal -- paired with any later comment-close sequence
 * swallows every import between them, silently hiding a real internal import.
 * That is a false negative that defeats the whole guardrail (verified: a
 * `"src/*"` glob string, then `import '@rafters/design-tokens'`, then a string
 * beginning with a comment-close loses the import under the naive strip).
 *
 * This walk tracks string state (', ", and template `) with escape handling, so
 * a comment-open inside a string is never read as a comment opener. Two deliberate,
 * false-negative-averse choices: line comments are NOT stripped (mirrors
 * componentService's IMPORT_REGEX usage, which strips nothing, so the scan sees
 * what the registry sees and cannot corrupt a `://` in a `//` comment); and an
 * unterminated `/*` is left intact rather than eating to end-of-input, so a
 * trailing real import is still scanned.
 */
function stripBlockComments(source: string): string {
  let out = '';
  let quote: string | null = null;
  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (quote !== null) {
      out += ch;
      if (ch === '\\' && i + 1 < source.length) {
        out += source[i + 1];
        i++;
      } else if (ch === quote) {
        quote = null;
      }
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch;
      out += ch;
      continue;
    }
    if (ch === '/' && source[i + 1] === '*') {
      const end = source.indexOf('*/', i + 2);
      if (end === -1) {
        out += source.slice(i);
        break;
      }
      out += ' ';
      i = end + 1;
      continue;
    }
    out += ch;
  }
  return out;
}

/**
 * Delivered-file scan for imports of an internal-only workspace package.
 * Extracts every non-relative import specifier from `content` and flags each one
 * `isDisallowedWorkspaceImport` rejects. Pure: returns an array (empty when
 * clean), never throws.
 *
 * Block comments are stripped first (string-literal-aware, see
 * `stripBlockComments`): a JSDoc `@example` may show a consumer-side
 * `import ... from '@rafters/ui'` (select.tsx/.astro/.element.ts do exactly
 * this), which is documentation, not a delivered import, and must never be
 * flagged.
 */
export function findInternalImportViolations(
  filePath: string,
  content: string,
): GuardrailViolation[] {
  const violations: GuardrailViolation[] = [];
  const seen = new Set<string>();
  const sanctioned = DELIVERABLE_LIBRARY_PACKAGES.join(', ');
  const code = stripBlockComments(content);
  for (const match of code.matchAll(IMPORT_REGEX)) {
    const specifier = match[1];
    if (specifier.startsWith('.')) continue;
    if (seen.has(specifier)) continue;
    seen.add(specifier);
    if (!isDisallowedWorkspaceImport(specifier)) continue;
    violations.push({
      file: filePath,
      found: specifier,
      message:
        `delivered files must not import '${specifier}' -- it is an internal workspace ` +
        `package with no consumer-install path, so it can never resolve in a consumer ` +
        `install; sanctioned deliverable-library imports are: ${sanctioned}`,
    });
  }
  return violations;
}

/**
 * Declared symbol name -> the @rafters/color-utils export it reimplements. Grows
 * as new shadow math is found; deliberately NOT a general AST-diff detector.
 * `hueFromBarPos` / `barPosFromHue` are intentionally absent -- they are a
 * bar-position perceptual-hue-warp transform (a rendering concern) with no
 * @rafters/color-utils equivalent.
 */
export const SHADOW_MATH_SYMBOLS: Readonly<Record<string, { library: string; owns: string }>> = {
  inSrgb: {
    library: '@rafters/color-utils',
    owns: 'isInSRGBGamut (packages/color-utils/src/gamut.ts)',
  },
  inP3: {
    library: '@rafters/color-utils',
    owns: 'isInP3Gamut (packages/color-utils/src/gamut.ts)',
  },
  findMaxChroma: {
    library: '@rafters/color-utils',
    owns: 'computeGamutBoundaries (packages/color-utils/src/gamut.ts)',
  },
};

/**
 * Delivered-file scan for a function/const declaration whose name is a key of
 * SHADOW_MATH_SYMBOLS. Matches `function <name>`, `export function <name>`, or
 * `const <name> =` (with or without a leading `export`). Pure: returns an array
 * (empty when clean), never throws.
 */
export function findShadowMathViolations(filePath: string, content: string): GuardrailViolation[] {
  const violations: GuardrailViolation[] = [];
  for (const [name, owner] of Object.entries(SHADOW_MATH_SYMBOLS)) {
    const declared = new RegExp(
      `(?:^|[^.\\w])(?:export\\s+)?(?:function\\s+${name}\\b|const\\s+${name}\\s*=)`,
    ).test(content);
    if (!declared) continue;
    violations.push({
      file: filePath,
      found: name,
      message: `delivered files must not reimplement '${name}' -- depend on ${owner.owns} instead`,
    });
  }
  return violations;
}

/**
 * Dated, file-path-keyed exceptions -- today's two known offenders, each removed
 * by its own companion issue as part of that issue's own fix. Keys are
 * RegistryFile.path values. The staleness test asserts every entry still names a
 * file that actually violates, so a listed exception cannot outlive its fix: when
 * #2132 removes motion-tokens.ts's @rafters/design-tokens imports, that PR must
 * also delete this entry or the suite goes red.
 */
export const KNOWN_IMPORT_VIOLATIONS: ReadonlySet<string> = new Set([
  // motion-tokens.ts imports @rafters/design-tokens/generators/* at runtime -- removed by #2132.
  'lib/primitives/motion-tokens.ts',
]);

export const KNOWN_SHADOW_MATH_VIOLATIONS: ReadonlySet<string> = new Set([
  // oklch-gamut.ts hand-rolls inSrgb/inP3/findMaxChroma -- removed by the
  // color-primitives companion issue (adopt @rafters/color-utils, #2133).
  'lib/primitives/oklch-gamut.ts',
]);
