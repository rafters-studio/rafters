/**
 * Step definitions for #2829 (FR-RAF-FILL-003): a component's surface comes
 * from its fill, then its variant, then its base; the fill is exactly one
 * bg-fill-* token; fill v2 is gone.
 *
 * The measured list is the plane parts: the root for a plane component, the
 * content panel for an
 * overlay. Controls whose colours carry state (Switch, Slider, Tabs, Checkbox,
 * Toggle and similar) take no fill. Each entry renders through the classes
 * projection that the React and Astro performances of that part both read.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { alertDialogClasses } from '../../../ui/src/components/alert-dialog/alert-dialog.classes.js';
import { alertClasses } from '../../../ui/src/components/alert/alert.classes.js';
import { badgeClasses } from '../../../ui/src/components/badge/badge.classes.js';
import { buttonClasses } from '../../../ui/src/components/button/button.classes.js';
import { cardClasses } from '../../../ui/src/components/card/card.classes.js';
import { comboboxClasses } from '../../../ui/src/components/combobox/combobox.classes.js';
import { commandClasses } from '../../../ui/src/components/command/command.classes.js';
import { containerClasses } from '../../../ui/src/components/container/container.classes.js';
import { contextMenuClasses } from '../../../ui/src/components/context-menu/context-menu.classes.js';
import { datePickerClasses } from '../../../ui/src/components/date-picker/date-picker.classes.js';
import { dialogClasses } from '../../../ui/src/components/dialog/dialog.classes.js';
import { drawerClasses } from '../../../ui/src/components/drawer/drawer.classes.js';
import { dropdownMenuClasses } from '../../../ui/src/components/dropdown-menu/dropdown-menu.classes.js';
import { hoverCardClasses } from '../../../ui/src/components/hover-card/hover-card.classes.js';
import { imageClasses } from '../../../ui/src/components/image/image.classes.js';
import { kbdClasses } from '../../../ui/src/components/kbd/kbd.classes.js';
import { menubarClasses } from '../../../ui/src/components/menubar/menubar.classes.js';
import { navigationMenuClasses } from '../../../ui/src/components/navigation-menu/navigation-menu.classes.js';
import { popoverClasses } from '../../../ui/src/components/popover/popover.classes.js';
import { selectClasses } from '../../../ui/src/components/select/select.classes.js';
import { sheetContentClasses } from '../../../ui/src/components/sheet/sheet.classes.js';
import { sidebarPanelClasses } from '../../../ui/src/components/sidebar/sidebar.classes.js';
import { skeletonClasses } from '../../../ui/src/components/skeleton/skeleton.classes.js';
import {
  COLOR,
  resolveTypography,
  tokenPropsToClasses,
} from '../../../ui/src/components/typography/typography.classes.js';
import { context } from './common.steps.js';
import { createFixture } from '../fixtures/projects.js';
import { execRafters } from './helpers.js';
import { buildRaftersCss, builtCss } from './import.steps.js';
import { parseCompiled } from './theme-probe.js';

const { Given, When, Then } = createBdd();

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '../../../..');
const UI = join(REPO, 'packages/ui');
const TYPOGRAPHY_SOURCES = join(UI, 'src/components/typography');
const FILL = 'bg-fill-glass';

interface Rendered {
  classes: string[];
  warnings: string[];
}

/** Render with console.warn captured: classy reports a dropped fill there. */
function capture(render: () => string): Rendered {
  const warnings: string[] = [];
  const original = console.warn;
  console.warn = (...args: unknown[]) => {
    warnings.push(args.map(String).join(' '));
  };
  try {
    return { classes: render().split(/\s+/).filter(Boolean), warnings };
  } finally {
    console.warn = original;
  }
}

export interface RenderProps {
  fill?: string;
  variant?: string;
  surface?: string;
}

export interface PlaneEntry {
  /** The plane part, as the component names it. */
  part: string;
  render: (props: RenderProps) => string;
  /** The surface classes with neither fill nor variant. */
  base: string[];
  /** A non-default variant and its surface classes, for a component that has variants. */
  variant?: { name: string; surface: string[] };
}

const words = (s: string) => s.split(' ');
const POPOVER = words('bg-popover text-popover-foreground');
const disclosed = { open: false };

