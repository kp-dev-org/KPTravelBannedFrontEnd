import React, { useState, useEffect, useMemo } from 'react';
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
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Select from 'react-select';
import countryList from 'react-select-country-list';
import { BannedPassenger } from '../contexts/DataContext';
import { useLanguage } from '../contexts/LanguageContext';
import { passengerService } from '../services/Api';
import { json } from 'stream/consumers';

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

export default function PassengerModal({ isOpen, onClose, onSave, passenger, mode }: PassengerModalProps) {
  const { t } = useLanguage();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    passportNumber: '',
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

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploadingImage, setUploadingImage] = useState(false);

  const countryOptions = useMemo(() => countryList().getData(), []);

  useEffect(() => {
    if (passenger && (mode === 'edit' || mode === 'view')) {
      setFormData({
        firstName: passenger.firstName || '',
        lastName: passenger.lastName || '',
        email: passenger.email || '',
        phone: passenger.phone || '',
        passportNumber: passenger.passportNumber || '',
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
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        passportNumber: '',
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
    }
  }, [passenger, mode, isOpen]);

 const handleImageFileChange = async ( e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;
  setUploadingImage(true);
  try {
    const res = await passengerService.uploadPassengerImage(file);
    if (!res.imageUrl) {
      console.error("L'URL de l'image est absente de la réponse du serveur.");
      return;
    }
    setFormData((prev) => ({...prev, imageUrl: res.imageUrl, }));
  } catch (err: any) {
    console.error("Image upload failed", err);
  } finally {
    setUploadingImage(false);
  }
};

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.firstName.trim()) newErrors.firstName = 'Le prénom est requis';
    if (!formData.lastName.trim()) newErrors.lastName = 'Le nom de famille est requis';
    if (!formData.passportNumber.trim()) newErrors.passportNumber = 'Le numéro de passeport est requis';
    if (!formData.dateOfBirth) newErrors.dateOfBirth = 'La date de naissance est requise';
    if (!formData.nationality.trim()) newErrors.nationality = 'La nationalité est requise';
    if (!formData.banReason.trim()) newErrors.banReason = 'Le motif du signalement est obligatoire';
    if (!formData.banDate) newErrors.banDate = 'La date d\'interdiction est requise';
    if (formData.banDuration === 'TEMPORARY' && !formData.banEndDate) {
      newErrors.banEndDate = 'La date de fin est obligatoire pour une interdiction temporaire';
    }
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Format d\'adresse email invalide';
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
              <div>
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
                          {uploadingImage ? t('profile.uploading') : t('profile.uploadPicture')}
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
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      {t('common.prenom')} *
                    </label>
                    <input
                      type="text"
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
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      {t('common.name')} *
                    </label>
                    <input
                      type="text"
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

                  {/* Passeport */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      {t('passengers.passnumder')} *
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: TG982341"
                      value={formData.passportNumber}
                      onChange={(e) => handleInputChange('passportNumber', e.target.value.toUpperCase())}
                      disabled={isReadOnly}
                      className={`w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl bg-gray-50 dark:bg-gray-800 border font-mono uppercase tracking-wider ${
                        errors.passportNumber
                          ? 'border-red-500 ring-1 ring-red-500'
                          : 'border-gray-300 dark:border-gray-700'
                      } text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500`}
                    />
                    {errors.passportNumber && (
                      <p className="text-red-500 text-[11px] mt-1">{errors.passportNumber}</p>
                    )}
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

                  {/* Nationalité */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      {t('passengers.nationality')} *
                    </label>
                    <Select
                      options={countryOptions}
                      value={countryOptions.find((opt) => opt.label === formData.nationality)}
                      onChange={(val: any) => handleInputChange('nationality', val ? val.label : '')}
                      isDisabled={isReadOnly}
                      placeholder="Sélectionner le pays..."
                      className="text-xs"
                      styles={{
                        control: (base) => ({
                          ...base,
                          borderRadius: '0.75rem',
                          borderColor: errors.nationality ? '#ef4444' : '#d1d5db',
                          backgroundColor: 'rgba(249, 250, 251, 1)',
                          padding: '1px',
                        }),
                      }}
                    />
                    {errors.nationality && <p className="text-red-500 text-[11px] mt-1">{errors.nationality}</p>}
                  </div>

                  {/* Téléphone */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      {t('common.phone')}
                    </label>
                    <input
                      type="tel"
                      placeholder="Ex: +228 90 00 00 00"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      disabled={isReadOnly}
                      className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  {/* Email */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      {t('common.email')}
                    </label>
                    <input
                      type="email"
                      placeholder="Ex: passager@exemple.com"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
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
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  {t('modal.officialReason')}
                </label>
                <textarea
                  rows={3}
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
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  {t('modal.confidentialNotes')}
                </label>
                <textarea
                  rows={2}
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
