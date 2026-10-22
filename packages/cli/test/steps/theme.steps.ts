/**
 * Step definitions for #2825: every token reaches its Tailwind utility
 * through `--rafters-<token>`, by the exporter's theme mapping.
 */

import { cp, readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { THEME_MAPPING, type ThemeMappingRow } from '@rafters/design-tokens';
import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import {
  resolveTypography,
  tokenPropsToClasses,
} from '../../../ui/src/components/typography/typography.classes.js';
import type { TypographyVariant } from '../../../ui/src/components/typography/typography.behavior.js';
import { createFixture } from '../fixtures/projects.js';
import { context } from './common.steps.js';
import { execRafters } from './helpers.js';
import { buildRaftersCss, builtCss } from './import.steps.js';
import {
  type CompiledSheet,
  declarationOf,
  keysTheMappingWrites,
  parseCompiled,
  probeRow,
  resolve,
  type StoredToken,
  themeKeys,
  varsThroughRafters,
} from './theme-probe.js';

const { Given, When, Then } = createBdd();

const HERE = fileURLToPath(new URL('.', import.meta.url));
const FIXTURE_9295C300 = join(HERE, '../fixtures/init-9295c300');
const TYPOGRAPHY_SOURCES = join(HERE, '../../../ui/src/components/typography');
const TOKENS_DIR = '.rafters/tokens';
const RAFTERS_CSS = '.rafters/output/rafters.css';

interface StoredFile {
  tokens: Array<StoredToken & { userOverride?: unknown; category?: string }>;
}

const local: {
  probed: ThemeMappingRow[];
  failures: string[];
  fixture: Map<string, string>;
  docSheet: CompiledSheet | null;
  docClasses: string[];
} = { probed: [], failures: [], fixture: new Map(), docSheet: null, docClasses: [] };

/** Every quoted string in a step's text, in order. */
function quoted(text: string): string[] {
  return [...text.matchAll(/"([^"]*)"/g)].map((m) => m[1] ?? '');
}

async function tokenFiles(root: string): Promise<Map<string, StoredFile>> {
  const files = new Map<string, StoredFile>();
  for (const entry of await readdir(join(root, TOKENS_DIR))) {
    if (!entry.endsWith('.rafters.json')) continue;
    const parsed = JSON.parse(await readFile(join(root, TOKENS_DIR, entry), 'utf8')) as StoredFile;
    files.set(entry, parsed);
  }
  return files;
}

async function storedTokens(): Promise<Array<StoredToken & { userOverride?: unknown }>> {
  return [...(await tokenFiles(context.fixturePath)).values()].flatMap((f) => f.tokens);
}

/** Set stored tokens' values in `.rafters/tokens`, wherever each lives. */
async function setStored(values: ReadonlyMap<string, string>): Promise<void> {
  const remaining = new Set(values.keys());
  for (const [entry, file] of await tokenFiles(context.fixturePath)) {
    let changed = false;
    for (const token of file.tokens) {
      const value = values.get(token.name);
      if (value === undefined) continue;
      token.value = value;
      remaining.delete(token.name);
      changed = true;
    }
    if (changed) {
      await writeFile(join(context.fixturePath, TOKENS_DIR, entry), JSON.stringify(file, null, 2));
    }
  }
  expect([...remaining], 'tokens not in .rafters/tokens').toEqual([]);
}

async function rebuild(): Promise<void> {
  const result = await execRafters(context.fixturePath, ['init', '--rebuild', '--agent']);
  expect(result.exitCode, result.stderr).toBe(0);
}

async function buildWith(utilities: readonly string[]): Promise<CompiledSheet> {
  return parseCompiled(await buildRaftersCss(utilities.map((u) => `@source inline("${u}");`)));
}

async function raftersCss(): Promise<string> {
  return readFile(join(context.fixturePath, RAFTERS_CSS), 'utf8');
}

function storedValue(tokens: readonly StoredToken[], name: string): string {
  const value = tokens.find((t) => t.name === name)?.value;
  if (typeof value !== 'string') throw new Error(`no stored string value for ${name}`);
  return value;
}

/** Resolve `utility`'s `property` declaration; fails the step when it has none. */
function resolved(sheet: CompiledSheet, utility: string, property: string, inDark = false) {
  const found = declarationOf(sheet, utility, property);
  if (!found) throw new Error(`${utility} has no ${property} declaration`);
  return resolve(sheet, found.declaration.value, { ...found.scope, inDark });
}

// Probing rows

When(
  /^every (.+) rows? of the exporter's theme mapping (?:is|are) probed$/,
  async ({}, groups: string) => {
    const wanted = new Set(quoted(groups));
    const rows = THEME_MAPPING.filter((row) => wanted.has(row.group));
    expect(rows.length, `rows for ${groups}`).toBeGreaterThan(0);
    local.probed = rows;
    local.failures = [];
    for (const row of rows) {
      await setStored(new Map(row.probes.map((p) => [p.token, row.probeValue])));
      await rebuild();
      const sheet = await buildWith(row.probes.map((p) => p.utility));
      local.failures.push(...probeRow(row, sheet));
    }
  },
);

Then(
  /^each probe utility's declaration resolves through var\(--rafters-<the row's token>\) to the row's probe value$/,
  async () => {
    expect(local.failures).toEqual([]);
  },
);

