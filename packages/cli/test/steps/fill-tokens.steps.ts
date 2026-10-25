/**
 * Step definitions for fill tokens (#2827, FR-RAF-FILL-001): the fill
 * namespace, its recipe schema, its naming rules and its survival across
 * `rafters init --rebuild`.
 */

import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  loadRegistryFromDir,
  REGISTRY_PLUGINS,
  saveRegistryToDir,
  TokenRegistry,
} from '@rafters/design-tokens';
import {
  ColorReferenceSchema,
  ColorValueSchema,
  type FillValue,
  FillValueSchema,
  type Token,
  TokenSchema,
} from '@rafters/shared';
import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { z } from 'zod';
import { createFixture } from '../fixtures/projects.js';
import { context } from './common.steps.js';
import { execRafters } from './helpers.js';

const { Given, When, Then, After } = createBdd();

const FIXTURE_TOKENS = join(
  dirname(fileURLToPath(import.meta.url)),
  '../fixtures/init-9295c300/tokens',
);
const LITERAL = 'oklch(0.6 0.1 240)';
const ZINC_900 = { family: 'zinc', position: '900' };

/** A recipe that sets every part FR-RAF-FILL-001 names. */
const EVERY_PART: FillValue = {
  background: { color: { token: 'card' }, alpha: 80 },
  gradient: {
    type: 'linear',
    direction: 'to-br',
    angle: 45,
    from: { color: { token: 'primary' }, alpha: 90, position: 0 },
    via: { color: { family: 'zinc', position: '500' }, alpha: 50, position: 50 },
    to: { color: { token: 'accent' }, alpha: 10, position: 100 },
    interpolation: 'oklch',
  },
  mask: { type: 'b', from: 20, to: 100 },
  backdrop: { blur: 'md', brightness: 110, contrast: 95, saturate: 150, grayscale: 0, opacity: 90 },
  blend: 'multiply',
  foreground: { token: 'card-foreground' },
  border: { token: 'border' },
  dark: {
    background: { color: { family: 'zinc', position: '800' }, alpha: 70 },
    foreground: { family: 'zinc', position: '50' },
  },
};

const STATE_BLOCK = {
  background: { color: { token: 'accent' } },
  foreground: { token: 'accent-foreground' },
  border: { family: 'zinc', position: '300' },
  dark: { background: { color: { family: 'zinc', position: '700' } } },
};

/** Where the literal goes, and the field path the error must name. */
const LITERAL_FIELDS: Record<string, { path: string; recipe: unknown }> = {
  'background colour': {
    path: 'background.color',
    recipe: { foreground: ZINC_900, background: { color: LITERAL } },
  },
  'gradient stop colour': {
    path: 'gradient.via.color',
    recipe: { foreground: ZINC_900, gradient: { type: 'linear', via: { color: LITERAL } } },
  },
  'foreground colour': { path: 'foreground', recipe: { foreground: LITERAL } },
  'border colour': { path: 'border', recipe: { foreground: ZINC_900, border: '#ff0000' } },
  'colour in the dark block': {
    path: 'dark.background.color',
    recipe: { foreground: ZINC_900, dark: { background: { color: { l: 0.5, c: 0.1, h: 240 } } } },
  },
  'colour in a state block': {
    path: 'hover.foreground',
    recipe: { foreground: ZINC_900, hover: { foreground: 'white' } },
  },
};

const local: {
  recipe: unknown;
  readBack: unknown;
  error: Error | null;
  expected: string;
  dir: string;
  files: Map<string, unknown[]>;
  resolved: { role: Record<Mode, unknown>; family: Record<Mode, unknown> } | null;
} = {
  recipe: null,
  readBack: null,
  error: null,
  expected: '',
  dir: '',
  files: new Map(),
  resolved: null,
};

type Mode = 'light' | 'dark';

After(async () => {
  if (local.dir) rmSync(local.dir, { recursive: true, force: true });
  local.dir = '';
  local.error = null;
  local.resolved = null;
});

function fillToken(name: string, value: unknown, userOverride: unknown = null): unknown {
  return { name, value, category: 'fill', namespace: 'fill', userOverride };
}

function tokensDir(): string {
  return join(context.fixturePath, '.rafters', 'tokens');
}

function capture(fn: () => void): void {
  try {
    fn();
  } catch (error) {
    local.error = error instanceof Error ? error : new Error(String(error));
  }
}

