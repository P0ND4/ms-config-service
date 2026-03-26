import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { Response } from 'express';
import { FoodaException } from './fooda.exception';
import { FoodaExceptionCodes } from './fooda-exception.codes';

@Catch()
export class FoodaExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof FoodaException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse() as {
        code: string;
        message: string;
      };

      (response as any).errorCode = exceptionResponse.code;
      response.status(status).json(exceptionResponse);
      return;
    }

    if (exception instanceof NotFoundException) {
      const errorInfo = FoodaExceptionCodes.Ex0001;
      (response as any).errorCode = errorInfo.code;
      response.status(HttpStatus.NOT_FOUND).json({
        statusCode: HttpStatus.NOT_FOUND,
        message: errorInfo.message,
        code: errorInfo.code,
        service: errorInfo.service,
      });
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const originalResponse = exception.getResponse() as
        | string
        | { message?: string | string[] };
      const originalMessage =
        typeof originalResponse === 'string'
          ? originalResponse
          : originalResponse.message;

      const message = Array.isArray(originalMessage)
        ? originalMessage.join(', ')
        : (originalMessage ?? FoodaExceptionCodes.Ex0000.message);

      const errorInfo = FoodaExceptionCodes.Ex0000;
      (response as any).errorCode = errorInfo.code;
      response.status(status).json({
        statusCode: status,
        message,
        code: errorInfo.code,
        service: errorInfo.service,
      });
      return;
    }

    const errorInfo = FoodaExceptionCodes.Ex9999;
    (response as any).errorCode = errorInfo.code;
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: errorInfo.message,
      code: errorInfo.code,
      service: errorInfo.service,
    });
  }
}
