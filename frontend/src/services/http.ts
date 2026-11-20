import axios, { AxiosRequestConfig } from 'axios';

const baseURL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '');

if (!baseURL && typeof window !== 'undefined') {
  console.error('NEXT_PUBLIC_API_URL is not set. Frontend cannot reach the API.');
}

export const apiClient = axios.create({
  baseURL: baseURL || 'http://localhost:3001',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
  validateStatus: () => true,
});

export const JSON_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json',
};

export interface ApiResult<T> {
  ok: boolean;
  status: number;
  data: T;
}

export async function apiRequest<T = unknown>(
  url: string,
  init?: RequestInit
): Promise<ApiResult<T>> {
  const method = (init?.method || 'GET').toUpperCase();
  const config: AxiosRequestConfig = {
    url,
    method: method as AxiosRequestConfig['method'],
  };

  if (init?.body) {
    config.data = typeof init.body === 'string' ? JSON.parse(init.body as string) : init.body;
  }

  const response = await apiClient.request<T>(config);
  return { ok: response.status >= 200 && response.status < 300, status: response.status, data: response.data };
}
