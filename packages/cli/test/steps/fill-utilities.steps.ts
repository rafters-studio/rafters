/**
 * Step definitions for #2828 (FR-RAF-FILL-002): each fill reaches rafters.css
 * as a bg-fill-* utility built from stock Tailwind classes, measured in a real
 * browser against the stock class list it stands for.
 */

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { THEME_MAPPING, type ThemeMappingRow } from '@rafters/design-tokens';
import type { FillValue } from '@rafters/shared';
import { expect, type Page } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { createFixture } from '../fixtures/projects.js';
import { context } from './common.steps.js';
import { execRafters } from './helpers.js';
import { buildRaftersCss, builtCss, run } from './import.steps.js';
import { rebuild, setStored } from './theme.steps.js';
import { parseCompiled, probeRow, resolve, rowLabel, type CompiledSheet } from './theme-probe.js';

const { Given, When, Then } = createBdd();

const HERE = dirname(fileURLToPath(import.meta.url));
const UI_SOURCES = join(HERE, '../../../ui/src');
const TOKENS_DIR = '.rafters/tokens';
const OUTPUT_DIR = '.rafters/output';

const FG = { family: 'zinc', position: '900' } as const;
const zinc = (position: string) => ({ family: 'zinc', position }) as const;

/** The properties a fill can set, as the browser computes them. */
const PROPERTIES = [
  'background-color',
  'background-image',
  'background-blend-mode',
  'mask-image',
  'mask-composite',
  'backdrop-filter',
  'color',
  'border-top-color',
] as const;

/** Each recipe part alone (with the foreground every recipe needs) and its stock class list. */
const PARTS: Record<string, { recipe: FillValue; stock: string }> = {
  'background colour with alpha': {
    recipe: { foreground: FG, background: { color: { token: 'primary' }, alpha: 60 } },
    stock: 'text-zinc-900 bg-primary/60',
  },
  'linear gradient with from, via and to stops and positions': {
    recipe: {
      foreground: FG,
      gradient: {
        type: 'linear',
        direction: 'to-br',
        from: { color: { token: 'primary' }, position: 10 },
        via: { color: zinc('500'), alpha: 50, position: 50 },
        to: { color: { token: 'accent' }, position: 90 },
      },
    },
    stock:
      'text-zinc-900 bg-linear-to-br from-primary from-10% via-zinc-500/50 via-50% to-accent to-90%',
  },
  'radial gradient with stops and positions': {
    recipe: {
      foreground: FG,
      gradient: {
        type: 'radial',
        from: { color: zinc('200'), position: 0 },
        to: { color: zinc('800'), position: 100 },
      },
    },
    stock: 'text-zinc-900 bg-radial from-zinc-200 from-0% to-zinc-800 to-100%',
  },
  'conic gradient with stops and positions': {
    recipe: {
      foreground: FG,
      gradient: {
        type: 'conic',
        angle: 45,
        from: { color: { token: 'primary' }, position: 20 },
        to: { color: { token: 'accent' }, position: 80 },
      },
    },
    stock: 'text-zinc-900 bg-conic-45 from-primary from-20% to-accent to-80%',
  },
  'linear mask': {
    recipe: { foreground: FG, mask: { type: 'linear', from: 20, to: 90 } },
    stock: 'text-zinc-900 mask-linear-from-20% mask-linear-to-90%',
  },
  'radial mask': {
    recipe: { foreground: FG, mask: { type: 'radial', from: 30, to: 70 } },
    stock: 'text-zinc-900 mask-radial-from-30% mask-radial-to-70%',
  },
  'conic mask': {
    recipe: { foreground: FG, mask: { type: 'conic', from: 10, to: 60 } },
    stock: 'text-zinc-900 mask-conic-from-10% mask-conic-to-60%',
  },
  'per-side mask': {
    recipe: { foreground: FG, mask: { type: 'b', from: 10, to: 80 } },
    stock: 'text-zinc-900 mask-b-from-10% mask-b-to-80%',
  },
  'backdrop blur': {
    recipe: { foreground: FG, backdrop: { blur: 'md' } },
    stock: 'text-zinc-900 backdrop-blur-md',
  },
  'backdrop brightness': {
    recipe: { foreground: FG, backdrop: { brightness: 110 } },
    stock: 'text-zinc-900 backdrop-brightness-110',
  },
  'backdrop contrast': {
    recipe: { foreground: FG, backdrop: { contrast: 95 } },
    stock: 'text-zinc-900 backdrop-contrast-95',
  },
  'backdrop saturate': {
    recipe: { foreground: FG, backdrop: { saturate: 150 } },
    stock: 'text-zinc-900 backdrop-saturate-150',
  },
  'backdrop grayscale': {
    recipe: { foreground: FG, backdrop: { grayscale: 50 } },
    stock: 'text-zinc-900 backdrop-grayscale-50',
  },
  'backdrop opacity': {
    recipe: { foreground: FG, backdrop: { opacity: 90 } },
    stock: 'text-zinc-900 backdrop-opacity-90',
  },
  'background blend mode': {
    recipe: { foreground: FG, blend: 'multiply' },
    stock: 'text-zinc-900 bg-blend-multiply',
  },
  foreground: {
    recipe: { foreground: { token: 'card-foreground' } },
    stock: 'text-card-foreground',
  },
  border: {
    recipe: { foreground: FG, border: { token: 'border' } },
    stock: 'text-zinc-900 border-border',
  },
};

