import { useState, useRef, useEffect } from 'react';
import { Menu, Search, LogOut, Moon, Sun, Languages, Server, Shield } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useData } from '../contexts/DataContext';
import { useNavigate } from 'react-router-dom';

interface NavbarProps {
  onMenuClick: () => void;
}

function Navbar({ onMenuClick }: NavbarProps) {
  const { user, logout } = useAuth();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();

  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const languageMenuRef = useRef<HTMLDivElement>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (languageMenuRef.current && !languageMenuRef.current.contains(event.target as Node)) {
        setShowLanguageMenu(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  function handleSearch(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!searchTerm.trim()) return;
    navigate(`/passengers?search=${encodeURIComponent(searchTerm.trim())}`);
  }

  const languages = [
    { code: 'fr', name: 'Français', flag: 'https://flagcdn.com/w40/fr.png' },
    { code: 'en', name: 'English', flag: 'https://flagcdn.com/w40/gb.png' },
  ];

  const currentLanguage = languages.find((lang) => lang.code === language);

  return (
    <>
      <nav className="bg-white dark:bg-gray-800 shadow-xs border-b border-gray-200 dark:border-gray-700 transition-colors z-20">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Left section */}
            <div className="flex items-center space-x-3">
              <button
                onClick={onMenuClick}
                className="lg:hidden p-2 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none"
              >
                <Menu className="h-6 w-6" />
              </button>
              <div className="flex items-center space-x-2.5">
                <div className="p-1 bg-white rounded-lg shadow-xs border border-gray-200 dark:border-gray-700 flex items-center justify-center shrink-0">
                  <img src="/image_logo.png" alt="ASKY Airlines" className="h-6 w-auto object-contain" />
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xl font-black tracking-tight text-gray-900 dark:text-white">
                    Travel<span className="text-amber-500">Banned</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Center: Search */}
            <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-md mx-6">
              <div className="relative w-full">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={t("nav.searchPlaceholder")}
                  className="w-full pl-9 pr-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-xl text-xs placeholder-gray-400 bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:bg-white dark:focus:bg-gray-700 transition"
                />
              </div>
            </form>

            {/* Right section: Backend badge, Language, Theme, Profile */}
            <div className="flex items-center space-x-2 sm:space-x-3">
              {/* Language Selector */}
              <div className="relative" ref={languageMenuRef}>
                <button
                  onClick={() => setShowLanguageMenu(!showLanguageMenu)}
                  className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition flex items-center space-x-1 text-xs font-semibold cursor-pointer"
                  title={t('nav.changeLanguage')}
                >
                  <Languages className="h-4 w-4" />
                  <span>{currentLanguage?.code.toUpperCase()}</span>
                </button>

                {showLanguageMenu && (
                  <div className="absolute right-0 mt-2 w-36 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 py-1 z-50">
                    {languages.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => {
                          setLanguage(lang.code as 'fr' | 'en');
                          setShowLanguageMenu(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs flex items-center space-x-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition cursor-pointer ${
                          language === lang.code
                            ? 'font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40'
                            : 'text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        <span className="text-sm">{lang.code}</span>
                        <span>{lang.name}</span>
                        <img
                          src={lang.flag}
                          alt={`Drapeau ${lang.name}`}
                          className="w-5 h-4 object-cover rounded-sm"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Dark mode toggle */}
              <button
                onClick={toggleDarkMode}
                className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition cursor-pointer"
                title={isDarkMode ? 'Mode clair' : 'Mode sombre'}
              >
                {isDarkMode ? <Sun className="h-4 w-4 text-yellow-400" /> : <Moon className="h-4 w-4" />}
              </button>

              {/* User profile dropdown / info */}
              <div className="flex items-center space-x-2.5 pl-2 border-l border-gray-200 dark:border-gray-700">
                <div className="hidden sm:block text-right">
                  <div className="text-xs font-bold text-gray-900 dark:text-white leading-tight">
                    {user?.name || 'Agent Sûreté'}
                  </div>
                   <div className="text-[10px] font-medium text-amber-600 dark:text-amber-400">
                    {user?.role === 'super-admin'
                      ? 'Super Administrateur'
                      : user?.role === 'admin'
                      ? 'Administrateur'
                      : 'Agent Escale'}
                  </div>
                </div>
                <img
                  src={user?.avatar || '/avatar.jpg'}
                  alt={user?.name}
                  className="h-8 w-8 rounded-full object-cover border-2 border-yellow-400 shadow-xs"
                />
                <button
                  onClick={logout}
                  className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition cursor-pointer"
                  title={t('nav.logout')}
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}

export default Navbar;