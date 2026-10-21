import React, { useState, useEffect } from 'react';
import { User } from './types';
import { StorageService } from './utils/storage';
import { translations, Language } from './utils/translations';
import { Navbar } from './components/Navbar';
import { Sidebar, ActiveTab } from './components/Sidebar';
import { ChangelogModal } from './components/ChangelogModal';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { VersionNotificationBanner } from './components/VersionNotificationBanner';
import { AuthView } from './views/AuthView';

// Views
import { DashboardView } from './views/DashboardView';
import { WorkRecordsView } from './views/WorkRecordsView';
import { ProjectsView } from './views/ProjectsView';
import { ReportsView } from './views/ReportsView';
import { BackupsView } from './views/BackupsView';
import { UserManagementView } from './views/UserManagementView';
import { RequestsView } from './views/RequestsView';
import { GroupsView } from './views/GroupsView';
import { ProfileView } from './views/ProfileView';
import { LogsView } from './views/LogsView';
import { SettingsView } from './views/SettingsView';
import { SessionsSecurityView } from './views/SessionsSecurityView';
import { MessengerView } from './views/MessengerView';
import { AllRecordsView } from './views/AllRecordsView';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() =>
    StorageService.getCurrentUser()
  );

  const [lang, setLang] = useState<Language>(() => StorageService.getLanguage());
  const getInitialTab = (): ActiveTab => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.replace(/^#\/?/, '') as ActiveTab;
      const validTabs: ActiveTab[] = [
        'dashboard', 'allRecords', 'attendance', 'missions', 'leaves', 'special',
        'projects', 'reports', 'backups', 'requests', 'users',
        'groups', 'profile', 'logs', 'settings', 'sessions', 'messenger'
      ];
      if (validTabs.includes(hash)) return hash;

      const stored = localStorage.getItem('attendance_active_tab') as ActiveTab;
      if (stored && validTabs.includes(stored)) return stored;
    }
    return 'dashboard';
  };

  const [activeTab, setActiveTabState] = useState<ActiveTab>(getInitialTab);

  const setActiveTab = (tab: ActiveTab) => {
    setActiveTabState(tab);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('attendance_active_tab', tab);
        window.location.hash = tab;
      } catch {}
    }
  };

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace(/^#\/?/, '') as ActiveTab;
      const validTabs: ActiveTab[] = [
        'dashboard', 'allRecords', 'attendance', 'missions', 'leaves', 'special',
        'projects', 'reports', 'backups', 'requests', 'users',
        'groups', 'profile', 'logs', 'settings', 'sessions', 'messenger'
      ];
      if (validTabs.includes(hash)) {
        setActiveTabState(hash);
        localStorage.setItem('attendance_active_tab', hash);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const [isChangelogOpen, setIsChangelogOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  // Never show password change modal on refresh
  const [showPasswordChangeModal, setShowPasswordChangeModal] = useState(false);

  // Sync language with HTML tag & document dir
  useEffect(() => {
    StorageService.setLanguage(lang);
  }, [lang]);

  // Apply colors and sync database with server on mount
  useEffect(() => {
    StorageService.applyThemeColors(StorageService.getSettings());

    // Apply saved theme (light / dark)
    const savedTheme = localStorage.getItem('app_theme') || 'light';
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    const handleThemeChange = (e: any) => {
      const mode = e.detail?.theme;
      if (mode === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };
    window.addEventListener('app_theme_changed', handleThemeChange);

    const handleAvatarUpdate = () => {
      const u = StorageService.getCurrentUser();
      if (u) setCurrentUser({ ...u });
    };
    window.addEventListener('user_avatar_updated', handleAvatarUpdate);

    StorageService.syncFromServer().then(updated => {
      if (updated) {
        const u = StorageService.getCurrentUser();
        if (u) setCurrentUser(u);
      }
    });

    return () => {
      window.removeEventListener('app_theme_changed', handleThemeChange);
      window.removeEventListener('user_avatar_updated', handleAvatarUpdate);
    };
  }, []);

  const handleToggleLang = () => {
    const nextLang: Language = lang === 'fa' ? 'en' : 'fa';
    setLang(nextLang);
    StorageService.setLanguage(nextLang);
  };

  const handleLogout = () => {
    StorageService.clearCurrentAuth();
    setCurrentUser(null);
    setActiveTab('dashboard');
    try {
      localStorage.removeItem('attendance_active_tab');
      if (window.location.hash) {
        history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    } catch {}
    setShowPasswordChangeModal(false);
  };

  // If not logged in, show Auth view with version notification banner
  if (!currentUser) {
    return (
      <div className={`min-h-screen flex flex-col bg-slate-50 ${lang === 'fa' ? 'font-persian' : 'font-english'}`} dir={lang === 'fa' ? 'rtl' : 'ltr'}>
        <VersionNotificationBanner
          activeTab="auth"
          isLoggedIn={false}
          isPersian={lang === 'fa'}
          onOpenChangelog={() => setIsChangelogOpen(true)}
        />
        <AuthView
          onLoginSuccess={user => {
            setCurrentUser(user);
            setActiveTab('dashboard');
            if (user.mustChangePassword) {
              setShowPasswordChangeModal(true);
            }
          }}
          lang={lang}
          onToggleLang={handleToggleLang}
        />
        {isChangelogOpen && (
          <ChangelogModal
            isOpen={isChangelogOpen}
            onClose={() => setIsChangelogOpen(false)}
            isPersian={lang === 'fa'}
          />
        )}
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 ${lang === 'fa' ? 'font-persian' : 'font-english'}`} dir={lang === 'fa' ? 'rtl' : 'ltr'}>
      {/* Sidebar (Desktop and Mobile Drawer) */}
      <Sidebar
        user={currentUser}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        lang={lang}
        onOpenChangelog={() => setIsChangelogOpen(true)}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen overflow-x-hidden">
        {/* Top-of-screen New Version Notification Banner */}
        <VersionNotificationBanner
          activeTab={activeTab}
          isLoggedIn={true}
          isPersian={lang === 'fa'}
          onOpenChangelog={() => setIsChangelogOpen(true)}
        />

        <Navbar
          user={currentUser}
          onLogout={handleLogout}
          lang={lang}
          onToggleLang={handleToggleLang}
          onOpenMobileMenu={() => setIsMobileSidebarOpen(true)}
        />

        <main className="flex-1 p-3 sm:p-5 lg:p-6 max-w-7xl w-full mx-auto">
          {activeTab === 'dashboard' && (
            <DashboardView
              user={currentUser}
              lang={lang}
              onNavigateTab={tab => setActiveTab(tab)}
            />
          )}

          {activeTab === 'allRecords' && (
            <AllRecordsView
              user={currentUser}
              lang={lang}
              onNavigateTab={tab => setActiveTab(tab)}
            />
          )}

          {activeTab === 'attendance' && (
            <WorkRecordsView
              user={currentUser}
              type="regular"
              lang={lang}
              onNavigateTab={tab => setActiveTab(tab)}
            />
          )}

          {activeTab === 'missions' && (
            <WorkRecordsView
              user={currentUser}
              type="mission"
              lang={lang}
              onNavigateTab={tab => setActiveTab(tab)}
            />
          )}

          {activeTab === 'leaves' && (
            <WorkRecordsView
              user={currentUser}
              type="leave"
              lang={lang}
              onNavigateTab={tab => setActiveTab(tab)}
            />
          )}

          {activeTab === 'special' && (
            <WorkRecordsView
              user={currentUser}
              type="special"
              lang={lang}
              onNavigateTab={tab => setActiveTab(tab)}
            />
          )}

          {activeTab === 'projects' && (
            <ProjectsView
              user={currentUser}
              lang={lang}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsView
              user={currentUser}
              lang={lang}
            />
          )}

          {activeTab === 'backups' && (
            <BackupsView
              user={currentUser}
              lang={lang}
            />
          )}

          {activeTab === 'requests' && (
            <RequestsView
              user={currentUser}
              lang={lang}
            />
          )}

          {activeTab === 'users' && (
            <UserManagementView
              user={currentUser}
              lang={lang}
            />
          )}

          {activeTab === 'groups' && (
            <GroupsView
              user={currentUser}
              lang={lang}
            />
          )}

          {activeTab === 'profile' && (
            <ProfileView
              user={currentUser}
              lang={lang}
              onUserUpdated={(updated) => setCurrentUser(updated)}
            />
          )}

          {activeTab === 'messenger' && (
            <MessengerView
              user={currentUser}
              lang={lang}
            />
          )}

          {activeTab === 'sessions' && currentUser.role === 'admin' && (
            <SessionsSecurityView
              user={currentUser}
              lang={lang}
            />
          )}

          {activeTab === 'logs' && (
            <LogsView
              user={currentUser}
              lang={lang}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              user={currentUser}
              lang={lang}
            />
          )}
        </main>
      </div>

      {/* Mandatory Password Change Modal on explicit prompt */}
      {showPasswordChangeModal && (
        <ChangePasswordModal
          user={currentUser}
          isPersian={lang === 'fa'}
          onClose={() => setShowPasswordChangeModal(false)}
          onSuccess={updatedUser => {
            setCurrentUser(updatedUser);
            setShowPasswordChangeModal(false);
          }}
        />
      )}

      {/* Changelog & Version History Modal */}
      <ChangelogModal
        isOpen={isChangelogOpen}
        onClose={() => setIsChangelogOpen(false)}
        isPersian={lang === 'fa'}
      />
    </div>
  );
}
