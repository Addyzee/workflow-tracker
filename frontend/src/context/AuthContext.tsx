import {
  createContext,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from "react";

import { getSession, login as loginRequest, logout as logoutRequest, signup as signupRequest } from "../api/auth";
import { ApiError, clearCsrfToken, setCsrfToken } from "../api/client";
import type { LoginPayload, SessionPayload, SessionUser, SignupPayload } from "../types/auth";

interface AuthContextValue {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: SessionUser | null;
  refreshSession: () => Promise<void>;
  login: (payload: LoginPayload) => Promise<void>;
  signup: (payload: SignupPayload) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function applySession(session: SessionPayload, setSession: (session: SessionPayload) => void) {
  setCsrfToken(session.csrf_token);
  setSession(session);
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<SessionPayload>({
    authenticated: false,
    csrf_token: "",
    user: null,
  });
  const [isLoading, setIsLoading] = useState(true);

  async function refreshSession() {
    const nextSession = await getSession();
    applySession(nextSession, setSession);
  }

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      setIsLoading(true);
      try {
        const nextSession = await getSession();
        if (active) {
          applySession(nextSession, setSession);
        }
      } catch (error) {
        if (active) {
          clearCsrfToken();
          if (!(error instanceof ApiError)) {
            setSession({ authenticated: false, csrf_token: "", user: null });
          }
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    void bootstrap();

    return () => {
      active = false;
    };
  }, []);

  async function login(payload: LoginPayload) {
    const nextSession = await loginRequest(payload);
    applySession(nextSession, setSession);
  }

  async function signup(payload: SignupPayload) {
    const nextSession = await signupRequest(payload);
    applySession(nextSession, setSession);
  }

  async function logout() {
    const nextSession = await logoutRequest();
    applySession(nextSession, setSession);
  }

  return (
    <AuthContext.Provider
      value={{
        isLoading,
        isAuthenticated: session.authenticated,
        user: session.user,
        refreshSession,
        login,
        signup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider.");
  }
  return context;
}

