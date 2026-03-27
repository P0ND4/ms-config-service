import {
  ConfigHistoryItem,
  ServiceConfigValues,
} from 'src/contexts/config/domain/use-cases/config/config-use-case.interface';

export interface ConfigMutationMetadata {
  actor: string;
  reason?: string;
}

export abstract class IConfigRepository {
  abstract listServices(): Promise<string[]>;
  abstract existsService(service: string): Promise<boolean>;
  abstract getServiceVariables(service: string): Promise<ServiceConfigValues>;
  abstract createService(
    service: string,
    variables: ServiceConfigValues,
    metadata: ConfigMutationMetadata,
  ): Promise<void>;
  abstract patchService(
    service: string,
    variables: ServiceConfigValues,
    metadata: ConfigMutationMetadata,
  ): Promise<void>;
  abstract deleteServiceKey(
    service: string,
    key: string,
    metadata: ConfigMutationMetadata,
  ): Promise<void>;
  abstract rollbackLastChange(
    service: string,
    metadata: ConfigMutationMetadata,
  ): Promise<ServiceConfigValues | null>;
  abstract getHistory(
    service: string,
    limit: number,
  ): Promise<ConfigHistoryItem[]>;
  abstract reloadFromSeed(
    seed: Record<string, ServiceConfigValues>,
    metadata: ConfigMutationMetadata,
  ): Promise<void>;
  abstract publishConfigEvent(
    service: string,
    action: 'PATCH' | 'ROLLBACK' | 'RELOAD',
    payload: Record<string, unknown>,
  ): Promise<void>;
}
