// src/utils/http-client.ts

interface FetchOptions extends RequestInit {
  baseUrl?: string;
}

export class HttpError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export async function httpGet<T>(url: string, options: FetchOptions = {}): Promise<T> {
  const { baseUrl = '', ...fetchOptions } = options;
  const fullUrl = `${baseUrl}${url}`;

  const response = await fetch(fullUrl, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...fetchOptions.headers,
    },
    ...fetchOptions,
  });

  const body = await response.json() as unknown;

  if (!response.ok) {
    const message =
      typeof body === 'object' && body !== null && 'message' in body
        ? String((body as Record<string, unknown>).message)
        : 'Request failed';
    throw new HttpError(response.status, message);
  }

  return body as T;
}
