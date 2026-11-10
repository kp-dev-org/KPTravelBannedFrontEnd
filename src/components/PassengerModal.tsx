import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Save,
  AlertTriangle,
  Shield,
  User,
  Calendar,
  Globe,
  Phone,
  Mail,
  FileText,
  Lock,
  Camera,
  Upload,
  CheckCircle2,
  Sparkles,
  ChevronDown,
  Search,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Select from 'react-select';
import countryList from 'react-select-country-list';
import { BannedPassenger, useData } from '../contexts/DataContext';
import { useLanguage } from '../contexts/LanguageContext';
import { passengerService } from '../services/Api';

import { useTheme } from '../contexts/ThemeContext';
import {
  COUNTRY_DIAL_CODES,
  findCountryByPhone,
  searchCountryDialCodes,
  getFlagEmoji,
  CountryDialCode,
} from '../data/countryDialCodes';

interface PassengerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (passenger: Omit<BannedPassenger, 'id' | 'createdBy' | 'lastModified'>) => void;
  passenger?: BannedPassenger;
  mode: 'create' | 'edit' | 'view';
}

const COMMON_BAN_REASONS = [
  'Violences physiques ou menaces envers le personnel navigant (PNC)',
  'Comportement indiscipliné grave et refus d\'obtempérer aux consignes de sécurité',
  'Ivresse manifeste à bord et trouble de l\'ordre public aéronautique',
  'Fraude documentaire, tentative d\'usurpation ou faux titre de voyage',
  'Tentative d\'intrusion en cockpit ou manipulation d\'équipements de secours',
];

const parsePhone = (rawPhone?: string) => {
  if (!rawPhone || !rawPhone.trim()) {
    return { dialCode: '+228', localNumber: '' };
  }
  const clean = rawPhone.trim();
  const match = findCountryByPhone(clean);
  if (match) {
    const local = clean.slice(match.code.length).trim();
    return { dialCode: match.code, localNumber: local };
  }
  if (clean.startsWith('+')) {
    const parts = clean.split(' ');
    if (parts.length > 1) {
      return { dialCode: parts[0], localNumber: parts.slice(1).join(' ').trim() };
    }
  }
  return { dialCode: '+228', localNumber: clean };
};