/** Fills that between them set every recipe part, in every block. */
const EVERY_PART_FILLS: Record<string, FillValue> = {
  glass: {
    background: { color: { token: 'card' }, alpha: 80 },
    gradient: {
      type: 'linear',
      direction: 'to-br',
      angle: 45,
      from: { color: { token: 'primary' }, alpha: 90, position: 0 },
      via: { color: zinc('500'), alpha: 50, position: 12.5 },
      to: { color: { token: 'accent' }, alpha: 10, position: 100 },
      interpolation: 'oklch',
    },
    mask: { type: 'b', from: 20, to: 87.5 },
    backdrop: {
      blur: 'md',
      brightness: 110,
      contrast: 95,
      saturate: 1.5,
      grayscale: 0,
      opacity: 90,
    },
    blend: 'multiply',
    foreground: { token: 'card-foreground' },
    border: { token: 'border' },
    dark: { background: { color: zinc('800'), alpha: 70 }, foreground: zinc('50') },
    hover: {
      background: { color: { token: 'accent' } },
      dark: { background: { color: zinc('700') } },
    },
    active: { foreground: { token: 'accent-foreground' }, dark: { border: zinc('300') } },
    focus: { border: { token: 'ring' }, dark: { foreground: zinc('100') } },
    disabled: { blend: 'luminosity', dark: { backdrop: { blur: 'none' } } },
  },
  radial: {
    foreground: FG,
    gradient: { type: 'radial', from: { color: zinc('100') }, to: { color: zinc('900') } },
    mask: { type: 'radial', from: 30 },
  },
  conic: {
    foreground: FG,
    gradient: { type: 'conic', angle: -12.5, from: { color: zinc('100') } },
    mask: { type: 'conic', to: 60 },
  },
  angled: {
    foreground: FG,
    gradient: { type: 'linear', angle: 30, from: { color: zinc('200') } },
    mask: { type: 'linear', from: 5, to: 95 },
  },
  plain: {
    foreground: FG,
    gradient: { type: 'linear', to: { color: zinc('300') } },
    mask: { type: 'x', from: 10 },
  },
};

const local: {
  fills: Record<string, FillValue>;
  /** `@source` lines the compile adds to rafters.css. */
  sources: string[];
  /** Stock class lists to compare against, by fill name. */
  stock: Record<string, string>;
  state: string;
  failures: string[];
} = { fills: {}, sources: [], stock: {}, state: '', failures: [] };

