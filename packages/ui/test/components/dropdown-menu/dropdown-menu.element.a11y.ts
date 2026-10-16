import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import '../../../src/components/dropdown-menu/dropdown-menu.element';

const scenes: ReadonlyArray<[string, string]> = [
  ['closed', ''],
  ['open', 'default-open="true"'],
];

for (const [name, attrs] of scenes) {
  test(`dropdown-menu.element ${name}`, async ({ task }) => {
    document.body.innerHTML = `<main>
      <rafters-dropdown-menu ${attrs}>
        <button type="button" data-part="trigger" id="dm-trigger">Actions</button>
        <div data-part="content" id="dm-content" hidden>
          <div role="menuitem" data-part="item" data-roving-item="" tabindex="-1"><svg slot="start-icon" viewBox="0 0 16 16"></svg>Edit</div>
          <div role="menuitem" data-part="item" data-roving-item="" data-disabled="" aria-disabled="true">Archive</div>
          <div role="menuitem" data-part="item" data-roving-item="" tabindex="-1">Delete</div>
        </div>
      </rafters-dropdown-menu>
    </main>`;
    await Promise.resolve();
    const results = await runAxe(document.body);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
