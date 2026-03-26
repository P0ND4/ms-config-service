import { ApiResponseBuilder } from 'src/contexts/shared/api.response';

describe('ApiResponseBuilder', () => {
  it('success builds a success payload', () => {
    const payload = ApiResponseBuilder.success({ ok: true }, 'done');

    expect(payload).toEqual({
      success: true,
      data: { ok: true },
      message: 'done',
      statusCode: 200,
    });
  });

  it('error builds an error payload with default status code', () => {
    const payload = ApiResponseBuilder.error('boom');

    expect(payload).toEqual({
      success: false,
      error: 'boom',
      statusCode: 500,
    });
  });

  it('error builds an error payload with provided status code', () => {
    const payload = ApiResponseBuilder.error('not found', 404);

    expect(payload).toEqual({
      success: false,
      error: 'not found',
      statusCode: 404,
    });
  });
});
