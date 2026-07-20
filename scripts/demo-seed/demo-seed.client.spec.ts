import { join } from 'node:path';
import { DemoApiClient, GraphqlOperationError } from './demo-seed.client';

describe('DemoApiClient', () => {
  const graphqlUrl = 'https://wesal-api.testing3000.cloud/graphql';
  const apiBaseUrl = 'https://wesal-api.testing3000.cloud';

  it('sends GraphQL operations with bearer authentication', async () => {
    const fetchMock = jest.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ data: { me: { id: '1' } } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    const client = new DemoApiClient(
      graphqlUrl,
      apiBaseUrl,
      undefined,
      fetchMock,
    ).withToken('token');

    await expect(
      client.request('Me', 'query Me { me { id } }'),
    ).resolves.toEqual({
      me: { id: '1' },
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [requestUrl, requestInit] = fetchMock.mock.calls[0] as Parameters<
      typeof fetch
    >;
    expect(requestUrl).toBe(graphqlUrl);
    expect(requestInit?.method).toBe('POST');
    expect((requestInit?.headers as Record<string, string>).authorization).toBe(
      'Bearer token',
    );
  });

  it('does not retry GraphQL application errors', async () => {
    const fetchMock = jest.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ errors: [{ message: 'invalid input' }] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    const client = new DemoApiClient(
      graphqlUrl,
      apiBaseUrl,
      undefined,
      fetchMock,
    );
    await expect(
      client.request('Register', 'mutation Register { x }'),
    ).rejects.toBeInstanceOf(GraphqlOperationError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('uploads an actual multipart image and retains local media metadata', async () => {
    const fetchMock = jest
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(
          JSON.stringify({ filename: 'remote.jpg', url: '/files/remote.jpg' }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      );
    const client = new DemoApiClient(
      graphqlUrl,
      apiBaseUrl,
      'provider-token',
      fetchMock,
    );
    const filePath = join(
      process.cwd(),
      'scripts/demo-seed/assets/categories/plumbing/01.jpg',
    );

    const result = await client.upload(filePath);
    expect(result.filename).toBe('remote.jpg');
    expect(result.originalFilename).toBe('01.jpg');
    expect(result.size).toBeGreaterThan(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [requestUrl, requestInit] = fetchMock.mock.calls[0] as Parameters<
      typeof fetch
    >;
    expect(requestUrl).toBe(`${apiBaseUrl}/upload`);
    expect(requestInit?.method).toBe('POST');
    expect(requestInit?.headers).toEqual({
      authorization: 'Bearer provider-token',
    });
    expect(requestInit?.body).toBeInstanceOf(FormData);
  });
});
