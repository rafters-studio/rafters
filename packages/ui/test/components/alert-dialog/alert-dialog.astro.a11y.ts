import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { Window } from 'happy-dom';
import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import AlertDialog from '../../../src/components/alert-dialog/alert-dialog.astro';
import { bindAlertDialog } from '../../../src/components/alert-dialog/alert-dialog.behavior';

async function mount(
  props: Record<string, unknown>,
  slots: Record<string, string> = {},
): Promise<Document> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(AlertDialog, { props: { id: 'a', ...props }, slots });
  const window = new Window();
  const document = window.document as unknown as Document;
  document.body.innerHTML = `<main>${html}</main>`;
  // The page <script> does this per instance; the Container never runs it.
  bindAlertDialog(document.querySelector('rafters-alert-dialog') as HTMLElement);
  return document;
}

const titled = { title: 'Are you sure?', description: 'This action cannot be undone.' };

const scenes: ReadonlyArray<[string, Record<string, unknown>, Record<string, string>]> = [
  ['closed', titled, {}],
  ['closed with a title only', { title: 'Are you sure?' }, {}],
  ['open', { ...titled, defaultOpen: true }, {}],
  ['open with a title only', { title: 'Are you sure?', defaultOpen: true }, {}],
  [
    'open with custom labels and slotted body',
    { ...titled, defaultOpen: true, cancelLabel: 'Keep', actionLabel: 'Delete' },
    { trigger: 'Delete account', default: '<p>Every file will be removed.</p>' },
  ],
];

for (const [name, props, slots] of scenes) {
  test(`alert-dialog.astro ${name}`, async ({ task }) => {
    const document = await mount(props, slots);
    const results = await runAxe(document.body);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