export default function PassengerModal({ isOpen, onClose, onSave, passenger, mode }: PassengerModalProps) {
  const { t } = useLanguage();
  const { isDarkMode } = useTheme();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    passportNumber: '',
    passportExpiryDate: '',
    passportIssuingCountry: '',
    nationality: '',
    dateOfBirth: '',
    banReason: '',
    banDate: new Date().toISOString().split('T')[0],
    banDuration: 'TEMPORARY' as 'PERMANENT' | 'TEMPORARY',
    banEndDate: '',
    severity: 'MEDIUM' as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    notes: '',
    status: 'ACTIVE' as 'ACTIVE' | 'EXPIRED' | 'UNDER_REVIEW',
    imageUrl: '',
  });

  const [phoneDialCode, setPhoneDialCode] = useState('+228');
  const [phoneLocalNumber, setPhoneLocalNumber] = useState('');
  const [isDialDropdownOpen, setIsDialDropdownOpen] = useState(false);
  const [dialSearchQuery, setDialSearchQuery] = useState('');
  const dialDropdownRef = useRef<HTMLDivElement>(null);
  const { checkPassportQuick, passengers } = useData();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploadingImage, setUploadingImage] = useState(false);

  // Vérification automatique en temps réel de l'existence du passeport
  const [passportCheckStatus, setPassportCheckStatus] = useState<{
    checking: boolean;
    exists: boolean;
    matchedPassenger?: BannedPassenger;
  }>({ checking: false, exists: false });

  // Close dial dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dialDropdownRef.current && !dialDropdownRef.current.contains(e.target as Node)) {
        setIsDialDropdownOpen(false);
      }
    };
    if (isDialDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDialDropdownOpen]);

  // Enhanced country list with flags
  const countryOptions = useMemo(() => {
    const rawData = countryList().getData();
    return rawData.map((item: { label: string; value: string }) => ({
      ...item,
      flag: getFlagEmoji(item.value),
    }));
  }, []);

  // Filtered dial code proposals for autocomplete
  const filteredDialCodes = useMemo(() => {
    return searchCountryDialCodes(dialSearchQuery);
  }, [dialSearchQuery]);

  // Active flag for current dial code
  const currentDialFlag = useMemo(() => {
    const found = findCountryByPhone(phoneDialCode);
    return found ? found.flag : '🌐';
  }, [phoneDialCode]);

  useEffect(() => {
    if (passenger && (mode === 'edit' || mode === 'view')) {
      const parsed = parsePhone(passenger.phone);
      setPhoneDialCode(parsed.dialCode);
      setDialSearchQuery(parsed.dialCode);
      setPhoneLocalNumber(parsed.localNumber);
      setFormData({
        firstName: passenger.firstName || '',
        lastName: passenger.lastName || '',
        email: passenger.email || '',
        phone: passenger.phone || '',
        passportNumber: passenger.passportNumber || '',
        passportExpiryDate: passenger.passportExpiryDate || '',
        passportIssuingCountry: passenger.passportIssuingCountry || '',
        nationality: passenger.nationality || '',
        dateOfBirth: passenger.dateOfBirth || '',
        banReason: passenger.banReason || '',
        banDate: passenger.banDate || new Date().toISOString().split('T')[0],
        banDuration: passenger.banDuration || 'TEMPORARY',
        banEndDate: passenger.banEndDate || '',
        severity: passenger.severity || 'MEDIUM',
        notes: passenger.notes || '',
        status: passenger.status || 'ACTIVE',
        imageUrl: passenger.imageUrl || '',
      });
    } else if (mode === 'create') {
      setPhoneDialCode('+228');
      setDialSearchQuery('+228');
      setPhoneLocalNumber('');
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        passportNumber: '',
        passportExpiryDate: '',
        passportIssuingCountry: '',
        nationality: 'Togo',
        dateOfBirth: '',
        banReason: '',
        banDate: new Date().toISOString().split('T')[0],
        banDuration: 'TEMPORARY',
        banEndDate: '',
        severity: 'MEDIUM',
        notes: '',
        status: 'ACTIVE',
        imageUrl: '',
      });
      setErrors({});
      setPassportCheckStatus({ checking: false, exists: false });
    }
  }, [passenger, mode, isOpen]);

  // Vérification automatique en temps réel dès que l'utilisateur saisit ou modifie le numéro de passeport
  useEffect(() => {
    const rawVal = formData.passportNumber?.trim().toUpperCase();
    if (!rawVal || rawVal.length < 2) {
      setPassportCheckStatus({ checking: false, exists: false });
      return;
    }

    // En mode édition, si le passeport est identique à celui du passager en cours, ce n'est pas un conflit
    if (mode === 'edit' && passenger && passenger.passportNumber?.trim().toUpperCase() === rawVal) {
      setPassportCheckStatus({ checking: false, exists: false });
      return;
    }

    let isSubscribed = true;
    setPassportCheckStatus((prev) => ({ ...prev, checking: true }));

    const timer = setTimeout(async () => {
      // 1. Recherche instantanée dans la liste locale des passagers
      const localMatch = passengers.find(
        (p) =>
          p.passportNumber?.trim().toUpperCase() === rawVal &&
          (!passenger || p.id !== passenger.id)
      );

      if (localMatch) {
        if (isSubscribed) {
          setPassportCheckStatus({
            checking: false,
            exists: true,
            matchedPassenger: localMatch,
          });
        }
        return;
      }

      // 2. Recherche distante vers l'API Spring Boot
      try {
        const remoteMatch = await checkPassportQuick(rawVal);
        if (!isSubscribed) return;
        if (remoteMatch && (!passenger || remoteMatch.id !== passenger.id)) {
          setPassportCheckStatus({
            checking: false,
            exists: true,
            matchedPassenger: remoteMatch,
          });
        } else {
          setPassportCheckStatus({
            checking: false,
            exists: false,
          });
        }
      } catch {
        if (isSubscribed) {
          setPassportCheckStatus({ checking: false, exists: false });
        }
      }
    }, 350);

    return () => {
      isSubscribed = false;
      clearTimeout(timer);
    };
  }, [formData.passportNumber, mode, passenger, passengers, checkPassportQuick]);

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const res = await passengerService.uploadPassengerImage(file);
      setFormData((prev) => ({ ...prev, imageUrl: res.imageUrl }));
    } catch (err: any) {
      console.error('Image upload failed', err);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSelectDialCode = (item: CountryDialCode) => {
    setPhoneDialCode(item.code);
    setDialSearchQuery(item.code);
    setIsDialDropdownOpen(false);
    const maxLocalLength = Math.max(0, 20 - item.code.length - 1);
    const trimmedLocal = phoneLocalNumber.slice(0, maxLocalLength);
    setPhoneLocalNumber(trimmedLocal);
    const combined = trimmedLocal ? `${item.code} ${trimmedLocal}`.trim() : item.code;
    setFormData((prev) => ({ ...prev, phone: combined }));
    if (errors.phone) setErrors((prev) => ({ ...prev, phone: '' }));
  };

  const handleDialCodeInput = (inputVal: string) => {
    // Keep + and digits
    let cleaned = inputVal.replace(/[^\d+]/g, '');
    if (cleaned && !cleaned.startsWith('+')) {
      cleaned = '+' + cleaned;
    }
    // Limit dial code length to max 6 chars (e.g., +1234)
    cleaned = cleaned.slice(0, 6);
    setDialSearchQuery(cleaned);
    setPhoneDialCode(cleaned || '+');
    setIsDialDropdownOpen(true);

    const codeToUse = cleaned || '+';
    const maxLocalLength = Math.max(0, 20 - codeToUse.length - 1);
    const trimmedLocal = phoneLocalNumber.slice(0, maxLocalLength);
    setPhoneLocalNumber(trimmedLocal);
    const combined = trimmedLocal ? `${codeToUse} ${trimmedLocal}`.trim() : codeToUse;
    setFormData((prev) => ({ ...prev, phone: combined }));
    if (errors.phone) setErrors((prev) => ({ ...prev, phone: '' }));
  };

  const handleLocalPhoneChange = (val: string) => {
    const sanitized = val.replace(/[^\d\s-]/g, '');
    const maxLen = Math.max(0, 20 - phoneDialCode.length - 1);
    const truncated = sanitized.slice(0, maxLen);
    setPhoneLocalNumber(truncated);
    const combined = truncated ? `${phoneDialCode} ${truncated}`.trim() : phoneDialCode;
    setFormData((prev) => ({ ...prev, phone: combined }));
    if (errors.phone) setErrors((prev) => ({ ...prev, phone: '' }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'Le prénom est requis';
    } else if (formData.firstName.trim().length > 50) {
      newErrors.firstName = 'Le prénom ne doit pas dépasser 50 caractères (limite BD)';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Le nom de famille est requis';
    } else if (formData.lastName.trim().length > 50) {
      newErrors.lastName = 'Le nom de famille ne doit pas dépasser 50 caractères (limite BD)';
    }

    if (!formData.passportNumber.trim()) {
      newErrors.passportNumber = 'Le numéro de passeport est requis';
    } else if (formData.passportNumber.trim().length > 20) {
      newErrors.passportNumber = 'Le numéro de passeport ne doit pas dépasser 20 caractères (limite BD)';
    }

    if (!formData.dateOfBirth) newErrors.dateOfBirth = 'La date de naissance est requise';

    if (!formData.nationality.trim()) {
      newErrors.nationality = 'La nationalité est requise';
    } else if (formData.nationality.trim().length > 50) {
      newErrors.nationality = 'La nationalité ne doit pas dépasser 50 caractères (limite BD)';
    }

    if (!formData.banReason.trim()) {
      newErrors.banReason = 'Le motif du signalement est obligatoire';
    } else if (formData.banReason.trim().length > 1000) {
      newErrors.banReason = 'Le motif ne doit pas dépasser 1000 caractères (limite BD)';
    }

    if (formData.banDate && !formData.banDate) {
      newErrors.banDate = 'La date d\'interdiction est requise';
    }

    if (formData.banDuration === 'TEMPORARY' && !formData.banEndDate) {
      newErrors.banEndDate = 'La date de fin est obligatoire pour une interdiction temporaire';
    }

    if (formData.phone && formData.phone.length > 20) {
      newErrors.phone = 'Le numéro de téléphone ne doit pas dépasser 20 caractères (limite BD)';
    }

    if (formData.email) {
      if (formData.email.trim().length > 100) {
        newErrors.email = 'L\'adresse email ne doit pas dépasser 100 caractères (limite BD)';
      } else if (!/\S+@\S+\.\S+/.test(formData.email.trim())) {
        newErrors.email = 'Format d\'adresse email invalide';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSave(formData);
      handleClose();
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const handleClose = () => {
    setErrors({});
    onClose();
  };

  const handleApplyPresetReason = (reason: string) => {
    setFormData((prev) => ({
      ...prev,
      banReason: prev.banReason ? `${prev.banReason} • ${reason}` : reason,
    }));
    if (errors.banReason) setErrors((prev) => ({ ...prev, banReason: '' }));
  };

  if (!isOpen) return null;

  const isReadOnly = mode === 'view';

  const severityOptions: Array<{
    key: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    label: string;
    level: string;
    activeBorder: string;
    activeBg: string;
    dotColor: string;
  }> = [
    {
      key: 'CRITICAL',
      label: t('dashboard.critical'),
      level: 'Lvl. 4',
      activeBorder: 'border-red-500 dark:border-red-500 ring-2 ring-red-500/20',
      activeBg: 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300',
      dotColor: 'bg-red-500',
    },
    {
      key: 'HIGH',
      label: t('dashboard.high'),
      level: 'Lvl. 3',
      activeBorder: 'border-orange-500 dark:border-orange-500 ring-2 ring-orange-500/20',
      activeBg: 'bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300',
      dotColor: 'bg-orange-500',
    },
    {
      key: 'MEDIUM',
      label: t('dashboard.medium'),
      level: 'Lvl. 2',
      activeBorder: 'border-yellow-500 dark:border-yellow-500 ring-2 ring-yellow-500/20',
      activeBg: 'bg-yellow-50 dark:bg-yellow-950/40 text-yellow-800 dark:text-yellow-300',
      dotColor: 'bg-yellow-500',
    },
    {
      key: 'LOW',
      label: t('dashboard.low'),
      level: 'Lvl. 1',
      activeBorder: 'border-emerald-500 dark:border-emerald-500 ring-2 ring-emerald-500/20',
      activeBg: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300',
      dotColor: 'bg-emerald-500',
    },
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={handleClose}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-md"
        />

        {/* Modal Content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 320 }}
          className="relative w-full max-w-4xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl shadow-2xl overflow-hidden z-10 my-auto flex flex-col max-h-[92vh]"
        >
          {/* Header */}
          <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-amber-950 to-slate-900 text-white flex items-center justify-between border-b border-amber-500/20 shrink-0">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-2xl bg-amber-500/20 border border-amber-400/30 text-amber-400">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">
                    Sûreté Aérienne ASKY Airlines
                  </span>
                  <span className="text-[10px] text-slate-400">• Formulaire Réglementaire</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {mode === 'create'
                    ? t('modal.createTitle')
                    : mode === 'edit'
                    ? `${t('modal.editTitle')} • ${formData.lastName} ${formData.firstName}`
                    : t('modal.viewTitle')}
                </h2>
              </div>
            </div>

            <button
              onClick={handleClose}
              className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
              title={t('common.close')}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Body */}
          <form onSubmit={handleSubmit} className="p-6 space-y-7 overflow-y-auto">
            {/* SECTION 1: État Civil & Identité */}
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-gray-800">
                <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-gray-800 dark:text-gray-200">
                  <User className="w-4 h-4 text-amber-500" />
                  <span>{t('modal.sec1')}</span>
                </div>
                <span className="text-[11px] text-gray-400">{t('modal.requiredNotice')}</span>
              </div>

              {/* Photo Frame Placeholder + Inputs row */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
                {/* Photo frame placeholder with upload capability */}
                <div className="md:col-span-3 flex flex-col items-center">
                  <div className="w-full aspect-3/4 max-w-[140px] rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 p-2 flex flex-col items-center justify-center text-center relative group hover:border-amber-400 transition overflow-hidden">
                    {formData.imageUrl ? (
                      <img src={formData.imageUrl} alt="Passenger" className="absolute inset-0 w-full h-full object-cover" />
                    ) : (
                      <>
                        <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mb-1">
                          <Camera className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-bold text-gray-700 dark:text-gray-300 uppercase">
                          {t('modal.photoPassenger')}
                        </span>
                        <span className="text-[9px] text-gray-400 mt-0.5 leading-tight">
                          {t('modal.biometricReserved')}
                        </span>
                      </>
                    )}
                    {!isReadOnly && (
                      <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white cursor-pointer transition p-2">
                        <Upload className="w-5 h-5 mb-1 text-amber-400" />
                        <span className="text-[10px] font-bold text-center">
                          {uploadingImage ? 'Téléversement...' : 'Ajouter / Modifier photo'}
                        </span>
                        <input type="file" accept="image/*" onChange={handleImageFileChange} className="hidden" />
                      </label>
                    )}
                  </div>
                </div>

                {/* Identity fields */}
                <div className="md:col-span-9 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Prénom */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                        {t('common.prenom')} *
                      </label>
                      <span className="text-[10px] text-gray-400 font-mono">
                        {formData.firstName.length}/50
                      </span>
                    </div>
                    <input
                      type="text"
                      maxLength={50}
                      placeholder="Ex: Koffi Messan"
                      value={formData.firstName}
                      onChange={(e) => handleInputChange('firstName', e.target.value)}
                      disabled={isReadOnly}
                      className={`w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl bg-gray-50 dark:bg-gray-800 border ${
                        errors.firstName
                          ? 'border-red-500 ring-1 ring-red-500'
                          : 'border-gray-300 dark:border-gray-700'
                      } text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500`}
                    />
                    {errors.firstName && <p className="text-red-500 text-[11px] mt-1">{errors.firstName}</p>}
                  </div>

                  {/* Nom */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                        {t('common.name')} *
                      </label>
                      <span className="text-[10px] text-gray-400 font-mono">
                        {formData.lastName.length}/50
                      </span>
                    </div>
                    <input
                      type="text"
                      maxLength={50}
                      placeholder="Ex: ADJIBADE"
                      value={formData.lastName}
                      onChange={(e) => handleInputChange('lastName', e.target.value)}
                      disabled={isReadOnly}
                      className={`w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl bg-gray-50 dark:bg-gray-800 border uppercase ${
                        errors.lastName
                          ? 'border-red-500 ring-1 ring-red-500'
                          : 'border-gray-300 dark:border-gray-700'
                      } text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500`}
                    />
                    {errors.lastName && <p className="text-red-500 text-[11px] mt-1">{errors.lastName}</p>}
                  </div>

                  {/* Passeport avec vérification en temps réel d'existence */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                        {t('passengers.passnumder')} *
                      </label>
                      <div className="flex items-center space-x-1.5">
                        {passportCheckStatus.checking && (
                          <span className="flex items-center space-x-1 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                            <span>Vérification...</span>
                          </span>
                        )}
                        <span className="text-[10px] text-gray-400 font-mono">
                          {formData.passportNumber.length}/20
                        </span>
                      </div>
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        maxLength={20}
                        placeholder="Ex: TG982341"
                        value={formData.passportNumber}
                        onChange={(e) => handleInputChange('passportNumber', e.target.value.toUpperCase())}
                        disabled={isReadOnly}
                        className={`w-full px-3.5 py-2 pr-10 text-xs sm:text-sm rounded-xl bg-gray-50 dark:bg-gray-800 border font-mono uppercase tracking-wider ${
                          errors.passportNumber
                            ? 'border-red-500 ring-1 ring-red-500'
                            : passportCheckStatus.exists
                            ? 'border-red-500 dark:border-red-500 ring-2 ring-red-500/20 bg-red-50/40 dark:bg-red-950/20'
                            : formData.passportNumber.trim().length >= 3 && !passportCheckStatus.checking
                            ? 'border-green-500 dark:border-green-500'
                            : 'border-gray-300 dark:border-gray-700'
                        } text-gray-900 dark:text-white focus:outline-none focus:ring-2 ${
                          passportCheckStatus.exists ? 'focus:ring-red-500' : 'focus:ring-amber-500'
                        }`}
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        {passportCheckStatus.checking ? (
                          <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                        ) : passportCheckStatus.exists ? (
                          <AlertTriangle className="w-4 h-4 text-red-500" />
                        ) : formData.passportNumber.trim().length >= 3 ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        ) : null}
                      </div>
                    </div>

                    {/* Alerte contextuelle immédiate si le passeport existe déjà */}
                    {passportCheckStatus.exists && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-1.5 p-2.5 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 text-xs flex items-start space-x-2"
                      >
                        <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
                        <div>
                          <p className="font-bold">
                             {t('passport.exists')}
                          </p>
                        </div>
                      </motion.div>
                    )}

                    {/* Message d'attestation si le passeport est nouveau et disponible */}
                    {!passportCheckStatus.exists && !passportCheckStatus.checking && formData.passportNumber.trim().length >= 3 && !errors.passportNumber && (
                      <p className="text-green-600 dark:text-green-400 text-[11px] mt-1 flex items-center space-x-1 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span>{t('passport.available')}</span>
                      </p>
                    )}

                    {errors.passportNumber && (
                      <p className="text-red-500 text-[11px] mt-1">{errors.passportNumber}</p>
                    )}
                  </div>

                  {/* Date d'expiration du passeport (facultatif) */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                        {t('passengers.passportExpiryDate') || "Date d'expiration du passeport"}
                      </label>
                      <span className="text-[10px] text-gray-400 italic">
                        ({t('passengers.optional') || 'facultatif'})
                      </span>
                    </div>
                    <input
                      type="date"
                      value={formData.passportExpiryDate}
                      onChange={(e) => handleInputChange('passportExpiryDate', e.target.value)}
                      disabled={isReadOnly}
                      className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 font-mono text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  {/* Pays de délivrance du passeport (facultatif) avec drapeaux et mode sombre */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                        {t('passengers.passportIssuingCountry') || 'Pays de délivrance'}
                      </label>
                      <span className="text-[10px] text-gray-400 italic">
                        ({t('passengers.optional') || 'facultatif'})
                      </span>
                    </div>
                    <Select
                      options={countryOptions}
                      value={countryOptions.find((opt: any) => opt.label === formData.passportIssuingCountry)}
                      onChange={(val: any) => handleInputChange('passportIssuingCountry', val ? val.label : '')}
                      isDisabled={isReadOnly}
                      isClearable={!isReadOnly}
                      placeholder="Sélectionner le pays émetteur..."
                      className="text-xs"
                      formatOptionLabel={(option: any) => (
                        <div className="flex items-center gap-2">
                          <span className="text-base leading-none">{option.flag}</span>
                          <span className="truncate">{option.label}</span>
                        </div>
                      )}
                      styles={{
                        control: (base, state) => ({
                          ...base,
                          borderRadius: '0.75rem',
                          borderColor: isDarkMode
                            ? state.isFocused
                              ? '#f59e0b'
                              : '#374151'
                            : state.isFocused
                            ? '#f59e0b'
                            : '#d1d5db',
                          backgroundColor: isDarkMode ? '#1f2937' : '#f9fafb',
                          color: isDarkMode ? '#ffffff' : '#111827',
                          padding: '1px',
                          boxShadow: state.isFocused
                            ? '0 0 0 2px rgba(245, 158, 11, 0.2)'
                            : 'none',
                          '&:hover': {
                            borderColor: '#f59e0b',
                          },
                        }),
                        singleValue: (base) => ({
                          ...base,
                          color: isDarkMode ? '#f3f4f6' : '#111827',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                        }),
                        input: (base) => ({
                          ...base,
                          color: isDarkMode ? '#ffffff' : '#111827',
                        }),
                        placeholder: (base) => ({
                          ...base,
                          color: isDarkMode ? '#9ca3af' : '#6b7280',
                        }),
                        menu: (base) => ({
                          ...base,
                          backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                          borderRadius: '0.75rem',
                          border: isDarkMode ? '1px solid #374151' : '1px solid #e5e7eb',
                          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.2)',
                          zIndex: 9999,
                          overflow: 'hidden',
                        }),
                        menuList: (base) => ({
                          ...base,
                          padding: '4px',
                          maxHeight: '220px',
                          backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                        }),
                        option: (base, state) => ({
                          ...base,
                          backgroundColor: state.isSelected
                            ? isDarkMode
                              ? '#374151'
                              : '#fef3c7'
                            : state.isFocused
                            ? isDarkMode
                              ? '#2d3748'
                              : '#fef3c7'
                            : 'transparent',
                          color: state.isSelected
                            ? isDarkMode
                              ? '#f59e0b'
                              : '#b45309'
                            : isDarkMode
                            ? '#f3f4f6'
                            : '#1f2937',
                          cursor: 'pointer',
                          borderRadius: '0.5rem',
                          padding: '6px 10px',
                          fontSize: '0.75rem',
                          '&:active': {
                            backgroundColor: isDarkMode ? '#4b5563' : '#fde68a',
                          },
                        }),
                      }}
                    />
                  </div>

                  {/* Date de naissance */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      {t('passengers.datebith')} *
                    </label>
                    <input
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                      disabled={isReadOnly}
                      className={`w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl bg-gray-50 dark:bg-gray-800 border font-mono ${
                        errors.dateOfBirth
                          ? 'border-red-500 ring-1 ring-red-500'
                          : 'border-gray-300 dark:border-gray-700'
                      } text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500`}
                    />
                    {errors.dateOfBirth && <p className="text-red-500 text-[11px] mt-1">{errors.dateOfBirth}</p>}
                  </div>

                  {/* Nationalité avec drapeau et support mode sombre */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      {t('passengers.nationality')} *
                    </label>
                    <Select
                      options={countryOptions}
                      value={countryOptions.find((opt: any) => opt.label === formData.nationality)}
                      onChange={(val: any) => handleInputChange('nationality', val ? val.label : '')}
                      isDisabled={isReadOnly}
                      placeholder="Sélectionner le pays..."
                      className="text-xs"
                      formatOptionLabel={(option: any) => (
                        <div className="flex items-center gap-2">
                          <span className="text-base leading-none">{option.flag}</span>
                          <span className="truncate">{option.label}</span>
                        </div>
                      )}
                      styles={{
                        control: (base, state) => ({
                          ...base,
                          borderRadius: '0.75rem',
                          borderColor: errors.nationality
                            ? '#ef4444'
                            : isDarkMode
                            ? state.isFocused
                              ? '#f59e0b'
                              : '#374151'
                            : state.isFocused
                            ? '#f59e0b'
                            : '#d1d5db',
                          backgroundColor: isDarkMode ? '#1f2937' : '#f9fafb',
                          color: isDarkMode ? '#ffffff' : '#111827',
                          padding: '1px',
                          boxShadow: state.isFocused
                            ? '0 0 0 2px rgba(245, 158, 11, 0.2)'
                            : 'none',
                          '&:hover': {
                            borderColor: errors.nationality ? '#ef4444' : '#f59e0b',
                          },
                        }),
                        singleValue: (base) => ({
                          ...base,
                          color: isDarkMode ? '#f3f4f6' : '#111827',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                        }),
                        input: (base) => ({
                          ...base,
                          color: isDarkMode ? '#ffffff' : '#111827',
                        }),
                        placeholder: (base) => ({
                          ...base,
                          color: isDarkMode ? '#9ca3af' : '#6b7280',
                        }),
                        menu: (base) => ({
                          ...base,
                          backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                          borderRadius: '0.75rem',
                          border: isDarkMode ? '1px solid #374151' : '1px solid #e5e7eb',
                          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.2)',
                          zIndex: 9999,
                          overflow: 'hidden',
                        }),
                        menuList: (base) => ({
                          ...base,
                          padding: '4px',
                          maxHeight: '220px',
                          backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                        }),
                        option: (base, state) => ({
                          ...base,
                          backgroundColor: state.isSelected
                            ? isDarkMode
                              ? '#374151'
                              : '#fef3c7'
                            : state.isFocused
                            ? isDarkMode
                              ? '#2d3748'
                              : '#fef3c7'
                            : 'transparent',
                          color: state.isSelected
                            ? isDarkMode
                              ? '#f59e0b'
                              : '#b45309'
                            : isDarkMode
                            ? '#f3f4f6'
                            : '#1f2937',
                          cursor: 'pointer',
                          borderRadius: '0.5rem',
                          padding: '6px 10px',
                          fontSize: '0.75rem',
                          '&:active': {
                            backgroundColor: isDarkMode ? '#4b5563' : '#fde68a',
                          },
                        }),
                      }}
                    />
                    {errors.nationality && <p className="text-red-500 text-[11px] mt-1">{errors.nationality}</p>}
                  </div>

                  {/* Téléphone avec saisie manuelle de l'indicatif & propositions en temps réel avec drapeaux */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                        {t('common.phone')}
                      </label>
                      <span className="text-[10px] text-gray-400 font-mono">
                        {formData.phone ? formData.phone.length : 0}/20
                      </span>
                    </div>
                    {isReadOnly ? (
                      <p className="px-3.5 py-2 text-xs sm:text-sm rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white">
                        {formData.phone || 'Non renseigné'}
                      </p>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        {/* Combobox pour l'indicatif international avec recherche et saisie directe */}
                        <div className="relative w-36 shrink-0" ref={dialDropdownRef}>
                          <div className="flex items-center rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 focus-within:ring-2 focus-within:ring-amber-500 focus-within:border-amber-500 px-2 py-1.5 transition-colors">
                            <span className="text-base select-none mr-1.5 shrink-0" title="Drapeau du pays">
                              {currentDialFlag}
                            </span>
                            <input
                              type="text"
                              value={dialSearchQuery}
                              onChange={(e) => handleDialCodeInput(e.target.value)}
                              onFocus={() => setIsDialDropdownOpen(true)}
                              placeholder="+228"
                              className="w-full bg-transparent text-xs font-mono font-medium text-gray-900 dark:text-white focus:outline-none placeholder-gray-400"
                              title="Saisir un indicatif pays (ex: +228, +33, +1...)"
                            />
                            <button
                              type="button"
                              tabIndex={-1}
                              onClick={() => setIsDialDropdownOpen((prev) => !prev)}
                              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 ml-1 p-0.5"
                            >
                              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isDialDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>
                          </div>

                          {/* Menu des propositions filtrées */}
                          {isDialDropdownOpen && (
                            <div className="absolute left-0 mt-1 w-64 max-h-56 overflow-y-auto rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xl z-50 py-1 divide-y divide-gray-100 dark:divide-gray-700/50">
                              <div className="px-2.5 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider flex items-center justify-between">
                                <span>Indicatifs ({filteredDialCodes.length})</span>
                                <Search className="w-3 h-3 text-gray-400" />
                              </div>
                              <div className="max-h-48 overflow-y-auto">
                                {filteredDialCodes.length === 0 ? (
                                  <div className="px-3 py-2 text-xs text-gray-400 dark:text-gray-500 text-center">
                                    Aucun pays trouvé
                                  </div>
                                ) : (
                                  filteredDialCodes.map((item) => (
                                    <button
                                      key={`${item.code}-${item.iso}`}
                                      type="button"
                                      onClick={() => handleSelectDialCode(item)}
                                      className={`w-full text-left px-2.5 py-1.5 text-xs flex items-center justify-between transition-colors hover:bg-amber-50 dark:hover:bg-amber-500/10 ${
                                        phoneDialCode === item.code
                                          ? 'bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 font-medium'
                                          : 'text-gray-800 dark:text-gray-200'
                                      }`}
                                    >
                                      <div className="flex items-center gap-2 truncate pr-2">
                                        <span className="text-base leading-none">{item.flag}</span>
                                        <span className="truncate">{item.name}</span>
                                      </div>
                                      <span className="font-mono text-[11px] font-semibold text-gray-600 dark:text-gray-300 shrink-0">
                                        {item.code}
                                      </span>
                                    </button>
                                  ))
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Champ numéro local */}
                        <input
                          type="tel"
                          placeholder="90 00 00 00"
                          value={phoneLocalNumber}
                          maxLength={Math.max(0, 20 - phoneDialCode.length - 1)}
                          onChange={(e) => handleLocalPhoneChange(e.target.value)}
                          className={`w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl bg-gray-50 dark:bg-gray-800 border ${
                            errors.phone
                              ? 'border-red-500 ring-1 ring-red-500'
                              : 'border-gray-300 dark:border-gray-700'
                          } text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500`}
                        />
                      </div>
                    )}
                    {errors.phone && <p className="text-red-500 text-[11px] mt-1">{errors.phone}</p>}
                  </div>

                  {/* Email */}
                  <div className="sm:col-span-2">
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                        {t('common.email')}
                      </label>
                      <span className="text-[10px] text-gray-400 font-mono">
                        {formData.email.length}/100
                      </span>
                    </div>
                    <input
                      type="email"
                      maxLength={100}
                      placeholder="Ex: passager@exemple.com"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value.toLowerCase())}
                      disabled={isReadOnly}
                      className={`w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl bg-gray-50 dark:bg-gray-800 border ${
                        errors.email ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
                      } text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500`}
                    />
                    {errors.email && <p className="text-red-500 text-[11px] mt-1">{errors.email}</p>}
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 2: Niveau de Gravité & Modalités Sûreté */}
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-gray-800">
                <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-gray-800 dark:text-gray-200">
                  <Lock className="w-4 h-4 text-red-500" />
                  <span>{t('modal.sec2')}</span>
                </div>
              </div>

              {/* Visual Interactive Severity Selector Cards */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  {t('modal.severityClass')}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {severityOptions.map((opt) => {
                    const isSelected = formData.severity === opt.key;
                    return (
                      <button
                        type="button"
                        key={opt.key}
                        onClick={() => handleInputChange('severity', opt.key)}
                        disabled={isReadOnly}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? `${opt.activeBorder} ${opt.activeBg} shadow-xs`
                            : 'border-gray-200 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/40 hover:bg-gray-100 dark:hover:bg-gray-800'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-mono font-bold uppercase text-gray-400">
                            {opt.level}
                          </span>
                          <span className={`w-2.5 h-2.5 rounded-full ${opt.dotColor}`} />
                        </div>
                        <span className="text-sm font-black text-gray-900 dark:text-white">
                          {opt.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Durée, Date d'effet, Date de fin, Statut */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                {/* Durée (Temporaire / Permanent) */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    {t('modal.banDurationLabel')}
                  </label>
                  <div className="grid grid-cols-2 gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
                    <button
                      type="button"
                      onClick={() => handleInputChange('banDuration', 'TEMPORARY')}
                      disabled={isReadOnly}
                      className={`py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                        formData.banDuration === 'TEMPORARY'
                          ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-xs'
                          : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      {t('passengers.temporary')}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInputChange('banDuration', 'PERMANENT')}
                      disabled={isReadOnly}
                      className={`py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                        formData.banDuration === 'PERMANENT'
                          ? 'bg-red-600 text-white shadow-xs'
                          : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      {t('passengers.permanent')}
                    </button>
                  </div>
                </div>

                {/* Date d'interdiction */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    {t('modal.effectiveDate')}
                  </label>
                  <input
                    type="date"
                    value={formData.banDate}
                    onChange={(e) => handleInputChange('banDate', e.target.value)}
                    disabled={isReadOnly}
                    className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* Date fin (si temporaire) ou Statut */}
                {formData.banDuration === 'TEMPORARY' ? (
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      {t('modal.expiryDate')}
                    </label>
                    <input
                      type="date"
                      value={formData.banEndDate}
                      onChange={(e) => handleInputChange('banEndDate', e.target.value)}
                      disabled={isReadOnly}
                      className={`w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl bg-gray-50 dark:bg-gray-800 border font-mono ${
                        errors.banEndDate
                          ? 'border-red-500 ring-1 ring-red-500'
                          : 'border-gray-300 dark:border-gray-700'
                      } text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500`}
                    />
                    {errors.banEndDate && (
                      <p className="text-red-500 text-[11px] mt-1">{errors.banEndDate}</p>
                    )}
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      {t('modal.fileStatus')}
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => handleInputChange('status', e.target.value)}
                      disabled={isReadOnly}
                      className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="ACTIVE">{t('modal.statusActive')}</option>
                      <option value="UNDER_REVIEW">{t('modal.statusReview')}</option>
                      <option value="EXPIRED">{t('modal.statusExpired')}</option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* SECTION 3: Motifs du Signalement & Circonstances */}
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-gray-800">
                <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-gray-800 dark:text-gray-200">
                  <FileText className="w-4 h-4 text-amber-500" />
                  <span>{t('modal.sec3')}</span>
                </div>
              </div>

              {/* Quick suggestions chips */}
              {!isReadOnly && (
                <div>
                  <span className="text-[11px] text-gray-500 dark:text-gray-400 font-semibold flex items-center gap-1 mb-2">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    {t('modal.suggestionsNotice')}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {COMMON_BAN_REASONS.map((reason, idx) => (
                      <button
                        type="button"
                        key={idx}
                        onClick={() => handleApplyPresetReason(reason)}
                        className="px-2.5 py-1 text-[11px] rounded-lg bg-gray-100 hover:bg-amber-100 dark:bg-gray-800 dark:hover:bg-amber-950/60 text-gray-700 dark:text-gray-300 hover:text-amber-900 dark:hover:text-amber-200 border border-gray-200 dark:border-gray-700 transition cursor-pointer text-left"
                      >
                        + {reason}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Motif principal */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                    {t('modal.officialReason')} *
                  </label>
                  <span className="text-[10px] text-gray-400 font-mono">
                    {formData.banReason.length}/1000
                  </span>
                </div>
                <textarea
                  rows={3}
                  maxLength={1000}
                  value={formData.banReason}
                  onChange={(e) => handleInputChange('banReason', e.target.value)}
                  disabled={isReadOnly}
                  placeholder="Décrivez avec précision la chronologie des faits constatés à bord ou à l'escale..."
                  className={`w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl bg-gray-50 dark:bg-gray-800 border leading-relaxed ${
                    errors.banReason
                      ? 'border-red-500 ring-1 ring-red-500'
                      : 'border-gray-300 dark:border-gray-700'
                  } text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500`}
                />
                {errors.banReason && <p className="text-red-500 text-[11px] mt-1">{errors.banReason}</p>}
              </div>

              {/* Notes supplémentaires */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                    {t('modal.confidentialNotes')}
                  </label>
                  <span className="text-[10px] text-gray-400 font-mono">
                    {formData.notes.length}/2000
                  </span>
                </div>
                <textarea
                  rows={2}
                  maxLength={2000}
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  disabled={isReadOnly}
                  placeholder="Instructions spécifiques pour les chefs d'escale, numéro de rapport de vol, etc."
                  className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            {/* Footer Form Actions */}
            {!isReadOnly && (
              <div className="pt-4 border-t border-gray-200 dark:border-gray-800 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-5 py-2.5 text-xs font-bold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition cursor-pointer"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 text-xs font-bold text-gray-900 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 rounded-xl shadow-md transition flex items-center space-x-2 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>
                    {mode === 'create' ? t('modal.saveCreate') : t('modal.saveEdit')}
                  </span>
                </button>
              </div>
            )}
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
