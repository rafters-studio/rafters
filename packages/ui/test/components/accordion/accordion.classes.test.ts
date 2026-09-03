/**
 * Classes parity test: the view is pure class strings keyed by config/state.
 * Asserts each part carries the class contract all three performances paint --
 * the section rule, the header row, the data-state-driven chevron rotation, and
 * the clipped panel with its declared height-axis motion intent.
 */
import { describe, expect, it } from 'vitest';
import {
  accordion,
  type AccordionConfig,
} from '../../../src/components/accordion/accordion.behavior';
import { accordionClasses } from '../../../src/components/accordion/accordion.classes';

function classesFor(config: AccordionConfig) {
  return accordionClasses(config, accordion.initialState(config));
}

describe('accordion structural classes', () => {
  it('the root is a styling anchor with no visual of its own', () => {
    expect(classesFor({}).root).toBe('');
  });

  it('each section is separated by a bottom rule', () => {
    expect(classesFor({}).item.split(/\s+/)).toContain('border-b');
  });

  it('the heading wrapper lays the header button out as a row', () => {
    expect(classesFor({}).heading.split(/\s+/)).toContain('flex');
  });
});

describe('accordion trigger classes', () => {
  it('the header fills its row and carries the focus ring and disabled dim', () => {
    const trigger = classesFor({}).trigger;
    expect(trigger).toContain('flex-1');
    expect(trigger).toContain('items-center');
    expect(trigger).toContain('justify-between');
    expect(trigger).toContain('focus-visible:ring-ring');
    expect(trigger).toContain('disabled:opacity-50');
  });

  it('the header is a group so the chevron can key off its data-state', () => {
    expect(classesFor({}).trigger.split(/\s+/)).toContain('group');
    expect(classesFor({}).triggerIcon).toContain('group-data-[state=open]:rotate-180');
  });

  it('the header hover carries the trigger/hover row: color, fast, standard', () => {
    const trigger = classesFor({}).trigger.split(/\s+/);
    expect(trigger).toContain('transition-colors');
    expect(trigger).toContain('duration-fast');
    expect(trigger).toContain('ease-standard');
  });

  it('the chevron rotation carries the chevron row: rotate, moderate, standard', () => {
    // motion.jsonl accordion / chevron / "open <-> closed". The retired
    // motion-toggle named spring-snappy, which is not the curve this row assigns.
    const icon = classesFor({}).triggerIcon.split(/\s+/);
    expect(icon).toContain('transition-transform');
    expect(icon).toContain('duration-moderate');
    expect(icon).toContain('ease-standard');
  });
});

describe('accordion content classes', () => {
  it('the panel is a grid whose row animates, clipping happens on the inner box', () => {
    // The panel itself is the grid track (0fr<->1fr); overflow-hidden + min-h-0
    // ride the inner box so the row can collapse below min-content height.
    expect(classesFor({}).content.split(/\s+/)).toContain('grid');
    expect(classesFor({}).contentInner.split(/\s+/)).toContain('overflow-hidden');
    expect(classesFor({}).contentInner.split(/\s+/)).toContain('min-h-0');
  });

  it('the panel transitions grid-template-rows, never height', () => {
    const content = classesFor({}).content;
    // grid-rows minmax(0,0fr)<->minmax(0,1fr): the transitionable stand-in for
    // height:auto, with the floor pinned to 0 so the row fully collapses.
    expect(content).toContain('data-[state=open]:grid-rows-[minmax(0,1fr)]');
    expect(content).toContain('data-[state=closed]:grid-rows-[minmax(0,0fr)]');
    // Reveal is a TRANSITION, not a keyframe -- so the property list is named
    // here and no animate-* cell exists for either direction.
    expect(content).toContain('transition-[grid-template-rows,opacity]');
    expect(content).not.toContain('animate-');
  });

  it('each direction carries its own row: open normal/enter, closed moderate/exit', () => {
    // motion.jsonl accordion / content / "closed -> open" (normal, enter) and
    // "open -> closed" (moderate, exit). The rule matching the state being
    // transitioned INTO owns that direction's tier and curve.
    const content = classesFor({}).content;
    expect(content).toContain('data-[state=open]:duration-normal');
    expect(content).toContain('data-[state=open]:ease-enter');
    expect(content).toContain('data-[state=closed]:duration-moderate');
    expect(content).toContain('data-[state=closed]:ease-exit');
  });

  it('the opacity pair is the rows fade half, driven off data-state', () => {
    // Both rows are `reveal (y) + fade` over `opacity, grid-rows / height`, so
    // opacity is assigned motion, not a reduced-motion consolation prize.
    const content = classesFor({}).content;
    expect(content).toContain('data-[state=open]:opacity-100');
    expect(content).toContain('data-[state=closed]:opacity-0');
  });

  it('the retired semantic motion tokens are gone', () => {
    // The 13 semantic motion tokens were deleted by ruling (2026-08-02); they
    // kept compiling by accident, which is what let them linger here.
    const content = classesFor({}).content;
    expect(content).not.toContain('motion-expand');
    expect(content).not.toContain('motion-collapse');
    expect(classesFor({}).triggerIcon).not.toContain('motion-toggle');
    expect(classesFor({}).trigger).not.toContain('motion-hover');
  });

  it('the oracle radix-variable keyframes are not ported', () => {
    const content = classesFor({}).content;
    expect(content).not.toContain('animate-accordion-down');
    expect(content).not.toContain('animate-accordion-up');
  });

  it('padding lives on the inner box, never on the collapsing panel', () => {
    expect(classesFor({}).content).not.toContain('pb-4');
    expect(classesFor({}).contentInner).toContain('pb-4');
  });
});

describe('accordion motion vocabulary', () => {
  it('states no timing as a literal and queries reduced motion nowhere', () => {
    for (const value of Object.values(classesFor({}))) {
      expect(value).not.toMatch(/\b(duration|delay)-\d/);
      expect(value).not.toContain('motion-reduce');
    }
  });

  it('names only the six curve roles', () => {
    const roles = ['standard', 'enter', 'exit', 'linear', 'spring-smooth', 'spring-snappy'];
    for (const value of Object.values(classesFor({}))) {
      for (const candidate of value.split(/\s+/)) {
        const curve = candidate.split(':').pop() ?? '';
        if (!curve.startsWith('ease-')) continue;
        expect(roles).toContain(curve.slice('ease-'.length));
      }
    }
  });
});
