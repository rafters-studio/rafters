/**
 * Refresh apps/demo to the newest published rafters and every live component.
 *
 * Deletes what rafters installs in the demo (read from its config first), then
 * runs the newest `rafters` CLI: `init` with defaults, `add` of every component
 * `add --list` reports. Exits non-zero naming the step that failed.
 *
 * Usage: pnpm refresh:demo
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { z } from 'zod';

const demo = resolve(import.meta.dirname, '..', 'apps', 'demo');

const ConfigSchema = z.object({
  componentsPath: z.string(),
  primitivesPath: z.string(),
  compositesPath: z.string().optional(),
  rulesPath: z.string().optional(),
});

const ListSchema = z.object({
  components: z.array(z.object({ name: z.string() })),
});

function rafters(step: string, args: string[]): string {
  try {
    return execFileSync('pnpm', ['dlx', 'rafters@latest', ...args], {
      cwd: demo,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'inherit'],
    });
  } catch (error) {
    throw new Error(`${step} failed`, { cause: error });
  }
}

function run(): void {
  const config = ConfigSchema.parse(
    JSON.parse(readFileSync(join(demo, '.rafters', 'config.rafters.json'), 'utf8')),
  );
  // Substrate (hooks, lib) installs under the source root: componentsPath minus components/ui.
  const sourceRoot = config.componentsPath.replace(/\/?components\/ui$/, '');
  const doomed = [
    '.rafters',
    config.componentsPath,
    config.primitivesPath,
    config.compositesPath,
    config.rulesPath,
    join(sourceRoot, 'hooks'),
    join(sourceRoot, 'lib'),
  ];
  for (const path of doomed) {
    if (path) rmSync(join(demo, path), { recursive: true, force: true });
  }

  rafters('rafters init', ['init', '--agent']);

  const list = ListSchema.parse(
    JSON.parse(rafters('rafters add --list', ['add', '--list', '--agent'])),
  );
  rafters('rafters add', ['add', ...list.components.map((c) => c.name)]);

  try {
    execFileSync('pnpm', ['--filter', 'demo', 'build'], { stdio: 'inherit' });
  } catch (error) {
    throw new Error('pnpm --filter demo build failed', { cause: error });
  }
}

try {
  run();
} catch (error) {
  // oxlint-disable-next-line no-console -- a script reports its failure on stderr
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
