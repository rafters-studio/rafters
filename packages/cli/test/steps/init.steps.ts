/**
 * Step definitions for init's entry CSS wiring (#2798).
 *
 * File snapshots are taken when the fixture is made and when a Given step
 * changes it, so "byte for byte" and "unchanged" compare against what the
 * project held before the command ran.
 */

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join, relative } from 'node:path';
import { transform } from '@astrojs/compiler-rs';
import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { cleanupFixture, createFixture, type FixtureType } from '../fixtures/projects.js';
import { context } from './common.steps.js';
import { execRafters, listFiles, type Snapshot, snapshot } from './helpers.js';

const { Given, When, Then } = createBdd();

const RAFTERS_CSS = '.rafters/output/rafters.css';
const LAYER_STATEMENT = '@layer theme, base, components, utilities;';

function events(): Array<Record<string, unknown>> {
  const out: Array<Record<string, unknown>> = [];
  for (const line of (context.commandResult?.stdout ?? '').split('\n')) {
    if (!line.startsWith('{')) continue;
    const parsed: unknown = JSON.parse(line);
    if (typeof parsed === 'object' && parsed !== null) out.push(parsed as Record<string, unknown>);
  }
  return out;
}

function run(
  command: string,
  args: string[],
  cwd: string,
): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn(command, args, { cwd });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => {
      stdout += d.toString();
    });
    child.stderr.on('data', (d) => {
      stderr += d.toString();
    });
    child.on('close', (code) => resolve({ code: code ?? 1, stdout, stderr }));
  });
}

/** Compile with the Tailwind v4 CLI from the fixture directory (#2798 "compiles"). */
async function expectCompiles(entry: string): Promise<void> {
  const require = createRequire(import.meta.url);
  const cli = join(dirname(require.resolve('@tailwindcss/cli/package.json')), 'dist/index.mjs');
  const result = await run('node', [cli, '-i', entry], context.fixturePath);
  expect(result.code, result.stderr).toBe(0);
  expect(result.stdout).toContain('--rafters-');
  expect(result.stdout.split(LAYER_STATEMENT).length - 1).toBe(1);
}

async function removeCssFiles(): Promise<void> {
  for (const file of listFiles(context.fixturePath)) {
    if (file.endsWith('.css')) await rm(join(context.fixturePath, file));
  }
}

Given('the project has no CSS file', async () => {
  await removeCssFiles();
  context.before = await snapshot(context.fixturePath);
});

Given("tailwindcss is not in the project's package.json", async () => {
  const file = join(context.fixturePath, 'package.json');
  const parsed: unknown = JSON.parse(await readFile(file, 'utf8'));
  if (typeof parsed !== 'object' || parsed === null)
    throw new Error('package.json is not an object');
  const pkg = parsed as Record<string, unknown>;
  for (const field of ['dependencies', 'devDependencies']) {
    const deps = pkg[field];
    if (typeof deps === 'object' && deps !== null)
      delete (deps as Record<string, unknown>).tailwindcss;
  }
  await writeFile(file, `${JSON.stringify(pkg, null, 2)}\n`);
  context.before = await snapshot(context.fixturePath);
});

Given('{string} already exists', async ({}, file: string) => {
  await writeFile(join(context.fixturePath, file), '/* kept by the user */\n');
  context.before = await snapshot(context.fixturePath);
});

Given(
  '{string} declares {string} in {string} with an oklch color',
  async ({}, file: string, property: string, selector: string) => {
    const full = join(context.fixturePath, file);
    const css = await readFile(full, 'utf-8');
    await writeFile(full, `${css}\n${selector} {\n  ${property}: oklch(0.5 0.2 30);\n}\n`);
    context.before = await snapshot(context.fixturePath);
  },
);

Given('a {string} project initialized by rafters 0ea670a0', async ({}, fixture: string) => {
  // The 0ea670a0 init left this fixture's tokens and rafters.css in the
  // shape today's init writes for it; the entry is set by the next step.
  context.fixturePath = await createFixture(fixture as FixtureType);
  const result = await execRafters(context.fixturePath, ['init', '--agent']);
  expect(result.exitCode, result.stderr).toBe(0);
});

Given('{string} holds only {string}', async ({}, file: string, content: string) => {
  await writeFile(join(context.fixturePath, file), `${content}\n`);
});

Given(
  'a project with no CSS file whose framework entry point exists \\(for example src\\/main.tsx for Vite, app\\/layout.tsx for Next.js\\)',
  async () => {
    context.fixturePath = await createFixture('vite-no-shadcn');
    await removeCssFiles();
    await mkdir(join(context.fixturePath, 'src'), { recursive: true });
    await writeFile(
      join(context.fixturePath, 'src/main.tsx'),
      "import { createRoot } from 'react-dom/client';\n",
    );
  },
);

