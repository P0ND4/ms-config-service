import { Module } from '@nestjs/common';
import { ConfigsModule } from './http-api/v1/config/configs.module';

@Module({
  imports: [ConfigsModule],
})
export class ConfigContextModule {}