function roundTrip(): void {
  const parsed = FillValueSchema.parse(local.recipe);
  local.dir = mkdtempSync(join(tmpdir(), 'rafters-fill-'));
  saveRegistryToDir(local.dir, new TokenRegistry([fillToken('fill-glass', parsed)]));
  expect(readdirSync(local.dir)).toContain('fill.rafters.json');
  local.readBack = loadRegistryFromDir(local.dir).get('fill-glass')?.value;
}

/**
 * A colour reference in one mode, through the registry: a token reference
 * reads its token, or in dark mode the token's dark counterpart
 * (`dependsOn[1]`); a family position is the step itself.
 */
function resolveColour(registry: TokenRegistry, ref: unknown, mode: Mode): unknown {
  if (typeof ref === 'object' && ref !== null && 'token' in ref && typeof ref.token === 'string') {
    const token = registry.get(ref.token);
    const darkName = token?.dependsOn?.[1];
    const target = mode === 'dark' && darkName ? registry.get(darkName) : token;
    if (!target) throw new Error(`No token for ${ref.token} in ${mode} mode`);
    return target.value;
  }
  return ColorReferenceSchema.parse(ref);
}

// Givens

Given('a fill whose recipe sets every part FR-RAF-FILL-001 names', async () => {
  local.recipe = EVERY_PART;
});

Given(
  'a fill with a {word} block of the same parts, which has its own dark block',
  async ({}, state: string) => {
    local.recipe = { foreground: ZINC_900, [state]: STATE_BLOCK };
  },
);

Given(
  /^a fill recipe whose (.+) is a literal colour, not a registry reference$/,
  async ({}, field: string) => {
    const entry = LITERAL_FIELDS[field];
    if (!entry) throw new Error(`No literal case for "${field}"`);
    local.recipe = entry.recipe;
    local.expected = entry.path;
  },
);

Given(
  'an initialised project whose .rafters\\/tokens\\/fill.rafters.json holds a fill with a userOverride',
  async () => {
    context.fixturePath = await createFixture('nextjs-shadcn-v4');
    const result = await execRafters(context.fixturePath, ['init', '--agent']);
    expect(result.exitCode, result.stderr).toBe(0);
    const token = fillToken('fill-glass', EVERY_PART, {
      previousValue: { foreground: ZINC_900 },
      reason: 'frosted card for the hero',
      kind: 'designer',
    });
    local.files.set('fill', [token]);
    writeFileSync(
      join(tokensDir(), 'fill.rafters.json'),
      JSON.stringify({ namespace: 'fill', tokens: [token] }, null, 2),
    );
  },
);

Given('the token files rafters init wrote for every namespace before this change', async () => {
  local.files = new Map();
  for (const entry of readdirSync(FIXTURE_TOKENS)) {
    const raw = JSON.parse(readFileSync(join(FIXTURE_TOKENS, entry), 'utf8')) as {
      tokens: unknown[];
    };
    local.files.set(entry, raw.tokens);
  }
  expect(local.files.size).toBeGreaterThan(0);
});

Given(
  'a fill with no dark block, one part referencing a role and one part referencing a family position',
  async () => {
    context.fixturePath = await createFixture('nextjs-shadcn-v4');
    const result = await execRafters(context.fixturePath, ['init', '--agent']);
    expect(result.exitCode, result.stderr).toBe(0);
    local.recipe = { background: { color: { token: 'card' } }, foreground: ZINC_900 };
  },
);

// Whens

When(
  /^it is parsed with FillValueSchema, written to (?:\.rafters\/tokens\/)?fill\.rafters\.json and read back$/,
  async () => {
    roundTrip();
  },
);

When('it is parsed with FillValueSchema', async () => {
  capture(() => FillValueSchema.parse(local.recipe));
});

When(/^a fill is defined whose name is (.+)$/, async ({}, which: string) => {
  const registry = loadRegistryFromDir(tokensDir(), REGISTRY_PLUGINS);
  const colour = registry.list({ namespace: 'color' })[0]?.name;
  if (!colour) throw new Error('The initialised project has no colour');
  const names: Record<string, [string, string]> = {
    'equal to an existing colour': [`fill-${colour}`, colour],
    'on the exclude list of bg-* names': ['fill-cover', 'bg-cover'],
    'not lowercase kebab-case': ['fill-Frosted_Glass', 'kebab-case'],
  };
  const entry = names[which];
  if (!entry) throw new Error(`No name case for "${which}"`);
  local.expected = entry[1];
  capture(() => registry.define(fillToken(entry[0], { foreground: ZINC_900 })));
});