/** The measured list (#2829): every plane part that takes a fill. */
export const MEASURED: Record<string, PlaneEntry> = {
  alert: {
    part: 'Alert (root)',
    render: ({ fill, variant, surface }) =>
      alertClasses({ fill, surface, variant: variant as 'destructive' | undefined }, {}).root,
    base: words('bg-primary-subtle text-primary-subtle-foreground border-primary-border'),
    variant: {
      name: 'destructive',
      surface: words(
        'bg-destructive-subtle text-destructive-subtle-foreground border-destructive-border',
      ),
    },
  },
  badge: {
    part: 'Badge (root)',
    render: ({ fill, variant, surface }) =>
      badgeClasses({ fill, surface, variant: variant as 'destructive' | undefined }, {}).root,
    base: words('bg-primary text-primary-foreground'),
    variant: { name: 'destructive', surface: words('bg-destructive text-destructive-foreground') },
  },
  button: {
    part: 'Button (root)',
    render: ({ fill, variant, surface }) =>
      buttonClasses(
        {
          fill,
          // Button's performances pass surface only when no variant is given.
          surface: variant === undefined ? surface : undefined,
          variant: (variant ?? 'default') as 'default' | 'destructive',
          size: 'default',
        },
        { pressed: false },
      ).root,
    base: words(
      'bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-active',
    ),
    variant: {
      name: 'destructive',
      surface: words(
        'bg-destructive text-destructive-foreground hover:bg-destructive-hover active:bg-destructive-active',
      ),
    },
  },
  card: {
    part: 'Card (root)',
    render: ({ fill, surface }) => cardClasses({ fill, surface }, {}).root,
    base: ['bg-surface-card'],
  },
  container: {
    part: 'Container (root)',
    render: ({ fill, surface }) => containerClasses({ fill, surface }, {}).root,
    base: [],
  },
  image: {
    part: 'Image (frame)',
    render: ({ fill, surface }) => imageClasses({ fill, surface }, {}).frame,
    base: [],
  },
  kbd: {
    part: 'Kbd (root)',
    render: ({ fill, surface }) => kbdClasses({ fill, surface }, {}).root,
    base: words('border-border bg-muted text-muted-foreground'),
  },
  skeleton: {
    part: 'Skeleton (root)',
    render: ({ fill, surface }) => skeletonClasses({ fill, surface }, {}).root,
    base: words('bg-muted'),
  },
  sidebar: {
    part: 'Sidebar (panel)',
    render: ({ fill, surface }) => sidebarPanelClasses('left', 'sidebar', fill, surface),
    base: ['bg-surface-sidebar'],
  },
  command: {
    part: 'Command (root)',
    render: ({ fill, surface }) =>
      commandClasses({ fill, surface }, { query: '', activeIndex: -1 } as never).root,
    base: POPOVER,
  },
  'alert-dialog': {
    part: 'AlertDialogContent',
    render: ({ fill, surface }) => alertDialogClasses({ fill, surface }, disclosed).content,
    base: ['bg-surface-card'],
  },
  dialog: {
    part: 'DialogContent',
    render: ({ fill, surface }) => dialogClasses({ fill, surface }, disclosed).content,
    base: ['bg-surface-card'],
  },
  sheet: {
    part: 'SheetContent',
    render: ({ fill, surface }) => sheetContentClasses('right', fill, surface),
    base: words('bg-background border-card-border'),
  },
  drawer: {
    part: 'DrawerContent',
    render: ({ fill, surface }) => drawerClasses({ fill, surface }, disclosed).content,
    base: words('bg-background text-foreground border-card-border'),
  },
  popover: {
    part: 'PopoverContent',
    render: ({ fill, surface }) => popoverClasses({ fill, surface }, disclosed).content,
    base: POPOVER,
  },
  'hover-card': {
    part: 'HoverCardContent',
    render: ({ fill, surface }) => hoverCardClasses({ fill, surface }, disclosed).content,
    base: POPOVER,
  },
  select: {
    part: 'SelectContent',
    render: ({ fill, surface }) => selectClasses({ fill, surface }, {} as never).content,
    base: POPOVER,
  },
  'dropdown-menu': {
    part: 'DropdownMenuContent',
    render: ({ fill, surface }) => dropdownMenuClasses({ fill, surface }, disclosed).content,
    base: POPOVER,
  },
  'context-menu': {
    part: 'ContextMenuContent',
    render: ({ fill, surface }) =>
      contextMenuClasses({ fill, surface }, { open: false, x: 0, y: 0 }).content,
    base: POPOVER,
  },
  menubar: {
    part: 'MenubarContent',
    render: ({ fill, surface }) => menubarClasses({ fill, surface }, {} as never).content,
    base: POPOVER,
  },
  combobox: {
    part: 'ComboboxContent',
    render: ({ fill, surface }) => comboboxClasses({ fill, surface }, {} as never).content,
    base: POPOVER,
  },
  'date-picker': {
    part: 'DatePicker (content)',
    render: ({ fill, surface }) => datePickerClasses({ fill, surface }, {} as never).content,
    base: POPOVER,
  },
  'navigation-menu': {
    part: 'NavigationMenuContent',
    render: ({ fill, surface }) => navigationMenuClasses({ fill, surface }, {} as never).content,
    base: POPOVER,
  },
};

