import { afterEach, expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import '../../../src/components/dialog/dialog.element';

async function mount(attrs: string): Promise<HTMLElement> {
  document.body.innerHTML = `<main>
    <rafters-dialog ${attrs}>
      <button type="button" data-part="trigger" id="d-trigger">Open</button>
      <div data-part="overlay" id="d-overlay" hidden></div>
      <div id="d-container" hidden>
        <div data-part="content" id="d-content" tabindex="-1" hidden>
          <h2 data-part="title" id="d-title">Settings</h2>
          <p data-part="description" id="d-desc">Change your settings.</p>
          <button type="button" data-part="close" id="d-close">Close</button>
        </div>
      </div>
    </rafters-dialog></main>`;
  await Promise.resolve();
  return document.body.querySelector('main') as HTMLElement;
}

afterEach(() => {
  document.body.innerHTML = '';
});

for (const [name, attrs] of [
  ['closed', ''],
  ['open', 'default-open="true"'],
] as const) {
  test(`rafters-dialog ${name}`, async ({ task }) => {
    const host = await mount(attrs);
    const results = await runAxe(host);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
