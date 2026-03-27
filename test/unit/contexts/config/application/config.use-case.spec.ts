import { HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readFile } from 'node:fs/promises';
import { ConfigUseCase } from 'src/contexts/config/application/config/config.use-case';
import { IConfigRepository } from 'src/contexts/shared/domain/repositories';
import { FoodaException } from 'src/contexts/shared/domain/exceptions/fooda.exception';
import { FoodaExceptionCodes } from 'src/contexts/shared/domain/exceptions/fooda-exception.codes';

jest.mock('node:fs/promises', () => ({
  readFile: jest.fn(),
}));

describe('ConfigUseCase', () => {
  let useCase: ConfigUseCase;

  const repository = {
    listServices: jest.fn(),
    existsService: jest.fn(),
    getServiceVariables: jest.fn(),
    createService: jest.fn(),
    patchService: jest.fn(),
    deleteServiceKey: jest.fn(),
    rollbackLastChange: jest.fn(),
    getHistory: jest.fn(),
    reloadFromSeed: jest.fn(),
    publishConfigEvent: jest.fn(),
  } as unknown as jest.Mocked<IConfigRepository>;

  const configService = {
    get: jest.fn(),
  } as unknown as jest.Mocked<ConfigService>;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new ConfigUseCase(repository, configService);
  });

  it('listConfiguredServices sorts services and maps summaries', async () => {
    repository.listServices.mockResolvedValue([
      'notification-service',
      'cache-service',
    ]);
    repository.getServiceVariables
      .mockResolvedValueOnce({ PORT: '3002' })
      .mockResolvedValueOnce({ PORT: '3005', NODE_ENV: 'dev' });

    await expect(useCase.listConfiguredServices()).resolves.toEqual([
      { service: 'cache-service', variables: { PORT: '3002' }, keysCount: 1 },
      {
        service: 'notification-service',
        variables: { PORT: '3005', NODE_ENV: 'dev' },
        keysCount: 2,
      },
    ]);
  });

  it('getServiceConfiguration throws Ex1002 when service does not exist', async () => {
    repository.existsService.mockResolvedValue(false);

    await expect(
      useCase.getServiceConfiguration('identity-service'),
    ).rejects.toMatchObject({
      response: {
        code: FoodaExceptionCodes.Ex1002.code,
      },
      status: HttpStatus.NOT_FOUND,
    });
  });

  it('getServiceConfiguration normalizes service name and returns summary', async () => {
    repository.existsService.mockResolvedValue(true);
    repository.getServiceVariables.mockResolvedValue({ PORT: '3001' });

    await expect(
      useCase.getServiceConfiguration(' Identity-Service '),
    ).resolves.toEqual({
      service: 'identity-service',
      variables: { PORT: '3001' },
      keysCount: 1,
    });
  });

  it('createServiceConfiguration validates empty variables with Ex1006', async () => {
    await expect(
      useCase.createServiceConfiguration({
        service: 'identity-service',
        variables: {},
      }),
    ).rejects.toMatchObject({
      response: {
        code: FoodaExceptionCodes.Ex1006.code,
      },
      status: HttpStatus.BAD_REQUEST,
    });
  });

  it('createServiceConfiguration validates duplicate service with Ex1003', async () => {
    repository.existsService.mockResolvedValue(true);

    await expect(
      useCase.createServiceConfiguration({
        service: 'identity-service',
        variables: { PORT: '3001' },
      }),
    ).rejects.toMatchObject({
      response: {
        code: FoodaExceptionCodes.Ex1003.code,
      },
      status: HttpStatus.CONFLICT,
    });
  });

  it('createServiceConfiguration creates and returns service summary', async () => {
    repository.existsService
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    repository.getServiceVariables.mockResolvedValue({ PORT: '3001' });

    await expect(
      useCase.createServiceConfiguration({
        service: 'identity-service',
        variables: { PORT: '3001' },
        actor: 'ops@fooda.io',
        reason: 'init',
      }),
    ).resolves.toEqual({
      service: 'identity-service',
      variables: { PORT: '3001' },
      keysCount: 1,
    });

    expect(repository.createService).toHaveBeenCalledWith(
      'identity-service',
      { PORT: '3001' },
      { actor: 'ops@fooda.io', reason: 'init' },
    );
  });

  it('patchServiceConfiguration validates empty variables with Ex1007', async () => {
    await expect(
      useCase.patchServiceConfiguration({
        service: 'identity-service',
        variables: {},
      }),
    ).rejects.toMatchObject({
      response: {
        code: FoodaExceptionCodes.Ex1007.code,
      },
      status: HttpStatus.BAD_REQUEST,
    });
  });

  it('patchServiceConfiguration throws Ex1002 when service does not exist', async () => {
    repository.existsService.mockResolvedValue(false);

    await expect(
      useCase.patchServiceConfiguration({
        service: 'identity-service',
        variables: { PORT: '3101' },
      }),
    ).rejects.toMatchObject({
      response: {
        code: FoodaExceptionCodes.Ex1002.code,
      },
      status: HttpStatus.NOT_FOUND,
    });
  });

  it('patchServiceConfiguration updates, publishes event and returns summary', async () => {
    repository.existsService.mockResolvedValue(true);
    repository.getServiceVariables.mockResolvedValue({ PORT: '3101' });

    await expect(
      useCase.patchServiceConfiguration({
        service: 'identity-service',
        variables: { PORT: '3101' },
        actor: 'ops@fooda.io',
        reason: 'update',
      }),
    ).resolves.toEqual({
      service: 'identity-service',
      variables: { PORT: '3101' },
      keysCount: 1,
    });

    expect(repository.patchService).toHaveBeenCalledWith(
      'identity-service',
      { PORT: '3101' },
      { actor: 'ops@fooda.io', reason: 'update' },
    );
    expect(repository.publishConfigEvent).toHaveBeenCalledWith(
      'identity-service',
      'PATCH',
      {
        variables: { PORT: '3101' },
        actor: 'ops@fooda.io',
        reason: 'update',
      },
    );
  });

  it('deleteServiceVariable throws Ex1002 when service does not exist', async () => {
    repository.existsService.mockResolvedValue(false);

    await expect(
      useCase.deleteServiceVariable({
        service: 'identity-service',
        key: 'PORT',
      }),
    ).rejects.toMatchObject({
      response: {
        code: FoodaExceptionCodes.Ex1002.code,
      },
      status: HttpStatus.NOT_FOUND,
    });
  });

  it('deleteServiceVariable throws Ex1005 when key is missing', async () => {
    repository.existsService.mockResolvedValue(true);
    repository.getServiceVariables.mockResolvedValue({ JWT_SECRET: 'x' });

    await expect(
      useCase.deleteServiceVariable({
        service: 'identity-service',
        key: 'PORT',
      }),
    ).rejects.toMatchObject({
      response: {
        code: FoodaExceptionCodes.Ex1005.code,
      },
      status: HttpStatus.NOT_FOUND,
    });
  });

  it('deleteServiceVariable deletes and returns payload', async () => {
    repository.existsService.mockResolvedValue(true);
    repository.getServiceVariables.mockResolvedValue({ PORT: '3001' });

    await expect(
      useCase.deleteServiceVariable({
        service: 'identity-service',
        key: 'PORT',
        actor: 'ops@fooda.io',
      }),
    ).resolves.toEqual({
      deleted: true,
      service: 'identity-service',
      key: 'PORT',
    });

    expect(repository.deleteServiceKey).toHaveBeenCalledWith(
      'identity-service',
      'PORT',
      { actor: 'ops@fooda.io', reason: undefined },
    );
  });

  it('getServiceHistory validates and clamps limit range', async () => {
    repository.existsService.mockResolvedValue(true);
    repository.getHistory.mockResolvedValue([]);

    await useCase.getServiceHistory('identity-service', 999);
    expect(repository.getHistory).toHaveBeenCalledWith('identity-service', 200);

    await useCase.getServiceHistory('identity-service', 0);
    expect(repository.getHistory).toHaveBeenCalledWith('identity-service', 1);
  });

  it('rollbackServiceConfiguration throws Ex1008 when repository returns null', async () => {
    repository.existsService.mockResolvedValue(true);
    repository.rollbackLastChange.mockResolvedValue(null);

    await expect(
      useCase.rollbackServiceConfiguration({ service: 'identity-service' }),
    ).rejects.toMatchObject({
      response: {
        code: FoodaExceptionCodes.Ex1008.code,
      },
      status: HttpStatus.CONFLICT,
    });
  });

  it('rollbackServiceConfiguration publishes rollback event and returns summary', async () => {
    repository.existsService.mockResolvedValue(true);
    repository.rollbackLastChange.mockResolvedValue({ PORT: '3001' });

    await expect(
      useCase.rollbackServiceConfiguration({
        service: 'identity-service',
        actor: 'ops@fooda.io',
      }),
    ).resolves.toEqual({
      service: 'identity-service',
      variables: { PORT: '3001' },
      keysCount: 1,
    });

    expect(repository.publishConfigEvent).toHaveBeenCalledWith(
      'identity-service',
      'ROLLBACK',
      {
        actor: 'ops@fooda.io',
        reason: undefined,
      },
    );
  });

  it('reloadInitialConfiguration throws Ex1009 when file is not found', async () => {
    configService.get.mockReturnValue('/tmp/seed.json');
    (readFile as jest.Mock).mockRejectedValue(new Error('missing'));

    await expect(useCase.reloadInitialConfiguration({})).rejects.toMatchObject({
      response: {
        code: FoodaExceptionCodes.Ex1009.code,
      },
      status: HttpStatus.NOT_FOUND,
    });
  });

  it('reloadInitialConfiguration throws Ex1010 for invalid JSON', async () => {
    configService.get.mockReturnValue('/tmp/seed.json');
    (readFile as jest.Mock).mockResolvedValue('not-json');

    await expect(useCase.reloadInitialConfiguration({})).rejects.toMatchObject({
      response: {
        code: FoodaExceptionCodes.Ex1010.code,
      },
      status: HttpStatus.BAD_REQUEST,
    });
  });

  it('reloadInitialConfiguration throws Ex1011 for invalid seed structure', async () => {
    configService.get.mockReturnValue('/tmp/seed.json');
    (readFile as jest.Mock).mockResolvedValue(JSON.stringify([]));

    await expect(useCase.reloadInitialConfiguration({})).rejects.toMatchObject({
      response: {
        code: FoodaExceptionCodes.Ex1011.code,
      },
      status: HttpStatus.BAD_REQUEST,
    });
  });

  it('reloadInitialConfiguration throws Ex1012 when service value is not object', async () => {
    configService.get.mockReturnValue('/tmp/seed.json');
    (readFile as jest.Mock).mockResolvedValue(
      JSON.stringify({
        services: {
          'identity-service': 'invalid',
        },
      }),
    );

    await expect(useCase.reloadInitialConfiguration({})).rejects.toMatchObject({
      response: {
        code: FoodaExceptionCodes.Ex1012.code,
      },
      status: HttpStatus.BAD_REQUEST,
    });
  });

  it('reloadInitialConfiguration reloads and publishes events for each service', async () => {
    configService.get.mockImplementation((key: string) => {
      if (key === 'CONFIG_SEED_FILE_PATH') return '/tmp/seed.json';
      return undefined;
    });

    (readFile as jest.Mock).mockResolvedValue(
      JSON.stringify({
        services: {
          'Identity-Service': { PORT: '3001' },
          'cache-service': { PORT: '3002' },
        },
      }),
    );

    await expect(
      useCase.reloadInitialConfiguration({
        actor: 'deploy-bot',
        reason: 'startup',
      }),
    ).resolves.toEqual({
      reloaded: 2,
      services: ['cache-service', 'identity-service'],
      seedPath: '/tmp/seed.json',
    });

    expect(repository.reloadFromSeed).toHaveBeenCalledWith(
      {
        'identity-service': { PORT: '3001' },
        'cache-service': { PORT: '3002' },
      },
      { actor: 'deploy-bot', reason: 'startup' },
    );

    expect(repository.publishConfigEvent).toHaveBeenCalledTimes(2);
  });

  it('reloadInitialConfiguration supports flat service payload', async () => {
    configService.get.mockReturnValue(undefined);
    (readFile as jest.Mock).mockResolvedValue(
      JSON.stringify({
        'identity-service': { PORT: '3001' },
      }),
    );

    const result = await useCase.reloadInitialConfiguration({});

    expect(result.reloaded).toBe(1);
    expect(result.services).toEqual(['identity-service']);
    expect(result.seedPath).toContain(
      '/src/app/bootstrap/bootstrap-config.json',
    );
  });

  it('throws Ex1004 when create variables include non-string', async () => {
    await expect(
      useCase.createServiceConfiguration({
        service: 'identity-service',
        variables: { PORT: 3001 as unknown as string },
      }),
    ).rejects.toMatchObject({
      response: {
        code: FoodaExceptionCodes.Ex1004.code,
      },
      status: HttpStatus.BAD_REQUEST,
    });
  });

  it('throws Ex1004 when patch variables include non-string', async () => {
    await expect(
      useCase.patchServiceConfiguration({
        service: 'identity-service',
        variables: { PORT: 3001 as unknown as string },
      }),
    ).rejects.toMatchObject({
      response: {
        code: FoodaExceptionCodes.Ex1004.code,
      },
      status: HttpStatus.BAD_REQUEST,
    });
  });

  it('throws Ex1000 for invalid service name in read path', async () => {
    await expect(
      useCase.getServiceConfiguration('Identity_Service'),
    ).rejects.toMatchObject({
      response: {
        code: FoodaExceptionCodes.Ex1000.code,
      },
      status: HttpStatus.BAD_REQUEST,
    });
  });

  it('throws Ex1001 for invalid variable key in delete path', async () => {
    await expect(
      useCase.deleteServiceVariable({
        service: 'identity-service',
        key: 'port',
      }),
    ).rejects.toMatchObject({
      response: {
        code: FoodaExceptionCodes.Ex1001.code,
      },
      status: HttpStatus.BAD_REQUEST,
    });
  });

  it('surfaces FoodaException type for one error path', async () => {
    repository.existsService.mockResolvedValue(false);

    await expect(
      useCase.getServiceConfiguration('cache-service'),
    ).rejects.toBeInstanceOf(FoodaException);
  });
});