When(
  'a colour whose name begins with {string} is added to the registry',
  async ({}, prefix: string) => {
    const registry = loadRegistryFromDir(tokensDir(), REGISTRY_PLUGINS);
    const family = registry.list({ namespace: 'color' }).find((t) => typeof t.value === 'object');
    if (!family) throw new Error('The initialised project has no colour family');
    local.expected = prefix;
    capture(() => registry.define({ ...family, name: `${prefix}sky` }));
  },
);

When('each is parsed with the token schema after this change', async () => {
  // Nothing to do here: the Then steps parse each token both ways.
});

When('its parts are resolved through the registry in light mode and in dark mode', async () => {
  const registry = loadRegistryFromDir(tokensDir(), REGISTRY_PLUGINS);
  registry.define(fillToken('fill-card-glass', local.recipe));
  const value = FillValueSchema.parse(registry.get('fill-card-glass')?.value);
  const role = value.background?.color;
  const at = (ref: unknown): Record<Mode, unknown> => ({
    light: resolveColour(registry, ref, 'light'),
    dark: resolveColour(registry, ref, 'dark'),
  });
  local.resolved = { role: at(role), family: at(value.foreground) };
});

// Thens

Then('the value read back equals the value written', async () => {
  expect(local.readBack).toEqual(local.recipe);
});

Then('it is rejected', async () => {
  expect(local.error).not.toBeNull();
});

Then(/^the error names the (?:background|gradient|foreground|border|colour).*$/, async () => {
  expect(local.error).toBeInstanceOf(z.ZodError);
  const paths =
    local.error instanceof z.ZodError ? local.error.issues.map((i) => i.path.join('.')) : [];
  expect(paths).toContain(local.expected);
});

Then('the error names the conflict', async () => {
  expect(local.error?.message).toContain(local.expected);
});

Then('the error names the reserved prefix', async () => {
  expect(local.error?.message).toContain(local.expected);
});

Then('fill.rafters.json holds the same fill with the same userOverride', async () => {
  const raw = JSON.parse(readFileSync(join(tokensDir(), 'fill.rafters.json'), 'utf8')) as {
    tokens: unknown[];
  };
  // The rebuild adds the surface fills the project lacked (FR-RAF-FILL-004).
  const designed = raw.tokens.filter(
    (t) =>
      !(
        typeof t === 'object' &&
        t !== null &&
        'name' in t &&
        String(t.name).startsWith('surface-')
      ),
  );
  expect(designed).toEqual(local.files.get('fill'));
});

Then('each parses', async () => {
  for (const [file, tokens] of local.files) {
    for (const token of tokens) {
      expect(TokenSchema.safeParse(token).success, `${file}`).toBe(true);
    }
  }
  expect(() => loadRegistryFromDir(FIXTURE_TOKENS, REGISTRY_PLUGINS)).not.toThrow();
});

Then('its tokens equal what they were before', async () => {
  // The token schema as it stood before fills joined its value unions.
  const before = z.union([z.string(), ColorValueSchema, ColorReferenceSchema]);
  const override = TokenSchema.shape.userOverride.unwrap();
  const Before = TokenSchema.extend({
    value: before,
    computedValue: before.optional(),
    userOverride: override.extend({ previousValue: before }).nullable(),
  });
  for (const tokens of local.files.values()) {
    for (const token of tokens) {
      const after: Token = TokenSchema.parse(token);
      expect(after).toEqual(Before.parse(token));
    }
  }
});

Then(
  "the role part takes the role's light value in light mode and its dark value in dark mode",
  async () => {
    const registry = loadRegistryFromDir(tokensDir(), REGISTRY_PLUGINS);
    expect(local.resolved?.role.light).toEqual(registry.get('card')?.value);
    expect(local.resolved?.role.dark).toEqual(registry.get('card--dark')?.value);
    expect(local.resolved?.role.light).not.toEqual(local.resolved?.role.dark);
  },
);

Then('the family-position part has the same value in both modes', async () => {
  expect(local.resolved?.family.light).toEqual(ZINC_900);
  expect(local.resolved?.family.dark).toEqual(ZINC_900);
});
