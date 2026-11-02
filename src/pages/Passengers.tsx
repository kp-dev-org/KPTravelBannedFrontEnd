import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  Search,
  Plus,
  Filter,
  Edit,
  Trash2,
  Eye,
  AlertTriangle,
  Calendar,
  Globe,
  Phone,
  FileText,
  ChevronDown,
  ChevronRight,
  User,
  Shield,
  Clock,
  Printer,
  Download,
  Upload,
  CheckCircle,
} from 'lucide-react';
import { useData, BannedPassenger } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import PassengerModal from '../components/PassengerModal';
import PassengerDetailModal from '../components/PassengerDetailModal';
import { motion } from 'framer-motion';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { useLanguage } from '../contexts/LanguageContext';
import { useSearchParams } from 'react-router-dom';
import { CreatePassengerRequest } from '../services/Api';

function Passengers() {
  const { searchPassengers, deletePassenger, addPassenger, updatePassenger, passengers } = useData();
  const { isAdmin } = useAuth();
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();

  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    severity: '',
    status: '',
    banDuration: '',
    nationality: '',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedPassengerForDetail, setSelectedPassengerForDetail] = useState<BannedPassenger | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    mode: 'create' | 'edit' | 'view';
    passenger?: any;
  }>({ isOpen: false, mode: 'create' });

  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    passengerId?: string;
  }>({ isOpen: false });

  const [printPassenger, setPrintPassenger] = useState<BannedPassenger | null>(null);
  const [exportFormat, setExportFormat] = useState<'csv' | 'excel'>('csv');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // Sync search query from URL parameter if provided
  useEffect(() => {
    const q = searchParams.get('search');
    if (q) {
      setSearchQuery(q);
    }
  }, [searchParams]);

  const filteredPassengers = searchPassengers(searchQuery, filters);
  const totalPages = Math.ceil(filteredPassengers.length / itemsPerPage) || 1;

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setCurrentPage(newPage);
  };

  const handleItemsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setItemsPerPage(parseInt(e.target.value, 10));
    setCurrentPage(1);
  };

  const paginatedPassengers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredPassengers.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredPassengers, currentPage, itemsPerPage]);

  const severityColors: Record<string, string> = {
    LOW: 'bg-green-100 text-green-800 dark:bg-green-950/60 dark:text-green-300 border-green-300',
    MEDIUM: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950/60 dark:text-yellow-300 border-yellow-300',
    HIGH: 'bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300 border-orange-300',
    CRITICAL: 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 border-red-300',
  };

  const statusColors: Record<string, string> = {
    ACTIVE: 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300',
    EXPIRED: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    UNDER_REVIEW: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300',
  };

  const handleDelete = (id: string) => {
    setDeleteModal({ isOpen: true, passengerId: id });
  };

  const confirmDelete = async () => {
    if (deleteModal.passengerId) {
      try {
        await deletePassenger(deleteModal.passengerId);
        showNotification('success', 'Passager banni supprimé avec succès.');
      } catch (err: any) {
        showNotification('error', 'Erreur lors de la suppression : ' + (err?.message || err));
      } finally {
        setDeleteModal({ isOpen: false });
      }
    }
  };

  const cancelDelete = () => {
    setDeleteModal({ isOpen: false });
  };

  const handleModalSave = async (passengerData: any) => {
    try {
      if (modalState.mode === 'create') {
        await addPassenger(passengerData);
        showNotification('success', 'Passager banni enregistré avec succès !');
      } else if (modalState.mode === 'edit' && modalState.passenger) {
        await updatePassenger(modalState.passenger.id, passengerData);
        showNotification('success', 'Passager mis à jour avec succès.');
      }
      closeModal();
    } catch (error: any) {
      showNotification('error', 'Erreur lors de l\'enregistrement : ' + error.message);
    }
  };

  const openModal = (mode: 'create' | 'edit' | 'view', passenger?: any) => {
    setModalState({ isOpen: true, mode, passenger });
  };

  const closeModal = () => {
    setModalState({ isOpen: false, mode: 'create', passenger: undefined });
  };

  const exportToCSV = () => {
    const csvContent = [
      ['Nom', 'Prénom', 'Email', 'Téléphone', 'Passeport', 'Nationalité', 'Motif Interdiction', 'Date Interdiction', 'Fin Interdiction', 'Gravité', 'Statut'].join(';'),
      ...filteredPassengers.map((p) =>
        [
          `"${p.lastName}"`,
          `"${p.firstName}"`,
          `"${p.email}"`,
          `"${p.phone}"`,
          `"${p.passportNumber}"`,
          `"${p.nationality}"`,
          `"${(p.banReason || '').replace(/"/g, '""')}"`,
          `"${p.banDate}"`,
          `"${p.banEndDate || ''}"`,
          `"${p.severity}"`,
          `"${p.status}"`,
        ].join(';')
      ),
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Passagers_Interdits_ASKY_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(
      filteredPassengers.map((p) => ({
        Nom: p.lastName,
        Prénom: p.firstName,
        Passeport: p.passportNumber,
        Nationalité: p.nationality,
        Date_Naissance: p.dateOfBirth,
        Motif_Bannissement: p.banReason,
        Date_Signalement: p.banDate,
        Type: p.banDuration,
        Echeance: p.banEndDate || 'N/A',
        Gravite: p.severity,
        Statut: p.status,
        Agent_Rapporteur: p.createdBy,
        Notes: p.notes,
      }))
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Passagers Interdits');
    XLSX.writeFile(workbook, `Registre_Passagers_Bannis_ASKY_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleExport = () => {
    if (exportFormat === 'csv') {
      exportToCSV();
    } else {
      exportToExcel();
    }
  };

  const handleClickImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const fileExtension = file.name.split('.').pop()?.toLowerCase();

    if (fileExtension === 'csv') {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          const raw = results.data as any[];
          for (const item of raw) {
            try {
              await addPassenger({
                firstName: item.firstName || item.Prénom || item.prenom || 'Inconnu',
                lastName: item.lastName || item.Nom || item.nom || 'Inconnu',
                email: item.email || item.Email || '',
                phone: item.phone || item.Téléphone || '',
                passportNumber: item.passportNumber || item.Passeport || `PASS-${Date.now()}`,
                nationality: item.nationality || item.Nationalité || 'Togo',
                dateOfBirth: item.dateOfBirth || '1990-01-01',
                banReason: item.banReason || item.Motif || 'Incident consigné',
                banDate: item.banDate || new Date().toISOString().split('T')[0],
                banDuration: (item.banDuration || 'TEMPORARY').toUpperCase() as any,
                severity: (item.severity || 'MEDIUM').toUpperCase() as any,
                notes: item.notes || '',
                status: 'ACTIVE',
              });
            } catch (err) {
              console.error('Import error for item', item, err);
            }
          }
          showNotification('success', 'Importation terminée avec succès sur le backend Spring Boot !');
        },
      });
    } else {
      showNotification('error', 'Veuillez sélectionner un fichier CSV valide.');
    }
  };

  const listNationalite = Array.from(new Set(passengers.map((p) => p.nationality))).sort();

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">
              {t('passengers.title')}
            </h1>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && (
            <>
              <button
                onClick={handleClickImport}
                className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-bold hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center space-x-1.5 transition cursor-pointer shadow-xs"
              >
                <Upload className="h-3.5 w-3.5 text-blue-500" />
                <span>{t('passenger.importer')}</span>
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".csv"
                className="hidden"
              />
            </>
          )}

          <div className="flex items-center rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 p-0.5 shadow-xs">
            <select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value as 'csv' | 'excel')}
              className="text-xs font-semibold px-2 py-1.5 bg-transparent border-none text-gray-700 dark:text-gray-200 focus:ring-0 cursor-pointer"
            >
              <option value="csv" className="dark:bg-gray-800">CSV</option>
              <option value="excel" className="dark:bg-gray-800">Excel</option>
            </select>
            <button
              onClick={handleExport}
              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 text-xs font-bold rounded-lg flex items-center space-x-1 transition cursor-pointer"
            >
              <Download className="h-3.5 w-3.5 text-amber-500" />
              <span>{t('passenger.exporter')}</span>
            </button>
          </div>

          {isAdmin && (
            <button
              onClick={() => openModal('create')}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-gray-900 font-bold rounded-xl text-xs shadow-md transition flex items-center space-x-1.5 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>{t('passengers.add')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Search and Filters card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xs border border-gray-200 dark:border-gray-700 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative flex-1 w-full">
            <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder={t('passengers.search')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-xs placeholder-gray-400 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:bg-white"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2 border rounded-xl text-xs font-bold flex items-center space-x-1.5 transition cursor-pointer ${
              showFilters || Object.values(filters).some(Boolean)
                ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200'
                : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <Filter className="h-4 w-4" />
            <span>{t('passengers.filters')}</span>
            {Object.values(filters).filter(Boolean).length > 0 && (
              <span className="h-2 w-2 rounded-full bg-amber-500" />
            )}
          </button>
        </div>

        {/* Collapsible filters */}
        {showFilters && (
          <div className="pt-4 border-t border-gray-100 dark:border-gray-700 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 animate-in fade-in">
            <div>
              <label className="block text-[11px] font-bold uppercase text-gray-500 dark:text-gray-400 mb-1">
                {t('passengers.severity')}
              </label>
              <select
                value={filters.severity}
                onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-1.5 text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">{t('passengers.all')}</option>
                <option value="CRITICAL">{t('dashboard.critical')}</option>
                <option value="HIGH">{t('dashboard.high')}</option>
                <option value="MEDIUM">{t('dashboard.medium')}</option>
                <option value="LOW">{t('dashboard.low')}</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-gray-500 dark:text-gray-400 mb-1">
                {t('passengers.status')}
              </label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-1.5 text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">{t('passengers.all')}</option>
                <option value="ACTIVE">{t('passengers.active')}</option>
                <option value="EXPIRED">{t('passengers.expired')}</option>
                <option value="UNDER_REVIEW">{t('passengers.underReview')} </option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-gray-500 dark:text-gray-400 mb-1">
                {t('passengers.banDuration')}
              </label>
              <select
                value={filters.banDuration}
                onChange={(e) => setFilters({ ...filters, banDuration: e.target.value })}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-1.5 text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">{t('passengers.all')}</option>
                <option value="PERMANENT">{t('passengers.permanent')}</option>
                <option value="TEMPORARY">{t('passengers.temporary')}</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-gray-500 dark:text-gray-400 mb-1">
                {t('passengers.nationality')}
              </label>
              <select
                value={filters.nationality}
                onChange={(e) => setFilters({ ...filters, nationality: e.target.value })}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-1.5 text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">{t('passengers.all')}</option>
                {listNationalite.map((nat) => (
                  <option key={nat} value={nat}>
                    {nat}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Results Header & Pagination Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-center px-4 py-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 text-xs">
        <span className="font-bold text-gray-900 dark:text-white mb-2 sm:mb-0">
          {filteredPassengers.length} {t('passenger.passenger')}{filteredPassengers.length > 1 ? 's' : ''} {t('passenger.pfound')}
        </span>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              {t('passengers.previous')}
            </button>
            <span className="text-gray-600 dark:text-gray-400 font-medium px-2">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              {t('passengers.next')}
            </button>
          </div>

          <div className="flex items-center space-x-1.5 pl-3 border-l border-gray-200 dark:border-gray-700">
            <span className="text-gray-500">Par page :</span>
            <select
              value={itemsPerPage}
              onChange={handleItemsPerPageChange}
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-0.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>
      </div>

      {/* Passenger Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {filteredPassengers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-left text-xs">
              <thead className="bg-gray-50 dark:bg-gray-700/60 text-gray-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-5 py-3">{t('passenger.passenger')}</th>
                  <th className="px-5 py-3">{t('passengers.passport')}</th>
                  <th className="px-5 py-3">{t('passengers.nationality')}</th>
                  <th className="px-5 py-3">{t('passengers.dateban')}</th>
                  <th className="px-5 py-3">{t('passengers.severity')}</th>
                  <th className="px-5 py-3">{t('passengers.status')}</th>
                  <th className="px-5 py-3 text-right">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {paginatedPassengers.map((passenger) => (
                  <tr
                    key={passenger.id}
                    onClick={() => setSelectedPassengerForDetail(passenger)}
                    className="cursor-pointer hover:bg-amber-50/60 dark:hover:bg-gray-700/50 transition-colors group"
                    title="Cliquez pour consulter le dossier complet"
                  >
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center font-bold text-xs uppercase shrink-0 group-hover:scale-105 transition-transform">
                          {(passenger.firstName[0] || '') + (passenger.lastName[0] || '')}
                        </div>
                        <div>
                          <div className="font-bold text-gray-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                            {passenger.firstName} {passenger.lastName}
                          </div>
                          <div className="text-[11px] text-gray-400">{passenger.email || 'Email non renseigné'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-mono font-bold text-gray-900 dark:text-white">
                      {passenger.passportNumber}
                    </td>
                    <td className="px-5 py-3.5 text-gray-700 dark:text-gray-300">
                      {passenger.nationality}
                    </td>
                    <td className="px-5 py-3.5 text-gray-500 font-mono">
                      {passenger.banDate}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span
                        className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase border ${
                          severityColors[passenger.severity] || severityColors.MEDIUM
                        }`}
                      >
                        {passenger.severity}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span
                        className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                          statusColors[passenger.status] || statusColors.ACTIVE
                        }`}
                      >
                        {passenger.status === 'ACTIVE'
                          ? t('passengers.active')
                          : passenger.status === 'EXPIRED'
                          ? t('passengers.expired')
                          : t('passengers.underReview')}
                      </span>
                    </td>
                    <td
                      className="px-5 py-3.5 text-right whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end space-x-1.5">
                        {/* Print official file button */}
                        <button
                          onClick={() => setPrintPassenger(passenger)}
                          className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg transition cursor-pointer"
                          title={t('print.officialPrintableFile')}
                        >
                          <Printer className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setSelectedPassengerForDetail(passenger)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition cursor-pointer"
                          title={t('common.view')}
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {isAdmin && (
                          <>
                            <button
                              onClick={() => openModal('edit', passenger)}
                              className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg transition cursor-pointer"
                              title="Modifier"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(passenger.id)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition cursor-pointer"
                              title="Supprimer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center space-y-3">
            <AlertTriangle className="h-10 w-10 text-gray-400 mx-auto" />
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              {t('passengers.noResults')}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
              {t('passengers.noResultsDesc')}
            </p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-xl max-w-sm w-full text-center space-y-4 border border-gray-200 dark:border-gray-700">
            <div className="p-3 bg-red-100 dark:bg-red-950/60 rounded-full w-12 h-12 flex items-center justify-center mx-auto text-red-600">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                {t('passengers.confirmsup')}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {t('passengers.supcomfirmé')}
              </p>
            </div>
            <div className="flex space-x-2 pt-2">
              <button
                onClick={confirmDelete}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 rounded-xl text-xs transition cursor-pointer"
              >
                {t('common.delete')}
              </button>
              <button
                onClick={cancelDelete}
                className="flex-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-bold py-2 rounded-xl text-xs transition cursor-pointer"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printable Official ASKY Security Dossier Modal */}
{printPassenger && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white text-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full p-8 space-y-6 max-h-[90vh] overflow-y-auto printable-dossier">
            {/* Official ASKY Header */}
            <div className="flex items-center justify-between border-b-2 border-amber-500 pb-4">
              <div className="flex items-center space-x-3">
                <img src="/logo_Asky.png" alt="ASKY Airlines" className="h-10 w-auto" />
                <div>
                  <h2 className="text-base font-black tracking-tight text-gray-900">
                    {t('print.headerTitle')}
                  </h2>
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest">
                    {t('print.headerSubtitle')}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="px-2 py-0.5 bg-red-600 text-white font-mono font-bold text-xs rounded">
                  {t('print.confidentialTag')}
                </span>
                <p className="text-[10px] text-gray-500 mt-1 font-mono">
                  {t('print.ref')} ASKY-SEC-{printPassenger.id}
                </p>
              </div>
            </div>

            {/* Dossier Body */}
            <div className="space-y-4 text-xs">
              <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 flex justify-between items-center">
                <div>
                  <p className="text-[11px] font-bold text-amber-900 uppercase">
                    {t('print.noticeTitle')}
                  </p>
                  <p className="text-sm font-black text-gray-900 mt-0.5">
                    {printPassenger.firstName} {printPassenger.lastName}
                  </p>
                </div>
                <div className="text-right font-mono">
                  <p className="text-gray-500">{t('print.passport')}</p>
                  <p className="font-bold text-sm text-gray-900">{printPassenger.passportNumber}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 rounded-xl space-y-1">
                  <p className="text-gray-500">{t('print.nationality')}</p>
                  <p className="font-bold">{printPassenger.nationality || t('detail.unspecifiedNat')}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl space-y-1">
                  <p className="text-gray-500">{t('print.dateOfBirth')}</p>
                  <p className="font-bold">{printPassenger.dateOfBirth || 'N/A'}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl space-y-1">
                  <p className="text-gray-500">{t('print.banDate')}</p>
                  <p className="font-bold">{printPassenger.banDate}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl space-y-1">
                  <p className="text-gray-500">{t('print.validity')}</p>
                  <p className="font-bold text-red-600">
                    {printPassenger.banDuration === 'PERMANENT'
                      ? t('print.permanent')
                      : printPassenger.banEndDate || t('print.temporary')}
                  </p>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-xl space-y-2 border">
                <p className="font-bold uppercase text-gray-700">{t('print.reasonsTitle')}</p>
                <p className="text-gray-800 leading-relaxed">{printPassenger.banReason}</p>
                {printPassenger.notes && (
                  <p className="text-gray-500 italic pt-1">
                    {t('print.instructionNotes')} {printPassenger.notes}
                  </p>
                )}
              </div>

              <div className="p-3 bg-yellow-50 rounded-xl border border-yellow-200 text-yellow-900 text-[11px]">
                <strong>{t('print.stationInstructionsTitle')}</strong> {t('print.stationInstructionsBody')}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-3 pt-4 border-t no-print">
              <button
                onClick={() => setPrintPassenger(null)}
                className="px-4 py-2 border rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-100 cursor-pointer"
              >
                {t('common.close')}
              </button>
              <button
                onClick={() => window.print()}
                className="px-5 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 text-gray-900 font-bold rounded-xl text-xs shadow-sm flex items-center space-x-1.5 cursor-pointer"
              >
                <Printer className="h-4 w-4" />
                <span>{t('print.printNotification')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Large categorized fluid inspection modal */}
      <PassengerDetailModal
        isOpen={Boolean(selectedPassengerForDetail)}
        onClose={() => setSelectedPassengerForDetail(null)}
        passenger={selectedPassengerForDetail}
        onEdit={(p) => openModal('edit', p)}
        onPrint={(p) => setPrintPassenger(p)}
      />

      {/* Passenger creation & edition modal */}
      <PassengerModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        onSave={handleModalSave}
        passenger={modalState.passenger}
        mode={modalState.mode}
      />

      {notification && (
        <div
          className={`fixed bottom-6 right-6 z-50 p-4 rounded-xl shadow-lg border text-sm max-w-md ${
            notification.type === 'success'
              ? 'bg-green-600 text-white border-green-700'
              : 'bg-red-600 text-white border-red-700'
          }`}
        >
          {notification.message}
        </div>
      )}
    </div>
  );
}

export default Passengers;