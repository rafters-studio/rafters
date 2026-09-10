/**
 * Browser-project performance of the Kbd score (React target). Kbd is a pure
 * static -- the score projects no ARIA, holds no state -- so the whole
 * contract is: the root renders as a real <kbd>, carries the shared cap
 * classes, and composes a consumer className.
 */
import * as React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from 'vitest-browser-react';
import { Kbd } from '../../../src/components/kbd/kbd';

afterEach(async () => {
  await cleanup();
});

function rootOf(container: HTMLElement): HTMLElement {
  return container.querySelector('[data-part="root"]') as HTMLElement;
}

describe('kbd [react]', () => {
  it('renders a <kbd> root and projects NO ARIA', async () => {
    const { container } = await render(<Kbd>Enter</Kbd>);
    const el = rootOf(container);
    expect(el.tagName.toLowerCase()).toBe('kbd');
    // The empty projection means no role/aria-* leaks onto the cap.
    expect(el.getAttribute('role')).toBeNull();
    expect(el.getAttribute('aria-label')).toBeNull();
  });

  it('carries the shared cap classes and its key text as the accessible name', async () => {
    const { container } = await render(<Kbd>Cmd</Kbd>);
    const el = rootOf(container);
    expect(el.className).toContain('bg-muted');
    expect(el.className).toContain('ts-code-small');
    expect(el.textContent).toBe('Cmd');
  });

  it('composes a key combination of two caps', async () => {
    const { container } = await render(
      <span>
        <Kbd>Cmd</Kbd> + <Kbd>S</Kbd>
      </span>,
    );
    expect(container.querySelectorAll('kbd[data-part="root"]')).toHaveLength(2);
  });

  it('consumer className merges via classy', async () => {
    const { container } = await render(<Kbd className="ml-1">K</Kbd>);
    const el = rootOf(container);
    expect(el.className).toContain('inline-flex');
    expect(el.className).toContain('ml-1');
  });
});
