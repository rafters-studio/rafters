import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { Window } from 'happy-dom';
import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import Input from '../../../src/components/input/input.astro';
import { bindInput } from '../../../src/components/input/input.behavior';

async function mount(
  props: Record<string, unknown>,
  slots: Record<string, string> = {},
): Promise<Document> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Input, { props: { id: 'i', ...props }, slots });
  const window = new Window();
  const document = window.document as unknown as Document;
  // input.astro renders the bare control; the accessible name is the page's
  // job, so every scene pairs it with a visible label by id.
  document.body.innerHTML = `<main><div><label for="i">Name</label>${html}</div></main>`;
  // The page <script> binds the input's parent; the Container never runs it.
  const input = document.querySelector('input[data-part="input"]') as HTMLInputElement;
  bindInput((input.closest('[data-part="row"]') ?? input).parentElement as HTMLElement);
  return document;
}

const scenes: ReadonlyArray<[string, Record<string, unknown>]> = [
  ['valid and empty', {}],
  ['filled', { defaultValue: 'Ada' }],
  ['invalid with an error message', { invalid: true, error: 'Required' }],
  ['required', { required: true }],
  ['disabled', { disabled: true, defaultValue: 'seed' }],
  ['read-only', { readonly: true, defaultValue: 'seed' }],
  ['email with placeholder', { type: 'email', name: 'email', placeholder: 'you@x.com' }],
];

for (const [name, props] of scenes) {
  test(`input.astro ${name}`, async ({ task }) => {
    const document = await mount(props);
    const results = await runAxe(document.body);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}

test('input.astro with start and end icons, svg title does not leak into the name', async ({
  task,
}) => {
  const document = await mount(
    {},
    {
      'start-icon': '<svg viewBox="0 0 24 24"><title>Magnifier</title></svg>',
      'end-icon': '<svg viewBox="0 0 24 24"><title>Clear</title></svg>',
    },
  );
  const results = await runAxe(document.body);
  task.meta.axe = results;
  expect(results.violations).toEqual([]);
  expect(document.querySelectorAll('[data-icon][aria-hidden="true"]').length).toBe(2);
});
