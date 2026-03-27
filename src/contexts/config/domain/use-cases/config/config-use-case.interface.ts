export type ServiceConfigValues = Record<string, string>;

export interface ConfigSummary {
  service: string;
  variables: ServiceConfigValues;
  keysCount: number;
}

export interface ConfigHistoryChange {
  key: string;
  previousValue?: string;
  nextValue?: string;
}

export interface ConfigHistoryItem {
  id: string;
  service: string;
  action: 'CREATE' | 'PATCH' | 'DELETE_KEY' | 'ROLLBACK' | 'RELOAD';
  actor: string;
  reason?: string;
  changes: ConfigHistoryChange[];
  before: ServiceConfigValues;
  after: ServiceConfigValues;
  createdAt: string;
}

export interface ConfigHistoryResult {
  service: string;
  items: ConfigHistoryItem[];
}

export interface CreateServiceConfigInput {
  service: string;
  variables: ServiceConfigValues;
  actor?: string;
  reason?: string;
}

export interface PatchServiceConfigInput {
  service: string;
  variables: ServiceConfigValues;
  actor?: string;
  reason?: string;
}

export interface DeleteServiceVariableInput {
  service: string;
  key: string;
  actor?: string;
  reason?: string;
}

export interface RollbackServiceConfigInput {
  service: string;
  actor?: string;
  reason?: string;
}

export interface ReloadConfigInput {
  actor?: string;
  reason?: string;
}

export abstract class IConfigUseCase {
  abstract listConfiguredServices(): Promise<ConfigSummary[]>;
  abstract getServiceConfiguration(service: string): Promise<ConfigSummary>;
  abstract createServiceConfiguration(
    input: CreateServiceConfigInput,
  ): Promise<ConfigSummary>;
  abstract patchServiceConfiguration(
    input: PatchServiceConfigInput,
  ): Promise<ConfigSummary>;
  abstract deleteServiceVariable(
    input: DeleteServiceVariableInput,
  ): Promise<{ deleted: true; service: string; key: string }>;
  abstract getServiceHistory(
    service: string,
    limit?: number,
  ): Promise<ConfigHistoryResult>;
  abstract rollbackServiceConfiguration(
    input: RollbackServiceConfigInput,
  ): Promise<ConfigSummary>;
  abstract reloadInitialConfiguration(
    input: ReloadConfigInput,
  ): Promise<{ reloaded: number; services: string[]; seedPath: string }>;
}
