import { createContext, useContext, ReactNode, useEffect, useState } from "react";
import { fetchWithAuth } from "@/lib/webhookAuth";

// Para fluxo Web (server-side), não usamos MSAL no browser

interface AuthContextType {
  isAuthenticated: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  username: string | null;
  user: { name?: string | null; email?: string | null; photoUrl?: string | null } | null;
  isLoading: boolean;
  roles: { admin: boolean; visualizador: boolean; controladoria: boolean };
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderInnerProps {
  children: ReactNode;
}

const AuthProviderInner = ({ children }: AuthProviderInnerProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<{ name?: string | null; email?: string | null; photoUrl?: string | null } | null>(null);
  const [roles, setRoles] = useState<{ admin: boolean; visualizador: boolean; controladoria: boolean }>({
    admin: false,
    visualizador: false,
    controladoria: false,
  });

  const fetchMe = async () => {
    try {
      const res = await fetch("/auth/me", { credentials: "include" });
      const data = await res.json();
      if (data.authenticated) {
        setUser({ name: data.user?.name || null, email: data.user?.email || null, photoUrl: data.user?.photoUrl || null });
        // Buscar permissões e registrar/atualizar usuário em paralelo
        const nome = data.user?.name || null;
        const email = data.user?.email || null;
        await Promise.all([
          fetchPermissions(nome, email),
          registerOrUpdateUser(nome, email)
        ]);
      } else {
        setUser(null);
        setRoles({ admin: false, visualizador: false, controladoria: false });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPermissions = async (nome: string | null, email: string | null) => {
    try {
      const url = import.meta.env.VITE_COLETAR_USUARIOS_WEBHOOK_URL as string | undefined;
      if (!email || !url) {
        // Sem email ou URL configurada, manter permissões padrão
        setRoles({ admin: false, visualizador: false, controladoria: false });
        return;
      }

      const response = await fetchWithAuth(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ nome, email }),
      });

      if (!response.ok) {
        // Falha ao coletar permissões; manter padrão seguro
        setRoles({ admin: false, visualizador: false, controladoria: false });
        return;
      }

      const result = await response.json();
      setRoles({
        admin: !!result?.admin,
        visualizador: !!result?.visualizador,
        controladoria: !!result?.controladoria,
      });
    } catch {
      setRoles({ admin: false, visualizador: false, controladoria: false });
    }
  };

  const registerOrUpdateUser = async (nome: string | null, email: string | null) => {
    try {
      const url = import.meta.env.VITE_CADASTRAR_USUARIO_WEBHOOK_URL as string | undefined;
      if (!url || !email) return;
      await fetchWithAuth(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, email, visualizador: true }),
      });
    } catch {
      // Ignorar erros de cadastro para não bloquear o fluxo
    }
  };

  useEffect(() => {
    fetchMe();
  }, []);

  const login = async () => {
    const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    const url = `/auth/azure/login?returnUrl=${encodeURIComponent(current)}`;
    try {
      // Se estiver dentro de iframe/modal, garantir navegação no topo
      if (window.top && window.top !== window.self) {
        // Tenta usar target _top para forçar navegação no contexto principal
        const a = document.createElement('a');
        a.href = url;
        a.target = '_top';
        a.rel = 'opener';
        document.body.appendChild(a);
        a.click();
        a.remove();
        return;
      }
      // Navegação normal
      window.location.assign(url);
    } catch {
      // Fallback final
      window.location.href = url;
    }
  };

  const logout = async () => {
    setIsLoading(true);
    await fetch("/auth/logout", { method: "POST", credentials: "include" });
    setUser(null);
    setIsLoading(false);
  };

  const isAuthenticated = !!user;
  const username = user?.name || null;

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      login,
      logout,
      username,
      user,
      isLoading,
      roles
    }}>
      {children}
    </AuthContext.Provider>
  );
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  return (
    <AuthProviderInner>
      {children}
    </AuthProviderInner>
  );
};