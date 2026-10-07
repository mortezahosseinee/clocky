import React, { useState, useMemo } from 'react';
import { User, Group, UserRole } from '../types';
import { translations, Language } from '../utils/translations';
import { StorageService, generateStrongPassword } from '../utils/storage';
import { copyToClipboard } from '../utils/clipboard';
import { PersianDatePicker } from '../components/PersianDatePicker';
import { ConfirmModal } from '../components/ConfirmModal';
import { getTodayJalali } from '../utils/jalali';
import {
  Users,
  UserPlus,
  Edit2,
  Trash2,
  Archive,
  RotateCcw,
  Copy,
  CheckCircle2,
  Shield,
  Layers,
  Key,
  X,
  ArrowUpDown,
  Filter,
  Search,
  Eye,
  EyeOff
} from 'lucide-react';

interface UserManagementViewProps {
  user: User;
  lang: Language;
}

type UserSortColumn = 'name' | 'username' | 'email' | 'jobTitle' | 'role' | 'groups' | 'status' | 'createdAt';

export const UserManagementView: React.FC<UserManagementViewProps> = ({ user, lang }) => {
  const t = translations[lang];
  const isPersian = lang === 'fa';

  const settings = StorageService.getSettings();
  const allGroups = StorageService.getGroups();

  const [activeTab, setActiveTab] = useState<'users' | 'archive'>('users');
  const [users, setUsers] = useState<User[]>(() => StorageService.getUsers(false));
  const [archivedUsers, setArchivedUsers] = useState<User[]>(() => StorageService.getArchivedUsers());

  // Filters for active users
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterGroupId, setFilterGroupId] = useState<string>('all');

  // Sorting for active users
  const [sortField, setSortField] = useState<UserSortColumn>('createdAt');
  const [sortAsc, setSortAsc] = useState(false);

  // Sorting for archive
  const [archiveSortField, setArchiveSortField] = useState<'name' | 'username' | 'email' | 'role'>('name');
  const [archiveSortAsc, setArchiveSortAsc] = useState(true);

  // Add / Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Form states
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [mobile, setMobile] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [role, setRole] = useState<UserRole>('employee');
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [registrationDate, setRegistrationDate] = useState(getTodayJalali());
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [copiedNotification, setCopiedNotification] = useState(false);
  const [modalCopiedFeedback, setModalCopiedFeedback] = useState<string | null>(null);
  const [savedCredentialsBanner, setSavedCredentialsBanner] = useState<{
    username: string;
    password?: string;
    fullName: string;
    isNew: boolean;
  } | null>(null);

  // Quick Temporary Password Reset Modal
  const [resetPassUser, setResetPassUser] = useState<User | null>(null);
  const [resetPassValue, setResetPassValue] = useState('');
  const [showResetPass, setShowResetPass] = useState(false);
  const [resetPassNotification, setResetPassNotification] = useState<string | null>(null);

  // Delete Confirmations
  const [archiveTargetId, setArchiveTargetId] = useState<string | null>(null);
  const [permanentDeleteTargetId, setPermanentDeleteTargetId] = useState<string | null>(null);
  const [restoreTargetId, setRestoreTargetId] = useState<string | null>(null);

  const reloadData = () => {
    setUsers(StorageService.getUsers(false));
    setArchivedUsers(StorageService.getArchivedUsers());
  };

  const handleOpenResetPass = (u: User) => {
    setResetPassUser(u);
    setResetPassValue(generateStrongPassword());
    setShowResetPass(true);
  };

  const handleSaveResetPass = () => {
    if (!resetPassUser || !resetPassValue.trim()) return;

    const trimmed = resetPassValue.trim();
    const expiryMs = Date.now() + settings.tempPasswordExpiryMinutes * 60 * 1000;

    const updatedUser: User = {
      ...resetPassUser,
      passwordHash: trimmed,
      mustChangePassword: true,
      temporaryPasswordExpiry: expiryMs,
      isActive: true
    };

    StorageService.saveUser(updatedUser);
    StorageService.addLog(
      'RESET_PASSWORD',
      `رمز عبور موقت برای کاربر ${updatedUser.firstName} ${updatedUser.lastName} (${updatedUser.username}) تعیین گردید.`
    );

    const msg = isPersian
      ? `رمز عبور موقت برای ${updatedUser.firstName} ${updatedUser.lastName} با موفقیت تنظیم شد.`
      : `Temporary password updated for ${updatedUser.firstName} ${updatedUser.lastName}.`;

    setResetPassNotification(msg);
    setTimeout(() => setResetPassNotification(null), 4000);
    setResetPassUser(null);
    reloadData();
  };

  const toggleSort = (field: UserSortColumn) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const handleOpenAdd = () => {
    setEditingUser(null);
    setFirstName('');
    setLastName('');
    setEmail('');
    setUsername('');
    setMobile('');
    setJobTitle('');
    setRole('employee');
    setGroupIds(allGroups.length > 0 ? [allGroups[0].id] : []);
    setIsActive(true);
    setRegistrationDate(getTodayJalali());
    setPassword(generateStrongPassword());
    setShowPassword(true);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (u: User) => {
    setEditingUser(u);
    setFirstName(u.firstName);
    setLastName(u.lastName);
    setEmail(u.email);
    setUsername(u.username);
    setMobile(u.mobile || '');
    setJobTitle(u.jobTitle || '');
    setRole(u.role);
    setGroupIds(u.groupIds);
    setIsActive(u.isActive);
    setRegistrationDate(u.createdAt);
    setPassword(''); // leave blank if unchanged
    setShowPassword(false);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleCopyCredentials = async (uname: string, pwd: string, fullName: string) => {
    const text = isPersian
      ? `کاربر عزیز ${fullName}
نام کاربری شما: ${uname}
رمز عبور شما: ${pwd}
آدرس سامانه: ${window.location.origin}
این رمز عبور به مدت ${settings.tempPasswordExpiryMinutes} دقیقه فعال است. لطفاً پس از ورود، اقدام به تغییر رمز فرمایید.`
      : `Dear ${fullName},
Username: ${uname}
Password: ${pwd}
URL: ${window.location.origin}
Valid for ${settings.tempPasswordExpiryMinutes} minutes.`;

    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedNotification(true);
      setModalCopiedFeedback(isPersian ? 'مشخصات کامل ورود در کلیپ‌بورد کپی شد!' : 'Full login details copied!');
      setTimeout(() => {
        setCopiedNotification(false);
        setModalCopiedFeedback(null);
      }, 3500);
    }
  };

  const handleCopyPassword = async (pwd: string) => {
    if (!pwd) return;
    const ok = await copyToClipboard(pwd);
    if (ok) {
      setCopiedNotification(true);
      setModalCopiedFeedback(isPersian ? 'رمز عبور با موفقیت کپی شد!' : 'Password copied!');
      setTimeout(() => {
        setCopiedNotification(false);
        setModalCopiedFeedback(null);
      }, 3500);
    }
  };

  const handleCopyUsername = async (uname: string) => {
    if (!uname) return;
    const ok = await copyToClipboard(uname);
    if (ok) {
      setCopiedNotification(true);
      setModalCopiedFeedback(isPersian ? 'نام کاربری با موفقیت کپی شد!' : 'Username copied!');
      setTimeout(() => {
        setCopiedNotification(false);
        setModalCopiedFeedback(null);
      }, 3500);
    }
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      setFormError(isPersian ? 'نام، نام خانوادگی و ایمیل اجباری هستند.' : 'First name, last name, and email are required.');
      return;
    }

    const currentUsername = (
      username.trim() ||
      (editingUser ? editingUser.username : '') ||
      (email.trim().includes('@') ? email.trim().split('@')[0] : email.trim())
    );

    // Check duplicate username
    const allExisting = StorageService.getUsers(true);
    const dupUser = allExisting.find(
      u => u.username.toLowerCase() === currentUsername.toLowerCase() && u.id !== editingUser?.id
    );
    if (dupUser) {
      setFormError(isPersian ? 'این نام کاربری قبلاً استفاده شده است.' : 'Username already in use.');
      return;
    }

    const trimmedPassword = password ? password.trim() : '';
    const actualPassword = trimmedPassword || (editingUser ? (editingUser.passwordHash || 'Employee@2026') : 'Employee@2026');
    // Expiry for temporary password
    const expiryMs = trimmedPassword ? Date.now() + settings.tempPasswordExpiryMinutes * 60 * 1000 : undefined;

    const saved: User = {
      id: editingUser ? editingUser.id : `usr-${Date.now()}`,
      username: currentUsername,
      email: email.trim(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      mobile: mobile.trim() || undefined,
      jobTitle: jobTitle.trim() || undefined,
      role,
      groupIds,
      isActive,
      isArchived: false,
      mustChangePassword: editingUser ? (trimmedPassword ? true : editingUser.mustChangePassword) : true,
      temporaryPasswordExpiry: trimmedPassword ? expiryMs : editingUser?.temporaryPasswordExpiry,
      createdAt: registrationDate,
      passwordHash: actualPassword
    };

    StorageService.saveUser(saved);
    StorageService.addLog(
      editingUser ? 'UPDATE_USER' : 'CREATE_USER',
      `کاربر ${saved.firstName} ${saved.lastName} (${saved.username}) ${editingUser ? 'ویرایش' : 'تعریف'} گردید.`
    );

    // Provide immediate banner with credentials for 1-click copy
    setSavedCredentialsBanner({
      username: saved.username,
      password: actualPassword,
      fullName: `${saved.firstName} ${saved.lastName}`,
      isNew: !editingUser
    });

    setIsModalOpen(false);
    reloadData();
  };

  const handleArchive = () => {
    if (archiveTargetId) {
      StorageService.archiveUser(archiveTargetId);
      setArchiveTargetId(null);
      reloadData();
    }
  };

  const handleRestore = () => {
    if (restoreTargetId) {
      StorageService.restoreUser(restoreTargetId);
      setRestoreTargetId(null);
      reloadData();
    }
  };

  const handlePermanentDelete = () => {
    if (permanentDeleteTargetId) {
      StorageService.permanentlyDeleteUser(permanentDeleteTargetId);
      setPermanentDeleteTargetId(null);
      reloadData();
    }
  };

  // Filtered and sorted active users
  const filteredUsers = useMemo(() => {
    return users
      .filter(u => {
        if (filterRole !== 'all' && u.role !== filterRole) return false;
        if (filterStatus === 'active' && !u.isActive) return false;
        if (filterStatus === 'inactive' && u.isActive) return false;
        if (filterGroupId !== 'all' && !u.groupIds.includes(filterGroupId)) return false;

        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          const matchName = `${u.firstName} ${u.lastName}`.toLowerCase().includes(q);
          const matchUser = u.username.toLowerCase().includes(q);
          const matchEmail = u.email.toLowerCase().includes(q);
          const matchJob = (u.jobTitle || '').toLowerCase().includes(q);
          const matchMobile = (u.mobile || '').includes(q);
          if (!matchName && !matchUser && !matchEmail && !matchJob && !matchMobile) return false;
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
          case 'username':
            diff = a.username.localeCompare(b.username);
            break;
          case 'email':
            diff = a.email.localeCompare(b.email);
            break;
          case 'jobTitle':
            diff = (a.jobTitle || '').localeCompare(b.jobTitle || '');
            break;
          case 'role':
            diff = a.role.localeCompare(b.role);
            break;
          case 'groups':
            diff = a.groupIds.length - b.groupIds.length;
            break;
          case 'status':
            diff = (a.isActive === b.isActive ? 0 : a.isActive ? 1 : -1);
            break;
          case 'createdAt':
            diff = (a.createdAt || '').localeCompare(b.createdAt || '');
            break;
        }

        return sortAsc ? diff : -diff;
      });
  }, [users, filterRole, filterStatus, filterGroupId, searchQuery, sortField, sortAsc]);

  // Filtered & sorted archive users
  const filteredArchivedUsers = useMemo(() => {
    return archivedUsers
      .filter(u => {
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          const matchName = `${u.firstName} ${u.lastName}`.toLowerCase().includes(q);
          const matchUser = u.username.toLowerCase().includes(q);
          const matchEmail = u.email.toLowerCase().includes(q);
          if (!matchName && !matchUser && !matchEmail) return false;
        }
        return true;
      })
      .sort((a, b) => {
        let diff = 0;
        const nameA = `${a.firstName} ${a.lastName}`;
        const nameB = `${b.firstName} ${b.lastName}`;
        if (archiveSortField === 'name') diff = nameA.localeCompare(nameB);
        else if (archiveSortField === 'username') diff = a.username.localeCompare(b.username);
        else if (archiveSortField === 'email') diff = a.email.localeCompare(b.email);
        else if (archiveSortField === 'role') diff = a.role.localeCompare(b.role);
        return archiveSortAsc ? diff : -diff;
      });
  }, [archivedUsers, searchQuery, archiveSortField, archiveSortAsc]);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {resetPassNotification && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center justify-between gap-2 shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-b-nazanin leading-relaxed">{resetPassNotification}</span>
          </div>
          <button
            onClick={() => setResetPassNotification(null)}
            className="p-1 text-emerald-600 hover:text-emerald-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">{t.userManagement}</h2>
            <p className="text-xs text-slate-500 font-b-nazanin mt-0.5">
              {isPersian
                ? 'تعریف کارکنان، تخصیص گروه‌ها، صدور رمز عبور موقت با کلید چشم و مدیریت آرشیو'
                : 'Personnel management, group assignments, credentials policy, and archive vault'}
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>{isPersian ? 'افزودن کاربر جدید' : 'Add New User'}</span>
        </button>
      </div>

      {/* Saved Credentials Alert Banner for Instant 1-Click Copy */}
      {savedCredentialsBanner && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl shadow-xs space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                {savedCredentialsBanner.isNew
                  ? (isPersian ? `کاربر جدید «${savedCredentialsBanner.fullName}» با موفقیت افزوده شد.` : `User ${savedCredentialsBanner.fullName} created.`)
                  : (isPersian ? `اطلاعات کاربر «${savedCredentialsBanner.fullName}» با موفقیت ذخیره شد.` : `User ${savedCredentialsBanner.fullName} updated.`)}
              </span>
            </div>
            <button
              onClick={() => setSavedCredentialsBanner(null)}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs bg-white/80 p-3 rounded-xl border border-emerald-200 font-mono">
            <div>
              <span className="font-sans font-semibold text-slate-600 ml-1">{isPersian ? 'نام کاربری:' : 'Username:'}</span>
              <span className="font-bold text-slate-900">{savedCredentialsBanner.username}</span>
            </div>
            {savedCredentialsBanner.password && (
              <div>
                <span className="font-sans font-semibold text-slate-600 ml-1">{isPersian ? 'رمز عبور موقت:' : 'Temporary Password:'}</span>
                <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">{savedCredentialsBanner.password}</span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => handleCopyUsername(savedCredentialsBanner.username)}
              className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{isPersian ? 'کپی نام کاربری' : 'Copy Username'}</span>
            </button>
            {savedCredentialsBanner.password && (
              <>
                <button
                  type="button"
                  onClick={() => handleCopyPassword(savedCredentialsBanner.password!)}
                  className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{isPersian ? 'کپی رمز عبور' : 'Copy Password'}</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleCopyCredentials(
                      savedCredentialsBanner.username,
                      savedCredentialsBanner.password!,
                      savedCredentialsBanner.fullName
                    )
                  }
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{isPersian ? 'کپی مشخصات کامل جهت ارسال به کاربر' : 'Copy Full Login Details'}</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {copiedNotification && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{t.credentialsCopied}</span>
        </div>
      )}

      {/* Tabs: Active Users vs Archive Vault */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('users')}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 cursor-pointer ${
            activeTab === 'users'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <Users className="w-4 h-4" />
            <span>{isPersian ? `کاربران جاری (${users.length})` : `Active Users (${users.length})`}</span>
          </div>
        </button>

        <button
          onClick={() => setActiveTab('archive')}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 cursor-pointer ${
            activeTab === 'archive'
              ? 'border-red-600 text-red-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <Archive className="w-4 h-4" />
            <span>{isPersian ? `بخش آرشیو (${archivedUsers.length})` : `Archive Vault (${archivedUsers.length})`}</span>
          </div>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 shrink-0">
          <Filter className="w-4 h-4 text-slate-400" />
          <span>{t.filter}:</span>
        </div>

        {/* Search Input */}
        <div className="w-56">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={isPersian ? 'جستجو در نام، ایمیل، موبایل...' : 'Search user...'}
              className="w-full px-3 py-2 pr-8 bg-white border border-slate-300 rounded-lg text-xs focus:outline-hidden"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5" />
          </div>
        </div>

        {activeTab === 'users' && (
          <>
            {/* Role Filter */}
            <div className="w-40">
              <select
                value={filterRole}
                onChange={e => setFilterRole(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:outline-hidden"
              >
                <option value="all">{isPersian ? 'همه نقش‌ها' : 'All Roles'}</option>
                <option value="employee">{t.employeeRole}</option>
                <option value="executive">{t.executiveRole}</option>
                <option value="inspector">{t.inspectorRole}</option>
                <option value="admin">{t.adminRole}</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="w-36">
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:outline-hidden"
              >
                <option value="all">{isPersian ? 'همه وضعیت‌ها' : 'All Statuses'}</option>
                <option value="active">{t.activeStatus}</option>
                <option value="inactive">{t.inactiveStatus}</option>
              </select>
            </div>

            {/* Group Filter */}
            <div className="w-44">
              <select
                value={filterGroupId}
                onChange={e => setFilterGroupId(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:outline-hidden"
              >
                <option value="all">{isPersian ? 'همه گروه‌ها' : 'All Groups'}</option>
                {allGroups.map(g => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        {(searchQuery || filterRole !== 'all' || filterStatus !== 'all' || filterGroupId !== 'all') && (
          <button
            onClick={() => {
              setSearchQuery('');
              setFilterRole('all');
              setFilterStatus('all');
              setFilterGroupId('all');
            }}
            className="px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg border border-rose-200 flex items-center gap-1 transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>{t.clearFilter}</span>
          </button>
        )}

        <div className="mr-auto ml-auto sm:ml-0 text-xs text-slate-500 font-b-nazanin font-semibold self-center">
          {activeTab === 'users' ? filteredUsers.length : filteredArchivedUsers.length}{' '}
          {isPersian ? 'کاربر' : 'users'}
        </div>
      </div>

      {/* Active Users Table with all columns sortable */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 select-none">
                <tr>
                  <th className="p-3 w-10 text-center">#</th>

                  <th onClick={() => toggleSort('name')} className="p-3 cursor-pointer hover:bg-slate-100 transition-colors">
                    <div className="flex items-center gap-1">
                      <span>{t.userCol}</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>

                  <th onClick={() => toggleSort('username')} className="p-3 cursor-pointer hover:bg-slate-100 transition-colors">
                    <div className="flex items-center gap-1">
                      <span>{t.username}</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>

                  <th onClick={() => toggleSort('email')} className="p-3 cursor-pointer hover:bg-slate-100 transition-colors">
                    <div className="flex items-center gap-1">
                      <span>{t.email}</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>

                  <th onClick={() => toggleSort('jobTitle')} className="p-3 cursor-pointer hover:bg-slate-100 transition-colors">
                    <div className="flex items-center gap-1">
                      <span>{t.jobTitle}</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>

                  <th onClick={() => toggleSort('role')} className="p-3 cursor-pointer hover:bg-slate-100 transition-colors">
                    <div className="flex items-center gap-1">
                      <span>{t.role}</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>

                  <th onClick={() => toggleSort('groups')} className="p-3 cursor-pointer hover:bg-slate-100 transition-colors">
                    <div className="flex items-center gap-1">
                      <span>{t.groupsCol}</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>

                  <th onClick={() => toggleSort('status')} className="p-3 cursor-pointer hover:bg-slate-100 transition-colors">
                    <div className="flex items-center gap-1">
                      <span>{t.statusCol}</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>

                  <th onClick={() => toggleSort('createdAt')} className="p-3 cursor-pointer hover:bg-slate-100 transition-colors">
                    <div className="flex items-center gap-1">
                      <span>{t.createdAtCol}</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>

                  <th className="p-3 text-center">{t.actionsCol}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-b-nazanin">
                {filteredUsers.map((u, idx) => {
                  const userGroupNames = u.groupIds
                    .map(gid => allGroups.find(g => g.id === gid)?.name)
                    .filter(Boolean);

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3 text-center text-slate-400">{idx + 1}</td>
                      <td className="p-3 font-bold text-slate-900 text-sm">
                        {u.firstName} {u.lastName}
                      </td>
                      <td className="p-3 font-mono text-slate-600 font-semibold">{u.username}</td>
                      <td className="p-3 text-slate-600">{u.email}</td>
                      <td className="p-3 text-slate-700">{u.jobTitle || '-'}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">
                          {u.role === 'admin' ? t.adminRole : u.role === 'inspector' ? t.inspectorRole : u.role === 'executive' ? t.executiveRole : t.employeeRole}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {userGroupNames.map((gn, gIdx) => (
                            <span key={gIdx} className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-semibold">
                              {gn}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-3">
                        {u.isActive ? (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-semibold text-[11px]">
                            {t.activeStatus}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 font-semibold text-[11px]">
                            {t.inactiveStatus}
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-slate-500">{u.createdAt}</td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenResetPass(u)}
                            className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                            title={isPersian ? 'تعیین / تعویض رمز عبور موقت' : 'Set / Reset Temporary Password'}
                          >
                            <Key className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleOpenEdit(u)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title={t.edit}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Admin cannot archive self */}
                          {u.id !== user.id && (
                            <button
                              onClick={() => setArchiveTargetId(u.id)}
                              className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                              title={isPersian ? 'انتقال به آرشیو' : 'Archive'}
                            >
                              <Archive className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-slate-400">
                      {isPersian ? 'کاربری با این مشخصات یافت نشد.' : 'No users match criteria.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Archive Vault Table */}
      {activeTab === 'archive' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-amber-50/60 border-b border-amber-100 text-xs text-amber-800 font-semibold font-b-nazanin">
            {isPersian
              ? 'کاربران موجود در این بخش غیرفعال هستند و امکان ورود ندارند. می‌توانید آنها را بازگردانی کرده یا به طور دائم حذف نمایید.'
              : 'Archived users cannot log in. You can restore them or permanently wipe them.'}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3 w-10 text-center">#</th>
                  <th
                    onClick={() => {
                      if (archiveSortField === 'name') setArchiveSortAsc(!archiveSortAsc);
                      else { setArchiveSortField('name'); setArchiveSortAsc(true); }
                    }}
                    className="p-3 cursor-pointer hover:bg-slate-100"
                  >
                    <div className="flex items-center gap-1">
                      <span>{t.userCol}</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="p-3">{t.username}</th>
                  <th className="p-3">{t.email}</th>
                  <th className="p-3">{t.jobTitle}</th>
                  <th className="p-3">{t.role}</th>
                  <th className="p-3 text-center">{t.actionsCol}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-b-nazanin">
                {filteredArchivedUsers.map((u, idx) => (
                  <tr key={u.id} className="hover:bg-slate-50/70 transition-colors bg-amber-50/20">
                    <td className="p-3 text-center text-slate-400">{idx + 1}</td>
                    <td className="p-3 font-bold text-slate-900">{u.firstName} {u.lastName}</td>
                    <td className="p-3 font-mono text-slate-600">{u.username}</td>
                    <td className="p-3 text-slate-600">{u.email}</td>
                    <td className="p-3 text-slate-700">{u.jobTitle || '-'}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">
                        {u.role}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setRestoreTargetId(u.id)}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer"
                          title={isPersian ? 'بازگردانی به لیست کاربران فعال' : 'Restore'}
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>{isPersian ? 'بازگردانی' : 'Restore'}</span>
                        </button>

                        <button
                          onClick={() => setPermanentDeleteTargetId(u.id)}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors cursor-pointer"
                          title={isPersian ? 'حذف دائمی از پایگاه داده' : 'Wipe'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>{isPersian ? 'حذف قطعی' : 'Delete'}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredArchivedUsers.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      {isPersian ? 'هیچ کاربری در بخش آرشیو قرار ندارد.' : 'Archive vault is empty.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Modal with eye toggle on password */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                <span>
                  {editingUser
                    ? (isPersian ? 'ویرایش اطلاعات پرسنل' : 'Edit User Profile')
                    : (isPersian ? 'تعریف کاربر جدید' : 'Register New User')}
                </span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveUser} className="space-y-4">
              {/* Mandatory: First Name & Last Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t.firstName} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
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
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Mandatory Email & Username */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t.email} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      {t.username}
                    </label>
                    {(username || editingUser?.username) && (
                      <button
                        type="button"
                        onClick={() => handleCopyUsername(username.trim() || editingUser?.username || '')}
                        className="text-[11px] text-blue-600 hover:text-blue-800 flex items-center gap-1 font-semibold cursor-pointer"
                        title={isPersian ? 'کپی نام کاربری' : 'Copy username'}
                      >
                        <Copy className="w-3 h-3" />
                        <span>{isPersian ? 'کپی نام کاربری' : 'Copy'}</span>
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder={email ? (email.includes('@') ? email.split('@')[0] : email) : 'username'}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Optional: Mobile & Job Title */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t.mobile} <span className="text-slate-400 font-normal">({t.optional})</span>
                  </label>
                  <input
                    type="tel"
                    value={mobile}
                    onChange={e => setMobile(e.target.value)}
                    placeholder="0912..."
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
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
                    placeholder={isPersian ? 'مثال: کارشناس نرم‌افزار' : 'e.g. Software Engineer'}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Role & Registration Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t.role}
                  </label>
                  <select
                    value={role}
                    onChange={e => setRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  >
                    <option value="employee">{t.employeeRole}</option>
                    <option value="executive">{t.executiveRole}</option>
                    <option value="inspector">{t.inspectorRole}</option>
                    <option value="admin">{t.adminRole}</option>
                  </select>
                </div>

                <div>
                  <PersianDatePicker
                    value={registrationDate}
                    onChange={setRegistrationDate}
                    label={t.createdAtCol}
                    required
                    isPersian={isPersian}
                  />
                </div>
              </div>

              {/* Group assignment */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.groupsCol}
                </label>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg max-h-32 overflow-y-auto space-y-1.5">
                  {allGroups.map(g => (
                    <label key={g.id} className="flex items-center gap-2 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={groupIds.includes(g.id)}
                        onChange={e => {
                          if (e.target.checked) setGroupIds([...groupIds, g.id]);
                          else setGroupIds(groupIds.filter(id => id !== g.id));
                        }}
                        className="rounded text-blue-600"
                      />
                      <span className="font-semibold text-slate-800">{g.name}</span>
                    </label>
                  ))}
                  {allGroups.length === 0 && (
                    <span className="text-xs text-slate-400 font-b-nazanin">
                      {isPersian ? 'گروهی تعریف نشده است.' : 'No groups defined yet.'}
                    </span>
                  )}
                </div>
              </div>

              {/* Password field with Eye Toggle */}
              {/* "فیلدهای رمز چشم داشته باشه" */}
              <div className="p-3.5 bg-blue-50/60 border border-blue-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-blue-600" />
                    <span>{isPersian ? 'رمز عبور اولیه / موقت' : 'Initial / Temporary Password'}</span>
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
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder={editingUser ? (isPersian ? 'برای تغییر ندادن خالی بگذارید' : 'Leave empty to keep current') : '••••••••'}
                    className="w-full px-3 py-2 pl-10 rtl:pl-10 rtl:pr-3 bg-white border border-blue-300 rounded-lg font-mono text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />

                  {/* Eye toggle button */}
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

                {password ? (
                  <div className="space-y-2 pt-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopyPassword(password)}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                        title={isPersian ? 'کپی فقط رمز عبور' : 'Copy password only'}
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>{isPersian ? 'کپی فقط رمز' : 'Copy Password'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleCopyCredentials(
                            editingUser ? editingUser.username : username.trim() || email.trim(),
                            password,
                            `${firstName} ${lastName}`
                          )
                        }
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shrink-0 shadow-2xs cursor-pointer transition-colors"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>{t.copyCredentials}</span>
                      </button>

                      <span className="text-[10px] text-blue-700 font-b-nazanin mr-auto rtl:mr-auto rtl:ml-0">
                        {isPersian
                          ? `معتبر به مدت ${settings.tempPasswordExpiryMinutes} دقیقه`
                          : `Valid for ${settings.tempPasswordExpiryMinutes} min`}
                      </span>
                    </div>
                    <p className="text-[11px] text-blue-800 font-b-nazanin pt-1">
                      {isPersian
                        ? 'رمز عبور کاربر در کادر بالا مشخص است. جهت تحویل به کاربر آن را یادداشت یا کپی فرمایید.'
                        : 'Password is shown in the box above. Please copy or note it down for the user.'}
                    </p>
                  </div>
                ) : editingUser ? (
                  <div className="pt-1 space-y-1.5">
                    <p className="text-[11px] text-slate-500 font-b-nazanin leading-relaxed">
                      {isPersian
                        ? 'رمز عبور قبلی کاربر بدون تغییر باقی می‌ماند. برای تنظیم رمز موقت جدید، در کادر بالا تایپ کنید یا روی «تولید اطلاعات ورود» کلیک نمایید.'
                        : 'Current password remains unchanged. Type new password or click Generate to set a temporary one.'}
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        handleCopyCredentials(
                          editingUser.username,
                          '(رمز عبور اختصاصی کاربر)',
                          `${firstName} ${lastName}`
                        )
                      }
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{isPersian ? 'کپی نام کاربری و آدرس ورود' : 'Copy Username & URL'}</span>
                    </button>
                  </div>
                ) : (
                  <div className="pt-1 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs space-y-1">
                    <p className="font-semibold">
                      {isPersian
                        ? 'توجه: کادر رمز عبور خالی است؛ در این صورت رمز عبور پیش‌فرض Employee@2026 برای این کاربر ثبت می‌شود.'
                        : 'Notice: Password field is empty; default password Employee@2026 will be assigned.'}
                    </p>
                  </div>
                )}

                {/* Inline confirmation badge when copied */}
                {modalCopiedFeedback && (
                  <div className="p-2 bg-emerald-100 border border-emerald-300 text-emerald-900 rounded-lg text-xs font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{modalCopiedFeedback}</span>
                  </div>
                )}
              </div>

              {/* Active Toggle */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="userActiveToggle"
                  checked={isActive}
                  onChange={e => setIsActive(e.target.checked)}
                  className="rounded text-blue-600"
                />
                <label htmlFor="userActiveToggle" className="text-xs font-semibold text-slate-800 cursor-pointer">
                  {isPersian ? 'حساب کاربری فعال است (امکان ورود به سامانه)' : 'User account is active'}
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  {t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Temporary Password Reset Modal */}
      {resetPassUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    {isPersian ? 'تعیین / تعویض رمز عبور موقت' : 'Set / Reset Temporary Password'}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    {resetPassUser.firstName} {resetPassUser.lastName} ({resetPassUser.username})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setResetPassUser(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3 text-xs text-blue-900 space-y-1 font-b-nazanin">
              <div>
                <span className="font-bold">{isPersian ? 'ایمیل:' : 'Email:'} </span>
                <span className="font-mono">{resetPassUser.email}</span>
              </div>
              {resetPassUser.mobile && (
                <div>
                  <span className="font-bold">{isPersian ? 'شماره موبایل:' : 'Mobile:'} </span>
                  <span className="font-mono">{resetPassUser.mobile}</span>
                </div>
              )}
              <p className="text-[11px] text-blue-700 pt-1">
                {isPersian
                  ? `کاربر می‌تواند با نام کاربری (${resetPassUser.username}) یا ایمیل (${resetPassUser.email}) و این رمز عبور وارد شود. در بدو ورود ملزم به تغییر رمز خواهد بود.`
                  : 'The user can log in with their username or email, and will be prompted to change password.'}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700">
                  {isPersian ? 'رمز عبور موقت جدید' : 'New Temporary Password'}
                </label>
                <button
                  type="button"
                  onClick={() => setResetPassValue(generateStrongPassword())}
                  className="text-[11px] text-blue-600 hover:underline font-semibold cursor-pointer"
                >
                  {t.generateCredentials}
                </button>
              </div>

              <div className="relative flex items-center">
                <input
                  type={showResetPass ? 'text' : 'password'}
                  value={resetPassValue}
                  onChange={e => setResetPassValue(e.target.value)}
                  className="w-full px-3 py-2.5 pl-10 rtl:pl-10 rtl:pr-3 bg-white border border-slate-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
                <button
                  type="button"
                  onClick={() => setShowResetPass(!showResetPass)}
                  className="absolute left-2.5 rtl:left-2.5 rtl:right-auto ltr:right-2.5 ltr:left-auto p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showResetPass ? <EyeOff className="w-4 h-4 text-blue-600" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleCopyUsername(resetPassUser.username)}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Copy className="w-3 h-3" />
                  <span>{isPersian ? 'کپی نام کاربری' : 'Copy Username'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleCopyPassword(resetPassValue.trim())}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Copy className="w-3 h-3" />
                  <span>{isPersian ? 'کپی فقط رمز' : 'Copy Password'}</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleCopyCredentials(
                      resetPassUser.username || resetPassUser.email,
                      resetPassValue.trim(),
                      `${resetPassUser.firstName} ${resetPassUser.lastName}`
                    )
                  }
                  className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Copy className="w-3 h-3" />
                  <span>{isPersian ? 'کپی کل متن ورود' : 'Copy Full Login Details'}</span>
                </button>

                {modalCopiedFeedback && (
                  <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{modalCopiedFeedback}</span>
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setResetPassUser(null)}
                className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={handleSaveResetPass}
                disabled={!resetPassValue.trim()}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-300 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                {isPersian ? 'ثبت و فعال‌سازی رمز موقت' : 'Save & Activate Password'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Archive Modal */}
      <ConfirmModal
        isOpen={!!archiveTargetId}
        title={isPersian ? 'انتقال کاربر به بخش آرشیو' : 'Archive User'}
        message={
          isPersian
            ? 'با انتقال کاربر به آرشیو، حساب وی غیرفعال شده و امکان ورود به سامانه را نخواهد داشت. سوابق وی حفظ خواهد شد.'
            : 'Archiving disables login but preserves user data. Proceed?'
        }
        confirmText={isPersian ? 'انتقال به آرشیو' : 'Archive'}
        onConfirm={handleArchive}
        onCancel={() => setArchiveTargetId(null)}
        isPersian={isPersian}
      />

      {/* Confirm Restore Modal */}
      <ConfirmModal
        isOpen={!!restoreTargetId}
        title={isPersian ? 'بازگردانی کاربر از آرشیو' : 'Restore User'}
        message={
          isPersian
            ? 'آیا مایل به فعال‌سازی مجدد این کاربر و بازگردانی وی به فهرست پرسنل جاری هستید؟'
            : 'Restore user to active list?'
        }
        confirmText={isPersian ? 'بازگردانی' : 'Restore'}
        onConfirm={handleRestore}
        onCancel={() => setRestoreTargetId(null)}
        isPersian={isPersian}
      />

      {/* Confirm Permanent Delete Modal */}
      <ConfirmModal
        isOpen={!!permanentDeleteTargetId}
        title={isPersian ? 'حذف قطعی کاربر از پایگاه داده' : 'Permanently Delete User'}
        message={
          isPersian
            ? 'هشدار: این عملیات غیرقابل بازگشت است و رکورد کاربر به طور کامل از دیتابیس پاک خواهد شد. آیا مطمئنید؟'
            : 'Warning: This action is irreversible and permanently deletes the user from database.'
        }
        confirmText={isPersian ? 'حذف قطعی' : 'Delete Permanently'}
        onConfirm={handlePermanentDelete}
        onCancel={() => setPermanentDeleteTargetId(null)}
        isPersian={isPersian}
      />
    </div>
  );
};
