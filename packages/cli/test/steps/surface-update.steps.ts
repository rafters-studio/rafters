/**
 * Steps for #2910: fill and surface moved out of classy, and a project updates
 * across that move as a whole. The worktree's own source is served as the
 * registry, because the live one holds neither side of the move on demand.
 *
 * Note: Module-level state is intentional for playwright-bdd step state sharing.
 * Parallel execution is disabled in playwright.config.ts to ensure test isolation.
 */

import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import {
  loadComponent,
  loadPrimitive,
  loadSubstrate,
} from '../../../../apps/registry/src/lib/registry/componentService.js';
import type { RegistryItem } from '../../src/registry/types.js';
import { createFixture } from '../fixtures/projects.js';
import { context } from './common.steps.js';
import { serve } from './declared-needs.steps.js';
import { execRafters } from './helpers.js';

const { Given, Then } = createBdd();

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '../../../..');
const PREVIOUS_RELEASE = 'v0.6.2';

/** What the registry serves for `names` and everything they need, from the current directory's tree. */
function closure(names: readonly string[]): RegistryItem[] {
  const items = new Map<string, RegistryItem>();
  const pending = [...names];
  for (let name = pending.pop(); name !== undefined; name = pending.pop()) {
    if (items.has(name)) continue;
    const loaded = loadComponent(name) ?? loadPrimitive(name) ?? loadSubstrate(name);
    if (!loaded) throw new Error(`the registry has no item named ${name}`);
    items.set(name, loaded as RegistryItem);
    pending.push(...loaded.registryDependencies);
  }
  return [...items.values()];
}

/**
 * The same closure from the previous release's source: the registry reads
 * packages/ui relative to its working directory, so it runs from a copy of that
 * release's tree laid out the same way.
 */
function previousRelease(names: readonly string[]): RegistryItem[] {
  // CI's checkout is shallow and carries no tags.
  const ref = `refs/tags/${PREVIOUS_RELEASE}`;
  try {
    execFileSync('git', ['rev-parse', '--verify', '--quiet', ref], { cwd: REPO, stdio: 'ignore' });
  } catch {
    execFileSync('git', ['fetch', '--depth=1', 'origin', `${ref}:${ref}`], { cwd: REPO });
  }
  const root = join(context.fixturePath, '.previous-release');
  const cwd = join(root, 'apps/registry');
  mkdirSync(cwd, { recursive: true });
  const tar = execFileSync('git', ['archive', PREVIOUS_RELEASE, 'packages/ui/src'], {
    cwd: REPO,
    maxBuffer: 256 * 1024 * 1024,
  });
  execFileSync('tar', ['-x', '-C', root], { input: tar });
  const back = process.cwd();
  process.chdir(cwd);
  try {
    return closure(names);
  } finally {
    process.chdir(back);
    rmSync(root, { recursive: true, force: true });
  }
}

Given('a project with card and badge installed from the previous release', async () => {
  context.fixturePath = await createFixture('nextjs-shadcn-v4');
  const init = await execRafters(context.fixturePath, ['init', '--agent']);
  expect(init.exitCode, init.stderr).toBe(0);
  const names = ['card', 'badge'];
  await serve(previousRelease(names));
  const add = await execRafters(context.fixturePath, ['add', ...names, '--agent']);
  expect(add.exitCode, add.stderr).toBe(0);
  const classes = join(context.fixturePath, 'components/ui/card.classes.ts');
  expect(readFileSync(classes, 'utf8')).toContain('classy.fill(');
  // The registry moves on; the project stays where it is until it updates.
  await serve(closure(names));
});

Then(
  'a page rendering Card with fill={string} and Badge with surface={string} renders both, and neither throws',
  async ({}, fill: string, surface: string) => {
    const root = context.fixturePath;
    writeFileSync(
      join(root, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: { jsx: 'react-jsx', baseUrl: '.', paths: { '@/*': ['./*'] } },
      }),
    );
    writeFileSync(
      join(root, 'page.tsx'),
      [
        "import { renderToStaticMarkup } from 'react-dom/server';",
        "import { Badge } from '@/components/ui/badge';",
        "import { Card } from '@/components/ui/card';",
        'console.log(renderToStaticMarkup(<>',
        `  <Card id="card" fill="${fill}">c</Card>`,
        `  <Badge id="badge" surface="${surface}">b</Badge>`,
        '</>));',
        '',
      ].join('\n'),
    );
    const tsx = join(HERE, '../../node_modules/.bin/tsx');
    const html = execFileSync(tsx, ['page.tsx'], { cwd: root, encoding: 'utf8' });
    const classesOf = (id: string) => {
      const tag = new RegExp(`<[^>]*\\bid="${id}"[^>]*>`).exec(html)?.[0];
      return /\bclass="([^"]*)"/.exec(tag ?? '')?.[1]?.split(/\s+/);
    };
    expect(classesOf('card')).toContain(fill);
    expect(classesOf('badge')).toContain(`bg-surface-${surface}`);
  },
);
