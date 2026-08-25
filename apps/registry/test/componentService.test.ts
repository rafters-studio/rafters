import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  getRegistryIndex,
  listComponentNames,
  listPrimitiveNames,
  listSubstrate,
  listSubstrateKinds,
  loadComponent,
  loadPrimitive,
  loadSubstrate,
  parseJSDocFromSource,
  type RegistryItem,
} from '../src/lib/registry/componentService';
import { RegistryItemSchema } from '../../../packages/cli/src/registry/types';

/**
 * Registry cutover guard (#1896). The registry serves behavior-layer sources
 * from packages/ui/src/components (NESTED: <name>/<name>.tsx), not the flat
 * src/old/ui, AND resolves their lib/hooks runtime substrate copy-in like
 * primitives. The dangerous failure modes are SILENT:
 *   - a bare path swap returns an empty registry with no error;
 *   - a served component references lib/hooks the registry never serves, so
 *     `rafters add` writes a component with dangling @/lib and @/hooks imports.
 * These tests fail loudly on either.
 */
describe('registry serves behavior-layer components from src/components', () => {
  const names = listComponentNames();

  it('serves a non-empty, sorted, deduplicated component list', () => {
    expect(names.length).toBeGreaterThanOrEqual(34);
    expect(new Set(names).size).toBe(names.length);
    expect([...names].sort()).toEqual(names);
  });

  it('contains known behavior-layer components', () => {
    expect(names).toContain('button');
    expect(names).toContain('accordion');
    expect(names).toContain('dialog');
  });

  it('bundles the behavior score and shared classes with a served component', () => {
    const button = loadComponent('button');
    if (!button) throw new Error('button did not load');
    const paths = button.files.map((f) => f.path);
    expect(paths).toContain('components/ui/button.behavior.ts');
    expect(paths).toContain('components/ui/button.classes.ts');
  });

  it('resolves every nested framework variant', () => {
    const button = loadComponent('button');
    if (!button) throw new Error('button did not load');
    const paths = button.files.map((f) => f.path);
    expect(paths).toContain('components/ui/button.tsx');
    expect(paths).toContain('components/ui/button.astro');
    expect(paths).toContain('components/ui/button.element.ts');
  });

  it('a served component carries container-query classes (the scanner has something to find)', () => {
    const containerQuery = /@(?:xs|sm|md|lg|xl|2xl|container)/;
    const hasCq = names.some((name) => {
      const item = loadComponent(name);
      return item?.files.some((f) => containerQuery.test(f.content)) ?? false;
    });
    expect(hasCq).toBe(true);
  });

  it('returns null for an unknown component name', () => {
    expect(loadComponent('does-not-exist')).toBeNull();
  });
});

/**
 * Sub-components are FIRST-CLASS REGISTRY NAMES (#2019). A shadcn consumer
 * writes `import CardHeader from '@/components/ui/card-header.astro'`, so
 * `rafters add card-header` has to serve it -- it used to 404, because
 * resolution assumed `<components>/<name>/<name>.ext` and there is no
 * `card-header/` directory. Sub-components live BESIDE the parent whose
 * `.classes.ts` they import, so the directory is now resolved by trimming
 * trailing `-segment`s off the name, with a directory of the component's own
 * always winning.
 */
