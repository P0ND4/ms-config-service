import { Module } from '@nestjs/common';
import { ConfigsModule } from './http-api/configs.module';

@Module({
  imports: [ConfigsModule],
})
export class ConfigContextModule {}
