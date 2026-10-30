import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { apiFetch } from '../api/client';
import type { Guild, SwarmAuthStatus, User } from '../types';

interface AuthContextType {
  user: User | null;
  guilds: Guild[];
  selectedGuild: Guild | null;
  loading: boolean;
  isGlobalScope: boolean;
  canAccessGlobal: boolean;
  swarmAuth: SwarmAuthStatus | null;
  setIsGlobalScope: (isGlobal: boolean) => void;
  setSelectedGuild: (guild: Guild | null) => void;
  logout: () => Promise<void>;
  refetchGuilds: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [selectedGuild, setSelectedGuild] = useState<Guild | null>(null);
  const [isGlobalScope, setIsGlobalScopeState] = useState<boolean>(() => {
    return window.location.pathname.startsWith('/dashboard/global');
  });
  const [swarmAuth, setSwarmAuth] = useState<SwarmAuthStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
    try {
      const data = await apiFetch<{ user: User }>('/api/auth/me');
      setUser(data.user);
      return data.user;
    } catch {
      setUser(null);
      return null;
    }
  };

  const fetchSwarmAuth = async () => {
    try {
      const data = await apiFetch<SwarmAuthStatus>('/api/swarm/auth-status');
      setSwarmAuth(data);
      return data;
    } catch {
      setSwarmAuth(null);
      return null;
    }
  };

  const fetchGuilds = async () => {
    try {
      const data = await apiFetch<{ guilds: Guild[] }>('/api/guilds');
      setGuilds(data.guilds);

      // Ưu tiên chọn guild theo thứ tự: URL hiện tại -> lastActiveGuildId trong localStorage -> guild đã chọn trước đó -> guild đầu tiên
      const urlMatch = window.location.pathname.match(/\/dashboard\/guilds\/([^/]+)/);
      const urlGuildId = urlMatch ? urlMatch[1] : null;
      const lastActiveId = localStorage.getItem('lora_last_active_guild');

      setSelectedGuild((prev) => {
        if (urlGuildId) {
          const matchFromUrl = data.guilds.find((g) => g.id === urlGuildId);
          if (matchFromUrl) {
            localStorage.setItem('lora_last_active_guild', matchFromUrl.id);
            return matchFromUrl;
          }
        }

        if (lastActiveId) {
          const matchFromStorage = data.guilds.find((g) => g.id === lastActiveId);
          if (matchFromStorage) {
            return matchFromStorage;
          }
        }

        if (prev && data.guilds.some((g) => g.id === prev.id)) {
          return prev;
        }

        const fallbackGuild = data.guilds[0] || null;
        if (fallbackGuild) {
          localStorage.setItem('lora_last_active_guild', fallbackGuild.id);
        }
        return fallbackGuild;
      });
    } catch {
      setGuilds([]);
      setSelectedGuild(null);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const currentUser = await fetchUser();
      if (currentUser) {
        await Promise.all([fetchGuilds(), fetchSwarmAuth()]);
      }
      setLoading(false);
    };
    void init();
  }, []);

  const setIsGlobalScope = (isGlobal: boolean) => {
    setIsGlobalScopeState(isGlobal);
  };

  const handleSetSelectedGuild = (guild: Guild | null) => {
    setSelectedGuild(guild);
    if (guild) {
      setIsGlobalScopeState(false);
      localStorage.setItem('lora_last_active_guild', guild.id);
    }
  };

  const logout = async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } finally {
      setUser(null);
      setGuilds([]);
      setSelectedGuild(null);
      setIsGlobalScopeState(false);
      setSwarmAuth(null);
      localStorage.removeItem('lora_last_active_guild');
      window.location.href = '/login';
    }
  };

  const canAccessGlobal = Boolean(user?.isBotOwner || swarmAuth?.isOperator);

  return (
    <AuthContext.Provider
      value={{
        user,
        guilds,
        selectedGuild,
        loading,
        isGlobalScope,
        canAccessGlobal,
        swarmAuth,
        setIsGlobalScope,
        setSelectedGuild: handleSetSelectedGuild,
        logout,
        refetchGuilds: fetchGuilds,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
