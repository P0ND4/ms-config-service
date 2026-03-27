import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmptyObject, IsObject } from 'class-validator';
import { FoodaExceptionCodes } from 'src/contexts/shared/domain/exceptions/fooda-exception.codes';

export class CreateConfigDto {
  @ApiProperty({
    description:
      'Mapa de variables de entorno del microservicio. La key debe usar formato UPPER_SNAKE_CASE.',
    example: {
      NODE_ENV: 'development',
      PORT: '3100',
      JWT_SECRET: 'very-secure-secret',
    },
    type: 'object',
    additionalProperties: { type: 'string' },
  })
  @IsObject({ message: FoodaExceptionCodes.Ex1013.message })
  @IsNotEmptyObject({}, { message: FoodaExceptionCodes.Ex1014.message })
  variables!: Record<string, string>;

  @ApiProperty({
    description: 'Identificador del actor que realiza el cambio.',
    example: 'ops@fooda.io',
    required: false,
  })
  actor?: string;

  @ApiProperty({
    description: 'Motivo del cambio para auditoría.',
    example: 'Alta inicial de configuración para despliegue QA',
    required: false,
  })
  reason?: string;
}
