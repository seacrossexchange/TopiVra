import { Test, TestingModule } from '@nestjs/testing';
import {
  HealthCheckService,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';
import { RedisService } from './common/redis/redis.service';
import { PrismaHealthIndicator } from './modules/health/prisma.health';
import { RedisHealthIndicator } from './modules/health/redis.health';

describe('AppController', () => {
  let appController: AppController;

  const mockPrismaService = {
    $queryRaw: jest.fn().mockResolvedValue([{ '1': 1 }]),
  };

  const mockRedisService = {
    isAvailable: jest.fn().mockReturnValue(true),
    getClient: jest.fn().mockReturnValue({
      ping: jest.fn().mockResolvedValue('PONG'),
      info: jest.fn().mockResolvedValue('used_memory_human:1.5M\r\n'),
      dbsize: jest.fn().mockResolvedValue(10),
    }),
  };

  const mockHealthCheckService = {
    check: jest.fn().mockResolvedValue({
      status: 'ok',
      info: {
        database: { status: 'up' },
        redis: { status: 'up' },
      },
    }),
  };

  const mockPrismaHealthIndicator = {
    isHealthy: jest.fn().mockResolvedValue({ database: { status: 'up' } }),
  };

  const mockRedisHealthIndicator = {
    isHealthy: jest.fn().mockResolvedValue({ redis: { status: 'up' } }),
  };

  const mockMemoryHealthIndicator = {
    checkHeap: jest.fn().mockResolvedValue({ memory_heap: { status: 'up' } }),
    checkRSS: jest.fn().mockResolvedValue({ memory_rss: { status: 'up' } }),
  };

  const mockDiskHealthIndicator = {
    checkStorage: jest.fn().mockResolvedValue({ disk: { status: 'up' } }),
  };

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
        {
          provide: HealthCheckService,
          useValue: mockHealthCheckService,
        },
        {
          provide: PrismaHealthIndicator,
          useValue: mockPrismaHealthIndicator,
        },
        {
          provide: RedisHealthIndicator,
          useValue: mockRedisHealthIndicator,
        },
        {
          provide: MemoryHealthIndicator,
          useValue: mockMemoryHealthIndicator,
        },
        {
          provide: DiskHealthIndicator,
          useValue: mockDiskHealthIndicator,
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });

  describe('healthCheck', () => {
    it('should return health check result', async () => {
      const result = await appController.healthCheck();
      expect(result.status).toBe('ok');
      expect(result.info).toHaveProperty('database');
      expect(result.info).toHaveProperty('redis');
    });
  });

  describe('liveness', () => {
    it('should return liveness status', async () => {
      const result = await appController.liveness();
      expect(result.status).toBe('ok');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('uptime');
    });
  });

  describe('readiness', () => {
    it('should return ready status when all services are up', async () => {
      const result = await appController.readiness();
      expect(result.status).toBe('ready');
      expect(result.checks.database).toBe(true);
      expect(result.checks.redis).toBe(true);
    });

    it('should return not_ready status when database is down', async () => {
      mockPrismaService.$queryRaw.mockRejectedValueOnce(
        new Error('Connection failed'),
      );
      const result = await appController.readiness();
      expect(result.status).toBe('not_ready');
      expect(result.checks.database).toBe(false);
    });
  });

  describe('metrics', () => {
    it('should return application metrics', async () => {
      const result = await appController.metrics();
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('uptime');
      expect(result).toHaveProperty('nodejs');
      expect(result).toHaveProperty('memory');
      expect(result).toHaveProperty('database');
      expect(result).toHaveProperty('redis');
    });
  });
});
