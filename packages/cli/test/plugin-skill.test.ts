import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const REPO_ROOT = join(import.meta.dirname, '../../..');

async function skill(): Promise<string> {
  return readFile(join(REPO_ROOT, 'plugin/skills/rafters-frontend/SKILL.md'), 'utf-8');
}

describe('plugin/skills/rafters-frontend/SKILL.md (#2932)', () => {
  it('names no field no code reads', async () => {
    expect(await skill()).not.toContain('attentionBudget');
  });

  it('lists exactly the Grid presets the Grid has', async () => {
    const behavior = await readFile(
      join(REPO_ROOT, 'packages/ui/src/components/grid/grid.behavior.ts'),
      'utf-8',
    );
    const declared = /export type GridPreset = ([^;]+);/.exec(behavior)?.[1] ?? '';
    const presets = [...declared.matchAll(/'([a-z]+)'/g)].map((m) => m[1]);
    const table = (await skill()).split('| `preset` | for |')[1]?.split('\n\n')[0] ?? '';
    const listed = [...table.matchAll(/^\| `([a-z]+)`/gm)].map((m) => m[1]);
    expect(presets.length).toBeGreaterThan(0);
    expect(listed).toEqual(presets);
  });

  it('imports classy from the project primitives, as rafters add installs it', async () => {
    const text = await skill();
    expect(text).not.toContain('@rafters/ui/classy');
    expect(text).toContain("import classy from '@/lib/primitives/classy';");
  });

  it('tells an agent to run rafters check when it finishes', async () => {
    const finish = (await skill()).split('## Before you finish')[1] ?? '';
    expect(finish).toContain('`rafters check`');
  });
});