Then(
  /^each probe utility's rule sits in a media or container query whose condition contains the row's probe value$/,
  async () => {
    expect(local.failures).toEqual([]);
  },
);

Then(/^the probe utilities include (.+)$/, async ({}, list: string) => {
  const utilities = new Set(local.probed.flatMap((row) => row.probes.map((p) => p.utility)));
  for (const utility of quoted(list)) expect(utilities.has(utility), utility).toBe(true);
});

Then(
  /^"text-4xl"'s line-height follows line-height-4xl and its letter-spacing follows letter-spacing-4xl$/,
  async () => {
    await setStored(
      new Map([
        ['line-height-4xl', '1.33'],
        ['letter-spacing-4xl', '-0.033em'],
      ]),
    );
    await rebuild();
    const sheet = await buildWith(['text-4xl']);
    for (const [property, token, value] of [
      ['line-height', 'line-height-4xl', '1.33'],
      ['letter-spacing', 'letter-spacing-4xl', '-0.033em'],
    ] as const) {
      const r = resolved(sheet, 'text-4xl', property);
      expect(r.chain, property).toContain(`--rafters-${token}`);
      expect(r.text, property).toBe(value);
    }
  },
);

Then(
  /^the "([^"]+)" rule has exactly one ([\w-]+) declaration$/,
  async ({}, utility: string, property: string) => {
    const rules = parseCompiled(builtCss()).rules.get(utility) ?? [];
    const count = rules.flat().filter((d) => d.property === property).length;
    expect(count).toBe(1);
  },
);

Then(/^rafters\.css holds no "([^"]+)" rule$/, async ({}, text: string) => {
  expect(await raftersCss()).not.toContain(text);
});

// The table is the only source of theme keys

Then(
  /^every theme key rafters\.css declares, outside the colour and motion namespaces and the other group, is one the exporter's theme mapping writes for a token in \.rafters\/tokens$/,
  async () => {
    const tokens = await storedTokens();
    const written = keysTheMappingWrites(THEME_MAPPING, tokens);
    const mappedGroups = new Set<string>(THEME_MAPPING.map((row) => row.group));
    const outside = new Set(
      tokens
        .filter((t) => t.namespace === 'motion' || !mappedGroups.has(t.namespace))
        .filter((t) => t.namespace !== 'color' && t.namespace !== 'semantic')
        .map((t) => `--${t.name}`),
    );
    // The motion namespaces' Tailwind-facing keys (bridges and animations).
    const motionKey = /^--(transition-duration|transition-delay|ease|animate)-/;
    const unexplained = themeKeys(await raftersCss()).filter(
      (key) =>
        !key.startsWith('--color-') &&
        !outside.has(key) &&
        !motionKey.test(key) &&
        !written.has(key),
    );
    expect(unexplained).toEqual([]);
  },
);

Then(/^every row of the exporter's theme mapping names at least one probe utility$/, async () => {
  for (const row of THEME_MAPPING) expect(row.probes.length, row.token.source).toBeGreaterThan(0);
});

// Dark siblings

Given(
  /^\.rafters\/tokens declares "([^"]+)" in the (\w+) namespace with the value "([^"]+)"$/,
  async ({}, name: string, namespace: string, value: string) => {
    const path = join(context.fixturePath, TOKENS_DIR, `${namespace}.rafters.json`);
    const file = JSON.parse(await readFile(path, 'utf8')) as StoredFile;
    file.tokens.push({ name, value, namespace, category: namespace, userOverride: null });
    await writeFile(path, JSON.stringify(file, null, 2));
  },
);

When(
  /^rafters\.css is built by Tailwind with (.+) as its only source$/,
  async ({}, list: string) => {
    await buildWith(quoted(list));
  },
);

Then(
  /^rafters\.css's :root sets (--[\w-]+) to "([^"]+)"$/,
  async ({}, property: string, value: string) => {
    expect(parseCompiled(await raftersCss()).root.get(property)).toBe(value);
  },
);

Then(/^rafters\.css declares no "([^"]+)" theme key$/, async ({}, key: string) => {
  expect(themeKeys(await raftersCss())).not.toContain(key);
});

