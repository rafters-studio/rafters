import { describe, expect, it } from 'vitest';
import { popover } from '../../../src/components/popover/popover.behavior';
import { popoverClasses } from '../../../src/components/popover/popover.classes';

const config = {};
const classes = popoverClasses(config, popover.initialState(config));

describe('popover classes', () => {
  it('the panel sits on the popover depth token and fills with popover surface tokens', () => {
    expect(classes.content).toContain('z-depth-popover');
    expect(classes.content).toContain('bg-popover');
    expect(classes.content).toContain('text-popover-foreground');
  });

  it('enter/exit is fade + zoom, sliding from the resolved side', () => {
    expect(classes.content).toContain('data-[state=open]:animate-in');
    expect(classes.content).toContain('data-[state=closed]:animate-out');
    expect(classes.content).toContain('data-[state=open]:fade-in-0');
    expect(classes.content).toContain('data-[state=open]:zoom-in-95');
    expect(classes.content).toContain('data-[side=bottom]:slide-in-from-top-2');
    expect(classes.content).toContain('data-[side=top]:slide-in-from-bottom-2');
  });

  it('motion respects reduced-motion', () => {
    expect(classes.content).toContain('motion-reduce:transition-none');
    expect(classes.close).toContain('motion-reduce:transition-none');
  });

  it('the close control honors the touch floor and scales down via CQ', () => {
    expect(classes.close).toContain('h-11');
    expect(classes.close).toContain('@md:h-8');
    expect(classes.closeIcon).toContain('h-5');
    expect(classes.closeIcon).toContain('@md:h-4');
  });
});
