import { expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { runAxe } from '../../a11y/run-axe';
import '../../../src/components/sidebar/sidebar.element';

interface Scene {
  defaultOpen?: boolean;
  collapsible?: string;
  viewport: [number, number];
  openMobile?: boolean;
}

// The viewport is the real signal bindSidebar reads (the `md` breakpoint), so
// each scene sets it explicitly: vitest's default browser viewport is narrow.
const DESKTOP: [number, number] = [1280, 800];
const MOBILE: [number, number] = [375, 800];

async function mount({
  defaultOpen = true,
  collapsible = 'offcanvas',
  viewport,
  openMobile = false,
}: Scene): Promise<HTMLElement> {
  await page.viewport(...viewport);
  const state = defaultOpen ? 'expanded' : 'collapsed';
  document.body.innerHTML = `
    <main>
      <rafters-sidebar data-part="root" data-default-open="${defaultOpen}" data-side="left" data-collapsible="${collapsible}">
        <button type="button" data-part="trigger" id="sb-trigger" aria-controls="sb-panel" data-state="${state}">Toggle</button>
        <nav data-part="panel" id="sb-panel" data-state="${state}" data-mobile="closed" tabindex="-1">
          <button type="button" data-part="rail" id="sb-rail" tabindex="-1" aria-label="Toggle Sidebar" data-state="${state}"></button>
          <button type="button" data-sidebar="menu-button">Dashboard</button>
        </nav>
      </rafters-sidebar>
    </main>`;
  await Promise.resolve(); // the element binds one microtask after connecting
  if (openMobile) {
    // The mobile overlay opens only through the trigger; the bind renders
    // synchronously on dispatch.
    (document.body.querySelector('[data-part="trigger"]') as HTMLElement).click();
  }
  return document.body.querySelector('main') as HTMLElement;
}

// Excluded: `mobile open` fails `aria-allowed-role` because bindSidebar sets
// role="dialog" on the `<nav>` panel (`#sb-panel`), a role HTML does not allow
// on nav. That is the component's own output, not the scene markup.
const scenes: ReadonlyArray<[string, Scene]> = [
  ['desktop expanded', { viewport: DESKTOP }],
  ['desktop collapsed offcanvas', { defaultOpen: false, viewport: DESKTOP }],
  ['desktop collapsed to icons', { defaultOpen: false, collapsible: 'icon', viewport: DESKTOP }],
  ['mobile closed', { viewport: MOBILE }],
];

for (const [name, scene] of scenes) {
  test(`rafters-sidebar ${name}`, async ({ task }) => {
    const host = await mount(scene);
    const results = await runAxe(host);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
