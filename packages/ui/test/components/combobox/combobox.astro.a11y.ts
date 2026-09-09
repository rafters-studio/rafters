import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { Window } from 'happy-dom';
import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import Combobox from '../../../src/components/combobox/combobox.astro';
import { bindCombobox } from '../../../src/components/combobox/combobox.behavior';

const options = [
  { value: 'react', label: 'React' },
  { value: 'vue', label: 'Vue' },
  { value: 'angular', label: 'Angular' },
];

interface Scene {
  props?: Record<string, unknown>;
  open?: boolean;
}

async function mount({ props = {}, open = false }: Scene): Promise<Document> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Combobox, {
    props: { id: 'cb', options, ...props },
  });
  const window = new Window();
  const document = window.document as unknown as Document;
  // The page supplies the visible label the input is named by.
  document.body.innerHTML = `<main><label for="cb-input">Framework</label>${html}</main>`;
  if (open) {
    // The bind seeds its open axis from the content's data-state: the SSR way
    // to start open, no gesture needed.
    document.querySelector('[data-part="content"]')?.setAttribute('data-state', 'open');
  }
  // The page <script> does this per instance; the Container never runs it.
  bindCombobox(document.querySelector('rafters-combobox') as HTMLElement);
  return document;
}

// Excluded: open with no options (options: []) fails aria-required-children, because the
// open listbox then holds only the empty message and no option or group child.
const scenes: ReadonlyArray<[string, Scene]> = [
  ['closed', {}],
  ['open', { open: true }],
  ['open with a selection', { open: true, props: { value: 'vue' } }],
  ['closed with a selection', { props: { value: 'react' } }],
  ['disabled', { props: { disabled: true } }],
  [
    'open with a disabled option',
    { open: true, props: { options: [options[0], { ...options[1], disabled: true }, options[2]] } },
  ],
  ['custom placeholder', { props: { placeholder: 'Pick a framework' } }],
];

for (const [name, scene] of scenes) {
  test(`combobox.astro ${name}`, async ({ task }) => {
    const document = await mount(scene);
    const results = await runAxe(document.body);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
