import { ExecutionContext } from '@nestjs/common';
import { of, lastValueFrom } from 'rxjs';
import { ApiResponseInterceptor } from 'src/contexts/shared/interceptors/api.response.interceptor';

describe('ApiResponseInterceptor', () => {
  const createContext = (
    response: Partial<{ statusCode: number; statusMessage: string }>,
  ): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getResponse: () => response,
      }),
    }) as unknown as ExecutionContext;

  it('wraps response with explicit status message', async () => {
    const interceptor = new ApiResponseInterceptor<{ a: number }>();
    const context = createContext({
      statusCode: 201,
      statusMessage: 'Created',
    });

    const stream = interceptor.intercept(context, {
      handle: () => of({ a: 1 }),
    });

    await expect(lastValueFrom(stream)).resolves.toEqual({
      success: true,
      data: { a: 1 },
      message: 'Created',
      statusCode: 201,
    });
  });

  it('uses success default message for 2xx without status message', async () => {
    const interceptor = new ApiResponseInterceptor<string>();
    const context = createContext({ statusCode: 200 });

    const stream = interceptor.intercept(context, {
      handle: () => of('ok'),
    });

    await expect(lastValueFrom(stream)).resolves.toEqual({
      success: true,
      data: 'ok',
      message: 'Request successful',
      statusCode: 200,
    });
  });

  it('uses failure default message for non-2xx', async () => {
    const interceptor = new ApiResponseInterceptor<string>();
    const context = createContext({ statusCode: 500 });

    const stream = interceptor.intercept(context, {
      handle: () => of('error-payload'),
    });

    await expect(lastValueFrom(stream)).resolves.toEqual({
      success: true,
      data: 'error-payload',
      message: 'Request failed',
      statusCode: 500,
    });
  });
});
