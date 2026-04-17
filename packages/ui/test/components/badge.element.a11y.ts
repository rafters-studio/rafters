import { afterEach, describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import '../../src/components/ui/badge.element';

afterEach(() => {
  while (document.body.firstChild) {
    document.body.removeChild(document.body.firstChild);
  }
});

describe('<rafters-badge> a11y', () => {
  it('has no accessibility violations in default state', async () => {
    const el = document.createElement('rafters-badge');
    el.textContent = 'New';
    document.body.appendChild(el);
    // The region rule fires on standalone harness bodies lacking a landmark;
    // the badge itself has no landmark responsibilities, mirroring badge.tsx.
    const results = await axe(document.body, { rules: { region: { enabled: false } } });
    expect(results).toHaveNoViolations();
  });

  it('matches the semantic role of badge.tsx (generic span, no implicit role)', () => {
    const el = document.createElement('rafters-badge');
    el.textContent = 'Active';
    document.body.appendChild(el);
    const span = el.shadowRoot?.querySelector('span.badge');
    expect(span).not.toBeNull();
    expect(span?.getAttribute('role')).toBeNull();
    expect(el.getAttribute('role')).toBeNull();
  });

  it('exposes slotted text content to assistive technology', () => {
    const el = document.createElement('rafters-badge');
    el.textContent = 'Pending';
    document.body.appendChild(el);
    expect(el.textContent).toBe('Pending');
  });
});
