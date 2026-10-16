import { afterEach, expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import '../../../src/components/alert-dialog/alert-dialog.element';

async function mount(attrs: string): Promise<void> {
  document.body.innerHTML = `<main>
    <rafters-alert-dialog ${attrs}>
      <button type="button" data-part="trigger" id="a-trigger">Delete</button>
      <div data-part="overlay" id="a-overlay" hidden></div>
      <div id="a-container" hidden>
        <div data-part="content" id="a-content" tabindex="-1" hidden>
          <div id="a-header">
            <h2 data-part="title" id="a-title">Delete file?</h2>
            <div data-part="description" id="a-description">This cannot be undone.</div>
          </div>
          <div id="a-footer">
            <button type="button" data-part="cancel" id="a-cancel">Cancel</button>
            <button type="button" data-part="action" id="a-action">Delete</button>
          </div>
        </div>
      </div>
    </rafters-alert-dialog></main>`;
  await Promise.resolve();
}

afterEach(() => {
  document.body.innerHTML = '';
  document.body.style.overflow = '';
});

for (const [name, attrs] of [
  ['closed', ''],
  ['open', 'default-open="true"'],
] as const) {
  test(`alert-dialog.element ${name}`, async ({ task }) => {
    await mount(attrs);
    const results = await runAxe(document.body);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
