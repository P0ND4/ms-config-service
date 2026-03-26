interface Environment {
  REDIS_URL?: string;
  REDIS_HOST: string;
  REDIS_PORT: number;
  REDIS_PASSWORD?: string;
  REDIS_USERNAME?: string;
  PORT: number;
  NODE_ENV: string;
  CONFIG_SEED_FILE_PATH: string;
  CONFIG_PUBSUB_CHANNEL: string;
}

export default async (): Promise<Environment> => {
  // Here you can use the ms-config-service and change the environment.
  // Compatible with async await by default.
  // If you're going to use asynchronous requests for environment variables, remember to use caching or ms-cache-service.

  return {
    // Redis
    REDIS_URL: process.env.REDIS_URL,
    REDIS_HOST: process.env.REDIS_HOST ?? 'localhost',
    REDIS_PORT: parseInt(process.env.REDIS_PORT ?? '6379', 10),
    REDIS_PASSWORD: process.env.REDIS_PASSWORD,
    REDIS_USERNAME: process.env.REDIS_USERNAME,

    // Config
    CONFIG_SEED_FILE_PATH:
      process.env.CONFIG_SEED_FILE_PATH ??
      `${process.cwd()}/src/app/bootstrap/bootstrap-config.json`,
    CONFIG_PUBSUB_CHANNEL:
      process.env.CONFIG_PUBSUB_CHANNEL ?? 'configs:changes',

    // Server
    PORT: parseInt(process.env.PORT ?? '3000', 10),
    NODE_ENV: process.env.NODE_ENV ?? 'development',
  };
};
