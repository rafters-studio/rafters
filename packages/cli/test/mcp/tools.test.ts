import { registerComposite } from '@rafters/composites';
import { describe, expect, it } from 'vitest';
import { RaftersToolHandler, TOOL_DEFINITIONS } from '../../src/mcp/tools.js';

describe('TOOL_DEFINITIONS', () => {
  it('should define 4 tools', () => {
    expect(TOOL_DEFINITIONS).toHaveLength(4);
  });

  it('should have correct tool names', () => {
    const names = TOOL_DEFINITIONS.map((t) => t.name);
    expect(names).toContain('rafters_workspaces');
    expect(names).toContain('rafters_composite');
    expect(names).toContain('rafters_pattern');
    expect(names).toContain('rafters_component');
  });

  it('should have descriptions for all tools', () => {
    for (const tool of TOOL_DEFINITIONS) {
      expect(tool.description).toBeDefined();
      expect(tool.description.length).toBeGreaterThan(10);
    }
  });

  it('should have input schemas for all tools', () => {
    for (const tool of TOOL_DEFINITIONS) {
      expect(tool.inputSchema).toBeDefined();
      expect(tool.inputSchema.type).toBe('object');
    }
  });
});

describe('RaftersToolHandler', () => {
  describe('rafters_pattern', () => {
    it('should return patterns from composites with usagePatterns', async () => {
      const handler = new RaftersToolHandler([], null);
      const result = await handler.handleToolCall('rafters_pattern', {});

      expect(result.content).toHaveLength(1);
      const data = JSON.parse(result.content[0].text as string);
      // Returns patterns array or available list
      expect(data.patterns || data.available).toBeDefined();
    });

    it('should search by solves field', async () => {
      const handler = new RaftersToolHandler([], null);
      const result = await handler.handleToolCall('rafters_pattern', {
        solves: 'hierarchy',
      });

      expect(result.content).toHaveLength(1);
      const data = JSON.parse(result.content[0].text as string);
      // Either finds patterns or returns available list
      expect(data.patterns || data.error).toBeDefined();
    });

    it('should search by query', async () => {
      const handler = new RaftersToolHandler([], null);
      const result = await handler.handleToolCall('rafters_pattern', {
        query: 'heading',
      });

      expect(result.content).toHaveLength(1);
      const data = JSON.parse(result.content[0].text as string);
      expect(data.patterns || data.error).toBeDefined();
    });
  });

  describe('rafters_composite', () => {
    it('should return empty array when no composites loaded', async () => {
      const handler = new RaftersToolHandler([], null);
      const result = await handler.handleToolCall('rafters_composite', {});

      const data = JSON.parse(result.content[0].text as string);
      expect(data.composites).toBeDefined();
      expect(Array.isArray(data.composites)).toBe(true);
    });

    it('surfaces per-block rules so agents see which blocks carry which rules', async () => {
      registerComposite({
        manifest: {
          id: 'rules-fixture-login',
          name: 'Rules Fixture Login',
          category: 'forms',
          description: 'Fixture exercising block-level rules in the MCP response.',
          keywords: ['fixture'],
          cognitiveLoad: 1,
        },
        input: [],
        output: [],
        blocks: [
          { id: 'email', type: 'input', rules: ['email', 'required'] },
          { id: 'pw', type: 'input', rules: ['password'] },
          { id: 'submit', type: 'button' },
        ],
      });

      const handler = new RaftersToolHandler([], null);
      const result = await handler.handleToolCall('rafters_composite', {
        id: 'rules-fixture-login',
      });

      const data = JSON.parse(result.content[0].text as string);
      const composite = data.composites.find((c: { id: string }) => c.id === 'rules-fixture-login');
      expect(composite).toBeDefined();
      // Only blocks carrying rules are listed; the unconstrained button is not.
      expect(composite.blockRules).toEqual([
        { id: 'email', type: 'input', rules: ['email', 'required'] },
        { id: 'pw', type: 'input', rules: ['password'] },
      ]);
    });
  });

  describe('rafters_workspaces', () => {
    it('returns the empty list and null default when nothing is configured', async () => {
      const handler = new RaftersToolHandler([], null);
      const result = await handler.handleToolCall('rafters_workspaces', {});

      const data = JSON.parse(result.content[0].text as string);
      expect(data.workspaces).toEqual([]);
      expect(data.defaultWorkspace).toBeNull();
    });

    it('lists every workspace with its default flag', async () => {
      const a = { name: 'a', root: '/repo/sites/a' };
      const b = { name: 'b', root: '/repo/sites/b' };
      const handler = new RaftersToolHandler([a, b], a);
      const result = await handler.handleToolCall('rafters_workspaces', {});

      const data = JSON.parse(result.content[0].text as string);
      expect(data.workspaces).toEqual([
        { name: 'a', root: '/repo/sites/a', isDefault: true },
        { name: 'b', root: '/repo/sites/b', isDefault: false },
      ]);
      expect(data.defaultWorkspace).toBe('a');
    });
  });

  describe('rafters_workspaces config write', () => {
    const a = { name: 'a', root: '/repo/sites/a' };

    it('rejects designer-owned keys with a pointer to Studio', async () => {
      const handler = new RaftersToolHandler([a], a);
      const result = await handler.handleToolCall('rafters_workspaces', {
        workspace: 'a',
        intent: 'playful',
      });

      const data = JSON.parse(result.content[0].text as string);
      expect(data.error).toMatch(/intent/);
      expect(data.error).toMatch(/Studio/);
    });

    it('rejects installed with a pointer to `rafters add`', async () => {
      const handler = new RaftersToolHandler([a], a);
      const result = await handler.handleToolCall('rafters_workspaces', {
        workspace: 'a',
        installed: { components: [] },
      });

      const data = JSON.parse(result.content[0].text as string);
      expect(data.error).toMatch(/rafters add/);
    });

    it('rejects unknown wiring fields', async () => {
      const handler = new RaftersToolHandler([a], a);
      const result = await handler.handleToolCall('rafters_workspaces', {
        workspace: 'a',
        bogus: 1,
      });

      const data = JSON.parse(result.content[0].text as string);
      expect(data.error).toMatch(/invalid wiring patch/);
    });

    it('rejects an invalid framework value', async () => {
      const handler = new RaftersToolHandler([a], a);
      const result = await handler.handleToolCall('rafters_workspaces', {
        workspace: 'a',
        framework: 'svelte',
      });

      const data = JSON.parse(result.content[0].text as string);
      expect(data.error).toMatch(/invalid wiring patch/);
    });

    it('requires a resolvable workspace for a write', async () => {
      const b = { name: 'b', root: '/repo/sites/b' };
      const handler = new RaftersToolHandler([a, b], null); // no default
      const result = await handler.handleToolCall('rafters_workspaces', { framework: 'vite' });

      const data = JSON.parse(result.content[0].text as string);
      expect(data.error).toBe('workspace parameter required');
    });

    it('errors when the target workspace has no config yet', async () => {
      const handler = new RaftersToolHandler([a], a);
      const result = await handler.handleToolCall('rafters_workspaces', {
        workspace: 'a',
        framework: 'vite',
      });

      const data = JSON.parse(result.content[0].text as string);
      expect(data.error).toMatch(/no config/);
    });
  });

  describe('workspace routing', () => {
    it('returns a workspace-required error when the named workspace is unknown', async () => {
      const a = { name: 'a', root: '/repo/sites/a' };
      const handler = new RaftersToolHandler([a], a);
      const result = await handler.handleToolCall('rafters_composite', {
        workspace: 'does-not-exist',
      });

      const data = JSON.parse(result.content[0].text as string);
      expect(data.error).toBe('workspace parameter required');
      expect(data.workspaces).toEqual([{ name: 'a', root: '/repo/sites/a' }]);
    });

    it('uses the default workspace when none is named', async () => {
      const a = { name: 'a', root: '/repo/sites/a' };
      const handler = new RaftersToolHandler([a], a);
      const result = await handler.handleToolCall('rafters_pattern', {});

      const data = JSON.parse(result.content[0].text as string);
      // Should not be a workspace error -- handler proceeded with default.
      expect(data.error).not.toBe('workspace parameter required');
    });
  });

  describe('unknown tool', () => {
    it('should return error for unknown tool', async () => {
      const handler = new RaftersToolHandler([], null);
      const result = await handler.handleToolCall('unknown_tool', {});

      const data = JSON.parse(result.content[0].text as string);
      expect(data.error).toContain('Unknown tool');
      expect(data.suggestion).toContain('Available tools');
    });
  });
});
