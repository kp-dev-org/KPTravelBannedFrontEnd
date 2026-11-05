import React from 'react';
import { Clock, ShieldAlert, ArrowRight, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';



export default function InactivityWarningModal() {
  const { t } = useLanguage();
  const { inactivityWarning, inactivityRemainingSeconds, extendSession, logout } = useAuth();

  if (!inactivityWarning) return null;

  const percentage = Math.max(0, Math.min(100, (inactivityRemainingSeconds / 60) * 100));

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn"
    >
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-amber-500/30 max-w-md w-full p-6 text-center space-y-5">
        <div className="w-16 h-16 mx-auto rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-amber-600 dark:text-amber-400">
          <Clock className="w-8 h-8 animate-pulse" />
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            {t('inactivityWarning.title')}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {t('inactivityWarning.message')}
          </p>
        </div>

        {/* Compte à rebours numérique et barre de progression */}
        <div className="space-y-2">
          <div className="text-4xl font-extrabold text-amber-600 dark:text-amber-400 font-mono tracking-tight">
            {inactivityRemainingSeconds}s
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 h-2.5 rounded-full overflow-hidden">
            <div
              className="bg-amber-500 h-full transition-all duration-1000 ease-linear rounded-full"
              style={{ width: `${percentage}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {t('inactivityWarning.description')}
          </p>
        </div>

        {/* Boutons d'action */}
        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <button
            type="button"
            onClick={extendSession}
            className="flex-1 flex items-center justify-center space-x-2 px-4 py-2.5 bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold rounded-xl text-sm transition shadow-sm hover:shadow cursor-pointer"
          >
            <span>{t('inactivityWarning.extendSession')}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={logout}
            className="flex items-center justify-center space-x-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-medium rounded-xl text-sm transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>{t('inactivityWarning.logout')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
