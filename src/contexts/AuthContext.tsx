import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { authService, LoginRequest, userService, setActiveUserEmail, setFlyAskyJwt } from '../services/Api';

export interface User {
  id?: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  status: 'active' | 'inactive';
  avatar?: string;
  createdAt: string;
  lastLogin: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<any>;
  logout: () => void;
  isAdmin: boolean;
  loading: boolean;
  verifyFlyAskyOtp: (challengeId: string, email: string, otp: string) => Promise<any>;
  resendFlyAskyOtp: (challengeId: string) => Promise<any>;
  resetMfa: (id: string) => Promise<boolean>;
  inactivityMessage: string | null;
  clearInactivityMessage: () => void;
  inactivityWarning: boolean;
  inactivityRemainingSeconds: number;
  extendSession: () => void;
  sessionExpired: boolean;
  reconnect: (password: string) => Promise<any>;
  reconnectVerifyFlyAskyOtp: (challengeId: string, otp: string) => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Constantes de sécurité d'inactivité (20 minutes configurées selon la demande utilisateur)
const INACTIVITY_TIMEOUT_MS = 20 * 60 * 1000; // 20 minutes = 1 200 000 ms
const INACTIVITY_WARNING_MS = 19 * 60 * 1000; // Déclenchement de l'avertissement à 19 minutes (reste 60 secondes)
const KEEP_ALIVE_INTERVAL_MS = 3 * 60 * 1000; // Rafraîchissement glissant du backend toutes les 3 minutes si l'utilisateur est actif

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [inactivityMessage, setInactivityMessage] = useState<string | null>(null);
  const [inactivityWarning, setInactivityWarning] = useState(false);
  const [inactivityRemainingSeconds, setInactivityRemainingSeconds] = useState(60);
  const [sessionExpired, setSessionExpired] = useState(false);
  const lastActivityRef = useRef<number>(Date.now());
  const lastPingRef = useRef<number>(Date.now());

  // Prolonger la session et réinitialiser le chronomètre d'inactivité
  const extendSession = useCallback(() => {
    const now = Date.now();
    lastActivityRef.current = now;
    lastPingRef.current = now;
    setInactivityWarning(false);
    setInactivityRemainingSeconds(60);

    // Ping au serveur pour mettre à jour la fenêtre glissante côté backend Spring Boot
    authService.validateSession().catch(() => {});
  }, []);

