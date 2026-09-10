import type { ReactElement } from 'react';
import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { runAxe } from '../../a11y/run-axe';
import { Item } from '../../../src/components/item/item';

/** An option must live inside a listbox (axe aria-required-parent), and page
 *  content must sit inside a landmark; every scene renders the row inside
 *  a listbox inside a `<main>`, as the conformance tests do. */
function Listbox({ children }: { children: ReactElement }) {
  return (
    <main>
      <div role="listbox" aria-label="Options">
        {children}
      </div>
    </main>
  );
}

const scenes: ReadonlyArray<[string, () => ReactElement]> = [
  ['default', () => <Item>Settings</Item>],
  ['selected', () => <Item selected>Dashboard</Item>],
  ['disabled', () => <Item disabled>Admin Panel</Item>],
  [
    'with icon and description',
    () => (
      <Item icon={<span>*</span>} description="Manage your account">
        Profile
      </Item>
    ),
  ],
  ['size sm', () => <Item size="sm">Compact</Item>],
  ['size lg', () => <Item size="lg">Roomy</Item>],
];

for (const [name, scene] of scenes) {
  test(`item ${name}`, async ({ task }) => {
    const { container } = await render(<Listbox>{scene()}</Listbox>);
    const results = await runAxe(container);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
