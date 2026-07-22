/**
 * Resizable conformance suite -- one suite, run per render adapter. The React
 * and WC conformance tests are each their adapter plus a call into
 * runResizableConformance. Astro drives the same score from its own file.
 */
import { describe, expect, it } from 'vitest';
import userEvent from '@testing-library/user-event';
import {
  resizableBehavior,
  type ResizableConfig,
  type ResizableDirection,
} from '../../../src/components/resizable/resizable.behavior';
import {
  assertAxeClean,
  assertContractFulfillment,
  assertInstanceAriaFulfillment,
  partElement,
  partElements,
  type RenderResult,
} from '../../harness/conformance';

export interface ScenarioPanel {
  defaultSize: number;
  minSize?: number;
  maxSize?: number;
}

export interface ResizableScenarioProps {
  direction?: ResizableDirection;
  panels: ScenarioPanel[];
  disabled?: boolean;
  withHandle?: boolean;
}

export interface ResizableAdapter {
  name: string;
  /** Every scenario carries an accessible name applied to each handle (a
   *  separator has no intrinsic text). */
  render(props: ResizableScenarioProps, label: string): RenderResult | Promise<RenderResult>;
}

interface Scenario {
  name: string;
  props: ResizableScenarioProps;
}

const SCENARIOS: ReadonlyArray<Scenario> = [
  { name: 'two panels horizontal', props: { panels: [{ defaultSize: 50 }, { defaultSize: 50 }] } },
  {
    name: 'three panels with a grip',
    props: {
      withHandle: true,
      panels: [{ defaultSize: 25 }, { defaultSize: 50 }, { defaultSize: 25 }],
    },
  },
  {
    name: 'vertical split',
    props: { direction: 'vertical', panels: [{ defaultSize: 40 }, { defaultSize: 60 }] },
  },
  {
    name: 'bounded panels',
    props: {
      panels: [
        { defaultSize: 30, minSize: 20, maxSize: 60 },
        { defaultSize: 70, minSize: 40, maxSize: 80 },
      ],
    },
  },
  {
    name: 'disabled',
    props: { disabled: true, panels: [{ defaultSize: 50 }, { defaultSize: 50 }] },
  },
];

const EXPECTED_PARTS = ['root', 'panel', 'handle'] as const;

export function configFor(props: ResizableScenarioProps): ResizableConfig {
  const share = props.panels.length > 0 ? 100 / props.panels.length : 100;
  return {
    direction: props.direction ?? 'horizontal',
    disabled: props.disabled ?? false,
    panels: props.panels.map((panel) => ({
      defaultSize: panel.defaultSize ?? share,
      minSize: panel.minSize ?? 0,
      maxSize: panel.maxSize ?? 100,
    })),
  };
}

export function runResizableConformance(adapter: ResizableAdapter): void {
  describe(`resizable conformance [${adapter.name}]`, () => {
    for (const scenario of SCENARIOS) {
      it(`${scenario.name}: parts and aria match the behavior projection`, async () => {
        const result = await adapter.render(scenario.props, 'Resize section');
        try {
          const config = configFor(scenario.props);
          const state = resizableBehavior.initialState(config);
          assertContractFulfillment(resizableBehavior, result.root, state, config, EXPECTED_PARTS);
          assertInstanceAriaFulfillment(resizableBehavior, result.root, state, config);
        } finally {
          result.cleanup();
        }
      });

      it(`${scenario.name}: one fewer separator than panels, each role=separator`, async () => {
        const result = await adapter.render(scenario.props, 'Resize section');
        try {
          const panels = partElements(result.root, 'panel');
          const handles = partElements(result.root, 'handle');
          expect(panels.length).toBe(scenario.props.panels.length);
          expect(handles.length).toBe(scenario.props.panels.length - 1);
          for (const handle of handles) {
            expect(handle.getAttribute('role')).toBe('separator');
            // The genuine per-instance ARIA is exercised (not skipped): a
            // focusable separator must carry a numeric aria-valuenow.
            expect(Number(handle.getAttribute('aria-valuenow'))).not.toBeNaN();
            expect(handle.getAttribute('aria-valuemin')).not.toBeNull();
            expect(handle.getAttribute('aria-valuemax')).not.toBeNull();
          }
        } finally {
          result.cleanup();
        }
      });

      it(`${scenario.name}: axe clean`, async () => {
        const result = await adapter.render(scenario.props, 'Resize section');
        try {
          await assertAxeClean(result.host);
        } finally {
          result.cleanup();
        }
      });
    }

    it('the first handle reports the leading panel size as aria-valuenow', async () => {
      const result = await adapter.render(
        { panels: [{ defaultSize: 30 }, { defaultSize: 70 }] },
        'Resize section',
      );
      try {
        const handle = partElement(result.root, 'handle');
        expect(handle?.getAttribute('aria-valuenow')).toBe('30');
      } finally {
        result.cleanup();
      }
    });

    it('ArrowRight grows the leading panel, ArrowLeft shrinks it', async () => {
      const result = await adapter.render(
        { panels: [{ defaultSize: 50 }, { defaultSize: 50 }] },
        'Resize section',
      );
      try {
        const handle = partElement(result.root, 'handle');
        expect(handle?.getAttribute('aria-valuenow')).toBe('50');
        const user = userEvent.setup();
        handle?.focus();
        await user.keyboard('{ArrowRight}');
        expect(handle?.getAttribute('aria-valuenow')).toBe('51');
        await user.keyboard('{ArrowLeft}');
        expect(handle?.getAttribute('aria-valuenow')).toBe('50');
      } finally {
        result.cleanup();
      }
    });

    it('Shift+Arrow moves ten, Home/End reach the leading panel bounds', async () => {
      const result = await adapter.render(
        { panels: [{ defaultSize: 50, minSize: 10, maxSize: 90 }, { defaultSize: 50 }] },
        'Resize section',
      );
      try {
        const handle = partElement(result.root, 'handle');
        const user = userEvent.setup();
        handle?.focus();
        await user.keyboard('{Shift>}{ArrowRight}{/Shift}');
        expect(handle?.getAttribute('aria-valuenow')).toBe('60');
        await user.keyboard('{Home}');
        expect(handle?.getAttribute('aria-valuenow')).toBe('10');
        await user.keyboard('{End}');
        expect(handle?.getAttribute('aria-valuenow')).toBe('90');
      } finally {
        result.cleanup();
      }
    });

    it('vertical: ArrowDown grows the leading panel', async () => {
      const result = await adapter.render(
        { direction: 'vertical', panels: [{ defaultSize: 40 }, { defaultSize: 60 }] },
        'Resize section',
      );
      try {
        const handle = partElement(result.root, 'handle');
        expect(handle?.getAttribute('aria-orientation')).toBe('horizontal');
        const user = userEvent.setup();
        handle?.focus();
        await user.keyboard('{ArrowDown}');
        expect(handle?.getAttribute('aria-valuenow')).toBe('41');
      } finally {
        result.cleanup();
      }
    });

    it('disabled: separators leave the tab order and keys do not resize', async () => {
      const result = await adapter.render(
        { disabled: true, panels: [{ defaultSize: 50 }, { defaultSize: 50 }] },
        'Resize section',
      );
      try {
        const handle = partElement(result.root, 'handle');
        expect(handle?.getAttribute('tabindex')).toBe('-1');
        expect(handle?.getAttribute('aria-disabled')).toBe('true');
        const user = userEvent.setup();
        handle?.focus();
        await user.keyboard('{ArrowRight}');
        expect(handle?.getAttribute('aria-valuenow')).toBe('50');
      } finally {
        result.cleanup();
      }
    });
  });
}
