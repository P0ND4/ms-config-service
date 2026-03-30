import { FoodaException } from 'src/contexts/shared/domain/exceptions/config.exception';
import { FoodaExceptionCodes } from 'src/contexts/shared/domain/exceptions/config-exception.codes';
import { HttpStatus } from '@nestjs/common';

const SERVICE_KEY_REGEX = /^[a-z][a-z0-9-]{1,49}$/;
const VARIABLE_KEY_REGEX = /^[A-Z][A-Z0-9_]{1,99}$/;

export const normalizeServiceName = (value: string): string =>
  value.trim().toLowerCase();

export const assertValidServiceName = (value: string): void => {
  if (!SERVICE_KEY_REGEX.test(value)) {
    throw new FoodaException(
      FoodaExceptionCodes.Ex1000,
      HttpStatus.BAD_REQUEST,
    );
  }
};

export const assertValidVariableKey = (value: string): void => {
  if (!VARIABLE_KEY_REGEX.test(value)) {
    throw new FoodaException(
      FoodaExceptionCodes.Ex1001,
      HttpStatus.BAD_REQUEST,
    );
  }
};

export const assertStringValueMap = (values: Record<string, unknown>): void => {
  for (const [key, value] of Object.entries(values)) {
    assertValidVariableKey(key);

    if (typeof value !== 'string') {
      throw new FoodaException(
        FoodaExceptionCodes.Ex1004,
        HttpStatus.BAD_REQUEST,
      );
    }
  }
};
