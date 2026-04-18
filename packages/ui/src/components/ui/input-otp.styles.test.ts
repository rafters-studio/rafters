import { describe, expect, it } from 'vitest';
import {
  inputOtpCaretBar,
  inputOtpCaretBase,
  inputOtpContainerBase,
  inputOtpGroupBase,
  inputOtpSeparatorBase,
  inputOtpSlotActive,
  inputOtpSlotBase,
  inputOtpSlotDisabled,
  inputOtpSlotFilled,
  inputOtpStylesheet,
} from './input-otp.styles';

describe('inputOtpStylesheet', () => {
  it('emits :host display:inline-flex', () => {
    const css = inputOtpStylesheet();
    expect(css).toMatch(/:host\s*\{[^}]*display:\s*inline-flex/);
  });

  it('emits .container with token-driven gap', () => {
    expect(inputOtpStylesheet()).toContain('gap: var(--spacing-2)');
  });

  it('emits .slot with token-driven border-color', () => {
    expect(inputOtpStylesheet()).toContain('border-color: var(--color-input)');
  });

  it('emits .slot[data-active] with the ring token color', () => {
    const css = inputOtpStylesheet();
    expect(css).toMatch(/\.slot\[data-active\]\s*\{[^}]*var\(--color-ring\)/);
  });

  it('emits .slot[data-filled] with foreground color', () => {
    const css = inputOtpStylesheet();
    expect(css).toMatch(/\.slot\[data-filled\]\s*\{[^}]*color:\s*var\(--color-foreground\)/);
  });

  it('emits the caret bar with the foreground token and otp-blink animation', () => {
    const css = inputOtpStylesheet();
    expect(css).toMatch(
      /\.caret-bar\s*\{[^}]*background-color:\s*var\(--color-foreground\)[^}]*animation:[^}]*otp-blink/,
    );
  });

  it('emits @keyframes otp-blink', () => {
    expect(inputOtpStylesheet()).toMatch(/@keyframes\s+otp-blink/);
  });

  it('uses --motion-duration-* not --duration-*', () => {
    const css = inputOtpStylesheet();
    expect(css).not.toMatch(/var\(--duration-/);
    expect(css).not.toMatch(/var\(--ease-/);
    expect(css).toContain('var(--motion-duration-fast)');
    expect(css).toContain('var(--motion-ease-standard)');
  });

  it('emits slot focus/active ring using --color-ring', () => {
    expect(inputOtpStylesheet()).toContain('var(--color-ring)');
  });

  it('wraps animation/transition in prefers-reduced-motion', () => {
    const css = inputOtpStylesheet();
    expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/);
    expect(css).toMatch(/transition:\s*none/);
    expect(css).toMatch(/animation:\s*none/);
  });

  it('emits .separator with muted-foreground color', () => {
    const css = inputOtpStylesheet();
    expect(css).toMatch(/\.separator\s*\{[^}]*color:\s*var\(--color-muted-foreground\)/);
  });

  it('first/last slot border-radius use radius-md', () => {
    const css = inputOtpStylesheet();
    expect(css).toContain('border-top-left-radius: var(--radius-md)');
    expect(css).toContain('border-bottom-left-radius: var(--radius-md)');
    expect(css).toContain('border-top-right-radius: var(--radius-md)');
    expect(css).toContain('border-bottom-right-radius: var(--radius-md)');
  });

  it('disabled option emits cursor:not-allowed and opacity:0.5 on .slot', () => {
    const css = inputOtpStylesheet({ disabled: true });
    expect(css).toMatch(/\.slot\s*\{[^}]*cursor:\s*not-allowed/);
    expect(css).toMatch(/\.slot\s*\{[^}]*opacity:\s*0\.5/);
  });

  it('non-disabled does NOT emit the disabled overrides', () => {
    const css = inputOtpStylesheet();
    // The base slot rule must not carry cursor:not-allowed.
    expect(css).not.toMatch(/cursor:\s*not-allowed/);
  });

  describe('exports', () => {
    it('exposes container, group, slot maps with token values', () => {
      expect(inputOtpContainerBase.gap).toBe('var(--spacing-2)');
      expect(inputOtpGroupBase.display).toBe('flex');
      expect(inputOtpSlotBase['border-color']).toBe('var(--color-input)');
      expect(inputOtpSlotBase['font-size']).toBe('var(--font-size-body-small)');
    });

    it('exposes active, filled, disabled slot states', () => {
      expect(inputOtpSlotActive['border-color']).toBe('var(--color-ring)');
      expect(inputOtpSlotFilled.color).toBe('var(--color-foreground)');
      expect(inputOtpSlotDisabled.cursor).toBe('not-allowed');
      expect(inputOtpSlotDisabled.opacity).toBe('0.5');
    });

    it('exposes caret base and bar maps', () => {
      expect(inputOtpCaretBase.position).toBe('absolute');
      expect(inputOtpCaretBar['background-color']).toBe('var(--color-foreground)');
      expect(inputOtpCaretBar.animation).toBe('otp-blink 1s step-end infinite');
    });

    it('exposes separator base map with muted-foreground', () => {
      expect(inputOtpSeparatorBase.color).toBe('var(--color-muted-foreground)');
    });
  });

  it('emits no raw hex literals (rgba shadow excepted) -- tokens only', () => {
    const css = inputOtpStylesheet();
    expect(css).not.toMatch(/#[0-9a-f]{3,8}/i);
  });
});
