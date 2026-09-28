import { expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { runAxe } from '../../a11y/run-axe';
import '../../../src/components/menubar/menubar.element';

interface Scene {
  open?: boolean;
}

function itemMarkup(label: string, disabled = false): string {
  const dis = disabled ? 'data-disabled aria-disabled="true"' : 'tabindex="-1"';
  return `<div role="menuitem" data-part="item" data-roving-item ${dis}>${label}</div>`;
}

async function mount({ open = false }: Scene): Promise<HTMLElement> {
  document.body.innerHTML = `
    <main>
      <rafters-menubar data-part="root" id="mb-root">
        <button type="button" data-part="trigger" data-value="file" id="mb-trigger-file">File</button>
        <button type="button" data-part="trigger" data-value="edit" id="mb-trigger-edit">Edit</button>
        <div data-part="content" data-value="file" id="mb-content-file" hidden>
          ${itemMarkup('New')}${itemMarkup('Share', true)}${itemMarkup('Print')}
        </div>
        <div data-part="content" data-value="edit" id="mb-content-edit" hidden>
          ${itemMarkup('Undo')}${itemMarkup('Redo')}
        </div>
      </rafters-menubar>
    </main>`;
  await Promise.resolve(); // the element binds one microtask after connecting
  if (open) await page.getByRole('menuitem', { name: 'File' }).click();
  return document.body;
}

const scenes: ReadonlyArray<[string, Scene]> = [
  ['closed', {}],
  ['open', { open: true }],
];

for (const [name, scene] of scenes) {
  test(`rafters-menubar ${name}`, async ({ task }) => {
    // The menus move out of the bar to sit right after it, still inside <main>.
    const host = await mount(scene);
    const results = await runAxe(host);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
