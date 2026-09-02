import { expect, test } from 'vitest';
import * as schema from '../db/schema';

test('database schema definition compiles and exports all tables', () => {
  expect(schema.users).toBeDefined();
  expect(schema.sessions).toBeDefined();
  expect(schema.mindmaps).toBeDefined();
  expect(schema.mindmaps.isPublic).toBeDefined();
  expect(schema.nodes).toBeDefined();
  expect(schema.edges).toBeDefined();
});
