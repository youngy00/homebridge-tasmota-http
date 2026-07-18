declare global {
  interface Window {
    homebridge: {
      request<T = unknown>(
        path: string,
        body?: unknown,
      ): Promise<T>;
    };
  }
}

export function request<T>(
  path: string,
  body?: unknown,
): Promise<T> {
  return window.homebridge.request<T>(
    path,
    body,
  );
}