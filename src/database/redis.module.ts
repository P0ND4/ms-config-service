import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

const createRedisClient = (
  clientName: string,
  configService: ConfigService,
): Redis => {
  const host = configService.get<string>('REDIS_HOST') ?? 'localhost';
  const port = configService.get<number>('REDIS_PORT') ?? 6379;
  const password = configService.get<string>('REDIS_PASSWORD');
  const username = configService.get<string>('REDIS_USERNAME');
  const redisUrl = configService.get<string>('REDIS_URL');

  const client = redisUrl
    ? new Redis(redisUrl, { maxRetriesPerRequest: 3, lazyConnect: false })
    : new Redis({
        host,
        port,
        password,
        username,
        maxRetriesPerRequest: 3,
        lazyConnect: false,
      });

  client.on('error', (err) => {
    console.error(`[${clientName}] Connection error:`, err.message);
  });

  client.on('connect', () => {
    const connectionString = redisUrl || `${host}:${port}`;
    console.log(`[${clientName}] Connected to ${connectionString}`);
  });

  return client;
};

@Module({
  providers: [
    {
      provide: 'CONFIG_REDIS',
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        createRedisClient('Config Redis', configService),
    },
  ],
  exports: ['CONFIG_REDIS'],
})
export class RedisModule {}
