import React from 'react';
import {
  LayoutDashboard,
  Clock,
  Briefcase,
  CalendarCheck,
  Zap,
  FolderKanban,
  FileSpreadsheet,
  DatabaseBackup,
  Users,
  UserCheck,
  Shield,
  Layers,
  History,
  Settings,
  GitBranch,
  UserCircle,
  X
} from 'lucide-react';
import { User } from '../types';
import { translations, Language } from '../utils/translations';
import { APP_CURRENT_VERSION } from '../utils/changelog';
import { StorageService } from '../utils/storage';
import { getCustomizedTitle } from '../utils/customTitles';

export type ActiveTab =
  | 'dashboard'
  | 'attendance'
  | 'missions'
  | 'leaves'
  | 'special'
  | 'projects'
  | 'reports'
  | 'backups'
  | 'requests'
  | 'users'
  | 'groups'
  | 'profile'
  | 'logs'
  | 'settings';

interface SidebarProps {
  user: User;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  lang: Language;
  onOpenChangelog: () => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  user,
  activeTab,
  setActiveTab,
  lang,
  onOpenChangelog,
  isOpenMobile = false,
  onCloseMobile
}) => {
  const t = translations[lang];
  const isPersian = lang === 'fa';
  const settings = StorageService.getSettings();

  const orgName = settings.organizationName
    ? settings.organizationName
    : (isPersian ? 'نرم افزار ثبت تردد' : 'Attendance Tracking Software');

  const orgLogo = settings.organizationLogo;

  const pendingRequestsCount = StorageService.getRegistrationRequests().filter(r => r.status === 'pending').length;

  const isInspector = user.role === 'inspector';
  const isAdmin = user.role === 'admin';

  const menuItems = [
    {
      id: 'dashboard' as ActiveTab,
      label: getCustomizedTitle('dashboard', lang),
      icon: LayoutDashboard,
      visible: true
    },
    {
      id: 'attendance' as ActiveTab,
      label: getCustomizedTitle('attendance', lang),
      icon: Clock,
      visible: !isAdmin
    },
    {
      id: 'missions' as ActiveTab,
      label: getCustomizedTitle('missions', lang),
      icon: Briefcase,
      visible: !isAdmin
    },
    {
      id: 'leaves' as ActiveTab,
      label: getCustomizedTitle('leaves', lang),
      icon: CalendarCheck,
      visible: !isAdmin
    },
    {
      id: 'special' as ActiveTab,
      label: getCustomizedTitle('specialWork', lang),
      icon: Zap,
      visible: !isAdmin
    },
    {
      id: 'projects' as ActiveTab,
      label: getCustomizedTitle('projects', lang),
      icon: FolderKanban,
      visible: true
    },
    {
      id: 'reports' as ActiveTab,
      label: getCustomizedTitle('reports', lang),
      icon: FileSpreadsheet,
      visible: isAdmin || isInspector
    },
    {
      id: 'backups' as ActiveTab,
      label: getCustomizedTitle('backups', lang),
      icon: DatabaseBackup,
      visible: isAdmin || isInspector
    },
    {
      id: 'requests' as ActiveTab,
      label: getCustomizedTitle('registrationRequests', lang),
      icon: UserCheck,
      visible: isAdmin,
      badge: pendingRequestsCount > 0 ? pendingRequestsCount : undefined
    },
    {
      id: 'users' as ActiveTab,
      label: getCustomizedTitle('userManagement', lang),
      icon: Users,
      visible: isAdmin
    },
    {
      id: 'groups' as ActiveTab,
      label: getCustomizedTitle('groupManagement', lang),
      icon: Layers,
      visible: isAdmin
    },
    {
      id: 'profile' as ActiveTab,
      label: isPersian ? 'پروفایل و نشست‌ها' : 'Profile & Sessions',
      icon: UserCircle,
      visible: true
    },
    {
      id: 'logs' as ActiveTab,
      label: getCustomizedTitle('systemLogs', lang),
      icon: History,
      visible: isAdmin
    },
    {
      id: 'settings' as ActiveTab,
      label: getCustomizedTitle('settings', lang),
      icon: Settings,
      visible: isAdmin
    }
  ];

  const handleSelectTab = (tab: ActiveTab) => {
    setActiveTab(tab);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const sidebarContent = (
    <div className="w-64 bg-white border-l border-r border-slate-200 flex flex-col h-full shadow-2xs select-none">
      {/* Brand header with Logo & Organization Name */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {orgLogo ? (
            <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center p-1 shrink-0 overflow-hidden shadow-2xs">
              <img src={orgLogo} alt="Logo" className="max-h-full max-w-full object-contain" />
            </div>
          ) : null}

          <div className="min-w-0">
            <h1 className="font-bold text-xs text-slate-900 leading-snug truncate" title={orgName}>
              {orgName}
            </h1>
            <p className="text-[10px] text-slate-500 font-b-nazanin truncate">
              {getCustomizedTitle('appSubtitle', lang) || t.appSubtitle}
            </p>
          </div>
        </div>

        {/* Mobile close button */}
        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="md:hidden p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
        {menuItems
          .filter(item => item.visible)
          .map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
                style={{
                  backgroundColor: isActive ? 'var(--primary-color)' : 'transparent'
                }}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </div>

                {item.badge !== undefined && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-rose-500 text-white animate-pulse">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
      </div>

      {/* Version and Changelog footer */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-[11px] text-slate-500">
        <div className="flex items-center gap-1.5 font-mono text-[10px]">
          <GitBranch className="w-3.5 h-3.5 text-slate-400" />
          <span>{APP_CURRENT_VERSION}</span>
        </div>
        <button
          onClick={onOpenChangelog}
          className="text-blue-600 hover:text-blue-700 hover:underline cursor-pointer font-medium"
        >
          {t.changelog}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop fixed sidebar */}
      <aside className="hidden md:flex h-screen sticky top-0 shrink-0 z-30">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer (Responsive Drawer Navigation) */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Overlay Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          {/* Drawer Body */}
          <div className="relative z-10 flex flex-col h-full bg-white max-w-xs w-full shadow-2xl animate-in slide-in-from-right rtl:slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
