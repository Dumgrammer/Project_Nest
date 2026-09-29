import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { DataSource } from 'typeorm';
import Redis from 'ioredis';

interface HealthResponse {
  status: 'ok' | 'error';
  timestamp: string;
  uptimeSeconds: number;
  checks?: {
    database: boolean;
    redis: boolean;
  };
}

@Controller('health')
@SkipThrottle()
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  @Get('live')
  live(): HealthResponse {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
    };
  }

  @Get('ready')
  async ready(): Promise<HealthResponse> {
    const checks = {
      database: await this.pingDatabase(),
      redis: await this.pingRedis(),
    };

    if (!checks.database || !checks.redis) {
      throw new ServiceUnavailableException({
        status: 'error',
        timestamp: new Date().toISOString(),
        uptimeSeconds: Math.floor(process.uptime()),
        checks,
      } satisfies HealthResponse);
    }

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      checks,
    };
  }

  private async pingDatabase(): Promise<boolean> {
    try {
      if (!this.dataSource.isInitialized) {
        return false;
      }

      await this.dataSource.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }

  private async pingRedis(): Promise<boolean> {
    const host = process.env.REDIS_HOST || '127.0.0.1';
    const port = Number(process.env.REDIS_PORT || 6379);

    const redis = new Redis({
      host,
      port,
      lazyConnect: true,
      enableOfflineQueue: false,
      connectTimeout: 1000,
      maxRetriesPerRequest: 0,
    });

    try {
      await redis.connect();
      const response = await redis.ping();
      return response === 'PONG';
    } catch {
      return false;
    } finally {
      redis.disconnect(false);
    }
  }
}
