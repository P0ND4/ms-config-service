import { ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { IsString } from 'class-validator';
import { CustomValidationPipe } from 'src/contexts/shared/domain/exceptions/custom-validation.pipe';
import { FoodaException } from 'src/contexts/shared/domain/exceptions/fooda.exception';
import { FoodaExceptionCodes } from 'src/contexts/shared/domain/exceptions/fooda-exception.codes';
import { CreateConfigDto } from 'src/contexts/config/infrastructure/http-api/v1/config/dtos/create-config.dto';

class CodeByKeyDto {
  @IsString({ message: 'Ex1013' })
  value!: string;
}

class UnknownMessageDto {
  @IsString({ message: 'totally custom validation message' })
  value!: string;
}

describe('CustomValidationPipe', () => {
  const metadata = (metatype: Function): ArgumentMetadata => ({
    type: 'body',
    metatype: metatype as any,
    data: '',
  });

  it('transforms valid payload and strips unknown fields', async () => {
    const pipe = new CustomValidationPipe();

    const payload = {
      variables: {
        PORT: '3001',
      },
      actor: 'ops',
      extra: 'ignore-me',
    };

    const result = await pipe.transform(payload, metadata(CreateConfigDto));

    expect(result).toBeInstanceOf(CreateConfigDto);
    expect(result).toMatchObject({
      variables: { PORT: '3001' },
    });
    expect((result as Record<string, unknown>).actor).toBeUndefined();
  });

  it('returns FoodaException when message matches FoodaExceptionCodes message', async () => {
    const pipe = new CustomValidationPipe();

    await expect(
      pipe.transform({ variables: {} }, metadata(CreateConfigDto)),
    ).rejects.toMatchObject({
      response: {
        code: FoodaExceptionCodes.Ex1014.code,
      },
      status: 400,
    });
  });

  it('returns FoodaException when message matches code key', async () => {
    const pipe = new CustomValidationPipe();

    await expect(
      pipe.transform({ value: 123 }, metadata(CodeByKeyDto)),
    ).rejects.toMatchObject({
      response: {
        code: FoodaExceptionCodes.Ex1013.code,
      },
      status: 400,
    });
  });

  it('returns BadRequestException for unknown custom messages', async () => {
    const pipe = new CustomValidationPipe();

    await expect(
      pipe.transform({ value: 123 }, metadata(UnknownMessageDto)),
    ).rejects.toEqual(
      new BadRequestException(['totally custom validation message']),
    );
  });

  it('throws FoodaException type for known codes', async () => {
    const pipe = new CustomValidationPipe();

    await expect(
      pipe.transform({ variables: {} }, metadata(CreateConfigDto)),
    ).rejects.toBeInstanceOf(FoodaException);
  });
});
