import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { Window } from 'happy-dom';
import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import Menubar from '../../../src/components/menubar/menubar.astro';
import { bindMenubar } from '../../../src/components/menubar/menubar.behavior';

const menus = [
  {
    value: 'file',
    label: 'File',
    items: [
      { label: 'New', shortcut: 'Cmd+N' },
      { label: 'Share', disabled: true },
      { label: 'Print' },
    ],
  },
  { value: 'edit', label: 'Edit', items: [{ label: 'Undo' }, { label: 'Redo' }] },
];

interface Scene {
  bind?: boolean;
  open?: boolean;
}

async function mount({ bind = true, open = false }: Scene): Promise<Document> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Menubar, { props: { id: 'mb', menus } });
  const window = new Window();
  const document = window.document as unknown as Document;
  document.body.innerHTML = `<main>${html}</main>`;
  // The page <script> does this per instance; the Container never runs it.
  if (bind) bindMenubar(document.querySelector('rafters-menubar') as HTMLElement);
  if (open) (document.querySelector('[data-part="trigger"]') as HTMLElement).click();
  return document;
}

const scenes: ReadonlyArray<[string, Scene]> = [
  ['server markup, before the script runs', { bind: false }],
  ['closed', {}],
  ['open', { open: true }],
];

for (const [name, scene] of scenes) {
  test(`menubar.astro ${name}`, async ({ task }) => {
    const document = await mount(scene);
    const results = await runAxe(document.body);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
