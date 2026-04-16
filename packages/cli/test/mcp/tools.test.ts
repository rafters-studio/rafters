import { describe, expect, it } from 'vitest';
import { RaftersToolHandler, TOOL_DEFINITIONS } from '../../src/mcp/tools.js';

describe('TOOL_DEFINITIONS', () => {
  it('should define 4 tools', () => {
    expect(TOOL_DEFINITIONS).toHaveLength(4);
  });

  it('should have correct tool names', () => {
    const names = TOOL_DEFINITIONS.map((t) => t.name);
    expect(names).toContain('rafters_composite');
    expect(names).toContain('rafters_rule');
    expect(names).toContain('rafters_pattern');
    expect(names).toContain('rafters_component');
  });

  it('should not include rafters_onboard (moved to rafters init / rafters import)', () => {
    const names = TOOL_DEFINITIONS.map((t) => t.name);
    expect(names).not.toContain('rafters_onboard');
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
      const handler = new RaftersToolHandler(null);
      const result = await handler.handleToolCall('rafters_pattern', {});

      expect(result.content).toHaveLength(1);
      const data = JSON.parse(result.content[0].text as string);
      // Returns patterns array or available list
      expect(data.patterns || data.available).toBeDefined();
    });

    it('should search by solves field', async () => {
      const handler = new RaftersToolHandler(null);
      const result = await handler.handleToolCall('rafters_pattern', {
        solves: 'hierarchy',
      });

      expect(result.content).toHaveLength(1);
      const data = JSON.parse(result.content[0].text as string);
      // Either finds patterns or returns available list
      expect(data.patterns || data.error).toBeDefined();
    });

    it('should search by query', async () => {
      const handler = new RaftersToolHandler(null);
      const result = await handler.handleToolCall('rafters_pattern', {
        query: 'heading',
      });

      expect(result.content).toHaveLength(1);
      const data = JSON.parse(result.content[0].text as string);
      expect(data.patterns || data.error).toBeDefined();
    });
  });

  describe('rafters_rule', () => {
    it('should list built-in rules', async () => {
      const handler = new RaftersToolHandler(null);
      const result = await handler.handleToolCall('rafters_rule', {});

      const data = JSON.parse(result.content[0].text as string);
      expect(data.rules).toBeDefined();
      expect(data.rules.length).toBeGreaterThan(0);
      expect(data.rules.some((r: { name: string }) => r.name === 'required')).toBe(true);
    });

    it('should filter rules by name', async () => {
      const handler = new RaftersToolHandler(null);
      const result = await handler.handleToolCall('rafters_rule', { name: 'email' });

      const data = JSON.parse(result.content[0].text as string);
      expect(data.rules).toHaveLength(1);
      expect(data.rules[0].name).toBe('email');
    });
  });

  describe('rafters_composite', () => {
    it('should return empty array when no composites loaded', async () => {
      const handler = new RaftersToolHandler(null);
      const result = await handler.handleToolCall('rafters_composite', {});

      const data = JSON.parse(result.content[0].text as string);
      expect(data.composites).toBeDefined();
      expect(Array.isArray(data.composites)).toBe(true);
    });
  });

  describe('unknown tool', () => {
    it('should return error for unknown tool', async () => {
      const handler = new RaftersToolHandler(null);
      const result = await handler.handleToolCall('unknown_tool', {});

      const data = JSON.parse(result.content[0].text as string);
      expect(data.error).toContain('Unknown tool');
    });
  });
});
