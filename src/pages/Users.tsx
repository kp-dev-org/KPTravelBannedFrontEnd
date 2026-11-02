import { useState } from 'react';
import { Search, Plus, Edit, Trash2, Shield, User, Mail, Calendar, Clock, RefreshCw } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import UserModal from '../components/UserModal';
import { motion } from 'framer-motion';
import { useLanguage } from '../contexts/LanguageContext';

import ConfirmDialog from '../components/ConfirmDialog';

function Users() {
  const { users, deleteUser, addUser, updateUser } = useData();
  const { isAdmin, resetMfa } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const { t } = useLanguage();
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    mode: 'create' | 'edit' | 'view';
    user?: any;
  }>({ isOpen: false, mode: 'create' });

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type?: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // Rediriger si pas admin
  if (!isAdmin) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-2xl p-8 text-center">
          <Shield className="h-12 w-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-red-900 dark:text-red-200 mb-2">
            {t('users.accessDenied')}
          </h2>
          <p className="text-sm text-red-700 dark:text-red-300">
            {t('users.accessDeniedDesc')}
          </p>
        </div>
      </div>
    );
  }

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = (id: string, name: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Supprimer l\'utilisateur',
      message: `Êtes-vous sûr de vouloir supprimer l'utilisateur "${name}" du système ?`,
      type: 'danger',
      onConfirm: async () => {
        try {
          await deleteUser(id);
          showNotification('success', 'Utilisateur supprimé avec succès.');
        } catch (err: any) {
          showNotification('error', 'Erreur lors de la suppression : ' + (err?.message || err));
        } finally {
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const roleColors: Record<string, string> = {
    admin: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-300',
    user: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300',
  };

  const statusColors: Record<string, string> = {
    active: 'bg-green-100 text-green-800 dark:bg-green-950/60 dark:text-green-300',
    inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  };

  const handleModalSave = async (userData: any) => {
    try {
      if (modalState.mode === 'create') {
        await addUser(userData);
        showNotification('success', 'Utilisateur créé avec succès sur Spring Boot.');
      } else if (modalState.mode === 'edit' && modalState.user) {
        await updateUser(modalState.user.id, userData);
        showNotification('success', 'Utilisateur mis à jour avec succès.');
      }
      closeModal();
    } catch (error: any) {
      showNotification('error', 'Erreur lors de l\'enregistrement : ' + (error?.message || error));
    }
  };

  const openModal = (mode: 'create' | 'edit' | 'view', user?: any) => {
    setModalState({ isOpen: true, mode, user });
  };

  const closeModal = () => {
    setModalState({ isOpen: false, mode: 'create', user: undefined });
  };

  const handleResetMFA = async (userId: string, userName: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Réinitialiser le MFA',
      message: `Voulez-vous vraiment réinitialiser l'authentification à deux facteurs pour "${userName}" ?`,
      type: 'warning',
      onConfirm: async () => {
        try {
          const ok = await resetMfa(userId);
          if (ok) {
            showNotification('success', 'Le MFA a été réinitialisé avec succès sur Spring Boot.');
          } else {
            showNotification('error', 'Échec de la réinitialisation du MFA.');
          }
        } catch (error: any) {
          showNotification('error', 'Erreur lors de la réinitialisation MFA : ' + error?.message);
        } finally {
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Shield className="h-6 w-6" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white">
              {t('users.title')}
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
            {t('users.subtitle')}
          </p>
        </div>
        <button
          onClick={() => openModal('create')}
          className="px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-gray-900 font-bold rounded-xl text-xs shadow-md transition flex items-center space-x-1.5 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>{t('users.add')}</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-xs border border-gray-200 dark:border-gray-700 flex items-center space-x-4">
          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <User className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('users.total')}</p>
            <p className="text-2xl font-black text-gray-900 dark:text-white mt-0.5">{users.length}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-xs border border-gray-200 dark:border-gray-700 flex items-center space-x-4">
          <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/60 flex items-center justify-center text-purple-600 dark:text-purple-400">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('users.admins')}</p>
            <p className="text-2xl font-black text-gray-900 dark:text-white mt-0.5">
              {users.filter((u) => u.role === 'admin').length}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-xs border border-gray-200 dark:border-gray-700 flex items-center space-x-4">
          <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-950/60 flex items-center justify-center text-green-600 dark:text-green-400">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('users.activeUsers')}</p>
            <p className="text-2xl font-black text-gray-900 dark:text-white mt-0.5">
              {users.filter((u) => u.status === 'active').length}
            </p>
          </div>
        </div>
      </div>

      {/* Search Input */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xs border border-gray-200 dark:border-gray-700 p-4">
        <div className="relative max-w-md">
          <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder={t('users.search')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-xs bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
          />
        </div>
      </div>

      {/* Users List */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
            {filteredUsers.length} {t('users.found')}
          </h3>
        </div>

        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {filteredUsers.map((item) => (
            <div
              key={item.id}
              className="p-5 hover:bg-gray-50/70 dark:hover:bg-gray-700/30 transition flex flex-col md:flex-row md:items-center md:justify-between gap-4"
            >
              <div className="flex items-center space-x-4">
                <img
                  className="h-11 w-11 rounded-full object-cover border-2 border-yellow-400 shadow-xs"
                  src={item.avatarurl || '/avatar.jpg'}
                  alt={item.name}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/avatar.jpg';
                  }}
                />
                <div>
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white">{item.name}</h4>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    <span className="flex items-center space-x-1">
                      <Mail className="h-3.5 w-3.5 text-gray-400" />
                      <span>{item.email}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Calendar className="h-3.5 w-3.5 text-gray-400" />
                      <span>Créé le {item.createdAt ? new Date(item.createdAt).toLocaleDateString('fr-FR') : '—'}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Clock className="h-3.5 w-3.5 text-gray-400" />
                      <span>Dernière connexion : {item.lastLogin || 'Jamais'}</span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2.5 self-end md:self-auto">
                <span
                  className={`px-2.5 py-0.5 text-[10px] font-bold uppercase rounded-full border ${
                    roleColors[item.role] || roleColors.user
                  }`}
                >
                  {item.role === 'admin' ? t('users.admin') : t('users.user')}
                </span>
                <span
                  className={`px-2.5 py-0.5 text-[10px] font-bold uppercase rounded-full ${
                    statusColors[item.status] || statusColors.active
                  }`}
                >
                  {item.status === 'active' ? t('passengers.active') : 'Inactif'}
                </span>
                <span
                  className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full ${
                    item.mfaEnabled
                      ? 'bg-green-100 text-green-800 dark:bg-green-950/60 dark:text-green-300'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                  }`}
                >
                  {item.mfaEnabled ? 'MFA Actif' : 'MFA Inactif'}
                </span>

                <div className="flex items-center space-x-1 pl-2 border-l border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => openModal('edit', item)}
                    className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg transition"
                    title="Modifier"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id, item.name)}
                    disabled={item.id === '1'}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition disabled:opacity-30"
                    title="Supprimer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  {item.mfaEnabled && (
                    <button
                      onClick={() => handleResetMFA(item.id, item.name)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition"
                      title="Réinitialiser MFA"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredUsers.length === 0 && (
          <div className="p-12 text-center space-y-2">
            <User className="h-10 w-10 text-gray-400 mx-auto" />
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">
              {t('users.nouser')}
            </h3>
          </div>
        )}
      </div>

      {notification && (
        <div
          className={`fixed bottom-6 right-6 z-50 p-4 rounded-xl shadow-lg border text-sm max-w-md ${
            notification.type === 'success'
              ? 'bg-green-600 text-white border-green-700'
              : 'bg-red-600 text-white border-red-700'
          }`}
        >
          {notification.message}
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
        type={confirmDialog.type}
      />

      <UserModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        onSave={handleModalSave}
        user={modalState.user}
        mode={modalState.mode}
      />
    </div>
  );
}

export default Users;