import { describe, expect, it } from 'vitest';
import { inputOtpBehavior } from '../../../src/components/input-otp/input-otp.behavior';
import { inputOtpClassSet } from '../../../src/components/input-otp/input-otp.classes';

const config = { maxLength: 6 };
const classes = inputOtpClassSet(config, inputOtpBehavior.initialState(config));

describe('input-otp classes', () => {
  it('the real field is sr-only, never display:none -- AT and autofill still reach it', () => {
    expect(classes.input).toContain('sr-only');
    expect(classes.input).not.toContain('hidden');
  });

  it('borders on a semantic token and never fills a page background', () => {
    expect(classes.slot).toContain('border-input');
    expect(classes.slot).not.toContain('bg-background');
  });

  it('styles every slot state off the projected data attributes', () => {
    expect(classes.slot).toContain('data-[active=true]:ring-1');
    expect(classes.slot).toContain('data-[active=true]:ring-ring');
    expect(classes.slot).toContain('data-[filled=true]:text-foreground');
  });

  it('reads disabled from the root through the group, not a second state channel', () => {
    expect(classes.root).toContain('group');
    expect(classes.slot).toContain('group-data-[disabled=true]:opacity-50');
    expect(classes.slot).toContain('group-data-[disabled=true]:cursor-not-allowed');
  });

  it('the caret is a blink feedback loop that never stops under reduced motion (#2155)', () => {
    // Migrated off the stock animate-pulse onto the caret's own cell utility;
    // motion-reduce:animate-none is removed, not replaced, so the caret
    // continues marking the active slot under prefers-reduced-motion.
    expect(classes.caretBar).toContain('animate-caret-blink-blink');
    expect(classes.caretBar).not.toContain('animate-pulse');
    expect(classes.caretBar).not.toContain('motion-reduce:animate-none');
  });

  it('slot motion respects reduced motion', () => {
    expect(classes.slot).toContain('motion-reduce:transition-none');
  });

  it('the separator is muted, not a foreground element', () => {
    expect(classes.separator).toContain('text-muted-foreground');
  });
});
