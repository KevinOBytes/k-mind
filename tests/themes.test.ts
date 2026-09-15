import { expect, test } from 'vitest';
import { CanvasTheme } from '../components/SkillNode';

test('Theme definitions: valid canvas theme identifiers', () => {
  const supportedThemes: CanvasTheme[] = ['light', 'dark', 'neon', 'sepia'];
  expect(supportedThemes.length).toBe(4);
  expect(supportedThemes).toContain('dark');
  expect(supportedThemes).toContain('neon');
  expect(supportedThemes).toContain('sepia');
  expect(supportedThemes).toContain('light');
});
