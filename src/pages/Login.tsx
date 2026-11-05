import React, { useState, useEffect } from 'react';
import { Lock, Mail, Eye, EyeOff, Server, AlertCircle, Clock, X, KeyRound, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { useLanguage } from '../contexts/LanguageContext';

function Login() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'login' | 'FLYASKY_OTP'>('login');
  // Éléments du challenge FlyAsky (Étape 2)
  const [challengeId, setChallengeId] = useState('');
  const [otpNotice, setOtpNotice] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  const { login, verifyFlyAskyOtp, resendFlyAskyOtp, inactivityMessage, clearInactivityMessage } = useAuth();

  // Compte à rebours pour le renvoi d'OTP FlyAsky
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // ÉTAPE 1 : Connexion locale (email + mot de passe dans la base locale)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const cleanEmail = email.trim().toLowerCase();
    setEmail(cleanEmail);
    const response = await login(cleanEmail, password);

    // Challenge temporaire créé côté Spring Boot -> passage à la saisie de l'OTP FlyAsky
    if (response.challengeRequired && response.challengeId) {
      setChallengeId(response.challengeId);
      setOtpNotice(response.message || `Code OTP FlyAsky envoyé à ${cleanEmail}`);
      setStep('FLYASKY_OTP');
      setCode('');
      setLoading(false);
      return;
    }
    if (response.success) {
      navigate('/');
      return;
    }
    setError(response.error || t('login.error') || 'Identifiants incorrects');
    setLoading(false);
  };

  // ÉTAPE 2 : Validation du code OTP FlyAsky (appel 100% via Spring Boot)
  const handleVerifyFlyAskyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      setError('Veuillez renseigner le code OTP reçu par e-mail.');
      return;
    }
    setLoading(true);
    setError('');

    const cleanEmail = email.trim().toLowerCase();
    const response = await verifyFlyAskyOtp(challengeId, cleanEmail, code.trim());

    if (response.success) {
      navigate('/');
    } else {
      setError(response.error || 'Code OTP FlyAsky incorrect ou expiré.');
    }

    setLoading(false);
  };

  // Renvoyer un code OTP FlyAsky via le backend Spring Boot
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || !challengeId) return;
    setLoading(true);
    setError('');

    const res = await resendFlyAskyOtp(challengeId);
    if (res.success) {
      setOtpNotice(res.message || 'Nouveau code OTP envoyé.');
      setResendCooldown(60);
    } else {
      setError(res.message || "Erreur lors du renvoi de l'OTP.");
    }

    setLoading(false);
  };

  const quit = () => {
    setStep('login');
    setError('');
    setCode('');
    setChallengeId('');
    setOtpNotice('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gray-900">
      <div className="absolute inset-0 z-0">
        <img
          src="/asky_background.jpg"
          alt="Flotte ASKY Airlines"
          className="w-full h-full object-cover object-[center_20%] -translate-y-8 scale-105 opacity-45"
          onError={(e) => {
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-black/85 via-yellow-950/40 to-black/90"></div>
      </div>

      <div className="max-w-md w-full space-y-6 p-6 relative z-10">
        {/* Entête ASKY avec logo */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center space-x-2.5 p-2 bg-white/95 rounded-2xl shadow-xl border border-white/30 mb-1">
            <img src="/image_logo.png" alt="ASKY Airlines" className="h-9 w-auto object-contain" />
            <span className="text-lg font-black tracking-tight text-gray-900 pr-1">
              Travel<span className="text-amber-500">Banned</span>
            </span>
          </div>
        </div>

        {/* Boîte de connexion */}
        <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-2xl shadow-2xl p-7 border border-white/20">
          {/* ÉTAPE 1 : Identifiants locaux */}
          {step === 'login' && (
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div>
                <label
                  htmlFor="email"
                  className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5"
                >
                  {t('login.email')}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 text-sm shadow-sm transition"
                    placeholder="agent.surete@flyasky.com"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5"
                >
                  {t('login.password')}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full pl-10 pr-10 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 text-sm shadow-sm transition"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl p-3 flex items-start space-x-2 text-sm text-red-700 dark:text-red-300">
                  <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center py-2.5 px-4 rounded-xl text-sm font-semibold text-gray-900 bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 shadow-md hover:shadow-lg disabled:opacity-50 transition-all cursor-pointer"
              >
                {loading ? t('login.signing') : t('login.signin')}
              </button>
            </form>
          )}

          {/* ÉTAPE 2 : Validation OTP FlyAsky ) */}
          {step === 'FLYASKY_OTP' && (
            <form onSubmit={handleVerifyFlyAskyOtp} className="space-y-5 animate-fadeIn">
              <div className="text-center space-y-1.5 border-b border-gray-200 dark:border-gray-700 pb-3">
                <h3 className="text-base font-bold text-gray-900 dark:text-white pt-1">
                  {t('login.otpCode')}
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-300">
                  {t('login.otpDescription')} <strong className="text-gray-900 dark:text-white">{email}</strong>
                </p>
              </div>

              <div>
                <input
                  id="otp-code"
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  autoFocus
                  required
                  maxLength={6}
                  placeholder="000000"
                  className="w-full border-2 border-yellow-400 dark:border-yellow-500 rounded-xl py-3 px-3 text-center tracking-[0.4em] text-2xl font-mono font-bold text-gray-900 dark:text-white dark:bg-gray-700 focus:outline-none focus:ring-4 focus:ring-yellow-400/20 shadow-sm"
                />
              </div>

              {error && (
                <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl p-3 flex items-start space-x-2 text-sm text-red-700 dark:text-red-300">
                  <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-2">
                <button
                  type="submit"
                  disabled={loading || code.length < 6}
                  className="w-full flex justify-center items-center py-2.5 px-4 rounded-xl text-sm font-semibold text-gray-900 bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 shadow-md hover:shadow-lg disabled:opacity-50 transition-all cursor-pointer"
                >
                  {loading ? t('login.otpValidation') : t('login.otpSubmit')}
                </button>

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={loading || resendCooldown > 0}
                    className="inline-flex items-center space-x-1.5 text-xs text-yellow-600 dark:text-yellow-400 hover:underline disabled:opacity-50 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    <span>
                      {resendCooldown > 0 ? `Renvoyer dans ${resendCooldown}s` : t('login.resendOtp')}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={quit}
                    className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 cursor-pointer"
                  >
                    ← {t('login.returnToLogin')}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default Login;
