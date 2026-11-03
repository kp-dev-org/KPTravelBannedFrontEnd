import React, { useState, useMemo } from 'react';
import {
  UserX,
  AlertTriangle,
  TrendingUp,
  Shield,
  Clock,
  Search,
  CheckCircle,
  ShieldAlert,
  Plus,
  Globe,
  ArrowRight,
  RefreshCw,
  Flame,
  ShieldCheck,
  Percent,
} from 'lucide-react';
import { useData } from '../contexts/DataContext';
import StatsCard from '../components/StatsCard';
import { motion } from 'framer-motion';
import { useLanguage } from '../contexts/LanguageContext';
import { Link, useNavigate } from 'react-router-dom';

interface SeverityConfig {
  key: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  label: string;
  count: number;
  percentage: number;
  color: string;
  hoverColor: string;
  gradientId: string;
  gradientFrom: string;
  gradientTo: string;
  glowColor: string;
  badgeClass: string;
  dotClass: string;
  desc: string;
}

function Dashboard() {
  const { passengers, loading, error, checkPassportQuick, backendInfo, refreshData } = useData();
  const { t } = useLanguage();
  const navigate = useNavigate();

  // Quick check state on dashboard
  const [quickPassport, setQuickPassport] = useState('');
  const [checking, setChecking] = useState(false);
  const [quickResult, setQuickResult] = useState<{ checked: boolean; found: any } | null>(null);

  // Active / hovered severity slice in circular chart
  const [hoveredSeverity, setHoveredSeverity] = useState<string | null>(null);
   // Refreshing animation state

  const [isRefreshing, setIsRefreshing] = useState(false);
  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await refreshData();
    } finally {
      setTimeout(() => {
        setIsRefreshing(false);
      }, 600);
    }
  };
  const handleQuickCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickPassport.trim()) return;
    setChecking(true);
    try {
      const found = await checkPassportQuick(quickPassport.trim());
      setQuickResult({ checked: true, found });
    } finally {
      setChecking(false);
    }
  };

  const stats = useMemo(() => {
    const banWeekAgo = new Date();
    banWeekAgo.setDate(banWeekAgo.getDate() - 7);

    return {
      totalBanned: passengers.length,
      activeBans: passengers.filter((p) => p.status === 'ACTIVE').length,
      criticalCases: passengers.filter((p) => p.severity === 'CRITICAL').length,
      recentBans: passengers.filter((p) => {
        const banDate = new Date(p.banDate);
        return banDate >= banWeekAgo;
      }).length,
    };
  }, [passengers]);

  const severityColors: Record<string, string> = {
    LOW: 'bg-green-100 text-green-800 dark:bg-green-950/60 dark:text-green-300',
    MEDIUM: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950/60 dark:text-yellow-300',
    HIGH: 'bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300',
    CRITICAL: 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300',
  };

  const recentPassengers = useMemo(() => {
    return [...passengers]
      .sort((a, b) => new Date(b.banDate).getTime() - new Date(a.banDate).getTime())
      .slice(0, 5);
  }, [passengers]);

  // Nationality breakdown from Spring Boot data
  const topNationalities = useMemo(() => {
    const map: Record<string, number> = {};
    passengers.forEach((p) => {
      if (p.nationality) {
        map[p.nationality] = (map[p.nationality] || 0) + 1;
      }
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [passengers]);

  // Severity data configuration for the aesthetic circular chart
  const severityConfigs: SeverityConfig[] = useMemo(() => {
    const total = passengers.length || 1;
    const critCount = passengers.filter((p) => p.severity === 'CRITICAL').length;
    const highCount = passengers.filter((p) => p.severity === 'HIGH').length;
    const medCount = passengers.filter((p) => p.severity === 'MEDIUM').length;
    const lowCount = passengers.filter((p) => p.severity === 'LOW').length;

    return [
      {
        key: 'CRITICAL',
        label: t('dashboard.critical'),
        count: critCount,
        percentage: (critCount / total) * 100,
        color: '#ef4444',
        hoverColor: '#dc2626',
        gradientId: 'grad-crit',
        gradientFrom: '#f87171',
        gradientTo: '#dc2626',
        glowColor: 'rgba(239, 68, 68, 0.45)',
        badgeClass: 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 border-red-200 dark:border-red-900',
        dotClass: 'bg-red-500',
        desc: t('dashboard.criticalAlert'),
      },
      {
        key: 'HIGH',
        label: t('dashboard.high'),
        count: highCount,
        percentage: (highCount / total) * 100,
        color: '#f97316',
        hoverColor: '#ea580c',
        gradientId: 'grad-high',
        gradientFrom: '#fb923c',
        gradientTo: '#ea580c',
        glowColor: 'rgba(249, 115, 22, 0.45)',
        badgeClass: 'bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300 border-orange-200 dark:border-orange-900',
        dotClass: 'bg-orange-500',
        desc: t('dashboard.highAlert'),
      },
      {
        key: 'MEDIUM',
        label: t('dashboard.medium'),
        count: medCount,
        percentage: (medCount / total) * 100,
        color: '#eab308',
        hoverColor: '#ca8a04',
        gradientId: 'grad-med',
        gradientFrom: '#fde047',
        gradientTo: '#ca8a04',
        glowColor: 'rgba(234, 179, 8, 0.45)',
        badgeClass: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950/60 dark:text-yellow-300 border-yellow-200 dark:border-yellow-900',
        dotClass: 'bg-yellow-500',
        desc: t('dashboard.mediumAlert'),
      },
      {
        key: 'LOW',
        label: t('dashboard.low'),
        count: lowCount,
        percentage: (lowCount / total) * 100,
        color: '#10b981',
        hoverColor: '#059669',
        gradientId: 'grad-low',
        gradientFrom: '#34d399',
        gradientTo: '#059669',
        glowColor: 'rgba(16, 185, 129, 0.45)',
        badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900',
        dotClass: 'bg-emerald-500',
        desc: t('dashboard.lowAlert'),
      },
    ];
  }, [passengers]);

  // Donut geometry calculations
  const donutMetrics = useMemo(() => {
    const radius = 78;
    const circumference = 2 * Math.PI * radius; // ~490.088
    const totalCount = passengers.length;

    let accumulatedOffset = 0;
    const segments = severityConfigs.map((cfg) => {
      if (totalCount === 0 || cfg.count === 0) {
        return {
          ...cfg,
          dashLength: 0,
          dashGap: circumference,
          offset: 0,
        };
      }

      const fraction = cfg.count / totalCount;
      const rawLength = fraction * circumference;
      // Leave a tiny aesthetic segment gap if there are multiple populated slices
      const populatedSlices = severityConfigs.filter((c) => c.count > 0).length;
      const gap = populatedSlices > 1 ? 4 : 0;
      const dashLength = Math.max(1, rawLength - gap);
      const dashGap = circumference - dashLength;
      const offset = accumulatedOffset;
      accumulatedOffset += rawLength;

      return {
        ...cfg,
        dashLength,
        dashGap,
        offset,
      };
    });

    return { radius, circumference, segments };
  }, [severityConfigs, passengers.length]);

  const activeHoverConfig = useMemo(() => {
    if (!hoveredSeverity) return null;
    return severityConfigs.find((c) => c.key === hoveredSeverity) || null;
  }, [hoveredSeverity, severityConfigs]);

  const criticalAndHighTotal = useMemo(() => {
    const crit = passengers.filter((p) => p.severity === 'CRITICAL').length;
    const high = passengers.filter((p) => p.severity === 'HIGH').length;
    const pct = passengers.length > 0 ? Math.round(((crit + high) / passengers.length) * 100) : 0;
    return { count: crit + high, percentage: pct };
  }, [passengers]);

  if (loading && passengers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 space-y-3">
        <div className="w-12 h-12 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-gray-500 font-medium"> {t('dashboard.loading')} </p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Top Banner with Quick Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white mt-1">
            {t('dashboard.title')}
          </h1>
        </div>

        {/* Action shortcuts */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="px-3.5 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 font-bold rounded-xl text-xs shadow-xs transition flex items-center space-x-1.5 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
            title="Recharger les données "
          >
            <RefreshCw className={`h-4 w-4 text-amber-500 transition-transform ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Actualisation...' : t('dashboard.refresh')}</span>
          </button>
          <Link
            to="/gate-check"
            className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-gray-900 font-bold rounded-xl text-xs shadow-md transition flex items-center space-x-1.5 cursor-pointer"
          >
            <Shield className="h-4 w-4" />
            <span>{t('dashboard.boardingCheck')}</span>
          </Link>
          <Link
            to="/passengers"
            className="px-3.5 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 font-bold rounded-xl text-xs shadow-xs transition flex items-center space-x-1.5 cursor-pointer"
          >
            <Plus className="h-4 w-4 text-amber-500" />
            <span>{t('passengers.titleaddpassenger')}</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-2xl p-4 flex items-center justify-between text-xs text-red-800 dark:text-red-300">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
            <span> {error}</span>
          </div>
        </div>
      )}

      {/* KPI Stats Grid */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <StatsCard
          title={t('dashboard.totalBanned')}
          value={stats.totalBanned}
          icon={UserX}
          color="brown"
          subtitle=""
        />
        <StatsCard
          title={t('dashboard.activeBans')}
          value={stats.activeBans}
          icon={Shield}
          color="orange"
          subtitle=""
        />
        <StatsCard
          title={t('dashboard.criticalCases')}
          value={stats.criticalCases}
          icon={AlertTriangle}
          color="red"
          subtitle=""
        />
        <StatsCard
          title={t('dashboard.thisWeek')}
          value={stats.recentBans}
          icon={TrendingUp}
          color="yellow"
          subtitle=""
        />
      </motion.div>

      {/* Quick Passport Clearance Widget */}
      <div className="bg-gradient-to-r from-slate-900 via-amber-950 to-slate-900 rounded-2xl shadow-lg p-5 sm:p-6 text-white border border-amber-500/20">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <div>
            <h3 className="text-base font-bold flex items-center space-x-2">
              <Search className="h-5 w-5 text-yellow-400" />
              <span>{t('dashboard.quickCheckTitle')}</span>
            </h3>
            <p className="text-xs text-slate-300 mt-0.5">
              {t('dashboard.quickCheckDesc')}
            </p>
          </div>
        </div>

        <form onSubmit={handleQuickCheck} className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={quickPassport}
            onChange={(e) => setQuickPassport(e.target.value)}
            placeholder="Passport  N° (Ex: AB1234567)"
            className="flex-1 px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-slate-400 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-yellow-400 uppercase tracking-wider"
          />
          <button
            type="submit"
            disabled={checking}
            className="px-5 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold rounded-xl text-xs transition shadow cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            <Shield className="h-4 w-4" />
            <span>{checking ? t('dashboard.quickCheckPlaceholder') : t('dashboard.quickCheckBtn')}</span>
          </button>
        </form>

        {quickResult?.checked && (
          <div className="mt-4 pt-4 border-t border-white/10 animate-in fade-in">
            {quickResult.found ? (
              <div className="flex items-start justify-between bg-red-900/60 border border-red-500 p-4 rounded-xl text-red-100 text-xs">
                <div className="flex items-start space-x-3">
                  <ShieldAlert className="h-6 w-6 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-black uppercase tracking-wider text-red-300">
                    { t('dashboard.quickCheckResultFound')}
                    </span>
                    <p className="font-bold text-sm text-white mt-0.5">
                      {quickResult.found.firstName} {quickResult.found.lastName} ({quickResult.found.passportNumber})
                    </p>
                    <p className="text-red-200 mt-1">
                      Motif : {quickResult.found.banReason}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/gate-check')}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg text-xs transition shrink-0"
                >
                  {t('dashboard.openFolder')}
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-3 bg-green-900/60 border border-green-500 p-3.5 rounded-xl text-green-100 text-xs">
                <CheckCircle className="h-5 w-5 text-green-400 shrink-0" />
                <span>
                  {t('dashboard.quickCheckResultNotFound')} <strong>{quickPassport.toUpperCase()}</strong> {t('dashboard.quickCheckResultNotFoundDesc')}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Grid: Circular Severity Chart & Recent Ban Details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* AESTHETIC CIRCULAR DONUT CHART: Répartition par niveau de gravité */}
        <div className="lg:col-span-7 bg-white dark:bg-gray-800 rounded-2xl shadow-xs border border-gray-200 dark:border-gray-700 p-6 flex flex-col justify-between">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                    {t('dashboard.severityDistribution')}
                  </h3>
                </div>
              </div>
              <span className="px-2.5 py-1 bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-lg text-xs font-mono font-bold">
                {passengers.length} {t('dashboard.totalBanned')}
              </span>
            </div>

            {/* Circular Chart & Interactive Legend Section */}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-12 gap-6 items-center">
              
              {/* Donut Chart SVG Graphic */}
              <div className="sm:col-span-6 flex flex-col items-center justify-center relative">
                <div className="relative w-56 h-56 flex items-center justify-center">
                  <svg
                    viewBox="0 0 220 220"
                    className="w-full h-full transform -rotate-90 transition-transform duration-500 drop-shadow-md"
                  >
                    <defs>
                      {/* Linear gradients for aesthetic neon glow and rich hues */}
                      <linearGradient id="grad-crit" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#f87171" />
                        <stop offset="100%" stopColor="#dc2626" />
                      </linearGradient>
                      <linearGradient id="grad-high" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#fb923c" />
                        <stop offset="100%" stopColor="#ea580c" />
                      </linearGradient>
                      <linearGradient id="grad-med" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#fde047" />
                        <stop offset="100%" stopColor="#ca8a04" />
                      </linearGradient>
                      <linearGradient id="grad-low" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#34d399" />
                        <stop offset="100%" stopColor="#059669" />
                      </linearGradient>
                      <filter id="glow-filter" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="0" stdDeviation="4" floodOpacity="0.35" />
                      </filter>
                    </defs>

                    {/* Background track circle */}
                    <circle
                      cx="110"
                      cy="110"
                      r={donutMetrics.radius}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="20"
                      className="text-gray-100 dark:text-gray-700/60"
                    />

                    {/* Populated Slices */}
                    {passengers.length > 0 &&
                      donutMetrics.segments.map((seg) => {
                        if (seg.count === 0) return null;
                        const isHovered = hoveredSeverity === seg.key;
                        const hasHover = hoveredSeverity !== null;

                        return (
                          <circle
                            key={seg.key}
                            cx="110"
                            cy="110"
                            r={donutMetrics.radius}
                            fill="none"
                            stroke={`url(#${seg.gradientId})`}
                            strokeWidth={isHovered ? 26 : 20}
                            strokeDasharray={`${seg.dashLength} ${seg.dashGap}`}
                            strokeDashoffset={-seg.offset}
                            strokeLinecap="round"
                            className="cursor-pointer transition-all duration-300"
                            style={{
                              opacity: hasHover ? (isHovered ? 1 : 0.45) : 1,
                              filter: isHovered ? 'url(#glow-filter)' : undefined,
                            }}
                            onMouseEnter={() => setHoveredSeverity(seg.key)}
                            onMouseLeave={() => setHoveredSeverity(null)}
                          />
                        );
                      })}
                  </svg>

                  {/* Dynamic Centered Readout inside the Donut */}
                  <div
                    className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-4 select-none"
                    style={{ transform: 'none' }}
                  >
                    {activeHoverConfig ? (
                      <motion.div
                        key={activeHoverConfig.key}
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.15 }}
                        className="flex flex-col items-center"
                      >
                        <div className="flex items-center space-x-1.5 mb-0.5">
                          <span className={`w-2 h-2 rounded-full ${activeHoverConfig.dotClass}`} />
                          <span className="text-[11px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">
                            {activeHoverConfig.label}
                          </span>
                        </div>
                        <span className="text-3xl font-black text-gray-900 dark:text-white leading-tight">
                          {activeHoverConfig.count}
                        </span>
                        <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                          {activeHoverConfig.percentage.toFixed(1)}% {t('dashboard.ofTotal')}
                        </span>
                      </motion.div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <Shield className="h-5 w-5 text-amber-500 mb-0.5" />
                        <span className="text-3xl font-black text-gray-900 dark:text-white leading-tight">
                          {passengers.length}
                        </span>
                        <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                          {t('dashboard.totalDossiers')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Sub-label under donut */}
                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-2 text-center">
                  {t('dashboard.severityDistributionDesc')}
                </p>
              </div>

              {/* Aesthetic Interactive Legend Cards */}
              <div className="sm:col-span-6 space-y-2.5">
                {severityConfigs.map((item) => {
                  const isHovered = hoveredSeverity === item.key;
                  return (
                    <div
                      key={item.key}
                      onMouseEnter={() => setHoveredSeverity(item.key)}
                      onMouseLeave={() => setHoveredSeverity(null)}
                      className={`p-3 rounded-xl border transition-all duration-200 cursor-pointer ${
                        isHovered
                          ? 'bg-gray-50 dark:bg-gray-700/80 border-amber-400 dark:border-amber-500 shadow-sm translate-x-1'
                          : 'bg-white dark:bg-gray-800/60 border-gray-150 dark:border-gray-700/60 hover:bg-gray-50/70 dark:hover:bg-gray-700/40'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2.5">
                          <span
                            className={`w-3 h-3 rounded-full shrink-0 ${item.dotClass} ${
                              item.key === 'CRITICAL' && item.count > 0 ? 'animate-pulse' : ''
                            }`}
                          />
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="text-xs font-bold text-gray-900 dark:text-white">
                                {item.label}
                              </span>
                              <span className="text-[10px] text-gray-400 dark:text-gray-500 font-mono">
                                ({item.count})
                              </span>
                            </div>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400 line-clamp-1">
                              {item.desc}
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className={`px-2 py-0.5 text-xs font-bold font-mono rounded-md border ${item.badgeClass}`}>
                            {item.percentage.toFixed(0)}%
                          </span>
                        </div>
                      </div>

                      {/* Micro Progress Bar inside each legend card */}
                      <div className="w-full bg-gray-100 dark:bg-gray-700 h-1.5 rounded-full overflow-hidden mt-2">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${item.percentage}%`,
                            backgroundColor: item.color,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Key Security Takeaway / Bottom Insight Banner */}
          <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs bg-amber-50/60 dark:bg-amber-950/20 p-3.5 rounded-xl border border-amber-200/50 dark:border-amber-900/30">
            <div className="flex items-center space-x-2.5">
              <Flame className="h-4 w-4 text-red-500 shrink-0" />
              <span className="text-gray-700 dark:text-gray-300">
                <strong>{criticalAndHighTotal.percentage}%</strong> {t('dashboard.ofTotal')}{' '}
                <strong className="text-red-600 dark:text-red-400">{t('dashboard.critical')}</strong> ou{' '}
                <strong className="text-orange-600 dark:text-orange-400">{t('dashboard.high')}</strong>.
              </span>
            </div>
            <Link
              to="/passengers"
              className="text-amber-700 dark:text-amber-400 font-bold hover:underline flex items-center space-x-1 shrink-0"
            >
              <span>{t('dashboard.viewAll')}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* RIGHT COLUMN: Dernières inscriptions + Top Nationalités */}
        <div className="lg:col-span-5 space-y-6">
          {/* Passagers récemment bannis */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xs border border-gray-200 dark:border-gray-700 p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-700">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-amber-500" />
                  <span>{t('dashboard.recentBans')}</span>
                </h3>
                <Link
                  to="/passengers"
                  className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline flex items-center space-x-1"
                >
                  <span>Voir tous</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>

              <div className="divide-y divide-gray-100 dark:divide-gray-700 mt-2">
                {recentPassengers.length > 0 ? (
                  recentPassengers.map((passenger) => (
                    <div
                      key={passenger.id}
                      className="py-3 flex items-center justify-between hover:bg-gray-50/50 dark:hover:bg-gray-700/30 px-2 rounded-lg transition"
                    >
                      <div className="space-y-0.5">
                        <p className="text-xs font-bold text-gray-900 dark:text-white">
                          {passenger.firstName} {passenger.lastName}
                        </p>
                        <div className="flex items-center space-x-2 text-[11px] text-gray-500 dark:text-gray-400">
                          <span className="font-mono">{passenger.passportNumber}</span>
                          <span>•</span>
                          <span>{passenger.nationality}</span>
                          <span>•</span>
                          <span>{passenger.banDate}</span>
                        </div>
                      </div>
                      <span
                        className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-md ${
                          severityColors[passenger.severity] || severityColors.MEDIUM
                        }`}
                      >
                        {passenger.severity}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="py-6 text-center text-xs text-gray-400">
                    Aucun passager banni enregistré sur le serveur.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Top Nationalités */}
          {topNationalities.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xs border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center space-x-2 pb-4 border-b border-gray-100 dark:border-gray-700">
                <Globe className="h-4 w-4 text-amber-500" />
                <span>{t('dashboard.topNationalities')}</span>
              </h3>
              <div className="flex flex-wrap gap-2 mt-4">
                {topNationalities.map(([nat, count]) => (
                  <div
                    key={nat}
                    className="px-3 py-1.5 bg-gray-50 dark:bg-gray-700/60 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center space-x-2 text-xs"
                  >
                    <span className="font-bold text-gray-900 dark:text-white">{nat}</span>
                    <span className="px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 font-bold text-[10px]">
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;