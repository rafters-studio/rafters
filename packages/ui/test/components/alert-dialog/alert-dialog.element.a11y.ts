import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import '../../../src/components/alert-dialog/alert-dialog.element';

interface Scene {
  open?: boolean;
  withDescription?: boolean;
}

async function mount({ open = false, withDescription = false }: Scene): Promise<HTMLElement> {
  const description = withDescription
    ? '<p data-part="description" id="a-description">This action cannot be undone.</p>'
    : '';
  const describedBy = withDescription ? ' aria-describedby="a-description"' : '';
  document.body.innerHTML = `
    <main>
      <rafters-alert-dialog data-part="root" default-open="${open}">
        <button type="button" data-part="trigger" id="a-trigger" aria-haspopup="dialog" aria-expanded="false" data-state="closed">Delete</button>
        <div data-part="overlay" id="a-overlay" aria-hidden="true" data-state="closed" hidden></div>
        <div data-part="content" id="a-content" role="alertdialog" aria-modal="true" tabindex="-1" aria-labelledby="a-title"${describedBy} data-state="closed" hidden>
          <h2 data-part="title" id="a-title">Are you sure?</h2>
          ${description}
          <button type="button" data-part="cancel" id="a-cancel">Cancel</button>
          <button type="button" data-part="action" id="a-action">Delete</button>
        </div>
      </rafters-alert-dialog>
    </main>`;
  await Promise.resolve(); // the element binds one microtask after connecting
  return document.body.querySelector('main') as HTMLElement;
}

const scenes: ReadonlyArray<[string, Scene]> = [
  ['closed', {}],
  ['closed with a description', { withDescription: true }],
  ['open', { open: true }],
  ['open with a description', { open: true, withDescription: true }],
];

for (const [name, scene] of scenes) {
  test(`rafters-alert-dialog ${name}`, async ({ task }) => {
    const host = await mount(scene);
    const results = await runAxe(host);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
