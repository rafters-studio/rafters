/**
 * Step definitions for #2830 (FR-RAF-FILL-004): every existing surface is a
 * fill named bg-surface-<name> whose parts reference that surface's tokens,
 * and every surface-bearing component takes a surface prop.
 *
 * The measured surface list (current choice, 2026-10-23, revisable): every
 * semantic default X with an X-foreground pair (background pairs with
 * foreground), minus the state names (-hover, -active, -focus, -disabled,
 * -selected, -invalid, -valid) and any name whose bg-surface-* is already a
 * colour utility. It is written out here so the generator is checked against
 * it, not against itself.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_SEMANTIC_COLOR_MAPPINGS } from '@rafters/design-tokens';
import { expect, type Page } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { SURFACE_CLASSES } from '../../../ui/src/primitives/classy.js';
import { createFixture } from '../fixtures/projects.js';
import { context } from './common.steps.js';
import { MEASURED } from './fill-prop.steps.js';
import { execRafters } from './helpers.js';
import { buildRaftersCss, builtCss } from './import.steps.js';
import { rebuild } from './theme.steps.js';

const { Given, When, Then } = createBdd();

const HERE = dirname(fileURLToPath(import.meta.url));
const UI = join(HERE, '../../../ui');
const BASELINE = join(HERE, '../fixtures/surface-readers.before.json');

const SURFACES = [
  'background',
  'card',
  'panel',
  'popover',
  'surface',
  'primary',
  'primary-subtle',
  'secondary',
  'secondary-subtle',
  'muted',
  'accent',
  'accent-subtle',
  'destructive',
  'destructive-subtle',
  'success',
  'success-subtle',
  'warning',
  'warning-subtle',
  'info',
  'info-subtle',
  'alert',
  'alert-subtle',
  'highlight',
  'input',
  'selection',
  'sidebar',
  'sidebar-primary',
  'sidebar-accent',
  'sidebar-item',
  'nav',
  'table',
  'table-header',
  'tooltip',
  'overlay',
  'code',
  'badge',
  'avatar',
] as const;

const SEMANTIC = new Set(Object.keys(DEFAULT_SEMANTIC_COLOR_MAPPINGS));
const foregroundOf = (name: string) =>
  name === 'background' ? 'foreground' : `${name}-foreground`;
const borderOf = (name: string) => (SEMANTIC.has(`${name}-border`) ? `${name}-border` : undefined);

/** A surface fill's value as generated: references to that surface's own tokens. */
function generated(name: string): unknown {
  const border = borderOf(name);
  return {
    background: { color: { token: name } },
    foreground: { token: foregroundOf(name) },
    ...(border && { border: { token: border } }),
  };
}

/** Today's surface classes for a surface. */
function stockClasses(name: string): string {
  const border = borderOf(name);
  return [`bg-${name}`, `text-${foregroundOf(name)}`, border && `border-${border}`]
    .filter(Boolean)
    .join(' ');
}

interface StoredToken {
  name: string;
  value: unknown;
  userOverride?: unknown;
  [key: string]: unknown;
}

const tokensDir = () => join(context.fixturePath, '.rafters', 'tokens');
const fillFile = () => join(tokensDir(), 'fill.rafters.json');

async function readTokens(
  file: string,
): Promise<{ tokens: StoredToken[] } & Record<string, unknown>> {
  return JSON.parse(await readFile(file, 'utf8')) as { tokens: StoredToken[] };
}

async function surfaceTokens(): Promise<StoredToken[]> {
  return (await readTokens(fillFile())).tokens.filter((t) => t.name.startsWith('surface-'));
}

const PROPERTIES = ['background-color', 'color', 'border-top-color'] as const;
type Measured = Record<string, string>;

