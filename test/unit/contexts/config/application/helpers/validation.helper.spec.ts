import { HttpStatus } from '@nestjs/common';
import {
  assertStringValueMap,
  assertValidServiceName,
  assertValidVariableKey,
  normalizeServiceName,
} from 'src/contexts/config/application/config/helpers/validation.helper';
import { FoodaException } from 'src/contexts/shared/domain/exceptions/config.exception';
import { FoodaExceptionCodes } from 'src/contexts/shared/domain/exceptions/config-exception.codes';

describe('validation.helper', () => {
  it('normalizeServiceName trims and lowercases', () => {
    expect(normalizeServiceName('  Identity-Service  ')).toBe(
      'identity-service',
    );
  });

  it('assertValidServiceName accepts kebab-case', () => {
    expect(() => assertValidServiceName('identity-service')).not.toThrow();
  });

  it('assertValidServiceName rejects invalid service name', () => {
    expect(() => assertValidServiceName('Identity_Service')).toThrow(
      FoodaException,
    );

    try {
      assertValidServiceName('Identity_Service');
    } catch (error) {
      const exception = error as FoodaException;
      expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
      expect((exception.getResponse() as { code: string }).code).toBe(
        FoodaExceptionCodes.Ex1000.code,
      );
    }
  });

  it('assertValidVariableKey accepts upper snake case', () => {
    expect(() => assertValidVariableKey('JWT_SECRET')).not.toThrow();
  });

  it('assertValidVariableKey rejects invalid key', () => {
    expect(() => assertValidVariableKey('jwtSecret')).toThrow(FoodaException);

    try {
      assertValidVariableKey('jwtSecret');
    } catch (error) {
      const exception = error as FoodaException;
      expect((exception.getResponse() as { code: string }).code).toBe(
        FoodaExceptionCodes.Ex1001.code,
      );
    }
  });

  it('assertStringValueMap accepts valid string map', () => {
    expect(() =>
      assertStringValueMap({
        JWT_SECRET: 'abc',
        NODE_ENV: 'production',
      }),
    ).not.toThrow();
  });

  it('assertStringValueMap rejects non-string value', () => {
    expect(() =>
      assertStringValueMap({
        JWT_SECRET: 123,
      }),
    ).toThrow(FoodaException);

    try {
      assertStringValueMap({ JWT_SECRET: 123 });
    } catch (error) {
      const exception = error as FoodaException;
      expect((exception.getResponse() as { code: string }).code).toBe(
        FoodaExceptionCodes.Ex1004.code,
      );
    }
  });
});
