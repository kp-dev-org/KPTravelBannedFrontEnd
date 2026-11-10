import React, { useState } from 'react';
import { ShieldCheck, ShieldAlert, Search, Plane, Clock, User, FileText, PhoneCall, RefreshCw, X } from 'lucide-react';
import { useData, BannedPassenger } from '../contexts/DataContext';
import { useLanguage } from '../contexts/LanguageContext';

export default function GateCheck() {
  const { checkPassportQuick } = useData();
  const { t } = useLanguage();
  const [passportInput, setPassportInput] = useState('');
  const [flightNumber, setFlightNumber] = useState('KP 024');
  const [hasSearched, setHasSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [matchedPassenger, setMatchedPassenger] = useState<BannedPassenger | null>(null);
  const [scanHistory, setScanHistory] = useState<
    { passport: string; timestamp: string; isBanned: boolean; name?: string; flight: string }[]
  >([]);

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = passportInput.trim();
    if (!query) return;
    setSearching(true);
    try {
      const found = await checkPassportQuick(query);
      setMatchedPassenger(found);
      setHasSearched(true);
      const historyEntry = {
        passport: query.toUpperCase(),
        timestamp: new Date().toLocaleTimeString(),
        isBanned: !!found,
        name: found ? `${found.firstName} ${found.lastName}` : undefined,
        flight: flightNumber.trim().toUpperCase(),
      };
      setScanHistory((prev) => [historyEntry, ...prev.slice(0, 9)]);
    } catch (err) {
      console.error('Erreur vérification passeport:', err);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Plane className="h-6 w-6" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white">
              {t('gate.title')}
            </h1>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {t('gate.subtitle')}
          </p>
        </div>

        {/* Flight input */}
        <div className="flex items-center space-x-3 bg-white dark:bg-gray-800 p-2.5 rounded-2xl shadow-xs border border-gray-200 dark:border-gray-700">
          <Plane className="h-4 w-4 text-amber-500" />
          <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">N° Vol :</span>
          <input
            type="text"
            value={flightNumber}
            onChange={(e) => setFlightNumber(e.target.value)}
            placeholder="KP 024"
            className="text-xs font-bold text-gray-900 dark:text-white bg-transparent border-none focus:ring-0 uppercase font-mono w-24"
          />
        </div>
      </div>

      {/* Main scanner & input card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <form onSubmit={handleVerify} className="space-y-4">
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
            {t('gate.passportLabel')}
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={passportInput}
                onChange={(e) => setPassportInput(e.target.value)}
                placeholder="Ex: TG-8849201, SN-4029184..."
                className="w-full pl-11 pr-10 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400 text-base font-mono focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:bg-white dark:focus:bg-gray-700 uppercase tracking-wider transition-colors"
              />
              {passportInput && (
                <button
                  type="button"
                  onClick={() => {
                    setPassportInput('');
                    setHasSearched(false);
                    setMatchedPassenger(null);
                  }}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                  title="Effacer la saisie"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={searching}
              className="px-6 py-3 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-gray-900 font-bold rounded-xl text-sm shadow-md transition flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${searching ? 'animate-spin' : ''}`} />
              <span>{searching ? 'Interrogation API...' : t('gate.checkBtn')}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Verification Result Card */}
      {hasSearched && (
        <div className="transition-all animate-in fade-in duration-300">
          {matchedPassenger ? (
            /* RED ALERT - BANNED PASSENGER */
            <div className="bg-red-50 dark:bg-red-950/40 border-2 border-red-500 rounded-2xl p-6 sm:p-8 shadow-xl">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-red-200 dark:border-red-900">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-red-600 text-white rounded-2xl shadow-lg animate-pulse">
                    <ShieldAlert className="h-10 w-10" />
                  </div>
                  <div>
                    <span className="inline-block px-3 py-1 text-xs font-black uppercase tracking-wider rounded-lg bg-red-600 text-white shadow-sm mb-1">
                      {t('gate.banned')}
                    </span>
                    <h2 className="text-2xl font-black text-red-900 dark:text-red-200">
                      {t('gate.bannedTitle')}
                    </h2>
                    <p className="text-xs text-red-700 dark:text-red-300 mt-0.5">
                      {t('gate.bannedDesc')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => alert(`Alerte de sécurité transmise au superviseur et à la Police pour le vol ${flightNumber} !`)}
                    className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow transition flex items-center space-x-2 cursor-pointer"
                  >
                    <PhoneCall className="h-4 w-4" />
                    <span>{t('gate.alertSecurity')}</span>
                  </button>
                </div>
              </div>

              {/* Detailed ban dossier */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
                {/* Identity */}
                <div className="space-y-3 bg-white dark:bg-gray-800 p-5 rounded-xl border border-red-200 dark:border-red-900 shadow-xs">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    {t('gate.passengerInfo')}
                  </h3>
                  <div>
                    <p className="text-lg font-black text-gray-900 dark:text-white">
                      {matchedPassenger.firstName} {matchedPassenger.lastName}
                    </p>
                    <p className="text-xs text-gray-500 font-mono mt-0.5">
                      {t('gate.passportNumber')} : <span className="font-bold text-gray-800 dark:text-gray-200">{matchedPassenger.passportNumber}</span>
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {t('gate.nationalityLabel')} : <span className="font-semibold text-gray-800 dark:text-gray-200">{matchedPassenger.nationality}</span>
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {t('gate.dateOfBirthLabel')} : <span className="font-semibold text-gray-800 dark:text-gray-200">{matchedPassenger.dateOfBirth}</span>
                    </p>
                  </div>
                </div>

                {/* Ban attributes */}
                <div className="space-y-3 bg-white dark:bg-gray-800 p-5 rounded-xl border border-red-200 dark:border-red-900 shadow-xs">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    {t('gate.banDirectives')}
                  </h3>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-700">
                      <span className="text-gray-500">{t('gate.severityLabel')} :</span>
                      <span className="font-bold px-2 py-0.5 rounded bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-300">
                        {matchedPassenger.severity}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-700">
                      <span className="text-gray-500">{t('gate.banTypeLabel')} :</span>
                      <span className="font-bold text-gray-900 dark:text-white">
                        {matchedPassenger.banDuration === 'PERMANENT' ? t('gate.permanent') : t('gate.temporary')}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-700">
                      <span className="text-gray-500">{t('gate.banDateLabel')} :</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{matchedPassenger.banDate}</span>
                    </div>
                    {matchedPassenger.banEndDate && (
                      <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-700">
                        <span className="text-gray-500">{t('gate.banEndDateLabel')} :</span>
                        <span className="font-semibold text-red-600 dark:text-red-400">{matchedPassenger.banEndDate}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Reason & Notes */}
                <div className="space-y-3 bg-white dark:bg-gray-800 p-5 rounded-xl border border-red-200 dark:border-red-900 shadow-xs">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    {t('gate.reasonLabel')}
                  </h3>
                  <p className="text-xs font-medium text-red-900 dark:text-red-200 leading-relaxed bg-red-50 dark:bg-red-950/60 p-3 rounded-lg border border-red-200 dark:border-red-900">
                    {matchedPassenger.banReason}
                  </p>
                  {matchedPassenger.notes && (
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 italic">
                      {t('gate.notesLabel')} : {matchedPassenger.notes}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* GREEN CLEARANCE - PASSENGER ALLOWED */
            <div className="bg-green-50 dark:bg-green-950/40 border-2 border-green-500 rounded-2xl p-6 sm:p-8 shadow-xl text-center space-y-3">
              <div className="p-3 bg-green-600 text-white rounded-2xl shadow-lg inline-block">
                <ShieldCheck className="h-10 w-10" />
              </div>
              <h2 className="text-2xl font-black text-green-900 dark:text-green-200">
                {t('gate.allowed')}
              </h2>
              <p className="text-sm text-green-700 dark:text-green-300 max-w-lg mx-auto">
                 Le document <strong>{passportInput.toUpperCase()}</strong> {t('gate.clearanceMessage')}
              </p>
              <div className="pt-2">
                <span className="inline-block px-4 py-1.5 bg-green-200 dark:bg-green-900/60 text-green-900 dark:text-green-200 text-xs font-bold rounded-full">
                  {t('gate.clearanceValidated')}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recent scans table */}
      {scanHistory.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-4">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center space-x-2">
            <Clock className="h-4 w-4 text-amber-500" />
            <span>{t('gate.scanHistory')}</span>
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 uppercase">
                <tr>
                  <th className="px-4 py-2.5">{t('gate.timestampLabel')}</th>
                  <th className="px-4 py-2.5">{t('gate.flightLabel')}</th>
                  <th className="px-4 py-2.5">{t('gate.passportLabel')}</th>
                  <th className="px-4 py-2.5">{t('gate.passengerLabel')}</th>
                  <th className="px-4 py-2.5">{t('gate.resultLabel')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {scanHistory.map((scan, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30">
                    <td className="px-4 py-2.5 text-gray-500 font-mono">{scan.timestamp}</td>
                    <td className="px-4 py-2.5 font-bold text-gray-900 dark:text-white">{scan.flight}</td>
                    <td className="px-4 py-2.5 font-mono">{scan.passport}</td>
                    <td className="px-4 py-2.5">{scan.name || 'Passager non fiché'}</td>
                    <td className="px-4 py-2.5">
                      {scan.isBanned ? (
                        <span className="px-2 py-0.5 rounded font-bold bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300">
                          ⛔ {t('gate.bannedmessage')}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded font-semibold bg-green-100 text-green-800 dark:bg-green-950/60 dark:text-green-300">
                          ✅ {t('gate.allowedmessage')}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