Given('{string} exists', async ({}, file: string) => {
  const full = join(context.fixturePath, file);
  await mkdir(dirname(full), { recursive: true });
  await writeFile(
    full,
    file.endsWith('.astro')
      ? '---\nconst { title } = Astro.props;\n---\n<html><head><title>{title}</title></head><body><slot /></body></html>\n'
      : "import type { ReactNode } from 'react';\n\nexport default function Root({ children }: { children: ReactNode }) {\n  return children;\n}\n",
  );
});

When('I run {string} interactively and accept the defaults', async ({}, command: string) => {
  // No TTY: every prompt takes its default, and output goes through the
  // interactive renderer rather than --agent JSON.
  context.commandResult = await execRafters(context.fixturePath, command.split(' ').slice(1));
});

When('I run rafters init --agent', async () => {
  context.commandResult = await execRafters(context.fixturePath, ['init', '--agent']);
});

Then(
  '{string} imports {string} by its relative path',
  async ({}, entry: string, target: string) => {
    const css = await readFile(join(context.fixturePath, entry), 'utf-8');
    const rel = relative(
      dirname(join(context.fixturePath, entry)),
      join(context.fixturePath, target),
    );
    expect(css).toContain(`@import "${rel.startsWith('../') ? rel : `./${rel}`}";`);
  },
);

Then(
  '{string} holds the original content of {string} byte for byte',
  async ({}, oldFile: string, entry: string) => {
    const original = context.before.get(entry);
    expect(original).toBeDefined();
    expect(await readFile(join(context.fixturePath, oldFile))).toEqual(original);
  },
);

Then('{string} compiles', async ({}, entry: string) => {
  await expectCompiles(entry);
});

Then(
  'with tailwindcss v4 installed in the project, {string} compiles',
  async ({}, entry: string) => {
    if (!existsSync(join(context.fixturePath, 'node_modules/tailwindcss'))) {
      const result = await run('pnpm', ['add', '-D', 'tailwindcss@^4.1.18'], context.fixturePath);
      expect(result.code, result.stderr).toBe(0);
    }
    await expectCompiles(entry);
  },
);

Then('no file ending in {string} exists in the project', async ({}, suffix: string) => {
  expect(listFiles(context.fixturePath).filter((f) => f.endsWith(suffix))).toEqual([]);
});

Then('no file ending in {string} was created or moved', async ({}, suffix: string) => {
  const now = await snapshot(context.fixturePath);
  const pick = (snap: Snapshot): Array<[string, Buffer]> =>
    [...snap].filter(([f]) => f.endsWith(suffix)).sort(([a], [b]) => a.localeCompare(b));
  expect(pick(now)).toEqual(pick(context.before));
});

Then('the output has no {string} event', async ({}, name: string) => {
  expect(events().filter((e) => e.event === name)).toEqual([]);
});

Then('the output has an {string} event', async ({}, name: string) => {
  expect(events().some((e) => e.event === name)).toBe(true);
});

Then('the rafters config records {string} as its cssPath', async ({}, entry: string) => {
  const config: unknown = JSON.parse(
    await readFile(join(context.fixturePath, '.rafters/config.rafters.json'), 'utf-8'),
  );
  expect(config).toMatchObject({ cssPath: entry });
});

Then(
  'the output has exactly one event naming {string} as replaced and {string} as where its content went',
  async ({}, entry: string, oldFile: string) => {
    const named = events().filter((e) => e.cssPath === entry && e.event === 'init:css_replaced');
    expect(named).toHaveLength(1);
    expect(named[0]).toMatchObject({ oldPath: oldFile });
  },
);

Then('the output has exactly one event naming {string} as created', async ({}, entry: string) => {
  expect(
    events().filter((e) => e.event === 'init:css_created' && e.cssPath === entry),
  ).toHaveLength(1);
});

Then('the terminal output names {string} and {string}', async ({}, a: string, b: string) => {
  expect(context.commandResult?.exitCode).toBe(0);
  expect(context.commandResult?.stdout).toContain(a);
  expect(context.commandResult?.stdout).toContain(b);
});

Then(
  '{string} and {string} are byte for byte what the first init left',
  async ({}, a: string, b: string) => {
    for (const file of [a, b]) {
      expect(context.afterFirstInit.get(file)).toBeDefined();
      expect(await readFile(join(context.fixturePath, file))).toEqual(
        context.afterFirstInit.get(file),
      );
    }
  },
);

Then('the error names {string} and says what to do with it', async ({}, file: string) => {
  expect(context.commandResult?.stderr).toContain(file);
  expect(context.commandResult?.stderr).toContain(`Rename or delete ${file}`);
});

Then("the project's files are byte for byte what they were before the command", async () => {
  expect(await snapshot(context.fixturePath)).toEqual(context.before);
});

Then('no {string} directory exists', async ({}, dir: string) => {
  expect(existsSync(join(context.fixturePath, dir))).toBe(false);
});

