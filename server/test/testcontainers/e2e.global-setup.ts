import { writeFileSync } from 'node:fs';
import { execa } from 'execa';
import {
  GenericContainer,
  Wait,
  StartedTestContainer,
  getContainerRuntimeClient,
} from 'testcontainers';
import { E2E_STATE_FILE, DEFAULT_TEST_ENV } from './e2e.constants';

type E2EState = {
  databaseUrl: string;
  redisUrl: string;
  mysqlContainerId: string;
  redisContainerId: string;
};

async function syncSchema(databaseUrl: string) {
  // The repository migration history can drift during active development.
  // For deterministic e2e in ephemeral containers, sync schema directly.
  await execa(
    'npx',
    [
      'prisma',
      'db',
      'push',
      '--force-reset',
      '--accept-data-loss',
      '--skip-generate',
      '--schema',
      'prisma/schema.prisma',
    ],
    {
      cwd: `${__dirname}/../..`,
      env: {
        ...process.env,
        ...DEFAULT_TEST_ENV,
        DATABASE_URL: databaseUrl,
      },
      stdio: 'inherit',
    },
  );
}

async function removeContainerForce(id: string) {
  // Prefer dockerode via testcontainers runtime (doesn't require docker CLI in PATH).
  try {
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

export default async function globalSetup() {
  let mysql: StartedTestContainer | null = null;
  let redis: StartedTestContainer | null = null;

  try {
    // Fail fast with a helpful error if Docker isn't available.
    try {
      await getContainerRuntimeClient();
    } catch (err) {
      throw new Error(
        `Testcontainers could not connect to a container runtime. ` +
          `Make sure Docker Desktop is installed and running (Linux containers), ` +
          `and that your user has access to the Docker engine. Original error: ${String(err)}`,
      );
    }

    // MySQL
    mysql = await new GenericContainer('mysql:8.0')
      .withEnvironment({
        MYSQL_ROOT_PASSWORD: 'test_password',
        MYSQL_DATABASE: 'topivra_test',
      })
      .withCommand([
        '--default-authentication-plugin=mysql_native_password',
        '--character-set-server=utf8mb4',
        '--collation-server=utf8mb4_unicode_ci',
      ])
      .withExposedPorts(3306)
      .withWaitStrategy(Wait.forLogMessage(/ready for connections/i))
      .start();

    // On Docker Desktop (WSL2), containers run in a VM. Accessing the mapped port
    // must go through the host gateway, not container.getHost() (which can be an
    // internal address). Some Windows setups only bind the published port on
    // localhost (IPv6) and not 127.0.0.1, so prefer localhost.
    const host = process.env.E2E_HOST ?? 'localhost';
    const dbPort = mysql.getMappedPort(3306);
    const databaseUrl = `mysql://root:test_password@${host}:${dbPort}/topivra_test`;

    // Redis (enabled by default; can be disabled via E2E_REDIS=0)
    const enableRedis = process.env.E2E_REDIS !== '0';

    let redisUrl = '';
    if (enableRedis) {
      redis = await new GenericContainer('redis:7-alpine')
        .withExposedPorts(6379)
        .withWaitStrategy(Wait.forLogMessage(/Ready to accept connections/i))
        .start();

      const redisPort = redis.getMappedPort(6379);
      redisUrl = `redis://${host}:${redisPort}`;
    }

    // Sync schema (with small retry to avoid MySQL startup/DDL race)
    let lastErr: unknown;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await syncSchema(databaseUrl);
        lastErr = undefined;
        break;
      } catch (err) {
        lastErr = err;
        // brief backoff
        await new Promise((r) => setTimeout(r, 1500 * attempt));
      }
    }
    if (lastErr) throw lastErr;

    const state: E2EState = {
      databaseUrl,
      redisUrl,
      mysqlContainerId: mysql.getId(),
      redisContainerId: redis ? redis.getId() : '',
    };

    writeFileSync(E2E_STATE_FILE, JSON.stringify(state, null, 2), 'utf8');

    // Ryuk will also clean up, but teardown is explicit.
  } catch (err) {
    // Best-effort cleanup if setup fails.
    if (mysql) await removeContainerForce(mysql.getId());
    if (redis) await removeContainerForce(redis.getId());
    throw err;
  }
}
