import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ConfigContextModule } from 'src/contexts/config/infrastructure/config.module';
import environment from 'src/config/environment.config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [environment] }),
    ConfigContextModule,
  ],
})
export class AppModule {}
