import axios from 'axios';

export function normalizeApiUrl(rawUrl: string): string {
  let url = (rawUrl || '').trim();
  if (!url) return 'http://localhost:8080/api';

  // Si l'URL est saisie sans protocole (ex: "localhost:8080/api", "localhost:8080")
  if (!/^https?:\/\//i.test(url)) {
    if (/^(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?/i.test(url)) {
      url = 'http://' + url;
    } else {
      url = 'https://' + url;
    }
  }

  // Retirer les slashes terminaux
  url = url.replace(/\/+$/, '');

  // S'assurer que le chemin d'accès se termine par /api
  if (!url.endsWith('/api')) {
    url = `${url}/api`;
  }

  return url;  
}

// URL du backend Spring Boot : variable d'environnement VITE_API_BASE_URL
const ENV_API_URL = import.meta.env.VITE_API_BASE_URL;
export const DEFAULT_API_BASE_URL = ENV_API_URL? normalizeApiUrl(ENV_API_URL): 'http://localhost:8080/api';

// Suppression définitive de tout ancien lien conservé dans le localStorage
try {
  localStorage.removeItem('asky_api_base_url');
} catch {}

export function getStoredApiUrl(): string {
  return DEFAULT_API_BASE_URL;
}

export function getApiBaseUrl(): string {
  return DEFAULT_API_BASE_URL;
}

// Interface représentant une erreur renvoyée par l'API Spring Boot
export interface ApiError {
  timestamp: string;
  status: number;
  error: string;
  message: string;
  path?: string;
}

// Déclaration globale TypeScript
declare global {
  interface Window {
    handleGlobalError?: (error: ApiError) => void;
    handleSessionExpired?: () => void;
    notifyUserActivity?: () => void;
  }
}

// Jeton FlyAsky conservé strictement en mémoire (pas de localStorage - Spécification FlyAsky §5)
let flyAskyJwtInMemory: string | null = null;
let activeUserEmail: string | null = null;
let renewalTimer: any = null;

export function setActiveUserEmail(email: string | null): void {
  activeUserEmail = email;
}

export function getActiveUserEmail(): string | null {
  return activeUserEmail;
}

export function setFlyAskyJwt(token: string | null): void {
  flyAskyJwtInMemory = token;
  if (renewalTimer) {
    clearTimeout(renewalTimer);
    renewalTimer = null;
  }

  // Spécification FlyAsky §5 : Renouveler proactivement avant l'expiration (durée JWT: 10 min)
  // On déclenche le renouvellement à 7 minutes (420 secondes) pour une fluidité totale.
  if (token) {
    renewalTimer = setTimeout(() => {
      authService.refreshFlyAskyToken(activeUserEmail || undefined).catch(() => {});
    }, 420 * 1000);
  }
}

export function getFlyAskyJwt(): string | null {
  return flyAskyJwtInMemory;
}

// Instance Axios avec support des cookies HttpOnly et du JWT en mémoire
const api = axios.create({
  baseURL: getStoredApiUrl(),
  timeout: 10000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercepteur de requête : présente le JWT FlyAsky et notifie l'activité utilisateur
api.interceptors.request.use((config) => {
  if (flyAskyJwtInMemory) {
    config.headers.Authorization = `Bearer ${flyAskyJwtInMemory}`;
  }
  if (typeof window.notifyUserActivity === 'function') {
    window.notifyUserActivity();
  }
  return config;
});

// ----------- Intercepteurs de réponses -----------
api.interceptors.response.use(
  (response) => {
    if (typeof window.notifyUserActivity === 'function') {
      window.notifyUserActivity();
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Spécification FlyAsky §5 (Point 4) : sur 401, renouveler une fois, puis retenter
    const isAuthPath =
      originalRequest?.url?.includes('/auth/login') ||
      originalRequest?.url?.includes('/auth/flyasky/refresh-token');

    if (error.response?.status === 401 && !originalRequest?._retry && !isAuthPath) {
      originalRequest._retry = true;
      try {
        const newJwt = await authService.refreshFlyAskyToken(activeUserEmail || undefined);
        if (newJwt) {
          originalRequest.headers.Authorization = `Bearer ${newJwt}`;
          return api(originalRequest);
        }
      } catch (renewalErr) {
        console.warn('Échec du renouvellement sur 401', renewalErr);
      }
    }

    if (error.response) {
      const status = error.response.status;
      if (status === 401 && !isAuthPath && typeof window.handleSessionExpired === 'function') {
        window.handleSessionExpired();
      }
      if (status !== 400 && status !== 401 && status !== 404 && typeof window.handleGlobalError === 'function') {
        const apiError = error.response.data as ApiError;
        window.handleGlobalError(apiError);
      }
    }
    return Promise.reject(error);
  }
);

export default api;

/* =========================================================================
   INTERFACES DE DONNÉES SPRING BOOT
   ========================================================================= */

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  challengeRequired: boolean;
  challengeId?: string;
  step?: string; // "FLYASKY_OTP", "COMPLETED"
  message?: string;
  email?: string;
}

export interface ApiUser {
  id: number;
  name: string;
  email: string;
  role: 'USER' | 'ADMIN';
  status: 'ACTIVE' | 'INACTIVE';
  avatarUrl?: string;
  lastLogin: string;
  createdAt: string;
  updatedAt: string;
  mfaEnabled: boolean;
}

export interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
  role: 'USER' | 'ADMIN';
  status: 'ACTIVE' | 'INACTIVE';
  avatarUrl?: string;
  mfaEnabled: boolean;
}

export interface ApiPassenger {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  passportNumber: string;
  nationality: string;
  dateOfBirth: string;
  banReason: string;
  banDate: string;
  banDuration: 'TEMPORARY' | 'PERMANENT';
  banEndDate?: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  notes?: string;
  status: 'ACTIVE' | 'EXPIRED' | 'UNDER_REVIEW';
  imageUrl?: string;
  createdByName: string;
  createdByEmail: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePassengerRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  passportNumber: string;
  nationality: string;
  dateOfBirth: string;
  banReason: string;
  banDate: string;
  banDuration: 'TEMPORARY' | 'PERMANENT';
  banEndDate?: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  notes?: string;
  status: 'ACTIVE' | 'EXPIRED' | 'UNDER_REVIEW';
  imageUrl?: string;
}

export interface PageResponse<T> {
  content: T[];
  pageable: {
    sort: { sorted: boolean; unsorted: boolean; empty: boolean };
    pageNumber: number;
    pageSize: number;
    offset: number;
    paged: boolean;
    unpaged: boolean;
  };
  totalElements: number;
  totalPages: number;
  last: boolean;
  first: boolean;
  numberOfElements: number;
  size: number;
  number: number;
  sort: { sorted: boolean; unsorted: boolean; empty: boolean };
  empty: boolean;
}

export interface DashboardStats {
  passengers: {
    total: number;
    active: number;
    critical: number;
    recent: number;
  };
  users: {
    total: number;
    admins: number;
    active: number;
  };
}

/* =========================================================================
   DIAGNOSTIC BACKEND SPRING BOOT
   ========================================================================= */

export async function pingBackend(): Promise<{ online: boolean; message: string; latencyMs?: number }> {
  const targetBaseUrl = DEFAULT_API_BASE_URL;
  const start = performance.now();
  try {
    await axios.get(`${targetBaseUrl}/passengers/stats`, { timeout: 4000, withCredentials: true });
    const latencyMs = Math.round(performance.now() - start);
    return { online: true, message: `Connecté à Spring Boot (${latencyMs}ms)`, latencyMs };
  } catch (err: any) {
    try {
      await axios.get(`${targetBaseUrl}/passengers`, { params: { page: 0, size: 1 }, timeout: 4000, withCredentials: true });
      const latencyMs = Math.round(performance.now() - start);
      return { online: true, message: `Connecté à Spring Boot (${latencyMs}ms)`, latencyMs };
    } catch {
      return {
        online: false,
        message: 'Serveur Spring Boot inaccessible. Vérifiez l\'URL et le serveur.',
      };
    }
  }
}

/* =========================================================================
   SERVICE D'AUTHENTIFICATION (SPRING BOOT EXCLUSIF - SESSIONS HTTPONLY)
   ========================================================================= */

export const authService = {
  login: async (credentials: LoginRequest): Promise<any> => {
    const response = await api.post('/auth/login', credentials);
    const data = response.data;

    // Étape 2 : Challenge temporaire retourné après validation des identifiants locaux
    if (data.challengeRequired && data.challengeId) {
      return {
        success: true,
        challengeRequired: true,
        challengeId: data.challengeId,
        email: data.email || credentials.email,
        step: data.step || 'FLYASKY_OTP',
        message: data.message,
      };
    }

    // Si authentifié directement
    if (data.success && data.user) {
      return {
        success: true,
        user: data.user,
      };
    }

    return {
      success: false,
      error: data.message || 'Identifiants incorrects',
    };
  },

  verifyFlyAskyOtp: async (challengeId: string, email: string, otp: string): Promise<any> => {
    const response = await api.post('/auth/flyasky/verify', { challengeId, email, otp });
    const data = response.data;

    if (data.success && data.user) {
      // Stocker le JWT FlyAsky strictement en mémoire (pas de localStorage)
      if (data.token) {
        setFlyAskyJwt(data.token);
      }
      return {
        success: true,
        user: data.user,
        message: data.message,
      };
    }
    return {
      success: false,
      error: data.message || 'Code OTP FlyAsky invalide ou expiré',
    };
  },

  resendFlyAskyOtp: async (challengeId: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.post('/auth/flyasky/resend-otp', { challengeId });
    return response.data;
  },

  refreshFlyAskyToken: async (email?: string): Promise<string | null> => {
    try {
      const targetEmail = email || activeUserEmail;
      const response = await api.post(
        '/auth/flyasky/refresh-token',
        targetEmail ? { email: targetEmail } : {}
      );
      if (response.data?.success && response.data?.token) {
        setFlyAskyJwt(response.data.token);
        return response.data.token;
      }
      return null;
    } catch (e) {
      console.warn('Renouvellement automatique du JWT FlyAsky échoué', e);
      return null;
    }
  },

  getCurrentUser: async (): Promise<ApiUser> => {
    const response = await api.get<ApiUser>('/auth/me');
    return response.data;
  },

  logout: async (): Promise<void> => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      console.warn('Erreur lors de la déconnexion backend', e);
    } finally {
      // Effacer le JWT en mémoire à la déconnexion (§5 point 5)
      setFlyAskyJwt(null);
    }
  },

  validateSession: async (): Promise<boolean> => {
    try {
      await api.get('/auth/me');
      return true;
    } catch {
      return false;
    }
  },
};

