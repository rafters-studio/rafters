/**
 * Step definitions for `--map color:<name>` entries (#2813): a colour family
 * assigned to no role, from one value or a complete scale.
 */

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { oklchToCSS, rebakeAccessibility, SCALE_POSITIONS } from '@rafters/color-utils';
import {
  generateBaseSystem,
  importColorFamily,
  loadRegistryFromDir,
  REGISTRY_PLUGINS,
  resolveCustomProperties,
  saveRegistryToDir,
} from '@rafters/design-tokens';
import { type ColorValue, ColorValueSchema, SEMANTIC_FAMILY_ROLES } from '@rafters/shared';
import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { tryParseColor } from '@rafters/color-utils';
import { cleanupFixture, createFixture } from '../fixtures/projects.js';
import { context } from './common.steps.js';
import { execRafters } from './helpers.js';

const { Given, When, Then, After } = createBdd();

const MOSS = SCALE_POSITIONS.map(
  (step, i) =>
    `  --moss-${step}: oklch(${(0.97 - i * 0.08).toFixed(2)} ${(0.02 + i * 0.01).toFixed(2)} 140);`,
);
const BAD = SCALE_POSITIONS.map(
  (step) => `  --bad-${step}: ${step === '300' ? '12px' : 'oklch(0.6 0.1 20)'};`,
);

const STYLESHEET = `:root {
  --sky: var(--sky-base);
  --sky-base: oklch(0.7 0.1 230);
  --ink: oklch(0.45 0.2 20);
${MOSS.join('\n')}
  --part-50: oklch(0.97 0.02 60);
  --part-100: oklch(0.93 0.04 60);
  --part-500: oklch(0.6 0.15 60);
${BAD.join('\n')}
  --notcolor: 12px;
  --dangling: var(--nowhere);
}
`;

const MUD = SCALE_POSITIONS.map(
  (step, i) =>
    `  --color-mud-${step}: oklch(${(0.96 - i * 0.08).toFixed(2)} ${(0.01 + i * 0.005).toFixed(3)} 190);`,
);

/** palette.css (#2866): a palette, roles on its steps, and a colour off it. */
const PALETTE = `:root {
${MUD.join('\n')}
  --primary: var(--color-mud-500);
  --accent: var(--brand);
  --brand: var(--color-mud-300);
  --ink: oklch(0.45 0.2 20);
}
`;

const STYLESHEETS: Record<string, string> = { 'brand.css': STYLESHEET, 'palette.css': PALETTE };

const COLOR_TOKENS = '.rafters/tokens/color.rafters.json';
const SEMANTIC_TOKENS = '.rafters/tokens/semantic.rafters.json';
const RAFTERS_CSS = '.rafters/output/rafters.css';

interface StoredToken {
  name: string;
  value: unknown;
  userOverride?: { reason?: string } | null;
}

const local: { other: string; built: string } = { other: '', built: '' };

After(async () => {
  if (local.other) await cleanupFixture(local.other);
  local.other = '';
  local.built = '';
});

async function readIn(root: string, file: string): Promise<string> {
  return readFile(join(root, file), 'utf8');
}

async function tokensIn(root: string, file: string): Promise<Map<string, StoredToken>> {
  const parsed = JSON.parse(await readIn(root, file)) as { tokens: StoredToken[] };
  return new Map(parsed.tokens.map((t) => [t.name, t]));
}

async function familyValue(name: string): Promise<ColorValue> {
  const token = (await tokensIn(context.fixturePath, COLOR_TOKENS)).get(name);
  expect(token, `family token ${name}`).toBeDefined();
  return ColorValueSchema.parse(token?.value);
}

/** The colour a property in brand.css resolves to, as rafters writes a typed colour. */
function resolvedAsTyped(property: string): string {
  const found = resolveCustomProperties(STYLESHEET).find((r) => r.property === property);
  const color = found?.value ? tryParseColor(found.value) : null;
  if (color === null) throw new Error(`${property} does not resolve to a colour`);
  return oklchToCSS(color);
}

function errorMessage(): string {
  const line = (context.commandResult?.stderr ?? '').trim().split('\n').pop() ?? '';
  const parsed: unknown = JSON.parse(line);
  if (typeof parsed !== 'object' || parsed === null || !('message' in parsed)) {
    throw new Error(`no error message in ${line}`);
  }
  return String(parsed.message);
}

