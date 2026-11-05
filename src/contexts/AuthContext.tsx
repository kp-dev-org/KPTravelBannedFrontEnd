import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { authService, LoginRequest, userService, setActiveUserEmail, setFlyAskyJwt } from '../services/Api';
import { useLanguage } from './LanguageContext';

export interface User {
  id?: string;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'super-admin';
  status: 'active' | 'inactive';
  avatar?: string;
  createdAt: string;
  lastLogin: string;
}

export function normalizeUserRole(rawRole?: string): 'admin' | 'user' | 'super-admin' {
  const r = (rawRole || '').toLowerCase().replace(/_/g, '-');
  if (r === 'super-admin') return 'super-admin';
  if (r === 'admin') return 'admin';
  return 'user';
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<any>;
  logout: () => void;
  isAdmin: boolean;
  isSuperAdmin: boolean;
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
const INACTIVITY_TIMEOUT_MS = 20 * 60 * 1000; 
const INACTIVITY_WARNING_MS = 19 * 60 * 1000; 
const KEEP_ALIVE_INTERVAL_MS = 3 * 60 * 1000; 

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [inactivityMessage, setInactivityMessage] = useState<string | null>(null);
  const [inactivityWarning, setInactivityWarning] = useState(false);
  const [inactivityRemainingSeconds, setInactivityRemainingSeconds] = useState(60);
  const [sessionExpired, setSessionExpired] = useState(false);

  const lastActivityRef = useRef<number>(Date.now());
  const lastPingRef = useRef<number>(Date.now());
  const userRef = useRef<User | null>(user);
  const { t } = useLanguage();

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // Helper pour lire l'horodatage d'activité partagé (synchronisé entre tous les onglets)
  const getLastActivity = (): number => {
    try {
      const stored = localStorage.getItem('passbanned_last_activity');
      if (stored) {
        const parsed = parseInt(stored, 10);
        if (!isNaN(parsed) && parsed > 0) return parsed;
      }
    } catch {}
    return lastActivityRef.current;
  };

  // Helper pour enregistrer l'activité de manière synchrone
  const updateLastActivity = (timestamp: number = Date.now()) => {
    lastActivityRef.current = timestamp;
    try {
      localStorage.setItem('passbanned_last_activity', String(timestamp));
    } catch {}
  };

  // Verrouillage officiel de session suite à 20 minutes d'inactivité
  // Référence stable sans dépendance cyclique sur user
  const triggerSessionExpired = useCallback(() => {
    setInactivityWarning(false);
    setSessionExpired(true);
    setFlyAskyJwt(null);
    try {
      localStorage.setItem('passbanned_session_locked', 'true');
      sessionStorage.setItem('passbanned_session_locked', 'true');
      const currentUser = userRef.current;
      if (currentUser) {
        const serialized = JSON.stringify(currentUser);
        localStorage.setItem('passbanned_locked_user', serialized);
        sessionStorage.setItem('passbanned_locked_user', serialized);
      }
    } catch {}
    setInactivityMessage(
      t("session_expired")
    );
    authService.expireSession(userRef.current?.email).catch(() => {});
  }, []);

  // Prolonger la session et réinitialiser le chronomètre d'inactivité
  const extendSession = useCallback(() => {
    const now = Date.now();
    updateLastActivity(now);
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
      try {
        localStorage.removeItem('passbanned_session_locked');
        localStorage.removeItem('passbanned_locked_user');
        localStorage.removeItem('passbanned_last_activity');
        sessionStorage.removeItem('passbanned_session_locked');
        sessionStorage.removeItem('passbanned_locked_user');
        localStorage.removeItem('passbanned_user');
        localStorage.removeItem('passbanned_token');
      } catch {}
    }
  }, []);

  // Valide la session active auprès du backend Spring Boot une seule fois au chargement initial
  useEffect(() => {
    const checkSession = async () => {
      // SÉCURITÉ : Vérifier si l'inactivité a dépassé 20 minutes (ex: après veille prolongée ou réouverture)
      const storedLast = localStorage.getItem('passbanned_last_activity');
      if (storedLast) {
        const last = parseInt(storedLast, 10);
        if (!isNaN(last) && Date.now() - last >= INACTIVITY_TIMEOUT_MS) {
          triggerSessionExpired();
          setLoading(false);
          return;
        }
      }

      // SÉCURITÉ : Si la session a été verrouillée (20 min),
      // recharger la page (F5) ne doit JAMAIS reconnecter l'utilisateur automatiquement !
      const isLocked =
        localStorage.getItem('passbanned_session_locked') === 'true' ||
        sessionStorage.getItem('passbanned_session_locked') === 'true';

      if (isLocked) {
        const lockedUserJson =
          localStorage.getItem('passbanned_locked_user') ||
          sessionStorage.getItem('passbanned_locked_user');
        if (lockedUserJson) {
          try {
            const parsed = JSON.parse(lockedUserJson);
            setUser(parsed);
            setActiveUserEmail(parsed.email);
          } catch {}
        }
        setSessionExpired(true);
        setInactivityWarning(false);
        setLoading(false);
        return; // Interdit toute ré-authentification automatique sans mot de passe / OTP
      }

      try {
        const apiUser = await authService.getCurrentUser();
        if (apiUser) {
          const loggedUser: User = {
            id: apiUser.id.toString(),
            name: apiUser.name,
            email: apiUser.email,
            role: normalizeUserRole(apiUser.role),
            status: (apiUser.status?.toLowerCase() as 'active' | 'inactive') || 'active',
            avatar: apiUser.avatarUrl,
            createdAt: apiUser.createdAt,
            lastLogin: apiUser.lastLogin || new Date().toISOString(),
          };
          setUser(loggedUser);
          setActiveUserEmail(loggedUser.email);
          lastPingRef.current = Date.now();

          // Initialiser l'horodatage uniquement si aucun horodatage n'est déjà en mémoire
          if (!localStorage.getItem('passbanned_last_activity')) {
            updateLastActivity(Date.now());
          }

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
      triggerSessionExpired();
    };

    return () => {
      window.handleSessionExpired = undefined;
      window.notifyUserActivity = undefined;
    };
  }, []); // Exécuté une seule fois au montage

  // Détecteur d'activité utilisateur (clavier, clics, tactile, défilement, déplacements réels)
  useEffect(() => {
    if (!user || sessionExpired) return;

    const checkInactivity = () => {
      const now = Date.now();
      const last = getLastActivity();
      const idleMs = now - last;

      // Cas 1 : Inactivité >= 20 minutes (1200 secondes) -> Verrouillage de la session
      if (idleMs >= INACTIVITY_TIMEOUT_MS) {
        triggerSessionExpired();
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
    };

    const handleUserInteraction = () => {
      const now = Date.now();
      const last = getLastActivity();
      const idleMs = now - last;

      // SÉCURITÉ CRITIQUE : Si 20 min d'inactivité sont déjà atteintes,
      // ce clic NE DOIT PAS prolonger la session ! Elle doit verrouiller immédiatement.
      if (idleMs >= INACTIVITY_TIMEOUT_MS) {
        triggerSessionExpired();
        return;
      }

      // Si l'avertissement de 60s est affiché et que l'utilisateur clique, prolonger la session
      if (inactivityWarning) {
        extendSession();
        return;
      }

      // Mise à jour de l'horodatage d'activité sur clic de souris uniquement
      updateLastActivity(now);

      // Envoi d'un battement de cœur (heartbeat) au backend si nécessaire
      if (now - lastPingRef.current > KEEP_ALIVE_INTERVAL_MS) {
        lastPingRef.current = now;
        authService.validateSession().catch(() => {});
      }
    };

    // Synchronisation multi-onglets en temps réel via l'événement storage
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'passbanned_last_activity' && e.newValue) {
        const newTime = parseInt(e.newValue, 10);
        if (!isNaN(newTime)) {
          lastActivityRef.current = newTime;
          setInactivityWarning(false);
        }
      }
      if (e.key === 'passbanned_session_locked') {
        if (e.newValue === 'true') {
          setInactivityWarning(false);
          setSessionExpired(true);
          setFlyAskyJwt(null);
        } else {
          setSessionExpired(false);
        }
      }
    };

    // Vérification immédiate lors du retour sur l'onglet ou du réveil de l'ordinateur
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        checkInactivity();
      }
    };

    const events = ['click'];
    events.forEach((ev) => window.addEventListener(ev, handleUserInteraction, { passive: true }));
    window.addEventListener('storage', handleStorageChange);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    // Vérification périodique de l'inactivité chaque seconde
    const timer = setInterval(checkInactivity, 1000);

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, handleUserInteraction));
      window.removeEventListener('storage', handleStorageChange);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      clearInterval(timer);
    };
  }, [user, sessionExpired, inactivityWarning, extendSession]);

  const login = async (email: string, password: string): Promise<any> => {
    try {
      const cleanEmail = (email || '').trim().toLowerCase();
      const credentials: LoginRequest = { email: cleanEmail, password };
      const response = await authService.login(credentials);

      if (response.challengeRequired || response.mfaRequired || response.mfaSetup) {
        return response;
      }

      if (response.success && response.user) {
        const loggedUser: User = {
          id: response.user.id.toString(),
          name: response.user.name,
          email: response.user.email,
          role: normalizeUserRole(response.user.role),
          status: (response.user.status?.toLowerCase() as 'active' | 'inactive') || 'active',
          avatar: response.user.avatarUrl,
          createdAt: response.user.createdAt,
          lastLogin: response.user.lastLogin || new Date().toISOString(),
        };
        try {
          localStorage.removeItem('passbanned_session_locked');
          localStorage.removeItem('passbanned_locked_user');
          sessionStorage.removeItem('passbanned_session_locked');
          sessionStorage.removeItem('passbanned_locked_user');
        } catch {}
        setUser(loggedUser);
        setActiveUserEmail(loggedUser.email);
        setSessionExpired(false);
        setInactivityMessage(null);
        setInactivityWarning(false);
        updateLastActivity(Date.now());
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
      if (response.success && response.user) {
        const loggedUser: User = {
          name: response.user.name,
          email: response.user.email,
          role: normalizeUserRole(response.user.role),
          status: (response.user.status?.toLowerCase() as 'active' | 'inactive') || 'active',
          avatar: response.user.avatarUrl,
          createdAt: response.user.createdAt,
          lastLogin: response.user.lastLogin || new Date().toISOString(),
        };
        try {
          localStorage.removeItem('passbanned_session_locked');
          localStorage.removeItem('passbanned_locked_user');
          sessionStorage.removeItem('passbanned_session_locked');
          sessionStorage.removeItem('passbanned_locked_user');
        } catch {}
        setUser(loggedUser);
        setActiveUserEmail(loggedUser.email);
        setSessionExpired(false);
        setInactivityMessage(null);
        setInactivityWarning(false);
        updateLastActivity(Date.now());
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
      const cleanEmail = (user.email || '').trim().toLowerCase();
      const credentials: LoginRequest = { email: cleanEmail, password };
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
          name: response.user.name,
          email: response.user.email,
          role: normalizeUserRole(response.user.role),
          status: (response.user.status?.toLowerCase() as 'active' | 'inactive') || 'active',
          avatar: response.user.avatarUrl,
          createdAt: response.user.createdAt,
          lastLogin: response.user.lastLogin || new Date().toISOString(),
        };
        try {
          localStorage.removeItem('passbanned_session_locked');
          localStorage.removeItem('passbanned_locked_user');
          sessionStorage.removeItem('passbanned_session_locked');
          sessionStorage.removeItem('passbanned_locked_user');
        } catch {}
        setUser(loggedUser);
        setActiveUserEmail(loggedUser.email);
        setSessionExpired(false);
        setInactivityWarning(false);
        updateLastActivity(Date.now());
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
      const response = await authService.verifyFlyAskyOtp(challengeId, user.email, otp);
      if (response.success && response.user) {
        const loggedUser: User = {
          name: response.user.name,
          email: response.user.email,
          role: normalizeUserRole(response.user.role),
          status: (response.user.status?.toLowerCase() as 'active' | 'inactive') || 'active',
          avatar: response.user.avatarUrl,
          createdAt: response.user.createdAt,
          lastLogin: response.user.lastLogin || new Date().toISOString(),
        };
        try {
          localStorage.removeItem('passbanned_session_locked');
          localStorage.removeItem('passbanned_locked_user');
          sessionStorage.removeItem('passbanned_session_locked');
          sessionStorage.removeItem('passbanned_locked_user');
        } catch {}
        setUser(loggedUser);
        setActiveUserEmail(loggedUser.email);
        setSessionExpired(false);
        setInactivityWarning(false);
        updateLastActivity(Date.now());
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

  const isSuperAdmin = user?.role === 'super-admin';
  const isAdmin = user?.role === 'admin' || user?.role === 'super-admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isAdmin,
        isSuperAdmin,
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
