import { expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { runAxe } from '../../a11y/run-axe';
import '../../../src/components/dropdown-menu/dropdown-menu.element';

interface Scene {
  open?: boolean;
  disabledItem?: boolean;
  icons?: boolean;
}

function itemMarkup(label: string, disabled = false): string {
  const dis = disabled ? 'data-disabled aria-disabled="true"' : 'tabindex="-1"';
  return `<div role="menuitem" data-part="item" data-roving-item ${dis}>${label}</div>`;
}

function iconItem(label: string): string {
  return `<div role="menuitem" data-part="item" data-roving-item tabindex="-1"><svg slot="start-icon" width="16" height="16" viewBox="0 0 24 24"><title>Item mark</title><rect width="24" height="24" fill="currentColor"/></svg>${label}</div>`;
}

async function mount({
  open = false,
  disabledItem = true,
  icons = false,
}: Scene): Promise<HTMLElement> {
  document.body.innerHTML = `
    <main>
      <rafters-dropdown-menu data-part="root">
        <button type="button" data-part="trigger" id="dm-trigger">Options</button>
        <div data-part="content" id="dm-content" hidden>
          ${icons ? iconItem('Edit') : itemMarkup('Edit')}
          ${itemMarkup('Duplicate')}
          ${itemMarkup('Archive', disabledItem)}
          ${itemMarkup('Delete')}
        </div>
      </rafters-dropdown-menu>
    </main>`;
  await Promise.resolve(); // the element binds one microtask after connecting
  if (open) await page.getByRole('button', { name: 'Options' }).click();
  return document.body.querySelector('main') as HTMLElement;
}

const scenes: ReadonlyArray<[string, Scene]> = [
  ['closed', {}],
  ['open', { open: true }],
  ['open with every item enabled', { open: true, disabledItem: false }],
  ['open with a start icon', { open: true, icons: true }],
];

for (const [name, scene] of scenes) {
  test(`rafters-dropdown-menu ${name}`, async ({ task }) => {
    const host = await mount(scene);
    const results = await runAxe(host);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
