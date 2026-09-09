import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { Window } from 'happy-dom';
import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import Checkbox from '../../../src/components/checkbox/checkbox.astro';
import { bindCheckbox } from '../../../src/components/checkbox/checkbox.behavior';

async function mount(props: Record<string, unknown>, before = ''): Promise<Document> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Checkbox, {
    props: { id: 'c', 'aria-label': 'Accept terms', ...props },
  });
  const window = new Window();
  const document = window.document as unknown as Document;
  document.body.innerHTML = `<main>${before}${html}</main>`;
  // The page <script> does this per instance; the Container never runs it.
  bindCheckbox(document.querySelector('button[data-part="root"]') as HTMLElement);
  return document;
}

const scenes: ReadonlyArray<[string, Record<string, unknown>]> = [
  ['unchecked default', {}],
  ['checked', { checked: true }],
  ['indeterminate', { checked: 'indeterminate' }],
  ['required', { required: true }],
  ['hard disabled', { disabled: true }],
  ['destructive lg checked', { checked: true, variant: 'destructive', size: 'lg' }],
  ['named with a hidden input', { name: 'terms', checked: true }],
];

for (const [name, props] of scenes) {
  test(`checkbox.astro ${name}`, async ({ task }) => {
    const document = await mount(props);
    const results = await runAxe(document.body);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}

test('checkbox.astro labelled by visible text', async ({ task }) => {
  const document = await mount(
    { 'aria-label': undefined, 'aria-labelledby': 'terms-label' },
    '<span id="terms-label">Accept terms</span>',
  );
  const results = await runAxe(document.body);
  task.meta.axe = results;
  expect(results.violations).toEqual([]);
});