describe('registry serves sub-components addressably', () => {
  it('lists card sub-components as names of their own', () => {
    const names = listComponentNames();
    for (const sub of ['card-header', 'card-title', 'card-action', 'card-content', 'card-footer']) {
      expect(names, sub).toContain(sub);
    }
    // The parent is still its own item.
    expect(names).toContain('card');
  });

  it('serves card-header with its file AND the parent shared file it imports', () => {
    const item = loadComponent('card-header');
    if (!item) throw new Error('card-header did not load');
    const paths = item.files.map((f) => f.path);
    expect(paths).toContain('components/ui/card-header.astro');
    // Without card.classes.ts at that exact install path, the sub-component's
    // `./card.classes` import dangles on install -- the silent failure.
    expect(paths).toContain('components/ui/card.classes.ts');
  });

  it('every card sub-component bundles the shared classes it imports', () => {
    for (const sub of ['card-title', 'card-action', 'card-content', 'card-footer']) {
      const item = loadComponent(sub);
      if (!item) throw new Error(`${sub} did not load`);
      const paths = item.files.map((f) => f.path);
      expect(paths, sub).toContain(`components/ui/${sub}.astro`);
      expect(paths, sub).toContain('components/ui/card.classes.ts');
    }
  });

  it('a directory of its own always WINS over parent-prefix resolution', () => {
    // alert-dialog and hover-card merely share a prefix with alert/hover; they
    // are full components and must keep resolving to themselves.
    const alertDialog = loadComponent('alert-dialog');
    if (!alertDialog) throw new Error('alert-dialog did not load');
    expect(alertDialog.files.map((f) => f.path)).toContain('components/ui/alert-dialog.tsx');

    const hoverCard = loadComponent('hover-card');
    if (!hoverCard) throw new Error('hover-card did not load');
    expect(hoverCard.files.map((f) => f.path)).toContain('components/ui/hover-card.tsx');
  });

  it('the parent still ships whole -- card bundles its sub-components', () => {
    const card = loadComponent('card');
    if (!card) throw new Error('card did not load');
    const paths = card.files.map((f) => f.path);
    expect(paths).toContain('components/ui/card.tsx');
    expect(paths).toContain('components/ui/card.astro');
    expect(paths).toContain('components/ui/card-header.astro');
  });

  it('still returns null for a sub-component name with no file behind it', () => {
    // The mechanism makes a sub-component addressable the moment its file
    // lands; it does not invent one. typography-h1 has no file in this tree.
    expect(loadComponent('card-nonexistent')).toBeNull();
    expect(loadComponent('typography-h1')).toBeNull();
  });
});

describe('registry resolves the behavior-layer runtime substrate', () => {
  it('discovers substrate kinds from the filesystem (lib, hooks, ...)', () => {
    const kinds = listSubstrateKinds();
    expect(kinds).toContain('lib');
    expect(kinds).toContain('hooks');
    // Dedicated-loader / deprecated dirs are NOT substrate.
    expect(kinds).not.toContain('components');
    expect(kinds).not.toContain('primitives');
    expect(kinds).not.toContain('old');
    expect(kinds).not.toContain('composites');
  });

  it('lists substrate names flat, excluding tests and barrel indexes', () => {
    const names = listSubstrate();
    expect(names).toContain('contract');
    expect(names).toContain('compose');
    expect(names).toContain('use-memory');
    expect(names).not.toContain('index');
    expect(names.every((n) => !n.endsWith('.test'))).toBe(true);
  });

  it('exposes the flat substrate list in the registry index', () => {
    const index = getRegistryIndex();
    expect(index.substrate).toContain('contract');
    expect(index.substrate).toContain('use-memory');
  });

  it('serves a lib file as a substrate item, kind carried in the path', () => {
    const contract = loadSubstrate('contract');
    if (!contract) throw new Error('contract did not load');
    expect(contract.type).toBe('substrate');
    expect(contract.files.map((f) => f.path)).toEqual(['lib/contract.ts']);
    // contract imports ../primitives/memory (value) -> resolvable primitive dep
    expect(contract.primitives).toContain('memory');
  });

  it('serves a hook file as a substrate item with react and its deps', () => {
    const useMemory = loadSubstrate('use-memory');
    if (!useMemory) throw new Error('use-memory did not load');
    expect(useMemory.type).toBe('substrate');
    expect(useMemory.files.map((f) => f.path)).toEqual(['hooks/use-memory.ts']);
    expect(useMemory.files[0].dependencies).toContain('react@19.2.0');
    expect(useMemory.primitives).toContain('memory');
  });

  it('captures TYPE-ONLY substrate imports (compose depends on contract)', () => {
    // compose imports `type ... from './contract'` -- type-only, but the file
    // must still install for tsc, so it must appear as a dependency.
    const compose = loadSubstrate('compose');
    if (!compose) throw new Error('compose did not load');
    expect(compose.primitives).toContain('contract');
  });

  it('a behavior component declares its substrate as dependencies', () => {
    const button = loadComponent('button');
    if (!button) throw new Error('button did not load');
    // button.tsx imports ../../lib/contract and ../../hooks/use-memory
    expect(button.primitives).toContain('contract');
    expect(button.primitives).toContain('use-memory');
  });

  it('returns null for an unknown substrate name', () => {
    expect(loadSubstrate('does-not-exist')).toBeNull();
  });

  it('component, primitive, and substrate name sets are pairwise DISJOINT', () => {
    // fetchItem resolves a dep name by trying endpoints in order, and substrate
    // is a flat namespace across all kinds. If a name lived in two categories
    // (or two kinds), `rafters add` would fetch the wrong item. Uniform-name
    // resolution depends on these sets never overlapping.
    const sets = {
      components: listComponentNames(),
      primitives: listPrimitiveNames(),
      substrate: listSubstrate(),
    };
    const keys = Object.keys(sets) as (keyof typeof sets)[];
    const collisions: string[] = [];
    for (let a = 0; a < keys.length; a++) {
      for (let b = a + 1; b < keys.length; b++) {
        const other = new Set(sets[keys[b]]);
        for (const name of sets[keys[a]]) {
          if (other.has(name)) collisions.push(`${name}: ${keys[a]} & ${keys[b]}`);
        }
      }
    }
    expect(collisions).toEqual([]);
    // Flat substrate also requires unique names ACROSS kinds.
    expect(new Set(listSubstrate()).size).toBe(listSubstrate().length);
  });
});

