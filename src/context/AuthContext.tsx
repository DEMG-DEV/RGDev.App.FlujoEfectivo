import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthUser, RolUsuario } from '../types';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, pass: string, nombre: string, rol?: RolUsuario) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  checkSession: () => Promise<AuthUser | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_STORAGE_USER_KEY = 'rgdev_flujo_auth_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState<boolean>(true);

  // Obtener CSRF token para Auth.js
  const getCsrfToken = async (): Promise<string> => {
    try {
      const res = await fetch('/api/auth/csrf');
      const data = await res.json();
      return data?.csrfToken || '';
    } catch {
      return '';
    }
  };

  // Verificar la sesión activa en Auth.js (/api/auth/session)
  const checkSession = async (): Promise<AuthUser | null> => {
    try {
      const res = await fetch('/api/auth/session');
      if (!res.ok) {
        setUser(null);
        localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
        return null;
      }
      const data = await res.json();
      if (data && data.user) {
        const authUser: AuthUser = {
          id: data.user.id || '',
          name: data.user.name || '',
          email: data.user.email || '',
          role: (data.user.role as RolUsuario) || 'tesorero'
        };
        setUser(authUser);
        localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(authUser));
        return authUser;
      } else {
        setUser(null);
        localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
        return null;
      }
    } catch (err) {
      console.warn('Error verificando sesión Auth.js:', err);
      return user;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkSession();
  }, []);

  // Iniciar sesión con Auth.js (Credentials Provider)
  const login = async (email: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    setLoading(true);
    try {
      const csrfToken = await getCsrfToken();
      const params = new URLSearchParams({
        csrfToken,
        email: email.trim().toLowerCase(),
        password: pass,
        json: 'true',
        redirect: 'false'
      });

      const res = await fetch('/api/auth/callback/credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params
      });

      if (!res.ok && res.status !== 302) {
        return { success: false, error: 'Credenciales inválidas o usuario inactivo.' };
      }

      // Validar sesión recién emitida
      const sessionUser = await checkSession();
      if (sessionUser) {
        return { success: true };
      } else {
        return { success: false, error: 'Correo o contraseña incorrectos.' };
      }
    } catch (err: any) {
      return { success: false, error: err.message || 'Error de conexión con el servidor.' };
    } finally {
      setLoading(false);
    }
  };

  // Registrar un nuevo usuario
  const register = async (email: string, pass: string, nombre: string, rol: RolUsuario = 'tesorero'): Promise<{ success: boolean; error?: string }> => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass, nombre, rol })
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Error al registrar la cuenta.' };
      }

      // Auto-iniciar sesión una vez registrado
      return await login(email, pass);
    } catch (err: any) {
      return { success: false, error: err.message || 'Error de conexión al registrar.' };
    } finally {
      setLoading(false);
    }
  };

  // Cerrar sesión
  const logout = async (): Promise<void> => {
    try {
      const csrfToken = await getCsrfToken();
      await fetch('/api/auth/signout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ csrfToken, json: 'true' })
      });
    } catch (e) {
      console.warn('Error al desloguear:', e);
    } finally {
      setUser(null);
      localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, checkSession }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser utilizado dentro de un AuthProvider');
  }
  return context;
};