function fillRow(): ThemeMappingRow {
  const row = THEME_MAPPING.find((r) => r.group === 'fill');
  if (!row) throw new Error('THEME_MAPPING has no fill row');
  return row;
}

async function initProject(): Promise<void> {
  context.fixturePath = await createFixture('nextjs-shadcn-v4');
  const result = await execRafters(context.fixturePath, ['init', '--agent']);
  expect(result.exitCode, result.stderr).toBe(0);
}

/** Initialise a project and store these fills in its fill.rafters.json. */
async function projectWithFills(fills: Record<string, FillValue>): Promise<void> {
  await initProject();
  local.fills = fills;
  local.sources = [];
  local.stock = {};
  const tokens = Object.entries(fills).map(([name, value]) => ({
    name: `fill-${name}`,
    value,
    category: 'fill',
    namespace: 'fill',
    userOverride: null,
  }));
  await writeFile(
    join(context.fixturePath, TOKENS_DIR, 'fill.rafters.json'),
    JSON.stringify({ namespace: 'fill', tokens }, null, 2),
  );
}

function inline(classes: string): string {
  return `@source inline("${classes}");`;
}

async function raftersCss(): Promise<string> {
  return readFile(join(context.fixturePath, OUTPUT_DIR, 'rafters.css'), 'utf8');
}

