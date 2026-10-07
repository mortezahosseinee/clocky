import React, { useState, useMemo } from 'react';
import { User, UserSession, LoginAttempt } from '../types';
import { translations, Language } from '../utils/translations';
import { StorageService } from '../utils/storage';
import { ConfirmModal } from '../components/ConfirmModal';
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
  Ban,
  Unlock
} from 'lucide-react';

interface ProfileViewProps {
  user: User;
  lang: Language;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ user, lang }) => {
  const t = translations[lang];
  const isPersian = lang === 'fa';
  const isAdmin = user.role === 'admin';

  const allGroups = StorageService.getGroups();
  const currentSessionId = StorageService.getCurrentSessionId();

  const [activeSubTab, setActiveSubTab] = useState<'sessions' | 'logins'>('sessions');
  const [sessions, setSessions] = useState<UserSession[]>(() =>
    StorageService.getSessions().filter(s => s.userId === user.id)
  );
  const [logins, setLogins] = useState<LoginAttempt[]>(() =>
    StorageService.getLoginAttempts(user.username)
  );

  const [notification, setNotification] = useState<string | null>(null);
  const [terminateTargetId, setTerminateTargetId] = useState<string | null>(null);
  const [confirmTerminateAllOthers, setConfirmTerminateAllOthers] = useState(false);

  // Filters for Sessions Table
  const [sessionSearch, setSessionSearch] = useState('');
  const [sessionSortField, setSessionSortField] = useState<'ip' | 'device' | 'loginAt'>('loginAt');
  const [sessionSortAsc, setSessionSortAsc] = useState(false);

  // Filters for Logins Table
  const [loginSearch, setLoginSearch] = useState('');
  const [loginStatusFilter, setLoginStatusFilter] = useState<'all' | 'success' | 'failed'>('all');
  const [loginSortField, setLoginSortField] = useState<'timestamp' | 'ip' | 'device'>('timestamp');
  const [loginSortAsc, setLoginSortAsc] = useState(false);

  const reloadData = () => {
    setSessions(StorageService.getSessions().filter(s => s.userId === user.id));
    setLogins(StorageService.getLoginAttempts(user.username));
  };

  const handleTerminateSession = () => {
    if (terminateTargetId) {
      StorageService.terminateSession(terminateTargetId);
      setTerminateTargetId(null);
      setNotification(isPersian ? 'نشست انتخابی با موفقیت بسته شد.' : 'Session terminated.');
      setTimeout(() => setNotification(null), 3000);
      reloadData();
    }
  };

  const handleTerminateAllOthers = () => {
    if (currentSessionId) {
      StorageService.terminateOtherSessions(user.id, currentSessionId);
      setConfirmTerminateAllOthers(false);
      setNotification(isPersian ? 'تمامی سایر نشست‌های فعال شما بسته شدند.' : 'All other sessions terminated.');
      setTimeout(() => setNotification(null), 3000);
      reloadData();
    }
  };

  // Filtered & sorted sessions
  const filteredSessions = useMemo(() => {
    return sessions
      .filter(s => {
        if (!s.isActive) return false;
        if (sessionSearch) {
          const q = sessionSearch.toLowerCase();
          const matchIp = s.ip.toLowerCase().includes(q);
          const matchDev = s.device.toLowerCase().includes(q);
          if (!matchIp && !matchDev) return false;
        }
        return true;
      })
      .sort((a, b) => {
        let diff = 0;
        if (sessionSortField === 'ip') diff = a.ip.localeCompare(b.ip);
        else if (sessionSortField === 'device') diff = a.device.localeCompare(b.device);
        else if (sessionSortField === 'loginAt') diff = a.loginAt.localeCompare(b.loginAt);
        return sessionSortAsc ? diff : -diff;
      });
  }, [sessions, sessionSearch, sessionSortField, sessionSortAsc]);

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

  const assignedGroupNames = user.groupIds
    .map(gid => allGroups.find(g => g.id === gid)?.name)
    .filter(Boolean);

  const otherActiveSessionsCount = sessions.filter(s => s.isActive && s.id !== currentSessionId).length;

  return (
    <div className="space-y-6">
      {/* Top Banner Profile Summary */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-black shadow-sm shrink-0"
            style={{ backgroundColor: 'var(--primary-color)' }}
          >
            {user.firstName[0]}
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-black text-slate-900">
                {user.firstName} {user.lastName}
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                {user.role === 'admin' ? t.adminRole : user.role === 'inspector' ? t.inspectorRole : user.role === 'executive' ? t.executiveRole : t.employeeRole}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-b-nazanin">
              <div className="flex items-center gap-1 font-mono">
                <span className="font-semibold text-slate-700">{user.username}</span>
              </div>
              <span className="text-slate-300">•</span>
              <div className="flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>{user.email}</span>
              </div>
              {user.mobile && (
                <>
                  <span className="text-slate-300">•</span>
                  <div className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{user.mobile}</span>
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
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Tabs: Active Sessions vs Login History */}
      <div className="flex items-center justify-between border-b border-slate-200">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('sessions')}
            className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 cursor-pointer ${
              activeSubTab === 'sessions'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <Monitor className="w-4 h-4" />
              <span>
                {isPersian
                  ? `نشست‌های فعال من (${filteredSessions.length})`
                  : `Active Sessions (${filteredSessions.length})`}
              </span>
            </div>
          </button>

          <button
            onClick={() => setActiveSubTab('logins')}
            className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 cursor-pointer ${
              activeSubTab === 'logins'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <Shield className="w-4 h-4" />
              <span>
                {isPersian
                  ? `تاریخچه ورودهای موفق و ناموفق (${filteredLogins.length})`
                  : `Login History (${filteredLogins.length})`}
              </span>
            </div>
          </button>
        </div>

        {activeSubTab === 'sessions' && otherActiveSessionsCount > 0 && (
          <button
            onClick={() => setConfirmTerminateAllOthers(true)}
            className="mb-2 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{isPersian ? 'خاتمه دادن به سایر نشست‌ها' : 'Terminate Other Sessions'}</span>
          </button>
        )}
      </div>

      {/* TAB 1: SESSIONS */}
      {activeSubTab === 'sessions' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
              <Filter className="w-4 h-4 text-slate-400" />
              <span>{t.filter}:</span>
            </div>

            <div className="w-64">
              <input
                type="text"
                value={sessionSearch}
                onChange={e => setSessionSearch(e.target.value)}
                placeholder={isPersian ? 'جستجو در آدرس IP یا دستگاه...' : 'Filter by IP or device...'}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:outline-hidden"
              />
            </div>

            {sessionSearch && (
              <button
                onClick={() => setSessionSearch('')}
                className="px-2.5 py-1 text-xs text-rose-600 hover:bg-rose-50 rounded-lg border border-rose-200 flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                <span>{t.clearFilter}</span>
              </button>
            )}
          </div>

          {/* Sessions Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 select-none">
                  <tr>
                    <th className="p-3 w-10 text-center">#</th>
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
                    <th className="p-3">{t.lastActiveCol}</th>
                    <th className="p-3">{t.statusCol}</th>
                    <th className="p-3 text-center">{t.actionsCol}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-b-nazanin">
                  {filteredSessions.map((sess, idx) => {
                    const isCurrent = sess.id === currentSessionId;

                    return (
                      <tr key={sess.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-3 text-center text-slate-400">{idx + 1}</td>
                        <td className="p-3 font-mono font-bold text-slate-800">{sess.ip}</td>
                        <td className="p-3 text-slate-700">
                          <div className="flex items-center gap-1.5">
                            {sess.device.includes('گوشی') ? (
                              <Smartphone className="w-3.5 h-3.5 text-slate-400" />
                            ) : (
                              <Monitor className="w-3.5 h-3.5 text-slate-400" />
                            )}
                            <span>{sess.device}</span>
                          </div>
                        </td>
                        <td className="p-3 text-slate-500">{sess.loginAt}</td>
                        <td className="p-3 text-slate-500">{sess.lastActiveAt}</td>
                        <td className="p-3">
                          {isCurrent ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              <span>{isPersian ? 'نشست جاری شما' : 'Current Session'}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-semibold">
                              <span>{isPersian ? 'نشست فعال' : 'Active'}</span>
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {isCurrent ? (
                            <span className="text-[11px] text-slate-400 font-semibold select-none">
                              {isPersian ? 'غیرقابل حذف' : 'Protected'}
                            </span>
                          ) : (
                            <button
                              onClick={() => setTerminateTargetId(sess.id)}
                              className="px-2.5 py-1 text-red-600 hover:bg-red-50 border border-red-200 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                            >
                              <div className="flex items-center gap-1">
                                <LogOut className="w-3 h-3" />
                                <span>{t.terminateSession}</span>
                              </div>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}

                  {filteredSessions.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        {isPersian ? 'هیچ نشستی یافت نشد.' : 'No sessions found.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: LOGIN HISTORY */}
      {activeSubTab === 'logins' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
              <Filter className="w-4 h-4 text-slate-400" />
              <span>{t.filter}:</span>
            </div>

            <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-lg text-xs">
              <button
                onClick={() => setLoginStatusFilter('all')}
                className={`px-3 py-1 rounded-md font-semibold ${loginStatusFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'}`}
              >
                {isPersian ? 'همه ورودها' : 'All'}
              </button>
              <button
                onClick={() => setLoginStatusFilter('success')}
                className={`px-3 py-1 rounded-md font-semibold ${loginStatusFilter === 'success' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600'}`}
              >
                {isPersian ? 'موفق' : 'Success'}
              </button>
              <button
                onClick={() => setLoginStatusFilter('failed')}
                className={`px-3 py-1 rounded-md font-semibold ${loginStatusFilter === 'failed' ? 'bg-white text-red-700 shadow-xs' : 'text-slate-600'}`}
              >
                {isPersian ? 'ناموفق' : 'Failed'}
              </button>
            </div>

            <div className="w-64">
              <input
                type="text"
                value={loginSearch}
                onChange={e => setLoginSearch(e.target.value)}
                placeholder={isPersian ? 'جستجو در IP، دستگاه یا دلیل...' : 'Search by IP or device...'}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:outline-hidden"
              />
            </div>

            {(loginSearch || loginStatusFilter !== 'all') && (
              <button
                onClick={() => {
                  setLoginSearch('');
                  setLoginStatusFilter('all');
                }}
                className="px-2.5 py-1 text-xs text-rose-600 hover:bg-rose-50 rounded-lg border border-rose-200 flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                <span>{t.clearFilter}</span>
              </button>
            )}
          </div>

          {/* Logins Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 select-none">
                  <tr>
                    <th className="p-3 w-10 text-center">#</th>
                    <th className="p-3">{t.statusCol}</th>
                    <th
                      onClick={() => {
                        if (loginSortField === 'ip') setLoginSortAsc(!loginSortAsc);
                        else { setLoginSortField('ip'); setLoginSortAsc(false); }
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
                        if (loginSortField === 'device') setLoginSortAsc(!loginSortAsc);
                        else { setLoginSortField('device'); setLoginSortAsc(false); }
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
                        if (loginSortField === 'timestamp') setLoginSortAsc(!loginSortAsc);
                        else { setLoginSortField('timestamp'); setLoginSortAsc(false); }
                      }}
                      className="p-3 cursor-pointer hover:bg-slate-100"
                    >
                      <div className="flex items-center gap-1">
                        <span>{isPersian ? 'زمان تلاش برای ورود' : 'Timestamp'}</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </div>
                    </th>
                    <th className="p-3">{isPersian ? 'توضیحات و علت' : 'Reason / Note'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-b-nazanin">
                  {filteredLogins.map((att, idx) => (
                    <tr key={att.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3 text-center text-slate-400">{idx + 1}</td>
                      <td className="p-3">
                        {att.success ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>{isPersian ? 'ورود موفق' : 'Success'}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 text-[10px] font-bold">
                            <XCircle className="w-3 h-3 text-rose-600" />
                            <span>{isPersian ? 'ورود ناموفق' : 'Failed'}</span>
                          </span>
                        )}
                      </td>
                      <td className="p-3 font-mono font-bold text-slate-800">{att.ip}</td>
                      <td className="p-3 text-slate-700">{att.device}</td>
                      <td className="p-3 text-slate-500 font-mono">
                        {new Date(att.timestamp).toLocaleString(isPersian ? 'fa-IR' : 'en-US')}
                      </td>
                      <td className="p-3 text-slate-500 max-w-xs truncate">
                        {att.reason || (att.success ? (isPersian ? 'احراز هویت صحیح' : 'Authenticated') : (isPersian ? 'رمز اشتباه' : 'Invalid password'))}
                      </td>
                    </tr>
                  ))}

                  {filteredLogins.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">
                        {isPersian ? 'هیچ رکوردی از ورود یافت نشد.' : 'No login attempts recorded.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Single Session Termination */}
      <ConfirmModal
        isOpen={Boolean(terminateTargetId)}
        title={t.terminateSession}
        message={isPersian ? 'آیا از قطع این نشست اطمینان دارید؟' : 'Are you sure you want to terminate this session?'}
        confirmText={t.terminateSession}
        cancelText={t.cancel}
        onConfirm={handleTerminateSession}
        onCancel={() => setTerminateTargetId(null)}
        isDestructive={true}
      />

      {/* Confirm Terminate All Other Sessions */}
      <ConfirmModal
        isOpen={confirmTerminateAllOthers}
        title={isPersian ? 'خاتمه دادن به تمام سایر نشست‌ها' : 'Terminate Other Sessions'}
        message={isPersian ? 'آیا مطمئن هستید؟ همه نشست‌های فعال دیگر شما در سایر دستگاه‌ها بسته خواهد شد، ولی این نشست جاری شما فعال خواهد ماند.' : 'Are you sure? All other active sessions except this current one will be terminated.'}
        confirmText={isPersian ? 'قطع تمام نشست‌های دیگر' : 'Terminate All Others'}
        cancelText={t.cancel}
        onConfirm={handleTerminateAllOthers}
        onCancel={() => setConfirmTerminateAllOthers(false)}
        isDestructive={true}
      />
    </div>
  );
};
