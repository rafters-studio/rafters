/**
 * Classes parity test: the view is pure class strings keyed by config/state.
 * Asserts orientation drives the root and rail layout, the trigger carries the
 * data-state contract both the pill styling and the motion intent hang off, and
 * the panel carries a focus ring because it is focusable -- the same class
 * contract all three performances paint.
 */
import { describe, expect, it } from 'vitest';
import { tabs, type TabsConfig } from '../../../src/components/tabs/tabs.behavior';
import { tabsClasses } from '../../../src/components/tabs/tabs.classes';

function classesFor(config: TabsConfig) {
  return tabsClasses(config, tabs.initialState(config));
}

describe('tabs classes', () => {
  it('the default (no orientation) stacks the rail above the panels', () => {
    expect(classesFor({}).root).toBe('flex flex-col gap-2');
  });

  it('horizontal orientation stacks the rail above the panels', () => {
    expect(classesFor({ orientation: 'horizontal' }).root).toBe('flex flex-col gap-2');
  });

  it('vertical orientation puts the rail beside the panels', () => {
    expect(classesFor({ orientation: 'vertical' }).root).toBe('flex flex-row gap-2');
  });

  it('the rail is a fixed-height row when horizontal and a column when vertical', () => {
    expect(classesFor({}).list).toContain('h-10');
    expect(classesFor({}).list).not.toContain('flex-col');
    expect(classesFor({ orientation: 'vertical' }).list).toContain('flex-col');
  });

  it('the rail carries the muted trough the active pill sits in', () => {
    const list = classesFor({}).list;
    expect(list).toContain('bg-muted');
    expect(list).toContain('rounded-md');
  });

  it('the trigger styles both data-state branches off one string', () => {
    const trigger = classesFor({}).trigger;
    expect(trigger).toContain('data-[state=active]:bg-background');
    expect(trigger).toContain('data-[state=active]:text-foreground');
    expect(trigger).toContain('data-[state=inactive]:text-muted-foreground');
  });

  it('the trigger declares the indicator-move motion intent and honors reduced motion', () => {
    const trigger = classesFor({}).trigger;
    expect(trigger).toContain('transition-all');
    expect(trigger).toContain('motion-reduce:transition-none');
  });

  it('the trigger transition uses the fast tier per the matrix (motion.jsonl:6-7)', () => {
    const trigger = classesFor({}).trigger;
    expect(trigger).toContain('duration-fast');
    expect(trigger).not.toMatch(/duration-[0-9]/);
  });

  it('the trigger carries the focus ring and the disabled treatment', () => {
    const trigger = classesFor({}).trigger;
    expect(trigger).toContain('focus-visible:ring-ring');
    expect(trigger).toContain('disabled:opacity-50');
    expect(trigger).toContain('disabled:cursor-not-allowed');
  });

  it('the panel carries a focus ring because tabpanels are focusable', () => {
    const panel = classesFor({}).panel;
    expect(panel).toContain('focus-visible:ring-ring');
    expect(panel).toContain('ring-offset-background');
  });
});
