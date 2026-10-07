import React, { useState } from 'react';
import { User } from '../types';
import { translations, Language } from '../utils/translations';
import { StorageService } from '../utils/storage';
import { getCustomizedTitle } from '../utils/customTitles';
import { PasswordInput } from '../components/PasswordInput';
import {
  Lock,
  User as UserIcon,
  AlertCircle,
  Globe,
  UserPlus,
  LogIn,
  CheckCircle2
} from 'lucide-react';

interface AuthViewProps {
  onLoginSuccess: (user: User) => void;
  lang: Language;
  onToggleLang: () => void;
  onRequirePasswordChange?: (user: User) => void;
}

export const AuthView: React.FC<AuthViewProps> = ({
  onLoginSuccess,
  lang,
  onToggleLang,
  onRequirePasswordChange
}) => {
  const t = translations[lang];
  const isPersian = lang === 'fa';

  const [tab, setTab] = useState<'login' | 'register'>('login');

  // Login form state
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);

  // Register form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [registerStatus, setRegisterStatus] = useState<{
    success: boolean;
    title: string;
    desc: string;
  } | null>(null);

  const orgName = StorageService.getOrgName();
  const orgLogo = StorageService.getOrgLogo();

  // If orgName is not configured, show "نرم افزار ثبت تردد" (or English equivalent)
  const displayTitle = orgName
    ? orgName
    : (isPersian ? 'نرم افزار ثبت تردد' : 'Attendance Tracking Software');

  const displaySubtitle = getCustomizedTitle('appSubtitle', lang) || (
    isPersian
      ? 'سامانه یکپارچه مدیریت کارکرد، تردد و پروژه‌های پرسنل'
      : 'Enterprise Attendance, Missions & Timesheet Management'
  );

  // Automatically sync with server on mount so newly created users from other devices/admins are immediately accessible
  useEffect(() => {
    StorageService.syncFromServer();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    let user = StorageService.validateUser(loginUsername.trim(), loginPassword.trim());
    if (!user) {
      // Try fast-syncing with server before reporting invalid credentials
      await StorageService.syncFromServer();
      user = StorageService.validateUser(loginUsername.trim(), loginPassword.trim());
    }

    if (!user) {
      StorageService.recordLoginAttempt(loginUsername.trim(), false);
      setLoginError(t.invalidCredentials);
      return;
    }

    if (!user.isActive) {
      StorageService.recordLoginAttempt(loginUsername.trim(), false);
      setLoginError(t.userInactiveMsg);
      return;
    }

    if (user.isArchived) {
      StorageService.recordLoginAttempt(loginUsername.trim(), false);
      setLoginError(t.userArchivedMsg);
      return;
    }

    // Record success
    StorageService.recordLoginAttempt(user.username, true);
    StorageService.setCurrentUser(user);

    // If user must change password, trigger modal
    if (user.mustChangePassword && onRequirePasswordChange) {
      onRequirePasswordChange(user);
      return;
    }

    onLoginSuccess(user);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError(null);

    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      setRegisterError(isPersian ? 'نام، نام خانوادگی و ایمیل اجباری هستند.' : 'First name, last name, and email are required.');
      return;
    }

    const result = StorageService.submitRegistrationRequest({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      mobile: mobile.trim() || undefined,
      jobTitle: jobTitle.trim() || undefined
    });

    if (!result.success) {
      setRegisterError(result.message || t.requestAlreadyExists);
      return;
    }

    setRegisterStatus({
      success: true,
      title: t.requestSubmittedTitle,
      desc: t.requestSubmittedDesc
    });

    // Reset inputs
    setFirstName('');
    setLastName('');
    setEmail('');
    setMobile('');
    setJobTitle('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-blue-50/40 flex flex-col justify-center items-center p-4">
      {/* Language Switch floating */}
      <div className="absolute top-4 right-4 rtl:right-auto rtl:left-4">
        <button
          onClick={onToggleLang}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-xs transition-colors cursor-pointer"
        >
          <Globe className="w-3.5 h-3.5 text-slate-500" />
          <span>{isPersian ? 'English' : 'فارسی'}</span>
        </button>
      </div>

      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-8 pb-6 text-center border-b border-slate-100">
          {/* Logo only shown if configured */}
          {orgLogo && (
            <div className="h-16 mx-auto mb-3 flex items-center justify-center">
              <img
                src={orgLogo}
                alt="Organization Logo"
                className="max-h-16 max-w-[200px] object-contain rounded-lg"
              />
            </div>
          )}

          <h1 className="text-xl font-black text-slate-900">
            {displayTitle}
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-b-nazanin">
            {displaySubtitle}
          </p>

          {/* Tab buttons: Login vs Self Registration */}
          <div className="mt-6 flex bg-slate-100 p-1 rounded-2xl">
            <button
              onClick={() => {
                setTab('login');
                setLoginError(null);
              }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                tab === 'login'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>{t.login}</span>
            </button>
            <button
              onClick={() => {
                setTab('register');
                setRegisterError(null);
                setRegisterStatus(null);
              }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                tab === 'register'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{t.registerTab}</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Login */}
        {tab === 'login' && (
          <div className="p-8 pt-6">
            {loginError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="font-b-nazanin leading-relaxed">{loginError}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.username}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={loginUsername}
                    onChange={e => setLoginUsername(e.target.value)}
                    className="w-full px-3.5 py-2.5 pl-9 rtl:pl-3.5 rtl:pr-9 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 rtl:left-auto rtl:right-3 top-3" />
                </div>
              </div>

              <div>
                <PasswordInput
                  label={t.password}
                  required
                  isPersian={isPersian}
                  value={loginPassword}
                  onChange={e => setLoginPassword(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer hover:opacity-95"
                style={{ backgroundColor: 'var(--primary-color)' }}
              >
                {t.enter}
              </button>
            </form>
          </div>
        )}

        {/* Tab 2: Self Registration */}
        {tab === 'register' && (
          <div className="p-8 pt-6">
            {registerStatus ? (
              <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-3">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                <h3 className="font-bold text-sm text-emerald-950">
                  {registerStatus.title}
                </h3>
                <p className="text-xs text-emerald-800 leading-relaxed font-b-nazanin">
                  {registerStatus.desc}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setTab('login');
                    setRegisterStatus(null);
                  }}
                  className="mt-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700 transition-colors"
                >
                  {isPersian ? 'بازگشت به صفحه ورود' : 'Back to Login'}
                </button>
              </div>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4">
                {registerError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span className="font-b-nazanin leading-relaxed">{registerError}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {t.firstName} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={firstName}
                      onChange={e => setFirstName(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {t.lastName} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={lastName}
                      onChange={e => setLastName(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t.email} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t.mobile} <span className="text-slate-400 font-normal">({t.optional})</span>
                  </label>
                  <input
                    type="tel"
                    value={mobile}
                    onChange={e => setMobile(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t.jobTitle} <span className="text-slate-400 font-normal">({t.optional})</span>
                  </label>
                  <input
                    type="text"
                    value={jobTitle}
                    onChange={e => setJobTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 px-4 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer hover:opacity-95"
                  style={{ backgroundColor: 'var(--primary-color)' }}
                >
                  {t.submitRequest}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