/** Each element id's computed surface properties, in light and under a root .dark. */
async function measureModes(
  page: Page,
  body: string,
  ids: readonly string[],
): Promise<Record<'light' | 'dark', Record<string, Measured>>> {
  const out: Record<'light' | 'dark', Record<string, Measured>> = { light: {}, dark: {} };
  for (const mode of ['light', 'dark'] as const) {
    await page.setContent(
      `<!doctype html><html${mode === 'dark' ? ' class="dark"' : ''}><head><style>${builtCss()}</style></head><body>${body}</body></html>`,
    );
    for (const id of ids) {
      out[mode][id] = (await page.locator(`#${id}`).evaluate((el, props) => {
        const style = getComputedStyle(el);
        return Object.fromEntries(props.map((p) => [p, style.getPropertyValue(p)]));
      }, PROPERTIES)) as Measured;
    }
  }
  return out;
}

/** Compile with today's surface classes in scope and check every fill against them. */
async function expectFillsMatchStock(
  page: Page,
): Promise<Record<'light' | 'dark', Record<string, Measured>>> {
  await buildRaftersCss([`@source inline("${SURFACES.map(stockClasses).join(' ')} border");`]);
  const body = SURFACES.map(
    (name, i) =>
      `<div id="f${i}" class="bg-surface-${name} border">x</div>` +
      `<div id="s${i}" class="${stockClasses(name)} border">x</div>` +
      `<div class="dark"><div id="fd${i}" class="bg-surface-${name} border">x</div>` +
      `<div id="sd${i}" class="${stockClasses(name)} border">x</div></div>`,
  ).join('');
  const ids = SURFACES.flatMap((_, i) => [`f${i}`, `s${i}`, `fd${i}`, `sd${i}`]);
  const measured = await measureModes(page, body, ids);
  for (const mode of ['light', 'dark'] as const) {
    for (const [i, name] of SURFACES.entries()) {
      expect(measured[mode][`f${i}`], `${name} (${mode})`).toEqual(measured[mode][`s${i}`]);
      expect(measured[mode][`fd${i}`], `${name} in a .dark subtree (${mode})`).toEqual(
        measured[mode][`sd${i}`],
      );
    }
  }
  return measured;
}

const local: {
  fillsBefore: StoredToken[];
  designed: StoredToken | undefined;
  otherFiles: Map<string, unknown>;
  rendered: Map<string, string[]>;
} = { fillsBefore: [], designed: undefined, otherFiles: new Map(), rendered: new Map() };

async function initProject(): Promise<void> {
  context.fixturePath = await createFixture('nextjs-shadcn-v4');
  const result = await execRafters(context.fixturePath, ['init', '--agent']);
  expect(result.exitCode, result.stderr).toBe(0);
}

/** Replace surface-card's references with a designer recipe, recorded in its userOverride. */
function designerCard(original: StoredToken): StoredToken {
  return {
    ...original,
    value: {
      background: { color: { family: 'zinc', position: '700' } },
      foreground: { family: 'zinc', position: '50' },
    },
    userOverride: { previousValue: original.value, reason: 'brand card recipe' },
  };
}

// Givens

Given('a freshly initialised project', async () => {
  await initProject();
});

Given(
  "an initialised project in which a designer has replaced a surface fill's references with a recipe, recorded in its userOverride",
  async () => {
    await initProject();
    const file = await readTokens(fillFile());
    file.tokens = file.tokens.map((t) => {
      if (t.name !== 'surface-card') return t;
      local.designed = designerCard(t);
      return local.designed;
    });
    expect(local.designed).toBeDefined();
    await writeFile(fillFile(), JSON.stringify(file, null, 2));
  },
);

