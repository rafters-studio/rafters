import * as React from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Label } from '../../../src/components/label/label';
import { label } from '../../../src/components/label/label.behavior';
import { assertAxeClean, assertContractFulfillment, partElement } from '../../harness/conformance';

const body = () => document.body;

afterEach(() => {
  cleanup();
});

describe('label conformance [react]', () => {
  it('fulfills the contract: root renders a <label> and projects NO ARIA', () => {
    const { container } = render(<Label>Email</Label>);
    const root = partElement(container, 'root') as HTMLElement;
    assertContractFulfillment(label, root, {}, {}, ['root']);
    expect(root.tagName.toLowerCase()).toBe('label');
    // The empty projection means no role/aria-* leaks onto the label.
    expect(root.getAttribute('role')).toBeNull();
    expect(root.getAttribute('aria-label')).toBeNull();
  });

  it('htmlFor passes through as the native `for` association attribute', () => {
    render(<Label htmlFor="email">Email</Label>);
    const root = body().querySelector('[data-part="root"]') as HTMLLabelElement;
    // The association is native: the score adds no logic, htmlFor -> for.
    expect(root.getAttribute('for')).toBe('email');
    expect(root.htmlFor).toBe('email');
  });

  it('variant selects the semantic colour role token', () => {
    render(<Label variant="destructive">Name is required</Label>);
    const root = body().querySelector('[data-part="root"]') as HTMLElement;
    expect(root.className).toContain('text-destructive');
    expect(root.className).toContain('text-label-medium');
  });

  it('defaults to the foreground variant when none is given', () => {
    render(<Label>Plain</Label>);
    const root = body().querySelector('[data-part="root"]') as HTMLElement;
    expect(root.className).toContain('text-foreground');
  });

  it('consumer className merges via classy', () => {
    render(<Label className="mb-2">x</Label>);
    const root = body().querySelector('[data-part="root"]') as HTMLElement;
    expect(root.className).toContain('leading-none');
    expect(root.className).toContain('mb-2');
  });

  it('has no keyboard contract and dispatches nothing observable', () => {
    // A static score claims no keys; a label is not interactive.
    expect(label.keymap({ key: 'Enter' }, {}, 'root', {})).toBeNull();
  });

  it('is axe-clean when associated with a control', async () => {
    // Rendered inside a landmark so the axe best-practice `region` rule is
    // satisfied by the page, not the label pairing.
    render(
      <main>
        <Label htmlFor="email">Email address</Label>
        <input id="email" type="email" />
      </main>,
    );
    await assertAxeClean(body());
  });
});