/** Each bg-fill- utility in rafters.css and the classes its @apply names. */
async function appliedClasses(): Promise<Map<string, string[]>> {
  const out = new Map<string, string[]>();
  for (const m of (await raftersCss()).matchAll(
    /@utility (bg-fill-[\w-]+) \{\s*@apply ([^;]+);/g,
  )) {
    out.set(m[1] ?? '', (m[2] ?? '').trim().split(/\s+/));
  }
  return out;
}

type Measured = Record<(typeof PROPERTIES)[number], string>;

/** Load the last compiled sheet and `body` into the page. */
async function load(page: Page, body: string, rootDark = false): Promise<void> {
  await page.setContent(
    `<!doctype html><html${rootDark ? ' class="dark"' : ''}><head><style>${builtCss()}</style></head><body>${body}</body></html>`,
  );
}

async function measure(page: Page, id: string): Promise<Measured> {
  return page.locator(`#${id}`).evaluate((el, props) => {
    const style = getComputedStyle(el);
    return Object.fromEntries(props.map((p) => [p, style.getPropertyValue(p)]));
  }, PROPERTIES) as Promise<Measured>;
}

/** Measure each element id with the page in light and with `.dark` on the root. */
async function measureModes(
  page: Page,
  body: string,
  ids: readonly string[],
): Promise<{ light: Record<string, Measured>; dark: Record<string, Measured> }> {
  const read = async (): Promise<Record<string, Measured>> =>
    Object.fromEntries(await Promise.all(ids.map(async (id) => [id, await measure(page, id)])));
  await load(page, body);
  const light = await read();
  await load(page, body, true);
  return { light, dark: await read() };
}

// Givens

Given(
  /^an initialised project with a fill whose recipe sets only its (.+)$/,
  async ({}, part: string) => {
    const entry = PARTS[part];
    if (!entry) throw new Error(`No recipe for "${part}"`);
    await projectWithFills({ part: entry.recipe });
    local.stock = { part: entry.stock };
    local.sources = [inline(entry.stock)];
  },
);

Given(
  'an initialised project with a fill that has a dark block, and a fill with no dark block whose parts reference family positions',
  async () => {
    await projectWithFills({
      flip: {
        background: { color: zinc('200') },
        foreground: zinc('900'),
        dark: { background: { color: zinc('800') }, foreground: zinc('50') },
      },
      hold: { background: { color: zinc('300') }, foreground: zinc('700') },
    });
    local.stock = {
      light: 'bg-zinc-200 text-zinc-900',
      dark: 'bg-zinc-800 text-zinc-50',
      hold: 'bg-zinc-300 text-zinc-700',
    };
    local.sources = Object.values(local.stock).map(inline);
  },
);

Given(
  'an initialised project whose only scanned source is one element with the bg-fill- utility of a fill that has a gradient and a mask',
  async () => {
    await projectWithFills({
      fade: {
        foreground: FG,
        gradient: {
          type: 'linear',
          direction: 'to-r',
          from: { color: zinc('900') },
          to: { color: zinc('100') },
        },
        mask: { type: 'b', from: 20, to: 100 },
      },
    });
    await writeFile(join(context.fixturePath, 'page.html'), '<div class="bg-fill-fade"></div>\n');
    local.sources = ['@source "./page.html";'];
  },
);

Given('an initialised project with a fill that references a colour', async () => {
  const probe = fillRow().probes[0];
  if (!probe) throw new Error('the fill row has no probe');
  const [family, position] = [probe.token.replace(/-\d+$/, ''), probe.token.replace(/^.*-/, '')];
  await projectWithFills({
    [probe.utility.replace(/^bg-fill-/, '')]: {
      foreground: FG,
      background: { color: { family, position } },
    },
  });
});

Given('the fill row of the theme mapping contract is broken', async () => {
  const probe = fillRow().probes[0];
  if (!probe) throw new Error('the fill row has no probe');
  await projectWithFills({
    [probe.utility.replace(/^bg-fill-/, '')]: {
      foreground: FG,
      background: { color: zinc('500') },
    },
  });
});

Given('an initialised project with fills that together set every recipe part', async () => {
  await projectWithFills(EVERY_PART_FILLS);
});

Given('an initialised project with fills', async () => {
  await projectWithFills(EVERY_PART_FILLS);
  const path = join(context.fixturePath, '.rafters', 'config.rafters.json');
  const config = JSON.parse(await readFile(path, 'utf8')) as { exports: Record<string, boolean> };
  config.exports.dtcg = true;
  await writeFile(path, JSON.stringify(config, null, 2));
});

Given(
  /^an initialised project with a fill that has a (\w+) block with its own dark block$/,
  async ({}, state: string) => {
    await projectWithFills({
      stateful: {
        background: { color: zinc('200') },
        foreground: FG,
        [state]: {
          background: { color: zinc('400') },
          dark: { background: { color: zinc('700') } },
        },
      },
    });
    local.state = state;
  },
);

Given(
  'an initialised project with a fill whose bg-fill- utility appears in no scanned source',
  async () => {
    await projectWithFills({
      brand: { background: { color: zinc('600') }, foreground: zinc('50') },
      quiet: { background: { color: zinc('100') }, foreground: FG },
    });
  },
);

// Whens

When('rafters.css is exported and compiled with real Tailwind', async () => {
  await rebuild();
  await buildRaftersCss(local.sources);
});

When('rafters.css is exported', async () => {
  await rebuild();
});

When('the TypeScript and DTCG exports are written', async () => {
  await rebuild();
});

When(
  'that colour changes and rafters.css is exported and compiled with real Tailwind',
  async () => {
    const row = fillRow();
    await setStored(new Map(row.probes.map((p) => [p.token, row.probeValue])));
    await rebuild();
    await buildRaftersCss();
  },
);

When('the theme guard runs', async () => {
  await rebuild();
  const sheet = parseCompiled(await buildRaftersCss());
  // One break in what the row writes, one in the value its probe must reach.
  const renamed = probeRow({ ...fillRow(), utility: 'bg-paint-{1}' }, sheet);
  const revalued = probeRow({ ...fillRow(), probeValue: 'oklch(0.99 0.2 140)' }, sheet);
  expect(renamed.length, 'renamed row').toBeGreaterThan(0);
  expect(revalued.length, 'revalued row').toBeGreaterThan(0);
  local.failures = [...renamed, ...revalued];
});

// Thens

Then(
  "an element with the fill's bg-fill- utility computes the same values as an element with the equivalent stock class list",
  async ({ page }) => {
    const body = [
      `<div id="fill" class="bg-fill-part">x</div>`,
      `<div id="stock" class="${local.stock.part}">x</div>`,
      `<div class="dark"><div id="fill-sub" class="bg-fill-part">x</div>`,
      `<div id="stock-sub" class="${local.stock.part}">x</div></div>`,
    ].join('');
    const { light, dark } = await measureModes(page, body, [
      'fill',
      'stock',
      'fill-sub',
      'stock-sub',
    ]);
    for (const mode of [light, dark]) {
      expect(mode.fill).toEqual(mode.stock);
      expect(mode['fill-sub']).toEqual(mode['stock-sub']);
    }
  },
);

Then(
  'the fill with a dark block computes its dark parts under a root .dark and inside a .dark subtree, and its light parts otherwise',
  async ({ page }) => {
    const body = [
      `<div id="fill" class="bg-fill-flip">x</div>`,
      `<div class="dark"><div id="fill-sub" class="bg-fill-flip">x</div></div>`,
      `<div id="light" class="${local.stock.light}">x</div>`,
      `<div id="dark" class="${local.stock.dark}">x</div>`,
    ].join('');
    const { light, dark } = await measureModes(page, body, ['fill', 'fill-sub', 'light', 'dark']);
    expect(light.light).not.toEqual(light.dark);
    expect(light.fill).toEqual(light.light);
    expect(light['fill-sub']).toEqual(light.dark);
    expect(dark.fill).toEqual(light.dark);
    expect(dark['fill-sub']).toEqual(light.dark);
  },
);

Then(
  'the fill with no dark block computes the same values in light, under a root .dark and inside a .dark subtree',
  async ({ page }) => {
    const body = [
      `<div id="fill" class="bg-fill-hold">x</div>`,
      `<div class="dark"><div id="fill-sub" class="bg-fill-hold">x</div></div>`,
      `<div id="hold" class="${local.stock.hold}">x</div>`,
    ].join('');
    const { light, dark } = await measureModes(page, body, ['fill', 'fill-sub', 'hold']);
    for (const value of [light.fill, light['fill-sub'], dark.fill, dark['fill-sub']]) {
      expect(value).toEqual(light.hold);
    }
  },
);

Then('the element paints its gradient and its mask', async ({ page }) => {
  // No added colour family, so no other @source inline line brings in gradient or mask utilities.
  const inlines = (await raftersCss()).split('\n').filter((l) => l.startsWith('@source inline('));
  // Beside it, the line names only the surface fills, which carry no gradient or mask.
  expect(inlines).toHaveLength(1);
  const named = (inlines[0] ?? '').replace(/^@source inline\("|"\);$/g, '').split(' ');
  expect(named.filter((n) => !n.startsWith('bg-surface-'))).toEqual(['bg-fill-fade']);
  await load(page, `<div id="fade" class="bg-fill-fade" style="width:100px;height:100px">x</div>`);
  const painted = await measure(page, 'fade');
  const sheet = parseCompiled(builtCss());
  const [from, to] = ['900', '100'].map((p) => resolve(sheet, `var(--color-zinc-${p})`).text);
  expect(painted['background-image']).toBe(`linear-gradient(to right, ${from} 0%, ${to} 100%)`);
  // The bottom edge's gradient (to bottom is the default, so the browser omits it).
  expect(painted['mask-image']).toContain(
    'linear-gradient(rgb(0, 0, 0) 20%, rgba(0, 0, 0, 0) 100%)',
  );
});

Then("the fill's bg-fill- utility resolves to the changed value", async () => {
  const row = fillRow();
  expect(probeRow(row, parseCompiled(builtCss()))).toEqual([]);
  const probe = row.probes[0];
  if (!probe) throw new Error('the fill row has no probe');
  const sheet: CompiledSheet = parseCompiled(builtCss());
  const decl = sheet.rules
    .get(probe.utility)
    ?.flat()
    .find((d) => d.property === probe.property);
  expect(decl, `${probe.utility} ${probe.property}`).toBeDefined();
  expect(resolve(sheet, decl?.value ?? '').text).toBe(row.probeValue);
});

Then('it fails naming the fill row', async () => {
  expect(local.failures.length).toBeGreaterThan(0);
  for (const failure of local.failures) {
    expect(failure.startsWith(`${rowLabel(fillRow())}: `), failure).toBe(true);
  }
});

Then(
  "every class inside each bg-fill- utility's @apply is a stock Tailwind utility, and every colour in it is a registry colour",
  async () => {
    const applied = await appliedClasses();
    expect([...applied.keys()].sort()).toEqual(
      Object.keys(local.fills)
        .map((n) => `bg-fill-${n}`)
        .sort(),
    );
    const classes = [...new Set([...applied.values()].flat())];
    // Stock Tailwind with every default colour removed and only the registry's colours added:
    // a class that compiles is a stock utility, and any colour it names is a registry colour.
    const colours: string[] = [];
    for (const entry of await readdir(join(context.fixturePath, TOKENS_DIR))) {
      if (entry !== 'color.rafters.json' && entry !== 'semantic.rafters.json') continue;
      const file = JSON.parse(
        await readFile(join(context.fixturePath, TOKENS_DIR, entry), 'utf8'),
      ) as { tokens: Array<{ name: string }> };
      colours.push(...file.tokens.map((t) => t.name).filter((n) => !n.endsWith('--dark')));
    }
    const input = join(context.fixturePath, 'stock-input.css');
    const output = join(context.fixturePath, 'stock-output.css');
    await writeFile(
      input,
      [
        '@import "tailwindcss" source(none);',
        '@custom-variant dark (&:where(.dark, .dark *));',
        '@theme {',
        '  --color-*: initial;',
        ...colours.map((c) => `  --color-${c}: red;`),
        '}',
        inline(classes.join(' ')),
        '',
      ].join('\n'),
    );
    const require = createRequire(import.meta.url);
    const cli = join(dirname(require.resolve('@tailwindcss/cli/package.json')), 'dist/index.mjs');
    const result = await run([cli, '-i', input, '-o', output], context.fixturePath);
    expect(result.code, result.stderr).toBe(0);
    const rules = parseCompiled(await readFile(output, 'utf8')).rules;
    expect(classes.filter((c) => !rules.has(c))).toEqual([]);
  },
);

Then('each export carries every fill with its full recipe and its colour references', async () => {
  const ts = await readFile(join(context.fixturePath, OUTPUT_DIR, 'rafters.ts'), 'utf8');
  const dtcg = JSON.parse(
    await readFile(join(context.fixturePath, OUTPUT_DIR, 'rafters.json'), 'utf8'),
  ) as { $extensions: { rafters: { unrepresented: Record<string, { value: unknown }> } } };
  for (const [bare, recipe] of Object.entries(local.fills)) {
    const name = `fill-${bare}`;
    const line = ts.split('\n').find((l) => l.startsWith(`    '${name}': `));
    expect(line, `rafters.ts ${name}`).toBeDefined();
    const json = (line ?? '').slice(`    '${name}': `.length).replace(/,$/, '');
    expect(JSON.parse(json), `rafters.ts ${name}`).toEqual(recipe);
    expect(dtcg.$extensions.rafters.unrepresented[name]?.value, `rafters.json ${name}`).toEqual(
      recipe,
    );
  }
});

Then('no component source imports either export', async () => {
  const offenders: string[] = [];
  const walk = async (dir: string): Promise<void> => {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) await walk(path);
      else if (/\.(ts|tsx|astro|js|jsx)$/.test(entry.name)) {
        const source = await readFile(path, 'utf8');
        for (const m of source.matchAll(/(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g)) {
          if (/(^|\/)\.rafters\/|(^|\/)rafters(\.ts|\.js|\.json)?$/.test(m[1] ?? '')) {
            offenders.push(`${path}: ${m[1]}`);
          }
        }
      }
    }
  };
  await walk(UI_SOURCES);
  expect(offenders).toEqual([]);
});

