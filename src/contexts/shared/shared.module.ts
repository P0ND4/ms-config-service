import { Module } from '@nestjs/common';
import { RedisModule } from 'src/database/redis.module';
import { IConfigRepository } from './domain/repositories';
import { RedisConfigRepository } from './infrastructure/repositories';

const REPOSITORY_PROVIDERS = [
  {
    provide: IConfigRepository,
    useClass: RedisConfigRepository,
  },
];

@Module({
  imports: [RedisModule],
  providers: [...REPOSITORY_PROVIDERS],
  exports: [...REPOSITORY_PROVIDERS],
})
export class SharedModule {}
