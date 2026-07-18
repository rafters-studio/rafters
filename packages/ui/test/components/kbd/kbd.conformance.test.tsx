import * as React from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Kbd } from '../../../src/components/kbd/kbd';
import { kbd } from '../../../src/components/kbd/kbd.behavior';
import { assertAxeClean, assertContractFulfillment, partElement } from '../../harness/conformance';

const body = () => document.body;

afterEach(() => {
  cleanup();
});

describe('kbd conformance [react]', () => {
  it('fulfills the contract: root renders as a <kbd> and projects NO ARIA', () => {
    const { container } = render(<Kbd>Enter</Kbd>);
    const root = partElement(container, 'root') as HTMLElement;
    expect(root.tagName.toLowerCase()).toBe('kbd');
    assertContractFulfillment(kbd, root, {}, {}, ['root']);
    // The empty projection means no role/aria-* leaks onto the cap.
    expect(root.getAttribute('role')).toBeNull();
    expect(root.getAttribute('aria-label')).toBeNull();
  });

  it('carries the shared cap classes and its key text as the accessible name', () => {
    const { container } = render(<Kbd>Cmd</Kbd>);
    const root = partElement(container, 'root') as HTMLElement;
    expect(root.className).toContain('bg-muted');
    expect(root.className).toContain('text-code-small');
    expect(root.textContent).toBe('Cmd');
  });

  it('composes a key combination axe-clean when scoped to its container', async () => {
    const { container } = render(
      <span>
        <Kbd>Cmd</Kbd> + <Kbd>S</Kbd>
      </span>,
    );
    expect(container.querySelectorAll('kbd[data-part="root"]')).toHaveLength(2);
    // A bare inline cap has no landmark ancestor; scope axe to the render
    // container so the document-level `region` best-practice rule (about the
    // test page, not the component) does not fire -- badge's approach.
    await assertAxeClean(container);
  });

  it('consumer className merges via classy', () => {
    render(<Kbd className="ml-1">K</Kbd>);
    const root = body().querySelector('[data-part="root"]') as HTMLElement;
    expect(root.className).toContain('inline-flex');
    expect(root.className).toContain('ml-1');
  });

  it('has no keyboard contract and dispatches nothing observable', () => {
    // A static score claims no keys; there is nothing to interact with.
    expect(kbd.keymap({ key: 'Enter' }, {}, 'root', {})).toBeNull();
  });
});