/** Put the fill and its stock twin into `state`, and read each one's background colour. */
async function inState(
  page: Page,
  rootDark: boolean,
): Promise<{ fill: string; stock: string; rest: string }> {
  const variant = local.state === 'focus' ? 'focus-visible:' : `${local.state}:`;
  const stock = `bg-zinc-200 text-zinc-900 ${variant}bg-zinc-400 dark:${variant}bg-zinc-700`;
  const disabled = local.state === 'disabled' ? ' disabled' : '';
  await load(
    page,
    [
      `<button id="rest" class="bg-fill-stateful">x</button>`,
      `<button id="fill" class="bg-fill-stateful"${disabled}>x</button>`,
      `<button id="stock" class="${stock}"${disabled}>x</button>`,
    ].join(''),
    rootDark,
  );
  const read = async (id: string): Promise<string> => {
    const el = page.locator(`#${id}`);
    if (local.state === 'hover') await el.hover();
    if (local.state === 'active') {
      await el.hover();
      await page.mouse.down();
    }
    if (local.state === 'focus') {
      await el.focus();
      expect(await el.evaluate((e) => e.matches(':focus-visible'))).toBe(true);
    }
    const value = (await measure(page, id))['background-color'];
    if (local.state === 'active') await page.mouse.up();
    return value;
  };
  const rest = (await measure(page, 'rest'))['background-color'];
  return { fill: await read('fill'), stock: await read('stock'), rest };
}

