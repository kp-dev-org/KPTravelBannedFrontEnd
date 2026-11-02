import React, { useState } from 'react';
import {
  X,
  Shield,
  AlertTriangle,
  User,
  Globe,
  Phone,
  Mail,
  Calendar,
  Clock,
  Printer,
  Edit,
  Copy,
  Check,
  FileText,
  ShieldAlert,
  Camera,
  Lock,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { BannedPassenger } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

interface PassengerDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  passenger: BannedPassenger | null;
  onEdit?: (passenger: BannedPassenger) => void;
  onPrint?: (passenger: BannedPassenger) => void;
}

export default function PassengerDetailModal({
  isOpen,
  onClose,
  passenger,
  onEdit,
  onPrint,
}: PassengerDetailModalProps) {
  const { isAdmin } = useAuth();
  const { t } = useLanguage();
  const [copiedPassport, setCopiedPassport] = useState(false);

  if (!isOpen || !passenger) return null;

  const handleCopyPassport = () => {
    if (!passenger?.passportNumber) return;
    navigator.clipboard.writeText(passenger.passportNumber);
    setCopiedPassport(true);
    setTimeout(() => setCopiedPassport(false), 2000);
  };

  const severityBadges: Record<string, { label: string; bg: string; text: string; border: string; desc: string }> = {
    CRITICAL: {
      label: `${t('dashboard.critical')} (Niveau 4)`,
      bg: 'bg-red-500/10 dark:bg-red-950/40',
      text: 'text-red-700 dark:text-red-300',
      border: 'border-red-300 dark:border-red-800',
      desc: t('dashboard.critDesc'),
    },
    HIGH: {
      label: `${t('dashboard.high')} (Niveau 3)`,
      bg: 'bg-orange-500/10 dark:bg-orange-950/40',
      text: 'text-orange-700 dark:text-orange-300',
      border: 'border-orange-300 dark:border-orange-800',
      desc: t('dashboard.highDesc'),
    },
    MEDIUM: {
      label: `${t('dashboard.medium')} (Niveau 2)`,
      bg: 'bg-amber-500/10 dark:bg-amber-950/40',
      text: 'text-amber-700 dark:text-amber-300',
      border: 'border-amber-300 dark:border-amber-800',
      desc: t('dashboard.medDesc'),
    },
    LOW: {
      label: `${t('dashboard.low')} (Niveau 1)`,
      bg: 'bg-emerald-500/10 dark:bg-emerald-950/40',
      text: 'text-emerald-700 dark:text-emerald-300',
      border: 'border-emerald-300 dark:border-emerald-800',
      desc: t('dashboard.lowDesc'),
    },
  };

  const statusConfig: Record<string, { label: string; colorClass: string }> = {
    ACTIVE: {
      label: t('passengers.active'),
      colorClass: 'bg-red-600 text-white shadow-xs',
    },
    EXPIRED: {
      label: t('passengers.expired'),
      colorClass: 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-300',
    },
    UNDER_REVIEW: {
      label: t('passengers.underReview'),
      colorClass: 'bg-blue-600 text-white shadow-xs',
    },
  };

  const currentSeverity = severityBadges[passenger.severity] || severityBadges.MEDIUM;
  const currentStatus = statusConfig[passenger.status] || statusConfig.ACTIVE;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
        {/* Backdrop with smooth blur */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-md"
        />

        {/* Modal Window Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          className="relative w-full max-w-4xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl shadow-2xl overflow-hidden z-10 my-auto flex flex-col max-h-[92vh]"
        >
          {/* Header Banner */}
          <div className="relative bg-gradient-to-r from-slate-900 via-amber-950 to-slate-900 text-white p-6 border-b border-amber-500/20 shrink-0">
            {/* Top Badges & Close button */}
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${currentStatus.colorClass}`}>
                  {currentStatus.label}
                </span>
              </div>

              <button
                onClick={onClose}
                className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
                title={t('common.close')}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Profile Identity & Photo Preview Header Row */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              {/* Photo Frame Placeholder */}
              <div className="relative group shrink-0">
                <div className="w-28 h-36 sm:w-32 sm:h-40 rounded-2xl bg-slate-800/90 border-2 border-amber-400/40 shadow-inner flex flex-col items-center justify-center p-2 text-center relative overflow-hidden">
                  {passenger.imageUrl ? (
                    <img src={passenger.imageUrl} alt={passenger.lastName} className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <>
                      {/* Biometric reticle corner ticks */}
                      <div className="absolute top-1.5 left-1.5 w-2.5 h-2.5 border-t-2 border-l-2 border-amber-400"></div>
                      <div className="absolute top-1.5 right-1.5 w-2.5 h-2.5 border-t-2 border-r-2 border-amber-400"></div>
                      <div className="absolute bottom-1.5 left-1.5 w-2.5 h-2.5 border-b-2 border-l-2 border-amber-400"></div>
                      <div className="absolute bottom-1.5 right-1.5 w-2.5 h-2.5 border-b-2 border-r-2 border-amber-400"></div>

                      <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center mb-1.5 border border-amber-400/20">
                        <Camera className="w-6 h-6" />
                      </div>
                      <span className="text-[10px] font-bold text-slate-200 uppercase tracking-wide">
                        {t('detail.photoTitle')}
                      </span>
                      <span className="text-[8px] text-amber-300/80 uppercase font-mono mt-0.5">
                        {t('detail.biometricFrame')}
                      </span>

                      {/* Scanning line animation */}
                      <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent animate-pulse top-1/2"></div>
                    </>
                  )}
                </div>
                <div className="absolute -bottom-2 inset-x-0 flex justify-center">
                  <span className="px-2 py-0.5 bg-slate-950 text-[9px] font-bold text-amber-400 border border-amber-500/30 rounded-md shadow-xs uppercase">
                    {passenger.imageUrl ? t('detail.photoProvided') : t('detail.notProvided')}
                  </span>
                </div>
              </div>

              {/* Passenger Main Info */}
              <div className="flex-1 space-y-2">
                <div className="flex flex-wrap items-baseline gap-2">
                  <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                    {passenger.lastName.toUpperCase()} {passenger.firstName}
                  </h2>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
                  <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-xl">
                    <span className="text-slate-400">{t('passengers.passnumder')} :</span>
                    <span className="font-mono font-bold text-amber-300 tracking-wider">
                      {passenger.passportNumber}
                    </span>
                    <button
                      onClick={handleCopyPassport}
                      className="ml-1 text-slate-400 hover:text-white transition cursor-pointer"
                      title={t('common.copy')}
                    >
                      {copiedPassport ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-xl">
                    <Globe className="w-3.5 h-3.5 text-amber-400" />
                    <span>{passenger.nationality || t('detail.unspecifiedNat')}</span>
                  </div>

                  <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-xl">
                    <Calendar className="w-3.5 h-3.5 text-amber-400" />
                    <span>{t('passengers.datebith')} : {passenger.dateOfBirth || 'N/A'}</span>
                  </div>
                </div>

                {/* Severity Alert Bar */}
                <div className={`mt-3 p-2.5 rounded-xl border flex items-center justify-between gap-3 text-xs ${currentSeverity.bg} ${currentSeverity.border} ${currentSeverity.text}`}>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-current" />
                    <span className="font-bold">{currentSeverity.label}</span>
                    <span className="hidden md:inline text-current/80">• {currentSeverity.desc}</span>
                  </div>
                  <span className="font-mono font-bold text-[10px] uppercase shrink-0">
                    {t('detail.ref')}{passenger.id}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Body Content - Information Grouped by Clean Categories (NO Form Grids) */}
          <div className="p-5 sm:p-6 space-y-6 overflow-y-auto">
            {/* Category 1: Motif & Circonstances de l'interdiction */}
            <div className="bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-amber-200/60 dark:border-amber-900/30">
                <div className="flex items-center gap-2 text-amber-900 dark:text-amber-300 font-bold text-xs uppercase tracking-wide">
                  <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span>{t('detail.reasonTitle')}</span>
                </div>
                <span className="text-[10px] font-mono text-amber-700 dark:text-amber-400">
                  {t('detail.flaggedOn')} {passenger.banDate}
                </span>
              </div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 leading-relaxed bg-white/80 dark:bg-gray-800/80 p-4 rounded-xl border border-amber-100 dark:border-amber-900/30 shadow-xs">
                {passenger.banReason}
              </p>

              {passenger.notes && (
                <div className="flex items-start gap-2 text-xs text-amber-900/80 dark:text-amber-300/80 pt-1">
                  <FileText className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                  <p className="italic">
                    <strong>{t('detail.notesTitle')}</strong> {passenger.notes}
                  </p>
                </div>
              )}
            </div>

            {/* Categorized 2-Column Display */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Category 2: Paramètres d'interdiction de transport */}
              <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 sm:p-5 space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 pb-2 border-b border-gray-200 dark:border-gray-700">
                  <Lock className="w-4 h-4 text-red-500" />
                  <span>{t('detail.termsTitle')}</span>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between py-1 border-b border-gray-150 dark:border-gray-800">
                    <span className="text-gray-500 dark:text-gray-400">{t('detail.measureType')}</span>
                    <span className="font-bold text-gray-900 dark:text-white uppercase">
                      {passenger.banDuration === 'PERMANENT' ? t('passengers.permanent') : t('passengers.temporary')}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1 border-b border-gray-150 dark:border-gray-800">
                    <span className="text-gray-500 dark:text-gray-400">{t('detail.effectiveDate')}</span>
                    <span className="font-mono font-bold text-gray-900 dark:text-white">
                      {passenger.banDate}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1 border-b border-gray-150 dark:border-gray-800">
                    <span className="text-gray-500 dark:text-gray-400">{t('detail.expiryDate')}</span>
                    <span className="font-mono font-bold text-red-600 dark:text-red-400">
                      {passenger.banDuration === 'PERMANENT' ? t('detail.nonePermanent') : passenger.banEndDate || t('detail.unspecified')}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1">
                    <span className="text-gray-500 dark:text-gray-400">{t('detail.scope')}</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {t('detail.network')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Category 3: Coordonnées & Contact */}
              <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 sm:p-5 space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 pb-2 border-b border-gray-200 dark:border-gray-700">
                  <User className="w-4 h-4 text-blue-500" />
                  <span>{t('passengers.titlepassengerdetails')}</span>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between py-1 border-b border-gray-150 dark:border-gray-800">
                    <span className="text-gray-500 dark:text-gray-400">{t('detail.lastName')}</span>
                    <span className="font-bold text-gray-900 dark:text-white">
                      {passenger.lastName.toUpperCase()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1 border-b border-gray-150 dark:border-gray-800">
                    <span className="text-gray-500 dark:text-gray-400">{t('detail.firstNames')}</span>
                    <span className="font-bold text-gray-900 dark:text-white">
                      {passenger.firstName}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1 border-b border-gray-150 dark:border-gray-800">
                    <span className="text-gray-500 dark:text-gray-400">{t('detail.phone')}</span>
                    <span className="font-mono text-gray-900 dark:text-white">
                      {passenger.phone || t('detail.unspecified')}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1">
                    <span className="text-gray-500 dark:text-gray-400">{t('detail.email')}</span>
                    <span className="font-mono text-gray-900 dark:text-white">
                      {passenger.email || t('detail.unspecified')}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Category 4: Consignes Opérationnelles pour les Équipes d'Escale */}
            <div className="bg-red-50/70 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-2xl p-4 text-xs space-y-2">
              <div className="flex items-center gap-2 font-black uppercase text-red-800 dark:text-red-300">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{t('detail.stationOrders')}</span>
              </div>
              <ul className="list-disc list-inside text-red-900/90 dark:text-red-200/90 space-y-1 pl-1">
                <li>{t('detail.order1')}</li>
                <li>{t('detail.order2')}</li>
                <li>{t('detail.order3')}</li>
              </ul>
            </div>

            {/* Category 5: Métadonnées & Traçabilité */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-200 dark:border-gray-800 text-[11px] text-gray-400 dark:text-gray-500 font-mono">
              <div className="flex items-center gap-1.5">
                <span>{t('detail.caseOfficer')}</span>
                <strong className="text-gray-600 dark:text-gray-300">{passenger.createdBy || 'Système ASKY'}</strong>
              </div>
              <div className="flex items-center gap-1.5">
                <span>{t('detail.lastUpdate')}</span>
                <span>{passenger.lastModified || passenger.banDate}</span>
              </div>
              <div>
                <span>{t('detail.internalId')} ASKY-BANNED-{passenger.id}</span>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-4 sm:p-5 bg-gray-50 dark:bg-gray-800/70 border-t border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-500" />
              <span>{t('detail.certifiedConform')}</span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              {onPrint && (
                <button
                  onClick={() => onPrint(passenger)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Printer className="w-4 h-4 text-amber-500" />
                  <span>{t('detail.printFile')}</span>
                </button>
              )}

              {isAdmin && onEdit && (
                <button
                  onClick={() => {
                    onClose();
                    onEdit(passenger);
                  }}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold border border-amber-400 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/60 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit className="w-4 h-4 text-amber-600" />
                  <span>{t('detail.editDossier')}</span>
                </button>
              )}

              <button
                onClick={onClose}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-gray-900 hover:bg-gray-800 dark:bg-gray-100 dark:hover:bg-white text-white dark:text-gray-900 transition cursor-pointer shadow-xs"
              >
                {t('detail.close')}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