export function run(args: string[], cwd: string): Promise<{ code: number; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn('node', args, { cwd });
    let stderr = '';
    child.stderr.on('data', (d) => {
      stderr += d.toString();
    });
    child.on('close', (code) => resolve({ code: code ?? 1, stderr }));
  });
}

/** Every colour utility root the installed Tailwind offers, measured from its design system. */
async function tailwindColorRoots(): Promise<string[]> {
  const require = createRequire(import.meta.url);
  const cliDir = dirname(require.resolve('@tailwindcss/cli/package.json'));
  const fromCli = createRequire(join(cliDir, 'package.json'));
  const lib = join(dirname(fromCli.resolve('tailwindcss/package.json')), 'dist/lib.mjs');
  const tailwind: unknown = await import(pathToFileURL(lib).href);
  if (
    typeof tailwind !== 'object' ||
    tailwind === null ||
    !('__unstable__loadDesignSystem' in tailwind) ||
    typeof tailwind.__unstable__loadDesignSystem !== 'function'
  ) {
    throw new Error('tailwindcss has no __unstable__loadDesignSystem');
  }
  const theme = `@theme default {${SCALE_POSITIONS.map((s) => `--color-probe-${s}: red;`).join('')}}`;
  const system: unknown = await tailwind.__unstable__loadDesignSystem(theme, {});
  if (
    typeof system !== 'object' ||
    system === null ||
    !('getClassList' in system) ||
    typeof system.getClassList !== 'function'
  ) {
    throw new Error('design system has no getClassList');
  }
  const list: unknown = system.getClassList();
  const roots = new Set<string>();
  for (const entry of Array.isArray(list) ? list : []) {
    const name: unknown = Array.isArray(entry) ? entry[0] : undefined;
    const match = typeof name === 'string' ? name.match(/^(.*)-probe-500$/) : null;
    if (match?.[1]) roots.add(match[1]);
  }
  return [...roots];
}

/** Expand a brace pattern such as `{a,b}-x-{1,2}` into every candidate. */
function expandBraces(pattern: string): string[] {
  const open = pattern.indexOf('{');
  if (open === -1) return [pattern];
  const close = pattern.indexOf('}', open);
  const head = pattern.slice(0, open);
  const tail = expandBraces(pattern.slice(close + 1));
  return pattern
    .slice(open + 1, close)
    .split(',')
    .flatMap((option) => tail.map((rest) => `${head}${option}${rest}`));
}

function hasRule(css: string, className: string): boolean {
  return new RegExp(`\\.${className.replaceAll('-', '\\-')}(?![\\w-])`).test(css);
}

// Givens

Given('a project with no .rafters directory', async () => {
  context.fixturePath = await createFixture('nextjs-shadcn-v4');
  expect(existsSync(join(context.fixturePath, '.rafters'))).toBe(false);
});

Given('an initialised project', async () => {
  context.fixturePath = await createFixture('nextjs-shadcn-v4');
  const result = await execRafters(context.fixturePath, ['init', '--agent']);
  expect(result.exitCode, result.stderr).toBe(0);
});

Given('an initialised project whose config enables the dtcg export', async () => {
  context.fixturePath = await createFixture('nextjs-shadcn-v4');
  const result = await execRafters(context.fixturePath, ['init', '--agent']);
  expect(result.exitCode, result.stderr).toBe(0);
  const configPath = join(context.fixturePath, '.rafters', 'config.rafters.json');
  const config = JSON.parse(await readFile(configPath, 'utf8')) as {
    exports: Record<string, boolean>;
  };
  config.exports.dtcg = true;
  await writeFile(configPath, JSON.stringify(config, null, 2));
});

Given('the stylesheet {string}', async ({}, file: string) => {
  const css = STYLESHEETS[file];
  if (css === undefined) throw new Error(`no stylesheet ${file}`);
  await writeFile(join(context.fixturePath, file), css);
});

Given(
  /^"([^"]+)" declares --color-mud-50 to --color-mud-950 in (:root|@theme), with --primary on var\(--color-mud-500\) and --secondary on var\(--color-mud-300\) in :root$/,
  async ({}, file: string, block: string) => {
    const full = join(context.fixturePath, file);
    const css = await readFile(full, 'utf8');
    const roles = '  --primary: var(--color-mud-500);\n  --secondary: var(--color-mud-300);';
    const palette =
      block === ':root'
        ? `:root {\n${MUD.join('\n')}\n${roles}\n}\n`
        : `@theme {\n${MUD.join('\n')}\n}\n:root {\n${roles}\n}\n`;
    await writeFile(full, `${css}\n${palette}`);
  },
);

