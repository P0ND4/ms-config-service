import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { API } from './app/routes/route.constants';
import { CustomValidationPipe } from './contexts/shared/domain/exceptions/custom-validation.pipe';
import { FoodaExceptionFilter } from './contexts/shared/domain/exceptions/fooda-exception.filter';
import { ApiResponseInterceptor } from './contexts/shared/interceptors/api.response.interceptor';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { IConfigUseCase } from './contexts/config/domain/use-cases/config/config-use-case.interface';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const nodeEnv = configService.get<string>('NODE_ENV') ?? 'development';
  const port = configService.get<number>('PORT') ?? 3000;

  app.setGlobalPrefix(API);

  if (nodeEnv !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Config Service')
      .setDescription('Microservice Config Service')
      .setVersion('1.0')
      .addServer('/api')
      .build();

    const documentFactory = () =>
      SwaggerModule.createDocument(app, config, { ignoreGlobalPrefix: true });
    SwaggerModule.setup('api', app, documentFactory());
  }

  app.use((req: any, res: any, next: any) => {
    const logger = new Logger('HTTP');
    const { method, originalUrl } = req;
    const CYAN = '\x1b[36m';
    const RESET = '\x1b[0m';

    res.on('finish', () => {
      const errorCode = res.errorCode
        ? ` - ${CYAN}${res.errorCode}${RESET}`
        : '';
      logger.verbose(
        `${method} ${originalUrl} - ${res.statusCode}${errorCode}`,
      );
    });

    next();
  });

  app.useGlobalPipes(new CustomValidationPipe());
  app.useGlobalFilters(new FoodaExceptionFilter());
  app.useGlobalInterceptors(new ApiResponseInterceptor());

  const bootstrapLogger = new Logger('Bootstrap');
  const configUseCase = app.get(IConfigUseCase);
  await configUseCase.reloadInitialConfiguration({
    actor: 'system',
    reason: 'Startup seed reload',
  });
  bootstrapLogger.log(
    'Configuracion inicial recargada en Redis desde bootstrap-config.json',
  );

  await app.listen(port);
}
bootstrap().catch((err) => {
  console.log(err);
  process.exit(1);
});
