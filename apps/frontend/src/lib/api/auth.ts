import { apiClient } from './client';

/**
 * Backend auth endpoints return { token, refreshToken, user }.
 */
interface BackendAuthResponse {
  token: string;
  refreshToken: string;
  user: { id: string; email: string };
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  user: { id: string; email: string };
}

export async function loginUser(data: { email: string; password: string }): Promise<AuthResponse> {
  const res = await apiClient.post<BackendAuthResponse>('/auth/login', data);
  return res.data;
}

export async function registerUser(data: { email: string; password: string }): Promise<AuthResponse> {
  const res = await apiClient.post<BackendAuthResponse>('/auth/register', data);
  return res.data;
}

export async function refreshToken(token: string): Promise<AuthResponse> {
  const res = await apiClient.post<BackendAuthResponse>('/auth/refresh', {
    refreshToken: token,
  });
  return res.data;
}
