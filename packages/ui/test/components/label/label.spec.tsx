/**
 * Browser-project performance of the Label score (React target). Label is a
 * pure static -- the score projects no ARIA, holds no state -- so the whole
 * contract is: the root renders a real <label>, the native `for`/`htmlFor`
 * association passes straight through, and the variant selects a colour role
 * token.
 */
import * as React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from 'vitest-browser-react';
import { Label } from '../../../src/components/label/label';

afterEach(async () => {
  await cleanup();
});

function rootOf(container: HTMLElement): HTMLLabelElement {
  return container.querySelector('[data-part="root"]') as HTMLLabelElement;
}

describe('label [react]', () => {
  it('renders a <label> root and projects NO ARIA', async () => {
    const { container } = await render(<Label>Email</Label>);
    const root = rootOf(container);
    expect(root.tagName.toLowerCase()).toBe('label');
    // The empty projection means no role/aria-* leaks onto the label.
    expect(root.getAttribute('role')).toBeNull();
    expect(root.getAttribute('aria-label')).toBeNull();
  });

  it('htmlFor passes through as the native `for` association attribute', async () => {
    const { container } = await render(<Label htmlFor="email">Email</Label>);
    const root = rootOf(container);
    // The association is native: the score adds no logic, htmlFor -> for.
    expect(root.getAttribute('for')).toBe('email');
    expect(root.htmlFor).toBe('email');
  });

  it('variant selects the semantic colour role token', async () => {
    const { container } = await render(<Label variant="destructive">Name is required</Label>);
    const root = rootOf(container);
    expect(root.className).toContain('text-destructive');
    expect(root.className).toContain('ts-label-medium');
  });

  it('defaults to the foreground variant when none is given', async () => {
    const { container } = await render(<Label>Plain</Label>);
    expect(rootOf(container).className).toContain('text-foreground');
  });

  it('consumer className merges via classy', async () => {
    const { container } = await render(<Label className="mb-2">x</Label>);
    const root = rootOf(container);
    expect(root.className).toContain('leading-none');
    expect(root.className).toContain('mb-2');
  });
});
