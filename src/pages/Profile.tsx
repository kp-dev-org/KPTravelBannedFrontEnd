import { useState } from 'react';
import { Shield, Calendar, Edit, Save, X, Eye, EyeOff, User, Lock, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import AvatarUpload from '../components/avatarUpload';
import { useLanguage } from '../contexts/LanguageContext';
import { userService, fileService } from '../services/Api';

function Profile() {
  const { user, refreshUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const { t } = useLanguage();
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [formData, setFormData] = useState({
    avatarurl: user?.avatar || '',
    name: user?.name || '',
    email: user?.email || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!user) return null;

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (formData.newPassword) {
      if (!formData.currentPassword) {
        newErrors.currentpassword = t('profile.currentPasswordRequired');
      }
      if (formData.newPassword !== formData.confirmPassword) {
        newErrors.newpassword = t('profile.passwordsDoNotMatch');
      }
      if (formData.newPassword.length < 6) {
        newErrors.newpassword = t('profile.passwordTooShort');
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAvatarChange = async (file: File) => {
    try {
      const response = await userService.uploadAvatarForNewUser(file);
      const avatarUrl = response.avatarUrl || (response as any).url;
      setFormData((prev) => ({ ...prev, avatarurl: avatarUrl }));
    } catch {
      try {
        const url = await fileService.uploadUserAvatar(file);
        setFormData((prev) => ({ ...prev, avatarurl: url }));
      } catch {
        setErrors((prev) => ({ ...prev, avatar: 'Impossible de mettre à jour l\'avatar sur le serveur' }));
      }
    }
  };

  const handleSave = async () => {
    if (validateForm()) {
      try {
        await userService.changePassword(
          user.email,
          formData.name,
          formData.avatarurl,
          formData.currentPassword || undefined,
          formData.newPassword || undefined
        );
        await refreshUser();
        setErrors({});
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
        setShowPasswordChange(false);
        setIsEditing(false);
      } catch (err: any) {
        setErrors({ currentpassword: err.response?.data?.message || 'Erreur lors de la mise à jour du profil' });
      }
    }
  };

  const handleCancel = () => {
    setFormData({
      avatarurl: user.avatar || '',
      name: user.name,
      email: user.email,
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    setIsEditing(false);
    setShowPasswordChange(false);
    setErrors({});
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-2">
          <span className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <User className="h-6 w-6" />
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white">
            {t('profile.title')}
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
          {t('profile.subtitle')}
        </p>
      </div>

      {saveSuccess && (
        <div className="p-4 rounded-xl bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-300 text-xs font-bold flex items-center space-x-2 animate-in fade-in">
          <Check className="h-4 w-4" />
          <span>Profil et identifiants enregistrés avec succès !</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main form */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                {t('profile.personalInfo')}
              </h3>
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-3.5 py-1.5 text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-300/60 dark:border-amber-700/60 rounded-xl hover:bg-amber-100 flex items-center space-x-1.5 transition cursor-pointer"
                >
                  <Edit className="h-3.5 w-3.5" />
                  <span>{t('profile.edit')}</span>
                </button>
              ) : (
                <div className="flex space-x-2">
                  <button
                    onClick={handleSave}
                    className="px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-gray-900 rounded-xl text-xs font-bold flex items-center space-x-1 transition cursor-pointer shadow-xs"
                  >
                    <Save className="h-3.5 w-3.5" />
                    <span>{t('profile.save')}</span>
                  </button>
                  <button
                    onClick={handleCancel}
                    className="px-3.5 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl text-xs hover:bg-gray-50 dark:hover:bg-gray-700 transition cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                    <span>{t('profile.cancel')}</span>
                  </button>
                </div>
              )}
            </div>

            <div className="p-6 space-y-6">
              {/* Avatar section */}
              <div className="flex items-center space-x-5">
                <AvatarUpload
                  currentAvatar={formData.avatarurl}
                  userName={user.name}
                  onAvatarChange={handleAvatarChange}
                  disabled={!isEditing}
                />
                <div>
                  <h4 className="text-xs font-bold uppercase text-gray-700 dark:text-gray-300">
                    {t('profile.picture')}
                  </h4>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                    Badge agent de sûreté ASKY Airlines (LFW/Ops).
                  </p>
                </div>
              </div>

              {/* Name and email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    {t('profile.fullName')}
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    />
                  ) : (
                    <p className="text-sm font-bold text-gray-900 dark:text-white py-1">{user.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    {t('profile.email')}
                  </label>
                  {isEditing ? (
                    <input
                      type="email"
                      value={formData.email}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-xs opacity-75"
                    />
                  ) : (
                    <p className="text-sm font-bold text-gray-900 dark:text-white py-1">{user.email}</p>
                  )}
                </div>
              </div>

              {/* Password change section */}
              {isEditing && (
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    type="button"
                    onClick={() => setShowPasswordChange(!showPasswordChange)}
                    className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center space-x-1"
                  >
                    <Lock className="h-3.5 w-3.5" />
                    <span>{showPasswordChange ? t('profil.mask') : t('profile.changePassword')}</span>
                  </button>

                  {showPasswordChange && (
                    <div className="mt-4 space-y-4 bg-gray-50 dark:bg-gray-700/40 p-4 rounded-xl border border-gray-200 dark:border-gray-700 text-xs">
                      <div>
                        <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">
                          {t('profile.currentPassword')}
                        </label>
                        <div className="relative">
                          <input
                            type={showPasswords.current ? 'text' : 'password'}
                            value={formData.currentPassword}
                            onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                            className="absolute right-3 top-2.5 text-gray-400"
                          >
                            {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        {errors.currentpassword && <p className="text-red-500 text-[11px] mt-1">{errors.currentpassword}</p>}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">
                            {t('profile.newPassword')}
                          </label>
                          <div className="relative">
                            <input
                              type={showPasswords.new ? 'text' : 'password'}
                              value={formData.newPassword}
                              onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                              className="absolute right-3 top-2.5 text-gray-400"
                            >
                              {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">
                            {t('profile.confirmPassword')}
                          </label>
                          <div className="relative">
                            <input
                              type={showPasswords.confirm ? 'text' : 'password'}
                              value={formData.confirmPassword}
                              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                              className="absolute right-3 top-2.5 text-gray-400"
                            >
                              {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>
                      </div>
                      {errors.newpassword && <p className="text-red-500 text-[11px]">{errors.newpassword}</p>}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Account Info Sidebar */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-4 text-xs">
            <h3 className="font-bold text-gray-900 dark:text-white pb-3 border-b border-gray-100 dark:border-gray-700">
              {t('profile.accountInfo')}
            </h3>

            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center text-amber-600 dark:text-amber-400">
                  <Shield className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-gray-400">Rôle de Sûreté</p>
                  <p className="font-bold text-gray-900 dark:text-white mt-0.5">
                    {user.role === 'admin' ? t('users.admin') : t('users.user')}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <Calendar className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-gray-400">{t('profile.memberSince')}</p>
                  <p className="font-semibold text-gray-900 dark:text-white mt-0.5">
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString('fr-FR') : 'Janvier 2023'}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-xl bg-green-100 dark:bg-green-950/60 flex items-center justify-center text-green-600 dark:text-green-400">
                  <Calendar className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-gray-400">{t('users.lastLogin')}</p>
                  <p className="font-semibold text-gray-900 dark:text-white mt-0.5">
                    {user.lastLogin || 'En cours'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile;