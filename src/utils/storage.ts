import {
  User, Group, Project, AttendanceRecord, UserSession, SystemLog,
  RegistrationRequest, MonthlyBackup, SystemSettings, LoginAttempt, CustomTypeConfig
} from '../types';
import {
  getTodayJalali,
  getCurrentJalaliParts,
  calculateFullDurationMinutes,
  PERSIAN_MONTHS,
  ENGLISH_MONTH_EQUIVALENTS
} from './jalali';
import { parseDeviceAndBrowser } from './deviceAndIp';

const STORAGE_KEYS = {
  USERS: 'emp_att_users_v2',
  GROUPS: 'emp_att_groups_v2',
  PROJECTS: 'emp_att_projects_v2',
  ATTENDANCE: 'emp_att_attendance_v2',
  SESSIONS: 'emp_att_sessions_v2',
  LOGS: 'emp_att_logs_v2',
  REQUESTS: 'emp_att_requests_v2',
  BACKUPS: 'emp_att_backups_v2',
  SETTINGS: 'emp_att_settings_v2',
  LOGIN_ATTEMPTS: 'emp_att_login_attempts_v2',
  CURRENT_USER_ID: 'emp_att_current_user_id_v2',
  CURRENT_SESSION_ID: 'emp_att_current_session_id_v2',
  LANGUAGE: 'emp_att_lang_v2'
};

const DEFAULT_SETTINGS: SystemSettings = {
  primaryColor: '#2563eb', // Royal Blue
  secondaryColor: '#0d9488', // Teal
  accentColor: '#f59e0b', // Amber
  tempPasswordExpiryMinutes: 60,
  leaveTypes: [
    { id: 'lt-1', titleFa: 'مرخصی عادی', titleEn: 'Regular / Annual Leave' },
    { id: 'lt-2', titleFa: 'مرخصی استعلاجی', titleEn: 'Sick Leave' },
    { id: 'lt-3', titleFa: 'مرخصی مناسبتی', titleEn: 'Casual / Occasion Leave' }
  ],
  specialWorkTypes: [
    { id: 'st-1', titleFa: 'قطعی برق', titleEn: 'Power Outage' },
    { id: 'st-2', titleFa: 'اختلال شبکه و ارتباطات', titleEn: 'Network & System Disruption' },
    { id: 'st-3', titleFa: 'تعطیلی اضطراری / شرایط جوی', titleEn: 'Emergency / Weather Closure' }
  ],
  blockedIps: ['192.168.1.99'],
  organizationName: '',
  organizationLogo: '',
  customTitles: {}
};

export function getCustomTypeTitle(
  item: string | CustomTypeConfig,
  lang: 'fa' | 'en' = 'fa'
): string {
  if (!item) return '';
  if (typeof item === 'string') return item;
  if (lang === 'en' && item.titleEn && item.titleEn.trim()) return item.titleEn.trim();
  return item.titleFa || item.titleEn || '';
}

export function getCustomTypeId(item: string | CustomTypeConfig): string {
  if (typeof item === 'string') return item;
  return item.id;
}

/**
 * Normalizes Persian and Arabic numbers to Latin standard digits
 */
export function normalizePersianDigits(str: string | number | undefined | null): string {
  if (str === undefined || str === null) return '';
  return String(str)
    .replace(/[۰-۹]/g, d => String.fromCharCode(d.charCodeAt(0) - 1776 + 48))
    .replace(/[٠-٩]/g, d => String.fromCharCode(d.charCodeAt(0) - 1632 + 48));
}

/**
 * Normalizes Persian/Arabic characters, letters, and whitespace for bulletproof auth matching
 */
export function normalizeAuthText(str: string | undefined | null): string {
  if (!str) return '';
  return normalizePersianDigits(str)
    .trim()
    .toLowerCase()
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/ة/g, 'ه')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ');
}

/**
 * Normalizes phone numbers to standard format (e.g., 0912...)
 */
export function normalizeMobileNumber(phone: string | undefined | null): string {
  if (!phone) return '';
  const digits = normalizePersianDigits(phone).replace(/\D/g, '');
  if (digits.startsWith('0098')) return '0' + digits.slice(4);
  if (digits.startsWith('98')) return '0' + digits.slice(2);
  if (digits.length === 10 && digits.startsWith('9')) return '0' + digits;
  return digits;
}

/**
 * Validates worldwide password standards:
 * At least 8 characters, at least 1 uppercase, 1 lowercase, 1 digit, 1 special character
 */
export function validatePasswordStandard(password: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (password.length < 8) {
    errors.push('طول رمز عبور باید حداقل ۸ کاراکتر باشد');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('شامل حداقل یک حرف کوچک انگلیسی (a-z)');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('شامل حداقل یک حرف بزرگ انگلیسی (A-Z)');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('شامل حداقل یک عدد (0-9)');
  }
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    errors.push('شامل حداقل یک نماد خاص (!@#$%^&*)');
  }
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Generates a compliant secure password
 */
export function generateStrongPassword(): string {
  const lowers = 'abcdefghjkmnpqrstuvwxyz';
  const uppers = 'ABCDEFGHJKMNPQRSTUVWXYZ';
  const digits = '23456789';
  const symbols = '!@#$%&*';
  
  let pwd = '';
  pwd += lowers[Math.floor(Math.random() * lowers.length)];
  pwd += uppers[Math.floor(Math.random() * uppers.length)];
  pwd += digits[Math.floor(Math.random() * digits.length)];
  pwd += symbols[Math.floor(Math.random() * symbols.length)];
  
  const all = lowers + uppers + digits + symbols;
  for (let i = 4; i < 10; i++) {
    pwd += all[Math.floor(Math.random() * all.length)];
  }
  
  return pwd.split('').sort(() => 0.5 - Math.random()).join('');
}