/**
 * The state an import before #2866 left: the step's colour grown into a
 * one-off family, with the role pointed at it.
 */
Given(
  'the project was imported from {string} by an older version, with {string} on the family {string}',
  async ({}, file: string, role: string, family: string) => {
    const property = `--${family.replace(/^imported-/, '')}`;
    const css = STYLESHEETS[file] ?? '';
    const found = resolveCustomProperties(css).find((r) => r.property === property);
    const seed = found?.value ? tryParseColor(found.value) : null;
    if (seed === null) throw new Error(`${property} does not resolve to a colour`);
    const tokens = join(context.fixturePath, '.rafters', 'tokens');
    const registry = loadRegistryFromDir(tokens, REGISTRY_PLUGINS);
    for (const t of importColorFamily(family, '500', seed)) registry.define(t);
    registry.set(
      role,
      { family, position: '500' },
      { reason: `imported from ${property} in ${file}` },
    );
    saveRegistryToDir(tokens, registry);
  },
);

// Whens

When(
  'I run {string} in another project with the JSON map entry {string} to {string}',
  async ({}, command: string, key: string, source: string) => {
    local.other = await createFixture('nextjs-shadcn-v4');
    await writeFile(join(local.other, 'brand.css'), STYLESHEET);
    const parts = command.split(' ');
    if (parts[0] === 'rafters') parts.shift();
    const result = await execRafters(local.other, [
      ...parts,
      '--map',
      JSON.stringify({ [key]: source }),
    ]);
    expect(result.exitCode, result.stderr).toBe(0);
  },
);

/**
 * Build the project's rafters.css with Tailwind and no scanned sources, plus
 * any `@source` lines given (#2825). The output is what `builtCss` returns.
 */
export async function buildRaftersCss(sources: readonly string[] = []): Promise<string> {
  const require = createRequire(import.meta.url);
  const cli = join(dirname(require.resolve('@tailwindcss/cli/package.json')), 'dist/index.mjs');
  const input = join(context.fixturePath, 'build-input.css');
  const output = join(context.fixturePath, 'build-output.css');
  await writeFile(
    input,
    [`@import "tailwindcss" source(none);`, `@import "./${RAFTERS_CSS}";`, ...sources, ''].join(
      '\n',
    ),
  );
  const result = await run([cli, '-i', input, '-o', output], context.fixturePath);
  expect(result.code, result.stderr).toBe(0);
  local.built = await readFile(output, 'utf8');
  return local.built;
}

/** The output of the last Tailwind build of rafters.css. */
export function builtCss(): string {
  return local.built;
}

When('rafters.css is built by Tailwind with no scanned sources', async () => {
  await buildRaftersCss();
});

// Thens: tokens

Then(
  'the family token {string} has an 11-step scale, harmonies, accessibility and analysis',
  async ({}, name: string) => {
    const value = await familyValue(name);
    expect(value.scale).toHaveLength(11);
    expect(value.harmonies).toBeDefined();
    expect(value.accessibility).toBeDefined();
    expect(value.analysis).toBeDefined();
  },
);

Then('the tokens {string} through {string} exist', async ({}, first: string, last: string) => {
  const tokens = await tokensIn(context.fixturePath, COLOR_TOKENS);
  const family = first.replace(/-50$/, '');
  expect(last).toBe(`${family}-950`);
  for (const step of SCALE_POSITIONS) expect(tokens.has(`${family}-${step}`)).toBe(true);
});

Then(
  '{string} is the resolved colour of {string} as typed',
  async ({}, token: string, property: string) => {
    const tokens = await tokensIn(context.fixturePath, COLOR_TOKENS);
    expect(tokens.get(token)?.value).toBe(resolvedAsTyped(property));
  },
);