describe('every served component resolves a COMPLETE dependency closure', () => {
  // Mirror the CLI's fetchItem resolution order (ui first, then primitive, then
  // lib/hooks -- composite/rule are not referenced in a component closure). The
  // disjointness test above guarantees at most one loader matches each name, so
  // order only affects which null-returns are tried, not the result. If any
  // dependency name fails to resolve, `rafters add` would install a component
  // with a dangling import -- exactly the gap this cutover closes.
  function resolveItem(name: string): RegistryItem | null {
    return loadComponent(name) ?? loadPrimitive(name) ?? loadSubstrate(name);
  }

  function closureUnresolved(root: string): string[] {
    const seen = new Set<string>();
    const unresolved: string[] = [];
    const walk = (name: string): void => {
      if (seen.has(name)) return;
      seen.add(name);
      const item = resolveItem(name);
      if (!item) {
        unresolved.push(name);
        return;
      }
      for (const dep of item.primitives) walk(dep);
    };
    walk(root);
    return unresolved;
  }

  it('button pulls contract, use-memory, and memory with nothing dangling', () => {
    const seen = new Set<string>();
    const walk = (name: string): void => {
      if (seen.has(name)) return;
      seen.add(name);
      const item = resolveItem(name);
      if (!item) return;
      for (const dep of item.primitives) walk(dep);
    };
    walk('button');
    expect(seen).toContain('contract');
    expect(seen).toContain('use-memory');
    expect(seen).toContain('memory');
    expect(closureUnresolved('button')).toEqual([]);
  });

  it('NO served component has a dangling dependency', () => {
    const offenders: Record<string, string[]> = {};
    for (const name of listComponentNames()) {
      const missing = closureUnresolved(name);
      if (missing.length > 0) offenders[name] = missing;
    }
    expect(offenders).toEqual({});
  });
});

/**
 * Per-target facet + reverse-composites extraction (#2073). loadComponent now
 * emits a `facets` field (verbatim literal-union props, per target) and a
 * populated `composites` reverse index. The composites scan is pointed at the
 * test fixtures dir via RAFTERS_COMPOSITES_DIR so the fixture composite
 * (uses-button, whose block type is `button`) is discoverable as a real
 * composite node -- keeping #2072's assembleGraph invariant satisfiable.
 */