Then(
  /^the fill's bg-fill- utility applies the state parts as ([\w-]+:) classes$/,
  async ({ page }, variant: string) => {
    const classes = (await appliedClasses()).get('bg-fill-stateful') ?? [];
    expect(classes).toContain(`${variant}bg-zinc-400`);
    await buildRaftersCss([
      inline(`bg-zinc-200 text-zinc-900 ${variant}bg-zinc-400 dark:${variant}bg-zinc-700`),
    ]);
    const { fill, stock, rest } = await inState(page, false);
    expect(fill).toBe(stock);
    expect(fill).not.toBe(rest);
  },
);

Then(
  /^it applies the dark state parts as ([\w-]+:) classes in dark mode$/,
  async ({ page }, variant: string) => {
    const classes = (await appliedClasses()).get('bg-fill-stateful') ?? [];
    expect(classes).toContain(`dark:${variant}bg-zinc-700`);
    const light = await inState(page, false);
    const { fill, stock, rest } = await inState(page, true);
    expect(fill).toBe(stock);
    expect(fill).not.toBe(rest);
    expect(fill).not.toBe(light.fill);
  },
);

Then('rafters.css carries one @source inline line naming every bg-fill- utility', async () => {
  const lines = (await raftersCss())
    .split('\n')
    .filter((l) => l.startsWith('@source inline(') && l.includes('bg-fill-'));
  expect(lines).toHaveLength(1);
  const named = (lines[0] ?? '').replace(/^@source inline\("|"\);$/g, '').split(' ');
  // The same line names every bg-surface- utility too (FR-RAF-FILL-004).
  expect(named.filter((n) => n.startsWith('bg-fill-')).sort()).toEqual(
    Object.keys(local.fills)
      .map((n) => `bg-fill-${n}`)
      .sort(),
  );
});

Then("an element given that fill's bg-fill- utility at runtime paints it", async ({ page }) => {
  const sheet = parseCompiled(builtCss());
  const stored = resolve(sheet, 'var(--color-zinc-600)').text;
  expect(stored).not.toBe('');
  await load(page, `<div id="reference" style="background-color: ${stored}">x</div>`);
  const name = Object.keys(local.fills)[0] ?? '';
  const painted = await page.evaluate((fill) => {
    const el = document.createElement('div');
    el.className = `bg-fill-${fill}`;
    document.body.append(el);
    return getComputedStyle(el).backgroundColor;
  }, name);
  expect(painted).toBe((await measure(page, 'reference'))['background-color']);
});
