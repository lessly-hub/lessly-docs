/**
 * Unit tests for `src/lib/mcp-tools.ts`.
 *
 * The module imports `content/mcp-tools.json` eagerly and validates at module
 * load. We:
 *   1. Re-validate that catalog through the exported parser to confirm the
 *      shipped catalog still parses and `getMcpTool('lessly_deploy')` resolves.
 *   2. Round-trip a known-bad payload through the same `mcpToolsSchema` to
 *      assert the rejection path produces a useful error.
 */
import { describe, it, expect } from 'vitest';
import { parseMcpTools, getMcpTool, mcpToolsSchema } from '@/lib/mcp-tools';

describe('parseMcpTools', () => {
  it('parses the shipped catalog and returns a non-empty tools array', () => {
    const catalog = parseMcpTools();
    expect(catalog.version).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(Array.isArray(catalog.tools)).toBe(true);
    expect(catalog.tools.length).toBeGreaterThan(0);
  });

  it('every shipped tool name matches the snake_case rule', () => {
    for (const tool of parseMcpTools().tools) {
      expect(tool.name).toMatch(/^[a-z][a-z0-9_]*$/);
    }
  });
});

describe('mcpToolsSchema', () => {
  it('rejects an invalid catalog with a clear path-pointing error', () => {
    const bad = {
      version: '2026-05-21',
      tools: [
        {
          // Missing summary + bad name (uppercase).
          name: 'LesslyDeploy',
          description: 'd',
          args: [],
          example: { prompt: 'p', args: {} },
        },
      ],
    };
    const result = mcpToolsSchema.safeParse(bad);
    expect(result.success).toBe(false);
    if (!result.success) {
      // Should flag both the bad name and the missing summary.
      const paths = result.error.issues.map((i) => i.path.join('.'));
      expect(paths).toContain('tools.0.name');
      expect(paths).toContain('tools.0.summary');
    }
  });

  it('rejects a tools-empty catalog', () => {
    const result = mcpToolsSchema.safeParse({ version: '2026-05-21', tools: [] });
    expect(result.success).toBe(false);
  });
});

describe('getMcpTool', () => {
  it("returns the 'lessly_deploy' entry", () => {
    const tool = getMcpTool('lessly_deploy');
    expect(tool).toBeDefined();
    expect(tool?.name).toBe('lessly_deploy');
    expect(tool?.summary.length).toBeGreaterThan(0);
  });

  it('returns undefined for an unknown tool', () => {
    expect(getMcpTool('not_a_real_tool_xyz')).toBeUndefined();
  });
});

describe('Layer 4 contract — Notarial-Terse for allowlisted tools', () => {
  // Tools that have been rewritten to the Notarial-Terse register.
  // Expand as more tools are migrated (see follow-up issues).
  const layer4Tools = ['lessly_deploy', 'lessly_get_deployment', 'lessly_list_deployments'];

  it.each(layer4Tools)('%s description starts with a verb (no tool-name restatement)', (name) => {
    const tool = getMcpTool(name);
    expect(tool).toBeDefined();
    const desc = tool!.description;
    // No tool-name restatement at start
    expect(desc.toLowerCase().startsWith(name.toLowerCase())).toBe(false);
    // Starts with a capitalized verb
    expect(desc).toMatch(/^[A-Z][a-z]+/);
  });

  it.each(layer4Tools)('%s description contains a Returns: contract', (name) => {
    const tool = getMcpTool(name);
    expect(tool).toBeDefined();
    expect(tool!.description).toMatch(/Returns:\s*[`{]/);
  });

  it.each(layer4Tools)('%s description bans hedge tokens', (name) => {
    const tool = getMcpTool(name);
    expect(tool).toBeDefined();
    const desc = tool!.description;
    const hedges = [' may ', ' usually ', ' optionally ', ' if available '];
    for (const hedge of hedges) {
      expect(desc.toLowerCase()).not.toContain(hedge);
    }
  });

  it.each(layer4Tools)('%s description bans marketing tokens', (name) => {
    const tool = getMcpTool(name);
    expect(tool).toBeDefined();
    const desc = tool!.description;
    const marketing = ['powerful', 'simple', 'easy', 'comprehensive', 'seamless', 'robust'];
    for (const word of marketing) {
      expect(desc.toLowerCase()).not.toContain(word);
    }
  });

  it('lessly_deploy description names an irreversibility scope', () => {
    const tool = getMcpTool('lessly_deploy');
    expect(tool).toBeDefined();
    // Either bare "Irreversible." or scoped "Irreversible for ..."
    expect(tool!.description).toMatch(/Irreversible(\.|\s+for)/);
  });

  it('lessly_deploy description includes a Fails when: disclosure', () => {
    const tool = getMcpTool('lessly_deploy');
    expect(tool).toBeDefined();
    expect(tool!.description).toMatch(/Fails when:\s/);
  });

  it('lessly_deploy description includes a Typical sequence: planning hint', () => {
    const tool = getMcpTool('lessly_deploy');
    expect(tool).toBeDefined();
    expect(tool!.description).toMatch(/Typical sequence:\s/);
  });

  it('lessly_list_deployments names its sibling disambiguator', () => {
    const tool = getMcpTool('lessly_list_deployments');
    expect(tool).toBeDefined();
    // Must mention lessly_get_deployment as the sibling
    expect(tool!.description).toContain('lessly_get_deployment');
  });
});
