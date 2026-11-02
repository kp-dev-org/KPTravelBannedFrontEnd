import React, { useState, useEffect } from 'react';
import { X, Save, Eye, EyeOff} from 'lucide-react';
import { SystemUser } from '../contexts/DataContext';
import { userService } from '../services/Api';
import AvatarUpload from './avatarUpload';
import { useLanguage } from '../contexts/LanguageContext';
import { motion } from 'framer-motion';


interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (user: Omit<SystemUser, 'id' | 'createdAt' | 'lastLogin'>) => void;
  user?: SystemUser;
  mode: 'create' | 'edit' | 'view';
}

function UserModal({ isOpen, onClose, onSave, user, mode }: UserModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'user' as 'admin' | 'user',
    status: 'active' as 'active' | 'inactive',
    password: '',
    confirmPassword: '',
    avatarurl: '',
    mfaEnabled: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const{t} = useLanguage()

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

    if (!formData.name.trim()) newErrors.name = 'Le nom est requis';
    if (!formData.email.trim()) newErrors.email = 'L\'email est requis';
    
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Format d\'email invalide';
    }

    if (mode === 'create') {
      if (!formData.password) newErrors.password = 'Le mot de passe est requis';
      if (formData.password && formData.password.length < 6) {
        newErrors.password = 'Le mot de passe doit contenir au moins 6 caractères';
      }
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Les mots de passe ne correspondent pas';
      }
    }

    if (mode === 'edit' && formData.password) {
      if (formData.password.length < 6) {
        newErrors.password = 'Le mot de passe doit contenir au moins 6 caractères';
      }
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Les mots de passe ne correspondent pas';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      const userData = {
        name: formData.name,
        email: formData.email,
        role: formData.role,
        status: formData.status,
        avatarurl: formData.avatarurl,
        password:formData.password,
        mfaEnabled: formData.mfaEnabled
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
        alert("opération effectuée avec succès")
        
      }
        const avatarUrl = response.avatarUrl;        
        setFormData(prev => ({ ...prev, avatarurl: avatarUrl }));
      
    } catch (error) {
      console.error('Erreur upload avatar:', error);
    }
  };

  if (!isOpen) return null;

  const isReadOnly = mode === 'view';
  const title = mode === 'create' ? 'Ajouter un utilisateur' : 
                mode === 'edit' ? 'Modifier l\'utilisateur' : 'Détails de l\'utilisateur';

  return (
    <motion.div 
    initial={{ opacity: 0, y: -30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
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
                userName={formData.name || 'Utilisateur'}
                onAvatarChange={handleAvatarChange}
                disabled={isReadOnly}
              />
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">Photo de profil</h4>
                <p className="text-xs text-gray-500">
                  {isReadOnly 
                    ? t('profile.avatar') 
                    : t('profile.uploadPicture')
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
                    <h4 className="text-sm font-medium text-gray-700 mb-2">{t("profile.fullName")}</h4>
                    <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{formData.name}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">{t('profile.email')}</h4>
                    <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{formData.email}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">{t('users.role')}</h4>
                    <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">
                      {formData.role === 'admin' ? 'Administrateur' : 'Utilisateur'}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">{t('common.status')}</h4>
                    <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">
                      {formData.status === 'active' ? 'Actif' : 'Inactif'}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              /* Mode édition - Champs de saisie */
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t("profile.fullName")}*
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-asky-orange-500 ${
                        errors.name ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('profile.email')} *
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-asky-orange-500 ${
                        errors.email ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('users.role')} *
                    </label>
                    <select
                      value={formData.role}
                      onChange={(e) => handleInputChange('role', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-asky-orange-500"
                    >
                      <option value="user">{t('nav.users')}</option>
                      <option value="admin">{t('users.admin')}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('common.status')} *
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => handleInputChange('status', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-asky-orange-500"
                    >
                      <option value="active">{t('passengers.active')}</option>
                      <option value="inactive">{t('users.inactif')}</option>
                    </select>
                  </div>
                </div>
              </>
            )}
            {/* Mot de passe */}
            {!isReadOnly && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Authentification MFA</h3>
                {/* Toggle MFA */}
                <div className="flex items-center justify-between">
                  <label className="text-sm text-gray-700">Enable/Disable MFA</label>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.mfaEnabled}
                      onChange={(e) => handleInputChange('mfaEnabled', e.target.checked)
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-green-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
                  </label>
                </div>
                <h3 className="text-lg font-medium text-gray-900 border-t pt-4">
                  {mode === 'create' ? 'Mot de passe' : 'Changer le mot de passe (optionnel)'}
                </h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {mode === 'create' ? `${t('login.password')} *`  : t('profile.newPassword')}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      className={`w-full px-3 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-asky-orange-500 ${
                        errors.password ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                  {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {mode === 'create' ? `${t('profil.confirmpass')} *` : t('profile.confirmPassword')}
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={formData.confirmPassword}
                      onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                      className={`w-full px-3 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-asky-orange-500 ${
                        errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                  {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>}
                </div>
              </div>
            )}

            {/* Informations supplémentaires en mode vue */}
            {isReadOnly && user && (
              <div className="space-y-4 border-t pt-4">
                <h3 className="text-lg font-medium text-gray-900">{t('profile.accountInfo')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">{t('users.created')}:</span>
                    <p className="text-gray-900">{new Date(user.createdAt).toLocaleDateString('fr-FR')}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">{t('users.lastLogin')}:</span>
                    <p className="text-gray-900">{new Date(user.lastLogin).toLocaleDateString('fr-FR')}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {!isReadOnly && (
            <div className="flex justify-end space-x-4 mt-8 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {t('profile.cancel')}
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-asky-brown-600 text-white rounded-lg hover:bg-asky-brown-700 transition-colors flex items-center space-x-2"
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