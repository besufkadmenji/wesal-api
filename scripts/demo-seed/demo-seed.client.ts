import { readFile, stat } from 'node:fs/promises';
import { basename, extname } from 'node:path';
import type { UploadedAsset } from './demo-seed.types';
import { withTransientRetry } from './demo-seed.utils';

export class HttpStatusError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export class GraphqlOperationError extends Error {
  constructor(
    public readonly operation: string,
    public readonly errors: Array<{ message: string; extensions?: unknown }>,
  ) {
    super(
      `${operation} failed: ${errors.map((error) => error.message).join('; ')}`,
    );
  }
}

export type FetchImplementation = typeof fetch;

function isTransient(error: unknown): boolean {
  return (
    error instanceof TypeError ||
    (error instanceof HttpStatusError &&
      (error.status === 429 || error.status >= 500))
  );
}

export class DemoApiClient {
  constructor(
    private readonly graphqlUrl: string,
    private readonly apiBaseUrl: string,
    private readonly token?: string,
    private readonly fetchImplementation: FetchImplementation = fetch,
  ) {}

  withToken(token: string): DemoApiClient {
    return new DemoApiClient(
      this.graphqlUrl,
      this.apiBaseUrl,
      token,
      this.fetchImplementation,
    );
  }

  async request<TData>(
    operation: string,
    query: string,
    variables: Record<string, unknown> = {},
  ): Promise<TData> {
    return withTransientRetry(async () => {
      const response = await this.fetchImplementation(this.graphqlUrl, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(this.token ? { authorization: `Bearer ${this.token}` } : {}),
        },
        body: JSON.stringify({ operationName: operation, query, variables }),
      });
      if (!response.ok) {
        throw new HttpStatusError(
          response.status,
          `${operation} returned HTTP ${response.status}: ${await response.text()}`,
        );
      }
      const body = (await response.json()) as {
        data?: TData;
        errors?: Array<{ message: string; extensions?: unknown }>;
      };
      if (body.errors?.length) {
        throw new GraphqlOperationError(operation, body.errors);
      }
      if (!body.data) {
        throw new GraphqlOperationError(operation, [
          { message: 'Response did not include data' },
        ]);
      }
      return body.data;
    }, isTransient);
  }

  async upload(filePath: string): Promise<UploadedAsset> {
    const file = await readFile(filePath);
    const fileStat = await stat(filePath);
    const originalFilename = basename(filePath);
    const extension = extname(filePath).toLowerCase();
    const mimeType =
      extension === '.png'
        ? 'image/png'
        : extension === '.mp4'
          ? 'video/mp4'
          : 'image/jpeg';
    const form = new FormData();
    form.append('file', new Blob([file], { type: mimeType }), originalFilename);

    return withTransientRetry(async () => {
      const response = await this.fetchImplementation(
        `${this.apiBaseUrl}/upload`,
        {
          method: 'POST',
          headers: this.token ? { authorization: `Bearer ${this.token}` } : {},
          body: form,
        },
      );
      if (!response.ok) {
        throw new HttpStatusError(
          response.status,
          `Upload ${originalFilename} returned HTTP ${response.status}: ${await response.text()}`,
        );
      }
      const result = (await response.json()) as {
        filename: string;
        url: string;
      };
      return {
        filename: result.filename,
        url: result.url,
        size: fileStat.size,
        originalFilename,
      };
    }, isTransient);
  }

  async isUploadedAssetReachable(asset: UploadedAsset): Promise<boolean> {
    const url = new URL(asset.url, this.apiBaseUrl).toString();
    try {
      const response = await this.fetchImplementation(url, { method: 'HEAD' });
      return response.ok;
    } catch {
      return false;
    }
  }
}