Then(
  /^for an element inside a \.dark element that is not :root, the "([^"]+)" rule's ([\w-]+) resolves to "([^"]+)"$/,
  async ({}, utility: string, property: string, value: string) => {
    expect(resolved(parseCompiled(builtCss()), utility, property, true).text).toBe(value);
  },
);

Then(/^outside \.dark it resolves to the stored value of "([^"]+)"$/, async ({}, name: string) => {
  const sheet = parseCompiled(builtCss());
  const stored = resolve(sheet, storedValue(await storedTokens(), name)).text;
  expect(resolved(sheet, name, '--tw-shadow').text).toBe(stored);
});

// Typography compiles from its own source

When(/^rafters\.css is built by Tailwind scanning only Typography's source files$/, async () => {
  await buildRaftersCss([`@source "${TYPOGRAPHY_SOURCES}";`]);
});

/** A variant's default classes with no overrides, less the ones its colour produces. */
function defaultClasses(variant: TypographyVariant): string[] {
  return resolveTypography(variant, { color: '' }).split(' ').filter(Boolean);
}

Then(
  /^every class resolveTypography returns for (.+) with no overrides has a rule in the output, apart from the classes its color dimension produces$/,
  async ({}, list: string) => {
    const sheet = parseCompiled(builtCss());
    for (const variant of quoted(list) as TypographyVariant[]) {
      const colour = new Set(resolveTypography(variant).split(' '));
      for (const cls of defaultClasses(variant)) colour.delete(cls);
      expect(
        [...colour].every((c) => c.startsWith('text-')),
        `${variant} colour`,
      ).toBe(true);
      for (const cls of defaultClasses(variant)) {
        expect(sheet.rules.has(cls), `${variant}: ${cls}`).toBe(true);
      }
    }
  },
);

Then(/^the output has a rule for "([^"]+)"$/, async ({}, cls: string) => {
  expect(parseCompiled(builtCss()).rules.has(cls), cls).toBe(true);
});

/** Each of a variant's default declarations of `property` outside a query. */
function defaultDeclarations(sheet: CompiledSheet, variant: TypographyVariant, property: string) {
  return defaultClasses(variant).flatMap((cls) => {
    const found = declarationOf(sheet, cls, property);
    return found && found.declaration.conditions.length === 0 ? [found] : [];
  });
}

Then(
  /^(\w+)'s (.+) each resolve through a --rafters- property$/,
  async ({}, variant: string, list: string) => {
    const sheet = parseCompiled(builtCss());
    const properties = list.split(/, | and /);
    for (const property of properties) {
      const found = defaultDeclarations(sheet, variant as TypographyVariant, property);
      expect(found.length, `${variant} ${property}`).toBeGreaterThan(0);
      for (const { declaration, scope } of found) {
        const { chain } = resolve(sheet, declaration.value, scope);
        expect(
          chain.some((n) => n.startsWith('--rafters-')),
          `${variant} ${property}`,
        ).toBe(true);
      }
    }
  },
);

Then(
  /^(\w+)'s ([\w-]+) resolves through var\((--[\w-]+)\)$/,
  async ({}, variant: string, property: string, through: string) => {
    const sheet = parseCompiled(builtCss());
    const found = defaultDeclarations(sheet, variant as TypographyVariant, property);
    expect(found.length, `${variant} ${property}`).toBeGreaterThan(0);
    for (const { declaration, scope } of found) {
      expect(resolve(sheet, declaration.value, scope).chain).toContain(through);
    }
  },
);