const local: {
  surface: 'fill' | 'variant' | 'base';
  rendered: Map<string, Rendered>;
  single: Rendered;
  button: Rendered;
  fill: string;
} = {
  surface: 'base',
  rendered: new Map(),
  single: { classes: [], warnings: [] },
  button: { classes: [], warnings: [] },
  fill: '',
};

// Criterion 1

Given('each surface-bearing component in the measured list', async () => {
  expect(Object.keys(MEASURED).length).toBeGreaterThan(0);
  // Each listed component's React and Astro performances declare the prop.
  for (const name of Object.keys(MEASURED)) {
    for (const ext of ['tsx', 'astro']) {
      const file = join(UI, 'src/components', name, `${name}.${ext}`);
      expect(readFileSync(file, 'utf8'), `${name}.${ext} declares fill`).toMatch(
        /\bfill\?: string/,
      );
    }
  }
});

When(
  /^it renders with (a fill and a variant|a variant and no fill|neither fill nor variant)$/,
  async ({}, props: string) => {
    local.surface =
      props === 'a fill and a variant'
        ? 'fill'
        : props === 'a variant and no fill'
          ? 'variant'
          : 'base';
    local.rendered = new Map();
    for (const [name, entry] of Object.entries(MEASURED)) {
      const variant = entry.variant?.name;
      const input: RenderProps =
        local.surface === 'fill'
          ? { fill: FILL, ...(variant && { variant }) }
          : local.surface === 'variant'
            ? { ...(variant && { variant }) }
            : {};
      local.rendered.set(
        name,
        capture(() => entry.render(input)),
      );
    }
  },
);

Then(
  /^its root element carries (the fill's|the variant's|its base) surface classes and no other surface classes$/,
  async ({}, _surface: string) => {
    for (const [name, entry] of Object.entries(MEASURED)) {
      const { classes, warnings } = local.rendered.get(name) ?? { classes: [], warnings: [] };
      const label = `${entry.part}`;
      expect(warnings, label).toEqual([]);
      const variantSurface = entry.variant?.surface ?? [];
      const all = new Set([...entry.base, ...variantSurface]);
      const expected =
        local.surface === 'fill'
          ? [FILL]
          : local.surface === 'variant' && entry.variant
            ? variantSurface
            : entry.base;
      for (const cls of expected) expect(classes, `${label} carries ${cls}`).toContain(cls);
      for (const cls of all) {
        if (expected.includes(cls)) continue;
        expect(classes, `${label} carries no ${cls}`).not.toContain(cls);
      }
      if (local.surface !== 'fill') {
        expect(
          classes.filter((c) => c.startsWith('bg-fill-')),
          label,
        ).toEqual([]);
      }
    }
  },
);

// Criterion 2: Card

/** Card's root, through the projection its React and Astro performances render. */
function renderCard(fill: string): Rendered {
  return capture(() => cardClasses({ fill }, {}).root);
}

/** Button's root, through the projection its React and Astro performances render. */
function renderButton(fill: string): Rendered {
  return capture(
    () => buttonClasses({ fill, variant: 'default', size: 'default' }, { pressed: false }).root,
  );
}

Given('a surface-bearing component', async () => {
  local.single = { classes: [], warnings: [] };
});

When(/^it renders with fill="([^"]*)"$/, async ({}, fill: string) => {
  local.fill = fill;
  local.single = renderCard(fill);
  local.button = renderButton(fill);
});

Then(/^its root element's class list carries "([^"]+)" unchanged$/, async ({}, cls: string) => {
  expect(local.single.classes).toContain(cls);
  expect(local.single.classes).not.toContain('bg-surface-card');
});

Then('no warning is given', async () => {
  expect(local.single.warnings).toEqual([]);
});

Then(
  /^its root element's class list carries nothing from "([^"]+)"$/,
  async ({}, value: string) => {
    for (const piece of value.split(/\s+/)) {
      expect(local.single.classes, piece).not.toContain(piece);
    }
    // The base surface stands.
    expect(local.single.classes).toContain('bg-surface-card');
  },
);

Then('a warning names the dropped value', async () => {
  expect(local.single.warnings.length).toBe(1);
  expect(local.single.warnings[0]).toContain(`'${local.fill}'`);
});

// Criterion 3: a glass Button

const BUTTON_VARIANT = {
  surface: words('bg-primary text-primary-foreground'),
  states: words('hover:bg-primary-hover active:bg-primary-active'),
  structure: words(
    'inline-grid rounded-md cursor-pointer h-11 px-4 scale-100 extent-press focus-visible:ring-2 focus-visible:ring-primary-ring',
  ),
  otherStates: words(
    'active:scale-(--rafters-consumed-extent) active:duration-micro active:ease-spring-snappy disabled:opacity-50 aria-busy:cursor-progress',
  ),
};

