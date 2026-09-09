import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { Window } from 'happy-dom';
import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import InputOtp from '../../../src/components/input-otp/input-otp.astro';
import { bindInputOtp } from '../../../src/components/input-otp/input-otp.behavior';

async function mount(props: Record<string, unknown>): Promise<Document> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(InputOtp, {
    props: { id: 'otp', maxLength: 6, ...props },
  });
  const window = new Window();
  const document = window.document as unknown as Document;
  document.body.innerHTML = `<main>${html}</main>`;
  // The page <script> does this per instance; the Container never runs it.
  bindInputOtp(document.querySelector('[data-part="root"]') as HTMLElement);
  return document;
}

const scenes: ReadonlyArray<[string, Record<string, unknown>]> = [
  ['empty', {}],
  ['grouped 3-3 with a separator', { groups: [3, 3] }],
  ['partially filled', { defaultValue: '123' }],
  ['complete', { defaultValue: '123456', groups: [3, 3] }],
  ['disabled', { disabled: true, defaultValue: '12' }],
  ['required with a form name', { required: true, name: 'code' }],
  ['custom accessible name', { 'aria-label': 'Verification code' }],
];

for (const [name, props] of scenes) {
  test(`input-otp.astro ${name}`, async ({ task }) => {
    const document = await mount(props);
    const results = await runAxe(document.body);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
