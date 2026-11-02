export class ApiError extends Error {
  public statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
  }
}

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);

  // Chỉ thiết lập 'Content-Type: application/json' khi request thực sự có payload body
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(endpoint, {
    ...options,
    credentials: 'include',
    headers,
  });

  if (!res.ok) {
    let errorMessage = `Request failed with status ${res.status}`;
    try {
      const errorData = await res.json();
      errorMessage = errorData.message || errorData.error || errorMessage;
    } catch {
      // ignore
    }
    throw new ApiError(errorMessage, res.status);
  }

  if (res.status === 204) {
    return {} as T;
  }

  const text = await res.text();
  if (!text) {
    return {} as T;
  }

  return JSON.parse(text) as T;
}

import type {
  CreateLandmineModuleInput,
  EditLandmineModuleInput,
  LandmineConfigResponse,
  LandmineLeaderboardResponse,
  LandmineSortType,
} from '../types';

export const landmineApi = {
  getConfig: (guildId: string) =>
    apiFetch<LandmineConfigResponse>(`/api/guilds/${guildId}/landmine/config`),

  updateConfig: (guildId: string, forcedLocale: 'auto' | 'vi' | 'en') =>
    apiFetch<{ success: boolean; forcedLocale: string }>(
      `/api/guilds/${guildId}/landmine/config`,
      {
        method: 'PUT',
        body: JSON.stringify({ forcedLocale }),
      },
    ),

  createModule: (guildId: string, input: CreateLandmineModuleInput) =>
    apiFetch<{ success: boolean; moduleKey: string }>(
      `/api/guilds/${guildId}/landmine/modules`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
    ),

  updateModule: (
    guildId: string,
    moduleKey: string,
    input: EditLandmineModuleInput,
  ) =>
    apiFetch<{ success: boolean; moduleKey: string }>(
      `/api/guilds/${guildId}/landmine/modules/${moduleKey}`,
      {
        method: 'PUT',
        body: JSON.stringify(input),
      },
    ),

  toggleModule: (guildId: string, moduleKey: string, isEnabled: boolean) =>
    apiFetch<{ success: boolean; moduleName: string; isEnabled: boolean }>(
      `/api/guilds/${guildId}/landmine/modules/${moduleKey}/toggle`,
      {
        method: 'POST',
        body: JSON.stringify({ isEnabled }),
      },
    ),

  deleteModule: (guildId: string, moduleKey: string) =>
    apiFetch<{ success: boolean; moduleName: string }>(
      `/api/guilds/${guildId}/landmine/modules/${moduleKey}`,
      {
        method: 'DELETE',
      },
    ),

  getLeaderboard: (
    guildId: string,
    params?: { module?: string; sort?: LandmineSortType; limit?: number },
  ) => {
    const searchParams = new URLSearchParams();
    if (params?.module) searchParams.set('module', params.module);
    if (params?.sort) searchParams.set('sort', params.sort);
    if (params?.limit) searchParams.set('limit', String(params.limit));
    const query = searchParams.toString();
    return apiFetch<LandmineLeaderboardResponse>(
      `/api/guilds/${guildId}/landmine/leaderboard${query ? `?${query}` : ''}`,
    );
  },

  resetStats: (guildId: string, moduleKey: string = 'all') =>
    apiFetch<{ success: boolean; target: string }>(
      `/api/guilds/${guildId}/landmine/reset`,
      {
        method: 'POST',
        body: JSON.stringify({ moduleKey }),
      },
    ),
};

