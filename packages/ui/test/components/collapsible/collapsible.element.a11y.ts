import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import '../../../src/components/collapsible/collapsible.element';

interface Scene {
  open?: boolean;
  disabled?: boolean;
}

async function mount({ open = false, disabled = false }: Scene): Promise<HTMLElement> {
  const state = open ? 'open' : 'closed';
  document.body.innerHTML = `
    <main>
      <rafters-collapsible data-part="root" default-open="${open}" data-state="${state}">
        <button type="button" data-part="trigger" id="c-trigger" aria-expanded="${open}"${
          open ? ' aria-controls="c-content"' : ''
        } data-state="${state}"${disabled ? ' disabled' : ''}>Toggle</button>
        <div data-part="content" id="c-content" data-state="${state}"${open ? '' : ' hidden'}>
          <p>Revealed content</p>
        </div>
      </rafters-collapsible>
    </main>`;
  await Promise.resolve(); // the element binds one microtask after connecting
  return document.body.querySelector('main') as HTMLElement;
}

const scenes: ReadonlyArray<[string, Scene]> = [
  ['closed', {}],
  ['open', { open: true }],
  ['disabled closed', { disabled: true }],
  ['disabled open', { disabled: true, open: true }],
];

for (const [name, scene] of scenes) {
  test(`rafters-collapsible ${name}`, async ({ task }) => {
    const host = await mount(scene);
    const results = await runAxe(host);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
