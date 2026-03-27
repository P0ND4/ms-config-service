import { Module } from '@nestjs/common';
import { ConfigsController } from './controllers/configs.controller';
import { SharedModule } from 'src/contexts/shared/shared.module';
import { IConfigUseCase } from 'src/contexts/config/domain/use-cases/config/config-use-case.interface';
import { ConfigUseCase } from 'src/contexts/config/application/config/config.use-case';

@Module({
  imports: [SharedModule],
  controllers: [ConfigsController],
  providers: [
    {
      provide: IConfigUseCase,
      useClass: ConfigUseCase,
    },
  ],
  exports: [IConfigUseCase],
})
export class ConfigsModule {}
