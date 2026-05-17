import { apiClient } from './client';

interface AuthResponse {
  token: string;
  user: { id: string; email: string };
}

export async function loginUser(data: { email: string; password: string }): Promise<AuthResponse> {
  const res = await apiClient.post<AuthResponse>('/auth/login', data);
  return res.data;
}

export async function registerUser(data: { email: string; password: string }): Promise<AuthResponse> {
  const res = await apiClient.post<AuthResponse>('/auth/register', data);
  return res.data;
}

export async function refreshToken(): Promise<{ token: string }> {
  const res = await apiClient.post<{ token: string }>('/auth/refresh');
  return res.data;
}
