import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class HistoryQueryDto {
  @ApiProperty({
    description:
      'Cantidad máxima de registros de auditoría a devolver. Rango permitido: 1-200.',
    example: 30,
    required: false,
    default: 30,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 30;
}
