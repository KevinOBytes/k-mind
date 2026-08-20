import { pgTable, uuid, text, doublePrecision, timestamp, varchar, jsonb } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }),
  email: varchar('email', { length: 255 }).notNull().unique(),
  emailVerified: timestamp('email_verified'),
  passwordHash: varchar('password_hash', { length: 255 }), // Made nullable to support passwordless logins
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const sessions = pgTable('sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  sessionToken: varchar('session_token', { length: 255 }).notNull().unique(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  expires: timestamp('expires').notNull(),
});

export const verificationTokens = pgTable('verification_tokens', {
  identifier: varchar('identifier', { length: 255 }).notNull(),
  token: varchar('token', { length: 255 }).notNull().primaryKey(),
  expires: timestamp('expires').notNull(),
});

export const mindmaps = pgTable('mindmaps', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const nodes = pgTable('nodes', {
  id: varchar('id', { length: 255 }).primaryKey(), // React Flow node id
  mindmapId: uuid('mindmap_id').references(() => mindmaps.id, { onDelete: 'cascade' }).notNull(),
  label: text('label').notNull(),
  description: text('description'),
  xPos: doublePrecision('x_pos').notNull(),
  yPos: doublePrecision('y_pos').notNull(),
  color: varchar('color', { length: 50 }),
  metadata: jsonb('metadata').default({}),
});

export const edges = pgTable('edges', {
  id: varchar('id', { length: 255 }).primaryKey(), // React Flow edge id
  mindmapId: uuid('mindmap_id').references(() => mindmaps.id, { onDelete: 'cascade' }).notNull(),
  sourceNodeId: varchar('source_node_id', { length: 255 }).references(() => nodes.id, { onDelete: 'cascade' }).notNull(),
  targetNodeId: varchar('target_node_id', { length: 255 }).references(() => nodes.id, { onDelete: 'cascade' }).notNull(),
  label: varchar('label', { length: 255 }),
  edgeType: varchar('edge_type', { length: 50 }).default('smoothstep'),
});
