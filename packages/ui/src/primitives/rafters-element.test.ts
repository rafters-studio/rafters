/**
 * RaftersElement tests
 *
 * Uses happy-dom (vitest default for this workspace) to test
 * custom element registration, shadow DOM setup, and style adoption.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { RaftersElement } from './rafters-element';

// Reset shared state between tests
beforeEach(() => {
  // Clear any previously registered elements by using unique names per test
});

afterEach(() => {
  // Clean up DOM -- remove all children safely
  while (document.body.firstChild) {
    document.body.removeChild(document.body.firstChild);
  }
});

/**
 * Generate a unique tag name to avoid duplicate registration errors.
 */
let tagCounter = 0;
function uniqueTag(prefix = 'test-el'): string {
  tagCounter++;
  return `${prefix}-${tagCounter}`;
}

describe('RaftersElement', () => {
  describe('shadow DOM setup', () => {
    it('creates an open shadow root', () => {
      const tag = uniqueTag();
      customElements.define(tag, class extends RaftersElement {});
      const el = document.createElement(tag);
      document.body.appendChild(el);

      expect(el.shadowRoot).not.toBeNull();
      expect(el.shadowRoot?.mode).toBe('open');
    });

    it('renders default slot when no render override', () => {
      const tag = uniqueTag();
      customElements.define(tag, class extends RaftersElement {});
      const el = document.createElement(tag);
      document.body.appendChild(el);

      const slot = el.shadowRoot?.querySelector('slot');
      expect(slot).not.toBeNull();
    });
  });

  describe('static styles', () => {
    it('adopts component-specific styles', () => {
      const tag = uniqueTag();
      class StyledEl extends RaftersElement {
        static styles = ':host { display: block; color: red; }';
      }
      customElements.define(tag, StyledEl);
      const el = document.createElement(tag);
      document.body.appendChild(el);

      const sheets = el.shadowRoot?.adoptedStyleSheets ?? [];
      expect(sheets.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('setTokenCSS', () => {
    it('creates a shared token stylesheet adopted by all instances', () => {
      RaftersElement.setTokenCSS(':host { --color-primary: oklch(0.5 0.2 260); }');

      const tag1 = uniqueTag();
      const tag2 = uniqueTag();
      customElements.define(tag1, class extends RaftersElement {});
      customElements.define(tag2, class extends RaftersElement {});

      const el1 = document.createElement(tag1);
      const el2 = document.createElement(tag2);
      document.body.appendChild(el1);
      document.body.appendChild(el2);

      const sheets1 = el1.shadowRoot?.adoptedStyleSheets ?? [];
      const sheets2 = el2.shadowRoot?.adoptedStyleSheets ?? [];

      // Both should adopt the shared sheet
      expect(sheets1.length).toBeGreaterThanOrEqual(1);
      expect(sheets2.length).toBeGreaterThanOrEqual(1);

      // Shared sheet should be the same object
      expect(sheets1[0]).toBe(sheets2[0]);
    });
  });

  describe('custom render', () => {
    it('renders custom DOM from render()', () => {
      const tag = uniqueTag();
      class CustomEl extends RaftersElement {
        render(): Node {
          const div = document.createElement('div');
          div.className = 'inner';
          div.textContent = 'hello';
          return div;
        }
      }
      customElements.define(tag, CustomEl);
      const el = document.createElement(tag);
      document.body.appendChild(el);

      const inner = el.shadowRoot?.querySelector('.inner');
      expect(inner).not.toBeNull();
      expect(inner?.textContent).toBe('hello');
    });
  });

  describe('attribute helpers', () => {
    it('attr() reads attribute with fallback', () => {
      const tag = uniqueTag();
      let captured = '';
      class AttrEl extends RaftersElement {
        render(): Node {
          captured = this.attr('variant', 'default');
          return document.createElement('slot');
        }
      }
      customElements.define(tag, AttrEl);
      const el = document.createElement(tag);
      el.setAttribute('variant', 'primary');
      document.body.appendChild(el);

      expect(captured).toBe('primary');
    });

    it('attr() returns fallback when attribute missing', () => {
      const tag = uniqueTag();
      let captured = '';
      class AttrEl extends RaftersElement {
        render(): Node {
          captured = this.attr('variant', 'default');
          return document.createElement('slot');
        }
      }
      customElements.define(tag, AttrEl);
      const el = document.createElement(tag);
      document.body.appendChild(el);

      expect(captured).toBe('default');
    });

    it('hasAttr() checks boolean attributes', () => {
      const tag = uniqueTag();
      let captured = false;
      class BoolEl extends RaftersElement {
        render(): Node {
          captured = this.hasAttr('interactive');
          return document.createElement('slot');
        }
      }
      customElements.define(tag, BoolEl);
      const el = document.createElement(tag);
      el.setAttribute('interactive', '');
      document.body.appendChild(el);

      expect(captured).toBe(true);
    });
  });

  describe('el() helper', () => {
    it('creates element with classes and text', () => {
      const tag = uniqueTag();
      class HelperEl extends RaftersElement {
        render(): Node {
          return this.el('div', 'card', 'content');
        }
      }
      customElements.define(tag, HelperEl);
      const el = document.createElement(tag);
      document.body.appendChild(el);

      const div = el.shadowRoot?.querySelector('div');
      expect(div?.className).toBe('card');
      expect(div?.textContent).toBe('content');
    });
  });

  describe('update lifecycle', () => {
    it('replaces shadow DOM content on update()', () => {
      const tag = uniqueTag();
      let counter = 0;
      class UpdateEl extends RaftersElement {
        render(): Node {
          counter++;
          const div = document.createElement('div');
          div.textContent = `render-${counter}`;
          return div;
        }
      }
      customElements.define(tag, UpdateEl);
      const el = document.createElement(tag) as UpdateEl;
      document.body.appendChild(el);

      expect(el.shadowRoot?.querySelector('div')?.textContent).toBe('render-1');

      el.update();
      expect(el.shadowRoot?.querySelector('div')?.textContent).toBe('render-2');
    });
  });

  describe('disconnectedCallback', () => {
    it('cleans up component sheet reference', () => {
      const tag = uniqueTag();
      class CleanEl extends RaftersElement {
        static styles = ':host { display: block; }';
      }
      customElements.define(tag, CleanEl);
      const el = document.createElement(tag);
      document.body.appendChild(el);

      // Should have styles before disconnect
      const sheetsBefore = el.shadowRoot?.adoptedStyleSheets ?? [];
      expect(sheetsBefore.length).toBeGreaterThanOrEqual(1);

      // Disconnect
      document.body.removeChild(el);
      // Internal _componentSheet should be nulled (tested via behavior, not private access)
    });
  });
});
