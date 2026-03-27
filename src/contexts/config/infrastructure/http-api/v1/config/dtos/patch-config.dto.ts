import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmptyObject, IsObject } from 'class-validator';
import { FoodaExceptionCodes } from 'src/contexts/shared/domain/exceptions/fooda-exception.codes';

export class PatchConfigDto {
  @ApiProperty({
    description:
      'Variables a crear o actualizar. Solo se modifican las keys enviadas.',
    example: {
      JWT_EXPIRES_IN: '2h',
      FEATURE_FLAG_NEW_DASHBOARD: 'true',
    },
    type: 'object',
    additionalProperties: { type: 'string' },
  })
  @IsObject({ message: FoodaExceptionCodes.Ex1013.message })
  @IsNotEmptyObject({}, { message: FoodaExceptionCodes.Ex1015.message })
  variables!: Record<string, string>;

  @ApiProperty({
    description: 'Identificador del actor que realiza el cambio.',
    example: 'ops@fooda.io',
    required: false,
  })
  actor?: string;

  @ApiProperty({
    description: 'Motivo del cambio para auditoría.',
    example: 'Rotación de secretos JWT',
    required: false,
  })
  reason?: string;
}
