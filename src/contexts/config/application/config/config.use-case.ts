import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  ConfigHistoryResult,
  ConfigSummary,
  CreateServiceConfigInput,
  DeleteServiceVariableInput,
  IConfigUseCase,
  PatchServiceConfigInput,
  ReloadConfigInput,
  RollbackServiceConfigInput,
  ServiceConfigValues,
} from 'src/contexts/config/domain/use-cases/config/config-use-case.interface';
import {
  assertStringValueMap,
  assertValidServiceName,
  assertValidVariableKey,
  normalizeServiceName,
} from './helpers/validation.helper';
import { IConfigRepository } from 'src/contexts/shared/domain/repositories';
import { FoodaException } from 'src/contexts/shared/domain/exceptions/config.exception';
import { FoodaExceptionCodes } from 'src/contexts/shared/domain/exceptions/config-exception.codes';

@Injectable()
export class ConfigUseCase implements IConfigUseCase {
  constructor(
    private readonly configRepository: IConfigRepository,
    private readonly configService: ConfigService,
  ) {}

  async listConfiguredServices(): Promise<ConfigSummary[]> {
    const services = (await this.configRepository.listServices()).sort((a, b) =>
      a.localeCompare(b),
    );

    const result: ConfigSummary[] = [];
    for (const service of services) {
      const variables =
        await this.configRepository.getServiceVariables(service);
      result.push(this.toSummary(service, variables));
    }

    return result;
  }

  async getServiceConfiguration(service: string): Promise<ConfigSummary> {
    const normalizedService = normalizeServiceName(service);
    assertValidServiceName(normalizedService);

    const exists = await this.configRepository.existsService(normalizedService);
    if (!exists) {
      throw new FoodaException(
        FoodaExceptionCodes.Ex1002,
        HttpStatus.NOT_FOUND,
      );
    }

    const variables =
      await this.configRepository.getServiceVariables(normalizedService);
    return this.toSummary(normalizedService, variables);
  }

  async createServiceConfiguration(
    input: CreateServiceConfigInput,
  ): Promise<ConfigSummary> {
    const service = normalizeServiceName(input.service);
    assertValidServiceName(service);

    const variableEntries = Object.entries(input.variables);
    if (variableEntries.length === 0)
      throw new FoodaException(
        FoodaExceptionCodes.Ex1006,
        HttpStatus.BAD_REQUEST,
      );

    assertStringValueMap(input.variables as Record<string, unknown>);

    const exists = await this.configRepository.existsService(service);
    if (exists)
      throw new FoodaException(FoodaExceptionCodes.Ex1003, HttpStatus.CONFLICT);

    await this.configRepository.createService(service, input.variables, {
      actor: input.actor ?? 'system',
      reason: input.reason,
    });

    return await this.getServiceConfiguration(service);
  }

  async patchServiceConfiguration(
    input: PatchServiceConfigInput,
  ): Promise<ConfigSummary> {
    const service = normalizeServiceName(input.service);
    assertValidServiceName(service);

    const variableEntries = Object.entries(input.variables);
    if (variableEntries.length === 0) {
      throw new FoodaException(
        FoodaExceptionCodes.Ex1007,
        HttpStatus.BAD_REQUEST,
      );
    }

    assertStringValueMap(input.variables as Record<string, unknown>);

    const exists = await this.configRepository.existsService(service);
    if (!exists)
      throw new FoodaException(
        FoodaExceptionCodes.Ex1002,
        HttpStatus.NOT_FOUND,
      );

    await this.configRepository.patchService(service, input.variables, {
      actor: input.actor ?? 'system',
      reason: input.reason,
    });

    const summary = await this.getServiceConfiguration(service);

    await this.configRepository.publishConfigEvent(service, 'PATCH', {
      variables: input.variables,
      actor: input.actor ?? 'system',
      reason: input.reason,
    });

    return summary;
  }

  async deleteServiceVariable(
    input: DeleteServiceVariableInput,
  ): Promise<{ deleted: true; service: string; key: string }> {
    const service = normalizeServiceName(input.service);
    assertValidServiceName(service);
    assertValidVariableKey(input.key);

    const exists = await this.configRepository.existsService(service);
    if (!exists) {
      throw new FoodaException(
        FoodaExceptionCodes.Ex1002,
        HttpStatus.NOT_FOUND,
      );
    }

    const variables = await this.configRepository.getServiceVariables(service);
    if (!(input.key in variables)) {
      throw new FoodaException(
        FoodaExceptionCodes.Ex1005,
        HttpStatus.NOT_FOUND,
      );
    }

    await this.configRepository.deleteServiceKey(service, input.key, {
      actor: input.actor ?? 'system',
      reason: input.reason,
    });

    return { deleted: true, service, key: input.key };
  }

