import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  passengerService,
  userService,
  activityService,
  auditService,
  ApiPassenger,
  ApiUser,
  ApiActivityLog,
  CreateUserRequest,
  getStoredApiUrl,
  pingBackend,
} from '../services/Api';
import { useAuth } from './AuthContext';

export interface BannedPassenger {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  passportNumber: string;
  passportExpiryDate?: string;
  passportIssuingCountry?: string;
  nationality: string;
  dateOfBirth: string;
  banReason: string;
  banDate: string;
  banDuration: 'PERMANENT' | 'TEMPORARY';
  banEndDate?: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  notes: string;
  createdBy: string;
  lastModified: string;
  status: 'ACTIVE' | 'EXPIRED' | 'UNDER_REVIEW';
  imageUrl?: string;
}

export interface SystemUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'super-admin';
  status: 'active' | 'inactive';
  createdAt: string;
  lastLogin: string;
  avatarurl?: string;
  mfaEnabled: boolean;
}

export interface ActivityLog {
  id: string;
  eventType: string;
  description: string;
  userEmail: string;
  timestamp: string;
  status: string;
}

export interface BackendInfo {
  url: string;
  isOnline: boolean;
  statusMessage: string;
  latencyMs?: number;
}

interface DataContextType {
  passengers: BannedPassenger[];
  users: SystemUser[];
  activityLogs: ActivityLog[];
  loading: boolean;
  error: string | null;
  backendInfo: BackendInfo;
  refreshData: () => Promise<void>;
  addPassenger: (passenger: Omit<BannedPassenger, 'id' | 'createdBy' | 'lastModified'>) => Promise<void>;
  updatePassenger: (id: string, passenger: Partial<BannedPassenger>) => Promise<void>;
  deletePassenger: (id: string) => Promise<void>;
  addUser: (user: Omit<SystemUser, 'id' | 'createdAt' | 'lastLogin'> & { password: string }) => Promise<void>;
  updateUser: (id: string, user: Partial<SystemUser> & { password?: string }) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  searchPassengers: (query: string, filters?: any) => BannedPassenger[];
  checkPassportQuick: (passportNumber: string) => Promise<BannedPassenger | null>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [passengers, setPassengers] = useState<BannedPassenger[]>([]);
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backendInfo, setBackendInfo] = useState<BackendInfo>({
    url: getStoredApiUrl(),
    isOnline: false,
    statusMessage: 'Vérification du serveur Spring Boot...',
  });

  const checkConnectivity = useCallback(async () => {
    const pingResult = await pingBackend();
    setBackendInfo({
      url: getStoredApiUrl(),
      isOnline: pingResult.online,
      statusMessage: pingResult.message,
      latencyMs: pingResult.latencyMs,
    });
  }, []);

  const convertApiPassengerToLocal = (apiPassenger: ApiPassenger): BannedPassenger => ({
    id: apiPassenger.id.toString(),
    firstName: apiPassenger.firstName,
    lastName: apiPassenger.lastName,
    email: apiPassenger.email,
    phone: apiPassenger.phone,
    passportNumber: apiPassenger.passportNumber,
    passportExpiryDate: apiPassenger.passportExpiryDate,
    passportIssuingCountry: apiPassenger.passportIssuingCountry,
    nationality: apiPassenger.nationality,
    dateOfBirth: apiPassenger.dateOfBirth,
    banReason: apiPassenger.banReason,
    banDate: apiPassenger.banDate,
    banDuration: apiPassenger.banDuration,
    banEndDate: apiPassenger.banEndDate,
    severity: apiPassenger.severity,
    notes: apiPassenger.notes || '',
    createdBy: apiPassenger.createdByEmail || apiPassenger.createdByName || '',
    lastModified: apiPassenger.updatedAt || apiPassenger.createdAt || '',
    status: apiPassenger.status,
    imageUrl: apiPassenger.imageUrl,
  });

  const convertApiUserToLocal = (apiUser: ApiUser): SystemUser => {
    const rawRole = (apiUser.role || '').toLowerCase().replace(/_/g, '-');
    const role: 'admin' | 'user' | 'super-admin' =
      rawRole === 'super-admin' ? 'super-admin' : rawRole === 'admin' ? 'admin' : 'user';
    return {
      id: apiUser.id.toString(),
      name: apiUser.name,
      email: apiUser.email,
      role,
      status: (apiUser.status?.toLowerCase() as 'active' | 'inactive') || 'active',
      createdAt: apiUser.createdAt || '',
      lastLogin: apiUser.lastLogin || '',
      avatarurl: apiUser.avatarUrl,
      mfaEnabled: apiUser.mfaEnabled || false,
    };
  };

  const convertApiActivityToLocal = (log: ApiActivityLog): ActivityLog => ({
    id: log.id ? log.id.toString() : Math.random().toString(),
    eventType: log.eventType || 'SYSTEM_EVENT',
    description: log.description || '',
    userEmail: log.userEmail || 'system@asky.com',
    timestamp: log.timestamp || new Date().toISOString(),
    status: log.status || 'INFO',
  });

  const loadInitialData = async () => {
    try {
      setError(null);
      setLoading(true);

      await checkConnectivity();

      const [passengersResponse, usersResponse, activityResponse] = await Promise.all([
        passengerService.getAllPassengers(0, 1000),
        userService.getAllUsers().catch((err) => {
          console.warn('Utilisateurs non accessibles (accès restreint admin) :', err);
          return [];
        }),
        activityService.getRecentActivity().catch((err) => {
          console.warn('Journaux d\'activité non accessibles :', err);
          return [];
        }),
      ]);

      if (passengersResponse && passengersResponse.content) {
        setPassengers(passengersResponse.content.map(convertApiPassengerToLocal));
      }

      if (Array.isArray(usersResponse)) {
        setUsers(usersResponse.map(convertApiUserToLocal));
      }

      if (Array.isArray(activityResponse)) {
        setActivityLogs(activityResponse.map(convertApiActivityToLocal));
      }
    } catch (err: any) {
      console.error('Erreur communication Spring Boot:', err);
      setError(
        err.response?.data?.message ||
        err.message ||
        'Impossible de communiquer avec le serveur Spring Boot'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadInitialData();
    } else {
      setPassengers([]);
      setUsers([]);
      setActivityLogs([]);
    }
  }, [user]);

  const refreshData = async () => {
    await loadInitialData();
  };

  const addPassenger = async (passenger: Omit<BannedPassenger, 'id' | 'createdBy' | 'lastModified'>) => {
    try {
      setError(null);
      const apiPassenger = await passengerService.createPassenger(passenger);
      const localPassenger = convertApiPassengerToLocal(apiPassenger);
      setPassengers((prev) => [localPassenger, ...prev]);

      try {
        await auditService.recordLog({
          action: 'PASSENGER_CREATED',
          category: 'PASSENGERS',
          description: `Inscription du passager interdit: ${passenger.firstName} ${passenger.lastName} (Passeport: ${passenger.passportNumber})`,
          targetResource: `Passeport ${passenger.passportNumber}`,
          status: 'SUCCESS',
          details: `Gravité: ${passenger.severity}, Durée: ${passenger.banDuration}, Motif: ${passenger.banReason}`,
        });
      } catch (err) {
        console.warn('Could not record client audit log', err);
      }
    } catch (err: any) {
      console.error('Error adding passenger to Spring Boot:', err);
      throw err;
    }
  };

  const updatePassenger = async (id: string, updates: Partial<BannedPassenger>) => {
    try {
      setError(null);
      const apiUpdates: any = {
        firstName: updates.firstName,
        lastName: updates.lastName,
        email: updates.email,
        phone: updates.phone,
        passportNumber: updates.passportNumber,
        passportExpiryDate: updates.passportExpiryDate,
        passportIssuingCountry: updates.passportIssuingCountry,
        nationality: updates.nationality,
        dateOfBirth: updates.dateOfBirth,
        banReason: updates.banReason,
        banDate: updates.banDate,
        banDuration: updates.banDuration?.toUpperCase() as any,
        banEndDate: updates.banEndDate,
        severity: updates.severity?.toUpperCase() as any,
        notes: updates.notes,
        status: updates.status?.toUpperCase() as any,
        imageUrl: updates.imageUrl,
      };

      const updatedPassenger = await passengerService.updatePassenger(parseInt(id, 10), apiUpdates);
      const localPassenger = convertApiPassengerToLocal(updatedPassenger);
      setPassengers((prev) => prev.map((p) => (p.id === id ? localPassenger : p)));

      try {
        await auditService.recordLog({
          action: 'PASSENGER_UPDATED',
          category: 'PASSENGERS',
          description: `Mise à jour du passager interdit: ${updatedPassenger.firstName} ${updatedPassenger.lastName} (ID: ${id})`,
          targetResource: `Passenger #${id}`,
          status: 'SUCCESS',
          details: `Statut: ${updatedPassenger.status}, Gravité: ${updatedPassenger.severity}`,
        });
      } catch (err) {
        console.warn('Could not record client audit log', err);
      }
    } catch (err: any) {
      console.error('Error updating passenger on Spring Boot:', err);
      throw err;
    }
  };

  const deletePassenger = async (id: string) => {
    try {
      setError(null);
      const victim = passengers.find((p) => p.id === id);
      await passengerService.deletePassenger(parseInt(id, 10));
      setPassengers((prev) => prev.filter((p) => p.id !== id));

      try {
        await auditService.recordLog({
          action: 'PASSENGER_DELETED',
          category: 'PASSENGERS',
          description: `Suppression de la fiche d'interdiction ${victim ? `${victim.firstName} ${victim.lastName} (${victim.passportNumber})` : `ID: ${id}`}`,
          targetResource: `Passenger #${id}`,
          status: 'WARNING',
        });
      } catch (err) {
        console.warn('Could not record client audit log', err);
      }
    } catch (err: any) {
      console.error('Error deleting passenger on Spring Boot:', err);
      throw err;
    }
  };

  const addUser = async (user: Omit<SystemUser, 'id' | 'createdAt' | 'lastLogin'> & { password: string }) => {
    try {
      setError(null);
      const roleUpper: 'USER' | 'ADMIN' | 'SUPER_ADMIN' =
        user.role === 'super-admin' ? 'SUPER_ADMIN' : user.role === 'admin' ? 'ADMIN' : 'USER';
      const createUserRequest: CreateUserRequest = {
        name: user.name,
        email: user.email,
        password: user.password,
        role: roleUpper,
        status: user.status.toUpperCase() as 'ACTIVE' | 'INACTIVE',
        avatarUrl: user.avatarurl,
        mfaEnabled: user.mfaEnabled,
      };
      const createdUser = await userService.createUser(createUserRequest);
      const localUser = convertApiUserToLocal(createdUser);
      setUsers((prev) => [...prev, localUser]);

      try {
        await auditService.recordLog({
          action: 'USER_CREATED',
          category: 'USERS',
          description: `Création du compte utilisateur: ${user.name} (${user.email}) - Rôle: ${roleUpper}`,
          targetResource: user.email,
          status: 'SUCCESS',
        });
      } catch (err) {
        console.warn('Could not record client audit log', err);
      }
    } catch (err: any) {
      console.error('Error adding user on Spring Boot:', err);
      throw err;
    }
  };

  const updateUser = async (id: string, updates: Partial<SystemUser> & { password?: string }) => {
    try {
      setError(null);
      const roleUpper: 'USER' | 'ADMIN' | 'SUPER_ADMIN' | undefined = updates.role
        ? updates.role === 'super-admin'
          ? 'SUPER_ADMIN'
          : updates.role === 'admin'
          ? 'ADMIN'
          : 'USER'
        : undefined;
      const apiUpdates: any = {
        name: updates.name,
        email: updates.email,
        role: roleUpper,
        status: updates.status?.toUpperCase() as 'ACTIVE' | 'INACTIVE',
        avatarUrl: updates.avatarurl,
        mfaEnabled: updates.mfaEnabled,
      };
      if (updates.password) {
        apiUpdates.password = updates.password;
      }
      const updatedUser = await userService.updateUser(parseInt(id, 10), apiUpdates);
      const localUser = convertApiUserToLocal(updatedUser);
      setUsers((prev) => prev.map((u) => (u.id === id ? localUser : u)));

      try {
        await auditService.recordLog({
          action: 'USER_UPDATED',
          category: 'USERS',
          description: `Modification de l'utilisateur: ${updatedUser.name} (${updatedUser.email})`,
          targetResource: `User #${id}`,
          status: 'SUCCESS',
        });
      } catch (err) {
        console.warn('Could not record client audit log', err);
      }
    } catch (err: any) {
      console.error('Error updating user on Spring Boot:', err);
      throw err;
    }
  };

  const deleteUser = async (id: string) => {
    try {
      setError(null);
      const victim = users.find((u) => u.id === id);
      await userService.deleteUser(parseInt(id, 10));
      setUsers((prev) => prev.filter((u) => u.id !== id));

      try {
        await auditService.recordLog({
          action: 'USER_DELETED',
          category: 'USERS',
          description: `Suppression du compte utilisateur ${victim ? `${victim.name} (${victim.email})` : `ID: ${id}`}`,
          targetResource: `User #${id}`,
          status: 'WARNING',
        });
      } catch (err) {
        console.warn('Could not record client audit log', err);
      }
    } catch (err: any) {
      console.error('Error deleting user on Spring Boot:', err);
      throw err;
    }
  };

  const searchPassengers = (query: string, filters?: any): BannedPassenger[] => {
    let results = passengers;
    if (query && query.trim()) {
      const searchTerm = query.toLowerCase().trim();
      results = results.filter(
        (p) =>
          p.firstName.toLowerCase().includes(searchTerm) ||
          p.lastName.toLowerCase().includes(searchTerm) ||
          p.email.toLowerCase().includes(searchTerm) ||
          p.passportNumber.toLowerCase().includes(searchTerm) ||
          p.nationality.toLowerCase().includes(searchTerm) ||
          p.banReason.toLowerCase().includes(searchTerm)
      );
    }

    if (filters) {
      if (filters.severity) {
        results = results.filter((p) => p.severity.toLowerCase() === filters.severity.toLowerCase());
      }
      if (filters.status) {
        results = results.filter((p) => p.status.toLowerCase() === filters.status.toLowerCase());
      }
      if (filters.banDuration) {
        results = results.filter((p) => p.banDuration.toLowerCase() === filters.banDuration.toLowerCase());
      }
      if (filters.nationality) {
        results = results.filter((p) => p.nationality.toLowerCase().includes(filters.nationality.toLowerCase()));
      }
    }

    return results;
  };

  const checkPassportQuick = async (passportNumber: string): Promise<BannedPassenger | null> => {
    if (!passportNumber || !passportNumber.trim()) return null;
    const clean = passportNumber.trim().toUpperCase();

    // Vérifie d'abord dans les passagers déjà chargés
    const localFound = passengers.find(
      (p) => p.passportNumber.trim().toUpperCase() === clean
    );
    if (localFound) return localFound;

    // Sinon interroge directement l'endpoint Spring Boot /passengers/passport/{passportNumber}
    try {
      const apiPassenger = await passengerService.getPassengerByPassport(clean);
      if (apiPassenger) {
        return convertApiPassengerToLocal(apiPassenger);
      }
    } catch {
      // 404 = passager non banni
    }
    return null;
  };

  return (
    <DataContext.Provider
      value={{
        passengers,
        users,
        activityLogs,
        addPassenger,
        updatePassenger,
        deletePassenger,
        addUser,
        updateUser,
        deleteUser,
        searchPassengers,
        checkPassportQuick,
        refreshData,
        backendInfo,
        loading,
        error,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
