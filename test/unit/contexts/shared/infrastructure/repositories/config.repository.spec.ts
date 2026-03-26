import { ConfigService } from '@nestjs/config';
import { RedisConfigRepository } from 'src/contexts/shared/infrastructure/repositories/config.repository';

interface PipelineMock {
  del: jest.Mock;
  exec: jest.Mock;
}

describe('RedisConfigRepository', () => {
  const redis = {
    smembers: jest.fn(),
    sismember: jest.fn(),
    hgetall: jest.fn(),
    sadd: jest.fn(),
    hset: jest.fn(),
    hdel: jest.fn(),
    srem: jest.fn(),
    lindex: jest.fn(),
    del: jest.fn(),
    lrange: jest.fn(),
    lpush: jest.fn(),
    ltrim: jest.fn(),
    publish: jest.fn(),
    pipeline: jest.fn(),
  };

  const configService = {
    get: jest.fn(),
  } as unknown as jest.Mocked<ConfigService>;

  let repository: RedisConfigRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new RedisConfigRepository(redis as any, configService);

    redis.sadd.mockResolvedValue(1);
    redis.hset.mockResolvedValue(1);
    redis.hdel.mockResolvedValue(1);
    redis.srem.mockResolvedValue(1);
    redis.del.mockResolvedValue(1);
    redis.lpush.mockResolvedValue(1);
    redis.ltrim.mockResolvedValue(1);
    redis.publish.mockResolvedValue(1);
  });

  it('listServices delegates to Redis set', async () => {
    redis.smembers.mockResolvedValue(['identity-service']);

    await expect(repository.listServices()).resolves.toEqual([
      'identity-service',
    ]);
    expect(redis.smembers).toHaveBeenCalledWith('configs:services');
  });

  it('existsService maps Redis membership to boolean', async () => {
    redis.sismember.mockResolvedValueOnce(1).mockResolvedValueOnce(0);

    await expect(repository.existsService('identity-service')).resolves.toBe(
      true,
    );
    await expect(repository.existsService('missing-service')).resolves.toBe(
      false,
    );
  });

  it('getServiceVariables reads hash for service', async () => {
    redis.hgetall.mockResolvedValue({ PORT: '3001' });

    await expect(
      repository.getServiceVariables('identity-service'),
    ).resolves.toEqual({
      PORT: '3001',
    });
    expect(redis.hgetall).toHaveBeenCalledWith(
      'configs:service:identity-service',
    );
  });

  it('createService stores variables and appends create history', async () => {
    await repository.createService(
      'identity-service',
      { PORT: '3001' },
      { actor: 'ops' },
    );

    expect(redis.sadd).toHaveBeenCalledWith(
      'configs:services',
      'identity-service',
    );
    expect(redis.hset).toHaveBeenCalledWith(
      'configs:service:identity-service',
      {
        PORT: '3001',
      },
    );
    expect(redis.lpush).toHaveBeenCalledTimes(1);
    expect(redis.ltrim).toHaveBeenCalledWith(
      'configs:service:identity-service:history',
      0,
      199,
    );

    const historyRaw = redis.lpush.mock.calls[0][1] as string;
    const history = JSON.parse(historyRaw) as {
      action: string;
      changes: Array<{ key: string; nextValue?: string }>;
    };
    expect(history.action).toBe('CREATE');
    expect(history.changes).toEqual([{ key: 'PORT', nextValue: '3001' }]);
  });

  it('createService skips hset when variables are empty', async () => {
    await repository.createService('identity-service', {}, { actor: 'ops' });

    expect(redis.hset).not.toHaveBeenCalled();
    expect(redis.lpush).toHaveBeenCalledTimes(1);
  });

  it('patchService appends patch history with changed keys only', async () => {
    redis.hgetall
      .mockResolvedValueOnce({ PORT: '3001', NODE_ENV: 'dev' })
      .mockResolvedValueOnce({ PORT: '3101', NODE_ENV: 'dev' });

    await repository.patchService(
      'identity-service',
      { PORT: '3101' },
      { actor: 'ops', reason: 'rotate' },
    );

    expect(redis.hset).toHaveBeenCalledWith(
      'configs:service:identity-service',
      {
        PORT: '3101',
      },
    );

    const historyRaw = redis.lpush.mock.calls[0][1] as string;
    const history = JSON.parse(historyRaw) as {
      action: string;
      actor: string;
      reason?: string;
      changes: Array<{
        key: string;
        previousValue?: string;
        nextValue?: string;
      }>;
    };

    expect(history.action).toBe('PATCH');
    expect(history.actor).toBe('ops');
    expect(history.reason).toBe('rotate');
    expect(history.changes).toEqual([
      { key: 'PORT', previousValue: '3001', nextValue: '3101' },
    ]);
  });

  it('deleteServiceKey removes service from set when hash becomes empty', async () => {
    redis.hgetall
      .mockResolvedValueOnce({ PORT: '3001' })
      .mockResolvedValueOnce({});

    await repository.deleteServiceKey('identity-service', 'PORT', {
      actor: 'ops',
    });

    expect(redis.hdel).toHaveBeenCalledWith(
      'configs:service:identity-service',
      'PORT',
    );
    expect(redis.srem).toHaveBeenCalledWith(
      'configs:services',
      'identity-service',
    );

    const historyRaw = redis.lpush.mock.calls[0][1] as string;
    const history = JSON.parse(historyRaw) as { action: string };
    expect(history.action).toBe('DELETE_KEY');
  });

  it('rollbackLastChange returns null when there is no history', async () => {
    redis.lindex.mockResolvedValue(null);

    await expect(
      repository.rollbackLastChange('identity-service', { actor: 'ops' }),
    ).resolves.toBeNull();
    expect(redis.del).not.toHaveBeenCalled();
  });

  it('rollbackLastChange restores before snapshot with data', async () => {
    redis.lindex.mockResolvedValue(
      JSON.stringify({ before: { PORT: '3001' }, after: { PORT: '3101' } }),
    );
    redis.hgetall.mockResolvedValue({ PORT: '3101' });

    await expect(
      repository.rollbackLastChange('identity-service', { actor: 'ops' }),
    ).resolves.toEqual({ PORT: '3001' });

    expect(redis.del).toHaveBeenCalledWith('configs:service:identity-service');
    expect(redis.hset).toHaveBeenCalledWith(
      'configs:service:identity-service',
      {
        PORT: '3001',
      },
    );
    expect(redis.sadd).toHaveBeenCalledWith(
      'configs:services',
      'identity-service',
    );

    const historyRaw = redis.lpush.mock.calls[0][1] as string;
    const history = JSON.parse(historyRaw) as { action: string };
    expect(history.action).toBe('ROLLBACK');
  });

  it('rollbackLastChange removes service when before snapshot is empty', async () => {
    redis.lindex.mockResolvedValue(
      JSON.stringify({ before: {}, after: { PORT: '3101' } }),
    );
    redis.hgetall.mockResolvedValue({ PORT: '3101' });

    await repository.rollbackLastChange('identity-service', { actor: 'ops' });

    expect(redis.srem).toHaveBeenCalledWith(
      'configs:services',
      'identity-service',
    );
  });

  it('getHistory parses list values as JSON objects', async () => {
    redis.lrange.mockResolvedValue([
      JSON.stringify({ id: '1', action: 'PATCH' }),
      JSON.stringify({ id: '2', action: 'ROLLBACK' }),
    ]);

    await expect(repository.getHistory('identity-service', 2)).resolves.toEqual(
      [
        { id: '1', action: 'PATCH' },
        { id: '2', action: 'ROLLBACK' },
      ],
    );

    expect(redis.lrange).toHaveBeenCalledWith(
      'configs:service:identity-service:history',
      0,
      1,
    );
  });

  it('reloadFromSeed cleans existing services and loads new seed', async () => {
    redis.smembers.mockResolvedValue(['identity-service', 'cache-service']);

    const pipeline: PipelineMock = {
      del: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
    };
    redis.pipeline.mockReturnValue(pipeline as any);

    await repository.reloadFromSeed(
      {
        'notification-service': { PORT: '3005' },
        'mailer-service': {},
      },
      { actor: 'deploy-bot', reason: 'reload' },
    );

    expect(pipeline.del).toHaveBeenCalledWith(
      'configs:service:identity-service',
    );
    expect(pipeline.del).toHaveBeenCalledWith(
      'configs:service:identity-service:history',
    );
    expect(pipeline.del).toHaveBeenCalledWith('configs:service:cache-service');
    expect(pipeline.del).toHaveBeenCalledWith(
      'configs:service:cache-service:history',
    );
    expect(pipeline.del).toHaveBeenCalledWith('configs:services');
    expect(pipeline.exec).toHaveBeenCalledTimes(1);

    expect(redis.sadd).toHaveBeenCalledWith(
      'configs:services',
      'notification-service',
    );
    expect(redis.sadd).toHaveBeenCalledWith(
      'configs:services',
      'mailer-service',
    );
    expect(redis.hset).toHaveBeenCalledWith(
      'configs:service:notification-service',
      {
        PORT: '3005',
      },
    );

    const actions = redis.lpush.mock.calls.map(
      (call) => (JSON.parse(call[1] as string) as { action: string }).action,
    );
    expect(actions).toEqual(['RELOAD', 'RELOAD']);
  });

  it('publishConfigEvent uses configured channel', async () => {
    configService.get = jest.fn().mockReturnValue('configs:custom') as any;
    repository = new RedisConfigRepository(redis as any, configService);

    await repository.publishConfigEvent('identity-service', 'PATCH', {
      variables: { PORT: '3101' },
    });

    expect(redis.publish).toHaveBeenCalledTimes(1);
    expect(redis.publish.mock.calls[0][0]).toBe('configs:custom');

    const body = JSON.parse(redis.publish.mock.calls[0][1] as string) as {
      service: string;
      action: string;
      payload: Record<string, unknown>;
      createdAt: string;
    };

    expect(body.service).toBe('identity-service');
    expect(body.action).toBe('PATCH');
    expect(body.payload).toEqual({ variables: { PORT: '3101' } });
    expect(typeof body.createdAt).toBe('string');
  });

  it('publishConfigEvent falls back to default channel', async () => {
    configService.get = jest.fn().mockReturnValue(undefined) as any;
    repository = new RedisConfigRepository(redis as any, configService);

    await repository.publishConfigEvent('identity-service', 'RELOAD', {});

    expect(redis.publish.mock.calls[0][0]).toBe('configs:changes');
  });
});