Given(
  'an initialised project whose fill.rafters.json holds no surface fill but one overridden by a designer',
  async () => {
    await initProject();
    const file = await readTokens(fillFile());
    const card = file.tokens.find((t) => t.name === 'surface-card');
    if (!card) throw new Error('init wrote no surface-card');
    local.designed = designerCard(card);
    file.tokens = [local.designed];
    await writeFile(fillFile(), JSON.stringify(file, null, 2));
    // Motion is regenerated on every rebuild (#2208); every other file must stay.
    local.otherFiles = new Map();
    for (const entry of readdirSync(tokensDir())) {
      if (entry === 'fill.rafters.json' || entry === 'motion.rafters.json') continue;
      local.otherFiles.set(entry, readFileSync(join(tokensDir(), entry), 'utf8'));
    }
  },
);

Given('each surface-bearing component in the list measured for #2829', async () => {
  expect(Object.keys(MEASURED).length).toBeGreaterThan(0);
  for (const name of Object.keys(MEASURED)) {
    for (const ext of ['tsx', 'astro']) {
      const file = join(UI, 'src/components', name, `${name}.${ext}`);
      expect(readFileSync(file, 'utf8'), `${name}.${ext} declares surface`).toMatch(
        /\bsurface\?: string/,
      );
    }
  }
});

// Whens

When(
  'a role that surfaces depend on changes and rafters.css is exported and compiled with real Tailwind',
  async () => {
    local.fillsBefore = await surfaceTokens();
    // The neutral role takes another family; every neutral surface follows it.
    const colours = await readTokens(join(tokensDir(), 'color.rafters.json'));
    const family = colours.tokens.find(
      (t) =>
        t.name !== 'zinc' && typeof t.value === 'object' && t.value !== null && 'scale' in t.value,
    );
    if (!family) throw new Error('no second colour family');
    const semanticPath = join(tokensDir(), 'semantic.rafters.json');
    const semantic = await readTokens(semanticPath);
    const neutral = semantic.tokens.find((t) => t.name === 'neutral');
    const binding = neutral?.binding as { input?: { familyName?: string } } | undefined;
    if (!binding?.input?.familyName) throw new Error('neutral has no family binding');
    binding.input.familyName = family.name;
    await writeFile(semanticPath, JSON.stringify(semantic, null, 2));
    await rebuild();
  },
);

When("it renders with its surface prop set to a surface's name", async () => {
  local.rendered = new Map();
  for (const [component, entry] of Object.entries(MEASURED)) {
    for (const surface of SURFACES) {
      local.rendered.set(
        `${component}/${surface}`,
        entry.render({ surface }).split(/\s+/).filter(Boolean),
      );
    }
  }
});

// Thens

Then(
  "every surface in the semantic defaults has a bg-surface- fill whose parts reference that surface's tokens",
  async () => {
    for (const name of SURFACES) {
      expect(SEMANTIC.has(name) && SEMANTIC.has(foregroundOf(name)), name).toBe(true);
    }
    const surfaces = await surfaceTokens();
    expect(surfaces.map((t) => t.name).sort()).toEqual(SURFACES.map((n) => `surface-${n}`).sort());
    for (const token of surfaces) {
      expect(token.value, token.name).toEqual(generated(token.name.replace(/^surface-/, '')));
      expect(token.userOverride, token.name).toBeNull();
    }
    // The surface prop's literal map names the same surfaces.
    expect(Object.keys(SURFACE_CLASSES).sort()).toEqual([...SURFACES].sort());
    const css = await readFile(join(context.fixturePath, '.rafters/output/rafters.css'), 'utf8');
    for (const name of SURFACES) expect(css, name).toContain(`@utility bg-surface-${name} {`);
    expect(css).not.toContain('bg-fill-surface-');
  },
);

Then(
  "an element with each bg-surface- fill computes the same background, foreground and border as today's surface classes, in light and in dark",
  async ({ page }) => {
    const measured = await expectFillsMatchStock(page);
    // Surfaces flip under a root .dark.
    const card = SURFACES.indexOf('card');
    expect(measured.dark[`f${card}`]).not.toEqual(measured.light[`f${card}`]);
  },
);

