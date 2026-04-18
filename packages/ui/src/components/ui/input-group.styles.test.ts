import { describe, expect, it } from 'vitest';
import { inputGroupAddonStylesheet, inputGroupStylesheet } from './input-group.styles';

describe('input-group stylesheets', () => {
  it('emits :host(:focus-within) with token-driven ring', () => {
    const css = inputGroupStylesheet();
    expect(css).toMatch(/:host\(:focus-within\)/);
    expect(css).toContain('var(--color-ring)');
  });

  it('normalizes slotted input via ::slotted', () => {
    expect(inputGroupStylesheet()).toMatch(/::slotted\(input/);
  });

  it('emits ::slotted(rafters-input) normalisation', () => {
    expect(inputGroupStylesheet()).toContain('::slotted(rafters-input)');
  });

  it('slotted input receives flex-fill + no border + shared padding', () => {
    const css = inputGroupStylesheet();
    expect(css).toMatch(/::slotted\(input[^)]*\)[^{]*\{[^}]*flex:\s*1/);
    expect(css).toMatch(/::slotted\(input[^)]*\)[^{]*\{[^}]*border:\s*none/);
    expect(css).toContain('var(--spacing-3)');
  });

  it('addon emits border on start vs end', () => {
    expect(inputGroupAddonStylesheet({ position: 'start' })).toMatch(/border-right/);
    expect(inputGroupAddonStylesheet({ position: 'end' })).toMatch(/border-left/);
  });

  it('addon default variant does not emit background-color', () => {
    const css = inputGroupAddonStylesheet({ variant: 'default' });
    expect(css).not.toMatch(/background-color/);
  });

  it('addon filled variant uses --color-muted', () => {
    expect(inputGroupAddonStylesheet({ variant: 'filled' })).toContain('var(--color-muted)');
  });

  it('falls back to defaults on unknown values', () => {
    expect(() => inputGroupStylesheet({ size: 'huge' as never })).not.toThrow();
    expect(() =>
      inputGroupAddonStylesheet({ position: 'sideways' as never, variant: 'shiny' as never }),
    ).not.toThrow();
    // Unknown position falls back to start (border-right)
    expect(inputGroupAddonStylesheet({ position: 'sideways' as never })).toMatch(/border-right/);
    // Unknown variant falls back to default (no background-color)
    expect(inputGroupAddonStylesheet({ variant: 'shiny' as never })).not.toMatch(
      /background-color/,
    );
  });

  it('emits size-specific height tokens for every size', () => {
    expect(inputGroupStylesheet({ size: 'sm' })).toContain('height: 2.25rem');
    expect(inputGroupStylesheet({ size: 'default' })).toContain('height: 2.5rem');
    expect(inputGroupStylesheet({ size: 'lg' })).toContain('height: 2.75rem');
  });

  it('disabled composes opacity + not-allowed on the .group rule', () => {
    const css = inputGroupStylesheet({ disabled: true });
    expect(css).toMatch(/\.group\s*\{[^}]*opacity:\s*0\.5/);
    expect(css).toMatch(/\.group\s*\{[^}]*cursor:\s*not-allowed/);
  });

  it('never uses --duration-* or --ease-*', () => {
    const css = inputGroupStylesheet() + inputGroupAddonStylesheet();
    expect(css).not.toMatch(/var\(--duration-/);
    expect(css).not.toMatch(/var\(--ease-/);
  });

  it('host rule uses display: block on the group and display: flex on the addon', () => {
    expect(inputGroupStylesheet()).toMatch(/:host\s*\{[^}]*display:\s*block/);
    expect(inputGroupAddonStylesheet()).toMatch(/:host\s*\{[^}]*display:\s*flex/);
  });
});
