import { X, BarChart3, Users, UserX, User, ShieldCheck, FileCheck2, ClipboardList } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLocation, Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useData } from '../contexts/DataContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { isAdmin } = useAuth();
  const { passengers } = useData();
  const location = useLocation();
  const { t } = useLanguage();

  const menuItems = [
    { icon: BarChart3, label: t('nav.dashboard'), path: '/', adminOnly: false },
     { icon: ShieldCheck, label: t('nav.gateCheck'), path: '/gate-check', adminOnly: false },
    { icon: UserX, label: t('nav.passengers'), path: '/passengers', adminOnly: false, badge: passengers.length },
    { icon: Users, label: t('nav.users'), path: '/users', adminOnly: true },
    { icon: ClipboardList, label: t('nav.audit') || 'Journal d\'audit', path: '/audit-logs', adminOnly: true },
    { icon: User, label: t('nav.profile'), path: '/profile', adminOnly: false },
  ];

  const filteredMenuItems = menuItems.filter((item) => !item.adminOnly || isAdmin);

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-xs z-30 lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={`
          fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 text-slate-100 shadow-2xl flex flex-col
          transform transition-transform duration-300 ease-in-out border-r border-slate-800
          lg:translate-x-0 lg:static lg:inset-0
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between h-16 px-4 bg-slate-950/70 border-b border-slate-800">
          <Link to="/" onClick={onClose} className="flex items-center space-x-2.5">
            <div className="p-1.5 bg-white rounded-xl shadow-md">
              <img src="/logo_Asky.png" alt="ASKY Airlines" className="h-7 w-auto" />
            </div>
            <div>
              <span className="text-base font-black tracking-tight text-white">
               Travel<span className="text-yellow-400">Banned</span>
              </span>
              <p className="text-[9px] font-bold tracking-widest uppercase text-yellow-400/90 -mt-0.5">
                ASKY 
              </p>
            </div>
          </Link>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 px-3 py-7 space-y-2 overflow-y-auto">
       
          {filteredMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={`
                  flex items-center justify-between px-3 py-2.5 text-xs font-semibold rounded-xl transition-all duration-150
                  ${
                    isActive
                      ? 'bg-gradient-to-r from-yellow-500 to-amber-500 text-slate-950 font-bold shadow-md shadow-yellow-500/20'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }
                `}
              >
                <div className="flex items-center space-x-3">
                  <Icon className={`h-4 w-4 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                      isActive ? 'bg-slate-900 text-yellow-300' : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Security badge at bottom */}
        <div className="p-4 bg-slate-950/60 border-t border-slate-800/80">
          <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-300"> © 2026 ASKY Airlines</span>
              <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;