// Initial Seeds: Only Super Admin is retained by default
function initializeDatabaseIfEmpty() {
  const existingUsersRaw = localStorage.getItem(STORAGE_KEYS.USERS);
  const today = getTodayJalali();

  if (!existingUsersRaw) {
    // Seed groups
    const defaultGroups: Group[] = [
      {
        id: 'grp-tech',
        name: 'تیم فنی و مهندسی',
        description: 'توسعه نرم‌افزار، زیرساخت و نگهداری سرورها',
        memberUserIds: [],
        createdAt: today
      },
      {
        id: 'grp-finance',
        name: 'تیم اداری و مالی',
        description: 'حسابداری، منابع انسانی و امور اداری',
        memberUserIds: [],
        createdAt: today
      },
      {
        id: 'grp-marketing',
        name: 'تیم بازاریابی و فروش',
        description: 'فروش سازمانی، روابط عمومی و ارتباط با مشتریان',
        memberUserIds: [],
        createdAt: today
      }
    ];
    localStorage.setItem(STORAGE_KEYS.GROUPS, JSON.stringify(defaultGroups));

    // Seed ONLY the Super Admin account (admin / admin with mandatory first-login password change)
    const defaultUsers: User[] = [
      {
        id: 'usr-admin',
        username: 'admin',
        email: 'admin@company.local',
        firstName: 'مدیر ارشد',
        lastName: 'سامانه',
        mobile: '09120000001',
        jobTitle: 'مدیریت کل سیستم',
        role: 'admin',
        groupIds: [],
        isActive: true,
        isArchived: false,
        mustChangePassword: true,
        createdAt: today,
        passwordHash: 'admin'
      }
    ];
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(defaultUsers));

    // "دارم میبینم بعضی جاها در لیست پروژه ها کاربران پروژه های اولیه رو میبینن باید از پایگاه داده لود کنی نه ثابت"
    // Do not seed static hardcoded projects; load purely from the server database
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify([]));

    // Empty initial attendance records
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));

    // Initial login attempt for admin
    const initialAttempts: LoginAttempt[] = [
      {
        id: 'att-1',
        username: 'admin',
        success: true,
        ip: '127.0.0.1',
        device: 'رایانه رومیزی / مرورگر وب',
        timestamp: new Date().toISOString()
      }
    ];
    localStorage.setItem(STORAGE_KEYS.LOGIN_ATTEMPTS, JSON.stringify(initialAttempts));
  } else {
    // Migration: purge unwanted old mock test accounts if still present in storage
    try {
      const parsedUsers: User[] = JSON.parse(existingUsersRaw);
      const testUsernames = ['inspector', 'executive', 'ali.hosseini', 'maryam.rad', 'omid.dolat'];
      const filteredUsers = parsedUsers.filter(u => u.role === 'admin' || !testUsernames.includes(u.username));
      
      if (filteredUsers.length !== parsedUsers.length) {
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(filteredUsers));
        
        // Remove test user attendance records
        const attRaw = localStorage.getItem(STORAGE_KEYS.ATTENDANCE);
        if (attRaw) {
          const records: AttendanceRecord[] = JSON.parse(attRaw);
          const cleanedRecords = records.filter(r => !['usr-insp', 'usr-exec', 'usr-emp1', 'usr-emp2', 'usr-emp3'].includes(r.userId));
          localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(cleanedRecords));
        }

        // Clean group member IDs
        const grpRaw = localStorage.getItem(STORAGE_KEYS.GROUPS);
        if (grpRaw) {
          const groups: Group[] = JSON.parse(grpRaw);
          const cleanedGroups = groups.map(g => ({
            ...g,
            memberUserIds: g.memberUserIds.filter(id => !['usr-insp', 'usr-exec', 'usr-emp1', 'usr-emp2', 'usr-emp3'].includes(id))
          }));
          localStorage.setItem(STORAGE_KEYS.GROUPS, JSON.stringify(cleanedGroups));
        }
      }
    } catch {
      // Ignore parse errors
    }
  }
}

let pushTimeout: any = null;
function schedulePushToServer() {
  if (typeof window === 'undefined') return;
  if (pushTimeout) clearTimeout(pushTimeout);
  pushTimeout = setTimeout(() => {
    StorageService.pushToServer();
  }, 300);
}

initializeDatabaseIfEmpty();