Then('{string} and {string} are unchanged', async ({}, a: string, b: string) => {
  for (const file of [a, b]) {
    expect(await readFile(join(context.fixturePath, file))).toEqual(context.before.get(file));
  }
});

Then('the primary semantic token is imported from that color', async () => {
  const read = async (ns: string): Promise<Array<{ name: string; value: unknown }>> => {
    const raw: unknown = JSON.parse(
      await readFile(join(context.fixturePath, `.rafters/tokens/${ns}.rafters.json`), 'utf-8'),
    );
    expect(raw).toMatchObject({ tokens: expect.any(Array) });
    return (raw as { tokens: Array<{ name: string; value: unknown }> }).tokens;
  };
  const primary = (await read('semantic')).find((t) => t.name === 'primary');
  expect(primary?.value).toEqual({ family: 'imported-primary', position: '500' });
  const seed = (await read('color')).find((t) => t.name === 'imported-primary-500');
  expect(seed?.value).toBe('oklch(0.5 0.2 30)');
});

Then("init creates the framework's CSS file importing rafters", async () => {
  expect(context.commandResult?.exitCode).toBe(0);
  const css = await readFile(join(context.fixturePath, 'src/index.css'), 'utf-8');
  expect(css).toBe(`@import "../${RAFTERS_CSS}";\n`);
});

Then('the entry point imports that CSS file exactly once', async () => {
  const main = await readFile(join(context.fixturePath, 'src/main.tsx'), 'utf-8');
  expect(main.split("import './index.css';").length - 1).toBe(1);
});

Then(
  'when no entry point can be found, init reports the exact import line to add and the file to add it to, and exits 0',
  async () => {
    const fixture = await createFixture('vite-no-shadcn');
    try {
      await rm(join(fixture, 'src/index.css'));
      const result = await execRafters(fixture, ['init', '--agent']);
      expect(result.exitCode, result.stderr).toBe(0);
      expect(existsSync(join(fixture, 'src/main.tsx'))).toBe(false);
      expect(result.stdout).toContain('"event":"init:css_created"');
      expect(result.stdout).toContain(
        "Add import './index.css'; to src/main.tsx so the app loads it.",
      );
    } finally {
      await cleanupFixture(fixture);
    }
  },
);

Then('{string} imports {string} exactly once', async ({}, file: string, specifier: string) => {
  const content = await readFile(join(context.fixturePath, file), 'utf-8');
  expect(content.split(`import '${specifier}';`).length - 1).toBe(1);
});

Then(
  "{string} parses with Astro's compiler and imports {string} in its frontmatter",
  async ({}, file: string, specifier: string) => {
    const result = transform(await readFile(join(context.fixturePath, file), 'utf-8'), {
      filename: file,
    });
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(result.code).toMatch(
      new RegExp(`^import ['"]${specifier.replace(/[./]/g, '\\$&')}['"]`, 'm'),
    );
  },
);

// @tailwindcss/cli on demand (#2843)

Then(
  "the rafters package's production dependencies include neither {string} nor {string}",
  async ({}, a: string, b: string) => {
    const require = createRequire(import.meta.url);
    const cliDir = dirname(require.resolve('../../package.json'));
    const result = await run(
      'pnpm',
      ['--filter', 'rafters', 'list', '--prod', '--depth', 'Infinity', '--parseable'],
      cliDir,
    );
    expect(result.code, result.stderr).toBe(0);
    const installed = result.stdout.split('\n');
    expect(installed.length).toBeGreaterThan(1);
    for (const name of [a, b]) {
      expect(installed.filter((line) => line.endsWith(`/node_modules/${name}`))).toEqual([]);
    }
  },
);

Then("the project's package.json does not list {string}", async ({}, name: string) => {
  const parsed: unknown = JSON.parse(
    await readFile(join(context.fixturePath, 'package.json'), 'utf8'),
  );
  if (typeof parsed !== 'object' || parsed === null)
    throw new Error('package.json is not an object');
  const pkg = parsed as Record<string, unknown>;
  for (const field of ['dependencies', 'devDependencies']) {
    const deps = pkg[field];
    expect(typeof deps === 'object' && deps !== null && name in deps, field).toBe(false);
  }
});

Then('the project has no {string}', async ({}, file: string) => {
  expect(existsSync(join(context.fixturePath, file))).toBe(false);
});

Given("the project's config enables the compiled export", async () => {
  const path = join(context.fixturePath, '.rafters', 'config.rafters.json');
  const config = JSON.parse(await readFile(path, 'utf8')) as { exports: Record<string, boolean> };
  config.exports.compiled = true;
  await writeFile(path, JSON.stringify(config, null, 2));
});

Then('{string} holds compiled rafters CSS', async ({}, file: string) => {
  const css = await readFile(join(context.fixturePath, file), 'utf8');
  expect(css).toContain('--rafters-');
  expect(css).not.toContain('@import "tailwindcss"');
});
