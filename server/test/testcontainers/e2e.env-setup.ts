import { readFileSync } from 'node:fs';
import { E2E_STATE_FILE, DEFAULT_TEST_ENV } from './e2e.constants';

type E2EState = {
  databaseUrl: string;
  redisUrl: string;
  mysqlContainerId: string;
  redisContainerId: string;
};

function loadState(): E2EState {
  const raw = readFileSync(E2E_STATE_FILE, 'utf8');
  return JSON.parse(raw) as E2EState;
}

const state = loadState();

for (const [k, v] of Object.entries(DEFAULT_TEST_ENV)) {
  process.env[k] = v;
}

process.env.DATABASE_URL = state.databaseUrl;

if (state.redisUrl) {
  process.env.REDIS_URL = state.redisUrl;
} else {
  // Ensure RedisService stays disabled if not requested.
  process.env.REDIS_URL = '';
}
