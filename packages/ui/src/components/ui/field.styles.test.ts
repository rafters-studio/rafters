import { describe, expect, it } from 'vitest';
import { fieldStylesheet } from './field.styles';

describe('fieldStylesheet', () => {
  it('emits :host display:block', () => {
    expect(fieldStylesheet()).toMatch(/:host\s*\{[^}]*display:\s*block/);
  });

  it('uses token-driven colors and font sizes', () => {
    const css = fieldStylesheet();
    expect(css).toContain('var(--color-foreground)');
    expect(css).toContain('var(--color-muted-foreground)');
    expect(css).toContain('var(--color-destructive)');
    expect(css).toContain('var(--font-size-label-medium)');
    expect(css).toContain('var(--font-size-label-small)');
  });

  it('never uses --duration-* or --ease-*', () => {
    const css = fieldStylesheet();
    expect(css).not.toMatch(/var\(--duration-/);
    expect(css).not.toMatch(/var\(--ease-/);
  });

  it('emits error + description rules when error option is set', () => {
    const css = fieldStylesheet({ error: true });
    expect(css).toMatch(/\.error\s*\{/);
    expect(css).toMatch(/\.description\s*\{/);
  });

  it('emits .label .required rule for the required marker', () => {
    const css = fieldStylesheet();
    expect(css).toMatch(/\.label\s+\.required\s*\{/);
  });

  it('adds opacity override on label when disabled is set', () => {
    const css = fieldStylesheet({ disabled: true });
    expect(css).toMatch(/\.label\s*\{[^}]*opacity:\s*0\.5/);
  });

  it('does not add opacity override on label when disabled is absent', () => {
    const css = fieldStylesheet();
    expect(css).not.toMatch(/\.label\s*\{[^}]*opacity:\s*0\.5/);
  });

  it('includes container gap via spacing token', () => {
    const css = fieldStylesheet();
    expect(css).toContain('var(--spacing-2)');
  });

  it('includes reduced-motion guard', () => {
    const css = fieldStylesheet();
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)/);
  });
});
