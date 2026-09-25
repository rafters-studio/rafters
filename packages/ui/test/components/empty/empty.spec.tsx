/**
 * Spec for Empty, React target. Runs in the browser project
 * (real chromium). Empty is a pure static -- no state, no keymap, and an
 * empty aria projection, since the placeholder carries no role of its own.
 */
import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import {
  Empty,
  EmptyAction,
  EmptyDescription,
  EmptyIcon,
  EmptyTitle,
} from '../../../src/components/empty/empty';
import { empty } from '../../../src/components/empty/empty.behavior';

test('fulfills the contract: root renders and projects no aria', async () => {
  const { container } = await render(<Empty data-testid="e">nothing here</Empty>);
  const root = container.querySelector('[data-part="root"]') as HTMLElement;
  expect(root, 'declared part "root" must be rendered').not.toBeNull();
  expect(root.getAttribute('role')).toBeNull();
  expect(root.getAttribute('aria-label')).toBeNull();
});

test('root carries the shared centered-column classes', async () => {
  const { container } = await render(<Empty>x</Empty>);
  const root = container.querySelector('[data-part="root"]') as HTMLElement;
  expect(root.className).toContain('flex flex-col');
  expect(root.className).toContain('items-center');
  expect(root.className).toContain('py-12');
});

test('composes the full family and passes content through', async () => {
  const { container } = await render(
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
  const root = container.querySelector('[data-testid="empty"]') as HTMLElement;
  expect(root.querySelector('h3')?.textContent).toBe('No results found');
  expect(root.textContent).toContain('Try adjusting your search terms or filters.');
  expect(root.querySelectorAll('button')).toHaveLength(1);
  // Only root is a declared part -- the placeholder carries the sole
  // data-part, and no descendant does (boundary 5).
  expect(root.getAttribute('data-part')).toBe('root');
  expect(root.querySelectorAll('[data-part]')).toHaveLength(0);
});

test('EmptyTitle places the heading level via as -- clear heading hierarchy', async () => {
  const { container } = await render(
    <Empty>
      <EmptyTitle as="h2">Level two</EmptyTitle>
    </Empty>,
  );
  expect(container.querySelector('h2')?.textContent).toBe('Level two');
});

test('EmptyTitle defaults to h3, byte-identical to the oracle', async () => {
  const { container } = await render(
    <Empty>
      <EmptyTitle>Default level</EmptyTitle>
    </Empty>,
  );
  expect(container.querySelector('h3')?.textContent).toBe('Default level');
});

test('sub-components carry data-slot markers, not data-part', async () => {
  const { container } = await render(
    <Empty>
      <EmptyIcon data-testid="icon" />
      <EmptyTitle>Title</EmptyTitle>
      <EmptyDescription>Desc</EmptyDescription>
      <EmptyAction data-testid="action" />
    </Empty>,
  );
  expect(container.querySelector('[data-slot="empty-icon"]')).not.toBeNull();
  expect(container.querySelector('[data-slot="empty-title"]')).not.toBeNull();
  expect(container.querySelector('[data-slot="empty-description"]')).not.toBeNull();
  expect(container.querySelector('[data-slot="empty-action"]')).not.toBeNull();
});

test('consumer className merges via classy', async () => {
  const { container } = await render(<Empty className="mt-4">x</Empty>);
  const root = container.querySelector('[data-part="root"]') as HTMLElement;
  expect(root.className).toContain('py-12');
  expect(root.className).toContain('mt-4');
});

test('has no keyboard contract and dispatches nothing observable', () => {
  // A static score claims no keys; nothing to interact with.
  expect(empty.keymap({ key: 'Enter' }, {}, 'root', {})).toBeNull();
});
