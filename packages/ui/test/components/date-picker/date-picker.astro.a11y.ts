import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { Window } from 'happy-dom';
import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import DatePicker from '../../../src/components/date-picker/date-picker.astro';
import { bindDatePicker } from '../../../src/components/date-picker/date-picker.behavior';

async function mount(props: Record<string, unknown>, open: boolean): Promise<Document> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(DatePicker, {
    props: { id: 'dp', today: '2026-07-20', defaultMonth: '2026-07-01', ...props },
  });
  const window = new Window();
  const document = window.document as unknown as Document;
  document.body.innerHTML = `<main>${html}</main>`;
  const root = document.querySelector('[data-part="root"][data-date-picker]') as HTMLElement;
  // The page <script> does this per instance; the Container never runs it.
  bindDatePicker(root);
  if (open) root.querySelector<HTMLElement>('[data-part="trigger"]')?.click();
  return document;
}

const scenes: ReadonlyArray<[string, Record<string, unknown>, boolean]> = [
  ['closed, nothing selected', {}, false],
  ['closed with a value', { value: '2026-07-08' }, false],
  ['open, nothing selected', {}, true],
  ['open with a value', { value: '2026-07-08' }, true],
  ['open range with both ends', { mode: 'range', value: '2026-07-10..2026-07-14' }, true],
  ['form-associated', { name: 'due', value: '2026-07-08' }, false],
  ['disabled', { disabled: true }, false],
];

for (const [name, props, open] of scenes) {
  test(`date-picker.astro ${name}`, async ({ task }) => {
    const document = await mount(props, open);
    const results = await runAxe(document.body);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
