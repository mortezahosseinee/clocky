import React, { useState, useMemo } from 'react';
import { User, RegistrationRequest, Group, UserRole } from '../types';
import { translations, Language } from '../utils/translations';
import { StorageService, generateStrongPassword } from '../utils/storage';
import { getTodayJalali } from '../utils/jalali';
import { ConfirmModal } from '../components/ConfirmModal';
import {
  UserCheck,
  CheckCircle2,
  XCircle,
  Copy,
  Key,
  Layers,
  Clock,
  Mail,
  Phone,
  Briefcase,
  X,
  Search,
  Filter,
  ArrowUpDown,
  Eye,
  EyeOff
} from 'lucide-react';

interface RequestsViewProps {
  user: User;
  lang: Language;
}

export const RequestsView: React.FC<RequestsViewProps> = ({ user, lang }) => {
  const t = translations[lang];
  const isPersian = lang === 'fa';

  const settings = StorageService.getSettings();
  const allGroups = StorageService.getGroups();

  const [requests, setRequests] = useState<RegistrationRequest[]>(() =>
    StorageService.getRegistrationRequests()
  );

  // Filters & Sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [sortField, setSortField] = useState<'name' | 'email' | 'date' | 'status'>('date');
  const [sortAsc, setSortAsc] = useState(false);

  // Approval Modal
  const [approvingReq, setApprovingReq] = useState<RegistrationRequest | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [mobile, setMobile] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [role, setRole] = useState<UserRole>('employee');
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Reject target
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);

  const reload = () => {
    setRequests(StorageService.getRegistrationRequests());
  };

  const handleOpenApproveModal = (req: RegistrationRequest) => {
    setApprovingReq(req);
    setFirstName(req.firstName);
    setLastName(req.lastName);
    setEmail(req.email);
    setUsername(req.email.trim());
    setMobile(req.mobile || '');
    setJobTitle(req.jobTitle || '');
    setRole('employee');
    setGroupIds(allGroups.length > 0 ? [allGroups[0].id] : []);
    setPassword(generateStrongPassword());
    setShowPassword(false);
    setFormError(null);
  };

  const handleCopyFormattedCredentials = () => {
    const fullName = `${firstName} ${lastName}`;
    const text = isPersian
      ? `کاربر عزیز ${fullName}
نام کاربری شما: ${username}
رمز عبور: ${password}
آدرس سامانه: ${window.location.origin}
این رمز عبور به مدت ${settings.tempPasswordExpiryMinutes} دقیقه فعال است. اگر تا ${settings.tempPasswordExpiryMinutes} دقیقه دیگر ورود و تغییر رمز عبور انجام ندهید، منقضی شده و باید با مدیر تماس بگیرید.`
      : `Dear ${fullName},
Your Username: ${username}
Your Password: ${password}
System URL: ${window.location.origin}
This password is valid for ${settings.tempPasswordExpiryMinutes} minutes. If you do not login and update your password within ${settings.tempPasswordExpiryMinutes} minutes, it will expire.`;

    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 3000);
  };

  const handleConfirmApproval = (e: React.FormEvent) => {
    e.preventDefault();
    if (!approvingReq) return;

    if (!username.trim()) {
      setFormError(isPersian ? 'نام کاربری اجباری است.' : 'Username is required.');
      return;
    }

    // Check if username already exists
    const users = StorageService.getUsers(true);
    if (users.some(u => u.username.toLowerCase() === username.trim().toLowerCase())) {
      setFormError(isPersian ? 'این نام کاربری قبلاً اختصاص داده شده است.' : 'Username already exists.');
      return;
    }

    const expiryMs = Date.now() + settings.tempPasswordExpiryMinutes * 60 * 1000;

    const newUser: User = {
      id: `usr-${Date.now()}`,
      username: username.trim(),
      email: email.trim(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      mobile: mobile.trim() || undefined,
      jobTitle: jobTitle.trim() || undefined,
      role,
      groupIds,
      isActive: true,
      isArchived: false,
      mustChangePassword: true,
      temporaryPasswordExpiry: expiryMs,
      createdAt: getTodayJalali(),
      passwordHash: password.trim()
    };

    StorageService.saveUser(newUser);
    StorageService.updateRequestStatus(approvingReq.id, 'approved');
    StorageService.addLog(
      'APPROVE_REGISTRATION',
      `درخواست عضویت ${newUser.firstName} ${newUser.lastName} تایید و حساب کاربری ایجاد گردید.`
    );

    setApprovingReq(null);
    reload();
  };

  const handleReject = () => {
    if (rejectTargetId) {
      StorageService.updateRequestStatus(rejectTargetId, 'rejected');
      StorageService.addLog('REJECT_REGISTRATION', `درخواست عضویت شناسه ${rejectTargetId} رد شد.`);
      setRejectTargetId(null);
      reload();
    }
  };

  const toggleSort = (field: 'name' | 'email' | 'date' | 'status') => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(field === 'name' || field === 'email');
    }
  };

  const filteredAndSortedRequests = useMemo(() => {
    return requests
      .filter(r => {
        if (statusFilter !== 'all' && r.status !== statusFilter) return false;
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          const matchName = `${r.firstName} ${r.lastName}`.toLowerCase().includes(q);
          const matchEmail = r.email.toLowerCase().includes(q);
          const matchJob = (r.jobTitle || '').toLowerCase().includes(q);
          const matchMobile = (r.mobile || '').includes(q);
          if (!matchName && !matchEmail && !matchJob && !matchMobile) return false;
        }
        return true;
      })
      .sort((a, b) => {
        let diff = 0;
        const nameA = `${a.firstName} ${a.lastName}`;
        const nameB = `${b.firstName} ${b.lastName}`;

        switch (sortField) {
          case 'name':
            diff = nameA.localeCompare(nameB);
            break;
          case 'email':
            diff = a.email.localeCompare(b.email);
            break;
          case 'date':
            diff = a.requestedAt.localeCompare(b.requestedAt);
            break;
          case 'status':
            diff = a.status.localeCompare(b.status);
            break;
        }
        return sortAsc ? diff : -diff;
      });
  }, [requests, statusFilter, searchQuery, sortField, sortAsc]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-50 text-indigo-700 rounded-xl">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">{t.registrationRequests}</h2>
            <p className="text-xs text-slate-500 font-b-nazanin mt-0.5">
              {isPersian
                ? 'بررسی درخواست‌های ثبت‌نام جدید، تایید عضویت، تعیین نقش و گروه‌ها و صدور رمز موقت با کلید چشم'
                : 'Review membership submissions, assign roles & groups, and issue credentials'}
            </p>
          </div>
        </div>
      </div>

      {copiedText && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{t.credentialsCopied}</span>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 shrink-0">
          <Filter className="w-4 h-4 text-slate-400" />
          <span>{t.filter}:</span>
        </div>

        <div className="w-56">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={isPersian ? 'جستجو در نام، ایمیل، موبایل...' : 'Search...'}
              className="w-full px-3 py-2 pr-8 bg-white border border-slate-300 rounded-lg text-xs focus:outline-hidden"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5" />
          </div>
        </div>

        <div className="w-44">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:outline-hidden"
          >
            <option value="all">{isPersian ? 'همه وضعیت‌ها' : 'All Statuses'}</option>
            <option value="pending">{isPersian ? 'در انتظار بررسی' : 'Pending'}</option>
            <option value="approved">{isPersian ? 'تایید شده' : 'Approved'}</option>
            <option value="rejected">{isPersian ? 'رد شده' : 'Rejected'}</option>
          </select>
        </div>

        {(searchQuery || statusFilter !== 'all') && (
          <button
            onClick={() => {
              setSearchQuery('');
              setStatusFilter('all');
            }}
            className="px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg border border-rose-200 flex items-center gap-1 transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>{t.clearFilter}</span>
          </button>
        )}

        <div className="mr-auto ml-auto sm:ml-0 text-xs text-slate-500 font-b-nazanin font-semibold self-center">
          {filteredAndSortedRequests.length} {isPersian ? 'درخواست' : 'requests'}
        </div>
      </div>

      {/* Requests List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-4 text-xs font-bold text-slate-700">
            <span>{isPersian ? 'فهرست درخواست‌ها' : 'Requests Catalog'}</span>
            <div className="flex items-center gap-2">
              <button onClick={() => toggleSort('name')} className="hover:text-blue-600 flex items-center gap-1 cursor-pointer">
                <span>{t.userCol}</span>
                <ArrowUpDown className="w-3 h-3 text-slate-400" />
              </button>
              <button onClick={() => toggleSort('date')} className="hover:text-blue-600 flex items-center gap-1 cursor-pointer">
                <span>{isPersian ? 'تاریخ درخواست' : 'Date'}</span>
                <ArrowUpDown className="w-3 h-3 text-slate-400" />
              </button>
              <button onClick={() => toggleSort('status')} className="hover:text-blue-600 flex items-center gap-1 cursor-pointer">
                <span>{t.statusCol}</span>
                <ArrowUpDown className="w-3 h-3 text-slate-400" />
              </button>
            </div>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {filteredAndSortedRequests.map(req => {
            const isPending = req.status === 'pending';

            return (
              <div
                key={req.id}
                className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-slate-900 text-base">
                      {req.firstName} {req.lastName}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      req.status === 'pending'
                        ? 'bg-amber-100 text-amber-800'
                        : req.status === 'approved'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}>
                      {req.status === 'pending'
                        ? (isPersian ? 'در انتظار بررسی' : 'Pending')
                        : req.status === 'approved'
                        ? (isPersian ? 'تایید شده' : 'Approved')
                        : (isPersian ? 'رد شده' : 'Rejected')}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 font-b-nazanin">
                    <div className="flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span>{req.email}</span>
                    </div>

                    {req.mobile && (
                      <div className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{req.mobile}</span>
                      </div>
                    )}

                    {req.jobTitle && (
                      <div className="flex items-center gap-1">
                        <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                        <span>{req.jobTitle}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-1 text-slate-400">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{isPersian ? 'ثبت درخواست:' : 'Requested:'} {req.requestedAt}</span>
                    </div>
                  </div>
                </div>

                {isPending && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenApproveModal(req)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{isPersian ? 'تایید و صدور دسترسی' : 'Approve'}</span>
                    </button>

                    <button
                      onClick={() => setRejectTargetId(req.id)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>{isPersian ? 'رد درخواست' : 'Reject'}</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {filteredAndSortedRequests.length === 0 && (
            <div className="p-12 text-center text-slate-400 text-xs font-b-nazanin">
              {isPersian ? 'درخواستی یافت نشد.' : 'No registration requests.'}
            </div>
          )}
        </div>
      </div>

      {/* Approve Modal with eye toggle on password */}
      {approvingReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>{isPersian ? 'تایید درخواست و فعال‌سازی حساب کاربری' : 'Approve Membership Request'}</span>
              </h3>
              <button
                onClick={() => setApprovingReq(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-semibold">
                {formError}
              </div>
            )}

            <form onSubmit={handleConfirmApproval} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">{t.firstName}</label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">{t.lastName}</label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">{t.email}</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t.username} <span className="text-[10px] text-slate-400">({isPersian ? 'قابل ویرایش توسط مدیر' : 'Editable'})</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">{t.mobile}</label>
                  <input
                    type="tel"
                    value={mobile}
                    onChange={e => setMobile(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">{t.jobTitle}</label>
                  <input
                    type="text"
                    value={jobTitle}
                    onChange={e => setJobTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">{t.role}</label>
                  <select
                    value={role}
                    onChange={e => setRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:outline-hidden"
                  >
                    <option value="employee">{t.employeeRole}</option>
                    <option value="executive">{t.executiveRole}</option>
                    <option value="inspector">{t.inspectorRole}</option>
                    <option value="admin">{t.adminRole}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">{t.groupsCol}</label>
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg max-h-28 overflow-y-auto space-y-1">
                    {allGroups.map(g => (
                      <label key={g.id} className="flex items-center gap-1.5 text-xs cursor-pointer">
                        <input
                          type="checkbox"
                          checked={groupIds.includes(g.id)}
                          onChange={e => {
                            if (e.target.checked) setGroupIds([...groupIds, g.id]);
                            else setGroupIds(groupIds.filter(id => id !== g.id));
                          }}
                          className="rounded text-blue-600"
                        />
                        <span>{g.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Password auto-generated with Eye Toggle & Copy button */}
              {/* "فیلدهای رمز چشم داشته باشه" */}
              <div className="p-4 bg-blue-50/80 border border-blue-200 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                    <Key className="w-4 h-4 text-blue-600" />
                    <span>{isPersian ? 'رمز عبور موقت ایجاد شده' : 'Generated Temporary Password'}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setPassword(generateStrongPassword())}
                    className="text-[11px] text-blue-700 hover:underline font-semibold cursor-pointer"
                  >
                    {t.generateCredentials}
                  </button>
                </div>

                <div className="relative flex items-center">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full px-3 py-2 pl-10 rtl:pl-10 rtl:pr-3 bg-white border border-blue-300 rounded-lg font-mono text-sm font-bold text-blue-900 focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-2.5 rtl:left-2.5 rtl:right-auto ltr:right-2.5 ltr:left-auto p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                    title={showPassword ? (isPersian ? 'مخفی‌سازی رمز' : 'Hide password') : (isPersian ? 'نمایش رمز عبور' : 'Show password')}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4 text-blue-600" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={handleCopyFormattedCredentials}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{t.copyCredentials}</span>
                  </button>

                  <span className="text-[10px] text-blue-800 font-b-nazanin">
                    {isPersian
                      ? `معتبر به مدت ${settings.tempPasswordExpiryMinutes} دقیقه`
                      : `Valid for ${settings.tempPasswordExpiryMinutes} min`}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setApprovingReq(null)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  {isPersian ? 'تایید و صدور اکانت' : 'Confirm & Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      <ConfirmModal
        isOpen={!!rejectTargetId}
        title={isPersian ? 'رد درخواست عضویت' : 'Reject Membership Request'}
        message={
          isPersian
            ? 'آیا از رد این درخواست عضویت اطمینان دارید؟ کاربر امکان فعال‌سازی نخواهد داشت.'
            : 'Are you sure you want to reject this registration request?'
        }
        confirmText={isPersian ? 'رد درخواست' : 'Reject'}
        onConfirm={handleReject}
        onCancel={() => setRejectTargetId(null)}
        isPersian={isPersian}
      />
    </div>
  );
};
