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
import { assertAxeClean, assertContractFulfillment, partElement } from '../../harness/conformance';

const body = () => document.body;

afterEach(() => {
  cleanup();
});

describe('alert conformance [react]', () => {
  it('fulfills the contract: root renders and carries role=alert', () => {
    const { container } = render(<Alert data-testid="a">Saved.</Alert>);
    const root = partElement(container, 'root') as HTMLElement;
    assertContractFulfillment(alert, root, {}, {}, ['root']);
  });

  it('projects role=alert regardless of variant', () => {
    const { container } = render(<Alert variant="destructive">Failed.</Alert>);
    const root = partElement(container, 'root') as HTMLElement;
    expect(root.getAttribute('role')).toBe('alert');
  });

  it('composes with Title, Description, and Action, and is axe-clean', async () => {
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
    await assertAxeClean(body());
  });

  it('sub-components carry data-slot markers matching Astro/WC', () => {
    // The three performances name the same regions: React puts the marker on
    // the sub-component, Astro and the WC put it on the wrapper around the
    // named slot. Asserting it here is what makes the parity claim in the
    // astro/element suites a claim about something.
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
