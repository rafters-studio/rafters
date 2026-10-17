import { afterEach, expect, test } from 'vitest';
import { run } from 'axe-core';
import { runAxe } from '../../a11y/run-axe';
import '../../../src/components/context-menu/context-menu.element';

async function mount(): Promise<HTMLElement> {
  document.body.innerHTML = `<main>
    <rafters-context-menu>
      <span data-part="trigger" id="cm-trigger" tabindex="-1">Right-click here</span>
      <div data-part="content" id="cm-content" role="menu" aria-label="Actions" hidden>
        <div role="menuitem" tabindex="-1"><svg slot="start-icon" viewBox="0 0 16 16"></svg>Cut<kbd>Ctrl+X</kbd></div>
        <div role="menuitem" tabindex="-1">Copy</div>
        <div data-part="sub" id="cm-sub">
          <div data-part="sub-trigger" id="cm-sub-trigger" role="menuitem" tabindex="-1">More</div>
          <div data-part="sub-content" id="cm-sub-content" role="menu" aria-label="More">
            <div role="menuitem" tabindex="-1">Deep</div>
          </div>
        </div>
      </div>
    </rafters-context-menu></main>`;
  await Promise.resolve();
  return document.body;
}

function open(): void {
  document
    .getElementById('cm-trigger')
    ?.dispatchEvent(
      new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 10, clientY: 10 }),
    );
}

afterEach(() => {
  document.body.innerHTML = '';
});

test('rafters-context-menu closed', async ({ task }) => {
  const host = await mount();
  const results = await runAxe(host);
  task.meta.axe = results;
  expect(results.violations).toEqual([]);
});

test('rafters-context-menu open', async ({ task }) => {
  const host = await mount();
  open();
  const results = await runAxe(host);
  task.meta.axe = results;
  expect(results.violations).toEqual([]);
});

test('rafters-context-menu open with submenu open', async ({ task }) => {
  const host = await mount();
  open();
  const subTrigger = document.getElementById('cm-sub-trigger') as HTMLElement;
  subTrigger.focus();
  subTrigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
  // The sub-content moves to document.body, outside the page landmark, so the
  // landmark-coverage rule is not meaningful for that popup.
  const results = await run(host, { rules: { region: { enabled: false } } });
  task.meta.axe = results;
  expect(results.violations).toEqual([]);
});
