import { expect, test } from 'vitest';
import bcrypt from 'bcryptjs';

test('password hashing works and matches output', async () => {
  const password = 'my-secret-password';
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(password, salt);

  expect(hash).toBeDefined();
  expect(hash).not.toEqual(password);

  const isMatch = await bcrypt.compare(password, hash);
  expect(isMatch).toBe(true);

  const isNotMatch = await bcrypt.compare('wrong-password', hash);
  expect(isNotMatch).toBe(false);
});
