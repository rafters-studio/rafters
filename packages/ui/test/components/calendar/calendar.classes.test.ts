/**
 * Classes parity test: the view is pure class strings keyed by config/state.
 * Asserts the day cell carries its sizing, focus ring, and the data-* state
 * variants the score projects (today, selected, in-range, outside, disabled) --
 * the same class contract all three performances paint, including the bind-built
 * cells that read the day class off data-day-class.
 */
import { resolve } from 'node:path';
import { generateBaseSystem } from '@rafters/design-tokens/generators/index';
import {
  contrastPlugin,
  invertPlugin,
  registryToCompiled,
  scalePlugin,
  statePlugin,
  TokenRegistry,
} from '@rafters/design-tokens';
import { describe, expect, it } from 'vitest';
import {
  calendarBehavior,
  type CalendarConfig,
} from '../../../src/components/calendar/calendar.behavior';
import { calendarClasses } from '../../../src/components/calendar/calendar.classes';

function classesFor(overrides: Partial<CalendarConfig> = {}) {
  const config: CalendarConfig = {
    mode: 'single',
    showOutsideDays: true,
    fixedWeeks: false,
    weekStartsOn: 0,
    today: '2026-07-20',
    ...overrides,
  };
  return calendarClasses(config, calendarBehavior.initialState(config));
}

describe('calendar classes', () => {
  it('exposes the full part class set', () => {
    const classes = classesFor();
    for (const key of ['root', 'header', 'nav', 'heading', 'grid', 'weekday', 'week', 'day']) {
      expect(classes).toHaveProperty(key);
    }
  });

  it('the nav control is a focusable icon button', () => {
    const nav = classesFor().nav;
    expect(nav).toContain('rounded-md');
    expect(nav).toContain('hover:bg-accent');
    expect(nav).toContain('focus-visible:ring-ring');
  });

  it('the grid stretches and collapses its borders', () => {
    expect(classesFor().grid).toContain('border-collapse');
    expect(classesFor().grid).toContain('w-full');
  });

  it('the day cell sizes, focuses, and carries every state variant', () => {
    const day = classesFor().day;
    expect(day).toContain('size-8');
    expect(day).toContain('rounded-md');
    expect(day).toContain('focus-visible:ring-ring');
    expect(day).toContain('data-[selected=true]:bg-primary');
    expect(day).toContain('data-[today=true]:bg-accent');
    expect(day).toContain('data-[in-range=true]:bg-accent');
    expect(day).toContain('data-[outside=true]:opacity-50');
    expect(day).toContain('data-[disabled=true]:cursor-not-allowed');
  });

  it('the grid consumes the month-change cell as a keyframe', () => {
    // calendar/grid/month change: fade-or-slide crossfade at moderate/standard.
    // The token layer picked the shape -- the `calendar-grid-month-change` cell
    // animation is keyframe `fade-in` at moderate/standard.
    expect(classesFor().grid).toContain('animate-fade-in-moderate-standard');
  });

  it('the day cell carries hover at fast and scopes the selection swap to micro', () => {
    const day = classesFor().day;
    expect(day).toContain('transition-colors');
    expect(day).toContain('duration-fast');
    expect(day).toContain('ease-standard');
    expect(day).toContain('data-[selected=true]:duration-micro');
    // Only the duration is scoped: a transition-property utility sorting after
    // a duration would silently collapse the cell onto Tailwind's default.
    expect(day).not.toContain('data-[selected=true]:transition');
  });

  it('names no literal timing and no reduced-motion escape', () => {
    for (const value of Object.values(classesFor())) {
      expect(value).not.toContain('motion-reduce:');
      expect(value).not.toMatch(/duration-\d/);
      expect(value).not.toMatch(/duration-\[/);
      expect(value).not.toMatch(/ease-\[/);
      expect(value).not.toMatch(/delay-\d/);
    }
  });

  it('the range row is reported, not faked: nothing animates an inline-size', () => {
    // calendar/range/range change assigns "fill (span spread)" over
    // inline-size/width to a `range` part this calendar does not have -- a range
    // is painted per day cell as a background, so the moment does not exist.
    for (const value of Object.values(classesFor())) {
      expect(value).not.toMatch(/transition-\[?(inline-size|width)/);
    }
  });
});

/**
 * Tailwind drops a malformed candidate SILENTLY -- no warning, no rule -- and
 * every assertion above would still pass for a class that compiles to nothing.
 * So this points the real Tailwind CLI at the real component directory and
 * checks the emitted sheet, the same way test/motion/reveal-candidates.test.ts
 * does for the hover-reveal candidates.
 */
const escapeCandidate = (candidate: string): string =>
  `.${candidate.replace(/[^a-zA-Z0-9_-]/g, (char) => `\\${char}`)}`;

let compiled: Promise<string> | null = null;
const sheet = (): Promise<string> => {
  if (compiled) return compiled;
  compiled = (async () => {
    const system = generateBaseSystem({});
    const registry = new TokenRegistry(system.allTokens, [
      scalePlugin,
      contrastPlugin,
      statePlugin,
      invertPlugin,
    ]);
    return registryToCompiled(registry, {
      contentSources: [resolve(import.meta.dirname, '../../../src/components/calendar')],
    });
  })();
  return compiled;
};

describe('calendar motion candidates compile (#2273)', () => {
  it('every motion candidate became a real rule', async () => {
    const css = await sheet();
    const missing = `${classesFor().grid} ${classesFor().day}`
      .split(' ')
      .filter(Boolean)
      .filter((candidate) => !css.includes(escapeCandidate(candidate)));
    expect(missing, 'candidates Tailwind silently emitted nothing for').toEqual([]);
  }, 120_000);

  it('the month-change keyframe reads the duration and ease leaves', async () => {
    // Whitespace-tolerant: the compiler drops the space between the two var()s,
    // so the emitted value is not byte-identical to the source.
    const css = await sheet();
    expect(css).toMatch(
      /--animate-fade-in-moderate-standard:\s*fade-in\s*var\(--rafters-duration-moderate\)\s*var\(--rafters-ease-standard\)/,
    );
  }, 120_000);
});
