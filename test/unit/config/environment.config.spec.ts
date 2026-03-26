import environment from 'src/config/environment.config';

describe('environment.config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns defaults when env vars are missing', async () => {
    delete process.env.REDIS_HOST;
    delete process.env.REDIS_PORT;
    delete process.env.PORT;
    delete process.env.NODE_ENV;
    delete process.env.CONFIG_SEED_FILE_PATH;
    delete process.env.CONFIG_PUBSUB_CHANNEL;

    const result = await environment();

    expect(result.REDIS_HOST).toBe('localhost');
    expect(result.REDIS_PORT).toBe(6379);
    expect(result.PORT).toBe(3000);
    expect(result.NODE_ENV).toBe('development');
    expect(result.CONFIG_SEED_FILE_PATH).toContain(
      '/src/app/bootstrap/bootstrap-config.json',
    );
    expect(result.CONFIG_PUBSUB_CHANNEL).toBe('configs:changes');
  });

  it('uses custom env values when provided', async () => {
    process.env.REDIS_URL = 'redis://localhost:6380';
    process.env.REDIS_HOST = 'redis-host';
    process.env.REDIS_PORT = '6380';
    process.env.REDIS_PASSWORD = 'secret';
    process.env.REDIS_USERNAME = 'user';
    process.env.PORT = '4100';
    process.env.NODE_ENV = 'production';
    process.env.CONFIG_SEED_FILE_PATH = '/tmp/bootstrap.json';
    process.env.CONFIG_PUBSUB_CHANNEL = 'custom:channel';

    const result = await environment();

    expect(result).toEqual({
      REDIS_URL: 'redis://localhost:6380',
      REDIS_HOST: 'redis-host',
      REDIS_PORT: 6380,
      REDIS_PASSWORD: 'secret',
      REDIS_USERNAME: 'user',
      CONFIG_SEED_FILE_PATH: '/tmp/bootstrap.json',
      CONFIG_PUBSUB_CHANNEL: 'custom:channel',
      PORT: 4100,
      NODE_ENV: 'production',
    });
  });
});
