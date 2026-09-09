import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import '../../../src/components/sheet/sheet.element';

interface Scene {
  open?: boolean;
  modal?: boolean;
  description?: boolean;
  side?: string;
}

async function mount({
  open = false,
  modal = true,
  description = false,
  side = 'right',
}: Scene): Promise<HTMLElement> {
  const descriptionMarkup = description
    ? '<p data-part="description" id="s-description">Refine the results.</p>'
    : '';
  document.body.innerHTML = `
    <main>
      <rafters-sheet${modal ? '' : ' modal="false"'}${open ? ' default-open="true"' : ''}>
        <button type="button" data-part="trigger" id="s-trigger" aria-haspopup="dialog" aria-expanded="false" data-state="closed">Open</button>
        <div data-part="overlay" id="s-overlay" aria-hidden="true" data-state="closed" hidden></div>
        <div data-part="content" id="s-content" data-side="${side}" role="dialog" tabindex="-1" aria-labelledby="s-title" data-state="closed" hidden>
          <h2 data-part="title" id="s-title">Filters</h2>
          ${descriptionMarkup}
          <button type="button">Apply</button>
          <button type="button" data-part="close" id="s-close" aria-label="Close">x</button>
        </div>
      </rafters-sheet>
    </main>`;
  await Promise.resolve(); // the element binds one microtask after connecting
  return document.body.querySelector('main') as HTMLElement;
}

const scenes: ReadonlyArray<[string, Scene]> = [
  ['closed', {}],
  ['open', { open: true }],
  ['open with description', { open: true, description: true }],
  ['open on the left', { open: true, side: 'left' }],
  ['non-modal closed', { modal: false }],
  ['non-modal open', { modal: false, open: true }],
];

for (const [name, scene] of scenes) {
  test(`rafters-sheet ${name}`, async ({ task }) => {
    const host = await mount(scene);
    const results = await runAxe(host);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
