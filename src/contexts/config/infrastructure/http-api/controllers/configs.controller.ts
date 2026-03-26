import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBody,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { IConfigUseCase } from 'src/contexts/config/domain/use-cases/config-use-case.interface';
import { CreateConfigDto } from '../dtos/create-config.dto';
import { PatchConfigDto } from '../dtos/patch-config.dto';
import { HistoryQueryDto } from '../dtos/history-query.dto';
import { ReloadConfigDto } from '../dtos/reload-config.dto';
import { RollbackConfigDto } from '../dtos/rollback-config.dto';

@ApiTags('Configs')
@Controller('configs')
export class ConfigsController {
  constructor(private readonly configUseCase: IConfigUseCase) {}

  @Get()
  @ApiOperation({
    summary: 'Listar microservicios configurados',
    description:
      'Obtiene todos los microservicios con variables activas en Redis y su conteo de claves.',
  })
  @ApiOkResponse({
    description: 'Listado de microservicios configurados.',
    schema: {
      example: [
        {
          service: 'identity-service',
          variables: {
            NODE_ENV: 'production',
            PORT: '3001',
            JWT_EXPIRES_IN: '1h',
          },
          keysCount: 3,
        },
        {
          service: 'notification-service',
          variables: {
            NODE_ENV: 'production',
            PORT: '3005',
          },
          keysCount: 2,
        },
      ],
    },
  })
  async getAllServices() {
    return await this.configUseCase.listConfiguredServices();
  }

  @Get(':service/history')
  @ApiOperation({
    summary: 'Consultar historial de cambios',
    description:
      'Devuelve la auditoría de cambios por microservicio, incluyendo actor, motivo, snapshot antes/después y diffs.',
  })
  @ApiParam({
    name: 'service',
    description:
      'Nombre del microservicio en formato kebab-case (ejemplo: identity-service).',
  })
  @ApiOkResponse({
    description: 'Historial de cambios obtenido correctamente.',
    schema: {
      example: {
        service: 'identity-service',
        items: [
          {
            id: '6ab9f9bd-cba2-41b7-93f7-1af9a0f17e90',
            service: 'identity-service',
            action: 'PATCH',
            actor: 'ops@fooda.io',
            reason: 'Rotación de secreto JWT',
            changes: [
              {
                key: 'JWT_SECRET',
                previousValue: 'old-secret',
                nextValue: 'new-secret',
              },
            ],
            before: {
              JWT_SECRET: 'old-secret',
            },
            after: {
              JWT_SECRET: 'new-secret',
            },
            createdAt: '2026-03-26T14:05:11.342Z',
          },
        ],
      },
    },
  })
  @ApiNotFoundResponse({ description: 'Microservicio no encontrado.' })
  async getServiceHistory(
    @Param('service') service: string,
    @Query() query: HistoryQueryDto,
  ) {
    return await this.configUseCase.getServiceHistory(service, query.limit);
  }

  @Post(':service/rollback')
  @ApiOperation({
    summary: 'Revertir al cambio anterior',
    description:
      'Restaura el snapshot previo al último cambio registrado para el microservicio y emite evento de rollback por Pub/Sub.',
  })
  @ApiParam({
    name: 'service',
    description:
      'Nombre del microservicio en formato kebab-case (ejemplo: notification-service).',
  })
  @ApiOkResponse({ description: 'Rollback ejecutado correctamente.' })
  @ApiConflictResponse({ description: 'No existe historial para rollback.' })
  @ApiNotFoundResponse({ description: 'Microservicio no encontrado.' })
  @ApiBody({
    type: RollbackConfigDto,
    examples: {
      rollbackOperativo: {
        summary: 'Rollback con actor y motivo',
        value: {
          actor: 'ops@fooda.io',
          reason: 'Timeout regresó a valor estable',
        },
      },
    },
  })
  async rollbackService(
    @Param('service') service: string,
    @Body() body: RollbackConfigDto,
  ) {
    return await this.configUseCase.rollbackServiceConfiguration({
      service,
      actor: body.actor,
      reason: body.reason,
    });
  }

