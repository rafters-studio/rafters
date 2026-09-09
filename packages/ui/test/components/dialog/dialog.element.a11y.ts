import { expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { runAxe } from '../../a11y/run-axe';
import '../../../src/components/dialog/dialog.element';

interface Scene {
  modal?: boolean;
  open?: boolean;
  withDescription?: boolean;
}

async function mount({
  modal = true,
  open = false,
  withDescription = false,
}: Scene): Promise<HTMLElement> {
  const describedBy = withDescription ? ' aria-describedby="d-description"' : '';
  const description = withDescription
    ? '<p data-part="description" id="d-description">Adjust your preferences.</p>'
    : '';
  document.body.innerHTML = `
    <main>
      <rafters-dialog${modal ? '' : ' modal="false"'}>
        <button type="button" data-part="trigger" id="d-trigger" aria-haspopup="dialog" aria-expanded="false" data-state="closed">Open</button>
        <div data-part="overlay" id="d-overlay" aria-hidden="true" data-state="closed" hidden></div>
        <div data-part="content" id="d-content" role="dialog" tabindex="-1" aria-labelledby="d-title"${describedBy} data-state="closed" hidden>
          <h2 data-part="title" id="d-title">Settings</h2>
          ${description}
          <button type="button">Save</button>
          <button type="button" data-part="close" id="d-close" aria-label="Close">x</button>
        </div>
      </rafters-dialog>
    </main>`;
  await Promise.resolve(); // the element binds one microtask after connecting
  if (open) await page.getByRole('button', { name: 'Open' }).click();
  return document.body.querySelector('main') as HTMLElement;
}

const scenes: ReadonlyArray<[string, Scene]> = [
  ['closed', {}],
  ['open', { open: true }],
  ['open with description', { open: true, withDescription: true }],
  ['closed non-modal', { modal: false }],
  ['open non-modal', { modal: false, open: true }],
];

for (const [name, scene] of scenes) {
  test(`rafters-dialog ${name}`, async ({ task }) => {
    const host = await mount(scene);
    const results = await runAxe(host);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
