import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import '../../../src/components/field/field.element';

const controls: ReadonlyArray<[string, string]> = [
  ['input', '<input id="email" type="email">'],
  ['select', '<select id="email"><option value="a">A</option></select>'],
  ['textarea', '<textarea id="email"></textarea>'],
];

const description = '<div data-part="description" id="email-description">We never share it</div>';
const error = '<div data-part="error" id="email-error" role="alert">Email is required</div>';

const scenes: ReadonlyArray<[string, string, string]> = [
  ['basic', '', ''],
  ['with description', '', description],
  ['with error', '', error],
  ['with description and error', '', description + error],
  ['required', 'data-required', ''],
];

for (const [control, controlHtml] of controls) {
  for (const [name, hostAttrs, parts] of scenes) {
    test(`rafters-field ${control} ${name}`, async ({ task }) => {
      document.body.innerHTML = `<main><rafters-field ${hostAttrs}><label data-part="label">Email</label>${controlHtml}${parts}</rafters-field></main>`;
      await Promise.resolve();
      const results = await runAxe(document.body.querySelector('main') as HTMLElement);
      task.meta.axe = results;
      expect(results.violations).toEqual([]);
    });
  }
}
