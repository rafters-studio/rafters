import * as React from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  Empty,
  EmptyAction,
  EmptyDescription,
  EmptyIcon,
  EmptyTitle,
} from '../../../src/components/empty/empty';
import { empty } from '../../../src/components/empty/empty.behavior';
import { assertAxeClean, assertContractFulfillment, partElement } from '../../harness/conformance';

const body = () => document.body;

afterEach(() => {
  cleanup();
});

describe('empty conformance [react]', () => {
  it('fulfills the contract: root renders and projects NO ARIA', () => {
    const { container } = render(<Empty data-testid="e">nothing here</Empty>);
    const root = partElement(container, 'root') as HTMLElement;
    assertContractFulfillment(empty, root, {}, {}, ['root']);
    // The empty projection means no role/aria-* leaks onto the placeholder.
    expect(root.getAttribute('role')).toBeNull();
    expect(root.getAttribute('aria-label')).toBeNull();
  });

  it('root carries the shared centered-column classes', () => {
    const { container } = render(<Empty>x</Empty>);
    const root = partElement(container, 'root') as HTMLElement;
    expect(root.className).toContain('flex flex-col');
    expect(root.className).toContain('items-center');
    expect(root.className).toContain('py-12');
  });

  it('composes the full family and passes content through, axe-clean', async () => {
    render(
      <main>
        <Empty data-testid="empty">
          <EmptyIcon>
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <title>search</title>
              <circle cx="11" cy="11" r="8" />
            </svg>
          </EmptyIcon>
          <EmptyTitle>No results found</EmptyTitle>
          <EmptyDescription>Try adjusting your search terms or filters.</EmptyDescription>
          <EmptyAction>
            <button type="button">Clear filters</button>
          </EmptyAction>
        </Empty>
      </main>,
    );
    const root = body().querySelector('[data-testid="empty"]') as HTMLElement;
    expect(root.querySelector('h3')?.textContent).toBe('No results found');
    expect(root.textContent).toContain('Try adjusting your search terms or filters.');
    expect(root.querySelectorAll('button')).toHaveLength(1);
    // Only root is a declared part -- the placeholder carries the sole
    // data-part, and no descendant does (boundary 5).
    expect(root.getAttribute('data-part')).toBe('root');
    expect(root.querySelectorAll('[data-part]')).toHaveLength(0);
    await assertAxeClean(body());
  });

  it('EmptyTitle places the heading level via as -- clear heading hierarchy', () => {
    render(
      <Empty>
        <EmptyTitle as="h2">Level two</EmptyTitle>
      </Empty>,
    );
    expect(body().querySelector('h2')?.textContent).toBe('Level two');
  });

  it('EmptyTitle defaults to h3, byte-identical to the oracle', () => {
    render(
      <Empty>
        <EmptyTitle>Default level</EmptyTitle>
      </Empty>,
    );
    expect(body().querySelector('h3')?.textContent).toBe('Default level');
  });

  it('sub-components carry data-slot markers, not data-part', () => {
    render(
      <Empty>
        <EmptyIcon data-testid="icon" />
        <EmptyTitle>Title</EmptyTitle>
        <EmptyDescription>Desc</EmptyDescription>
        <EmptyAction data-testid="action" />
      </Empty>,
    );
    expect(body().querySelector('[data-slot="empty-icon"]')).not.toBeNull();
    expect(body().querySelector('[data-slot="empty-title"]')).not.toBeNull();
    expect(body().querySelector('[data-slot="empty-description"]')).not.toBeNull();
    expect(body().querySelector('[data-slot="empty-action"]')).not.toBeNull();
  });

  it('consumer className merges via classy', () => {
    render(<Empty className="mt-4">x</Empty>);
    const root = body().querySelector('[data-part="root"]') as HTMLElement;
    expect(root.className).toContain('py-12');
    expect(root.className).toContain('mt-4');
  });

  it('has no keyboard contract and dispatches nothing observable', () => {
    // A static score claims no keys; nothing to interact with.
    expect(empty.keymap({ key: 'Enter' }, {}, 'root', {})).toBeNull();
  });
});