Given('a Button with a variant whose surface has hover and active colour states', async () => {
  const resting = renderButton('');
  for (const cls of [...BUTTON_VARIANT.surface, ...BUTTON_VARIANT.states]) {
    expect(resting.classes, cls).toContain(cls);
  }
});

Then(
  "its root element carries none of the variant's background, foreground or border classes",
  async () => {
    const glass = local.button;
    expect(glass.warnings).toEqual([]);
    expect(glass.classes).toContain(FILL);
    for (const cls of BUTTON_VARIANT.surface) expect(glass.classes, cls).not.toContain(cls);
  },
);

Then("none of the variant's hover: or active: colour classes", async () => {
  for (const cls of BUTTON_VARIANT.states) expect(local.button.classes, cls).not.toContain(cls);
});

Then("it keeps the variant's structure classes and its other state classes", async () => {
  for (const cls of [...BUTTON_VARIANT.structure, ...BUTTON_VARIANT.otherStates]) {
    expect(local.button.classes, cls).toContain(cls);
  }
});

// Criterion 4

Then(
  /^packages\/ui\/src\/primitives\/fill-resolver\.ts, packages\/shared\/src\/fill-signature\.ts and apps\/demo\/src\/lib\/primitives\/fill-resolver\.ts do not exist$/,
  async () => {
    for (const path of [
      'packages/ui/src/primitives/fill-resolver.ts',
      'packages/shared/src/fill-signature.ts',
      'apps/demo/src/lib/primitives/fill-resolver.ts',
    ]) {
      expect(existsSync(join(REPO, path)), path).toBe(false);
    }
  },
);

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) out.push(...sourceFiles(path));
    else if (/\.(ts|tsx|astro)$/.test(entry)) out.push(path);
  }
  return out;
}

/** Code lines only: comment lines may name a pattern without using it. */
function codeLines(file: string): string[] {
  return readFileSync(file, 'utf8')
    .split('\n')
    .filter((line) => !/^\s*(\/\/|\/\*|\*)/.test(line));
}

const FRAGMENT_CLASS =
  /(^|[^a-z-])(bg|text|border|from|via|to|ring|fill|stroke|outline|shadow|decoration|caret)-\$\{|['"`](bg|text|border|from|via|to|fill|stroke)-['"`]\s*\+/;
const DATA_FILL = /data-fill(?![a-z-])/;

Then(
  'no component source builds a class from fragments or renders a data-fill attribute',
  async () => {
    const files = [
      ...sourceFiles(join(UI, 'src/components')),
      ...sourceFiles(join(REPO, 'apps/demo/src/components/ui')),
    ];
    expect(files.length).toBeGreaterThan(100);
    const found: string[] = [];
    for (const file of files) {
      for (const line of codeLines(file)) {
        if (FRAGMENT_CLASS.test(line) || DATA_FILL.test(line))
          found.push(`${file}: ${line.trim()}`);
      }
    }
    expect(found).toEqual([]);
  },
);

Then("the colour namer's invariant tests pass", async () => {
  const out = execFileSync(
    'pnpm',
    ['exec', 'vitest', 'run', 'test/naming.test.ts', '-t', 'Reserved hyphen segments'],
    { cwd: join(REPO, 'packages/color-utils'), encoding: 'utf8' },
  );
  expect(out).toMatch(/2 passed/);
});

// Criterion 5

Given("Typography's color prop resolves through a literal map of text colour classes", async () => {
  const entries = Object.entries(COLOR);
  expect(entries.length).toBeGreaterThan(0);
  for (const [, cls] of entries) expect(cls).toMatch(/^text-[a-z]+(-[a-z]+)*$/);
});

When(
  "Typography's own source is the only scanned source and is compiled with real Tailwind",
  async () => {
    context.fixturePath = await createFixture('nextjs-shadcn-v4');
    const result = await execRafters(context.fixturePath, ['init', '--agent']);
    expect(result.exitCode, result.stderr).toBe(0);
    await buildRaftersCss([`@source "${TYPOGRAPHY_SOURCES}";`]);
  },
);

Then('every class in the map has a rule', async () => {
  const sheet = parseCompiled(builtCss());
  for (const cls of Object.values(COLOR)) expect(sheet.rules.has(cls), cls).toBe(true);
});

Then('Typography renders each color value with its class', async () => {
  for (const [value, cls] of Object.entries(COLOR)) {
    expect(tokenPropsToClasses({ color: value })).toBe(cls);
    expect(resolveTypography('p', { color: value }).split(' '), value).toContain(cls);
  }
});