  @Post('reload')
  @ApiOperation({
    summary: 'Recargar configuración semilla en Redis',
    description:
      'Lee el archivo semilla inicial (CONFIG_SEED_FILE_PATH) y reemplaza la configuración activa en Redis.',
  })
  @ApiOkResponse({
    description: 'Recarga de configuración ejecutada correctamente.',
  })
  @ApiBadRequestResponse({ description: 'Archivo semilla inválido.' })
  @ApiNotFoundResponse({ description: 'Archivo semilla no encontrado.' })
  @ApiBody({
    type: ReloadConfigDto,
    examples: {
      recargaManual: {
        summary: 'Recarga manual',
        value: {
          actor: 'deploy-bot',
          reason: 'Sincronización de variables iniciales',
        },
      },
    },
  })
  async reloadConfiguration(@Body() body: ReloadConfigDto) {
    return await this.configUseCase.reloadInitialConfiguration({
      actor: body.actor,
      reason: body.reason,
    });
  }

  @Get(':service')
  @ApiOperation({
    summary: 'Obtener variables de un microservicio',
    description:
      'Retorna el mapa completo de variables para un microservicio específico.',
  })
  @ApiParam({
    name: 'service',
    description:
      'Nombre del microservicio en formato kebab-case (ejemplo: cache-service).',
  })
  @ApiOkResponse({
    description: 'Variables de configuración obtenidas correctamente.',
    schema: {
      example: {
        service: 'cache-service',
        variables: {
          NODE_ENV: 'production',
          PORT: '3002',
          REDIS_HOST: 'redis.local',
          REDIS_PORT: '6379',
        },
        keysCount: 4,
      },
    },
  })
  @ApiNotFoundResponse({ description: 'Microservicio no encontrado.' })
  async getService(@Param('service') service: string) {
    return await this.configUseCase.getServiceConfiguration(service);
  }

  @Post(':service')
  @ApiOperation({
    summary: 'Registrar configuración de microservicio',
    description:
      'Crea por primera vez la configuración para un microservicio. Falla si el servicio ya existe.',
  })
  @ApiCreatedResponse({
    description: 'Configuración registrada correctamente.',
  })
  @ApiConflictResponse({
    description: 'El microservicio ya tiene configuración.',
  })
  @ApiBadRequestResponse({ description: 'Payload de configuración inválido.' })
  @ApiBody({
    type: CreateConfigDto,
    examples: {
      altaInicial: {
        summary: 'Configuración inicial completa',
        value: {
          variables: {
            NODE_ENV: 'development',
            PORT: '3001',
            REDIS_HOST: 'localhost',
            REDIS_PORT: '6379',
          },
          actor: 'ops@fooda.io',
          reason: 'Alta inicial para ambiente QA',
        },
      },
    },
  })
  async createService(
    @Param('service') service: string,
    @Body() body: CreateConfigDto,
  ) {
    return await this.configUseCase.createServiceConfiguration({
      service,
      variables: body.variables,
      actor: body.actor,
      reason: body.reason,
    });
  }

  @Patch(':service')
  @ApiOperation({
    summary: 'Actualizar variables y notificar por Pub/Sub',
    description:
      'Actualiza variables de configuración existentes y publica evento de sincronización para consumidores.',
  })
  @ApiOkResponse({ description: 'Configuración actualizada correctamente.' })
  @ApiBadRequestResponse({ description: 'Payload de actualización inválido.' })
  @ApiNotFoundResponse({ description: 'Microservicio no encontrado.' })
  @ApiBody({
    type: PatchConfigDto,
    examples: {
      actualizacionParcial: {
        summary: 'Actualizar solo algunas keys',
        value: {
          variables: {
            JWT_EXPIRES_IN: '2h',
            FEATURE_FLAG_NEW_DASHBOARD: 'true',
          },
          actor: 'ops@fooda.io',
          reason: 'Ajuste de políticas de sesión',
        },
      },
    },
  })
  async patchService(
    @Param('service') service: string,
    @Body() body: PatchConfigDto,
  ) {
    return await this.configUseCase.patchServiceConfiguration({
      service,
      variables: body.variables,
      actor: body.actor,
      reason: body.reason,
    });
  }

  @Delete(':service/:key')
  @ApiOperation({
    summary: 'Eliminar variable específica',
    description:
      'Elimina una key puntual del microservicio y deja trazabilidad en auditoría.',
  })
  @ApiParam({
    name: 'service',
    description:
      'Nombre del microservicio en formato kebab-case (ejemplo: monitoring-service).',
  })
  @ApiParam({
    name: 'key',
    description: 'Nombre de variable en formato UPPER_SNAKE_CASE.',
  })
  @ApiOkResponse({ description: 'Variable eliminada correctamente.' })
  @ApiNotFoundResponse({ description: 'Servicio o variable no encontrada.' })
  async deleteServiceKey(
    @Param('service') service: string,
    @Param('key') key: string,
  ) {
    return await this.configUseCase.deleteServiceVariable({ service, key });
  }
}
