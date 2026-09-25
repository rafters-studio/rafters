/**
 * React performance of the alert score. Alert is a static -- the projection
 * is a pure function of config, so this proves role=alert regardless of
 * variant, the parts/data-slot structure the Astro and WC performances also
 * carry, and the classes channel (base + variant + consumer className merge).
 */
import * as React from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from '../../../src/components/alert/alert';
import { alert } from '../../../src/components/alert/alert.behavior';

const body = () => document.body;

function partElement(root: ParentNode, part: string): HTMLElement | null {
  return root.querySelector<HTMLElement>(`[data-part="${part}"]`);
}

afterEach(() => {
  cleanup();
});

describe('alert [react]', () => {
  it('fulfills the contract: root renders and carries role=alert, the score projection', () => {
    const { container } = render(<Alert data-testid="a">Saved.</Alert>);
    const root = partElement(container, 'root') as HTMLElement;
    expect(root).not.toBeNull();
    const projection = alert.aria({}, {}, { root: root.id });
    expect(root.getAttribute('role')).toBe(projection.root?.role);
  });

  it('projects role=alert regardless of variant', () => {
    const { container } = render(<Alert variant="destructive">Failed.</Alert>);
    const root = partElement(container, 'root') as HTMLElement;
    expect(root?.getAttribute('role')).toBe('alert');
  });

  it('composes with Title, Description, and Action', () => {
    render(
      <Alert variant="success" data-testid="alert">
        <AlertTitle>Saved</AlertTitle>
        <AlertDescription>Your changes were saved.</AlertDescription>
        <AlertAction>
          <button type="button">Undo</button>
        </AlertAction>
      </Alert>,
    );
    const root = body().querySelector('[data-testid="alert"]') as HTMLElement;
    expect(root.querySelector('h5')?.textContent).toBe('Saved');
    expect(root.textContent).toContain('Your changes were saved.');
    expect(root.querySelector('button')?.textContent).toBe('Undo');
  });

  it('sub-components carry data-slot markers matching Astro/WC; root is the only declared part', () => {
    // The three performances name the same regions: React puts the marker on
    // the sub-component, Astro and the WC put it on the wrapper around the
    // named slot. Asserting it here is what makes the parity claim in the
    // astro/element specs a claim about something.
    const { container } = render(
      <Alert>
        <AlertTitle>Saved</AlertTitle>
        <AlertDescription>Your changes were saved.</AlertDescription>
        <AlertAction>
          <button type="button">Undo</button>
        </AlertAction>
      </Alert>,
    );
    expect(container.querySelector('[data-slot="alert-title"]')?.tagName).toBe('H5');
    expect(container.querySelector('[data-slot="alert-description"]')).not.toBeNull();
    expect(container.querySelector('[data-slot="alert-action"]')).not.toBeNull();
    // A marker is not a part: the score declares exactly one.
    expect(container.querySelectorAll('[data-part]')).toHaveLength(1);
  });

  it('consumer className merges via classy', () => {
    render(<Alert className="mt-4">x</Alert>);
    const element = body().querySelector('[data-part="root"]') as HTMLElement;
    expect(element.className).toContain('relative w-full rounded-lg');
    expect(element.className).toContain('mt-4');
  });

  it('has no keyboard contract and dispatches nothing observable', () => {
    // A static score claims no keys; nothing to interact with.
    expect(alert.keymap({ key: 'Enter' }, {}, 'root', {})).toBeNull();
  });
});
