import { HttpStatus } from '@nestjs/common';
import { FoodaExceptionCodes } from 'src/contexts/shared/domain/exceptions/config-exception.codes';
import { FoodaException } from 'src/contexts/shared/domain/exceptions/config.exception';

describe('FoodaException', () => {
  it('builds expected response payload and status', () => {
    const exception = new FoodaException(
      FoodaExceptionCodes.Ex1002,
      HttpStatus.NOT_FOUND,
    );

    expect(exception.code).toBe(FoodaExceptionCodes.Ex1002.code);
    expect(exception.getStatus()).toBe(HttpStatus.NOT_FOUND);
    expect(exception.getResponse()).toEqual({
      statusCode: HttpStatus.NOT_FOUND,
      message: FoodaExceptionCodes.Ex1002.message,
      code: FoodaExceptionCodes.Ex1002.code,
      service: FoodaExceptionCodes.Ex1002.service,
    });
  });
});
