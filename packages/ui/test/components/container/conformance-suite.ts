/**
 * Container conformance suite -- one suite, run per render adapter.
 * The React and WC conformance tests are each their adapter plus a call
 * into runContainerConformance. Static-score conformance is thinner than
 * interactive articles (container.md, "Open"): element contract + classes
 * assertions + axe. No interaction tier exists to run.
 */
import { describe, expect, it } from 'vitest';
import {
  container,
  type ContainerConfig,
} from '../../../src/components/container/container.behavior';
import {
  assertAxeClean,
  assertContractFulfillment,
  type RenderResult,
} from '../../harness/conformance';

export interface ContainerScenarioProps {
  as?: ContainerConfig['as'];
  size?: ContainerConfig['size'];
  query?: boolean;
  queryName?: string;
  ariaLabel?: string;
}

export interface ContainerAdapter {
  name: string;
  render(props: ContainerScenarioProps, content: string): RenderResult | Promise<RenderResult>;
  /** aria-label passthrough onto the SAME node as the landmark. React's
   *  Container spreads props onto the one element it renders; the WC
   *  host and its shadow-rendered landmark are different nodes, so a host
   *  aria-label does not cross the boundary (same shape as button's
   *  icon-label opt-out). */
  supportsAriaLabelForward: boolean;
}

interface LandmarkScenario {
  name: string;
  props: ContainerScenarioProps;
  tag: string;
}

const LANDMARK_SCENARIOS: ReadonlyArray<LandmarkScenario> = [
  { name: 'div default', props: {}, tag: 'div' },
  { name: 'main landmark', props: { as: 'main' }, tag: 'main' },
  { name: 'header landmark', props: { as: 'header' }, tag: 'header' },
  { name: 'footer landmark', props: { as: 'footer' }, tag: 'footer' },
  { name: 'article', props: { as: 'article' }, tag: 'article' },
  {
    name: 'aside named region',
    props: { as: 'aside', ariaLabel: 'Related' },
    tag: 'aside',
  },
];

function configFor(props: ContainerScenarioProps): ContainerConfig {
  return {
    as: props.as ?? 'div',
    size: props.size,
    query: props.query ?? true,
    queryName: props.queryName,
  };
}

export function runContainerConformance(adapter: ContainerAdapter): void {
  describe(`container conformance [${adapter.name}]`, () => {
    for (const scenario of LANDMARK_SCENARIOS) {
      it(`${scenario.name}: as drives the semantic element -- the element IS the contract`, async () => {
        const result = await adapter.render(scenario.props, 'content');
        try {
          expect(result.root.tagName.toLowerCase()).toBe(scenario.tag);
          if (scenario.props.ariaLabel && adapter.supportsAriaLabelForward) {
            expect(result.root.getAttribute('aria-label')).toBe(scenario.props.ariaLabel);
          }
          const config = configFor(scenario.props);
          const state = container.initialState(config);
          assertContractFulfillment(container, result.root, state, config, ['root']);
        } finally {
          result.cleanup();
        }
      });

      it(`${scenario.name}: axe clean`, async () => {
        const result = await adapter.render(scenario.props, 'content');
        try {
          await assertAxeClean(result.host);
        } finally {
          result.cleanup();
        }
      });
    }

    it('is a container-query provider by default, opt-out via query=false', async () => {
      const on = await adapter.render({}, 'x');
      try {
        expect(on.root.className).toContain('@container');
      } finally {
        on.cleanup();
      }

      const off = await adapter.render({ query: false }, 'x');
      try {
        expect(off.root.className).not.toContain('@container');
      } finally {
        off.cleanup();
      }
    });

    it('sized containers carry the size class', async () => {
      const result = await adapter.render({ size: '5xl' }, 'x');
      try {
        expect(result.root.className).toContain('max-w-5xl');
      } finally {
        result.cleanup();
      }
    });

    it('queryName lands as containerName style -- the one style channel', async () => {
      const result = await adapter.render({ queryName: 'rail' }, 'x');
      try {
        expect(result.root.style.containerName).toBe('rail');
      } finally {
        result.cleanup();
      }
    });
  });
}
