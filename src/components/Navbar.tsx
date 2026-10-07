import React from 'react';
import { User } from '../types';
import { translations, Language } from '../utils/translations';
import { StorageService } from '../utils/storage';
import { Globe, LogOut, Menu } from 'lucide-react';

interface NavbarProps {
  user: User;
  onLogout: () => void;
  lang: Language;
  onToggleLang: () => void;
  onOpenMobileMenu?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onLogout,
  lang,
  onToggleLang,
  onOpenMobileMenu
}) => {
  const t = translations[lang];
  const isPersian = lang === 'fa';
  const settings = StorageService.getSettings();

  const getRoleBadge = () => {
    switch (user.role) {
      case 'admin':
        return { label: t.adminRole, bg: 'bg-red-50 text-red-700 border-red-200' };
      case 'inspector':
        return { label: t.inspectorRole, bg: 'bg-purple-50 text-purple-700 border-purple-200' };
      case 'executive':
        return { label: t.executiveRole, bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      default:
        return { label: t.employeeRole, bg: 'bg-blue-50 text-blue-700 border-blue-200' };
    }
  };

  const badge = getRoleBadge();

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between shrink-0 shadow-2xs">
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Mobile menu trigger */}
        {onOpenMobileMenu && (
          <button
            onClick={onOpenMobileMenu}
            className="md:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div className="text-xs text-slate-500 font-medium truncate">
          <span className="hidden sm:inline">{isPersian ? 'خوش آمدید،' : 'Welcome,'}{' '}</span>
          <span className="font-bold text-slate-800 text-sm">
            {user.firstName} {user.lastName}
          </span>
        </div>

        <span className={`text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded-md border shrink-0 ${badge.bg}`}>
          {badge.label}
        </span>

        {user.jobTitle && (
          <span className="hidden lg:inline-block text-[11px] text-slate-400 border-r border-l px-2.5">
            {user.jobTitle}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Language switch */}
        <button
          onClick={onToggleLang}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
          title={isPersian ? 'تغییر زبان به انگلیسی' : 'Switch to Persian'}
        >
          <Globe className="w-3.5 h-3.5 text-slate-500" />
          <span>{isPersian ? 'English' : 'فارسی'}</span>
        </button>

        {/* Logout */}
        <button
          onClick={onLogout}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50/70 hover:bg-red-100 border border-red-200 rounded-lg transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{t.logout}</span>
        </button>
      </div>
    </header>
  );
};
