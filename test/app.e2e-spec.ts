import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { IConfigUseCase } from '../src/contexts/config/domain/use-cases/config/config-use-case.interface';
import { ConfigsController } from '../src/contexts/config/infrastructure/http-api/v1/config/controllers/configs.controller';

describe('ConfigsController (e2e)', () => {
  let app: INestApplication<App>;

  const configUseCaseMock = {
    listConfiguredServices: jest.fn(),
    getServiceConfiguration: jest.fn(),
    createServiceConfiguration: jest.fn(),
    patchServiceConfiguration: jest.fn(),
    deleteServiceVariable: jest.fn(),
    getServiceHistory: jest.fn(),
    rollbackServiceConfiguration: jest.fn(),
    reloadInitialConfiguration: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [ConfigsController],
      providers: [
        {
          provide: IConfigUseCase,
          useValue: configUseCaseMock,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/configs (GET)', () => {
    configUseCaseMock.listConfiguredServices.mockResolvedValue([
      {
        service: 'identity-service',
        variables: { PORT: '3001' },
        keysCount: 1,
      },
    ]);

    return request(app.getHttpServer())
      .get('/configs')
      .expect(200)
      .expect([
        {
          service: 'identity-service',
          variables: { PORT: '3001' },
          keysCount: 1,
        },
      ]);
  });

  it('/configs/:service (GET)', () => {
    configUseCaseMock.getServiceConfiguration.mockResolvedValue({
      service: 'identity-service',
      variables: { PORT: '3001', NODE_ENV: 'development' },
      keysCount: 2,
    });

    return request(app.getHttpServer())
      .get('/configs/identity-service')
      .expect(200)
      .expect({
        service: 'identity-service',
        variables: { PORT: '3001', NODE_ENV: 'development' },
        keysCount: 2,
      });
  });
});
