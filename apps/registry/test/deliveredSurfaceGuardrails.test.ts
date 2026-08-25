import { describe, expect, it } from 'vitest';
import {
  listComponentNames,
  listPrimitiveNames,
  listSubstrate,
  loadComponent,
  loadPrimitive,
  loadSubstrate,
  type RegistryFile,
} from '../src/lib/registry/componentService';
import {
  findInternalImportViolations,
  findShadowMathViolations,
  isDisallowedWorkspaceImport,
  KNOWN_IMPORT_VIOLATIONS,
  KNOWN_SHADOW_MATH_VIOLATIONS,
} from '../src/lib/registry/deliveredSurfaceGuardrails';

/**
 * Every file across the entire delivered surface -- the exact set the guardrail
 * scans. Reuses the same enumerators the registry serves from, so
 * packages/ui/src/old/** (outside getComponentsPath/getPrimitivesPath/substrate
 * discovery) is excluded automatically and never reached by a raw filesystem
 * walk.
 */
function deliveredFiles(): RegistryFile[] {
  const files: RegistryFile[] = [];
  for (const name of listComponentNames()) {
    for (const file of loadComponent(name)?.files ?? []) files.push(file);
  }
  for (const name of listPrimitiveNames()) {
    for (const file of loadPrimitive(name)?.files ?? []) files.push(file);
  }
  for (const name of listSubstrate()) {
    for (const file of loadSubstrate(name)?.files ?? []) files.push(file);
  }
  return files;
}

describe('isDisallowedWorkspaceImport', () => {
  it('denies an internal-only @rafters/* package', () => {
    expect(isDisallowedWorkspaceImport('@rafters/design-tokens/generators/defaults')).toBe(true);
    expect(isDisallowedWorkspaceImport('@rafters/studio')).toBe(true);
  });

  it('denies the unscoped rafters CLI package', () => {
    expect(isDisallowedWorkspaceImport('rafters')).toBe(true);
  });

  it('allows a sanctioned deliverable library and its subpaths', () => {
    expect(isDisallowedWorkspaceImport('@rafters/color-utils')).toBe(false);
    expect(isDisallowedWorkspaceImport('@rafters/color-utils/gamut')).toBe(false);
  });

  it('allows an ordinary npm package', () => {
    expect(isDisallowedWorkspaceImport('colorjs.io')).toBe(false);
  });
});

describe('no delivered file has an unexpected internal-package import', () => {
  it('every component/primitive/substrate file is clean or a dated exception', () => {
    const offenders: Record<string, string[]> = {};
    for (const file of deliveredFiles()) {
      if (KNOWN_IMPORT_VIOLATIONS.has(file.path)) continue;
      const violations = findInternalImportViolations(file.path, file.content);
      if (violations.length > 0) offenders[file.path] = violations.map((v) => v.found);
    }
    expect(offenders).toEqual({});
  });
});

describe('no delivered file has unexpected shadow color math', () => {
  it('every component/primitive/substrate file is clean or a dated exception', () => {
    const offenders: Record<string, string[]> = {};
    for (const file of deliveredFiles()) {
      if (KNOWN_SHADOW_MATH_VIOLATIONS.has(file.path)) continue;
      const violations = findShadowMathViolations(file.path, file.content);
      if (violations.length > 0) offenders[file.path] = violations.map((v) => v.found);
    }
    expect(offenders).toEqual({});
  });

  it('does not flag the bar-position hue-warp helpers', () => {
    const item = loadPrimitive('oklch-gamut');
    expect(item).not.toBeNull();
    const file = item?.files.find((f) => f.path.endsWith('oklch-gamut.ts'));
    expect(file).toBeDefined();
    const violations = findShadowMathViolations(file!.path, file!.content);
    expect(violations.map((v) => v.found)).not.toContain('hueFromBarPos');
    expect(violations.map((v) => v.found)).not.toContain('barPosFromHue');
  });
});

describe('the dated exceptions stay honest', () => {
  it('every KNOWN_IMPORT_VIOLATIONS entry still names a real, currently-violating file', () => {
    const byPath = new Map(deliveredFiles().map((f) => [f.path, f]));
    for (const path of KNOWN_IMPORT_VIOLATIONS) {
      const file = byPath.get(path);
      expect(file, `exception ${path} names a file no longer served`).toBeDefined();
      expect(
        findInternalImportViolations(file!.path, file!.content).length,
        `exception ${path} no longer violates -- delete it`,
      ).toBeGreaterThan(0);
    }
  });

  it('every KNOWN_SHADOW_MATH_VIOLATIONS entry still names a real, currently-violating file', () => {
    const byPath = new Map(deliveredFiles().map((f) => [f.path, f]));
    for (const path of KNOWN_SHADOW_MATH_VIOLATIONS) {
      const file = byPath.get(path);
      expect(file, `exception ${path} names a file no longer served`).toBeDefined();
      expect(
        findShadowMathViolations(file!.path, file!.content).length,
        `exception ${path} no longer violates -- delete it`,
      ).toBeGreaterThan(0);
    }
  });
});

describe('a fixture proves the allowlist path works, since no real file exercises it yet', () => {
  it('an import of @rafters/color-utils produces zero violations', () => {
    const content = `import { isInSRGBGamut } from '@rafters/color-utils';\n`;
    expect(findInternalImportViolations('lib/primitives/fixture.ts', content)).toEqual([]);
  });

  it('a delivered file importing @rafters/design-tokens would be flagged', () => {
    const content = `import { x } from '@rafters/design-tokens/generators/defaults';\n`;
    const violations = findInternalImportViolations('lib/primitives/fixture.ts', content);
    expect(violations).toHaveLength(1);
    expect(violations[0].found).toBe('@rafters/design-tokens/generators/defaults');
    expect(violations[0].message).toContain('@rafters/color-utils');
  });
});

describe('the block-comment strip is string-literal-aware', () => {
  it('still catches a real internal import framed by strings that contain comment sequences', () => {
    // A glob string containing a comment-open, then a REAL internal import, then a
    // string beginning with a comment-close. A naive `/\\*...\\*/` strip splices the
    // two strings together and eats the import -- a false negative. The strip must
    // treat the comment characters inside the strings as data and still see the import.
    const content = [
      `const glob = "src/*";`,
      `import { gen } from '@rafters/design-tokens';`,
      `const end = "*/foo";`,
    ].join('\n');
    const violations = findInternalImportViolations('lib/primitives/fixture.ts', content);
    expect(violations.map((v) => v.found)).toEqual(['@rafters/design-tokens']);
  });

  it('still strips a JSDoc @example so a documented consumer import is not flagged', () => {
    const content = [
      '/**',
      ' * @example',
      " * import { Select } from '@rafters/ui';",
      ' */',
      "import { cn } from './utils';",
    ].join('\n');
    expect(findInternalImportViolations('lib/components/fixture.ts', content)).toEqual([]);
  });

  it('does not treat a comment-open inside a template literal as a comment', () => {
    const content = [
      'const pattern = `glob:/*`;',
      `import { gen } from '@rafters/design-tokens';`,
      'const close = `*/`;',
    ].join('\n');
    const violations = findInternalImportViolations('lib/primitives/fixture.ts', content);
    expect(violations.map((v) => v.found)).toEqual(['@rafters/design-tokens']);
  });
});