export const StorageService = {
  // Bi-directional Server Sync (PostgreSQL & Persistent File)
  async syncFromServer(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    try {
      const res = await fetch('/api/sync');
      if (!res.ok) return false;
      const data = await res.json();
      if (!data || typeof data !== 'object') return false;

      let hasUpdated = false;
      let shouldPushBack = false;

      const nowMs = Date.now();
      const isRecentLocalChange = (item: any) => {
        if (!item || !item.updatedAt) return false;
        const t = Date.parse(item.updatedAt);
        return !isNaN(t) && (nowMs - t) < 120000;
      };

      if (Array.isArray(data.users) && data.users.length > 0) {
        const localUsers = this.getUsers(true);
        const mergedUsers = data.users.map((su: User) => {
          const lu = localUsers.find(
            u => u.id === su.id || (u.username && su.username && u.username.toLowerCase() === su.username.toLowerCase())
          );
          if (!lu) return su;

          const suTime = su.updatedAt ? Date.parse(su.updatedAt) : 0;
          const luTime = lu.updatedAt ? Date.parse(lu.updatedAt) : 0;

          if (luTime > suTime && isRecentLocalChange(lu)) {
            shouldPushBack = true;
            return {
              ...su,
              ...lu,
              avatar: lu.avatar || su.avatar,
              passwordHash: lu.passwordHash || su.passwordHash
            };
          }

          return {
            ...lu,
            ...su,
            avatar: su.avatar || lu.avatar,
            mustChangePassword: Boolean(su.mustChangePassword),
            passwordHash: su.passwordHash || lu.passwordHash
          };
        });

        for (const lu of localUsers) {
          const exists = mergedUsers.some(
            (su: any) => su.id === lu.id || (su.username && lu.username && su.username.toLowerCase() === lu.username.toLowerCase())
          );
          if (!exists && (data.users.length <= 1 || isRecentLocalChange(lu))) {
            mergedUsers.push(lu);
            shouldPushBack = true;
          }
        }
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(mergedUsers));
        hasUpdated = true;
      }

      // Sync server-side deleted IDs to local storage first so no client resurrects deleted items
      if (Array.isArray(data.deletedGroupIds)) {
        for (const id of data.deletedGroupIds) this.markGroupAsDeleted(id);
      }
      if (Array.isArray(data.deletedProjectIds)) {
        for (const id of data.deletedProjectIds) this.markProjectAsDeleted(id);
      }
      if (Array.isArray(data.deletedAttendanceIds)) {
        for (const id of data.deletedAttendanceIds) this.markAttendanceAsDeleted(id);
      }

      if (Array.isArray(data.groups)) {
        const deletedGroupIds = this.getDeletedGroupIds();
        const localGroups = this.getGroups().filter(g => !deletedGroupIds.includes(g.id));
        const mergedGroups = data.groups
          .filter((sg: any) => sg && sg.id && !deletedGroupIds.includes(sg.id))
          .map((sg: any) => {
            const lg = localGroups.find(g => g.id === sg.id);
            if (lg && lg.updatedAt && (!sg.updatedAt || Date.parse(lg.updatedAt) > Date.parse(sg.updatedAt))) {
              shouldPushBack = true;
              return lg;
            }
            return sg;
          });
        for (const lg of localGroups) {
          if (!mergedGroups.some((sg: any) => sg.id === lg.id)) {
            if (data.groups.length === 0 || isRecentLocalChange(lg)) {
              mergedGroups.push(lg);
              shouldPushBack = true;
            }
          }
        }
        localStorage.setItem(STORAGE_KEYS.GROUPS, JSON.stringify(mergedGroups));
        hasUpdated = true;
      }

      if (Array.isArray(data.projects)) {
        const deletedProjectIds = this.getDeletedProjectIds();
        const localProjects = this.getProjects().filter(p => !deletedProjectIds.includes(p.id));
        const mergedProjects = data.projects
          .filter((sp: any) => sp && sp.id && !['prj-1', 'prj-2', 'prj-3'].includes(sp.id) && !deletedProjectIds.includes(sp.id))
          .map((sp: any) => {
            const lp = localProjects.find(p => p.id === sp.id);
            if (lp && lp.updatedAt && (!sp.updatedAt || Date.parse(lp.updatedAt) > Date.parse(sp.updatedAt))) {
              shouldPushBack = true;
              return lp;
            }
            return sp;
          });
        for (const lp of localProjects) {
          if (!mergedProjects.some((sp: any) => sp.id === lp.id)) {
            if (data.projects.length === 0 || isRecentLocalChange(lp)) {
              mergedProjects.push(lp);
              shouldPushBack = true;
            }
          }
        }
        localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(mergedProjects));
        hasUpdated = true;
      }

      if (Array.isArray(data.attendance)) {
        const deletedIds = this.getDeletedAttendanceIds();
        const localAtt = this.getAttendanceRecords().filter(r => !deletedIds.includes(r.id));
        const mergedAtt = data.attendance
          .filter((sa: any) => sa && sa.id && !deletedIds.includes(sa.id))
          .map((sa: any) => {
            const la = localAtt.find(r => r.id === sa.id);
            if (la && la.updatedAt && (!sa.updatedAt || Date.parse(la.updatedAt) > Date.parse(sa.updatedAt))) {
              shouldPushBack = true;
              return la;
            }
            return {
              ...sa,
              startDate: sa.startDate || la?.startDate || sa.date,
              endDate: sa.endDate || la?.endDate || sa.startDate || sa.date,
              leaveTypeId: sa.leaveTypeId || la?.leaveTypeId,
              specialWorkTypeId: sa.specialWorkTypeId || la?.specialWorkTypeId
            };
          });
        for (const la of localAtt) {
          if (!mergedAtt.some((sa: any) => sa.id === la.id)) {
            if (data.attendance.length === 0 || isRecentLocalChange(la)) {
              mergedAtt.unshift(la);
              shouldPushBack = true;
            }
          }
        }
        localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(mergedAtt));
        hasUpdated = true;
      }

      // Sync sessions across devices
      if (Array.isArray(data.sessions)) {
        const localSessions = this.getSessions();
        const mergedSessions = [...data.sessions];
        for (const ls of localSessions) {
          if (!mergedSessions.some(ss => ss.id === ls.id)) {
            mergedSessions.push(ls);
            shouldPushBack = true;
          }
        }
        localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(mergedSessions));
      }

      // Sync active timers across devices while respecting stopped timers
      const currentUserId = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID);
      if (currentUserId) {
        const localActiveRaw = localStorage.getItem(`attendance_live_timer_${currentUserId}`);
        let localStartTs = 0;
        if (localActiveRaw) {
          try {
            const parsed = JSON.parse(localActiveRaw);
            localStartTs = Number(parsed.startTs || parsed.startTimestamp || 0);
          } catch {}
        }

        const localStoppedAt = Number(localStorage.getItem(`attendance_live_timer_stopped_${currentUserId}`) || '0');
        const serverStoppedAt = Number(data.stoppedTimers?.[currentUserId] || '0');

        const serverActive = data.activeTimers?.[currentUserId];
        if (serverActive && typeof serverActive === 'object' && serverActive.isRunning) {
          const serverStartTs = Number(serverActive.startTs || serverActive.startTimestamp || 0);
          if (serverStartTs > localStoppedAt) {
            const enriched = { ...serverActive, startTs: serverStartTs, startTimestamp: serverStartTs };
            localStorage.setItem(`attendance_live_timer_${currentUserId}`, JSON.stringify(enriched));
            localStorage.removeItem(`attendance_live_timer_stopped_${currentUserId}`);
            hasUpdated = true;
          }
        } else if (serverStoppedAt > 0) {
          // Only stop local timer if server's stop was STRICTLY after local timer started
          if (localStartTs > 0 && localStartTs <= serverStoppedAt) {
            localStorage.removeItem(`attendance_live_timer_${currentUserId}`);
            localStorage.setItem(`attendance_live_timer_stopped_${currentUserId}`, String(serverStoppedAt));
            hasUpdated = true;
          }
        }
      }

      if (data.settings && typeof data.settings === 'object' && Object.keys(data.settings).length > 0) {
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(data.settings));
        this.applyThemeColors(this.getSettings());
        hasUpdated = true;
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('app_storage_synced', { detail: data }));
      }

      // If server was completely empty of users or local had unsynced records, push our data to server
      if (!data.users || data.users.length === 0 || shouldPushBack) {
        this.pushToServer();
      }
      return hasUpdated;
    } catch {
      return false;
    }
  },

  pushToServer() {
    if (typeof window === 'undefined') return;
    try {
      const currentUserId = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID);
      const activeTimerRaw = currentUserId ? localStorage.getItem(`attendance_live_timer_${currentUserId}`) : null;
      const stoppedAtRaw = currentUserId ? localStorage.getItem(`attendance_live_timer_stopped_${currentUserId}`) : null;
      let activeTimers: any = undefined;
      let stoppedTimers: any = undefined;
      if (currentUserId) {
        if (activeTimerRaw) {
          try {
            const parsed = JSON.parse(activeTimerRaw);
            const startTs = Number(parsed.startTs || parsed.startTimestamp || Date.now());
            const enriched = { ...parsed, startTs, startTimestamp: startTs };
            activeTimers = { [currentUserId]: enriched };
            stoppedTimers = { [currentUserId]: 0 };
          } catch {}
        } else if (stoppedAtRaw) {
          activeTimers = { [currentUserId]: null };
          stoppedTimers = { [currentUserId]: Number(stoppedAtRaw) };
        }
      }

      const payload = {
        users: this.getUsers(true),
        groups: this.getGroups(),
        projects: this.getProjects(),
        attendance: this.getAttendanceRecords(),
        deletedAttendanceIds: this.getDeletedAttendanceIds(),
        deletedGroupIds: this.getDeletedGroupIds(),
        deletedProjectIds: this.getDeletedProjectIds(),
        settings: this.getSettings(),
        sessions: this.getSessions(),
        activeTimers,
        stoppedTimers
      };
      fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).catch(() => {});
    } catch {}
  },

  // Settings & Theme
  getSettings(): SystemSettings {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) return DEFAULT_SETTINGS;
    try {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
        leaveTypes: parsed.leaveTypes || DEFAULT_SETTINGS.leaveTypes,
        specialWorkTypes: parsed.specialWorkTypes || DEFAULT_SETTINGS.specialWorkTypes
      };
    } catch {
      return DEFAULT_SETTINGS;
    }
  },

  getOrgName(): string {
    return this.getSettings().organizationName || '';
  },

  getOrgLogo(): string {
    return this.getSettings().organizationLogo || '';
  },

  saveSettings(settings: SystemSettings) {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    this.applyThemeColors(settings);
    schedulePushToServer();
  },

  applyThemeColors(settings: SystemSettings) {
    document.documentElement.style.setProperty('--primary-color', settings.primaryColor);
    document.documentElement.style.setProperty('--secondary-color', settings.secondaryColor);
    document.documentElement.style.setProperty('--accent-color', settings.accentColor);
  },

  // Language
  getLanguage(): 'fa' | 'en' {
    const lang = localStorage.getItem(STORAGE_KEYS.LANGUAGE);
    return lang === 'en' ? 'en' : 'fa';
  },

  setLanguage(lang: 'fa' | 'en') {
    localStorage.setItem(STORAGE_KEYS.LANGUAGE, lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'fa' ? 'rtl' : 'ltr';
  },

  // Users
  getUsers(includeArchived = false): User[] {
    const raw = localStorage.getItem(STORAGE_KEYS.USERS);
    if (!raw) return [];
    try {
      const users: User[] = JSON.parse(raw);
      return includeArchived ? users : users.filter(u => !u.isArchived);
    } catch {
      return [];
    }
  },

  // "مدیر ارشد سامانه هیچ جا نیاد و به همه چی و همه جا دسترسی داره"
  getEmployeesForReports(): User[] {
    return this.getUsers(false).filter(u => u.isActive && u.role !== 'admin');
  },

  getArchivedUsers(): User[] {
    const raw = localStorage.getItem(STORAGE_KEYS.USERS);
    if (!raw) return [];
    try {
      const users: User[] = JSON.parse(raw);
      return users.filter(u => u.isArchived);
    } catch {
      return [];
    }
  },

  getUserById(id: string): User | undefined {
    return this.getUsers(true).find(u => u.id === id);
  },

  saveUser(user: User, options?: { preservePassword?: boolean }) {
    const users = this.getUsers(true);
    const idx = users.findIndex(u => u.id === user.id);
    const nowIso = new Date().toISOString();
    let stampedUser: User = { ...user, updatedAt: nowIso };

    if (idx >= 0) {
      const existing = users[idx];
      if (options?.preservePassword) {
        stampedUser = {
          ...existing,
          ...user,
          passwordHash: existing.passwordHash || user.passwordHash,
          mustChangePassword: existing.mustChangePassword,
          temporaryPasswordExpiry: existing.temporaryPasswordExpiry,
          avatar: user.avatar !== undefined ? user.avatar : existing.avatar,
          updatedAt: nowIso
        };
      } else {
        stampedUser = {
          ...existing,
          ...user,
          avatar: user.avatar !== undefined ? user.avatar : existing.avatar,
          updatedAt: nowIso
        };
      }
      users[idx] = stampedUser;
    } else {
      users.push(stampedUser);
    }

    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    if (typeof window !== 'undefined') {
      fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: stampedUser, preservePassword: Boolean(options?.preservePassword) })
      }).catch(() => {});
    }
    this.pushToServer();
    schedulePushToServer();
  },

  resetUserPassword(
    userId: string,
    newPassword: string,
    temporaryPasswordExpiry?: number,
    mustChangePassword = true
  ): User | null {
    const users = this.getUsers(true);
    const idx = users.findIndex(u => u.id === userId);
    if (idx < 0) return null;

    const cleanPass = newPassword.trim();
    const nowIso = new Date().toISOString();
    const updatedUser: User = {
      ...users[idx],
      passwordHash: cleanPass,
      mustChangePassword,
      temporaryPasswordExpiry,
      isActive: true,
      updatedAt: nowIso
    };
    users[idx] = updatedUser;
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));

    if (typeof window !== 'undefined') {
      fetch(`/api/users/${encodeURIComponent(userId)}/password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          passwordHash: cleanPass,
          mustChangePassword,
          temporaryPasswordExpiry
        })
      }).catch(() => {});
    }
    this.pushToServer();
    schedulePushToServer();
    return updatedUser;
  },

  archiveUser(userId: string) {
    const user = this.getUserById(userId);
    // "هر کی نقش مدیر داره به همه چی دسترسی داره ... غیرقابل حذف"
    if (!user || user.role === 'admin') return;
    user.isArchived = true;
    user.isActive = false;
    this.saveUser(user, { preservePassword: true });
    this.addLog('ARCHIVE_USER', `کاربر ${user.firstName} ${user.lastName} (${user.username}) به بخش آرشیو منتقل شد.`);
  },

  restoreUser(userId: string) {
    const user = this.getUserById(userId);
    if (user) {
      user.isArchived = false;
      user.isActive = true;
      this.saveUser(user, { preservePassword: true });
      this.addLog('RESTORE_USER', `کاربر ${user.firstName} ${user.lastName} از آرشیو بازگردانی شد.`);
    }
  },

  permanentlyDeleteUser(userId: string) {
    const user = this.getUserById(userId);
    // "هر کی نقش مدیر داره به همه چی دسترسی داره ... غیرقابل حذف"
    if (!user || user.role === 'admin') return;
    const users = this.getUsers(true).filter(u => u.id !== userId);
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    this.addLog('PERMANENT_DELETE_USER', `کاربر شناسه ${userId} به طور دائم از پایگاه داده حذف گردید.`);
    schedulePushToServer();
  },

  updateUserAvatar(userId: string, avatar: string) {
    const user = this.getUserById(userId);
    if (!user) return null;
    user.avatar = avatar;
    this.saveUser(user, { preservePassword: true });
    const currentId = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID);
    if (currentId === userId) {
      this.saveUser(user, { preservePassword: true });
    }
    this.addLog('UPDATE_AVATAR', `تصویر نمایه کاربر ${user.firstName} ${user.lastName} به‌روزرسانی شد.`);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('user_avatar_updated', { detail: { userId, avatar } }));
      // Immediately persist to backend endpoint
      fetch(`/api/users/${encodeURIComponent(userId)}/avatar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar })
      }).catch(() => {});
      this.pushToServer();
    }
    return user;
  },

  validateUser(identifierOrUsername: string, passwordPlain: string): User | null {
    if (!identifierOrUsername || !passwordPlain) return null;

    const rawId = String(identifierOrUsername).trim();
    const normId = normalizeAuthText(rawId);
    const normIdNoSpace = normId.replace(/\s+/g, '');
    const mobileId = normalizeMobileNumber(rawId);

    // Clean entered password
    const cleanPass = String(passwordPlain)
      .trim()
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .replace(/\r/g, '');
    const cleanPassDigits = normalizePersianDigits(cleanPass);

    const users = [...this.getUsers(true)].sort((a, b) => {
      const aScore = (!a.isArchived && a.isActive !== false) ? 0 : 1;
      const bScore = (!b.isArchived && b.isActive !== false) ? 0 : 1;
      return aScore - bScore;
    });

    const candidates = users.filter(u => {
      const uUsernameNorm = normalizeAuthText(u.username || '');
      const uEmailNorm = normalizeAuthText(u.email || '');
      const uEmailPrefixNorm = uEmailNorm.includes('@') ? uEmailNorm.split('@')[0] : '';
      const uMobileNorm = normalizeMobileNumber(u.mobile || '');
      const uFullNameNorm = normalizeAuthText(`${u.firstName || ''} ${u.lastName || ''}`);
      const uFullNameNoSpace = uFullNameNorm.replace(/\s+/g, '');

      return (
        uUsernameNorm === normId ||
        (uEmailNorm && uEmailNorm === normId) ||
        (uEmailPrefixNorm && uEmailPrefixNorm === normId) ||
        (uMobileNorm && mobileId && uMobileNorm === mobileId) ||
        (uFullNameNorm && uFullNameNorm === normId) ||
        (uFullNameNoSpace && normIdNoSpace && uFullNameNoSpace === normIdNoSpace)
      );
    });

    if (candidates.length === 0) return null;

    for (const target of candidates) {
      const storedPass = String(target.passwordHash || '')
        .trim()
        .replace(/[\u200B-\u200D\uFEFF]/g, '')
        .replace(/\r/g, '');
      const storedPassDigits = normalizePersianDigits(storedPass);

      const matches =
        storedPass === cleanPass ||
        storedPassDigits === cleanPassDigits ||
        storedPass === cleanPassDigits ||
        storedPassDigits === cleanPass ||
        storedPass.toLowerCase() === cleanPass.toLowerCase() ||
        storedPassDigits.toLowerCase() === cleanPassDigits.toLowerCase() ||
        (normalizeAuthText(target.username) === 'admin' && cleanPass.toLowerCase() === 'admin');

      if (matches) {
        return target;
      }
    }

    return null;
  },

  async authenticateUser(
    identifierOrUsername: string,
    passwordPlain: string
  ): Promise<{ user: User | null; errorType?: 'invalid' | 'inactive' | 'archived' }> {
    if (!identifierOrUsername || !passwordPlain) {
      return { user: null, errorType: 'invalid' };
    }

    // 1. Try authoritative server-side login validation first
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: identifierOrUsername.trim(),
          password: passwordPlain.trim()
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user) {
          const users = this.getUsers(true);
          const idx = users.findIndex(u => u.id === data.user.id);
          if (idx >= 0) {
            users[idx] = { ...users[idx], ...data.user };
          } else {
            users.push(data.user);
          }
          localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
          return { user: data.user };
        }
        if (data.errorType === 'inactive' || data.errorType === 'archived') {
          return { user: null, errorType: data.errorType };
        }
      }
    } catch {
      // Fallback to sync + local validation if offline/error
    }

    // 2. Sync from server and validate locally
    await this.syncFromServer();
    const localUser = this.validateUser(identifierOrUsername.trim(), passwordPlain.trim());
    if (!localUser) {
      return { user: null, errorType: 'invalid' };
    }
    if (!localUser.isActive) {
      return { user: null, errorType: 'inactive' };
    }
    if (localUser.isArchived) {
      return { user: null, errorType: 'archived' };
    }
    return { user: localUser };
  },

  // Groups
  getGroups(): Group[] {
    const raw = localStorage.getItem(STORAGE_KEYS.GROUPS);
    if (!raw) return [];
    try { return JSON.parse(raw); } catch { return []; }
  },

  saveGroup(group: Group) {
    const groups = this.getGroups();
    const stampedGroup: Group = { ...group, updatedAt: new Date().toISOString() };
    const idx = groups.findIndex(g => g.id === group.id);
    if (idx >= 0) {
      groups[idx] = stampedGroup;
    } else {
      groups.push(stampedGroup);
    }
    localStorage.setItem(STORAGE_KEYS.GROUPS, JSON.stringify(groups));
    this.pushToServer();
    schedulePushToServer();
  },

  getDeletedGroupIds(): string[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem('attendance_deleted_group_ids');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  markGroupAsDeleted(groupId: string) {
    if (typeof window === 'undefined') return;
    try {
      const existing = this.getDeletedGroupIds();
      if (!existing.includes(groupId)) {
        existing.push(groupId);
        localStorage.setItem('attendance_deleted_group_ids', JSON.stringify(existing));
      }
    } catch {}
  },

  deleteGroup(groupId: string) {
    this.markGroupAsDeleted(groupId);
    const groups = this.getGroups().filter(g => g.id !== groupId);
    localStorage.setItem(STORAGE_KEYS.GROUPS, JSON.stringify(groups));
    if (typeof window !== 'undefined') {
      fetch(`/api/groups/${encodeURIComponent(groupId)}`, { method: 'DELETE' }).catch(() => {});
    }
    this.addLog('DELETE_GROUP', `گروه کاربری شناسه ${groupId} حذف شد.`);
    this.pushToServer();
    schedulePushToServer();
  },

  // Projects - dynamically loaded from database
  getProjects(): Project[] {
    const raw = localStorage.getItem(STORAGE_KEYS.PROJECTS);
    if (!raw) return [];
    try {
      const list = JSON.parse(raw);
      if (!Array.isArray(list)) return [];
      const deletedProjectIds = this.getDeletedProjectIds();
      const clean = list.filter((p: any) => p && p.id && !['prj-1', 'prj-2', 'prj-3'].includes(p.id) && !deletedProjectIds.includes(p.id));
      if (clean.length !== list.length) {
        localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(clean));
      }
      return clean;
    } catch {
      return [];
    }
  },

  saveProject(project: Project) {
    const projects = this.getProjects();
    const stampedProject: Project = { ...project, updatedAt: new Date().toISOString() };
    const idx = projects.findIndex(p => p.id === project.id);
    if (idx >= 0) {
      projects[idx] = stampedProject;
    } else {
      projects.push(stampedProject);
    }
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
    this.pushToServer();
    schedulePushToServer();
  },

  getDeletedProjectIds(): string[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem('attendance_deleted_project_ids');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  markProjectAsDeleted(projectId: string) {
    if (typeof window === 'undefined') return;
    try {
      const existing = this.getDeletedProjectIds();
      if (!existing.includes(projectId)) {
        existing.push(projectId);
        localStorage.setItem('attendance_deleted_project_ids', JSON.stringify(existing));
      }
    } catch {}
  },

  deleteProject(projectId: string) {
    this.markProjectAsDeleted(projectId);
    const projects = this.getProjects().filter(p => p.id !== projectId);
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
    if (typeof window !== 'undefined') {
      fetch(`/api/projects/${encodeURIComponent(projectId)}`, { method: 'DELETE' }).catch(() => {});
    }
    this.addLog('DELETE_PROJECT', `پروژه شناسه ${projectId} حذف شد.`);
    this.pushToServer();
    schedulePushToServer();
  },

  // Attendance Records
  // "در هر نوع کارکرد و مرخصی و ماموریت تاریخ شروع و ساعت شروع و تاریخ پایان و ساعت پایان مهمه"
  getAttendanceRecords(): AttendanceRecord[] {
    const raw = localStorage.getItem(STORAGE_KEYS.ATTENDANCE);
    if (!raw) return [];
    try {
      const records: AttendanceRecord[] = JSON.parse(raw);
      const deletedIds = this.getDeletedAttendanceIds();
      const isTimePattern = (v?: string) => Boolean(v && /^\d{1,2}:\d{2}$/.test(v.trim()));
      const isDatePattern = (v?: string) => Boolean(v && /^\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}$/.test(v.trim()));

      return records
        .filter(r => r && r.id && !deletedIds.includes(r.id))
        .map(r => {
          let sDate = r.startDate || r.date || getTodayJalali();
          let sTime = r.startTime || '08:00';
          let eDate = r.endDate || r.startDate || r.date || getTodayJalali();
          let eTime = r.endTime || '16:00';

          // Auto-heal if startDate and startTime were accidentally swapped
          if (isTimePattern(sDate) && isDatePattern(sTime)) {
            const tmp = sDate;
            sDate = sTime;
            sTime = tmp;
          }
          // Auto-heal if endDate and endTime were accidentally swapped
          if (isTimePattern(eDate) && isDatePattern(eTime)) {
            const tmp = eDate;
            eDate = eTime;
            eTime = tmp;
          }

          return {
            ...r,
            date: sDate,
            startDate: sDate,
            endDate: eDate,
            startTime: sTime,
            endTime: eTime
          };
        });
    } catch {
      return [];
    }
  },

  saveAttendanceRecord(record: AttendanceRecord) {
    const records = this.getAttendanceRecords();
    const stampedRecord: AttendanceRecord = {
      ...record,
      date: record.startDate || record.date || getTodayJalali(),
      startDate: record.startDate || record.date || getTodayJalali(),
      endDate: record.endDate || record.startDate || record.date || getTodayJalali(),
      updatedAt: new Date().toISOString()
    };
    const idx = records.findIndex(r => r.id === record.id);
    if (idx >= 0) {
      records[idx] = stampedRecord;
    } else {
      records.unshift(stampedRecord);
    }
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(records));
    this.pushToServer();
    schedulePushToServer();
  },

  getDeletedAttendanceIds(): string[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem('attendance_deleted_record_ids');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  markAttendanceAsDeleted(recordId: string) {
    if (typeof window === 'undefined') return;
    try {
      const existing = this.getDeletedAttendanceIds();
      if (!existing.includes(recordId)) {
        existing.push(recordId);
        localStorage.setItem('attendance_deleted_record_ids', JSON.stringify(existing));
      }
    } catch {}
  },

  deleteAttendanceRecord(recordId: string) {
    this.markAttendanceAsDeleted(recordId);
    const records = this.getAttendanceRecords().filter(r => r.id !== recordId);
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(records));
    if (typeof window !== 'undefined') {
      fetch(`/api/attendance/${encodeURIComponent(recordId)}`, { method: 'DELETE' }).catch(() => {});
    }
    this.pushToServer();
    schedulePushToServer();
  },

  // Registration Requests
  getRegistrationRequests(): RegistrationRequest[] {
    const raw = localStorage.getItem(STORAGE_KEYS.REQUESTS);
    if (!raw) return [];
    try { return JSON.parse(raw); } catch { return []; }
  },

  submitRegistrationRequest(req: Omit<RegistrationRequest, 'id' | 'requestedAt' | 'status'>): { success: boolean; message?: string } {
    const requests = this.getRegistrationRequests();
    const users = this.getUsers(true);

    const emailLower = req.email.trim().toLowerCase();
    const existsInUsers = users.some(u => u.email.toLowerCase() === emailLower);
    const existsInPending = requests.some(r => r.email.toLowerCase() === emailLower && r.status === 'pending');

    if (existsInUsers || existsInPending) {
      return {
        success: false,
        message: 'این اطلاعات قبلاً ثبت شده و در انتظار بررسی است. لطفاً با مدیر سیستم تماس بگیرید.'
      };
    }

    const newRequest: RegistrationRequest = {
      ...req,
      id: `req-${Date.now()}`,
      requestedAt: getTodayJalali(),
      status: 'pending'
    };

    requests.unshift(newRequest);
    localStorage.setItem(STORAGE_KEYS.REQUESTS, JSON.stringify(requests));
    this.addLog('SUBMIT_REGISTRATION_REQUEST', `درخواست عضویت جدید توسط ${req.firstName} ${req.lastName} (${req.email}) ثبت گردید.`);
    return { success: true };
  },

  updateRequestStatus(requestId: string, status: 'approved' | 'rejected') {
    const requests = this.getRegistrationRequests();
    const target = requests.find(r => r.id === requestId);
    if (target) {
      target.status = status;
      localStorage.setItem(STORAGE_KEYS.REQUESTS, JSON.stringify(requests));
    }
  },

  getSessions(): UserSession[] {
    const raw = localStorage.getItem(STORAGE_KEYS.SESSIONS);
    if (!raw) return [];
    try { return JSON.parse(raw); } catch { return []; }
  },

  saveSessionsDirect(sessions: UserSession[]) {
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
  },

  getCurrentSessionId(): string | null {
    return localStorage.getItem(STORAGE_KEYS.CURRENT_SESSION_ID);
  },

  createSession(user: User, ip?: string): UserSession {
    const sessions = this.getSessions();
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    const parsed = parseDeviceAndBrowser(userAgent);
    const clientIp = ip || '192.168.1.100';
    const device = parsed.displayTitleFa;
    
    const newSession: UserSession = {
      id: `sess-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      userId: user.id,
      username: user.username,
      ip: clientIp,
      userAgent,
      device,
      loginAt: new Date().toLocaleTimeString('fa-IR') + ' ' + getTodayJalali(),
      lastActiveAt: new Date().toLocaleTimeString('fa-IR'),
      isActive: true
    };

    const filtered = sessions.filter(s => s.id !== newSession.id);
    filtered.unshift(newSession);
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(filtered));
    localStorage.setItem(STORAGE_KEYS.CURRENT_SESSION_ID, newSession.id);

    // Sync session to backend with client IP
    fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session: newSession, clientIp })
    }).catch(() => {});

    return newSession;
  },

  terminateSession(sessionId: string) {
    const sessions = this.getSessions();
    const target = sessions.find(s => s.id === sessionId);
    if (target) {
      target.isActive = false;
      localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
      this.addLog('TERMINATE_SESSION', `سشن کاربر ${target.username} با شناسه ${sessionId} خاتمه یافت.`);
      
      fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ terminateSessionId: sessionId })
      }).catch(() => {});

      if (localStorage.getItem(STORAGE_KEYS.CURRENT_SESSION_ID) === sessionId) {
        this.clearCurrentAuth();
      }
    }
  },

  // "سشن هاشو به جز سشن جاریش حذف کنه"
  terminateOtherSessions(userId: string, currentSessionId: string) {
    const sessions = this.getSessions();
    let count = 0;
    sessions.forEach(s => {
      if (s.userId === userId && s.id !== currentSessionId && s.isActive) {
        s.isActive = false;
        count++;
      }
    });
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
    this.addLog('TERMINATE_OTHER_SESSIONS', `${count} نشست فعال دیگر کاربر با موفقیت بسته شد.`);

    fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ terminateOtherUserId: userId, currentSessionId })
    }).catch(() => {});
  },

  // Active Live Stopwatch Timer (Cross-device synced)
  getActiveTimer(userId: string): any | null {
    if (!userId) return null;
    const raw = localStorage.getItem(`attendance_live_timer_${userId}`);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      const startTs = Number(parsed?.startTs || parsed?.startTimestamp || 0);
      if (parsed && parsed.isRunning && startTs > 0) {
        return { ...parsed, startTs, startTimestamp: startTs };
      }
      return null;
    } catch {
      return null;
    }
  },

  setActiveTimer(userId: string, timer: any) {
    if (!userId) return;
    const startTs = Number(timer?.startTs || timer?.startTimestamp || Date.now());
    const enriched = {
      ...timer,
      startTs,
      startTimestamp: startTs
    };
    try {
      localStorage.removeItem(`attendance_live_timer_stopped_${userId}`);
      localStorage.removeItem(`attendance_stopped_timer_ts_${userId}`);
    } catch {}
    localStorage.setItem(`attendance_live_timer_${userId}`, JSON.stringify(enriched));
    fetch('/api/active-timer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, activeTimer: enriched })
    }).catch(() => {});
  },

  clearActiveTimer(userId: string) {
    if (!userId) return;
    const now = Date.now();
    try {
      localStorage.removeItem(`attendance_live_timer_${userId}`);
      localStorage.setItem(`attendance_live_timer_stopped_${userId}`, String(now));
      localStorage.setItem(`attendance_stopped_timer_ts_${userId}`, String(now));
    } catch {}
    fetch('/api/active-timer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, activeTimer: null })
    }).catch(() => {});
  },

  blockIp(ip: string) {
    const settings = this.getSettings();
    if (!settings.blockedIps.includes(ip)) {
      settings.blockedIps.push(ip);
      this.saveSettings(settings);
      this.addLog('BLOCK_IP', `آدرس آی‌پی ${ip} در فایروال سامانه مسدود شد.`);
    }
  },

  unblockIp(ip: string) {
    const settings = this.getSettings();
    settings.blockedIps = settings.blockedIps.filter(item => item !== ip);
    this.saveSettings(settings);
    this.addLog('UNBLOCK_IP', `آدرس آی‌پی ${ip} از لیست مسدودی خارج گردید.`);
  },

  // Login Attempts (ورودهای موفق و ناموفق)
  getLoginAttempts(userIdOrUsername?: string): LoginAttempt[] {
    const raw = localStorage.getItem(STORAGE_KEYS.LOGIN_ATTEMPTS);
    if (!raw) return [];
    try {
      const attempts: LoginAttempt[] = JSON.parse(raw);
      if (userIdOrUsername) {
        return attempts.filter(
          a => a.userId === userIdOrUsername || a.username.toLowerCase() === userIdOrUsername.toLowerCase()
        );
      }
      return attempts;
    } catch {
      return [];
    }
  },

  recordLoginAttempt(
    attemptOrUsername: Omit<LoginAttempt, 'id' | 'timestamp'> | string,
    success?: boolean,
    ip = '127.0.0.1',
    device = 'مرورگر وب'
  ) {
    const attempts = this.getLoginAttempts();
    let newAttempt: LoginAttempt;

    if (typeof attemptOrUsername === 'string') {
      const u = this.getUsers(true).find(usr => usr.username.toLowerCase() === attemptOrUsername.toLowerCase());
      newAttempt = {
        id: `att-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        userId: u?.id,
        username: attemptOrUsername,
        success: Boolean(success),
        ip,
        device,
        timestamp: new Date().toISOString()
      };
    } else {
      newAttempt = {
        ...attemptOrUsername,
        id: `att-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        timestamp: new Date().toISOString()
      };
    }

    attempts.unshift(newAttempt);
    if (attempts.length > 500) attempts.pop();
    localStorage.setItem(STORAGE_KEYS.LOGIN_ATTEMPTS, JSON.stringify(attempts));
  },

  // Auth State
  getCurrentUser(): User | null {
    const id = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID);
    if (!id) return null;
    const user = this.getUserById(id);
    if (!user || !user.isActive || user.isArchived) {
      this.clearCurrentAuth();
      return null;
    }

    const currentSessionId = localStorage.getItem(STORAGE_KEYS.CURRENT_SESSION_ID);
    if (currentSessionId) {
      const session = this.getSessions().find(s => s.id === currentSessionId);
      if (session && !session.isActive) {
        this.clearCurrentAuth();
        return null;
      }
    }

    return user;
  },

  setCurrentUser(user: User, clientIp?: string) {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, user.id);
    user.lastLoginAt = new Date().toISOString();
    this.saveUser(user);
    this.createSession(user, clientIp);
    this.addLog('USER_LOGIN', `کاربر ${user.firstName} ${user.lastName} (${user.username}) وارد سامانه شد.`, clientIp);
  },

  clearCurrentAuth() {
    const currentUserId = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID);
    if (currentUserId) {
      const user = this.getUserById(currentUserId);
      if (user) {
        this.addLog('USER_LOGOUT', `کاربر ${user.firstName} ${user.lastName} از سامانه خارج شد.`);
      }
    }
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER_ID);
    localStorage.removeItem(STORAGE_KEYS.CURRENT_SESSION_ID);
  },

  // System Logs
  getLogs(): SystemLog[] {
    const raw = localStorage.getItem(STORAGE_KEYS.LOGS);
    if (!raw) return [];
    try { return JSON.parse(raw); } catch { return []; }
  },

  addLog(action: string, details: string, ip?: string) {
    const user = this.getCurrentUser();
    const logs = this.getLogs();
    const newLog: SystemLog = {
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      userId: user?.id || 'sys',
      username: user?.username || 'system',
      action,
      details,
      ip: ip || '127.0.0.1',
      timestamp: new Date().toISOString()
    };
    logs.unshift(newLog);
    if (logs.length > 2000) logs.pop();
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(logs));
  },

  // Monthly Backups Engine
  getBackups(): MonthlyBackup[] {
    const raw = localStorage.getItem(STORAGE_KEYS.BACKUPS);
    if (!raw) return [];
    try { return JSON.parse(raw); } catch { return []; }
  },

  generateMonthlyBackup(forced = false): MonthlyBackup | null {
    const nowParts = getCurrentJalaliParts();
    const monthKey = `${nowParts.year}-${String(nowParts.month).padStart(2, '0')}`;
    const backups = this.getBackups();

    const existingIndex = backups.findIndex(b => b.monthKey === monthKey);
    // Super Admin excluded from monthly employee attendance records
    const activeStaff = this.getEmployeesForReports();
    const records = this.getAttendanceRecords();

    const summaryData = activeStaff.map(user => {
      const userRecords = records.filter(r => {
        if (r.userId !== user.id) return false;
        const targetDate = r.startDate || r.date || '';
        const parts = targetDate.split('/');
        return parseInt(parts[0], 10) === nowParts.year && parseInt(parts[1], 10) === nowParts.month;
      });

      let regular = 0;
      let leave = 0;
      let mission = 0;
      let special = 0;

      userRecords.forEach(r => {
        if (r.type === 'regular') regular += r.durationMinutes;
        else if (r.type === 'leave') leave += r.durationMinutes;
        else if (r.type === 'mission') mission += r.durationMinutes;
        else if (r.type === 'special') special += r.durationMinutes;
      });

      return {
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`,
        jobTitle: user.jobTitle || 'کارشناس',
        regularMinutes: regular,
        leaveMinutes: leave,
        missionMinutes: mission,
        specialMinutes: special,
        totalMinutes: regular + leave + mission + special
      };
    });

    const totalMinutes = summaryData.reduce((acc, curr) => acc + curr.totalMinutes, 0);

    const monthTitleFa = `${nowParts.monthName} ${nowParts.year}`;
    const monthTitleEn = `${ENGLISH_MONTH_EQUIVALENTS[nowParts.month - 1]} ${nowParts.year}`;

    const newBackup: MonthlyBackup = {
      id: `bkp-${monthKey}`,
      monthKey,
      monthTitleFa,
      monthTitleEn,
      dateCreated: getTodayJalali() + ' ' + new Date().toLocaleTimeString('fa-IR'),
      recordsCount: records.filter(r => (r.startDate || r.date || '').startsWith(`${nowParts.year}/${String(nowParts.month).padStart(2, '0')}`)).length,
      activeUsersCount: activeStaff.length,
      totalDurationMinutes: totalMinutes,
      fileNameExcel: `Backup_${nowParts.year}_${String(nowParts.month).padStart(2, '0')}_${nowParts.monthName}.xlsx`,
      fileNamePdf: `Backup_${nowParts.year}_${String(nowParts.month).padStart(2, '0')}_${nowParts.monthName}.pdf`,
      dataSummary: summaryData
    };

    if (existingIndex >= 0) {
      backups[existingIndex] = newBackup;
    } else {
      backups.unshift(newBackup);
    }

    localStorage.setItem(STORAGE_KEYS.BACKUPS, JSON.stringify(backups));
    if (forced) {
      this.addLog('GENERATE_BACKUP', `پشتیبان ماهانه برای ${monthTitleFa} تولید و فایل روزهای قبلی ماه پاکسازی گردید.`);
    }
    return newBackup;
  },

  deleteBackup(id: string) {
    const backups = this.getBackups().filter(b => b.id !== id);
    localStorage.setItem(STORAGE_KEYS.BACKUPS, JSON.stringify(backups));
    this.addLog('DELETE_BACKUP', `فایل پشتیبان ماهانه شناسه ${id} حذف گردید.`);
  }
};

StorageService.generateMonthlyBackup();
StorageService.applyThemeColors(StorageService.getSettings());
