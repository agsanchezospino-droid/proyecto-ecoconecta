"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ApiError,
  apiFetch,
  getStoredToken,
  setStoredToken,
} from "@/lib/api";
import type { AuthResponse, FlujoResiduo, Usuario } from "@/lib/types";

interface RegisterInput {
  nombre: string;
  email: string;
  password: string;
  rol: "hogar" | "unidad_productiva";
  telefono: string;
  direccion: string;
  barrio_sector?: string;
}

interface AuthContextValue {
  user: Usuario | null;
  loading: boolean;
  isCoordinatorOrAdmin: boolean;
  isAdmin: boolean;
  coordinatorFlow: FlujoResiduo | null;
  login: (email: string, password: string) => Promise<Usuario>;
  demoLogin: (email: string) => Promise<Usuario>;
  register: (payload: RegisterInput) => Promise<Usuario>;
  logout: () => void;
  refreshUser: () => Promise<Usuario | null>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Despierta silenciosamente el backend (Render Free Tier) apenas se abre cualquier página
  useEffect(() => {
    void apiFetch("/health", { auth: false }).catch(() => {
      // Silencioso: solo sirve para iniciar el arranque en frío del backend
    });
  }, []);

  const refreshUser = useCallback(async (): Promise<Usuario | null> => {
    const token = getStoredToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return null;
    }
    try {
      const me = await apiFetch<Usuario>("/auth/me");
      // Evita sobrescribir si el usuario cerró sesión o cambió de cuenta durante la petición
      if (getStoredToken() !== token) {
        return null;
      }
      setUser(me);
      return me;
    } catch (err) {
      // Solo borra la sesión si el token realmente expiró o fue rechazado (401/403),
      // nunca ante un 502/503 temporal mientras Render despierta el servidor.
      const isAuthRejected =
        err instanceof ApiError && (err.status === 401 || err.status === 403);
      if (isAuthRejected && getStoredToken() === token) {
        setStoredToken(null);
        setUser(null);
      }
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiFetch<AuthResponse>("/auth/login", {
      method: "POST",
      auth: false,
      body: JSON.stringify({ email, password }),
    });
    setStoredToken(res.access_token);
    setUser(res.usuario);
    setLoading(false);
    return res.usuario;
  }, []);

  const demoLogin = useCallback(async (email: string) => {
    const res = await apiFetch<AuthResponse>("/auth/demo-login", {
      method: "POST",
      auth: false,
      body: JSON.stringify({ email }),
    });
    setStoredToken(res.access_token);
    setUser(res.usuario);
    setLoading(false);
    return res.usuario;
  }, []);

  const register = useCallback(async (payload: RegisterInput) => {
    const res = await apiFetch<AuthResponse>("/auth/register", {
      method: "POST",
      auth: false,
      body: JSON.stringify(payload),
    });
    setStoredToken(res.access_token);
    setUser(res.usuario);
    setLoading(false);
    return res.usuario;
  }, []);

  const logout = useCallback(() => {
    setStoredToken(null);
    setUser(null);
    setLoading(false);
  }, []);

  const isCoordinatorOrAdmin = Boolean(
    user &&
      (user.rol === "coordinador_huerteros" ||
        user.rol === "coordinador_recicladores" ||
        user.rol === "administrador")
  );

  const isAdmin = Boolean(user && user.rol === "administrador");

  const coordinatorFlow: FlujoResiduo | null =
    user?.rol === "coordinador_huerteros"
      ? "organico"
      : user?.rol === "coordinador_recicladores"
        ? "reciclable"
        : null;

  const value = useMemo(
    () => ({
      user,
      loading,
      isCoordinatorOrAdmin,
      isAdmin,
      coordinatorFlow,
      login,
      demoLogin,
      register,
      logout,
      refreshUser,
    }),
    [
      user,
      loading,
      isCoordinatorOrAdmin,
      isAdmin,
      coordinatorFlow,
      login,
      demoLogin,
      register,
      logout,
      refreshUser,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth debe utilizarse dentro de AuthProvider.");
  }
  return ctx;
}
