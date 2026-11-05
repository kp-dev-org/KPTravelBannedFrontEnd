import React, { useState, useEffect } from 'react';
import { X, Save, Eye, EyeOff} from 'lucide-react';
import { SystemUser } from '../contexts/DataContext';
import { userService } from '../services/Api';
import AvatarUpload from './avatarUpload';
import { useLanguage } from '../contexts/LanguageContext';
import { motion } from 'framer-motion';


import { useAuth } from '../contexts/AuthContext';

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (user: Omit<SystemUser, 'id' | 'createdAt' | 'lastLogin'>) => void;
  user?: SystemUser;
  mode: 'create' | 'edit' | 'view';
}

function UserModal({ isOpen, onClose, onSave, user, mode }: UserModalProps) {
  const { isSuperAdmin } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'user' as 'admin' | 'user' | 'super-admin',
    status: 'active' as 'active' | 'inactive',
    password: '',
    confirmPassword: '',
    avatarurl: '',
    mfaEnabled: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { t, language } = useLanguage();

  useEffect(() => {
    if (user && (mode === 'edit' || mode === 'view')) {
      setFormData({
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        password: '',
        confirmPassword: '',
        avatarurl: user.avatarurl || "",
        mfaEnabled:user.mfaEnabled || false,
      });
    } else if (mode === 'create') {
      setFormData({
        name: '',
        email: '',
        role: 'user',
        status: 'active',
        password: '',
        confirmPassword: '',
        avatarurl: "/avatar.jpg",
        mfaEnabled: false,
      });
    }
  }, [user, mode, isOpen]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = t('userModal.nameRequired');
    } else if (formData.name.trim().length > 100) {
      newErrors.name = t('userModal.nameMaxLength');
    }

    if (!formData.email.trim()) {
      newErrors.email = t('userModal.emailRequired');
    } else if (formData.email.trim().length > 100) {
      newErrors.email = t('userModal.emailMaxLength');
    } else if (!/\S+@\S+\.\S+/.test(formData.email.trim())) {
      newErrors.email = t('userModal.emailInvalid');
    }

    if (mode === 'create') {
      if (!formData.password) {
        newErrors.password = t('userModal.passwordRequired');
      } else if (formData.password.length < 6) {
        newErrors.password = t('userModal.passwordMinLength');
      } else if (formData.password.length > 120) {
        newErrors.password = t('userModal.passwordMaxLength');
      }

      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = t('userModal.passwordMismatch');
      }
    }

    if (mode === 'edit' && formData.password) {
      if (formData.password.length < 6) {
        newErrors.password = t('userModal.passwordMinLength');
      } else if (formData.password.length > 120) {
        newErrors.password = t('userModal.passwordMaxLength');
      }

      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = t('userModal.passwordMismatch');
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      const userData = {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        role: formData.role,
        status: formData.status,
        avatarurl: formData.avatarurl,
        password: formData.password,
        mfaEnabled: formData.mfaEnabled,
      };
      onSave(userData);
      onClose();
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleAvatarChange = async (file: File) => {
    try {
      let response;
      if (mode === 'edit' && user) {
        // Mode édition - upload avec ID utilisateur
        response = await userService.uploadAvatar(parseInt(user.id), file);  
      } else {
        // Mode création - upload avec nom unique
        response = await userService.uploadAvatarForNewUser(file);
      }
      const avatarUrl = response.avatarUrl;        
      setFormData(prev => ({ ...prev, avatarurl: avatarUrl }));
      
    } catch (error) {
      console.error('Erreur upload avatar:', error);
    }
  };

  if (!isOpen) return null;

  const isReadOnly = mode === 'view';
  const title = mode === 'create' ? t('userModal.createTitle') : 
                mode === 'edit' ? t('userModal.editTitle') : t('userModal.viewTitle');

  return (
    <motion.div 
      initial={{ opacity: 0, y: -30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-6">
            {/* Photo de profil */}
            <div className="flex items-center space-x-6">
              <AvatarUpload
                currentAvatar={formData.avatarurl}
                userName={formData.name || t('userModal.defaultUserName')}
                onAvatarChange={handleAvatarChange}
                disabled={isReadOnly}
              />
              <div>
                <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">{t('userModal.profilePhoto')}</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {isReadOnly 
                    ? t('userModal.profilePhotoViewDesc')
                    : t('userModal.profilePhotoEditDesc')
                  }
                </p>
              </div>
            </div>

            {/* Informations de base */}
            {isReadOnly ? (
              /* Mode visualisation - Affichage simple */
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t("profile.fullName")}</h4>
                    <p className="text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3 rounded-lg font-medium">{formData.name}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('profile.email')}</h4>
                    <p className="text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3 rounded-lg font-medium">{formData.email}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('users.role')}</h4>
                    <p className="text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3 rounded-lg font-semibold">
                      {formData.role === 'super-admin'
                        ? t('userModal.roleSuperAdmin')
                        : formData.role === 'admin'
                        ? t('userModal.roleAdmin')
                        : t('userModal.roleUser')}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('common.status')}</h4>
                    <p className="text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3 rounded-lg font-medium">
                      {formData.status === 'active' ? t('passengers.active') : t('users.inactif')}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              /* Mode édition - Champs de saisie */
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        {t("profile.fullName")} *
                      </label>
                      <span className="text-xs text-gray-400 dark:text-gray-400 font-mono">
                        {formData.name.length}/100
                      </span>
                    </div>
                    <input
                      type="text"
                      maxLength={100}
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className={`w-full px-3.5 py-2.5 rounded-lg border focus:outline-none focus:ring-2 focus:ring-asky-orange-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm transition-colors ${
                        errors.name ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300 dark:border-gray-700'
                      }`}
                    />
                    {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        {t('profile.email')} *
                      </label>
                      <span className="text-xs text-gray-400 dark:text-gray-400 font-mono">
                        {formData.email.length}/100
                      </span>
                    </div>
                    <input
                      type="email"
                      maxLength={100}
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className={`w-full px-3.5 py-2.5 rounded-lg border focus:outline-none focus:ring-2 focus:ring-asky-orange-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm transition-colors ${
                        errors.email ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300 dark:border-gray-700'
                      }`}
                    />
                    {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('users.role')} *
                    </label>
                    {isSuperAdmin ? (
                      <select
                        value={formData.role}
                        onChange={(e) => handleInputChange('role', e.target.value)}
                        className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-asky-orange-500 font-medium bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                      >
                        <option value="user" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">{t('userModal.roleUser')}</option>
                        <option value="admin" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">{t('userModal.roleAdmin')}</option>
                        <option value="super-admin" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">{t('userModal.roleSuperAdmin')}</option>
                      </select>
                    ) : (
                      <div>
                        <select
                          value="user"
                          disabled
                          className="w-full px-3.5 py-2.5 border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800/60 text-gray-600 dark:text-gray-400 rounded-lg cursor-not-allowed font-medium text-sm"
                        >
                          <option value="user">{t('userModal.roleUserStandard')}</option>
                        </select>
                        <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
                          {t('userModal.superAdminNotice')}
                        </p>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('common.status')} *
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => handleInputChange('status', e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-asky-orange-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                    >
                      <option value="active" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">{t('passengers.active')}</option>
                      <option value="inactive" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">{t('users.inactif')}</option>
                    </select>
                  </div>
                </div>
              </>
            )}
            {/* Mot de passe */}
            {!isReadOnly && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">{t('userModal.mfaTitle')}</h3>
                {/* Toggle MFA */}
                <div className="flex items-center justify-between">
                  <label className="text-sm text-gray-700 dark:text-gray-300">{t('userModal.mfaToggle')}</label>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.mfaEnabled}
                      onChange={(e) => handleInputChange('mfaEnabled', e.target.checked)
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 rounded-full peer peer-checked:bg-green-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 dark:after:border-gray-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
                  </label>
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white border-t border-gray-200 dark:border-gray-800 pt-4">
                  {mode === 'create' ? t('userModal.passwordTitleCreate') : t('userModal.passwordTitleEdit')}
                </h3>
                
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      {mode === 'create' ? `${t('userModal.password')} *`  : t('userModal.newPassword')}
                    </label>
                    <span className="text-xs text-gray-400 dark:text-gray-400 font-mono">
                      {formData.password.length}/120
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      maxLength={120}
                      value={formData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      className={`w-full px-3.5 py-2.5 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-asky-orange-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm transition-colors ${
                        errors.password ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300 dark:border-gray-700'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      {mode === 'create' ? `${t('userModal.confirmPassword')} *` : t('userModal.confirmNewPassword')}
                    </label>
                    <span className="text-xs text-gray-400 dark:text-gray-400 font-mono">
                      {formData.confirmPassword.length}/120
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      maxLength={120}
                      value={formData.confirmPassword}
                      onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                      className={`w-full px-3.5 py-2.5 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-asky-orange-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm transition-colors ${
                        errors.confirmPassword ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300 dark:border-gray-700'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>}
                </div>
              </div>
            )}

            {/* Informations supplémentaires en mode vue */}
            {isReadOnly && user && (
              <div className="space-y-4 border-t border-gray-200 dark:border-gray-800 pt-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">{t('profile.accountInfo')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">{t('users.created')}:</span>
                    <p className="text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700 mt-1">{new Date(user.createdAt).toLocaleDateString(language === 'en' ? 'en-US' : 'fr-FR')}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">{t('users.lastLogin')}:</span>
                    <p className="text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700 mt-1">{new Date(user.lastLogin).toLocaleDateString(language === 'en' ? 'en-US' : 'fr-FR')}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {!isReadOnly && (
            <div className="flex justify-end space-x-4 mt-8 pt-6 border-t border-gray-200 dark:border-gray-800">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors cursor-pointer"
              >
                {t('profile.cancel')}
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-asky-brown-600 hover:bg-asky-brown-700 text-white rounded-lg transition-colors flex items-center space-x-2 shadow-sm cursor-pointer"
              >
                <Save className="h-4 w-4" />
                <span>{mode === 'create' ? t('common.create') : t('profile.save')}</span>
              </button>
            </div>
          )}
        </form>
      </div>
    </motion.div>
  );
}

export default UserModal;