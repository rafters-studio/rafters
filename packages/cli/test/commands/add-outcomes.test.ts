/**
 * End-to-end coverage for the three-way mixed state `rafters add` reports.
 *
 * Every other test in this suite asserts `failed === 0`, and the human render
 * test builds the event by hand -- so nothing drove a real install failure
 * through `add()` and out into the summary. That is the outcome the original
 * defect hid behind: a blanket success line over a tree where an item never
 * landed.
 *
 * The failure here is genuine, not injected. With `componentTarget: 'wc'` an
 * item whose only file is `.vue` has no `.element.ts` and no React fallback
 * (`wc` is not a REACT_FALLBACK_TARGET), so `installItem` throws
 * "No .element.ts version available" and the outer catch records it as failed.
 */

import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { add } from '../../src/commands/add.js';
import type { RaftersConfig } from '../../src/commands/init.js';
import type { RegistryItem } from '../../src/registry/types.js';

const PROJECT_DIR = join(import.meta.dirname, '.tmp-add-outcomes');
const REGISTRY_URL = 'https://registry.test';

/** Written: has the .element.ts file a wc project needs. */
const buttonItem: RegistryItem = {
  name: 'button',
  type: 'ui',
  primitives: [],
  files: [
    {
      path: 'components/ui/button.element.ts',
      content: 'export class ButtonElement extends HTMLElement {}',
      dependencies: [],
      devDependencies: [],
    },
  ],
  rules: [],
  composites: [],
};

/** Failed: Vue-only, so a wc project has nothing installable and no fallback. */
const vueOnlyItem: RegistryItem = {
  name: 'z',
  type: 'ui',
  primitives: [],
  files: [
    {
      path: 'components/ui/z.vue',
      content: '<template><div /></template>',
      dependencies: [],
      devDependencies: [],
    },
  ],
  rules: [],
  composites: [],
};

/**
 * Skipped: a primitive, tracked in config and present on disk. Primitives
 * bypass framework filtering entirely, so the tracked-and-on-disk guard fires
 * for it under the wc target where a .tsx-only ui item would instead fail.
 */
const classyItem: RegistryItem = {
  name: 'classy',
  type: 'primitive',
  primitives: [],
  files: [
    {
      path: 'lib/primitives/classy.ts',
      content: 'export const classy = () => "";',
      dependencies: [],
      devDependencies: [],
    },
  ],
  rules: [],
  composites: [],
};

const REGISTRY_BODIES: Record<string, unknown> = {
  '/registry/index.json': {
    name: 'rafters',
    homepage: 'https://rafters.studio',
    components: ['button', 'z'],
    primitives: ['classy'],
    composites: [],
    rules: [],
    substrate: [],
  },
  '/registry/components/button.json': buttonItem,
  '/registry/components/z.json': vueOnlyItem,
  '/registry/primitives/classy.json': classyItem,
};

function stubRegistry(): void {
  vi.stubGlobal('fetch', async (input: string | URL) => {
    const { pathname } = new URL(String(input));
    const body = REGISTRY_BODIES[pathname];
    if (body === undefined) return new Response('not found', { status: 404 });
    return new Response(JSON.stringify(body), { status: 200 });
  });
}

function wcConfig(): RaftersConfig {
  return {
    framework: 'vite',
    componentTarget: 'wc',
    registryUrl: REGISTRY_URL,
    componentsPath: 'components/ui',
    primitivesPath: 'lib/primitives',
    compositesPath: 'composites',
    rulesPath: 'lib/rules',
    cssPath: null,
    shadcn: false,
    exports: { tailwind: true, typescript: true, dtcg: false, compiled: false },
    installed: { components: [], primitives: ['classy'], composites: [], rules: [] },
  };
}

type Emitted = Record<string, unknown>;

function eventsFrom(logSpy: ReturnType<typeof vi.spyOn>): Emitted[] {
  const events: Emitted[] = [];
  for (const call of logSpy.mock.calls) {
    const [first] = call;
    if (typeof first !== 'string') continue;
    try {
      const parsed: unknown = JSON.parse(first);
      if (parsed && typeof parsed === 'object') events.push(parsed as Emitted);
    } catch {
      // Not an event line.
    }
  }
  return events;
}

describe('rafters add mixed outcomes', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    await rm(PROJECT_DIR, { recursive: true, force: true });
    await mkdir(PROJECT_DIR, { recursive: true });
    vi.spyOn(process, 'cwd').mockReturnValue(PROJECT_DIR);
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    stubRegistry();
    process.exitCode = undefined;
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    process.exitCode = undefined;
    await rm(PROJECT_DIR, { recursive: true, force: true });
  });

  it('reports written, skipped and failed together over one real run', async () => {
    await mkdir(join(PROJECT_DIR, '.rafters'), { recursive: true });
    await writeFile(
      join(PROJECT_DIR, '.rafters', 'config.rafters.json'),
      JSON.stringify(wcConfig(), null, 2),
    );
    // classy is tracked AND on disk -- the skip case.
    await mkdir(join(PROJECT_DIR, 'lib/primitives'), { recursive: true });
    await writeFile(
      join(PROJECT_DIR, 'lib/primitives/classy.ts'),
      'export const classy = () => "";',
    );

    await add(['button', 'classy', 'z'], { agent: true });

    const summary = eventsFrom(logSpy).find((event) => event.event === 'add:complete');
    if (!summary) throw new Error('no add:complete summary was emitted');

    expect(summary.written).toBe(1);
    expect(summary.skipped).toBe(1);
    expect(summary.failed).toBe(1);
    expect(summary.untracked).toBe(0);

    // The counts are worthless without the names -- a consumer has to know
    // WHICH item did not land.
    expect(summary.components).toEqual(['button']);
    expect(summary.skippedComponents).toEqual(['classy']);
    expect(summary.failedComponents).toEqual(['z']);

    // The failure is the real throw from installItem, not a synthesized event.
    const warning = eventsFrom(logSpy).find(
      (event) => event.event === 'add:warning' && event.component === 'z',
    );
    expect(String(warning?.message)).toContain('.element.ts');

    // The written item actually reached disk; the failed one did not.
    const written = await readFile(join(PROJECT_DIR, 'components/ui/button.element.ts'), 'utf-8');
    expect(written).toContain('ButtonElement');
    await expect(readFile(join(PROJECT_DIR, 'components/ui/z.vue'), 'utf-8')).rejects.toThrow();
  });

  it('exits nonzero when an item failed', async () => {
    await mkdir(join(PROJECT_DIR, '.rafters'), { recursive: true });
    await writeFile(
      join(PROJECT_DIR, '.rafters', 'config.rafters.json'),
      JSON.stringify(wcConfig(), null, 2),
    );

    await add(['z'], { agent: true });

    // A half-written tree that exits 0 is what lets a scripted install call
    // itself done -- the same top-level lie the per-outcome counts fixed below.
    expect(process.exitCode).toBe(1);
  });

  it('leaves the exit code alone when everything landed', async () => {
    await mkdir(join(PROJECT_DIR, '.rafters'), { recursive: true });
    await writeFile(
      join(PROJECT_DIR, '.rafters', 'config.rafters.json'),
      JSON.stringify(wcConfig(), null, 2),
    );

    await add(['button'], { agent: true });

    expect(process.exitCode).toBeUndefined();
  });
});
