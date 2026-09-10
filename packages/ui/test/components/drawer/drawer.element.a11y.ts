import { expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { runAxe } from '../../a11y/run-axe';
import '../../../src/components/drawer/drawer.element';

interface Scene {
  modal?: boolean;
  side?: 'top' | 'right' | 'bottom' | 'left';
  open?: boolean;
  withDescription?: boolean;
}

async function mount({
  modal = true,
  side = 'bottom',
  open = false,
  withDescription = false,
}: Scene): Promise<HTMLElement> {
  const describedBy = withDescription ? ' aria-describedby="dr-description"' : '';
  const description = withDescription
    ? '<p data-part="description" id="dr-description">Pick an action.</p>'
    : '';
  document.body.innerHTML = `
    <main>
      <rafters-drawer${modal ? '' : ' data-modal="false"'} data-side="${side}">
        <button type="button" data-part="trigger" id="dr-trigger" aria-haspopup="dialog" aria-expanded="false" data-state="closed">Open</button>
        <div data-part="overlay" id="dr-overlay" aria-hidden="true" data-state="closed" hidden></div>
        <div data-part="content" id="dr-content" role="dialog" tabindex="-1" aria-labelledby="dr-title"${describedBy} data-state="closed" hidden>
          <div aria-hidden="true"></div>
          <div id="dr-title" data-part="title" role="heading" aria-level="2">Actions</div>
          ${description}
          <button type="button">Save</button>
          <button type="button" data-part="close" id="dr-close" aria-label="Close">x</button>
        </div>
      </rafters-drawer>
    </main>`;
  await Promise.resolve(); // the element binds one microtask after connecting
  if (open) await page.getByRole('button', { name: 'Open' }).click();
  return document.body.querySelector('main') as HTMLElement;
}

const scenes: ReadonlyArray<[string, Scene]> = [
  ['closed', {}],
  ['open from the bottom', { open: true }],
  ['open from the right', { open: true, side: 'right' }],
  ['open with description', { open: true, withDescription: true }],
  ['closed non-modal', { modal: false }],
  ['open non-modal', { modal: false, open: true }],
];

for (const [name, scene] of scenes) {
  test(`rafters-drawer ${name}`, async ({ task }) => {
    const host = await mount(scene);
    const results = await runAxe(host);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
