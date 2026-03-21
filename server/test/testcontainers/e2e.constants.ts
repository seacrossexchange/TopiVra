export const E2E_STATE_FILE = `${__dirname}/../.e2e-testcontainers.json`;

export const DEFAULT_TEST_ENV: Record<string, string> = {
  NODE_ENV: 'test',
  JWT_SECRET: 'test-jwt-secret-key-minimum-32-characters-123456',
  JWT_REFRESH_SECRET: 'test-jwt-refresh-secret-key-minimum-32-characters-123',
  ENCRYPTION_KEY: '0'.repeat(64),
};

// Test-only credentials for ephemeral containers.
// These are not production secrets.
export const MYSQL_TEST_PASSWORD = 'test_password';
