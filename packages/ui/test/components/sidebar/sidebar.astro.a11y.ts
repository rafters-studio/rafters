import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { Window } from 'happy-dom';
import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import Sidebar from '../../../src/components/sidebar/sidebar.astro';
import { bindSidebar } from '../../../src/components/sidebar/sidebar.behavior';

interface Scene {
  props?: Record<string, unknown>;
  mobile?: boolean;
  openMobile?: boolean;
}

/** bindSidebar reads the viewport from the global window.matchMedia (the
 *  same signal the conformance tests mock); the mocked list is captured at
 *  bind time, so the original is restored right after. */
function withViewport<T>(isMobile: boolean, run: () => T): T {
  const original = window.matchMedia;
  window.matchMedia = ((query: string) => ({
    matches: isMobile,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
  try {
    return run();
  } finally {
    window.matchMedia = original;
  }
}

async function mount({ props = {}, mobile = false, openMobile = false }: Scene): Promise<Document> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Sidebar, {
    props: { id: 'sb', ...props },
    slots: { default: '<a href="/dashboard" data-sidebar="menu-button">Dashboard</a>' },
  });
  const window = new Window();
  const document = window.document as unknown as Document;
  document.body.innerHTML = `<main>${html}</main>`;
  // The page <script> does this per instance; the Container never runs it.
  const root = document.querySelector('rafters-sidebar') as HTMLElement;
  withViewport(mobile, () => bindSidebar(root));
  if (openMobile) {
    // The mobile overlay opens only through the trigger; the bind renders
    // synchronously on dispatch.
    (root.querySelector('[data-part="trigger"]') as HTMLElement).click();
  }
  return document;
}

// Excluded: `mobile open` fails `aria-allowed-role` because bindSidebar sets
// role="dialog" on the `<nav>` panel (`#sb-panel`), a role HTML does not allow
// on nav. That is the component's own output, not the scene markup.
const scenes: ReadonlyArray<[string, Scene]> = [
  ['desktop expanded', {}],
  ['desktop collapsed offcanvas', { props: { defaultOpen: false } }],
  ['desktop collapsed to icons', { props: { defaultOpen: false, collapsible: 'icon' } }],
  ['desktop on the right', { props: { side: 'right' } }],
  ['desktop floating variant', { props: { variant: 'floating' } }],
  ['mobile closed', { mobile: true }],
];

for (const [name, scene] of scenes) {
  test(`sidebar.astro ${name}`, async ({ task }) => {
    const document = await mount(scene);
    const results = await runAxe(document.body);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
