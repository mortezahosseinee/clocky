import React, { useState, useEffect } from 'react';
import { User } from './types';
import { StorageService } from './utils/storage';
import { translations, Language } from './utils/translations';
import { Navbar } from './components/Navbar';
import { Sidebar, ActiveTab } from './components/Sidebar';
import { ChangelogModal } from './components/ChangelogModal';
import { ChangePasswordModal } from './components/ChangePasswordModal';
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

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() =>
    StorageService.getCurrentUser()
  );

  const [lang, setLang] = useState<Language>(() => StorageService.getLanguage());
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [isChangelogOpen, setIsChangelogOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Sync language with HTML tag & document dir
  useEffect(() => {
    StorageService.setLanguage(lang);
  }, [lang]);

  // Apply colors and sync database with server on mount
  useEffect(() => {
    StorageService.applyThemeColors(StorageService.getSettings());
    StorageService.syncFromServer().then(updated => {
      if (updated) {
        const u = StorageService.getCurrentUser();
        if (u) setCurrentUser(u);
      }
    });
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
  };

  // If not logged in, show Auth view
  if (!currentUser) {
    return (
      <AuthView
        onLoginSuccess={user => {
          setCurrentUser(user);
          setActiveTab('dashboard');
        }}
        lang={lang}
        onToggleLang={handleToggleLang}
      />
    );
  }

  return (
    <div className={`min-h-screen flex bg-slate-50 text-slate-900 ${lang === 'fa' ? 'font-persian' : 'font-english'}`} dir={lang === 'fa' ? 'rtl' : 'ltr'}>
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

          {activeTab === 'attendance' && (
            <WorkRecordsView
              user={currentUser}
              type="regular"
              lang={lang}
            />
          )}

          {activeTab === 'missions' && (
            <WorkRecordsView
              user={currentUser}
              type="mission"
              lang={lang}
            />
          )}

          {activeTab === 'leaves' && (
            <WorkRecordsView
              user={currentUser}
              type="leave"
              lang={lang}
            />
          )}

          {activeTab === 'special' && (
            <WorkRecordsView
              user={currentUser}
              type="special"
              lang={lang}
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

      {/* Mandatory Password Change Modal on first login */}
      {/* "پیش فرض یه اکانت مدیر با یوزر admin و رمز admin درست کن و در بدو ورود مجبور به تغییر رمز باشه... کاربر اگر فعال باشه میتونه لاگین کنه... و در بدو ورود مجبور به تغییر رمز هست" */}
      {currentUser.mustChangePassword && (
        <ChangePasswordModal
          user={currentUser}
          isPersian={lang === 'fa'}
          onSuccess={updatedUser => {
            setCurrentUser(updatedUser);
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