  async getServiceHistory(
    service: string,
    limit: number = 30,
  ): Promise<ConfigHistoryResult> {
    const normalizedService = normalizeServiceName(service);
    assertValidServiceName(normalizedService);

    const exists = await this.configRepository.existsService(normalizedService);
    if (!exists)
      throw new FoodaException(
        FoodaExceptionCodes.Ex1002,
        HttpStatus.NOT_FOUND,
      );

    const safeLimit = Math.max(1, Math.min(limit, 200));
    const items = await this.configRepository.getHistory(
      normalizedService,
      safeLimit,
    );
    return {
      service: normalizedService,
      items,
    };
  }

  async rollbackServiceConfiguration(
    input: RollbackServiceConfigInput,
  ): Promise<ConfigSummary> {
    const service = normalizeServiceName(input.service);
    assertValidServiceName(service);

    const exists = await this.configRepository.existsService(service);
    if (!exists)
      throw new FoodaException(
        FoodaExceptionCodes.Ex1002,
        HttpStatus.NOT_FOUND,
      );

    const rollbackResult = await this.configRepository.rollbackLastChange(
      service,
      {
        actor: input.actor ?? 'system',
        reason: input.reason,
      },
    );

    if (!rollbackResult)
      throw new FoodaException(FoodaExceptionCodes.Ex1008, HttpStatus.CONFLICT);

    await this.configRepository.publishConfigEvent(service, 'ROLLBACK', {
      actor: input.actor ?? 'system',
      reason: input.reason,
    });

    return this.toSummary(service, rollbackResult);
  }

  async reloadInitialConfiguration(
    input: ReloadConfigInput,
  ): Promise<{ reloaded: number; services: string[]; seedPath: string }> {
    const seedPath =
      this.configService.get<string>('CONFIG_SEED_FILE_PATH') ??
      resolve(process.cwd(), 'src/app/bootstrap/bootstrap-config.json');

    let rawFile: string;
    try {
      rawFile = await readFile(seedPath, 'utf8');
    } catch {
      throw new FoodaException(
        FoodaExceptionCodes.Ex1009,
        HttpStatus.NOT_FOUND,
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawFile);
    } catch {
      throw new FoodaException(
        FoodaExceptionCodes.Ex1010,
        HttpStatus.BAD_REQUEST,
      );
    }

    const seed = this.normalizeSeedPayload(parsed);

    await this.configRepository.reloadFromSeed(seed, {
      actor: input.actor ?? 'system',
      reason: input.reason,
    });

    for (const service of Object.keys(seed)) {
      await this.configRepository.publishConfigEvent(service, 'RELOAD', {
        actor: input.actor ?? 'system',
        reason: input.reason,
      });
    }

    return {
      reloaded: Object.keys(seed).length,
      services: Object.keys(seed).sort((a, b) => a.localeCompare(b)),
      seedPath,
    };
  }

  private normalizeSeedPayload(
    payload: unknown,
  ): Record<string, ServiceConfigValues> {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new FoodaException(
        FoodaExceptionCodes.Ex1011,
        HttpStatus.BAD_REQUEST,
      );
    }

    const source = payload as Record<string, unknown>;
    const hasServicesRoot =
      'services' in source &&
      source.services &&
      typeof source.services === 'object' &&
      !Array.isArray(source.services);

    const rawServices = (hasServicesRoot ? source.services : source) as Record<
      string,
      unknown
    >;

    const output: Record<string, ServiceConfigValues> = {};
    for (const [serviceName, rawVariables] of Object.entries(rawServices)) {
      const normalizedService = normalizeServiceName(serviceName);
      assertValidServiceName(normalizedService);

      if (
        !rawVariables ||
        typeof rawVariables !== 'object' ||
        Array.isArray(rawVariables)
      ) {
        throw new FoodaException(
          FoodaExceptionCodes.Ex1012,
          HttpStatus.BAD_REQUEST,
        );
      }

      assertStringValueMap(rawVariables as Record<string, unknown>);
      output[normalizedService] = rawVariables as ServiceConfigValues;
    }

    return output;
  }

  private toSummary(
    service: string,
    variables: ServiceConfigValues,
  ): ConfigSummary {
    return {
      service,
      variables,
      keysCount: Object.keys(variables).length,
    };
  }
}
