import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { Redis } from 'ioredis';
import {
  ConfigHistoryChange,
  ConfigHistoryItem,
  ServiceConfigValues,
} from 'src/contexts/config/domain/use-cases/config-use-case.interface';
import {
  ConfigMutationMetadata,
  IConfigRepository,
} from 'src/contexts/shared/domain/repositories/config.repository.interface';

const SERVICES_SET_KEY = 'configs:services';
const HISTORY_LIMIT = 200;
interface ChangePayload {
  key: string;
  previousValue?: string;
  nextValue?: string;
}

@Injectable()
export class RedisConfigRepository implements IConfigRepository {
  constructor(
    @Inject('CONFIG_REDIS') private readonly redis: Redis,
    private readonly configService: ConfigService,
  ) {}

  async listServices(): Promise<string[]> {
    return await this.redis.smembers(SERVICES_SET_KEY);
  }

  async existsService(service: string): Promise<boolean> {
    const exists = await this.redis.sismember(SERVICES_SET_KEY, service);
    return exists === 1;
  }

  async getServiceVariables(service: string): Promise<ServiceConfigValues> {
    return await this.redis.hgetall(this.getServiceHashKey(service));
  }

  async createService(
    service: string,
    variables: ServiceConfigValues,
    metadata: ConfigMutationMetadata,
  ): Promise<void> {
    await this.redis.sadd(SERVICES_SET_KEY, service);

    if (Object.keys(variables).length > 0)
      await this.redis.hset(this.getServiceHashKey(service), variables);

    await this.appendHistory(
      service,
      'CREATE',
      {},
      variables,
      metadata,
      this.toCreateChanges(variables),
    );
  }

  async patchService(
    service: string,
    variables: ServiceConfigValues,
    metadata: ConfigMutationMetadata,
  ): Promise<void> {
    const before = await this.getServiceVariables(service);

    await this.redis.hset(this.getServiceHashKey(service), variables);
    await this.redis.sadd(SERVICES_SET_KEY, service);

    const after = await this.getServiceVariables(service);
    await this.appendHistory(
      service,
      'PATCH',
      before,
      after,
      metadata,
      this.diffValues(before, after),
    );
  }

  async deleteServiceKey(
    service: string,
    key: string,
    metadata: ConfigMutationMetadata,
  ): Promise<void> {
    const before = await this.getServiceVariables(service);
    await this.redis.hdel(this.getServiceHashKey(service), key);
    const after = await this.getServiceVariables(service);

    if (Object.keys(after).length === 0)
      await this.redis.srem(SERVICES_SET_KEY, service);

    await this.appendHistory(
      service,
      'DELETE_KEY',
      before,
      after,
      metadata,
      this.diffValues(before, after),
    );
  }

  async rollbackLastChange(
    service: string,
    metadata: ConfigMutationMetadata,
  ): Promise<ServiceConfigValues | null> {
    const key = this.getServiceHistoryKey(service);
    const latestHistoryRaw = await this.redis.lindex(key, 0);

    if (!latestHistoryRaw) return null;

    const latestHistory = JSON.parse(latestHistoryRaw) as ConfigHistoryItem;
    const beforeSnapshot = latestHistory.before ?? {};
    const current = await this.getServiceVariables(service);

    const hashKey = this.getServiceHashKey(service);
    await this.redis.del(hashKey);

    if (Object.keys(beforeSnapshot).length > 0) {
      await this.redis.hset(hashKey, beforeSnapshot);
      await this.redis.sadd(SERVICES_SET_KEY, service);
    } else {
      await this.redis.srem(SERVICES_SET_KEY, service);
    }

    await this.appendHistory(
      service,
      'ROLLBACK',
      current,
      beforeSnapshot,
      metadata,
      this.diffValues(current, beforeSnapshot),
    );

    return beforeSnapshot;
  }

  async getHistory(
    service: string,
    limit: number,
  ): Promise<ConfigHistoryItem[]> {
    const raw = await this.redis.lrange(
      this.getServiceHistoryKey(service),
      0,
      limit - 1,
    );

    return raw.map((item) => JSON.parse(item) as ConfigHistoryItem);
  }

  async reloadFromSeed(
    seed: Record<string, ServiceConfigValues>,
    metadata: ConfigMutationMetadata,
  ): Promise<void> {
    const existingServices = await this.listServices();

    const cleanupPipeline = this.redis.pipeline();
    for (const service of existingServices) {
      cleanupPipeline.del(this.getServiceHashKey(service));
      cleanupPipeline.del(this.getServiceHistoryKey(service));
    }
    cleanupPipeline.del(SERVICES_SET_KEY);
    await cleanupPipeline.exec();

    for (const [service, variables] of Object.entries(seed)) {
      await this.redis.sadd(SERVICES_SET_KEY, service);
      if (Object.keys(variables).length > 0)
        await this.redis.hset(this.getServiceHashKey(service), variables);

      await this.appendHistory(
        service,
        'RELOAD',
        {},
        variables,
        metadata,
        this.toCreateChanges(variables),
      );
    }
  }

  async publishConfigEvent(
    service: string,
    action: 'PATCH' | 'ROLLBACK' | 'RELOAD',
    payload: Record<string, unknown>,
  ): Promise<void> {
    await this.redis.publish(
      this.configService.get<string>('CONFIG_PUBSUB_CHANNEL') ??
        'configs:changes',
      JSON.stringify({
        service,
        action,
        payload,
        createdAt: new Date().toISOString(),
      }),
    );
  }

  private async appendHistory(
    service: string,
    action: ConfigHistoryItem['action'],
    before: ServiceConfigValues,
    after: ServiceConfigValues,
    metadata: ConfigMutationMetadata,
    changes: ChangePayload[],
  ): Promise<void> {
    const history: ConfigHistoryItem = {
      id: randomUUID(),
      service,
      action,
      actor: metadata.actor,
      reason: metadata.reason,
      changes: changes.map((change) => this.toHistoryChange(change)),
      before,
      after,
      createdAt: new Date().toISOString(),
    };

    const historyKey = this.getServiceHistoryKey(service);
    await this.redis.lpush(historyKey, JSON.stringify(history));
    await this.redis.ltrim(historyKey, 0, HISTORY_LIMIT - 1);
  }

  private toCreateChanges(after: ServiceConfigValues): ChangePayload[] {
    return Object.entries(after).map(([key, value]) => ({
      key,
      nextValue: value,
    }));
  }

  private diffValues(
    before: ServiceConfigValues,
    after: ServiceConfigValues,
  ): ChangePayload[] {
    const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
    const changes: ChangePayload[] = [];

    for (const key of keys) {
      const previousValue = before[key];
      const nextValue = after[key];

      if (previousValue === nextValue) continue;

      changes.push({ key, previousValue, nextValue });
    }

    return changes;
  }

  private toHistoryChange(change: ChangePayload): ConfigHistoryChange {
    return {
      key: change.key,
      previousValue: change.previousValue,
      nextValue: change.nextValue,
    };
  }

  private getServiceHashKey(service: string): string {
    return `configs:service:${service}`;
  }

  private getServiceHistoryKey(service: string): string {
    return `configs:service:${service}:history`;
  }
}
