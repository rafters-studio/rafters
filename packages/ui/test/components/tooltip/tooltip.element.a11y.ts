import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import '../../../src/components/tooltip/tooltip.element';

interface Scene {
  open?: boolean;
  disableHoverableContent?: boolean;
}

/**
 * The light-DOM markup the element conformance test mounts, inside a landmark:
 * the host is the root, with the trigger and the always-present content as
 * siblings. The open scene is the SSR shape for a default-open tip.
 */
async function mount({ open = false, disableHoverableContent = false }: Scene) {
  const state = open ? 'open' : 'closed';
  const attrs = [
    'data-part="root"',
    open ? 'data-default-open="true"' : '',
    disableHoverableContent ? 'data-disable-hoverable-content="true"' : '',
  ]
    .filter(Boolean)
    .join(' ');
  document.body.innerHTML = `
    <main>
      <rafters-tooltip ${attrs}>
        <button type="button" data-part="trigger" id="t-trigger" data-state="${state}">Help</button>
        <div data-part="content" id="t-content" role="tooltip" data-state="${state}">More info</div>
      </rafters-tooltip>
    </main>`;
  await Promise.resolve(); // the element binds one microtask after connecting
  return document.body.querySelector('main') as HTMLElement;
}

const scenes: ReadonlyArray<[string, Scene]> = [
  ['closed', {}],
  ['open by default', { open: true }],
  ['hoverable content disabled', { disableHoverableContent: true }],
  ['open with hoverable content disabled', { open: true, disableHoverableContent: true }],
];

for (const [name, scene] of scenes) {
  test(`rafters-tooltip ${name}`, async ({ task }) => {
    const host = await mount(scene);
    const results = await runAxe(host);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