  const clearInactivityMessage = () => {
    setInactivityMessage(null);
  };

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      setUser(null);
      setSessionExpired(false);
      setInactivityWarning(false);
      setActiveUserEmail(null);
      localStorage.removeItem('passbanned_user');
      localStorage.removeItem('passbanned_token');
    }
  }, []);

  // Valide la session active auprès du backend Spring Boot via le cookie HttpOnly sécurisé
  useEffect(() => {
    const checkSession = async () => {
      try {
        const apiUser = await authService.getCurrentUser();
        if (apiUser) {
          const loggedUser: User = {
            name: apiUser.name,
            email: apiUser.email,
            role: (apiUser.role?.toLowerCase() as 'admin' | 'user') || 'user',
            status: (apiUser.status?.toLowerCase() as 'active' | 'inactive') || 'active',
            avatar: apiUser.avatarUrl,
            createdAt: apiUser.createdAt,
            lastLogin: apiUser.lastLogin || new Date().toISOString(),
          };
          setUser(loggedUser);
          setActiveUserEmail(loggedUser.email);
          lastActivityRef.current = Date.now();
          lastPingRef.current = Date.now();

          // Restauration immédiate du JWT FlyAsky en mémoire volatile via GET /token (§5)
          authService.refreshFlyAskyToken(loggedUser.email).catch(() => {});
        } else {
          setUser(null);
          setActiveUserEmail(null);
        }
      } catch {
        setUser(null);
        setActiveUserEmail(null);
      } finally {
        setLoading(false);
      }
    };
    checkSession();

    // Quand le backend signale une session expirée : afficher la mini page de survol
    window.handleSessionExpired = () => {
      setInactivityWarning(false);
      setSessionExpired(true);
      setFlyAskyJwt(null);
    };

    // Chaque requête API active prolonge l'inactivité
    window.notifyUserActivity = () => {
      if (!sessionExpired) {
        lastActivityRef.current = Date.now();
      }
    };

    return () => {
      window.handleSessionExpired = undefined;
      window.notifyUserActivity = undefined;
    };
  }, [sessionExpired]);

  // Détecteur d'activité utilisateur (souris, clavier, tactile, défilement)
  useEffect(() => {
    if (!user || sessionExpired) return;

    const handleUserInteraction = () => {
      const now = Date.now();
      // Si l'alerte d'inactivité est affichée, toute interaction la prolonge
      if (inactivityWarning) {
        extendSession();
        return;
      }

      // Mise à jour de l'horodatage d'activité (throttlé à 2 secondes)
      if (now - lastActivityRef.current > 2000) {
        lastActivityRef.current = now;

        // Envoi d'un battement de cœur (heartbeat) au backend toutes les 3 minutes
        // pour maintenir la fenêtre glissante d'inactivité de 20 minutes synchronisée
        if (now - lastPingRef.current > KEEP_ALIVE_INTERVAL_MS) {
          lastPingRef.current = now;
          authService.validateSession().catch(() => {});
        }
      }
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach((ev) => window.addEventListener(ev, handleUserInteraction, { passive: true }));

    // Vérification périodique de l'inactivité chaque seconde
    const timer = setInterval(() => {
      const now = Date.now();
      const idleMs = now - lastActivityRef.current;

      // Cas 1 : Inactivité >= 20 minutes (1200 secondes) -> Affichage de la mini page de survol
      if (idleMs >= INACTIVITY_TIMEOUT_MS) {
        setInactivityWarning(false);
        setSessionExpired(true);
        setFlyAskyJwt(null);
        return;
      }

      // Cas 2 : Inactivité >= 19 minutes (1140 secondes) -> Alerte avec compte à rebours de 60s
      if (idleMs >= INACTIVITY_WARNING_MS) {
        const remainingSec = Math.max(0, Math.ceil((INACTIVITY_TIMEOUT_MS - idleMs) / 1000));
        setInactivityRemainingSeconds(remainingSec);
        setInactivityWarning(true);
      } else {
        setInactivityWarning(false);
      }
    }, 1000);

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, handleUserInteraction));
      clearInterval(timer);
    };
  }, [user, sessionExpired, inactivityWarning, extendSession]);

  const login = async (email: string, password: string): Promise<any> => {
    email = email.trim().toLowerCase();
    try {
      const credentials: LoginRequest = { email, password };
      const response = await authService.login(credentials);

      if (response.challengeRequired || response.mfaRequired || response.mfaSetup) {
        return response;
      }

      if (response.success && response.user) {
        const loggedUser: User = {
          id: response.user.id.toString(),
          name: response.user.name,
          email: response.user.email,
          role: (response.user.role?.toLowerCase() as 'admin' | 'user') || 'user',
          status: (response.user.status?.toLowerCase() as 'active' | 'inactive') || 'active',
          avatar: response.user.avatarUrl,
          createdAt: response.user.createdAt,
          lastLogin: response.user.lastLogin || new Date().toISOString(),
        };
        setUser(loggedUser);
        setActiveUserEmail(loggedUser.email);
        setSessionExpired(false);
        setInactivityMessage(null);
        setInactivityWarning(false);
        lastActivityRef.current = Date.now();
        lastPingRef.current = Date.now();
        return { success: true };
      }
      return { success: false, error: response.error || 'Identifiants incorrects' };
    } catch (error: any) {
      const serverMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        'Erreur de communication avec le serveur Spring Boot';
      return { success: false, error: serverMessage };
    }
  };

  const verifyFlyAskyOtp = async (challengeId: string, email: string, otp: string): Promise<any> => {
    try {
      const response = await authService.verifyFlyAskyOtp(challengeId, email, otp);
      console.log('verifyFlyAskyOtp response:', response.user); // Debugging log
      if (response.success && response.user) {
        const loggedUser: User = {
          name: response.user.name,
          email: response.user.email.trim().toLowerCase(),
          role: (response.user.role?.toLowerCase() as 'admin' | 'user') || 'user',
          status: (response.user.status?.toLowerCase() as 'active' | 'inactive') || 'active',
          avatar: response.user.avatarUrl,
          createdAt: response.user.createdAt,
          lastLogin: response.user.lastLogin || new Date().toISOString(),
        };
        setUser(loggedUser);
        setActiveUserEmail(loggedUser.email);
        setSessionExpired(false);
        setInactivityMessage(null);
        setInactivityWarning(false);
        lastActivityRef.current = Date.now();
        lastPingRef.current = Date.now();
        return { success: true, message: response.message };
      }
      return { success: false, error: response.error || 'Code OTP FlyAsky invalide' };
    } catch (error: any) {
      const serverMsg =
        error.response?.data?.message || error.message || 'Erreur lors de la validation OTP FlyAsky';
      return { success: false, error: serverMsg };
    }
  };

  // Reconnexion rapide depuis le modal de survol sans recharger la page
  const reconnect = async (password: string): Promise<any> => {
    if (!user) return { success: false, error: 'Aucun compte en session' };
    try {
      const credentials: LoginRequest = { email: user.email.trim().toLowerCase(), password };
      const response = await authService.login(credentials);

      if (response.challengeRequired && response.challengeId) {
        return {
          success: false,
          challengeRequired: true,
          challengeId: response.challengeId,
          message: response.message,
        };
      }

      if (response.success && response.user) {
        const loggedUser: User = {
          id: response.user.id.toString(),
          name: response.user.name,
          email: response.user.email.trim().toLowerCase(),
          role: (response.user.role?.toLowerCase() as 'admin' | 'user') || 'user',
          status: (response.user.status?.toLowerCase() as 'active' | 'inactive') || 'active',
          avatar: response.user.avatarUrl,
          createdAt: response.user.createdAt,
          lastLogin: response.user.lastLogin || new Date().toISOString(),
        };
        setUser(loggedUser);
        setActiveUserEmail(loggedUser.email);
        setSessionExpired(false);
        setInactivityWarning(false);
        lastActivityRef.current = Date.now();
        lastPingRef.current = Date.now();
        return { success: true };
      }
      return { success: false, error: response.error || 'Mot de passe incorrect' };
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Identifiants invalides';
      return { success: false, error: msg };
    }
  };

  const reconnectVerifyFlyAskyOtp = async (challengeId: string, otp: string): Promise<any> => {
    if (!user) return { success: false, error: 'Aucun compte en session' };
    try {
      const response = await authService.verifyFlyAskyOtp(challengeId, user.email.trim().toLowerCase(), otp);
      if (response.success && response.user) {
        const loggedUser: User = {
          id: response.user.id.toString(),
          name: response.user.name,
          email: response.user.email.trim().toLowerCase() ,
          role: (response.user.role?.toLowerCase() as 'admin' | 'user') || 'user',
          status: (response.user.status?.toLowerCase() as 'active' | 'inactive') || 'active',
          avatar: response.user.avatarUrl,
          createdAt: response.user.createdAt,
          lastLogin: response.user.lastLogin || new Date().toISOString(),
        };
        setUser(loggedUser);
        setActiveUserEmail(loggedUser.email);
        setSessionExpired(false);
        setInactivityWarning(false);
        lastActivityRef.current = Date.now();
        lastPingRef.current = Date.now();
        return { success: true, message: response.message };
      }
      return { success: false, error: response.error || 'Code OTP FlyAsky invalide' };
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Erreur validation OTP';
      return { success: false, error: msg };
    }
  };

  const resendFlyAskyOtp = async (challengeId: string): Promise<any> => {
    try {
      return await authService.resendFlyAskyOtp(challengeId);
    } catch (error: any) {
      return { success: false, message: error.response?.data?.message || 'Erreur lors du renvoi du code' };
    }
  };

  const resetMfa = async (id: string): Promise<boolean> => {
    try {
      const response = await userService.resetMFA(parseInt(id, 10));
      return response === 'ok';
    } catch (error) {
      console.error('Erreur réinitialisation MFA:', error);
      return false;
    }
  };

  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isAdmin,
        loading,
        verifyFlyAskyOtp,
        resendFlyAskyOtp,
        resetMfa,
        inactivityMessage,
        clearInactivityMessage,
        inactivityWarning,
        inactivityRemainingSeconds,
        extendSession,
        sessionExpired,
        reconnect,
        reconnectVerifyFlyAskyOtp,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
