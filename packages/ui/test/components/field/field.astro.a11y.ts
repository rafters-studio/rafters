import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { Window } from 'happy-dom';
import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import Field from '../../../src/components/field/field.astro';
import { bindField } from '../../../src/components/field/field.behavior';

async function mount(props: Record<string, unknown>): Promise<Document> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Field, {
    props: { id: 'email', label: 'Email', ...props },
    // The slotted control carries the same id the field prop declares.
    slots: { default: '<input id="email" type="email" />' },
  });
  const window = new Window();
  const document = window.document as unknown as Document;
  document.body.innerHTML = `<main>${html}</main>`;
  // The page <script> does this per instance; the Container never runs it.
  bindField(document.querySelector('rafters-field') as HTMLElement);
  return document;
}

const scenes: ReadonlyArray<[string, Record<string, unknown>]> = [
  ['basic', {}],
  ['with description', { description: 'We never share your email' }],
  [
    'error with description hidden',
    { description: 'We never share your email', error: 'Email is required' },
  ],
  ['required', { required: true }],
  ['disabled', { disabled: true }],
];

for (const [name, props] of scenes) {
  test(`field.astro ${name}`, async ({ task }) => {
    const document = await mount(props);
    const results = await runAxe(document.body);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
