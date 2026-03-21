import { readFileSync, unlinkSync } from 'node:fs';
import { execa } from 'execa';
import { E2E_STATE_FILE } from './e2e.constants';

type E2EState = {
  databaseUrl: string;
  redisUrl: string;
  mysqlContainerId: string;
  redisContainerId: string;
};

async function removeContainerForce(id: string) {
  if (!id) return;

  // Prefer dockerode via testcontainers runtime (doesn't require docker CLI in PATH).
  try {
    const { getContainerRuntimeClient } = await import('testcontainers');
    const runtime = await getContainerRuntimeClient();
    const container = runtime.container.getById(id);
    await container.remove({ force: true, v: true });
    return;
  } catch {
    // Fall back to docker CLI if available.
  }

  try {
    await execa('docker', ['rm', '-f', id], { stdio: 'ignore' });
  } catch {
    // ignore
  }
}

export default async function globalTeardown() {
  let state: E2EState | null = null;

  try {
    state = JSON.parse(readFileSync(E2E_STATE_FILE, 'utf8')) as E2EState;
  } catch {
    state = null;
  }

  if (state) {
    await removeContainerForce(state.mysqlContainerId);
    await removeContainerForce(state.redisContainerId);
  }

  try {
    unlinkSync(E2E_STATE_FILE);
  } catch {
    // ignore
  }
}