Then(
  'for every step 50 through 950, the step token of {string} is the resolved colour of that step of {string} as typed',
  async ({}, family: string, source: string) => {
    const tokens = await tokensIn(context.fixturePath, COLOR_TOKENS);
    const prefix = source.replace(/-\*$/, '');
    for (const step of SCALE_POSITIONS) {
      expect(tokens.get(`${family}-${step}`)?.value).toBe(resolvedAsTyped(`${prefix}-${step}`));
    }
  },
);

Then(
  'the family token {string} has a scale equal to the resolved {string} colours, in step order',
  async ({}, family: string, source: string) => {
    const value = await familyValue(family);
    const prefix = source.replace(/-\*$/, '');
    expect(value.scale.map((c) => oklchToCSS(c))).toEqual(
      SCALE_POSITIONS.map((step) => resolvedAsTyped(`${prefix}-${step}`)),
    );
  },
);

Then(
  'the accessibility of {string} equals rebakeAccessibility over its scale',
  async ({}, family: string) => {
    const value = await familyValue(family);
    expect(value.accessibility).toEqual(rebakeAccessibility(value).accessibility);
  },
);

async function expectNoRoleReferences(family: string): Promise<Map<string, StoredToken>> {
  const semantic = await tokensIn(context.fixturePath, SEMANTIC_TOKENS);
  for (const role of SEMANTIC_FAMILY_ROLES) {
    const value = semantic.get(role)?.value;
    if (typeof value === 'object' && value !== null && 'family' in value) {
      expect(value.family, role).not.toBe(family);
    }
  }
  return semantic;
}

Then('no role root token references {string}', async ({}, family: string) => {
  await expectNoRoleReferences(family);
});

Then(
  'no role root token references {string}, and every role root token holds its rafters default',
  async ({}, family: string) => {
    const semantic = await expectNoRoleReferences(family);
    const defaults = new Map(generateBaseSystem({}).allTokens.map((t) => [t.name, t.value]));
    for (const role of SEMANTIC_FAMILY_ROLES) {
      if (!semantic.has(role)) continue;
      expect(semantic.get(role)?.value, role).toEqual(defaults.get(role));
    }
  },
);

Then(
  '{string} references the family {string} at {int}',
  async ({}, role: string, family: string, position: number) => {
    const semantic = await tokensIn(context.fixturePath, SEMANTIC_TOKENS);
    expect(semantic.get(role)?.value).toEqual({ family, position: String(position) });
  },
);

Then(
  '{string} references the family {string} at {int}, with the reason {string}',
  async ({}, role: string, family: string, position: number, reason: string) => {
    const token = (await tokensIn(context.fixturePath, SEMANTIC_TOKENS)).get(role);
    expect(token?.value, role).toEqual({ family, position: String(position) });
    expect(token?.userOverride?.reason, role).toBe(reason);
  },
);

Then('no colour token is named {string} or {string}', async ({}, first: string, second: string) => {
  const names = [...(await tokensIn(context.fixturePath, COLOR_TOKENS)).keys()];
  expect(names.filter((n) => n.startsWith(first) || n.startsWith(second))).toEqual([]);
});

Then('the {string} tokens in both projects are equal', async ({}, family: string) => {
  const pick = async (root: string): Promise<StoredToken[]> => {
    const tokens = await tokensIn(root, COLOR_TOKENS);
    return [family, ...SCALE_POSITIONS.map((s) => `${family}-${s}`)].map((name) => {
      const token = tokens.get(name);
      if (!token) throw new Error(`${name} missing in ${root}`);
      return token;
    });
  };
  const ours = await pick(context.fixturePath);
  const theirs = await pick(local.other);
  expect(ours).toEqual(theirs);
});

// Thens: rafters.css

Then(
  'rafters.css declares {string} through {string} in the same @theme block as {string}',
  async ({}, first: string, last: string, anchor: string) => {
    const css = await readIn(context.fixturePath, RAFTERS_CSS);
    const prefix = first.replace(/-50$/, '');
    expect(last).toBe(`${prefix}-950`);
    const block = css.match(/@theme \{[^}]*\}/g)?.find((b) => b.includes(`${anchor}:`));
    expect(block, `@theme block holding ${anchor}`).toBeDefined();
    for (const step of SCALE_POSITIONS) expect(block).toContain(`${prefix}-${step}:`);
  },
);

