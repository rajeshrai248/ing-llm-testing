// API utility functions with proper error handling and CORS support

export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
}

export const makeApiRequest = async <T>(
  url: string,
  options: ApiRequestOptions = {}
): Promise<T> => {
  const {
    method = 'GET',
    headers = {},
    body,
    timeout = 120000  // Increased from 30000 to 120 seconds (2 minutes)
  } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
      // Do NOT include credentials when server uses wildcard CORS (*)
      credentials: 'omit',
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `API Error (${response.status}): ${errorText || response.statusText}`
      );
    }

    return await response.json() as T;
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw error;
    }
    throw new Error('Unknown error occurred');
  } finally {
    clearTimeout(timeoutId);
  }
};
