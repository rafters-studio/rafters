import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import '../../../src/components/popover/popover.element';

interface Scene {
  open?: boolean;
  withClose?: boolean;
}

async function mount({ open = false, withClose = true }: Scene): Promise<HTMLElement> {
  // bindPopover reads data-default-open from the root, so the open scene is
  // markup, not a gesture. The dialog's name is the consumer's aria-label.
  const close = withClose
    ? '<button type="button" data-part="close" id="p-close">Dismiss</button>'
    : '';
  document.body.innerHTML = `
    <main>
      <rafters-popover data-part="root" data-side="bottom" data-align="center" data-default-open="${open}">
        <button type="button" data-part="trigger" id="p-trigger" aria-haspopup="dialog" aria-expanded="false" data-state="closed">Open</button>
        <div data-part="content" id="p-content" role="dialog" aria-label="Menu options" tabindex="-1" data-state="closed" data-side="bottom" data-align="center" hidden>
          <button type="button">Action</button>
          ${close}
        </div>
      </rafters-popover>
    </main>`;
  await Promise.resolve(); // the element binds one microtask after connecting
  return document.body.querySelector('main') as HTMLElement;
}

const scenes: ReadonlyArray<[string, Scene]> = [
  ['closed', {}],
  ['open', { open: true }],
  ['open without a close button', { open: true, withClose: false }],
];

for (const [name, scene] of scenes) {
  test(`rafters-popover ${name}`, async ({ task }) => {
    const host = await mount(scene);
    const results = await runAxe(host);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