/* =========================================================================
   SERVICE DES UTILISATEURS (SPRING BOOT EXCLUSIF)
   ========================================================================= */

export const userService = {
  changePassword: async (
    id: number,
    avatarUrl: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> => {
    await api.post(`/users/${id}/password`, { avatarUrl, currentPassword, newPassword });
  },

  getAllUsers: async (): Promise<ApiUser[]> => {
    const response = await api.get<ApiUser[]>('/users');
    return response.data;
  },

  getUserById: async (id: number): Promise<ApiUser> => {
    const response = await api.get<ApiUser>(`/users/${id}`);
    return response.data;
  },

  createUser: async (user: CreateUserRequest): Promise<ApiUser> => {
    const response = await api.post<ApiUser>('/users', user);
    return response.data;
  },

  updateUser: async (id: number, user: Partial<ApiUser> & { password?: string }): Promise<ApiUser> => {
    const response = await api.put<ApiUser>(`/users/${id}`, user);
    return response.data;
  },

  deleteUser: async (id: number): Promise<void> => {
    await api.delete(`/users/${id}`);
  },

  getUserStats: async (): Promise<{ totalUsers: number; adminCount: number; activeUsers: number }> => {
    const response = await api.get('/users/stats');
    return response.data;
  },

  uploadAvatar: async (id: number, file: File): Promise<{ avatarUrl: string }> => {
    const formData = new FormData();
    formData.append('avatar', file);
    const response = await api.post<{ avatarUrl: string }>(`/users/${id}/avatar`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  uploadAvatarForNewUser: async (file: File): Promise<{ avatarUrl: string }> => {
    const formData = new FormData();
    formData.append('avatar', file);
    const response = await api.post<{ avatarUrl: string }>('/users/avatar/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  resetMFA: async (id: number): Promise<string> => {
    const response = await api.post(`/users/${id}/reset-mfa`);
    return response.data.status;
  },
};

/* =========================================================================
   SERVICE POUR FICHIERS (SPRING BOOT EXCLUSIF)
   ========================================================================= */

export const fileService = {
  uploadUserAvatar: async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post<{ url: string }>('/upload/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.url;
  },
};

/* =========================================================================
   SERVICE DES PASSAGERS BANNIS (SPRING BOOT EXCLUSIF)
   ========================================================================= */

export const passengerService = {
  getAllPassengers: async (
    page = 0,
    size = 10,
    sortBy = 'banDate',
    sortDir = 'desc'
  ): Promise<PageResponse<ApiPassenger>> => {
    const response = await api.get<PageResponse<ApiPassenger>>('/passengers', {
      params: { page, size, sortBy, sortDir },
    });
    return response.data;
  },

  getPassengerById: async (id: number): Promise<ApiPassenger> => {
    const response = await api.get<ApiPassenger>(`/passengers/${id}`);
    return response.data;
  },

  getPassengerByPassport: async (passportNumber: string): Promise<ApiPassenger> => {
    const response = await api.get<ApiPassenger>(`/passengers/passport/${passportNumber.trim()}`);
    return response.data;
  },

  createPassenger: async (passenger: CreatePassengerRequest): Promise<ApiPassenger> => {
    const response = await api.post<ApiPassenger>('/passengers', passenger);
    return response.data;
  },

  updatePassenger: async (id: number, passenger: Partial<CreatePassengerRequest>): Promise<ApiPassenger> => {
    const response = await api.put<ApiPassenger>(`/passengers/${id}`, passenger);
    return response.data;
  },

  deletePassenger: async (id: number): Promise<void> => {
    await api.delete(`/passengers/${id}`);
  },

  searchPassengers: async (query: string, page = 0, size = 10): Promise<PageResponse<ApiPassenger>> => {
    const response = await api.get<PageResponse<ApiPassenger>>('/passengers/search', {
      params: { query, page, size },
    });
    return response.data;
  },

  filterPassengers: async (
    filters: { severity?: string; status?: string; banDuration?: string; nationality?: string },
    page = 0,
    size = 10
  ): Promise<PageResponse<ApiPassenger>> => {
    const response = await api.get<PageResponse<ApiPassenger>>('/passengers/filter', {
      params: { ...filters, page, size },
    });
    return response.data;
  },

  getRecentBans: async (days = 7): Promise<ApiPassenger[]> => {
    const response = await api.get<ApiPassenger[]>('/passengers/recent', {
      params: { days },
    });
    return response.data;
  },

  getPassengerStats: async (): Promise<{ totalPassengers: number; activeBans: number; criticalCases: number }> => {
    const response = await api.get('/passengers/stats');
    return response.data;
  },

  uploadPassengerImage: async (file: File): Promise<{ imageUrl: string }> => {
    const formData = new FormData();
    formData.append('image', file);
    const response = await api.post<{ imageUrl: string }>('/passengers/image/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};

/* =========================================================================
   SERVICE DU TABLEAU DE BORD (SPRING BOOT EXCLUSIF)
   ========================================================================= */

export const dashboardService = {
  getStats: async (): Promise<DashboardStats> => {
    const response = await api.get<DashboardStats>('/dashboard/stats');
    return response.data;
  },
};

/* =========================================================================
   SERVICE DES JOURNAUX D'ACTIVITÉ / AUDIT (SPRING BOOT)
   ========================================================================= */

export interface AuditLog {
  id: number;
  action: string;
  category: string;
  description: string;
  userEmail?: string;
  userName?: string;
  userRole?: 'ADMIN' | 'USER' | 'SYSTEM' | string;
  targetResource?: string;
  status: 'SUCCESS' | 'FAILURE' | 'WARNING';
  ipAddress?: string;
  details?: string;
  timestamp: string;
}

export interface AuditLogStats {
  totalLogs: number;
  todayLogs: number;
  failedLogs: number;
  warningLogs: number;
}

export interface AuditFilterParams {
  query?: string;
  category?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  size?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

export interface ApiActivityLog {
  id: number;
  eventType: string;
  description: string;
  userEmail?: string;
  timestamp: string;
  status?: string;
}

// Initial seed data for offline/fallback audit trail
const DEFAULT_AUDIT_LOGS: AuditLog[] = [
  {
    id: 101,
    action: 'SYSTEM_STARTUP',
    category: 'SYSTEM',
    description: 'Démarrage du système de sûreté aéroportuaire PassBanned ASKY',
    userEmail: 'system@flyasky.com',
    userName: 'Système ASKY',
    userRole: 'SYSTEM',
    targetResource: 'Hub Lomé Tokoin',
    status: 'SUCCESS',
    ipAddress: '10.0.0.1',
    details: 'Version 2.4.0 • Initialisation des services de surveillance des listes noires.',
    timestamp: new Date(Date.now() - 3600000 * 48).toISOString(),
  },
  {
    id: 102,
    action: 'POLICY_UPDATE',
    category: 'SECURITY',
    description: 'Mise à jour des critères d\'interdiction selon la directive ICAO / OACI Doc 8973',
    userEmail: 'admin@flyasky.com',
    userName: 'Administrateur Sûreté',
    userRole: 'ADMIN',
    targetResource: 'Politique Sûreté ASKY',
    status: 'SUCCESS',
    ipAddress: '192.168.1.15',
    details: 'Resserrement des contrôles sur les passagers turbulents (Unruly Passengers Level 2+).',
    timestamp: new Date(Date.now() - 3600000 * 28).toISOString(),
  },
  {
    id: 103,
    action: 'PASSENGER_CREATED',
    category: 'PASSENGERS',
    description: 'Enregistrement d\'un passager interdit: KOFFI Messan (Passeport: TG782910)',
    userEmail: 'admin@flyasky.com',
    userName: 'Administrateur Sûreté',
    userRole: 'ADMIN',
    targetResource: 'Passenger #103',
    status: 'SUCCESS',
    ipAddress: '192.168.1.15',
    details: 'Gravité: CRITICAL, Motif: Violence envers le personnel navigant commercial (PNC).',
    timestamp: new Date(Date.now() - 3600000 * 14).toISOString(),
  },
  {
    id: 104,
    action: 'GATE_CHECK_MATCH',
    category: 'SCREENING',
    description: 'Alerte Sûreté: Concordance détectée lors du contrôle d\'embarquement Vol KP 024',
    userEmail: 'agent.embarquement@flyasky.com',
    userName: 'Agent Embarquement',
    userRole: 'USER',
    targetResource: 'Vol KP 024 • Lomé -> Dakar',
    status: 'WARNING',
    ipAddress: '192.168.4.22',
    details: 'Passeport scanné TG782910 - Passager refoulé et transféré à la gendarmerie de l\'air.',
    timestamp: new Date(Date.now() - 3600000 * 6).toISOString(),
  },
  {
    id: 105,
    action: 'LOGIN_FAILED',
    category: 'AUTHENTICATION',
    description: 'Tentative de connexion échouée pour compte suspect (3 essais)',
    userEmail: 'unknown.intruder@terminal.aero',
    userName: 'Inconnu',
    userRole: 'USER',
    targetResource: 'Portail Sûreté',
    status: 'FAILURE',
    ipAddress: '41.207.162.88',
    details: 'Mot de passe erroné à répétition. Alerte brute de force émise.',
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 106,
    action: 'USER_LOGIN',
    category: 'AUTHENTICATION',
    description: 'Connexion réussie avec double facteur (MFA)',
    userEmail: 'admin@flyasky.com',
    userName: 'Administrateur Sûreté',
    userRole: 'ADMIN',
    targetResource: 'Session Administrative',
    status: 'SUCCESS',
    ipAddress: '192.168.1.15',
    details: 'Validation TOTP réussie. Session active pour 8 heures.',
    timestamp: new Date(Date.now() - 3600000 * 1).toISOString(),
  },
];

function getLocalAuditLogs(): AuditLog[] {
  try {
    const raw = localStorage.getItem('passbanned_audit_logs');
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // fallback
  }
  localStorage.setItem('passbanned_audit_logs', JSON.stringify(DEFAULT_AUDIT_LOGS));
  return DEFAULT_AUDIT_LOGS;
}

function saveLocalAuditLog(log: AuditLog) {
  const current = getLocalAuditLogs();
  const updated = [log, ...current];
  localStorage.setItem('passbanned_audit_logs', JSON.stringify(updated));
}

export const auditService = {
  getLogs: async (params: AuditFilterParams = {}): Promise<PageResponse<AuditLog>> => {
    try {
      const response = await api.get<PageResponse<AuditLog>>('/audit-logs', { params });
      // If backend returned valid page response, return it directly
      if (response.data && Array.isArray(response.data.content)) {
        return response.data;
      }
    } catch {
      // Fallback to local storage if API is unreachable
    }

    // Local filter and pagination fallback
    const all = getLocalAuditLogs();
    let filtered = [...all];

    if (params.query) {
      const q = params.query.toLowerCase();
      filtered = filtered.filter(
        (l) =>
          l.description.toLowerCase().includes(q) ||
          l.action.toLowerCase().includes(q) ||
          (l.userEmail && l.userEmail.toLowerCase().includes(q)) ||
          (l.userName && l.userName.toLowerCase().includes(q)) ||
          (l.targetResource && l.targetResource.toLowerCase().includes(q))
      );
    }

    if (params.category && params.category !== 'ALL') {
      filtered = filtered.filter((l) => l.category === params.category);
    }

    if (params.status && params.status !== 'ALL') {
      filtered = filtered.filter((l) => l.status === params.status);
    }

    if (params.startDate) {
      const startMs = new Date(params.startDate).getTime();
      if (!isNaN(startMs)) {
        filtered = filtered.filter((l) => new Date(l.timestamp).getTime() >= startMs);
      }
    }

    if (params.endDate) {
      const endMs = new Date(params.endDate).getTime();
      if (!isNaN(endMs)) {
        filtered = filtered.filter((l) => new Date(l.timestamp).getTime() <= endMs);
      }
    }

    const page = params.page || 0;
    const size = params.size || 15;
    const totalElements = filtered.length;
    const totalPages = Math.ceil(totalElements / size) || 1;
    const start = page * size;
    const content = filtered.slice(start, start + size);

    return {
      content,
      pageable: {
        sort: { sorted: true, unsorted: false, empty: false },
        pageNumber: page,
        pageSize: size,
        offset: start,
        paged: true,
        unpaged: false,
      },
      totalElements,
      totalPages,
      last: page >= totalPages - 1,
      first: page === 0,
      numberOfElements: content.length,
      size,
      number: page,
      sort: { sorted: true, unsorted: false, empty: false },
      empty: content.length === 0,
    };
  },

  getStats: async (): Promise<AuditLogStats> => {
    try {
      const response = await api.get<AuditLogStats>('/audit-logs/stats');
      if (response.data && response.data.totalLogs !== undefined) {
        return response.data;
      }
    } catch {
      // fallback
    }

    const all = getLocalAuditLogs();
    const oneDayAgo = Date.now() - 24 * 3600000;
    return {
      totalLogs: all.length,
      todayLogs: all.filter((l) => new Date(l.timestamp).getTime() >= oneDayAgo).length,
      failedLogs: all.filter((l) => l.status === 'FAILURE').length,
      warningLogs: all.filter((l) => l.status === 'WARNING').length,
    };
  },

  recordLog: async (log: Partial<AuditLog>): Promise<AuditLog> => {
    const userJson = localStorage.getItem('passbanned_user');
    let currentUser: any = null;
    if (userJson) {
      try {
        currentUser = JSON.parse(userJson);
      } catch {}
    }

    const newLog: AuditLog = {
      id: Date.now(),
      action: log.action || 'OPERATION_PERFORMED',
      category: log.category || 'SYSTEM',
      description: log.description || 'Opération effectuée sur la plateforme',
      userEmail: log.userEmail || currentUser?.email || 'admin@flyasky.com',
      userName: log.userName || currentUser?.name || 'Administrateur',
      userRole: log.userRole || currentUser?.role || 'ADMIN',
      targetResource: log.targetResource || 'Système',
      status: log.status || 'SUCCESS',
      ipAddress: log.ipAddress || undefined,
      details: log.details || undefined,
      timestamp: new Date().toISOString(),
    };

    saveLocalAuditLog(newLog);

    try {
      await api.post('/audit-logs', newLog);
    } catch {
      // Local copy already saved
    }

    return newLog;
  },

  getRecentLogs: async (): Promise<AuditLog[]> => {
    try {
      const response = await api.get<AuditLog[]>('/audit-logs/recent');
      if (response.data && response.data.length > 0) {
        return response.data;
      }
    } catch {
      // fallback
    }
    return getLocalAuditLogs().slice(0, 10);
  },
};

export const activityService = {
  getRecentActivity: async (): Promise<ApiActivityLog[]> => {
    try {
      const response = await api.get<ApiActivityLog[]>('/activity-logs');
      return response.data;
    } catch {
      try {
        const response = await api.get<ApiActivityLog[]>('/audit-logs/recent');
        return response.data.map((item: any) => ({
          id: item.id,
          eventType: item.action || item.category,
          description: item.description,
          userEmail: item.userEmail,
          timestamp: item.timestamp,
          status: item.status,
        }));
      } catch {
        const local = getLocalAuditLogs().slice(0, 5);
        return local.map((item) => ({
          id: item.id,
          eventType: item.action,
          description: item.description,
          userEmail: item.userEmail,
          timestamp: item.timestamp,
          status: item.status,
        }));
      }
    }
  },
};


