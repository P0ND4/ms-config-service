import { IConfigUseCase } from 'src/contexts/config/domain/use-cases/config/config-use-case.interface';
import { ConfigsController } from 'src/contexts/config/infrastructure/http-api/v1/config/controllers/configs.controller';

describe('ConfigsController', () => {
  let controller: ConfigsController;

  const configUseCase = {
    listConfiguredServices: jest.fn(),
    getServiceConfiguration: jest.fn(),
    createServiceConfiguration: jest.fn(),
    patchServiceConfiguration: jest.fn(),
    deleteServiceVariable: jest.fn(),
    getServiceHistory: jest.fn(),
    rollbackServiceConfiguration: jest.fn(),
    reloadInitialConfiguration: jest.fn(),
  } as unknown as jest.Mocked<IConfigUseCase>;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new ConfigsController(configUseCase);
  });

  it('getAllServices: returns configured services', async () => {
    const summary = [
      {
        service: 'identity-service',
        variables: { PORT: '3001' },
        keysCount: 1,
      },
    ];
    configUseCase.listConfiguredServices.mockResolvedValue(summary);

    const result = await controller.getAllServices();

    expect(result).toEqual(summary);
    expect(configUseCase.listConfiguredServices).toHaveBeenCalledTimes(1);
  });

  it('getService: delegates service name to use-case', async () => {
    const summary = {
      service: 'cache-service',
      variables: { PORT: '3002' },
      keysCount: 1,
    };
    configUseCase.getServiceConfiguration.mockResolvedValue(summary);

    const result = await controller.getService('cache-service');

    expect(result).toEqual(summary);
    expect(configUseCase.getServiceConfiguration).toHaveBeenCalledWith(
      'cache-service',
    );
  });

  it('createService: maps body to use-case input', async () => {
    const summary = {
      service: 'notification-service',
      variables: { PORT: '3005' },
      keysCount: 1,
    };
    configUseCase.createServiceConfiguration.mockResolvedValue(summary);

    const result = await controller.createService('notification-service', {
      variables: { PORT: '3005' },
      actor: 'ops@fooda.io',
      reason: 'Alta inicial',
    });

    expect(result).toEqual(summary);
    expect(configUseCase.createServiceConfiguration).toHaveBeenCalledWith({
      service: 'notification-service',
      variables: { PORT: '3005' },
      actor: 'ops@fooda.io',
      reason: 'Alta inicial',
    });
  });

  it('patchService: maps body to use-case input', async () => {
    const summary = {
      service: 'identity-service',
      variables: { PORT: '3101' },
      keysCount: 1,
    };
    configUseCase.patchServiceConfiguration.mockResolvedValue(summary);

    const result = await controller.patchService('identity-service', {
      variables: { PORT: '3101' },
      actor: 'ops@fooda.io',
      reason: 'Ajuste de puerto',
    });

    expect(result).toEqual(summary);
    expect(configUseCase.patchServiceConfiguration).toHaveBeenCalledWith({
      service: 'identity-service',
      variables: { PORT: '3101' },
      actor: 'ops@fooda.io',
      reason: 'Ajuste de puerto',
    });
  });

  it('deleteServiceKey: delegates service and key', async () => {
    configUseCase.deleteServiceVariable.mockResolvedValue({
      deleted: true,
      service: 'identity-service',
      key: 'PORT',
    });

    const result = await controller.deleteServiceKey(
      'identity-service',
      'PORT',
    );

    expect(result).toEqual({
      deleted: true,
      service: 'identity-service',
      key: 'PORT',
    });
    expect(configUseCase.deleteServiceVariable).toHaveBeenCalledWith({
      service: 'identity-service',
      key: 'PORT',
    });
  });

  it('getServiceHistory: passes service and limit', async () => {
    const history = {
      service: 'identity-service',
      items: [],
    };
    configUseCase.getServiceHistory.mockResolvedValue(history);

    const result = await controller.getServiceHistory('identity-service', {
      limit: 25,
    });

    expect(result).toEqual(history);
    expect(configUseCase.getServiceHistory).toHaveBeenCalledWith(
      'identity-service',
      25,
    );
  });

  it('rollbackService: maps body to use-case input', async () => {
    const summary = {
      service: 'identity-service',
      variables: { PORT: '3001' },
      keysCount: 1,
    };
    configUseCase.rollbackServiceConfiguration.mockResolvedValue(summary);

    const result = await controller.rollbackService('identity-service', {
      actor: 'ops@fooda.io',
      reason: 'Rollback post incidente',
    });

    expect(result).toEqual(summary);
    expect(configUseCase.rollbackServiceConfiguration).toHaveBeenCalledWith({
      service: 'identity-service',
      actor: 'ops@fooda.io',
      reason: 'Rollback post incidente',
    });
  });

  it('reloadConfiguration: delegates actor and reason', async () => {
    const response = {
      reloaded: 2,
      services: ['identity-service', 'cache-service'],
      seedPath: 'src/app/bootstrap/bootstrap-config.json',
    };
    configUseCase.reloadInitialConfiguration.mockResolvedValue(response);

    const result = await controller.reloadConfiguration({
      actor: 'deploy-bot',
      reason: 'Startup seed reload',
    });

    expect(result).toEqual(response);
    expect(configUseCase.reloadInitialConfiguration).toHaveBeenCalledWith({
      actor: 'deploy-bot',
      reason: 'Startup seed reload',
    });
  });

  it('createService: propagates use-case errors', async () => {
    const error = new Error('service already exists');
    configUseCase.createServiceConfiguration.mockRejectedValue(error);

    await expect(
      controller.createService('identity-service', {
        variables: { PORT: '3001' },
      }),
    ).rejects.toThrow(error);
  });
});
