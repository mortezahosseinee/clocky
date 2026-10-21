import React, { useState, useMemo, useEffect, useRef } from 'react';
import { User, UserSession, LoginAttempt } from '../types';
import { translations, Language } from '../utils/translations';
import { StorageService, validatePasswordStandard } from '../utils/storage';
import { ConfirmModal } from '../components/ConfirmModal';
import { ImageCropModal } from '../components/ImageCropModal';
import { UserAvatar } from '../components/UserAvatar';
import {
  parseDeviceAndBrowser,
  DEFAULT_AVATAR_PRESETS,
  DEFAULT_AVATAR_COLORS,
  isColorAvatar,
  getColorFromAvatar
} from '../utils/deviceAndIp';
import { toPersianDigits } from '../utils/jalali';
import {
  User as UserIcon,
  Shield,
  Monitor,
  Smartphone,
  LogOut,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  Layers,
  Briefcase,
  Mail,
  Phone,
  ArrowUpDown,
  Filter,
  X,
  Key,
  Upload,
  Camera,
  Trash2,
  Sparkles,
  Lock,
  Eye,
  EyeOff,
  UserCircle,
  Palette
} from 'lucide-react';

interface ProfileViewProps {
  user: User;
  lang: Language;
  onUserUpdated?: (updatedUser: User) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ user, lang, onUserUpdated }) => {
  const t = translations[lang];
  const isPersian = lang === 'fa';
  const isAdmin = user.role === 'admin';

  const allGroups = StorageService.getGroups();
  const currentSessionId = StorageService.getCurrentSessionId();

  // Active Main SubTab
  const [activeSubTab, setActiveSubTab] = useState<'info' | 'password' | 'sessions' | 'logins'>('info');

  // User state
  const [currentUserData, setCurrentUserData] = useState<User>(user);

  // Sync internal user state when prop changes
  useEffect(() => {
    setCurrentUserData(user);
  }, [user]);

  // Listen to avatar updates
  useEffect(() => {
    const handleAvatarUpdate = (e: any) => {
      if (e.detail && e.detail.userId === user.id) {
        setCurrentUserData(prev => ({ ...prev, avatar: e.detail.avatar }));
      }
    };
    window.addEventListener('user_avatar_updated', handleAvatarUpdate);
    return () => window.removeEventListener('user_avatar_updated', handleAvatarUpdate);
  }, [user.id]);

  // Notifications
  const [notification, setNotification] = useState<string | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  // Password Change State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Sessions State
  const [sessions, setSessions] = useState<UserSession[]>(() =>
    StorageService.getSessions()
  );
  const [terminateTargetId, setTerminateTargetId] = useState<string | null>(null);
  const [confirmTerminateAllOthers, setConfirmTerminateAllOthers] = useState(false);

  // Filters for Sessions Table
  const [sessionSearch, setSessionSearch] = useState('');
  const [sessionSortField, setSessionSortField] = useState<'ip' | 'device' | 'loginAt'>('loginAt');
  const [sessionSortAsc, setSessionSortAsc] = useState(false);

  // Filters for Logins Table
  const [logins, setLogins] = useState<LoginAttempt[]>(() =>
    StorageService.getLoginAttempts(user.username)
  );
  const [loginSearch, setLoginSearch] = useState('');
  const [loginStatusFilter, setLoginStatusFilter] = useState<'all' | 'success' | 'failed'>('all');
  const [loginSortField, setLoginSortField] = useState<'timestamp' | 'ip' | 'device'>('timestamp');
  const [loginSortAsc, setLoginSortAsc] = useState(false);

  // File input ref for avatar upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [cropRawSrc, setCropRawSrc] = useState('');

  // Sync sessions from server on mount and continuously every 4 seconds
  useEffect(() => {
    const fetchLatestSessions = () => {
      fetch('/api/sessions')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data.sessions)) {
            const local = StorageService.getSessions();
            const merged = [...data.sessions];
            for (const s of local) {
              if (!merged.some(m => m.id === s.id)) merged.push(s);
            }
            StorageService.saveSessionsDirect(merged);
            setSessions(merged);
          }
        })
        .catch(() => {});
    };

    fetchLatestSessions();
    const interval = setInterval(fetchLatestSessions, 4000);
    return () => clearInterval(interval);
  }, []);

  const reloadData = () => {
    setSessions(StorageService.getSessions());
    setLogins(StorageService.getLoginAttempts(user.username));
    const latestUser = StorageService.getUserById(user.id);
    if (latestUser) {
      setCurrentUserData(latestUser);
      if (onUserUpdated) onUserUpdated(latestUser);
    }
  };

  // Avatar Upload Handler: opens ImageCropModal for user
  const handleAvatarFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorNotice(isPersian ? 'لطفاً یک فایل تصویری معتبر انتخاب نمایید.' : 'Please select a valid image file.');
      setTimeout(() => setErrorNotice(null), 3500);
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorNotice(isPersian ? 'حجم فایل نباید بیش از ۱۰ مگابایت باشد.' : 'Image size must be under 10MB.');
      setTimeout(() => setErrorNotice(null), 3500);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setCropRawSrc(event.target.result as string);
        setIsCropModalOpen(true);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleCropComplete = (croppedDataUrl: string) => {
    setIsCropModalOpen(false);
    const updated = StorageService.updateUserAvatar(user.id, croppedDataUrl);
    if (updated) {
      setCurrentUserData(updated);
      if (onUserUpdated) onUserUpdated(updated);
      setNotification(isPersian ? 'تصویر نمایه با موفقیت برش داده شده و ذخیره شد.' : 'Avatar cropped and updated.');
      setTimeout(() => setNotification(null), 3000);
    }
  };

  // Select Preset Cartoon Avatar
  const handleSelectPresetAvatar = (presetDataUrl: string) => {
    const updated = StorageService.updateUserAvatar(user.id, presetDataUrl);
    if (updated) {
      setCurrentUserData(updated);
      if (onUserUpdated) onUserUpdated(updated);
      setNotification(isPersian ? 'آواتار کارتونی با موفقیت اعمال گردید.' : 'Cartoon avatar selected.');
      setTimeout(() => setNotification(null), 3000);
    }
  };

  // Select Solid Color Avatar ("کاربر بتونه جای اواتار رنگ بزاره")
  const handleSelectColorAvatar = (hex: string) => {
    const colorVal = `color:${hex}`;
    const updated = StorageService.updateUserAvatar(user.id, colorVal);
    if (updated) {
      setCurrentUserData(updated);
      if (onUserUpdated) onUserUpdated(updated);
      setNotification(isPersian ? 'رنگ نمایه با موفقیت اعمال گردید.' : 'Avatar color applied.');
      setTimeout(() => setNotification(null), 3000);
    }
  };

  // Remove Avatar (Revert to default initials)
  const handleRemoveAvatar = () => {
    const updated = StorageService.updateUserAvatar(user.id, '');
    if (updated) {
      setCurrentUserData(updated);
      if (onUserUpdated) onUserUpdated(updated);
      setNotification(isPersian ? 'تصویر نمایه حذف و به حالت اولیه بازگردانده شد.' : 'Avatar removed.');
      setTimeout(() => setNotification(null), 3000);
    }
  };

  // Password Change Submission
  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    const trimmed = newPassword.trim();
    if (!trimmed) {
      setPasswordError(isPersian ? 'رمز عبور نمی‌تواند خالی باشد.' : 'Password cannot be empty.');
      return;
    }

    if (trimmed !== confirmPassword.trim()) {
      setPasswordError(isPersian ? 'تکرار رمز عبور با رمز عبور جدید مطابقت ندارد.' : 'Passwords do not match.');
      return;
    }

    const validation = validatePasswordStandard(trimmed);
    if (!validation.isValid) {
      setPasswordError(isPersian ? 'رمز عبور حداقل باید ۸ کاراکتر و شامل حروف بزرگ، کوچک، عدد و نماد باشد.' : 'Password does not meet complexity rules.');
      return;
    }

    const latest = StorageService.getUserById(user.id) || user;
    const updated: User = {
      ...latest,
      passwordHash: trimmed,
      mustChangePassword: false,
      temporaryPasswordExpiry: undefined
    };

    StorageService.saveUser(updated);
    StorageService.setCurrentUser(updated);
    StorageService.addLog('PASSWORD_CHANGED', `رمز عبور کاربر ${user.username} با موفقیت تغییر یافت.`);

    setCurrentUserData(updated);
    if (onUserUpdated) onUserUpdated(updated);

    setPasswordSuccess(isPersian ? 'رمز عبور جدید شما با موفقیت ثبت شد.' : 'New password updated successfully.');
    setNewPassword('');
    setConfirmPassword('');
    setTimeout(() => setPasswordSuccess(null), 4000);
  };

  // Terminate Single Session
  const handleTerminateSession = () => {
    if (terminateTargetId) {
      StorageService.terminateSession(terminateTargetId);
      setTerminateTargetId(null);
      setNotification(isPersian ? 'نشست انتخابی با موفقیت بسته شد.' : 'Session terminated.');
      setTimeout(() => setNotification(null), 3000);
      reloadData();
    }
  };

  // Terminate All Other Sessions
  const handleTerminateAllOthers = () => {
    if (currentSessionId) {
      StorageService.terminateOtherSessions(user.id, currentSessionId);
      setConfirmTerminateAllOthers(false);
      setNotification(isPersian ? 'تمامی سایر نشست‌های فعال شما در سایر دستگاه‌ها بسته شدند.' : 'All other sessions terminated.');
      setTimeout(() => setNotification(null), 3000);
      reloadData();
    }
  };

  // Filtered & sorted sessions: in Account Information, every user (including admin) only sees their own account sessions
  const userSessions = useMemo(() => {
    return sessions.filter(s => s.userId === user.id || s.username === user.username);
  }, [sessions, user]);

  const filteredSessions = useMemo(() => {
    return userSessions
      .filter(s => {
        if (!s.isActive) return false;
        if (sessionSearch) {
          const q = sessionSearch.toLowerCase();
          const matchIp = s.ip.toLowerCase().includes(q);
          const matchDev = (s.device || '').toLowerCase().includes(q);
          const matchUser = (s.username || '').toLowerCase().includes(q);
          if (!matchIp && !matchDev && !matchUser) return false;
        }
        return true;
      })
      .sort((a, b) => {
        // Current session on top
        if (a.id === currentSessionId) return -1;
        if (b.id === currentSessionId) return 1;

        let diff = 0;
        if (sessionSortField === 'ip') diff = a.ip.localeCompare(b.ip);
        else if (sessionSortField === 'device') diff = (a.device || '').localeCompare(b.device || '');
        else if (sessionSortField === 'loginAt') diff = (a.loginAt || '').localeCompare(b.loginAt || '');
        return sessionSortAsc ? diff : -diff;
      });
  }, [userSessions, sessionSearch, sessionSortField, sessionSortAsc, currentSessionId]);

  // Filtered & sorted login history
  const filteredLogins = useMemo(() => {
    return logins
      .filter(l => {
        if (loginStatusFilter === 'success' && !l.success) return false;
        if (loginStatusFilter === 'failed' && l.success) return false;
        if (loginSearch) {
          const q = loginSearch.toLowerCase();
          const matchIp = l.ip.toLowerCase().includes(q);
          const matchDev = l.device.toLowerCase().includes(q);
          const matchReason = l.reason?.toLowerCase().includes(q);
          if (!matchIp && !matchDev && !matchReason) return false;
        }
        return true;
      })
      .sort((a, b) => {
        let diff = 0;
        if (loginSortField === 'timestamp') diff = a.timestamp.localeCompare(b.timestamp);
        else if (loginSortField === 'ip') diff = a.ip.localeCompare(b.ip);
        else if (loginSortField === 'device') diff = a.device.localeCompare(b.device);
        return loginSortAsc ? diff : -diff;
      });
  }, [logins, loginStatusFilter, loginSearch, loginSortField, loginSortAsc]);

  const assignedGroupNames = (currentUserData.groupIds || [])
    .map(gid => allGroups.find(g => g.id === gid)?.name)
    .filter(Boolean);

  const otherActiveSessionsCount = userSessions.filter(s => s.isActive && s.id !== currentSessionId).length;

  return (
    <div className="space-y-6">
      {/* Hidden File Input for Avatar Upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleAvatarFileUpload}
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className="hidden"
      />

      {/* Top Banner - "اطلاعات کاربری" */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          {/* Avatar display with interactive camera overlay */}
          <div className="relative group shrink-0">
            {currentUserData.avatar ? (
              <img
                src={currentUserData.avatar}
                alt="Profile Avatar"
                className="w-18 h-18 rounded-2xl object-cover border-2 border-slate-200 shadow-sm"
              />
            ) : (
              <div
                className="w-18 h-18 rounded-2xl flex items-center justify-center text-white text-3xl font-black shadow-sm"
                style={{ backgroundColor: 'var(--primary-color)' }}
              >
                {currentUserData.firstName[0]}
              </div>
            )}

            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 bg-slate-900/50 text-white rounded-2xl opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-all cursor-pointer backdrop-blur-2xs"
              title={isPersian ? 'تغییر عکس نمایه' : 'Change Avatar'}
            >
              <Camera className="w-5 h-5 mb-0.5" />
              <span className="text-[9px] font-bold">{isPersian ? 'تغییر' : 'Edit'}</span>
            </button>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-black text-slate-900">
                {currentUserData.firstName} {currentUserData.lastName}
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                {currentUserData.role === 'admin'
                  ? t.adminRole
                  : currentUserData.role === 'inspector'
                  ? t.inspectorRole
                  : currentUserData.role === 'executive'
                  ? t.executiveRole
                  : t.employeeRole}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-b-nazanin">
              <div className="flex items-center gap-1 font-mono">
                <span className="font-semibold text-slate-700">{currentUserData.username}</span>
              </div>
              <span className="text-slate-300">•</span>
              <div className="flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>{currentUserData.email}</span>
              </div>
              {currentUserData.mobile && (
                <>
                  <span className="text-slate-300">•</span>
                  <div className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{currentUserData.mobile}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Assigned Groups badge list */}
        <div className="flex flex-col items-start md:items-end gap-1.5">
          <span className="text-[11px] font-bold text-slate-400 font-b-nazanin">
            {isPersian ? 'گروه‌های سازمانی عضویت:' : 'Assigned Groups:'}
          </span>
          <div className="flex flex-wrap gap-1">
            {assignedGroupNames.map((gn, idx) => (
              <span key={idx} className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-semibold">
                {gn}
              </span>
            ))}
            {assignedGroupNames.length === 0 && (
              <span className="text-xs text-slate-400 font-b-nazanin">
                {isPersian ? 'عضو هیچ گروهی نیست' : 'No groups'}
              </span>
            )}
          </div>
        </div>
      </div>

      {notification && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2 font-b-nazanin animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {errorNotice && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs font-semibold rounded-xl flex items-center gap-2 font-b-nazanin animate-fade-in">
          <XCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{errorNotice}</span>
        </div>
      )}

      {/* Tabs Header: اطلاعات کاربری | تغییر رمز عبور | نشست‌های فعال | تاریخچه ورودها */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-1">
        <button
          onClick={() => setActiveSubTab('info')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'info'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <UserIcon className="w-4 h-4" />
          <span>{isPersian ? 'مشخصات کاربری و آواتار' : 'Profile & Avatar'}</span>
        </button>

        <button
          onClick={() => setActiveSubTab('password')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'password'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Key className="w-4 h-4" />
          <span>{isPersian ? 'تغییر رمز عبور' : 'Change Password'}</span>
        </button>

        <button
          onClick={() => setActiveSubTab('sessions')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'sessions'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>{isPersian ? 'نشست‌های فعال دستگاه‌ها' : 'Active Sessions'}</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-100 text-blue-800">
            {toPersianDigits(filteredSessions.length)}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('logins')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'logins'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>{isPersian ? 'تاریخچه ورودها' : 'Login History'}</span>
        </button>
      </div>

      {/* TAB 1: مشخصات کاربری و تنظیم آواتار */}
      {activeSubTab === 'info' && (
        <div className="space-y-6">
          {/* Avatar Management Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Camera className="w-4 h-4 text-blue-600" />
              <h3 className="font-bold text-sm text-slate-900">
                {isPersian ? 'تنظیم و تغییر تصویر نمایه (آواتار)' : 'Avatar & Profile Picture'}
              </h3>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              {/* Current Preview */}
              <div className="flex flex-col items-center gap-2">
                <UserAvatar
                  avatar={currentUserData.avatar}
                  firstName={currentUserData.firstName}
                  lastName={currentUserData.lastName}
                  size="2xl"
                  rounded="2xl"
                  className="shadow-md ring-2 ring-blue-500/40"
                />
                <span className="text-[11px] text-slate-500 font-b-nazanin">
                  {currentUserData.avatar
                    ? (isColorAvatar(currentUserData.avatar)
                        ? (isPersian ? 'رنگ سفارشی نمایه' : 'Color Avatar')
                        : (isPersian ? 'تصویر نمایه فعال' : 'Active Avatar'))
                    : (isPersian ? 'نماد با حرف اول نام' : 'Initials Avatar')}
                </span>
              </div>

              {/* Action buttons */}
              <div className="space-y-3 flex-1">
                <div className="flex flex-wrap gap-2.5">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    <span>{isPersian ? 'انتخاب و برش تصویر از سیستم' : 'Upload & Crop Image'}</span>
                  </button>

                  {currentUserData.avatar && (
                    <button
                      type="button"
                      onClick={handleRemoveAvatar}
                      className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                      <span>{isPersian ? 'حذف تصویر سفارشی' : 'Remove Avatar'}</span>
                    </button>
                  )}
                </div>

                <p className="text-xs text-slate-500 font-b-nazanin leading-relaxed">
                  {isPersian
                    ? 'شما می‌توانید یک تصویر دلخواه از گوشی یا رایانه خود انتخاب و برش دهید، یا از آواتارهای کارتونی یا پالت رنگ‌های زیر استفاده کنید.'
                    : 'Upload a custom photo to crop, choose a cartoon avatar, or select a solid color badge below.'}
                </p>
              </div>
            </div>

            {/* Predefined Emoji Avatars Grid */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>{isPersian ? 'ایموجی‌های جذاب برای تصویر نمایه:' : 'Attractive Emoji Avatars:'}</span>
              </label>

              <div className="grid grid-cols-3 sm:grid-cols-6 md:grid-cols-9 gap-2.5">
                {DEFAULT_AVATAR_PRESETS.map((preset) => {
                  const isSelected = currentUserData.avatar === preset.dataUrl;

                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleSelectPresetAvatar(preset.dataUrl)}
                      className={`group relative p-2 rounded-2xl border-2 transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/60 shadow-xs ring-2 ring-blue-300 scale-105'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 hover:scale-102'
                      }`}
                      title={preset.nameFa}
                    >
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center shadow-xs select-none"
                        style={{ backgroundColor: (preset as any).bgColor || '#2563EB' }}
                      >
                        <span className="text-2xl leading-none" role="img" aria-label={preset.nameFa}>
                          {(preset as any).emoji || '😎'}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-600 truncate max-w-full font-b-nazanin font-semibold">
                        {isPersian ? preset.nameFa : preset.nameEn}
                      </span>
                      {isSelected && (
                        <div className="absolute -top-1 -right-1 bg-blue-600 text-white rounded-full p-0.5">
                          <CheckCircle2 className="w-3 h-3" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Solid Color Palette Selection ("کاربر بتونه جای اواتار رنگ بزاره") */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-purple-600" />
                <span>{isPersian ? 'یا انتخاب رنگ دلخواه به جای تصویر نمایه:' : 'Or Select a Solid Color Badge:'}</span>
              </label>

              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-12 gap-2.5">
                {DEFAULT_AVATAR_COLORS.map((color) => {
                  const isSelected = currentUserData.avatar === `color:${color.hex}`;

                  return (
                    <button
                      key={color.id}
                      type="button"
                      onClick={() => handleSelectColorAvatar(color.hex)}
                      className={`group relative p-2 rounded-2xl border-2 transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                        isSelected
                          ? 'border-blue-600 ring-2 ring-blue-300 shadow-md scale-105 bg-blue-50/40'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 hover:scale-102'
                      }`}
                      title={color.nameFa}
                    >
                      <div
                        className="w-8 h-8 rounded-xl shadow-xs flex items-center justify-center font-bold text-white text-xs select-none"
                        style={{ backgroundColor: color.hex }}
                      >
                        {currentUserData.firstName[0]}
                      </div>
                      <span className="text-[10px] text-slate-600 truncate max-w-full font-b-nazanin font-semibold">
                        {isPersian ? color.nameFa : color.hex}
                      </span>
                      {isSelected && (
                        <div className="absolute -top-1 -right-1 bg-blue-600 text-white rounded-full p-0.5">
                          <CheckCircle2 className="w-3 h-3" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* User Details Grid */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="font-bold text-sm text-slate-900 pb-3 border-b border-slate-100 flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-blue-600" />
              <span>{isPersian ? 'اطلاعات و مشخصات فردی در سیستم' : 'Account Details'}</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs font-b-nazanin">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="text-slate-400 font-semibold">{t.firstName} و {t.lastName}:</span>
                <p className="font-bold text-slate-900 text-sm">{currentUserData.firstName} {currentUserData.lastName}</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="text-slate-400 font-semibold">{t.username}:</span>
                <p className="font-mono font-bold text-slate-900 text-sm">{currentUserData.username}</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="text-slate-400 font-semibold">{t.role}:</span>
                <p className="font-bold text-blue-700">
                  {currentUserData.role === 'admin'
                    ? t.adminRole
                    : currentUserData.role === 'inspector'
                    ? t.inspectorRole
                    : currentUserData.role === 'executive'
                    ? t.executiveRole
                    : t.employeeRole}
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="text-slate-400 font-semibold">{t.jobTitle}:</span>
                <p className="font-bold text-slate-900">{currentUserData.jobTitle || '-'}</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="text-slate-400 font-semibold">{t.email}:</span>
                <p className="font-mono text-slate-800">{currentUserData.email}</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="text-slate-400 font-semibold">{t.mobile}:</span>
                <p className="font-mono text-slate-800">{currentUserData.mobile || '-'}</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="text-slate-400 font-semibold">{isPersian ? 'تاریخ عضویت در سامانه:' : 'Member Since:'}</span>
                <p className="font-mono text-slate-800">{currentUserData.createdAt}</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="text-slate-400 font-semibold">{isPersian ? 'وضعیت حساب:' : 'Status:'}</span>
                <p className="font-bold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{isPersian ? 'فعال و مجاز به تردد' : 'Active'}</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: تغییر رمز عبور */}
      {activeSubTab === 'password' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs max-w-xl space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Lock className="w-4 h-4 text-blue-600" />
            <h3 className="font-bold text-sm text-slate-900">
              {isPersian ? 'تغییر و به‌روزرسانی رمز عبور' : 'Change Password'}
            </h3>
          </div>

          {passwordSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2 font-b-nazanin animate-fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{passwordSuccess}</span>
            </div>
          )}

          {passwordError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl flex items-center gap-2 font-b-nazanin animate-fade-in">
              <XCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{passwordError}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {isPersian ? 'رمز عبور جدید' : 'New Password'} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder={isPersian ? 'حداقل ۸ کاراکتر شامل حروف و اعداد' : 'Min 8 chars with mixed cases'}
                  className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute left-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {isPersian ? 'تکرار رمز عبور جدید' : 'Confirm New Password'} <span className="text-red-500">*</span>
              </label>
              <input
                type={showNewPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder={isPersian ? 'تکرار دقیق رمز عبور جدید' : 'Re-enter new password'}
                className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-mono"
              />
            </div>

            {/* Validation Checklist */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs font-b-nazanin">
              <span className="font-bold text-slate-700 block mb-1">
                {isPersian ? 'استانداردهای الزامی امنیت رمز عبور:' : 'Password Security Rules:'}
              </span>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className={`flex items-center gap-1 ${newPassword.length >= 8 ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}>
                  <span>{newPassword.length >= 8 ? '✓' : '○'}</span>
                  <span>{isPersian ? 'حداقل ۸ کاراکتر' : 'At least 8 chars'}</span>
                </div>
                <div className={`flex items-center gap-1 ${/[A-Z]/.test(newPassword) ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}>
                  <span>{/[A-Z]/.test(newPassword) ? '✓' : '○'}</span>
                  <span>{isPersian ? 'حرف انگلیسی بزرگ' : 'Uppercase letter'}</span>
                </div>
                <div className={`flex items-center gap-1 ${/[a-z]/.test(newPassword) ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}>
                  <span>{/[a-z]/.test(newPassword) ? '✓' : '○'}</span>
                  <span>{isPersian ? 'حرف انگلیسی کوچک' : 'Lowercase letter'}</span>
                </div>
                <div className={`flex items-center gap-1 ${/\d/.test(newPassword) ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}>
                  <span>{/\d/.test(newPassword) ? '✓' : '○'}</span>
                  <span>{isPersian ? 'حداقل یک رقم' : 'At least 1 digit'}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                {isPersian ? 'ثبت و ذخیره رمز عبور جدید' : 'Save New Password'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 3: نشست‌های فعال دستگاه‌ها */}
      {activeSubTab === 'sessions' && (
        <div className="space-y-4">
          {/* Active other sessions warning banner */}
          {otherActiveSessionsCount > 0 && (
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 font-b-nazanin shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 text-amber-700 rounded-xl">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-xs">
                    {isPersian ? 'چندین دستگاه همزمان فعال' : 'Multiple Active Devices'}
                  </h4>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {isPersian
                      ? `حساب شما علاوه بر این مرورگر، در ${toPersianDigits(otherActiveSessionsCount)} دستگاه یا نشست دیگر فعال است.`
                      : `Your account is currently active on ${otherActiveSessionsCount} other device(s).`}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setConfirmTerminateAllOthers(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer whitespace-nowrap"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{isPersian ? 'خروج از تمام دستگاه‌های دیگر' : 'Logout All Other Devices'}</span>
              </button>
            </div>
          )}

          {/* Sessions Filter Toolbar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder={isPersian ? 'جستجو در آدرس IP یا دستگاه...' : 'Search IP or device...'}
                value={sessionSearch}
                onChange={e => setSessionSearch(e.target.value)}
                className="w-64 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            <div className="text-xs text-slate-500 font-b-nazanin font-semibold">
              {isPersian ? 'تعداد نشست‌های فعال:' : 'Active Sessions:'}{' '}
              <span className="font-bold text-slate-800">{toPersianDigits(filteredSessions.length)}</span>
            </div>
          </div>

          {/* Sessions Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 select-none">
                  <tr>
                    <th className="p-3 text-center w-12">#</th>
                    <th
                      onClick={() => {
                        if (sessionSortField === 'ip') setSessionSortAsc(!sessionSortAsc);
                        else { setSessionSortField('ip'); setSessionSortAsc(false); }
                      }}
                      className="p-3 cursor-pointer hover:bg-slate-100"
                    >
                      <div className="flex items-center gap-1">
                        <span>{t.ipCol}</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </div>
                    </th>
                    <th
                      onClick={() => {
                        if (sessionSortField === 'device') setSessionSortAsc(!sessionSortAsc);
                        else { setSessionSortField('device'); setSessionSortAsc(false); }
                      }}
                      className="p-3 cursor-pointer hover:bg-slate-100"
                    >
                      <div className="flex items-center gap-1">
                        <span>{t.deviceCol}</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </div>
                    </th>
                    <th
                      onClick={() => {
                        if (sessionSortField === 'loginAt') setSessionSortAsc(!sessionSortAsc);
                        else { setSessionSortField('loginAt'); setSessionSortAsc(false); }
                      }}
                      className="p-3 cursor-pointer hover:bg-slate-100"
                    >
                      <div className="flex items-center gap-1">
                        <span>{t.loginTimeCol}</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </div>
                    </th>
                    <th className="p-3">{t.statusCol}</th>
                    <th className="p-3 text-center">{t.actionsCol}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-b-nazanin">
                  {filteredSessions.map((sess, idx) => {
                    const isCurrent = sess.id === currentSessionId;
                    const parsed = parseDeviceAndBrowser(sess.userAgent);

                    return (
                      <tr key={sess.id} className={`hover:bg-slate-50/70 transition-colors ${isCurrent ? 'bg-blue-50/30' : ''}`}>
                        <td className="p-3 text-center text-slate-400">{idx + 1}</td>
                        <td className="p-3 font-mono font-bold text-slate-800">
                          {sess.ip}
                        </td>
                        <td className="p-3 text-slate-800">
                          <div className="flex items-center gap-2">
                            {parsed.iconType === 'mobile' ? (
                              <div className="p-1.5 bg-purple-50 text-purple-600 rounded-lg shrink-0">
                                <Smartphone className="w-4 h-4" />
                              </div>
                            ) : (
                              <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg shrink-0">
                                <Monitor className="w-4 h-4" />
                              </div>
                            )}
                            <div>
                              <p className="font-bold text-slate-900">
                                {isPersian ? parsed.displayTitleFa : parsed.displayTitleEn}
                              </p>
                              {sess.device && sess.device !== parsed.displayTitleFa && (
                                <p className="text-[10px] text-slate-400 truncate max-w-xs">{sess.device}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-slate-800 font-b-nazanin font-bold text-sm">
                          {isPersian ? toPersianDigits(sess.loginAt) : sess.loginAt}
                        </td>
                        <td className="p-3">
                          {isCurrent ? (
                            <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 font-bold text-[11px] border border-emerald-200 inline-flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                              <span>{isPersian ? 'این دستگاه (نشست فعلی)' : 'Current Device'}</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium text-[11px]">
                              {isPersian ? 'سایر دستگاه‌ها' : 'Other Device'}
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {isCurrent ? (
                            <span className="text-slate-400 text-xs italic">
                              {isPersian ? 'در حال استفاده' : 'In use'}
                            </span>
                          ) : (
                            <button
                              onClick={() => setTerminateTargetId(sess.id)}
                              className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-xs font-bold transition-colors cursor-pointer border border-red-200"
                              title={isPersian ? 'خروج از این نشست' : 'Terminate'}
                            >
                              {isPersian ? 'خروج از نشست' : 'Terminate'}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}

                  {filteredSessions.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">
                        {isPersian ? 'هیچ نشست فعالی یافت نشد.' : 'No active sessions.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: تاریخچه ورودها */}
      {activeSubTab === 'logins' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <input
                type="text"
                placeholder={isPersian ? 'جستجو در آدرس IP یا دستگاه...' : 'Search IP or device...'}
                value={loginSearch}
                onChange={e => setLoginSearch(e.target.value)}
                className="w-64 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />

              <select
                value={loginStatusFilter}
                onChange={e => setLoginStatusFilter(e.target.value as any)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              >
                <option value="all">{isPersian ? 'همه وضعیت‌ها' : 'All Statuses'}</option>
                <option value="success">{isPersian ? 'فقط ورودهای موفق' : 'Success only'}</option>
                <option value="failed">{isPersian ? 'فقط تلاش‌های ناموفق' : 'Failed only'}</option>
              </select>
            </div>

            <div className="text-xs text-slate-500 font-b-nazanin font-semibold">
              {isPersian ? 'تعداد رکوردهای ورود:' : 'Total Attempts:'}{' '}
              <span className="font-bold text-slate-800">{toPersianDigits(filteredLogins.length)}</span>
            </div>
          </div>

          {/* Logins Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 select-none">
                  <tr>
                    <th className="p-3 text-center w-12">#</th>
                    <th className="p-3">{t.statusCol}</th>
                    <th className="p-3">{t.ipCol}</th>
                    <th className="p-3">{t.deviceCol}</th>
                    <th className="p-3">{isPersian ? 'تاریخ و زمان' : 'Timestamp'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-b-nazanin">
                  {filteredLogins.map((att, idx) => (
                    <tr key={att.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3 text-center text-slate-400">{idx + 1}</td>
                      <td className="p-3">
                        {att.success ? (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold text-[11px] inline-flex items-center gap-1 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>{isPersian ? 'ورود موفق' : 'Success'}</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 font-bold text-[11px] inline-flex items-center gap-1 border border-rose-200">
                            <XCircle className="w-3 h-3" />
                            <span>{isPersian ? 'ناموفق' : 'Failed'}</span>
                          </span>
                        )}
                      </td>
                      <td className="p-3 font-mono font-bold text-slate-800">{att.ip}</td>
                      <td className="p-3 text-slate-600">{att.device}</td>
                      <td className="p-3 text-slate-700 font-b-nazanin font-semibold text-xs" dir="ltr">
                        {isPersian
                          ? toPersianDigits(new Date(att.timestamp).toLocaleString('fa-IR'))
                          : new Date(att.timestamp).toLocaleString('en-US')}
                      </td>
                    </tr>
                  ))}

                  {filteredLogins.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400">
                        {isPersian ? 'رکوردی یافت نشد.' : 'No login history found.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Avatar Crop Modal ("وقتی میخوام اواتار از سیستم بزار یه دیالوگ بیار کراپ کنم راحت") */}
      <ImageCropModal
        isOpen={isCropModalOpen}
        imageSrc={cropRawSrc}
        isPersian={isPersian}
        onCropComplete={handleCropComplete}
        onCancel={() => setIsCropModalOpen(false)}
      />

      {/* Terminate Single Session Confirm Modal */}
      <ConfirmModal
        isOpen={Boolean(terminateTargetId)}
        title={isPersian ? 'بستن نشست دستگاه' : 'Terminate Session'}
        message={isPersian ? 'آیا از بستن این نشست و خارج کردن این دستگاه اطمینان دارید؟' : 'Are you sure you want to terminate this session?'}
        confirmText={isPersian ? 'بستن نشست' : 'Terminate'}
        cancelText={t.cancel}
        onConfirm={handleTerminateSession}
        onCancel={() => setTerminateTargetId(null)}
      />

      {/* Terminate All Other Sessions Confirm Modal */}
      <ConfirmModal
        isOpen={confirmTerminateAllOthers}
        title={isPersian ? 'خروج از تمام دستگاه‌های دیگر' : 'Logout All Other Devices'}
        message={isPersian ? 'آیا مطمئن هستید؟ تمامی نشست‌های فعال حساب شما در گوشی‌ها و رایانه‌های دیگر بلافاصله بسته خواهند شد.' : 'All other active sessions on other phones and laptops will be closed.'}
        confirmText={isPersian ? 'خروج از تمام دستگاه‌ها' : 'Logout All'}
        cancelText={t.cancel}
        onConfirm={handleTerminateAllOthers}
        onCancel={() => setConfirmTerminateAllOthers(false)}
      />
    </div>
  );
};
