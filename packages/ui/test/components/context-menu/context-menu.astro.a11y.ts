import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { Window } from 'happy-dom';
import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import ContextMenu from '../../../src/components/context-menu/context-menu.astro';
import { bindContextMenu } from '../../../src/components/context-menu/context-menu.behavior';

const items = [
  { label: 'Cut' },
  { label: 'Copy' },
  { type: 'separator' as const },
  { label: 'Paste', disabled: true },
  { label: 'Delete', shortcut: 'Del' },
];

// context-menu-sub.astro is composed here through the parent's `sub` entries,
// nested to the same depth the astro conformance test renders.
const itemsWithSub = [
  { label: 'Cut' },
  {
    type: 'sub' as const,
    label: 'More',
    subItems: [
      { label: 'Deep' },
      { type: 'sub' as const, label: 'Even more', subItems: [{ label: 'Grandchild' }] },
    ],
  },
];

interface Scene {
  items?: typeof items | typeof itemsWithSub;
  open?: boolean;
  /** Open the first submenu with ArrowRight from its focused sub-trigger. */
  subOpen?: boolean;
}

async function mount({
  items: menuItems = items,
  open = false,
  subOpen = false,
}: Scene): Promise<Document> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(ContextMenu, {
    props: { id: 'cm', triggerLabel: 'Right-click here', items: menuItems },
  });
  const window = new Window();
  const document = window.document as unknown as Document;
  document.body.innerHTML = `<main>${html}</main>`;
  // The page <script> does this per instance; the Container never runs it.
  bindContextMenu(document.querySelector('[data-context-menu-root]') as HTMLElement);
  if (open) {
    const trigger = document.querySelector('[data-part="trigger"]') as HTMLElement;
    trigger.dispatchEvent(
      new window.MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        clientX: 12,
        clientY: 22,
      }),
    );
  }
  if (subOpen) {
    const subTrigger = document.querySelector('[data-part="sub-trigger"]') as HTMLElement;
    subTrigger.focus();
    subTrigger.dispatchEvent(
      new window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }),
    );
  }
  return document;
}

const scenes: ReadonlyArray<[string, Scene]> = [
  ['SSR closed', {}],
  ['SSR closed with submenus', { items: itemsWithSub }],
  ['open', { open: true }],
  ['open with submenu collapsed', { items: itemsWithSub, open: true }],
  ['open with submenu expanded', { items: itemsWithSub, open: true, subOpen: true }],
];

for (const [name, scene] of scenes) {
  test(`context-menu.astro ${name}`, async ({ task }) => {
    const document = await mount(scene);
    const results = await runAxe(document.body);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
