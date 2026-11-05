import React, { useState } from 'react';
import { Lock, ShieldAlert, KeyRound, Eye, EyeOff, ArrowRight, LogOut, RefreshCw, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

export default function SessionExpiredModal() {
  const {
    sessionExpired,
    user,
    reconnect,
    reconnectVerifyFlyAskyOtp,
    resendFlyAskyOtp,
    logout,
  } = useAuth();

  const { t } = useLanguage();

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [step, setStep] = useState<'password' | 'otp'>('password');
  const [challengeId, setChallengeId] = useState('');
  const [otpNotice, setOtpNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  if (!sessionExpired || !user) return null;

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError('Veuillez saisir votre mot de passe.');
      return;
    }
    setLoading(true);
    setError('');

    const res = await reconnect(password);
    setLoading(false);

    if (res.challengeRequired && res.challengeId) {
      setChallengeId(res.challengeId);
      setOtpNotice(res.message || `Code OTP FlyAsky envoyé à ${user.email}`);
      setStep('otp');
      setOtpCode('');
      return;
    }

    if (res.success) {
      setPassword('');
      setStep('password');
      return;
    }

    setError(res.error || 'Mot de passe incorrect.');
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode.trim()) {
      setError('Veuillez saisir le code OTP reçu par email.');
      return;
    }
    setLoading(true);
    setError('');

    const res = await reconnectVerifyFlyAskyOtp(challengeId, otpCode.trim());
    setLoading(false);

    if (res.success) {
      setPassword('');
      setOtpCode('');
      setStep('password');
      return;
    }

    setError(res.error || 'Code OTP FlyAsky invalide ou expiré.');
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || !challengeId) return;
    setLoading(true);
    setError('');
    const res = await resendFlyAskyOtp(challengeId);
    setLoading(false);
    if (res.success) {
      setOtpNotice(res.message || 'Nouveau code OTP envoyé.');
      setResendCooldown(60);
    } else {
      setError(res.message || "Erreur lors du renvoi de l'OTP.");
    }
  };

   const handleSwitchAccount = () => {
    try {
      localStorage.removeItem('passbanned_session_locked');
      localStorage.removeItem('passbanned_locked_user');
      sessionStorage.removeItem('passbanned_session_locked');
      sessionStorage.removeItem('passbanned_locked_user');
    } catch {}
    setPassword('');
    setOtpCode('');
    setStep('password');
    logout();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn"
    >
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-amber-500/30 max-w-md w-full overflow-hidden text-gray-900 dark:text-gray-100 animate-scaleIn">
        <div className="p-6 space-y-5">
          {/* Icône de cadenas */}
          <div className="text-center space-y-2">
            <div className="w-16 h-16 mx-auto rounded-full bg-amber-100 dark:bg-amber-950/60 border-2 border-amber-500/40 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-inner">
              <Lock className="w-8 h-8 animate-pulse" />
            </div>
            <h2 className="text-xl font-black tracking-tight text-gray-900 dark:text-white">
              {t("sessionExpired.title")}
            </h2>
          </div>

          {/* Carte récapitulative de l'utilisateur connecté */}
          <div className="bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700/80 rounded-2xl p-3.5 flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center font-bold text-gray-900 shrink-0 text-sm shadow">
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-full h-full rounded-full object-cover" />
              ) : (
                user.name.charAt(0).toUpperCase()
              )}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                  {user.name}
                </p>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
                  Verrouillé
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {user.email}
              </p>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 rounded-xl p-3 flex items-start space-x-2 text-xs text-red-700 dark:text-red-300 animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
              <span className="flex-1">{error}</span>
            </div>
          )}

          {/* Étape 1 : Saisie directe du mot de passe */}
          {step === 'password' && (
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5 text-left">
                  {t("sessionExpired.passwordLabel")}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t("sessionExpired.passwordPlaceholder")}
                    autoFocus
                    disabled={loading}
                    className="w-full px-3.5 py-2.5 pr-10 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 flex items-center justify-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-gray-950 font-bold rounded-xl text-sm transition shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>{t("sessionExpired.reconnecting")}</span>
                    </>
                  ) : (
                    <>
                      <span>{t("sessionExpired.reconnect")}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleSwitchAccount}
                  disabled={loading}
                  className="px-3.5 py-2.5 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition cursor-pointer"
                  title={t("sessionExpired.switchAccountTitle")}
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{t("sessionExpired.switchAccount")}</span>
                </button>
              </div>
            </form>
          )}

          {/* Étape 2 : Validation FlyAsky OTP si configuré */}
          {step === 'otp' && (
            <form onSubmit={handleOtpSubmit} className="space-y-4">
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700 rounded-xl p-3 text-xs text-amber-900 dark:text-amber-200 text-left">
                <div className="flex items-center space-x-1.5 font-bold mb-1">
                  <KeyRound className="w-4 h-4 text-amber-600" />
                  <span>{t("sessionExpired.otpTitle")}</span>
                </div>
                <p>{otpNotice}</p>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5 text-left">
                  {t("sessionExpired.otpLabel")}
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder={t("sessionExpired.otpPlaceholder")}  
                  autoFocus
                  disabled={loading}
                  className="w-full text-center text-2xl tracking-[0.4em] font-mono font-bold py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendCooldown > 0 || loading}
                  className="text-amber-600 hover:text-amber-700 dark:text-amber-400 font-semibold disabled:opacity-50 cursor-pointer"
                >
                  {resendCooldown > 0 ? `Renvoyer (${resendCooldown}s)` : 'Renvoyer le code'}
                </button>
                <button
                  type="button"
                  onClick={() => { setStep('password'); setError(''); }}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 cursor-pointer"
                >
                  ← {t("sessionExpired.backToPassword")}
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-gray-950 font-bold rounded-xl text-sm transition shadow-md disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{t("sessionExpired.validatingOtp")}</span>
                  </>
                ) : (
                  <>
                    <span>{t("sessionExpired.validateAndContinue")}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