describe('per-target facet + reverse-composites extraction (#2073)', () => {
  const fixturesDir = join(fileURLToPath(new URL('.', import.meta.url)), 'fixtures');
  let prevCompositesDir: string | undefined;
  let buttonItem: RegistryItem | null;

  beforeAll(() => {
    prevCompositesDir = process.env['RAFTERS_COMPOSITES_DIR'];
    process.env['RAFTERS_COMPOSITES_DIR'] = fixturesDir;
    buttonItem = loadComponent('button');
  });

  afterAll(() => {
    if (prevCompositesDir === undefined) delete process.env['RAFTERS_COMPOSITES_DIR'];
    else process.env['RAFTERS_COMPOSITES_DIR'] = prevCompositesDir;
  });

  it("extracts react's variant as a verbatim literal union with its destructured default", () => {
    expect(buttonItem?.facets?.react?.props['variant']).toEqual({
      type: 'enum',
      values: [
        'default',
        'primary',
        'secondary',
        'destructive',
        'success',
        'warning',
        'info',
        'muted',
        'accent',
        'outline',
        'ghost',
        'link',
      ],
      // button.tsx:90 destructures `variant = 'default'` -- extractable, not left undefined.
      default: 'default',
    });
  });

  it('never collapses a styling prop to a bare string type', () => {
    expect(buttonItem?.facets?.react?.props['variant']?.type).not.toBe('string');
  });

  it('preserves the astro/react required/optional asymmetry for `id`', () => {
    // astro's `id: string` is required; react has no `id` prop of its own.
    expect(buttonItem?.facets?.astro?.props['id']).toMatchObject({ required: true });
    expect(buttonItem?.facets?.react?.props['id']).toBeUndefined();
  });

  it('sources react `size` (which lives in the ButtonProps intersection, not the interface body)', () => {
    // Proves the destructuring-driven name source catches `size`; an interface-body
    // scan would miss it. Its 8 members come verbatim from ButtonSize.
    const size = buttonItem?.facets?.react?.props['size'];
    expect(size?.type).toBe('enum');
    expect(size).toMatchObject({
      values: ['default', 'xs', 'sm', 'lg', 'icon', 'icon-xs', 'icon-sm', 'icon-lg'],
    });
  });

  it('emits an honest empty wc facet -- no functional attribute-driven props today', () => {
    expect(buttonItem?.facets?.wc?.props).toEqual({});
    // Never a fabricated `<rafters-button variant="primary">` attribute surface.
    expect(buttonItem?.facets?.wc?.snippet).not.toContain('variant="primary"');
  });

  it('populates the reverse composites index against a fixture that references button', () => {
    expect(buttonItem?.composites).toContain('uses-button');
  });

  it('parses cleanly against the CLI RegistryItemSchema (the hand-synced shapes agree)', () => {
    expect(() => RegistryItemSchema.parse(buttonItem)).not.toThrow();
  });
});

/**
 * The `@constraint` JSDoc tag (#2073). button.tsx carries no `@constraint` tag
 * today, and packages/ui/src/components/** is out of this issue's blast surface
 * (read-only), so the FACET-level assertion
 * `facets.react.props.size.constraint` cannot be satisfied without a source edit
 * -- reported to the team lead, not forced. These tests exercise the parser case
 * added to parseJSDocFromSource directly, against inline source; the facet wiring
 * (extractConstraints -> makeEnum) lights up the moment a component gains the tag.
 */
describe('@constraint JSDoc tag parsing (#2073)', () => {
  const wellFormed =
    '/**\n * @cognitive-load 3\n * @constraint when prop=size matches=icon* requires prop=aria-label\n */';
  const malformed = '/**\n * @cognitive-load 3\n * @constraint when prop=size\n */';

  it('accepts a well-formed @constraint body under strict intel', () => {
    expect(() =>
      parseJSDocFromSource(wellFormed, { strict: true, componentName: 'button' }),
    ).not.toThrow();
  });

  it('throws under strict intel on a malformed @constraint body, naming the component', () => {
    expect(() =>
      parseJSDocFromSource(malformed, { strict: true, componentName: 'button' }),
    ).toThrow(/Malformed @constraint in button/);
  });

  it('ignores a malformed @constraint body when not in strict mode', () => {
    // Non-strict: the tag is not an intelligence field, so it neither throws nor
    // contributes -- the component still yields its other intelligence.
    const intel = parseJSDocFromSource(malformed, { componentName: 'button' });
    expect(intel?.cognitiveLoad).toBe(3);
  });
});