Then('every dependent bg-surface- fill computes the new value', async ({ page }) => {
  const measured = await expectFillsMatchStock(page);
  const baseline = JSON.parse(readFileSync(BASELINE, 'utf8')) as Record<
    'light' | 'dark',
    Record<string, string>
  >;
  const card = SURFACES.indexOf('card');
  expect(measured.light[`f${card}`]?.['background-color']).not.toBe(baseline.light['bg-card']);
  expect(measured.dark[`f${card}`]?.['background-color']).not.toBe(baseline.dark['bg-card']);
});

Then('every surface fill still holds the same references, with nothing regenerated', async () => {
  expect(await surfaceTokens()).toEqual(local.fillsBefore);
});

Then("that surface fill still holds the designer's recipe and its userOverride", async () => {
  const card = (await surfaceTokens()).find((t) => t.name === 'surface-card');
  expect(card).toEqual(local.designed);
});

Then('fill.rafters.json holds every surface fill, each missing one as generated', async () => {
  const surfaces = await surfaceTokens();
  expect(surfaces.map((t) => t.name).sort()).toEqual(SURFACES.map((n) => `surface-${n}`).sort());
  for (const token of surfaces) {
    if (token.name === 'surface-card') continue;
    expect(token.value, token.name).toEqual(generated(token.name.replace(/^surface-/, '')));
    expect(token.userOverride, token.name).toBeNull();
  }
});

Then('no other token file changed', async () => {
  expect(local.otherFiles.size).toBeGreaterThan(0);
  for (const [entry, before] of local.otherFiles) {
    expect(readFileSync(join(tokensDir(), entry), 'utf8'), entry).toBe(before);
  }
});

Then("its root element carries that surface's literal bg-surface- class", async () => {
  for (const [component, entry] of Object.entries(MEASURED)) {
    for (const surface of SURFACES) {
      const classes = local.rendered.get(`${component}/${surface}`) ?? [];
      const label = `${entry.part} surface="${surface}"`;
      expect(classes, label).toContain(`bg-surface-${surface}`);
      for (const cls of entry.base) {
        if (cls !== `bg-surface-${surface}`) expect(classes, label).not.toContain(cls);
      }
    }
    // An explicit variant beats surface; a fill beats both.
    if (entry.variant) {
      const variant = entry.render({ surface: 'card', variant: entry.variant.name }).split(/\s+/);
      for (const cls of entry.variant.surface) expect(variant, entry.part).toContain(cls);
      expect(variant, entry.part).not.toContain('bg-surface-card');
    }
    const filled = entry.render({ surface: 'card', fill: 'bg-fill-glass' }).split(/\s+/);
    expect(filled, entry.part).toContain('bg-fill-glass');
    expect(filled, entry.part).not.toContain('bg-surface-card');
  }
});

Then(
  'bg-card and every text-*-foreground class compute the same values as before this change, in light and in dark',
  async ({ page }) => {
    // Measured on 0fb96e9a, the commit before this change, from a fresh init.
    const baseline = JSON.parse(readFileSync(BASELINE, 'utf8')) as Record<
      'light' | 'dark',
      Record<string, string>
    >;
    const readers = Object.keys(baseline.light);
    expect(readers).toContain('bg-card');
    expect(readers.filter((r) => r.endsWith('-foreground')).length).toBeGreaterThan(40);
    await buildRaftersCss([`@source inline("${readers.join(' ')}");`]);
    const body = readers.map((cls, i) => `<div id="r${i}" class="${cls}">x</div>`).join('');
    const measured = await measureModes(
      page,
      body,
      readers.map((_, i) => `r${i}`),
    );
    for (const mode of ['light', 'dark'] as const) {
      for (const [i, cls] of readers.entries()) {
        const property = cls === 'bg-card' ? 'background-color' : 'color';
        expect(measured[mode][`r${i}`]?.[property], `${cls} (${mode})`).toBe(baseline[mode][cls]);
      }
    }
  },
);
