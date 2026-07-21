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

  it('the chevron rotation rides the motion-toggle semantic token', () => {
    // motion-toggle (transform, moderate, spring-snappy) carries its own
    // reduced-motion behavior -- no raw duration, no hand-written transition.
    expect(classesFor({}).triggerIcon.split(/\s+/)).toContain('motion-toggle');
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

  it('the panel animates grid-template-rows via the expand/collapse tokens', () => {
    const content = classesFor({}).content;
    // grid-rows minmax(0,0fr)<->minmax(0,1fr): the transitionable stand-in for
    // height:auto, with the floor pinned to 0 so the row fully collapses.
    expect(content).toContain('data-[state=open]:grid-rows-[minmax(0,1fr)]');
    expect(content).toContain('data-[state=closed]:grid-rows-[minmax(0,0fr)]');
    // The semantic tokens carry duration + curve + the reduced-motion fallback.
    expect(content).toContain('data-[state=open]:motion-expand');
    expect(content).toContain('data-[state=closed]:motion-collapse');
    // No raw numeric duration survives.
    expect(content).not.toMatch(/duration-\d/);
  });

  it('the reduced-motion opacity fallback is state-driven', () => {
    // The tokens snap the rows and fade opacity under reduced motion, so the
    // opacity pair is what those users see.
    const content = classesFor({}).content;
    expect(content).toContain('data-[state=open]:opacity-100');
    expect(content).toContain('data-[state=closed]:opacity-0');
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