Then(
  /^resolveTypography returns "([^"]+)" for (\w+)="([^"]+)"$/,
  async ({}, cls: string, prop: string, value: string) => {
    expect(resolveTypography('p', { [prop]: value }).split(' ')).toContain(cls);
  },
);

Then(
  /^resolveTypography returns no "([^"]+)" class for "(\w+)" with (\w+)="([^"]+)"$/,
  async ({}, prefix: string, variant: string, prop: string, value: string) => {
    expect(tokenPropsToClasses({ [prop]: value })).toBe('');
    const classes = resolveTypography(variant as TypographyVariant, { [prop]: value }).split(' ');
    expect(classes.filter((c) => c.startsWith(prefix))).toEqual([]);
  },
);

// Article styles

Then(
  /^every var\(\) in the article base layer, other than --tw-\*, resolves through a --rafters- property$/,
  async () => {
    const sheet = parseCompiled(builtCss());
    expect(sheet.article.length).toBeGreaterThan(0);
    expect(varsThroughRafters(sheet, sheet.article, 'article')).toEqual([]);
  },
);

// A project initialised at 9295c300

Given(
  /^a project whose \.rafters directory is the checked-in fixture written by "rafters init --agent" at 9295c300, with "([^"]+)" set to "([^"]+)" under a userOverride$/,
  async ({}, name: string, value: string) => {
    context.fixturePath = await createFixture('nextjs-shadcn-v4');
    await cp(FIXTURE_9295C300, join(context.fixturePath, '.rafters'), { recursive: true });
    local.fixture = new Map();
    for (const [entry, file] of await tokenFiles(context.fixturePath)) {
      for (const token of file.tokens) {
        local.fixture.set(
          `${entry}#${token.name}`,
          JSON.stringify([token.value, token.userOverride]),
        );
      }
    }
    const token = (await storedTokens()).find((t) => t.name === name);
    expect(token?.value).toBe(value);
    expect(token?.userOverride).toBeTruthy();
  },
);

Then(
  /^every token outside the motion namespace holds the value and userOverride the fixture stored$/,
  async () => {
    const now = new Map<string, string>();
    for (const [entry, file] of await tokenFiles(context.fixturePath)) {
      for (const token of file.tokens) {
        now.set(`${entry}#${token.name}`, JSON.stringify([token.value, token.userOverride]));
      }
    }
    for (const [key, stored] of local.fixture) {
      if (key.startsWith('motion.rafters.json#')) continue;
      expect(now.get(key), key).toBe(stored);
    }
  },
);

Then(
  /^the "([^"]+)" rule's ([\w-]+) resolves through var\((--[\w-]+)\) to "([^"]+)"$/,
  async ({}, utility: string, property: string, through: string, value: string) => {
    const r = resolved(parseCompiled(builtCss()), utility, property);
    expect(r.chain).toContain(through);
    expect(r.text).toBe(value);
  },
);

Then(
  /^the "([^"]+)" rule's ([\w-]+) resolves through var\(--rafters-([\w-]+)\) to the fixture's stored value$/,
  async ({}, utility: string, property: string, token: string) => {
    const sheet = parseCompiled(builtCss());
    const r = resolved(sheet, utility, property);
    expect(r.chain).toContain(`--rafters-${token}`);
    expect(r.text).toBe(resolve(sheet, storedValue(await storedTokens(), token)).text);
  },
);

Then(
  /^"tracking-tight" resolves to "([^"]+)", "leading-none" to "([^"]+)" and "leading-7" to the fixture's spacing-7$/,
  async ({}, tracking: string, none: string) => {
    const sheet = parseCompiled(builtCss());
    expect(resolved(sheet, 'tracking-tight', 'letter-spacing').text).toBe(tracking);
    expect(resolved(sheet, 'leading-none', 'line-height').text).toBe(none);
    const spacing7 = resolve(sheet, storedValue(await storedTokens(), 'spacing-7')).text;
    expect(resolved(sheet, 'leading-7', 'line-height').text).toBe(spacing7);
  },
);

// The documentation sheet

Given(/^the project's config enables the documentation export$/, async () => {
  const path = join(context.fixturePath, '.rafters', 'config.rafters.json');
  const config = JSON.parse(await readFile(path, 'utf8')) as { exports: Record<string, boolean> };
  config.exports.documentation = true;
  await writeFile(path, JSON.stringify(config, null, 2));
});

Then(/^rafters\.documentation\.css has a rule for each of (.+)$/, async ({}, list: string) => {
  const doc = await readFile(
    join(context.fixturePath, '.rafters/output/rafters.documentation.css'),
    'utf8',
  );
  local.docSheet = parseCompiled(doc);
  local.docClasses = quoted(list);
  for (const cls of local.docClasses) expect(local.docSheet.rules.has(cls), cls).toBe(true);
});

Then(/^each of those rules resolves through a --rafters- property$/, async () => {
  const sheet = local.docSheet;
  if (!sheet) throw new Error('no documentation sheet read');
  for (const cls of local.docClasses) {
    expect(varsThroughRafters(sheet, sheet.rules.get(cls) ?? [], cls)).toEqual([]);
  }
});