Then(
  'each of those declarations holds the value of its step token in color.rafters.json',
  async () => {
    const css = await readIn(context.fixturePath, RAFTERS_CSS);
    const tokens = await tokensIn(context.fixturePath, COLOR_TOKENS);
    for (const step of SCALE_POSITIONS) {
      const value = tokens.get(`nasty-orange-${step}`)?.value;
      expect(css).toContain(`--color-nasty-orange-${step}: ${String(value)};`);
    }
  },
);

Then('rafters.css declares no {string} custom property', async ({}, prefix: string) => {
  expect(await readIn(context.fixturePath, RAFTERS_CSS)).not.toContain(prefix);
});

Then('rafters.css declares {string}', async ({}, property: string) => {
  expect(await readIn(context.fixturePath, RAFTERS_CSS)).toContain(`${property}:`);
});

Then(
  'rafters.css names every colour utility candidate for {string} without scanning',
  async ({}, family: string) => {
    const css = await readIn(context.fixturePath, RAFTERS_CSS);
    const candidates = new Set(
      [...css.matchAll(/@source inline\("([^"]+)"\);/g)].flatMap((m) => expandBraces(m[1] ?? '')),
    );
    for (const root of await tailwindColorRoots()) {
      for (const step of SCALE_POSITIONS) {
        expect(candidates.has(`${root}-${family}-${step}`), `${root}-${family}-${step}`).toBe(true);
      }
    }
  },
);

// Thens: the Tailwind build

Then(
  'the output has a rule for every colour utility root the installed Tailwind offers, at every step of {string}',
  async ({}, family: string) => {
    const roots = await tailwindColorRoots();
    expect(roots.length).toBeGreaterThan(40);
    for (const root of roots) {
      for (const step of SCALE_POSITIONS) {
        const name = `${root}-${family}-${step}`;
        expect(hasRule(local.built, name), name).toBe(true);
      }
    }
  },
);

Then(
  'the roots include bg, text, border, ring, outline, fill, stroke, from, via, to, shadow, divide, decoration, accent and caret',
  async () => {
    const roots = new Set(await tailwindColorRoots());
    for (const root of 'bg text border ring outline fill stroke from via to shadow divide decoration accent caret'.split(
      ' ',
    )) {
      expect(roots.has(root), root).toBe(true);
    }
  },
);

Then(
  '{string} sets background-color to var\\(--color-nasty-orange-500)',
  async ({}, className: string) => {
    expect(local.built).toMatch(
      new RegExp(
        `\\.${className}\\s*\\{\\s*background-color:\\s*var\\(--color-nasty-orange-500\\)`,
      ),
    );
  },
);

Then('the output has no rule for {string}', async ({}, className: string) => {
  expect(hasRule(local.built, className)).toBe(false);
});

// Thens: DTCG

Then(
  'rafters.json has the group path {string} with members 50 through 950, each of $type {string}',
  async ({}, path: string, type: string) => {
    let node: unknown = JSON.parse(
      await readIn(context.fixturePath, '.rafters/output/rafters.json'),
    );
    for (const segment of path.split(' > ')) {
      if (typeof node !== 'object' || node === null || !(segment in node)) {
        throw new Error(`rafters.json has no group at ${path}`);
      }
      node = (node as Record<string, unknown>)[segment];
    }
    if (typeof node !== 'object' || node === null) throw new Error(`${path} is not a group`);
    const record = node as Record<string, unknown>;
    expect(Object.keys(record).filter((k) => !k.startsWith('$'))).toEqual([...SCALE_POSITIONS]);
    for (const step of SCALE_POSITIONS) {
      expect((record[step] as Record<string, unknown>).$type, step).toBe(type);
    }
  },
);

// Thens: errors and help

Then('the error names {string} and says {string}', async ({}, entry: string, reason: string) => {
  const message = errorMessage();
  expect(message).toContain(entry);
  expect(message).toContain(reason);
});

Then('no .rafters directory exists', async () => {
  expect(existsSync(join(context.fixturePath, '.rafters'))).toBe(false);
});

Then(
  '{string} and {string} describe {string} and {string}',
  async ({}, first: string, second: string, one: string, scale: string) => {
    for (const command of [first, second]) {
      const parts = command.split(' ');
      if (parts[0] === 'rafters') parts.shift();
      const result = await execRafters(context.fixturePath, parts);
      const help = result.stdout.replace(/\s+/g, ' ');
      expect(help, command).toContain(one);
      expect(help, command).toContain(scale);
    }
  },
);
