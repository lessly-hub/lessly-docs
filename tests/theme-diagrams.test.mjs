import { describe, test, expect } from 'vitest';
import { themeDiagram } from '../scripts/theme-diagrams.mjs';

describe('themeDiagram', () => {
  test('replaces bg-brand-bright hex with CSS var', () => {
    const input = '<svg><rect fill="#165FF2"/></svg>';
    expect(themeDiagram(input)).toBe('<svg><rect fill="var(--bg-brand-bright)"/></svg>');
  });

  test('replaces text-primary hex (case-insensitive)', () => {
    expect(themeDiagram('<text fill="#eeeff0">hello</text>')).toBe(
      '<text fill="var(--text-primary)">hello</text>',
    );
  });

  test('replaces bg-primary hex', () => {
    expect(themeDiagram('<rect fill="#191b24"/>')).toBe(
      '<rect fill="var(--bg-primary)"/>',
    );
  });

  test('replaces border-subtle hex (stroke usage)', () => {
    expect(themeDiagram('<rect stroke="#2a2e3b"/>')).toBe(
      '<rect stroke="var(--border-subtle)"/>',
    );
  });

  test('leaves unknown hex alone', () => {
    expect(themeDiagram('<rect fill="#abcdef"/>')).toBe('<rect fill="#abcdef"/>');
  });

  test('handles multiple replacements in one string', () => {
    const input = '<svg><rect fill="#191b24" stroke="#2a2e3b"/><text fill="#eeeff0">x</text></svg>';
    const expected = '<svg><rect fill="var(--bg-primary)" stroke="var(--border-subtle)"/><text fill="var(--text-primary)">x</text></svg>';
    expect(themeDiagram(input)).toBe(expected);
  });

  test('uppercase and lowercase hex both match', () => {
    expect(themeDiagram('<rect fill="#165FF2"/>')).toBe('<rect fill="var(--bg-brand-bright)"/>');
    expect(themeDiagram('<rect fill="#165ff2"/>')).toBe('<rect fill="var(--bg-brand-bright)"/>');
  });
});
