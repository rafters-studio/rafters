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

  it('the chevron rotation yields to reduced motion', () => {
    expect(classesFor({}).triggerIcon).toContain('motion-reduce:transition-none');
  });
});

describe('accordion content classes', () => {
  it('the panel clips its content so it can collapse to zero height', () => {
    expect(classesFor({}).content.split(/\s+/)).toContain('overflow-hidden');
  });

  it('the panel declares height-axis motion intent that yields to reduced motion', () => {
    const content = classesFor({}).content;
    expect(content).toContain('transition-all');
    expect(content).toContain('motion-reduce:transition-none');
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
