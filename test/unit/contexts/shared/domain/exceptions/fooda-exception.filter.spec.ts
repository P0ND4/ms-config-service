import {
  ArgumentsHost,
  HttpException,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { FoodaExceptionCodes } from 'src/contexts/shared/domain/exceptions/fooda-exception.codes';
import { FoodaExceptionFilter } from 'src/contexts/shared/domain/exceptions/fooda-exception.filter';
import { FoodaException } from 'src/contexts/shared/domain/exceptions/fooda.exception';

describe('FoodaExceptionFilter', () => {
  const createContext = (response: {
    errorCode?: string;
    status: jest.Mock;
    json: jest.Mock;
  }): ArgumentsHost =>
    ({
      switchToHttp: () => ({
        getResponse: () => response,
      }),
    }) as unknown as ArgumentsHost;

  const createResponse = () => {
    const response = {
      errorCode: undefined as string | undefined,
      status: jest.fn(),
      json: jest.fn(),
    };

    response.status.mockImplementation(() => response);
    return response;
  };

  it('maps FoodaException payload and status', () => {
    const filter = new FoodaExceptionFilter();
    const response = createResponse();

    filter.catch(
      new FoodaException(FoodaExceptionCodes.Ex1002, HttpStatus.NOT_FOUND),
      createContext(response),
    );

    expect(response.errorCode).toBe(FoodaExceptionCodes.Ex1002.code);
    expect(response.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(response.json).toHaveBeenCalledWith({
      statusCode: HttpStatus.NOT_FOUND,
      message: FoodaExceptionCodes.Ex1002.message,
      code: FoodaExceptionCodes.Ex1002.code,
      service: FoodaExceptionCodes.Ex1002.service,
    });
  });

  it('maps NotFoundException to Ex0001', () => {
    const filter = new FoodaExceptionFilter();
    const response = createResponse();

    filter.catch(new NotFoundException(), createContext(response));

    expect(response.errorCode).toBe(FoodaExceptionCodes.Ex0001.code);
    expect(response.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(response.json).toHaveBeenCalledWith({
      statusCode: HttpStatus.NOT_FOUND,
      message: FoodaExceptionCodes.Ex0001.message,
      code: FoodaExceptionCodes.Ex0001.code,
      service: FoodaExceptionCodes.Ex0001.service,
    });
  });

  it('maps HttpException with array message into comma separated text', () => {
    const filter = new FoodaExceptionFilter();
    const response = createResponse();

    filter.catch(
      new HttpException({ message: ['a', 'b'] }, HttpStatus.BAD_REQUEST),
      createContext(response),
    );

    expect(response.errorCode).toBe(FoodaExceptionCodes.Ex0000.code);
    expect(response.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(response.json).toHaveBeenCalledWith({
      statusCode: HttpStatus.BAD_REQUEST,
      message: 'a, b',
      code: FoodaExceptionCodes.Ex0000.code,
      service: FoodaExceptionCodes.Ex0000.service,
    });
  });

  it('maps HttpException string response to Ex0000 envelope', () => {
    const filter = new FoodaExceptionFilter();
    const response = createResponse();

    filter.catch(
      new HttpException('plain-error', HttpStatus.CONFLICT),
      createContext(response),
    );

    expect(response.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(response.json).toHaveBeenCalledWith({
      statusCode: HttpStatus.CONFLICT,
      message: 'plain-error',
      code: FoodaExceptionCodes.Ex0000.code,
      service: FoodaExceptionCodes.Ex0000.service,
    });
  });

  it('maps unknown exceptions to Ex9999', () => {
    const filter = new FoodaExceptionFilter();
    const response = createResponse();

    filter.catch(new Error('unexpected'), createContext(response));

    expect(response.errorCode).toBe(FoodaExceptionCodes.Ex9999.code);
    expect(response.status).toHaveBeenCalledWith(
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
    expect(response.json).toHaveBeenCalledWith({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: FoodaExceptionCodes.Ex9999.message,
      code: FoodaExceptionCodes.Ex9999.code,
      service: FoodaExceptionCodes.Ex9999.service,
    });
  });
});
