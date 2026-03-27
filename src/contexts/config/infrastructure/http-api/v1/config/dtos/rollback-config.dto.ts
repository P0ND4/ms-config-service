import { ApiProperty } from '@nestjs/swagger';

export class RollbackConfigDto {
  @ApiProperty({
    description: 'Identificador del actor que realiza el rollback.',
    example: 'ops@fooda.io',
    required: false,
  })
  actor?: string;

  @ApiProperty({
    description: 'Motivo del rollback para auditoría.',
    example: 'Se detectó regresión en producción tras cambio de timeout',
    required: false,
  })
  reason?: string;
}
