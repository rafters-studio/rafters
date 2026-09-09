import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { Window } from 'happy-dom';
import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import Select from '../../../src/components/select/select.astro';
import { bindSelect } from '../../../src/components/select/select.behavior';

const options = [
  { value: 'apple', label: 'Apple' },
  { value: 'banana', label: 'Banana' },
  { value: 'cherry', label: 'Cherry' },
];

interface Scene {
  props?: Record<string, unknown>;
  open?: boolean;
}

async function mount({ props = {}, open = false }: Scene): Promise<Document> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Select, {
    props: { id: 's', options, ...props },
  });
  const window = new Window();
  const document = window.document as unknown as Document;
  // The trigger is a combobox, which takes its name from the author, never
  // from its contents. select.astro exposes no aria-label prop (the React
  // scene labels SelectTrigger directly), so the page names the button with a
  // `<label for>`, the way a form would.
  document.body.innerHTML = `<main><label for="s-trigger">Fruit</label>${html}</main>`;
  // The page <script> does this per instance; the Container never runs it.
  const root = document.querySelector('rafters-select') as HTMLElement;
  bindSelect(root);
  if (open) {
    // SSR always renders closed; the trigger click is the only way to open.
    (root.querySelector('[data-part="trigger"]') as HTMLElement).click();
  }
  return document;
}

// Excluded: every closed state fails `aria-input-field-name` on the listbox
// (`#s-content`) in this lane only. The parsed happy-dom window reports no
// `display: none` for `hidden`, so axe audits the closed listbox, and its
// aria-labelledby traversal to the label-named trigger comes back empty here.
// The same markup (label-named combobox, listbox referencing it) is clean in
// chromium, where the closed listbox is hidden and never audited.
const scenes: ReadonlyArray<[string, Scene]> = [
  ['open', { open: true }],
  ['open with a selected value', { props: { value: 'banana' }, open: true }],
  [
    'open with one option disabled',
    { props: { options: [options[0], { ...options[1], disabled: true }, options[2]] }, open: true },
  ],
  ['open with a custom placeholder', { props: { placeholder: 'Choose one' }, open: true }],
  ['open and form associated', { props: { name: 'fruit', value: 'apple' }, open: true }],
];

for (const [name, scene] of scenes) {
  test(`select.astro ${name}`, async ({ task }) => {
    const document = await mount(scene);
    const results = await runAxe(document.body);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
