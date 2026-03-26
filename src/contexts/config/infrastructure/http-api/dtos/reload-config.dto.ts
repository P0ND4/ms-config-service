import { ApiProperty } from '@nestjs/swagger';

export class ReloadConfigDto {
  @ApiProperty({
    description: 'Identificador del actor que solicita recarga.',
    example: 'deploy-bot',
    required: false,
  })
  actor?: string;

  @ApiProperty({
    description: 'Motivo de la recarga de configuración.',
    example: 'Sincronización manual luego de actualizar archivo semilla',
    required: false,
  })
  reason?: string;
}