/**
 * Editor-subsystem relocation (#2136). The 25 `subsystem:"editor"` primitives
 * live under `packages/ui/src/primitives/editor/` on disk, but discovery must
 * find them by bare name and serve them at the UNCHANGED flat consumer path
 * (`lib/primitives/<name>.ts`). Source nesting and served layout are decoupled:
 * a consumer sees zero path churn. These tests fail loudly if discovery drops
 * the subdir (the #2018 silent-empty shape) or if the folder and the matrix tag
 * drift apart.
 */
describe('editor primitive discovery after relocation (#2136)', () => {
  const EDITOR_PRIMITIVES = [
    'block-canvas',
    'block-context-menu',
    'block-handler',
    'block-operations',
    'block-palette',
    'block-wrapper',
    'canvas-drop-zone',
    'clipboard',
    'command-palette',
    'cursor-tracker',
    'document-editor',
    'drag-drop',
    'editor-toolbar',
    'history',
    'inline-formatter',
    'inline-toolbar',
    'input-events',
    'rule-dialog',
    'rule-drop-zone',
    'rule-palette',
    'selection',
    'serializer',
    'serializer-html',
    'serializer-mdx',
    'serializer-text',
  ];

  // Resolve source paths from THIS test file, never from process.cwd():
  // apps/registry/test/ -> repo root is three levels up.
  const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../../..');
  const primitivesDir = join(repoRoot, 'packages/ui/src/primitives');
  const editorDir = join(primitivesDir, 'editor');
  const matrixPath = join(repoRoot, 'packages/ui/docs/spec/matrix/primitives.jsonl');

  const matrixEditorNames = new Set(
    readFileSync(matrixPath, 'utf-8')
      .split('\n')
      .filter((l) => l.trim())
      .map((l) => JSON.parse(l) as { name: string; subsystem: string })
      .filter((d) => d.subsystem === 'editor')
      .map((d) => d.name),
  );

  it('lists every editor primitive by bare name', () => {
    const names = listPrimitiveNames();
    for (const name of EDITOR_PRIMITIVES) {
      expect(names).toContain(name);
    }
  });

  it('loads each editor primitive with the served path unchanged (flat)', () => {
    for (const name of EDITOR_PRIMITIVES) {
      const item = loadPrimitive(name);
      expect(item, `loadPrimitive('${name}') returned null`).not.toBeNull();
      expect(item?.files[0]?.path).toBe(`lib/primitives/${name}.ts`);
    }
  });

  it('served editor content never leaks the editor/ source nesting', () => {
    // A nested `../memory` that survived into served content would resolve to
    // `lib/memory` in the flat consumer tree -- a dangling import. It must be
    // flattened back to `./memory` (a flat sibling) before serving.
    const handler = loadPrimitive('block-handler');
    const content = handler?.files[0]?.content ?? '';
    expect(content).not.toMatch(/from\s+['"]\.\.\/(memory|types|keyboard-handler)['"]/);
    expect(content).toMatch(/from\s+['"]\.\/memory['"]/);
    // The transitive closure still names the flat behavior siblings.
    expect(handler?.primitives).toContain('memory');
    expect(handler?.primitives).toContain('types');
  });

  it('non-editor primitives are unaffected at the flat root', () => {
    expect(loadPrimitive('aria-manager')?.files[0]?.path).toBe('lib/primitives/aria-manager.ts');
    expect(loadPrimitive('memory')?.files[0]?.path).toBe('lib/primitives/memory.ts');
  });

  it('editor folder membership matches matrix subsystem:"editor" exactly', () => {
    const onDisk = new Set(
      readdirSync(editorDir)
        .filter((f) => f.endsWith('.ts') || f.endsWith('.tsx'))
        .map((f) => f.replace(/\.tsx?$/, '')),
    );
    expect(onDisk).toEqual(matrixEditorNames);
  });

  it('no flat-root primitive carries subsystem:"editor" (drift is a failure)', () => {
    const flatNames = readdirSync(primitivesDir, { withFileTypes: true })
      .filter((e) => e.isFile() && /\.tsx?$/.test(e.name))
      .map((e) => e.name.replace(/\.tsx?$/, ''));
    const misplaced = flatNames.filter((n) => matrixEditorNames.has(n));
    expect(
      misplaced,
      `editor-tagged primitives still at flat root: ${misplaced.join(', ')}`,
    ).toEqual([]);
  });
});
