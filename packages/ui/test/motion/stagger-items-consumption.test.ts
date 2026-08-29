/**
 * #2156: proves the five real `.classes.ts` files actually SELECT the
 * `stagger-items` utility (#2189) rather than merely claiming to in a unit
 * assertion against the class string.
 *
 * Reflection 019f97db: being inside `@theme`/`@utility` source is necessary
 * and not sufficient for a motion-token consumer -- the only real check is
 * compiling and looking at the emitted rule. This probe scans this package's
 * OWN `src/components` directory as a Tailwind v4 `@source`, so the compiled
 * sheet is produced from the literal bytes of dropdown-menu.classes.ts,
 * context-menu.classes.ts, select.classes.ts, combobox.classes.ts, and
 * command.classes.ts -- not a synthetic fixture standing in for them. The
 * generic per-position ladder itself (positions 1..12, saturation at 12) is
 * already proven against a synthetic fixture in
 * packages/design-tokens/test/exporters/stagger-items-compiled.test.ts; this
 * test's job is narrower and different: prove THESE FIVE FILES are the thing
 * that makes `.stagger-items` appear in the compiled output at all.
 */

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  contrastPlugin,
  generateBaseSystem,
  invertPlugin,
  registryToCompiled,
  scalePlugin,
  statePlugin,
  TokenRegistry,
} from '@rafters/design-tokens';
import { combobox } from '../../src/components/combobox/combobox.behavior';
import { comboboxClasses } from '../../src/components/combobox/combobox.classes';
import { command } from '../../src/components/command/command.behavior';
import { commandClasses } from '../../src/components/command/command.classes';
import { contextMenu } from '../../src/components/context-menu/context-menu.behavior';
import { contextMenuClasses } from '../../src/components/context-menu/context-menu.classes';
import { dropdownMenu } from '../../src/components/dropdown-menu/dropdown-menu.behavior';
import { dropdownMenuClasses } from '../../src/components/dropdown-menu/dropdown-menu.classes';
import { select } from '../../src/components/select/select.behavior';
import { selectClasses } from '../../src/components/select/select.classes';

const COMPONENTS_DIR = join(import.meta.dirname, '..', '..', 'src', 'components');

// The item collection's CONTAINER class string per component -- the value
// that must select stagger-items -- alongside the full emitted class set, so
// this probe can assert BOTH the positive (container selects it) and the
// negative (nothing anywhere constructs calc()/nth-child) directly against
// what classes.ts actually EMITS, not against comment prose in the file.
const dropdownMenuClassSet = dropdownMenuClasses({}, dropdownMenu.initialState({}));
const contextMenuClassSet = contextMenuClasses({}, contextMenu.initialState({}));
const selectClassSet = selectClasses({}, select.initialState({}));
const comboboxClassSet = comboboxClasses({}, combobox.initialState({}));
const commandClassSet = commandClasses({}, command.initialState({}));

const CONSUMING_COMPONENTS: ReadonlyArray<{
  name: string;
  container: string;
  allClassValues: string[];
}> = [
  {
    name: 'dropdown-menu',
    container: dropdownMenuClassSet.content,
    allClassValues: Object.values(dropdownMenuClassSet),
  },
  {
    name: 'context-menu',
    container: contextMenuClassSet.content,
    allClassValues: Object.values(contextMenuClassSet),
  },
  {
    name: 'select',
    container: selectClassSet.viewport,
    allClassValues: Object.values(selectClassSet),
  },
  {
    name: 'combobox',
    container: comboboxClassSet.content,
    allClassValues: Object.values(comboboxClassSet),
  },
  {
    name: 'command',
    container: commandClassSet.list,
    allClassValues: Object.values(commandClassSet),
  },
];

function baseRegistry(): TokenRegistry {
  return new TokenRegistry(generateBaseSystem({}).allTokens, [
    scalePlugin,
    contrastPlugin,
    statePlugin,
    invertPlugin,
  ]);
}

/** Extract the `.stagger-items { ... }` block from compiled CSS. */
function extractStaggerBlock(css: string): string {
  const start = css.indexOf('.stagger-items');
  expect(start, 'compiled CSS does not contain .stagger-items').toBeGreaterThan(-1);
  let depth = 0;
  let end = start;
  for (let i = start; i < css.length; i++) {
    if (css[i] === '{') depth++;
    if (css[i] === '}') {
      depth--;
      if (depth === 0) {
        end = i + 1;
        break;
      }
    }
  }
  return css.slice(start, end);
}

describe('stagger-items consumption: real component source (#2156)', () => {
  it('each item collection container SELECTS stagger-items; nothing emitted constructs calc()/nth-child', () => {
    for (const { name, container, allClassValues } of CONSUMING_COMPONENTS) {
      expect(container, `${name}'s item collection container must select stagger-items`).toContain(
        'stagger-items',
      );
      for (const value of allClassValues) {
        expect(value, `${name} must not emit calc()`).not.toContain('calc(');
        expect(value, `${name} must not emit nth-child`).not.toContain('nth-child');
      }
    }
  });

  it("compiling this package's real src/components produces the calc(3 * var(--rafters-delay-stagger-step)) rule for position 3", async () => {
    const css = await registryToCompiled(baseRegistry(), {
      contentSources: [COMPONENTS_DIR],
      minify: false,
    });

    const block = extractStaggerBlock(css);

    expect(block).toMatch(
      /:nth-child\(3\)[^}]*animation-delay:\s*calc\(3 \* var\(--rafters-delay-stagger-step\)\)/s,
    );
  });

  it('the compiled ladder is strictly increasing across item positions (visible stagger once the token is tuned)', async () => {
    const css = await registryToCompiled(baseRegistry(), {
      contentSources: [COMPONENTS_DIR],
      minify: false,
    });

    const block = extractStaggerBlock(css);

    // Read the multiplier the compiled rule attaches to each position: a
    // strictly increasing sequence of multipliers against a single nonzero
    // token is a strictly increasing sequence of animation-delay values --
    // the "visibly increasing delays across item positions" criterion,
    // proven at the compiled-CSS level (the token itself defaults to 0ms, so
    // no runtime delay is visible until a designer tunes it -- #2156's
    // change is behaviorally invisible at defaults by design).
    const multipliers: number[] = [];
    for (let position = 1; position <= 5; position++) {
      const re = new RegExp(
        `:nth-child\\(${position}\\)[^}]*animation-delay:\\s*calc\\((\\d+) \\* var\\(--rafters-delay-stagger-step\\)\\)`,
        's',
      );
      const match = re.exec(block);
      expect(match?.[1], `position ${position} missing a calc() rule`).toBeDefined();
      multipliers.push(Number(match?.[1]));
    }

    expect(multipliers).toEqual([1, 2, 3, 4, 5]);
    for (let i = 1; i < multipliers.length; i++) {
      expect(multipliers[i]).toBeGreaterThan(multipliers[i - 1] as number);
    }
  });

  it('menubar is absent from this probe -- no component directory exists to select the utility (#2156 deferral)', () => {
    expect(existsSync(join(COMPONENTS_DIR, 'menubar'))).toBe(false);
  });
});
