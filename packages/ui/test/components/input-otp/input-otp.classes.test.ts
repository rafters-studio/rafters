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

  it('the slot consumes both its rows: focus is linear, the advance is standard (#2290)', () => {
    // slot / focus -- ring -- duration-micro, ease-linear
    expect(classes.slot).toContain('transition-[box-shadow,border-color,color]');
    expect(classes.slot).toContain('duration-micro');
    expect(classes.slot).toContain('ease-linear');
    // active slot / advance -- swap -- duration-micro, ease-standard. The active
    // ring is both the focus indication and the advance marker, so the two rows
    // share a tier and split only on curve.
    expect(classes.slot).toContain('data-[active=true]:ease-standard');
    // The reduced-motion law is written once on the token leaves.
    expect(classes.slot).not.toContain('motion-reduce:');
    expect(classes.slot).not.toContain('transition-all');
  });

  it('the separator is muted, not a foreground element', () => {
    expect(classes.separator).toContain('text-muted-foreground');
  });
});
