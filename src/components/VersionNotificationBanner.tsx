import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, Sparkles, BookOpen } from 'lucide-react';
import { APP_CURRENT_VERSION } from '../utils/changelog';

interface VersionNotificationBannerProps {
  activeTab: string;
  isLoggedIn: boolean;
  isPersian?: boolean;
  onOpenChangelog?: () => void;
}

export const VersionNotificationBanner: React.FC<VersionNotificationBannerProps> = ({
  activeTab,
  isLoggedIn,
  isPersian = true,
  onOpenChangelog
}) => {
  const [serverVersion, setServerVersion] = useState<string | null>(null);
  const [hasNewVersion, setHasNewVersion] = useState(false);

  // Keep track of the initial tab when new version was detected
  const tabWhenDetectedRef = useRef<string | null>(null);
  const loginStateWhenDetectedRef = useRef<boolean | null>(null);

  // Check version from server
  const checkServerVersion = () => {
    fetch('/api/version')
      .then(res => res.json())
      .then(data => {
        if (data && data.version && data.version !== APP_CURRENT_VERSION) {
          setServerVersion(data.version);
          setHasNewVersion(true);

          if (!tabWhenDetectedRef.current) {
            tabWhenDetectedRef.current = activeTab;
          }
          if (loginStateWhenDetectedRef.current === null) {
            loginStateWhenDetectedRef.current = isLoggedIn;
          }
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    checkServerVersion();
    const interval = setInterval(checkServerVersion, 8000);
    const handleFocus = () => checkServerVersion();
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Only reload when the user explicitly clicks the update button
  // "تازمانی که کاربر دکمه رفرش رو نزنه نباید نسخه جدید بارگذاری بشه شاید درحال پر کردن یه مودال یا تغییر باشه"

  if (!hasNewVersion || !serverVersion) return null;

  return (
    <div
      role="alert"
      className="sticky top-0 z-50 bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white px-4 py-2.5 text-xs shadow-md border-b border-blue-400/30 flex flex-wrap items-center justify-between gap-3 font-b-nazanin animate-in slide-in-from-top duration-300"
    >
      <div className="flex items-center gap-2.5">
        <span className="relative flex h-3 w-3 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
        </span>
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm">
            {isPersian
              ? `نسخه جدید سامانه (${serverVersion}) در دسترس است`
              : `New version (${serverVersion}) is available`}
          </span>
          <span className="hidden md:inline text-blue-100 text-xs">
            {isPersian
              ? 'تغییرات جدید اعمال شده است. برای بارگذاری، روی دکمه به‌روزرسانی بزنید.'
              : 'New updates deployed. Click update to reload the latest changes.'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 mr-auto ml-0">
        {onOpenChangelog && (
          <button
            type="button"
            tabIndex={0}
            onClick={onOpenChangelog}
            className="px-3 py-1.5 bg-white/15 hover:bg-white/25 text-white font-semibold rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer focus:ring-2 focus:ring-white focus:outline-hidden"
          >
            <BookOpen className="w-3.5 h-3.5 text-blue-200" />
            <span>{isPersian ? 'مشاهده تغییرات نسخه' : 'View Changelog'}</span>
          </button>
        )}

        <button
          type="button"
          tabIndex={0}
          onClick={() => window.location.reload()}
          className="px-3.5 py-1.5 bg-white text-blue-900 hover:bg-blue-50 font-bold rounded-lg shadow-xs text-xs flex items-center gap-1.5 transition-all hover:scale-102 active:scale-98 cursor-pointer focus:ring-2 focus:ring-blue-300 focus:outline-hidden"
        >
          <RefreshCw className="w-3.5 h-3.5 text-blue-700 animate-spin-reverse" />
          <span>{isPersian ? 'به‌روزرسانی و بارگذاری مجدد' : 'Update & Reload'}</span>
        </button>
      </div>
    </div>
  );
};
