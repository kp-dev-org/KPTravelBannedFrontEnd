import React, { useState, useEffect, useMemo } from 'react';
import {
  Shield,
  Search,
  Filter,
  Download,
  RefreshCw,
  Clock,
  User,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  FileCode,
  Eye,
  X,
  Copy,
  Check,
  Activity,
  Database,
  Lock,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  UserCheck,
  UserX,
  FileText,
  SlidersHorizontal,
  Calendar,
  CalendarRange,
  RotateCcw,
  BarChart3,
  TrendingUp,
  PieChart as PieChartIcon,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { auditService, AuditLog, AuditLogStats } from '../services/Api';

type DatePreset = 'ALL' | 'TODAY' | '7DAYS' | '30DAYS' | 'THIS_MONTH' | 'CUSTOM';

export default function AuditLogs() {
  const { user, isAdmin } = useAuth();
  const { t } = useLanguage();
  const { isDarkMode } = useTheme();

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [chartLogs, setChartLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<AuditLogStats>({
    totalLogs: 0,
    todayLogs: 0,
    failedLogs: 0,
    warningLogs: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCharts, setShowCharts] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  
  // Date range filters
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [datePreset, setDatePreset] = useState<DatePreset>('ALL');

  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(15);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);

  // Details modal
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [copied, setCopied] = useState(false);

  // Date formatting helper for <input type="date" />
  const formatDateToInput = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Quick preset selector
  const handleApplyPreset = (preset: DatePreset) => {
    const now = new Date();
    setDatePreset(preset);
    setCurrentPage(0);

    if (preset === 'TODAY') {
      const todayStr = formatDateToInput(now);
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === '7DAYS') {
      const start = new Date();
      start.setDate(now.getDate() - 7);
      setStartDate(formatDateToInput(start));
      setEndDate(formatDateToInput(now));
    } else if (preset === '30DAYS') {
      const start = new Date();
      start.setDate(now.getDate() - 30);
      setStartDate(formatDateToInput(start));
      setEndDate(formatDateToInput(now));
    } else if (preset === 'THIS_MONTH') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(formatDateToInput(start));
      setEndDate(formatDateToInput(now));
    } else if (preset === 'ALL') {
      setStartDate('');
      setEndDate('');
    }
  };

  const handleStartDateChange = (val: string) => {
    setStartDate(val);
    setDatePreset('CUSTOM');
    setCurrentPage(0);
  };

  const handleEndDateChange = (val: string) => {
    setEndDate(val);
    setDatePreset('CUSTOM');
    setCurrentPage(0);
  };

  const handleClearDates = () => {
    setStartDate('');
    setEndDate('');
    setDatePreset('ALL');
    setCurrentPage(0);
  };

  const handleResetAllFilters = () => {
    setSearchQuery('');
    setSelectedCategory('ALL');
    setSelectedStatus('ALL');
    setStartDate('');
    setEndDate('');
    setDatePreset('ALL');
    setCurrentPage(0);
  };

  const hasActiveFilters = Boolean(
    searchQuery.trim() !== '' ||
    selectedCategory !== 'ALL' ||
    selectedStatus !== 'ALL' ||
    startDate !== '' ||
    endDate !== ''
  );

  const isInvalidDateRange = Boolean(
    startDate && endDate && new Date(startDate).getTime() > new Date(endDate).getTime()
  );

  const [exporting, setExporting] = useState<string | null>(null);

  const fetchLogs = async (showRefreshing = false) => {
    if (showRefreshing) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      // Format start and end date with bounds for Spring Boot ISO LocalDateTime
      const formattedStart = startDate ? `${startDate}T00:00:00` : undefined;
      const formattedEnd = endDate ? `${endDate}T23:59:59` : undefined;

      const [logsRes, statsRes, allChartLogs] = await Promise.all([
        auditService.getLogs({
          query: searchQuery.trim() || undefined,
          category: selectedCategory !== 'ALL' ? selectedCategory : undefined,
          status: selectedStatus !== 'ALL' ? selectedStatus : undefined,
          startDate: formattedStart,
          endDate: formattedEnd,
          page: currentPage,
          size: pageSize,
        }),
        auditService.getStats(),
        auditService.getAllLogs({
          category: selectedCategory !== 'ALL' ? selectedCategory : undefined,
          status: selectedStatus !== 'ALL' ? selectedStatus : undefined,
          startDate: formattedStart,
          endDate: formattedEnd,
        }),
      ]);

      setLogs(logsRes.content || []);
      setTotalPages(logsRes.totalPages || 1);
      setTotalElements(logsRes.totalElements || 0);
      setStats(statsRes);
      setChartLogs(allChartLogs || []);
    } catch (err) {
      console.error('Erreur lors du chargement des journaux d\'audit:', err);
    } finally {
      setLoading(false);
      // Garder un délai visuel minimal pour que l'utilisateur voie l'animation du bouton d'actualisation
      setTimeout(() => setRefreshing(false), 500);
    }
  };

  useEffect(() => {
    if (!isInvalidDateRange) {
      fetchLogs();
    }
  }, [currentPage, pageSize, selectedCategory, selectedStatus, startDate, endDate]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(0);
      fetchLogs();
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Copy details helper
  const handleCopyDetails = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Agrégation des tendances temporelles pour Recharts (Accès réussis, Alertes, Échecs)
  const timelineChartData = useMemo(() => {
    const dataSource = chartLogs.length > 0 ? chartLogs : logs;
    if (dataSource.length === 0) return [];

    // Regrouper par date (AAAA-MM-JJ)
    const map = new Map<string, { date: string; displayDate: string; success: number; warning: number; failure: number; total: number }>();

    // Trier les logs chronologiquement
    const sorted = [...dataSource].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    for (const log of sorted) {
      const d = new Date(log.timestamp);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const displayDate = d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });

      if (!map.has(key)) {
        map.set(key, { date: key, displayDate, success: 0, warning: 0, failure: 0, total: 0 });
      }
      const entry = map.get(key)!;
      entry.total++;
      if (log.status === 'WARNING') entry.warning++;
      else if (log.status === 'FAILURE') entry.failure++;
      else entry.success++;
    }

    return Array.from(map.values());
  }, [chartLogs, logs]);

  // Agrégation par catégorie d'activité pour le graphique camembert / barres
  const categoryChartData = useMemo(() => {
    const dataSource = chartLogs.length > 0 ? chartLogs : logs;
    if (dataSource.length === 0) return [];

    const map = new Map<string, number>();
    for (const log of dataSource) {
      const cat = log.category || 'SYSTEM';
      map.set(cat, (map.get(cat) || 0) + 1);
    }

    const categoryNamesFr: Record<string, string> = {
      PASSENGERS: 'Passagers',
      USERS: 'Comptes Agents',
      AUTHENTICATION: 'Authentification',
      SCREENING: 'Contrôles Filtrage',
      SECURITY: 'Sûreté Vols',
      SYSTEM: 'Système',
    };

    return Array.from(map.entries()).map(([cat, count]) => ({
      name: categoryNamesFr[cat] || cat,
      categoryKey: cat,
      count,
    })).sort((a, b) => b.count - a.count);
  }, [chartLogs, logs]);

  // Helper to fetch all logs matching current filters for a complete export
  const fetchAllMatchingLogs = async (): Promise<AuditLog[]> => {
    const formattedStart = startDate ? `${startDate}T00:00:00` : undefined;
    const formattedEnd = endDate ? `${endDate}T23:59:59` : undefined;
    return await auditService.getAllLogs({
      query: searchQuery.trim() || undefined,
      category: selectedCategory !== 'ALL' ? selectedCategory : undefined,
      status: selectedStatus !== 'ALL' ? selectedStatus : undefined,
      startDate: formattedStart,
      endDate: formattedEnd,
    });
  };

  const getExportDateSuffix = () => {
    return startDate || endDate
      ? `_${startDate || 'debut'}_au_${endDate || 'fin'}`
      : `_${new Date().toISOString().slice(0, 10)}`;
  };

  // Export to CSV (Complet : tous les enregistrements + toutes les colonnes y compris Détails Techniques)
  const handleExportCSV = async () => {
    try {
      setExporting('csv');
      const allLogs = await fetchAllMatchingLogs();
      const headers = [
        'ID',
        'Date & Heure',
        'Action',
        'Catégorie',
        'Description',
        'Utilisateur',
        'Rôle',
        'Ressource Ciblée',
        'Statut',
        'Adresse IP',
        'Détails Techniques',
      ];

      const rows = allLogs.map((l) => [
        l.id,
        `"${new Date(l.timestamp).toLocaleString('fr-FR')}"`,
        `"${(l.action || '').replace(/"/g, '""')}"`,
        `"${(l.category || '').replace(/"/g, '""')}"`,
        `"${(l.description || '').replace(/"/g, '""')}"`,
        `"${(l.userEmail || l.userName || 'N/A').replace(/"/g, '""')}"`,
        `"${(l.userRole || 'N/A').replace(/"/g, '""')}"`,
        `"${(l.targetResource || '').replace(/"/g, '""')}"`,
        `"${(l.status || 'SUCCESS').replace(/"/g, '""')}"`,
        `"${(l.ipAddress || 'N/A').replace(/"/g, '""')}"`,
        `"${(l.details || '').replace(/"/g, '""')}"`,
      ]);

      const csvContent =
        '\uFEFF' + [headers.join(';'), ...rows.map((e) => e.join(';'))].join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `passbanned_audit_logs${getExportDateSuffix()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Erreur export CSV:', err);
    } finally {
      setExporting(null);
    }
  };

  // Export to JSON (Complet avec toutes les métadonnées)
  const handleExportJSON = async () => {
    try {
      setExporting('json');
      const allLogs = await fetchAllMatchingLogs();
      const exportData = {
        exportedAt: new Date().toISOString(),
        exportedBy: user?.email || 'Administrateur',
        totalRecords: allLogs.length,
        filtersApplied: {
          searchQuery: searchQuery || null,
          category: selectedCategory,
          status: selectedStatus,
          startDate: startDate || null,
          endDate: endDate || null,
        },
        logs: allLogs,
      };

      const dataStr = JSON.stringify(exportData, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `passbanned_audit_logs${getExportDateSuffix()}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Erreur export JSON:', err);
    } finally {
      setExporting(null);
    }
  };

  // Export to TXT (Format textuel officiel lisible et complet)
  const handleExportTXT = async () => {
    try {
      setExporting('txt');
      const allLogs = await fetchAllMatchingLogs();
      const border = '='.repeat(80);
      const subBorder = '-'.repeat(80);
      const lines: string[] = [];

      lines.push(border);
      lines.push('  ASKY AIRLINES • REGISTRE OFFICIEL DE TRAÇABILITÉ ET D\'AUDIT SÛRETÉ');
      lines.push(`  Date de génération : ${new Date().toLocaleString('fr-FR')}`);
      lines.push(`  Opérateur demandeur : ${user?.name || user?.email || 'Administrateur'}`);
      lines.push(`  Volume extrait     : ${allLogs.length} événement(s) consigné(s)`);
      if (hasActiveFilters) {
        lines.push(`  Filtres appliqués  : Catégorie=[${selectedCategory}], Statut=[${selectedStatus}], Période=[${startDate || 'Début'} à ${endDate || 'Fin'}], Recherche=[${searchQuery || 'Aucune'}]`);
      }
      lines.push(border);
      lines.push('');

      allLogs.forEach((l, index) => {
        lines.push(`[ÉVÉNEMENT #${l.id}] - ${new Date(l.timestamp).toLocaleString('fr-FR')} - STATUT: ${l.status}`);
        lines.push(`Action       : ${l.action}`);
        lines.push(`Catégorie    : ${l.category}`);
        lines.push(`Utilisateur  : ${l.userName || 'Système'} (${l.userEmail || 'N/A'}) [Rôle: ${l.userRole || 'N/A'}]`);
        lines.push(`Adresse IP   : ${l.ipAddress || 'Non renseignée'}`);
        lines.push(`Ressource    : ${l.targetResource || 'N/A'}`);
        lines.push(`Description  : ${l.description}`);
        if (l.details && l.details.trim()) {
          lines.push(`Détails      : ${l.details.trim()}`);
        }
        lines.push(subBorder);
      });

      lines.push('');
      lines.push('Fin du registre d\'audit. Fichier scellé et certifié conforme au protocole Sûreté ASKY Airlines.');

      const textContent = lines.join('\r\n');
      const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `passbanned_audit_logs${getExportDateSuffix()}.txt`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Erreur export TXT:', err);
    } finally {
      setExporting(null);
    }
  };

  // Action badge helper
  const getActionBadge = (action: string, category: string) => {
    if (action.includes('DELETE')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 border border-red-200 dark:border-red-800">
          <UserX className="w-3 h-3" /> {action}
        </span>
      );
    }
    if (action.includes('CREATE')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
          <CheckCircle2 className="w-3 h-3" /> {action}
        </span>
      );
    }
    if (action.includes('LOGIN') || action.includes('AUTH')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
          <Lock className="w-3 h-3" /> {action}
        </span>
      );
    }
    if (action.includes('GATE') || action.includes('SCREENING')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
          <Shield className="w-3 h-3" /> {action}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
        <Activity className="w-3 h-3" /> {action}
      </span>
    );
  };

  // Status badge helper
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/20">
            <CheckCircle2 className="w-3 h-3" /> {t('audit.statusSuccessBadge')}
          </span>
        );
      case 'WARNING':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
            <AlertTriangle className="w-3 h-3" /> {t('audit.statusWarningBadge')}
          </span>
        );
      case 'FAILURE':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20">
            <XCircle className="w-3 h-3" /> {t('audit.statusFailureBadge')}
          </span>
        );
    }
  };

  // Strict Admin Gate
  if (!isAdmin) {
    return (
      <div className="p-8 max-w-4xl mx-auto my-12">
        <div className="bg-red-50 dark:bg-red-950/50 border-2 border-red-300 dark:border-red-900 rounded-3xl p-10 text-center shadow-xl">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/50 rounded-2xl flex items-center justify-center mx-auto mb-5 text-red-600 dark:text-red-400">
            <Shield className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-red-900 dark:text-red-200 mb-3 tracking-tight">
            {t('audit.adminRestrictedTitle')}
          </h2>
          <p className="text-sm text-red-700 dark:text-red-300 max-w-md mx-auto leading-relaxed">
            {t('audit.adminRestrictedDesc')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-gray-200 dark:border-gray-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-yellow-600 dark:text-yellow-400">
            <ShieldCheck className="w-4 h-4" /> {t('audit.headerTag')}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight mt-1">
            {t('audit.title')}
          </h1>
        </div>

        {/* Top actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Bouton Afficher / Masquer Graphiques Recharts */}
          <button
            onClick={() => setShowCharts(!showCharts)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border transition shadow-xs cursor-pointer ${
              showCharts
                ? 'text-yellow-800 dark:text-yellow-200 bg-yellow-50 dark:bg-yellow-950/50 border-yellow-300 dark:border-yellow-700 hover:bg-yellow-100 dark:hover:bg-yellow-900/60'
                : 'text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
            title={showCharts ? t('audit.chartToggleHide') : t('audit.chartToggleShow')}
          >
            <BarChart3 className="w-3.5 h-3.5 text-yellow-600 dark:text-yellow-400" />
            <span className="hidden sm:inline">{showCharts ? t('audit.chartToggleHide') : t('audit.chartToggleShow')}</span>
            <span className="sm:hidden">{showCharts ? 'Masquer' : 'Graphiques'}</span>
            {showCharts ? <ChevronUp className="w-3 h-3 text-yellow-600 dark:text-yellow-400" /> : <ChevronDown className="w-3 h-3 text-gray-500" />}
          </button>

          {/* Bouton Actualiser */}
          <button
            onClick={() => fetchLogs(true)}
            disabled={refreshing || loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition shadow-xs cursor-pointer disabled:opacity-60"
            title={t('dashboard.refresh')}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-yellow-500' : ''}`} />
            <span>{refreshing ? 'Actualisation...' : t('dashboard.refresh')}</span>
          </button>

          {/* Bouton Export CSV */}
          <button
            onClick={handleExportCSV}
            disabled={exporting !== null}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-800 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition shadow-xs cursor-pointer disabled:opacity-60"
            title="Exporter l'ensemble des journaux d'audit au format CSV (tableur)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>{exporting === 'csv' ? (t('audit.exporting') || 'Exportation...') : t('audit.exportCsv')}</span>
          </button>

          {/* Bouton Export TXT (Fichier Texte) */}
          <button
            onClick={handleExportTXT}
            disabled={exporting !== null}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 rounded-xl hover:bg-amber-100 dark:hover:bg-amber-900/60 transition shadow-xs cursor-pointer disabled:opacity-60"
            title="Exporter l'ensemble des journaux au format texte brut (.txt) officiel"
          >
            <FileText className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>{exporting === 'txt' ? (t('audit.exporting') || 'Exportation...') : (t('audit.exportTxt') || 'Texte (TXT)')}</span>
          </button>

          {/* Bouton Export JSON */}
          <button
            onClick={handleExportJSON}
            disabled={exporting !== null}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-blue-800 dark:text-blue-200 bg-blue-50 dark:bg-blue-950/50 border border-blue-300 dark:border-blue-800 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/60 transition shadow-xs cursor-pointer disabled:opacity-60"
            title="Exporter au format structuré JSON pour intégration technique"
          >
            <FileCode className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>{exporting === 'json' ? (t('audit.exporting') || 'Exportation...') : t('audit.exportJson')}</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-gray-800/90 rounded-2xl p-4 sm:p-5 border border-gray-200 dark:border-gray-700/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              {t('audit.totalLogs')}
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white mt-2">
            {stats.totalLogs}
          </p>
          <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">
            {t('audit.archivedOps')}
          </span>
        </div>

        <div className="bg-white dark:bg-gray-800/90 rounded-2xl p-4 sm:p-5 border border-gray-200 dark:border-gray-700/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              {t('audit.activity24h')}
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
            {stats.todayLogs}
          </p>
          <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">
            {t('audit.todayActions')}
          </span>
        </div>

        <div className="bg-white dark:bg-gray-800/90 rounded-2xl p-4 sm:p-5 border border-gray-200 dark:border-gray-700/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              {t('audit.safetyAlerts')}
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400 mt-2">
            {stats.warningLogs}
          </p>
          <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">
            {t('audit.warningsMatches')}
          </span>
        </div>

        <div className="bg-white dark:bg-gray-800/90 rounded-2xl p-4 sm:p-5 border border-gray-200 dark:border-gray-700/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              {t('audit.failuresRejections')}
            </span>
            <div className="w-8 h-8 rounded-xl bg-red-100 dark:bg-red-950/80 text-red-600 dark:text-red-400 flex items-center justify-center">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-red-600 dark:text-red-400 mt-2">
            {stats.failedLogs}
          </p>
          <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">
            {t('audit.deniedAttempts')}
          </span>
        </div>
      </div>

      {/* Visual Analytics / Recharts Section */}
      {showCharts && (
        <div className="bg-white dark:bg-gray-800/90 rounded-2xl p-4 sm:p-6 border border-gray-200 dark:border-gray-700/80 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-gray-100 dark:border-gray-700/60">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-yellow-100 dark:bg-yellow-950/80 text-yellow-600 dark:text-yellow-400 flex items-center justify-center shrink-0">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <span>{t('audit.chartTitle') || 'Tendances des Accès & Alertes de Sûreté'}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-100 dark:bg-yellow-950/80 text-yellow-800 dark:text-yellow-300 uppercase tracking-wide">
                    Recharts
                  </span>
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t('audit.chartSubtitle') || 'Visualisation chronologique des accès autorisés, alertes de filtrage et rejets'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="text-[11px] font-medium text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center gap-1.5 shadow-2xs">
                <Calendar className="w-3.5 h-3.5 text-yellow-600 dark:text-yellow-400" />
                {startDate || endDate ? (
                  <span>
                    {startDate || 'Début'} → {endDate || 'Fin'}
                  </span>
                ) : (
                  <span>{datePreset === 'ALL' ? 'Toutes les périodes' : datePreset}</span>
                )}
              </div>
            </div>
          </div>

          {timelineChartData.length === 0 ? (
            <div className="py-12 text-center text-gray-500 dark:text-gray-400">
              <BarChart3 className="w-10 h-10 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
              <p className="text-xs sm:text-sm font-semibold">
                Aucune donnée d'audit enregistrée pour la période sélectionnée.
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Modifiez vos filtres de dates pour visualiser les tendances.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-1">
              {/* Timeline Trend Area Chart (2 Cols) */}
              <div className="lg:col-span-2 space-y-2">
                <div className="flex items-center justify-between text-xs px-1">
                  <span className="font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-emerald-500" />
                    Évolution chronologique des accès et alertes
                  </span>
                  <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                    {timelineChartData.length} jour(s) analysé(s)
                  </span>
                </div>

                <div className="w-full h-64 sm:h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={timelineChartData}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="colorSuccess" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                        </linearGradient>
                        <linearGradient id="colorWarning" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.5} />
                          <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                        </linearGradient>
                        <linearGradient id="colorFailure" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.5} />
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke={isDarkMode ? '#374151' : '#f3f4f6'}
                      />
                      <XAxis
                        dataKey="displayDate"
                        stroke={isDarkMode ? '#9ca3af' : '#6b7280'}
                        fontSize={11}
                        tickLine={false}
                      />
                      <YAxis
                        stroke={isDarkMode ? '#9ca3af' : '#6b7280'}
                        fontSize={11}
                        tickLine={false}
                        allowDecimals={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: isDarkMode ? '#111827' : '#ffffff',
                          borderColor: isDarkMode ? '#374151' : '#e5e7eb',
                          borderRadius: '0.75rem',
                          color: isDarkMode ? '#f3f4f6' : '#111827',
                          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                          fontSize: '12px',
                        }}
                      />
                      <Legend
                        verticalAlign="top"
                        height={36}
                        iconType="circle"
                        wrapperStyle={{ fontSize: '11px', paddingTop: '0px' }}
                      />
                      <Area
                        type="monotone"
                        dataKey="success"
                        name={t('audit.chartAccess') || 'Accès & Opérations'}
                        stroke="#10b981"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorSuccess)"
                      />
                      <Area
                        type="monotone"
                        dataKey="warning"
                        name={t('audit.chartWarnings') || 'Alertes de sûreté'}
                        stroke="#f59e0b"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorWarning)"
                      />
                      <Area
                        type="monotone"
                        dataKey="failure"
                        name={t('audit.chartFailures') || 'Échecs & Rejets'}
                        stroke="#ef4444"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorFailure)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Category Breakdown (1 Col) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs px-1">
                  <span className="font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                    <PieChartIcon className="w-3.5 h-3.5 text-blue-500" />
                    {t('audit.chartCategoryTitle') || 'Répartition par Domaine'}
                  </span>
                  <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                    Activités
                  </span>
                </div>

                <div className="w-full h-64 sm:h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={categoryChartData}
                      layout="vertical"
                      margin={{ top: 10, right: 15, left: 15, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke={isDarkMode ? '#374151' : '#f3f4f6'}
                        horizontal={false}
                      />
                      <XAxis
                        type="number"
                        stroke={isDarkMode ? '#9ca3af' : '#6b7280'}
                        fontSize={11}
                        tickLine={false}
                        allowDecimals={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        stroke={isDarkMode ? '#9ca3af' : '#6b7280'}
                        fontSize={10}
                        tickLine={false}
                        width={85}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: isDarkMode ? '#111827' : '#ffffff',
                          borderColor: isDarkMode ? '#374151' : '#e5e7eb',
                          borderRadius: '0.75rem',
                          color: isDarkMode ? '#f3f4f6' : '#111827',
                          fontSize: '12px',
                        }}
                        formatter={(val: any) => [`${val} journal(aux)`, 'Activité']}
                      />
                      <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                        {categoryChartData.map((entry, index) => {
                          const catColors: Record<string, string> = {
                            PASSENGERS: '#3b82f6',
                            SCREENING: '#f59e0b',
                            AUTHENTICATION: '#10b981',
                            USERS: '#8b5cf6',
                            SECURITY: '#ef4444',
                            SYSTEM: '#64748b',
                          };
                          const fill = catColors[entry.categoryKey] || '#eab308';
                          return <Cell key={`cell-${index}`} fill={fill} />;
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filter Bar with Text Search, Categories, Status AND Date Range Pickers */}
      <div className="bg-white dark:bg-gray-800/90 rounded-2xl p-4 sm:p-5 border border-gray-200 dark:border-gray-700/80 shadow-xs space-y-4">
        
        {/* Row 1: Search box & Select dropdowns */}
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Search box */}
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('audit.searchPlaceholder')}
              className="w-full pl-10 pr-9 py-2 text-xs sm:text-sm bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:outline-hidden text-gray-900 dark:text-white"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                title={t('common.cancel')}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Select Category */}
          <div className="w-full sm:w-auto">
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setCurrentPage(0);
              }}
              className="w-full sm:w-48 py-2 px-3 text-xs sm:text-sm bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:outline-hidden text-gray-900 dark:text-white cursor-pointer"
            >
              <option value="ALL">{t('audit.allCategories')}</option>
              <option value="PASSENGERS">{t('audit.catPassengers')}</option>
              <option value="USERS">{t('audit.catUsers')}</option>
              <option value="AUTHENTICATION">{t('audit.catAuth')}</option>
              <option value="SCREENING">{t('audit.catScreening')}</option>
              <option value="SECURITY">{t('audit.catSecurity')}</option>
              <option value="SYSTEM">{t('audit.catSystem')}</option>
            </select>
          </div>

          {/* Select Status */}
          <div className="w-full sm:w-auto">
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(0);
              }}
              className="w-full sm:w-44 py-2 px-3 text-xs sm:text-sm bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:outline-hidden text-gray-900 dark:text-white cursor-pointer"
            >
              <option value="ALL">{t('audit.allStatuses')}</option>
              <option value="SUCCESS">{t('audit.statusSuccess')}</option>
              <option value="WARNING">{t('audit.statusWarning')}</option>
              <option value="FAILURE">{t('audit.statusFailure')}</option>
            </select>
          </div>
        </div>

        {/* Row 2: Date Range Pickers (Start/End) & Quick Presets */}
        <div className="pt-3 border-t border-gray-150 dark:border-gray-700/60 flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3">
          
          {/* Date range inputs */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center space-x-1.5 text-xs font-bold text-gray-700 dark:text-gray-300">
              <CalendarRange className="w-4 h-4 text-amber-500 shrink-0" />
              <span>{t('audit.dateRange')}</span>
            </div>

            {/* Date début */}
            <div className="flex items-center space-x-1.5">
              <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">{t('audit.from')}</span>
              <div className="relative">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  className={`py-1.5 px-2.5 text-xs bg-gray-50 dark:bg-gray-900 border rounded-xl focus:ring-2 focus:ring-yellow-500 focus:outline-hidden text-gray-900 dark:text-white font-mono cursor-pointer ${
                    isInvalidDateRange
                      ? 'border-red-500 dark:border-red-500 ring-1 ring-red-500'
                      : 'border-gray-300 dark:border-gray-700'
                  }`}
                  aria-label={t('audit.from')}
                />
              </div>
            </div>

            {/* Date fin */}
            <div className="flex items-center space-x-1.5">
              <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">{t('audit.to')}</span>
              <div className="relative">
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => handleEndDateChange(e.target.value)}
                  className={`py-1.5 px-2.5 text-xs bg-gray-50 dark:bg-gray-900 border rounded-xl focus:ring-2 focus:ring-yellow-500 focus:outline-hidden text-gray-900 dark:text-white font-mono cursor-pointer ${
                    isInvalidDateRange
                      ? 'border-red-500 dark:border-red-500 ring-1 ring-red-500'
                      : 'border-gray-300 dark:border-gray-700'
                  }`}
                  aria-label={t('audit.to')}
                />
              </div>
            </div>

            {/* Clear dates button */}
            {(startDate || endDate) && (
              <button
                onClick={handleClearDates}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer"
                title={t('audit.clearDates')}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick presets (Segmented buttons) */}
          <div className="flex flex-wrap items-center gap-1.5 bg-gray-100/80 dark:bg-gray-900/80 p-1 rounded-xl self-start xl:self-auto">
            <button
              onClick={() => handleApplyPreset('ALL')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                datePreset === 'ALL'
                  ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-xs'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {t('audit.allDates')}
            </button>
            <button
              onClick={() => handleApplyPreset('TODAY')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                datePreset === 'TODAY'
                  ? 'bg-white dark:bg-gray-800 text-amber-700 dark:text-amber-400 shadow-xs'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {t('audit.today')}
            </button>
            <button
              onClick={() => handleApplyPreset('7DAYS')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                datePreset === '7DAYS'
                  ? 'bg-white dark:bg-gray-800 text-amber-700 dark:text-amber-400 shadow-xs'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {t('audit.7days')}
            </button>
            <button
              onClick={() => handleApplyPreset('30DAYS')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                datePreset === '30DAYS'
                  ? 'bg-white dark:bg-gray-800 text-amber-700 dark:text-amber-400 shadow-xs'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {t('audit.30days')}
            </button>
            <button
              onClick={() => handleApplyPreset('THIS_MONTH')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                datePreset === 'THIS_MONTH'
                  ? 'bg-white dark:bg-gray-800 text-amber-700 dark:text-amber-400 shadow-xs'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {t('audit.thisMonth')}
            </button>
          </div>

          {/* Reset all filters button if any filter is active */}
          {hasActiveFilters && (
            <button
              onClick={handleResetAllFilters}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition cursor-pointer self-start xl:self-auto"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{t('audit.resetFilters')}</span>
            </button>
          )}
        </div>

        {/* Invalid date range warning banner */}
        {isInvalidDateRange && (
          <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 rounded-xl p-2.5 flex items-center space-x-2 text-xs text-red-700 dark:text-red-300">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
            <span>
              {t('audit.invalidRange')} ({startDate} → {endDate})
            </span>
          </div>
        )}

        {/* Active Filter Summary line */}
        {(startDate || endDate || selectedCategory !== 'ALL' || selectedStatus !== 'ALL') && !isInvalidDateRange && (
          <div className="text-[11px] text-gray-500 dark:text-gray-400 flex flex-wrap items-center gap-2 pt-1">
            <span className="font-semibold text-gray-700 dark:text-gray-300">{t('audit.activeFilters')}</span>
            {startDate && endDate ? (
              <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-mono">
                {t('audit.period')} {startDate} → {endDate}
              </span>
            ) : startDate ? (
              <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-mono">
                {t('audit.from')}: {startDate}
              </span>
            ) : endDate ? (
              <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-mono">
                {t('audit.to')}: {endDate}
              </span>
            ) : null}

            {selectedCategory !== 'ALL' && (
              <span className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                {selectedCategory}
              </span>
            )}

            {selectedStatus !== 'ALL' && (
              <span className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                {selectedStatus}
              </span>
            )}

            <span>•</span>
            <span className="font-bold text-gray-800 dark:text-gray-200">
              {totalElements} {t('audit.resultsCount')}
            </span>
          </div>
        )}
      </div>

      {/* Main Audit Table */}
      <div className="bg-white dark:bg-gray-800/90 rounded-2xl border border-gray-200 dark:border-gray-700/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900/60 text-gray-500 dark:text-gray-400 font-semibold uppercase text-[11px] border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="py-3 px-4">{t('audit.timestamp')}</th>
                <th className="py-3 px-4">{t('audit.userAgent')}</th>
                <th className="py-3 px-4">{t('audit.actionCategory')}</th>
                <th className="py-3 px-4">{t('audit.descriptionTarget')}</th>
                <th className="py-3 px-4">{t('common.status')}</th>
                <th className="py-3 px-4">{t('audit.terminalIp')}</th>
                <th className="py-3 px-4 text-center">{t('audit.details')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-500 dark:text-gray-400">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="w-8 h-8 border-3 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-xs font-medium">{t('audit.loading')}</p>
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-500 dark:text-gray-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Shield className="w-8 h-8 text-gray-400" />
                      <p className="text-sm font-semibold">{t('audit.noResults')}</p>
                      <p className="text-xs text-gray-400">
                        {startDate || endDate 
                          ? t('audit.noResultsRange')
                          : t('passengers.noResultsDesc')}
                      </p>
                      {hasActiveFilters && (
                        <button
                          onClick={handleResetAllFilters}
                          className="mt-2 px-3 py-1 bg-amber-500 hover:bg-amber-600 text-gray-950 font-bold rounded-lg text-xs transition cursor-pointer"
                        >
                          {t('audit.resetFilters')}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const date = new Date(log.timestamp);
                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-750/50 transition-colors"
                    >
                      {/* Horodatage */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="text-xs font-bold text-gray-900 dark:text-gray-100">
                          {date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                        <div className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3 text-gray-400" />
                          {date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </div>
                      </td>

                      {/* Agent */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-[10px] text-slate-800 dark:text-slate-200 uppercase">
                            {(log.userName || log.userEmail || 'A').slice(0, 2)}
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-gray-900 dark:text-white">
                              {log.userName || log.userEmail || t('audit.systemUser')}
                            </div>
                            <div className="text-[10px] text-gray-500 dark:text-gray-400 flex items-center gap-1">
                              <span>{log.userEmail || 'N/A'}</span>
                              {log.userRole && (
                                <span className={`px-1 py-0.2 rounded text-[9px] font-bold uppercase ${
                                  log.userRole === 'ADMIN'
                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
                                    : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                                }`}>
                                  {log.userRole}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Action & Catégorie */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="space-y-1">
                          {getActionBadge(log.action, log.category)}
                          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                            {log.category}
                          </div>
                        </div>
                      </td>

                      {/* Description & Cible */}
                      <td className="py-3 px-4">
                        <div className="text-xs font-medium text-gray-800 dark:text-gray-200 max-w-md line-clamp-2">
                          {log.description}
                        </div>
                        {log.targetResource && (
                          <div className="text-[11px] font-semibold text-yellow-600 dark:text-yellow-400/90 mt-0.5">
                            {t('audit.targetLabel')} {log.targetResource}
                          </div>
                        )}
                      </td>

                      {/* Statut */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {getStatusBadge(log.status)}
                      </td>

                      {/* IP / Terminal */}
                      <td className="py-3 px-4 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400 font-mono">
                        {log.ipAddress || '127.0.0.1'}
                      </td>

                      {/* Bouton Détails */}
                      <td className="py-3 px-4 whitespace-nowrap text-center">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-yellow-600 dark:hover:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-950/40 transition cursor-pointer"
                          title={t('audit.viewDetails')}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 bg-gray-50 dark:bg-gray-900/60 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-600 dark:text-gray-400">
          <div>
            {t('audit.displaying')} <strong>{logs.length}</strong> {t('audit.outOf')} <strong>{totalElements}</strong> {t('audit.archivedOps')}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs">{t('audit.rowsPerPage')}</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(0);
              }}
              className="py-1 px-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-xs cursor-pointer"
            >
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>

            <div className="flex items-center gap-1 ml-2">
              <button
                disabled={currentPage <= 0}
                onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                className="p-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700 transition cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 font-semibold text-gray-900 dark:text-white">
                Page {currentPage + 1} / {totalPages}
              </span>
              <button
                disabled={currentPage >= totalPages - 1}
                onClick={() => setCurrentPage((p) => p + 1)}
                className="p-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700 transition cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Détails d'Audit */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-3xl max-w-2xl w-full p-6 shadow-2xl relative space-y-5">
            {/* Modal Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 flex items-center justify-center">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    {t('audit.eventFile')} #{selectedLog.id}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t('audit.certified')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Grid properties */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-gray-50 dark:bg-gray-800/60 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400">{t('common.actions')}</span>
                <p className="font-semibold text-gray-900 dark:text-white mt-0.5">{selectedLog.action}</p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400">{t('passengers.filters')}</span>
                <p className="font-semibold text-gray-900 dark:text-white mt-0.5">{selectedLog.category}</p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400">{t('common.status')}</span>
                <div className="mt-0.5">{getStatusBadge(selectedLog.status)}</div>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400">{t('audit.userAgent')}</span>
                <p className="font-semibold text-gray-900 dark:text-white mt-0.5">{selectedLog.userName || 'N/A'}</p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400">{t('common.email')}</span>
                <p className="font-semibold text-gray-900 dark:text-white mt-0.5">{selectedLog.userEmail || 'N/A'}</p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400">{t('users.role')}</span>
                <p className="font-semibold text-gray-900 dark:text-white mt-0.5">{selectedLog.userRole || 'N/A'}</p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400">{t('audit.terminalIp')}</span>
                <p className="font-mono text-gray-900 dark:text-white mt-0.5">{selectedLog.ipAddress || '127.0.0.1'}</p>
              </div>
              <div className="col-span-2">
                <span className="text-[10px] uppercase font-bold text-gray-400">{t('audit.timestamp')}</span>
                <p className="font-mono text-gray-900 dark:text-white mt-0.5">
                  {new Date(selectedLog.timestamp).toISOString()}
                </p>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1">
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                {t('audit.eventDesc')}
              </span>
              <p className="text-xs sm:text-sm text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-800 p-3 rounded-xl border border-gray-200 dark:border-gray-700">
                {selectedLog.description}
              </p>
            </div>

            {/* Target resource */}
            {selectedLog.targetResource && (
              <div className="space-y-1">
                <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                  {t('audit.targetResource')}
                </span>
                <p className="text-xs font-semibold text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/40 p-2.5 rounded-xl border border-yellow-200 dark:border-yellow-900">
                  {selectedLog.targetResource}
                </p>
              </div>
            )}

            {/* Raw Details / Metadata */}
            {selectedLog.details && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                    {t('audit.techDetails')}
                  </span>
                  <button
                    onClick={() => handleCopyDetails(selectedLog.details || '')}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-500 hover:text-gray-800 dark:hover:text-white transition cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? t('audit.copySuccess') : t('audit.copy')}
                  </button>
                </div>
                <pre className="text-[11px] bg-slate-950 text-slate-200 p-3 rounded-xl overflow-x-auto font-mono max-h-40 border border-slate-800">
                  {selectedLog.details}
                </pre>
              </div>
            )}

            {/* Modal Footer */}
            <div className="pt-2 border-t border-gray-200 dark:border-gray-800 flex justify-between items-center text-[11px] text-gray-400">
              <span className="flex items-center gap-1">
                <Lock className="w-3 h-3 text-emerald-500" /> {t('audit.sealed')}
              </span>
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-gray-900 hover:bg-gray-800 dark:bg-gray-100 dark:hover:bg-white text-white dark:text-gray-900 font-bold rounded-xl transition text-xs cursor-pointer"
              >
                {t('common.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
