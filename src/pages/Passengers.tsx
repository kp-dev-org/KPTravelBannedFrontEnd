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
  FileSpreadsheet,
  X,
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
  const templateMenuRef = useRef<HTMLDivElement | null>(null);
  const [isTemplateMenuOpen, setIsTemplateMenuOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importSummaryReport, setImportSummaryReport] = useState<{
    isOpen: boolean;
    total: number;
    successCount: number;
    errorCount: number;
    failedRows: Array<{
      line: number;
      passport: string;
      name: string;
      reason: string;
    }>;
  } | null>(null);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  // Close template menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (templateMenuRef.current && !templateMenuRef.current.contains(e.target as Node)) {
        setIsTemplateMenuOpen(false);
      }
    };
    if (isTemplateMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isTemplateMenuOpen]);

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
        showNotification('success', 'Passager banni enregistré avec succès sur Spring Boot.');
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
      [
        'Nom',
        'Prénom',
        'Email',
        'Téléphone',
        'Passeport',
        'Pays_Délivrance_Passeport',
        'Expiration_Passeport',
        'Nationalité',
        'Date_Naissance',
        'Motif_Bannissement',
        'Date_Signalement',
        'Type',
        'Echeance',
        'Gravite',
        'Statut',
        'Notes',
      ].join(';'),
      ...filteredPassengers.map((p) =>
        [
          `"${p.lastName || ''}"`,
          `"${p.firstName || ''}"`,
          `"${p.email || ''}"`,
          `"${p.phone || ''}"`,
          `"${p.passportNumber || ''}"`,
          `"${p.passportIssuingCountry || ''}"`,
          `"${p.passportExpiryDate || ''}"`,
          `"${p.nationality || ''}"`,
          `"${p.dateOfBirth || ''}"`,
          `"${(p.banReason || '').replace(/"/g, '""')}"`,
          `"${p.banDate || ''}"`,
          `"${p.banDuration || 'TEMPORARY'}"`,
          `"${p.banEndDate || ''}"`,
          `"${p.severity || 'MEDIUM'}"`,
          `"${p.status || 'ACTIVE'}"`,
          `"${(p.notes || '').replace(/"/g, '""')}"`,
        ].join(';')
      ),
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Passagers_Interdits_ASKY_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(
      filteredPassengers.map((p) => ({
        Nom: p.lastName || '',
        Prénom: p.firstName || '',
        Email: p.email || '',
        Téléphone: p.phone || '',
        Passeport: p.passportNumber || '',
        Pays_Délivrance_Passeport: p.passportIssuingCountry || '',
        Expiration_Passeport: p.passportExpiryDate || '',
        Nationalité: p.nationality || '',
        Date_Naissance: p.dateOfBirth || '',
        Motif_Bannissement: p.banReason || '',
        Date_Signalement: p.banDate || '',
        Type: p.banDuration || 'TEMPORARY',
        Echeance: p.banEndDate || '',
        Gravite: p.severity || 'MEDIUM',
        Statut: p.status || 'ACTIVE',
        Notes: p.notes || '',
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

  // Normalisation robuste d'une ligne importée (CSV ou Excel)
  const normalizeRow = (rawRow: Record<string, any>): Record<string, any> => {
    const clean: Record<string, any> = {};
    for (const [key, val] of Object.entries(rawRow)) {
      if (key !== undefined && key !== null) {
        // Nettoyage de la clé (trim, minuscules, sans accents)
        const normalizedKey = key
          .trim()
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]/g, '');
        clean[normalizedKey] = val;
      }
    }
    return clean;
  };

  const getRowValue = (row: Record<string, any>, possibleKeys: string[]): string => {
    for (const key of possibleKeys) {
      const normalizedKey = key
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '');
      if (row[normalizedKey] !== undefined && row[normalizedKey] !== null) {
        const val = String(row[normalizedKey]).trim();
        if (val !== '' && val !== 'null' && val !== 'undefined' && val !== 'n/a' && val !== 'N/A') {
          return val;
        }
      }
    }
    return '';
  };

  const parseDateValue = (val: any, fallback: string = ''): string => {
    if (!val) return fallback;
    // Si c'est un serial Excel (nombre)
    if (typeof val === 'number') {
      try {
        const dateObj = XLSX.SSF.parse_date_code(val);
        if (dateObj) {
          const y = dateObj.y;
          const m = String(dateObj.m).padStart(2, '0');
          const d = String(dateObj.d).padStart(2, '0');
          return `${y}-${m}-${d}`;
        }
      } catch {}
    }
    const str = String(val).trim();
    if (!str || str === 'N/A' || str === 'n/a') return fallback;

    // Format DD/MM/YYYY ou DD-MM-YYYY
    const dmyMatch = str.match(/^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{4})$/);
    if (dmyMatch) {
      const d = dmyMatch[1].padStart(2, '0');
      const m = dmyMatch[2].padStart(2, '0');
      const y = dmyMatch[3];
      return `${y}-${m}-${d}`;
    }
    // Format YYYY-MM-DD
    const ymdMatch = str.match(/^(\d{4})[\/\.-](\d{1,2})[\/\.-](\d{1,2})$/);
    if (ymdMatch) {
      const y = ymdMatch[1];
      const m = ymdMatch[2].padStart(2, '0');
      const d = ymdMatch[3].padStart(2, '0');
      return `${y}-${m}-${d}`;
    }

    // Tentative avec Date standard si format ISO
    try {
      const parsedDate = new Date(str);
      if (!isNaN(parsedDate.getTime()) && parsedDate.getFullYear() > 1900) {
        return parsedDate.toISOString().split('T')[0];
      }
    } catch {}

    return str || fallback;
  };

  const processImportedRows = async (rawRows: any[]) => {
    if (!rawRows || rawRows.length === 0) {
      showNotification('error', 'Le fichier sélectionné est vide.');
      return;
    }

    setIsImporting(true);
    let successCount = 0;
    let errorCount = 0;
    const failedRows: Array<{
      line: number;
      passport: string;
      name: string;
      reason: string;
    }> = [];
    const today = new Date().toISOString().split('T')[0];

    for (let index = 0; index < rawRows.length; index++) {
      const item = rawRows[index];
      const row = normalizeRow(item);

      // Extraction des champs avec prise en compte des colonnes exactes de l'export et variantes
      const lastName = getRowValue(row, ['nom', 'lastname', 'familyname', 'nomdefamille', 'surname']);
      const firstName = getRowValue(row, ['prenom', 'firstname', 'givenname', 'prenoms']);
      const passportNumber = getRowValue(row, ['passeport', 'passport', 'passportnumber', 'nopasseport', 'numpasseport']).toUpperCase();
      const nationality = getRowValue(row, ['nationalite', 'nationality', 'pays', 'country']) || 'Togo';
      const banReason = getRowValue(row, ['motifbannissement', 'motifinterdiction', 'motif', 'banreason', 'reason', 'motifprincipal']) || 'Signalement consigné lors de l\'import';

      const passengerDisplayName = `${firstName || ''} ${lastName || ''}`.trim() || 'Identité non renseignée';

      // Vérification minimale des champs obligatoires
      if (!lastName && !firstName && !passportNumber) {
        // Ligne vide ou en-tête ignorée
        continue;
      }

      if (!passportNumber) {
        errorCount++;
        failedRows.push({
          line: index + 2,
          passport: 'NON RENSEIGNÉ',
          name: passengerDisplayName,
          reason: 'Numéro de passeport obligatoire manquant dans la ligne',
        });
        continue;
      }

      const email = getRowValue(row, ['email', 'mail', 'courriel']);
      const phone = getRowValue(row, ['telephone', 'phone', 'tel', 'mobile', 'numerotelephone']);
      const rawDob = getRowValue(row, ['datenaissance', 'dateofbirth', 'dob', 'datebith', 'naissance']);
      const dateOfBirth = parseDateValue(rawDob, '1990-01-01');

      const rawBanDate = getRowValue(row, ['datesignalement', 'dateinterdiction', 'bandate', 'dateban']);
      const banDate = parseDateValue(rawBanDate, today);

      const rawEndDate = getRowValue(row, ['echeance', 'dateecheance', 'fininterdiction', 'datefinban', 'banenddate']);
      const banEndDate = rawEndDate ? parseDateValue(rawEndDate) : undefined;

      const rawDuration = getRowValue(row, ['type', 'typeduree', 'banduration', 'duree']).toUpperCase();
      const banDuration: 'PERMANENT' | 'TEMPORARY' =
        rawDuration.includes('PERM') || rawDuration.includes('DEF') ? 'PERMANENT' : 'TEMPORARY';

      const rawSeverity = getRowValue(row, ['gravite', 'severity', 'niveau', 'severite']).toUpperCase();
      let severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'MEDIUM';
      if (rawSeverity.includes('CRIT')) severity = 'CRITICAL';
      else if (rawSeverity.includes('HAUT') || rawSeverity.includes('HIGH')) severity = 'HIGH';
      else if (rawSeverity.includes('FAIB') || rawSeverity.includes('BAS') || rawSeverity.includes('LOW')) severity = 'LOW';

      const rawStatus = getRowValue(row, ['statut', 'status']).toUpperCase();
      let status: 'ACTIVE' | 'EXPIRED' | 'UNDER_REVIEW' = 'ACTIVE';
      if (rawStatus.includes('EXP')) status = 'EXPIRED';
      else if (rawStatus.includes('REV') || rawStatus.includes('EXAM')) status = 'UNDER_REVIEW';

      const notes = getRowValue(row, ['notes', 'commentaires', 'observations', 'instructions', 'rapport']);

      const rawPassportExpiry = getRowValue(row, ['expirationpasseport', 'passportexpiry', 'passportexpirydate', 'dateexpirationpasseport', 'datexp']);
      const passportExpiryDate = rawPassportExpiry ? parseDateValue(rawPassportExpiry) : undefined;

      const passportIssuingCountry = getRowValue(row, ['paysdelivrancepasseport', 'paysdelivrance', 'passportissuingcountry', 'emetteur', 'paysemetteur']);

      try {
        await addPassenger({
          firstName: firstName || 'Inconnu',
          lastName: lastName || 'Inconnu',
          email: email || '',
          phone: phone || '',
          passportNumber: passportNumber,
          passportExpiryDate: passportExpiryDate || undefined,
          passportIssuingCountry: passportIssuingCountry || undefined,
          nationality: nationality,
          dateOfBirth: dateOfBirth,
          banReason: banReason,
          banDate: banDate,
          banDuration: banDuration,
          banEndDate: banDuration === 'TEMPORARY' ? (banEndDate || undefined) : undefined,
          severity: severity,
          notes: notes || '',
          status: status,
        });
        successCount++;
      } catch (err: any) {
        errorCount++;
        const rawServerMsg = err?.response?.data?.message || err?.response?.data?.error || err?.message || '';
        let explicitReason = 'Erreur lors de l\'enregistrement';
        if (
          rawServerMsg.toLowerCase().includes('already exists') ||
          rawServerMsg.toLowerCase().includes('existe déjà') ||
          rawServerMsg.toLowerCase().includes('duplicate') ||
          rawServerMsg.toLowerCase().includes('contrainte') ||
          rawServerMsg.toLowerCase().includes('passeport')
        ) {
          explicitReason = 'Ce numéro de passeport existe déjà dans la base des passagers interdits (doublon)';
        } else if (rawServerMsg.toLowerCase().includes('email')) {
          explicitReason = 'Format d\'adresse email invalide ou doublon email';
        } else if (rawServerMsg) {
          explicitReason = rawServerMsg;
        }

        failedRows.push({
          line: index + 2,
          passport: passportNumber,
          name: passengerDisplayName,
          reason: explicitReason,
        });
      }
    }

    setIsImporting(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    if (errorCount > 0) {
      setImportSummaryReport({
        isOpen: true,
        total: successCount + errorCount,
        successCount,
        errorCount,
        failedRows,
      });
      if (successCount > 0) {
        showNotification('success', `${successCount} passager(s) importé(s) avec succès. ${errorCount} passager(s) non enregistré(s).`);
      } else {
        showNotification('error', `Aucun passager n'a pu être importé (${errorCount} rejeté(s)). Consultez le rapport.`);
      }
    } else {
      showNotification('success', `Importation réussie : ${successCount} passager(s) enregistré(s) avec succès !`);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const fileExtension = file.name.split('.').pop()?.toLowerCase();

    if (fileExtension === 'csv') {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: 'greedy',
        encoding: 'utf-8',
        complete: async (results) => {
          await processImportedRows(results.data as any[]);
        },
        error: (err) => {
          console.error('Papa Parse Error:', err);
          showNotification('error', `Erreur de lecture CSV : ${err.message}`);
        },
      });
    } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      try {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, { type: 'array', cellDates: false });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
        await processImportedRows(jsonRows);
      } catch (err: any) {
        console.error('Excel Read Error:', err);
        showNotification('error', `Erreur lors de la lecture du fichier Excel : ${err?.message || err}`);
      }
    } else {
      showNotification('error', 'Format non supporté. Veuillez sélectionner un fichier CSV (.csv) ou Excel (.xlsx, .xls).');
    }
  };

  // Téléchargement du modèle exemplaire (CSV ou Excel)
  const downloadTemplate = (format: 'csv' | 'excel') => {
    const sampleRows = [
      {
        Nom: 'KODJO',
        Prénom: 'Afiwa',
        Email: 'afiwa.kodjo@example.com',
        Téléphone: '+228 90 12 34 56',
        Passeport: 'TG982341',
        Pays_Délivrance_Passeport: 'Togo',
        Expiration_Passeport: '2029-06-30',
        Nationalité: 'Togo',
        Date_Naissance: '1988-04-15',
        Motif_Bannissement: 'Comportement indiscipliné grave et refus d\'obtempérer aux consignes de sécurité',
        Date_Signalement: new Date().toISOString().split('T')[0],
        Type: 'TEMPORARY',
        Echeance: '2027-12-31',
        Gravite: 'HIGH',
        Statut: 'ACTIVE',
        Notes: 'Incident survenu sur le vol KP022 Lomé - Dakar',
      },
      {
        Nom: 'MENSAH',
        Prénom: 'Kwame',
        Email: 'kwame.mensah@example.com',
        Téléphone: '+233 24 555 0192',
        Passeport: 'GH771209',
        Pays_Délivrance_Passeport: 'Ghana',
        Expiration_Passeport: '2031-10-14',
        Nationalité: 'Ghana',
        Date_Naissance: '1982-11-20',
        Motif_Bannissement: 'Violences verbales et agression physique envers l\'équipage de cabine (PNC)',
        Date_Signalement: new Date().toISOString().split('T')[0],
        Type: 'PERMANENT',
        Echeance: '',
        Gravite: 'CRITICAL',
        Statut: 'ACTIVE',
        Notes: 'Interdiction définitive sur l\'ensemble du réseau ASKY Airlines',
      },
    ];

    if (format === 'csv') {
      const csvContent = [
        ['Nom', 'Prénom', 'Email', 'Téléphone', 'Passeport', 'Pays_Délivrance_Passeport', 'Expiration_Passeport', 'Nationalité', 'Date_Naissance', 'Motif_Bannissement', 'Date_Signalement', 'Type', 'Echeance', 'Gravite', 'Statut', 'Notes'].join(';'),
        ...sampleRows.map((r) =>
          [
            `"${r.Nom}"`,
            `"${r.Prénom}"`,
            `"${r.Email}"`,
            `"${r.Téléphone}"`,
            `"${r.Passeport}"`,
            `"${r.Pays_Délivrance_Passeport}"`,
            `"${r.Expiration_Passeport}"`,
            `"${r.Nationalité}"`,
            `"${r.Date_Naissance}"`,
            `"${r.Motif_Bannissement.replace(/"/g, '""')}"`,
            `"${r.Date_Signalement}"`,
            `"${r.Type}"`,
            `"${r.Echeance}"`,
            `"${r.Gravite}"`,
            `"${r.Statut}"`,
            `"${r.Notes.replace(/"/g, '""')}"`,
          ].join(';')
        ),
      ].join('\n');

      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Modele_Import_Passagers_Bannis_ASKY.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } else {
      const worksheet = XLSX.utils.json_to_sheet(sampleRows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Modèle Import ASKY');
      XLSX.writeFile(workbook, `Modele_Import_Passagers_Bannis_ASKY.xlsx`);
    }

    setIsTemplateMenuOpen(false);
    showNotification('success', `Modèle ${format.toUpperCase()} téléchargé avec succès !`);
  };

  const listNationalite = Array.from(new Set(passengers.map((p) => p.nationality))).sort();

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Shield className="h-6 w-6" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">
              {t('passengers.title')}
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
            {t('passengers.subtitle')}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && (
            <>
              {/* Bouton Télécharger un Modèle Exemplaire */}
              <div className="relative" ref={templateMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsTemplateMenuOpen((prev) => !prev)}
                  className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-bold hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center space-x-1.5 transition cursor-pointer shadow-xs"
                  title="Télécharger un modèle exemplaire de fichier (CSV ou Excel) à remplir"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>{t('passenger.downloadTemplate') || 'Modèle à importer'}</span>
                  <ChevronDown className={`h-3 w-3 transition-transform ${isTemplateMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {isTemplateMenuOpen && (
                  <div className="absolute left-0 mt-1.5 w-48 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xl z-50 py-1 text-xs divide-y divide-gray-100 dark:divide-gray-700/60 animate-in fade-in">
                    <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      Format du modèle
                    </div>
                    <div className="py-1">
                      <button
                        type="button"
                        onClick={() => downloadTemplate('excel')}
                        className="w-full text-left px-3 py-2 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-gray-700 dark:text-gray-200 flex items-center justify-between transition-colors"
                      >
                        <span className="font-medium">Modèle Excel (.xlsx)</span>
                        <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 px-1.5 py-0.5 rounded font-mono font-bold">XLSX</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => downloadTemplate('csv')}
                        className="w-full text-left px-3 py-2 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-gray-700 dark:text-gray-200 flex items-center justify-between transition-colors"
                      >
                        <span className="font-medium">Modèle CSV (.csv)</span>
                        <span className="text-[10px] bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 px-1.5 py-0.5 rounded font-mono font-bold">CSV</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Bouton Importer CSV / Excel */}
              <button
                type="button"
                onClick={handleClickImport}
                disabled={isImporting}
                className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-bold hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center space-x-1.5 transition cursor-pointer shadow-xs disabled:opacity-50"
                title="Importer des passagers à partir d'un fichier CSV ou Excel (.xlsx, .xls)"
              >
                <Upload className="h-3.5 w-3.5 text-blue-500" />
                <span>{isImporting ? 'Importation en cours...' : (t('passenger.importer') || 'Importer')}</span>
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".csv, .xlsx, .xls, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, text/csv"
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
              className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-xs placeholder-gray-400 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:bg-white dark:focus:bg-gray-700"
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
                <option value="CRITICAL">Critique</option>
                <option value="HIGH">Élevé</option>
                <option value="MEDIUM">Moyen</option>
                <option value="LOW">Faible</option>
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
                <option value="ACTIVE">Actif</option>
                <option value="EXPIRED">Expiré</option>
                <option value="UNDER_REVIEW">En révision</option>
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
                <option value="PERMANENT">Définitif</option>
                <option value="TEMPORARY">Temporaire</option>
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
                  <th className="px-5 py-3">Passeport</th>
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
                          ? 'Actif'
                          : passenger.status === 'EXPIRED'
                          ? 'Expiré'
                          : 'En révision'}
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
                {printPassenger.passportIssuingCountry && (
                  <div className="p-3 bg-gray-50 rounded-xl space-y-1">
                    <p className="text-gray-500">{t('passengers.passportIssuingCountry') || 'Pays délivrance'}</p>
                    <p className="font-bold">{printPassenger.passportIssuingCountry}</p>
                  </div>
                )}
                {printPassenger.passportExpiryDate && (
                  <div className="p-3 bg-gray-50 rounded-xl space-y-1">
                    <p className="text-gray-500">{t('passengers.passportExpiryDate') || 'Expiration passeport'}</p>
                    <p className="font-bold font-mono">{printPassenger.passportExpiryDate}</p>
                  </div>
                )}
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

      {/* Modal détaillé du rapport d'importation avec raisons spécifiques par passager */}
      {importSummaryReport && importSummaryReport.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col max-h-[85vh]">
            {/* Entête */}
            <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-800/80">
              <div className="flex items-center space-x-3">
                <span className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">
                    Rapport détaillé d'importation
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {importSummaryReport.successCount} enregistré(s) • {importSummaryReport.errorCount} rejeté(s) sur {importSummaryReport.total} ligne(s)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setImportSummaryReport(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Statistiques d'import */}
            <div className="p-4 grid grid-cols-2 gap-3 bg-gray-50/50 dark:bg-gray-900/30 border-b border-gray-200 dark:border-gray-700">
              <div className="p-3 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900/40 text-green-800 dark:text-green-300">
                <span className="text-xs block font-medium">Passagers importés avec succès</span>
                <span className="text-xl font-bold font-mono">{importSummaryReport.successCount}</span>
              </div>
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 text-red-800 dark:text-red-300">
                <span className="text-xs block font-medium">Passagers non enregistrés</span>
                <span className="text-xl font-bold font-mono">{importSummaryReport.errorCount}</span>
              </div>
            </div>

            {/* Liste des passagers non enregistrés avec la raison exacte */}
            <div className="p-5 overflow-y-auto space-y-3 flex-1">
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Détail des passagers rejetés et causes spécifiques :
              </p>
              <div className="space-y-2.5">
                {importSummaryReport.failedRows.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50/40 dark:bg-red-950/20 flex items-start justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-900 dark:text-white">
                          {item.name}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-300 font-mono text-[11px] font-semibold">
                          Passeport: {item.passport}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          (Ligne {item.line})
                        </span>
                      </div>
                      <p className="text-xs text-red-700 dark:text-red-300 flex items-center space-x-1 font-medium">
                        <span>•</span>
                        <span>{item.reason}</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pied du modal */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 flex items-center justify-between">
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                Astuce : Vous pouvez corriger les passeports en doublon ou les informations manquantes dans votre fichier source et réimporter.
              </p>
              <button
                onClick={() => setImportSummaryReport(null)}
                className="px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold rounded-xl text-xs hover:bg-gray-800 dark:hover:bg-gray-100 transition cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

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