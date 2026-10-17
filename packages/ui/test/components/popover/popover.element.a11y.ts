import { afterEach, expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import '../../../src/components/popover/popover.element';

async function mount(attrs: string): Promise<HTMLElement> {
  document.body.innerHTML = `
    <main>
      <rafters-popover ${attrs}>
        <button type="button" data-part="trigger" id="p-trigger">Open</button>
        <div data-part="content" id="p-content" tabindex="-1" aria-label="Details" hidden>
          <button type="button" id="p-save">Save</button>
          <button type="button" data-part="close" id="p-close">Close</button>
        </div>
      </rafters-popover>
    </main>`;
  await Promise.resolve();
  const host = document.body.querySelector('main');
  if (!host) throw new Error('missing main');
  return host;
}

afterEach(() => {
  document.body.innerHTML = '';
});

const scenes: ReadonlyArray<[string, string]> = [
  ['closed', ''],
  ['open', 'data-default-open="true"'],
];

for (const [name, attrs] of scenes) {
  test(`rafters-popover ${name}`, async ({ task }) => {
    const host = await mount(attrs);
    const results = await runAxe(host);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
