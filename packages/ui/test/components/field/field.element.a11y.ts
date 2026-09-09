import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import '../../../src/components/field/field.element';

interface Scene {
  description?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
}

function helper({ description, error }: Scene): string {
  // The description yields to the error: at most one helper node is authored.
  if (error) return `<div data-part="error" id="email-error" role="alert">${error}</div>`;
  if (description)
    return `<div data-part="description" id="email-description">${description}</div>`;
  return '';
}

async function mount(scene: Scene): Promise<HTMLElement> {
  const signals = `${scene.required ? ' data-required' : ''}${scene.disabled ? ' data-disabled' : ''}`;
  document.body.innerHTML = `
    <main>
      <rafters-field${signals}>
        <label data-part="label">Email</label>
        <input data-part="control" id="email" type="email" />
        ${helper(scene)}
      </rafters-field>
    </main>`;
  await Promise.resolve(); // the element binds one microtask after connecting
  return document.body.querySelector('main') as HTMLElement;
}

const scenes: ReadonlyArray<[string, Scene]> = [
  ['basic', {}],
  ['with description', { description: 'We never share your email' }],
  ['error', { error: 'Email is required' }],
  ['required', { required: true }],
  ['disabled', { disabled: true }],
];

for (const [name, scene] of scenes) {
  test(`rafters-field ${name}`, async ({ task }) => {
    const host = await mount(scene);
    const results = await runAxe(host);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
