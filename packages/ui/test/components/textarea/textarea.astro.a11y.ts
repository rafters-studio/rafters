import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { Window } from 'happy-dom';
import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import Textarea from '../../../src/components/textarea/textarea.astro';
import { bindTextarea } from '../../../src/components/textarea/textarea.behavior';

async function mount(props: Record<string, unknown>): Promise<Document> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Textarea, { props: { id: 't', ...props } });
  const window = new Window();
  const document = window.document as unknown as Document;
  // textarea.astro takes no aria-label prop: the consumer pairs it with a
  // <label>, as the component doc requires. The wrapper div is the binding
  // root the page <script> uses (the textarea's parent).
  document.body.innerHTML = `<main><label for="t">Message</label><div>${html}</div></main>`;
  const area = document.querySelector('textarea[data-part="textarea"]') as HTMLTextAreaElement;
  // The page <script> does this per instance; the Container never runs it.
  bindTextarea(area.parentElement as HTMLElement);
  return document;
}

const scenes: ReadonlyArray<[string, Record<string, unknown>]> = [
  ['valid empty', {}],
  ['invalid with error message', { invalid: true, error: 'Required' }],
  ['seeded value', { defaultValue: 'seeded body' }],
  ['required', { required: true }],
  ['disabled', { disabled: true, defaultValue: 'seed' }],
  ['read-only', { readonly: true, defaultValue: 'seed' }],
  ['placeholder and rows', { placeholder: 'Type here...', rows: 5, name: 'message' }],
];

for (const [name, props] of scenes) {
  test(`textarea.astro ${name}`, async ({ task }) => {
    const document = await mount(props);
    const results = await runAxe(document.body);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
